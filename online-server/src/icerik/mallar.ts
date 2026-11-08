// Çevrimiçi mallar ve NPC taban fiyatları (ana tasarım §5.4–5.5). Fiyatlar akçedir. [PARAMETRE]
// `meslek`: malı asıl üreten meslek (lonca doluluğu ve kıtlık primi buna göre hesaplanır).

import type { MeslekId } from "./meslekler.ts";

export const MAL_IDLERI = [
  "odun",
  "sertOdun",
  "tas",
  "ot",
  "yun",
  "su",
  "kereste",
  "cevher",
  "komur",
  "tahil",
  "deri",
  "alet",
  "nal",
  "sifaliOt",
  "inceYun",
] as const;
export type MalId = (typeof MAL_IDLERI)[number];

/** taban: NPC'nin oyuncudan alırken ödediği temel değer; 0 = ticareti yapılmaz (su). */
export const MALLAR: Record<MalId, { taban: number; meslek: MeslekId }> = {
  odun: { taban: 1, meslek: "oduncu" },
  sertOdun: { taban: 4, meslek: "oduncu" },
  tas: { taban: 1, meslek: "oduncu" },
  ot: { taban: 1, meslek: "sifaci" },
  yun: { taban: 2, meslek: "ciftci" },
  su: { taban: 0, meslek: "hanci" },
  kereste: { taban: 3, meslek: "oduncu" },
  cevher: { taban: 3, meslek: "oduncu" },
  komur: { taban: 2, meslek: "oduncu" },
  tahil: { taban: 2, meslek: "ciftci" },
  deri: { taban: 3, meslek: "dokumaci" },
  alet: { taban: 8, meslek: "demirci" },
  nal: { taban: 3, meslek: "demirci" },
  sifaliOt: { taban: 3, meslek: "sifaci" },
  inceYun: { taban: 4, meslek: "ciftci" },
};

export function malBul(id: unknown): MalId | undefined {
  return typeof id === "string" && Object.hasOwn(MALLAR, id) ? (id as MalId) : undefined;
}
