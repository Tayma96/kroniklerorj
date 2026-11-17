// Canlı etkinlikler: katalog, yönetici başlat/durdur (yetki, kayıt, tekrar, çakışma, süre), yerleşime dağıtım,
// parametre etkileri (sınır içinde), katılım (bir kez, meslek iki kat, akçe yok) ve etkinlik dertleri (ceza yok).
import test from "node:test";
import assert from "node:assert/strict";
import { bellekDepo } from "../src/depo.ts";
import { YERLESIMLER } from "../src/dunya-veri.ts";
import { basarili, hata, type Sonuc, type YoneticiKimligi, type YonetimUcu } from "../src/tipler.ts";
import { yonetimIsle, type YonetimBaglami } from "../src/yonetim/islem.ts";
import { PARAMETRELER } from "../src/yonetim/parametre.ts";
import { ETKINLIK_TURLERI, ETKINLIKLER, etkiBirlestir, parametreUygula, type EtkinlikOzeti } from "../src/etkinlik/katalog.ts";
import { etkinlikCalisma } from "../src/etkinlik/yonetim.ts";
import { etkinlikGorunumu, etkinlikKatil } from "../src/etkinlik/katilim.ts";
import { etkinlikDertleri } from "../src/yerlesim/ortak-dert.ts";
import { gostergeOku } from "../src/yerlesim/topluluk-kayit.ts";
import { pazarBacOrani, pazarIlanTavani, PAZAR_BAC_ORANI, PAZAR_ILAN_EN_COK } from "../src/yerlesim/pazar-tahta.ts";
import { kervanAylikTavan, KERVAN_AYLIK } from "../src/yerlesim/kervan.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const KURUCU: YoneticiKimligi = { eposta: "k@o.com", sub: "1", hesap: "do-kurucu" };
const MOD: YoneticiKimligi = { eposta: "m@o.com", sub: "2", hesap: "do-mod" };
const SAAT = 3_600_000;

/** Panelde kullanılabilen simge adları (mobile/lib/icon-paths.ts ile aynı küme). */
const IKONLAR = new Set("amphora anvil baby backpack banner beer book boot bow bread bucket camel castle cog coins compass crossed-swords crown family fishing fist flame gems graduate-cap healing herbs hood hourglass house kite leaf lyre map medal party potion prayer-beads prisoner ring saw scales scroll scroll-open sheep shield skull speaker star sun tombstone trophy walk wheat wool".split(" "));

function ortam() {
  const depo = bellekDepo();
  const b: YonetimBaglami = {
    depo,
    simdi: Date.UTC(2026, 10, 16, 10),
    kurucular: new Set([KURUCU.eposta]),
    oyuncuBul: async () => hata("kisi_yok"),
    hesabaYaz: async (_h, d) => basarili(d),
  };
  const yonet = (y: YoneticiKimligi, uc: YonetimUcu, govde?: unknown) =>
    yonetimIsle(b, { islem: "yonet", yonetici: y, uc, govde, sorgu: {} }) as Promise<Sonuc<Record<string, any>>>;
  return { b, depo, yonet };
}
let n = 0;
const no = () => `etk-${String(++n).padStart(6, "0")}`;

test("katalog: en az 15 etkinlik, her birinin kendine has etkisi ve katılımı, simgeler mevcut", () => {
  assert.ok(ETKINLIK_TURLERI.length >= 15);
  const imzalar = new Set<string>();
  for (const tur of ETKINLIK_TURLERI) {
    const t = ETKINLIKLER[tur];
    assert.ok(IKONLAR.has(t.ikon), `${tur}: ${t.ikon}`);
    assert.ok(t.ad.length > 2 && t.ozet.length > 20);
    assert.ok(t.katilim.namN >= 1 && t.katilim.namN <= 2 && t.katilim.gonul <= 6, `${tur}: ödül tavanlı`);
    assert.ok(!t.katilim.mal || t.katilim.mal[1] <= 2, `${tur}: mal armağanı küçük`);
    imzalar.add(JSON.stringify([t.p, t.bac, t.ilanEk, t.kervanEk, t.vergisiz, t.dert, t.katilim]));
  }
  assert.equal(imzalar.size, ETKINLIK_TURLERI.length, "iki etkinlik aynı olamaz");
});

