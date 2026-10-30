// Küçük ortak yardımcılar: yaş, kişi kimlikleri, ad yazımı, meslek gösterimi.

import { AD_HAVUZLARI, DILLER, soyadCinsli, type Dil } from "../icerik/adlar.ts";
import { MESLEKLER } from "../icerik/kisilik.ts";
import type { Kasaba, KisiRef, Npc, OlayParam } from "./tipler.ts";

export function yas(dogumAyi: number, ay: number): number {
  return Math.floor((ay - dogumAyi) / 12);
}

export const npcKimlik = (i: number): string => `n${i}`;

export type KisiKimligi = { tur: "npc"; i: number } | { tur: "oyuncu"; o: string };

export function kisiCoz(ham: unknown): KisiKimligi | undefined {
  if (typeof ham !== "string" || ham.length > 16) return undefined;
  const m = /^(n|o)([1-9][0-9]{0,8})$/.exec(ham);
  if (!m?.[2]) return undefined;
  return m[1] === "n" ? { tur: "npc", i: Number(m[2]) } : { tur: "oyuncu", o: ham };
}

export function dilCoz(ham: unknown): Dil {
  return typeof ham === "string" && (DILLER as readonly string[]).includes(ham) ? (ham as Dil) : "tr";
}

export function npcAdi(n: { a: number; s: number; k: 0 | 1 }, dil: Dil): string {
  const h = AD_HAVUZLARI[dil];
  const ad = (n.k ? h.f : h.m)[n.a] ?? "?";
  return `${ad} ${soyadCinsli(h.s[n.s] ?? "", dil, n.k === 1)}`;
}

export function npcRef(n: Npc): KisiRef {
  return { i: npcKimlik(n.i), a: n.a, s: n.s, k: n.k };
}

export function oyuncuRef(o: { o: string; ad: string }): KisiRef {
  return { i: o.o, ad: o.ad };
}

/** Olay parametrelerini okunur hale getirir: kişi başvuruları {id, ad} olur. */
export function paramYaz(p: Record<string, OlayParam>, dil: Dil): Record<string, unknown> {
  const sonuc: Record<string, unknown> = {};
  for (const [a, v] of Object.entries(p)) {
    if (typeof v === "object") {
      const ad = v.ad ?? (v.a !== undefined && v.s !== undefined ? npcAdi({ a: v.a, s: v.s, k: v.k ?? 0 }, dil) : "?");
      sonuc[a] = { id: v.i, ad };
    } else sonuc[a] = v;
  }
  return sonuc;
}

/** Yaşa göre meslek gösterimi (tek oyunculudaki npcAgeProfession kuralı): 7 altı çocuk, 14 altı çırak. */
export function meslekGorunumu(n: Npc, ay: number): string {
  const y = yas(n.d, ay);
  if (y < 7) return "çocuk";
  if (y < 14) return "çırak";
  return MESLEKLER[n.m] ?? "işsiz";
}

/** Kişinin (NPC ya da sakin oyuncu) adı. */
export function kisiAdi(kasaba: Kasaba, id: string, dil: Dil): string | undefined {
  const k = kisiCoz(id);
  if (!k) return undefined;
  if (k.tur === "npc") {
    const n = kasaba.dizin.get(k.i);
    return n ? npcAdi(n, dil) : undefined;
  }
  return kasaba.sakin.find((s) => s.o === k.o)?.ad;
}

export const sinirla = (x: number, alt: number, ust: number): number => (x < alt ? alt : x > ust ? ust : x);
