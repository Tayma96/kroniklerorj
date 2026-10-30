import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo, type BellekDepo } from "../src/depo.ts";
import { yerlesimeIlet } from "../src/mantik.ts";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { basarili, hata, type Profil, type Sonuc, type YerlesimIleti } from "../src/tipler.ts";
import { iliskiAl } from "../src/yerlesim/eylem.ts";
import { npcNpcBakisi } from "../src/yerlesim/gorus.ts";
import { OLAY_YANIT_EN_COK, YAKINLIK_ESIGI, YerlesimMotoru } from "../src/yerlesim/motor.ts";

const an = (ay: number) => DUNYA_BASLANGICI_MS + ay * AY_MS + 60_000;
type Nesne = Record<string, any>;

async function kur(oyuncu = 2): Promise<{ depo: BellekDepo; m: YerlesimMotoru }> {
  const depo = bellekDepo();
  const m = (await YerlesimMotoru.ac(depo, "develi", an(0)))!;
  for (let i = 1; i <= oyuncu; i++) {
    const r = await m.sakinEkle({ hesapId: `hesap-${i}`, ad: `Oyuncu${i}`, cinsiyet: i % 2 ? "kadın" : "erkek", dogumAyi: -144 });
    assert.deepEqual(r, { ok: true, deger: { id: `o${i}` } });
  }
  return { depo, m };
}

const deger = <T = Nesne>(s: Sonuc<unknown>): T => {
  assert.ok(s.ok, JSON.stringify(s));
  return s.deger as T;
};

test("sakin kaydı tekrar güvenlidir; ocak az oyunculu hanelere dağılır", async () => {
  const { m } = await kur(3);
  assert.deepEqual(await m.sakinEkle({ hesapId: "hesap-1", ad: "Oyuncu1", cinsiyet: "kadın", dogumAyi: -144 }), { ok: true, deger: { id: "o1" } });
  assert.equal(m.kasaba.sakin.length, 3);
  assert.equal(new Set(m.kasaba.sakin.map((s) => s.e)).size, 3);
  const d = deger(await m.durum("hesap-2", an(0), "tr"));
  assert.ok(d.donusKarti.some((o: Nesne) => o.ozet.k === "olay.yeniSakin" && o.kim === "o1"));
  assert.ok(!d.donusKarti.some((o: Nesne) => o.kim === "o2"), "kendi gelişi karta girmez");
});

test("durum: karakter, harita (6 mekân), öğrenme şeridi, imleç; ad dile göre", async () => {
  const { m } = await kur(1);
  assert.deepEqual(await m.durum("hesap-yok", an(0), "tr"), { ok: false, hata: "sakin_yok" });
  const d = deger(await m.durum("hesap-1", an(0), "en"));
  assert.equal(d.ben.yas, 12);
  assert.deepEqual(d.ben.takat, { kalan: 6, tavan: 18, aylik: 6 });
  assert.equal(d.ben.ogrenme.gun, 1);
  assert.equal(d.harita.length, 6);
  assert.equal(d.harita.at(-1).id, "mektep");
  assert.ok(d.ben.hane.some((h: Nesne) => h.rol === "anne"));
  assert.equal(d.imlec, m.imlec);
  const anne = m.kasaba.dizin.get(m.kasaba.kar.get("o1")!.an)!;
  const enAd = d.ben.hane.find((h: Nesne) => h.rol === "anne").ad as string;
  assert.ok(/^[A-Za-z]/.test(enAd), enAd);
  assert.equal(anne.k, 1);
});

test("eylem: aynı istekNo iki kez işlenmez; takat bir kez düşer", async () => {
  const { m } = await kur(1);
  const kar = m.kasaba.kar.get("o1")!;
  const npc = m.kasaba.npc.find((n) => n.e !== kar.e && n.d < -20 * 12)!;
  const govde = { tur: "sohbet", hedef: `n${npc.i}`, istekNo: "eylem-0001" };
  const r1 = deger(await m.eylem("hesap-1", govde));
  const r2 = deger(await m.eylem("hesap-1", govde));
  assert.deepEqual(r2, r1);
  assert.equal(kar.tk, 5);
  assert.equal(r1.takat.kalan, 5);
  assert.equal(typeof r1.zar, "number");
  assert.equal(r1.sans.kalemler.reduce((a: number, k: Nesne) => a + k.d, 0), r1.sans.toplam);
  const r3 = deger(await m.eylem("hesap-1", { ...govde, istekNo: "eylem-0002" }));
  assert.equal(r3.takat.kalan, 4);
  assert.equal(r3.getiri.tekrar, 1);
  assert.deepEqual(await m.eylem("hesap-1", { tur: "sohbet", hedef: `n${npc.i}` }), { ok: false, hata: "istekno_gecersiz" });
});

