import test from "node:test";
import assert from "node:assert/strict";
import { TARIFLER } from "../src/icerik/tarifler.ts";
import { MALLAR } from "../src/icerik/mallar.ts";
import { meslekBul } from "../src/icerik/meslekler.ts";
import { IS_KONDISYON, halAl } from "../src/yerlesim/hal.ts";
import { TARIF_KILIDI, beceriDugumu, gocKarsiligi } from "../src/icerik/agaclar/index.ts";
import { kancaMi, seviyeVer } from "../src/yerlesim/beceri.ts";
import { meslekKaydi, meslekSec } from "../src/yerlesim/meslek.ts";
import { ALET_OMRU, kaliteBecerisi, tarifListesi, tarifYap } from "../src/yerlesim/tarif.ts";
import { hizmetAcik, sinerjiAcik } from "../src/yerlesim/beceri-etki.ts";
import { mulkluIkram } from "../src/mulk/tapu.ts";
import { temelIsYap } from "../src/yerlesim/temel-is.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

function usta(k: Kasaba, meslek: string, dal: string, no = 1): Karakter {
  const c = oyuncuEkle(k, no, k.ay - 16 * 12);
  c.tk = 18;
  c.ta = k.ay;
  meslekSec(c, meslek, k.ay);
  const y = gocKarsiligi(`${meslek}.${dal}.0`)!;
  seviyeVer(c, y.dugum, y.seviye);
  return c;
}

test("tarif içeriği tutarlı: düğüm var, girdi/çıktı malı geçerli, takat ve hizmet pozitif", () => {
  for (const t of Object.values(TARIFLER)) {
    assert.ok(meslekBul(t.meslek), t.id);
    const kilit = TARIF_KILIDI[t.id];
    assert.ok(kilit && beceriDugumu(kilit.dugum), `${t.id}: tarifi açan düğüm`);
    assert.ok(Object.hasOwn(MALLAR, t.cikti[0]) && t.cikti[1] > 0, t.id);
    for (const mal of Object.keys(t.girdi)) assert.ok(Object.hasOwn(MALLAR, mal), `${t.id}:${mal}`);
    assert.ok(t.takat > 0 && t.hizmet > 0, t.id);
  }
});

