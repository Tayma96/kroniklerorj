// Üçgen testleri için senaryo kurucusu: Ahmet (fail), Berkay (hedef), Hasan (Berkay'ın dostu) oyuncular; Murat NPC.
// Murat→Berkay ve Murat→Hasan görüşleri ilişki tabanıyla istenen değere oturtulur.

import { HUYLAR } from "../src/icerik/kisilik.ts";
import { iliskiAl } from "../src/yerlesim/eylem.ts";
import { gorusDegeri } from "../src/yerlesim/gorus.ts";
import { ciftSirala, toplumAl } from "../src/yerlesim/toplum.ts";
import type { Karakter, Kasaba, Npc, Sakin } from "../src/yerlesim/tipler.ts";
import type { UcgenBaglami } from "../src/yerlesim/ucgen-ortak.ts";
import { npcBul, oyuncuEkle, testKasabasi } from "./kasaba-yardimci.ts";

export interface Senaryo {
  k: Kasaba;
  ahmet: Karakter;
  berkay: Karakter;
  hasan: Karakter;
  murat: Npc;
}

/** NPC'nin oyuncuya görüşünü ilişki tabanıyla `hedef` değerine oturtur. */
export function gorusAyarla(k: Kasaba, n: Npc, kar: Karakter, hedef: number): void {
  const ili = k.ili.get(kar.o)!;
  const i = iliskiAl(ili, n.i);
  i.t = 0;
  i.t = hedef - gorusDegeri(k, n, kar, ili, k.ay);
}

export function dostYap(k: Kasaba, x: string, y: string): void {
  const [a, b] = ciftSirala(x, y);
  toplumAl(k).ob.push({ a, b, d: "dost", ay: k.ay });
}

export function senaryo(huy = "kurnaz", muratBerkay = -42, muratHasan = 35): Senaryo {
  const k = testKasabasi("develi", 400);
  const yas20 = k.ay - 240;
  const ahmet = oyuncuEkle(k, 1, yas20);
  const berkay = oyuncuEkle(k, 2, yas20);
  const hasan = oyuncuEkle(k, 3, yas20);
  const haneler = [ahmet.e, berkay.e, hasan.e];
  const murat = npcBul(k, ahmet, 25, 50, (n) => !haneler.includes(n.e) && n.b.length > 0);
  murat.h = HUYLAR.indexOf(huy);
  // Üçlü arasında dostunun dostu / düşmanının dostu etkisi olmasın: Murat'ın bağları sabit kalsın.
  gorusAyarla(k, murat, berkay, muratBerkay);
  gorusAyarla(k, murat, hasan, muratHasan);
  return { k, ahmet, berkay, hasan, murat };
}

export function baglam(k: Kasaba, kar: Karakter): UcgenBaglami {
  const s = k.sakin.find((x) => x.o === kar.o) as Sakin;
  return { k, kar, ili: k.ili.get(kar.o)!, s, ay: k.ay };
}

/** Kasabanın derin kopyası (Map'ler dahil): her tohum aynı başlangıçtan oynanır. */
export function kopya<T>(x: T): T {
  return structuredClone(x);
}
