import test from "node:test";
import assert from "node:assert/strict";
import { AY_MS, DUNYA_BASLANGICI_MS, oyunAyi, sonrakiDonum, takvim } from "../src/saat.ts";

const SAAT = 60 * 60 * 1000;
const GUN = 24 * SAAT;

test("başlangıç bir TR gece yarısıdır ve 1250 Ocak'tır", () => {
  const d = new Date(DUNYA_BASLANGICI_MS);
  assert.equal(d.getUTCHours(), 21);
  assert.equal(d.getUTCMinutes(), 0);
  assert.equal(oyunAyi(DUNYA_BASLANGICI_MS), 0);
  assert.deepEqual(takvim(0), { yil: 1250, ay: 1, mevsim: "kis" });
  assert.equal(AY_MS, 12 * SAAT);
});

test("ay dönümü tam TR 00:00 ve 12:00'de (UTC 21:00 ve 09:00)", () => {
  const trGeceYarisi = Date.UTC(2027, 2, 14, 21, 0, 0); // TR 15 Mart 2027 00:00
  const trOgle = Date.UTC(2027, 2, 15, 9, 0, 0); // TR 15 Mart 2027 12:00
  for (const donum of [trGeceYarisi, trOgle]) {
    assert.equal(oyunAyi(donum) - oyunAyi(donum - 1), 1);
    assert.equal(oyunAyi(donum + AY_MS - 1), oyunAyi(donum));
  }
  assert.equal(oyunAyi(trOgle) - oyunAyi(trGeceYarisi), 1);
  // TR 03:00 ve 15:00 (UTC 00:00 / 12:00) dönüm değildir.
  for (const ara of [Date.UTC(2027, 2, 15, 0, 0, 0), Date.UTC(2027, 2, 15, 12, 0, 0)]) {
    assert.equal(oyunAyi(ara), oyunAyi(ara - 1));
  }
});

test("sonraki dönüm her zaman UTC 09:00 ya da 21:00'dir ve ileridedir", () => {
  for (let t = DUNYA_BASLANGICI_MS - 3 * GUN; t < DUNYA_BASLANGICI_MS + 40 * GUN; t += 7 * SAAT + 13 * 60_000) {
    const s = sonrakiDonum(t);
    const d = new Date(s);
    assert.ok(s > t && s - t <= AY_MS);
    assert.ok(d.getUTCHours() === 9 || d.getUTCHours() === 21);
    assert.equal(d.getUTCMinutes() + d.getUTCSeconds() + d.getUTCMilliseconds(), 0);
  }
  assert.equal(sonrakiDonum(DUNYA_BASLANGICI_MS), DUNYA_BASLANGICI_MS + AY_MS);
  assert.equal(sonrakiDonum(DUNYA_BASLANGICI_MS - 1), DUNYA_BASLANGICI_MS);
});

test("ay ve yıl devri: 6 gün = 1 yıl; başlangıçtan önce negatif", () => {
  assert.deepEqual(takvim(11), { yil: 1250, ay: 12, mevsim: "kis" });
  assert.deepEqual(takvim(12), { yil: 1251, ay: 1, mevsim: "kis" });
  assert.deepEqual(takvim(-1), { yil: 1249, ay: 12, mevsim: "kis" });
  assert.deepEqual(takvim(-12), { yil: 1249, ay: 1, mevsim: "kis" });
  assert.equal(takvim(2).mevsim, "ilkbahar");
  assert.equal(takvim(5).mevsim, "yaz");
  assert.equal(takvim(8).mevsim, "sonbahar");
  assert.equal(oyunAyi(DUNYA_BASLANGICI_MS + 6 * GUN), 12);
  assert.equal(takvim(oyunAyi(DUNYA_BASLANGICI_MS + 6 * GUN - 1)).yil, 1250);
  assert.equal(takvim(oyunAyi(DUNYA_BASLANGICI_MS + 6 * GUN)).yil, 1251);
  assert.equal(oyunAyi(DUNYA_BASLANGICI_MS - 1), -1);
});
