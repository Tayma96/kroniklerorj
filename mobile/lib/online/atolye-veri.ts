// Tezgâh modeli Dilim 2 (atölye) istemci biçimleri: online-server/src/mulk/{tezgah-uclar,atolye,uretim-emri,toplu-siparis}.ts
// ile birebir. Zanaat, üretim, mesai, emir, toplu teslim ve genişletme sunucuda doğrulanır ve hesaplanır; istemci yalnız
// niyeti (istekNo ile) gönderir ve sunucunun verdiği sayıları gösterir. GET .../tezgah'ın atölye bölümü tezgah-veri.ts'te.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekBasarili, ekBasarisiz, ekCagir, nesneMi, metinMi, type EkSonuc } from "./ek-istemci";
import { tezgahHataMetni, type DepoSatiri, type TopluSiparis, type GenisletmeGorunumu, type TezgahGorunumu } from "./tezgah-veri";
import { TARIFLER } from "./meslek-veri";
import type { TarifSatiri } from "./protokol";

/** GET /v1/atolyeler satırı. */
export interface AtolyeKarti {
  isletme: string; no: number; ad: string; sahip: { id: string; ad: string }; seviye: number; itibar: number;
  zanaat: string | null; kepenk: boolean; benim: boolean; devralinabilir: boolean;
}
/** GET /v1/atolyeler */
export interface AtolyeListesi {
  atolyeler: AtolyeKarti[]; topluSiparis: TopluSiparis[]; yuva: { toplam: number; dolu: number }; bedel: number; devralmaKepenkAy: number;
}
export interface ZanaatYaniti { zanaat: { meslek: string; bedel: number; degisim: number; ucretsizKalan: number } }
/** POST .../uret: tarif sonucu (kalite dahil) + atölye; depo durumu. */
export interface AtolyeUretimYaniti {
  uretim: {
    tarif: string; cikti: { mal: string; adet: number }; yan?: Record<string, number> | null; girdi: Record<string, number>;
    kalite?: { kademe: number; ad?: string; dokum?: { toplam: number; kalemler: { k: string; d: number }[] }; sonrakiEsik?: number | null } | null;
    hizmet?: number; atolye: { isletme: string; ad: string }; levha: boolean;
  };
  depo: DepoSatiri[]; depoDolu: number; depoKapasite: number;
}
export interface MesaiYaniti { mesai: { emek: number; havuz: number; tavan: number }; takat: number }
export interface EmirYaniti {
  emir: { no: number; tarif: string; kez: number; yapilan: number; acilis: number; durum: "acik" | "iptal" };
  emirler: { no: number; tarif: string; kez: number; yapilan: number }[];
}
export interface TopluYaniti { toplu: { siparis: string; mal: string; adet: number; odul: number; kasaya: number; islem: string }; depo: DepoSatiri[]; depoDolu: number }
export interface GenisletYaniti {
  genisletme: { kademe: number; malzeme: Record<string, number>; rafSatir: number; depoKapasite: number; tezgah: number };
  sonraki: GenisletmeGorunumu; depo: DepoSatiri[];
}
export type EmirKomutu = { islem: "ac"; tarif: string; kez: number } | { islem: "iptal"; emir: number };

export interface AtolyeIstemci {
  atolyeler(): Promise<EkSonuc<AtolyeListesi>>;
  zanaat(id: string, g: { meslek: string; istekNo: string }): Promise<EkSonuc<ZanaatYaniti>>;
  uret(id: string, g: { tarif: string; istekNo: string }): Promise<EkSonuc<AtolyeUretimYaniti>>;
  mesai(id: string, g: { emek: number; istekNo: string }): Promise<EkSonuc<MesaiYaniti>>;
  emir(id: string, g: EmirKomutu & { istekNo: string }): Promise<EkSonuc<EmirYaniti>>;
  toplu(id: string, g: { siparis: string; istekNo: string }): Promise<EkSonuc<TopluYaniti>>;
  genislet(id: string, g: { istekNo: string }): Promise<EkSonuc<GenisletYaniti>>;
}

const dizi = Array.isArray;
const yol = (id: string) => "/v1/isletme/" + encodeURIComponent(id);
const post = <T,>(id: string, uc: string, govde: unknown, bicim: (v: unknown) => v is T) =>
  ekCagir({ yontem: "POST", yol: `${yol(id)}/${uc}`, govde, tekrar: true }, bicim);

