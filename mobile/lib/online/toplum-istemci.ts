// Faz 3a oyuncular arası uçlar (istemci.ts httpIstemci'nin `toplum` alanı). Bütün POST'lar istekNo'ludur ve sunucu
// #tekrarGuvenli ile aynı istekNo'ya ilk yanıtı döndürür: aynı gövdeyle yeniden denemek güvenlidir. GET'ler denenir.
import type { Dil, KisiAdi, Sonuc } from "./protokol";
import {
  dostlukYanitiMi, duzenYanitiMi, engelYanitiMi, gelenMi, husumetYanitiMi, oyuncuProfiliMi, sikayetYanitiMi, teklifYanitiMi,
  vitrinYanitiMi, yalanlaYanitiMi, toplulukDurumuMi,
  type ToplulukDurumu, type MesrepIstegi, type OrtakDertIstegi, type SenlikIstegi, type HamiIstegi, type ZaviyeIstegi,
  type BagDurumu, type DostlukIstegi, type DuzenGorunumu, type DuzenIstegi, type EngelIstegi, type GelenYaniti, type HusumetIstegi,
  type OyuncuProfili, type SikayetIstegi, type SikayetYaniti, type SoylentiGorunumu, type TeklifCevapIstegi, type TeklifGorunumu,
  type TeklifIstegi, type VitrinArmagani,
} from "./toplum-veri";

export interface ToplumIstemci {
  oyuncu(id: string, dil: Dil): Promise<Sonuc<OyuncuProfili>>;
  gelen(dil: Dil): Promise<Sonuc<GelenYaniti>>;
  arabuluculuk(istek: { islem: "ac" | "cevap" | "geri" | "taslak" | "imza" | "uygula"; hedef?: string; arabulucu?: string; dosya?: string; cevap?: "kabul" | "ret"; sTutari?: number; kTutari?: number; not?: string; surum?: number; istekNo: string }): Promise<Sonuc<Record<string, unknown>>>;
  dostluk(istek: DostlukIstegi): Promise<Sonuc<{ hedef: string; bag: BagDurumu }>>;
  teklif(istek: TeklifIstegi): Promise<Sonuc<{ teklif: TeklifGorunumu }>>;
  teklifCevap(istek: TeklifCevapIstegi): Promise<Sonuc<{ teklif: TeklifGorunumu }>>;
  husumet(istek: HusumetIstegi): Promise<Sonuc<{ hedef: string; husumet: boolean }>>;
  engelle(istek: EngelIstegi): Promise<Sonuc<{ engellenenler: KisiAdi[] }>>;
  duzenOku(): Promise<Sonuc<{ duzen: DuzenGorunumu }>>;
  duzen(istek: DuzenIstegi): Promise<Sonuc<{ duzen: DuzenGorunumu }>>;
  yalanla(istek: { soylenti: string; istekNo: string; dil?: Dil }): Promise<Sonuc<{ soylentiler: SoylentiGorunumu[] }>>;
  vitrin(istek: { goster: string[]; istekNo: string }): Promise<Sonuc<{ vitrin: VitrinArmagani[] }>>;
  sikayet(istek: SikayetIstegi): Promise<Sonuc<SikayetYaniti>>;
  toplulukOku(): Promise<Sonuc<ToplulukDurumu>>;
  hami(istek: HamiIstegi): Promise<Sonuc<Record<string, unknown>>>;
  mesrep(istek: MesrepIstegi): Promise<Sonuc<Record<string, unknown>>>;
  ortakDert(istek: OrtakDertIstegi): Promise<Sonuc<Record<string, unknown>>>;
  senlik(istek: SenlikIstegi): Promise<Sonuc<Record<string, unknown>>>;
  zaviye(istek: ZaviyeIstegi): Promise<Sonuc<Record<string, unknown>>>;
}

const nesneYanitiMi = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

type Istek = { yontem: "GET" | "POST"; yol: string; govde?: unknown; yetki: boolean; tekrar: boolean };
export type Cagir = <T>(istek: Istek, bicim: (v: unknown) => v is T) => Promise<Sonuc<T>>;

export function toplumUclari(cagir: Cagir): ToplumIstemci {
  const al = <T,>(yol: string, bicim: (v: unknown) => v is T) => cagir({ yontem: "GET", yol, yetki: true, tekrar: true }, bicim);
  const yaz = <T,>(yol: string, govde: unknown, bicim: (v: unknown) => v is T) => cagir({ yontem: "POST", yol, govde, yetki: true, tekrar: true }, bicim);
  return {
    oyuncu: (id, dil) => al(`/v1/oyuncu/${encodeURIComponent(id)}?dil=${dil}`, oyuncuProfiliMi),
    gelen: (dil) => al(`/v1/gelen?dil=${dil}`, gelenMi),
    arabuluculuk: (istek) => yaz("/v1/arabuluculuk", istek, nesneYanitiMi),
    dostluk: (i) => yaz("/v1/dostluk", i, dostlukYanitiMi),
    teklif: (i) => yaz("/v1/teklif", i, teklifYanitiMi),
    teklifCevap: ({ teklif, ...govde }) => yaz(`/v1/teklif/${encodeURIComponent(teklif)}/cevap`, govde, teklifYanitiMi),
    husumet: (i) => yaz("/v1/husumet", i, husumetYanitiMi),
    engelle: (i) => yaz("/v1/engelle", i, engelYanitiMi),
    duzenOku: () => al("/v1/duzen", duzenYanitiMi),
    duzen: (i) => yaz("/v1/duzen", i, duzenYanitiMi),
    yalanla: (i) => yaz("/v1/yalanla", i, yalanlaYanitiMi),
    vitrin: (i) => yaz("/v1/vitrin", i, vitrinYanitiMi),
    sikayet: (i) => yaz("/v1/sikayet", i, sikayetYanitiMi),
    toplulukOku: () => al("/v1/topluluk", toplulukDurumuMi),
    hami: (i) => yaz("/v1/hami", i, nesneYanitiMi),
    mesrep: (i) => yaz("/v1/mesrep", i, nesneYanitiMi),
    ortakDert: (i) => yaz("/v1/ortak-dert", i, nesneYanitiMi),
    senlik: (i) => yaz("/v1/senlik", i, nesneYanitiMi),
    zaviye: (i) => yaz("/v1/zaviye", i, nesneYanitiMi),
  };
}
