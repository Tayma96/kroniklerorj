// Faz 6 ekonomi istemci biçimleri: online-server/src/yerlesim/{ekonomi-uclar,pazar-tahta,ismarlama,levha,defter,kalite}.ts
// ve kasaba nabzı (arka-plan.ts arkaPlanGorunumu) ile birebir. Fiyat dökümü, bac, pompa payı ve kalite sunucuda
// hesaplanır; istemci gösterir ve niyeti (istekNo ile) gönderir.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekCagir, metinMi, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";
import { sahteEkonomiIstemci } from "./sahte-ekonomi";

export const KALITE_ADLARI = ["sade", "iyi", "ustun", "saheser"] as const;
export type KaliteAdi = (typeof KALITE_ADLARI)[number];
export type Kademe4 = 0 | 1 | 2 | 3;
export type IlanTuru = "sat" | "al";
export type IlanDurumu = "acik" | "bitti" | "geri" | "dustu";
export type IsmarlamaDurumu = "acik" | "surer" | "teslim" | "ret" | "geri" | "dustu" | "gecikti";

export interface Karsilastirma {
  birimFiyat: number; npcTaban: number; npcdenAlis: number; stokFiyati: number; adil: number;
  bant: { alt: number; ust: number }; tabanOrani: number | null;
}
export interface PompaDokumu {
  hediye: number; yon: "alicidan" | "saticidan" | null; ayniKume: boolean; bant: { alt: number; ust: number }; verenKalan: number; alanKalan: number;
}
export interface IlanGorunumu {
  id: string; tur: IlanTuru; sahip: { id: string; ad: string }; benim: boolean; mal: string; kalite: KaliteAdi; kademe: Kademe4;
  kalan: number; ilk: number; birimFiyat: number; toplam: number; emanet: { adet: number; akce: number }; yapanlar: string[];
  acilis: number; son: number; kalanAy: number; durum: IlanDurumu; karsilastirma: Karsilastirma;
  islemler: { ay: number; kim: string; adet: number; tutar: number }[];
}
export interface PazarOzeti { mal: string; npcTaban: number; npcdenAlis: number; enUcuzSatis: number | null; enYuksekAlim: number | null }
export interface PazarKurallari {
  ilanEnCok: number; sureEnCok: number; adetEnCok: number; bacOrani: number; adilBant: { alt: number; ust: number };
  kumeCarpani: number; kaliteCarpani: number[]; armaganTavani: { verme: number; alma: number };
}
/** GET /v1/pazar?mal= */
export interface PazarYaniti {
  ilanlar: IlanGorunumu[]; benim: IlanGorunumu[]; ozet: PazarOzeti[]; kurallar: PazarKurallari; kaliteler: KaliteAdi[];
  armaganKalan: { verme: number; alma: number }; emanet: number;
}
export interface PazarIslemYaniti {
  islem: { ilan: IlanGorunumu; adet: number; kalite: KaliteAdi; tutar: number; bac: number; net: number; karsilastirma: Karsilastirma; pompa: PompaDokumu };
}
export interface IlanIstegi { tur: IlanTuru; mal: string; adet: number; fiyat: number; sure?: number; kalite?: Kademe4; istekNo: string }

export interface IsmarlamaGorunumu {
  id: string; rol: "musteri" | "usta" | null; musteri: { id: string; ad: string }; usta: { id: string; ad: string }; mal: string; adet: number;
  kalite: KaliteAdi; kademe: Kademe4; ucret: number; emanet: number; acilis: number; son: number; kalanAy: number; durum: IsmarlamaDurumu;
  teslimKalitesi: KaliteAdi | null; hizmet: number | null;
}
export interface IsmarlamaSicili { teslim: number; gecikme: number; guven: number | null }
/** GET /v1/ismarlama */
export interface IsmarlamaYaniti {
  gelen: IsmarlamaGorunumu[]; giden: IsmarlamaGorunumu[]; sicil: IsmarlamaSicili; emanet: number;
  kurallar: { adetEnCok: number; sureEnCok: number; musteriEnCok: number; ustaEnCok: number; adilBant: { alt: number; ust: number }; armaganTavani: { verme: number; alma: number } };
}
export type IsmarlamaCevabi = "kabul" | "ret" | "geri" | "teslim";

/** GET /v1/levha */
export interface LevhaYaniti {
  kayitlar: { oyuncu: { id: string; ad: string }; mal: string; kalite: KaliteAdi; kademe: Kademe4; ay: number; tarif: string }[];
  ustalar: { id: string; ad: string; saheser: number; ustun: number }[];
}
/** GET /v1/defter?ay= */
export interface DefterYaniti {
  aylar: { ay: number; kalemler: { k: string; d: number }[]; gelir: number; gider: number; net: number }[];
  toplam: { gelir: number; gider: number; net: number };
  kalemler: { k: string; d: number }[];
  ay: number; para: number; emanet: { pazar: number; ismarlama: number };
}

/** /v1/yerlesim `yerlesim.nabiz` (arka-plan.ts; eski sunucu göndermez). */
export interface KasabaNabzi {
  ay: number; nufus: number; yetiskin: number; issiz: number; bekar: number; yasli: number; cocuk: number; hane: number;
  gundem: Record<string, number>; tetikler: ("kitlik" | "haydut")[]; gocNiyeti: number; sayaclar: Record<string, number>;
}
/** /v1/yerlesim `ben.envanterKalite` (kalite.ts kaliteGorunumu): yalnız izli partisi olan mallar. */
export type KaliteParti = { kalite: KaliteAdi; kademe: Kademe4; adet: number; yapan: string | null };
export type EnvanterKalite = Record<string, KaliteParti[]>;

