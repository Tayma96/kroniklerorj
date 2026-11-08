// Yaptırım kuralları (saf): girdi doğrulama, etkin özet, HesapDO'da uygulanacak engel.
// Uzaklaştırılmış hesabın giriş dışındaki bütün /v1/* istekleri `uzaklastirildi` (403, bitiş zamanıyla) döner.
// Susturma Y1'de yalnız kayıtlı bayraktır: sohbet (Faz 10) okuyacak; şimdilik yalnız /v1/sikayet'i kapatır.

import { istekNoCoz } from "../mantik.ts";
import { basarili, hata, type Basarisiz, type HesapYaptirimi, type Sonuc } from "../tipler.ts";

export const GUN_MS = 24 * 60 * 60 * 1000;
/** [PARAMETRE] Geçici uzaklaştırmanın en uzun süresi (gün); parametre katmanı ile değiştirilebilir. */
export const GECICI_UZAKLASTIRMA_EN_COK_GUN = 7;
/** [PARAMETRE] Susturmanın en uzun süresi (gün). */
export const SUSTURMA_EN_COK_GUN = 30;
/** [PARAMETRE] Gerekçe uzunluğu (karakter). */
export const GEREKCE_EN_KISA = 10;
export const GEREKCE_EN_UZUN = 500;

export const YAPTIRIM_TURLERI = ["susturma", "uzaklastirma", "kaliciUzaklastirma"] as const;
export type YaptirimTuru = (typeof YAPTIRIM_TURLERI)[number];

export interface Kaldirma {
  kim: string;
  /** İşlemi yapanın o andaki rolü; moderatöre e-posta yerine bu gösterilir. */
  kimRol?: string;
  zaman: number;
  gerekce: string;
}

export interface Yaptirim {
  id: number;
  tur: YaptirimTuru;
  baslangic: number;
  /** null = kalıcı. */
  bitis: number | null;
  kim: string;
  kimRol?: string;
  gerekce: string;
  /** Şikayet kararından geldiyse şikayet numarası. */
  sikayet?: number;
  kaldirma?: Kaldirma;
}

export interface YaptirimGirdisi {
  hedef: string;
  tur: YaptirimTuru;
  gun?: number;
  gerekce: string;
  istekNo: string;
}

