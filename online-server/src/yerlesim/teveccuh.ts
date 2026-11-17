// Teveccüh (ana tasarım §6.2, Berkay 9 Kasım): alınan hediyelerden (ikram, armağan, Debdebe armağanı) doğan ayrı
// itibar. Hediyenin TUTARIYLA artar; veren başına tavan ve farklı veren şartı yoktur ("zengin oyuncu etkisini
// görmeli"). Debdebe (gerçek para) armağanı her kaynaktan tam sayılır; akçeyle ikram/armağan aynı haneden ya da aynı
// hesap kümesinden gelirse sayılmaz (bedava akçe döndürerek teveccüh üretilmesin). Sönme çok yavaştır ve tembel
// işlenir (ay damgalı). Kademe 0–5 görünür; etkiler `teveccuhEtkisi` ile tek yerden okunur. Saf fonksiyonlar.

import type { Karakter } from "./tipler.ts";

export const TEVECCUH_TURLERI = ["ikram", "armagan", "debdebe"] as const;
export type TeveccuhTuru = (typeof TEVECCUH_TURLERI)[number];
/** [PARAMETRE] Kademe eşikleri (puan = sayılan hediye tutarı, akçe ya da mal değeri). */
export const TEVECCUH_KADEMELERI: readonly number[] = [0, 20, 60, 150, 400, 1000];
/** [PARAMETRE] Aylık sönme oranı (çok yavaş: %0,5/ay ≈ 12 ayda %6). */
export const TEVECCUH_AYLIK_SONME = 0.005;
/** [PARAMETRE] Profilde gösterilen veren sayısı için tutulan en çok veren. */
export const TEVECCUH_VEREN_EN_COK = 200;
/** [PARAMETRE] Etkiler (kademe başına). */
export const TEVECCUH_ETKI = {
  /** NPC'nin bakışına kalem ("gorus.teveccuh"): kademe × bu, tavanlı. */
  ilkIzlenim: 1,
  ilkIzlenimTavan: 5,
  /** Lonca siparişinde açılış ayı önceliği için en az kademe. */
  siparisKademe: 1,
  /** Kancalar (sonraki fazlar): seçim meşruiyeti puanı, ozan sahne önceliği, NPC müşteri önceliği (%). */
  secim: 2,
  sahne: 1,
  musteri: 5,
  /** Ahi başı adaylık şartı: en az bu kademe. */
  ahiKademe: 3,
} as const;

export type TeveccuhAlani = "ilkIzlenim" | "siparis" | "secim" | "sahne" | "musteri" | "ahi";

/** [PARAMETRE] Akçeyle ikram/armağandan aynı verenin aynı alana bir ayda yazabileceği en çok teveccüh puanı. */
export const TEVECCUH_CIFT_AYLIK = 20;

export interface TeveccuhKaydi {
  /** Puan (sönmüş), son işlendiği ay, sayılan verenler. */
  p: number;
  a: number;
  v: string[];
  /** Puanın Debdebe (gerçek para) armağanından gelen kısmı (aynı sönmeyle): ekonomik etkilere sayılmaz. */
  d?: number;
  /** Bu ayın veren başı sayacı (ikram/armağan çift tavanı): [ay, veren → puan]. */
  c?: [ay: number, sayac: Record<string, number>];
}

/** Hesap kümesi yaklaşığı: aynı ocak (hane). Aynı Google kişisi bilinemez; bilinirse buraya eklenir. */
export function ayniKume(a: Pick<Karakter, "o" | "h" | "e">, b: Pick<Karakter, "o" | "h" | "e">): boolean {
  return a.o === b.o || a.h === b.h || (a.e !== 0 && a.e === b.e);
}

function tazele(k: Karakter, ay: number): TeveccuhKaydi | undefined {
  const t = k.tv;
  if (!t) return undefined;
  if (ay > t.a) {
    const c = Math.pow(1 - TEVECCUH_AYLIK_SONME, ay - t.a);
    t.p = t.p * c;
    if (t.d) t.d = t.d * c;
    t.a = ay;
  }
  return t;
}

/**
 * Teveccüh yazar. `veren` oyuncuysa karakteri (hane denetimi için), Debdebe gibi dış kaynaktaysa kimlik metnidir.
 * Sayılan puanı döndürür (0: sayılmadı).
 */
export function teveccuhEkle(alan: Karakter, veren: Karakter | string, tur: TeveccuhTuru, ay: number, tutar: number): number {
  if (!(tutar > 0)) return 0;
  const vid = typeof veren === "string" ? veren : veren.o;
  if (vid === alan.o) return 0;
  if (tur !== "debdebe" && (typeof veren === "string" || ayniKume(alan, veren))) return 0;
  const t = tazele(alan, ay) ?? (alan.tv = { p: 0, a: ay, v: [] });
  if (tur === "debdebe") t.d = (t.d ?? 0) + tutar;
  else {
    // Çift tavanı: aynı veren aynı alana ayda en çok TEVECCUH_CIFT_AYLIK puan yazar.
    if (!t.c || t.c[0] !== ay) t.c = [ay, {}];
    const once = t.c[1][vid] ?? 0;
    tutar = Math.min(tutar, TEVECCUH_CIFT_AYLIK - once);
    if (!(tutar > 0)) return 0;
    t.c[1][vid] = once + tutar;
  }
  t.p += tutar;
  if (!t.v.includes(vid)) {
    t.v.push(vid);
    if (t.v.length > TEVECCUH_VEREN_EN_COK) t.v.splice(0, t.v.length - TEVECCUH_VEREN_EN_COK);
  }
  return tutar;
}

