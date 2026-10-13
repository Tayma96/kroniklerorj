export type SohbetKonu = "dert" | "aile" | "is" | "hedef";
export type SohbetYanit = "dinle" | "sor" | "itiraz" | "destek" | "sinir" | "kapat";
export interface Konusma {
  v: 1; t: number; konu: SohbetKonu; adim: 1 | 2 | 3;
  bag: string; ilk?: "dinle" | "sor" | "itiraz"; son?: SohbetYanit; satir?: string;
}
export const SOHBET_KONULARI: SohbetKonu[] = ["dert", "aile", "is", "hedef"];
export function konusmaGecerli(k?: Konusma): k is Konusma {
  return k?.v === 1 && Number.isFinite(k.t) && SOHBET_KONULARI.includes(k.konu) && [1, 2, 3].includes(k.adim) && typeof k.bag === "string" && (k.ilk === undefined || ["dinle", "sor", "itiraz"].includes(k.ilk)) && (k.adim === 1 || !!k.ilk) && (k.adim !== 3 || typeof k.satir === "string");
}
export function ilkSozEtkisi(yanit: Konusma["ilk"], huy: string): number {
  if (yanit === "dinle") return 1;
  if (yanit !== "itiraz") return 0;
  return ["mert", "dindar", "ciddi"].includes(huy) ? 1 : ["utangaç", "dertli", "yalnız", "sabırlı"].includes(huy) ? -1 : -2;
}
export function ilkSozAnahtari(yanit: Konusma["ilk"], huy: string): string {
  return "sohbet.cevap." + (yanit === "itiraz" ? ilkSozEtkisi(yanit, huy) > 0 ? "itirazAcik" : "itirazSoguk" : yanit === "sor" ? "sor" : "dinle");
}
