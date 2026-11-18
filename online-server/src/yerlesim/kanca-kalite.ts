// Kanca partisi 2: hizmet dışı sistemlerde (kervan, görev, iş sözleşmesi, arabuluculuk) `kalite` etkisi okuma.
// Kişinin öğrenilmiş düğümlerindeki, hedefi verilen listede olan `kalite` etkilerinin toplamı ve kalemleri (gizli sayı
// yok). Tavanı tüketen sistem koyar (tek yığılma: aynı sistemin bütün kalite hedefleri toplanır, sonra kırpılır). Saf.

import { acikEtkiler } from "./beceri-etki.ts";
import type { Karakter } from "./tipler.ts";

export interface KaliteToplami {
  yuzde: number;
  kalemler: { kanca: string; d: number }[];
}

export function kaliteYuzdesi(k: Karakter, hedefler: readonly string[]): KaliteToplami {
  let yuzde = 0;
  const kalemler: { kanca: string; d: number }[] = [];
  for (const e of acikEtkiler(k)) {
    if (e.tur !== "kalite" || !hedefler.includes(e.hedef)) continue;
    yuzde += e.yuzde;
    const kanca = `kalite:${e.hedef}`;
    const x = kalemler.find((y) => y.kanca === kanca);
    if (x) x.d += e.yuzde;
    else kalemler.push({ kanca, d: e.yuzde });
  }
  return { yuzde, kalemler };
}
