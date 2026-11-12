import test from "node:test";
import assert from "node:assert/strict";
import { oyuncuArabuluculukAl, toplumAl, type OyuncuArabuluculuk, type Toplum } from "../src/yerlesim/toplum.ts";
import { testKasabasi } from "./kasaba-yardimci.ts";

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
