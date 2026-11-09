// Gerçek ↔ bilinen (Faz 4, GDD §6): olay defteri gerçektir; bir NPC'nin bir oyuncu hakkında bildiği, kaynağı ve
// kaynağa güveniyle `Iliski.du` duyumlarıdır. Bu dosya üçgen defterinin biçimlerini ve görüş/şans hesabının
// okuduğu küçük, saf etkileri taşır (gorus.ts, eylem.ts ve donum.ts buradan okur; kurallar ucgen.ts, arabulucu.ts,
// casus.ts ve haber.ts'dedir). Bir NPC bilmediği şeye tepki vermez: duyum yoksa kalem de yoktur.

import { hanedanKasabasi } from "./hanedan.ts";
import { DUYUM_EN_COK, duyumYuku } from "./hafiza.ts";
import { acikHusumet, dostMu } from "./iliski.ts";
import { NAMLAR, type Nam } from "./karakter.ts";
import type { Iliski, Karakter, Kasaba } from "./tipler.ts";

/** Duyum: [kaynak ("n12", "o3" ya da "gozlem"), tür, yük, kaynağa güven 0-100, ay, yalanlandı]. */
export type Duyum = [kaynak: string, tur: string, yuk: number, guven: number, ay: number, yalanlandi?: 1];

/**
 * Arabuluculuğun kalıcı izi (NPC → taraf). v: barışların toplam değeri (sabit, sönmez); s: şartlı barış
 * [şart yerine gelince eklenecek değer, akçe tutarı, son ay]; ak: ateşkesin bittiği ay (dahil değil); ar: son arabulucu.
 */
export interface Baris {
  v: number;
  a: number;
  ar: string;
  s?: [deger: number, tutar: number, sonAy: number];
  ak?: number;
}

export const KISKIRT_TEKLIFLERI = ["para", "ortaklik", "intikamPayi", "soz"] as const;
export type KiskirtTeklifi = (typeof KISKIRT_TEKLIFLERI)[number];

/** İttifak sözü: NPC `n`, fail `f`'in hedef `h`'ye karşı hamlelerine `b` ayına dek katılır. */
export interface Soz {
  i: number;
  n: number;
  f: string;
  h: string;
  a: number;
  b: number;
  k: "kiskirt" | "teklif";
  tk?: KiskirtTeklifi;
  /** Son katılım ayı (ayda tek katılım). */
  ka?: number;
}

export const ARACI_BEDELLERI = ["ozur", "tazminat", "helallik", "ortakIs"] as const;
export type AraciBedeli = (typeof ARACI_BEDELLERI)[number];

/** Arabuluculuk talebi: taraf `t`, dost arabulucuya `ar`, NPC `n` ile arasını bulmasını ister. `m`: emanetteki akçe. */
export interface AraciTalebi {
  i: number;
  t: string;
  ar: string;
  n: number;
  b: AraciBedeli;
  m: number;
  ac: number;
  sa: number;
  d: "acik" | "bitti" | "ret" | "dustu" | "geri";
  sn?: string;
  kp?: number;
}

/** Casus: sahip `s`, NPC `n`'ye `iz`'i izletir; [a, b) aylarını ay dönümünde rapor eder. */
export interface Casus {
  i: number;
  s: string;
  n: number;
  iz: string;
  a: number;
  b: number;
  r?: number;
}

/** Üçgen izi: [ay, tür, fail, NPC, hedef] (hedef sınırı ve ikili oyun denetimi). */
export type UcgenIzi = [ay: number, tur: string, fail: string, npc: number, hedef: string];

export interface UcgenDefteri {
  n: number;
  sz: Soz[];
  at: AraciTalebi[];
  cs: Casus[];
  iz: UcgenIzi[];
  /** Yakalanan katılımcı NPC'ler: kimlik → lekenin bittiği ay (kaynak güveni düşer). */
  lk: Record<string, number>;
  /** Ay dönümü anlık görüntüsü: NPC → dost baktığı oyuncular [oyuncu, görüş] (oyuncu dostları kalemi). */
  yk: Record<string, [string, number][]>;
}

export function ucgenAl(k: Kasaba): UcgenDefteri {
  k.ug ??= { n: 1, sz: [], at: [], cs: [], iz: [], lk: {}, yk: {} };
  return k.ug;
}

/** [PARAMETRE] Görüş kalemleri. */
export const DUYUM_TAVANI = 15;
export const ITTIFAK_DEGERI = 15;
export const ITTIFAK_ORTAK_DEGERI = 5;
/** Oyuncu dostları: NPC'nin dost baktığı oyuncunun sana beyanı (dost +50, açık husumet −50) × oran. */
export const OYUNCU_BEYAN = { dost: 50, husumet: -50 } as const;
export const OYUNCU_DOSTU_ORANI = 0.1;
export const OYUNCU_DOSTU_TAVANI = 10;
/** Boykot: hedefin o NPC'yle eylem şansı. */
export const BOYKOT_SANS = 20;

