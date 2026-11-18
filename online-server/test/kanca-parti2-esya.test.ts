// Kanca partisi 2, eşya/kalite bölümü (18 Kasım): kalite/araç/ömür kancaları (görev, iş sözleşmesi, arabuluculuk,
// kervan, hizmet), eşya aile etkileri (silah/zırh → düello, taşıt → kervan yükü, çizme → kervan takatı, yiyecek →
// sofra hizmeti, saz → sahne, mal → değer) ve atölye emrinde alet verimi (yalnız oyuncu emeği payı). Her etki için
// davranış testi; denge: edilgen atölye ≤ 35, gösterge/kalite tavanları, akçe değişmezi.
import test from "node:test";
import assert from "node:assert/strict";
import { ETKILER } from "../src/icerik/agaclar/index.ts";
import { KANCA_BAGLARI, kancaAnahtari } from "../src/icerik/kanca-kayit.ts";
import { MALLAR, type MalId } from "../src/icerik/mallar.ts";
import { TARIFLER } from "../src/icerik/tarifler.ts";
import { seviyeVer } from "../src/yerlesim/beceri.ts";
import { dugumSeviyesi, ilerleme, meslekSec } from "../src/yerlesim/meslek.ts";
import { ALET_KALITE_OMUR, ALET_KALITE_VERIM, KALITE_DEGER_CARPANI, KALITE_EMIR_TAVANI, kaliteliEkle, type Kalite } from "../src/yerlesim/kalite.ts";
import {
  ARAC_KALITE_YUK,
  CIZME_YOL_TAKAT,
  SANAT_KEYIF,
  SILAH_GUC,
  YIYECEK_TOKLUK,
  ZIRH_DAYANIM,
  aileEtkisi,
  dusulecekKademe,
  eldekiEnIyiEtki,
  ozellikDokumu,
} from "../src/yerlesim/esya.ts";
import { duelloCoz, DUELLO_KALEMLERI } from "../src/yerlesim/duello.ts";
import { GOREV_GOSTERGE_TAVAN, GOREV_KALITE_TAVAN, gorevKalitesi, hizmetGorevDonumu, hizmetGorevTeslim } from "../src/yerlesim/hizmet-gorev.ts";
import { gostergeOku } from "../src/yerlesim/topluluk-kayit.ts";
import { ekonomiAl } from "../src/yerlesim/pazar-tahta.ts";
import { HIZMET_KALITE_TAVAN, hizmetAracEki, hizmetHazirla, hizmetKalitesi, sofraKalitesi } from "../src/yerlesim/hizmet-pazari.ts";
import { hizmetTarifiBul } from "../src/yerlesim/hizmet-tarif.ts";
import {
  HABER_KALITE_EK_AY,
  KERVAN_KALITE_TAVAN,
  KERVAN_TAKAT,
  KERVAN_TOPLU_YUK_EN_COK,
  bosKervanDefteri,
  haberKalitesi,
  kervanCikar,
  kervanCizmesi,
  kervanTakati,
  yukTavani,
} from "../src/yerlesim/kervan.ts";
import { aletOmru } from "../src/yerlesim/tarif.ts";
import { ARACI_KALITE_TAVAN, araciIste, arabuluculukSansi } from "../src/yerlesim/arabulucu.ts";
import { ucgenAl } from "../src/yerlesim/bilgi.ts";
import { IS_KALITE_TAVAN, teklifCevap, teklifOlustur } from "../src/yerlesim/teklif.ts";
import { bosTezgah, type Tezgah } from "../src/mulk/depo.ts";
import { emirAc, emirAletVerimi, emirleriIsle } from "../src/mulk/uretim-emri.ts";
import { DUKKAN_NPC_TAVAN, NPC_ATOLYE_MAAS_EN_AZ, NPC_EMEK_AY, ZANAAT_MESLEKLERI } from "../src/mulk/tezgah-kurallar.ts";
import { PERSONEL_EN_COK } from "../src/mulk/kurallar.ts";
import { npcTavani, talepCoz } from "../src/mulk/hane-butcesi.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";
import { baglam, dostYap, senaryo } from "./ucgen-yardimci.ts";

