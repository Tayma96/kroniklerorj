// Beceri ağacı v2 mantığı: ön koşul, kademe, puan, tek sıra, süre (sahte saat), iptal, kısaltma, yeniden düzenleme,
// Tam Özgürlük, gizli düğüm, unvan ve çiftçi/oduncu/demirci etkilerinin oyun mekaniğine bağlanması.
import test from "node:test";
import assert from "node:assert/strict";
import { beceriDugumu } from "../src/icerik/agaclar/index.ts";
import {
  EGITIM_KISALTMA,
  YENIDEN_AKCE_PUAN,
  YENIDEN_AKCE_TABAN,
  YENIDEN_SURE_DK,
  agacGorunumu,
  beceriHizlandir,
  beceriIptal,
  beceriOgren,
  beceriYeniden,
  mesleki,
  ogrenmeTamamla,
  seviyeVer,
} from "../src/yerlesim/beceri.ts";
import { basariSay, gizliGorunur, hakAcik, sinerjiAcik } from "../src/yerlesim/beceri-etki.ts";
import { KADEME_HIZMET, beceriPuani, dugumAcikMi, dugumSeviyesi, hizmetEkle, kademeAtla, meslekSec } from "../src/yerlesim/meslek.ts";
import { ALET_OMRU, tarifYap } from "../src/yerlesim/tarif.ts";
import { TEMEL_CIKTI, USTA_IS_CIKTI, temelIsYap } from "../src/yerlesim/temel-is.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

const DK = 60_000;
const T0 = 1_800_000_000_000;
const yok = () => undefined;

function kisi(k: Kasaba, no = 1): Karakter {
  const c = oyuncuEkle(k, no, k.ay - 20 * 12);
  c.tk = 18;
  c.ta = k.ay;
  meslekSec(c, "demirci", k.ay);
  return c;
}
/** n puan kazandıran tecrübe (bar 6, 7, 8 …). */
const puanIcin = (n: number) => Array.from({ length: n }, (_, i) => 6 + i).reduce((a, b) => a + b, 0);
/** Öğren ve süresini doldur; yeni an döner. */
function ogret(c: Karakter, dugum: string, an: number): number {
  const r = beceriOgren(c, dugum.split(".")[0], dugum, an);
  assert.ok(r.ok, `${dugum}: ${JSON.stringify(r)}`);
  const son = r.deger.ogrenme.bitis;
  assert.ok(ogrenmeTamamla(c, son));
  return son;
}

test("öğrenme puanı ayırır, süre dolmadan açılmaz; bitişte tembel tamamlanır (sahte saat)", () => {
  const k = testKasabasi();
  const c = kisi(k);
  assert.deepEqual(beceriOgren(c, "demirci", "demirci.aletcilik", T0), { ok: false, hata: "puan_yok" }, "başlangıç puanı yok");
  hizmetEkle(c, "demirci", puanIcin(1));
  const r = beceriOgren(c, "demirci", "demirci.aletcilik", T0);
  assert.ok(r.ok);
  assert.equal(r.deger.ogrenme.bitis, T0 + 15 * DK);
  assert.equal(beceriPuani(c.ms!.s.demirci!, 1).kalan, 0, "puan ayrıldı");
  assert.equal(dugumSeviyesi(c, "demirci.aletcilik"), 0);
  assert.deepEqual(tarifYap(c, "nal", k.ay), { ok: false, hata: "dugum_kapali" });
  assert.equal(ogrenmeTamamla(c, T0 + 15 * DK - 1), null);
  assert.deepEqual(ogrenmeTamamla(c, T0 + 15 * DK), { tur: "ogrenme", meslek: "demirci", dugum: "demirci.aletcilik", seviye: 1 });
  assert.equal(c.bo, undefined);
  assert.equal(dugumSeviyesi(c, "demirci.aletcilik"), 1);
  c.ev = { cevher: 1, komur: 1 };
  assert.ok(tarifYap(c, "nal", k.ay).ok, "seviye 1 nal tarifini açar");
});

