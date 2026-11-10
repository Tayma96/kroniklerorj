// Han masası kuralları (saf): sabitler, han düzeni, ileti metni doğrulama, hız sınırı.
// Sohbet metni yalnız temizlenip bağlı istemcilere yayınlanır; hiçbir fonksiyon onu saklamaz.

import type { YerlesimTuru } from "../dunya-veri.ts";
import type { Dil } from "../icerik/adlar.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { metinTemizle } from "../yonetim/yaptirim.ts";
import type { HanTuru, MasaAyari } from "./tipler.ts";

/** [PARAMETRE] Masa başına koltuk sayısı (GDD §16: 4–8). */
export const KOLTUK_SAYISI = 6;
/** [PARAMETRE] Bir handa en çok masa (GDD §13: han başına masa sayısı üst sınırlıdır). */
export const HAN_MASA_EN_COK = 8;
/** [PARAMETRE] Yerleşim türüne göre mekân ve masa sayısı. */
export const HAN_DUZENI: Readonly<Record<YerlesimTuru, { tur: HanTuru; masa: number }>> = {
  sehir: { tur: "han", masa: 8 },
  kasaba: { tur: "kucukHan", masa: 4 },
  koy: { tur: "menzil", masa: 2 },
};
/** [PARAMETRE] Masa başına koltuksuz (ayakta) dinleyici sınırı. */
export const AYAKTA_EN_COK = 24;
/** [PARAMETRE] Sohbet iletisinin en çok uzunluğu (harf, temizlikten sonra). */
export const ILETI_EN_UZUN = 240;
/** [PARAMETRE] İleti hız sınırı: pencere başına en çok ileti. */
export const ILETI_PENCERESI_MS = 10_000;
export const ILETI_SINIRI = 5;
/** [PARAMETRE] Her tür WebSocket komutu için genel sınır (otur/kalk ile yayın taşkınını önler). */
export const KOMUT_SINIRI = 20;
/** [PARAMETRE] Ham çerçevenin en çok boyutu (karakter). */
export const CERCEVE_EN_BUYUK = 2048;
/** [PARAMETRE] Masa başının çıkardığı oyuncu bu süre bu masaya dönemez (tek oturumluk çıkarma). */
export const ATMA_SURE_MS = 30 * 60 * 1000;
/** [PARAMETRE] Oyuncu başına günlük (TR günü) butonlu eylem tavanı; oyun etkisi gelince farm tavanı olur. */
export const HAN_EYLEM_GUNLUK = 20;
/** [PARAMETRE] Söz/şart metninin en çok uzunluğu. */
export const SART_EN_UZUN = 240;
/** [PARAMETRE] Bir bağlantıdaki yerel sessize alma listesi sınırı. */
export const SESSIZ_EN_COK = 50;

/** WebSocket kapanış kodları. */
export const KAPANIS = {
  baskaBaglanti: 4001,
  uzaklastirildi: 4003,
  atildi: 4004,
  baskaMasa: 4005,
} as const;

/** Yeni masanın varsayılan ayarı (hancı Faz 13'te değiştirecek). Ses varsayılan açık (Faz 16; Realtime yoksa kapalı). */
export const VARSAYILAN_AYAR: Readonly<MasaAyari> = { tur: "acik", acik: true, sesli: true, kavgaYasak: false };

/** Mekân türünün 6 dilde adı (yerleşim adı istemcide eklenir). */
export const HAN_TURU_ADLARI: Readonly<Record<HanTuru, Readonly<Record<Dil, string>>>> = {
  han: { tr: "Han", en: "Inn", es: "Posada", pt: "Estalagem", ar: "خان", ru: "Постоялый двор" },
  kucukHan: { tr: "Küçük Han", en: "Small Inn", es: "Posada pequeña", pt: "Pequena estalagem", ar: "خان صغير", ru: "Малый постоялый двор" },
  menzil: { tr: "Menzil", en: "Way Station", es: "Casa de postas", pt: "Posto de muda", ar: "منزل", ru: "Ямская станция" },
};

export function masaSayisi(tur: YerlesimTuru): number {
  return Math.min(HAN_DUZENI[tur].masa, HAN_MASA_EN_COK);
}

/** MasaDO adı: idFromName("masa:<yerlesim>:<han>:<no>"). */
export function masaAdi(yerlesim: string, han: HanTuru, no: number): string {
  return `masa:${yerlesim}:${han}:${no}`;
}

/** 1..sayi aralığında masa numarası; sayı ya da rakam dizisi kabul edilir. */
export function masaNoCoz(ham: unknown, sayi: number): number | undefined {
  const n = typeof ham === "number" ? ham : typeof ham === "string" && /^\d{1,2}$/.test(ham) ? Number(ham) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= sayi ? n : undefined;
}

/** Tek satırlık metin: görünmez/bidi karakterleri atar, satır sonlarını boşluğa çevirir, boşlukları daraltır. */
export function tekSatir(ham: string): string {
  return metinTemizle(ham.replace(/[\r\n]+/g, " ")).replace(/\s{2,}/g, " ");
}

/** Sohbet iletisi: temizlenmiş, 1..ILETI_EN_UZUN harf. */
export function iletiMetniCoz(ham: unknown): Sonuc<string> {
  if (typeof ham !== "string" || ham.length > CERCEVE_EN_BUYUK) return hata("metin_gecersiz");
  const m = tekSatir(ham);
  const uzunluk = [...m].length;
  return uzunluk >= 1 && uzunluk <= ILETI_EN_UZUN ? basarili(m) : hata("metin_gecersiz");
}

export interface Pencere {
  pencere: number;
  sayi: number;
}

/** Sabit pencereli sayaç (saf). */
export function pencereSay(
  onceki: Pencere | undefined,
  simdi: number,
  sinir: number,
  pencereMs: number,
): { izin: boolean; durum: Pencere } {
  const pencere = Math.floor(simdi / pencereMs);
  const sayi = onceki && onceki.pencere === pencere ? onceki.sayi + 1 : 1;
  return { izin: sayi <= sinir, durum: { pencere, sayi } };
}

/** Süren yaptırım: bitiş yok (kalıcı) ya da gelecekte. */
export function surer(o: { bitis: number | null } | undefined, simdi: number): o is { bitis: number | null } {
  return o !== undefined && (o.bitis === null || o.bitis > simdi);
}
