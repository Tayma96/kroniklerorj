import test from "node:test";
import assert from "node:assert/strict";
import { donusKartiSec } from "../src/yerlesim/donus.ts";
import type { Olay } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

let sira = 0;
const olay = (w: string, h: string, n: number, g = ""): Olay => ({ s: ++sira, a: 1, t: "x", w, h, g, n, k: "olay.x", p: {} });

test("Dönüş Kartı: en çok 5 madde, önce kendisi ve tanıdıklar, sonra önem ve yenilik", () => {
  const k = testKasabasi("kizilca", 0);
  const kar = oyuncuEkle(k, 1);
  kar.tn = { n5: "tanidik", n6: "dost", o2: "dusman" };
  const yabanciOnemli = [olay("n10", "", 9), olay("n11", "", 9), olay("n12", "", 8), olay("n13", "", 8), olay("n14", "", 7)];
  const tanidikDusuk = olay("n5", "", 1);
  const dostDusuk = olay("n20", "n6", 1);
  const dusmanOyuncu = olay("o2", "n30", 1);
  const bana = olay("n40", kar.o, 2, kar.o);
  const kendi = olay(kar.o, "n50", 10);
  const baskasinaOzel = olay("n60", "o3", 10, "o3");
  const kart = donusKartiSec(
    [...yabanciOnemli, tanidikDusuk, dostDusuk, dusmanOyuncu, bana, kendi, baskasinaOzel],
    kar,
  );
  assert.equal(kart.length, 5);
  assert.deepEqual(
    kart.map((o) => o.s),
    [bana.s, dusmanOyuncu.s, dostDusuk.s, tanidikDusuk.s, yabanciOnemli[1]!.s],
  );
  assert.ok(!kart.includes(kendi), "kendi eylemi karta girmez");
  assert.ok(!kart.includes(baskasinaOzel), "başkasına özel olay görünmez");
  assert.deepEqual(donusKartiSec([], kar), []);
  assert.equal(donusKartiSec(yabanciOnemli.slice(0, 3), kar).length, 3);
});
