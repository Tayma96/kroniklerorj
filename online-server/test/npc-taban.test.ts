import test from "node:test";
import assert from "node:assert/strict";
import { MALLAR } from "../src/icerik/mallar.ts";
import { NPC_AYLIK_KOTA, NPC_CARPAN, envanterEkle, npcFiyat, npcdenAl, satisDegeri } from "../src/yerlesim/npc-taban.ts";
import type { Dokum } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const toplamTutar = (d: Dokum) => d.kalemler.reduce((a, x) => a + x.d, 0);

test("NPC fiyatı pahalı ve dökümü toplamla aynı", () => {
  const f = npcFiyat("alet");
  assert.equal(f.toplam, Math.ceil(MALLAR.alet.taban * NPC_CARPAN));
  assert.equal(toplamTutar(f), f.toplam);
  assert.ok(f.toplam > MALLAR.alet.taban);
});

test("satış değeri: meslek boşsa kıtlık primi görünür kalemdir", () => {
  const dolu = satisDegeri("alet", 2);
  const bos = satisDegeri("alet", 0);
  assert.equal(dolu.toplam, MALLAR.alet.taban);
  assert.ok(bos.toplam > dolu.toplam);
  assert.ok(bos.kalemler.some((x) => x.k === "kitlik"));
  assert.equal(toplamTutar(bos), bos.toplam);
});

test("NPC'den alım: para düşer, envanter artar; kota dolunca para değişmez", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 1, k.ay - 14 * 12);
  c.pa = 1000;
  const birim = npcFiyat("nal").toplam;
  for (let i = 0; i < NPC_AYLIK_KOTA; i++) assert.ok(npcdenAl(c, "nal", 1, k.ay).ok);
  assert.equal(c.ev?.nal, NPC_AYLIK_KOTA);
  assert.equal(c.pa, 1000 - birim * NPC_AYLIK_KOTA);
  const para = c.pa;
  assert.deepEqual(npcdenAl(c, "nal", 1, k.ay), { ok: false, hata: "kota_doldu" });
  assert.equal(c.pa, para);
  assert.ok(npcdenAl(c, "nal", 1, k.ay + 1).ok, "yeni ayda kota sıfırlanır");
});

test("NPC'den alım hataları: para, mal, adet", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 1, k.ay - 14 * 12);
  c.pa = 1;
  assert.deepEqual(npcdenAl(c, "alet", 1, k.ay), { ok: false, hata: "para_yok" });
  assert.equal(c.ev?.alet ?? 0, 0);
  c.pa = 100;
  assert.deepEqual(npcdenAl(c, "su", 1, k.ay), { ok: false, hata: "mal_gecersiz" });
  assert.deepEqual(npcdenAl(c, "altin", 1, k.ay), { ok: false, hata: "mal_gecersiz" });
  assert.deepEqual(npcdenAl(c, "nal", 0, k.ay), { ok: false, hata: "mal_gecersiz" });
  assert.deepEqual(npcdenAl(c, "nal", 1.5, k.ay), { ok: false, hata: "mal_gecersiz" });
  assert.deepEqual(npcdenAl(c, "nal", NPC_AYLIK_KOTA + 1, k.ay), { ok: false, hata: "kota_doldu" });
});

test("envanterEkle sıfıra inince anahtarı siler, negatife düşmez", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  assert.equal(envanterEkle(c, "odun", 3), 3);
  assert.equal(envanterEkle(c, "odun", -5), 0);
  assert.equal(c.ev?.odun, undefined);
});


test("Y2 runtime ekonomi parametreleri NPC fiyatı, kıtlık primi ve alım kotasını değiştirir", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k, 1, k.ay - 14 * 12);
  c.pa = 5000;
  const parametre = { NPC_CARPAN: 3, KITLIK_PRIM: 0.8, NPC_AYLIK_KOTA: 1, STOK_CARPAN: 2 };
  assert.equal(npcFiyat("alet", parametre).toplam, Math.ceil(MALLAR.alet.taban * 3));
  assert.equal(satisDegeri("alet", 0, parametre).toplam, MALLAR.alet.taban + Math.ceil(MALLAR.alet.taban * 0.8));
  assert.ok(npcdenAl(c, "nal", 1, k.ay, undefined, parametre).ok);
  assert.deepEqual(npcdenAl(c, "nal", 1, k.ay, undefined, parametre), { ok: false, hata: "kota_doldu" });
});