test("kömür: girdi düşer, çıktı eklenir, hizmet ve kondisyon kaybı", () => {
  const k = testKasabasi();
  const c = usta(k, "oduncu", "maden");
  c.ev = { odun: 5 };
  const r = tarifYap(c, "komur", k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(c.ev, { odun: 5 - TARIFLER.komur.girdi.odun, komur: 1 });
  assert.equal(r.deger.hizmet, TARIFLER.komur.hizmet);
  assert.equal(meslekKaydi(c).s.oduncu?.hz, TARIFLER.komur.hizmet);
  assert.equal(c.tk, 18 - TARIFLER.komur.takat);
  assert.equal(halAl(c, k.ay).kondisyon, 100 - IS_KONDISYON * TARIFLER.komur.takat);
  assert.equal(r.deger.hal.kondisyon.deger, 100 - IS_KONDISYON * TARIFLER.komur.takat);
});

test("girdi eksik: girdi_yok, takat/kondisyon/envanter değişmez", () => {
  const k = testKasabasi();
  const c = usta(k, "demirci", "alet");
  c.ev = { cevher: 1 };
  assert.deepEqual(tarifYap(c, "nal", k.ay), { ok: false, hata: "girdi_yok" });
  assert.deepEqual(c.ev, { cevher: 1 });
  assert.equal(c.tk, 18);
  assert.equal(halAl(c, k.ay).kondisyon, 100);
});

test("düğüm kapalı, bilinmeyen tarif, takat yok", () => {
  const k = testKasabasi();
  const c = usta(k, "demirci", "alet");
  c.ev = { odun: 9, cevher: 9, komur: 9, kereste: 9 };
  assert.deepEqual(tarifYap(c, "komur", k.ay), { ok: false, hata: "dugum_kapali" });
  assert.deepEqual(tarifYap(c, "alet", k.ay), { ok: false, hata: "dugum_kapali" }, "alet tarifi kalfa düğümü ister");
  assert.deepEqual(tarifYap(c, "altin", k.ay), { ok: false, hata: "tarif_gecersiz" });
  assert.deepEqual(tarifYap(c, 7, k.ay), { ok: false, hata: "tarif_gecersiz" });
  c.tk = 0;
  assert.deepEqual(tarifYap(c, "nal", k.ay), { ok: false, hata: "takat_yok" });
  assert.equal(c.ev.cevher, 9);
});

test("başka meslekte öğrenilen düğüm tarifi açar; meslek değişse de açık kalır, tecrübe faaliyetin mesleğine tam", () => {
  const k = testKasabasi();
  const c = usta(k, "demirci", "alet");
  seviyeVer(c, "oduncu.madencilik", 1);
  c.ev = { odun: 2 };
  const r = tarifYap(c, "komur", k.ay);
  assert.ok(r.ok);
  assert.equal(r.deger.hizmet, TARIFLER.komur.hizmet, "tam tecrübe");
  assert.ok(meslekSec(c, "ciftci", k.ay + 12).ok); // ana meslek değişti (yılda bir); demirci düğümü açık kalır
  c.ev = { cevher: 1, komur: 1 };
  const n = tarifYap(c, "nal", k.ay);
  assert.ok(n.ok);
  assert.equal(n.deger.hizmet, TARIFLER.nal.hizmet, "nal döven demircilik tecrübesi kazanır");
  assert.equal(c.ev.nal, 2);
});

test("hasat: alet varsa 5 tahil, alet ALET_OMRU kullanımda tükenir", () => {
  const k = testKasabasi();
  const c = usta(k, "ciftci", "ekin");
  c.tk = 18;
  const yalin = tarifYap(c, "hasat", k.ay);
  assert.ok(yalin.ok);
  assert.equal(c.ev?.tahil, 3);
  assert.equal(yalin.deger.arac, null);
  c.ev = { alet: 1 };
  for (let i = 1; i <= ALET_OMRU; i++) {
    const t = tarifYap(c, "hasat", k.ay + i);
    assert.ok(t.ok, JSON.stringify(t));
    assert.equal(t.deger.cikti.adet, 5);
    assert.equal(t.deger.arac?.asindi, i === ALET_OMRU);
  }
  assert.equal(c.ev.alet, undefined, "alet tükendi");
  assert.equal(c.ev.tahil, 5 * ALET_OMRU);
  assert.equal(c.as?.alet ?? 0, 0);
});

test("tarif listesi: açık/kapalı ve eksik girdi görünür", () => {
  const k = testKasabasi();
  const c = usta(k, "demirci", "alet");
  c.ev = { cevher: 1 };
  const l = tarifListesi(c);
  const nal = l.find((x) => x.id === "nal")!;
  assert.equal(nal.acik, true);
  assert.deepEqual(nal.eksik, { komur: 1 });
  assert.equal(nal.yapilabilir, false);
  assert.equal(l.find((x) => x.id === "komur")!.acik, false);
  assert.equal(l.length, Object.keys(TARIFLER).length);
});

test("temel iş de kondisyon düşürür", () => {
  const k = testKasabasi();
  const c = usta(k, "demirci", "alet");
  const r = temelIsYap(c, "odun", () => 0, k.ay);
  assert.ok(r.ok);
  assert.equal(halAl(c, k.ay).kondisyon, 100 - IS_KONDISYON);
});


test("Demirci temel dövme düğümü dövme grubu tariflerinde kömür tasarrufu sağlar", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 1, k.ay - 16 * 12);
  c.tk = 18;
  c.ta = k.ay;
  meslekSec(c, "demirci", k.ay);
  seviyeVer(c, "demirci.temelDovme", 2);
  const kilit = TARIF_KILIDI.kilic!;
  seviyeVer(c, kilit.dugum, kilit.seviye);
  c.ev = { cevher: 2, komur: 2, deri: 1 };
  const etki = beceriDugumu("demirci.temelDovme")!.seviyeler[1]!.etkiler[0]!;
  assert.equal(kancaMi(etki), false, "tasarruf etkisi bağlı sayılır");
  const liste = tarifListesi(c).find((x) => x.id === "kilic")!;
  assert.equal(liste.girdi.komur, 1, "iki kömür girdisi bir kömüre iner");
  const r = tarifYap(c, "kilic", k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.deger.girdi.komur, 1);
  assert.equal(c.ev.komur, 1);
});


