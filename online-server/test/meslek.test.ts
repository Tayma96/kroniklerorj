import test from "node:test";
import assert from "node:assert/strict";
import {
  GERI_ALMA_ARALIK,
  KADEME_HIZMET,
  dalAc,
  dugumAc,
  dugumAcikMi,
  dugumGeriAl,
  hizmetEkle,
  kademeAtla,
  meslekKaydi,
  meslekSec,
  yanSec,
} from "../src/yerlesim/meslek.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

function yasta(k: Kasaba, yil: number, no = 1): Karakter {
  return oyuncuEkle(k, no, k.ay - yil * 12);
}

test("12 yaşında meslek seçilemez, 13'te seçilir; eski kayıt boş başlar", () => {
  const k = testKasabasi();
  const c = yasta(k, 12);
  assert.equal(meslekKaydi(c).a, "");
  assert.deepEqual(meslekSec(c, "demirci", k.ay), { ok: false, hata: "yas_kapisi" });
  const b = yasta(k, 13, 2);
  const r = meslekSec(b, "demirci", k.ay);
  assert.ok(r.ok);
  assert.equal(b.ms?.a, "demirci");
  assert.equal(b.ms?.s.demirci?.kd, 0);
});

test("bilinmeyen meslek ve yan meslek kuralları", () => {
  const k = testKasabasi();
  const c = yasta(k, 14);
  assert.deepEqual(meslekSec(c, "korsan", k.ay), { ok: false, hata: "meslek_gecersiz" });
  assert.deepEqual(yanSec(c, "ciftci", k.ay), { ok: false, hata: "meslek_yok" });
  meslekSec(c, "demirci", k.ay);
  assert.deepEqual(yanSec(c, "demirci", k.ay), { ok: false, hata: "meslek_gecersiz" });
  assert.ok(yanSec(c, "ciftci", k.ay).ok);
  // Yan, ana olarak seçilirse yan boşalır.
  meslekSec(c, "ciftci", k.ay);
  assert.equal(c.ms?.y, "");
});

test("meslek değiştirmek ustalığı silmez", () => {
  const k = testKasabasi();
  const c = yasta(k, 20);
  meslekSec(c, "demirci", k.ay);
  hizmetEkle(c, "demirci", 30);
  assert.ok(kademeAtla(c, "demirci", k.ay).ok);
  meslekSec(c, "tuccar", k.ay);
  meslekSec(c, "demirci", k.ay);
  assert.equal(c.ms?.s.demirci?.kd, 1);
  assert.equal(c.ms?.s.tuccar?.kd, 0);
});

test("hizmet: ana tam, yan yarı, diğerleri 0", () => {
  const k = testKasabasi();
  const c = yasta(k, 14);
  meslekSec(c, "demirci", k.ay);
  yanSec(c, "ciftci", k.ay);
  assert.equal(hizmetEkle(c, "demirci", 2), 2);
  assert.equal(hizmetEkle(c, "ciftci", 2), 1);
  assert.equal(hizmetEkle(c, "asker", 2), 0);
  assert.equal(c.ms?.s.asker, undefined);
});

test("kademe eşiği, ağır meslekte yaş ve pir için çırak şartı", () => {
  const k = testKasabasi();
  const c = yasta(k, 14);
  meslekSec(c, "demirci", k.ay);
  hizmetEkle(c, "demirci", KADEME_HIZMET[1]! - 1);
  assert.deepEqual(kademeAtla(c, "demirci", k.ay), { ok: false, hata: "kademe_kapali" });
  hizmetEkle(c, "demirci", 1);
  assert.deepEqual(kademeAtla(c, "demirci", k.ay), { ok: true, deger: 1 });

  const a = yasta(k, 15, 2);
  meslekSec(a, "asker", k.ay);
  hizmetEkle(a, "asker", 100);
  assert.deepEqual(kademeAtla(a, "asker", k.ay), { ok: false, hata: "kademe_kapali" });
  assert.ok(kademeAtla(a, "asker", k.ay + 12).ok);

  const p = yasta(k, 30, 3);
  meslekSec(p, "demirci", k.ay);
  hizmetEkle(p, "demirci", 500);
  assert.ok(kademeAtla(p, "demirci", k.ay).ok);
  assert.ok(kademeAtla(p, "demirci", k.ay).ok);
  assert.deepEqual(kademeAtla(p, "demirci", k.ay), { ok: false, hata: "kademe_kapali" });
  p.ms!.s.demirci!.cy = 2;
  assert.deepEqual(kademeAtla(p, "demirci", k.ay), { ok: true, deger: 3 });
  assert.deepEqual(kademeAtla(p, "demirci", k.ay), { ok: false, hata: "kademe_kapali" });
});

