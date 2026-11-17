// Eşya kademeleri (tezgâh Dilim 4) istemci biçimleri: online-server/src/yerlesim/{kalite,esya,esya-kayit}.ts ile birebir.
// Kademe, özellik, hüner, efsanevi zarı ve yadigâr geçmişi sunucuda hesaplanır; istemci yalnız gösterir. Şans sayısı
// açıkça gelir (`sansDokumu`: yüzde ve kalemler) ve bant etiketiyle birlikte gösterilir; gizli sayı yok.

/** Yedi kademe (kalite.ts KALITE_ADLARI sırası). Eski kayıtlarda yalnız 0–3 gelir. */
export const KADEME_ADLARI = ["sade", "iyi", "ustun", "saheser", "nadide", "efsanevi", "tilsimli"] as const;
export type KademeAdi = (typeof KADEME_ADLARI)[number];
export type Kademe7 = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const KADEME_NADIDE = 4;
export const KADEME_EFSANEVI = 5;
export const KADEME_TILSIMLI = 6;
export const kademeKirp = (q: unknown): Kademe7 => (typeof q === "number" && Number.isFinite(q) ? (Math.max(0, Math.min(6, Math.round(q))) as Kademe7) : 0);
/** Ad ("nadide") ya da sayı → kademe; bilinmeyen ad sade sayılır. */
export const kademeBul = (v: unknown): Kademe7 => (typeof v === "string" ? kademeKirp(Math.max(0, KADEME_ADLARI.indexOf(v as KademeAdi))) : kademeKirp(v));

/**
 * esya.ts ozellikDokumu: gösterilen = gerçek. Bağlı etki gerçek değeriyle gelir (alet `verim` +N adet, `omur` +N kullanım
 * ya da `yipranmaz`); bağlı olmayan etki/hüner "yakında". Çarpan alanı yok (sunucu kaldırdı; hiçbir mantık okumuyordu).
 */
export interface OzellikEtkisi { id: string; bagli: boolean; deger?: number; birim?: "adet" | "kullanim"; yipranmaz?: boolean }
export interface OzellikDokumu {
  aile: string; kademe: number; kalite: string;
  etkiler: OzellikEtkisi[]; eksik: { id: string; kademe: number }[];
  kusur: string | null; hunerler: string[]; hunerDokumu?: { id: string; bagli: boolean }[]; bagli: boolean;
}
/** esya.ts esyaKamuGorunumu (ilan, raf satırı, fiyat tablosu; herkese açık): yadigâr geçmişi YOK. */
export interface EsyaKamu {
  id: string; lakap: number; kademe: number; kalite: string; usta: string; atolye: string; hunerler: string[]; yapim: number; ozellik?: OzellikDokumu;
}
export type ElDegisimi = "yapim" | "satis" | "ismarlama" | "miras" | "devir";
export interface YadigarSatiri { ay: number; tur: ElDegisimi | string; kim: string }
/** esya.ts esyaGorunumu (yalnız sahibine): adlı eşya (efsanevi ve tılsımlı). */
export interface EsyaGorunumu {
  id: string; lakap: number; kademe: number; kalite: string; usta: string; atolye: string;
  hunerler: string[]; yapim: number; gecmis: YadigarSatiri[]; ozellik?: OzellikDokumu;
}
/** Üretim yanıtındaki ham eşya kaydı (kalite.ts EsyaKaydi: i, l lakap, u usta, a atölye, h hünerler, y yapım, g geçmiş). */
export interface EsyaHam { i: string; l: number; u: string; a: string; h: string[]; y: number; g: [number, string, string][] }
export type SansBandi = "yok" | "zayif" | "makul" | "guclu";
/** POST .../uret yanıtı `uretim.efsanevi` (istenmediyse null). */
export interface EfsaneviSonucu {
  denendi: boolean; neden: "nadide_degil" | null; sans: SansBandi; sansDokumu?: SansDokumu; kademe: 5 | 6 | null; esya: EsyaHam | null; kalanHak: number;
}
/** Atölye görünümü `atolye.efsanevi`: bakan pirse deneme hakkı. */
export interface AtolyeEfsanevi { pir: boolean; hak: number; ayda: number }
/** Kalite dökümü ekleri (Dilim 4). */
export type KaliteKisiti = "kalite.tavan.meslek" | "kalite.tavan.emir" | "kalite.tavan.ustaNadide";

