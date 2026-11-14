// Darbe ganimetinin oyuncu akçesine bağlanması: BolgeDO kalıcı kuyruğu → YerlesimDO kesinti ve pay.
// Değişmezler: kesilen = dağıtılan (+ kasaya yazılan), tekrar teslim ikinci kez kesmez/ödemez, geçici hata kuyruğu korur.
import test from "node:test";
import assert from "node:assert/strict";
import { BolgeDO, YerlesimDO } from "../src/index.ts";
import { yerlesimCagir } from "../src/ic.ts";
import { oyunAyi } from "../src/saat.ts";
import { bolgeAyi, bolgeKur, defterTutarli } from "../src/siyaset/bolge.ts";
import { darbeGorunumu } from "../src/siyaset/darbe.ts";
import { GANIMET_AKCE_YUZDE, GANIMET_PENCERE_AY, ganimetIsiAc, ganimetKesinti, ganimetPaylari } from "../src/siyaset/ganimet.ts";
import { ganimetIsiTutarli, ganimetKesildi, ganimetOdendi, ganimetSiradaki, ganimetUlasilamadi } from "../src/siyaset/ganimet-kuyruk.ts";
import { bolgeCagir } from "../src/siyaset/ic.ts";
import { sultanlikKur, sultanlikOzeti } from "../src/siyaset/sultanlik.ts";
import type { BolgeDurumu, DarbeDestegi, DarbePlani } from "../src/siyaset/tipler.ts";
import type { Env } from "../src/tipler.ts";
import type { Karakter } from "../src/yerlesim/tipler.ts";
import { sahteAdAlani } from "./yardimci.ts";

type OlayYaniti = { olaylar: { gorunurluk: string; ozet: { k: string; p: Record<string, number> } }[] };

const destek = (kisi: string, hesap: string, rol: "sehirBeyi" | "ahiBasi" = "ahiBasi"): DarbeDestegi =>
  ({ kisi, hesap, ad: kisi, koltuk: `${rol}:x`, rol, kume: [`h:${hesap}`], ay: 0 });

function plan(durum: DarbePlani["durum"], ek: Partial<DarbePlani> = {}): DarbePlani {
  return {
    v: 1, id: "demirhan:darbe:g1", durum, baslatanKisi: "develi/o1", baslatanHesap: "h-lider",
    acilisAy: 0, sogumaSonAy: 0, destekler: [destek("develi/o2", "h-destek")], savunma: [destek("develi/o3", "h-savunan"), destek("develi/o4", "h-savunan2")],
    garnizonSadakati: 0, yatirilan: 0, izler: [], ...ek,
  };
}

test("ganimet kuyruğu: saf formüller tek yerde ve toplam korunur", () => {
  assert.deepEqual(ganimetKesinti(1003, undefined, "d1", 10), { neden: "uygulandi", tutar: Math.floor((1003 * GANIMET_AKCE_YUZDE) / 100), once: 1003, tavan: 250 });
  assert.equal(ganimetKesinti(1003, { darbeId: "d1", ay: 10 }, "d1", 10).tutar, 0, "aynı darbe ikinci kez kesmez");
  assert.equal(ganimetKesinti(1003, { darbeId: "d0", ay: 10 }, "d1", 10 + GANIMET_PENCERE_AY - 1).neden, "pencere");
  assert.equal(ganimetKesinti(1003, { darbeId: "d0", ay: 10 }, "d1", 10 + GANIMET_PENCERE_AY).neden, "uygulandi");
  assert.equal(ganimetKesinti(-5, undefined, "d1", 1).tutar, 0);
  for (const [t, n] of [[0, 3], [1, 3], [350, 3], [7, 7], [100, 1]] as const) {
    const p = ganimetPaylari(t, n);
    assert.equal(p.length, n);
    assert.equal(p.reduce((a, b) => a + b, 0), t);
    assert.ok(Math.max(...p) - Math.min(...p) <= 1);
  }
});

