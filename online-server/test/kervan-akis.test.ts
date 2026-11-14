// Kervan (D2) DO'lar arası akış: gerçek YerlesimDO'lar (kaynak develi, hedef karapınar). Kesinti ve kaybolan yanıtla
// yeniden deneme (çift satış ve çift hasılat yok), önizleme = gerçek, kalıcı retle malların kaynağa dönüşü, kapı
// eşliği, fiyat haberi.
import test from "node:test";
import assert from "node:assert/strict";
import { YerlesimDO } from "../src/index.ts";
import { yerlesimCagir } from "../src/ic.ts";
import { AY_MS, oyunAyi } from "../src/saat.ts";
import type { Env } from "../src/tipler.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import { HABER_TAKAT, KERVAN_KOSUM, KERVAN_NAL, KERVAN_TAKAT, type KervanDefteri } from "../src/yerlesim/kervan.ts";
import type { Karakter, Olay } from "../src/yerlesim/tipler.ts";
import { sahteAdAlani } from "./yardimci.ts";

type Nesne = Record<string, any>;

async function dunya() {
  const zaman = { saat: Date.now() };
  const env = {} as Env;
  const yerlesimler = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => zaman.saat));
  const kesinti = { dusur: 0, yanitYut: 0, red: 0, varis: 0 };
  env.YERLESIM = {
    ...yerlesimler,
    get: (id) => {
      const gercek = yerlesimler.get(id);
      return {
        id,
        fetch: async (girdi: Request | string, init?: RequestInit) => {
          const ilk = typeof girdi === "string" ? new Request(girdi, init) : girdi;
          const govde = (await ilk.json()) as { islem: string };
          const istek = new Request("https://ic/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(govde) });
          if (govde.islem !== "kervanVaris") return gercek.fetch(istek);
          kesinti.varis++;
          if (kesinti.dusur > 0) {
            kesinti.dusur--;
            throw new Error("hedef geçici olarak erişilemez");
          }
          if (kesinti.red > 0) {
            kesinti.red--;
            return new Response(JSON.stringify({ ok: false, hata: "yerlesim_gecersiz" }));
          }
          const yanit = await gercek.fetch(istek);
          if (kesinti.yanitYut > 0) {
            kesinti.yanitYut--;
            throw new Error("yanıt yolda kayboldu");
          }
          return yanit;
        },
      } as DurableObjectStub;
    },
  } as DurableObjectNamespace;
  const kayit = (yer: string) => yerlesimler.ornekler.get(env.YERLESIM.idFromName(`yerlesim:${yer}`).toString())!;
  const ay = oyunAyi(zaman.saat);
  const r = await yerlesimCagir<{ id: string }>(env, { islem: "sakinEkle", yerlesim: "develi", sakin: { hesapId: "h-tuccar", ad: "Tüccar", cinsiyet: "erkek", dogumAyi: ay - 30 * 12 } });
  assert.ok(r.ok, JSON.stringify(r));
  const o = r.deger.id;
  const karakter = () => kayit("develi").depolama.veri.get(`o:${o}`) as Karakter;
  /** Depodaki karakteri değiştirir ve DO'yu depodan yeniden açar. */
  const karakterYaz = (degistir: (k: Karakter) => void) => {
    const k = karakter();
    degistir(k);
    kayit("develi").depolama.veri.set(`o:${o}`, k);
    const x = kayit("develi");
    x.ornek = new YerlesimDO({ id: env.YERLESIM.idFromName("yerlesim:develi"), storage: x.depolama } as unknown as DurableObjectState, env, () => zaman.saat);
  };
  karakterYaz((k) => {
    seviyeVer(k, "tuccar.yukHayvani", 1);
    k.ev = { nal: 10, kosum: 5, kereste: 30, odun: 20 };
    k.tk = 18;
    k.ta = ay;
  });
  const cagir = (i: Nesne): Promise<Nesne> => yerlesimCagir<Nesne>(env, { yerlesim: "develi", hesapId: "h-tuccar", ...i } as never);
  const defter = (yer: string) => kayit(yer).depolama.veri.get("kv") as KervanDefteri | undefined;
  const olaylar = (yer: string): Olay[] => [...kayit(yer).depolama.veri.entries()].filter(([a]) => a.startsWith("e:")).flatMap(([, v]) => v as Olay[]);
  return { env, zaman, kesinti, kayit, karakter, karakterYaz, cagir, defter, olaylar, o, ay };
}

