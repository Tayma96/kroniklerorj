// Tek zar (K1, Fallen London "Broad"): her stat/beceri sınaması aynı formülle, görünür kalemlerle çözülür.
// Saf modül: oyun durumuna dokunmaz. Durumdan güç toplayan `zar`/`zarOrani` game.ts içindedir.
// oran = clamp(0.6 + 0.08 × (etkinGüç − zorluk), 0.08, 0.95) — güç = zorluk iken %60.

export const ZAR_TABAN = 0.6;
export const ZAR_ADIM = 0.08;
export const ZAR_ALT = 0.08;
export const ZAR_UST = 0.95;

// etiket: i18n anahtarı (ör. "st.intelligence", "zar.kalem.beceri"); deger: güce katkı (zorluk eksi olarak gelir).
export interface ZarKalemi { etiket: string; deger: number }
export type ZarKademe = "guvenli" | "makul" | "riskli" | "umutsuz";

export function zarOranHesapla(guc: number, zorluk: number): number {
  const o = ZAR_TABAN + ZAR_ADIM * (guc - zorluk);
  return Math.max(ZAR_ALT, Math.min(ZAR_UST, o));
}

// Kademe etiketi: güvenli ≥0.75, makul 0.50–0.74, riskli 0.25–0.49, umutsuz <0.25.
export function zarKademe(oran: number): ZarKademe {
  return oran >= 0.75 ? "guvenli" : oran >= 0.5 ? "makul" : oran >= 0.25 ? "riskli" : "umutsuz";
}
