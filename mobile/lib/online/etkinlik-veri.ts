// Canlı etkinlikler (yönetici panelinden açılır): online-server/src/etkinlik/katilim.ts ile birebir.
// Etkin liste /v1/yerlesim yanıtının `etkinlikler` alanında gelir (eski sunucu göndermez → boş). Ödül, süre ve meslek
// çarpanı sunucuda hesaplanır; istemci gösterir ve katılım niyetini (POST /v1/etkinlik {id, istekNo}) yollar.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekBasarisiz, ekCagir, metinMi, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";

export const ETKINLIK_TURLERI = [
  "senlik", "bereket", "kitlik", "kervan", "ozan", "panayir", "haydut", "salgin", "vakif",
  "dugun", "lonca", "pehlivan", "ferman", "kis", "ilim", "goc", "hasat", "hazine",
] as const;
export type EtkinlikTuru = (typeof ETKINLIK_TURLERI)[number];

export interface EtkinlikGorunumu {
  id: string;
  tur: EtkinlikTuru;
  /** Başlangıç ve bitiş (sunucu saati, ms); bit null = yönetici durdurana kadar. */
  bas: number;
  bit: number | null;
  ikon: string;
  katildin: boolean;
  odul: { nam: string; namN: number; gonul: number; mal: { mal: string; adet: number } | null; meslekCarpani: number };
  takat: number;
  dert: string | null;
}

const turMu = (v: unknown): v is EtkinlikTuru => typeof v === "string" && (ETKINLIK_TURLERI as readonly string[]).includes(v);
const odulMu = (v: unknown): v is EtkinlikGorunumu["odul"] =>
  nesneMi(v) && metinMi(v.nam) && sayiMi(v.namN) && sayiMi(v.gonul) && sayiMi(v.meslekCarpani)
  && (v.mal === null || (nesneMi(v.mal) && metinMi(v.mal.mal) && sayiMi(v.mal.adet)));
export const etkinlikMi = (v: unknown): v is EtkinlikGorunumu =>
  nesneMi(v) && metinMi(v.id) && turMu(v.tur) && sayiMi(v.bas) && (v.bit === null || sayiMi(v.bit)) && metinMi(v.ikon)
  && typeof v.katildin === "boolean" && odulMu(v.odul) && sayiMi(v.takat);

/** /v1/yerlesim yanıtındaki etkin etkinlikler (tanınmayan tür atılır: eski istemci yeni etkinliği göstermez). */
export const yerlesimEtkinlikleri = (y: unknown): EtkinlikGorunumu[] =>
  nesneMi(y) && Array.isArray(y.etkinlikler) ? y.etkinlikler.filter(etkinlikMi) : [];

export interface KatilimYaniti {
  etkinlik: string;
  odul: { gonul: number; nam: Record<string, number>; mal: { mal: string; adet: number } | null; meslekCarpani: number };
  etkinlikler: EtkinlikGorunumu[];
}
const katilimMi = (v: unknown): v is KatilimYaniti =>
  nesneMi(v) && metinMi(v.etkinlik) && nesneMi(v.odul) && sayiMi(v.odul.gonul) && nesneMi(v.odul.nam) && Array.isArray(v.etkinlikler);

export interface EtkinlikIstemci {
  katil(g: { id: string; istekNo: string }): Promise<EkSonuc<KatilimYaniti>>;
}

const httpEtkinlik: EtkinlikIstemci = {
  katil: (g) => ekCagir({ yontem: "POST", yol: "/v1/etkinlik", govde: g, tekrar: true }, katilimMi),
};
const sahteEtkinlik: EtkinlikIstemci = { katil: async () => ekBasarisiz("etkinlik_yok") };

/** Geliştirici/önizlemede sunucu yok: katılım reddedilir (bant zaten etkinlik göstermez). */
export function useEtkinlikIstemci(): EtkinlikIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  return useMemo(() => (sahte ? sahteEtkinlik : httpEtkinlik), [sahte]);
}
