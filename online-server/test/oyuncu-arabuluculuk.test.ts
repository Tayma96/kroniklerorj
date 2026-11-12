import test from "node:test";
import assert from "node:assert/strict";
import { oyuncuArabuluculukAl, toplumAl, type OyuncuArabuluculuk, type Toplum } from "../src/yerlesim/toplum.ts";
import { testKasabasi, oyuncuEkle } from "./kasaba-yardimci.ts";

test("eski toplum kaydında oyuncu arabuluculuk defteri ilk erişimde açılır; NPC üçgen kaydı ayrıdır", () => {
  const k = testKasabasi("develi", 120);
  const eski = toplumAl(k);
  delete eski.oa;
  const npcUcgen = { n: 4, sz: [], at: [] };
  k.ug = npcUcgen as unknown as NonNullable<typeof k.ug>;

  const dosyalar = oyuncuArabuluculukAl(eski);
  assert.deepEqual(dosyalar, []);
  assert.equal(eski.oa, dosyalar);
  assert.equal(k.ug, npcUcgen, "NPC arabuluculuk/üçgen defteri değiştirilmez");
});

test("oyuncu arabuluculuk kaydı üç ayrı rıza ve sürümlü çift imza alanlarını taşır", () => {
  const t: OyuncuArabuluculuk = {
    i: 1,
    s: "o1",
    k: "o2",
    ar: "o3",
    d: "davet",
    rs: {},
    sv: 1,
    im: {},
    ac: 120,
    sa: 123,
  };
  const k = testKasabasi("develi", 120);
  const toplum = toplumAl(k);
  oyuncuArabuluculukAl(toplum).push(t);

  const okunan = oyuncuArabuluculukAl(toplum)[0]!;
  assert.equal(okunan.s, "o1");
  assert.equal(okunan.k, "o2");
  assert.equal(okunan.ar, "o3");
  assert.deepEqual(okunan.rs, {}, "katılım rızaları başlangıçta boş");
  assert.deepEqual(okunan.im, {}, "hiçbir taraf imzalamamış");
  assert.equal(okunan.sv, 1);
  assert.equal(okunan.d, "davet");
});

test("mevcut toplum kaydındaki başka alanlar arabuluculuk defteri açılırken korunur", () => {
  const k = testKasabasi("develi", 120);
  const t = toplumAl(k);
  t.hu.push({ g: "o1", h: "o2", ay: 118, d: "acik" });
  const husumet = structuredClone(t.hu);
  oyuncuArabuluculukAl(t);
  assert.deepEqual(t.hu, husumet);
});

import {
  oyuncuArabulucuTarafsizMi,
  oyuncuArabuluculukAc,
  oyuncuArabuluculukCevap,
  oyuncuArabuluculukDonumu,
  oyuncuArabuluculukGeriAl,
} from "../src/yerlesim/arabuluculuk-oyuncu.ts";

test("oyuncu arabuluculuk üç ayrı rıza olmadan taslağa geçmez", () => {
  const k = testKasabasi("develi", 500);
  const s = oyuncuEkle(k, 101), kk = oyuncuEkle(k, 102), ar = oyuncuEkle(k, 103);
  const ac = oyuncuArabuluculukAc(k, s, kk, ar, k.ay);
  assert.ok(ac.ok);
  if (!ac.ok) return;
  assert.equal(ac.deger.d, "davet");
  assert.ok(oyuncuArabuluculukCevap(k, s, String(ac.deger.i), "kabul", k.ay).ok);
  assert.ok(oyuncuArabuluculukCevap(k, ar, String(ac.deger.i), "kabul", k.ay).ok);
  assert.equal(ac.deger.d, "davet", "karşı taraf kabul etmeden davet aşaması sürer");
  assert.ok(oyuncuArabuluculukCevap(k, kk, String(ac.deger.i), "kabul", k.ay).ok);
  assert.equal(ac.deger.d, "taslak");
});

test("arabulucu taraflardan biriyle aynı ocakta, dost veya açık husumetliyse reddedilir", () => {
  const k = testKasabasi("develi", 500);
  const s = oyuncuEkle(k, 111), kk = oyuncuEkle(k, 112), ar = oyuncuEkle(k, 113);
  assert.equal(oyuncuArabulucuTarafsizMi(k.tp, s, kk, ar), true);
  ar.e = s.e;
  assert.equal(oyuncuArabulucuTarafsizMi(k.tp, s, kk, ar), false);
  ar.e = 0;
  const tp = toplumAl(k);
  tp.ob.push({ a: s.o < ar.o ? s.o : ar.o, b: s.o < ar.o ? ar.o : s.o, d: "dost", ay: k.ay });
  assert.equal(oyuncuArabulucuTarafsizMi(tp, s, kk, ar), false);
});

test("arabuluculuk daveti taraflardan birinin reddiyle kapanır; diğer taraflar adına cevap verilemez", () => {
  const k = testKasabasi("develi", 500);
  const s = oyuncuEkle(k, 121), kk = oyuncuEkle(k, 122), ar = oyuncuEkle(k, 123);
  const ac = oyuncuArabuluculukAc(k, s, kk, ar, k.ay);
  assert.ok(ac.ok);
  if (!ac.ok) return;
  assert.deepEqual(oyuncuArabuluculukCevap(k, ar, String(ac.deger.i), "kabul", k.ay), { ok: true, deger: ac.deger });
  assert.deepEqual(oyuncuArabuluculukCevap(k, oyuncuEkle(k, 124), String(ac.deger.i), "kabul", k.ay), { ok: false, hata: "taraf_degil" });
  assert.ok(oyuncuArabuluculukCevap(k, kk, String(ac.deger.i), "ret", k.ay).ok);
  assert.equal(ac.deger.d, "ret");
});

test("arabuluculuk daveti cezasız düşer ve katılımcı kendi davetini geri çekebilir", () => {
  const k = testKasabasi("develi", 500);
  const s = oyuncuEkle(k, 131), kk = oyuncuEkle(k, 132), ar = oyuncuEkle(k, 133);
  const ac = oyuncuArabuluculukAc(k, s, kk, ar, k.ay);
  assert.ok(ac.ok);
  if (!ac.ok) return;
  assert.equal(oyuncuArabuluculukDonumu(k, ac.deger.sa + 1), 1);
  assert.equal(ac.deger.d, "dustu");

  const ac2 = oyuncuArabuluculukAc(k, s, kk, ar, k.ay);
  assert.ok(ac2.ok);
  if (!ac2.ok) return;
  assert.ok(oyuncuArabuluculukGeriAl(k, ar, String(ac2.deger.i), k.ay).ok);
  assert.equal(ac2.deger.d, "geri");
});

test("aynı iki oyuncu arasında aynı anda ikinci açık arabuluculuk dosyası açılamaz", () => {
  const k = testKasabasi("develi", 500);
  const s = oyuncuEkle(k, 141), kk = oyuncuEkle(k, 142), ar = oyuncuEkle(k, 143), ar2 = oyuncuEkle(k, 144);
  assert.ok(oyuncuArabuluculukAc(k, s, kk, ar, k.ay).ok);
  assert.deepEqual(oyuncuArabuluculukAc(k, s, kk, ar2, k.ay), { ok: false, hata: "teklif_siniri" });
});