const AY = 300;

function yetiskin(k: Kasaba, no: number): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 25);
  kar.pa = 2000;
  kar.tk = 60;
  kar.ta = AY;
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  return kar;
}

function kaynak(kanca: string) {
  const e = ETKILER.find((x) => kancaAnahtari(x.etki) === kanca);
  if (!e) throw new Error(`ağaçta yok: ${kanca}`);
  return e;
}

function ogren(c: Karakter, ...kancalar: string[]): Karakter {
  for (const x of kancalar) {
    const e = kaynak(x);
    seviyeVer(c, e.dugum, Math.max(e.seviye, dugumSeviyesi(c, e.dugum)));
  }
  return c;
}

const ogrenmis = (k: Kasaba, no: number, ...kancalar: string[]) => ogren(yetiskin(k, no), ...kancalar);

function gorevKasabasi(): Kasaba {
  const k = testKasabasi("develi", AY);
  k.hd = { ...(k.hd ?? {}), hz: 500 } as never;
  hizmetGorevDonumu(k, AY);
  return k;
}

const BAGLANAN = [
  "kalite:hirsizlikTespiti", "kalite:gozculuk", "kalite:savunma", "arac:devriye:kilic", "arac:saf:kalkan",
  "kalite:mektup", "kalite:ulak", "kalite:araBul", "kalite:uzlasma", "kalite:fiyatHaberi", "kalite:yolGuvenligi",
  "omur:cizme", "kalite:cocukRiski",
];

test("kayıt: bu partinin 13 kancası kayıtlı (tüketici dosyada) ve ağaçta tanımlı", () => {
  for (const a of BAGLANAN) {
    assert.ok(Object.hasOwn(KANCA_BAGLARI, a), a);
    kaynak(a);
  }
});

// ── Kasaba görevleri ──

test("görev kalitesi: nöbette hırsızlık tespiti ve gözcülük, talimde savunma asayiş/talim kalitesiyle toplanır (tavanlı)", () => {
  for (const [kancalar, tur] of [
    [["hizmet:nobet", "kalite:hirsizlikTespiti"], "nobet"],
    [["hizmet:nobet", "kalite:gozculuk"], "nobet"],
    [["hizmet:talim", "kalite:savunma"], "talim"],
  ] as const) {
    const k = gorevKasabasi();
    const c = ogrenmis(k, 1, ...kancalar);
    const beklenen = Math.min(GOREV_KALITE_TAVAN, (kaynak(kancalar[1]).etki as { yuzde: number }).yuzde);
    assert.equal(gorevKalitesi(c, tur), beklenen, kancalar[1]);
    // Başka görevin kalitesine sayılmaz.
    assert.equal(gorevKalitesi(c, tur === "nobet" ? "talim" : "nobet"), 0);
  }
  // Gazi yemini (savunma 40) + saf düzeni (savunma 20) + talim kalitesi: 60 tavanı.
  const k = gorevKasabasi();
  const c = ogrenmis(k, 2, "hizmet:talim", "kalite:talim", "kalite:savunma");
  seviyeVer(c, "asker.gaziYemini", 1);
  assert.equal(gorevKalitesi(c, "talim"), GOREV_KALITE_TAVAN);
});

