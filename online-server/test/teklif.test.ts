// Oyuncular arası teklifler (Faz 3a, saf): yaşam döngüsü ve süre dolumu, emanet iadesi, hediye/borç tavanları,
// karşılıklı döngü, engel, çıraklık (aylık tecrübe + pir sayacı), ortaklık payı ve olağan düzenin yokken uygulanması.
import test from "node:test";
import { MALLAR } from "../src/icerik/mallar.ts";
import assert from "node:assert/strict";
import { duzenGuncelle } from "../src/yerlesim/duzen.ts";
import { engelle, engelliMi } from "../src/yerlesim/engel.ts";
import { meslekSec } from "../src/yerlesim/meslek.ts";
import {
  BORC_TOPLAM_EN_COK,
  CIRAKLIK_EN_AZ_AY,
  HEDIYE_ALMA_AYLIK,
  HEDIYE_VERME_AYLIK,
  TEKLIF_SURE_AY,
  ortakPayi,
  taraflarArasiIptal,
  teklifCevap,
  teklifDonumu,
  teklifGorunumu,
  teklifOlustur,
  teklifTaraflari,
  tedarikZinciriMi,
} from "../src/yerlesim/teklif.ts";
import { toplumAl } from "../src/yerlesim/toplum.ts";
import { ucgenAl } from "../src/yerlesim/bilgi.ts";
import { arabulucuYap } from "../src/yerlesim/arabulucu.ts";
import { baglam, dostYap, gorusAyarla, senaryo } from "./ucgen-yardimci.ts";
import { gostergeOku } from "../src/yerlesim/topluluk-kayit.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

/** 13 yaşını doldurmuş iki oyuncu, ayrı ocaklarda. */
function kur(): { k: Kasaba; a: Karakter; b: Karakter } {
  const k = testKasabasi("develi", 200);
  const a = oyuncuEkle(k, 1, k.ay - 13 * 12 - 2);
  const b = oyuncuEkle(k, 2, k.ay - 13 * 12 - 2);
  if (a.e === b.e) b.e = a.e + 1000;
  a.pa = 100;
  b.pa = 100;
  return { k, a, b };
}

/** Süreyi doldurur: TEKLIF_SURE_AY dönüm. */
function bekle(k: Kasaba, ay: number): void {
  for (let i = 0; i < ay; i++) {
    k.ay += 1;
    teklifDonumu(k, k.ay);
  }
}


function hizmetciKur(k: Kasaba, id: number, meslek: "arabulucu" | "asker" | "katip", dugum: string, seviye = 1): Karakter {
  const kar = oyuncuEkle(k, id, k.ay - 13 * 12 - 2);
  kar.h = "hizmetci-hesap-" + id;
  kar.pa = 100;
  kar.ms = {
    a: meslek,
    y: "",
    s: {
      [meslek]: {
        a: meslek,
        kd: 0,
        hz: 0,
        cy: 0,
        sv: { [`${meslek}.${dugum}`]: seviye },
      },
    },
  } as unknown as NonNullable<Karakter["ms"]>;
  return kar;
}

function arabulucuBeceri(kar: Karakter): void {
  kar.ms = {
    a: "arabulucu",
    y: "",
    s: { arabulucu: { a: "arabulucu", kd: 0, hz: 0, cy: 0, sv: { "arabulucu.araBulma": 1 } } },
  } as unknown as NonNullable<Karakter["ms"]>;
}

test("teklif arabuluculuğu gerçek NPC uzlaşmasını çalıştırır, ücreti ve tazminatı ayrı emanet yönetir", () => {
  const { k, berkay, hasan, murat } = senaryo("kurnaz", -42, 35);
  dostYap(k, berkay.o, hasan.o);
  arabulucuBeceri(hasan);
  berkay.pa = 50;
  hasan.pa = 100;
  const once = teklifOlustur(k, berkay, hasan, {
    tur: "is", is: "arabuluculuk", tutar: 5,
    arabuluculukNpc: `n${murat.i}`, arabuluculukBedel: "tazminat", arabuluculukMiktar: 7,
  }, k.ay);
  assert.ok(once.ok, JSON.stringify(once));
  const t = once.deger.teklif;
  assert.equal(berkay.pa, 38, "iş ücreti + tazminat birlikte rezerve edilir");
  assert.equal(t.e, 12);
  assert.ok(teklifCevap(k, hasan, `t${t.i}`, "kabul", {}, k.ay).ok);
  assert.equal(t.d, "surer");
  assert.equal(t.e, 5, "tazminat ayrı arabuluculuk talebine aktarıldı");
  assert.ok(t.s.ta !== undefined);
  const talep = ucgenAl(k).at.find((x) => x.i === t.s.ta)!;
  assert.equal(talep.teklif, t.i);
  assert.equal(talep.m, 7);
  assert.deepEqual(arabulucuYap(baglam(k, hasan), { talep: talep.i }, () => 0), { ok: false, hata: "talep_yok" }, "üçgen ucundan sözleşme atlanamaz");
  const teslim = teklifCevap(k, hasan, `t${t.i}`, "teslim", {}, k.ay);
  assert.ok(teslim.ok, JSON.stringify(teslim));
  assert.equal(t.d, "bitti");
  assert.equal(t.e, 0);
  assert.equal(t.sn?.startsWith("arabuluculuk_"), true);
  assert.equal(hasan.pa, 105, "yalnız iş ücreti arabulucuya ödenir");
  assert.ok(["bitti", "ret"].includes(talep.d), "gerçek NPC arabuluculuk talebi sonuçlandı");
  assert.deepEqual(teklifCevap(k, hasan, `t${t.i}`, "teslim", {}, k.ay), { ok: false, hata: "teklif_kapandi" });
});