test("ganimet kuyruğu: iş yalnız kesin sonuçta ve iki taraf doluyken açılır", () => {
  const d = bolgeKur("demirhan", 5);
  d.darbe = plan("pat");
  assert.equal(ganimetIsiAc(d, 6), false, "patta kimse kaybetmez");
  d.darbe = plan("basarili", { savunma: [] });
  assert.equal(ganimetIsiAc(d, 6), false, "savunan yoksa kesilecek kimse yok");
  d.darbe = plan("basarili", { savunma: [destek("develi/o9", "h-lider")] });
  assert.equal(ganimetIsiAc(d, 6), false, "iki tarafta olan hesap kesilmez");
  d.darbe = plan("bastirildi", { destekler: [destek("develi/o2", "h-destek"), destek("develi/o7", "h-destek")] });
  assert.equal(ganimetIsiAc(d, 6), true);
  assert.equal(ganimetIsiAc(d, 6), false, "aynı darbe ikinci iş açmaz");
  const is = d.ganimetGiden![0]!;
  assert.deepEqual(is.kaybedenler.map((x) => x.hesap), ["h-lider", "h-destek"], "aynı hesap bir kez");
  assert.deepEqual(is.kazananlar.map((x) => x.hesap), ["h-savunan", "h-savunan2"]);
});

test("ganimet kuyruğu: ay dönümünde sonuçlanan darbe işi açar", () => {
  const d = bolgeKur("demirhan", 5);
  d.mesruiyet.puan = 90;
  d.g.guvenlik = 100;
  d.sultanlik = sultanlikOzeti(sultanlikKur(0));
  d.sultanlik.mesruiyet.puan = 100;
  d.darbe = plan("catışma", { destekler: [], cozumAy: d.ay + 1 });
  bolgeAyi(d, d.ay + 1, Date.now());
  assert.equal(d.darbe!.durum, "bastirildi");
  assert.equal(d.ganimetGiden?.length, 1);
  const is = d.ganimetGiden![0]!;
  assert.equal(is.darbeId, "demirhan:darbe:g1");
  assert.deepEqual(is.kaybedenler.map((x) => x.hesap), ["h-lider"], "bastırılan darbede başlatan kaybeder");
  assert.deepEqual(is.kazananlar.map((x) => x.hesap), ["h-savunan", "h-savunan2"]);
});

test("ganimet kuyruğu: adımlar, sıfır pay, ulaşılamayan taraf ve kapanış", () => {
  const d = bolgeKur("demirhan", 5);
  d.darbe = plan("basarili");
  ganimetIsiAc(d, 6);
  const is = d.ganimetGiden![0]!;
  const a1 = ganimetSiradaki(d).adim!;
  assert.deepEqual([a1.tur, a1.yerlesim, a1.hedef.hesap, a1.istekNo], ["kes", "develi", "h-savunan", "darbe:demirhan:darbe:g1:kayip:develi/o3"]);
  assert.equal(ganimetSiradaki(d).adim!.istekNo, a1.istekNo, "yanıt işlenmeden aynı adım döner");
  ganimetKesildi(a1, 101);
  const a2 = ganimetSiradaki(d).adim!;
  ganimetUlasilamadi(d, a2);
  assert.equal(a2.hedef.tutar, 0, "ulaşılamayan kaybeden kesilmez");
  const a3 = ganimetSiradaki(d);
  assert.equal(a3.degisti, true);
  assert.equal(is.asama, "dagit");
  assert.ok(ganimetIsiTutarli(is));
  assert.deepEqual(is.kazananlar.map((x) => x.tutar), [51, 50]);
  assert.equal(a3.adim!.tur, "pay");
  ganimetOdendi(a3.adim!);
  const kasa0 = d.kasa;
  const a4 = ganimetSiradaki(d).adim!;
  ganimetUlasilamadi(d, a4);
  assert.equal(d.kasa, kasa0 + 50, "ödenemeyen pay yakılmaz, vali kasasına girer");
  assert.ok(defterTutarli(d));
  assert.deepEqual(ganimetSiradaki(d), { adim: null, degisti: true });
  assert.equal(d.ganimetGiden, undefined);
  const satir = d.kayit.find((s) => s.tur === "darbeGanimet")!;
  assert.deepEqual(satir.m.p, { tutar: 101, kaybeden: 1, kazanan: 1 });
  assert.deepEqual(darbeGorunumu(d)!.ganimet, { akceYuzde: GANIMET_AKCE_YUZDE, pencereAy: GANIMET_PENCERE_AY });
});