test("arac:devriye:kilic / arac:saf:kalkan: ikinci araç göstergeye +1, bir kullanım aşınır; araç yoksa ek yok; teslim tavanı 3", () => {
  for (const [kanca, tur, mal, ev] of [
    ["arac:devriye:kilic", "nobet", "kilic", { mizrak: 5, kilic: 2 }],
    ["arac:saf:kalkan", "talim", "kalkan", { kalkan: 2 }],
  ] as const) {
    const hizmet = tur === "nobet" ? "hizmet:nobet" : "hizmet:talim";
    for (const varMi of [true, false]) {
      const k = gorevKasabasi();
      const c = ogrenmis(k, 1, hizmet, kanca);
      c.ev = varMi ? { ...ev } : tur === "nobet" ? { mizrak: 5 } : {};
      const gorev = ekonomiAl(k).hg!.find((x) => x.tur === tur)!;
      const once = gostergeOku(k, "asayis");
      const r = hizmetGorevTeslim(k, c, `kg${gorev.i}`, AY);
      assert.ok(r.ok, JSON.stringify(r));
      if (!r.ok) continue;
      assert.equal(r.deger.katki.ekAracEk, varMi ? 1 : 0, `${kanca} ${varMi}`);
      assert.equal(!!r.deger.ekArac, varMi);
      if (varMi) assert.equal(r.deger.ekArac!.mal, mal);
      assert.equal(gostergeOku(k, "asayis") - once, r.deger.katki.gosterge);
      assert.equal(r.deger.katki.gosterge, Math.min(GOREV_GOSTERGE_TAVAN, 1 + r.deger.katki.aracEk + r.deger.katki.ekAracEk + r.deger.katki.kaliteEk));
    }
  }
  // Bütün kanallar açık: mızrak +1, kılıç +1, kalite şansı → tavan 3'ü aşmaz.
  for (let i = 0; i < 20; i++) {
    const k = gorevKasabasi();
    const c = ogrenmis(k, 3 + i, "hizmet:nobet", "arac:nobet:mizrak", "arac:devriye:kilic", "kalite:asayis", "kalite:gozculuk");
    c.ev = { mizrak: 5, kilic: 5 };
    const gorev = ekonomiAl(k).hg!.find((x) => x.tur === "nobet")!;
    const r = hizmetGorevTeslim(k, c, `kg${gorev.i}`, AY);
    assert.ok(r.ok);
    if (r.ok) assert.ok(r.deger.katki.gosterge <= GOREV_GOSTERGE_TAVAN && r.deger.katki.gosterge >= 3, `${r.deger.katki.gosterge}`);
  }
});

// ── İş sözleşmesi: mektup ──

function katip(k: Kasaba, no: number, sv: Record<string, number>): Karakter {
  const kar = oyuncuEkle(k, no, k.ay - 13 * 12 - 2);
  kar.h = "katip-hesap-" + no;
  kar.pa = 100;
  kar.tk = 18;
  kar.ta = k.ay;
  kar.ms = { a: "katip", y: "", s: { katip: { kd: 0, hz: 0, cy: 0, sv } } } as unknown as NonNullable<Karakter["ms"]>;
  return kar;
}

