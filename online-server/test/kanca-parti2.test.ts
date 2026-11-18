// Kanca partisi 2 (18 Kasım): boşta kancaların ikinci bağlanışı. Her bağlanan kanca için davranış testi (çoğu tablo
// güdümlü). Bölümler: hizmet pazarı (kalite, yeni hizmetler, araç, onarım, işleme, hak), kasaba görevleri, tarifler,
// kervan, ortak dert, tezgâh (komisyon, bakım, nam yayma, hileli tartı, denetim), eşya aileleri.
import test from "node:test";
import assert from "node:assert/strict";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { kancaAnahtari } from "../src/icerik/kanca-kayit.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import { dugumSeviyesi } from "../src/yerlesim/meslek.ts";
import { hizmetTarifiBul } from "../src/yerlesim/hizmet-tarif.ts";
import { HIZMET_KALITE_TAVAN, KIRGIN_GONUL_TABANI, etkiOnizleme, hizmetHazirla, hizmetIlanAc, hizmetIlanIsle, hizmetNpcTalebiAc, hizmetNpcTalepTeslim } from "../src/yerlesim/hizmet-pazari.ts";
import { ekonomiAl, type EkonomiKaydi } from "../src/yerlesim/pazar-tahta.ts";
import { halAl } from "../src/yerlesim/hal.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const AY = 300;

export function yetiskin(k: Kasaba, no: number): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 25);
  kar.pa = 2000;
  kar.tk = 60;
  kar.ta = AY;
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  return kar;
}

export function kaynak(kanca: string) {
  const e = ETKILER.find((x) => kancaAnahtari(x.etki) === kanca);
  if (!e) throw new Error(`ağaçta yok: ${kanca}`);
  return e;
}

/** Verilen kancaları (ve düğümlerinin önceki seviyelerini) öğrenmiş yetişkin. */
export function ogrenmis(k: Kasaba, no: number, ...kancalar: string[]): Karakter {
  const c = yetiskin(k, no);
  for (const x of kancalar) {
    const e = kaynak(x);
    seviyeVer(c, e.dugum, Math.max(e.seviye, dugumSeviyesi(c, e.dugum)));
  }
  return c;
}

function bolEnvanter(c: Karakter): void {
  c.ev = { ...(c.ev ?? {}), sifaliOt: 40, bez: 40, komur: 40, civi: 40, ot: 40, ekmek: 40, corba: 40, un: 40, kereste: 40 };
}

function ekonomi(k: Kasaba): EkonomiKaydi {
  return ekonomiAl(k);
}

/** Hazırla → ilana koy → başkasına sat. */
function hazirlaSat(k: Kasaba, satici: Karakter, alici: Karakter, hizmet: string) {
  const ek = ekonomi(k);
  bolEnvanter(satici);
  const h = hizmetHazirla(ek, satici, hizmet, 1, AY);
  assert.ok(h.ok, `${hizmet} hazırla: ${JSON.stringify(h)}`);
  if (!h.ok) throw new Error();
  const t = hizmetTarifiBul(hizmet)!;
  const il = hizmetIlanAc(ek, satici, `h${h.deger.stok.i}`, 1, t.fiyatTaban, AY);
  assert.ok(il.ok, `${hizmet} ilan`);
  if (!il.ok) throw new Error();
  const r = hizmetIlanIsle(ek, alici, satici, `hi${il.deger.i}`, 1, AY);
  return { hazir: h.deger, ilan: il.deger, r };
}

// ── Hizmet pazarı ──

const YENI_HIZMETLER = ["gucDogum", "yaraDikisi", "dertlesme", "turkuYak", "atisma", "barisIlahisi", "onarimHizmeti", "yelekOnarimi", "postTabaklama"];

