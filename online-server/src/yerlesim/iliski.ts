// Oyuncu–oyuncu bağı (Faz 3a): dostluk istek/kabul (karşılıklı), açık husumet ilanı, ortak tanıdıklar ve oyuncu
// profilinin görünür alanları. Oyuncunun oyuncuya bakışı NPC görüşünden ayrıdır: burada yalnız beyan ve kayıt
// tutulur. Ret ve cevapsızlık ceza üretmez; yalnız aynı kişiye hemen yeniden istek atılamaz (taciz sınırı, §13.5).

import type { Dil } from "../icerik/adlar.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { engelliMi } from "./engel.ts";
import { NAMLAR, adlandir, karakterYasi } from "./karakter.ts";
import { npcAdi, npcKimlik, oyuncuRef } from "./ortak.ts";
import { haneTaniklari, mekanTaniklari, soylentiEkle } from "./soylenti.ts";
import { ciftSirala, toplumAl, type OyuncuBagi, type Toplum } from "./toplum.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] Dostluk ve husumet sınırları. */
export const DOSTLUK_ISTEK_EN_COK = 10;
export const DOSTLUK_ISTEK_SURE = 6;
/** Reddedilen istekten sonra aynı kişiye yeniden istek için beklenecek ay. */
export const DOSTLUK_RED_ARALIK = 6;
export const DOST_EN_COK = 50;
/** Aynı kişiye iki husumet ilanı arası en az ay; bir oyuncunun aylık ilan sınırı. */
export const HUSUMET_ARALIK = 6;
export const HUSUMET_AYLIK = 2;
export const ORTAK_TANIDIK_EN_COK = 20;
export const ILISKI_YASI = 13;
/** Tanıdık listesinin en çok uzunluğu (motor da bunu kullanır). */
export const TANIDIK_EN_COK = 200;

export type BagGorunumu = "dost" | "istekGonderildi" | "istekGeldi" | null;

export function bagBul(t: Toplum | undefined, x: string, y: string): OyuncuBagi | undefined {
  if (!t) return undefined;
  const [a, b] = ciftSirala(x, y);
  return t.ob.find((o) => o.a === a && o.b === b);
}

export function dostMu(t: Toplum | undefined, x: string, y: string): boolean {
  return bagBul(t, x, y)?.d === "dost";
}

export function bagGorunumu(t: Toplum | undefined, ben: string, o: string): BagGorunumu {
  const b = bagBul(t, ben, o);
  if (!b) return null;
  if (b.d === "dost") return "dost";
  return b.g === ben ? "istekGonderildi" : "istekGeldi";
}

function tanidikYaz(kar: Karakter, diger: string, isaret: "dost" | "tanidik" | "dusman"): void {
  if (!kar.tn[diger] && Object.keys(kar.tn).length >= TANIDIK_EN_COK) return;
  kar.tn[diger] = isaret;
}

function bagSil(t: Toplum, x: string, y: string): void {
  const [a, b] = ciftSirala(x, y);
  t.ob = t.ob.filter((o) => !(o.a === a && o.b === b));
}

function redler(t: Toplum): NonNullable<Toplum["rd"]> {
  return (t.rd ??= []);
}

/**
 * POST /v1/dostluk: iste | kabul | ret | bitir. Karşılıklı istek kendiliğinden dostluk olur. Dost olunca iki
 * tarafın tanıdık işareti "dost" olur; bitince "tanidik" kalır. Olaylar: istek (alıcıya özel), dostluk (herkese).
 */
