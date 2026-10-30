import test from "node:test";
import assert from "node:assert/strict";
import { ANI_YARI_OMRU, AKRABA_DEGERI, aniYuku, gorus, gorusDegeri, MESLEKTAS_DEGERI, USTA_DEGERI } from "../src/yerlesim/gorus.ts";
import { HUYLAR } from "../src/icerik/kisilik.ts";
import { iliskiAl } from "../src/yerlesim/eylem.ts";
import type { Dokum } from "../src/yerlesim/tipler.ts";
import { npcBul, oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const toplamTutar = (d: Dokum) => d.kalemler.reduce((a, k) => a + k.d, 0) === d.toplam;

test("görüş = kalemlerin toplamı; motorun değeri gösterilenle aynı", () => {
  const k = testKasabasi();
  const kar = oyuncuEkle(k);
  const ili = k.ili.get(kar.o)!;
  const npc = npcBul(k, kar, 20, 60);
  const i = iliskiAl(ili, npc.i);
  i.t = 3;
  i.an.push(["yardim", 6, k.ay], ["sohbet", 3, k.ay], ["sohbet", 2, k.ay]);
  kar.nm = [40, 40, 40, 40];
  const d = gorus(k, npc, kar, ili, k.ay);
  assert.ok(toplamTutar(d));
  assert.equal(gorusDegeri(k, npc, kar, ili, k.ay), d.toplam);
  assert.equal(d.kalemler.find((x) => x.k === "gorus.gecmis")?.d, 3);
  assert.equal(d.kalemler.find((x) => x.k === "gorus.ani.sohbet")?.d, 5, "aynı türdeki anılar tek kalemde");
  assert.equal(d.kalemler.find((x) => x.k === "gorus.ani.yardim")?.d, 6);
  // Bütün NPC'ler için toplam = döküm.
  for (const n of k.npc) {
    const g = gorus(k, n, kar, ili, k.ay);
    assert.ok(toplamTutar(g), `n${n.i}`);
    assert.equal(gorusDegeri(k, n, kar, ili, k.ay), g.toplam);
  }
});

test("kırpma görünür: ±100'ü aşan fark 'gorus.sinir' kalemiyle gösterilir", () => {
  const k = testKasabasi();
  const kar = oyuncuEkle(k);
  const ili = k.ili.get(kar.o)!;
  const npc = npcBul(k, kar, 20, 60);
  iliskiAl(ili, npc.i).t = 150;
  const d = gorus(k, npc, kar, ili, k.ay);
  assert.equal(d.toplam, 100);
  assert.ok(toplamTutar(d));
  const sinir = d.kalemler.find((x) => x.k === "gorus.sinir");
  assert.ok(sinir && sinir.d < 0);
  iliskiAl(ili, npc.i).t = -170;
  const e = gorus(k, npc, kar, ili, k.ay);
  assert.equal(e.toplam, -100);
  assert.ok(toplamTutar(e));
});

test("anılar söner (yarı ömür), akrabalık, usta ve meslektaşlık, huy ↔ nam", () => {
  assert.equal(aniYuku(["yardim", 8, 0], 0), 8);
  assert.equal(aniYuku(["yardim", 8, 0], ANI_YARI_OMRU), 4);
  assert.equal(aniYuku(["laf", -8, 0], 2 * ANI_YARI_OMRU), -2);

  const k = testKasabasi();
  const kar = oyuncuEkle(k);
  const ili = k.ili.get(kar.o)!;
  const anne = k.dizin.get(kar.an)!;
  assert.equal(anne.k, 1);
  assert.equal(gorus(k, anne, kar, ili, k.ay).kalemler.find((x) => x.k === "gorus.akraba.anne")?.d, AKRABA_DEGERI.anne);
  assert.equal(gorus(k, k.dizin.get(kar.ba)!, kar, ili, k.ay).kalemler.find((x) => x.k === "gorus.akraba.baba")?.d, AKRABA_DEGERI.baba);
  const kardes = k.npc.find((n) => n.an === kar.an);
  if (kardes) assert.ok(gorus(k, kardes, kar, ili, k.ay).kalemler.some((x) => x.k === "gorus.akraba.kardes"));

  const usta = npcBul(k, kar, 25, 60, (n) => k.npc.some((o) => o !== n && o.m === n.m && o.e !== kar.e && o.d < k.ay - 14 * 12));
  kar.us = usta.i;
  assert.equal(gorus(k, usta, kar, ili, k.ay).kalemler.find((x) => x.k === "gorus.usta")?.d, USTA_DEGERI);
  const meslektas = k.npc.find((o) => o !== usta && o.m === usta.m && o.e !== kar.e && o.d < k.ay - 14 * 12)!;
  assert.equal(gorus(k, meslektas, kar, ili, k.ay).kalemler.find((x) => x.k === "gorus.meslektas")?.d, MESLEKTAS_DEGERI);

  const dindar = npcBul(k, kar, 20, 70, (n) => n.h === HUYLAR.indexOf("dindar"));
  kar.nm = [0, 55, 0, 0];
  const huy = gorus(k, dindar, kar, ili, k.ay).kalemler.find((x) => x.k === "gorus.huyNam");
  assert.deepEqual(huy, { k: "gorus.huyNam", d: 5, p: { huy: "dindar", nam: "dindarlik" } });
});

test("dostunun dostu: yalnız en az 4 mevsimlik dostluklar, %10 ve ±10 tavan", () => {
  const k = testKasabasi();
  const kar = oyuncuEkle(k);
  const ili = k.ili.get(kar.o)!;
  const a = npcBul(k, kar, 18, 70, (n) => n.b.filter((b) => b[1] === 1).length === 1 && n.b.length === 1);
  const bag = a.b[0]!;
  const b = k.dizin.get(bag[0])!;
  iliskiAl(ili, b.i).t = 50;
  const dd = () => gorus(k, a, kar, ili, k.ay).kalemler.find((x) => x.k === "gorus.dostunDostu")?.d;
  assert.equal(dd(), 5);
  iliskiAl(ili, b.i).t = 300;
  assert.equal(dd(), 10, "±10 tavan");
  bag[3] = k.ay - 3; // yeni bağ
  assert.equal(dd(), undefined, "4 mevsimden genç bağ sayılmaz");
});
