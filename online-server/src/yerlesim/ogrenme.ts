// Öğrenme dönemi (12 → 13 yaş = 12 oyun ayı = 6 gerçek gün): her gerçek gün (2 oyun ayı) bir sistem açılır.
// Her günün bir hedefi ve bir kez verilen küçük bir ödülü vardır; kaçırılan günün hedefi sonra da yapılabilir.

import { BASLANGIC_AYI_YASI, beceriVer, type Beceri } from "./karakter.ts";
import type { Karakter } from "./tipler.ts";

export const OGRENME_SURESI_AY = 12;
export const GUN_BASINA_AY = 2;

export interface Odul {
  para?: number;
  beceri?: [Beceri, number];
  ozellikPuani?: number;
}

export interface OgrenmeGunu {
  gun: number;
  /** Açılan sistem (i18n: ogrenme.sistem.<sistem>, ogrenme.hedef.<sistem>). */
  sistem: string;
  /** Bu günle açılan eylemler ve işaretler. */
  acilan: readonly string[];
  /** Hedef: karakter sayacı en az `sayi` olmalı. */
  sayac: string;
  sayi: number;
  odul: Odul;
}

export const OGRENME_GUNLERI: readonly OgrenmeGunu[] = [
  { gun: 1, sistem: "mahalle", acilan: ["sohbet", "yardim", "tanidik"], sayac: "sohbet", sayi: 2, odul: { para: 3 } },
  { gun: 2, sistem: "ciraklik", acilan: ["cirak"], sayac: "cirak", sayi: 1, odul: { beceri: ["zanaat", 2] } },
  { gun: 3, sistem: "mektep", acilan: ["mektep", "puan"], sayac: "mektep", sayi: 1, odul: { ozellikPuani: 1 } },
  { gun: 4, sistem: "ayakIsi", acilan: ["ayakIsi"], sayac: "ayakIsi", sayi: 2, odul: { para: 3 } },
  { gun: 5, sistem: "dostluk", acilan: ["hediye", "dost", "dusman"], sayac: "dostluk", sayi: 1, odul: { beceri: ["soz", 2] } },
  { gun: 6, sistem: "karar", acilan: ["karar"], sayac: "karar", sayi: 1, odul: { ozellikPuani: 1 } },
];

const ACILIS = new Map<string, number>(OGRENME_GUNLERI.flatMap((g) => g.acilan.map((a) => [a, g.gun] as const)));

export function ogrenmeBaslangici(k: { d: number }): number {
  return k.d + BASLANGIC_AYI_YASI;
}

/** Bugün öğrenme döneminin kaçıncı günü (1-6); dönem bitince 6 kalır (her şey açık). */
export function ogrenmeGunu(k: { d: number }, ay: number): number {
  const gecen = ay - ogrenmeBaslangici(k);
  if (gecen < 0) return 1;
  return Math.min(OGRENME_GUNLERI.length, Math.floor(gecen / GUN_BASINA_AY) + 1);
}

export function ogrenmeSuruyor(k: { d: number }, ay: number): boolean {
  return ay - ogrenmeBaslangici(k) < OGRENME_SURESI_AY;
}

/** Sistem ya da eylem açık mı? Listede olmayanlar baştan açıktır. */
export function acikMi(k: { d: number }, ay: number, sistem: string): boolean {
  return (ACILIS.get(sistem) ?? 1) <= ogrenmeGunu(k, ay);
}

export function sayacArtir(k: Karakter, sayac: string, miktar = 1): void {
  k.sy[sayac] = (k.sy[sayac] ?? 0) + miktar;
}

export interface VerilenOdul {
  gun: number;
  odul: Odul;
}

/** Açılmış günlerin tamamlanan hedeflerinin ödülünü bir kez verir (kaçırılan gün sonra da tamamlanır). */
export function ogrenmeIlerle(k: Karakter, ay: number): VerilenOdul[] {
  const bugun = ogrenmeGunu(k, ay);
  const verilen: VerilenOdul[] = [];
  for (const g of OGRENME_GUNLERI) {
    const bit = 1 << (g.gun - 1);
    if (g.gun > bugun || k.og & bit || (k.sy[g.sayac] ?? 0) < g.sayi) continue;
    k.og |= bit;
    if (g.odul.para) k.pa += g.odul.para;
    if (g.odul.beceri) beceriVer(k, g.odul.beceri[0], g.odul.beceri[1]);
    if (g.odul.ozellikPuani) k.op += g.odul.ozellikPuani;
    verilen.push({ gun: g.gun, odul: g.odul });
  }
  return verilen;
}

export function ogrenmeDurumu(k: Karakter, ay: number) {
  const bugun = ogrenmeGunu(k, ay);
  return {
    gun: bugun,
    suruyor: ogrenmeSuruyor(k, ay),
    gunler: OGRENME_GUNLERI.map((g) => ({
      gun: g.gun,
      sistem: g.sistem,
      acik: g.gun <= bugun,
      hedef: { k: `ogrenme.hedef.${g.sistem}`, p: { sayi: g.sayi } },
      ilerleme: Math.min(g.sayi, k.sy[g.sayac] ?? 0),
      gerekli: g.sayi,
      tamam: (k.og & (1 << (g.gun - 1))) !== 0,
      odul: g.odul,
    })),
  };
}
