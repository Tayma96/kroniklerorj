// Gelir-gider defteri (Faz 6): oyuncunun akçesindeki her değişim bir kaleme yazılır (NPC satışı, alım, sipariş,
// pazar, ısmarlama, teklif, ay dönümü...). Son DEFTER_AY ay tutulur; ay başına kalem → net akçe. Motor her yazma
// isteğinde ve ay dönümünde akçe farkını yazar, böylece defterin toplamı akçe değişiminin kendisidir. Saf fonksiyonlar.

import type { Karakter } from "./tipler.ts";

/** [PARAMETRE] Defterde tutulan ay sayısı ve ay başına en çok kalem (fazlası "diger"de birleşir). */
export const DEFTER_AY = 12;
export const DEFTER_KALEM_EN_COK = 16;

/** [ay, kalem → net akçe (+ gelir, − gider)]. */
export type DefterAyi = [ay: number, kalemler: Record<string, number>];

/** Bilinen kalemler (istemci metni `onl.defter.<kalem>`); başkası "diger" sayılır. */
export const DEFTER_KALEMLERI = [
  "npcSatis",
  "npcAlim",
  "siparis",
  "pazarSatis",
  "pazarAlim",
  "pazarEmanet",
  "pazarIade",
  "bac",
  "ismarlamaGelir",
  "ismarlamaEmanet",
  "ismarlamaIade",
  "teklif",
  "ikram",
  "eylem",
  "beceri",
  "hanedan",
  "donum",
  "topluluk",
  "darbe",
  "diger",
] as const;
export type DefterKalemi = (typeof DEFTER_KALEMLERI)[number];

/** Akçe farkını deftere yazar (0 yazılmaz). */
export function defterYaz(k: Karakter, ay: number, kalem: string, tutar: number): void {
  if (!Number.isFinite(tutar) || tutar === 0) return;
  const ad = (DEFTER_KALEMLERI as readonly string[]).includes(kalem) ? kalem : "diger";
  const df = (k.df ??= []);
  let son = df[df.length - 1];
  if (!son || son[0] !== ay) {
    son = [ay, {}];
    df.push(son);
  }
  const kalemler = son[1];
  const yer = Object.hasOwn(kalemler, ad) || Object.keys(kalemler).length < DEFTER_KALEM_EN_COK ? ad : "diger";
  kalemler[yer] = (kalemler[yer] ?? 0) + tutar;
  if (kalemler[yer] === 0) delete kalemler[yer];
  // Pencere dışındaki aylar düşer.
  while (df.length > 0 && df[0]![0] <= ay - DEFTER_AY) df.shift();
}

export interface DefterGorunumu {
  aylar: { ay: number; kalemler: { k: string; d: number }[]; gelir: number; gider: number; net: number }[];
  toplam: { gelir: number; gider: number; net: number };
  /** Kalem başına pencere toplamı (en büyük mutlak değer önce). */
  kalemler: { k: string; d: number }[];
}

/** Son `n` ayın dökümü (en yeni önce). */
export function defterGorunumu(k: Karakter, ay: number, n = DEFTER_AY): DefterGorunumu {
  const pencere = Math.max(1, Math.min(DEFTER_AY, Math.floor(n)));
  const aylar = (k.df ?? [])
    .filter(([a]) => a > ay - pencere && a <= ay)
    .slice()
    .reverse()
    .map(([a, km]) => {
      const kalemler = Object.entries(km)
        .map(([kk, d]) => ({ k: kk, d }))
        .sort((x, y) => Math.abs(y.d) - Math.abs(x.d) || (x.k < y.k ? -1 : 1));
      const gelir = kalemler.filter((x) => x.d > 0).reduce((s, x) => s + x.d, 0);
      const gider = kalemler.filter((x) => x.d < 0).reduce((s, x) => s - x.d, 0);
      return { ay: a, kalemler, gelir, gider, net: gelir - gider };
    });
  const toplam = aylar.reduce((t, a) => ({ gelir: t.gelir + a.gelir, gider: t.gider + a.gider, net: t.net + a.net }), { gelir: 0, gider: 0, net: 0 });
  const birikim = new Map<string, number>();
  for (const a of aylar) for (const x of a.kalemler) birikim.set(x.k, (birikim.get(x.k) ?? 0) + x.d);
  const kalemler = [...birikim.entries()]
    .filter(([, d]) => d !== 0)
    .map(([kk, d]) => ({ k: kk, d }))
    .sort((x, y) => Math.abs(y.d) - Math.abs(x.d) || (x.k < y.k ? -1 : 1));
  return { aylar, toplam, kalemler };
}
