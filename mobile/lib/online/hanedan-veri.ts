// Hanedan (Faz 7) istemci biçimleri: online-server/src/yerlesim/{hanedan-gorunum,vasiyet,devir,kronik,evlilik}.ts ve
// motor.ts yanıtlarıyla birebir. Vâris, pay, vergi, nam devri ve kronik satırı sunucuda hesaplanır; istemci yalnız
// gösterir, vasiyet/evlilik/devir niyetini gönderir. Devir önizlenen planın karmasıyla (pk) yapılır.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekCagir, metinMi, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";
import { sahteHanedanIstemci } from "./sahte-hanedan";
import type { Cinsiyet, Dil, Ozet } from "./protokol";

/** GET /v1/yerlesim ben.hanedan (motor.ts #ben; eski sunucu göndermeyebilir). */
export interface HanedanOzeti { id: string; nesil: number; olu: boolean; sonGunler: boolean }
export const benHanedani = (ben: unknown): HanedanOzeti | null => {
  const h = nesneMi(ben) ? ben.hanedan : undefined;
  return nesneMi(h) && metinMi(h.id) && sayiMi(h.nesil) ? (h as unknown as HanedanOzeti) : null;
};

export interface HanedanKisi { id: string; ad: string; yas: number; cinsiyet: Cinsiyet }
export type Yakinlik = "cocuk" | "kardes" | "yegen";
export interface VarisAdayi extends HanedanKisi { yakinlik: Yakinlik; uygun: boolean; neden?: "kucuk" }
export interface VasiyetPayi { kime: string; oran: number }
export interface Vasiyet { varis?: string; paylar?: VasiyetPayi[] }
export const VAKIF = "vakif";
export const UZAK = "uzak";
/** [sunucu vasiyet.ts] Vasiyette en çok pay satırı. */
export const VASIYET_PAY_EN_COK = 8;

export interface HanedanGorunumu extends HanedanOzeti {
  es: { id: string; ad: string | null; oyuncu: boolean; evlilikAyi: number | null } | null;
  cocuklar: HanedanKisi[];
  kardesler: HanedanKisi[];
  yegenler: HanedanKisi[];
  adaylar: VarisAdayi[];
  varsayilanVaris: string;
  vasiyet: Vasiyet | null;
  vasiyetAlicilari: string[];
  aileMeslegi: string | null;
  atalar: { id: string; ad: string; dogumAyi: number; olumAyi: number; yas: number }[];
  yaslilik: { basladi: boolean; takatTavani: number | null };
  tereke: { olumAyi: number; son: number; kalanAy: number } | null;
  kasaba: { hazine: number; vakif: number };
  kurallar: {
    vergiOrani: number; namDevirOrani: number; devirSureAy: number; evlilikYasi: number;
    evlilikGorusEsigi: number; dugunBedeli: number; sonGunlerAy: number;
  };
}

export type DevirKalemi =
  | { tur: "pay"; kime: string; oran: number; akce: number }
  | { tur: "vergi"; akce: number }
  | { tur: "emanet"; akce: number }
  | { tur: "envanter"; mallar: Record<string, number> }
  /** Ölünün işletmeleri bölünmeden vârise geçer (sunucu mulk/miras.ts). */
  | { tur: "mulk"; isletmeler: string[] }
  | { tur: "nam"; nam: number[] }
  | { tur: "aileMeslegi"; meslek: string; carpan: number }
  | { tur: "ata"; npc: number; yuk: number }
  | { tur: "kusme"; npc: number; yuk: number }
  | { tur: "husumet"; kim: string }
  | { tur: "isaretSil"; kim: string };
export interface VarisBilgisi { id: string; ad: string; k: 0 | 1; d: number; e: number; an: number; ba: number }
export interface DevirPlani {
  olu: string; hesap: string; hanedan: string; nesil: number; ol: number;
  varis: VarisBilgisi; tereke: number; kalemler: DevirKalemi[];
  kronik: { t: string; k: string; p: Record<string, unknown> };
}
export interface KronikSatiri { sira: number; ay: number; tur: "olum" | "devir" | "evlilik" | "dogum"; ozet: Ozet }
export interface DevirOnizleme { plan: DevirPlani; pk: string; varsayim: boolean; kronik: KronikSatiri }
export interface DevirYaniti { id: string; pk: string; plan: DevirPlani; para: number; hanedan: HanedanOzeti; olay?: unknown }
export interface EvlilikYaniti { es: { id: string; ad: string }; esik: number; bedel: number; takat: number; para: number }
export interface KronikYaniti { kronik: KronikSatiri[]; imlec: number; dahaVar: boolean }

