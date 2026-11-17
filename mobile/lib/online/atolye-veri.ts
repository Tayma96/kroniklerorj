// Tezgâh modeli Dilim 2 (atölye) istemci biçimleri: online-server/src/mulk/{tezgah-uclar,atolye,uretim-emri,toplu-siparis}.ts
// ile birebir. Zanaat, üretim, mesai, emir, toplu teslim ve genişletme sunucuda doğrulanır ve hesaplanır; istemci yalnız
// niyeti (istekNo ile) gönderir ve sunucunun verdiği sayıları gösterir. GET .../tezgah'ın atölye bölümü tezgah-veri.ts'te.
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { useOnline } from "./durum";
import { ekCagir, nesneMi, metinMi, type EkSonuc } from "./ek-istemci";
import { sahteAtolyeIstemci } from "./sahte-atolye";
import { tezgahHataMetni, type DepoSatiri, type TopluSiparis, type GenisletmeGorunumu, type TezgahGorunumu } from "./tezgah-veri";
import { TARIFLER } from "./meslek-veri";
import type { Olay, TarifSatiri } from "./protokol";
import type { EfsaneviSonucu, KaliteKisiti, OzellikDokumu } from "./esya-veri";

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
    kalite?: { kademe: number; ad?: string; dokum?: { toplam: number; kalemler: { k: string; d: number }[] }; sonrakiEsik?: number | null; tavan?: number; kisit?: KaliteKisiti | null } | null;
    /** Dilim 4: efsanevi denemesi (istenmediyse null) ve çıkan en yüksek kademenin özellik dökümü. */
    efsanevi?: EfsaneviSonucu | null; ozellik?: OzellikDokumu;
    hizmet?: number; atolye: { isletme: string; ad: string }; levha: boolean;
  };
  depo: DepoSatiri[]; depoDolu: number; depoKapasite: number;
}
export interface MesaiYaniti { mesai: { emek: number; havuz: number; tavan: number }; takat: number }
export interface EmirYaniti {
  emir: { no: number; tarif: string; kez: number; yapilan: number; acilis: number; durum: "acik" | "iptal" };
  emirler: { no: number; tarif: string; kez: number; yapilan: number }[];
}
/** `adet` teslim edilen (indirimliyse az), `siparisAdet` siparişin adedi, `indirimYuzde` uygulanan indirim (Dilim 3; eski sunucuda yok). */
export interface TopluYaniti { toplu: { siparis: string; mal: string; adet: number; siparisAdet?: number; indirimYuzde?: number; odul: number; kasaya: number; islem: string }; depo: DepoSatiri[]; depoDolu: number }
export interface GenisletYaniti {
  genisletme: { kademe: number; malzeme: Record<string, number>; rafSatir: number; depoKapasite: number; tezgah: number };
  sonraki: GenisletmeGorunumu; depo: DepoSatiri[];
}
export type EmirKomutu = { islem: "ac"; tarif: string; kez: number } | { islem: "iptal"; emir: number };

