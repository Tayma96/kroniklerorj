// Tezgâh modeli düzeltme turu 2 (denge denetimi): akçe basma, armağan tavanı, karşılıklı farm, çalışan, kepenk ve
// devralma, bütçe sulandırma, tek han kuralı, kıtlık sayımı. Her bulgu önce kırmızı test olarak yazıldı.
import test from "node:test";
import assert from "node:assert/strict";
import { AY_MS, DUNYA_BASLANGICI_MS } from "../src/saat.ts";
import { kaliteliEkle } from "../src/yerlesim/kalite.ts";
import { devirKabul, devirTeklif, edin, girisIsle, mulkDefteri } from "../src/mulk/tapu.ts";
import { depoTasi, devral, rafIslem } from "../src/mulk/tezgah-uclar.ts";
import { MULK_YUVA } from "../src/mulk/kurallar.ts";
import { DEVRALMA_KEPENK_AY } from "../src/mulk/tezgah-kurallar.ts";
import type { Karakter, Kasaba } from "../src/yerlesim/tipler.ts";
import { oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

export const AY = 10;
export const AN = DUNYA_BASLANGICI_MS + AY * AY_MS + 1000;
export const ID = "develi.dukkan.1";

export function yetiskin(k: Kasaba, no: number, pa = 2000): Karakter {
  const kar = oyuncuEkle(k, no, AY - 12 * 20);
  kar.pa = pa;
  kar.nm = [30, 30, 0, 0];
  kar.e = 900 + no;
  k.sakin.find((s) => s.o === kar.o)!.e = 900 + no;
  return kar;
}

export function yansit(k: Kasaba, id: string, ek: Record<string, unknown> = {}): void {
  const t = mulkDefteri(k).t[id]!;
  t.y = { isletme: id, ts: t.ts, ad: "", fc: 100, seviye: 0, durum: "acik", kapi: true, kapasite: 1, it: 10, kq: 0, py: [], pn: [], po: [], to: [], as: 1, ...ek } as never;
}

/** Oyuncu akçesi + beyliğe/hazineye giden (batak, vergi kutusu) + bekleyen iade: korunur. */
function toplam(k: Kasaba): number {
  const md = mulkDefteri(k);
  let t = 0;
  for (const kar of k.kar.values()) t += kar.pa;
  t += md.batak + (md.vergiGiden ?? []).reduce((s, x) => s + x.tutar, 0) + md.cik.k.reduce((s, x) => s + x.a, 0);
  for (const ia of Object.values(md.ia ?? {})) t += ia.pa ?? 0;
  return t;
}

function yuvalariDoldur(k: Kasaba, bas = 40): void {
  for (let i = 2; i <= MULK_YUVA[k.tur].dukkan; i++) assert.ok(edin(k, yetiskin(k, bas + i), { tur: "dukkan" }, AN, `e-${String(bas + i).padStart(7, "0")}`).ok);
}

test("1 KRİTİK: devir fiyatı iade edilmez; devral yalnız beyliğe ödenen bedeli iade eder; akçe basılmaz; devirde kk sıfırlanır", () => {
  const k = testKasabasi("develi", AY);
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2, 3000);
  const t0 = toplam(k);
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  yuvalariDoldur(k);
  const t1 = toplam(k);
  assert.ok(devirTeklif(k, a, ID, { islem: "teklif", alici: "o2", fiyat: 1500 }).ok);
  mulkDefteri(k).tz = { [ID]: { r: [], n: 0, kk: DEVRALMA_KEPENK_AY } };
  assert.ok(devirKabul(k, b, ID, AN, "dv-0000001").ok);
  assert.equal(mulkDefteri(k).tz![ID]!.kk, 0, "devirde devralma sayacı sıfırlanır");
  assert.equal(toplam(k), t1, "devir akçe basmaz");
  mulkDefteri(k).tz![ID]!.kk = DEVRALMA_KEPENK_AY;
  const c = yetiskin(k, 3);
  const t2 = toplam(k);
  const paB = b.pa;
  const r = devral(k, c, ID, AN, "dr-0000001");
  assert.ok(r.ok, JSON.stringify(r));
  assert.equal(b.pa, paB + 120, "beyliğe ödenen edinim bedeli (120) iade, devir fiyatı (1500) değil");
  assert.equal(toplam(k), t2, "devral akçe basmaz");
  assert.ok(mulkDefteri(k).batak >= 0, "batak eksiye düşmez");
  // İflas: işletmeden gelen kasa iadesi cüzdana (kaynağı işletme kasası), tapu boşalır; yerleşim tarafı akçe basmaz.
  const md = mulkDefteri(k);
  const t3 = toplam(k);
  assert.equal(girisIsle(k, { i: "iflas-x", t: "iflas", h: "develi", a: 0, y: { isletme: ID, ts: md.t[ID]!.ts }, b: 0, d: 0, s: 0 }, AN).durum, "kabul");
  assert.equal(toplam(k), t3, "iflas akçe basmaz");
  assert.equal(md.t[ID], undefined);
  void t0;
});

