// Hanedan çekirdeği (Faz 7, OYNANIS_TASARIMI §8, D-02): hanedan kimliği ve nesil, akrabalar, vâris adayları,
// kasaba hazinesi/vakıf/emanet kasası, tereke (devri bekleyen ölüler) ve aile mesleği bonusu.
// Saf fonksiyonlar; yeni alanların hepsi opsiyoneldir: Faz 2/3 kaydı göçsüz yüklenir (yoksa nesil 1).

import { AD_HAVUZLARI } from "../icerik/adlar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { npcKimlik, yas } from "./ortak.ts";
import { karma } from "./rastgele.ts";
import type { Karakter, Kasaba, Npc } from "./tipler.ts";
import type { Vasiyet } from "./vasiyet.ts";

/** [PARAMETRE] Vâris olabilmek için en az yaş (çocuk); kardeş/yeğen/akraba için en az yaş. */
export const VARIS_YASI = 12;
export const AKRABA_VARIS_YASI = 16;
/** [PARAMETRE] Ölümden sonra vâris seçimi süresi (ay; 4 ay = 2 gerçek gün). Dolunca varsayılan vâris seçilir. */
export const DEVIR_SURE_AY = 4;
/**
 * [PARAMETRE] Aile mesleği (ana tasarım §5.3, karar — Claude): ustalık ve tecrübe vârise GEÇMEZ; vâris atasının
 * ana mesleğinde tecrübeyi bu çarpanla daha hızlı kazanır ("ocakta büyüdü").
 */
export const AILE_MESLEGI_CARPANI = 1.25;

export interface HanedanKaydi {
  /** Hanedan kimliği: ilk atanın yerel kimliği; kuşaklar boyu sabittir. */
  h: string;
  /** Nesil (1'den). */
  n: number;
  /** Hanedan soyadı (ad havuzu soyad dizini). */
  s: number;
  /** Eş ("n12" NPC, "o3" oyuncu) ve evlilik ayı; eş ölünce silinir (dul). */
  es?: string;
  ea?: number;
  /** Çocuk NPC'ler (doğum sırasıyla; ölenler okurken süzülür). */
  co?: number[];
  /** Hanedandan gelen akraba NPC'ler (atanın çocukları ve akrabaları: vârisin kardeş/yeğen havuzu). */
  ak?: number[];
  /** Gizli ölüm ayı (60. yaş dönümünde seçilir). */
  oa?: number;
  /** Öldüğü ay ve (devredildiyse) vârisin yerel kimliği. */
  ol?: number;
  dv?: string;
  vs?: Vasiyet;
  /** Aile mesleği (atanın ana mesleği). */
  am?: MeslekId;
  /** Atalar: [yerel kimlik, ad, doğum ayı, ölüm ayı] (eskiden yeniye). */
  at?: [o: string, ad: string, d: number, ol: number][];
}

/** Devri bekleyen ölü: emanet kendi karakter kaydındadır (ölü eylem yapamaz, para kıpırdamaz). */
export interface Tereke {
  o: string;
  h: string;
  ol: number;
  /** Bu ay ve sonrasında varsayılan vâris kullanılır. */
  son: number;
}

/** Kasabanın hanedan defteri (meta'da saklanır). */
export interface HanedanKasabasi {
  /** Kasaba hazinesi (veraset vergisi, düğün bedeli, sahipsiz emanet). */
  hz: number;
  /** Vakıf kasası (vasiyetle vakfa bırakılan). */
  vk: number;
  /** NPC'de emanette duran miras payları: NPC kimliği → akçe (vâris olunca karaktere geçer, ölünce hazineye). */
  em: Record<string, number>;
  tr: Tereke[];
}

export function hanedanKasabasi(kasaba: Kasaba): HanedanKasabasi {
  return (kasaba.hd ??= { hz: 0, vk: 0, em: {}, tr: [] });
}

export const olduMu = (k: Karakter): boolean => k.hd?.ol !== undefined;
export const nesil = (k: Karakter): number => k.hd?.n ?? 1;
export const hanedanKimligi = (k: Karakter): string => k.hd?.h ?? k.o;

/** Hanedan soyadı: kayıtlıysa o, yoksa ocağın babası/annesi, yoksa hesaba göre deterministik. */
export function hanedanSoyadi(kasaba: Kasaba, k: Karakter): number {
  if (k.hd) return k.hd.s;
  const ebeveyn = kasaba.dizin.get(k.ba) ?? kasaba.dizin.get(k.an);
  return ebeveyn ? ebeveyn.s : karma("soyad", k.h) % AD_HAVUZLARI.tr.s.length;
}

/** Hanedan kaydı (yoksa kurar: ilk ata, nesil 1). Yazan yollar içindir. */
export function hanedanKaydi(kasaba: Kasaba, k: Karakter): HanedanKaydi {
  return (k.hd ??= { h: k.o, n: 1, s: hanedanSoyadi(kasaba, k) });
}

