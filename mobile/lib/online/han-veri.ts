// Han masası (Faz 10) istemci biçimleri: online-server/src/han/tipler.ts ve ikram.ts ile birebir (WebSocket iletileri,
// masa görünümü, olay, anons, GET /v1/han, POST /v1/han/eylem, POST /v1/han/ikram). İstemci sonuç hesaplamaz: koltuk,
// sıra, masa başı, olay ve katılım listesi sunucudan gelir; burada yalnız biçim denetlenir ve niyet gönderilir.
import { useMemo } from "react";
import type { YolcuKarti } from "./tezgah-veri";
import { useOnline } from "./durum";
import { ekCagir, soketAdresi, metinMi, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";
import { oturumOku } from "./depo";
import { sahteHanIstemci } from "./sahte-han";
import type { Dil } from "./protokol";

/** [sunucu kurallar.ts] Varsayılan koltuk sayısı (GET /v1/han `koltuk` alanı esastır). */
export const KOLTUK_SAYISI = 6;
/** [sunucu kurallar.ts] Sohbet iletisi ve söz/şart metninin en çok harfi. */
export const ILETI_EN_UZUN = 240;
export const SART_EN_UZUN = 240;
/** WebSocket kapanış kodları (sunucu kurallar.ts KAPANIS). Bu kodlarda kendiliğinden yeniden bağlanılmaz. */
export const KAPANIS = { baskaBaglanti: 4001, uzaklastirildi: 4003, atildi: 4004, baskaMasa: 4005 } as const;
/** Şikâyet nedenleri (sunucu yonetim/sikayet.ts). */
export const SIKAYET_NEDENLERI = ["kufur", "taciz", "uygunsuzAd", "hile", "dolandiricilik", "spam", "diger"] as const;
export type SikayetNedeni = (typeof SIKAYET_NEDENLERI)[number];

export type HanTuru = "han" | "kucukHan" | "menzil";
export type MasaTuru = "acik" | "ozel" | "meclis" | "tuccar";
/** `kilitli`: masa başı yeni oturan ve sıraya gireni kabul etmiyor (ayakta dinleme sürer; eski sunucuda yok). */
/** `sahneYasak` (H8): masa başı ozan sahnesini yasakladı (yalnız true iken gelir). */
export interface MasaAyari { tur: MasaTuru; acik: boolean; sesli: boolean; kavgaYasak: boolean; kilitli?: boolean; davet?: string[]; sahneYasak?: boolean }
/** İsim plakası. `cerceve` sunucunun sahiplikten eklediği Debdebe süsüdür; oyun mantığı okumaz. */
/** `mudavim`: bu yerleşimin müdavim rozeti; `ozan`: ana mesleği ozan (H8). İkisi de yalnız görünür işarettir. */
/** `kisi`: karakter kimliği ("o123"; /v1/oyuncu/:id) ve `nam` (0–400): kişi kartı için; yoksa profil/engel kapalı kalır. */
export interface Plaka { hesap: string; ad: string; cerceve?: string; mudavim?: true; ozan?: true; balon?: string; masaSusu?: string; kisi?: string; nam?: number }
export interface MasaGorunumu {
  no: number;
  koltuklar: (Plaka | null)[];
  masaBasi: string | null;
  sira: Plaka[];
  ayakta: number;
  ayar: MasaAyari;
}
export const HAN_EYLEMLERI = ["yemin", "sozlesme", "ittifak", "ihbar", "meydanOku", "atisma", "kabul"] as const;
export type HanEylemi = (typeof HAN_EYLEMLERI)[number];
export type MasaOlayTuru = HanEylemi | "atma" | "atismaSonuc";
export type TeklifTuru = "sozlesme" | "ittifak" | "meydanOku" | "atisma";
export interface MasaOlayi {
  no: number;
  masa: string;
  tur: MasaOlayTuru;
  kim: string;
  hedef?: string;
  olay?: number;
  sart?: string;
  zaman: number;
  katilim: string[];
  durum?: "teklif" | "kabul";
  kabulOlay?: number;
  /** Kabul olayında onaylanan teklifin türü. */
  teklifTur?: TeklifTuru;
  /** H8 `atismaSonuc`: sonuç ve oylar [a, b]; `kim` kazanan (berabere/hükümsüzde a), `olay` teklif numarası. */
  sonuc?: AtismaSonucTuru;
  oy?: [number, number];
}

/** H8 ozan sahnesi (sunucu SahneGorunumu): anlatıcı ve söz verilenler yazar; istek: söz isteyen oturanlar. */
export interface SahneGorunumu { anlatici: string; soz: string[]; istek: string[]; acilis: number }
export type AtismaSonucTuru = "kazandi" | "berabere" | "hukumsuz" | "iptal";
/** H8 ozan atışması. a: teklif eden (ilk kıta), b: kabul eden; oy dağılımı sonuca kadar gizli. */
/** `kitaEnCok` (isteğe bağlı): bu bağlantı için kıta harf sınırı (genç hesapta 240); yoksa KITA_EN_UZUN. */
export interface AtismaGorunumu { olay: number; a: string; b: string; kita: number; toplam: number; sira: string | null; asama: "kita" | "oylama"; hak: string[]; oyVeren: string[]; kitaEnCok?: number }
export interface AtismaSonucu { olay: number; a: string; b: string; sonuc: AtismaSonucTuru; kazanan: string[]; oy: [number, number] }
/** [sunucu kurallar.ts] Kıta sınırları: en çok 4 satır; toplam harf (24 saatten genç hesapta 240). */
export const KITA_SATIR = 4;
export const KITA_EN_UZUN = 400;
export type AnonsTuru = "ikram" | "armagan" | "debdebe" | "ziyafet";
/** Ziyafet anonsu hedefsizdir (bütün masaya). */
export interface MasaAnonsu { tur: AnonsTuru; kim: string; hedef?: string; oge: string; zaman: number }

/** İstemci → sunucu (WebSocket metin çerçevesi). */
export type IstemciIletisi =
  | { t: "otur"; koltuk?: number }
  | { t: "kalk" }
  | { t: "yaz"; metin: string }
  | { t: "sustur"; hedef: string }
  | { t: "susturKaldir"; hedef: string }
  | { t: "at"; hedef: string }
  | { t: "oneAl"; hedef: string }
  | { t: "rapor"; hedef: string; neden: SikayetNedeni; aciklama?: string; istekNo: string }
  // Faz 16 ses (sunucu han/tipler.ts): konuşma göstergesi, masa başının ses kesmesi, söz isteme
  | { t: "konus"; acik: boolean }
  | { t: "sesKapat"; hedef: string }
  | { t: "sesAc"; hedef: string }
  | { t: "sozIste" }
  | { t: "sozGeri" }
  | { t: "sozVer"; hedef: string; kabul?: boolean }
  /** Masa başının masa ayarı (yalnız masa başı; sunucu doğrular). */
  | { t: "ayar"; kavgaYasak?: boolean; kilitli?: boolean; sesli?: boolean; tur?: "acik" | "ozel"; sahneYasak?: boolean }
  /** H8: ozan sahnesi ve atışma. */
  | { t: "sahneAc" }
  | { t: "sahneKapat" }
  | { t: "kita"; metin: string }
  | { t: "oy"; hedef: string }
  | { t: "atismaKapat" }
  /** Özel masaya davet (yalnız masa başı); `kaldir` daveti geri alır. */
  | { t: "davet"; hedef: string; kaldir?: true };

/** Masanın ses durumu (sunucu SesDurumu). Yalnız kimlikler; ses kaydedilmez. */
export interface SesDurumu {
  acik: boolean;
  neden?: "yapilandirilmadi" | "masa_sessiz";
  yayin: { hesap: string; iz: string }[];
  konusan: string[];
  kapali: string[];
  soz: Plaka[];
}
export type SesAlt = "oturum" | "yayin" | "dinle" | "anlas" | "kapat";
export interface IceSunucusu { urls: string[] | string; username?: string; credential?: string }
export interface SdpYaniti { type: "offer" | "answer"; sdp: string }

/** Sunucu → istemci. */
export type SunucuIletisi =
  | { t: "hosgeldin"; ben: Plaka; susturma: { bitis: number | null } | null; masa: MasaGorunumu; ses?: SesDurumu; sahne?: SahneGorunumu | null; atisma?: AtismaGorunumu | null; kitaEnCok?: number }
  | { t: "sahne"; sahne: SahneGorunumu | null }
  | { t: "atisma"; atisma: AtismaGorunumu | null; son?: AtismaSonucu }
  | { t: "kita"; hesap: string; ad: string; koltuk: number; metin: string; sira: number; zaman: number; balon?: string }
  | { t: "sesDurum"; ses: SesDurumu }
  | { t: "durum"; masa: MasaGorunumu }
  | { t: "ileti"; hesap: string; ad: string; koltuk: number; metin: string; zaman: number; balon?: string }
  | { t: "olay"; olay: MasaOlayi }
  | { t: "anons"; anons: MasaAnonsu }
  | { t: "sessiz"; liste: string[] }
  | { t: "rapor"; sonuc: unknown }
  | { t: "hata"; hata: string; istek?: string; bitis?: number | null };

/** `tanidik`: o masada oturan dost/hane üyesi sayısı (kimlik gelmez). Liste sunucuda bu sayıya göre sıralı. */
export interface MasaOzeti { no: number; oturan: number; ayakta: number; sira: number; ayar: MasaAyari; tanidik?: number }
export const IKRAMLAR = ["ekmek", "serbet", "yemek", "gulSuyu"] as const;
export type IkramId = (typeof IKRAMLAR)[number];
export interface MenuSatiri { id: IkramId; fiyat: number }
/**
 * 4.9 Çoklu han kartı (sunucu han/tipler.ts HanKarti): `no` istemcinin `han` parametresidir (1 = NPC'nin işlettiği ya da
 * devralınmış 1. han). `oda` NPC hanında null; `masa` seçili olmayan hanlarda bir değişim gecikmeli olabilir.
 */
export interface HanKarti {
  no: number;
  isletme: string;
  sahip: "npc" | "oyuncu";
  sahipKisi?: { id: string; ad: string };
  /** İşletme adı (oyuncu koyar; boşsa tür adı gösterilir). */
  ad: string;
  seviye: number;
  /** Fiyat çarpanı (%): menü, ziyafet ve oda fiyatı. NPC hanında 100. */
  fc: number;
  acik: boolean;
  oda: { dolu: number; kapasite: number } | null;
  /** Benim bu handaki müdavim rozetim ("tanidik" | "mudavim" | "demirbas") ya da null. */
  mudavim: string | null;
  masa?: { sayi: number; acik: number; oturan: number };
  /** Tezgâh modeli: son ay dönümündeki yolcu payı (yalnız hanın sahibi ve oyuncu çalışanı görür). */
  yolcu?: YolcuKarti;
}
/** GET /v1/han?han=N. `menu` taban fiyatlardır (oyuncu hanında `fc` ile çarpılır); `hanlar` eski sunucuda yok. */
export interface HanOzeti {
  yerlesim: { id: string; ad: string };
  /** `ad` her zaman hanın tür adıdır (Han, Küçük Han, Menzil); işletme adı `hanlar[].ad`. `no` eski sunucuda yok. */
  han: { tur: HanTuru; ad: string; no?: number; isletme?: string };
  koltuk: number;
  masalar: MasaOzeti[];
  menu?: MenuSatiri[];
  hanlar?: HanKarti[];
}
/** [sunucu mulk/tapu.ts HAN_NO_EN_COK] Han numarası 1..9; geçersiz parametre 1. hana düşer. */
export const HAN_NO_EN_COK = 9;
export function hanNoCoz(ham: unknown): number {
  const n = typeof ham === "number" ? ham : typeof ham === "string" && /^[1-9]$/.test(ham) ? Number(ham) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= HAN_NO_EN_COK ? n : 1;
}
/** Seçili hanın kartı (eski sunucuda ya da liste gelmezse undefined). */
export const seciliKart = (o: HanOzeti | null | undefined): HanKarti | undefined => o?.hanlar?.find((k) => k.no === (o.han.no ?? 1));
/**
 * Görünen menü fiyatı: oyuncu hanında sunucunun ödeme formülüyle (mulkluHanOdemesi: tavan, en az 1) çarpanlı; NPC hanında
 * taban. Yalnız gösterim içindir; ödenen tutar ikram/ziyafet yanıtından okunur.
 */
export function hanMenusu(o: HanOzeti | null | undefined): MenuSatiri[] | undefined {
  if (!o?.menu) return undefined;
  const k = seciliKart(o);
  if (!k || k.sahip !== "oyuncu") return o.menu;
  return o.menu.map((m) => ({ ...m, fiyat: Math.max(1, Math.ceil((m.fiyat * k.fc) / 100 - 1e-9)) }));
}
export interface HanEylemGirdisi { masa: number; tur: HanEylemi; hedef?: string; olay?: number; sart?: string; istekNo: string }
export interface IkramGirdisi { masa: number; hedef: string; ikram: IkramId; istekNo: string }
export interface IkramSonucu { ikram: string; fiyat: number; para: number; anons: MasaAnonsu }

// ---------------------------------------------------------------- biçim denetimi

const ayarMi = (v: unknown): v is MasaAyari => nesneMi(v) && metinMi(v.tur) && typeof v.acik === "boolean" && typeof v.kavgaYasak === "boolean";
const plakaMi = (v: unknown): v is Plaka => nesneMi(v) && metinMi(v.hesap) && metinMi(v.ad);
export const masaGorunumuMu = (v: unknown): v is MasaGorunumu =>
  nesneMi(v) && sayiMi(v.no) && Array.isArray(v.koltuklar) && v.koltuklar.every((k) => k === null || plakaMi(k))
  && (v.masaBasi === null || metinMi(v.masaBasi)) && Array.isArray(v.sira) && v.sira.every(plakaMi) && sayiMi(v.ayakta) && ayarMi(v.ayar);
export const masaOlayiMi = (v: unknown): v is MasaOlayi =>
  nesneMi(v) && sayiMi(v.no) && metinMi(v.tur) && metinMi(v.kim) && sayiMi(v.zaman) && Array.isArray(v.katilim);
export const anonsMu = (v: unknown): v is MasaAnonsu =>
  nesneMi(v) && metinMi(v.kim) && metinMi(v.oge)
  && ((v.tur === "ikram" || v.tur === "armagan" || v.tur === "debdebe") ? metinMi(v.hedef) : v.tur === "ziyafet" && (v.hedef === undefined || metinMi(v.hedef)));
const masaOzetiMi = (v: unknown): v is MasaOzeti => nesneMi(v) && sayiMi(v.no) && sayiMi(v.oturan) && sayiMi(v.ayakta) && sayiMi(v.sira) && ayarMi(v.ayar);
const hanKartiMi = (v: unknown): v is HanKarti =>
  nesneMi(v) && sayiMi(v.no) && metinMi(v.isletme) && (v.sahip === "npc" || v.sahip === "oyuncu") && typeof v.ad === "string"
  && sayiMi(v.seviye) && sayiMi(v.fc) && typeof v.acik === "boolean" && (v.oda === null || (nesneMi(v.oda) && sayiMi(v.oda.dolu) && sayiMi(v.oda.kapasite)))
  && (v.mudavim === null || metinMi(v.mudavim)) && (v.sahipKisi === undefined || (nesneMi(v.sahipKisi) && metinMi(v.sahipKisi.id) && typeof v.sahipKisi.ad === "string"))
  && (v.masa === undefined || (nesneMi(v.masa) && sayiMi(v.masa.sayi) && sayiMi(v.masa.acik) && sayiMi(v.masa.oturan)));
const hanOzetiHamMi = (v: unknown): v is HanOzeti =>
  nesneMi(v) && nesneMi(v.yerlesim) && metinMi(v.yerlesim.ad) && nesneMi(v.han) && metinMi(v.han.ad) && metinMi(v.han.tur)
  && sayiMi(v.koltuk) && Array.isArray(v.masalar) && v.masalar.every(masaOzetiMi)
  && (v.menu === undefined || (Array.isArray(v.menu) && v.menu.every((m) => nesneMi(m) && metinMi(m.id) && sayiMi(m.fiyat))));
/** Bozuk kartlar listeden düşer (liste bozulursa yalnız seçili han görünür; masalar yine açılır). */
const hanOzetiMi = (v: unknown): v is HanOzeti => {
  if (!hanOzetiHamMi(v)) return false;
  const ham = (v as { hanlar?: unknown }).hanlar;
  if (ham !== undefined) (v as { hanlar?: HanKarti[] }).hanlar = Array.isArray(ham) ? ham.filter(hanKartiMi) : undefined;
  return true;
};
export const sesDurumuMu = (v: unknown): v is SesDurumu =>
  nesneMi(v) && typeof v.acik === "boolean" && Array.isArray(v.yayin) && v.yayin.every((y) => nesneMi(y) && metinMi(y.hesap) && metinMi(y.iz))
  && Array.isArray(v.konusan) && v.konusan.every(metinMi) && Array.isArray(v.kapali) && v.kapali.every(metinMi) && Array.isArray(v.soz) && v.soz.every(plakaMi);
const metinlerMi = (v: unknown): v is string[] => Array.isArray(v) && v.every(metinMi);
export const sahneMi = (v: unknown): v is SahneGorunumu => nesneMi(v) && metinMi(v.anlatici) && metinlerMi(v.soz) && metinlerMi(v.istek);
export const atismaMi = (v: unknown): v is AtismaGorunumu => nesneMi(v) && sayiMi(v.olay) && metinMi(v.a) && metinMi(v.b) && sayiMi(v.kita) && sayiMi(v.toplam)
  && (v.sira === null || metinMi(v.sira)) && (v.asama === "kita" || v.asama === "oylama") && metinlerMi(v.hak) && metinlerMi(v.oyVeren);
const atismaSonucuMu = (v: unknown): v is AtismaSonucu => nesneMi(v) && sayiMi(v.olay) && metinMi(v.a) && metinMi(v.b) && metinMi(v.sonuc)
  && metinlerMi(v.kazanan) && Array.isArray(v.oy) && v.oy.length === 2 && v.oy.every(sayiMi);
const eylemYanitiMi = (v: unknown): v is { olay: MasaOlayi } => nesneMi(v) && masaOlayiMi(v.olay);
const ikramYanitiMi = (v: unknown): v is IkramSonucu => nesneMi(v) && metinMi(v.ikram) && sayiMi(v.fiyat) && sayiMi(v.para) && anonsMu(v.anons);

/** Sunucu çerçevesini çözer; tanınmayan ya da bozuk çerçeve undefined (sessizce atlanır). */
export function sunucuIletisiCoz(ham: unknown): SunucuIletisi | undefined {
  let v: unknown = ham;
  if (typeof ham === "string") {
    try { v = JSON.parse(ham); } catch { return undefined; }
  }
  if (!nesneMi(v) || !metinMi(v.t)) return undefined;
  switch (v.t) {
    case "hosgeldin": {
      if (!plakaMi(v.ben) || !masaGorunumuMu(v.masa) || !(v.ses === undefined || sesDurumuMu(v.ses))) return undefined;
      // Bozuk sahne/atışma alanı bağlantıyı düşürmez: yok sayılır.
      const { sahne, atisma, ...geri } = v;
      return { ...geri, ...(sahneMi(sahne) ? { sahne } : {}), ...(atismaMi(atisma) ? { atisma } : {}) } as SunucuIletisi;
    }
    case "sahne": return v.sahne === null || sahneMi(v.sahne) ? (v as SunucuIletisi) : undefined;
    case "atisma": return (v.atisma === null || atismaMi(v.atisma)) && (v.son === undefined || atismaSonucuMu(v.son)) ? (v as SunucuIletisi) : undefined;
    case "kita": return metinMi(v.hesap) && metinMi(v.ad) && sayiMi(v.koltuk) && metinMi(v.metin) && sayiMi(v.sira) && sayiMi(v.zaman) ? (v as SunucuIletisi) : undefined;
    case "sesDurum": return sesDurumuMu(v.ses) ? (v as SunucuIletisi) : undefined;
    case "durum": return masaGorunumuMu(v.masa) ? (v as SunucuIletisi) : undefined;
    case "ileti": return metinMi(v.hesap) && metinMi(v.ad) && sayiMi(v.koltuk) && metinMi(v.metin) && sayiMi(v.zaman) ? (v as SunucuIletisi) : undefined;
    case "olay": return masaOlayiMi(v.olay) ? (v as SunucuIletisi) : undefined;
    case "anons": return anonsMu(v.anons) ? (v as SunucuIletisi) : undefined;
    case "sessiz": return Array.isArray(v.liste) && v.liste.every(metinMi) ? (v as SunucuIletisi) : undefined;
    case "rapor": return v as SunucuIletisi;
    case "hata": return metinMi(v.hata) ? (v as SunucuIletisi) : undefined;
    default: return undefined;
  }
}

/** Harf sayısı (birleşik karakterler dahil kod noktası); sunucu da kod noktası sayar. */
export const harfSayisi = (s: string) => [...s].length;
/** Gönderilecek tek satırlık metin (sunucu da aynı biçimde temizler; buradaki yalnız sayaç içindir). */
export const tekSatir = (s: string) => s.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();

// ---------------------------------------------------------------- uçlar

/** Masaya bağlanacak soket (gerçek WebSocket ya da sahte); han-soket.ts yönetir. */
export interface HamSoket {
  gonder(ileti: IstemciIletisi): void;
  kapat(): void;
  /** Dinleyiciler bir kez bağlanır. */
  dinle(d: { acildi: () => void; ileti: (v: SunucuIletisi) => void; kapandi: (kod: number) => void }): void;
}

/**
 * Bir hana bağlı istemci (4.9): bütün çağrılar `hanNo`yu taşır (GET'te `?han=N`, POST gövdesinde `han`). Han değişince
 * yeni istemci alınır (useHanIstemci(hanNo)); böylece hiçbir çağrı sessizce 1. hana düşmez.
 */
export interface HanIstemci {
  readonly hanNo: number;
  han(dil: Dil): Promise<EkSonuc<HanOzeti>>;
  eylem(g: HanEylemGirdisi): Promise<EkSonuc<{ olay: MasaOlayi }>>;
  ikram(g: IkramGirdisi): Promise<EkSonuc<IkramSonucu>>;
  /** Masaya yeni bağlantı açar; adres yoksa undefined. */
  soket(no: number): HamSoket | undefined;
  /** Faz 16 ses uçları (POST /v1/han/masa/:no/ses/<alt>); sunucu Realtime'a vekildir. */
  ses(no: number, alt: SesAlt, govde: Record<string, unknown>): Promise<EkSonuc<Record<string, unknown>>>;
  /** H7: masaya akçeyle ziyafet (cömertlik namı; bedel sunucuda). */
  ziyafet(g: { masa: number; istekNo: string }): Promise<EkSonuc<ZiyafetSonucu>>;
  /** H10: han ilan panosu. */
  pano(): Promise<EkSonuc<{ ilanlar: PanoIlani[] }>>;
  panoAs(g: { metin: string; tur: PanoTuru; istekNo: string }): Promise<EkSonuc<{ ilanlar: PanoIlani[] }>>;
  panoSil(g: { ilan: string; istekNo: string }): Promise<EkSonuc<{ ilanlar: PanoIlani[] }>>;
  ilanSikayet(g: { ilan: string; neden: SikayetNedeni; aciklama?: string; istekNo: string }): Promise<EkSonuc<Record<string, unknown>>>;
  /** Önizleme/geliştirici hanı: ses yerel modül olmadan taklit edilir. */
  sahte?: boolean;
}

export const PANO_TURLERI = ["etkinlik", "is", "ozan"] as const;
export type PanoTuru = (typeof PANO_TURLERI)[number];
export interface PanoIlani { id: string; tur: PanoTuru; metin: string; kisi: { id: string; ad: string }; zaman: number; bitis: number; benim: boolean }
export interface ZiyafetSonucu { bedel: number; para: number; nam: number }
/** [sunucu han/pano.ts ile aynı] İlan metni sınırı. */
export const PANO_METIN_EN_UZUN = 200;
const ilanMi = (v: unknown): v is PanoIlani => nesneMi(v) && metinMi(v.id) && metinMi(v.metin) && metinMi(v.tur) && nesneMi(v.kisi) && sayiMi(v.zaman);
const ilanlarMi = (v: unknown): v is { ilanlar: PanoIlani[] } => nesneMi(v) && Array.isArray(v.ilanlar) && v.ilanlar.every(ilanMi);
const ziyafetMi = (v: unknown): v is ZiyafetSonucu => nesneMi(v) && sayiMi(v.bedel) && sayiMi(v.para) && sayiMi(v.nam);

export function httpHanIstemci(soketAc: (no: number, han: number) => HamSoket | undefined, hanNo = 1): HanIstemci {
  const han = hanNoCoz(hanNo);
  return {
    hanNo: han,
    han: (dil) => ekCagir({ yontem: "GET", yol: `/v1/han?dil=${dil}&han=${han}`, tekrar: true }, hanOzetiMi),
    // istekNo ile tekrar güvenli (sunucu aynı istekNo'ya aynı olayı döndürür; ikram ikinci kez ödetmez).
    eylem: (g) => ekCagir({ yontem: "POST", yol: "/v1/han/eylem", govde: { ...g, han }, tekrar: true }, eylemYanitiMi),
    ikram: (g) => ekCagir({ yontem: "POST", yol: "/v1/han/ikram", govde: { ...g, han }, tekrar: true }, ikramYanitiMi),
    soket: (no) => soketAc(no, han),
    // Ses çağrıları tekrar edilmez: her biri SFU durumunu değiştirir (yanıtı kaybolan istek yeniden kurulur).
    ses: (no, alt, govde) => ekCagir({ yontem: "POST", yol: `/v1/han/masa/${no}/ses/${alt}?han=${han}`, govde, tekrar: false }, nesneMi),
    ziyafet: (g) => ekCagir({ yontem: "POST", yol: "/v1/han/ziyafet", govde: { ...g, han }, tekrar: true }, ziyafetMi),
    pano: () => ekCagir({ yontem: "GET", yol: `/v1/han/pano?han=${han}`, tekrar: true }, ilanlarMi),
    panoAs: (g) => ekCagir({ yontem: "POST", yol: "/v1/han/pano", govde: { ...g, han }, tekrar: true }, ilanlarMi),
    panoSil: (g) => ekCagir({ yontem: "POST", yol: "/v1/han/pano/sil", govde: { ...g, han }, tekrar: true }, ilanlarMi),
    // Şikâyet hana bağlı değildir: ilan kimliği yerleşimde tekildir (sunucu hanPanoIlan bütün hanlarda arar).
    ilanSikayet: (g) => ekCagir({ yontem: "POST", yol: "/v1/sikayet", govde: g, tekrar: true }, nesneMi),
  };
}

/**
 * Gerçek WebSocket: GET /v1/han/masa/:no/baglan, Bearer oturumu başlıkta (React Native WebSocket üçüncü bağımsız
 * değişkenle başlık taşır). Belirteç depodan okunana kadar gönderilenler sıraya alınır.
 */
export function gercekSoket(no: number, han = 1): HamSoket | undefined {
  const adres = soketAdresi(`/v1/han/masa/${no}/baglan?han=${hanNoCoz(han)}`);
  if (!adres) return undefined;
  let ws: WebSocket | null = null;
  let kapali = false;
  const bekleyen: string[] = [];
  let d: Parameters<HamSoket["dinle"]>[0] | null = null;
  void oturumOku().then((belirtec) => {
    if (kapali) return;
    const Kurucu = WebSocket as unknown as new (u: string, p?: string[] | null, o?: { headers: Record<string, string> }) => WebSocket;
    try {
      ws = new Kurucu(adres, null, { headers: belirtec ? { Authorization: `Bearer ${belirtec}` } : {} });
    } catch {
      d?.kapandi(1006);
      return;
    }
    ws.onopen = () => {
      for (const c of bekleyen.splice(0)) ws?.send(c);
      d?.acildi();
    };
    ws.onmessage = (e) => {
      const v = sunucuIletisiCoz(e.data);
      if (v) d?.ileti(v);
    };
    ws.onclose = (e) => { if (!kapali) d?.kapandi(e.code); };
  });
  return {
    gonder(ileti) {
      const c = JSON.stringify(ileti);
      if (ws && ws.readyState === 1) ws.send(c);
      else bekleyen.push(c);
    },
    kapat() {
      kapali = true;
      try { ws?.close(1000); } catch { /* yut */ }
    },
    dinle(x) { d = x; },
  };
}

const gercekler = new Map<number, HanIstemci>();
/**
 * Oturum türüne göre seçili hana bağlı istemci: geliştirici/önizleme oturumunda sahte han, yoksa sunucu. `hanNo`
 * verilmezse 1. han (köy ve tek hanlı yerleşim).
 */
export function useHanIstemci(hanNo = 1): HanIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const hesap = o.profil?.hesapId ?? "ben";
  const ad = o.profil?.ad ?? "—";
  const han = hanNoCoz(hanNo);
  return useMemo(() => {
    if (sahte) return sahteHanIstemci(hesap, ad, han);
    let g = gercekler.get(han);
    if (!g) { g = httpHanIstemci(gercekSoket, han); gercekler.set(han, g); }
    return g;
  }, [sahte, hesap, ad, han]);
}