test("ücretli arabuluculuk sözleşmesi iptalinde hem hizmet ücreti hem NPC tazminatı iade edilir", () => {
  const { k, berkay, hasan, murat } = senaryo("kurnaz", -42, 35);
  dostYap(k, berkay.o, hasan.o);
  arabulucuBeceri(hasan);
  berkay.pa = 50;
  hasan.pa = 100;
  const ac = teklifOlustur(k, berkay, hasan, {
    tur: "is", is: "arabuluculuk", tutar: 5,
    arabuluculukNpc: `n${murat.i}`, arabuluculukBedel: "tazminat", arabuluculukMiktar: 7,
  }, k.ay);
  assert.ok(ac.ok, JSON.stringify(ac));
  const t = ac.deger.teklif;
  assert.ok(teklifCevap(k, hasan, `t${t.i}`, "kabul", {}, k.ay).ok);
  const talep = ucgenAl(k).at.find((x) => x.i === t.s.ta)!;
  assert.equal(berkay.pa, 38);
  assert.ok(teklifCevap(k, hasan, `t${t.i}`, "bitir", {}, k.ay).ok);
  assert.equal(t.d, "iptal");
  assert.equal(t.e, 0);
  assert.equal(talep.d, "geri");
  assert.equal(talep.m, 0);
  assert.equal(berkay.pa, 50, "tazminat ve iş ücreti tam iade");
  assert.equal(hasan.pa, 100, "iptalde arabulucu ücret alamaz");
});

test("arabuluculuk işi dostluk ve gerçek NPC kırgınlığı olmadan teklif edilemez", () => {
  const { k, berkay, hasan, murat } = senaryo("kurnaz", -42, 35);
  arabulucuBeceri(hasan);
  assert.deepEqual(teklifOlustur(k, berkay, hasan, {
    tur: "is", is: "arabuluculuk", tutar: 5,
    arabuluculukNpc: `n${murat.i}`, arabuluculukBedel: "ozur",
  }, k.ay), { ok: false, hata: "dost_degil" });
  dostYap(k, berkay.o, hasan.o);
  // NPC'ye karşı kırgınlık yoksa teklif yine sunucu tarafından reddedilir.
  gorusAyarla(k, murat, berkay, 0);
  assert.deepEqual(teklifOlustur(k, berkay, hasan, {
    tur: "is", is: "arabuluculuk", tutar: 5,
    arabuluculukNpc: `n${murat.i}`, arabuluculukBedel: "ozur",
  }, k.ay), { ok: false, hata: "kirgin_degil" });
});

test("eski NPC hedefsiz arabuluculuk teklifleri kabul/teslimde emanet kilitlemeden kapanır", () => {
  const { k, a, b } = kur();
  const eski = (i: number, durum: "acik" | "surer") => ({
    i, t: "is" as const, g: a.o, a: b.o, s: { it: "arabuluculuk" as const, tu: 8 },
    e: 8, ac: k.ay, sa: k.ay + 1, v: "dustu" as const, d: durum,
    ...(durum === "surer" ? { ka: k.ay } : {}),
  });
  a.pa = 84;
  const acik = eski(9001, "acik");
  toplumAl(k).tk.push(acik as unknown as import("../src/yerlesim/toplum.ts").Teklif);
  assert.ok(teklifCevap(k, b, "t9001", "kabul", {}, k.ay).ok);
  assert.equal(acik.d, "dustu");
  assert.equal(a.pa, 92);
  assert.equal(acik.e, 0);

  const suren = eski(9002, "surer");
  toplumAl(k).tk.push(suren as unknown as import("../src/yerlesim/toplum.ts").Teklif);
  a.pa = 84;
  assert.ok(teklifCevap(k, b, "t9002", "teslim", {}, k.ay).ok);
  assert.equal(suren.d, "iptal");
  assert.equal(a.pa, 92);
  assert.equal(suren.e, 0);
});

