// Barınma (Faz 14, GDD §18): zincir zamanlaması (sahte saat), can tabanı, şehir başına tek koruma, kira, otomatik
// konaklama modları, sosyal tesis, eski kayıt, uyku kademesi, zincir bayrağı ve dönüş ekranı içeriği.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CAN_KAYBI_ESIGI_MS,
  EVSIZ_ESIGI_MS,
  EVSIZ_KONDISYON,
  ILK_KORUMA_MS,
  SEHIR_KORUMA_MS,
  ayBasi,
  barinmaDonumu,
  barinmaGorunumu,
  barinmaIlerlet,
  kiraTut,
  otomatikAyarla,
  tesisKonakla,
  zincirAcik,
} from "../src/yerlesim/barinma.ts";
import { donusHazirla } from "../src/yerlesim/donus-ekrani.ts";
import { HAL_TABAN_CAN, halAl } from "../src/yerlesim/hal.ts";
import { olduMu } from "../src/yerlesim/hanedan.ts";
import { kiraFiyati } from "../src/yerlesim/oda.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const SAAT = 60 * 60 * 1000;
const GUN = 24 * SAAT;
type Nesne = Record<string, any>;

/** Ocaksız (hanesiz) karakter: zincire girebilen tek tür. */
function evsizAday(k: Kasaba, no = 1): Karakter {
  const kar = oyuncuEkle(k, no);
  kar.e = 0;
  return kar;
}

test("zincir §18 tablosuna uyar: 48. saat uyarı, 72. saat Evsiz, 144. saat can kaybı (ilk yerleşim)", () => {
  const k = testKasabasi();
  const kar = evsizAday(k);
  const t0 = ayBasi(0) + 3 * SAAT;
  const a = (dt: number) => barinmaIlerlet(k, kar, t0 + dt, false);
  const r0 = a(0);
  assert.equal(r0.durum, "misafir");
  assert.equal(r0.konaklama?.bitis, t0 + ILK_KORUMA_MS);
  assert.deepEqual(kar.br!.mh[k.y], [t0, t0 + 48 * SAAT]);
  assert.equal(a(48 * SAAT - 1).durum, "misafir");
  const uyari = a(48 * SAAT);
  assert.equal(uyari.durum, "uyari");
  assert.equal(uyari.z, t0 + 48 * SAAT);
  assert.equal(a(72 * SAAT - 1).durum, "uyari");
  assert.equal(a(72 * SAAT).durum, "evsiz");
  assert.equal(a(144 * SAAT - 1).durum, "evsiz");
  assert.equal(a(144 * SAAT).durum, "canKaybi");
  assert.equal(EVSIZ_ESIGI_MS, 24 * SAAT);
  assert.equal(CAN_KAYBI_ESIGI_MS, 96 * SAAT);
  const g = barinmaGorunumu(k, kar, t0 + 100 * SAAT);
  assert.equal(g.unvan, "evsiz");
  assert.deepEqual(g.zincir?.sonraki, { asama: "canKaybi", an: t0 + 144 * SAAT });
  assert.equal(g.zincir?.etkiler.kondisyonAylik, -EVSIZ_KONDISYON);
  assert.equal(g.zincir?.etkiler.olum, false);
});

test("ay dönümü: çevrimdışıyken de işler; Evsizken kondisyon/gönül, can kaybında can düşer; taban %10, ölüm yok", () => {
  const k = testKasabasi();
  const kar = evsizAday(k);
  const olaylar: Nesne[] = [];
  let enAzCan = 100;
  for (let ay = 1; ay <= 40; ay++) {
    k.ay = ay;
    olaylar.push(...barinmaDonumu(k, ay).map((o) => ({ ...o, ay })));
    enAzCan = Math.min(enAzCan, halAl(kar, ay).can);
  }
  // İlk değerlendirme ay 1'in başında: koruma 4 ay, uyarı ay 5, Evsiz ay 7 (+2), can kaybı ay 13 (+6).
  assert.deepEqual(
    olaylar.map((o) => [o.k, o.ay]),
    [
      ["olay.barinma.uyari", 5],
      ["olay.barinma.evsiz", 7],
      ["olay.barinma.canKaybi", 13],
    ],
  );
  assert.ok(olaylar.every((o) => o.g === kar.o), "olaylar yalnız oyuncuya görünür");
  assert.equal(enAzCan, HAL_TABAN_CAN, "can tabana iner ama altına inmez");
  assert.equal(halAl(kar, 40).can, HAL_TABAN_CAN);
  assert.equal(olduMu(kar), false);
  assert.ok((kar.hn ?? []).some((n) => n[2] === "hal.neden.evsizlik"));
  // Aynı ay ikinci kez işlenmez.
  const once = structuredClone(kar.hl);
  barinmaDonumu(k, 40);
  assert.deepEqual(kar.hl, once);
});

