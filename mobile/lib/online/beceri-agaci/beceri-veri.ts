// Beceri ağacı v2 uçlarının istemci tipleri ve biçim denetimi: online-server/src/yerlesim/beceri.ts (agacGorunumu,
// beceriOgrenmeDurumu, beceriIptal, beceriHizlandir, beceriYeniden) ve index.ts /v1/beceri* yanıtlarının birebir biçimi.
// Sonucu sunucu hesaplar; istemci yalnız niyet (öğren, iptal, hızlandır, yeniden) gönderir.
import type { MeslekId, Sonuc } from "../protokol";

export type Bolum = "cirak" | "kalfa" | "kalfa2" | "usta" | "pir" | "gizli";
export type KademeNo = 0 | 1 | 2 | 3;
export type DugumDurumu = "ogrenildi" | "ogreniliyor" | "acilabilir" | "kilitli" | "gizli";
/** Sunucu engeller(): düğümün önündeki engeller. */
export type KilitKodu = "gizli" | "seviye_tavan" | "ogrenme_suruyor" | "kademe" | "on_kosul" | "puan";

/** Sunucu meslek.ts BeceriPuani (v2). */
export interface BeceriPuaniV2 {
  tecrube: number;
  kazanilan: number;
  harcanan: number;
  kalan: number;
  tavan: number;
  bar: number | null;
  barDolu: number;
  sonrakiPuan: number | null;
  sonrakiKademe: number | null;
}

/** Seviye etkisi (sunucu tipler.ts Etki) ve sistemin henüz bağlı olup olmadığı (`kanca`: Yakında). */
export type EtkiGorunumu = { tur: string; kanca: boolean } & Record<string, unknown>;

export interface SeviyeGorunumu { seviye: number; bedel: number; sureDk: number; metin: string; etkiler: EtkiGorunumu[] }
export interface OnKosulGorunumu { dugum: string; seviye: number; tamam: boolean }

/** Görünmeyen gizli düğüm yalnız yerini ve azami seviyesini taşır. */
export interface DugumGorunumu {
  id: string;
  bolum: Bolum;
  kademe: KademeNo;
  sutun: 0 | 1 | 2;
  sira: number;
  gizli: boolean;
  gorunur: boolean;
  ikon: string;
  seviye: number;
  azami: number;
  durum: DugumDurumu;
  kilit: KilitKodu[];
  ad?: string;
  onKosul?: OnKosulGorunumu[];
  onKosulBiri?: boolean;
  kademeSarti?: KademeNo;
  seviyeler?: SeviyeGorunumu[];
  sonraki?: { seviye: number; bedel: number; sureMs: number; metin: string } | null;
  gorunme?: { sayac?: { anahtar: string; esik: number }; kitap?: string };
}

export interface OgrenmeGorunumu {
  tur: "ogrenme" | "yeniden";
  meslek: MeslekId;
  dugum: string | null;
  seviye: number | null;
  baslangic: number;
  bitis: number;
  kalanMs: number;
  puan: number;
  egitimleKisaldi: boolean;
}

/** GET /v1/beceri?meslek= */
export interface BeceriAgaci {
  meslek: MeslekId;
  aktif: boolean;
  kademe: KademeNo;
  kademeHizmet: number[];
  puan: BeceriPuaniV2;
  bolumler: { bolum: Bolum; baslik: string; altYazi: string }[];
  dugumler: DugumGorunumu[];
  ogrenme: OgrenmeGorunumu | null;
}

/** ben.beceriOzet */
export interface BeceriOzeti {
  ogrenme: OgrenmeGorunumu | null;
  meslekler: Partial<Record<MeslekId, { kademe: KademeNo; kalan: number; kazanilan: number; tavan: number; ogrenilen: number }>>;
  unvanlar: string[];
}

/** Profil "Mesleki Geçmişim" (sunucu beceri.ts mesleki). */
export interface MeslekiGecmis {
  meslekler: { meslek: MeslekId; kademe: KademeNo; ogrenilen: { dugum: string; seviye: number }[] }[];
  toplamBeceri: number;
  unvanlar: { id: string; meslek: MeslekId | null }[];
}

export interface OgrenYaniti { ogrenme: OgrenmeGorunumu; beceri: BeceriPuaniV2; beceriOzet: BeceriOzeti }
export interface IptalYaniti { iptal: { meslek: MeslekId; dugum: string; seviye: number }; iadePuan: number }
export interface HizlandirYaniti { kaynak: "egitim"; usta: string; oran: number; kisaltmaMs: number; ogrenme: OgrenmeGorunumu | null }
export interface YenidenYaniti {
  meslek: MeslekId;
  sifirlanan: { dugum: string; seviye: number }[];
  iadePuan: number;
  bedel: { toplam: number; kalemler: { k: string; d: number }[] };
  ogrenme: OgrenmeGorunumu;
}