test("parti 2 hizmetler: her yeni hizmet düğümüyle açılır, düğümsüz kapalı", () => {
  const k = testKasabasi("develi", AY);
  let no = 1;
  for (const h of YENI_HIZMETLER) {
    const ek = ekonomi(k);
    const bos = yetiskin(k, no++);
    bolEnvanter(bos);
    const r0 = hizmetHazirla(ek, bos, h, 1, AY);
    assert.deepEqual(r0, { ok: false, hata: "dugum_kapali" }, h);
    const c = ogrenmis(k, no++, `hizmet:${h}`);
    bolEnvanter(c);
    const r = hizmetHazirla(ek, c, h, 1, AY);
    assert.ok(r.ok, `${h}: ${JSON.stringify(r)}`);
  }
});

/** [kalite kancası, hizmet kancası, hizmet] — kalite yüzdesi stoğa yazılır ve alıcıya etkisi artar. */
const KALITE_TABLOSU: [string, string, string][] = [
  ["kalite:turku", "hizmet:turku", "turku"],
  ["kalite:teselli", "hizmet:teselli", "teselli"],
  ["kalite:lohusa", "hizmet:lohusa", "lohusa"],
  ["kalite:kirikSar", "hizmet:kirikSar", "kirikSar"],
  ["kalite:sifa", "hizmet:yaraBak", "yaraBak"],
  ["kalite:dertlesme", "hizmet:dertlesme", "dertlesme"],
  ["kalite:turkuYak", "hizmet:turkuYak", "turkuYak"],
  ["kalite:destan", "hizmet:turkuYak", "turkuYak"],
  ["kalite:barisSofrasi", "hizmet:barisSofrasi", "barisSofrasi"],
  ["kalite:gucDogum", "hizmet:gucDogum", "gucDogum"],
];

test("hizmet kalitesi: kalite kancası stoğa yüzde yazar, alıcıya giden hal etkisi artar (tavanlı, dökümlü)", () => {
  for (const [kq, kh, h] of KALITE_TABLOSU) {
    const k = testKasabasi("develi", AY);
    const sade = ogrenmis(k, 1, kh);
    const usta = ogrenmis(k, 2, kh, kq, ...(h === "barisSofrasi" ? ["sinerji:barisCorbasi"] : []));
    if (h === "barisSofrasi") seviyeVer(usta, "asci.corbaci", 1);
    const a2 = yetiskin(k, 4);
    a2.hl = [40, 40, 40, AY];
    // Sade (kalitesiz) hizmetçi: hizmet açık olduğunda stok kalitesi 0 (barış sofrası sinerjisiz açılmaz; o satır atlanır).
    if (h !== "barisSofrasi") {
      bolEnvanter(sade);
      const r0 = hizmetHazirla(ekonomi(k), sade, h, 1, AY);
      assert.ok(r0.ok && r0.deger.kalite.yuzde === 0 && !r0.deger.stok.q, `${kq}: sade`);
    }
    const u = hazirlaSat(k, usta, a2, h);
    assert.ok(u.hazir.kalite.yuzde > 0 && u.hazir.kalite.yuzde <= HIZMET_KALITE_TAVAN, `${kq}: ${u.hazir.kalite.yuzde}`);
    assert.ok(u.hazir.kalite.kalemler.some((x) => x.kanca === kq), `${kq}: kalem`);
    assert.ok(u.r.ok, kq);
    if (!u.r.ok) continue;
    const top = (e: Record<string, number | undefined>) => Object.values(e).reduce((t: number, x) => t + (x ?? 0), 0);
    const taban = hizmetTarifiBul(h)!.etki.reduce((t, e) => t + (e.tur === "hal" ? e.deger : 0), 0);
    assert.ok(top(u.r.deger.etki) > taban, `${kq}: ${JSON.stringify(u.r.deger.etki)} > ${taban}`);
    const t = hizmetTarifiBul(h)!;
    const on = etkiOnizleme(t, u.hazir.kalite.yuzde, 0);
    assert.ok(on.some((x) => "taban" in x && (x.deger ?? 0) > (x.taban as number)), `${kq}: önizleme`);
  }
});