test("Hancı ikram hizmeti menü fiyatına indirim uygular ve kanca bağlı sayılır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 90, k.ay - 16 * 12);
  c.tk = 18;
  c.ta = k.ay;
  meslekSec(c, "hanci", k.ay);
  seviyeVer(c, "hanci.serbetOcagi", 3);
  const etki = beceriDugumu("hanci.serbetOcagi")!.seviyeler[2]!.etkiler[0]!;
  assert.equal(kancaMi(etki), false);
  assert.equal(hizmetAcik(c, "ikram"), true);
  c.pa = 100;
  const r = mulkluIkram(k, c, "gulSuyu", k.ay, "hanci-ikram-indirim");
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(r.deger.fiyat, 9);
  assert.equal(r.deger.batak, 9);
  assert.equal(c.pa, 91);
});


test("Kâtip senet zinciri: düğüm seviyesi mürekkep ve senet tariflerini açar; girdiler gerçek envanterden tüketilir", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 1, k.ay - 16 * 12);
  c.tk = 18;
  c.ta = k.ay;
  meslekSec(c, "katip", k.ay);
  seviyeVer(c, "katip.dilekceSenet", 1);
  c.ev = { komur: 1, ot: 1, kagit: 1 };
  const kilit = TARIF_KILIDI.senet!;
  assert.equal(TARIF_KILIDI.murekkep?.dugum, "katip.dilekceSenet");
  seviyeVer(c, "katip.dilekceSenet", 1);
  assert.equal(tarifListesi(c).find((x) => x.id === "murekkep")?.acik, true);
  assert.equal(tarifListesi(c).find((x) => x.id === "senet")?.acik, false, "senet ikinci seviyede açılır");
  const m = tarifYap(c, "murekkep", k.ay);
  assert.ok(m.ok, JSON.stringify(m));
  assert.deepEqual(c.ev, { kagit: 1, murekkep: 2 });
  seviyeVer(c, "katip.dilekceSenet", kilit.seviye);
  const s = tarifYap(c, "senet", k.ay);
  assert.ok(s.ok, JSON.stringify(s));
  assert.equal(c.ev.senet, 1);
  assert.equal(c.ev.kagit, undefined);
  assert.equal(c.ev.murekkep, 1);
});


test("yaylaCadiri sinerjisi yalnız iki meslek düğümü birlikteyken çadır kalitesini artırır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 91, k.ay - 16 * 12);
  c.tk = 18;
  c.ta = k.ay;
  const cadir = TARIFLER.cadir;

  seviyeVer(c, "dokumaci.kislikCadir", 1);
  assert.equal(kaliteBecerisi(c, cadir), 0, "dokumacı düğümü tek başına sinerji vermez");
  assert.equal(sinerjiAcik(c, "yaylaCadiri"), false);

  seviyeVer(c, "ciftci.yaylaGocu", 2);
  assert.equal(sinerjiAcik(c, "yaylaCadiri"), true);
  assert.equal(kaliteBecerisi(c, cadir), 10, "iki düğüm birlikte çadır kalite katkısını açar");

  const diger = oyuncuEkle(k, 92, k.ay - 16 * 12);
  seviyeVer(diger, "ciftci.yaylaGocu", 1);
  assert.equal(sinerjiAcik(diger, "yaylaCadiri"), false, "çiftçi düğümü tek başına yetmez");
  assert.equal(kaliteBecerisi(diger, cadir), 0);
});


test("pulZirhAstari sinerjisi yalnız dokumacı astarı ve demirci zırh ustalığı birlikteyken pul zırh kalitesini artırır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 93, k.ay - 16 * 12);
  const pulZirh = TARIFLER.pulZirh;

  seviyeVer(c, "demirci.zirhUstaligi", 1);
  assert.equal(sinerjiAcik(c, "pulZirhAstari"), false, "demirci düğümü tek başına sinerji vermez");
  assert.equal(kaliteBecerisi(c, pulZirh), 25, "demircinin kendi +25 zırh kalitesi korunur");

  seviyeVer(c, "dokumaci.zirhAstari", 1);
  assert.equal(sinerjiAcik(c, "pulZirhAstari"), true);
  assert.equal(kaliteBecerisi(c, pulZirh), 35, "iki düğüm birlikte pul zırha +10 ekler");

  const diger = oyuncuEkle(k, 94, k.ay - 16 * 12);
  seviyeVer(diger, "dokumaci.zirhAstari", 1);
  assert.equal(sinerjiAcik(diger, "pulZirhAstari"), false, "dokumacı düğümü tek başına sinerji vermez");
  assert.equal(kaliteBecerisi(diger, pulZirh), 0);
  assert.equal(kaliteBecerisi(c, TARIFLER.zincir), 25, "sinerji başka zırh tariflerine taşmaz");
});


