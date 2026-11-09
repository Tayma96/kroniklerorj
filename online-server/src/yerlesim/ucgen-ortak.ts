// Üçgen eylemlerinin ortak parçaları: bağlam/çıktı biçimi, kimlik yazımı, şans dökümü kurucusu, takat bedelleri.

import { SANS_ALT, SANS_UST } from "./eylem.ts";
import { sinirla } from "./ortak.ts";
import type { Dokum, IliskiHaritasi, Kalem, Karakter, Kasaba, OlayTaslagi, Sakin } from "./tipler.ts";

export const UCGEN_TURLERI = ["kiskirt", "katil", "sozBoz", "araciIste", "araciKapat", "arabulucu", "sartOde", "casus"] as const;
export type UcgenTuru = (typeof UCGEN_TURLERI)[number];

/** [PARAMETRE] Takat bedelleri. */
export const UCGEN_TAKAT: Readonly<Record<UcgenTuru, number>> = {
  kiskirt: 1,
  katil: 1,
  sozBoz: 0,
  araciIste: 0,
  araciKapat: 0,
  arabulucu: 1,
  sartOde: 0,
  casus: 1,
};
/** [PARAMETRE] Aynı (fail, NPC, tür) tekrarında şans cezası (AZALAN_PENCERE içinde, tekrar başına). */
export const TEKRAR_CEZASI = 10;
/** §13.9: bu bakışın üstündeki NPC'nin üçüncü kişilere bakışı görünür (motor.YAKINLIK_ESIGI ile aynı). */
export const GORUNURLUK_ESIGI = 30;

export interface UcgenBaglami {
  k: Kasaba;
  kar: Karakter;
  ili: IliskiHaritasi;
  s: Sakin;
  ay: number;
}

export interface UcgenCiktisi {
  yanit: Record<string, unknown>;
  olaylar: OlayTaslagi[];
  /** Değişen öteki oyuncular (motor yazar). */
  digerleri: string[];
}

export const sozKimlik = (i: number): string => `z${i}`;
export const talepKimlik = (i: number): string => `r${i}`;
export const casusKimlik = (i: number): string => `c${i}`;

/** "z12" → 12 (önek isteğe bağlı değil). */
export function kimlikCoz(ham: unknown, onek: string): number | undefined {
  if (typeof ham !== "string" || ham.length > 12) return undefined;
  const m = new RegExp(`^${onek}([1-9][0-9]{0,8})$`).exec(ham);
  return m?.[1] ? Number(m[1]) : undefined;
}

/** Şans dökümü kurucusu: sıfır kalem yazılmaz; `bitir` 5..95'e kırpar, fark "sans.sinir" kalemiyle görünür. */
export function dokumKur() {
  const kalemler: Kalem[] = [];
  let ham = 0;
  return {
    ekle(k: string, d: number, p?: Record<string, string | number>) {
      if (d === 0) return;
      ham += d;
      kalemler.push(p ? { k, d, p } : { k, d });
    },
    bitir(alt = SANS_ALT, ust = SANS_UST): Dokum {
      const toplam = sinirla(ham, alt, ust);
      if (toplam !== ham) kalemler.push({ k: "sans.sinir", d: toplam - ham });
      return { toplam, kalemler };
    },
  };
}

export const zarAt = (zar: () => number): number => 1 + Math.floor(zar() * 100);
