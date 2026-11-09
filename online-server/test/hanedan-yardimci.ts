// Hanedan testleri için kurucular: evli oyuncu, istenen yaşta çocuk, toplam akçe.

import { evlilikKapisi, evlilikKaydet, oyuncuCocuguDogur, type Taraf } from "../src/yerlesim/evlilik.ts";
import { npcKimlik, yas } from "../src/yerlesim/ortak.ts";
import { tohumlu } from "../src/yerlesim/rastgele.ts";
import type { Karakter, Kasaba, Npc } from "../src/yerlesim/tipler.ts";

/** Oyuncuyu kapıdan geçen ilk NPC ile evlendirir. */
export function npcIleEvlendir(k: Kasaba, kar: Karakter): Npc {
  const n = k.npc.find((x) => evlilikKapisi(k, kar, npcKimlik(x.i), k.ay) === undefined);
  if (!n) throw new Error("uygun eş yok");
  evlilikKaydet(k, kar, npcKimlik(n.i), k.ay);
  return n;
}

/** Evli oyuncuya verilen yaşta çocuk ekler (doğum kuralıyla, sonra doğum ayı geri alınır). */
export function cocukEkle(k: Kasaba, kar: Karakter, yasYil: number, tohum = 0): Npc {
  const es = kar.hd?.es;
  const esTaraf: Taraf = es?.startsWith("n") ? { tur: "npc", n: k.dizin.get(Number(es.slice(1)))! } : { tur: "oyuncu", k: k.kar.get(es!)! };
  const ben: Taraf = { tur: "oyuncu", k: kar };
  const [anne, baba] = kar.k === 1 ? [ben, esTaraf] : [esTaraf, ben];
  const c = oyuncuCocuguDogur(k, anne, baba, k.ay, tohumlu("test-cocuk", kar.o, tohum, yasYil));
  c.d = k.ay - yasYil * 12;
  if (yas(c.d, k.ay) !== yasYil) throw new Error("yaş");
  return c;
}

/** Kasabadaki bütün akçe: karakterler (ölüler dahil) + hazine + vakıf + emanet. */
export function toplamAkce(k: Kasaba): number {
  let t = 0;
  for (const kar of k.kar.values()) t += kar.pa;
  const hd = k.hd;
  if (hd) t += hd.hz + hd.vk + Object.values(hd.em).reduce((a, b) => a + b, 0);
  return t;
}