test("parametre etkileri yönetici ayarının üstüne uygulanır ve sınırlar içinde kalır", () => {
  const oz = (tur: EtkinlikOzeti["tur"], id = "e1"): EtkinlikOzeti => ({ id, tur, bas: 0, bit: null });
  const b = parametreUygula({}, [oz("bereket")]);
  assert.equal(b.TEMEL_CIKTI, PARAMETRELER.TEMEL_CIKTI.varsayilan + 1);
  assert.equal(b.NPC_CARPAN, PARAMETRELER.NPC_CARPAN.varsayilan * 0.8);
  // Üst üste binen indirim NPC çarpanını 1,5 sınırının altına indiremez.
  const c = parametreUygula({ NPC_CARPAN: 1.6 }, [oz("bereket"), oz("dugun", "e2")]);
  assert.equal(c.NPC_CARPAN, PARAMETRELER.NPC_CARPAN.alt);
  // Çapraz kural (17 Kasım denetimi E4): sipariş ödül çarpanı NPC alışından kâr açacak kadar yükselemez.
  const l = parametreUygula({ SIPARIS_ODUL_CARPANI: 2.5 }, [oz("lonca")]);
  assert.ok((1 + (l.KITLIK_PRIM ?? PARAMETRELER.KITLIK_PRIM.varsayilan)) * l.SIPARIS_ODUL_CARPANI! < (l.NPC_CARPAN ?? PARAMETRELER.NPC_CARPAN.varsayilan));
  const e = etkiBirlestir([oz("senlik"), oz("panayir", "e2"), oz("ferman", "e3"), oz("haydut", "e4")]);
  assert.equal(e.bac, 0);
  assert.equal(e.ilanEk, 3);
  assert.equal(e.vergisiz, true);
  assert.deepEqual(e.dertler, [{ id: "e4", dert: "haydut" }]);
  const k = testKasabasi("develi", 200);
  assert.equal(pazarBacOrani(k), PAZAR_BAC_ORANI);
  assert.equal(pazarIlanTavani(k), PAZAR_ILAN_EN_COK);
  assert.equal(kervanAylikTavan(k), KERVAN_AYLIK);
  k.pr = { ETKINLIKLER: [oz("panayir"), oz("kervan", "e2")], ETK: etkiBirlestir([oz("panayir"), oz("kervan", "e2")]) };
  assert.equal(pazarBacOrani(k), 0);
  assert.equal(pazarIlanTavani(k), PAZAR_ILAN_EN_COK + 3);
  assert.equal(kervanAylikTavan(k), KERVAN_AYLIK + 1);
});

