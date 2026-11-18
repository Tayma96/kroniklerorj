// Kervan (D2, ONLINE_DURUM §4.7): `tuccar.yukHayvani` (kervan.0) düğümlü tüccar malını başka bir yerleşimin NPC
// alıcısına yollar. Saf kurallar: kapılar (önizleme ve gerçek iş aynı sırayla), yük, kalkış, varışta satış ve dönüş.
//
// Akış (her adım işlem kimliğiyle tekrar güvenli; mal ve akçe hiçbir anda iki yerde değildir):
//   (1) Kaynak yerleşim: mallar + bedel (2 nal + 1 koşum) envanterden, 2 takat karakterden düşer; kervan kaydı
//       kalıcı çıkış kutusuna (`kv.c`, mulk/transfer.ts deseni) yazılır. Varış ayı = kalkış ayı + KERVAN_YOL_AY.
//       Yoldaki mal yalnız bu kayıttadır.
//   (2) Varış ayı gelince (ay dönümü alarmı ya da sonraki istek) kaynak, hedef yerleşime `kervanVaris` iletir.
//       Hedef, işlem kimliğini giriş defterinde (`kv.g`) arar: yoksa satışı yapar ve sonucu (satılan, kalan,
//       hasılat, döküm) aynen yazar; varsa yazılı sonucu döner. Tekrarlanan teslim ikinci kez satmaz.
//   (3) Kaynak cevaba göre kaydı kapatır: hasılat tüccarın akçesine, satılmayan mal envanterine döner (ilk sürüm:
//       hedefte emanet yok). Hedefin kalıcı reddinde bütün mallar geri yazılır. Cevap gelmezse kayıt bekler ve
//       uzlaştırma yeniden dener (zaman aşımı telafi doğurmaz).
//
// Akçe yoktan doğmaz: hasılat mevcut NPC satış kuralıyla (pazar.ts `npcyeSat`) aynıdır: birim `satisDegeri`
// (taban + hedefteki kıtlık primi), primli birim KITLIK_KOTASI ile, adet `npcSatisKotasi` ile sınırlı (tüccarın o
// yerleşimdeki varış kotası, varış ayına bağlı). NPC alıcı tanımlı ve kotalı kaynaktır; satılan mal hedefin kasaba
// stoğuna girer. Farm süzgeci: tüccar başına ayda KERVAN_AYLIK kervan, aynı mal aynı hedefe ayda bir, varış kotası,
// kendi yerleşimine kervan yok; stoktan (×1,5) ya da NPC'den (×2,5) alınan mal kıtlıklı satışta (×1,5) kâr etmez.

