import test from "node:test";
import assert from "node:assert/strict";
import {
  KADEME_HIZMET,
  MESLEK_DEGISIM_ARALIK,
  PUAN_ARTIS,
  PUAN_TAVANI,
  PUAN_TECRUBE,
  beceriPuani,
  dugumAcikMi,
  hizmetEkle,
  kademeAtla,
  meslekKaydi,
  meslekSec,
  tecrubePuani,
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

test("bilinmeyen meslek; eski yan meslek etiketi kuralları", () => {
  const k = testKasabasi();
  const c = yasta(k, 14);
  assert.deepEqual(meslekSec(c, "korsan", k.ay), { ok: false, hata: "meslek_gecersiz" });
  assert.deepEqual(yanSec(c, "ciftci", k.ay), { ok: false, hata: "meslek_yok" });
  meslekSec(c, "demirci", k.ay);
  assert.deepEqual(yanSec(c, "demirci", k.ay), { ok: false, hata: "meslek_gecersiz" });
  assert.ok(yanSec(c, "ciftci", k.ay).ok);
  meslekSec(c, "ciftci", k.ay + MESLEK_DEGISIM_ARALIK);
  assert.equal(c.ms?.y, "", "yan, ana olunca boşalır");
});

test("ana meslek yılda bir değişir; aynı mesleği yeniden seçmek zararsız", () => {
  const k = testKasabasi();
  const c = yasta(k, 20);
  assert.ok(meslekSec(c, "demirci", k.ay).ok);
  assert.ok(meslekSec(c, "demirci", k.ay).ok);
  assert.deepEqual(meslekSec(c, "tuccar", k.ay + MESLEK_DEGISIM_ARALIK - 1), { ok: false, hata: "meslek_degisim_dolu" });
  assert.ok(meslekSec(c, "tuccar", k.ay + MESLEK_DEGISIM_ARALIK).ok);
  assert.equal(c.ms?.a, "tuccar");
});

test("meslek değiştirmek ustalığı silmez", () => {
  const k = testKasabasi();
  const c = yasta(k, 20);
  meslekSec(c, "demirci", k.ay);
  hizmetEkle(c, "demirci", 30);
  assert.ok(kademeAtla(c, "demirci", k.ay).ok);
  meslekSec(c, "tuccar", k.ay + 12);
  meslekSec(c, "demirci", k.ay + 24);
  assert.equal(c.ms?.s.demirci?.kd, 1);
  assert.equal(c.ms?.s.tuccar?.kd, 0);
});

test("hizmet: faaliyetin mesleğine tam yazılır (Tam Özgürlük)", () => {
  const k = testKasabasi();
  const c = yasta(k, 14);
  meslekSec(c, "demirci", k.ay);
  assert.equal(hizmetEkle(c, "demirci", 2), 2);
  assert.equal(hizmetEkle(c, "asker", 2), 2);
  assert.equal(c.ms?.s.asker?.hz, 2, "seçilmemiş meslekte de ilerleme açılır");
  assert.equal(c.ms?.a, "demirci", "aktif meslek değişmez");
  assert.equal(hizmetEkle(c, "asker", 0), 0);
});

test("kademe eşiği, ağır meslekte yaş ve pir için çırak şartı; aktif olmayan meslekte de kademe atlanır", () => {
  const k = testKasabasi();
  const c = yasta(k, 14);
  meslekSec(c, "demirci", k.ay);
  hizmetEkle(c, "demirci", KADEME_HIZMET[1]! - 1);
  assert.deepEqual(kademeAtla(c, "demirci", k.ay), { ok: false, hata: "kademe_kapali" });
  hizmetEkle(c, "demirci", 1);
  assert.deepEqual(kademeAtla(c, "demirci", k.ay), { ok: true, deger: 1 });
  hizmetEkle(c, "ciftci", KADEME_HIZMET[1]!);
  assert.deepEqual(kademeAtla(c, "ciftci", k.ay), { ok: true, deger: 1 });

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

test("tecrübe barı: başlangıç puanı yok, her puanda bar uzar, meslek başına tavan", () => {
  assert.deepEqual(tecrubePuani(0), { puan: 0, bar: PUAN_TECRUBE, dolu: 0 });
  assert.equal(tecrubePuani(PUAN_TECRUBE - 1).puan, 0);
  assert.equal(tecrubePuani(PUAN_TECRUBE).puan, 1);
  assert.equal(tecrubePuani(PUAN_TECRUBE).bar, PUAN_TECRUBE + PUAN_ARTIS, "ikinci bar daha uzun");
  assert.equal(tecrubePuani(2 * PUAN_TECRUBE + PUAN_ARTIS).puan, 2);
  assert.equal(tecrubePuani(1e9).puan, PUAN_TAVANI);
  const p = beceriPuani({ kd: 0, hz: 1e9, cy: 0, gp: 10 });
  assert.equal(p.kazanilan, PUAN_TAVANI, "göç puanı da tavanı aşamaz");
  assert.equal(p.bar, null);
  assert.equal(p.sonrakiPuan, null);
});

test("beceri puanı mesleğe özeldir: demirci tecrübesi çiftçi ağacına puan vermez", () => {
  const k = testKasabasi();
  const c = yasta(k, 20);
  meslekSec(c, "demirci", k.ay);
  hizmetEkle(c, "demirci", PUAN_TECRUBE * 3 + PUAN_ARTIS * 3);
  hizmetEkle(c, "ciftci", 1);
  assert.equal(beceriPuani(c.ms!.s.ciftci!).kalan, 0);
  assert.equal(beceriPuani(c.ms!.s.demirci!).kalan, 3);
  assert.equal(beceriPuani(c.ms!.s.ciftci!).sonrakiPuan, PUAN_TECRUBE - 1);
});

test("eski kayıt göçü: v1 dg → v2 seviye haritası, bedeli göç puanıyla karşılanır", () => {
  const k = testKasabasi();
  const c = yasta(k, 20);
  c.ms = {
    a: "demirci",
    y: "oduncu",
    s: {
      demirci: { kd: 1, dl: ["alet"], dg: ["demirci.alet.0", "demirci.alet.1"], hz: 0, cy: 0 },
      oduncu: { kd: 0, dl: ["maden"], dg: ["oduncu.maden.0"], hz: 0, cy: 0 },
      ciftci: { kd: 1, dl: ["ekin", "suru"], dg: ["ciftci.ekin.0", "ciftci.ekin.1", "ciftci.suru.0"], hz: 0, cy: 0 },
    },
  };
  // Okumada göçer: tarifler/işler kaybolmaz.
  assert.ok(dugumAcikMi(c, "demirci.aletcilik", 2), "nal ve alet tarifi korunur");
  assert.ok(dugumAcikMi(c, "oduncu.madencilik", 2), "kömür ve cevher korunur");
  assert.ok(dugumAcikMi(c, "ciftci.ekinBilgisi", 1));
  assert.ok(dugumAcikMi(c, "ciftci.sabanSurumu", 1), "kalfa düğümü kalfa karşılığına, 1. seviye");
  assert.ok(dugumAcikMi(c, "ciftci.hayvancilik", 2));
  const d = c.ms.s.demirci!;
  assert.equal(d.dg, undefined);
  assert.equal(d.dl, undefined);
  assert.deepEqual(d.sv, { "demirci.aletcilik": 2 });
  assert.equal(d.gp, 2);
  assert.equal(beceriPuani(d).kalan, 0, "göç puanı harcananı karşılar");
  assert.equal(beceriPuani(c.ms.s.ciftci!).kalan, 0);
  // Tekrar göç zararsız.
  meslekKaydi(c);
  assert.equal(c.ms.s.demirci!.gp, 2);
});