test("tek sıra: bütün meslekler için aynı anda tek öğrenme", () => {
  const k = testKasabasi();
  const c = kisi(k);
  hizmetEkle(c, "demirci", puanIcin(2));
  hizmetEkle(c, "ciftci", puanIcin(1));
  assert.ok(beceriOgren(c, "demirci", "demirci.aletcilik", T0).ok);
  assert.deepEqual(beceriOgren(c, "demirci", "demirci.temelDovme", T0), { ok: false, hata: "ogrenme_suruyor" });
  assert.deepEqual(beceriOgren(c, "ciftci", "ciftci.ekinBilgisi", T0 + DK), { ok: false, hata: "ogrenme_suruyor" });
  assert.ok(beceriOgren(c, "ciftci", "ciftci.ekinBilgisi", T0 + 15 * DK).ok, "önceki bitince sıradaki başlar");
  assert.equal(dugumSeviyesi(c, "demirci.aletcilik"), 1);
});

test("ön koşul, kademe şartı, seviye tavanı, geçersiz düğüm", () => {
  const k = testKasabasi();
  const c = kisi(k);
  hizmetEkle(c, "demirci", puanIcin(12));
  assert.deepEqual(beceriOgren(c, "demirci", "ciftci.ekinBilgisi", T0), { ok: false, hata: "dugum_gecersiz" });
  assert.deepEqual(beceriOgren(c, "korsan", "demirci.aletcilik", T0), { ok: false, hata: "meslek_gecersiz" });
  assert.deepEqual(beceriOgren(c, "demirci", "demirci.tarimAletleri", T0), { ok: false, hata: "kademe_kapali" });
  assert.ok(kademeAtla(c, "demirci", k.ay).ok);
  assert.deepEqual(beceriOgren(c, "demirci", "demirci.tarimAletleri", T0), { ok: false, hata: "on_kosul_eksik" });
  let an = T0;
  for (let i = 0; i < 3; i++) an = ogret(c, "demirci.aletcilik", an);
  assert.deepEqual(beceriOgren(c, "demirci", "demirci.aletcilik", an), { ok: false, hata: "seviye_tavan" });
  // Silah Dövme: Temel Dövme 1 + Aletçilik 3.
  assert.deepEqual(beceriOgren(c, "demirci", "demirci.silahDovme", an), { ok: false, hata: "on_kosul_eksik" });
  an = ogret(c, "demirci.temelDovme", an);
  const s = beceriOgren(c, "demirci", "demirci.silahDovme", an);
  assert.ok(s.ok);
  assert.equal(s.deger.ogrenme.bitis - an, 60 * DK, "kalfa 1. seviye 1 saat");
  assert.equal(s.deger.ogrenme.puan, 2);
});

test("iptal: puan iade, geçen süre kaybolur; öğrenme yoksa hata", () => {
  const k = testKasabasi();
  const c = kisi(k);
  hizmetEkle(c, "demirci", puanIcin(1));
  assert.deepEqual(beceriIptal(c, T0), { ok: false, hata: "ogrenme_yok" });
  beceriOgren(c, "demirci", "demirci.aletcilik", T0);
  const r = beceriIptal(c, T0 + 10 * DK);
  assert.deepEqual(r, { ok: true, deger: { iptal: { meslek: "demirci", dugum: "demirci.aletcilik", seviye: 1 }, iadePuan: 1 } });
  assert.equal(beceriPuani(c.ms!.s.demirci!).kalan, 1);
  const y = beceriOgren(c, "demirci", "demirci.aletcilik", T0 + 10 * DK);
  assert.ok(y.ok);
  assert.equal(y.deger.ogrenme.bitis, T0 + 25 * DK, "süre baştan işler");
});