test("panel: yalnız kurucu başlatır/durdurur, moderatör listeyi görür; kayıt, tekrar, çakışma, kapsam ve süre", async () => {
  const { b, depo, yonet } = ortam();
  await depo.koy({ roller: { "m@o.com": "moderator" } });
  const gov = { tur: "senlik", kapsam: "dunya", saat: 2 };
  assert.deepEqual(await yonet(MOD, "etkinlik-baslat", { ...gov, istekNo: no() }), hata("yetki_yok"));
  const liste0 = await yonet(MOD, "etkinlikler");
  assert.ok(liste0.ok && liste0.deger.katalog.length === ETKINLIK_TURLERI.length && liste0.deger.etkin.length === 0);

  const istek = no();
  const r = await yonet(KURUCU, "etkinlik-baslat", { ...gov, istekNo: istek });
  assert.ok(r.ok);
  assert.equal(r.deger.id, "e1");
  assert.equal(r.deger.etkin, true);
  assert.equal(r.deger.bit, b.simdi + 2 * SAAT);
  // Aynı istekNo aynı sonucu verir, ikinci etkinlik açmaz.
  assert.deepEqual(await yonet(KURUCU, "etkinlik-baslat", { ...gov, istekNo: istek }), r);
  // Aynı tür üst üste açılmaz (dünya kapsamı her yeri kapsar).
  assert.deepEqual(await yonet(KURUCU, "etkinlik-baslat", { tur: "senlik", kapsam: "yerlesim", hedef: "develi", istekNo: no() }), hata("etkinlik_suruyor"));
  assert.deepEqual(await yonet(KURUCU, "etkinlik-baslat", { tur: "yok", kapsam: "dunya", istekNo: no() }), hata("etkinlik_gecersiz"));
  assert.deepEqual(await yonet(KURUCU, "etkinlik-baslat", { tur: "kitlik", kapsam: "beylik", hedef: "olmayan", istekNo: no() }), hata("etkinlik_gecersiz"));
  // Beylik kapsamı yalnız o beyliğin yerleşimlerine gider; süresiz (0 saat) durdurulana kadar sürer.
  const k2 = await yonet(KURUCU, "etkinlik-baslat", { tur: "haydut", kapsam: "beylik", hedef: "demirhan", saat: 0, istekNo: no() });
  assert.ok(k2.ok && k2.deger.bit === null);
  assert.deepEqual((await etkinlikCalisma(depo, "develi", b.simdi)).map((e) => e.tur), ["senlik", "haydut"]);
  assert.deepEqual((await etkinlikCalisma(depo, "yenisehir", b.simdi)).map((e) => e.tur), ["senlik"]);

  // Ne zamandır açık: liste süreyi verir.
  b.simdi += 30 * 60_000;
  const liste = await yonet(MOD, "etkinlikler");
  assert.ok(liste.ok);
  assert.equal(liste.deger.etkin[0].sure, 30 * 60_000);
  // Durdur anlık: listeden çıkar, yerleşime artık gitmez, geçmişe durduran ve süreyle yazılır.
  assert.deepEqual(await yonet(MOD, "etkinlik-durdur", { id: "e2", istekNo: no() }), hata("yetki_yok"));
  const d = await yonet(KURUCU, "etkinlik-durdur", { id: "e2", istekNo: no() });
  assert.ok(d.ok && d.deger.etkin === false && d.deger.durKim === KURUCU.eposta);
  assert.deepEqual((await etkinlikCalisma(depo, "develi", b.simdi)).map((e) => e.tur), ["senlik"]);
  assert.deepEqual(await yonet(KURUCU, "etkinlik-durdur", { id: "e2", istekNo: no() }), hata("etkinlik_yok"));
  // Süresi dolan kendiliğinden biter.
  b.simdi += 2 * SAAT;
  assert.deepEqual(await etkinlikCalisma(depo, "develi", b.simdi), []);
  const son = await yonet(KURUCU, "etkinlikler");
  assert.ok(son.ok);
  assert.deepEqual([son.deger.etkin.length, son.deger.gecmis.map((x: { id: string }) => x.id)], [0, ["e1", "e2"]]);
  const kayit = [...depo.veri.entries()].filter(([x]) => /^kayit:\d/.test(x)).map(([, v]) => v as { islem: string; sonuc: string });
  assert.equal(kayit.filter((x) => x.islem === "etkinlikBaslat" && x.sonuc === "tamam").length, 2);
  assert.equal(kayit.filter((x) => x.islem === "etkinlikDurdur" && x.sonuc === "tamam").length, 1);
  assert.ok(kayit.some((x) => x.islem === "etkinlikYonet" && x.sonuc === "yetki_yok"));
});

test("aynı anda etkin etkinlik tavanı", async () => {
  const { yonet } = ortam();
  const turler = ["senlik", "bereket", "kervan", "ozan", "panayir", "vakif", "dugun"] as const;
  const sonuclar = [];
  for (const tur of turler) sonuclar.push(await yonet(KURUCU, "etkinlik-baslat", { tur, kapsam: "dunya", istekNo: no() }));
  assert.equal(sonuclar.filter((s) => s.ok).length, 6);
  assert.deepEqual(sonuclar.at(-1), hata("etkinlik_siniri"));
});

