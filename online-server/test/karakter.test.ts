import test from "node:test";
import assert from "node:assert/strict";
import {
  BECERI_AYLIK_TAVAN,
  TAKAT_AYLIK,
  TAKAT_TAVAN,
  beceriEkle,
  karakterYasi,
  takatHarca,
  takatTazele,
} from "../src/yerlesim/karakter.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

test("takat: ayda 6; kullanılmayan en çok 2 aylık taşınır (tavan 18); biriktirip farm yok", () => {
  assert.equal(TAKAT_AYLIK, 6);
  assert.equal(TAKAT_TAVAN, 18);
  const k = testKasabasi();
  const kar = oyuncuEkle(k);
  const ay = k.ay;
  assert.equal(kar.tk, 6);
  assert.ok(takatHarca(kar, ay, 6));
  assert.equal(takatHarca(kar, ay, 1), false);
  takatTazele(kar, ay + 1);
  assert.equal(kar.tk, 6);
  takatTazele(kar, ay + 2);
  assert.equal(kar.tk, 12, "bir ay taşındı");
  takatTazele(kar, ay + 3);
  assert.equal(kar.tk, 18, "iki ay taşındı");
  takatTazele(kar, ay + 30);
  assert.equal(kar.tk, 18, "üçüncü ay taşınmaz");
  assert.ok(takatHarca(kar, ay + 30, 18));
  takatTazele(kar, ay + 30);
  assert.equal(kar.tk, 0, "aynı ay içinde yeniden dolmaz");
});

test("beceri kazancı ay başına tavanlı; yaş doğum ayından", () => {
  const k = testKasabasi();
  const kar = oyuncuEkle(k);
  let toplam = 0;
  for (let i = 0; i < 10; i++) toplam += beceriEkle(kar, k.ay, "soz", 1);
  assert.equal(toplam, BECERI_AYLIK_TAVAN);
  assert.equal(beceriEkle(kar, k.ay + 1, "soz", 2), 2, "yeni ay yeni tavan");
  assert.equal(karakterYasi(kar, k.ay), 12);
  assert.equal(karakterYasi(kar, k.ay + 11), 12);
  assert.equal(karakterYasi(kar, k.ay + 12), 13);
});
