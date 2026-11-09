// Yerleşim kroniği (Faz 7): ölüm, devir, oyuncu evliliği ve oyuncu hanesindeki doğum kalıcı satır olarak
// yazılır. Olay defteri sayfaları dönse de kronik kalır (ayrı depo anahtarı `kronik:<sayfa>`, budanmaz).
// Saf kurallar satırı kuyruğa (kasaba.kq) koyar; motor kaydederken sıra verip sayfalara yazar.

import type { Dil } from "../icerik/adlar.ts";
import { paramYaz } from "./ortak.ts";
import type { Kasaba, OlayParam } from "./tipler.ts";

/** [PARAMETRE] Sayfa başına satır, yanıt başına en çok satır. */
export const KRONIK_SAYFA = 64;
export const KRONIK_YANIT_EN_COK = 50;

export type KronikTuru = "olum" | "devir" | "evlilik" | "dogum";

export interface KronikSatiri {
  /** Sıra (motor verir; 1'den artar). */
  s?: number;
  /** Oyun ayı. */
  a: number;
  t: KronikTuru;
  /** i18n anahtarı ve parametreleri. */
  k: string;
  p: Record<string, OlayParam>;
}

export function kronikEkle(kasaba: Kasaba, satir: KronikSatiri): void {
  (kasaba.kq ??= []).push(satir);
}

export function kronikYaz(s: KronikSatiri, dil: Dil) {
  return { sira: s.s ?? 0, ay: s.a, tur: s.t, ozet: { k: s.k, p: paramYaz(s.p, dil) } };
}
