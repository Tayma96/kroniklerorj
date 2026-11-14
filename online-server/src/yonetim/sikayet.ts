// Oyuncu şikayeti kuralları (saf): girdi doğrulama ve günlük sınır. Şikayet yalnız eklenir; karar yöneticidedir.

import { istekNoCoz } from "../mantik.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { GUN_MS, hesapIdCoz, metinTemizle, type Kaldirma } from "./yaptirim.ts";

export const SIKAYET_NEDENLERI = ["kufur", "taciz", "uygunsuzAd", "hile", "dolandiricilik", "spam", "diger"] as const;
export type SikayetNedeni = (typeof SIKAYET_NEDENLERI)[number];
/** [PARAMETRE] Oyuncu başına günlük (TR günü) şikayet sınırı; parametre katmanı ile değiştirilebilir. */
export const SIKAYET_GUNLUK = 5;
/** [PARAMETRE] Açıklamanın en uzun hali (karakter). */
export const ACIKLAMA_EN_UZUN = 500;
/** [PARAMETRE] Açık kuyruğun en çok uzunluğu (hedef sayısı); dolunca YENİ hedefe şikayet `kuyruk_dolu` döner,
 *  zaten kuyrukta olan hedefe gelen şikayet yine birleşir. */
export const ACIK_KUYRUK_EN_COK = 2000;
/** [PARAMETRE] Şikayetçi başına aynı anda açık şikayet sınırı (sahte hesaplarla kuyruk doldurmayı yavaşlatır). */
export const SIKAYETCI_ACIK_EN_COK = 10;
/** [PARAMETRE] Bir şikayet kaydında saklanan bildirim sayısı; fazlası yalnız `sayi`ya eklenir. */
export const BILDIRIM_EN_COK = 50;
/** Türkiye sürekli UTC+3. */
const TR_FARK_MS = 3 * 60 * 60 * 1000;

export type SikayetDurumu = "acik" | "reddedildi" | "yaptirim";
export const SIKAYET_DURUMLARI = ["acik", "reddedildi", "yaptirim"] as const;

/** H4: han masasından yapılan şikâyetin masa kimliği (MasaDO adı ve masa numarası; yalnız sunucu yazar). */
export interface MasaKimligi {
  ad: string;
  no: number;
}

export interface Bildirim {
  sikayetci: string;
  neden: SikayetNedeni;
  aciklama?: string;
  zaman: number;
  masa?: MasaKimligi;
}

/** İç iletiden gelen masa kimliğini doğrular (bozuksa yok sayılır; şikâyet yine kaydedilir). */
export function masaKimligiCoz(ham: unknown): MasaKimligi | undefined {
  if (typeof ham !== "object" || ham === null) return undefined;
  const { ad, no } = ham as Record<string, unknown>;
  if (typeof ad !== "string" || !ad.startsWith("masa:") || ad.length > 128) return undefined;
  if (typeof no !== "number" || !Number.isInteger(no) || no < 1 || no > 99) return undefined;
  return { ad, no };
}

/**
 * Hedef başına tek açık şikayet: aynı hedefe farklı şikayetçilerden gelenler bu kayıtta birleşir (`sayi`).
 * `sikayetci`, `neden`, `aciklama` ilk bildirimdir.
 */
export interface Sikayet {
  id: number;
  sikayetci: string;
  hedef: string;
  neden: SikayetNedeni;
  aciklama?: string;
  zaman: number;
  /** İlk bildirimin masa kimliği (masadan geldiyse). */
  masa?: MasaKimligi;
  durum: SikayetDurumu;
  /** Birleşen farklı şikayetçi sayısı (ilk dahil). */
  sayi: number;
  /** İlk BILDIRIM_EN_COK bildirim. */
  bildirimler: Bildirim[];
  karar?: Kaldirma & { yaptirim?: number };
}

/** Saf: aynı hedefe yeni bir şikayetçinin bildirimini birleştirir. */
export function bildirimBirlestir(s: Sikayet, b: Bildirim): Sikayet {
  const bildirimler = s.bildirimler.length < BILDIRIM_EN_COK ? [...s.bildirimler, b] : s.bildirimler;
  return { ...s, sayi: s.sayi + 1, bildirimler };
}

export interface SikayetGirdisi {
  hedef: string;
  neden: SikayetNedeni;
  aciklama?: string;
  istekNo: string;
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function sikayetGirdisiCoz(govde: unknown): Sonuc<SikayetGirdisi> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const istekNo = istekNoCoz(govde);
  if (!istekNo.ok) return istekNo;
  const hedef = hesapIdCoz(govde.hedef);
  if (!hedef) return hata("kisi_yok");
  const neden = govde.neden;
  if (typeof neden !== "string" || !(SIKAYET_NEDENLERI as readonly string[]).includes(neden)) {
    return hata("sikayet_gecersiz");
  }
  const girdi: SikayetGirdisi = { hedef, neden: neden as SikayetNedeni, istekNo: istekNo.deger };
  if (govde.aciklama !== undefined && govde.aciklama !== null) {
    if (typeof govde.aciklama !== "string") return hata("sikayet_gecersiz");
    const a = metinTemizle(govde.aciklama);
    if ([...a].length > ACIKLAMA_EN_UZUN) return hata("sikayet_gecersiz");
    if (a) girdi.aciklama = a;
  }
  return basarili(girdi);
}

/** TR günü numarası. */
export function trGunu(simdi: number): number {
  return Math.floor((simdi + TR_FARK_MS) / GUN_MS);
}

export interface GunlukSayac {
  gun: number;
  n: number;
}

/** Saf: bugünkü sayaç sınırın altındaysa bir artırılmış hali; değilse izin yok. */
export function gunlukSay(onceki: GunlukSayac | undefined, simdi: number, sinir: number): { izin: boolean; durum: GunlukSayac } {
  const gun = trGunu(simdi);
  const n = onceki && onceki.gun === gun ? onceki.n : 0;
  return n < sinir ? { izin: true, durum: { gun, n: n + 1 } } : { izin: false, durum: { gun, n } };
}