/** Beceri uçları; sunucu (istemci.ts) ve sahte (sahte-beceri.ts) aynı yüzü taşır. */
export interface BeceriIstemci {
  agac(meslek: MeslekId): Promise<Sonuc<BeceriAgaci>>;
  ogren(istek: { meslek: MeslekId; dugum: string; istekNo: string }): Promise<Sonuc<OgrenYaniti>>;
  iptal(istek: { istekNo: string }): Promise<Sonuc<IptalYaniti>>;
  hizlandir(istek: { kaynak: "egitim" | "debdebe"; istekNo: string }): Promise<Sonuc<HizlandirYaniti>>;
  yeniden(istek: { meslek: MeslekId; istekNo: string }): Promise<Sonuc<YenidenYaniti>>;
  /** Mesleki geçmiş (profil yanıtından ya da sahte durumdan); bilinmiyorsa null. */
  gecmis(): Promise<Sonuc<MeslekiGecmis | null>>;
  /** Bir öğrenme dakikasının milisaniyesi (sunucu 60 000; sahte önizlemede kısa). */
  dakikaMs?: number;
}

// ---------------------------------------------------------------- biçim denetimi (yanıtın iskeleti)

const nesne = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const sayi = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function ogrenmeMi(v: unknown): v is OgrenmeGorunumu {
  return nesne(v) && (v.tur === "ogrenme" || v.tur === "yeniden") && typeof v.meslek === "string" && sayi(v.bitis) && sayi(v.kalanMs);
}
const dugumMu = (v: unknown): v is DugumGorunumu =>
  nesne(v) && typeof v.id === "string" && typeof v.bolum === "string" && sayi(v.sutun) && sayi(v.seviye) && sayi(v.azami) && typeof v.durum === "string" && Array.isArray(v.kilit);
export function beceriAgaciMi(v: unknown): v is BeceriAgaci {
  return nesne(v) && typeof v.meslek === "string" && sayi(v.kademe) && nesne(v.puan) && sayi(v.puan.kalan) && Array.isArray(v.dugumler)
    && v.dugumler.every(dugumMu) && (v.ogrenme === null || ogrenmeMi(v.ogrenme));
}
export const ogrenYanitiMi = (v: unknown): v is OgrenYaniti => nesne(v) && ogrenmeMi(v.ogrenme);
export const iptalYanitiMi = (v: unknown): v is IptalYaniti => nesne(v) && nesne(v.iptal) && sayi(v.iadePuan);
export const hizlandirYanitiMi = (v: unknown): v is HizlandirYaniti => nesne(v) && v.kaynak === "egitim" && (v.ogrenme === null || ogrenmeMi(v.ogrenme));
export const yenidenYanitiMi = (v: unknown): v is YenidenYaniti => nesne(v) && typeof v.meslek === "string" && Array.isArray(v.sifirlanan) && sayi(v.iadePuan);
export function meslekiGecmisMi(v: unknown): v is MeslekiGecmis {
  return nesne(v) && Array.isArray(v.meslekler) && sayi(v.toplamBeceri) && Array.isArray(v.unvanlar);
}

/** Profil yanıtının içinden mesleki geçmişi çıkarır (alan eski sunucuda yok). */
export const profildenGecmis = (p: unknown): MeslekiGecmis | null => (nesne(p) && meslekiGecmisMi(p.mesleki) ? p.mesleki : null);

type Istek = { yontem: "GET" | "POST"; yol: string; govde?: unknown; yetki: boolean; tekrar: boolean };
type Cagir = <T>(istek: Istek, bicim: (v: unknown) => v is T) => Promise<Sonuc<T>>;

/** Sunucu uçları. POST'lar istekNo'ludur; sunucu aynı istekNo'ya ilk yanıtı döndürür (yeniden denemek güvenli). */
export function beceriUclari(cagir: Cagir, profil: () => Promise<Sonuc<unknown>>): BeceriIstemci {
  const yaz = <T,>(yol: string, govde: unknown, bicim: (v: unknown) => v is T) => cagir({ yontem: "POST", yol, govde, yetki: true, tekrar: true }, bicim);
  return {
    agac: (meslek) => cagir({ yontem: "GET", yol: `/v1/beceri?meslek=${encodeURIComponent(meslek)}`, yetki: true, tekrar: true }, beceriAgaciMi),
    ogren: (i) => yaz("/v1/beceri/ogren", i, ogrenYanitiMi),
    iptal: (i) => yaz("/v1/beceri/iptal", i, iptalYanitiMi),
    hizlandir: (i) => yaz("/v1/beceri/hizlandir", i, hizlandirYanitiMi),
    yeniden: (i) => yaz("/v1/beceri/yeniden", i, yenidenYanitiMi),
    gecmis: async () => {
      const p = await profil();
      return p.ok ? { ok: true, deger: profildenGecmis(p.deger) } : p;
    },
  };
}
