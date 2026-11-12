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
  oyuncuArabuluculukTaslak,
  oyuncuArabuluculukImzala,
  oyuncuArabuluculukUygula,
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

import { toplumDonumu } from "../src/yerlesim/toplum-donum.ts";

test("cevapsız oyuncu arabuluculuk daveti gerçek toplum ay dönümünde cezasız düşer", () => {
  const k = testKasabasi("develi", 500);
  const s = oyuncuEkle(k, 151), kk = oyuncuEkle(k, 152), ar = oyuncuEkle(k, 153);
  const ac = oyuncuArabuluculukAc(k, s, kk, ar, k.ay);
  assert.ok(ac.ok);
  if (!ac.ok) return;
  toplumDonumu(k, ac.deger.sa + 1);
  assert.equal(ac.deger.d, "dustu");
  assert.equal(ac.deger.kp, ac.deger.sa + 1);
});


test("arabulucu sürümlü uzlaşma taslağı oluşturur; iki tarafın güncel imzası olmadan onaylanmaz", () => {
  const k = testKasabasi("develi", 700);
  const s = oyuncuEkle(k, 161), kk = oyuncuEkle(k, 162), ar = oyuncuEkle(k, 163);
  const ac = oyuncuArabuluculukAc(k, s, kk, ar, k.ay);
  assert.ok(ac.ok);
  if (!ac.ok) return;
  const id = String(ac.deger.i);
  assert.ok(oyuncuArabuluculukCevap(k, s, id, "kabul", k.ay).ok);
  assert.ok(oyuncuArabuluculukCevap(k, kk, id, "kabul", k.ay).ok);
  assert.ok(oyuncuArabuluculukCevap(k, ar, id, "kabul", k.ay).ok);
  assert.equal(ac.deger.d, "taslak");

  assert.ok(oyuncuArabuluculukTaslak(k, ar, id, 120, 0, "Zarar karşılığı ödeme", k.ay).ok);
  assert.equal(ac.deger.d, "imzaBekliyor");
  assert.equal(ac.deger.sv, 2);
  assert.deepEqual(ac.deger.uz, { s: 120, k: 0, not: "Zarar karşılığı ödeme" });
  assert.deepEqual(ac.deger.im, {});

  assert.deepEqual(oyuncuArabuluculukImzala(k, ar, id, 2), { ok: false, hata: "taraf_degil" });
  assert.deepEqual(oyuncuArabuluculukImzala(k, s, id, 1), { ok: false, hata: "teklif_gecersiz" });
  s.pa = 500; kk.pa = 500;
  assert.ok(oyuncuArabuluculukImzala(k, s, id, 2).ok);
  assert.equal(ac.deger.d, "imzaBekliyor", "tek taraf imzalayınca dosya onaylanmaz");
  assert.ok(oyuncuArabuluculukImzala(k, kk, id, 2).ok);
  assert.equal(ac.deger.d, "emanette");
  assert.equal(s.pa, 380, "şikâyetçi tutarı imza tamamlanınca emanete alınır");
  assert.equal(kk.pa, 500);
  assert.ok(oyuncuArabuluculukUygula(k, ar, id, k.ay).ok);
  assert.equal(ac.deger.d, "tamam");
  assert.equal(s.pa, 380);
  assert.equal(kk.pa, 620, "emanet karşı tarafa aktarılır");
  assert.equal(ac.deger.od?.uygulandi, 1);
});

test("uzlaşma taslağı değişirse eski imzalar ve sürüm geçersizleşir", () => {
  const k = testKasabasi("develi", 710);
  const s = oyuncuEkle(k, 171), kk = oyuncuEkle(k, 172), ar = oyuncuEkle(k, 173);
  const ac = oyuncuArabuluculukAc(k, s, kk, ar, k.ay);
  assert.ok(ac.ok);
  if (!ac.ok) return;
  const id = String(ac.deger.i);
  for (const x of [s, kk, ar]) assert.ok(oyuncuArabuluculukCevap(k, x, id, "kabul", k.ay).ok);
  assert.ok(oyuncuArabuluculukTaslak(k, ar, id, 50, 10, undefined, k.ay).ok);
  assert.ok(oyuncuArabuluculukImzala(k, s, id, 2).ok);
  assert.ok(oyuncuArabuluculukTaslak(k, ar, id, 60, 10, undefined, k.ay).ok);
  assert.equal(ac.deger.sv, 3);
  assert.deepEqual(ac.deger.im, {}, "taslak değişince eski imzalar silinir");
  assert.equal(ac.deger.d, "imzaBekliyor");
});


test("emanete alma: taraflardan birinin bakiyesi yetmezse ikinci imza ve iki bakiye de değişmez", () => {
  const k = testKasabasi("develi", 720);
  const s = oyuncuEkle(k, 181), kk = oyuncuEkle(k, 182), ar = oyuncuEkle(k, 183);
  const ac = oyuncuArabuluculukAc(k, s, kk, ar, k.ay);
  assert.ok(ac.ok);
  if (!ac.ok) return;
  const id = String(ac.deger.i);
  for (const x of [s, kk, ar]) assert.ok(oyuncuArabuluculukCevap(k, x, id, "kabul", k.ay).ok);
  assert.ok(oyuncuArabuluculukTaslak(k, ar, id, 500, 0, undefined, k.ay).ok);
  s.pa = 100; kk.pa = 1000;
  assert.ok(oyuncuArabuluculukImzala(k, s, id, 2).ok);
  const onceS = s.pa, onceK = kk.pa;
  assert.deepEqual(oyuncuArabuluculukImzala(k, kk, id, 2), { ok: false, hata: "para_yok" });
  assert.equal(ac.deger.d, "imzaBekliyor");
  assert.equal(ac.deger.im.k, undefined);
  assert.equal(s.pa, onceS, "şikâyetçinin bakiyesi kısmen kesilmez");
  assert.equal(kk.pa, onceK, "karşı tarafın bakiyesi de değişmez");
});
