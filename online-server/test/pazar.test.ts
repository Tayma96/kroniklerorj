import test from "node:test";
import assert from "node:assert/strict";
import { MALLAR } from "../src/icerik/mallar.ts";
import { satisDegeri } from "../src/yerlesim/npc-taban.ts";
import { NPC_SATIS_KOTASI, npcyeSat } from "../src/yerlesim/pazar.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const hicKimse = () => 0;
const herkes = () => 3;

test("NPC'ye satış: akçe birim × adet kadar artar, envanter düşer, fiyat dökümü döner", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  c.ev = { nal: 4 };
  const pa = c.pa;
  const r = npcyeSat(c, "nal", 3, herkes, k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(r.deger.birim, satisDegeri("nal", 3));
  assert.equal(r.deger.tutar, MALLAR.nal.taban * 3);
  assert.equal(c.pa - pa, r.deger.tutar, "akçe yalnız satış tutarı kadar değişir");
  assert.deepEqual(c.ev, { nal: 1 });
  assert.deepEqual(r.deger.kota, { satilan: 3, tavan: NPC_SATIS_KOTASI, kalan: NPC_SATIS_KOTASI - 3 });
});

test("kıtlık primi: malın mesleğinde oyuncu yoksa birim fiyata prim eklenir", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  c.ev = { nal: 1 };
  const r = npcyeSat(c, "nal", 1, hicKimse, k.ay);
  assert.ok(r.ok);
  assert.ok(r.deger.birim.kalemler.some((x) => x.k === "kitlik"));
  assert.ok(r.deger.tutar > MALLAR.nal.taban);
});

test("kota ay içinde dolar, ay değişince sıfırlanır", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  c.ev = { odun: 50 };
  assert.ok(npcyeSat(c, "odun", NPC_SATIS_KOTASI, herkes, k.ay).ok);
  const pa = c.pa;
  assert.deepEqual(npcyeSat(c, "odun", 1, herkes, k.ay), { ok: false, hata: "kota_doldu" });
  assert.equal(c.pa, pa);
  assert.equal(c.ev.odun, 50 - NPC_SATIS_KOTASI);
  assert.deepEqual(npcyeSat(c, "tas", 1, herkes, k.ay), { ok: false, hata: "mal_yok" }, "envanterde yok");
  assert.ok(npcyeSat(c, "odun", 2, herkes, k.ay + 1).ok, "yeni ay, yeni kota");
});

test("geçersiz: su satılmaz, negatif/kesirli/sıfır adet, bilinmeyen mal, envanter yetmez", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  c.ev = { su: 5, odun: 2 };
  const pa = c.pa;
  assert.deepEqual(npcyeSat(c, "su", 1, herkes, k.ay), { ok: false, hata: "mal_gecersiz" });
  for (const adet of [-1, 0, 1.5, "2", null, Number.NaN]) {
    assert.deepEqual(npcyeSat(c, "odun", adet, herkes, k.ay), { ok: false, hata: "mal_gecersiz" }, String(adet));
  }
  assert.deepEqual(npcyeSat(c, "altin", 1, herkes, k.ay), { ok: false, hata: "mal_gecersiz" });
  assert.deepEqual(npcyeSat(c, "odun", 3, herkes, k.ay), { ok: false, hata: "mal_yok" });
  assert.equal(c.pa, pa);
  assert.deepEqual(c.ev, { su: 5, odun: 2 });
});
