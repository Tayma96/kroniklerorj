import test from "node:test";
import assert from "node:assert/strict";
import { MALLAR } from "../src/icerik/mallar.ts";
import { satisDegeri } from "../src/yerlesim/npc-taban.ts";
import { NPC_SATIS_KOTASI, npcSatisKotasi, npcyeSat } from "../src/yerlesim/pazar.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const hicKimse = () => 0;
const herkes = () => 3;

test("NPC'ye satış: akçe birim × adet kadar artar, envanter düşer, fiyat dökümü döner", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  c.ev = { nal: 4 };
  const pa = c.pa;
  const r = npcyeSat(c, "nal", 2, herkes, k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(r.deger.birim, satisDegeri("nal", 3));
  assert.equal(r.deger.tutar, MALLAR.nal.taban * 2);
  assert.equal(c.pa - pa, r.deger.tutar, "akçe yalnız satış tutarı kadar değişir");
  assert.deepEqual(c.ev, { nal: 2 });
  assert.deepEqual(r.deger.kota, { satilan: 2, tavan: npcSatisKotasi("nal"), kalan: npcSatisKotasi("nal") - 2 });
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

test("yüksek değerli demirci mallarında kasaba talebi ayrı ve daha düşüktür", () => {
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  c.ev = { alet: 5, odun: 10 };
  assert.equal(npcSatisKotasi("alet"), 2);
  assert.ok(npcyeSat(c, "alet", 2, herkes, k.ay).ok);
  assert.deepEqual(npcyeSat(c, "alet", 1, herkes, k.ay), { ok: false, hata: "kota_doldu" });
  assert.equal(npcSatisKotasi("odun"), NPC_SATIS_KOTASI);
  assert.ok(npcyeSat(c, "odun", NPC_SATIS_KOTASI, herkes, k.ay).ok);
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

test("kıtlık sayımında satıcı hariç: tek oduncu kendi malına prim alır; ikinci oduncu varsa almaz", async () => {
  const { meslekSec } = await import("../src/yerlesim/meslek.ts");
  const k = testKasabasi();
  const c = oyuncuEkle(k, 1, k.ay - 16 * 12);
  meslekSec(c, "oduncu", k.ay);
  c.ev = { kereste: 4 };
  const tekOduncu = (m: string) => (m === "oduncu" ? 1 : 0);
  const r = npcyeSat(c, "kereste", 1, tekOduncu, k.ay);
  assert.ok(r.ok);
  assert.deepEqual(r.deger.birim, satisDegeri("kereste", 0), "kendisi sayılmaz → kıtlık primi");
  const ikiOduncu = (m: string) => (m === "oduncu" ? 2 : 0);
  const r2 = npcyeSat(c, "kereste", 1, ikiOduncu, k.ay);
  assert.ok(r2.ok);
  assert.deepEqual(r2.deger.birim, satisDegeri("kereste", 1));
});

test("kasaba stok kanalı: satılan mal stoğa girer; başka meslekten alıcı önce stoktan taban × 1,5 öder; al-sat kâr etmez", async () => {
  const { meslekSec } = await import("../src/yerlesim/meslek.ts");
  const { STOK_CARPAN, npcFiyat, npcdenAl, stokFiyat } = await import("../src/yerlesim/npc-taban.ts");
  const k = testKasabasi();
  const stok = {};
  const oduncu = oyuncuEkle(k, 1, k.ay - 16 * 12);
  meslekSec(oduncu, "oduncu", k.ay);
  oduncu.ev = { komur: 3 };
  assert.ok(npcyeSat(oduncu, "komur", 3, hicKimse, k.ay, stok).ok);
  assert.deepEqual(stok, { komur: 3 });
  // Oduncu kendi mesleğinin malını stoktan alamaz (NPC'den alır).
  const kendi = npcdenAl(oduncu, "komur", 1, k.ay, stok);
  assert.ok(kendi.ok);
  assert.deepEqual([kendi.deger.stoktan, kendi.deger.npcden], [0, 1]);
  const demirci = oyuncuEkle(k, 2, k.ay - 16 * 12);
  meslekSec(demirci, "demirci", k.ay);
  demirci.pa = 100;
  const al = npcdenAl(demirci, "komur", 4, k.ay, stok);
  assert.ok(al.ok, JSON.stringify(al));
  assert.equal(stokFiyat("komur").toplam, Math.ceil(MALLAR.komur.taban * STOK_CARPAN));
  assert.deepEqual([al.deger.stoktan, al.deger.npcden], [3, 1]);
  assert.equal(al.deger.tutar, 3 * stokFiyat("komur").toplam + npcFiyat("komur").toplam);
  assert.equal(100 - demirci.pa, al.deger.tutar);
  assert.deepEqual(stok, {});
  assert.deepEqual(al.deger.kota, { alinan: 1, tavan: 3, kalan: 2 }, "NPC kotasına yalnız NPC'den alınan sayılır");
  // Takatsiz kâr yok: her mal için stok fiyatı ≥ kıtlık primli satış değeri.
  for (const m of Object.keys(MALLAR) as (keyof typeof MALLAR)[]) {
    if (MALLAR[m].taban === 0) continue;
    assert.ok(stokFiyat(m).toplam >= satisDegeri(m, 0).toplam, m);
  }
});

test("kıtlık kotası: prim ayda mal başına yalnız KITLIK_KOTASI birime; döküm ve kalan primli birim döner", async () => {
  const { KITLIK_KOTASI } = await import("../src/yerlesim/pazar.ts");
  const { KITLIK_PRIM } = await import("../src/yerlesim/npc-taban.ts");
  const k = testKasabasi();
  const c = oyuncuEkle(k);
  c.ev = { odun: 6 };
  const prim = Math.ceil(MALLAR.odun.taban * KITLIK_PRIM);
  const r = npcyeSat(c, "odun", 4, hicKimse, k.ay);
  assert.ok(r.ok);
  assert.equal(r.deger.tutar, 4 * MALLAR.odun.taban + KITLIK_KOTASI * prim);
  assert.equal(r.deger.dokum.kalemler.reduce((t, x) => t + x.d, 0), r.deger.tutar);
  assert.equal(r.deger.kitlikKalan, 0);
  const r2 = npcyeSat(c, "odun", 1, hicKimse, k.ay);
  assert.ok(r2.ok);
  assert.deepEqual(r2.deger.birim, { toplam: MALLAR.odun.taban, kalemler: [{ k: "taban", d: MALLAR.odun.taban }] }, "kota dolunca primsiz");
});