test("konaklama bulununca zincir durur: kira peşin, akçe dünyadan çıkar, aynı oda uzar, hatalar", () => {
  const k = testKasabasi(); // develi: kasaba → küçük han (yatak, oda)
  const kar = evsizAday(k);
  const t0 = ayBasi(0);
  barinmaIlerlet(k, kar, t0, false);
  const t = t0 + 80 * SAAT; // Evsiz
  assert.equal(barinmaGorunumu(k, kar, t).unvan, "evsiz");
  kar.pa = 3;
  assert.deepEqual(kiraTut(k, kar, { oda: "oda", sure: 1 }, t), { ok: false, hata: "para_yok" });
  assert.deepEqual(kiraTut(k, kar, { oda: "hasOda", sure: 1 }, t), { ok: false, hata: "oda_gecersiz" });
  assert.deepEqual(kiraTut(k, kar, { oda: "yatak", sure: 2 }, t), { ok: false, hata: "sure_gecersiz" });
  const r = kiraTut(k, kar, { oda: "yatak", sure: 1 }, t);
  assert.ok(r.ok);
  const kira = r.deger.kira as Nesne;
  assert.equal(kira.fiyat, 2);
  assert.equal(kira.batak, 2);
  assert.equal(kar.pa, 1, "toplam akçe: verilen = batak (NPC hancı)");
  const g = r.deger.barinma as Nesne;
  assert.equal(g.durum, "konakli");
  assert.equal(g.unvan, null);
  assert.ok(kar.br!.gl.some((x) => x[1] === "zincir.durdu") || kar.br!.za[1] < 0);
  // Başka oda kademesi süre bitmeden kiralanamaz; aynı oda bitişten devam eder.
  kar.pa = 100;
  assert.deepEqual(kiraTut(k, kar, { oda: "oda", sure: 1 }, t + SAAT), { ok: false, hata: "oda_var" });
  const u = kiraTut(k, kar, { oda: "yatak", sure: 3 }, t + SAAT);
  assert.ok(u.ok);
  assert.equal((u.deger.kira as Nesne).bitis, t + 4 * 12 * SAAT);
  assert.equal((u.deger.kira as Nesne).fiyat, kiraFiyati(2, 3));
  assert.deepEqual(kiraTut(k, kar, { oda: "yatak", sure: 12 }, t + SAAT), { ok: false, hata: "kira_siniri" });
  // Oda süresi bitince boşalır, borç doğmaz; zincir bitişten yeniden sayılır (misafirhane hakkı kullanılmış).
  const bitis = t + 4 * 12 * SAAT;
  const sonra = barinmaIlerlet(k, kar, bitis + SAAT, false);
  assert.equal(sonra.durum, "uyari");
  assert.equal(sonra.z, bitis);
  assert.equal(kar.pa, 100 - kiraFiyati(2, 3));
  assert.ok(kar.br!.gl.some((x) => x[1] === "oda.bitti" && x[0] === bitis));
});

test("misafir koruması: ilk yerleşim ömürde bir kez 48 saat, diğer şehirler şehir başına bir kez 12 saat", () => {
  const k = testKasabasi();
  const kar = evsizAday(k);
  const t0 = ayBasi(0);
  assert.equal(barinmaIlerlet(k, kar, t0, false).konaklama?.bitis, t0 + ILK_KORUMA_MS);
  const kayseri = { y: "kayseri", tur: "sehir" as const };
  const t1 = t0 + 60 * SAAT;
  const v1 = barinmaIlerlet(kayseri, kar, t1, false);
  assert.equal(v1.durum, "misafir");
  assert.equal(v1.konaklama?.bitis, t1 + SEHIR_KORUMA_MS);
  // İlk yerleşime dönüş hakkı yenilemez.
  const t2 = t1 + 20 * SAAT;
  assert.equal(barinmaIlerlet(k, kar, t2, false).durum, "uyari");
  assert.deepEqual(kar.br!.mh[k.y], [t0, t0 + ILK_KORUMA_MS]);
  // Aynı şehre gidip gelmek de yenilemez.
  const t3 = t2 + 5 * SAAT;
  assert.equal(barinmaIlerlet(kayseri, kar, t3, false).durum, "uyari");
  assert.deepEqual(kar.br!.mh.kayseri, [t1, t1 + SEHIR_KORUMA_MS]);
  // Ocağı olan karakter hakkı harcamaz; ocak yitirilince hak o andan sayılır.
  const k2 = testKasabasi();
  const c = oyuncuEkle(k2, 2);
  assert.equal(barinmaIlerlet(k2, c, t0, true).konaklama?.tur, "ocak");
  assert.deepEqual(c.br!.mh, {});
  const kayip = t0 + 10 * GUN;
  assert.equal(barinmaIlerlet(k2, c, kayip, false).konaklama?.bitis, kayip + ILK_KORUMA_MS);
});