import { HEDIYE_ALMA_AYLIK } from "../src/yerlesim/teklif.ts";
import { satinAl } from "../src/mulk/tezgah-uclar.ts";
import { tezgahDonumu } from "../src/mulk/tezgah-donum.ts";
import { talepCoz } from "../src/mulk/hane-butcesi.ts";
import { isletmeIsle } from "../src/mulk/islem.ts";
import { ayIlerlet, isletmeKur } from "../src/mulk/isletme.ts";
import { meslekSec } from "../src/yerlesim/meslek.ts";
import { CALISAN_DEPO_GUNLUK_ADIL } from "../src/mulk/tezgah-kurallar.ts";

function dukkanli(tur: "develi" | "kizilca" = "develi") {
  const k = testKasabasi(tur, AY);
  const a = yetiskin(k, 1);
  const b = yetiskin(k, 2);
  assert.ok(edin(k, a, { tur: "dukkan" }, AN, "e-0000001").ok);
  mulkDefteri(k).cik.k = [];
  yansit(k, `${k.y}.dukkan.1`);
  return { k, a, b, id: `${k.y}.dukkan.1` };
}

test("2: raf satışında armağan tavanı: üst banttan şaheser satışı aylık tavanda durur; aynı kümede adil üstü geçmez", () => {
  const { k, a, b, id } = dukkanli();
  kaliteliEkle(a, "kilic", [[3, 10, "o1"]]);
  assert.ok(depoTasi(k, a, id, { yon: "koy", mal: "kilic", kalite: 3, adet: 10 }).ok);
  // Kılıç şaheser adil = 38 × 2,5 = 95; hediye sayılmayan üst sınır NPC tavanı ⌈1,5 × 95⌉ = 143; 285 → 142 > 60.
  assert.ok(rafIslem(k, a, id, { islem: "koy", mal: "kilic", kalite: 3, adet: 10, fiyat: 285 }).ok);
  b.pa = 5000;
  assert.deepEqual(satinAl(k, b, id, { satir: 1, adet: 1 }, AN, "s-0000001", 0), { ok: false, hata: "pompa_siniri" });
  // 163 → birim başı hediye 20: üç alış (60) geçer, dördüncü aylık tavanı aşar.
  assert.ok(rafIslem(k, a, id, { islem: "fiyat", satir: 1, fiyat: 163 }).ok);
  assert.ok(satinAl(k, b, id, { satir: 1, adet: 1 }, AN, "s-0000002", 0).ok);
  assert.ok(satinAl(k, b, id, { satir: 1, adet: 1 }, AN, "s-0000003", 0).ok);
  assert.ok(satinAl(k, b, id, { satir: 1, adet: 1 }, AN, "s-0000004", 0).ok);
  assert.equal(a.ha?.[1], HEDIYE_ALMA_AYLIK, "alıcıdan satıcıya hediye sayacı tavanda");
  assert.deepEqual(satinAl(k, b, id, { satir: 1, adet: 1 }, AN, "s-0000005", 0), { ok: false, hata: "pompa_siniri" });
  // Aynı küme: adil üstü hiç geçmez.
  const c = yetiskin(k, 3);
  c.e = a.e;
  c.h = a.h;
  Object.assign(k.sakin.find((s) => s.o === "o3")!, { e: a.e, h: a.h });
  assert.ok(rafIslem(k, a, id, { islem: "fiyat", satir: 1, fiyat: 96 }).ok);
  assert.deepEqual(satinAl(k, c, id, { satir: 1, adet: 1 }, AN, "s-0000006", 0), { ok: false, hata: "pompa_siniri" });
  assert.ok(rafIslem(k, a, id, { islem: "fiyat", satir: 1, fiyat: 95 }).ok);
  assert.ok(satinAl(k, c, id, { satir: 1, adet: 1 }, AN, "s-0000007", 0).ok, "adil fiyattan aile alır");
});