import { MALLAR, malBul, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { yerlesimBul } from "../dunya-veri.ts";
import { basarili, hata, type HataKodu, type Sonuc } from "../tipler.ts";
import { bosKutu, cikisAc, type CikisKaydi, type CikisKutusu } from "../mulk/transfer.ts";
import { hizmetAcik, sinerjiAcik } from "./beceri-etki.ts";
import { aracAsindir, type Asinma } from "./tarif.ts";
import { olduMu } from "./hanedan.ts";
import { takatHarca, takatTazele } from "./karakter.ts";
import { loncaTablosu, oyuncuSayaci, type LoncaSatiri } from "./lonca.ts";
import { enIyiKalite, esyaKilidi } from "./kalite.ts";
import { aileEtkisi, ARAC_KALITE_YUK, enIyiBirim, YOL_GIYSISI } from "./esya.ts";
import { kaliteYuzdesi } from "./kanca-kalite.ts";
import { envanterEkle, npcFiyat, satisDegeri, stogaEkle, type KasabaStogu } from "./npc-taban.ts";
import { KITLIK_KOTASI, npcSatisEki, npcSatisKotasi } from "./pazar.ts";
import { arkaPlanAl, tetikSurer } from "./arka-plan.ts";
import { gostergeOku, gostergeTetikCarpani } from "./topluluk-kayit.ts";
import type { CalismaParametreleri, Dokum, Karakter, Kasaba } from "./tipler.ts";

/** [PARAMETRE] Kervan bedeli: envanterden nal ve koşum (tüketilir), karakterden takat. */
export const KERVAN_NAL = 2;
export const KERVAN_KOSUM = 1;
export const KERVAN_TAKAT = 2;
/** [PARAMETRE] Yük tavanı (adet, bütün mallar toplamı); `tuccar.topluYuk` + envanterde araba ile toplu yük tavanı. */
export const KERVAN_YUK_EN_COK = 12;
export const KERVAN_TOPLU_YUK_EN_COK = 30;
/**
 * [PARAMETRE] Kanca partisi 2 (§9 araç ailesi): toplu yükte kağnı da taşıt olur (araba 30, kağnı 20); taşıt toplu
 * yükte bir kullanım aşınır (MALLAR ömrü + `omur` etkileri + kalitesi), koşum her kervanda bir kullanım (ömrü 1: bugünkü
 * gibi tükenir; `omur:kosum` ve kalitesi uzatır). Taşıtın kalitesi yüke kademe başına +1 adet ekler; `kalite:kervan`
 * yük tavanını yüzde artırır. Hepsinin üstünde mutlak tavan KERVAN_YUK_MUTLAK (varış doğrulaması da bunu kullanır).
 */
export const KERVAN_KAGNI_YUK_EN_COK = 20;
export const KERVAN_TASIT_KALITE_YUK: readonly number[] = ARAC_KALITE_YUK;
/**
 * [PARAMETRE] Kanca partisi 2: kervan yükü kalitesinin hedefleri (`kalite:kervan`, tüccarın güvenli yol bilgisi
 * `kalite:yolGuvenligi`) toplanır ve bu yüzdeyle kırpılır (tek yığılma; mutlak tavan ayrıca).
 */
export const KERVAN_KALITE_HEDEFLERI: readonly string[] = ["kervan", "yolGuvenligi"];
export const KERVAN_KALITE_TAVAN = 30;
/**
 * [PARAMETRE] Kanca partisi 2 (§9 giysi "yol"): yükten sonra elde kalan çizme üstün ve üstüyse kervan takatı
 * CIZME_YOL_TAKAT kadar azalır (en az KERVAN_TAKAT_EN_AZ); çizme bir kullanım aşınır (`omur:cizme` ve kalitesi uzatır).
 */
export const KERVAN_TAKAT_EN_AZ = 1;
export const KERVAN_YUK_MUTLAK = 40;
/** [PARAMETRE] Yolculuk süresi (oyun ayı). Parayla kısaltılmaz; gecikme ceza getirmez. */
export const KERVAN_YOL_AY = 1;
/** [PARAMETRE] Tüccar başına bir oyun ayında en çok kervan. */
export const KERVAN_AYLIK = 2;
/** [PARAMETRE] Hedefte tutulan varış kotası ayı (eski aylar budanır) ve giriş defteri saklama süresi (ms). */
export const KERVAN_KOTA_AY_TUT = 3;
export const KERVAN_GIRIS_SAKLAMA_MS = 120 * 24 * 60 * 60 * 1000;
/** [PARAMETRE] Fiyat haberi: takat bedeli, yerleşim sayısı, yerleşim başına mal, geçerlilik (oyun ayı). */
export const HABER_TAKAT = 1;
export const HABER_YERLESIM = 3;
export const HABER_MAL = 3;
export const HABER_GECERLILIK_AY = 1;
/**
 * [PARAMETRE] Kanca partisi 2: haber kalitesi (`kalite:fiyatHaberi` yüzdesi) bu eşiğe ulaşırsa haber bir ay daha
 * geçerli kalır (yalnız bilgi; akçe ve kota değişmez). Ek ay en çok HABER_KALITE_EK_AY.
 */
export const HABER_KALITE_ESIGI = 15;
export const HABER_KALITE_EK_AY = 1;

/** Haberin kalitesi ve ek geçerlilik ayı (döküm). */
export function haberKalitesi(kar: Karakter): { yuzde: number; ekAy: number; kalemler: { kanca: string; d: number }[] } {
  const k = kaliteYuzdesi(kar, [HABER_HIZMETI]);
  return { yuzde: k.yuzde, ekAy: k.yuzde >= HABER_KALITE_ESIGI ? HABER_KALITE_EK_AY : 0, kalemler: k.kalemler };
}

/** Kervanda yol giysisi (esya.ts YOL_GIYSISI ile aynı mal; tür denetimli). */
const CIZME = "cizme" satisfies typeof YOL_GIYSISI;

/** Kervanda giyilecek çizme (yükten sonra elde kalan, en iyisi) ve yol etkisi; etkisizse null. */
export function kervanCizmesi(kar: Karakter, yuk: Yuk = {}): { mal: MalId; kalite: number; takat: number } | null {
  if ((kar.ev?.[CIZME] ?? 0) - (yuk[CIZME] ?? 0) < 1) return null;
  const b = enIyiBirim(kar, CIZME);
  const e = aileEtkisi(CIZME, b.q, "yol", b.hunerler);
  const d = e && "deger" in e ? e.deger : 0;
  return d > 0 ? { mal: CIZME, kalite: b.q, takat: d } : null;
}

/** Kervanın takat bedeli: KERVAN_TAKAT − çizmenin yol etkisi (en az KERVAN_TAKAT_EN_AZ). */
export function kervanTakati(kar: Karakter, yuk: Yuk = {}): number {
  return Math.max(KERVAN_TAKAT_EN_AZ, KERVAN_TAKAT - (kervanCizmesi(kar, yuk)?.takat ?? 0));
}

/** Kervan düğümlerinin hizmet adları (src/icerik/agaclar/tuccar.ts). */
export const KERVAN_HIZMETI = "kervan";
export const TOPLU_YUK_HIZMETI = "topluYuk";
export const HABER_HIZMETI = "fiyatHaberi";

/**
 * Kanca partisi 2 (uzak kervan). Yalnız BAŞKA BEYLİĞE giden kervanda:
 * - `hizmet:uzakKervan` (tüccar "uzak şehir"): yük tavanına +UZAK_KERVAN_YUK_EK adet (mutlak tavan aynı). Satışı
 *   varış kotası sınırlar; yük fazlası satılamazsa geri döner, akçe doğmaz.
 * - `sinerji:uzakAnlasma` (kâtip tercüme + tüccar uzak şehir): uzak alıcıyla anlaşma, hedefteki varış kotasına mal
 *   başına +UZAK_ANLASMA_KOTA_EK. Kıtlık primi kotası (KITLIK_KOTASI) ve "alınan mal kâr etmez" kuralı aynıdır.
 * Kaynak kendi kişisinden hesaplar ve yüke `ke` olarak yazar; hedef beylik farkını yeniden denetler ve kırpar.
 */
export const UZAK_KERVAN_HIZMETI = "uzakKervan";
export const UZAK_ANLASMA_SINERJISI = "uzakAnlasma";
/** [PARAMETRE] Uzak kervanın yük eki (adet). */
export const UZAK_KERVAN_YUK_EK = 6;
/** [PARAMETRE] Uzak anlaşmanın varış kotası eki (mal başına adet, ayda; hesap başına). */
export const UZAK_ANLASMA_KOTA_EK = 1;

/** İki yerleşim farklı beylikte mi (bilinmeyen yerleşim: hayır). */
export function uzakMi(kaynak: string | undefined, hedef: string): boolean {
  if (!kaynak) return false;
  const a = yerlesimBul(kaynak);
  const b = yerlesimBul(hedef);
  return !!a && !!b && a.beylik !== b.beylik;
}

/** Kaynakta: tüccarın bu hedefe varış kotası eki (uzak anlaşma). */
export function uzakKotaEki(kar: Karakter, kaynak: string | undefined, hedef: string): number {
  return uzakMi(kaynak, hedef) && sinerjiAcik(kar, UZAK_ANLASMA_SINERJISI) ? UZAK_ANLASMA_KOTA_EK : 0;
}

/** Hedefte: yükteki eki doğrular (tam sayı, tavanlı) ve beylik farkı yoksa sıfırlar. */
export function gecerliKotaEki(ke: unknown, kaynak: string | undefined, hedef: string): number {
  if (!Number.isInteger(ke) || (ke as number) <= 0 || !uzakMi(kaynak, hedef)) return 0;
  return Math.min(UZAK_ANLASMA_KOTA_EK, ke as number);
}

/** Kapılar, denetim sırasıyla (önizleme ve gerçek iş ilk tutmayanı aynı sırayla bulur). */
export const KERVAN_KAPI_SIRASI = ["olu", "dugum", "yuk", "mal", "bedel", "takat", "aylik", "malHedef", "kutu"] as const;
export type KervanKapisi = (typeof KERVAN_KAPI_SIRASI)[number];
export const KERVAN_KAPI_HATASI: Readonly<Record<KervanKapisi, HataKodu>> = {
  olu: "olu",
  dugum: "dugum_kapali",
  yuk: "kervan_yuk_siniri",
  mal: "mal_yok",
  bedel: "kervan_bedel_yok",
  takat: "takat_yok",
  aylik: "kervan_aylik_siniri",
  malHedef: "kervan_mal_hedef",
  kutu: "transfer_bekliyor",
};

export type Yuk = Partial<Record<MalId, number>>;

/** Yoldaki kervanın yükü (çıkış kaydının `y` alanı). */
export interface KervanYuku {
  /** Gönderen yerel kimlik ve hesap. */
  o: string;
  hs: string;
  ev: Yuk;
  /** Kalkış ve varış ayı. */
  ka: number;
  va: number;
  /** Kanca partisi 2: uzak anlaşma varış kotası eki (yalnız başka beyliğe; yoksa 0). */
  ke?: number;
}

/** Bir malın varış satışı. */
export interface VarisSatiri {
  mal: MalId;
  adet: number;
  satilan: number;
  kalan: number;
  /** Varış kotası (tüccarın bu yerleşimde bu maldan varış ayında satabileceği). */
  kota: { tavan: number; once: number; kalan: number };
  /** Birim satış değeri (taban + hedefteki kıtlık primi). */
  birim: Dokum;
  /** Primli birim sayısı ve satırın toplamı. */
  kitlikAdet: number;
  tutar: number;
  dokum: Dokum;
}

/** Hedefin giriş defterindeki sonuç (aynı işlem aynı sonucu alır). */
export interface VarisSonucu {
  durum: "kabul" | "red";
  neden?: string;
  an: number;
  hasilat: number;
  satilan: Yuk;
  kalan: Yuk;
  satirlar: VarisSatiri[];
  /** Kanca partisi 2: uygulanan uzak anlaşma kota eki (varsa). */
  ke?: number;
}

/** Fiyat haberi: bir yerleşimin özeti. */
export interface FiyatOzeti {
  yerlesim: string;
  ay: number;
  lonca: LoncaSatiri[];
  /** En pahalı mallar: önce kıtlık primli, sonra birim değer; NPC alış (satış değeri) ve NPC satış fiyatı. */
  pahali: { mal: MalId; alis: Dokum; npcSatis: Dokum }[];
  /** Kanca partisi 2 `fiyatDongusu` (uzak pazarın fiyat döngüsü): yalnız hakkı olanın haberinde. */
  dongu?: FiyatDongusu;
}

/** Fiyatı süren etkenler: kıtlık primi sürüyor mu ve hangi aya dek, Erzak (arz) göstergesi, kıtlık olasılığı çarpanı. */
export interface FiyatDongusu {
  kitlik: boolean;
  kitlikBitis: number | null;
  arz: number;
  kitlikCarpani: number;
}

/** Hedef yerleşimin fiyat döngüsü (salt okuma). */
export function fiyatDongusu(k: Kasaba): FiyatDongusu {
  const ap = arkaPlanAl(k);
  const kitlik = tetikSurer(ap, "kitlik", k.ay);
  return { kitlik, kitlikBitis: kitlik ? (ap.tt.kitlik ?? null) : null, arz: gostergeOku(k, "arz"), kitlikCarpani: gostergeTetikCarpani(k, "kitlik") };
}
export interface KervanHaberi {
  ay: number;
  /** Son geçerli ay (dahil). */
  gecerli: number;
  yerlesimler: FiyatOzeti[];
}

/** Yerleşimin kervan defteri (depo anahtarı "kv"). */
export interface KervanDefteri {
  /** Kaynak: yoldaki kervanlar (t: "kervan", a: 0, y: KervanYuku). */
  c: CikisKutusu;
  /** Kaynak: yerel kimlik → [ay, o ay çıkan kervan, "mal:hedef" listesi]. */
  s: Record<string, [ay: number, sayi: number, mh: string[]]>;
  /** Hedef: işlem kimliği → sonuç. */
  g: Record<string, VarisSonucu>;
  /** Hedef: hesap → varış ayı → mal → [satılan, primli]. */
  v: Record<string, Record<string, Partial<Record<MalId, [number, number]>>>>;
  /** Kaynak: yerel kimlik → son fiyat haberi. */
  h: Record<string, KervanHaberi>;
}

export function bosKervanDefteri(): KervanDefteri {
  return { c: bosKutu(), s: {}, g: {}, v: {}, h: {} };
}

export function kervanIslemiMi(v: unknown): v is string {
  return typeof v === "string" && /^kervan:[a-z0-9]{1,32}:[A-Za-z0-9_-]{1,32}:[A-Za-z0-9_-]{8,64}$/.test(v);
}

const say = (y: Yuk): number => Object.values(y).reduce((a: number, n) => a + (n ?? 0), 0);

/** Hedef: bilinen başka bir yerleşim. İlk sürümde komşuluk verisi yok: aynı beylik ya da herhangi bir beylik. */
export function kervanHedefi(kaynak: string, ham: unknown): Sonuc<string> {
  if (typeof ham !== "string" || !yerlesimBul(ham)) return hata("yerlesim_gecersiz");
  if (ham === kaynak) return hata("kervan_ayni_yer");
  return basarili(ham);
}

/** Yük biçimi: {mal: adet}; satılabilir mal (taban > 0), tam sayı ≥ 1. Tavan kapısı ayrıdır. */
export function yukCoz(ham: unknown): Sonuc<Yuk> {
  if (typeof ham !== "object" || ham === null || Array.isArray(ham)) return hata("kervan_yuk_gecersiz");
  const yuk: Yuk = {};
  const girdiler = Object.entries(ham as Record<string, unknown>);
  if (girdiler.length === 0 || girdiler.length > 32) return hata("kervan_yuk_gecersiz");
  for (const [m, n] of girdiler) {
    const mal = malBul(m);
    if (!mal || MALLAR[mal].taban <= 0) return hata("kervan_yuk_gecersiz");
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > KERVAN_TOPLU_YUK_EN_COK) return hata("kervan_yuk_gecersiz");
    yuk[mal] = n;
  }
  return basarili(yuk);
}

