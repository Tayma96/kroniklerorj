// Barınma ve dönüş ekranı (Faz 14) istemci biçimleri: online-server/src/yerlesim/{barinma,oda,donus-ekrani}.ts ile
// birebir. Durum, zincir aşaması, süreler, fiyatlar ve tek dokunuş seçenekleri sunucuda hesaplanır; istemci gösterir ve
// niyeti gönderir. Tek dokunuş, sunucunun verdiği istek gövdesini (istekNo eklenerek) aynen yollar.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekBasarisiz, ekCagir, metinMi, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";
import { sahteBarinmaIstemci } from "./sahte-barinma";
import type { Dil, HalNedeni } from "./protokol";

export type BarinmaDurumu = "kapali" | "konakli" | "misafir" | "uyari" | "evsiz" | "canKaybi";
export type ZincirAsamasi = "uyari" | "evsiz" | "canKaybi";
export type OdaId = "yatak" | "oda" | "hasOda";
export type KonaklamaTuru = "oda" | "ocak" | "misafirhane" | "tesis";
export const OTOMATIK_MODLAR = ["kapali", "oda", "tesis", "uyar"] as const;
export type OtomatikMod = (typeof OTOMATIK_MODLAR)[number];
export const KIRA_SURELERI = [1, 3, 12] as const;
export type KiraSuresi = (typeof KIRA_SURELERI)[number];
export type TesisTuru = "imaret" | "zaviye";

export interface OdaNiteligi { aylik: number; kondisyon: number; sandik: number; ozel: boolean; adres: boolean }
export interface Konaklama {
  tur: KonaklamaTuru; bitis: number | null; kalanMs: number | null; yakindaBiter: boolean; oda?: OdaId; han?: string; nitelik?: OdaNiteligi;
}
export interface Zincir {
  baslangic: number;
  asama: ZincirAsamasi;
  sonraki: { asama: ZincirAsamasi; an: number } | null;
  etkiler: { kondisyonAylik: number; gonulAylik: number; canAylik: number; canTaban: number; olum: boolean };
  esikler: { evsizMs: number; canKaybiMs: number };
}
export interface OdaTeklifi { oda: OdaId; aylik: number; nitelik: OdaNiteligi; fiyatlar: Record<"1" | "3" | "12", number>; yeterli: boolean }
export interface BarinmaSatiri { an: number; k: string; p: Record<string, string | number> }
/** GET /v1/barinma → {barinma}; /v1/yerlesim yanıtında `barinma`. */
export interface BarinmaGorunumu {
  acik: boolean;
  durum: BarinmaDurumu;
  unvan: "evsiz" | null;
  konaklama: Konaklama | null;
  zincir: Zincir | null;
  misafirhane: { ilkYerlesim: string; hakMs: number; buSehir: { baslangic?: number; bitis?: number; kullanildi: boolean } };
  odalar: OdaTeklifi[];
  tesis: { tur: TesisTuru; acik: boolean; uygun: boolean; kalanHak?: number; neden?: string; sureMs: number };
  otomatik: { mod: OtomatikMod; modlar: OtomatikMod[] };
  uyku: boolean;
  mola: number | null;
  sozlesmeler: { oda: OdaId; han: string; baslangic: number; bitis: number; odenen: number; etkin: boolean }[];
  gunluk: BarinmaSatiri[];
  para: number;
}
export interface TekDokunus {
  tur: "oda" | "tesis" | "uzat" | "otomatik";
  anahtar: string;
  fiyat: number;
  uygun: boolean;
  neden?: string;
  istek: { yontem: "POST"; yol: string; govde: Record<string, string | number> };
}
/** GET /v1/donus → {donusEkrani}; /v1/yerlesim yanıtında `donusEkrani` (24 saati aşan yoklukta; yoksa null). */
export interface DonusEkrani {
  yokluk: { baslangic: number; ms: number; ay: number; uyku: boolean };
  baslik: string;
  barinma: { durum: BarinmaDurumu; anahtar: string; unvan: "evsiz" | null; konaklama: Konaklama | null; zincir: Zincir | null; toparlanma?: string };
  hal: {
    can: { deger: number; anahtar: string; taban: number; toparlanmaAylik: number };
    kondisyon: { deger: number; anahtar: string; toparlanmaAylik: number };
    gonul: { deger: number; anahtar: string; denge: number };
    nedenler: HalNedeni[];
  };
  olanlar: BarinmaSatiri[];
  secenekler: TekDokunus[];
  otomatik: { mod: OtomatikMod; oneri: string | null };
  mola: number | null;
}
export interface KiraYaniti {
  kira: { oda: OdaId; sure: KiraSuresi; fiyat: number; batak: number; baslangic: number; bitis: number; uzatildi: boolean };
  barinma: BarinmaGorunumu;
}
export interface TesisYaniti { tesis: { tur: TesisTuru; baslangic: number; bitis: number }; barinma: BarinmaGorunumu }
export interface OtomatikYaniti { otomatik: OtomatikMod; barinma: BarinmaGorunumu }
/** Tek dokunuş yanıtı: hangi uç olursa olsun yeni barınma görünümü gelir. */
export type BarinmaYaniti = { barinma: BarinmaGorunumu } & Partial<KiraYaniti & TesisYaniti & OtomatikYaniti>;