test("hizmet aracı: neşterle yara dikişi +10 can, sazla türkü/atışma +3 gönül; araç aşınır, araçsız ek yok", () => {
  for (const [h, kh, ka, mal, ek] of [
    ["yaraDikisi", "hizmet:yaraDikisi", "arac:yaraDikisi:alet", "alet", 10],
    ["turku", "hizmet:turku", "arac:sazliSahne:saz", "saz", 3],
    ["atisma", "hizmet:atisma", "arac:sazliSahne:saz", "saz", 3],
    ["turkuYak", "hizmet:turkuYak", "arac:sazliSahne:saz", "saz", 3],
  ] as const) {
    const k = testKasabasi("develi", AY);
    const c = ogrenmis(k, 1, kh, ka);
    bolEnvanter(c);
    const ekk = ekonomi(k);
    const r0 = hizmetHazirla(ekk, c, h, 1, AY);
    assert.ok(r0.ok && r0.deger.arac === null && !r0.deger.stok.a, `${h}: araçsız`);
    c.ev![mal] = 1;
    const r = hizmetHazirla(ekk, c, h, 1, AY);
    assert.ok(r.ok, h);
    if (!r.ok) continue;
    assert.equal(r.deger.stok.a, ek, h);
    assert.equal(r.deger.arac?.mal, mal);
    assert.equal(c.as?.[mal], 1, `${h}: bir kullanım aşındı`);
    const on = etkiOnizleme(hizmetTarifiBul(h)!, 0, ek);
    assert.equal((on[0] as { deger: number }).deger, (hizmetTarifiBul(h)!.etki[0] as { deger: number }).deger + ek);
  }
});

test("onarım hizmetleri: alıcının aşınmış aletini/silahını/zırhını geri alır; aşınmış araç yoksa satış yok, akçe yerinde", () => {
  for (const [h, kh, mal] of [
    ["onarimHizmeti", "hizmet:onarimHizmeti", "alet"],
    ["onarimHizmeti", "hizmet:onarimHizmeti", "mizrak"],
    ["yelekOnarimi", "hizmet:yelekOnarimi", "zincir"],
  ] as const) {
    const k = testKasabasi("develi", AY);
    const usta = ogrenmis(k, 1, kh);
    const alici = yetiskin(k, 2);
    const pa0 = alici.pa;
    const bos = hazirlaSat(k, usta, alici, h);
    assert.deepEqual(bos.r, { ok: false, hata: "hedef_uygun_degil" }, `${h}: aşınmış yok`);
    assert.equal(alici.pa, pa0);
    alici.ev = { ...(alici.ev ?? {}), [mal]: 1 };
    alici.as = { [mal]: 3 };
    const ekk = ekonomi(k);
    const r = hizmetIlanIsle(ekk, alici, usta, `hi${bos.ilan.i}`, 1, AY);
    assert.ok(r.ok, `${h}/${mal}`);
    if (!r.ok) continue;
    assert.equal(alici.as?.[mal], 1, `${h}/${mal}: 2 kullanım geri`);
    assert.deepEqual(r.deger.onarim, { [mal]: 2 });
    assert.equal(alici.pa, pa0 - bos.ilan.f);
  }
  // Yelek onarımı aleti onarmaz (aile filtresi).
  const k = testKasabasi("develi", AY);
  const usta = ogrenmis(k, 1, "hizmet:yelekOnarimi");
  const alici = yetiskin(k, 2);
  alici.ev = { alet: 1 };
  alici.as = { alet: 3 };
  assert.deepEqual(hazirlaSat(k, usta, alici, "yelekOnarimi").r, { ok: false, hata: "hedef_uygun_degil" });
});

test("post tabaklama: alıcının 2 postu 2 deriye döner (tarif oranı); postu yoksa satış yok", () => {
  const k = testKasabasi("develi", AY);
  const usta = ogrenmis(k, 1, "hizmet:postTabaklama");
  const alici = yetiskin(k, 2);
  alici.ev = { post: 1 };
  const yok = hazirlaSat(k, usta, alici, "postTabaklama");
  assert.deepEqual(yok.r, { ok: false, hata: "girdi_yok" });
  alici.ev = { post: 3 };
  const r = hizmetIlanIsle(ekonomi(k), alici, usta, `hi${yok.ilan.i}`, 1, AY);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(alici.ev?.post, 1);
  assert.equal(alici.ev?.deri, 2);
  assert.deepEqual(r.deger.isleme, { deri: 2 });
});