test("otomatik konaklama: varsayılan kapalı; oda (kesintisiz, akçeyle), tesis (ücretsiz, yoksula), uyar (harcamaz)", () => {
  const t0 = ayBasi(0);
  const bitis = t0 + ILK_KORUMA_MS;
  const kur = (mod: string, para: number) => {
    const k = testKasabasi();
    const kar = evsizAday(k);
    barinmaIlerlet(k, kar, t0, false);
    assert.equal(kar.br!.om, 0, "varsayılan kapalı");
    assert.ok(otomatikAyarla(k, kar, { mod }, t0).ok);
    kar.pa = para;
    return { k, kar, r: barinmaIlerlet(k, kar, bitis + 2 * SAAT, false) };
  };
  const kapali = kur("kapali", 50);
  assert.equal(kapali.r.durum, "uyari");
  assert.equal(kapali.kar.pa, 50);

  const oda = kur("oda", 50);
  assert.equal(oda.r.durum, "konakli");
  assert.deepEqual(oda.r.otomatik, { tur: "oda", oda: "yatak", fiyat: 2, batak: 2 });
  assert.equal(oda.kar.pa, 48);
  assert.equal(oda.kar.br!.od[0]!.b, bitis, "koruma bittiği an başlar");

  const odaParasiz = kur("oda", 1);
  assert.equal(odaParasiz.r.durum, "uyari");
  assert.equal(odaParasiz.kar.pa, 1);
  barinmaIlerlet(odaParasiz.k, odaParasiz.kar, bitis + 3 * SAAT, false);
  assert.equal(odaParasiz.kar.br!.gl.filter((x) => x[1] === "otomatik.akceYok").length, 1, "uyarı tek sefer");

  const tesis = kur("tesis", 0);
  assert.equal(tesis.r.durum, "konakli");
  assert.equal(tesis.r.konaklama?.tur, "tesis");
  const tesisZengin = kur("tesis", 50);
  assert.equal(tesisZengin.r.durum, "uyari");

  const uyar = kur("uyar", 50);
  assert.equal(uyar.r.durum, "uyari");
  assert.equal(uyar.kar.pa, 50);
  assert.ok(uyar.kar.br!.gl.some((x) => x[1] === "otomatik.uyari"));

  const k = testKasabasi();
  assert.deepEqual(otomatikAyarla(k, evsizAday(k), { mod: "hepsi" }, t0), { ok: false, hata: "mod_gecersiz" });
});

test("sosyal tesis (D-23 önerisi): yoksula 1 ay, 6 ayda 2 kez; konaklaması olana kapalı", () => {
  const k = testKasabasi();
  const kar = evsizAday(k);
  const t0 = ayBasi(0);
  kar.pa = 0;
  assert.deepEqual(tesisKonakla(k, kar, t0), { ok: false, hata: "konaklama_var" }, "misafirhanedeyken gerek yok");
  const t1 = t0 + ILK_KORUMA_MS;
  const r1 = tesisKonakla(k, kar, t1);
  assert.ok(r1.ok);
  assert.equal((r1.deger.tesis as Nesne).tur, "imaret");
  assert.ok(tesisKonakla(k, kar, t1 + 13 * SAAT).ok);
  assert.deepEqual(tesisKonakla(k, kar, t1 + 26 * SAAT), { ok: false, hata: "tesis_dolu" });
  kar.pa = 10;
  assert.deepEqual(tesisKonakla(k, kar, t1 + 80 * GUN), { ok: false, hata: "tesis_sart" });
});

test("eski kayıt: barınma alanı ve Hal'i olmayan karakter göçsüz yüklenir", () => {
  const k = testKasabasi();
  const kar = oyuncuEkle(k);
  delete kar.br;
  delete kar.hl;
  const t = ayBasi(3) + SAAT;
  const g = barinmaGorunumu(k, kar, t);
  assert.equal(g.acik, true);
  assert.equal(g.durum, "konakli");
  assert.equal(g.konaklama?.tur, "ocak");
  assert.equal(g.otomatik.mod, "kapali");
  assert.equal(kar.br!.iy, k.y);
  assert.equal(kar.br!.kb, t);
});