/** "mal:adet,mal:adet" sorgu biçimi (önizleme). */
export function yukSorguCoz(ham: unknown): Sonuc<Yuk> | undefined {
  if (typeof ham !== "string" || ham === "") return undefined;
  const nesne: Record<string, number> = {};
  for (const parca of ham.split(",").slice(0, 33)) {
    const [m, n] = parca.split(":");
    if (!m || !n || !/^\d{1,3}$/.test(n)) return hata("kervan_yuk_gecersiz");
    nesne[m] = Number(n);
  }
  return yukCoz(nesne);
}

/**
 * Yük tavanı: toplu yük düğümü ve (gönderilenden sonra) envanterde kalan taşıt varsa araba 30 / kağnı 20 (+ taşıt
 * kalitesi), yoksa 12; `kalite:kervan` yüzdesi eklenir (aşağı yuvarlanır); mutlak tavanla kırpılır. `tasit` toplu
 * yükte aşınacak taşıttır (yük temel tavanı aşmıyorsa taşıt aşınmaz).
 */
export function yukTavani(kar: Karakter, yuk: Yuk = {}, uzak = false) {
  const topluYuk = hizmetAcik(kar, TOPLU_YUK_HIZMETI);
  const kalan = (m: MalId) => (kar.ev?.[m] ?? 0) - (yuk[m] ?? 0) >= 1;
  const araba = kalan("araba");
  const kagni = kalan("kagni");
  const tasit: MalId | null = topluYuk ? (araba ? "araba" : kagni ? "kagni" : null) : null;
  const taban = tasit === "araba" ? KERVAN_TOPLU_YUK_EN_COK : tasit === "kagni" ? KERVAN_KAGNI_YUK_EN_COK : KERVAN_YUK_EN_COK;
  const tasitKalite = tasit ? (KERVAN_TASIT_KALITE_YUK[enIyiKalite(kar, tasit)] ?? 0) : 0;
  const kalite = Math.min(KERVAN_KALITE_TAVAN, kaliteYuzdesi(kar, KERVAN_KALITE_HEDEFLERI).yuzde);
  const uzakEk = uzak && hizmetAcik(kar, UZAK_KERVAN_HIZMETI) ? UZAK_KERVAN_YUK_EK : 0;
  const tavan = Math.min(KERVAN_YUK_MUTLAK, Math.floor(((taban + tasitKalite) * (100 + kalite)) / 100) + uzakEk);
  return { tavan, topluYuk, araba, kagni, tasit, tasitKalite, kalite, taban, uzakEk };
}