test("hızlandırma: usta eğitimi kalan süreyi kısaltır (bir kez); Debdebe kapalı; geçersiz kaynak", () => {
  const k = testKasabasi();
  const c = kisi(k);
  hizmetEkle(c, "demirci", puanIcin(1));
  assert.deepEqual(beceriHizlandir(c, "egitim", T0, yok), { ok: false, hata: "ogrenme_yok" });
  beceriOgren(c, "demirci", "demirci.aletcilik", T0);
  assert.deepEqual(beceriHizlandir(c, "altin", T0, yok), { ok: false, hata: "kaynak_gecersiz" });
  assert.deepEqual(beceriHizlandir(c, "debdebe", T0, yok), { ok: false, hata: "hizlandirma_kapali" });
  assert.deepEqual(beceriHizlandir(c, "egitim", T0, yok), { ok: false, hata: "hizlandirma_yok" }, "ustası yok");
  const usta = () => ({ o: "o9", kademe: 2 as const });
  const r = beceriHizlandir(c, "egitim", T0, usta);
  assert.ok(r.ok);
  assert.equal(r.deger.kisaltmaMs, Math.floor(15 * DK * EGITIM_KISALTMA[2]!));
  assert.equal(c.bo?.e, T0 + 15 * DK - r.deger.kisaltmaMs);
  assert.deepEqual(beceriHizlandir(c, "egitim", T0, usta), { ok: false, hata: "hizlandirma_yok" }, "öğrenme başına bir kez");
  assert.equal(beceriPuani(c.ms!.s.demirci!, 1).kalan, 0, "puan şartı atlanmaz");
});

test("yeniden düzenleme: çırak kalır, kalfa+ sıfırlanır, puan iade, akçe hazineye, bekleme süresi", () => {
  const k = testKasabasi();
  const c = kisi(k);
  hizmetEkle(c, "demirci", puanIcin(12));
  kademeAtla(c, "demirci", k.ay);
  let an = T0;
  for (let i = 0; i < 3; i++) an = ogret(c, "demirci.aletcilik", an);
  an = ogret(c, "demirci.tarimAletleri", an);
  const hazine = { hz: 0 };
  c.pa = 0;
  assert.deepEqual(beceriYeniden(c, "demirci", an, hazine), { ok: false, hata: "para_yok" });
  c.pa = 100;
  const once = beceriPuani(c.ms!.s.demirci!).kalan;
  const r = beceriYeniden(c, "demirci", an, hazine);
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual(r.deger.sifirlanan, [{ dugum: "demirci.tarimAletleri", seviye: 1 }]);
  assert.equal(r.deger.iadePuan, 2);
  const bedel = YENIDEN_AKCE_TABAN + YENIDEN_AKCE_PUAN * 2;
  assert.equal(r.deger.bedel.toplam, bedel);
  assert.equal(c.pa + hazine.hz, 100, "toplam akçe korunur");
  assert.equal(dugumSeviyesi(c, "demirci.aletcilik"), 3, "çırak düğümü silinmez");
  assert.equal(dugumSeviyesi(c, "demirci.tarimAletleri"), 0);
  assert.equal(beceriPuani(c.ms!.s.demirci!).kalan, once + 2);
  assert.deepEqual(beceriOgren(c, "demirci", "demirci.temelDovme", an), { ok: false, hata: "ogrenme_suruyor" }, "bekleme sürer");
  assert.deepEqual(beceriIptal(c, an), { ok: false, hata: "ogrenme_yok" }, "bekleme iptal edilmez");
  assert.ok(beceriOgren(c, "demirci", "demirci.temelDovme", an + YENIDEN_SURE_DK * DK).ok);
  ogrenmeTamamla(c, an + YENIDEN_SURE_DK * DK + 15 * DK);
  assert.deepEqual(beceriYeniden(c, "demirci", an + 2 * YENIDEN_SURE_DK * DK, hazine), { ok: false, hata: "yeniden_bos" }, "yalnız çırak varsa");
});