export function dostlukIslem(
  k: Kasaba,
  ben: Karakter,
  o: Karakter,
  islem: unknown,
  ay: number,
): Sonuc<{ bag: BagGorunumu; olaylar: OlayTaslagi[] }> {
  if (ben.o === o.o) return hata("kendine");
  const t = toplumAl(k);
  const b = bagBul(t, ben.o, o.o);
  const olaylar: OlayTaslagi[] = [];
  const dostOl = () => {
    const [x, y] = ciftSirala(ben.o, o.o);
    bagSil(t, x, y);
    t.ob.push({ a: x, b: y, d: "dost", ay });
    tanidikYaz(ben, o.o, "dost");
    tanidikYaz(o, ben.o, "dost");
    olaylar.push({ t: "dostluk", w: ben.o, h: o.o, g: "", n: 4, k: "olay.dostluk.oyuncu", p: { a: oyuncuRef(ben), b: oyuncuRef(o) } });
  };
  switch (islem) {
    case "iste": {
      if (engelliMi(t, ben.o, o.o)) return hata("engelli");
      if (karakterYasi(ben, ay) < ILISKI_YASI || karakterYasi(o, ay) < ILISKI_YASI) return hata("yas_kapisi");
      if (b?.d === "dost") return basarili({ bag: "dost", olaylar });
      if (b?.d === "istek" && b.g === ben.o) return basarili({ bag: "istekGonderildi", olaylar });
      const dostSayisi = (x: string) => t.ob.filter((q) => q.d === "dost" && (q.a === x || q.b === x)).length;
      if (dostSayisi(ben.o) >= DOST_EN_COK || dostSayisi(o.o) >= DOST_EN_COK) return hata("tavan_doldu");
      if (b?.d === "istek") {
        dostOl();
        return basarili({ bag: "dost", olaylar });
      }
      const [x, y] = ciftSirala(ben.o, o.o);
      const red = redler(t).find((r) => r.a === x && r.b === y && r.g === ben.o);
      if (red && ay - red.ay < DOSTLUK_RED_ARALIK) return hata("aralik_dolu");
      if (t.ob.filter((q) => q.d === "istek" && q.g === ben.o).length >= DOSTLUK_ISTEK_EN_COK) return hata("teklif_siniri");
      t.ob.push({ a: x, b: y, d: "istek", g: ben.o, ay });
      olaylar.push({ t: "dostluk", w: ben.o, h: o.o, g: o.o, n: 5, k: "olay.dostluk.istek", p: { kisi: oyuncuRef(ben) } });
      return basarili({ bag: "istekGonderildi", olaylar });
    }
    case "kabul":
      if (b?.d === "dost") return basarili({ bag: "dost", olaylar });
      if (b?.d !== "istek" || b.g === ben.o) return hata("istek_yok");
      if (engelliMi(t, ben.o, o.o)) return hata("engelli");
      dostOl();
      return basarili({ bag: "dost", olaylar });
    case "ret": {
      if (b?.d !== "istek") return hata("istek_yok");
      bagSil(t, ben.o, o.o);
      // İsteyen kendi isteğini geri çekerse ret izi yazılmaz.
      if (b.g !== ben.o) {
        const [x, y] = ciftSirala(ben.o, o.o);
        const rd = redler(t).filter((r) => !(r.a === x && r.b === y && r.g === b.g));
        rd.push({ a: x, b: y, g: b.g!, ay });
        t.rd = rd.filter((r) => ay - r.ay < DOSTLUK_RED_ARALIK);
      }
      return basarili({ bag: null, olaylar });
    }
    case "bitir":
      if (b?.d !== "dost") return hata("istek_yok");
      bagSil(t, ben.o, o.o);
      if (ben.tn[o.o] === "dost") ben.tn[o.o] = "tanidik";
      if (o.tn[ben.o] === "dost") o.tn[ben.o] = "tanidik";
      return basarili({ bag: null, olaylar });
    default:
      return hata("gecersiz_istek");
  }
}

/** Ay dönümü: süresi dolan dostluk istekleri cezasız düşer, eski ret izleri silinir. */
export function iliskiDonumu(k: Kasaba, ay: number): void {
  const t = k.tp;
  if (!t) return;
  t.ob = t.ob.filter((o) => o.d === "dost" || ay - o.ay < DOSTLUK_ISTEK_SURE);
  if (t.rd) {
    t.rd = t.rd.filter((r) => ay - r.ay < DOSTLUK_RED_ARALIK);
    if (t.rd.length === 0) delete t.rd;
  }
}

export function acikHusumet(t: Toplum | undefined, g: string, h: string) {
  return t?.hu.find((x) => x.d === "acik" && x.g === g && x.h === h);
}

/**
 * POST /v1/husumet: ilan | kaldir. İlan meydanda herkese görünür olaydır, dostluğu ve isteği bitirir, ilan edenin
 * işareti "dusman" olur ve meydan tanıklarınca söylentiye dönüşür. Kaldırma (barış) yalnız ilan edenindir.
 */
