import test from "node:test";
import assert from "node:assert/strict";
import { dalAc, dugumAc, meslekSec } from "../src/yerlesim/meslek.ts";
import { TEMEL_CIKTI, firsatMaliyeti, temelIsYap } from "../src/yerlesim/temel-is.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const hicKimse = () => 0;

function hazir(k: Kasaba, meslek?: string, no = 1): Karakter {
  const c = oyuncuEkle(k, no, k.ay - 16 * 12);
  c.tk = 18;
  c.ta = k.ay;
  if (meslek) meslekSec(c, meslek, k.ay);
  return c;
}

test("demirci odun kesebilir: sade çıktı, hizmet yok", () => {
  const k = testKasabasi();
  const c = hazir(k, "demirci");
  const r = temelIsYap(c, "odun", hicKimse, k.ay);
  assert.ok(r.ok);
  assert.equal(r.deger.mal, "odun");
  assert.equal(r.deger.adet, TEMEL_CIKTI);
  assert.equal(r.deger.usta, false);
  assert.equal(r.deger.hizmet, 0);
  assert.equal(c.ev?.odun, TEMEL_CIKTI);
  assert.equal(c.tk, 17);
});

test("mesleksiz 16 yaşındaki de temel iş yapar", () => {
  const k = testKasabasi();
  const c = hazir(k);
  assert.ok(temelIsYap(c, "tas", hicKimse, k.ay).ok);
});

test("oduncu kendi işinde hizmet kazanır; usta düğümüyle sert odun", () => {
  const k = testKasabasi();
  const c = hazir(k, "oduncu");
  const r = temelIsYap(c, "odun", hicKimse, k.ay);
  assert.ok(r.ok && r.deger.hizmet === 1);
  dalAc(c, "oduncu", "orman");
  dugumAc(c, "oduncu", "oduncu.orman.0");
  const u = temelIsYap(c, "odun", hicKimse, k.ay + 7);
  assert.ok(u.ok);
  assert.equal(u.deger.mal, "sertOdun");
  assert.equal(u.deger.adet, TEMEL_CIKTI, "usta düğümü sayı değil malı değiştirir");
  assert.equal(u.deger.usta, true);
});

test("azalan getiri: 3, 1, 1, sonra verim yok (takat harcanmaz); 7 ay sonra yeniden 3", () => {
  const k = testKasabasi();
  const c = hazir(k, "demirci");
  const adetler = [1, 2, 3].map(() => {
    const r = temelIsYap(c, "odun", hicKimse, k.ay);
    return r.ok ? r.deger.adet : -1;
  });
  assert.deepEqual(adetler, [3, 1, 1]);
  const tk = c.tk;
  assert.deepEqual(temelIsYap(c, "odun", hicKimse, k.ay), { ok: false, hata: "verim_yok" });
  assert.equal(c.tk, tk);
  // Başka bir temel iş etkilenmez.
  const t = temelIsYap(c, "tas", hicKimse, k.ay);
  assert.ok(t.ok && t.deger.adet === 3);
  const r = temelIsYap(c, "odun", hicKimse, k.ay + 7);
  assert.ok(r.ok && r.deger.adet === 3);
});

test("takat yoksa iş yapılmaz ve envanter değişmez", () => {
  const k = testKasabasi();
  const c = hazir(k, "demirci");
  c.tk = 0;
  assert.deepEqual(temelIsYap(c, "odun", hicKimse, k.ay), { ok: false, hata: "takat_yok" });
  assert.equal(c.ev?.odun, undefined);
});

test("bilinmeyen iş ve 12 yaş kapısı", () => {
  const k = testKasabasi();
  const c = hazir(k);
  assert.deepEqual(temelIsYap(c, "hazine", hicKimse, k.ay), { ok: false, hata: "eylem_gecersiz" });
  const kucuk = oyuncuEkle(k, 2);
  assert.deepEqual(temelIsYap(kucuk, "odun", hicKimse, k.ay), { ok: false, hata: "yas_kapisi" });
});

test("fırsat maliyeti görünür: demircide meslekte kalemi negatif, oduncuda yok", () => {
  const k = testKasabasi();
  const d = hazir(k, "demirci");
  const f = firsatMaliyeti(d, "odun", hicKimse, k.ay);
  assert.equal(f.kalemler.reduce((a, x) => a + x.d, 0), f.toplam);
  const meslekte = f.kalemler.find((x) => x.k === "meslekte");
  assert.ok(meslekte && meslekte.d < 0);
  const o = hazir(k, "oduncu", 2);
  assert.equal(firsatMaliyeti(o, "odun", hicKimse, k.ay).kalemler.some((x) => x.k === "meslekte"), false);
});
