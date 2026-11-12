// E4.3 hizmet pazarı istemcisi: katalog, hazırlama, ilan, satın alma ve iptal uçları.
// Sunucu sonucu tek doğruluk kaynağıdır; istemci etki, fiyat veya yetki hesaplamaz.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekCagir, nesneMi, sayiMi, metinMi, type EkSonuc } from "./ek-istemci";
import { istekNoUret } from "./depo";

export interface HizmetTarifSatiri {
  id: string; meslek: string; dugum: string; seviye: number;
  girdi: Record<string, number>; takat: number; aylikTavan: number;
  hedef: string; etki: { tur: string; alan: string; deger?: number }[];
  hazir: { adet: number; gecerlilikAy: number }; fiyatTaban: number; npcOdul?: number | null; acik: boolean;
}
export interface HizmetStokSatiri {
  id: string; hizmet: string; ad: string; adet: number;
  hazirlandigiAy: number; sonAy: number; kalanAy: number; fiyatTaban: number | null;
}
export interface HizmetIlanSatiri {
  id: string; hizmet: string; ad: string; adet: number; birimFiyat: number;
  toplamFiyat: number; acilisAy: number; sonAy: number; kalanAy: number;
  benim: boolean; fiyatTaban: number | null;
}
export interface HizmetNpcTalepSatiri {
  id: string; hizmet: string; hedef: string; acilisAy: number; sonAy: number; odul: number;
}
export interface HizmetDurumu {
  katalog: HizmetTarifSatiri[]; stok: HizmetStokSatiri[];
  ilanlar: HizmetIlanSatiri[]; benimIlanlar: HizmetIlanSatiri[];
  npcTalepleri: HizmetNpcTalepSatiri[]; gorevler: HizmetGorevSatiri[];
  kurallar: { tekHazirlamaEnCok: number; hizmetStokEnCok: number; acikIlanEnCok: number; alimAdetEnCok: number };
}
export interface HizmetIslemYaniti {
  hazirlama?: { stok: HizmetStokSatiri; harcanan: { girdiler: Record<string, number>; takat: number } };
  stok?: HizmetStokSatiri;
  ilan?: HizmetIlanSatiri;
  iade?: number;
  islem?: { ilan: HizmetIlanSatiri; adet: number; tutar: number; etki: Record<string, number>; hizmetPuani: number; odul: number };
}

const stokMu = (v: unknown): v is HizmetStokSatiri => nesneMi(v) && metinMi(v.id) && metinMi(v.hizmet) && metinMi(v.ad) && sayiMi(v.adet) && sayiMi(v.sonAy);
const ilanMu = (v: unknown): v is HizmetIlanSatiri => nesneMi(v) && metinMi(v.id) && metinMi(v.hizmet) && metinMi(v.ad) && sayiMi(v.adet) && sayiMi(v.birimFiyat) && typeof v.benim === "boolean";
const npcTalepMu = (v: unknown): v is HizmetNpcTalepSatiri => nesneMi(v) && metinMi(v.id) && metinMi(v.hizmet) && metinMi(v.hedef) && sayiMi(v.acilisAy) && sayiMi(v.sonAy) && sayiMi(v.odul);
const gorevMu = (v: unknown): v is HizmetGorevSatiri => nesneMi(v) && metinMi(v.id) && metinMi(v.tur) && sayiMi(v.odul) && sayiMi(v.takat) && (v.arac === null || metinMi(v.arac));
const tarifMu = (v: unknown): v is HizmetTarifSatiri => nesneMi(v) && metinMi(v.id) && metinMi(v.meslek) && metinMi(v.dugum) && sayiMi(v.seviye) && sayiMi(v.takat) && typeof v.acik === "boolean";
const durumMu = (v: unknown): v is HizmetDurumu => nesneMi(v) && Array.isArray(v.katalog) && v.katalog.every(tarifMu) && Array.isArray(v.stok) && v.stok.every(stokMu) && Array.isArray(v.ilanlar) && v.ilanlar.every(ilanMu) && Array.isArray(v.benimIlanlar) && v.benimIlanlar.every(ilanMu) && Array.isArray(v.npcTalepleri) && v.npcTalepleri.every(npcTalepMu) && Array.isArray(v.gorevler) && v.gorevler.every(gorevMu) && nesneMi(v.kurallar);
const islemMu = (v: unknown): v is HizmetIslemYaniti => nesneMi(v);

export interface HizmetIstemci {
  yukle(): Promise<EkSonuc<HizmetDurumu>>;
  hazirla(hizmet: string, adet: number): Promise<EkSonuc<HizmetIslemYaniti>>;
  ilan(stok: string, adet: number, fiyat: number): Promise<EkSonuc<HizmetIslemYaniti>>;
  satinAl(ilan: string, adet: number): Promise<EkSonuc<HizmetIslemYaniti>>;
  geri(ilan: string): Promise<EkSonuc<HizmetIslemYaniti>>;
  talepTeslim(talep: string): Promise<EkSonuc<HizmetIslemYaniti>>;
  gorevTeslim(gorev: string): Promise<EkSonuc<HizmetIslemYaniti>>;
}
const istek = (govde: Record<string, unknown>) => ({ ...govde, istekNo: istekNoUret() });

export function httpHizmetIstemci(): HizmetIstemci {
  return {
    yukle: () => ekCagir({ yontem: "GET", yol: "/v1/hizmet", tekrar: true }, durumMu),
    hazirla: (hizmet, adet) => ekCagir({ yontem: "POST", yol: "/v1/hizmet/hazirla", govde: istek({ hizmet, adet }), tekrar: true }, islemMu),
    ilan: (stok, adet, fiyat) => ekCagir({ yontem: "POST", yol: "/v1/hizmet/ilan", govde: istek({ stok, adet, fiyat }), tekrar: true }, islemMu),
    satinAl: (ilan, adet) => ekCagir({ yontem: "POST", yol: "/v1/hizmet/satin-al", govde: istek({ ilan, adet }), tekrar: true }, islemMu),
    geri: (ilan) => ekCagir({ yontem: "POST", yol: "/v1/hizmet/geri", govde: istek({ ilan }), tekrar: true }, islemMu),
    talepTeslim: (talep) => ekCagir({ yontem: "POST", yol: "/v1/hizmet/talep-teslim", govde: istek({ talep }), tekrar: true }, islemMu),
    gorevTeslim: (gorev) => ekCagir({ yontem: "POST", yol: "/v1/hizmet/gorev", govde: istek({ gorev }), tekrar: true }, islemMu),
  };
}

const gercek = httpHizmetIstemci();
/** Geliştirici önizlemesinde sahte hizmet pazarı yoktur; gerçek hesapta sunucu istemcisi kullanılır. */
export function useHizmetIstemci(): HizmetIstemci | null {
  const o = useOnline();
  return useMemo(() => o.oturum?.tur === "gelistirici" ? null : gercek, [o.oturum?.tur]);
}