test("hak:kirginTaban: dertleşmede kırgın gönül en az tabana çıkar; hak yoksa yalnız etkisi kadar", () => {
  const k = testKasabasi("develi", AY);
  const sade = ogrenmis(k, 1, "hizmet:dertlesme");
  const pir = ogrenmis(k, 2, "hizmet:dertlesme", "hak:kirginTaban");
  const a1 = yetiskin(k, 3);
  const a2 = yetiskin(k, 4);
  a1.hl = [60, 60, 5, AY];
  a2.hl = [60, 60, 5, AY];
  assert.ok(hazirlaSat(k, sade, a1, "dertlesme").r.ok);
  assert.ok(hazirlaSat(k, pir, a2, "dertlesme").r.ok);
  assert.ok(halAl(a1, AY).gonul < KIRGIN_GONUL_TABANI);
  assert.equal(halAl(a2, AY).gonul, KIRGIN_GONUL_TABANI);
});

test("hak:dogumTalebi / hak:yasliHane: NPC talebi açılış ayında hak sahibine ayrılır, sonra herkese açılır", () => {
  for (const [hizmet, hak, olayTur] of [["lohusa", "hak:dogumTalebi", "dogum"], ["teselli", "hak:yasliHane", "olum"]] as const) {
    const k = testKasabasi("develi", AY);
    k.hd = { ...(k.hd ?? {}), hz: 100 } as never;
    const ebe = ogrenmis(k, 1, `hizmet:${hizmet}`, hak);
    const baska = ogrenmis(k, 2, `hizmet:${hizmet}`);
    bolEnvanter(ebe);
    bolEnvanter(baska);
    const npc = k.npc.find((n) => n.e !== ebe.e && n.e !== baska.e)!;
    const olay = (olayTur === "dogum"
      ? { t: "dogum", w: "olay-1", h: `n${npc.i}`, g: "", n: 3, k: "olay.dogum", p: {} }
      : { t: "olum", w: "olay-1", h: "", g: "", n: 3, k: "olay.olum", p: { yakini: { i: `n${npc.i}` } } }) as unknown as OlayTaslagi;
    assert.equal(hizmetNpcTalebiAc(k, AY, [olay]).length, 1, hizmet);
    const ek = ekonomi(k);
    const talep = ek.hn!.at(-1)!;
    assert.equal(talep.on, ebe.o, `${hizmet}: öncelik`);
    assert.ok(hizmetHazirla(ek, baska, hizmet, 1, AY).ok);
    assert.ok(hizmetHazirla(ek, ebe, hizmet, 1, AY).ok);
    assert.deepEqual(hizmetNpcTalepTeslim(ek, k, baska, `hn${talep.i}`, AY), { ok: false, hata: "hedef_uygun_degil" });
    // Ertesi ay öncelik biter; başkası da teslim edebilir.
    const r = hizmetNpcTalepTeslim(ek, k, baska, `hn${talep.i}`, AY + 1);
    assert.equal(r.ok, true, `${hizmet}: ertesi ay herkes (${JSON.stringify(r)})`);
  }
});

// ── Kasaba görevleri ──

import { GOREV_KALITE_TAVAN, KASABA_GOREV_KOLTUKLARI, gorevKalitesi, hizmetGorevDonumu, hizmetGorevTeslim } from "../src/yerlesim/hizmet-gorev.ts";
import { gostergeOku } from "../src/yerlesim/topluluk-kayit.ts";

function gorevKasabasi() {
  const k = testKasabasi("develi", AY);
  k.hd = { ...(k.hd ?? {}), hz: 500 } as never;
  return k;
}