export function husumetIslem(
  k: Kasaba,
  ben: Karakter,
  o: Karakter,
  islem: unknown,
  ay: number,
): Sonuc<{ husumet: boolean; olaylar: OlayTaslagi[] }> {
  if (ben.o === o.o) return hata("kendine");
  const t = toplumAl(k);
  const acik = acikHusumet(t, ben.o, o.o);
  const olaylar: OlayTaslagi[] = [];
  if (islem === "ilan") {
    if (acik) return basarili({ husumet: true, olaylar });
    if (karakterYasi(ben, ay) < ILISKI_YASI) return hata("yas_kapisi");
    const son = t.hu.filter((x) => x.g === ben.o && x.h === o.o).reduce((m, x) => Math.max(m, x.ay), -1e9);
    if (ay - son < HUSUMET_ARALIK) return hata("aralik_dolu");
    if (t.hu.filter((x) => x.g === ben.o && x.ay === ay).length >= HUSUMET_AYLIK) return hata("aralik_dolu");
    bagSil(t, ben.o, o.o);
    if (o.tn[ben.o] === "dost") o.tn[ben.o] = "tanidik";
    tanidikYaz(ben, o.o, "dusman");
    t.hu = t.hu.filter((x) => !(x.g === ben.o && x.h === o.o));
    t.hu.push({ g: ben.o, h: o.o, ay, d: "acik" });
    olaylar.push({ t: "husumet", w: ben.o, h: o.o, g: "", n: 6, k: "olay.husumet.ilan", p: { kisi: oyuncuRef(ben), hedef: oyuncuRef(o) } });
    const tanik = mekanTaniklari(k, "meydan", [], ay, `husumet:${ben.o}:${o.o}`);
    soylentiEkle(k, "husumet", ben.o, o.o, tanik.length ? tanik : haneTaniklari(k, [ben.e, o.e], ay, `husumet:${ben.o}`), ay);
    return basarili({ husumet: true, olaylar });
  }
  if (islem === "kaldir") {
    if (!acik) return basarili({ husumet: false, olaylar });
    acik.d = "kalkti";
    acik.ka = ay;
    if (ben.tn[o.o] === "dusman") ben.tn[o.o] = "tanidik";
    olaylar.push({ t: "husumet", w: ben.o, h: o.o, g: "", n: 4, k: "olay.husumet.kalkti", p: { kisi: oyuncuRef(ben), hedef: oyuncuRef(o) } });
    return basarili({ husumet: false, olaylar });
  }
  return hata("gecersiz_istek");
}

/** İki oyuncunun ikisinin de tanıdık listesinde olan kişiler (işaretler gösterilmez; yalnız kimlik ve ad). */
export function ortakTanidiklar(k: Kasaba, a: Karakter, b: Karakter, dil: Dil): { id: string; ad: string }[] {
  const sonuc: { id: string; ad: string }[] = [];
  for (const id of Object.keys(a.tn).sort()) {
    if (sonuc.length >= ORTAK_TANIDIK_EN_COK) break;
    if (id === a.o || id === b.o || !(id in b.tn)) continue;
    if (id.startsWith("n")) {
      const n = k.dizin.get(Number(id.slice(1)));
      if (n) sonuc.push({ id: npcKimlik(n.i), ad: npcAdi(n, dil) });
    } else {
      const s = k.sakin.find((x) => x.o === id);
      if (s) sonuc.push({ id, ad: s.ad });
    }
  }
  return sonuc;
}

/**
 * Başka oyuncunun profili: yalnız görünür alanlar (§13.9). Para, envanter, beceriler, Hal, tanıdık işaretleri,
 * olağan düzen ve NPC ilişkileri dışarıda kalır.
 */
export function oyuncuProfili(k: Kasaba, ben: Karakter, o: Karakter, dil: Dil) {
  const ay = k.ay;
  const t = k.tp;
  const s = k.sakin.find((x) => x.o === o.o);
  const ms = o.ms;
  const ana = ms?.a || null;
  const yan = ms?.y || null;
  const reis = [o.ba, o.an].map((i) => (i ? k.dizin.get(i) : undefined)).find((n) => n);
  const husumetler = (t?.hu ?? [])
    .filter((x) => x.d === "acik" && (x.g === o.o || x.h === o.o))
    .map((x) => {
      const diger = x.g === o.o ? x.h : x.g;
      return { id: diger, ad: k.sakin.find((q) => q.o === diger)?.ad ?? "?", yon: x.g === o.o ? "ilanEtti" : "hedef", ay: x.ay };
    });
  return {
    id: o.o,
    ad: o.ad,
    oyuncu: true,
    ben: ben.o === o.o,
    cinsiyet: o.k ? "kadın" : "erkek",
    yas: karakterYasi(o, ay),
    meslek: {
      ana,
      anaKademe: ana ? (ms?.s[ana]?.kd ?? 0) : null,
      yan,
      yanKademe: yan ? (ms?.s[yan]?.kd ?? 0) : null,
    },
    hane: { id: o.e, reis: reis ? { id: npcKimlik(reis.i), ad: npcAdi(reis, dil) } : null },
    nam: adlandir(NAMLAR, o.nm),
    mekan: s && s.ma === ay ? s.mk : null,
    bag: bagGorunumu(t, ben.o, o.o),
    husumet: { benIlanEttim: !!acikHusumet(t, ben.o, o.o), oIlanEtti: !!acikHusumet(t, o.o, ben.o) },
    husumetler,
    dostSayisi: (t?.ob ?? []).filter((q) => q.d === "dost" && (q.a === o.o || q.b === o.o)).length,
    ortakTanidiklar: ben.o === o.o ? [] : ortakTanidiklar(k, ben, o, dil),
    engelledim: (t?.eg[ben.o] ?? []).includes(o.o),
  };
}