const HESAP_DESENI = /^[A-Za-z0-9_-]{1,128}$/;

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Opak hesap kimliği biçimi (varlık ayrıca DunyaDO'dan doğrulanır). */
export function hesapIdCoz(ham: unknown): string | undefined {
  return typeof ham === "string" && HESAP_DESENI.test(ham) ? ham : undefined;
}

/** Kırpılmış gerekçe; en az GEREKCE_EN_KISA harf/rakam içermeli (boşluk, noktalama, görünmez dolgu sayılmaz). */
export function gerekceCoz(ham: unknown): Sonuc<string> {
  if (typeof ham !== "string") return hata("gerekce_gecersiz");
  const g = metinTemizle(ham);
  const harfRakam = g.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  return harfRakam >= GEREKCE_EN_KISA && [...g].length <= GEREKCE_EN_UZUN ? basarili(g) : hata("gerekce_gecersiz");
}

/**
 * Görünmez ve yön değiştiren karakterleri atar, kırpar: satır sonu dışındaki denetim karakterleri (Cc), biçim
 * karakterleri (Cf: sıfır genişlikli, bidi U+202A-202E, U+2066-2069, BOM) ve harf sayılan boş dolgular
 * (Hangul dolgu U+115F, U+1160, U+3164, U+FFA0; Braille boşluğu U+2800).
 */
const GORUNMEZ = /[\p{Cc}\p{Cf}\u115f\u1160\u3164\uffa0\u2800]/gu;
export function metinTemizle(ham: string): string {
  return ham.normalize("NFC").replace(GORUNMEZ, (c) => (c === "\n" ? c : "")).trim();
}

export function turMu(v: unknown): v is YaptirimTuru {
  return typeof v === "string" && (YAPTIRIM_TURLERI as readonly string[]).includes(v);
}

/** POST /yonetim/yaptirim gövdesi. `enCokGecici`: parametre katmanındaki etkin değer. */
export function yaptirimGirdisiCoz(govde: unknown, enCokGecici: number): Sonuc<YaptirimGirdisi> {
  if (!nesneMi(govde)) return hata("gecersiz_istek");
  const istekNo = istekNoCoz(govde);
  if (!istekNo.ok) return istekNo;
  const hedef = hesapIdCoz(govde.hedef);
  if (!hedef) return hata("hesap_yok");
  const sure = yaptirimSuresiCoz(govde.tur, govde.gun, enCokGecici);
  if (!sure.ok) return sure;
  const gerekce = gerekceCoz(govde.gerekce);
  if (!gerekce.ok) return gerekce;
  return basarili({ hedef, ...sure.deger, gerekce: gerekce.deger, istekNo: istekNo.deger });
}

/** Tür ve gün: susturma 1..SUSTURMA_EN_COK_GUN, geçici 1..enCokGecici, kalıcıda gün verilmez. */
export function yaptirimSuresiCoz(
  tur: unknown,
  gun: unknown,
  enCokGecici: number,
): Sonuc<{ tur: YaptirimTuru; gun?: number }> {
  if (!turMu(tur)) return hata("yaptirim_gecersiz");
  if (tur === "kaliciUzaklastirma") return gun === undefined || gun === null ? basarili({ tur }) : hata("gun_gecersiz");
  const enCok = tur === "susturma" ? SUSTURMA_EN_COK_GUN : enCokGecici;
  if (typeof gun !== "number" || !Number.isInteger(gun) || gun < 1 || gun > enCok) return hata("gun_gecersiz");
  return basarili({ tur, gun });
}

export function yaptirimEtkin(y: Yaptirim, simdi: number): boolean {
  return !y.kaldirma && (y.bitis === null || y.bitis > simdi);
}

/** Etkin yaptırımlardan hesap özeti: uzaklaştırmada kalıcı baskındır, değilse en geç bitiş. */
export function etkinOzet(liste: readonly Yaptirim[], simdi: number): HesapYaptirimi {
  const ozet: HesapYaptirimi = {};
  for (const y of liste) {
    if (!yaptirimEtkin(y, simdi)) continue;
    const alan = y.tur === "susturma" ? "susturma" : "uzaklastirma";
    const onceki = ozet[alan];
    if (!onceki) ozet[alan] = { bitis: y.bitis };
    else if (onceki.bitis !== null && (y.bitis === null || y.bitis > onceki.bitis)) ozet[alan] = { bitis: y.bitis };
  }
  return ozet;
}

function surer(o: { bitis: number | null } | undefined, simdi: number): o is { bitis: number | null } {
  return o !== undefined && (o.bitis === null || o.bitis > simdi);
}

/** Bu islemler yaptırımdan etkilenmez: giriş (oyuncu bitiş zamanını görür) ve yönetimin kendi yazımı. */
const MUAF = new Set(["giris", "yaptirimYaz"]);

/** HesapDO'da her iletiden önce: engel varsa yanıt, yoksa undefined. */
export function yaptirimEngeli(durum: HesapYaptirimi | undefined, islem: string, simdi: number): Basarisiz | undefined {
  if (!durum || MUAF.has(islem)) return undefined;
  if (surer(durum.uzaklastirma, simdi)) return { ok: false, hata: "uzaklastirildi", bitis: durum.uzaklastirma.bitis };
  if (islem === "sikayet" && surer(durum.susturma, simdi)) {
    return { ok: false, hata: "susturuldu", bitis: durum.susturma.bitis };
  }
  return undefined;
}

/** Giriş yanıtına eklenecek bilgi: süren uzaklaştırma varsa bitişi. */
export function uzaklastirmaBilgisi(durum: HesapYaptirimi | undefined, simdi: number): { bitis: number | null } | undefined {
  return durum && surer(durum.uzaklastirma, simdi) ? { bitis: durum.uzaklastirma.bitis } : undefined;
}