export const barinmaMi = (v: unknown): v is BarinmaGorunumu =>
  nesneMi(v) && typeof v.acik === "boolean" && metinMi(v.durum) && (v.konaklama === null || nesneMi(v.konaklama))
  && (v.zincir === null || nesneMi(v.zincir)) && Array.isArray(v.odalar) && nesneMi(v.tesis) && nesneMi(v.otomatik) && sayiMi(v.para);
export const donusMi = (v: unknown): v is DonusEkrani =>
  nesneMi(v) && nesneMi(v.yokluk) && sayiMi(v.yokluk.ms) && metinMi(v.baslik) && nesneMi(v.barinma) && nesneMi(v.hal)
  && Array.isArray(v.olanlar) && Array.isArray(v.secenekler) && nesneMi(v.otomatik);
const barinmaliMi = (v: unknown): v is BarinmaYaniti => nesneMi(v) && barinmaMi(v.barinma);
const sarili = <A extends string, T>(alan: A, bicim: (v: unknown) => v is T) => (v: unknown): v is Record<A, T> => nesneMi(v) && bicim(v[alan]);

/** /v1/yerlesim yanıtındaki ek alanlar (eski sunucu göndermez). */
export const yerlesimBarinma = (y: unknown): BarinmaGorunumu | null => (nesneMi(y) && barinmaMi(y.barinma) ? y.barinma : null);
export const yerlesimDonus = (y: unknown): DonusEkrani | null => (nesneMi(y) && donusMi(y.donusEkrani) ? y.donusEkrani : null);

/** Sunucunun tek dokunuşla gönderilmesine izin verdiği uçlar (başka yol gönderilmez). */
const TEK_DOKUNUS_YOLLARI: ReadonlySet<string> = new Set(["/v1/barinma/kira", "/v1/barinma/tesis", "/v1/barinma/otomatik"]);

export interface BarinmaIstemci {
  barinma(dil: Dil): Promise<EkSonuc<{ barinma: BarinmaGorunumu }>>;
  kira(g: { oda: OdaId; sure: KiraSuresi; istekNo: string }): Promise<EkSonuc<KiraYaniti>>;
  tesis(g: { istekNo: string }): Promise<EkSonuc<TesisYaniti>>;
  otomatik(g: { mod: OtomatikMod; istekNo: string }): Promise<EkSonuc<OtomatikYaniti>>;
  donus(dil: Dil): Promise<EkSonuc<{ donusEkrani: DonusEkrani }>>;
  tekDokunus(s: TekDokunus, istekNo: string): Promise<EkSonuc<BarinmaYaniti>>;
}

const httpBarinma: BarinmaIstemci = {
  barinma: (dil) => ekCagir({ yontem: "GET", yol: `/v1/barinma?dil=${dil}`, tekrar: true }, sarili("barinma", barinmaMi)),
  kira: (g) => ekCagir({ yontem: "POST", yol: "/v1/barinma/kira", govde: g, tekrar: true }, (v): v is KiraYaniti => barinmaliMi(v) && nesneMi(v.kira)),
  tesis: (g) => ekCagir({ yontem: "POST", yol: "/v1/barinma/tesis", govde: g, tekrar: true }, (v): v is TesisYaniti => barinmaliMi(v) && nesneMi(v.tesis)),
  otomatik: (g) => ekCagir({ yontem: "POST", yol: "/v1/barinma/otomatik", govde: g, tekrar: true }, (v): v is OtomatikYaniti => barinmaliMi(v) && metinMi(v.otomatik)),
  donus: (dil) => ekCagir({ yontem: "GET", yol: `/v1/donus?dil=${dil}`, tekrar: true }, sarili("donusEkrani", donusMi)),
  tekDokunus: (s, istekNo) =>
    TEK_DOKUNUS_YOLLARI.has(s.istek.yol) && s.istek.yontem === "POST"
      ? ekCagir({ yontem: "POST", yol: s.istek.yol, govde: { ...s.istek.govde, istekNo }, tekrar: true }, barinmaliMi)
      : Promise.resolve(ekBasarisiz("gecersiz_istek")),
};

/** Geliştirici/önizlemede sahte barınma, yoksa sunucu. */
export function useBarinmaIstemci(): BarinmaIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const para = o.yerlesim?.ben.para ?? 0;
  const tur = o.yerlesim?.yerlesim.tur ?? "kasaba";
  return useMemo(() => (sahte ? sahteBarinmaIstemci(para, tur) : httpBarinma), [sahte]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Sunucu saati ile cihaz saati arasındaki fark (ms): yerleşim yanıtının `saat.simdi` damgasından. */
export function useSunucuFarki(): number {
  const o = useOnline();
  return o.yerlesim ? o.yerlesim.saat.simdi - o.yerlesimAlindi : 0;
}