const kisiMi = (v: unknown): v is HanedanKisi => nesneMi(v) && metinMi(v.id) && metinMi(v.ad) && sayiMi(v.yas);
const kisilerMi = (v: unknown) => Array.isArray(v) && v.every(kisiMi);
const gorunumMu = (v: unknown): v is HanedanGorunumu =>
  nesneMi(v) && metinMi(v.id) && sayiMi(v.nesil) && typeof v.olu === "boolean" && kisilerMi(v.cocuklar) && kisilerMi(v.kardesler)
  && kisilerMi(v.yegenler) && Array.isArray(v.adaylar) && v.adaylar.every((a) => kisiMi(a) && typeof (a as VarisAdayi).uygun === "boolean")
  && metinMi(v.varsayilanVaris) && Array.isArray(v.vasiyetAlicilari) && Array.isArray(v.atalar) && nesneMi(v.yaslilik) && nesneMi(v.kurallar);
const planMi = (v: unknown): v is DevirPlani => nesneMi(v) && metinMi(v.olu) && sayiMi(v.nesil) && nesneMi(v.varis) && metinMi(v.varis.ad) && Array.isArray(v.kalemler);
const kronikSatiriMi = (v: unknown): v is KronikSatiri => nesneMi(v) && sayiMi(v.sira) && sayiMi(v.ay) && metinMi(v.tur) && nesneMi(v.ozet) && metinMi(v.ozet.k);
const onizlemeMi = (v: unknown): v is DevirOnizleme => nesneMi(v) && planMi(v.plan) && metinMi(v.pk) && typeof v.varsayim === "boolean";
const devirMi = (v: unknown): v is DevirYaniti => nesneMi(v) && metinMi(v.id) && planMi(v.plan) && nesneMi(v.hanedan);
const vasiyetYanitiMi = (v: unknown): v is { vasiyet: Vasiyet | null } => nesneMi(v) && (v.vasiyet === null || nesneMi(v.vasiyet));
const evlilikMi = (v: unknown): v is EvlilikYaniti => nesneMi(v) && nesneMi(v.es) && metinMi(v.es.id) && sayiMi(v.bedel);
const kronikMi = (v: unknown): v is KronikYaniti => nesneMi(v) && Array.isArray(v.kronik) && v.kronik.every(kronikSatiriMi) && sayiMi(v.imlec) && typeof v.dahaVar === "boolean";

export interface HanedanIstemci {
  hanedan(dil: Dil): Promise<EkSonuc<HanedanGorunumu>>;
  vasiyet(g: { vasiyet: Vasiyet | null; istekNo: string; dil: Dil }): Promise<EkSonuc<{ vasiyet: Vasiyet | null }>>;
  devirOnizle(varis: string | null, dil: Dil): Promise<EkSonuc<DevirOnizleme>>;
  devir(g: { varis?: string; pk: string; istekNo: string; dil: Dil }): Promise<EkSonuc<DevirYaniti>>;
  evlilik(g: { hedef: string; istekNo: string; dil: Dil }): Promise<EkSonuc<EvlilikYaniti>>;
  kronik(imlec: number, dil: Dil): Promise<EkSonuc<KronikYaniti>>;
}

const httpHanedan: HanedanIstemci = {
  hanedan: (dil) => ekCagir({ yontem: "GET", yol: `/v1/hanedan?dil=${dil}`, tekrar: true }, gorunumMu),
  vasiyet: (g) => ekCagir({ yontem: "POST", yol: "/v1/vasiyet", govde: g, tekrar: true }, vasiyetYanitiMi),
  devirOnizle: (varis, dil) =>
    ekCagir({ yontem: "GET", yol: `/v1/devir/onizle?dil=${dil}${varis ? `&varis=${encodeURIComponent(varis)}` : ""}`, tekrar: true }, onizlemeMi),
  devir: (g) => ekCagir({ yontem: "POST", yol: "/v1/devir", govde: g, tekrar: true }, devirMi),
  evlilik: (g) => ekCagir({ yontem: "POST", yol: "/v1/evlilik", govde: g, tekrar: true }, evlilikMi),
  kronik: (imlec, dil) => ekCagir({ yontem: "GET", yol: `/v1/kronik?imlec=${Math.max(0, Math.floor(imlec))}&dil=${dil}`, tekrar: true }, kronikMi),
};

/** Oturum türüne göre: geliştirici/önizlemede sahte hanedan, yoksa sunucu. */
export function useHanedanIstemci(): HanedanIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const ad = o.profil?.ad ?? "—";
  const cins = o.profil?.cinsiyet ?? "kadın";
  const tanidiklar = o.yerlesim?.ben.tanidiklar;
  return useMemo(
    () => (sahte ? sahteHanedanIstemci(ad, cins, (id) => tanidiklar?.find((x) => x.id === id)) : httpHanedan),
    [sahte, ad, cins, tanidiklar],
  );
}