test("Tam Özgürlük: meslek değişince hiçbir beceri kaybolmaz, eski meslek becerisi kullanılır, tecrübe faaliyete", () => {
  const k = testKasabasi();
  const c = kisi(k);
  seviyeVer(c, "demirci.aletcilik", 2);
  assert.ok(meslekSec(c, "ciftci", k.ay + 12).ok);
  assert.ok(dugumAcikMi(c, "demirci.aletcilik", 2));
  c.ev = { cevher: 2, komur: 1, kereste: 1 };
  const r = tarifYap(c, "alet", k.ay + 12);
  assert.ok(r.ok, "çiftçi demirci becerisiyle alet döver");
  assert.equal(c.ms!.s.demirci!.hz, r.deger.hizmet, "tecrübe demirciliğe");
  assert.equal(c.ms!.s.ciftci!.hz, 0);
  // Çiftçi ağacında öğrenmek için çiftçi puanı gerekir (puan aktarılmaz).
  assert.deepEqual(beceriOgren(c, "ciftci", "ciftci.ekinBilgisi", T0), { ok: false, hata: "puan_yok" });
  const g = agacGorunumu(c, undefined, T0);
  assert.ok(g.ok && g.deger.meslek === "ciftci" && g.deger.aktif, "varsayılan ağaç aktif meslek");
  assert.equal(mesleki(c, T0).toplamBeceri, 1);
});

test("demirci etkileri: Aletçilik 2 alet tarifini açar, 3 alet ömrünü uzatır; Temel Dövme 3 onarımı artırır", () => {
  const k = testKasabasi();
  const c = kisi(k);
  seviyeVer(c, "demirci.aletcilik", 1);
  c.ev = { cevher: 9, komur: 9, kereste: 9 };
  assert.deepEqual(tarifYap(c, "alet", k.ay), { ok: false, hata: "dugum_kapali" });
  seviyeVer(c, "demirci.aletcilik", 2);
  assert.ok(tarifYap(c, "alet", k.ay).ok);
  // Ömür: seviye 3 ile alet ALET_OMRU + 1 kullanımda tükenir.
  seviyeVer(c, "ciftci.ekinBilgisi", 1);
  c.tk = 18;
  for (let i = 1; i <= ALET_OMRU; i++) {
    const t = tarifYap(c, "hasat", k.ay + i);
    assert.ok(t.ok);
    if (i === ALET_OMRU) assert.equal(t.deger.arac?.asindi, true, "seviye 2'de taban ömür");
  }
  seviyeVer(c, "demirci.aletcilik", 3);
  c.ev.alet = 1;
  for (let i = 1; i <= ALET_OMRU + 1; i++) {
    const t = tarifYap(c, "hasat", k.ay + 10 + i);
    assert.ok(t.ok);
    assert.equal(t.deger.arac?.omur, ALET_OMRU + 1);
    assert.equal(t.deger.arac?.asindi, i === ALET_OMRU + 1);
  }
  // Onarım: Temel Dövme 3 → onarım bir kullanım fazla düşürür.
  const d = kisi(k, 2);
  d.ev = { alet: 1 };
  d.as = { alet: 3 };
  const o1 = temelIsYap(d, "onarim", () => 0, k.ay);
  assert.ok(o1.ok && o1.deger.adet === 2);
  const e = kisi(k, 3);
  seviyeVer(e, "demirci.temelDovme", 3);
  e.ev = { alet: 1 };
  e.as = { alet: 3 };
  const o2 = temelIsYap(e, "onarim", () => 0, k.ay);
  assert.ok(o2.ok && o2.deger.adet === 3);
});

test("çiftçi etkileri: hasat Ekin Bilgisi 2 ile +1; saban (alet) ve Tarım Aletleri ile aletli hasat %20 artar", () => {
  const k = testKasabasi();
  const c = kisi(k);
  seviyeVer(c, "ciftci.ekinBilgisi", 1);
  c.tk = 18;
  const a = tarifYap(c, "hasat", k.ay);
  assert.ok(a.ok && a.deger.cikti.adet === 3);
  seviyeVer(c, "ciftci.ekinBilgisi", 2);
  const b = tarifYap(c, "hasat", k.ay + 1);
  assert.ok(b.ok && b.deger.cikti.adet === 4, "aletsiz +1");
  c.ev = { alet: 1 };
  const d = tarifYap(c, "hasat", k.ay + 2);
  assert.ok(d.ok && d.deger.cikti.adet === 6, "aletle 5 + 1");
  seviyeVer(c, "ciftci.sabanSurumu", 2);
  const e = tarifYap(c, "hasat", k.ay + 3);
  assert.ok(e.ok && e.deger.cikti.adet === 7, "aletle (5+1) × 1,2 = 7");
  seviyeVer(c, "demirci.tarimAletleri", 3);
  const f = tarifYap(c, "hasat", k.ay + 4);
  assert.ok(f.ok && f.deger.cikti.adet === 8, "iki yüzde toplanır: 6 × 1,4 = 8");
  // Hayvancılık 2: ince yün usta işi; 3: kırkım +1.
  assert.deepEqual(temelIsYap(c, "inceYun", () => 0, k.ay), { ok: false, hata: "dugum_kapali" });
  seviyeVer(c, "ciftci.hayvancilik", 3);
  assert.ok(temelIsYap(c, "inceYun", () => 0, k.ay).ok);
  const kr = tarifYap(c, "kirkim", k.ay + 5);
  assert.ok(kr.ok && kr.deger.cikti.adet === 3);
});