/** Herkese açık eşyayı kart görünümüne çevirir: geçmiş yalnız yapım satırıdır (usta ve atölye zaten açık). */
export const esyaKamudan = (e: EsyaKamu): EsyaGorunumu => ({ ...e, gecmis: [] });
export const esyaKamuMu = (v: unknown): v is EsyaKamu => nesne(v) && typeof v.id === "string" && typeof v.lakap === "number" && typeof v.kademe === "number";
/** Yanıttaki `esyalar` alanını süzer (eski sunucu göndermez). */
export const esyalarOku = (v: unknown): EsyaKamu[] => (Array.isArray(v) ? v.filter(esyaKamuMu) : []);

/** Şans dökümü (esya.ts efsaneviSansDokumu): yüzde gerçek sayıdır; kalemler taban, puan fazlası, tavan kesintisi. */
export interface SansDokumu { yuzde: number; bant: SansBandi; kalemler: { k: string; d: number }[]; esik: number; puanBasina: number; tavan: number; tilsimBinde: number }
export const sansDokumuMu = (v: unknown): v is SansDokumu => nesne(v) && typeof v.yuzde === "number" && Array.isArray(v.kalemler);
/** kalite.ts `ustaNadide`: pir olmayanın puanı nadideye yettiğinde zar (yüzde) ve sonucu. */
export interface UstaNadide { yuzde: number; tuttu: boolean }

/** Malın görünen bir partisi: envanter (kaliteGorunumu), depo, raf, pazar; ek alanlar yalnız nadide ve üstünde. */
export interface KademeliParti {
  mal: string; kademe: number; adet?: number; yapan?: string | null; huner?: string; esya?: EsyaGorunumu;
}

const nesne = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Üretim yanıtının ham eşyasını kart görünümüne çevirir (özellik dökümü yanıtın `ozellik` alanından). */
export function esyaHamdan(ham: EsyaHam, kademe: number, ozellik?: unknown): EsyaGorunumu {
  return {
    id: ham.i, lakap: ham.l, kademe, kalite: KADEME_ADLARI[kademeKirp(kademe)], usta: ham.u, atolye: ham.a,
    hunerler: [...(ham.h ?? [])], yapim: ham.y, gecmis: (ham.g ?? []).map(([ay, tur, kim]) => ({ ay, tur, kim })),
    ...(ozellikMi(ozellik) ? { ozellik } : {}),
  };
}
export const ozellikMi = (v: unknown): v is OzellikDokumu => nesne(v) && typeof v.aile === "string" && Array.isArray(v.etkiler) && Array.isArray(v.eksik);
export const efsaneviMi = (v: unknown): v is EfsaneviSonucu => nesne(v) && typeof v.denendi === "boolean" && typeof v.sans === "string";
export const atolyeEfsaneviMi = (v: unknown): v is AtolyeEfsanevi => nesne(v) && typeof v.pir === "boolean" && typeof v.hak === "number";

/** Nadide ve üstü dokunulabilir: kartı açılır (hüner, usta, yadigâr). */
export const kartliMi = (p: Pick<KademeliParti, "kademe">) => p.kademe >= KADEME_NADIDE;
/** Yadigâr geçmişi en çok sekiz satır; ilk satır hep yapım (sunucu da böyle keser; burada yalnız güvence). */
export const YADIGAR_EN_COK = 8;
export function yadigarSatirlari(g: readonly YadigarSatiri[]): YadigarSatiri[] {
  if (g.length <= YADIGAR_EN_COK) return [...g];
  return [g[0]!, ...g.slice(g.length - (YADIGAR_EN_COK - 1))];
}