function aySayaci(d: KervanDefteri | undefined, o: string, ay: number): [number, number, string[]] {
  const s = d?.s[o];
  return s && s[0] === ay ? s : [ay, 0, []];
}

/** Kervan Mevsimi etkinliği (src/etkinlik/) tüccar başına aylık tavanı artırır. */
export const kervanAylikTavan = (k: Pick<Kasaba, "pr">): number => KERVAN_AYLIK + (k.pr?.ETK?.kervanEk ?? 0);

/** Kapılar (yük yoksa yüke bağlı kapılar `null`). Takat tembel tazelenir (karakterin kendi kuralı). */
export function kervanKapilari(
  d: KervanDefteri | undefined,
  kar: Karakter,
  ay: number,
  hedef: string,
  yuk: Yuk | undefined,
  aylikTavan = KERVAN_AYLIK,
  kaynak?: string,
): Record<KervanKapisi, boolean | null> {
  takatTazele(kar, ay);
  const ev = kar.ev ?? {};
  const [, sayi, mh] = aySayaci(d, kar.o, ay);
  const y = yuk ?? {};
  return {
    olu: !olduMu(kar),
    dugum: hizmetAcik(kar, KERVAN_HIZMETI),
    yuk: yuk ? say(yuk) <= yukTavani(kar, yuk, uzakMi(kaynak, hedef)).tavan : null,
    mal: yuk ? (Object.entries(yuk) as [MalId, number][]).every(([m, n]) => (ev[m] ?? 0) >= n) : null,
    bedel: (ev.nal ?? 0) - (y.nal ?? 0) >= KERVAN_NAL && (ev.kosum ?? 0) - (y.kosum ?? 0) >= KERVAN_KOSUM,
    takat: kar.tk >= kervanTakati(kar, y),
    aylik: sayi < aylikTavan,
    malHedef: yuk ? Object.keys(yuk).every((m) => !mh.includes(`${m}:${hedef}`)) : null,
    kutu: (d?.c.k.length ?? 0) < 32,
  };
}

