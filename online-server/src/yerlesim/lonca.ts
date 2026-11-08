// Lonca tablosu (ana tasarım §5.5, §14.4.4): yerleşimde hangi mesleklerin dolu, hangilerinin boş olduğu.
// Oyuncu sayısı sakin dizininden (karakterleri yüklemeden), NPC sayısı yetişkin NPC mesleklerinden gelir.

import { MESLEKLER } from "../icerik/kisilik.ts";
import { MESLEK_IDLERI, NPC_MESLEK_ESLEME, type MeslekId } from "../icerik/meslekler.ts";
import { yas } from "./ortak.ts";
import type { Kasaba } from "./tipler.ts";

/** [PARAMETRE] Durum eşikleri: 0 oyuncu boş, 1 az, en az 2 dolu. NPC yetişkinlik yaşı. */
export const LONCA_DOLU = 2;
export const NPC_YETISKIN = 16;

export type LoncaDurumu = "bos" | "az" | "dolu";
export interface LoncaSatiri {
  meslek: MeslekId;
  oyuncu: number;
  npc: number;
  durum: LoncaDurumu;
}

export function oyuncuSayaci(k: Kasaba): (m: MeslekId) => number {
  const say = new Map<MeslekId, number>();
  for (const s of k.sakin) if (s.ms) say.set(s.ms, (say.get(s.ms) ?? 0) + 1);
  return (m) => say.get(m) ?? 0;
}

export function loncaTablosu(k: Kasaba): LoncaSatiri[] {
  const oyuncu = oyuncuSayaci(k);
  const npc = new Map<MeslekId, number>();
  for (const n of k.npc) {
    if (yas(n.d, k.ay) < NPC_YETISKIN) continue;
    const m = NPC_MESLEK_ESLEME[MESLEKLER[n.m] ?? ""];
    if (m) npc.set(m, (npc.get(m) ?? 0) + 1);
  }
  return MESLEK_IDLERI.map((meslek) => {
    const o = oyuncu(meslek);
    return { meslek, oyuncu: o, npc: npc.get(meslek) ?? 0, durum: o === 0 ? "bos" : o < LONCA_DOLU ? "az" : "dolu" };
  });
}
