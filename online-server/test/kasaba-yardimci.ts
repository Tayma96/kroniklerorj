// Yerleşim testleri için küçük kurucular: tohumdan kasaba ve sakin oyuncu.

import { yerlesimBul } from "../src/dunya-veri.ts";
import { karakterOlustur, ocakSec } from "../src/yerlesim/karakter.ts";
import type { Karakter, Kasaba, Npc, Sakin } from "../src/yerlesim/tipler.ts";
import { kasabaKur } from "../src/yerlesim/uret.ts";
import { yas } from "../src/yerlesim/ortak.ts";

export function testKasabasi(id = "develi", ay = 0): Kasaba {
  const y = yerlesimBul(id);
  if (!y) throw new Error(`yerleşim yok: ${id}`);
  return kasabaKur(y, ay);
}

/** Kasabaya sakin oyuncu ekler (öntanımlı: tam 12 yaşında, bu ay gelmiş). */
export function oyuncuEkle(k: Kasaba, no = 1, dogumAyi = k.ay - 144): Karakter {
  const o = `o${no}`;
  const h = `hesap-${no}`;
  const ocak = ocakSec(k, h);
  const s: Sakin = { o, h, ad: `Oyuncu${no}`, k: (no % 2) as 0 | 1, d: dogumAyi, e: ocak.e, mk: "", ma: -1e9 };
  const kar = karakterOlustur(s, ocak, k.ay);
  k.sakin.push(s);
  k.kar.set(o, kar);
  k.ili.set(o, {});
  return kar;
}

/** Oyuncunun hanesinden olmayan, verilen yaş aralığında, süzgeçten geçen ilk NPC. */
export function npcBul(k: Kasaba, kar: Karakter, alt: number, ust: number, suzgec: (n: Npc) => boolean = () => true): Npc {
  const n = k.npc.find((x) => x.e !== kar.e && yas(x.d, k.ay) >= alt && yas(x.d, k.ay) <= ust && suzgec(x));
  if (!n) throw new Error("uygun NPC yok");
  return n;
}

/** Her zaman 1 atan zar (başarı), ya da 100 atan zar (başarısızlık). */
export const hepBasari = () => 0;
export const hepBasarisiz = () => 0.999;