export function ilkKervanEngeli(k: Record<KervanKapisi, boolean | null>): HataKodu | undefined {
  const kapi = KERVAN_KAPI_SIRASI.find((x) => k[x] === false);
  return kapi ? KERVAN_KAPI_HATASI[kapi] : undefined;
}

/**
 * (1) Kalkış: kapılar tutmalı (çağıran denetler); mallar + bedel düşer, takat harcanır, sayaç artar, çıkış kaydı
 * açılır. Başarılıysa kayıt döner.
 */
export function kervanCikar(d: KervanDefteri, kar: Karakter, hedef: string, yuk: Yuk, ay: number, islem: string, an: number, aylikTavan = KERVAN_AYLIK, kaynak?: string): Sonuc<CikisKaydi & { asinma: Asinma[] }> {
  const engel = ilkKervanEngeli(kervanKapilari(d, kar, ay, hedef, yuk, aylikTavan, kaynak));
  if (engel) return hata(engel);
  const ihtiyac: Partial<Record<string, number>> = { ...yuk };
  ihtiyac.nal = (ihtiyac.nal ?? 0) + KERVAN_NAL;
  const kilit = esyaKilidi(kar, ihtiyac);
  if (kilit) return hata(kilit);
  const yt = yukTavani(kar, yuk, uzakMi(kaynak, hedef));
  const cizme = kervanCizmesi(kar, yuk);
  if (!takatHarca(kar, ay, kervanTakati(kar, yuk))) return hata("takat_yok");
  for (const [m, n] of Object.entries(yuk) as [MalId, number][]) envanterEkle(kar, m, -n);
  envanterEkle(kar, "nal", -KERVAN_NAL);
  // Koşum ve (toplu yükte) taşıt araçtır: bir kullanım aşınır (ömrü dolunca tükenir).
  const asinma: Asinma[] = [aracAsindir(kar, "kosum")];
  if (yt.tasit && say(yuk) > KERVAN_YUK_EN_COK) asinma.push(aracAsindir(kar, yt.tasit));
  // Yol giysisi: etkisi olan çizme bir kullanım aşınır ("cizme" ömrü: omur etkileri + kalitesi).
  if (cizme) asinma.push(aracAsindir(kar, cizme.mal));
  const [, sayi, mh] = aySayaci(d, kar.o, ay);
  d.s[kar.o] = [ay, sayi + 1, [...mh, ...Object.keys(yuk).map((m) => `${m}:${hedef}`)]];
  const ke = uzakKotaEki(kar, kaynak, hedef);
  const y: KervanYuku = { o: kar.o, hs: kar.h, ev: { ...yuk }, ka: ay, va: ay + KERVAN_YOL_AY, ...(ke > 0 ? { ke } : {}) };
  const kayit = { i: islem, t: "kervan", h: hedef, a: 0, y: y as unknown as Record<string, unknown> };
  cikisAc(d.c, kayit, an);
  return basarili({ ...kayit, b: an, d: 0, s: an, asinma });
}

