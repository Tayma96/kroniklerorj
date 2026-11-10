// Topluluk kaydı (Ek A §3, E6–E7): yerleşim başına tek kayıt (depo anahtarı "tl"; eski kayıtta yok → ilk yazımda
// kurulur). Hami bağları, ortak dertler, şenlik katkıları, zaviyeler ve bölge göstergeleri (arz, moral). Yalnız veri
// biçimi ve gösterge yardımcıları; kurallar hami.ts, ortak-dert.ts, senlik.ts, lonca-grup.ts'dedir.
//
// Bölge göstergeleri (D-35): ortak dert başarısızlığı OYUNCU KARAKTERİNİ değil yalnız bunları düşürür; tabanı ve
// aylık dönüşü vardır. Etkisiz gösterge olmasın diye kasaba olayı olasılığına çarpan olarak döner
// (`gostergeTetikCarpani`: düşük arz kıtlığı, düşük moral haydudu sıklaştırır; tavanlı, görünümde yazılı).

import type { HamiBagi } from "./hami.ts";
import type { OrtakDert } from "./ortak-dert.ts";
import type { SenlikKaydi } from "./senlik.ts";
import type { Zaviye } from "./lonca-grup.ts";
import type { Kasaba } from "./tipler.ts";

export const GOSTERGELER = ["arz", "moral"] as const;
export type Gosterge = (typeof GOSTERGELER)[number];
/** [PARAMETRE] Gösterge dengesi, tabanı, tavanı ve aylık dengeye dönüşü. */
export const GOSTERGE_DENGE = 50;
export const GOSTERGE_TABAN = 20;
export const GOSTERGE_TAVAN = 80;
export const GOSTERGE_AYLIK_DONUS = 2;
/** [PARAMETRE] Dengenin altındaki her puan kasaba olayı olasılığını bu oranda artırır; çarpan tavanı. */
export const GOSTERGE_TETIK_ORANI = 0.01;
export const GOSTERGE_TETIK_TAVAN = 1.3;

export interface ToplulukKaydi {
  /** Hami bağları (açık teklifler, sürenler, son kapananlar). */
  hb: HamiBagi[];
  /** Ortak dertler ve sonraki kimlik. */
  od: OrtakDert[];
  on: number;
  /** Şenlik katkı kayıtları (açık ve son kapananlar). */
  sn: SenlikKaydi[];
  /** Zaviyeler ve sonraki kimlik. */
  zv: Zaviye[];
  zn: number;
  /** Bölge göstergeleri: [arz, moral]. */
  gs: [arz: number, moral: number];
  /** Son salgın ayı (aralık). */
  ss?: number;
}

export function toplulukAl(k: Kasaba): ToplulukKaydi {
  k.tl ??= { hb: [], od: [], on: 1, sn: [], zv: [], zn: 1, gs: [GOSTERGE_DENGE, GOSTERGE_DENGE] };
  return k.tl;
}

export function gostergeOku(k: Pick<Kasaba, "tl">, g: Gosterge): number {
  return k.tl?.gs[GOSTERGELER.indexOf(g)] ?? GOSTERGE_DENGE;
}

/** Göstergeyi değiştirir (taban/tavan içinde); gerçekte uygulanan farkı döndürür. */
export function gostergeDegistir(tl: ToplulukKaydi, g: Gosterge, d: number): number {
  const i = GOSTERGELER.indexOf(g);
  const once = tl.gs[i] ?? GOSTERGE_DENGE;
  const yeni = Math.max(GOSTERGE_TABAN, Math.min(GOSTERGE_TAVAN, once + d));
  tl.gs[i] = yeni;
  return yeni - once;
}

/** Aylık dengeye dönüş. */
export function gostergeDonumu(tl: ToplulukKaydi): void {
  tl.gs.forEach((v, i) => {
    tl.gs[i] = v > GOSTERGE_DENGE ? Math.max(GOSTERGE_DENGE, v - GOSTERGE_AYLIK_DONUS) : Math.min(GOSTERGE_DENGE, v + GOSTERGE_AYLIK_DONUS);
  });
}

/** Kasaba olayı olasılık çarpanı: kıtlık ← arz, haydut ← moral (yalnız dengenin altı; tavanlı). */
export function gostergeTetikCarpani(k: Pick<Kasaba, "tl">, tetik: string): number {
  const g: Gosterge | undefined = tetik === "kitlik" ? "arz" : tetik === "haydut" ? "moral" : undefined;
  if (!g) return 1;
  const eksik = Math.max(0, GOSTERGE_DENGE - gostergeOku(k, g));
  return Math.min(GOSTERGE_TETIK_TAVAN, 1 + eksik * GOSTERGE_TETIK_ORANI);
}

/** Okunur görünüm (siyaset ve istemci): değerler ve etkileri. */
export function gostergeGorunumu(k: Pick<Kasaba, "tl">) {
  return {
    arz: gostergeOku(k, "arz"),
    moral: gostergeOku(k, "moral"),
    denge: GOSTERGE_DENGE,
    taban: GOSTERGE_TABAN,
    tavan: GOSTERGE_TAVAN,
    etkiler: [
      { k: "topluluk.gosterge.kitlik", p: { carpan: gostergeTetikCarpani(k, "kitlik") } },
      { k: "topluluk.gosterge.haydut", p: { carpan: gostergeTetikCarpani(k, "haydut") } },
    ],
  };
}