test("3: karşılıklı farm: A→B ve B→A dönüşümlü aylarda ikinci bacaktan sonra hepsi bayraklı; puan yalnız adil değere kadar", () => {
  const { k, a, b, id } = dukkanli();
  assert.ok(edin(k, b, { tur: "dukkan" }, AN, "e-0000002").ok);
  mulkDefteri(k).cik.k = [];
  yansit(k, "develi.dukkan.2");
  kaliteliEkle(a, "ekmek", [[0, 20]]);
  kaliteliEkle(b, "civi", [[0, 20]]);
  assert.ok(depoTasi(k, a, id, { yon: "koy", mal: "ekmek", adet: 20 }).ok);
  assert.ok(rafIslem(k, a, id, { islem: "koy", mal: "ekmek", adet: 20, fiyat: 6 }).ok);
  assert.ok(depoTasi(k, b, "develi.dukkan.2", { yon: "koy", mal: "civi", adet: 20 }).ok);
  assert.ok(rafIslem(k, b, "develi.dukkan.2", { islem: "koy", mal: "civi", adet: 20, fiyat: 4 }).ok);
  const bayrak: boolean[] = [];
  for (let i = 0; i < 4; i++) {
    const r = i % 2 === 0 ? satinAl(k, b, id, { satir: 1, adet: 2 }, AN, `s-10000${i}0`, 0) : satinAl(k, a, "develi.dukkan.2", { satir: 1, adet: 2 }, AN, `s-10000${i}1`, 0);
    assert.ok(r.ok, JSON.stringify(r));
    bayrak.push((r.deger.satis as { karsilikli: boolean }).karsilikli);
    k.ay++;
  }
  assert.deepEqual(bayrak, [false, true, true, true], "farklı aylarda da iki yönlü çift bayraklanır");
  const ilk = mulkDefteri(k).cik.k.find((x) => x.i.endsWith("s-1000000"))!;
  assert.equal(ilk.y.sayilan, 8, "ilk bacağın puana sayılan kısmı adil değer (2 × 4), üstü (12 − 8) puan saymaz");
});

test("4: çalışan depodan günlük adil değer tavanıyla alır, defter satırı yazılır; işletmenin çalışanı satın alamaz", () => {
  const { k, a, b, id } = dukkanli();
  kaliteliEkle(a, "kumas", [[0, 6]]);
  assert.ok(depoTasi(k, a, id, { yon: "koy", mal: "kumas", adet: 6 }).ok);
  yansit(k, id, { py: [["o2", ["kasa", "musteri"]]] });
  // Kumaş adil 15: bir adet (15) geçer, ikinci (30 > 20) geçmez.
  assert.ok(depoTasi(k, b, id, { yon: "al", mal: "kumas", adet: 1 }, AN).ok);
  assert.deepEqual(depoTasi(k, b, id, { yon: "al", mal: "kumas", adet: 1 }, AN), { ok: false, hata: "depo_cekim_tavani" });
  assert.ok(15 <= CALISAN_DEPO_GUNLUK_ADIL);
  assert.deepEqual(mulkDefteri(k).tz![id]!.dd, [[AY, "o2", "kumas", 0, 1]]);
  assert.ok(depoTasi(k, b, id, { yon: "al", mal: "kumas", adet: 1 }, AN + 24 * 3600 * 1000).ok, "ertesi gün yeniden");
  assert.ok(depoTasi(k, a, id, { yon: "al", mal: "kumas", adet: 4 }, AN).ok, "sahip tavansız");
  kaliteliEkle(a, "kumas", [[0, 2]]);
  assert.ok(depoTasi(k, a, id, { yon: "koy", mal: "kumas", adet: 2 }).ok);
  assert.ok(rafIslem(k, a, id, { islem: "koy", mal: "kumas", adet: 2, fiyat: 15 }).ok);
  assert.deepEqual(satinAl(k, b, id, { satir: 1, adet: 1 }, AN, "s-2000001", 0), { ok: false, hata: "kendine" });
});

