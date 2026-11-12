// Debdebe istemci sözleşmesi. Satın alma yalnız sunucuda makbuz doğrulaması etkinleşince açılır;
// katalog ve ücretsiz Dene önizlemesi mağaza entegrasyonundan bağımsızdır.
import { useMemo } from "react";
import { useOnline } from "./durum";
import { ekCagir, type EkSonuc } from "./ek-istemci";
import { istekNoUret } from "./depo";

export interface DebdebeUrun {
  id: string; tur: "kalici" | "armagan" | "kisaltma" | "ayan" | "sezon";
  yuva?: string; yuzey?: string[]; kademe?: string; fiyat?: { usd: number; tl: number };
  magaza?: string; satilik: boolean; teveccuh?: number; kisaltmaDk?: number; kisaltmaOran?: number;
  ayanOzel?: boolean; sezonOdulu?: boolean; bitis?: string;
}
export interface DebdebeGorunumu {
  acik: boolean; katalog: DebdebeUrun[];
  fiyatKademeleri: Record<string, { usd: number; tl: number }>;
  seviyeler: string[];
  ben: {
    sahip: string[]; kusanilan: Record<string, string[]>; stok: Record<string, number>;
    seviye: string | null; ayan: { etkin: boolean; bitis: number | null; rahatlik: { muhurYuvasi: number; takim: number } };
    levhaGorunur: boolean; rozetler: { u: string; v: string; z: number }[];
  };
  sezon: {
    sezon: number; baslangic: number; bitis: number; puan: number; seviye: number; enYuksek: number;
    seviyePuani: number; bugun: { kazanilan: number; tavan: number }; ucretli: boolean;
    oduller: { seviye: number; iz: "bedava" | "ucretli"; urun: string; acik: boolean; sahip: boolean }[];
  };
  armagan: { gunlukTavan: number; bugunKalan: number }; paraliKutu: false;
}
export interface DenePaketi {
  urun: string; tur: string; gercekOyuncuYok: true;
  sahneler: { sahne: "hanMasasi" | "sehirKapisi" | "profilKarti"; ben: { ad: string; kusanilan: Record<string, string> }; figuranlar: { id: string; figuran: true; ad: string; kadin: boolean }[]; armagan?: unknown; anons?: unknown }[];
  aciklama?: { k: string; p: Record<string, unknown> };
}
export interface DebdebeIstemci {
  oku(): Promise<EkSonuc<DebdebeGorunumu>>;
  dene(urun: string): Promise<EkSonuc<DenePaketi>>;
  kusan(g: { yuva: string; urun: string; sira?: number; istekNo: string }): Promise<EkSonuc<{ kusanilan: Record<string, string[]> }>>;
  sezon(): Promise<EkSonuc<DebdebeGorunumu["sezon"]>>;
  levhaGorunur(gorunur: boolean): Promise<EkSonuc<{ levhaGorunur: boolean }>>;
}
const nesneMi = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const katalogMi = (v: unknown): v is DebdebeUrun => nesneMi(v) && typeof v.id === "string" && typeof v.tur === "string" && typeof v.satilik === "boolean";
const gorunumMi = (v: unknown): v is DebdebeGorunumu => {
  if (!nesneMi(v) || typeof v.acik !== "boolean" || !Array.isArray(v.katalog) || !v.katalog.every(katalogMi)
    || !nesneMi(v.fiyatKademeleri) || !Array.isArray(v.seviyeler) || !v.seviyeler.every((x) => typeof x === "string")
    || !nesneMi(v.ben) || !Array.isArray(v.ben.sahip) || !v.ben.sahip.every((x) => typeof x === "string")
    || !nesneMi(v.ben.kusanilan) || !Object.values(v.ben.kusanilan).every((x) => Array.isArray(x) && x.every((y) => typeof y === "string"))
    || !nesneMi(v.ben.stok) || !Object.values(v.ben.stok).every((x) => typeof x === "number")
    || !nesneMi(v.ben.ayan) || typeof v.ben.ayan.etkin !== "boolean" || !(v.ben.ayan.bitis === null || typeof v.ben.ayan.bitis === "number")
    || typeof v.ben.levhaGorunur !== "boolean" || !(v.ben.seviye === null || typeof v.ben.seviye === "string")
    || !nesneMi(v.sezon) || typeof v.sezon.seviye !== "number" || typeof v.sezon.enYuksek !== "number" || typeof v.sezon.puan !== "number"
    || !nesneMi(v.sezon.bugun) || typeof v.sezon.bugun.kazanilan !== "number" || typeof v.sezon.bugun.tavan !== "number"
    || !Array.isArray(v.sezon.oduller) || !v.sezon.oduller.every((x) => nesneMi(x) && typeof x.seviye === "number" && typeof x.iz === "string" && typeof x.urun === "string" && typeof x.acik === "boolean" && typeof x.sahip === "boolean")
    || !nesneMi(v.armagan) || typeof v.armagan.gunlukTavan !== "number" || typeof v.armagan.bugunKalan !== "number" || v.paraliKutu !== false) return false;
  return true;
};
const deneMi = (v: unknown): v is DenePaketi => nesneMi(v) && typeof v.urun === "string" && v.gercekOyuncuYok === true
  && Array.isArray(v.sahneler) && v.sahneler.every((x) => nesneMi(x) && typeof x.sahne === "string"
    && nesneMi(x.ben) && typeof x.ben.ad === "string" && nesneMi(x.ben.kusanilan)
    && Array.isArray(x.figuranlar) && x.figuranlar.every((f) => nesneMi(f) && typeof f.id === "string" && typeof f.ad === "string" && f.figuran === true && typeof f.kadin === "boolean"));
const sezonMi = (v: unknown): v is DebdebeGorunumu["sezon"] => nesneMi(v) && typeof v.seviye === "number" && Array.isArray(v.oduller);
const post = <T,>(yol: string, govde: unknown, bicim: (v: unknown) => v is T) => ekCagir({ yontem: "POST", yol, govde, tekrar: true }, bicim);
const httpDebdebe: DebdebeIstemci = {
  oku: () => ekCagir({ yontem: "GET", yol: "/v1/debdebe", tekrar: true }, gorunumMi),
  dene: (urun) => ekCagir({ yontem: "GET", yol: "/v1/debdebe/dene?urun=" + encodeURIComponent(urun), tekrar: true }, deneMi),
  kusan: (g) => post("/v1/debdebe/kusan", g, (v): v is { kusanilan: Record<string, string[]> } => nesneMi(v) && nesneMi(v.kusanilan)),
  sezon: () => ekCagir({ yontem: "GET", yol: "/v1/debdebe/sezon", tekrar: true }, sezonMi),
  levhaGorunur: (gorunur) => post("/v1/debdebe/levha-gorunur", { gorunur, istekNo: istekNoUret() }, (v): v is { levhaGorunur: boolean } => nesneMi(v) && typeof v.levhaGorunur === "boolean"),
};
export function useDebdebeIstemci(): DebdebeIstemci {
  const o = useOnline();
  // Debdebe hesap verisi sunucuda tutulur; geliştirici sahte oturumunda da HTTP istemci kullanılmaz.
  return useMemo(() => httpDebdebe, [o.oturum?.tur]);
}
