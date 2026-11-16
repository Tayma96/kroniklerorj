// H10 han ilan panosu (araştırma §5.4): yerleşim başına son PANO_EN_COK ilan; oyuncu başına günlük sınır (HesapDO);
// metin H3 filtresinden geçer; PANO_OMUR_MS sonra düşer; sahibi silebilir; şikâyet edilebilir (/v1/sikayet {ilan}).
// Saklama YerlesimDO toplum kaydında (`pn`). "Sohbet saklanmaz" kuralı ilana uygulanmaz: ilan oyuncunun bilinçli,
// süreli ve geri alınabilir yayınıdır (sohbet değildir). Saf fonksiyonlar.

import { istekNoCoz } from "../mantik.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { sohbetMaskele } from "./filtre.ts";
import { tekSatir } from "./kurallar.ts";

export const PANO_TURLERI = ["etkinlik", "is", "ozan"] as const;
export type PanoTuru = (typeof PANO_TURLERI)[number];

/** [PARAMETRE] Yerleşim başına tutulan en çok ilan (en eskisi düşer). */
export const PANO_EN_COK = 30;
/** [PARAMETRE] Oyuncu başına günlük (TR günü) ilan sınırı. */
export const PANO_GUNLUK = 3;
/** [PARAMETRE] İlanın ömrü (gerçek zaman). */
export const PANO_OMUR_MS = 7 * 24 * 60 * 60 * 1000;
/** [PARAMETRE] İlan metninin en çok uzunluğu (harf). */
export const PANO_METIN_EN_UZUN = 200;

/** Saklanan ilan: kimlik, sahibi (yerel kimlik) ve adı, tür, metin (maskelenmiş), zaman (ms). */
export interface Ilan {
  i: number;
  o: string;
  ad: string;
  t: PanoTuru;
  m: string;
  z: number;
  /** 4.9: ilanın asıldığı han (yoksa 1. han; eski kayıt). Kimlik numarası yerleşimde tektir. */
  h?: number;
}
export interface PanoKaydi {
  n: number;
  l: Ilan[];
}

export const ilanKimlik = (i: number): string => `p${i}`;
export function ilanCoz(ham: unknown): number | undefined {
  return typeof ham === "string" && /^p[1-9][0-9]{0,8}$/.test(ham) ? Number(ham.slice(1)) : undefined;
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** POST /v1/han/pano {metin, tur, istekNo}: metin tek satır, 1..PANO_METIN_EN_UZUN harf, küfür maskelenir. */
export function panoGirdisiCoz(govde: unknown): Sonuc<{ metin: string; tur: PanoTuru; istekNo: string }> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const istekNo = istekNoCoz(govde);
  if (!istekNo.ok) return istekNo;
  const tur = govde.tur;
  if (typeof tur !== "string" || !(PANO_TURLERI as readonly string[]).includes(tur)) return hata("gecersiz_istek");
  if (typeof govde.metin !== "string" || govde.metin.length > PANO_METIN_EN_UZUN * 8) return hata("metin_gecersiz");
  const m = tekSatir(govde.metin);
  const n = [...m].length;
  if (n < 1 || n > PANO_METIN_EN_UZUN) return hata("metin_gecersiz");
  return basarili({ metin: sohbetMaskele(m), tur: tur as PanoTuru, istekNo: istekNo.deger });
}

/** Süresi geçenleri atar (yerinde). */
export function panoBuda(p: PanoKaydi, simdi: number): void {
  p.l = p.l.filter((x) => simdi - x.z < PANO_OMUR_MS);
}

const ilanHani = (x: Ilan): number => x.h ?? 1;

/** İlan ekler; PANO_EN_COK sınırı han başınadır (o hanın en eski ilanı düşer). */
export function ilanEkle(p: PanoKaydi, ilan: Omit<Ilan, "i" | "z" | "h">, simdi: number, han = 1): Ilan {
  panoBuda(p, simdi);
  const yeni: Ilan = { i: ++p.n, ...ilan, z: simdi, ...(han !== 1 ? { h: han } : {}) };
  p.l.push(yeni);
  let fazla = p.l.filter((x) => ilanHani(x) === han).length - PANO_EN_COK;
  if (fazla > 0) p.l = p.l.filter((x) => !(ilanHani(x) === han && fazla-- > 0));
  return yeni;
}

/** Yalnız sahibi siler. */
export function ilanSil(p: PanoKaydi, o: string, idHam: unknown): Sonuc<{ silindi: string }> {
  const id = ilanCoz(idHam);
  const i = id === undefined ? -1 : p.l.findIndex((x) => x.i === id);
  if (i < 0) return hata("ilan_yok");
  if (p.l[i]!.o !== o) return hata("yetki_yok");
  p.l.splice(i, 1);
  return basarili({ silindi: ilanKimlik(id!) });
}

/**
 * Görünüm: yeniden eskiye; sahibin yerel kimliği (profil bağlantısı), bitiş anı ve "benim" işareti. `han`: yalnız o
 * hanın panosu (4.9; varsayılan 1. han); null bütün hanlar (şikâyet araması).
 */
export function panoGorunumu(p: PanoKaydi | undefined, ben: string, simdi: number, han: number | null = 1) {
  return (p?.l ?? [])
    .filter((x) => simdi - x.z < PANO_OMUR_MS && (han === null || ilanHani(x) === han))
    .sort((a, b) => b.z - a.z || b.i - a.i)
    .map((x) => ({ id: ilanKimlik(x.i), tur: x.t, metin: x.m, kisi: { id: x.o, ad: x.ad }, zaman: x.z, bitis: x.z + PANO_OMUR_MS, benim: x.o === ben }));
}
