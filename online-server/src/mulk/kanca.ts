// Meslek/beceri kancalarının tezgâh, atölye ve han etkisi (tasarım §7, Dilim 3). Kayıt `icerik/kanca-kayit.ts`;
// tavanlar `tezgah-kurallar.ts` KANCA_TAVAN. Saf ve deterministik: sonuç yalnız öğrenilmiş düğümlerden gelir.
//
// YIĞILMA KURALI (tek yer): bir kanalda kişinin katkısı, açık etkilerinden o kanala bağlı kancaların değerleri
// toplamıdır; işletmenin değeri sahip ve oyuncu çalışanlar arasından EN YÜKSEK kişi katkısıdır (kişiler toplanmaz,
// hiçbir şey çarpılmaz) ve kanal tavanıyla kırpılır. Böylece çalışan toplamak ya da çok meslek öğrenmek tavanı aşamaz.
//
// KİŞİ KURALI ("ödünç usta" önlemi, `kancaKisileri`): sahip kendi işletmelerinin hepsine katkı verir. Oyuncu çalışan
// (i) yalnız sözleşmesi içinde bulunulan aydan ÖNCE başlamışsa sayılır (işe al → genişlet/teslim et → istifa aynı ayda
// bonus taşımaz) ve (ii) çalışan olarak yalnız TEK işletmeye katkı verir: en eski sözleşmesi (başlangıç ayı, eşitlikte
// işletme kimliği). Böylece bir kişi kancasını sınırsız işletmeye ödünç veremez.

import { KANCA_BAGLARI, kancaAnahtari, type KancaKanali } from "../icerik/kanca-kayit.ts";
import type { MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { acikEtkiler } from "../yerlesim/beceri-etki.ts";
import type { Karakter } from "../yerlesim/tipler.ts";
import { KANCA_TAVAN, type DegerliKanal } from "./tezgah-kurallar.ts";

export interface KancaFiltresi {
  /** Satırdaki malın mesleği (dükkân H), atölye zanaatı ya da sipariş zanaatı. */
  meslek?: MeslekId;
  /** Genişletme malzemesi. */
  mal?: MalId;
}

export interface KancaKalemi {
  kanca: string;
  d: number;
}

export interface KancaSonucu {
  kanal: DegerliKanal;
  /** Tavanlı değer (uygulanan) ve tavansız en yüksek kişi katkısı. */
  deger: number;
  ham: number;
  tavan: number;
  /** Değeri veren kişi ve kancaları (döküm; gizli sayı yok). */
  kisi: string | null;
  kalemler: KancaKalemi[];
}

/** [PARAMETRE] Çalışanın kancası sözleşme başlangıcından en az bu kadar ay sonra sayılır (1: başlangıç ayı sayılmaz). */
export const KANCA_CALISAN_BEKLEME_AY = 1;

/** Kişi kuralının okuduğu tapu özeti: sahip ve yansıdaki oyuncu çalışanların sözleşme başlangıç ayları (`pb`). */
export interface KancaTapusu {
  s: string;
  y?: { durum?: string; pb?: readonly (readonly [string, number])[] };
}

/**
 * İşletmeye kanca katkısı verebilecek kişiler (kişi kuralı, dosya başı): sahip + bekleme süresini doldurmuş ve en eski
 * sözleşmesi bu işletmede olan oyuncu çalışanlar. Yansısı `pb` taşımayan (eski) kayıtta çalışan sayılmaz. Saf.
 */
export function kancaKisileri(tapular: Readonly<Record<string, KancaTapusu>>, isletme: string, ay: number): string[] {
  const tapu = tapular[isletme];
  if (!tapu) return [];
  const l = [tapu.s];
  const gecerli = (b: number) => Number.isInteger(b) && ay - b >= KANCA_CALISAN_BEKLEME_AY;
  for (const [o, b] of tapu.y?.pb ?? []) {
    if (o === tapu.s || l.includes(o) || !gecerli(b)) continue;
    let enEski: { id: string; b: number } | undefined;
    for (const [id, t] of Object.entries(tapular)) {
      if (t.y?.durum === "iflas" || t.s === o) continue;
      for (const [x, bx] of t.y?.pb ?? []) {
        if (x !== o || !gecerli(bx)) continue;
        if (!enEski || bx < enEski.b || (bx === enEski.b && id < enEski.id)) enEski = { id, b: bx };
      }
    }
    if (enEski?.id === isletme) l.push(o);
  }
  return l;
}

/** Kişinin bir kanaldaki katkısı: kanala bağlı açık kancaların toplamı (filtreye uyanlar). */
export function kisiKatkisi(k: Karakter, kanal: DegerliKanal, f: KancaFiltresi = {}): { d: number; kalemler: KancaKalemi[] } {
  let d = 0;
  const kalemler: KancaKalemi[] = [];
  for (const e of acikEtkiler(k)) {
    const kanca = kancaAnahtari(e);
    const bag = KANCA_BAGLARI[kanca];
    if (!bag || bag.kanal !== kanal) continue;
    if (bag.meslek && bag.meslek !== f.meslek) continue;
    if (bag.mal && bag.mal !== f.mal) continue;
    const v = bag.d ?? 0;
    d += v;
    const x = kalemler.find((y) => y.kanca === kanca);
    if (x) x.d += v;
    else kalemler.push({ kanca, d: v });
  }
  return { d, kalemler };
}

/** İşletme değeri: kişiler arasından en yüksek katkı (eşitlikte kimlik sırası), kanal tavanıyla. */
export function kancaHesapla(kisiler: readonly Karakter[], kanal: DegerliKanal, f: KancaFiltresi = {}): KancaSonucu {
  let enIyi: { o: string; d: number; kalemler: KancaKalemi[] } | null = null;
  for (const k of [...kisiler].sort((a, b) => (a.o < b.o ? -1 : a.o > b.o ? 1 : 0))) {
    const r = kisiKatkisi(k, kanal, f);
    if (r.d > 0 && (!enIyi || r.d > enIyi.d)) enIyi = { o: k.o, ...r };
  }
  const tavan = KANCA_TAVAN[kanal];
  const ham = enIyi?.d ?? 0;
  return { kanal, deger: Math.min(tavan, ham), ham, tavan, kisi: enIyi?.o ?? null, kalemler: enIyi?.kalemler ?? [] };
}

/** Değersiz (bilgi) kanalı kişide açık mı. */
export function bilgiKancasi(k: Karakter, kanal: Exclude<KancaKanali, DegerliKanal | "mevcut">): boolean {
  for (const e of acikEtkiler(k)) if (KANCA_BAGLARI[kancaAnahtari(e)]?.kanal === kanal) return true;
  return false;
}

/**
 * Dökümde kısa biçim (istemciye): kanal toplamı (değer, tavan) ve katkı verenin görünen adı (kimlik değil).
 * Öğrenilmiş düğüm kalemleri yalnız işletme sahibine ve katkı verenin kendisine (`bakan`); öbür yetkililere ve
 * saklanan gün sonu dökümüne yalnız kanal toplamı.
 */
export function kancaDokumu(s: KancaSonucu, ad: (o: string) => string, bakan?: { o: string; sahip: boolean }): { deger: number; tavan: number; kisiAd: string | null; kalemler?: KancaKalemi[] } {
  const kalemGor = !!bakan && (bakan.sahip || s.kisi === null || bakan.o === s.kisi);
  return { deger: s.deger, tavan: s.tavan, kisiAd: s.kisi ? ad(s.kisi) : null, ...(kalemGor ? { kalemler: s.kalemler } : {}) };
}
