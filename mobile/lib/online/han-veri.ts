// Han masası (Faz 10) istemci biçimleri: online-server/src/han/tipler.ts ve ikram.ts ile birebir (WebSocket iletileri,
// masa görünümü, olay, anons, GET /v1/han, POST /v1/han/eylem, POST /v1/han/ikram). İstemci sonuç hesaplamaz: koltuk,
// sıra, masa başı, olay ve katılım listesi sunucudan gelir; burada yalnız biçim denetlenir ve niyet gönderilir.
import { useMemo } from "react";
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
export interface MasaAyari { tur: MasaTuru; acik: boolean; sesli: boolean; kavgaYasak: boolean }
/** İsim plakası. `cerceve` Debdebe çerçevesinin yeridir (Faz 15; sunucu henüz göndermez, oyun mantığı okumaz). */
export interface Plaka { hesap: string; ad: string; cerceve?: string }
export interface MasaGorunumu {
  no: number;
  koltuklar: (Plaka | null)[];
  masaBasi: string | null;
  sira: Plaka[];
  ayakta: number;
  ayar: MasaAyari;
}
export const HAN_EYLEMLERI = ["yemin", "sozlesme", "ittifak", "ihbar", "meydanOku", "kabul"] as const;
export type HanEylemi = (typeof HAN_EYLEMLERI)[number];
export type MasaOlayTuru = HanEylemi | "atma";
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
}
export type AnonsTuru = "ikram" | "armagan" | "debdebe";
export interface MasaAnonsu { tur: AnonsTuru; kim: string; hedef: string; oge: string; zaman: number }

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
  | { t: "sozVer"; hedef: string; kabul?: boolean };

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
  | { t: "hosgeldin"; ben: Plaka; susturma: { bitis: number | null } | null; masa: MasaGorunumu; ses?: SesDurumu }
  | { t: "sesDurum"; ses: SesDurumu }
  | { t: "durum"; masa: MasaGorunumu }
  | { t: "ileti"; hesap: string; ad: string; koltuk: number; metin: string; zaman: number }
  | { t: "olay"; olay: MasaOlayi }
  | { t: "anons"; anons: MasaAnonsu }
  | { t: "sessiz"; liste: string[] }
  | { t: "rapor"; sonuc: unknown }
  | { t: "hata"; hata: string; istek?: string; bitis?: number | null };

export interface MasaOzeti { no: number; oturan: number; ayakta: number; sira: number; ayar: MasaAyari }
export const IKRAMLAR = ["ekmek", "serbet", "yemek", "gulSuyu"] as const;
export type IkramId = (typeof IKRAMLAR)[number];
export interface MenuSatiri { id: IkramId; fiyat: number }
/** GET /v1/han. `menu` NPC hancının fiyatlarıdır; sunucu eklemediyse fiyatlar ilk ikram yanıtından öğrenilir. */
export interface HanOzeti {
  yerlesim: { id: string; ad: string };
  han: { tur: HanTuru; ad: string };
  koltuk: number;
  masalar: MasaOzeti[];
  menu?: MenuSatiri[];
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
  nesneMi(v) && (v.tur === "ikram" || v.tur === "armagan" || v.tur === "debdebe") && metinMi(v.kim) && metinMi(v.hedef) && metinMi(v.oge);
const masaOzetiMi = (v: unknown): v is MasaOzeti => nesneMi(v) && sayiMi(v.no) && sayiMi(v.oturan) && sayiMi(v.ayakta) && sayiMi(v.sira) && ayarMi(v.ayar);
const hanOzetiMi = (v: unknown): v is HanOzeti =>
  nesneMi(v) && nesneMi(v.yerlesim) && metinMi(v.yerlesim.ad) && nesneMi(v.han) && metinMi(v.han.ad) && metinMi(v.han.tur)
  && sayiMi(v.koltuk) && Array.isArray(v.masalar) && v.masalar.every(masaOzetiMi)
  && (v.menu === undefined || (Array.isArray(v.menu) && v.menu.every((m) => nesneMi(m) && metinMi(m.id) && sayiMi(m.fiyat))));
export const sesDurumuMu = (v: unknown): v is SesDurumu =>
  nesneMi(v) && typeof v.acik === "boolean" && Array.isArray(v.yayin) && v.yayin.every((y) => nesneMi(y) && metinMi(y.hesap) && metinMi(y.iz))
  && Array.isArray(v.konusan) && v.konusan.every(metinMi) && Array.isArray(v.kapali) && v.kapali.every(metinMi) && Array.isArray(v.soz) && v.soz.every(plakaMi);
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
    case "hosgeldin": return plakaMi(v.ben) && masaGorunumuMu(v.masa) && (v.ses === undefined || sesDurumuMu(v.ses)) ? (v as SunucuIletisi) : undefined;
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

export interface HanIstemci {
  han(dil: Dil): Promise<EkSonuc<HanOzeti>>;
  eylem(g: HanEylemGirdisi): Promise<EkSonuc<{ olay: MasaOlayi }>>;
  ikram(g: IkramGirdisi): Promise<EkSonuc<IkramSonucu>>;
  /** Masaya yeni bağlantı açar; adres yoksa undefined. */
  soket(no: number): HamSoket | undefined;
  /** Faz 16 ses uçları (POST /v1/han/masa/:no/ses/<alt>); sunucu Realtime'a vekildir. */
  ses(no: number, alt: SesAlt, govde: Record<string, unknown>): Promise<EkSonuc<Record<string, unknown>>>;
  /** Önizleme/geliştirici hanı: ses yerel modül olmadan taklit edilir. */
  sahte?: boolean;
}

export function httpHanIstemci(soketAc: (no: number) => HamSoket | undefined): HanIstemci {
  return {
    han: (dil) => ekCagir({ yontem: "GET", yol: `/v1/han?dil=${dil}`, tekrar: true }, hanOzetiMi),
    // istekNo ile tekrar güvenli (sunucu aynı istekNo'ya aynı olayı döndürür; ikram ikinci kez ödetmez).
    eylem: (g) => ekCagir({ yontem: "POST", yol: "/v1/han/eylem", govde: g, tekrar: true }, eylemYanitiMi),
    ikram: (g) => ekCagir({ yontem: "POST", yol: "/v1/han/ikram", govde: g, tekrar: true }, ikramYanitiMi),
    soket: soketAc,
    // Ses çağrıları tekrar edilmez: her biri SFU durumunu değiştirir (yanıtı kaybolan istek yeniden kurulur).
    ses: (no, alt, govde) => ekCagir({ yontem: "POST", yol: `/v1/han/masa/${no}/ses/${alt}`, govde, tekrar: false }, nesneMi),
  };
}

/**
 * Gerçek WebSocket: GET /v1/han/masa/:no/baglan, Bearer oturumu başlıkta (React Native WebSocket üçüncü bağımsız
 * değişkenle başlık taşır). Belirteç depodan okunana kadar gönderilenler sıraya alınır.
 */
export function gercekSoket(no: number): HamSoket | undefined {
  const adres = soketAdresi(`/v1/han/masa/${no}/baglan`);
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

let gercek: HanIstemci | null = null;
/** Oturum türüne göre han istemcisi: geliştirici/önizleme oturumunda sahte han, yoksa sunucu. */
export function useHanIstemci(): HanIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const hesap = o.profil?.hesapId ?? "ben";
  const ad = o.profil?.ad ?? "—";
  return useMemo(() => {
    if (sahte) return sahteHanIstemci(hesap, ad);
    gercek ??= httpHanIstemci(gercekSoket);
    return gercek;
  }, [sahte, hesap, ad]);
}