test("kalite:mektup / kalite:ulak: mektup tesliminde kalite yüzde şansla moral +1 ekler (tohumlu, dökümlü, tavanlı); akçe aynı", () => {
  let ekToplam = 0;
  let deneme = 0;
  for (let i = 0; i < 30; i++) {
    const k = testKasabasi("develi", 200);
    const a = oyuncuEkle(k, 1, k.ay - 13 * 12 - 2);
    a.pa = 100;
    a.ms = { a: "katip", y: "", s: { katip: { kd: 0, hz: 0, cy: 0, sv: { "katip.koyMektubu": 3 } } } } as never;
    const b = katip(k, 10 + i, { "katip.koyMektubu": 2, "katip.hizliUlak": 3 });
    const hedef = oyuncuEkle(k, 5, k.ay - 13 * 12 - 2);
    hedef.h = "mektup-hedef-x";
    hedef.e = 400;
    if (a.e === b.e) b.e = a.e + 1000;
    const r = teklifOlustur(k, a, b, { tur: "is", is: "mektup", tutar: 5, mektupHedef: hedef.o, mektupMetni: "Selam." }, k.ay);
    assert.ok(r.ok, JSON.stringify(r));
    if (!r.ok) continue;
    assert.ok(teklifCevap(k, b, `t${r.deger.teklif.i}`, "kabul", {}, k.ay).ok);
    const once = gostergeOku(k, "moral");
    const pa = a.pa + b.pa;
    const t = teklifCevap(k, b, `t${r.deger.teklif.i}`, "teslim", {}, k.ay);
    assert.ok(t.ok, JSON.stringify(t));
    if (!t.ok) continue;
    const o = t.deger.olaylar.find((x) => x.k === "olay.teklif.teslim.is")!;
    assert.equal(o.p.kalite, Math.min(IS_KALITE_TAVAN, 15 + 20), "köy mektubu 15 + hızlı ulak 20");
    assert.equal(gostergeOku(k, "moral") - once, 1 + (o.p.kaliteEk as number));
    assert.equal(a.pa + b.pa - pa, 5, "akçe yalnız emanetten (kilitli 5 çalışana geçer)");
    ekToplam += o.p.kaliteEk as number;
    deneme++;
  }
  assert.ok(ekToplam > 0 && ekToplam < deneme, `ek ${ekToplam}/${deneme}`);
  // Kalitesiz kâtip: döküm yok, +1 temel.
  const k = testKasabasi("develi", 200);
  const a = oyuncuEkle(k, 1, k.ay - 13 * 12 - 2);
  a.pa = 100;
  a.ms = { a: "katip", y: "", s: { katip: { kd: 0, hz: 0, cy: 0, sv: { "katip.koyMektubu": 3 } } } } as never;
  const b = katip(k, 2, { "katip.koyMektubu": 1 });
  if (a.e === b.e) b.e = a.e + 1000;
  const hedef = oyuncuEkle(k, 5, k.ay - 13 * 12 - 2);
  hedef.e = 400;
  const r = teklifOlustur(k, a, b, { tur: "is", is: "mektup", tutar: 5, mektupHedef: hedef.o, mektupMetni: "Selam." }, k.ay);
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.ok(teklifCevap(k, b, `t${r.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  const once = gostergeOku(k, "moral");
  const t = teklifCevap(k, b, `t${r.deger.teklif.i}`, "teslim", {}, k.ay);
  assert.ok(t.ok);
  if (t.ok) assert.equal(t.deger.olaylar.find((x) => x.k === "olay.teklif.teslim.is")!.p.kalite, undefined);
  assert.equal(gostergeOku(k, "moral") - once, 1);
});

// ── Arabuluculuk ──

test("kalite:araBul / kalite:uzlasma: arabuluculuk şansına yüzdenin yarısı (dökümde sans.kalite), en çok 15", () => {
  const s = senaryo();
  dostYap(s.k, s.berkay.o, s.hasan.o);
  s.berkay.pa = 50;
  assert.ok(araciIste(baglam(s.k, s.berkay), { arabulucu: s.hasan.o, npc: s.murat.i, bedel: "ozur", miktar: 0 }).ok);
  const talep = ucgenAl(s.k).at[0]!;
  const sans = () => arabuluculukSansi(s.k, s.hasan, talep, s.k.ay).sans;
  const temel = sans();
  assert.ok(!temel.kalemler.some((x) => x.k === "sans.kalite"));
  seviyeVer(s.hasan, "arabulucu.araBulma", 2);
  const a = sans();
  assert.equal(a.kalemler.find((x) => x.k === "sans.kalite")?.d, 5, "ara bulma 10 → +5");
  seviyeVer(s.hasan, "arabulucu.gonulKoprusu", 1);
  const b = sans();
  assert.equal(b.kalemler.find((x) => x.k === "sans.kalite")?.d, ARACI_KALITE_TAVAN, "10 + 30 → 20, tavan 15");
  assert.ok(b.toplam >= a.toplam);
});

// ── Kervan ──

function kervanci(k: Kasaba, no: number, ...kancalar: string[]): Karakter {
  const c = ogrenmis(k, no, "hizmet:kervan", "hizmet:topluYuk", ...kancalar);
  c.ev = { nal: 20, kosum: 3, kereste: 60 };
  return c;
}

test("çizme (§9 giysi yol) + omur:cizme: üstün çizme kervan takatını 1 indirir ve aşınır; sade çizme etkisiz; ömür +2", () => {
  const k = testKasabasi("develi", AY);
  const c = kervanci(k, 1);
  kaliteliEkle(c, "cizme", [[0, 1, c.o]]);
  assert.equal(kervanCizmesi(c), null, "sade çizme: yol etkisi yok");
  assert.equal(kervanTakati(c), KERVAN_TAKAT);
  const u = kervanci(k, 2);
  kaliteliEkle(u, "cizme", [[2, 1, u.o]]);
  assert.equal(kervanTakati(u), KERVAN_TAKAT - CIZME_YOL_TAKAT[2]!);
  // Yük çizmeyi götürürse etkisi yok.
  assert.equal(kervanTakati(u, { cizme: 1 }), KERVAN_TAKAT);
  const tk = u.tk;
  const r = kervanCikar(bosKervanDefteri(), u, "karapinar", { kereste: 5 }, AY, "kervan:develi:o2:aaaaaaaa", 1000);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(u.tk, tk - (KERVAN_TAKAT - 1));
  if (r.ok) assert.ok(r.deger.asinma.some((x) => x.mal === "cizme"), "çizme aşındı");
  const o = kervanci(k, 3, "omur:cizme");
  assert.equal(aletOmru(o, "cizme"), aletOmru(c, "cizme") + 2);
  // Dökümdeki değer = gerçek.
  assert.deepEqual(ozellikDokumu("cizme", 2).etkiler.find((e) => e.id === "yol"), { id: "yol", bagli: true, deger: 1, birim: "takat" });
  assert.equal(ozellikDokumu("giysi", 2).etkiler.find((e) => e.id === "yol")?.bagli, false, "çizme dışı giysi: yakında");
});

test("kalite:yolGuvenligi: kervan yük kalitesine kervan kalitesiyle toplanır (tavan 30); taşıt kalitesi = döküm", () => {
  const k = testKasabasi("develi", AY);
  const c = kervanci(k, 1);
  c.ev!.araba = 1;
  const taban = yukTavani(c).tavan;
  const u = kervanci(k, 2, "kalite:yolGuvenligi");
  u.ev!.araba = 1;
  const y = yukTavani(u);
  assert.equal(y.kalite, 20);
  assert.equal(y.tavan, Math.floor((KERVAN_TOPLU_YUK_EN_COK * 120) / 100));
  assert.ok(y.tavan > taban);
  const h = kervanci(k, 3, "kalite:yolGuvenligi", "kalite:kervan");
  assert.ok(yukTavani(h).kalite <= KERVAN_KALITE_TAVAN);
  // Taşıt (araba) kalitesinin yük eki = döküm.
  const q = kervanci(k, 4);
  kaliteliEkle(q, "araba", [[3, 1, q.o]]);
  const d = ozellikDokumu("araba", 3).etkiler.find((e) => e.id === "yuk") as { deger: number };
  assert.equal(yukTavani(q).tasitKalite, d.deger);
  assert.equal(d.deger, ARAC_KALITE_YUK[3]);
  assert.deepEqual(ozellikDokumu("kosum", 2).etkiler.find((e) => e.id === "dayanim"), { id: "dayanim", bagli: true, deger: ALET_KALITE_OMUR[2], birim: "kullanim" });
  assert.equal(ozellikDokumu("nal", 0).etkiler.find((e) => e.id === "yuk")?.bagli, false);
});

test("kalite:fiyatHaberi: eşik (15) aşılınca haber bir ay daha geçerli; kancasız ek yok", () => {
  const k = testKasabasi("develi", AY);
  assert.equal(haberKalitesi(ogrenmis(k, 1, "hizmet:fiyatHaberi")).ekAy, 0);
  const h = haberKalitesi(ogrenmis(k, 2, "kalite:fiyatHaberi"));
  assert.equal(h.yuzde, 15);
  assert.equal(h.ekAy, HABER_KALITE_EK_AY);
  assert.deepEqual(h.kalemler, [{ kanca: "kalite:fiyatHaberi", d: 15 }]);
});

// ── Hizmet ──

test("kalite:cocukRiski: lohusa ve güç doğum hizmet kalitesine sayılır; başka hizmete sayılmaz", () => {
  const k = testKasabasi("develi", AY);
  const c = ogrenmis(k, 1, "kalite:cocukRiski");
  for (const h of ["lohusa", "gucDogum"]) {
    const q = hizmetKalitesi(c, hizmetTarifiBul(h)!);
    assert.ok(q.kalemler.some((x) => x.kanca === "kalite:cocukRiski" && x.d === 20), h);
  }
  assert.equal(hizmetKalitesi(c, hizmetTarifiBul("yaraBak")!).yuzde, 0);
});

test("yiyecek tokluğu: sofra hizmetinde harcanan en zayıf yiyeceğin kademesi kaliteye yüzde ekler; sade (bayat) 0; tavan", () => {
  const k = testKasabasi("develi", AY);
  const tarif = hizmetTarifiBul("ziyafet")!;
  const usta = ogrenmis(k, 1, "hizmet:ziyafet", "sinerji:baklaYemegi");
  seviyeVer(usta, "ciftci.nadas", 1);
  // Önce izsiz (sade) birim harcanır.
  usta.ev = { un: 5, ekmek: 5, corba: 5 };
  assert.equal(sofraKalitesi(usta, tarif, hizmetKalitesi(usta, tarif)).yuzde, hizmetKalitesi(usta, tarif).yuzde);
  // Hepsi üstün, çorba iyi: en zayıfı (iyi) sayılır.
  usta.ev = {};
  kaliteliEkle(usta, "un", [[2, 5, "x"]]);
  kaliteliEkle(usta, "ekmek", [[2, 5, "x"]]);
  kaliteliEkle(usta, "corba", [[1, 5, "x"]]);
  assert.equal(dusulecekKademe(usta, "corba"), 1);
  const taban = hizmetKalitesi(usta, tarif).yuzde;
  const s = sofraKalitesi(usta, tarif, hizmetKalitesi(usta, tarif));
  assert.equal(s.yuzde, Math.min(HIZMET_KALITE_TAVAN, taban + YIYECEK_TOKLUK[1]!));
  const ek = ekonomiAl(k);
  const r = hizmetHazirla(ek, usta, "ziyafet", 1, AY);
  assert.ok(r.ok, JSON.stringify(r));
  if (r.ok) {
    assert.equal(r.deger.kalite.yuzde, s.yuzde, "hazırlamada uygulanan = önizleme");
    assert.equal(r.deger.stok.q ?? 0, s.yuzde);
  }
  // Döküm = gerçek; sofra girdisi olmayan yiyecek bağlı değil.
  assert.deepEqual(ozellikDokumu("ekmek", 3).etkiler[0], { id: "tokluk", bagli: true, deger: YIYECEK_TOKLUK[3], birim: "yuzde" });
  assert.equal(ozellikDokumu("peksimet", 3).etkiler[0]!.bagli, false);
});

test("saz keyfi: sazlı sahne hizmetinde sazın kademesi adet başına gönül ekler (sade 0), araç yoksa ek yok", () => {
  const k = testKasabasi("develi", AY);
  const c = ogrenmis(k, 1, "hizmet:turku", "arac:sazliSahne:saz");
  const tarif = hizmetTarifiBul("turku")!;
  c.ev = {};
  kaliteliEkle(c, "saz", [[0, 1, "x"]]);
  const sade = hizmetAracEki(c, tarif)!;
  assert.equal(sade.keyif, 0);
  c.ev = {};
  kaliteliEkle(c, "saz", [[4, 1, "x"]]);
  const nadide = hizmetAracEki(c, tarif)!;
  assert.equal(nadide.keyif, SANAT_KEYIF[4]);
  assert.equal(nadide.ek - sade.ek, SANAT_KEYIF[4]);
  const r = hizmetHazirla(ekonomiAl(k), c, "turku", 1, AY);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.deger.stok.a, nadide.ek);
  c.ev = {};
  assert.equal(hizmetAracEki(c, tarif), null);
  assert.deepEqual(ozellikDokumu("saz", 4).etkiler[0], { id: "keyif", bagli: true, deger: SANAT_KEYIF[4], birim: "gonul" });
});

// ── Düello ──

test("silah/zırh (§9): düelloda eldeki en iyi silah ve zırhın kademe değeri kalem olarak eklenir; eşya harcanmaz", () => {
  const k = testKasabasi("develi", AY);
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2);
  const once = duelloCoz(a, b, AY, "t1");
  assert.equal(once.kisi.silah, 0);
  assert.equal(once.kisi.zirh, 0);
  kaliteliEkle(a, "kilic", [[3, 1, "x"]]);
  kaliteliEkle(a, "bicak", [[1, 1, "x"]]);
  kaliteliEkle(a, "kalkan", [[4, 1, "x"]]);
  const ev = JSON.stringify(a.ev);
  const sonra = duelloCoz(a, b, AY, "t1");
  assert.equal(sonra.kisi.silah, SILAH_GUC[3], "en iyi silah: şaheser kılıç");
  assert.equal(sonra.kisi.zirh, ZIRH_DAYANIM[4]);
  assert.equal(sonra.kisi.toplam - once.kisi.toplam, SILAH_GUC[3]! + ZIRH_DAYANIM[4]!, "zar aynı tohumla aynı");
  assert.equal(sonra.kisi.toplam, DUELLO_KALEMLERI.reduce((t, x) => t + sonra.kisi[x], 0));
  assert.equal(JSON.stringify(a.ev), ev, "eşya harcanmaz");
  assert.deepEqual(ozellikDokumu("kilic", 3).etkiler[0], { id: "guc", bagli: true, deger: SILAH_GUC[3], birim: "duello" });
  assert.equal(eldekiEnIyiEtki(a, "silah", "guc").mal, "kilic");
  // Tavan: tılsımlı silah + zırh en çok 16 (zar 1–20 yanında sınırlı).
  assert.ok(SILAH_GUC[6]! + ZIRH_DAYANIM[6]! <= 16);
});

test("mal (hammadde) değer etkisi: dökümdeki çarpan pazar değeri çarpanıdır", () => {
  for (const q of [0, 1, 2, 3, 4, 5, 6] as Kalite[]) {
    assert.deepEqual(aileEtkisi("odun", q, "deger"), { deger: KALITE_DEGER_CARPANI[q], birim: "carpan" });
  }
});

// ── Atölye emri: alet verimi ──

function atolyeUstasi(k: Kasaba): Karakter {
  const c = oyuncuEkle(k, 1, AY - 20 * 12);
  meslekSec(c, "oduncu", AY);
  seviyeVer(c, "oduncu.kazmaliOcak", 1);
  ilerleme(c, "oduncu").kd = 2;
  return c;
}

function bakirAtolyesi(q: Kalite): Tezgah {
  const t = bosTezgah();
  t.za = "oduncu";
  kaliteliEkle(t, "kereste", [[0, 10]]);
  kaliteliEkle(t, "alet", [[q, 1, "x"]]);
  return t;
}

test("atölye emri: aletin kademe verimi yalnız oyuncu emeği payıyla (⌊verim × oyuncu/takat⌋); NPC emeği verim almaz", () => {
  const k = testKasabasi("develi", AY);
  const u = atolyeUstasi(k);
  const tr = TARIFLER.bakirOcagi;
  for (const [q, eh, npc] of [[3, 2, 0], [3, 1, 1], [3, 0, 2], [0, 2, 0], [4, 2, 0]] as const) {
    const t = bakirAtolyesi(q);
    t.eh = eh;
    assert.ok(emirAc(t, 0, "bakirOcagi", 1, [u], u.o, AY).ok);
    const r = emirleriIsle({ t, isletme: "develi.atolye.1", seviye: 0, kapasite: 240, npcEmek: npc, adaylar: [u], ay: AY });
    assert.equal(r.yapim, 1, `${q}/${eh}`);
    const beklenen = Math.floor((ALET_KALITE_VERIM[q]! * eh) / tr.takat);
    assert.equal(r.emirler[0]!.aletVerim, beklenen, `${q}/${eh}`);
    assert.equal(r.emirler[0]!.cikti.adet, tr.arac!.adet + beklenen);
    assert.equal(t.ev?.bakir, tr.arac!.adet + beklenen);
  }
  // Önizleme fonksiyonu: araçsız 0.
  const t = bosTezgah();
  assert.equal(emirAletVerimi(t, tr, 2), 0);
});

test("denge: edilgen atölye (yalnız NPC emeği) alet verimi almaz → ≤ 35; oyuncu emeğiyle verim kişisel üretimi aşmaz", () => {
  // Edilgen: NPC emeğiyle alet verimi 0 (yukarıdaki test); tezgah-sim üst sınırı (kalite şaheser) aynen geçerli.
  let net = -Infinity;
  for (const t of Object.values(TARIFLER)) {
    if (!(ZANAAT_MESLEKLERI as readonly string[]).includes(t.meslek)) continue;
    const mal = t.cikti[0] as MalId;
    if (!(MALLAR[mal].taban > 0)) continue;
    const verimNpc = emirAletVerimi({ ev: { alet: 1 }, kq: { alet: [[6, 1, "x"]] } } as never, t as never, 0);
    assert.equal(verimNpc, 0, `${t.id}: NPC emeğiyle verim`);
    const girdi = Object.entries(t.girdi).reduce((a, [m, n]) => a + MALLAR[m as MalId].taban * (n ?? 0), 0);
    const adet = "arac" in t && t.arac ? t.arac.adet : t.cikti[1];
    for (let n = 1; n <= PERSONEL_EN_COK; n++) {
      for (let yap = 1; yap <= Math.floor((NPC_EMEK_AY * n) / t.takat); yap++) {
        const r = talepCoz("sehir", [{ id: "d#0", dukkan: "d", mal, q: KALITE_EMIR_TAVANI, adet: yap * (adet + verimNpc), fiyat: npcTavani(mal, KALITE_EMIR_TAVANI) }], new Map([["d", { id: "d", itibar: 100, tavan: DUKKAN_NPC_TAVAN[4]! }]]), () => 0, "butce");
        net = Math.max(net, r.harcanan - yap * girdi - n * NPC_ATOLYE_MAAS_EN_AZ);
      }
    }
  }
  assert.ok(net <= 35, `edilgen net ${net}`);
  // Oyuncu emeği: emirdeki verim, aynı aletle kişisel üretimdeki alet verimini aşmaz (tam oyuncu emeğinde eşit).
  for (const q of [0, 1, 2, 3, 4] as Kalite[]) {
    const t = { ev: { alet: 1 }, kq: { alet: [[q, 1, "x"]] } } as unknown as Tezgah;
    assert.ok(emirAletVerimi(t, TARIFLER.bakirOcagi as never, TARIFLER.bakirOcagi.takat) <= ALET_KALITE_VERIM[q]!);
  }
});
