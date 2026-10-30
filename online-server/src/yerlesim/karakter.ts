// Oyuncu karakteri: yaş (doğum ayından), 6 özellik ve 6 genel beceri (§14.1), nam, takat (ayda 6, en çok
// 2 aylık taşınır), hane (ocağın NPC ailesi), tanıdıklar ve işaretler. Saf fonksiyonlar; karakteri yerinde değiştirir.

import { karma } from "./rastgele.ts";
import { yas } from "./ortak.ts";
import type { Karakter, Kasaba, Npc, Sakin } from "./tipler.ts";

export const OZELLIKLER = ["guc", "ceviklik", "dayaniklilik", "zeka", "karizma", "sezgi"] as const;
export const BECERILER = ["dovus", "soz", "ticaret", "zanaat", "ilim", "gizlilik"] as const;
export const NAMLAR = ["comertlik", "dindarlik", "mertlik", "caliskanlik"] as const;
export type Ozellik = (typeof OZELLIKLER)[number];
export type Beceri = (typeof BECERILER)[number];
export type Nam = (typeof NAMLAR)[number];

/** [PARAMETRE] Takat: her ay dönümünde 6; kullanılmayan en çok 2 aylık (12) taşınır → tavan 18. */
export const TAKAT_AYLIK = 6;
export const TAKAT_TASINAN_AY = 2;
export const TAKAT_TAVAN = TAKAT_AYLIK * (1 + TAKAT_TASINAN_AY);
/** [PARAMETRE] Ay başına beceri ve nam kazanç tavanı (farm yok). */
export const BECERI_AYLIK_TAVAN = 4;
export const NAM_AYLIK_TAVAN = 3;
export const OZELLIK_EN_COK = 10;
export const BASLANGIC_PARASI = 5;
/** Oyuncu 12 yaşında başlar; öğrenme dönemi 12 → 13. */
export const BASLANGIC_AYI_YASI = 12 * 12;

export function karakterYasi(k: { d: number }, ay: number): number {
  return yas(k.d, ay);
}

/** Ocak seçimi: anne-babası yaşayan, çocuğu olabilecek yaşta bir çiftin hanesi; hesaba göre deterministik. */
export function ocakSec(kasaba: Kasaba, hesapId: string): { e: number; an: number; ba: number } {
  const adaylar: Npc[] = [];
  for (const n of kasaba.npc) {
    if (n.k !== 1 || !n.es) continue;
    const y = yas(n.d, kasaba.ay);
    if (y >= 26 && y <= 48 && kasaba.dizin.has(n.es)) adaylar.push(n);
  }
  if (adaylar.length === 0) {
    const yetiskin = kasaba.npc.find((n) => yas(n.d, kasaba.ay) >= 20);
    return yetiskin ? { e: yetiskin.e, an: yetiskin.k ? yetiskin.i : 0, ba: yetiskin.k ? 0 : yetiskin.i } : { e: 0, an: 0, ba: 0 };
  }
  // Az oyuncu barındıran haneler önce: aynı ocağa yığılma olmasın.
  const doluluk = new Map<number, number>();
  for (const s of kasaba.sakin) doluluk.set(s.e, (doluluk.get(s.e) ?? 0) + 1);
  const enAz = Math.min(...adaylar.map((n) => doluluk.get(n.e) ?? 0));
  const uygun = adaylar.filter((n) => (doluluk.get(n.e) ?? 0) === enAz);
  const anne = uygun[karma("ocak", hesapId) % uygun.length] ?? adaylar[0]!;
  return { e: anne.e, an: anne.i, ba: anne.es };
}

/** Yeni karakter: özellikler 4-6 (toplam 30, hesaba göre deterministik), beceriler 0, takat 6. */
export function karakterOlustur(sakin: Omit<Sakin, "e" | "mk" | "ma">, ocak: { e: number; an: number; ba: number }, ay: number): Karakter {
  const oz = [5, 5, 5, 5, 5, 5];
  const h = karma("ozellik", sakin.h);
  const artan = h % 6;
  const azalan = (artan + 1 + ((h >>> 3) % 5)) % 6;
  oz[artan] = 6;
  oz[azalan] = 4;
  return {
    o: sakin.o,
    h: sakin.h,
    ad: sakin.ad,
    k: sakin.k,
    d: sakin.d,
    ...ocak,
    oz,
    be: [0, 0, 0, 0, 0, 0],
    nm: [0, 0, 0, 0],
    op: 0,
    tk: TAKAT_AYLIK,
    ta: ay,
    pa: BASLANGIC_PARASI,
    us: 0,
    mk: "",
    ma: -1e9,
    ka: ay,
    kb: [0, 0, 0, 0, 0, 0],
    kn: [0, 0, 0, 0],
    tn: {},
    im: 0,
    kt: [],
    kz: 0,
    og: 0,
    sy: {},
    kr: "",
    ky: 0,
    en: 0,
    ist: [],
  };
}

/** Takatı bu aya getirir: geçen her ay +6, tavan 18 (kullanılmayan en çok 2 ay taşınır). */
export function takatTazele(k: Karakter, ay: number): void {
  if (ay <= k.ta) return;
  k.tk = Math.min(TAKAT_TAVAN, k.tk + TAKAT_AYLIK * (ay - k.ta));
  k.ta = ay;
}

export function takatHarca(k: Karakter, ay: number, miktar: number): boolean {
  takatTazele(k, ay);
  if (k.tk < miktar) return false;
  k.tk -= miktar;
  return true;
}

function sayacTazele(k: Karakter, ay: number): void {
  if (k.ka === ay) return;
  k.ka = ay;
  k.kb = [0, 0, 0, 0, 0, 0];
  k.kn = [0, 0, 0, 0];
}

/** Beceri kazancı; ay başına tavanlı. Gerçekte eklenen miktarı döndürür. */
export function beceriEkle(k: Karakter, ay: number, b: Beceri, miktar: number): number {
  sayacTazele(k, ay);
  const i = BECERILER.indexOf(b);
  const kalan = BECERI_AYLIK_TAVAN - (k.kb[i] ?? 0);
  const eklenen = Math.max(0, Math.min(miktar, kalan, 100 - (k.be[i] ?? 0)));
  k.be[i] = (k.be[i] ?? 0) + eklenen;
  k.kb[i] = (k.kb[i] ?? 0) + eklenen;
  return eklenen;
}

/** Ödül gibi tavansız beceri artışı (yine 100'ü geçmez). */
export function beceriVer(k: Karakter, b: Beceri, miktar: number): number {
  const i = BECERILER.indexOf(b);
  const eklenen = Math.max(0, Math.min(miktar, 100 - (k.be[i] ?? 0)));
  k.be[i] = (k.be[i] ?? 0) + eklenen;
  return eklenen;
}

export function namEkle(k: Karakter, ay: number, n: Nam, miktar: number): number {
  sayacTazele(k, ay);
  const i = NAMLAR.indexOf(n);
  const kalan = NAM_AYLIK_TAVAN - (k.kn[i] ?? 0);
  const eklenen = Math.max(0, Math.min(miktar, kalan, 100 - (k.nm[i] ?? 0)));
  k.nm[i] = (k.nm[i] ?? 0) + eklenen;
  k.kn[i] = (k.kn[i] ?? 0) + eklenen;
  return eklenen;
}

export function adlandir<T extends readonly string[]>(adlar: T, degerler: number[]): Record<T[number], number> {
  const sonuc = {} as Record<T[number], number>;
  adlar.forEach((a: T[number], i) => (sonuc[a] = degerler[i] ?? 0));
  return sonuc;
}