test("5–6: kepenk = satışsız ay: rafta satılamayan malla 3 ay bakım/borç/itibar/maaş işlemez; satış ya da sahip eylemi sayacı sıfırlar", () => {
  const { k, a, id } = dukkanli();
  kaliteliEkle(a, "ekmek", [[0, 1]]);
  assert.ok(depoTasi(k, a, id, { yon: "koy", mal: "ekmek", adet: 1 }).ok);
  assert.ok(rafIslem(k, a, id, { islem: "koy", mal: "ekmek", adet: 1, fiyat: 12 }).ok, "NPC tavanı 6'nın üstünde: satılmaz");
  for (let ay = AY + 1; ay <= AY + 3; ay++) tezgahDonumu(k, ay);
  const md = mulkDefteri(k);
  assert.equal(md.tzb?.[id], undefined, "satışsız aylarda işletmeye kayıt (bakım) gitmez");
  assert.equal((md.tz![id]!.gs as { kepenk: boolean }).kepenk, true);
  assert.equal(md.tz![id]!.kk, 2, "sahibin AY ayındaki eylemi ilk ayı sayılmaz kıldı");
  // IsletmeDO: dükkân kayıtsız aylarda bakım, borç, itibar ve maaş işlemez.
  const is = isletmeKur(id, "develi", "dukkan", 1, { h: a.h, o: a.o, ad: a.ad }, 1, AY);
  is.emanet = 10;
  is.pr.push({ n: 1, k: { t: "npc", n: "n1", ad: "Ali" }, r: "yonetici", y: [], m: 5, b: AY, od: 0, kd: 1, d: "etkin" });
  ayIlerlet(is, AY + 3, AN + 3 * AY_MS);
  assert.deepEqual([is.kasa, is.borc, is.borcAy, is.it, is.emanet, is.pr[0]!.d, is.durum], [0, 0, 0, 10, 10, "etkin", "acik"]);
  // Satış (oyuncu) sayacı anında sıfırlar.
  md.tz![id]!.kk = 30;
  assert.ok(rafIslem(k, a, id, { islem: "fiyat", satir: 1, fiyat: 6 }).ok);
  assert.equal(md.tz![id]!.kk, 0, "sahibin fiyat eylemi sayacı sıfırlar");
});

test("5–6: devralma: 59 ay etkinliksizlikte red, 60'ta kabul; sahibin eylemi reddettirir; köyde ikinci yuvayla rakip sıfırlanamaz", () => {
  const { k, a, b, id } = dukkanli("kizilca");
  assert.equal(MULK_YUVA.koy.dukkan, 2);
  assert.ok(edin(k, b, { tur: "dukkan" }, AN, "e-0000002").ok, "saldırgan ikinci yuvayı alır");
  mulkDefteri(k).cik.k = [];
  for (let ay = AY + 1; ay <= AY + 59; ay++) tezgahDonumu(k, ay);
  assert.equal(mulkDefteri(k).tz![id]!.kk, 59);
  assert.deepEqual(devral(k, b, id, AN, "dr-0000001"), { ok: false, hata: "devralma_kosulu" }, "59. ayda red");
  kaliteliEkle(a, "ekmek", [[0, 1]]);
  assert.ok(depoTasi(k, a, id, { yon: "koy", mal: "ekmek", adet: 1 }).ok, "sahip mal koyar");
  for (let ay = AY + 60; ay <= AY + 60 + 58; ay++) tezgahDonumu(k, ay);
  assert.deepEqual(devral(k, b, id, AN, "dr-0000002"), { ok: false, hata: "devralma_kosulu" }, "eylem sayacı sıfırladı");
  tezgahDonumu(k, AY + 60 + 59);
  tezgahDonumu(k, AY + 60 + 60);
  assert.ok(mulkDefteri(k).tz![id]!.kk >= DEVRALMA_KEPENK_AY);
  assert.ok(devral(k, b, id, AN, "dr-0000003").ok, "60 ay etkinliksizlikten sonra");
});