export interface AtolyeIstemci {
  atolyeler(): Promise<EkSonuc<AtolyeListesi>>;
  zanaat(id: string, g: { meslek: string; istekNo: string }): Promise<EkSonuc<ZanaatYaniti>>;
  uret(id: string, g: { tarif: string; efsanevi?: true; istekNo: string }): Promise<EkSonuc<AtolyeUretimYaniti>>;
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

/** Geliştirici önizlemesinde sahte atölye (sahte-atolye.ts; sahte tezgâhla aynı durum), yoksa sunucu. */
export function useAtolyeIstemci(): AtolyeIstemci {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const yer = o.yerlesim?.yerlesim.id ?? "develi";
  return useMemo(() => (sahte ? sahteAtolyeIstemci(yer) : httpAtolye), [sahte, yer]);
}

/**
 * Atölye bağlamında hata metni: önce "onl.atl.h.<kod>" (atölyeye özgü sıcak açıklama; ör. NPC işe alımında
 * `emanet_yetersiz`, iflasta `isletme_kapali`), yoksa tezgâh/genel karşılığı.
 */
export function atolyeHataMetni(t: (k: string) => string, s: { hata: string; ham?: string }): string {
  const kod = s.ham ?? s.hata;
  const es = "onl.es.h." + kod;
  const ev = t(es);
  if (ev !== es) return ev;
  const k = "onl.atl.h." + kod;
  const v = t(k);
  if (v !== k) return v;
  return tezgahHataMetni(t, s as Parameters<typeof tezgahHataMetni>[1]);
}

/** [PARAMETRE] Tek mesaide bağlanabilecek en çok emek; yalnız yedek: sunucu `atolye.emek.tekEnCok` verirse o esas alınır. */
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

/** Tezgâh Dilim 2 olayları: gelince açık atölye/işletme ekranı ya da çarşının atölye listesi yeniden yüklenir. */
const TEZGAH_OLAYLARI: ReadonlySet<string> = new Set(["olay.tezgah.uretim", "olay.tezgah.topluSiparis", "olay.tezgah.topluTeslim"]);
/** [PARAMETRE] Açık atölye ekranında defter yoklama aralığı (ms): seyrek ve hafif; yalnız ekran odakta ve uygulama öndeyken. */
export const TEZGAH_YOKLAMA_MS = 45_000;

/**
 * Ekran odaktayken ve uygulama öndeyken defteri seyrek, sessizce yoklar (yalnız yeni olaylar gelir). Arka planda,
 * başka ekrandayken ya da `etkin` kapalıyken hiç istek gitmez; uygulama öne dönünce bir kez hemen yoklar.
 */
export function useDefterYoklama(etkin: boolean) {
  const o = useOnline();
  const yoklaRef = useRef(o.olaylarYokla);
  yoklaRef.current = o.olaylarYokla;
  useFocusEffect(useCallback(() => {
    if (!etkin) return;
    let zaman: ReturnType<typeof setInterval> | null = null;
    const baslat = () => { if (!zaman) zaman = setInterval(() => { void yoklaRef.current(); }, TEZGAH_YOKLAMA_MS); };
    const durdur = () => { if (zaman) { clearInterval(zaman); zaman = null; } };
    if (AppState.currentState === "active") baslat();
    const abone = AppState.addEventListener("change", (d) => {
      if (d === "active") { void yoklaRef.current(); baslat(); } else durdur();
    });
    return () => { durdur(); abone.remove(); };
  }, [etkin]));
}

/**
 * Olay defterine (o.defter) ekran açıkken yeni bir tezgâh olayı düşerse `onOlay` bir kez çağrılır. Açılıştaki olaylar
 * yeni sayılmaz (sıra `sira` ile izlenir); `etkin` kapalıyken gelenler sessizce geçilir. `yokla` açıkken ekran odakta
 * kaldıkça defter seyrek yoklanır (useDefterYoklama), böylece yeni üretim/toplu sipariş kendiliğinden görünür.
 */
export function useTezgahOlayi(etkin: boolean, suz: (o: Olay) => boolean, onOlay: () => void, yokla = etkin) {
  const o = useOnline();
  useDefterYoklama(etkin && yokla);
  const son = useRef<number | null>(null);
  const suzRef = useRef(suz);
  suzRef.current = suz;
  const cbRef = useRef(onOlay);
  cbRef.current = onOlay;
  useEffect(() => {
    const enBuyuk = o.defter.reduce((m, x) => Math.max(m, x.sira), -1);
    const once = son.current;
    son.current = once === null ? enBuyuk : Math.max(once, enBuyuk);
    if (once === null || !etkin) return;
    if (o.defter.some((x) => x.sira > once && TEZGAH_OLAYLARI.has(x.ozet.k) && suzRef.current(x))) cbRef.current();
  }, [o.defter, etkin]);
}
