// Hafıza (Faz 4): anı türüne göre sönme hızı (ağır anılar geç söner), kırgınlığın sebebi ve ağırlığı, görüş
// dökümünün ilişki eksenlerine izdüşümü (GDD §6: güven, yakınlık, saygı, korku, husumet, borç, sadakat) ve
// üçgen kayıtlarının budanması. Yeni puan yoktur: eksenler görüş kalemlerinin toplamıdır, toplamları görüşe eşittir
// (sınır kalemi hariç). Saf ve yapraktır: gorus.ts'i içe aktarmaz.

import type { Dokum, Iliski, Kalem } from "./tipler.ts";

/** [PARAMETRE] Ağır anıların yarı ömrü (ay); listede olmayan türler varsayılanı (gorus.ANI_YARI_OMRU) kullanır. */
export const ANI_YARI_OMURLERI: Readonly<Record<string, number>> = {
  ihanet: 36,
  ikiliOyun: 36,
  kiskirtmaRet: 18,
  basarisizArabulucu: 18,
};

export function yariOmur(tur: string, varsayilan: number): number {
  return ANI_YARI_OMURLERI[tur] ?? varsayilan;
}

/** [PARAMETRE] Kırgınlığın sebebine göre arabuluculuk zorluğu: en ağır olumsuz kalem belirler ("kan davası laftan zordur"). */
export const SEBEP_AGIRLIGI: Readonly<Record<string, number>> = {
  "gorus.ani.ihanet": 20,
  "gorus.ani.ikiliOyun": 20,
  "gorus.ittifak": 12,
  "gorus.ani.kiskirtmaRet": 10,
  "gorus.soylenti": 6,
  "gorus.duyulan": 6,
  "gorus.ani.basarisizArabulucu": 6,
  "gorus.kibir": 4,
  "gorus.ani.laf": 2,
};
export const SEBEP_VARSAYILAN = 5;

/** Görüş dökümündeki en ağır olumsuz kalem ve sebep ağırlığı (olumsuz kalem yoksa ağırlık 0). */
export function kirginlikSebebi(d: Dokum): { kalem: string; agirlik: number } {
  let en: Kalem | undefined;
  for (const k of d.kalemler) if (k.k !== "gorus.sinir" && k.d < 0 && (!en || k.d < en.d)) en = k;
  if (!en) return { kalem: "", agirlik: 0 };
  return { kalem: en.k, agirlik: SEBEP_AGIRLIGI[en.k] ?? SEBEP_VARSAYILAN };
}

export const EKSENLER = ["guven", "yakinlik", "saygi", "korku", "husumet", "borc", "sadakat"] as const;
export type Eksen = (typeof EKSENLER)[number];

/** [PARAMETRE] Kalem → eksen. Önek eşleşmesi ("gorus.akraba." bütün akrabalık kalemleri); bulunmayan yakınlıktır. */
export const EKSEN_HARITASI: readonly (readonly [string, Eksen])[] = [
  ["gorus.soylenti", "guven"],
  ["gorus.duyulan", "guven"],
  ["gorus.baris", "guven"],
  ["gorus.ani.ihanet", "guven"],
  ["gorus.ani.ikiliOyun", "guven"],
  ["gorus.ani.basarisizArabulucu", "guven"],
  ["gorus.huyNam", "saygi"],
  ["gorus.kibir", "saygi"],
  ["gorus.usta", "saygi"],
  ["gorus.meslektas", "saygi"],
  ["gorus.ani.kiskirtmaRet", "saygi"],
  ["gorus.ani.tehdit", "korku"],
  ["gorus.ittifak", "husumet"],
  ["gorus.ani.laf", "husumet"],
  ["gorus.dusmaninDostu", "husumet"],
  ["gorus.ani.borc", "borc"],
  ["gorus.ani.is", "borc"],
  ["gorus.ani.yardim", "borc"],
  ["gorus.ittifakOrtagi", "sadakat"],
];

export function kalemEkseni(k: string): Eksen {
  for (const [onek, e] of EKSEN_HARITASI) if (k === onek || k.startsWith(onek + ".")) return e;
  return "yakinlik";
}

/** Görüş dökümünün eksenlere dağılımı; yalnız sıfırdan farklı eksenler döner (boş gösterge yok). */
export function eksenler(d: Dokum): Partial<Record<Eksen, number>> {
  const sonuc: Partial<Record<Eksen, number>> = {};
  for (const k of d.kalemler) {
    if (k.k === "gorus.sinir" || k.d === 0) continue;
    const e = kalemEkseni(k.k);
    sonuc[e] = (sonuc[e] ?? 0) + k.d;
  }
  for (const e of EKSENLER) if (sonuc[e] === 0) delete sonuc[e];
  return sonuc;
}

/** [PARAMETRE] Bir ilişkide tutulan en çok duyum; bu yükün altına sönen duyum unutulur. */
export const DUYUM_EN_COK = 8;
export const DUYUM_UNUTMA = 1;
/** Duyumun yarı ömrü (ay) ve en uzun ömrü. */
export const DUYUM_YARI_OMRU = 12;
export const DUYUM_OMUR = 36;

export function duyumYuku(yuk: number, guven: number, gecen: number): number {
  return ((yuk * guven) / 100) * Math.pow(0.5, Math.max(0, gecen) / DUYUM_YARI_OMRU);
}

/** Ay dönümü budaması: sönen/eski duyum, süresi geçen şart, ateşkes ve boykot düşer. Barışın kalıcı değeri kalır. */
export function hafizaBudama(i: Iliski, ay: number): void {
  if (i.du) {
    i.du = i.du.filter((x) => ay - x[4] < DUYUM_OMUR && !x[5] && Math.abs(duyumYuku(x[2], x[3], ay - x[4])) >= DUYUM_UNUTMA);
    if (i.du.length > DUYUM_EN_COK) i.du.splice(0, i.du.length - DUYUM_EN_COK);
    if (i.du.length === 0) delete i.du;
  }
  if (i.ab) {
    if (i.ab.s && i.ab.s[2] < ay) delete i.ab.s;
    if (i.ab.ak !== undefined && i.ab.ak <= ay) delete i.ab.ak;
    if (i.ab.v === 0 && !i.ab.s && i.ab.ak === undefined) delete i.ab;
  }
  if (i.bk !== undefined && i.bk <= ay) delete i.bk;
}

/** Üçgen kayıtları taşıyan ilişki boş sayılmaz (anı budaması silmesin). */
export function ucgenIzliMi(i: Iliski): boolean {
  return !!i.du?.length || !!i.ab || i.bk !== undefined;
}