/** Sonraki oyuncu yerel kimliği (kasaba.no; testte yoksa bilinenlerin bir fazlası). */
export function oyuncuNoAl(kasaba: Kasaba): string {
  let n = kasaba.no ?? 1;
  for (const s of kasaba.sakin) n = Math.max(n, Number(s.o.slice(1)) + 1);
  for (const o of kasaba.kar.keys()) n = Math.max(n, Number(o.slice(1)) + 1);
  kasaba.no = n + 1;
  return `o${n}`;
}

/** NPC'nin oyuncu eşi: Npc.es negatifse eş oyuncudur ("o" + |es|). */
export const oyuncuEsKodu = (o: string): number => -Number(o.slice(1));

export const aileMeslegiCarpani = (k: Karakter, id: MeslekId): number => (k.hd?.am === id ? AILE_MESLEGI_CARPANI : 1);

/** Ölümü Dönüş Kartı'nda "yakın" sayılan NPC: eş ya da çocuk. */
export function hanedanYakini(k: Karakter, npcI: number): boolean {
  return k.hd?.es === npcKimlik(npcI) || (k.hd?.co?.includes(npcI) ?? false);
}

export interface Akrabalar {
  cocuklar: Npc[];
  kardesler: Npc[];
  yegenler: Npc[];
}

const buyuktenKucuge = (a: Npc, b: Npc) => a.d - b.d || a.i - b.i;

/** Canlı akrabalar: çocuklar, kardeşler (ocak kardeşleri + hanedan akrabaları), yeğenler. */
export function akrabalar(kasaba: Kasaba, k: Karakter): Akrabalar {
  const cocukSet = new Set(k.hd?.co ?? []);
  const cocuklar = [...cocukSet].map((i) => kasaba.dizin.get(i)).filter((n): n is Npc => !!n).sort(buyuktenKucuge);
  const kardesSet = new Set<number>();
  for (const i of k.hd?.ak ?? []) if (kasaba.dizin.has(i) && !cocukSet.has(i)) kardesSet.add(i);
  for (const n of kasaba.npc) {
    if (cocukSet.has(n.i) || n.i === k.an || n.i === k.ba) continue;
    if ((k.an && n.an === k.an) || (k.ba && n.ba === k.ba)) kardesSet.add(n.i);
  }
  const kardesler = [...kardesSet].map((i) => kasaba.dizin.get(i)!).sort(buyuktenKucuge);
  const yegenler: Npc[] = [];
  if (kardesSet.size) {
    for (const n of kasaba.npc) {
      if (cocukSet.has(n.i) || kardesSet.has(n.i)) continue;
      if (kardesSet.has(n.an) || kardesSet.has(n.ba)) yegenler.push(n);
    }
    yegenler.sort(buyuktenKucuge);
  }
  return { cocuklar, kardesler, yegenler };
}

export type Yakinlik = "cocuk" | "kardes" | "yegen";

export interface Aday {
  id: string;
  i: number;
  yakinlik: Yakinlik;
  yas: number;
  k: 0 | 1;
  uygun: boolean;
  /** Uygun değilse neden ("kucuk": 12 yaşından küçük). */
  neden?: "kucuk";
}

/**
 * Vâris adayları: önce çocuklar (büyükten küçüğe; 12 yaş altı görünür ama seçilemez), sonra 16+ kardeşler ve
 * 16+ yeğenler. Aynı durum her zaman aynı sırayı verir.
 */
export function varisAdaylari(kasaba: Kasaba, olu: Karakter, ay: number): Aday[] {
  const { cocuklar, kardesler, yegenler } = akrabalar(kasaba, olu);
  const liste: Aday[] = [];
  for (const n of cocuklar) {
    const y = yas(n.d, ay);
    liste.push({ id: npcKimlik(n.i), i: n.i, yakinlik: "cocuk", yas: y, k: n.k, uygun: y >= VARIS_YASI, ...(y < VARIS_YASI ? { neden: "kucuk" as const } : {}) });
  }
  for (const [grup, yakinlik] of [[kardesler, "kardes"], [yegenler, "yegen"]] as const) {
    for (const n of grup) {
      const y = yas(n.d, ay);
      if (y >= AKRABA_VARIS_YASI) liste.push({ id: npcKimlik(n.i), i: n.i, yakinlik, yas: y, k: n.k, uygun: true });
    }
  }
  return liste;
}

/** Varsayılan vâris: vasiyetteki (uygunsa) → en büyük uygun aday → uzak akraba. */
export function varsayilanVaris(kasaba: Kasaba, olu: Karakter, ay: number): string {
  const adaylar = varisAdaylari(kasaba, olu, ay).filter((a) => a.uygun);
  const vs = olu.hd?.vs?.varis;
  if (vs && adaylar.some((a) => a.id === vs)) return vs;
  return adaylar[0]?.id ?? "uzak";
}
