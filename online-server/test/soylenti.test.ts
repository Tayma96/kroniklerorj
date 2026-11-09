// Söylenti (Faz 3a, saf): tanıklar, ay dönümünde dostluk ağıyla yayılım, güven sönmesi, olay başına sınır,
// görüşe kalem olarak yansıma (muhatap NPC hariç) ve yalanlama.
import test from "node:test";
import assert from "node:assert/strict";
import { gorus } from "../src/yerlesim/gorus.ts";
import {
  AYLIK_SONME,
  BILEN_EN_COK,
  GUVEN_ESIGI,
  ILK_GUVEN,
  SOYLENTI_OMUR,
  soylentiEkle,
  soylentiEtkisi,
  soylentiGorunumu,
  soylentiYay,
  yalanla,
} from "../src/yerlesim/soylenti.ts";
import { bagKur } from "../src/yerlesim/uret.ts";
import type { Kasaba, Npc } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

/** Tanığın çok dostu olsun: yayılım ölçülebilsin. */
function dostAgi(k: Kasaba, n: Npc, sayi: number): Npc[] {
  const dostlar = k.npc.filter((x) => x !== n && !n.b.some((b) => b[0] === x.i)).slice(0, sayi);
  for (const d of dostlar) bagKur(n, d, 1, 50, k.ay - 24);
  return dostlar;
}

test("söylenti: tanıklarla doğar, dostluk ağıyla yayılır, her sekmede ve her ay güveni söner, sonunda unutulur", () => {
  const k = testKasabasi("develi", 200);
  const kar = oyuncuEkle(k, 1, k.ay - 160);
  const [hedef, tanik] = k.npc;
  assert.ok(soylentiEkle(k, "hediye", kar.o, `n${hedef!.i}`, [], k.ay) === undefined, "tanıksız söylenti doğmaz");
  dostAgi(k, tanik!, 12);
  const s = soylentiEkle(k, "hediye", kar.o, `n${hedef!.i}`, [hedef!.i, tanik!.i], k.ay)!;
  assert.deepEqual(Object.keys(s.b), [String(tanik!.i)], "muhatap NPC tanık sayılmaz");
  assert.equal(s.b[tanik!.i], ILK_GUVEN);
  // Aynı olay tekrarında yeni söylenti açılmaz.
  assert.equal(soylentiEkle(k, "hediye", kar.o, `n${hedef!.i}`, [tanik!.i], k.ay), s);
  k.ay += 1;
  soylentiYay(k, k.ay);
  const bilen1 = Object.keys(s.b).length;
  assert.ok(bilen1 > 1, "yayıldı");
  assert.ok(s.b[tanik!.i]! < ILK_GUVEN, "aylık sönme");
  assert.ok(Object.entries(s.b).every(([x, g]) => x === String(tanik!.i) || g < s.b[tanik!.i]!), "sekmede güven düşer");
  assert.ok(!(String(hedef!.i) in s.b));
  for (let i = 0; i < SOYLENTI_OMUR * 2; i++) {
    k.ay += 1;
    soylentiYay(k, k.ay);
    assert.ok(Object.keys(s.b).length <= BILEN_EN_COK);
  }
  assert.equal(k.tp!.sy.length, 0, "güveni eşiğin altına inen ve eskiyen söylenti düşer");
  assert.ok(ILK_GUVEN * AYLIK_SONME ** 12 < GUVEN_ESIGI * 4);
});

test("söylenti görüşe görünür kalem olarak yansır; yalanlama güveni yarıya indirir ve bir kez yapılır", () => {
  const k = testKasabasi("develi", 200);
  const kar = oyuncuEkle(k, 1, k.ay - 160);
  const ili = k.ili.get(kar.o)!;
  const tanik = k.npc.find((n) => n.e !== kar.e)!;
  const hedef = k.npc.find((n) => n !== tanik)!;
  const once = gorus(k, tanik, kar, ili, k.ay).toplam;
  const s = soylentiEkle(k, "borcOdenmedi", kar.o, `n${hedef.i}`, [tanik.i], k.ay)!;
  const d = gorus(k, tanik, kar, ili, k.ay);
  const kalem = d.kalemler.find((x) => x.k === "gorus.soylenti");
  assert.ok(kalem && kalem.d < 0, JSON.stringify(d.kalemler));
  assert.equal(d.toplam, once + kalem.d);
  assert.equal(soylentiEtkisi(k, hedef.i, kar.o), 0);
  const g = soylentiGorunumu(k, kar, "tr");
  assert.equal(g[0]?.bilen, 1);
  assert.equal("b" in g[0]!, false, "kimin bildiği gizli");
  const baska = oyuncuEkle(k, 2, k.ay - 160);
  assert.deepEqual(yalanla(k, baska, `s${s.i}`), { ok: false, hata: "soylenti_yok" }, "başkasının söylentisi");
  assert.ok(yalanla(k, kar, `s${s.i}`).ok);
  assert.equal(s.b[tanik.i], Math.floor(ILK_GUVEN / 2));
  assert.deepEqual(yalanla(k, kar, `s${s.i}`), { ok: false, hata: "soylenti_yok" }, "tek sefer");
});