test("görev kalitesi: kalite kancası görevin göstergeye katkısına yüzde şansla +1 ekler (tohumlu, tavanlı, dökümlü)", () => {
  for (const [kq, kh, tur, g] of [
    ["kalite:asayis", "hizmet:nobet", "nobet", "asayis"],
    ["kalite:talim", "hizmet:talim", "talim", "asayis"],
    ["kalite:vergiSayimi", "hizmet:vergiSayimi", "vergiSayimi", "asayis"],
    ["kalite:meclisKaydi", "hizmet:meclisKaydi", "meclisKaydi", "moral"],
  ] as const) {
    let ekToplam = 0;
    let deneme = 0;
    for (let i = 0; i < 40; i++) {
      const k = gorevKasabasi();
      hizmetGorevDonumu(k, AY);
      const c = ogrenmis(k, 1, kh, kq);
      c.ev = { mizrak: 5 };
      assert.ok(gorevKalitesi(c, tur) > 0 && gorevKalitesi(c, tur) <= GOREV_KALITE_TAVAN, kq);
      const gorev = ekonomiAl(k).hg!.filter((x) => x.tur === tur)[0]!;
      gorev.i += i * 1000; // farklı tohum
      const once = gostergeOku(k, g);
      const r = hizmetGorevTeslim(k, c, `kg${gorev.i}`, AY);
      assert.ok(r.ok, `${kq}: ${JSON.stringify(r)}`);
      if (!r.ok) continue;
      assert.equal(r.deger.katki.kalite, gorevKalitesi(c, tur));
      assert.equal(gostergeOku(k, g) - once, r.deger.katki.gosterge, kq);
      ekToplam += r.deger.katki.kaliteEk;
      deneme++;
    }
    assert.ok(ekToplam > 0 && ekToplam < deneme, `${kq}: ek ${ekToplam}/${deneme} (şans, kesin değil)`);
  }
});

test("arac:nobet:mizrak: mızrakla nöbette göstergeye +1; kancasız nöbet +1 temel", () => {
  for (const [kancalar, beklenen] of [[["hizmet:nobet"], 1], [["hizmet:nobet", "arac:nobet:mizrak"], 2]] as const) {
    const k = gorevKasabasi();
    hizmetGorevDonumu(k, AY);
    const c = ogrenmis(k, 1, ...kancalar);
    c.ev = { mizrak: 5 };
    const gorev = ekonomiAl(k).hg!.find((x) => x.tur === "nobet")!;
    const r = hizmetGorevTeslim(k, c, `kg${gorev.i}`, AY);
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.deger.katki.gosterge - r.deger.katki.kaliteEk, beklenen);
  }
});

test("hak:nobetKoltuklari / hak:garnizonTalimi: yerleşimde yaşayan sahibi varsa o göreve +1 koltuk (hazineden)", () => {
  for (const [hak, tur] of [["hak:nobetKoltuklari", "nobet"], ["hak:garnizonTalimi", "talim"]] as const) {
    const k = gorevKasabasi();
    hizmetGorevDonumu(k, AY);
    assert.equal(ekonomiAl(k).hg!.filter((x) => x.tur === tur).length, KASABA_GOREV_KOLTUKLARI[tur]);
    const k2 = gorevKasabasi();
    ogrenmis(k2, 1, hak);
    const hz0 = k2.hd!.hz;
    hizmetGorevDonumu(k2, AY);
    assert.equal(ekonomiAl(k2).hg!.filter((x) => x.tur === tur).length, KASABA_GOREV_KOLTUKLARI[tur] + 1, hak);
    assert.equal(hz0 - k2.hd!.hz, ekonomiAl(k2).hg!.length * 4, "ulufe hazineden rezerve; akçe basılmaz");
  }
});

// ── Tarifler (var olan mallarla) ──

import { TARIFLER, type Tarif } from "../src/icerik/tarifler.ts";
import { aletOmru, aylikKalan, tarifYap } from "../src/yerlesim/tarif.ts";
import { MALLAR } from "../src/icerik/mallar.ts";
import { hepBasari } from "./kasaba-yardimci.ts";

const YENI_TARIFLER = ["secmeBugday", "yaylaGocu", "otAyikla", "damarAra", "molozDuvar", "saban", "orak", "suVerilmisKilic", "komutanZirhi", "hatliBelge", "vasiyet"] as const;

