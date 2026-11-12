// P5–P6 siyaset ekranı: bölge görünümü ve tekrar güvenli siyasi işlemler.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekCagir, nesneMi, metinMi, sayiMi, type EkSonuc } from "./ek-istemci";
import { istekNoUret } from "./depo";

export interface SiyasetDurumu {
  ay: number;
  bolge: Record<string, any> & { id: string; ad: string; kasa: number; gostergeler: Record<string, { deger: number; kademe: string }> };
  makamlar: Record<string, any>[];
  aziller: Record<string, any>[];
  kayit: Record<string, any>[];
  kayitSayisi: number;
  benim: { kisi: string; makamlar: string[]; vekillikler: string[]; adayliklar: string[]; azillerim: number[] } | null;
}
export interface SiyasetYanit {
  sonuc?: unknown;
  gorunum?: SiyasetDurumu;
}
const durumMu = (v: unknown): v is SiyasetDurumu =>
  nesneMi(v) && sayiMi(v.ay) && nesneMi(v.bolge) && metinMi(v.bolge.id) && metinMi(v.bolge.ad)
  && sayiMi(v.bolge.kasa) && nesneMi(v.bolge.gostergeler) && Array.isArray(v.makamlar)
  && Array.isArray(v.aziller) && Array.isArray(v.kayit) && sayiMi(v.kayitSayisi);
const yanitMu = (v: unknown): v is SiyasetYanit => nesneMi(v) && (v.gorunum === undefined || durumMu(v.gorunum));

export interface SiyasetIstemci {
  yukle(): Promise<EkSonuc<SiyasetDurumu>>;
  yaz(govde: Record<string, unknown>): Promise<EkSonuc<SiyasetYanit>>;
}
export function httpSiyasetIstemci(): SiyasetIstemci {
  return {
    yukle: () => ekCagir({ yontem: "GET", yol: "/v1/siyaset", tekrar: true }, durumMu),
    yaz: (govde) => ekCagir({
      yontem: "POST", yol: "/v1/siyaset",
      govde: { ...govde, istekNo: istekNoUret() }, tekrar: true,
    }, yanitMu),
  };
}
const gercek = httpSiyasetIstemci();
export function useSiyasetIstemci(): SiyasetIstemci | null {
  const o = useOnline();
  return useMemo(() => o.oturum?.tur === "gelistirici" ? null : gercek, [o.oturum?.tur]);
}