test("ozelPastirma sinerjisi aşçı pastırmacı ve çiftçi kesim/post bilgisi birlikteyken yalnız pastırma kalitesini artırır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 95, k.ay - 16 * 12);
  const pastirma = TARIFLER.pastirma;

  seviyeVer(c, "asci.pastirmaci", 3);
  assert.equal(sinerjiAcik(c, "ozelPastirma"), false, "aşçı düğümü tek başına sinerji vermez");
  assert.equal(kaliteBecerisi(c, pastirma), 20, "pastırmacının kendi +20 kalite etkisi korunur");

  seviyeVer(c, "ciftci.kesimVePost", 1);
  assert.equal(sinerjiAcik(c, "ozelPastirma"), true);
  assert.equal(kaliteBecerisi(c, pastirma), 30, "iki düğüm birlikte pastırmaya +10 ekler");

  const diger = oyuncuEkle(k, 96, k.ay - 16 * 12);
  seviyeVer(diger, "ciftci.kesimVePost", 1);
  assert.equal(sinerjiAcik(diger, "ozelPastirma"), false, "çiftçi düğümü tek başına sinerji vermez");
  assert.equal(kaliteBecerisi(diger, pastirma), 0);
  assert.equal(kaliteBecerisi(c, TARIFLER.kuruEt), 0, "sinerji kuru ete taşmaz");
});


test("kasabaDegirmeni sinerjisi oduncu değirmen taşı ve aşçı değirmen unu birlikteyken yalnız un kalitesini artırır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 97, k.ay - 16 * 12);
  const un = TARIFLER.un;

  seviyeVer(c, "asci.degirmenUnu", 3);
  assert.equal(sinerjiAcik(c, "kasabaDegirmeni"), false, "aşçı düğümü tek başına sinerji vermez");
  assert.equal(kaliteBecerisi(c, un), 15, "aşçının kendi +15 un kalite etkisi korunur");

  seviyeVer(c, "oduncu.degirmenTasi", 2);
  assert.equal(sinerjiAcik(c, "kasabaDegirmeni"), true);
  assert.equal(kaliteBecerisi(c, un), 25, "iki düğüm birlikte una +10 ekler");

  const diger = oyuncuEkle(k, 98, k.ay - 16 * 12);
  seviyeVer(diger, "oduncu.degirmenTasi", 2);
  assert.equal(sinerjiAcik(diger, "kasabaDegirmeni"), false, "oduncu düğümü tek başına sinerji vermez");
  assert.equal(kaliteBecerisi(diger, un), 0);
  assert.equal(kaliteBecerisi(c, TARIFLER.ekmek), 0, "sinerji ekmek tarifine taşmaz");
});


test("hanKirisi sinerjisi oduncu kiriş/direk ve marangoz han inşası birlikteyken yalnız kiriş kalitesini artırır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 99, k.ay - 16 * 12);
  const kiris = TARIFLER.kiris;

  seviyeVer(c, "oduncu.kirisDirek", 2);
  assert.equal(sinerjiAcik(c, "hanKirisi"), false, "oduncu düğümü tek başına sinerji vermez");
  assert.equal(kaliteBecerisi(c, kiris), 0);

  seviyeVer(c, "marangoz.hanInsasi", 1);
  assert.equal(sinerjiAcik(c, "hanKirisi"), true);
  assert.equal(kaliteBecerisi(c, kiris), 10, "iki düğüm birlikte kirişe +10 kalite verir");

  const diger = oyuncuEkle(k, 100, k.ay - 16 * 12);
  seviyeVer(diger, "marangoz.hanInsasi", 1);
  assert.equal(sinerjiAcik(diger, "hanKirisi"), false, "marangoz düğümü tek başına sinerji vermez");
  assert.equal(kaliteBecerisi(diger, kiris), 0);
  assert.equal(kaliteBecerisi(c, TARIFLER.kereste), 0, "sinerji kereste tarifine taşmaz");
});


