// Göç (D1): GET /v1/goc?hedef= önizleme, POST /v1/goc {hedef, istekNo}. Biçimler online-server/src/yerlesim/goc.ts ve
// src/goc-hesap.ts ile birebir. Kapılar, bedel ve taşınacaklar sunucuda hesaplanır; istemci gösterir ve niyeti yollar.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekBasarili, ekBasarisiz, ekCagir, metinMi, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";
import { profilMi, type Profil } from "./protokol";

export const GOC_KAPILARI = ["olu", "yas", "soguma", "aile", "mulk", "makam", "darbe", "borc", "sozlesme", "acikIs", "dolu", "para"] as const;
export type GocKapisi = (typeof GOC_KAPILARI)[number];

export interface GocOnizleme {
  kaynak: string;
  hedef: string;
  ay: number;
  kapilar: Partial<Record<GocKapisi, boolean>>;
  kapiSirasi: string[];
  uygun: boolean;
  engel: string | null;
  yas: { yas: number; enAz: number };
  soguma: { sonGoc: number | null; acilisAyi: number | null; sure: number };
  akce: { mevcut: number; yolBedeli: number; tasinan: number };
  envanter: { sinir: number; tasinan: Record<string, number>; emanet: Record<string, number>; tasinanAdet: number; emanetAdet: number };
  misafirhane: { saat: number; kullanildi: boolean };
  doluluk: { nufus: number; evKapasite: number };
  tasinanlar: string[];
  kalanlar: string[];
}
export interface GocSonucu {
  goc: { kaynak: string; hedef: string; id: string; yolBedeli: number; akce: number; tasinan: Record<string, number>; emanet: Record<string, number> };
  profil: Profil;
}

const onizlemeMi = (v: unknown): v is GocOnizleme =>
  nesneMi(v) && metinMi(v.hedef) && nesneMi(v.kapilar) && typeof v.uygun === "boolean" && (v.engel === null || metinMi(v.engel))
  && nesneMi(v.akce) && sayiMi(v.akce.yolBedeli) && sayiMi(v.akce.tasinan) && nesneMi(v.envanter) && sayiMi(v.envanter.sinir)
  && nesneMi(v.misafirhane) && Array.isArray(v.tasinanlar) && Array.isArray(v.kalanlar);
const sonucMu = (v: unknown): v is GocSonucu => nesneMi(v) && nesneMi(v.goc) && metinMi(v.goc.hedef) && profilMi(v.profil);

export interface GocIstemci {
  onizle(hedef: string): Promise<EkSonuc<GocOnizleme>>;
  goc(g: { hedef: string; istekNo: string }): Promise<EkSonuc<GocSonucu>>;
  sahte?: boolean;
}

const httpGoc: GocIstemci = {
  onizle: (hedef) => ekCagir({ yontem: "GET", yol: `/v1/goc?hedef=${encodeURIComponent(hedef)}`, tekrar: true }, onizlemeMi),
  // istekNo ile tekrar güvenli: yanıt kaybolsa da aynı göç ikinci kez yapılmaz.
  goc: (g) => ekCagir({ yontem: "POST", yol: "/v1/goc", govde: g, tekrar: true }, sonucMu),
};

/** Önizleme modu: göç yalnız gerçek sunucuda yapılır; önizleme kapıları gösterir. */
function sahteGoc(para: number, kaynak: string): GocIstemci {
  return {
    sahte: true,
    onizle: async (hedef) => ekBasarili({
      kaynak, hedef, ay: 0, kapilar: Object.fromEntries(GOC_KAPILARI.map((k) => [k, true])), kapiSirasi: [...GOC_KAPILARI],
      uygun: hedef !== kaynak, engel: hedef === kaynak ? "goc_ayni_yer" : null, yas: { yas: 16, enAz: 16 },
      soguma: { sonGoc: null, acilisAyi: null, sure: 12 }, akce: { mevcut: para, yolBedeli: 3, tasinan: Math.max(0, para - 3) },
      envanter: { sinir: 30, tasinan: {}, emanet: {}, tasinanAdet: 0, emanetAdet: 0 }, misafirhane: { saat: 12, kullanildi: false },
      doluluk: { nufus: 1, evKapasite: 40 }, tasinanlar: ["akce", "envanter", "beceri", "nam", "meslek"], kalanlar: ["npcGorusleri", "tanidiklar", "hane"],
    }),
    goc: async () => ekBasarisiz("sunucu_yok"),
  };
}

export function useGocIstemci(): GocIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  return useMemo(() => (sahte ? sahteGoc(o.yerlesim?.ben.para ?? 0, o.profil?.yerlesim ?? "") : httpGoc), [sahte]); // eslint-disable-line react-hooks/exhaustive-deps
}