const kirp = (x: number, t: number) => (x > t ? t : x < -t ? -t : x);

/** Duyduklarının bakışa etkisi: Σ yük × güven/100, sönerek; yalanlanan sıfır; ±DUYUM_TAVANI. */
export function duyulanEtkisi(i: Iliski | undefined, ay: number): number {
  if (!i?.du?.length) return 0;
  let t = 0;
  for (const d of i.du) if (!d[5]) t += duyumYuku(d[2], d[3], ay - d[4]);
  return kirp(Math.round(t), DUYUM_TAVANI);
}

export function barisEtkisi(i: Iliski | undefined): number {
  return i?.ab?.v ?? 0;
}

export function ateskesMi(i: Iliski | undefined, ay: number): boolean {
  return i?.ab?.ak !== undefined && i.ab.ak > ay;
}

export function boykotSansi(i: Iliski | undefined, ay: number): number {
  return i?.bk !== undefined && i.bk > ay ? -BOYKOT_SANS : 0;
}

export function aktifSozler(k: Kasaba, ay: number): Soz[] {
  return (k.ug?.sz ?? []).filter((s) => s.b > ay);
}

/** Sözlü NPC, ortağının hedefine −ITTIFAK_DEGERI bakar (aynı hedefe birden çok söz üst üste binmez). */
export function ittifakEtkisi(k: Kasaba, npcI: number, karO: string, ay: number): number {
  return (k.ug?.sz ?? []).some((s) => s.n === npcI && s.h === karO && s.b > ay) ? -ITTIFAK_DEGERI : 0;
}

export function ittifakOrtagiEtkisi(k: Kasaba, npcI: number, karO: string, ay: number): number {
  return (k.ug?.sz ?? []).some((s) => s.n === npcI && s.f === karO && s.b > ay) ? ITTIFAK_ORTAK_DEGERI : 0;
}

/** Oyuncu dostları: NPC'nin (geçen ay dönümünde) dost baktığı oyuncuların sana beyanı × oran, ±tavan. */
export function oyuncuDostuEtkisi(k: Kasaba, npcI: number, karO: string): number {
  const liste = k.ug?.yk[npcI];
  if (!liste?.length) return 0;
  let t = 0;
  for (const [o] of liste) {
    if (o === karO) continue;
    if (dostMu(k.tp, o, karO)) t += OYUNCU_BEYAN.dost * OYUNCU_DOSTU_ORANI;
    else if (acikHusumet(k.tp, o, karO)) t += OYUNCU_BEYAN.husumet * OYUNCU_DOSTU_ORANI;
  }
  return kirp(Math.round(t), OYUNCU_DOSTU_TAVANI);
}

/** Duyum ekler: aynı kaynak ve tür aynı ayda üst üste binmez (en yüksek güven kalır); en eskiler düşer. */
export function duyumEkle(i: Iliski, kaynak: string, tur: string, yuk: number, guven: number, ay: number): void {
  const du = (i.du ??= []);
  const var_ = du.find((d) => d[0] === kaynak && d[1] === tur && d[4] === ay && !d[5]);
  if (var_) {
    var_[3] = Math.max(var_[3], guven);
    return;
  }
  du.push([kaynak, tur, yuk, guven, ay]);
  if (du.length > DUYUM_EN_COK) du.splice(0, du.length - DUYUM_EN_COK);
}

/** Bir kaynağın (o aydaki ya da bütün) duyumlarını yalanlanmış sayar; kaç duyum etkilendi. */
export function duyumYalanla(i: Iliski | undefined, kaynak: string, tur?: string, ay?: number): number {
  let n = 0;
  for (const d of i?.du ?? []) {
    if (d[0] !== kaynak || d[5] || (tur !== undefined && d[1] !== tur) || (ay !== undefined && d[4] !== ay)) continue;
    d[5] = 1;
    n++;
  }
  return n;
}

/** NPC'ye ödenen akçe kasaba hazinesine girer (NPC'lerin kesesi yok; toplam akçe korunur). */
export function npcyeOde(k: Kasaba, akce: number): void {
  if (akce > 0) hanedanKasabasi(k).hz += akce;
}

/** Nam kaybı (kazanç tavanından bağımsız; 0'ın altına inmez). Gerçekte düşen miktarı döndürür (negatif). */
export function namDus(kar: Karakter, nam: Nam, miktar: number): number {
  const i = NAMLAR.indexOf(nam);
  const once = kar.nm[i] ?? 0;
  kar.nm[i] = Math.max(0, once - miktar);
  return (kar.nm[i] ?? 0) - once;
}

/** Bütün açık arabuluculuk emanetleri (toplam akçe denetimi için). */
export function ucgenEmanet(k: Kasaba): number {
  return (k.ug?.at ?? []).reduce((a, t) => a + (t.d === "acik" ? t.m : 0), 0);
}
