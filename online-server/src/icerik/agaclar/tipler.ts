// Beceri ağacı v2 (spec 2026-11-09 §2): her meslekte 3 sütun × (Çırak 3 seviye, Kalfa 3, Kalfa 2. sıra 2, Usta 2)
// + tek Pir düğümü (1) + 1 gizli düğüm. Metinler istemcide çevrilir: ad `onl.ba.<meslek>.<anahtar>`, seviye etkisi
// `onl.ba.<meslek>.<anahtar>.s<n>`. `ikon` anlamsal addır (istemci ikon setini buna göre çizer). Sayılar [PARAMETRE].

import type { Kademe, MeslekId } from "../meslekler.ts";

export interface OnKosul {
  dugum: string;
  seviye: number;
}

/**
 * Seviyenin somut etkisi (yapılandırılmış; sistem okur). Bağlı olmayanlar (`kanca`) veri olarak durur, sistemi
 * gelince okunur: hangi etkinin bağlı olduğunu `src/yerlesim/beceri.ts` `kancaMi` söyler.
 */
export type Etki =
  /** Tarif açar (`tarifler.ts` kimliği; yoksa gelecek tarif). */
  | { tur: "tarif"; tarif: string }
  /** Usta işi açar (`temel-is.ts` kimliği). */
  | { tur: "is"; is: string }
  /** Tarif ya da işin çıktısına +adet; `yuzde` yalnız araçla yapıldığında çıktıyı yüzde artırır. */
  | { tur: "verim"; hedef: string; arti?: number; yuzde?: number }
  /** İş, envanterdeki bu araçla yapılınca +adet verir; araç bir kullanım aşınır (§7 aletin işe yararlığı). */
  | { tur: "arac"; hedef: string; mal: string; arti: number }
  /** Aracın kullanım ömrü +N. */
  | { tur: "omur"; mal: string; arti: number }
  /** Ürün ya da hizmet kalitesi yüzdesi. */
  | { tur: "kalite"; hedef: string; yuzde: number }
  /** Girdi tasarrufu yüzdesi. */
  | { tur: "tasarruf"; hedef: string; mal: string; yuzde: number }
  /** Başkasına verilen hizmet. */
  | { tur: "hizmet"; hizmet: string }
  /** Toplumsal hak, koltuk ya da sipariş önceliği. */
  | { tur: "hak"; hak: string }
  /** Meslekler arası sinerji: öteki meslekte bu düğüm bu seviyedeyse `acar` açılır (§6). */
  | { tur: "sinerji"; meslek: MeslekId; dugum: string; seviye: number; acar: string };

export interface Seviye {
  bedel: number;
  sureDk: number;
  etkiler: Etki[];
  /** Etki metni anahtarı. */
  metin: string;
}

/** Bölüm: Çırak, Kalfa, Kalfa 2. sıra, Usta, Pir, gizli. */
export type Bolum = "cirak" | "kalfa" | "kalfa2" | "usta" | "pir" | "gizli";

export interface BeceriDugumu {
  id: string;
  meslek: MeslekId;
  anahtar: string;
  /** Ad anahtarı. */
  ad: string;
  ikon: string;
  bolum: Bolum;
  kademe: Kademe;
  sutun: 0 | 1 | 2;
  sira: number;
  /** Azami seviye. */
  seviye: number;
  onKosul: OnKosul[];
  /** true: ön koşullardan biri yeter (Pir: herhangi bir usta düğümü 2/2). */
  onKosulBiri: boolean;
  kademeSarti: Kademe;
  seviyeler: Seviye[];
  /** Gizli düğüm: görünmesi için başarı sayacı ya da nadir kitap. */
  gizli?: { sayac?: { anahtar: string; esik: number }; kitap?: string };
}

export interface Agac {
  meslek: MeslekId;
  dugumler: BeceriDugumu[];
}

/** [PARAMETRE] Seviye başına puan bedeli ve öğrenme süresi (dk), bölüme göre (spec §3–4). */
export const BOLUM_BEDEL: Record<Bolum, readonly number[]> = {
  cirak: [1, 1, 1],
  kalfa: [2, 2, 2],
  kalfa2: [3, 3],
  usta: [5, 5],
  pir: [7],
  gizli: [5],
};
export const BOLUM_SURE_DK: Record<Bolum, readonly number[]> = {
  cirak: [15, 30, 45],
  kalfa: [60, 90, 120],
  kalfa2: [150, 180],
  usta: [300, 360],
  pir: [720],
  gizli: [360],
};
const BOLUM_KADEME: Record<Bolum, Kademe> = { cirak: 0, kalfa: 1, kalfa2: 1, usta: 2, pir: 3, gizli: 2 };
const BOLUM_SIRA: Record<Bolum, number> = { cirak: 0, kalfa: 1, kalfa2: 2, usta: 3, pir: 4, gizli: 5 };
/** Bölümün önceki sırası ve oradaki azami seviye (varsayılan ön koşul: aynı sütun, tam seviye). */
const ONCEKI: Partial<Record<Bolum, Bolum>> = { kalfa: "cirak", kalfa2: "kalfa", usta: "kalfa2" };

