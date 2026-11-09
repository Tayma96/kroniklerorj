import test from "node:test";
import assert from "node:assert/strict";
import { dalAc, dugumAc, meslekSec } from "../src/yerlesim/meslek.ts";
import { AZALAN_PENCERE_KENDI, ONARIM_CIKTI, TEMEL_CIKTI, USTA_IS_CIKTI, firsatMaliyeti, temelIsOnizleme, temelIsYap } from "../src/yerlesim/temel-is.ts";
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

test("demirci odun kesebilir: sade çıktı, odunculuk tecrübesi yazılır", () => {
  const k = testKasabasi();
  const c = hazir(k, "demirci");
  const r = temelIsYap(c, "odun", hicKimse, k.ay);
  assert.ok(r.ok);
  assert.equal(r.deger.mal, "odun");
  assert.equal(r.deger.adet, TEMEL_CIKTI);
  assert.equal(r.deger.usta, false);
  assert.equal(r.deger.hizmet, 1);
  assert.equal(c.ms?.s.oduncu?.hz, 1);
  assert.equal(c.ev?.odun, TEMEL_CIKTI);
  assert.equal(c.tk, 17);
});

test("mesleksiz 16 yaşındaki de temel iş yapar", () => {
  const k = testKasabasi();
  const c = hazir(k);
  assert.ok(temelIsYap(c, "tas", hicKimse, k.ay).ok);
});

test("oduncu kendi işinde hizmet kazanır; sert odun ayrı usta işidir (düğüm ister, temel çıktının yerine geçmez)", () => {
  const k = testKasabasi();
  const c = hazir(k, "oduncu");
  const r = temelIsYap(c, "odun", hicKimse, k.ay);
  assert.ok(r.ok && r.deger.hizmet === 1);
  assert.deepEqual(temelIsYap(c, "sertOdun", hicKimse, k.ay), { ok: false, hata: "dugum_kapali" });
  dalAc(c, "oduncu", "orman");
  dugumAc(c, "oduncu", "oduncu.orman.0");
  const u = temelIsYap(c, "sertOdun", hicKimse, k.ay);
  assert.ok(u.ok);
  assert.equal(u.deger.mal, "sertOdun");
  assert.equal(u.deger.adet, USTA_IS_CIKTI);
  assert.equal(u.deger.usta, true);
  const o = temelIsYap(c, "odun", hicKimse, k.ay);
  assert.ok(o.ok && o.deger.mal === "odun", "odun kesmek yine odun verir");
});

test("ana mesleğin kendi işinde azalan getiri penceresi kısa (2 ay); başkasının işinde 6 ay; sonraki verim önizlenir", () => {
  const k = testKasabasi();
  const o = hazir(k, "oduncu");
  const d = hazir(k, "demirci", 2);
  for (const c of [o, d]) {
    const r = temelIsYap(c, "odun", hicKimse, k.ay);
    assert.ok(r.ok);
    assert.equal(r.deger.sonraki, 1, "önizleme: ikinci kez 1");
  }
  assert.equal(temelIsYap(o, "odun", hicKimse, k.ay + AZALAN_PENCERE_KENDI).ok && o.ev?.odun, TEMEL_CIKTI * 2, "oduncu 2 ay sonra tam verim");
  const dr = temelIsYap(d, "odun", hicKimse, k.ay + AZALAN_PENCERE_KENDI);
  assert.ok(dr.ok);
  assert.equal(dr.deger.adet, 1, "demirci 6 aylık pencerede");
  const on = temelIsOnizleme(o, hicKimse, k.ay + AZALAN_PENCERE_KENDI);
  const odun = on.find((x) => x.is === "odun")!;
  assert.deepEqual([odun.adet, odun.sonraki, odun.pencere], [1, 1, AZALAN_PENCERE_KENDI]);
});

test("basit onarım: herkese açık, demircilik tecrübesi; aşınmış aracın sayacı düşer; araç yoksa arac_yok", () => {
  const k = testKasabasi();
  const c = hazir(k, "ciftci");
  assert.deepEqual(temelIsYap(c, "onarim", hicKimse, k.ay), { ok: false, hata: "arac_yok" });
  c.ev = { alet: 1 };
  c.as = { alet: 3 };
  const r = temelIsYap(c, "onarim", hicKimse, k.ay);
  assert.ok(r.ok);
  assert.deepEqual(r.deger.onarim, { mal: "alet", kullanim: 3 - ONARIM_CIKTI, omur: 4 });
  assert.equal(c.ms?.s.demirci?.hz, 1, "demircilik tecrübesi");
  assert.equal(c.ev.alet, 1, "araç envanterde kalır");
  const f = firsatMaliyeti(c, "onarim", hicKimse, k.ay);
  assert.equal(f.kalemler.find((x) => x.k === "bu_is")?.d, 6, "1 kullanımın payı: 24 ÷ 4");
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