test("kagniHarmani sinerjisi çiftçi toplu harman ve marangoz tekerlek birlikteyken yalnız kağnı kalitesini artırır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 101, k.ay - 16 * 12);
  seviyeVer(c, "marangoz.tekerlek", 1);
  assert.equal(sinerjiAcik(c, "kagniHarmani"), false, "çiftçi düğümü olmadan sinerji açılmaz");
  assert.equal(kaliteBecerisi(c, TARIFLER.kagni), 0);
  seviyeVer(c, "ciftci.topluHarman", 3);
  assert.equal(sinerjiAcik(c, "kagniHarmani"), true);
  assert.equal(kaliteBecerisi(c, TARIFLER.kagni), 10);
  assert.equal(kaliteBecerisi(c, TARIFLER.araba), 0, "bonus araba tarifine taşmaz");
  const diger = oyuncuEkle(k, 102, k.ay - 16 * 12);
  seviyeVer(diger, "ciftci.topluHarman", 3);
  assert.equal(sinerjiAcik(diger, "kagniHarmani"), false, "marangoz tekerlek olmadan açılmaz");
});


test("kervanArabasi sinerjisi tüccar yükü ve marangoz araba yapımı birlikteyken yalnız araba kalitesini artırır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 103, k.ay - 16 * 12);
  seviyeVer(c, "marangoz.arabaYapimi", 2);
  assert.equal(sinerjiAcik(c, "kervanArabasi"), false);
  assert.equal(kaliteBecerisi(c, TARIFLER.araba), 15, "marangozun kendi +15 araba kalite etkisi korunur");
  seviyeVer(c, "tuccar.topluYuk", 3);
  assert.equal(sinerjiAcik(c, "kervanArabasi"), true);
  assert.equal(kaliteBecerisi(c, TARIFLER.araba), 25);
  const diger = oyuncuEkle(k, 104, k.ay - 16 * 12);
  seviyeVer(diger, "tuccar.topluYuk", 3);
  assert.equal(sinerjiAcik(diger, "kervanArabasi"), false);
  assert.equal(kaliteBecerisi(diger, TARIFLER.araba), 0);
});

test("ulakCizmesi sinerjisi kâtip hızlı ulak ve dokumacı kösele birlikteyken yalnız çizme kalitesini artırır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 105, k.ay - 16 * 12);
  seviyeVer(c, "katip.hizliUlak", 2);
  assert.equal(sinerjiAcik(c, "ulakCizmesi"), false);
  assert.equal(kaliteBecerisi(c, TARIFLER.cizme), 0);
  seviyeVer(c, "dokumaci.kosele", 2);
  assert.equal(sinerjiAcik(c, "ulakCizmesi"), true);
  assert.equal(kaliteBecerisi(c, TARIFLER.cizme), 10);
  const diger = oyuncuEkle(k, 106, k.ay - 16 * 12);
  seviyeVer(diger, "dokumaci.kosele", 2);
  assert.equal(sinerjiAcik(diger, "ulakCizmesi"), false);
  assert.equal(kaliteBecerisi(diger, TARIFLER.cizme), 0);
  assert.equal(kaliteBecerisi(c, TARIFLER.kiris), 0, "bonus başka tariflere taşmaz");
});

test("ticaretSenedi sinerjisi tüccar toptan alım ve kâtip sözleşme bilgisi birlikteyken yalnız senet kalitesini artırır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 107, k.ay - 16 * 12);
  seviyeVer(c, "katip.vasiyetSozlesme", 2);
  seviyeVer(c, "katip.dilekceSenet", 3);
  assert.equal(sinerjiAcik(c, "ticaretSenedi"), false);
  assert.equal(kaliteBecerisi(c, TARIFLER.senet), 15, "kâtibin kendi +15 senet kalite etkisi korunur");
  seviyeVer(c, "tuccar.toptanAlim", 2);
  assert.equal(sinerjiAcik(c, "ticaretSenedi"), true);
  assert.equal(kaliteBecerisi(c, TARIFLER.senet), 25);
  const diger = oyuncuEkle(k, 108, k.ay - 16 * 12);
  seviyeVer(diger, "tuccar.toptanAlim", 2);
  assert.equal(sinerjiAcik(diger, "ticaretSenedi"), false);
  assert.equal(kaliteBecerisi(diger, TARIFLER.senet), 0);
});