const httpAtolye: AtolyeIstemci = {
  atolyeler: () => ekCagir({ yontem: "GET", yol: "/v1/atolyeler", tekrar: true }, (v): v is AtolyeListesi => nesneMi(v) && dizi(v.atolyeler) && dizi(v.topluSiparis)),
  zanaat: (id, g) => post(id, "zanaat", g, (v): v is ZanaatYaniti => nesneMi(v) && nesneMi(v.zanaat) && metinMi(v.zanaat.meslek)),
  uret: (id, g) => post(id, "uret", g, (v): v is AtolyeUretimYaniti => nesneMi(v) && nesneMi(v.uretim) && nesneMi(v.uretim.cikti)),
  mesai: (id, g) => post(id, "mesai", g, (v): v is MesaiYaniti => nesneMi(v) && nesneMi(v.mesai)),
  emir: (id, g) => post(id, "emir", g, (v): v is EmirYaniti => nesneMi(v) && nesneMi(v.emir)),
  toplu: (id, g) => post(id, "toplu", g, (v): v is TopluYaniti => nesneMi(v) && nesneMi(v.toplu)),
  genislet: (id, g) => post(id, "genislet", g, (v): v is GenisletYaniti => nesneMi(v) && nesneMi(v.genisletme)),
};

/** Geliştirici önizlemesi: sahte tezgâhta atölye üretimi yok; yazmalar sakin bir "sunucu yok" döner, liste boştur. */
const sahteAtolye: AtolyeIstemci = {
  atolyeler: async () => ekBasarili({ atolyeler: [], topluSiparis: [], yuva: { toplam: 3, dolu: 0 }, bedel: 0, devralmaKepenkAy: 60 }),
  zanaat: async () => ekBasarisiz("sunucu_yok"),
  uret: async () => ekBasarisiz("sunucu_yok"),
  mesai: async () => ekBasarisiz("sunucu_yok"),
  emir: async () => ekBasarisiz("sunucu_yok"),
  toplu: async () => ekBasarisiz("sunucu_yok"),
  genislet: async () => ekBasarisiz("sunucu_yok"),
};

export function useAtolyeIstemci(): AtolyeIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  return useMemo(() => (sahte ? sahteAtolye : httpAtolye), [sahte]);
}

/**
 * Atölye bağlamında hata metni: önce "onl.atl.h.<kod>" (atölyeye özgü sıcak açıklama; ör. NPC işe alımında
 * `emanet_yetersiz`, iflasta `isletme_kapali`), yoksa tezgâh/genel karşılığı.
 */
export function atolyeHataMetni(t: (k: string) => string, s: { hata: string; ham?: string }): string {
  const kod = s.ham ?? s.hata;
  const k = "onl.atl.h." + kod;
  const v = t(k);
  if (v !== k) return v;
  return tezgahHataMetni(t, s as Parameters<typeof tezgahHataMetni>[1]);
}

/** [PARAMETRE] Tek mesaide bağlanabilecek en çok emek (sunucu MESAI_TEK_EN_COK; aşılırsa `emek_gecersiz`). */
export const MESAI_TEK_EN_COK = 18;

/** Depodaki bir malın bütün kalitelerdeki toplam adedi (sunucu `depoda` alanı gibi). */
export function depodaToplam(g: TezgahGorunumu, mal: string): number {
  return (g.depo ?? []).reduce((n, x) => (x.mal === mal ? n + x.adet : n), 0);
}

/**
 * Zanaatın tarifleri: sunucunun tarif listesi (`o.tarifler`, oyuncunun açık/kapalı tarifleriyle), yoksa yerel kopya
 * (yalnız gösterim için; hepsi kapalı sayılmaz, `acik` sunucu listesinden gelir).
 */
export function zanaatTarifleri(tarifler: TarifSatiri[] | null, zanaat: string | null): { id: string; girdi: Record<string, number>; cikti: { mal: string; adet: number }; takat: number; acik: boolean | null; arac: { mal: string } | null }[] {
  if (!zanaat) return [];
  if (tarifler?.length) return tarifler.filter((x) => x.meslek === zanaat).map((x) => ({
    id: x.id, girdi: x.girdi as Record<string, number>, cikti: x.cikti, takat: x.takat, acik: x.acik, arac: x.arac ? { mal: x.arac.mal } : null,
  }));
  return TARIFLER.filter((x) => x.meslek === zanaat).map((x) => ({
    id: x.id, girdi: x.girdi as Record<string, number>, cikti: { mal: x.cikti[0], adet: x.cikti[1] }, takat: x.takat, acik: null, arac: x.arac ? { mal: x.arac.mal } : null,
  }));
}

let atolyeSon: { hesap: string; liste: AtolyeListesi } | null = null;
export function atolyeleriHatirla(hesap: string, l: AtolyeListesi) { atolyeSon = { hesap, liste: l }; }
export const hatirlananAtolyeler = (hesap: string): AtolyeListesi | null => (atolyeSon && atolyeSon.hesap === hesap ? atolyeSon.liste : null);