function tarifci(k: Kasaba, no: number, id: string): Karakter {
  const c = ogrenmis(k, no, `tarif:${id}`);
  const t = TARIFLER[id as keyof typeof TARIFLER] as Tarif;
  c.ev = Object.fromEntries(Object.entries(t.girdi).map(([m, n]) => [m, (n ?? 0) * 3]));
  return c;
}

test("parti 2 tarifler: düğümle açılır, girdiyi çıktıya çevirir (var olan mal), değer kuralını aşmaz, kaliteEk dökümde", () => {
  const k = testKasabasi("develi", AY);
  let no = 1;
  for (const id of YENI_TARIFLER) {
    const t = TARIFLER[id] as Tarif;
    assert.ok(Object.hasOwn(MALLAR, t.cikti[0]), id);
    const bos = yetiskin(k, no++);
    bos.ev = { ...t.girdi } as never;
    assert.deepEqual(tarifYap(bos, id, AY, hepBasari), { ok: false, hata: "dugum_kapali" }, id);
    const c = tarifci(k, no++, id);
    const r = tarifYap(c, id, AY, hepBasari);
    assert.ok(r.ok, `${id}: ${JSON.stringify(r)}`);
    if (!r.ok) continue;
    assert.equal(r.deger.cikti.mal, t.cikti[0]);
    if (t.kaliteEk) assert.ok(r.deger.kalite.dokum.kalemler.some((x) => x.k === "kalite.tarif" && x.d === t.kaliteEk), id);
    // Değer kuralı: çıktı + yan taban değeri ≤ girdi × 1,3 + takat × 6 (kalite farkı hariç; akçe musluğu yok).
    const cikti = MALLAR[t.cikti[0]].taban * t.cikti[1] + Object.entries(t.yan ?? {}).reduce((a, [m, n]) => a + MALLAR[m as keyof typeof MALLAR].taban * (n ?? 0), 0);
    const girdi = Object.entries(t.girdi).reduce((a, [m, n]) => a + MALLAR[m as keyof typeof MALLAR].taban * (n ?? 0), 0);
    assert.ok(cikti <= girdi * 1.3 + t.takat * 6, `${id}: ${cikti} > ${girdi * 1.3 + t.takat * 6}`);
  }
});

test("tarif:damarAra ayda bir (kalite:damarAra kalite puanına); ertesi ay yeniden; emre konmaz", () => {
  const k = testKasabasi("develi", AY);
  const c = ogrenmis(k, 1, "tarif:damarAra", "kalite:damarAra");
  const t = TARIFLER.damarAra as Tarif;
  assert.ok(tarifYap(c, "damarAra", AY, hepBasari).ok);
  assert.equal(aylikKalan(c, t, AY), 0);
  assert.deepEqual(tarifYap(c, "damarAra", AY, hepBasari), { ok: false, hata: "kota_doldu" });
  c.tk = 60;
  const r = tarifYap(c, "damarAra", AY + 1, hepBasari);
  assert.ok(r.ok);
  if (r.ok) assert.ok(r.deger.kalite.dokum.kalemler.some((x) => x.k === "kalite.beceri" && x.d >= 20), "kalite:damarAra");
});

test("tarif:yaylaGocu çadırla +1 ince yün, çadır aşınır; omur:cadir çadır ömrünü uzatır", () => {
  const k = testKasabasi("develi", AY);
  const c = ogrenmis(k, 1, "tarif:yaylaGocu");
  const d = ogrenmis(k, 2, "tarif:yaylaGocu", "omur:cadir");
  c.ev = { cadir: 1 };
  d.ev = { cadir: 1 };
  const r = tarifYap(c, "yaylaGocu", AY, hepBasari);
  assert.ok(r.ok);
  if (r.ok) {
    assert.ok(r.deger.cikti.adet >= 3);
    assert.equal(r.deger.arac?.mal, "cadir");
  }
  assert.equal(aletOmru(d, "cadir"), aletOmru(c, "cadir") + 1);
});

// ── Kervan (taşıt ve koşum aşınması, kervan kalitesi) ──