/** Gerçek YerlesimDO + BolgeDO; yerleşim çağrıları sayılır ve istenirse düşürülür. */
async function dunya() {
  const saat = Date.now();
  const env = {} as Env;
  const yerlesimler = sahteAdAlani((ctx) => new YerlesimDO(ctx, env, () => saat));
  const bolgeler = sahteAdAlani((ctx) => new BolgeDO(ctx, env, () => saat));
  const kesinti = { dusur: 0, yanitYut: 0, cagri: [] as string[] };
  env.YERLESIM = {
    ...yerlesimler,
    get: (id) => {
      const gercek = yerlesimler.get(id);
      return {
        id,
        fetch: async (girdi: Request | string, init?: RequestInit) => {
          const ilk = typeof girdi === "string" ? new Request(girdi, init) : girdi;
          const govde = (await ilk.json()) as { islem: string; govde?: { istekNo?: string } };
          const istek = new Request("https://ic/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(govde) });
          if (!govde.islem.startsWith("ganimet")) return gercek.fetch(istek);
          kesinti.cagri.push(`${govde.islem}:${govde.govde?.istekNo}`);
          if (kesinti.dusur > 0) {
            kesinti.dusur--;
            throw new Error("yerleşim geçici olarak erişilemez");
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
  env.BOLGE = bolgeler;
  const ay = oyunAyi(saat);
  const sakin = async (hesapId: string, ad: string, akce: number) => {
    const r = await yerlesimCagir<{ id: string }>(env, { islem: "sakinEkle", yerlesim: "develi", sakin: { hesapId, ad, cinsiyet: "erkek", dogumAyi: ay - 30 * 12 } });
    assert.ok(r.ok, JSON.stringify(r));
    const depolama = [...yerlesimler.ornekler.values()][0]!.depolama;
    const kar = depolama.veri.get(`o:${r.deger.id}`) as Karakter;
    kar.pa = akce;
    depolama.veri.set(`o:${r.deger.id}`, kar);
    return { hesap: hesapId, kisi: `develi/${r.deger.id}`, o: r.deger.id };
  };
  const para = (o: string) => ([...yerlesimler.ornekler.values()][0]!.depolama.veri.get(`o:${o}`) as Karakter).pa;
  const karakter = (o: string) => [...yerlesimler.ornekler.values()][0]!.depolama.veri.get(`o:${o}`) as Karakter;
  /** Bölge durumunu depoda değiştirir ve DO'yu depodan yeniden açar. */
  const bolgeYaz = async (degistir: (d: BolgeDurumu) => void) => {
    await bolgeCagir(env, { islem: "gorunum", bolge: "demirhan", hesapId: "yok" });
    const [bk, kayit] = [...bolgeler.ornekler.entries()][0]!;
    const d = kayit.depolama.veri.get("bolge") as BolgeDurumu;
    degistir(d);
    kayit.depolama.veri.set("bolge", d);
    kayit.ornek = new BolgeDO({ id: env.BOLGE.idFromString(bk), storage: kayit.depolama } as unknown as DurableObjectState, env, () => saat);
  };
  const bolge = () => [...bolgeler.ornekler.values()][0]!;
  const durum = () => bolge().depolama.veri.get("bolge") as BolgeDurumu;
  return { env, ay, sakin, para, karakter, bolgeYaz, bolge, durum, kesinti, yerlesimler };
}

test("ganimet uçtan uca: kesilen akçe kazananlara tam dağıtılır, tekrar teslim ve yeni darbe penceresi ikinci kez kesmez", async () => {
  const w = await dunya();
  const lider = await w.sakin("h-lider", "Lider", 900);
  const destekci = await w.sakin("h-destek", "Destek", 0);
  const savunan = await w.sakin("h-savunan", "Savunan", 1003);
  const savunan2 = await w.sakin("h-savunan2", "Savunan İki", 400);
  // Yerleşim motoru bellekteki karakterleri depodan yeniden yüklesin.
  for (const k of w.yerlesimler.ornekler.values()) k.ornek = new YerlesimDO({ id: w.env.YERLESIM.idFromName("yerlesim:develi"), storage: k.depolama } as unknown as DurableObjectState, w.env, () => Date.now());
  const toplam0 = [lider, destekci, savunan, savunan2].reduce((t, x) => t + w.para(x.o), 0);
  await w.bolgeYaz((d) => {
    d.darbe = plan("basarili", {
      baslatanKisi: lider.kisi, baslatanHesap: lider.hesap,
      destekler: [destek(destekci.kisi, destekci.hesap)],
      savunma: [destek(savunan.kisi, savunan.hesap), destek(savunan2.kisi, savunan2.hesap)],
    });
    assert.equal(ganimetIsiAc(d, w.ay), true);
  });

  // İlk deneme: yerleşim erişilemez → hiçbir şey değişmez, iş kuyrukta kalır, yeniden deneme alarmı kurulur.
  w.kesinti.dusur = 1;
  await w.bolge().ornek.alarm();
  assert.equal(w.durum().ganimetGiden?.length, 1);
  assert.equal(w.para(savunan.o), 1003);
  assert.ok((await w.bolge().depolama.getAlarm())! <= Date.now() + 61_000, "yeniden deneme alarmı");

  // İkinci deneme: ilk kesintinin yanıtı kaybolur (yerleşim kesti, bölge duymadı) → adım yinelenir, akçe bir kez kesilir.
  w.kesinti.yanitYut = 1;
  await w.bolge().ornek.alarm();
  assert.equal(w.para(savunan.o), 1003 - 250, "yanıt kaybolsa da kesinti yerleşimde kalıcı");
  assert.equal(w.durum().ganimetGiden![0]!.kaybedenler.every((x) => !x.bitti), true);
  await w.bolge().ornek.alarm();

  assert.equal(w.durum().ganimetGiden, undefined, "iş kapandı");
  assert.equal(w.para(savunan.o), 1003 - 250);
  assert.equal(w.para(savunan2.o), 400 - 100);
  assert.equal(w.para(lider.o), 900 + 175);
  assert.equal(w.para(destekci.o), 175);
  assert.equal([lider, destekci, savunan, savunan2].reduce((t, x) => t + w.para(x.o), 0), toplam0, "akçe doğmadı, yakılmadı");
  assert.equal(w.kesinti.cagri.filter((x) => x.includes(":kayip:" + savunan.kisi)).length, 3, "aynı istekNo üç kez gitti, bir kez işlendi");
  assert.deepEqual(w.durum().kayit.find((s) => s.tur === "darbeGanimet")!.m.p, { tutar: 350, kaybeden: 2, kazanan: 2 });
  assert.ok(defterTutarli(w.durum()));

  // Oyuncu ne olduğunu görür: yalnız kendine görünen olay ve defter kalemi.
  const olaylar = await yerlesimCagir<OlayYaniti>(w.env, { islem: "olaylar", yerlesim: "develi", hesapId: savunan.hesap });
  assert.ok(olaylar.ok);
  assert.deepEqual(olaylar.deger.olaylar.filter((o) => o.ozet.k.startsWith("olay.darbe.")).map((o) => [o.ozet.k, o.ozet.p.tutar, o.ozet.p.yuzde, o.gorunurluk]), [["olay.darbe.ganimetKayip", 250, GANIMET_AKCE_YUZDE, "ozel"]]);
  const kazananOlay = await yerlesimCagir<OlayYaniti>(w.env, { islem: "olaylar", yerlesim: "develi", hesapId: lider.hesap });
  assert.ok(kazananOlay.ok);
  assert.deepEqual(kazananOlay.deger.olaylar.filter((o) => o.ozet.k.startsWith("olay.darbe.")).map((o) => [o.ozet.k, o.ozet.p.tutar]), [["olay.darbe.ganimetPay", 175]]);
  assert.equal(w.karakter(savunan.o).df!.at(-1)![1].darbe, -250);

  // Soğuma penceresindeki yeni darbe aynı oyuncuyu yeniden kesmez; pencere dolunca keser.
  const yeniden = (darbeId: string, ay: number) => yerlesimCagir<{ tutar: number }>(w.env, {
    islem: "ganimetKes", yerlesim: "develi", hesapId: savunan.hesap, govde: { istekNo: `darbe:${darbeId}:kayip:${savunan.kisi}`, darbeId, ay },
  });
  assert.deepEqual(await yeniden("demirhan:darbe:g2", w.ay + GANIMET_PENCERE_AY - 1), { ok: true, deger: { tutar: 0 } });
  const sonra = await yeniden("demirhan:darbe:g3", w.ay + GANIMET_PENCERE_AY);
  assert.deepEqual(sonra, { ok: true, deger: { tutar: Math.floor(((1003 - 250) * GANIMET_AKCE_YUZDE) / 100) } });
  assert.deepEqual(await yeniden("demirhan:darbe:g3", w.ay + GANIMET_PENCERE_AY), sonra, "aynı istekNo aynı tutar, ikinci kesinti yok");
});

test("ganimet uçtan uca: kayıp kazanan kuyruğu tıkamaz, payı vali kasasına girer; bozuk iç ileti reddedilir", async () => {
  const w = await dunya();
  const savunan = await w.sakin("h-savunan", "Savunan", 800);
  for (const k of w.yerlesimler.ornekler.values()) k.ornek = new YerlesimDO({ id: w.env.YERLESIM.idFromName("yerlesim:develi"), storage: k.depolama } as unknown as DurableObjectState, w.env, () => Date.now());
  await w.bolgeYaz((d) => {
    d.darbe = plan("basarili", { baslatanKisi: "develi/o999", baslatanHesap: "h-yok", destekler: [], savunma: [destek(savunan.kisi, savunan.hesap)] });
    assert.equal(ganimetIsiAc(d, w.ay), true);
  });
  const kasa0 = w.durum().kasa;
  await w.bolge().ornek.alarm();
  assert.equal(w.durum().ganimetGiden, undefined);
  assert.equal(w.para(savunan.o), 600);
  assert.equal(w.durum().kasa, kasa0 + 200);
  assert.ok(defterTutarli(w.durum()));
  assert.ok(w.durum().kayit.some((s) => s.tur === "darbeGanimetKasa"));

  const bozuk = (govde: unknown, islem: "ganimetKes" | "ganimetPay" = "ganimetPay") => yerlesimCagir(w.env, { islem, yerlesim: "develi", hesapId: savunan.hesap, govde });
  assert.deepEqual(await bozuk({ istekNo: "x", darbeId: "d", ay: 1, tutar: 5 }), { ok: false, hata: "gecersiz_istek" });
  assert.deepEqual(await bozuk({ istekNo: "darbe:d:pay:k", darbeId: "d", ay: 1, tutar: -5 }), { ok: false, hata: "deger_sinir_disi" });
  assert.deepEqual(await bozuk({ istekNo: "darbe:d:pay:k", darbeId: "d", ay: 1, tutar: 1.5 }), { ok: false, hata: "deger_sinir_disi" });
  assert.deepEqual(await bozuk(null, "ganimetKes"), { ok: false, hata: "gecersiz_istek" });
  assert.equal(w.para(savunan.o), 600);
});