test("kervan akışı: önizleme = gerçek; kesinti ve kaybolan yanıtta yeniden deneme; çift satış ve çift hasılat yok", async () => {
  const w = await dunya();
  const on = await w.cagir({ islem: "kervan", hedef: "karapinar", mallar: "kereste:10" });
  assert.ok(on.ok, JSON.stringify(on));
  const o = on.deger;
  assert.equal(o.uygun, true, JSON.stringify(o.kapilar));
  assert.equal(o.varisAyi, w.ay + 1);
  assert.deepEqual(o.bedel, { nal: KERVAN_NAL, kosum: KERVAN_KOSUM, takat: KERVAN_TAKAT });
  assert.ok(o.tahmin.hasilat > 0);
  assert.deepEqual(o.tahmin.satilan, { kereste: 8 });
  assert.equal(o.fiyat.pahali.length, 3);
  // Yüksüz önizleme envanterin tamamı için tahmin verir.
  const yuksuz = (await w.cagir({ islem: "kervan", hedef: "karapinar", mallar: null })).deger as Nesne;
  assert.equal(yuksuz.uygun, false);
  assert.deepEqual(yuksuz.tahmin.satirlar.map((x: Nesne) => x.mal).sort(), ["kereste", "kosum", "nal", "odun"]);

  const govde = { hedef: "karapinar", mallar: { kereste: 10 }, istekNo: "kervan-0001" };
  const g1 = await w.cagir({ islem: "kervanGonder", govde });
  assert.ok(g1.ok, JSON.stringify(g1));
  assert.equal(g1.deger.kervan.varisAyi, w.ay + 1);
  assert.deepEqual(g1.deger.envanter, { nal: 10 - KERVAN_NAL, kosum: 5 - KERVAN_KOSUM, kereste: 20, odun: 20 });
  const g2 = await w.cagir({ islem: "kervanGonder", govde });
  assert.deepEqual(g2, g1, "aynı istekNo aynı yanıt, ikinci kalkış yok");
  assert.equal(w.defter("develi")!.c.k.length, 1);
  assert.equal(w.karakter().ev!.kereste, 20);
  const pa0 = w.karakter().pa;

  // Önizleme engeli = gerçek hata (aynı mal aynı hedefe ayda bir).
  const tekrarOn = (await w.cagir({ islem: "kervan", hedef: "karapinar", mallar: "kereste:1" })).deger as Nesne;
  assert.equal(tekrarOn.engel, "kervan_mal_hedef");
  assert.deepEqual(await w.cagir({ islem: "kervanGonder", govde: { ...govde, mallar: { kereste: 1 }, istekNo: "kervan-0002" } }), { ok: false, hata: "kervan_mal_hedef" });
  // Göç kapısı: yoldaki kervan açık iştir.
  const goc = (await w.cagir({ islem: "gocOnizle", hedef: "konuralp" })).deger as Nesne;
  assert.equal(goc.kapilar.acikIs, false);

  // Varış ayından önce teslim yok.
  await w.kayit("develi").ornek.alarm();
  assert.equal(w.kesinti.varis, 0);

  // Ay döner; ilk teslim kesilir → kayıt bekler, yeniden deneme alarmı kurulur.
  w.zaman.saat += AY_MS;
  w.kesinti.dusur = 1;
  await w.kayit("develi").ornek.alarm();
  assert.equal(w.kesinti.varis, 1);
  assert.equal(w.defter("develi")!.c.k.length, 1);
  assert.equal(w.karakter().pa, pa0);
  const alarm = w.kayit("develi").depolama.alarmAni!;
  assert.ok(alarm > w.zaman.saat && alarm < w.zaman.saat + AY_MS, "yeniden deneme alarmı dönümden önce");

  // İkinci teslim: hedef satar ama yanıt kaybolur → kaynak kayıt bekler; hedefte satış bir kez yazılı.
  w.zaman.saat = alarm;
  w.kesinti.yanitYut = 1;
  await w.kayit("develi").ornek.alarm();
  assert.equal(w.kesinti.varis, 2);
  assert.equal(Object.keys(w.defter("karapinar")!.g).length, 1);
  const stok = (w.kayit("karapinar").depolama.veri.get("m") as Nesne).st?.kereste;
  assert.equal(stok, 8);
  assert.equal(w.karakter().pa, pa0, "yanıt gelmeden hasılat yazılmaz");

  // Üçüncü teslim: hedef yazılı sonucu döner (ikinci satış yok), kaynak bir kez kapatır.
  w.zaman.saat = w.kayit("develi").depolama.alarmAni!;
  await w.kayit("develi").ornek.alarm();
  assert.equal(w.defter("develi")!.c.k.length, 0);
  assert.equal((w.kayit("karapinar").depolama.veri.get("m") as Nesne).st?.kereste, 8, "çift satış yok");
  const kar = w.karakter();
  // Ay dönümü de akçeyi değiştirebilir: defterin kervan kalemi hasılatın kendisidir.
  const kalem = kar.df!.find((x) => x[0] === w.ay + 1)![1].kervan;
  assert.equal(kalem, o.tahmin.hasilat, "önizleme = gerçek hasılat");
  assert.equal(kar.ev!.kereste, 20 + 2, "satılmayan 2 kereste envantere döndü");
  const vardi = w.olaylar("develi").filter((x) => x.k === "olay.kervan.vardi");
  assert.equal(vardi.length, 1);
  assert.deepEqual(vardi[0]!.p, { hedef: "karapinar", hedefAd: "Karapınar", hasilat: o.tahmin.hasilat, satilan: 8, kalan: 2 });
  assert.equal(vardi[0]!.g, w.o, "olay yalnız tüccara görünür");

  // Sonraki istekler ve alarmlar ikinci kez yazmaz.
  const pa1 = kar.pa;
  await w.cagir({ islem: "durum" });
  await w.kayit("develi").ornek.alarm();
  assert.equal(w.karakter().pa, pa1);
  assert.equal(w.olaylar("develi").filter((x) => x.k === "olay.kervan.vardi").length, 1);
  assert.equal(w.kesinti.varis, 3);
});

