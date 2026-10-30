// Dönüş Kartı: oyuncunun son gelişinden beri olanlardan en önemli 5 madde. Önce kendisine ve tanıdıklarına
// dokunanlar (§6.0), sonra önem, sonra yenilik. Kendi eylemleri ve başkasına özel olaylar karta girmez.

import type { Karakter, Olay } from "./tipler.ts";

export const DONUS_KARTI_EN_COK = 5;

export function gorebilir(o: Olay, kar: Karakter): boolean {
  return o.g === "" || o.g === kar.o;
}

/** 0 ilgisiz, 1 tanıdık, 2 dost/düşman işaretli, 3 doğrudan kendisi. */
function yakinlik(o: Olay, kar: Karakter): number {
  if (o.h === kar.o) return 3;
  const w = o.w ? kar.tn[o.w] : undefined;
  const h = o.h ? kar.tn[o.h] : undefined;
  if (w === "dost" || w === "dusman" || h === "dost" || h === "dusman") return 2;
  if (w || h) return 1;
  return 0;
}

export function donusKartiSec(olaylar: readonly Olay[], kar: Karakter, enCok = DONUS_KARTI_EN_COK): Olay[] {
  return olaylar
    .filter((o) => gorebilir(o, kar) && (o.w !== kar.o || o.h === kar.o))
    .map((o) => ({ o, y: yakinlik(o, kar) }))
    .sort((a, b) => b.y - a.y || b.o.n - a.o.n || b.o.s - a.o.s)
    .slice(0, enCok)
    .map((x) => x.o);
}
