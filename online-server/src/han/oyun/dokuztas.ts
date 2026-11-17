// Dokuz Taş (halk oyunu, 2 kişi). Saf kural motoru; gizli bilgi yoktur.
//
// Tahta: iç içe üç kare, 24 nokta. Nokta = kare × 8 + k (kare 0 dış, 1 orta, 2 iç; k sol üst köşeden saat yönünde:
// 0 köşe, 1 kenar ortası, 2 köşe, 3 kenar ortası, ...). Komşuluk: aynı karede k±1; kenar ortaları (tek k) bir
// içteki/dıştaki karenin aynı kenar ortasına bağlıdır. Üçleme: bir karenin bir kenarı (3 nokta) ya da kenar ortalarını
// bağlayan çizgi (3 kare).
//
// Kurallar: ak (0) başlar. Önce herkes elindeki 9 taşı sırayla boş noktalara koyar; sonra taşını komşu boş noktaya
// sürer. Tahtada 3 taşı kalan, taşını herhangi bir boş noktaya uçurabilir. Üçleme kuran rakibin bir taşını alır;
// üçlemedeki taş, rakibin bütün taşları üçlemedeyse alınabilir. Taşı (eldeki + tahtadaki) 3'ten aza düşen ya da
// sürme aşamasında oynayacak hamlesi kalmayan kaybeder. Sürme aşamasında DOKUZ_SESSIZ_EN_COK hamle taş alınmadan
// geçerse oyun berabere biter.

import { basarili, hata, type Sonuc } from "../../tipler.ts";
import type { OyunModulu, OyunSonucu } from "./tur.ts";

/** [PARAMETRE] Oyuncu başına taş. */
export const DOKUZ_TAS = 9;
/** [PARAMETRE] Sürme aşamasında taş alınmadan geçen hamle sınırı (berabere). Zamanlayıcı değildir. */
export const DOKUZ_SESSIZ_EN_COK = 50;
/** [PARAMETRE] Uçma hakkının başladığı taş sayısı. */
export const DOKUZ_UCMA = 3;
export const NOKTA = 24;

/** Komşuluk listesi (nokta → komşular). */
export const KOMSU: readonly (readonly number[])[] = Array.from({ length: NOKTA }, (_, p) => {
  const kare = Math.floor(p / 8);
  const k = p % 8;
  const l = [kare * 8 + ((k + 7) % 8), kare * 8 + ((k + 1) % 8)];
  if (k % 2 === 1) {
    if (kare > 0) l.push(p - 8);
    if (kare < 2) l.push(p + 8);
  }
  return l.sort((a, b) => a - b);
});

/** 16 üçleme. */
export const UCLEMELER: readonly (readonly [number, number, number])[] = [
  ...[0, 1, 2].flatMap((kare) => [0, 2, 4, 6].map((k) => [kare * 8 + k, kare * 8 + k + 1, kare * 8 + ((k + 2) % 8)] as const)),
  ...[1, 3, 5, 7].map((k) => [k, 8 + k, 16 + k] as const),
];

export interface DokuzDurumu {
  /** -1 boş, 0 ak, 1 kara. */
  tahta: number[];
  /** Elde (konmamış) taş. */
  el: [number, number];
  sira: 0 | 1;
  /** Sürme aşamasında taş alınmadan geçen hamle. */
  sessiz: number;
  son?: { kim: 0 | 1; kaynak?: number; hedef: number; al?: number };
  bitti?: OyunSonucu;
}

const say = (d: DokuzDurumu, i: number): number => d.tahta.filter((x) => x === i).length;

function uclemede(tahta: readonly number[], p: number): boolean {
  const i = tahta[p];
  if (i === undefined || i < 0) return false;
  return UCLEMELER.some((u) => u.includes(p) && u.every((q) => tahta[q] === i));
}

/** i'nin rakibinden alabileceği taşlar. */
export function alinabilir(tahta: readonly number[], i: number): number[] {
  const r = 1 - i;
  const taslar = tahta.flatMap((x, p) => (x === r ? [p] : []));
  const disarda = taslar.filter((p) => !uclemede(tahta, p));
  return disarda.length ? disarda : taslar;
}

/** i oynayabilir mi (sürme/uçma aşaması; koyma aşamasında boş nokta hep vardır). */
function hamleVar(d: DokuzDurumu, i: number): boolean {
  if (d.el[i]! > 0) return true;
  const taslar = d.tahta.flatMap((x, p) => (x === i ? [p] : []));
  if (taslar.length <= DOKUZ_UCMA) return d.tahta.includes(-1);
  return taslar.some((p) => KOMSU[p]!.some((q) => d.tahta[q] === -1));
}

const NOKTA_MI = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < NOKTA;

