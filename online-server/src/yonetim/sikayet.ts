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
/** [PARAMETRE] Açık kuyruğun en çok uzunluğu; dolunca yeni şikayet `kuyruk_dolu` döner. */
export const ACIK_KUYRUK_EN_COK = 2000;
/** Türkiye sürekli UTC+3. */
const TR_FARK_MS = 3 * 60 * 60 * 1000;

export type SikayetDurumu = "acik" | "reddedildi" | "yaptirim";
export const SIKAYET_DURUMLARI = ["acik", "reddedildi", "yaptirim"] as const;

export interface Sikayet {
  id: number;
  sikayetci: string;
  hedef: string;
  neden: SikayetNedeni;
  aciklama?: string;
  zaman: number;
  durum: SikayetDurumu;
  karar?: Kaldirma & { yaptirim?: number };
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
