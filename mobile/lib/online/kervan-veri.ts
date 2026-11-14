// Kervan (D2): GET /v1/kervan[?hedef=&mallar=mal:adet,…], POST /v1/kervan, POST /v1/kervan/haber. Biçimler
// online-server/src/yerlesim/kervan.ts ve kervan-uclar.ts ile birebir. Kapılar, bedel, varış tahmini sunucuda; istemci gösterir.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekBasarili, ekBasarisiz, ekCagir, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";

export const KERVAN_KAPILARI = ["olu", "dugum", "yuk", "mal", "bedel", "takat", "aylik", "malHedef", "kutu"] as const;
export interface Doku { toplam: number }
export interface KervanYolda { id: string; hedef: string; mallar: Record<string, number>; kalkisAyi: number; varisAyi: number }
export interface PahaliMal { mal: string; alis: Doku; npcSatis: Doku }
export interface FiyatOzeti { yerlesim: string; ay: number; pahali: PahaliMal[] }
export interface KervanHaberi { ay: number; gecerli: number; yerlesimler: FiyatOzeti[] }
export interface KervanTahmin { hasilat: number; satilan: number; kalan: number; satirlar: { mal: string; adet: number; satilan: number; kalan: number; tutar: number }[] }
export interface KervanOnizleme {
  kaynak: string; ay: number; yolda: KervanYolda[]; haber: KervanHaberi | null;
  hedef?: string; hedefAd?: string; varisAyi?: number;
  kapilar?: Partial<Record<(typeof KERVAN_KAPILARI)[number], boolean | null>>;
  engel?: string | null; uygun?: boolean;
  bedel?: { nal: number; kosum: number; takat: number };
  yuk?: { tavan: number; topluYuk: boolean; araba: boolean; adet: number };
  aylik?: { kullanilan: number; tavan: number };
  tahmin?: KervanTahmin | null;
}
const onizlemeMi = (v: unknown): v is KervanOnizleme => nesneMi(v) && Array.isArray(v.yolda);
const kalkisMi = (v: unknown): v is { kervan: KervanYolda } => nesneMi(v) && nesneMi(v.kervan) && sayiMi(v.kervan.varisAyi);
const haberMi = (v: unknown): v is { haber: KervanHaberi } => nesneMi(v) && nesneMi(v.haber) && Array.isArray(v.haber.yerlesimler);

export interface KervanIstemci {
  onizle(hedef?: string, mallar?: Record<string, number>): Promise<EkSonuc<KervanOnizleme>>;
  yolla(g: { hedef: string; mallar: Record<string, number>; istekNo: string }): Promise<EkSonuc<{ kervan: KervanYolda }>>;
  haber(g: { istekNo: string }): Promise<EkSonuc<{ haber: KervanHaberi }>>;
  sahte?: boolean;
}

const sorgu = (hedef?: string, mallar?: Record<string, number>) => {
  if (!hedef) return "";
  const m = Object.entries(mallar ?? {}).filter(([, n]) => n > 0).map(([k, n]) => `${k}:${n}`).join(",");
  return `?hedef=${encodeURIComponent(hedef)}${m ? `&mallar=${encodeURIComponent(m)}` : ""}`;
};
const httpKervan: KervanIstemci = {
  onizle: (hedef, mallar) => ekCagir({ yontem: "GET", yol: `/v1/kervan${sorgu(hedef, mallar)}`, tekrar: true }, onizlemeMi),
  // istekNo ile tekrar güvenli: yanıt kaybolsa da aynı kervan ikinci kez yola çıkmaz.
  yolla: (g) => ekCagir({ yontem: "POST", yol: "/v1/kervan", govde: g, tekrar: true }, kalkisMi),
  haber: (g) => ekCagir({ yontem: "POST", yol: "/v1/kervan/haber", govde: g, tekrar: true }, haberMi),
};
const sahteKervan: KervanIstemci = {
  sahte: true,
  onizle: async (hedef) => ekBasarili({ kaynak: "develi", ay: 0, yolda: [], haber: null, ...(hedef ? { hedef, uygun: false, engel: "dugum_kapali", kapilar: { dugum: false } } : {}) }),
  yolla: async () => ekBasarisiz("sunucu_yok"),
  haber: async () => ekBasarisiz("sunucu_yok"),
};

export function useKervanIstemci(): KervanIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  return useMemo(() => (sahte ? sahteKervan : httpKervan), [sahte]);
}