test("dal sınırı: çırak 1, kalfa 2, usta 3; seçilmemiş meslekte dal açılmaz", () => {
  const k = testKasabasi();
  const c = yasta(k, 20);
  assert.deepEqual(dalAc(c, "demirci", "alet"), { ok: false, hata: "meslek_yok" });
  meslekSec(c, "demirci", k.ay);
  assert.deepEqual(dalAc(c, "demirci", "kalem"), { ok: false, hata: "meslek_gecersiz" });
  assert.ok(dalAc(c, "demirci", "alet").ok);
  assert.ok(dalAc(c, "demirci", "alet").ok, "aynı dal tekrar açmak zararsız");
  assert.deepEqual(dalAc(c, "demirci", "silah"), { ok: false, hata: "dal_kapali" });
  hizmetEkle(c, "demirci", KADEME_HIZMET[1]!);
  kademeAtla(c, "demirci", k.ay);
  assert.ok(dalAc(c, "demirci", "silah").ok);
  assert.deepEqual(dalAc(c, "demirci", "zirh"), { ok: false, hata: "dal_kapali" });
});

test("düğüm sırası, kademe kapısı ve pir uzmanlaşması", () => {
  const k = testKasabasi();
  const c = yasta(k, 30);
  meslekSec(c, "demirci", k.ay);
  assert.deepEqual(dugumAc(c, "demirci", "demirci.alet.0"), { ok: false, hata: "dal_kapali" });
  dalAc(c, "demirci", "alet");
  assert.deepEqual(dugumAc(c, "demirci", "demirci.alet.1"), { ok: false, hata: "dugum_kapali" });
  assert.ok(dugumAc(c, "demirci", "demirci.alet.0").ok);
  assert.ok(dugumAcikMi(c, "demirci.alet.0"));
  assert.deepEqual(dugumAc(c, "demirci", "demirci.alet.1"), { ok: false, hata: "dugum_kapali" }, "kademe yetmez");
  assert.deepEqual(dugumAc(c, "demirci", "ciftci.ekin.0"), { ok: false, hata: "meslek_gecersiz" });

  hizmetEkle(c, "demirci", 500);
  kademeAtla(c, "demirci", k.ay);
  kademeAtla(c, "demirci", k.ay);
  c.ms!.s.demirci!.cy = 2;
  kademeAtla(c, "demirci", k.ay);
  dalAc(c, "demirci", "silah");
  for (const d of ["alet.1", "alet.2", "alet.3", "silah.0", "silah.1", "silah.2"]) assert.ok(dugumAc(c, "demirci", `demirci.${d}`).ok, d);
  assert.deepEqual(dugumAc(c, "demirci", "demirci.silah.3"), { ok: false, hata: "dugum_kapali" }, "pir ucu tek dalda");
});

test("geri alma: yılda bir, üstü açıksa olmaz", () => {
  const k = testKasabasi();
  const c = yasta(k, 20);
  meslekSec(c, "demirci", k.ay);
  hizmetEkle(c, "demirci", KADEME_HIZMET[1]!);
  kademeAtla(c, "demirci", k.ay);
  dalAc(c, "demirci", "alet");
  dugumAc(c, "demirci", "demirci.alet.0");
  dugumAc(c, "demirci", "demirci.alet.1");
  assert.deepEqual(dugumGeriAl(c, "demirci", "demirci.alet.0", k.ay), { ok: false, hata: "dugum_kapali" });
  assert.ok(dugumGeriAl(c, "demirci", "demirci.alet.1", k.ay).ok);
  assert.equal(dugumAcikMi(c, "demirci.alet.1"), false);
  assert.deepEqual(dugumGeriAl(c, "demirci", "demirci.alet.0", k.ay + GERI_ALMA_ARALIK - 1), { ok: false, hata: "geri_alma_dolu" });
  assert.ok(dugumGeriAl(c, "demirci", "demirci.alet.0", k.ay + GERI_ALMA_ARALIK).ok);
  assert.deepEqual(dugumGeriAl(c, "demirci", "demirci.alet.0", k.ay + 99), { ok: false, hata: "dugum_kapali" }, "açık olmayan düğüm");
});

test("pişmanlık hakkı bütün meslekler için tek: yan meslekte de 12 ay beklenir", () => {
  const k = testKasabasi();
  const c = yasta(k, 20);
  meslekSec(c, "demirci", k.ay);
  yanSec(c, "ciftci", k.ay);
  dalAc(c, "demirci", "alet");
  dugumAc(c, "demirci", "demirci.alet.0");
  dalAc(c, "ciftci", "ekin");
  dugumAc(c, "ciftci", "ciftci.ekin.0");
  assert.ok(dugumGeriAl(c, "demirci", "demirci.alet.0", k.ay).ok);
  assert.deepEqual(dugumGeriAl(c, "ciftci", "ciftci.ekin.0", k.ay + 1), { ok: false, hata: "geri_alma_dolu" });
});