test("katılım: bir kez, takat ister, meslek iki kat, mal küçük, akçe değişmez; etkinlik bitince katılınamaz", () => {
  const k = testKasabasi("develi", 200);
  const a = oyuncuEkle(k, 1);
  const c = oyuncuEkle(k, 2);
  c.ms = { a: "ciftci", y: "", s: { ciftci: { kd: 1, hz: 0, cy: 0 } } };
  k.pr = { ETKINLIKLER: [{ id: "e7", tur: "bereket", bas: 0, bit: null }] };
  const pa = a.pa;
  const tk = a.tk;
  const r = etkinlikKatil(k, a, { id: "e7" }, k.ay);
  assert.ok(r.ok);
  assert.equal(a.pa, pa, "akçe verilmez");
  assert.equal(a.tk, tk - 1);
  assert.equal(a.ev?.bugday, 2);
  assert.deepEqual(etkinlikKatil(k, a, { id: "e7" }, k.ay), hata("etkinlik_katildin"));
  assert.equal(etkinlikGorunumu(k, a)[0]!.katildin, true);
  const rc = etkinlikKatil(k, c, { id: "e7" }, k.ay);
  assert.ok(rc.ok);
  assert.equal((rc.deger.odul as { meslekCarpani: number }).meslekCarpani, 2);
  const yok = oyuncuEkle(k, 3);
  yok.tk = 0;
  yok.ta = k.ay;
  assert.deepEqual(etkinlikKatil(k, yok, { id: "e7" }, k.ay), hata("takat_yok"));
  assert.equal(yok.ek, undefined, "takat yetmezse iz düşmez");
  k.pr = { ETKINLIKLER: [] };
  assert.deepEqual(etkinlikKatil(k, c, { id: "e9" }, k.ay), hata("etkinlik_yok"));
});

test("etkinlik derdi bir kez açılır, etkinlik bitince kapanır ve başarısızlık göstergeyi düşürmez", () => {
  const k = testKasabasi("develi", 300);
  oyuncuEkle(k, 1);
  const once = gostergeOku(k, "moral");
  const ac = etkinlikDertleri(k, k.ay, [{ id: "e3", dert: "haydut", sureAy: 2 }]);
  assert.equal(ac.length, 1);
  const d = k.tl!.od.find((x) => x.e === "e3")!;
  assert.equal(d.d, "acik");
  assert.equal(etkinlikDertleri(k, k.ay, [{ id: "e3", dert: "haydut", sureAy: 2 }]).length, 0, "ikinci kez açılmaz");
  const kapa = etkinlikDertleri(k, k.ay, []);
  assert.equal(kapa.length, 1);
  assert.equal(d.d, "basarisiz");
  assert.equal(gostergeOku(k, "moral"), once, "erken biten etkinlik derdi ceza getirmez");
  assert.equal(etkinlikDertleri(k, k.ay, [{ id: "e3", dert: "haydut", sureAy: 2 }]).length, 0, "durdurulan etkinlik yeniden dert açmaz");
});

test("bölgeye özel: tür kapsamı (bütün köyler) ve tek yerleşim; kesişen aynı tür reddedilir, kesişmeyen açılır", async () => {
  const { b, depo, yonet } = ortam();
  const koy = YERLESIMLER.find((y) => y.tur === "koy")!;
  const sehir = YERLESIMLER.find((y) => y.tur === "sehir")!;
  const r = await yonet(KURUCU, "etkinlik-baslat", { tur: "panayir", kapsam: "tur", hedef: "koy", istekNo: no() });
  assert.ok(r.ok && r.deger.yerSayisi === YERLESIMLER.filter((y) => y.tur === "koy").length);
  assert.deepEqual((await etkinlikCalisma(depo, koy.id, b.simdi)).map((e) => e.tur), ["panayir"]);
  assert.deepEqual(await etkinlikCalisma(depo, sehir.id, b.simdi), []);
  assert.deepEqual(await yonet(KURUCU, "etkinlik-baslat", { tur: "panayir", kapsam: "yerlesim", hedef: koy.id, istekNo: no() }), hata("etkinlik_suruyor"));
  const s = await yonet(KURUCU, "etkinlik-baslat", { tur: "panayir", kapsam: "yerlesim", hedef: sehir.id, istekNo: no() });
  assert.ok(s.ok && s.deger.yerSayisi === 1);
  assert.deepEqual((await etkinlikCalisma(depo, sehir.id, b.simdi)).map((e) => e.tur), ["panayir"]);
  assert.deepEqual(await yonet(KURUCU, "etkinlik-baslat", { tur: "bereket", kapsam: "tur", hedef: "mahalle", istekNo: no() }), hata("etkinlik_gecersiz"));
});