/** Ay sayaçlarının bayatlarını siler (kaynak). */
export function sayacBuda(d: KervanDefteri, ay: number): void {
  for (const [o, s] of Object.entries(d.s)) if (s[0] < ay) delete d.s[o];
}

/** Kervan yükü biçimi (iç ileti; alan alan denetlenir). */
export function kervanYukuGecerli(y: unknown): y is KervanYuku {
  if (typeof y !== "object" || y === null) return false;
  const x = y as Partial<KervanYuku>;
  if (typeof x.o !== "string" || typeof x.hs !== "string" || !Number.isInteger(x.ka) || x.va !== (x.ka ?? NaN) + KERVAN_YOL_AY) return false;
  if (x.ke !== undefined && (!Number.isInteger(x.ke) || x.ke < 0 || x.ke > UZAK_ANLASMA_KOTA_EK)) return false;
  const yuk = yukCoz(x.ev);
  return yuk.ok && say(yuk.deger) <= KERVAN_YUK_MUTLAK;
}

type Kullanilan = (mal: MalId) => [satilan: number, primli: number];

/** Varış satışını hesaplar (yazmaz): hedefin lonca sayımı, parametreleri ve tüccarın varış kotasıyla. */
export function varisHesapla(yuk: Yuk, oyuncuSayisi: (m: MeslekId) => number, kullanilan: Kullanilan, p?: CalismaParametreleri, ke = 0): Omit<VarisSonucu, "durum" | "an"> {
  const satirlar: VarisSatiri[] = [];
  const satilan: Yuk = {};
  const kalan: Yuk = {};
  let hasilat = 0;
  for (const [mal, adet] of (Object.entries(yuk) as [MalId, number][]).sort(([a], [b]) => (a < b ? -1 : 1))) {
    const n = oyuncuSayisi(MALLAR[mal].meslek);
    const tavan = npcSatisKotasi(mal, n, npcSatisEki(p) + ke);
    const [once, primOnce] = kullanilan(mal);
    const sat = Math.min(adet, Math.max(0, tavan - once));
    const birim = satisDegeri(mal, n, p);
    const prim = birim.kalemler.find((x) => x.k === "kitlik")?.d ?? 0;
    const kitlikAdet = prim > 0 ? Math.min(sat, Math.max(0, KITLIK_KOTASI - primOnce)) : 0;
    const taban = MALLAR[mal].taban;
    const kalemler = [{ k: "taban", d: taban * sat }];
    if (kitlikAdet > 0) kalemler.push({ k: "kitlik", d: prim * kitlikAdet });
    const tutar = kalemler.reduce((a, x) => a + x.d, 0);
    hasilat += tutar;
    if (sat > 0) satilan[mal] = sat;
    if (adet - sat > 0) kalan[mal] = adet - sat;
    satirlar.push({ mal, adet, satilan: sat, kalan: adet - sat, kota: { tavan, once, kalan: Math.max(0, tavan - once - sat) }, birim, kitlikAdet, tutar, dokum: { toplam: tutar, kalemler } });
  }
  return { hasilat, satilan, kalan, satirlar, ...(ke > 0 ? { ke } : {}) };
}

