// Kül Yemini mührü: 13 yaşında emanet edilir (donum), oyuncu dilediği an kabul eder; bedelsiz, tek sefer, vârise geçmez.
import test from "node:test";
import assert from "node:assert/strict";
import { eylemGirdisiCoz, eylemYap } from "../src/yerlesim/eylem.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { hepBasari, oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const yap = (k: Kasaba, kar: Karakter) => eylemYap(k, kar, k.ili.get(kar.o)!, { tur: "muhur" }, k.ay, hepBasari);

test("Kül Yemini: emanet edilmeden kabul edilemez; kabul tek sefer, bedelsiz ve herkese görünür olay", () => {
  const k = testKasabasi();
  const kar = oyuncuEkle(k, 1, k.ay - 13 * 12 - 1);
  kar.tk = 0;
  const pa = kar.pa;
  assert.deepEqual(eylemGirdisiCoz({ tur: "muhur", istekNo: "muhur-0001" }), { ok: true, deger: { tur: "muhur" } });
  assert.deepEqual(yap(k, kar), { ok: false, hata: "muhur_yok" });
  kar.ky = 1;
  const r = yap(k, kar);
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(kar.ky, 2);
  assert.equal(kar.pa, pa, "akçe istemez");
  assert.equal(r.deger.olay?.k, "olay.kulYemini.kabul");
  assert.equal(r.deger.olay?.g, "", "yerleşim tanıklık eder");
  assert.deepEqual(yap(k, kar), { ok: false, hata: "muhur_alindi" });
});

test("Kül Yemini: 13 yaş altı kabul edemez", () => {
  const k = testKasabasi();
  const kar = oyuncuEkle(k, 2, k.ay - 12 * 12);
  kar.ky = 1;
  assert.deepEqual(yap(k, kar), { ok: false, hata: "yas_kapisi" });
});