test("teklif yaşam döngüsü: hediye emaneti kilitlenir, cevapsız kalınca cezasız düşer ve emanet döner", () => {
  const { k, a, b } = kur();
  const r = teklifOlustur(k, a, b, { tur: "hediye", tutar: 5 }, k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  const t = r.deger.teklif;
  assert.equal(t.e, 5);
  assert.equal(t.v, "dustu");
  assert.equal(a.pa, 95);
  assert.equal(t.sa, k.ay + TEKLIF_SURE_AY - 1);
  bekle(k, TEKLIF_SURE_AY - 1);
  assert.equal(t.d, "acik", "son cevap ayı dahil açık kalır");
  bekle(k, 1);
  assert.equal(t.d, "dustu");
  assert.equal(a.pa, 100, "emanet iade");
  assert.equal(b.pa, 100, "alıcıya ceza yok");
  // Kapanmış teklif cevaplanamaz.
  assert.deepEqual(teklifCevap(k, b, `t${t.i}`, "kabul", {}, k.ay), { ok: false, hata: "teklif_kapandi" });
});

test("ret ve geri çekme emaneti iade eder; taraf olmayan teklifi göremez; kendine teklif yok", () => {
  const { k, a, b } = kur();
  const c = oyuncuEkle(k, 3, k.ay - 13 * 12 - 2);
  assert.deepEqual(teklifOlustur(k, a, a, { tur: "hediye", tutar: 1 }, k.ay), { ok: false, hata: "kendine" });
  const t1 = teklifOlustur(k, a, b, { tur: "borc", yon: "ver", tutar: 20, vade: 3 }, k.ay);
  assert.ok(t1.ok);
  assert.equal(a.pa, 80);
  assert.deepEqual(teklifCevap(k, c, `t${t1.deger.teklif.i}`, "ret", {}, k.ay), { ok: false, hata: "teklif_yok" });
  assert.deepEqual(teklifCevap(k, a, `t${t1.deger.teklif.i}`, "kabul", {}, k.ay), { ok: false, hata: "taraf_degil" });
  assert.ok(teklifCevap(k, b, `t${t1.deger.teklif.i}`, "ret", {}, k.ay).ok);
  assert.equal(a.pa, 100);
  const t2 = teklifOlustur(k, a, b, { tur: "hediye", tutar: 3 }, k.ay);
  assert.ok(t2.ok);
  assert.ok(teklifCevap(k, a, `t${t2.deger.teklif.i}`, "geri", {}, k.ay).ok);
  assert.equal(a.pa, 100);
  assert.equal(t2.deger.teklif.d, "geri");
});

test("armağan: mal envanterden alana geçer, yapan izi yazılır, alıcı ve verici aylık tavanı, karşılıklı döngü yok", () => {
  const { k, a, b } = kur();
  a.ev = { nal: 4 };
  a.ur = { nal: 2 };
  const m = teklifOlustur(k, a, b, { tur: "hediye", mal: "nal", adet: 2 }, k.ay);
  assert.ok(m.ok, JSON.stringify(m));
  assert.equal(m.deger.teklif.s.yp, a.o, "kendi ürettiği nal");
  assert.deepEqual(a.ev, { nal: 2 });
  assert.ok(teklifCevap(k, b, `t${m.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  assert.deepEqual(b.ev, { nal: 2 });
  assert.equal(b.av?.[0]?.yp, a.o);
  // Döngü: b hemen a'ya armağan veremez.
  assert.deepEqual(teklifOlustur(k, b, a, { tur: "hediye", tutar: 1 }, k.ay), { ok: false, hata: "hediye_dongu" });
  // Verme tavanı: nal değeri taban × 2 bu ay sayıldı; tavanı aşan reddedilir.
  assert.equal(a.hv?.[1], MALLAR.nal.taban * 2);
  const c = oyuncuEkle(k, 3, k.ay - 13 * 12 - 2);
  c.e = 999;
  a.hv = [k.ay, HEDIYE_VERME_AYLIK - 1];
  assert.deepEqual(teklifOlustur(k, a, c, { tur: "hediye", tutar: 2 }, k.ay), { ok: false, hata: "tavan_doldu" });
  assert.ok(teklifOlustur(k, a, c, { tur: "hediye", tutar: 1 }, k.ay).ok);
  // Alma tavanı: birçok verenden aynı ay en çok HEDIYE_ALMA_AYLIK (veren başına sınır yok, alanın toplamı sınırlı).
  const d = oyuncuEkle(k, 4, k.ay - 13 * 12 - 2);
  d.e = 998;
  let alinan = 0;
  let red = 0;
  for (let i = 10; i < 16; i++) {
    const v = oyuncuEkle(k, i, k.ay - 13 * 12 - 2);
    v.pa = 50;
    v.e = 5000 + i;
    const t = teklifOlustur(k, v, d, { tur: "hediye", tutar: 20 }, k.ay);
    assert.ok(t.ok);
    const r = teklifCevap(k, d, `t${t.deger.teklif.i}`, "kabul", {}, k.ay);
    if (r.ok) alinan += 20;
    else red++;
  }
  assert.ok(red > 0);
  assert.ok(alinan <= HEDIYE_ALMA_AYLIK);
});

test("hediye: aynı kişiye tekrarlanan armağanın cömertlik namı azalır; aynı ocakta nam yok ve tavana iki kat sayılır", () => {
  const { k, a, b } = kur();
  const namlar: number[] = [];
  for (let i = 0; i < 4; i++) {
    const once = a.nm[0]!;
    a.hg = { ...(a.hg ?? {}) };
    const t = teklifOlustur(k, a, b, { tur: "hediye", tutar: 1 }, k.ay);
    assert.ok(t.ok, JSON.stringify(t));
    assert.ok(teklifCevap(k, b, `t${t.deger.teklif.i}`, "kabul", {}, k.ay).ok);
    namlar.push(a.nm[0]! - once);
    k.ay += 1;
    b.hg = {};
  }
  assert.ok(namlar[0]! > namlar[3]!, `azalan getiri: ${namlar}`);
  const c = oyuncuEkle(k, 3, k.ay - 13 * 12 - 2);
  c.e = a.e;
  const once = a.nm[0]!;
  a.hv = [k.ay, HEDIYE_VERME_AYLIK - 15];
  assert.deepEqual(teklifOlustur(k, a, c, { tur: "hediye", tutar: 8 }, k.ay), { ok: false, hata: "tavan_doldu" }, "8 × 2 > 15");
  a.hv = undefined;
  const t = teklifOlustur(k, a, c, { tur: "hediye", tutar: 7 }, k.ay);
  assert.ok(t.ok);
  assert.equal(a.hv?.[1], 14, "aynı ocak: tavana iki kat");
  assert.ok(teklifCevap(k, c, `t${t.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  assert.equal(a.nm[0], once);
});

test("borç: tutar ve borçlu toplam tavanı; vadede tahsilat, eksik kalırsa kayıtlı kalır ve tek söylenti düşer", () => {
  const { k, a, b } = kur();
  assert.deepEqual(teklifOlustur(k, a, b, { tur: "borc", tutar: 51, vade: 2 }, k.ay), { ok: false, hata: "teklif_gecersiz" });
  const t = teklifOlustur(k, a, b, { tur: "borc", yon: "ver", tutar: 50, vade: 2, faiz: 10 }, k.ay);
  assert.ok(t.ok);
  assert.ok(teklifCevap(k, b, `t${t.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  assert.equal(b.pa, 150);
  assert.equal(t.deger.teklif.kl, 55);
  // Toplam borç tavanı: 55 + 6 > 60.
  const c = oyuncuEkle(k, 3, k.ay - 13 * 12 - 2);
  c.pa = 100;
  const t2 = teklifOlustur(k, c, b, { tur: "borc", tutar: 6, vade: 2 }, k.ay);
  assert.ok(t2.ok);
  assert.deepEqual(teklifCevap(k, b, `t${t2.deger.teklif.i}`, "kabul", {}, k.ay), { ok: false, hata: "tavan_doldu" });
  assert.ok(55 + 6 > BORC_TOPLAM_EN_COK);
  b.pa = 30; // harcadı
  bekle(k, 2);
  assert.equal(b.pa, 0);
  assert.equal(a.pa, 50 + 30);
  assert.equal(t.deger.teklif.kl, 25);
  assert.deepEqual(t.deger.teklif.bo, [[k.ay, 30]], "vade günündeki tahsilat senede yazılır");
  assert.equal(t.deger.teklif.d, "surer", "uyku borcu silmez");
  assert.equal(t.deger.teklif.od, 1);
  const sy = k.tp!.sy.filter((s) => s.t === "borcOdenmedi");
  assert.ok(sy.length <= 1);
  b.pa = 40;
  bekle(k, 1);
  assert.equal(t.deger.teklif.d, "bitti");
  assert.deepEqual(t.deger.teklif.bo, [[k.ay - 1, 30], [k.ay, 25]], "ikinci tahsilat da senet dökümüne eklenir");
  assert.deepEqual(teklifGorunumu(k, t.deger.teklif, a.o, "tr").odemeler, [[k.ay - 1, 30], [k.ay, 25]], "senet tahsilatları API görünümüne çıkar");
  const kapananSenet = teklifGorunumu(k, t.deger.teklif, a.o, "tr");
  assert.equal(kapananSenet.kalan, 0, "kapanmış senet sıfır bakiyeyi korur");
  assert.equal(kapananSenet.vadeAyi, t.deger.teklif.vd, "kapanmış senet vade bilgisini korur");
  assert.equal(a.pa, 105, "anapara + faiz");
  assert.equal(b.pa, 15);
});

test("engel: engellenen teklif gönderemez; engellemede açık teklif iptal ve emanet iade", () => {
  const { k, a, b } = kur();
  const t = teklifOlustur(k, a, b, { tur: "hediye", tutar: 4 }, k.ay);
  assert.ok(t.ok);
  assert.ok(engelle(toplumAl(k), b.o, a.o).ok);
  taraflarArasiIptal(k, a.o, b.o, k.ay);
  assert.equal(t.deger.teklif.d, "iptal");
  assert.equal(a.pa, 100);
  assert.ok(engelliMi(k.tp, a.o, b.o) && engelliMi(k.tp, b.o, a.o));
  assert.deepEqual(teklifOlustur(k, a, b, { tur: "hediye", tutar: 1 }, k.ay), { ok: false, hata: "engelli" });
  assert.deepEqual(teklifOlustur(k, b, a, { tur: "hediye", tutar: 1 }, k.ay), { ok: false, hata: "engelli" });
});

test("çıraklık: usta ≥ kalfa; çırağa aylık tecrübe; çırak kalfa olunca ustanın pir sayacı bir kez artar", () => {
  const { k, a: u, b: c } = kur();
  assert.ok(meslekSec(u, "demirci", k.ay).ok);
  assert.deepEqual(teklifOlustur(k, u, c, { tur: "cirak", meslek: "demirci" }, k.ay), { ok: false, hata: "kademe_kapali" });
  u.ms!.s.demirci!.kd = 1;
  const t = teklifOlustur(k, u, c, { tur: "cirak", meslek: "demirci" }, k.ay);
  assert.ok(t.ok, JSON.stringify(t));
  assert.deepEqual(teklifCevap(k, c, `t${t.deger.teklif.i}`, "kabul", {}, k.ay), { ok: false, hata: "meslek_yok" });
  assert.ok(meslekSec(c, "demirci", k.ay).ok);
  assert.ok(teklifCevap(k, c, `t${t.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  assert.equal(t.deger.teklif.d, "surer");
  bekle(k, 3);
  assert.equal(c.ms!.s.demirci!.hz, 3, "aylık tecrübe bonusu");
  bekle(k, CIRAKLIK_EN_AZ_AY - 3);
  c.ms!.s.demirci!.kd = 1; // çırak kalfa oldu
  bekle(k, 1);
  assert.equal(t.deger.teklif.d, "bitti");
  assert.equal(t.deger.teklif.sn, "kalfa");
  assert.equal(u.ms!.s.demirci!.cy, 1);
  // Aynı çırak ikinci kez sayılmaz (tek sefer izi).
  assert.deepEqual(u.cs, [`${c.o}:demirci`]);
});

test("ortaklık: tedarik zinciri şartı; gelir payı ortağa aktarılır, aylık tavanlı, toplam akçe değişmez", () => {
  const { k, a, b } = kur();
  assert.ok(tedarikZinciriMi("demirci", "oduncu"));
  assert.ok(!tedarikZinciriMi("ozan", "demirci"));
  assert.ok(meslekSec(a, "demirci", k.ay).ok);
  assert.ok(meslekSec(b, "ozan", k.ay).ok);
  assert.deepEqual(teklifOlustur(k, a, b, { tur: "ortak", pay: 10, sure: 6 }, k.ay), { ok: false, hata: "teklif_gecersiz" });
  assert.ok(meslekSec(b, "oduncu", k.ay + 12).ok); // ana meslek yılda bir değişir
  const t = teklifOlustur(k, a, b, { tur: "ortak", pay: 20, sure: 6 }, k.ay);
  assert.ok(t.ok);
  assert.ok(teklifCevap(k, b, `t${t.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  const toplam = a.pa + b.pa;
  assert.deepEqual(ortakPayi(k, a, 50, k.ay), [{ ortak: b.o, akce: 10 }]);
  assert.deepEqual(ortakPayi(k, a, 100, k.ay), [{ ortak: b.o, akce: 10 }], "aylık tavan 20");
  assert.equal(a.pa + b.pa, toplam);
  bekle(k, 6);
  assert.equal(t.deger.teklif.d, "bitti");
});

test("olağan düzen: alıcı yokken varsayılan cevap uygulanır; evlilik kancası kendiliğinden kabul edilmez", () => {
  const { k, a, b } = kur();
  assert.ok(duzenGuncelle(b, { gelen: { hediye: "kabul" }, borcCevap: "kabul", borcEnCok: 10 }).ok);
  assert.deepEqual(duzenGuncelle(b, { gelen: { gorucu: "kabul" } }), { ok: false, hata: "duzen_gecersiz" });
  const h = teklifOlustur(k, a, b, { tur: "hediye", tutar: 3 }, k.ay);
  const bi = teklifOlustur(k, a, b, { tur: "borc", yon: "iste", tutar: 8, vade: 4 }, k.ay);
  const bc = teklifOlustur(k, a, b, { tur: "gorucu" }, k.ay);
  assert.ok(h.ok && bi.ok && !bc.ok, "görücü 16+");
  assert.equal(h.deger.teklif.v, "kabul");
  assert.equal(bi.deger.teklif.v, "kabul");
  bekle(k, TEKLIF_SURE_AY);
  assert.equal(h.deger.teklif.d, "bitti");
  assert.equal(bi.deger.teklif.d, "surer");
  assert.equal(b.pa, 100 + 3 - 8);
  assert.equal(a.pa, 100 - 3 + 8);
  // Tutar düzendeki sınırı aşarsa cevapsız düşer.
  const buyuk = teklifOlustur(k, oyuncuEkle(k, 5, k.ay - 200), b, { tur: "borc", yon: "iste", tutar: 11, vade: 2 }, k.ay);
  assert.ok(buyuk.ok);
  assert.equal(buyuk.deger.teklif.v, "dustu");
});


function isBecerisi(kar: Karakter, meslek: "arabulucu" | "asker" | "katip", dugum: string, seviye = 1): void {
  kar.ms = { a: meslek, y: "", s: { [meslek]: { kd: 0, hz: 0, cy: 0, sv: { [dugum]: seviye } } } };
  kar.tk = 18;
  kar.ta = 200;
}

test("iki taraflı mektup işi: emanet, açık rıza, beceri kapısı, teslim ve tek ödeme", () => {
  const { k, a, b } = kur();
  a.h = "is-veren"; b.h = "is-yapan"; a.e = 101; b.e = 202;
  const hedef = oyuncuEkle(k, 3, k.ay - 13 * 12 - 2); hedef.e = 303;
  const ilkPara = a.pa;
  const teklif = teklifOlustur(k, a, b, { tur: "is", is: "mektup", tutar: 12, mektupHedef: hedef.o, mektupMetni: "Akşam hanın avlusunda buluşalım." }, k.ay);
  assert.ok(teklif.ok);
  if (!teklif.ok) return;
  const id = `t${teklif.deger.teklif.i}`;
  assert.equal(a.pa, ilkPara - 12);
  assert.equal(teklif.deger.teklif.e, 12);
  assert.equal(teklif.deger.teklif.v, "dustu", "iş sözleşmesi çevrimdışı otomatik kabul edilmez");
  assert.deepEqual(duzenGuncelle(b, { gelen: { is: "kabul" } }), { ok: false, hata: "duzen_gecersiz" });
  assert.deepEqual(teklifCevap(k, b, id, "kabul", {}, k.ay), { ok: false, hata: "dugum_kapali" });

  isBecerisi(b, "katip", "katip.koyMektubu");
  assert.ok(teklifCevap(k, b, id, "kabul", {}, k.ay).ok);
  assert.equal(teklif.deger.teklif.d, "surer");
  assert.equal(teklif.deger.teklif.sa, k.ay + 1);
  const onceMoral = gostergeOku(k, "moral");
  const oncePara = b.pa;
  assert.ok(teklifCevap(k, b, id, "teslim", {}, k.ay).ok);
  assert.equal(teklif.deger.teklif.d, "bitti");
  assert.equal(teklif.deger.teklif.e, 0);
  assert.equal(b.pa, oncePara + 12);
  assert.equal(a.pa, ilkPara - 12);
  assert.equal(b.tk, 17);
  assert.equal(gostergeOku(k, "moral"), onceMoral + 1);
  assert.equal(teklifCevap(k, b, id, "teslim", {}, k.ay).ok, false, "aynı sözleşme ikinci kez ödenmez");
});

test("iki taraflı muhafız işi: zincir zırhı olmadan teslim olmaz; teslimde asayiş ve ücret birlikte işlenir", () => {
  const { k, a, b } = kur();
  a.h = "muhafiz-veren"; b.h = "muhafiz-yapan"; a.e = 303; b.e = 404;
  const teklif = teklifOlustur(k, a, b, { tur: "is", is: "muhafiz", tutar: 8 }, k.ay);
  assert.ok(teklif.ok);
  if (!teklif.ok) return;
  const id = `t${teklif.deger.teklif.i}`;
  isBecerisi(b, "asker", "asker.kervanMuhafizligi", 2);
  b.ms!.s.asker!.kd = 2; // kervan muhafızlığı kalfa-2 düğümüdür.
  b.ms!.s.asker!.sv!["asker.kervanMuhafizligi"] = 2; // zincir aracı açılır.
  assert.ok(teklifCevap(k, b, id, "kabul", {}, k.ay).ok);
  assert.deepEqual(teklifCevap(k, b, id, "teslim", {}, k.ay), { ok: false, hata: "arac_yok" });
  b.ev = { zincir: 1 };
  const onceAsayis = gostergeOku(k, "asayis");
  const oncePara = b.pa;
  assert.ok(teklifCevap(k, b, id, "teslim", {}, k.ay).ok);
  assert.equal(b.pa, oncePara + 8);
  assert.equal(gostergeOku(k, "asayis"), onceAsayis + 1);
  assert.equal(b.as?.zincir, 1);
});

test("iki taraflı işler: aynı hesap/hane engeli, ret, iptal ve süre aşımında emanet iadesi", () => {
  const { k, a, b } = kur();
  a.h = "is-kume-a"; b.h = "is-kume-b"; a.e = 505; b.e = 606;
  const c = oyuncuEkle(k, 3, k.ay - 13 * 12 - 2); c.e = 707;
  const d = oyuncuEkle(k, 4, k.ay - 13 * 12 - 2); d.e = 708;
  const e = oyuncuEkle(k, 5, k.ay - 13 * 12 - 2); e.e = 709;
  const ilkPara = a.pa;
  const sart = (hedef: Karakter) => ({ tur: "is" as const, is: "mektup" as const, tutar: 5, mektupHedef: hedef.o, mektupMetni: "Mühürlü not." });
  const ayniHesap = teklifOlustur(k, a, { ...b, h: a.h }, sart(c), k.ay);
  assert.deepEqual(ayniHesap, { ok: false, hata: "ayni_kume" });
  const ayniHane = teklifOlustur(k, a, { ...b, e: a.e }, sart(c), k.ay);
  assert.deepEqual(ayniHane, { ok: false, hata: "ayni_kume" });

  const ret = teklifOlustur(k, a, b, sart(c), k.ay);
  assert.ok(ret.ok);
  if (!ret.ok) return;
  assert.ok(teklifCevap(k, b, `t${ret.deger.teklif.i}`, "ret", {}, k.ay).ok);
  assert.equal(a.pa, ilkPara);

  const iptal = teklifOlustur(k, a, b, { ...sart(d), tutar: 6 }, k.ay);
  assert.ok(iptal.ok);
  if (!iptal.ok) return;
  isBecerisi(b, "katip", "katip.koyMektubu");
  assert.ok(teklifCevap(k, b, `t${iptal.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  assert.ok(teklifCevap(k, a, `t${iptal.deger.teklif.i}`, "bitir", {}, k.ay).ok);
  assert.equal(iptal.deger.teklif.d, "iptal");
  assert.equal(a.pa, ilkPara);

  const dusen = teklifOlustur(k, a, b, { ...sart(e), tutar: 7 }, k.ay);
  assert.ok(dusen.ok, JSON.stringify(dusen));
  if (!dusen.ok) return;
  isBecerisi(b, "katip", "katip.koyMektubu");
  assert.ok(teklifCevap(k, b, `t${dusen.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  bekle(k, 2);
  assert.equal(dusen.deger.teklif.d, "dustu");
  assert.equal(a.pa, ilkPara);
});


test("E4.3-D muhafızlık işi: araç düğümü ve zincir gerekir; teslim zinciri aşındırıp asayişi yükseltir", () => {
  const { k, a } = kur();
  const b = hizmetciKur(k, 3, "asker", "kervanMuhafizligi", 2);
  b.pa = 0;
  b.ev = { zincir: 1 };
  const r = teklifOlustur(k, a, b, { tur: "is", is: "muhafiz", tutar: 7 }, k.ay);
  assert.ok(r.ok, JSON.stringify(r));
  const t = r.deger.teklif;
  assert.ok(teklifCevap(k, b, `t${t.i}`, "kabul", {}, k.ay).ok);
  assert.ok(teklifCevap(k, b, `t${t.i}`, "teslim", {}, k.ay).ok);
  assert.equal(gostergeOku(k, "asayis"), 51);
  assert.equal(b.as?.zincir, 1);
  assert.equal(b.pa, 7);

  const { k: k2, a: a2 } = kur();
  const eksik = hizmetciKur(k2, 3, "asker", "kervanMuhafizligi", 1);
  eksik.ev = { zincir: 1 };
  const r2 = teklifOlustur(k2, a2, eksik, { tur: "is", is: "muhafiz", tutar: 7 }, k2.ay);
  assert.ok(r2.ok);
  assert.ok(teklifCevap(k2, eksik, `t${r2.deger.teklif.i}`, "kabul", {}, k2.ay).ok, "hizmet yetkisiyle iş kabul edilebilir");
  assert.deepEqual(teklifCevap(k2, eksik, `t${r2.deger.teklif.i}`, "teslim", {}, k2.ay), { ok: false, hata: "arac_yok" }, "zincir aracı yeteneği olmadan teslim edilemez");
  assert.equal(r2.deger.teklif.d, "surer");
  assert.equal(a2.pa, 93, "teslim başarısızken emanet kilitli kalır");
});

test("E4.3-D mektup işi: kâtip mektubu üçüncü oyuncuya özel ulaştırır; süre aşımında emanet müşteriye döner", () => {
  const { k, a } = kur();
  const b = hizmetciKur(k, 3, "katip", "koyMektubu");
  const hedef = oyuncuEkle(k, 4, k.ay - 13 * 12 - 2);
  hedef.h = "mektup-hedef-316"; hedef.e = 400;
  b.pa = 0;
  const mesaj = "Yarın güneş doğarken hanın önünde buluşalım.";
  const r = teklifOlustur(k, a, b, {
    tur: "is", is: "mektup", tutar: 5, mektupHedef: hedef.o, mektupMetni: mesaj,
  }, k.ay);
  assert.ok(r.ok);
  const t = r.deger.teklif;
  assert.deepEqual(teklifTaraflari(t), [a.o, b.o, hedef.o]);
  const gorunum = teklifGorunumu(k, t, a.o, "tr");
  assert.equal(gorunum.sartlar.hedef?.ad, hedef.ad);
  assert.equal(gorunum.sartlar.mesaj, mesaj);
  assert.ok(teklifCevap(k, b, `t${t.i}`, "kabul", {}, k.ay).ok);
  assert.deepEqual(teklifCevap(k, a, `t${t.i}`, "teslim", {}, k.ay), { ok: false, hata: "teklif_kapandi" }, "yalnız çalışan teslim eder");
  const teslim = teklifCevap(k, b, `t${t.i}`, "teslim", {}, k.ay);
  assert.ok(teslim.ok);
  assert.ok(teslim.deger.olaylar.some((o) => o.g === hedef.o && o.k === "olay.teklif.mektupUlasti" && o.p.mesaj === mesaj));
  assert.ok(teslim.deger.olaylar.some((o) => o.g === a.o && o.k === "olay.teklif.mektupTeslim"));
  assert.equal(t.d, "bitti");
  assert.equal(b.pa, 5);
  assert.equal(gostergeOku(k, "moral"), 51);
  assert.deepEqual(teklifCevap(k, b, `t${t.i}`, "teslim", {}, k.ay), { ok: false, hata: "teklif_kapandi" });
});

test("E4.3-D iş sözleşmesi: aynı hane reddedilir, iki taraflı iptal emaneti iade eder", () => {
  const { k, a, b } = kur();
  a.h = "is-veren-316"; a.e = 200;
  const hizmetci = hizmetciKur(k, 3, "katip", "koyMektubu");
  const ilkHizmetciPara = hizmetci.pa;
  const hedef = oyuncuEkle(k, 4, k.ay - 13 * 12 - 2);
  hedef.h = "mektup-hedef-317"; hedef.e = 400;
  const sart = { tur: "is" as const, is: "mektup" as const, tutar: 4, mektupHedef: hedef.o, mektupMetni: "Mühürlü not." };
  hizmetci.e = a.e;
  assert.deepEqual(teklifOlustur(k, a, hizmetci, sart, k.ay), { ok: false, hata: "ayni_kume" });
  hizmetci.e = 300;
  const r = teklifOlustur(k, a, hizmetci, sart, k.ay);
  assert.ok(r.ok);
  assert.ok(teklifCevap(k, hizmetci, `t${r.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  assert.ok(teklifCevap(k, a, `t${r.deger.teklif.i}`, "bitir", {}, k.ay).ok);
  assert.equal(r.deger.teklif.d, "iptal");
  assert.equal(a.pa, 100);
  assert.equal(hizmetci.pa, ilkHizmetciPara);
});


test("E4.3-D mektup: aynı ay aynı hedefe ikinci teklif ve engelli hedef teslimi reddedilir", () => {
  const { k, a } = kur();
  a.h = "is-veren-317";
  const b = hizmetciKur(k, 3, "katip", "koyMektubu");
  b.pa = 100;
  const hedef = oyuncuEkle(k, 4, k.ay - 13 * 12 - 2);
  hedef.e = 400;
  const girdi = { tur: "is" as const, is: "mektup" as const, tutar: 3, mektupHedef: hedef.o, mektupMetni: "Selam." };
  const r = teklifOlustur(k, a, b, girdi, k.ay);
  assert.ok(r.ok);
  assert.deepEqual(teklifOlustur(k, a, b, girdi, k.ay), { ok: false, hata: "teklif_siniri" });
  assert.ok(teklifCevap(k, b, `t${r.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  assert.ok(engelle(toplumAl(k), a.o, hedef.o).ok);
  assert.deepEqual(teklifCevap(k, b, `t${r.deger.teklif.i}`, "teslim", {}, k.ay), { ok: false, hata: "engelli" });
  assert.equal(b.pa, 100, "engelli teslimde ücret aktarılmaz");
  assert.equal(r.deger.teklif.d, "surer", "başarısız teslim sözleşmeyi ve emaneti korur");
});


test("iki taraflı işler: oyuncunun aynı anda taşıyabileceği sözleşme sayısı ikiyle sınırlı", () => {
  const { k, a, b } = kur();
  const c = oyuncuEkle(k, 3, k.ay - 13 * 12 - 2);
  const d = oyuncuEkle(k, 4, k.ay - 13 * 12 - 2);
  a.h = "aktif-a"; b.h = "aktif-b"; c.h = "aktif-c"; d.h = "aktif-d";
  a.e = 801; b.e = 802; c.e = 803; d.e = 804;
  const ab = teklifOlustur(k, a, b, { tur: "is", is: "mektup", tutar: 5, mektupHedef: c.o, mektupMetni: "Birinci mektup." }, k.ay);
  assert.ok(ab.ok);
  if (!ab.ok) return;
  isBecerisi(b, "katip", "katip.koyMektubu");
  assert.ok(teklifCevap(k, b, `t${ab.deger.teklif.i}`, "kabul", {}, k.ay).ok);

  const ca = teklifOlustur(k, c, a, { tur: "is", is: "mektup", tutar: 5, mektupHedef: d.o, mektupMetni: "İkinci mektup." }, k.ay);
  assert.ok(ca.ok);
  isBecerisi(a, "katip", "katip.koyMektubu");
  assert.ok(teklifCevap(k, a, `t${ca.deger.teklif.i}`, "kabul", {}, k.ay).ok);

  const da = teklifOlustur(k, d, a, { tur: "is", is: "mektup", tutar: 5, mektupHedef: b.o, mektupMetni: "Üçüncü mektup." }, k.ay);
  assert.deepEqual(da, { ok: false, hata: "teklif_siniri" });
});


test("E4.3-D: bekleyen iş teklifi sonradan kabul edilse bile gönderenin aktif iş tavanı aşılmaz", () => {
  const { k, a, b } = kur();
  const c = oyuncuEkle(k, 3, k.ay - 13 * 12 - 2);
  const d = oyuncuEkle(k, 4, k.ay - 13 * 12 - 2);
  const e = oyuncuEkle(k, 5, k.ay - 13 * 12 - 2);
  for (const [x, h, ev] of [[a, "yarisan-a", 901], [b, "yarisan-b", 902], [c, "yarisan-c", 903], [d, "yarisan-d", 904], [e, "yarisan-e", 905]] as const) {
    x.h = h; x.e = ev;
  }
  const ilk = teklifOlustur(k, b, a, { tur: "is", is: "mektup", tutar: 3, mektupHedef: e.o, mektupMetni: "İlk iş." }, k.ay);
  assert.ok(ilk.ok);
  if (!ilk.ok) return;
  isBecerisi(a, "katip", "katip.koyMektubu");
  assert.ok(teklifCevap(k, a, `t${ilk.deger.teklif.i}`, "kabul", {}, k.ay).ok);

  const bekleyen = teklifOlustur(k, a, c, { tur: "is", is: "mektup", tutar: 4, mektupHedef: d.o, mektupMetni: "Bekleyen iş." }, k.ay);
  assert.ok(bekleyen.ok);
  if (!bekleyen.ok) return;

  const ikinci = teklifOlustur(k, d, a, { tur: "is", is: "mektup", tutar: 5, mektupHedef: e.o, mektupMetni: "İkinci iş." }, k.ay);
  assert.ok(ikinci.ok);
  isBecerisi(a, "katip", "katip.koyMektubu");
  assert.ok(teklifCevap(k, a, `t${ikinci.deger.teklif.i}`, "kabul", {}, k.ay).ok);
  assert.equal([ilk.deger.teklif, ikinci.deger.teklif].filter((t) => t.d === "surer").length, 2);

  isBecerisi(c, "katip", "katip.koyMektubu");
  assert.deepEqual(teklifCevap(k, c, `t${bekleyen.deger.teklif.i}`, "kabul", {}, k.ay), { ok: false, hata: "teklif_siniri" });
  assert.equal(bekleyen.deger.teklif.d, "acik", "sınır doluyken bekleyen teklif açık kalır");
  assert.equal(a.pa, 100 - 4, "reddedilen kabul üçüncü emaneti kilitlemez");
});


test("senet: yalnız borçlu ödeme yapar; kısmi ödeme ve fazla ödeme kalan tutarı aşmaz", () => {
  const { k, a, b } = kur();
  const r = teklifOlustur(k, a, b, { tur: "borc", yon: "ver", tutar: 30, faiz: 10, vade: 4 }, k.ay);
  assert.ok(r.ok);
  if (!r.ok) return;
  const t = r.deger.teklif;
  const id = `t${t.i}`;
  assert.ok(teklifCevap(k, b, id, "kabul", {}, k.ay).ok);
  const borcBakiye = b.pa;
  const alacakBakiye = a.pa;

  assert.deepEqual(teklifCevap(k, a, id, "ode", { tutar: 10 }, k.ay), { ok: false, hata: "taraf_degil" }, "alacaklı borçlu adına tahsilat başlatamaz");
  assert.deepEqual(teklifCevap(k, b, id, "ode", { tutar: 0 }, k.ay), { ok: false, hata: "teklif_gecersiz" });
  assert.deepEqual(teklifCevap(k, b, id, "ode", { tutar: 1.5 }, k.ay), { ok: false, hata: "teklif_gecersiz" });
  assert.equal(b.pa, borcBakiye);
  assert.equal(a.pa, alacakBakiye);
  assert.equal(t.kl, 33);

  const ilk = teklifCevap(k, b, id, "ode", { tutar: 10 }, k.ay);
  assert.ok(ilk.ok);
  assert.equal(t.kl, 23);
  assert.deepEqual(t.bo, [[k.ay, 10]]);
  const fazla = teklifCevap(k, b, id, "ode", { tutar: 100 }, k.ay);
  assert.ok(fazla.ok);
  assert.equal(t.kl, 0);
  assert.equal(t.d, "bitti");
  assert.deepEqual(t.bo, [[k.ay, 10], [k.ay, 23]], "fazla talep yalnız kalan borç kadar tahsil edilir");
  assert.equal(teklifCevap(k, b, id, "ode", { tutar: 1 }, k.ay).ok, false, "kapanan senet tekrar tahsil edilemez");
});