/** Hedefte bu hesabın varış ayındaki kullanılmış kotası. */
export function kullanilanKota(d: KervanDefteri | undefined, hesap: string, va: number): Kullanilan {
  const ay = d?.v[hesap]?.[String(va)];
  return (mal) => ay?.[mal] ?? [0, 0];
}

/** Hedefin satış tahmini (önizleme; yazmaz). Kalkış bu ay olursa varış ayı `va`. */
export function varisTahmini(k: Kasaba, d: KervanDefteri | undefined, hesap: string, yuk: Yuk, va: number, ke = 0) {
  return varisHesapla(yuk, oyuncuSayaci(k), kullanilanKota(d, hesap, va), k.pr, Number.isInteger(ke) && ke > 0 ? Math.min(UZAK_ANLASMA_KOTA_EK, ke) : 0);
}

/**
 * (2) Hedef: kervanı bir kez işler. Defterde varsa yazılı sonuç (`yeni: false`). Geçersiz yük kalıcı reddedilir
 * (yan etkisiz). Kabulde kota ve kasaba stoğu yazılır.
 */
export function varisIsle(k: Kasaba, d: KervanDefteri, islem: string, kaynak: string, yukHam: unknown, an: number): { sonuc: VarisSonucu; yeni: boolean } {
  const onceki = d.g[islem];
  if (onceki) return { sonuc: onceki, yeni: false };
  let sonuc: VarisSonucu;
  if (!kervanIslemiMi(islem) || !kervanYukuGecerli(yukHam) || kaynak === k.y || !yerlesimBul(kaynak)) {
    sonuc = { durum: "red", neden: "gecersiz", an, hasilat: 0, satilan: {}, kalan: {}, satirlar: [] };
  } else {
    const y = yukHam;
    const h = varisHesapla(y.ev, oyuncuSayaci(k), kullanilanKota(d, y.hs, y.va), k.pr, gecerliKotaEki(y.ke, kaynak, k.y));
    const aylar = (d.v[y.hs] ??= {});
    const ay = (aylar[String(y.va)] ??= {});
    for (const s of h.satirlar) {
      if (s.satilan === 0) continue;
      const [a, b] = ay[s.mal] ?? [0, 0];
      ay[s.mal] = [a + s.satilan, b + s.kitlikAdet];
      stogaEkle((k.st ??= {}) as KasabaStogu, s.mal, s.satilan);
    }
    for (const a of Object.keys(aylar)) if (Number(a) <= y.va - KERVAN_KOTA_AY_TUT) delete aylar[a];
    sonuc = { durum: "kabul", an, ...h };
  }
  d.g[islem] = sonuc;
  for (const [i, x] of Object.entries(d.g)) if (an - x.an > KERVAN_GIRIS_SAKLAMA_MS) delete d.g[i];
  return { sonuc, yeni: true };
}

