// Tohumlu rastgelelik: aynı yerleşim + ay (+ kişi) her zaman aynı sonucu verir; testler tekrarlanabilir.

export type Zar = () => number;

/** mulberry32: [0, 1) aralığında hızlı, tohumlu üreteç. */
export function mulberry32(tohum: number): Zar {
  let s = tohum >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a (32 bit) karması; parçalar ":" ile birleşir. */
export function karma(...parcalar: (string | number)[]): number {
  const metin = parcalar.join(":");
  let h = 0x811c9dc5;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tohumlu(...parcalar: (string | number)[]): Zar {
  return mulberry32(karma(...parcalar));
}

/** [alt, ust] aralığında tamsayı (ikisi dahil). */
export function aralik(r: Zar, alt: number, ust: number): number {
  return alt + Math.floor(r() * (ust - alt + 1));
}

export function dizinSec(uzunluk: number, r: Zar): number {
  return Math.floor(r() * uzunluk);
}

/** Ağırlıklara göre dizin seçer; ağırlıkların toplamı 0 ise -1. */
export function agirlikliSec(agirliklar: ArrayLike<number>, r: Zar): number {
  let toplam = 0;
  for (let i = 0; i < agirliklar.length; i++) toplam += agirliklar[i] ?? 0;
  if (toplam <= 0) return -1;
  let x = r() * toplam;
  for (let i = 0; i < agirliklar.length; i++) {
    x -= agirliklar[i] ?? 0;
    if (x < 0) return i;
  }
  return agirliklar.length - 1;
}