test("bayrak: oda sistemi yokken zincir kapalı (hak açılmaz, etki yok)", () => {
  assert.ok(zincirAcik("koy") && zincirAcik("kasaba") && zincirAcik("sehir"));
  const k = testKasabasi();
  const kar = evsizAday(k);
  for (let ay = 1; ay <= 30; ay++) {
    assert.equal(barinmaIlerlet(k, kar, ayBasi(ay), false, false).durum, "kapali");
    assert.deepEqual(barinmaDonumu(k, ay, false), []);
  }
  assert.deepEqual(kar.br!.mh, {});
  assert.equal(kar.hl, undefined, "Hal'e dokunulmadı");
});

test("uyku kademesi (D-22 önerisi): 30 günü aşan yoklukta etki işlemez; dönüşte mola", () => {
  const k = testKasabasi();
  const kar = evsizAday(k);
  for (let ay = 1; ay <= 70; ay++) {
    k.ay = ay;
    barinmaDonumu(k, ay);
  }
  const uykuAyi = 61; // kb = ay 1 başı; 30 gün = 60 ay
  const nedenler = (kar.hn ?? []).filter((n) => n[2] === "hal.neden.evsizlik");
  assert.ok(nedenler.every((n) => n[3] < uykuAyi), "uykuda evsizlik etkisi yok");
  const simdi = ayBasi(70) + SAAT;
  const d = donusHazirla(k, kar, simdi);
  assert.ok(d.donusEkrani);
  assert.equal(d.donusEkrani.yokluk.uyku, true);
  assert.equal(kar.br!.dm, simdi + 12 * SAAT);
});

test("dönüş ekranı: durum açık ve yargılamadan, sayılar dürüst, tek dokunuşla barınma", () => {
  const k = testKasabasi();
  const kar = evsizAday(k);
  const t0 = ayBasi(0) + SAAT;
  barinmaIlerlet(k, kar, t0, false);
  kar.kz = t0;
  kar.pa = 3;
  // Kısa yoklukta dönüş ekranı yok.
  assert.equal(donusHazirla(k, kar, t0 + 2 * SAAT).donusEkrani, null);
  const simdi = t0 + 100 * SAAT;
  const { donusEkrani: e, barinma } = donusHazirla(k, kar, simdi);
  assert.ok(e);
  assert.equal(barinma.durum, "evsiz");
  assert.equal(e.baslik, "donus.baslik.toparlan");
  assert.equal(e.barinma.anahtar, "donus.barinma.evsiz");
  assert.equal(e.barinma.toparlanma, "donus.toparlanma.konaklama");
  assert.equal(e.yokluk.ms, 100 * SAAT);
  assert.equal(e.barinma.zincir?.etkiler.canTaban, HAL_TABAN_CAN);
  assert.ok(e.olanlar.some((o) => o.k === "donus.olan.misafirhane.basladi"));
  assert.ok(e.olanlar.some((o) => o.k === "donus.olan.misafirhane.bitti"));
  const ilk = e.secenekler[0]!;
  assert.equal(ilk.uygun, true);
  assert.equal(ilk.tur, "oda");
  assert.deepEqual(ilk.istek, { yontem: "POST", yol: "/v1/barinma/kira", govde: { oda: "yatak", sure: 1 } });
  assert.ok(e.secenekler.some((s) => s.tur === "tesis" && s.uygun === false && s.neden === "tesis_sart"));
  assert.ok(e.secenekler.some((s) => s.tur === "oda" && s.istek.govde.oda === "oda" && s.neden === "para_yok"));
  assert.ok(e.secenekler.some((s) => s.tur === "otomatik"));
  assert.equal(e.otomatik.oneri, "donus.otomatik.oneri");
  assert.ok(!/ceza/i.test(JSON.stringify(e)), "dil ceza değil durum");
  // Tek dokunuş: önerilen istek gövdesi aynen uygulanır, zincir durur.
  const r = kiraTut(k, kar, ilk.istek.govde, simdi);
  assert.ok(r.ok);
  assert.equal((r.deger.barinma as Nesne).durum, "konakli");
});

test("odanın getirdikleri: odada ay dönümünde kondisyon fazladan toparlanır", () => {
  const k = testKasabasi();
  const kar = evsizAday(k);
  kar.pa = 100;
  const t = ayBasi(1) - SAAT;
  assert.ok(kiraTut(k, kar, { oda: "oda", sure: 3 }, t).ok);
  kar.hl = [100, 20, 50, 1];
  k.ay = 2;
  barinmaDonumu(k, 2);
  assert.ok((kar.hn ?? []).some((n) => n[2] === "hal.neden.oda" && n[1] === 5));
  assert.equal(halAl(kar, 2).kondisyon, 20 + 15 + 5);
});