test("oduncu etkileri: balta 2 sert odun işini açar, 3 odun +1; kazma 3 aletle cevher +1 ve alet aşınır", () => {
  const k = testKasabasi();
  const c = kisi(k);
  seviyeVer(c, "oduncu.baltacilik", 1);
  assert.deepEqual(temelIsYap(c, "sertOdun", () => 0, k.ay), { ok: false, hata: "dugum_kapali" });
  seviyeVer(c, "oduncu.baltacilik", 3);
  assert.ok(temelIsYap(c, "sertOdun", () => 0, k.ay).ok);
  const o = temelIsYap(c, "odun", () => 0, k.ay);
  assert.ok(o.ok && o.deger.adet === TEMEL_CIKTI + 1);
  seviyeVer(c, "oduncu.madencilik", 2);
  const a = temelIsYap(c, "cevher", () => 0, k.ay);
  assert.ok(a.ok && a.deger.adet === USTA_IS_CIKTI && a.deger.arac === undefined);
  seviyeVer(c, "oduncu.madencilik", 3);
  c.ev = { ...c.ev, alet: 1 };
  const b = temelIsYap(c, "cevher", () => 0, k.ay + 10);
  assert.ok(b.ok, JSON.stringify(b));
  assert.equal(b.deger.adet, USTA_IS_CIKTI + 1, "kazma (alet) ile +1");
  assert.equal(b.deger.arac?.kullanim, 1, "alet aşındı");
  assert.equal(c.as?.alet, 1);
});

test("gizli düğüm: başarı sayacıyla görünür; görünmeden öğrenilemez", () => {
  const k = testKasabasi();
  const c = kisi(k);
  const d = beceriDugumu("ciftci.kadimTohum")!;
  assert.equal(gizliGorunur(c, d), false);
  const g = agacGorunumu(c, "ciftci", T0);
  assert.ok(g.ok);
  const gizli = g.deger.dugumler.find((x) => x.id === d.id)!;
  assert.equal(gizli.durum, "gizli");
  assert.equal("ad" in gizli, false, "gizli düğümün adı ve etkisi görünmez");
  assert.deepEqual(beceriOgren(c, "ciftci", d.id, T0), { ok: false, hata: "dugum_gizli" });
  basariSay(c, "tarif:hasat", d.gizli!.sayac!.esik);
  assert.equal(gizliGorunur(c, d), true);
});

test("unvan: gerçek iş sayacından kalıcı ve tek sefer (20 alet → Usta Alet Dövücü)", () => {
  const k = testKasabasi();
  const c = kisi(k);
  assert.deepEqual(basariSay(c, "tarif:alet", 19), []);
  assert.deepEqual(basariSay(c, "tarif:alet", 1), ["demirci.aletUstasi"]);
  assert.deepEqual(basariSay(c, "tarif:alet", 5), [], "tek sefer");
  assert.deepEqual(basariSay(c, "sat:akce", 0), []);
  seviyeVer(c, "demirci.aletcilik", 2);
  c.ev = { cevher: 2, komur: 1, kereste: 1 };
  tarifYap(c, "alet", k.ay);
  assert.equal(c.bs?.["tarif:alet"], 26, "tarif sayacı üretimle artar");
  assert.deepEqual(mesleki(c, T0).unvanlar, [{ id: "demirci.aletUstasi", meslek: "demirci" }]);
});

