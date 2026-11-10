// Faz 12–13 mülk, işletme ve çalışan istemci biçimleri: online-server/src/mulk/{tapu,isletme,yerlesim-mulk,kurallar}.ts
// ile birebir. Edinim şartı, kasa, gelir dökümü, kalite, yetki ve devir sürümü sunucuda hesaplanır; istemci gösterir
// ve niyeti (istekNo ile) gönderir. Katalog ve sınırlar (tezyin, rol, yetki, çarpan, maaş) kurallar.ts [PARAMETRE]
// kopyasıdır: yalnız seçenekleri listelemek için; doğrulama sunucudadır.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekCagir, metinMi, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";
import { sahteMulkIstemci } from "./sahte-mulk";

export const MULK_TURLERI = ["han", "dukkan", "atolye"] as const;
export type MulkTuru = (typeof MULK_TURLERI)[number];
export const YETKILER = ["kasa", "musteri", "fiyat", "personel", "vekalet", "masa"] as const;
export type Yetki = (typeof YETKILER)[number];
export const ROLLER = ["hanci", "garson", "asci", "ozan", "yonetici"] as const;
export type Rol = (typeof ROLLER)[number];
export const TEZYIN = {
  mimari: { selcuklu: { fiyat: 40, itibar: 1 }, ahsap: { fiyat: 20, itibar: 0 }, tas: { fiyat: 60, itibar: 2 } },
  atmosfer: { sakin: { fiyat: 10, itibar: 0 }, hareketli: { fiyat: 15, itibar: 1 }, luks: { fiyat: 50, itibar: 2 }, mutevazi: { fiyat: 5, itibar: 0 } },
  aydinlatma: { kandil: { fiyat: 5, itibar: 0 }, samdan: { fiyat: 15, itibar: 1 }, avize: { fiyat: 45, itibar: 2 } },
  ozelAlan: { yok: { fiyat: 0, itibar: 0 }, misafirOdasi: { fiyat: 35, itibar: 1 }, toplantiOdasi: { fiyat: 35, itibar: 1 } },
} as const;
export type TezyinGrubu = keyof typeof TEZYIN;
export const TEZYIN_GRUPLARI = Object.keys(TEZYIN) as TezyinGrubu[];
export const SINIR = { fiyatEnAz: 50, fiyatEnCok: 150, maasEnAz: 1, maasEnCok: 60, vekaletEnUzun: 6, transferEnCok: 10_000, adEnKisa: 3, adEnUzun: 32 } as const;

export interface EdinimSarti {
  fiyat: number; akce: number; nam: number; namEsigi: number; loncaKademe: number; loncaEsigi: number; yas: number; yasEsigi: number;
  uygun: boolean; eksik: string[];
}
export interface Yuva {
  isletme: string; tur: MulkTuru; no: number; durum: "bos" | "sahipli";
  sahip?: { id: string; ad: string }; ad?: string; seviye?: number; fiyat?: number; devirTeklifi?: { fiyat: number };
}
/** GET /v1/mulk */
export interface MulkListesi {
  yuvalar: Yuva[]; benim: string[]; calistigim: string[]; teklifler: string[]; sinir: { enCok: number; sahip: number };
  edinimSarti: Record<MulkTuru, EdinimSarti>; bekleyen: { islem: string; tur: string; tutar: number; durum: string }[];
}
export interface EdinimYaniti {
  edinim: { isletme: string; tur: MulkTuru; no: number; fiyat: number; batak: number; sart: EdinimSarti; islem: string };
  transferDurumu?: string;
}
export interface SozlesmeGorunumu {
  no: number; calisan: { tur: "oyuncu" | "npc"; id: string; ad: string }; rol: Rol; yetkiler: Yetki[]; maas: number; baslangic: number;
  bitis: number | null; odenenAy: number; kademe: number; durum: string; vekaletBitis: number | null;
}
export interface SeviyeGorunumu { ad: string; sira: number; puan: number; dokum: { itibar: number; faaliyet: number; gelir: number }; sonrakiEsik: number | null }
export interface IsletmePaneli {
  id: string; tur: MulkTuru; ad: string; durum: "acik" | "iflas"; sahip: { id: string; ad: string }; seviye: SeviyeGorunumu; itibar: number;
  kapasite: number; tezyin: Partial<Record<TezyinGrubu, string>>; fiyatCarpani: number; kapi: boolean;
  kasa?: number; emanet?: number; borc?: number; borcAy?: number; defter?: [number, string, number, string?][];
  maasYuku?: number; kalite?: { toplam: number; dokum: { rol: Rol; kademe: number; kaynak: "personel" | "sahip" }[] };
  npcGeliri?: { tutar: number; taban: number; itibarYuzde: number; kaliteYuzde: number; teveccuhYuzde: number; tavan: number };
  bakim?: number; personel?: SozlesmeGorunumu[];
  teklifler?: { n: number; hedef: { o: string; ad: string }; r: Rol; m: number; ay: number }[];
  oneriler?: { n: number; oneren: string; hedef: { o?: string; n?: string; ad: string }; r: Rol; m: number; ay: number }[];
  sicil?: number; cekim?: { bugun: number; tavan: number }; tezyinKalan?: number; adUcretsizKalan?: number;
}
export type Konum = "sahip" | "vekil" | Rol | null;
/** GET /v1/isletme/:id */
export interface PanelYaniti { isletme: IsletmePaneli; konum: Konum; yetkiler: Yetki[] }
/** GET /v1/isletme/:id/devir */
export interface DevirOnizleme {
  surum: string; isletme: string; sahip: { id: string; ad: string }; kasa: number; emanet: number; borc: number; borcAy: number; iflasEsigi: number;
  maasYuku: number; sozlesmeler: SozlesmeGorunumu[]; sicil: number; itibar: number; seviye: string; bekleyenTransfer: number;
}
export type IsletmeKomutu = "yatir" | "cek" | "emanet" | "ad" | "tezyin" | "fiyat" | "kapi" | "personel" | "devir";
export type KomutYaniti = Record<string, unknown> & { para?: number };

