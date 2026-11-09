import test from "node:test";
import assert from "node:assert/strict";
import { TARIFLER } from "../src/icerik/tarifler.ts";
import { MALLAR } from "../src/icerik/mallar.ts";
import { meslekBul } from "../src/icerik/meslekler.ts";
import { IS_KONDISYON, halAl } from "../src/yerlesim/hal.ts";
import { dalAc, dugumAc, meslekKaydi, meslekSec, yanSec } from "../src/yerlesim/meslek.ts";
import { ALET_OMRU, tarifListesi, tarifYap } from "../src/yerlesim/tarif.ts";
import { temelIsYap } from "../src/yerlesim/temel-is.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

function usta(k: Kasaba, meslek: string, dal: string, no = 1): Karakter {
  const c = oyuncuEkle(k, no, k.ay - 16 * 12);
  c.tk = 18;
  c.ta = k.ay;
  meslekSec(c, meslek, k.ay);
  dalAc(c, meslek, dal);
  dugumAc(c, meslek, `${meslek}.${dal}.0`);
  return c;
}

test("tarif içeriği tutarlı: düğüm var, girdi/çıktı malı geçerli, takat ve hizmet pozitif", () => {
  for (const t of Object.values(TARIFLER)) {
    const m = meslekBul(t.meslek);
    assert.ok(m?.dugumler.some((d) => d.id === t.dugum), t.id);
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

test("yan meslekte açılan düğüm tarifi açar; meslek değişse de açık kalır, tecrübe faaliyetin mesleğine tam", () => {
  const k = testKasabasi();
  const c = usta(k, "demirci", "alet");
  yanSec(c, "oduncu", k.ay);
  dalAc(c, "oduncu", "maden");
  dugumAc(c, "oduncu", "oduncu.maden.0");
  c.ev = { odun: 2 };
  const r = tarifYap(c, "komur", k.ay);
  assert.ok(r.ok);
  assert.equal(r.deger.hizmet, TARIFLER.komur.hizmet, "tam tecrübe");
  meslekSec(c, "ciftci", k.ay); // ana meslek değişti; demirci düğümü açık kalır
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