test("kervan akışı: hedef kalıcı reddederse bütün yük kaynağa döner; ayda 2 kervan sınırı DO'da da geçerli", async () => {
  const w = await dunya();
  const a = await w.cagir({ islem: "kervanGonder", govde: { hedef: "konuralp", mallar: { odun: 5, kereste: 3 }, istekNo: "kervan-0101" } });
  assert.ok(a.ok, JSON.stringify(a));
  const b = await w.cagir({ islem: "kervanGonder", govde: { hedef: "karapinar", mallar: { odun: 2 }, istekNo: "kervan-0102" } });
  assert.ok(b.ok, JSON.stringify(b));
  const on = (await w.cagir({ islem: "kervan", hedef: "demirhan", mallar: "odun:1" })).deger as Nesne;
  assert.equal(on.engel, "kervan_aylik_siniri");
  assert.deepEqual(on.aylik.kullanilan, 2);
  assert.deepEqual(await w.cagir({ islem: "kervanGonder", govde: { hedef: "demirhan", mallar: { odun: 1 }, istekNo: "kervan-0103" } }), { ok: false, hata: "kervan_aylik_siniri" });
  assert.equal(w.karakter().ev!.odun, 13);

  w.zaman.saat += AY_MS;
  w.kesinti.red = 1;
  const pa0 = w.karakter().pa;
  await w.kayit("develi").ornek.alarm();
  assert.equal(w.defter("develi")!.c.k.length, 0, "ret ve kabul ikisi de kapandı");
  const kar = w.karakter();
  const donen = w.olaylar("develi").filter((x) => x.k === "olay.kervan.dondu");
  const vardi = w.olaylar("develi").filter((x) => x.k === "olay.kervan.vardi");
  assert.equal(donen.length + vardi.length, 2);
  assert.equal(donen.length, 1);
  // İlk teslim edilen (konuralp) reddedildi: 5 odun + 3 kereste geri; karapınar 2 odunu satın aldı.
  assert.deepEqual(donen[0]!.p, { hedef: "konuralp", hedefAd: "Konuralp", kalan: 8 });
  assert.equal(kar.ev!.kereste, 30);
  assert.equal(kar.ev!.odun, 13 + 5);
  assert.equal(kar.df!.find((x) => x[0] === w.ay + 1)![1].kervan ?? 0, vardi[0]!.p.hasilat);
  assert.ok(kar.pa >= pa0);
});

test("fiyat haberi: düğüm kapısı, 1 takat, aynı beylikten 3 yerleşim, geçerliyken yeniden ücret yok", async () => {
  const w = await dunya();
  assert.deepEqual(await w.cagir({ islem: "kervanHaber", govde: { istekNo: "haber-0001" } }), { ok: false, hata: "dugum_kapali" });
  w.karakterYaz((k) => seviyeVer(k, "tuccar.fiyatHaberi", 1));
  const tk0 = w.karakter().tk;
  const h = await w.cagir({ islem: "kervanHaber", govde: { istekNo: "haber-0002" } });
  assert.ok(h.ok, JSON.stringify(h));
  assert.equal(h.deger.yeni, true);
  assert.deepEqual(h.deger.haber.yerlesimler.map((x: Nesne) => x.yerlesim), ["demirhan", "karapinar", "yassioren"]);
  assert.ok(h.deger.haber.yerlesimler.every((x: Nesne) => x.pahali.length === 3 && x.lonca.length > 0));
  assert.equal(h.deger.haber.gecerli, w.ay + 1);
  assert.equal(h.deger.takat, tk0 - HABER_TAKAT);
  const tekrar = await w.cagir({ islem: "kervanHaber", govde: { istekNo: "haber-0003" } });
  assert.equal(tekrar.deger.yeni, false);
  assert.equal(tekrar.deger.takat, tk0 - HABER_TAKAT, "geçerli haber yeniden ücret almaz");
  const on = (await w.cagir({ islem: "kervan", hedef: null, mallar: null })).deger as Nesne;
  assert.deepEqual(on.haber, h.deger.haber);
});