import { KERVAN_KAGNI_YUK_EN_COK, KERVAN_TOPLU_YUK_EN_COK, KERVAN_YUK_EN_COK, KERVAN_YUK_MUTLAK, bosKervanDefteri, kervanCikar, yukTavani } from "../src/yerlesim/kervan.ts";
import { kaliteliEkle } from "../src/yerlesim/kalite.ts";

function kervanci(k: Kasaba, no: number, ...kancalar: string[]): Karakter {
  const c = ogrenmis(k, no, "hizmet:kervan", "hizmet:topluYuk", ...kancalar);
  c.ev = { nal: 20, kosum: 3, kereste: 60 };
  return c;
}

test("kervan: koşum her kervanda bir kullanım (ömrü 1: tükenir); omur:kosum ile iki kervan dayanır", () => {
  const k = testKasabasi("develi", AY);
  const c = kervanci(k, 1);
  const d = bosKervanDefteri();
  assert.ok(kervanCikar(d, c, "karapinar", { kereste: 5 }, AY, "kervan:develi:o1:aaaaaaaa", 1000).ok);
  assert.equal(c.ev?.kosum, 2, "kancasız: bugünkü gibi tükendi");
  const u = kervanci(k, 2, "omur:kosum");
  assert.equal(aletOmru(u, "kosum"), 2);
  const d2 = bosKervanDefteri();
  assert.ok(kervanCikar(d2, u, "karapinar", { kereste: 5 }, AY, "kervan:develi:o2:aaaaaaaa", 1000).ok);
  assert.equal(u.ev?.kosum, 3, "omur:kosum: ilk kervanda tükenmedi");
  assert.ok(kervanCikar(d2, u, "konya", { kereste: 4 }, AY, "kervan:develi:o2:bbbbbbbb", 1000).ok);
  assert.equal(u.ev?.kosum, 2);
});

test("kervan taşıtı: kağnı 20, araba 30; toplu yükte taşıt aşınır, omur:araba / omur:kagni ömrü uzatır; kalite yüke ekler", () => {
  const k = testKasabasi("develi", AY);
  const c = kervanci(k, 1);
  c.ev!.kagni = 1;
  assert.equal(yukTavani(c).tavan, KERVAN_KAGNI_YUK_EN_COK);
  c.ev!.araba = 1;
  assert.equal(yukTavani(c).tavan, KERVAN_TOPLU_YUK_EN_COK);
  const d = bosKervanDefteri();
  const r = kervanCikar(d, c, "karapinar", { kereste: 20 }, AY, "kervan:develi:o1:aaaaaaaa", 1000);
  assert.ok(r.ok);
  if (r.ok) assert.ok(r.deger.asinma.some((x) => x.mal === "araba"), "toplu yükte araba aşındı");
  const r2 = kervanCikar(d, c, "konya", { kereste: 5 }, AY, "kervan:develi:o1:bbbbbbbb", 1000);
  assert.ok(r2.ok);
  if (r2.ok) assert.ok(!r2.deger.asinma.some((x) => x.mal === "araba"), "temel yük: taşıt aşınmaz");
  for (const [kanca, mal] of [["omur:araba", "araba"], ["omur:kagni", "kagni"]] as const) {
    const u = kervanci(k, kanca === "omur:araba" ? 3 : 4, kanca);
    assert.equal(aletOmru(u, mal), aletOmru(c, mal) + 2, kanca);
  }
  // Taşıt kalitesi (§9 araç ailesi: yük) ve kalite:kervan (yüzde).
  const q = kervanci(k, 5, "kalite:kervan");
  q.ev!.araba = 0;
  kaliteliEkle(q, "araba", [[3, 1, "o9"]]);
  const yt = yukTavani(q);
  assert.equal(yt.tasitKalite, 3);
  assert.equal(yt.tavan, Math.min(KERVAN_YUK_MUTLAK, Math.floor((KERVAN_TOPLU_YUK_EN_COK + 3) * 1.1)));
  assert.ok(yukTavani(kervanci(k, 6, "kalite:kervan")).tavan > KERVAN_YUK_EN_COK - 1);
});