test("ağaç görünümü: kilit nedenleri, öğreniliyor durumu, puan ve sonraki seviye", () => {
  const k = testKasabasi();
  const c = kisi(k);
  hizmetEkle(c, "demirci", puanIcin(2));
  beceriOgren(c, "demirci", "demirci.aletcilik", T0);
  const g = agacGorunumu(c, "demirci", T0 + 5 * DK);
  assert.ok(g.ok);
  const v = g.deger;
  assert.equal(v.dugumler.length, 14);
  assert.equal(v.puan.kalan, 1);
  assert.equal(v.ogrenme?.kalanMs, 10 * DK);
  const al = v.dugumler.find((x) => x.id === "demirci.aletcilik")!;
  assert.equal(al.durum, "ogreniliyor");
  const ta = v.dugumler.find((x) => x.id === "demirci.tarimAletleri")!;
  assert.deepEqual(ta.kilit, ["ogrenme_suruyor", "kademe", "on_kosul", "puan"]);
  assert.equal(ta.durum, "kilitli");
  assert.ok("sonraki" in ta);
  assert.deepEqual(ta.sonraki, { seviye: 1, bedel: 2, sureMs: 60 * DK, metin: "onl.ba.demirci.tarimAletleri.s1" });
  assert.ok("seviyeler" in ta && ta.seviyeler[2]!.etkiler[0]!.kanca === false, "hasat %20 bağlı");
  assert.ok("seviyeler" in ta && ta.seviyeler[0]!.etkiler[0]!.kanca === true, "saban tarifi kanca");
  hizmetEkle(c, "demirci", KADEME_HIZMET[1]!);
  assert.deepEqual(agacGorunumu(c, "korsan", T0), { ok: false, hata: "meslek_gecersiz" });
});


test("hak çözümleyicisi yalnız öğrenilmiş beceri etkisini açar", () => {
  const k = testKasabasi();
  const c = kisi(k);
  assert.equal(hakAcik(c, "yasliHane"), false);
  seviyeVer(c, "ozan.teselli", 2);
  assert.equal(hakAcik(c, "yasliHane"), false, "hak düğümün üçüncü seviyesinde");
  seviyeVer(c, "ozan.teselli", 3);
  assert.equal(hakAcik(c, "yasliHane"), true);
  assert.equal(hakAcik(c, "olmayanHak"), false);
});

test("sinerji çözümleyicisi iki meslekteki gerçek düğüm seviyesini birlikte ister", () => {
  const k = testKasabasi();
  const c = kisi(k);
  seviyeVer(c, "hanci.temizOda", 3);
  assert.equal(sinerjiAcik(c, "seckinOda"), false, "marangoz düğümü olmadan açılmaz");
  seviyeVer(c, "marangoz.kundekari", 1);
  assert.equal(sinerjiAcik(c, "seckinOda"), true);
  assert.equal(sinerjiAcik(c, "olmayanSinerji"), false);
});


test("ahsapKopru hakkı marangoz köprücülük ve demirci gelişmiş aletler birlikteyken açılır", () => {
  const k = testKasabasi();
  const c = kisi(k);
  seviyeVer(c, "marangoz.koprucu", 1);
  assert.equal(hakAcik(c, "ahsapKopru"), false, "köprücülük hakkı tek başına yetmez");
  seviyeVer(c, "demirci.gelismisAletler", 1);
  assert.equal(hakAcik(c, "ahsapKopru"), false, "demirci ikinci seviye gerekir");
  seviyeVer(c, "demirci.gelismisAletler", 2);
  assert.equal(sinerjiAcik(c, "kopruDemiri"), true);
  assert.equal(hakAcik(c, "ahsapKopru"), true);
  const diger = kisi(k, 2);
  seviyeVer(diger, "demirci.gelismisAletler", 2);
  assert.equal(hakAcik(diger, "ahsapKopru"), false, "marangoz köprücülük olmadan açılmaz");
});