test("istekNo depodan yeniden açılışta da tanınır", async () => {
  const { depo, m } = await kur(1);
  const kar = m.kasaba.kar.get("o1")!;
  const npc = m.kasaba.npc.find((n) => n.e !== kar.e && n.d < -20 * 12)!;
  const govde = { tur: "yardim", hedef: `n${npc.i}`, istekNo: "eylem-tekrar-01" };
  const r1 = deger(await m.eylem("hesap-1", govde));
  const m2 = (await YerlesimMotoru.ac(depo, "develi", an(0)))!;
  assert.deepEqual(deger(await m2.eylem("hesap-1", govde)), r1);
  assert.equal(deger(await m2.durum("hesap-1", an(0), "tr")).ben.takat.kalan, 5);
});

test("§13.9: NPC'nin üçüncü kişilere bakışı yalnız ona yakınsan (+30 üstü) görünür", async () => {
  const { m } = await kur(2);
  const k = m.kasaba;
  const kar = k.kar.get("o1")!;
  const npc = k.npc.find((n) => n.e !== kar.e && n.b.length >= 1 && n.d < -20 * 12)!;
  await m.tanidik("hesap-1", { hedef: "o2", isaret: "tanidik" });
  const uzak = deger(await m.kisi("hesap-1", `n${npc.i}`, "tr"));
  assert.ok(uzak.sanaBakis.toplam <= YAKINLIK_ESIGI);
  assert.deepEqual(uzak.bakislari, { gorunur: false, liste: [] });
  assert.equal(JSON.stringify(uzak).includes(`"deger"`), false, "hiçbir üçüncü kişi değeri sızmaz");
  // Aile bağları herkesçe bilinir (sayı olmadan).
  assert.ok(Array.isArray(uzak.aile));

  iliskiAl(k.ili.get("o1")!, npc.i).t = YAKINLIK_ESIGI + 1;
  const yakin = deger(await m.kisi("hesap-1", `n${npc.i}`, "tr"));
  assert.equal(yakin.bakislari.gorunur, true);
  for (const b of npc.b) {
    const satir = yakin.bakislari.liste.find((x: Nesne) => x.id === `n${b[0]}`);
    assert.equal(satir.deger, npcNpcBakisi(npc, k.dizin.get(b[0])!)!.deger);
  }
  assert.ok(yakin.bakislari.liste.some((x: Nesne) => x.id === "o2" && typeof x.deger === "number"), "tanıdık oyuncuya bakışı");
  assert.equal(yakin.sanaBakis.kalemler.reduce((a: number, x: Nesne) => a + x.d, 0), yakin.sanaBakis.toplam);
  assert.equal(yakin.eylemler.length, 5);
  assert.deepEqual(await m.kisi("hesap-1", "n999999", "tr"), { ok: false, hata: "kisi_yok" });
  assert.equal(deger(await m.kisi("hesap-1", "o2", "tr")).oyuncu, true);
});

test("olaylar: imleçli ve sayfalı; başkasına özel olaylar görünmez", async () => {
  const { m } = await kur(2);
  while ((await m.yetistir(an(36))).kalan > 0);
  assert.ok(m.imlec > OLAY_YANIT_EN_COK * 2, `olay sayısı ${m.imlec}`);
  const s1 = deger(await m.olaylar("hesap-1", undefined, "tr"));
  assert.equal(s1.olaylar.length, OLAY_YANIT_EN_COK);
  assert.equal(s1.dahaVar, true);
  const s2 = deger(await m.olaylar("hesap-1", String(s1.imlec), "tr"));
  assert.ok(s2.olaylar[0].sira > s1.imlec);
  const siralar = [...s1.olaylar, ...s2.olaylar].map((o: Nesne) => o.sira);
  assert.deepEqual(siralar, [...siralar].sort((a, b) => a - b));
  let imlec = 0;
  const hepsi: Nesne[] = [];
  for (let i = 0; i < 50; i++) {
    const s = deger(await m.olaylar("hesap-1", String(imlec), "tr"));
    hepsi.push(...s.olaylar);
    imlec = s.imlec;
    if (!s.dahaVar) break;
  }
  assert.equal(imlec, m.imlec);
  assert.ok(hepsi.every((o) => o.gorunurluk === "herkes" || o.hedef === "o1"));
  assert.ok(!hepsi.some((o) => o.hedef === "o2" && o.gorunurluk === "ozel"));
  const ogrenme = hepsi.filter((o) => o.ozet.k === "olay.ogrenme.gun");
  assert.equal(ogrenme.length, 5);
  assert.ok(hepsi.some((o) => o.ozet.k === "olay.olum" && typeof o.ozet.p.kisi.ad === "string"));
  assert.deepEqual(await m.olaylar("hesap-1", "-1", "tr"), { ok: false, hata: "imlec_gecersiz" });
  assert.deepEqual(await m.olaylar("hesap-1", "abc", "tr"), { ok: false, hata: "imlec_gecersiz" });
});