const mulkMi = (v: unknown): v is MulkListesi =>
  nesneMi(v) && Array.isArray(v.yuvalar) && Array.isArray(v.benim) && Array.isArray(v.teklifler) && nesneMi(v.sinir) && nesneMi(v.edinimSarti);
const panelMi = (v: unknown): v is PanelYaniti =>
  nesneMi(v) && nesneMi(v.isletme) && metinMi(v.isletme.id) && nesneMi(v.isletme.seviye) && sayiMi(v.isletme.itibar) && Array.isArray(v.yetkiler);
const devirMi = (v: unknown): v is DevirOnizleme => nesneMi(v) && metinMi(v.surum) && sayiMi(v.kasa) && Array.isArray(v.sozlesmeler);

export interface MulkIstemci {
  liste(): Promise<EkSonuc<MulkListesi>>;
  edin(g: { tur: MulkTuru; istekNo: string }): Promise<EkSonuc<EdinimYaniti>>;
  panel(id: string): Promise<EkSonuc<PanelYaniti>>;
  devir(id: string): Promise<EkSonuc<DevirOnizleme>>;
  komut(id: string, k: IsletmeKomutu, govde: Record<string, unknown> & { istekNo: string }): Promise<EkSonuc<KomutYaniti>>;
}

const yol = (id: string) => "/v1/isletme/" + encodeURIComponent(id);
const httpMulk: MulkIstemci = {
  liste: () => ekCagir({ yontem: "GET", yol: "/v1/mulk", tekrar: true }, mulkMi),
  edin: (g) => ekCagir({ yontem: "POST", yol: "/v1/mulk/edin", govde: g, tekrar: true }, (v): v is EdinimYaniti => nesneMi(v) && nesneMi(v.edinim)),
  panel: (id) => ekCagir({ yontem: "GET", yol: yol(id), tekrar: true }, panelMi),
  devir: (id) => ekCagir({ yontem: "GET", yol: yol(id) + "/devir", tekrar: true }, devirMi),
  komut: (id, k, govde) => ekCagir({ yontem: "POST", yol: `${yol(id)}/${k}`, govde, tekrar: true }, (v): v is KomutYaniti => nesneMi(v)),
};

/** Geliştirici/önizlemede sahte mülk, yoksa sunucu. */
export function useMulkIstemci(): MulkIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const para = o.yerlesim?.ben.para ?? 0;
  const yer = o.yerlesim?.yerlesim.id ?? "develi";
  return useMemo(() => (sahte ? sahteMulkIstemci(para, yer) : httpMulk), [sahte]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** İşletme kimliği "<yerleşim>.<tür>.<no>" → tür ve no (görünüm için). */
export function isletmeParca(id: string): { tur: MulkTuru; no: number } | null {
  const m = /^[a-z0-9-]{1,40}\.(han|dukkan|atolye)\.([1-9][0-9]?)$/.exec(id);
  return m ? { tur: m[1] as MulkTuru, no: Number(m[2]) } : null;
}
export const isletmeYolu = (id: string, devir = false) => `/online/isletme/${encodeURIComponent(id)}${devir ? "?devir=1" : ""}`;
export const MULK_IKON: Record<MulkTuru, string> = { han: "beer", dukkan: "scales", atolye: "anvil" };