const dizi = Array.isArray;
export const ilanMi = (v: unknown): v is IlanGorunumu =>
  nesneMi(v) && metinMi(v.id) && metinMi(v.tur) && nesneMi(v.sahip) && metinMi(v.mal) && sayiMi(v.kalan) && sayiMi(v.birimFiyat) && nesneMi(v.karsilastirma);
const pazarMi = (v: unknown): v is PazarYaniti =>
  nesneMi(v) && dizi(v.ilanlar) && v.ilanlar.every(ilanMi) && dizi(v.benim) && dizi(v.ozet) && nesneMi(v.kurallar) && nesneMi(v.armaganKalan) && sayiMi(v.emanet);
const ismarlamaMi = (v: unknown): v is IsmarlamaGorunumu => nesneMi(v) && metinMi(v.id) && metinMi(v.mal) && sayiMi(v.ucret) && metinMi(v.durum);
const ismarlamalarMi = (v: unknown): v is IsmarlamaYaniti =>
  nesneMi(v) && dizi(v.gelen) && v.gelen.every(ismarlamaMi) && dizi(v.giden) && v.giden.every(ismarlamaMi) && nesneMi(v.sicil) && nesneMi(v.kurallar);
const levhaMi = (v: unknown): v is LevhaYaniti => nesneMi(v) && dizi(v.kayitlar) && dizi(v.ustalar);
const defterMi = (v: unknown): v is DefterYaniti => nesneMi(v) && dizi(v.aylar) && nesneMi(v.toplam) && sayiMi(v.para) && nesneMi(v.emanet);

export const yerlesimNabzi = (y: unknown): KasabaNabzi | null => {
  const n = nesneMi(y) && nesneMi(y.yerlesim) ? y.yerlesim.nabiz : null;
  return nesneMi(n) && sayiMi(n.nufus) && nesneMi(n.gundem) && dizi(n.tetikler) ? (n as unknown as KasabaNabzi) : null;
};
export const benKalite = (ben: unknown): EnvanterKalite | null =>
  nesneMi(ben) && nesneMi(ben.envanterKalite) ? (ben.envanterKalite as EnvanterKalite) : null;

export interface EkonomiIstemci {
  pazar(mal?: string): Promise<EkSonuc<PazarYaniti>>;
  ilan(g: IlanIstegi): Promise<EkSonuc<{ ilan: IlanGorunumu }>>;
  islem(g: { ilan: string; adet: number; kalite?: Kademe4; istekNo: string }): Promise<EkSonuc<PazarIslemYaniti>>;
  geri(g: { ilan: string; istekNo: string }): Promise<EkSonuc<{ ilan: IlanGorunumu; iade: unknown }>>;
  ismarlamalar(): Promise<EkSonuc<IsmarlamaYaniti>>;
  ismarla(g: { hedef: string; mal: string; adet: number; kalite?: Kademe4; sure: number; ucret: number; istekNo: string }): Promise<EkSonuc<{ ismarlama: IsmarlamaGorunumu }>>;
  cevap(g: { ismarlama: string; cevap: IsmarlamaCevabi; kalite?: Kademe4; istekNo: string }): Promise<EkSonuc<{ ismarlama: IsmarlamaGorunumu; teslim: unknown }>>;
  levha(mal?: string): Promise<EkSonuc<LevhaYaniti>>;
  defter(ay?: number): Promise<EkSonuc<DefterYaniti>>;
}

const sorgu = (ad: string, v: string | number | undefined) => (v === undefined || v === "" ? "" : `?${ad}=${encodeURIComponent(String(v))}`);
const post = <T,>(yol: string, govde: unknown, bicim: (v: unknown) => v is T) => ekCagir({ yontem: "POST", yol, govde, tekrar: true }, bicim);

const httpEkonomi: EkonomiIstemci = {
  pazar: (mal) => ekCagir({ yontem: "GET", yol: "/v1/pazar" + sorgu("mal", mal), tekrar: true }, pazarMi),
  ilan: (g) => post("/v1/pazar/ilan", g, (v): v is { ilan: IlanGorunumu } => nesneMi(v) && ilanMi(v.ilan)),
  islem: (g) => post("/v1/pazar/islem", g, (v): v is PazarIslemYaniti => nesneMi(v) && nesneMi(v.islem) && sayiMi(v.islem.tutar)),
  geri: (g) => post("/v1/pazar/geri", g, (v): v is { ilan: IlanGorunumu; iade: unknown } => nesneMi(v) && ilanMi(v.ilan)),
  ismarlamalar: () => ekCagir({ yontem: "GET", yol: "/v1/ismarlama", tekrar: true }, ismarlamalarMi),
  ismarla: (g) => post("/v1/ismarlama", g, (v): v is { ismarlama: IsmarlamaGorunumu } => nesneMi(v) && ismarlamaMi(v.ismarlama)),
  cevap: (g) => post("/v1/ismarlama/cevap", g, (v): v is { ismarlama: IsmarlamaGorunumu; teslim: unknown } => nesneMi(v) && ismarlamaMi(v.ismarlama)),
  levha: (mal) => ekCagir({ yontem: "GET", yol: "/v1/levha" + sorgu("mal", mal), tekrar: true }, levhaMi),
  defter: (ay) => ekCagir({ yontem: "GET", yol: "/v1/defter" + sorgu("ay", ay), tekrar: true }, defterMi),
};

/** Geliştirici/önizlemede sahte ekonomi, yoksa sunucu. */
export function useEkonomiIstemci(): EkonomiIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const para = o.yerlesim?.ben.para ?? 0;
  return useMemo(() => (sahte ? sahteEkonomiIstemci(para) : httpEkonomi), [sahte]); // eslint-disable-line react-hooks/exhaustive-deps
}