test("7: bütçe sulandırma: rakibin NPC tavanı üstündeki 3 oduncu malı odunun bMal'ını düşürmez", () => {
  const d = new Map([["d1", { id: "d1", itibar: 10, tavan: 999 }], ["d2", { id: "d2", itibar: 10, tavan: 999 }]]);
  const tek = talepCoz("kasaba", [{ id: "d1#1", dukkan: "d1", mal: "odun", q: 0, adet: 24, fiyat: 1 }], d, () => 1);
  const sulu = talepCoz("kasaba", [
    { id: "d1#1", dukkan: "d1", mal: "odun", q: 0, adet: 24, fiyat: 1 },
    { id: "d2#1", dukkan: "d2", mal: "kereste", q: 0, adet: 24, fiyat: 9 },
    { id: "d2#2", dukkan: "d2", mal: "tas", q: 0, adet: 24, fiyat: 3 },
    { id: "d2#3", dukkan: "d2", mal: "komur", q: 0, adet: 24, fiyat: 9 },
  ], d, () => 1);
  const bMal = (r: ReturnType<typeof talepCoz>) => r.satirlar.find((x) => x.mal === "odun")!.bMal;
  assert.equal(bMal(sulu), bMal(tek));
  assert.ok(sulu.satirlar.filter((x) => x.dukkan === "d2").every((x) => x.neden === "tavan"));
});

test("8: aynı yerleşimde han sahibi başka bir hana vekil olamaz", () => {
  const sahip = { h: "h1", o: "o1", ad: "A" };
  const is = isletmeKur("demirhan.han.2", "demirhan", "han", 2, sahip, 1, AY);
  is.pr.push({ n: 1, k: { t: "oyuncu", h: "h7", o: "o7", ad: "Han Sahibi" }, r: "yonetici", y: [], m: 5, b: AY, od: 0, kd: 0, d: "etkin" });
  const tapu = { isletme: "demirhan.han.2", yerlesim: "demirhan", tur: "han" as const, no: 2, ts: 1, sahip };
  const komut = (hs: string[], istekNo: string) =>
    isletmeIsle(is, { islem: "komut", isletme: tapu.isletme, tapu, baglam: { ...sahip, mk: {}, tv: 0 }, alt: "personel", govde: { islem: "yetki", sozlesme: 1, yetki: "vekalet", ver: true, sure: 2 }, hedef: { hs }, istekNo }, AN).sonuc;
  assert.deepEqual(komut(["o7"], "v-0000001"), { ok: false, hata: "vekil_han_sahibi" });
  assert.ok(komut([], "v-0000002").ok, "han sahibi değilse vekil olur");
});

test("11: kıtlık sayımı satıcıyı hariç tutar: yerleşimin tek demircisi kendi bütçesini düşürmez", () => {
  const { k, a, id } = dukkanli();
  assert.ok(meslekSec(a, "demirci", AY).ok);
  kaliteliEkle(a, "civi", [[0, 5]]);
  assert.ok(depoTasi(k, a, id, { yon: "koy", mal: "civi", adet: 5 }).ok);
  assert.ok(rafIslem(k, a, id, { islem: "koy", mal: "civi", adet: 5, fiyat: 3 }).ok);
  tezgahDonumu(k, AY + 1);
  const m = (mulkDefteri(k).tzo as { meslekler: { meslek: string; kitlik: boolean }[] }).meslekler.find((x) => x.meslek === "demirci")!;
  assert.equal(m.kitlik, true, "satıcının kendisi sayılmaz");
});