/** İade: Debdebe armağanının yazdığı teveccühü geri alır (en çok mevcut puan kadar). Düşülen puanı döndürür. */
export function teveccuhCikar(alan: Karakter, ay: number, tutar: number): number {
  if (!(tutar > 0)) return 0;
  const t = tazele(alan, ay);
  if (!t) return 0;
  const d = Math.min(t.p, tutar);
  t.p -= d;
  if (t.d) t.d = Math.max(0, t.d - d);
  return d;
}

export function teveccuhPuani(k: Karakter, ay: number): number {
  const t = k.tv;
  if (!t) return 0;
  return ay > t.a ? t.p * Math.pow(1 - TEVECCUH_AYLIK_SONME, ay - t.a) : t.p;
}

/** Puanın ekonomik etkilere (sipariş önceliği, ahi şartı, müşteri) sayılan kısmı: Debdebe armağanı hariç. */
export function teveccuhEkonomiPuani(k: Karakter, ay: number): number {
  const t = k.tv;
  if (!t) return 0;
  const c = ay > t.a ? Math.pow(1 - TEVECCUH_AYLIK_SONME, ay - t.a) : 1;
  return Math.max(0, (t.p - (t.d ?? 0)) * c);
}

function puanKademesi(p: number): number {
  let kd = 0;
  for (let i = 1; i < TEVECCUH_KADEMELERI.length; i++) if (p >= TEVECCUH_KADEMELERI[i]!) kd = i;
  return kd;
}

/** Ekonomik etkilerin kademesi (Debdebe armağanı sayılmaz; tasarım: parayla ekonomik üstünlük yok). */
export function teveccuhEkonomiKademesi(k: Karakter, ay: number): number {
  return puanKademesi(teveccuhEkonomiPuani(k, ay));
}

/** Sakin özetine görünen (tv) ve ekonomik (te; eşitse yazılmaz) kademeyi yazar. */
export function sakinTeveccuhYaz(s: { tv?: number; te?: number }, k: Karakter, ay: number): void {
  const kd = teveccuhKademesi(k, ay);
  const eko = teveccuhEkonomiKademesi(k, ay);
  s.tv = kd || undefined;
  if (eko === kd) delete s.te;
  else s.te = eko;
}

/** Sakin özetinden ekonomik kademe (eski kayıtta `te` yok → görünen kademe). */
export function sakinEkonomiKademesi(s: { tv?: number; te?: number }): number {
  return s.te ?? s.tv ?? 0;
}

export function teveccuhKademesi(k: Karakter, ay: number): number {
  const p = teveccuhPuani(k, ay);
  let kd = 0;
  for (let i = 1; i < TEVECCUH_KADEMELERI.length; i++) if (p >= TEVECCUH_KADEMELERI[i]!) kd = i;
  return kd;
}

/** Kademenin bir alandaki etkisi (tek kaynak; seçim, sahne, ahi ve müşteri kancaları sonraki fazlarda okur). */
export function teveccuhEtkisi(kademe: number, alan: TeveccuhAlani): number {
  switch (alan) {
    case "ilkIzlenim":
      return Math.min(TEVECCUH_ETKI.ilkIzlenimTavan, kademe * TEVECCUH_ETKI.ilkIzlenim);
    case "siparis":
      return kademe >= TEVECCUH_ETKI.siparisKademe ? kademe : 0;
    case "secim":
      return kademe * TEVECCUH_ETKI.secim;
    case "sahne":
      return kademe * TEVECCUH_ETKI.sahne;
    case "musteri":
      return kademe * TEVECCUH_ETKI.musteri;
    case "ahi":
      return kademe >= TEVECCUH_ETKI.ahiKademe ? 1 : 0;
  }
}

const ALANLAR: readonly TeveccuhAlani[] = ["ilkIzlenim", "siparis", "secim", "sahne", "musteri", "ahi"];

/** Profil görünümü: kademe, puan, sonraki eşik, veren sayısı ve sıfır olmayan etkiler (i18n anahtarı + değer). */
export function teveccuhGorunumu(k: Karakter, ay: number) {
  const kademe = teveccuhKademesi(k, ay);
  return {
    kademe,
    puan: Math.floor(teveccuhPuani(k, ay)),
    sonrakiEsik: TEVECCUH_KADEMELERI[kademe + 1] ?? null,
    verenSayisi: k.tv?.v.length ?? 0,
    etkiler: ALANLAR.map((a) => ({ k: `teveccuh.etki.${a}`, p: { deger: teveccuhEtkisi(kademe, a) } })).filter((e) => e.p.deger !== 0),
  };
}