test("Dönüş Kartı: iki gün yokken olanlar en çok 5 madde; aynı oturumda yenilemede korunur", async () => {
  const { m } = await kur(1);
  const kar = m.kasaba.kar.get("o1")!;
  const anne = `n${kar.an}`;
  await m.tanidik("hesap-1", { hedef: anne, isaret: "tanidik" });
  deger(await m.durum("hesap-1", an(0), "tr"));
  await m.yetistir(an(4));
  const d1 = deger(await m.durum("hesap-1", an(4), "tr"));
  assert.ok(d1.donusKarti.length > 0 && d1.donusKarti.length <= 5);
  assert.ok(d1.donusKarti.some((o: Nesne) => o.ozet.k === "olay.ogrenme.gun"));
  const d2 = deger(await m.durum("hesap-1", an(4) + 60_000, "tr"));
  assert.deepEqual(d2.donusKarti, d1.donusKarti, "kısa arada kart aynı");
  const d3 = deger(await m.durum("hesap-1", an(4) + 2 * 60 * 60_000, "tr"));
  assert.deepEqual(d3.donusKarti, [], "yeni oturumda yeni bir şey yoksa kart boş");
});

test("tanıdık işaretleri: öğrenme kapısı, oyuncuya dost işareti yok, kendine işaret yok", async () => {
  const { m } = await kur(2);
  const kar = m.kasaba.kar.get("o1")!;
  const npc = `n${kar.an}`;
  assert.deepEqual(await m.tanidik("hesap-1", { hedef: npc, isaret: "dost" }), { ok: false, hata: "ogrenme_kapali" });
  const t = deger(await m.tanidik("hesap-1", { hedef: npc, isaret: "tanidik" }));
  assert.equal(t.tanidiklar[0].id, npc);
  assert.deepEqual(await m.tanidik("hesap-1", { hedef: "o1", isaret: "tanidik" }), { ok: false, hata: "isaret_gecersiz" });
  assert.deepEqual(await m.tanidik("hesap-1", { hedef: "n999999", isaret: "tanidik" }), { ok: false, hata: "kisi_yok" });
  assert.deepEqual(await m.tanidik("hesap-1", { hedef: npc, isaret: "aşık" }), { ok: false, hata: "isaret_gecersiz" });
  await m.yetistir(an(8)); // 5. gün
  const d = deger(await m.tanidik("hesap-1", { hedef: npc, isaret: "dost" }));
  assert.deepEqual(d.ogrenme, [{ gun: 5, odul: { beceri: ["soz", 2] } }]);
  assert.deepEqual(await m.tanidik("hesap-1", { hedef: "o2", isaret: "dost" }), { ok: false, hata: "isaret_gecersiz" });
  assert.equal(deger(await m.tanidik("hesap-1", { hedef: "o2", isaret: "dusman" })).tanidiklar.length, 2);
  assert.equal(deger(await m.tanidik("hesap-1", { hedef: npc, isaret: null })).tanidiklar.length, 1);
});

test("Faz 1 profili: sakin kaydı yoksa ilk yerleşim çağrısında yazılır ve istek yeniden denenir", async () => {
  const depo = bellekDepo();
  const profil: Profil = { hesapId: "h1", ad: "Ayşe", cinsiyet: "kadın", beylik: "demirhan", yerlesim: "develi", dogumAyi: -144, olusturma: 0 };
  const cagrilar: YerlesimIleti[] = [];
  let kayitli = false;
  const cagir = async (i: YerlesimIleti): Promise<Sonuc<unknown>> => {
    cagrilar.push(i);
    if (i.islem === "sakinEkle") {
      kayitli = true;
      return basarili({ id: "o1" });
    }
    return kayitli ? basarili({ tamam: true }) : hata("sakin_yok");
  };
  assert.deepEqual(await yerlesimeIlet(depo, { islem: "durum", hesapId: "h1" }, cagir), { ok: false, hata: "profil_yok" });
  await depo.koy({ profil });
  assert.deepEqual(await yerlesimeIlet(depo, { islem: "durum", hesapId: "h1", dil: "tr" }, cagir), { ok: true, deger: { tamam: true } });
  assert.deepEqual(
    cagrilar.map((c) => c.islem),
    ["durum", "sakinEkle", "durum"],
  );
  assert.equal(cagrilar[0]?.yerlesim, "develi");
});