// --- Etki kısayolları ---
export const tarif = (t: string): Etki => ({ tur: "tarif", tarif: t });
export const is = (i: string): Etki => ({ tur: "is", is: i });
export const verim = (hedef: string, arti: number): Etki => ({ tur: "verim", hedef, arti });
export const aracVerimi = (hedef: string, yuzde: number): Etki => ({ tur: "verim", hedef, yuzde });
export const arac = (hedef: string, mal: string, arti: number): Etki => ({ tur: "arac", hedef, mal, arti });
export const omur = (mal: string, arti: number): Etki => ({ tur: "omur", mal, arti });
export const kalite = (hedef: string, yuzde: number): Etki => ({ tur: "kalite", hedef, yuzde });
export const tasarruf = (hedef: string, mal: string, yuzde: number): Etki => ({ tur: "tasarruf", hedef, mal, yuzde });
export const hizmet = (h: string): Etki => ({ tur: "hizmet", hizmet: h });
export const hak = (h: string): Etki => ({ tur: "hak", hak: h });
export const sinerji = (meslek: MeslekId, anahtar: string, seviye: number, acar: string): Etki => ({
  tur: "sinerji",
  meslek,
  dugum: `${meslek}.${anahtar}`,
  seviye,
  acar,
});

/** Düğüm tanımı: anahtar, ikon, seviye başına etkiler; `on` varsayılan ön koşulu değiştirir ([anahtar, seviye]). */
export interface DugumTanimi {
  a: string;
  i: string;
  e: Etki[][];
  on?: [string, number][];
}
export interface AgacTanimi {
  cirak: [DugumTanimi, DugumTanimi, DugumTanimi];
  kalfa: [DugumTanimi, DugumTanimi, DugumTanimi];
  kalfa2: [DugumTanimi, DugumTanimi, DugumTanimi];
  usta: [DugumTanimi, DugumTanimi, DugumTanimi];
  pir: DugumTanimi;
  gizli: DugumTanimi & { sutun: 0 | 1 | 2; gorunur: { sayac?: [string, number]; kitap?: string } };
}

function dugum(m: MeslekId, bolum: Bolum, sutun: 0 | 1 | 2, t: DugumTanimi, onKosul: OnKosul[], biri: boolean): BeceriDugumu {
  const id = `${m}.${t.a}`;
  const bedel = BOLUM_BEDEL[bolum];
  const sure = BOLUM_SURE_DK[bolum];
  return {
    id,
    meslek: m,
    anahtar: t.a,
    ad: `onl.ba.${id}`,
    ikon: t.i,
    bolum,
    kademe: BOLUM_KADEME[bolum],
    sutun,
    sira: BOLUM_SIRA[bolum],
    seviye: t.e.length,
    onKosul,
    onKosulBiri: biri,
    kademeSarti: BOLUM_KADEME[bolum],
    seviyeler: t.e.map((etkiler, n) => ({
      bedel: bedel[n] ?? bedel[bedel.length - 1]!,
      sureDk: sure[n] ?? sure[sure.length - 1]!,
      etkiler,
      metin: `onl.ba.${id}.s${n + 1}`,
    })),
  };
}

export function agacKur(m: MeslekId, t: AgacTanimi): Agac {
  const dugumler: BeceriDugumu[] = [];
  const onKosulCoz = (on: [string, number][]) => on.map(([a, seviye]) => ({ dugum: `${m}.${a}`, seviye }));
  for (const bolum of ["cirak", "kalfa", "kalfa2", "usta"] as const) {
    t[bolum].forEach((d, s) => {
      const sutun = s as 0 | 1 | 2;
      const onceki = ONCEKI[bolum];
      let on: OnKosul[] = [];
      if (d.on) on = onKosulCoz(d.on);
      else if (onceki) {
        const ust = (t[onceki] as readonly DugumTanimi[])[sutun]!;
        on = [{ dugum: `${m}.${ust.a}`, seviye: ust.e.length }];
      }
      dugumler.push(dugum(m, bolum, sutun, d, on, false));
    });
  }
  const pirOn = t.pir.on ? onKosulCoz(t.pir.on) : t.usta.map((u) => ({ dugum: `${m}.${u.a}`, seviye: u.e.length }));
  dugumler.push(dugum(m, "pir", 1, t.pir, pirOn, !t.pir.on));
  const g = dugum(m, "gizli", t.gizli.sutun, t.gizli, onKosulCoz(t.gizli.on ?? []), false);
  const gz = t.gizli.gorunur;
  g.gizli = {
    ...(gz.sayac ? { sayac: { anahtar: gz.sayac[0], esik: gz.sayac[1] } } : {}),
    ...(gz.kitap ? { kitap: gz.kitap } : {}),
  };
  dugumler.push(g);
  return { meslek: m, dugumler };
}