/** Hamle: `{koy: p, al?}` (koyma aşaması) ya da `{kaynak: a, hedef: b, al?}` (sürme/uçma). `al`: yalnız üçleme kurulunca. */
function oyna(d: DokuzDurumu, i: number, ham: unknown): Sonuc<DokuzDurumu> {
  if (typeof ham !== "object" || ham === null || Array.isArray(ham)) return hata("hamle_gecersiz");
  const h = ham as Record<string, unknown>;
  const tahta = [...d.tahta];
  const el: [number, number] = [d.el[0], d.el[1]];
  let kaynak: number | undefined;
  let hedef: number;
  if (d.el[i]! > 0) {
    if (h.kaynak !== undefined || h.hedef !== undefined || !NOKTA_MI(h.koy) || tahta[h.koy] !== -1) return hata("hamle_gecersiz");
    hedef = h.koy;
    tahta[hedef] = i;
    el[i] = el[i]! - 1;
  } else {
    if (h.koy !== undefined || !NOKTA_MI(h.kaynak) || !NOKTA_MI(h.hedef)) return hata("hamle_gecersiz");
    if (tahta[h.kaynak] !== i || tahta[h.hedef] !== -1) return hata("hamle_gecersiz");
    const ucar = say(d, i) <= DOKUZ_UCMA;
    if (!ucar && !KOMSU[h.kaynak]!.includes(h.hedef)) return hata("hamle_gecersiz");
    kaynak = h.kaynak;
    hedef = h.hedef;
    tahta[kaynak] = -1;
    tahta[hedef] = i;
  }
  let al: number | undefined;
  if (uclemede(tahta, hedef)) {
    const secenek = alinabilir(tahta, i);
    if (secenek.length > 0) {
      if (!NOKTA_MI(h.al) || !secenek.includes(h.al)) return hata("hamle_gecersiz");
      al = h.al;
      tahta[al] = -1;
    } else if (h.al !== undefined) return hata("hamle_gecersiz");
  } else if (h.al !== undefined) return hata("hamle_gecersiz");
  const surme = d.el[0] === 0 && d.el[1] === 0;
  const sessiz = al !== undefined ? 0 : surme ? d.sessiz + 1 : 0;
  const r = (1 - i) as 0 | 1;
  const y: DokuzDurumu = {
    tahta,
    el,
    sira: r,
    sessiz,
    son: { kim: i as 0 | 1, ...(kaynak !== undefined ? { kaynak } : {}), hedef, ...(al !== undefined ? { al } : {}) },
  };
  if (el[r] + say(y, r) < 3 || !hamleVar(y, r)) return basarili({ ...y, bitti: { kazanan: [i], berabere: false } });
  if (sessiz >= DOKUZ_SESSIZ_EN_COK) return basarili({ ...y, bitti: { kazanan: [], berabere: true } });
  return basarili(y);
}

export const DOKUZ_TAS_OYUNU: OyunModulu<DokuzDurumu> = {
  tur: "dokuztas",
  enAz: 2,
  enCok: 2,
  kur: () => ({ tahta: Array.from({ length: NOKTA }, () => -1), el: [DOKUZ_TAS, DOKUZ_TAS], sira: 0, sessiz: 0 }),
  sira: (d) => (d.bitti ? null : d.sira),
  hamle(d, i, ham) {
    if (d.bitti || d.sira !== i) return hata("sira_degil");
    return oyna(d, i, ham);
  },
  // Dokuz taşta yok olanın yerine hamle seçilmez (oyunu başkası oynamış olur): masa yalnız dağıtabilir.
  pasGec: () => undefined,
  cekil: () => undefined,
  sonuc: (d) => d.bitti,
  acik(d) {
    return {
      tahta: [...d.tahta],
      el: [d.el[0], d.el[1]],
      taslar: [say(d, 0), say(d, 1)],
      ucma: [d.el[0] === 0 && say(d, 0) <= DOKUZ_UCMA, d.el[1] === 0 && say(d, 1) <= DOKUZ_UCMA],
      sessiz: d.sessiz,
      sessizEnCok: DOKUZ_SESSIZ_EN_COK,
      ...(d.son ? { son: { ...d.son } } : {}),
    };
  },
  ozel: () => ({}),
  coz(ham, n) {
    if (n !== 2 || typeof ham !== "object" || ham === null) return undefined;
    const d = ham as Record<string, unknown>;
    if (!Array.isArray(d.tahta) || d.tahta.length !== NOKTA || !d.tahta.every((x) => x === -1 || x === 0 || x === 1)) return undefined;
    const el = d.el;
    if (!Array.isArray(el) || el.length !== 2 || !el.every((x) => Number.isInteger(x) && x >= 0 && x <= DOKUZ_TAS)) return undefined;
    if (d.sira !== 0 && d.sira !== 1) return undefined;
    if (!Number.isInteger(d.sessiz) || (d.sessiz as number) < 0 || (d.sessiz as number) > DOKUZ_SESSIZ_EN_COK) return undefined;
    const durum: DokuzDurumu = { tahta: [...(d.tahta as number[])], el: [el[0] as number, el[1] as number], sira: d.sira, sessiz: d.sessiz as number };
    if (d.son !== undefined) {
      const s = d.son as Record<string, unknown> | null;
      if (!s || (s.kim !== 0 && s.kim !== 1) || !NOKTA_MI(s.hedef) || (s.kaynak !== undefined && !NOKTA_MI(s.kaynak)) || (s.al !== undefined && !NOKTA_MI(s.al))) return undefined;
      durum.son = { kim: s.kim, hedef: s.hedef, ...(s.kaynak !== undefined ? { kaynak: s.kaynak as number } : {}), ...(s.al !== undefined ? { al: s.al as number } : {}) };
    }
    if (d.bitti !== undefined) {
      const b = d.bitti as Record<string, unknown> | null;
      if (!b || !Array.isArray(b.kazanan) || !b.kazanan.every((x) => x === 0 || x === 1) || typeof b.berabere !== "boolean") return undefined;
      durum.bitti = { kazanan: [...(b.kazanan as number[])], berabere: b.berabere };
    }
    return durum;
  },
};