/** Hedefin yanıtı biçimi (kaynakta denetlenir; bozuksa kayıt bekler, telafi yapılmaz). */
export function varisSonucuGecerli(v: unknown, yuk: KervanYuku): v is VarisSonucu {
  if (typeof v !== "object" || v === null) return false;
  const x = v as Partial<VarisSonucu>;
  if (x.durum !== "kabul" && x.durum !== "red") return false;
  if (!Number.isInteger(x.hasilat) || (x.hasilat ?? -1) < 0) return false;
  if (typeof x.satilan !== "object" || x.satilan === null || typeof x.kalan !== "object" || x.kalan === null) return false;
  // Kalıcı ret: hasılat yok; bütün yük kaynakta geri yazılır (varisUygula).
  if (x.durum === "red") return x.hasilat === 0;
  // Satılan + kalan = yük (mal kaybolmaz, çoğalmaz).
  for (const m of new Set([...Object.keys(yuk.ev), ...Object.keys(x.satilan), ...Object.keys(x.kalan)])) {
    const a = (x.satilan as Yuk)[m as MalId] ?? 0;
    const b = (x.kalan as Yuk)[m as MalId] ?? 0;
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a + b !== (yuk.ev[m as MalId] ?? 0)) return false;
  }
  return true;
}

/**
 * (3) Kaynak: sonucu tüccara yazar. Kabul → hasılat akçeye, kalan envantere; red → bütün yük envantere.
 * Döndürülen: [akçe, geri dönen mal].
 */
export function varisUygula(kar: Karakter, yuk: KervanYuku, s: VarisSonucu): { akce: number; geri: Yuk } {
  const geri = s.durum === "kabul" ? s.kalan : yuk.ev;
  const akce = s.durum === "kabul" ? s.hasilat : 0;
  kar.pa += akce;
  for (const [m, n] of Object.entries(geri) as [MalId, number][]) if (n > 0) envanterEkle(kar, m, n);
  return { akce, geri: { ...geri } };
}

/** Yerleşimin fiyat özeti (haber ve önizleme; yazmaz). */
export function fiyatOzeti(k: Kasaba): FiyatOzeti {
  const say = oyuncuSayaci(k);
  const mallar = (Object.keys(MALLAR) as MalId[]).filter((m) => MALLAR[m].taban > 0);
  const satirlar = mallar.map((mal) => ({ mal, alis: satisDegeri(mal, say(MALLAR[mal].meslek), k.pr), npcSatis: npcFiyat(mal, k.pr) }));
  const primli = (x: (typeof satirlar)[number]) => (x.alis.kalemler.some((y) => y.k === "kitlik") ? 1 : 0);
  satirlar.sort((a, b) => primli(b) - primli(a) || b.alis.toplam - a.alis.toplam || (a.mal < b.mal ? -1 : 1));
  return { yerlesim: k.y, ay: k.ay, lonca: loncaTablosu(k), pahali: satirlar.slice(0, HABER_MAL) };
}

/** Haber yerleşimleri: aynı beyliğin diğer yerleşimleri (veri sırası: şehir, kasabalar, köyler), en çok HABER_YERLESIM. */
export function haberYerlesimleri(kaynak: string, beylikYerlesimleri: readonly string[]): string[] {
  return beylikYerlesimleri.filter((y) => y !== kaynak).slice(0, HABER_YERLESIM);
}

/** Geçerli haber (varsa). */
export function gecerliHaber(d: KervanDefteri | undefined, o: string, ay: number): KervanHaberi | undefined {
  const h = d?.h[o];
  return h && h.gecerli >= ay ? h : undefined;
}

/** Tüccarın yoldaki kervanları (görünüm). */
export function yoldakiler(d: KervanDefteri | undefined, o: string) {
  return (d?.c.k ?? [])
    .filter((x) => x.t === "kervan" && (x.y as unknown as KervanYuku).o === o)
    .map((x) => {
      const y = x.y as unknown as KervanYuku;
      return { id: x.i, hedef: x.h, mallar: y.ev, kalkisAyi: y.ka, varisAyi: y.va, deneme: x.d };
    });
}
