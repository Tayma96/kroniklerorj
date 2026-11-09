// Faz 3a istemci durumu: gelen kutusu, oyuncu profilleri, olağan düzen ve oyuncular arası niyetler.
// Ayrı modül deposu (durum.tsx'e yalnız toplumIstemci() eklendi): ekranlar useToplum() ile aynı veriyi paylaşır.
// Hesap değişince (çıkış, geliştirici oturumu) depo boşalır. Bütün yazmalar istekNo'ludur: geçici hatada aynı niyet
// yeniden gönderilirse aynı istekNo gider (sunucu iki kez işlemez). İstemci sonuç hesaplamaz; yanıtı gösterir.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useI18n } from "../i18n";
import { useOnline } from "./durum";
import { istekNoUret } from "./depo";
import type { Dil, KisiAdi, OnlineHata, Sonuc } from "./protokol";
import type {
  BagDurumu, DostlukIslemi, DuzenGorunumu, DuzenIstegi, GelenYaniti, OyuncuProfili, SikayetNedeni, SikayetYaniti, SoylentiGorunumu,
  TeklifCevabi, TeklifGorunumu, TeklifSartGirdisi, OyuncuTeklifTuru, VitrinArmagani,
} from "./toplum-veri";

interface Hal {
  hesap: string;
  gelen: GelenYaniti | null;
  profiller: Record<string, OyuncuProfili>;
  duzen: DuzenGorunumu | null;
  /** Süren işlemin anahtarı (düğme bekleme göstergesi; ekranı kilitlemez). */
  islem: string | null;
  hata: { islem: string; kod: OnlineHata } | null;
}
let hal: Hal = { hesap: "", gelen: null, profiller: {}, duzen: null, islem: null, hata: null };
const dinleyiciler = new Set<() => void>();
const yay = (p: Partial<Hal>) => { hal = { ...hal, ...p }; for (const d of dinleyiciler) d(); };
const abone = (d: () => void) => { dinleyiciler.add(d); return () => { dinleyiciler.delete(d); }; };
const bekleyen = new Map<string, string>();
const gecici = (h: OnlineHata) => h === "ag_yok" || h === "zaman_asimi" || h === "sunucu_hatasi" || h === "gecersiz_yanit" || h === "hiz_siniri";

/** Gelen kutusunda cevap bekleyen sayısı: gelen açık teklifler + dostluk istekleri. */
export const bekleyenSayisi = (g: GelenYaniti | null) => (g ? g.gelen.length + g.dostluk.gelen.length : 0);

export function useToplum() {
  const o = useOnline();
  const { lang } = useI18n();
  const dil = lang as Dil;
  const durum = useSyncExternalStore(abone, () => hal, () => hal);
  const hesap = o.profil?.hesapId ?? "";
  useEffect(() => {
    if (hal.hesap !== hesap) { bekleyen.clear(); yay({ hesap, gelen: null, profiller: {}, duzen: null, islem: null, hata: null }); }
  }, [hesap]);
  const k = () => o.toplumIstemci();

  /** İşlemi çalıştırır: bekleme anahtarı, hata kaydı ve (yazmada) istekNo saklama. */
  const calis = useCallback(async <T,>(islem: string, is: (istekNo: string) => Promise<Sonuc<T>>, yazma = true): Promise<Sonuc<T>> => {
    const no = yazma ? bekleyen.get(islem) ?? istekNoUret() : "";
    if (yazma) bekleyen.set(islem, no);
    yay({ islem, hata: hal.hata?.islem === islem ? null : hal.hata });
    const s = await is(no);
    if (yazma && (s.ok || !gecici(s.hata))) bekleyen.delete(islem);
    yay({ islem: hal.islem === islem ? null : hal.islem, hata: s.ok ? (hal.hata?.islem === islem ? null : hal.hata) : { islem, kod: s.hata } });
    return s;
  }, []);

  const gelenYukle = useCallback(() => calis("gelen", async () => {
    const s = await k().gelen(dil);
    if (s.ok) yay({ gelen: s.deger });
    return s;
  }, false), [dil]); // eslint-disable-line react-hooks/exhaustive-deps
  const oyuncuYukle = useCallback((id: string) => calis("oyuncu:" + id, async () => {
    const s = await k().oyuncu(id, dil);
    if (s.ok) yay({ profiller: { ...hal.profiller, [id]: s.deger } });
    return s;
  }, false), [dil]); // eslint-disable-line react-hooks/exhaustive-deps
  const duzenYukle = useCallback(() => calis("duzenOku", async () => {
    const s = await k().duzenOku();
    if (s.ok) yay({ duzen: s.deger.duzen });
    return s;
  }, false), []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Yazmadan sonra: gelen kutusu, ilgili profil ve (akçe/takat değiştiyse) yerleşim sessizce tazelenir. */
  const tazele = (hedef?: string, yerlesim = false) => {
    void (async () => {
      const g = await k().gelen(dil);
      if (g.ok) yay({ gelen: g.deger });
      if (hedef) {
        const p = await k().oyuncu(hedef, dil);
        if (p.ok) yay({ profiller: { ...hal.profiller, [hedef]: p.deger } });
      }
      if (yerlesim) await o.yerlesimYukle(true);
    })();
  };

  return {
    ...durum,
    dil,
    bekleyen: bekleyenSayisi(durum.gelen),
    profil: (id: string | undefined) => (id ? durum.profiller[id] : undefined),
    hataOf: (islem: string) => (durum.hata?.islem === islem ? durum.hata.kod : null),
    bekliyor: (islem: string) => durum.islem === islem,
    gelenYukle,
    oyuncuYukle,
    duzenYukle,
    dostluk: (hedef: string, islem: DostlukIslemi) =>
      calis(`dostluk:${hedef}:${islem}`, async (istekNo): Promise<Sonuc<{ hedef: string; bag: BagDurumu }>> => {
        const s = await k().dostluk({ hedef, islem, istekNo });
        if (s.ok) tazele(hedef);
        return s;
      }),
    teklifVer: (tur: OyuncuTeklifTuru, hedef: string, sart: TeklifSartGirdisi) =>
      calis(`teklif:${hedef}:${tur}:${JSON.stringify(sart)}`, async (istekNo): Promise<Sonuc<{ teklif: TeklifGorunumu }>> => {
        const s = await k().teklif({ tur, hedef, ...sart, istekNo, dil });
        if (s.ok) tazele(hedef, true);
        return s;
      }),
    teklifCevap: (t: TeklifGorunumu, cevap: TeklifCevabi, tutar?: number) =>
      calis(`cevap:${t.id}:${cevap}:${tutar ?? ""}`, async (istekNo): Promise<Sonuc<{ teklif: TeklifGorunumu }>> => {
        const s = await k().teklifCevap({ teklif: t.id, cevap, ...(tutar !== undefined ? { tutar } : {}), istekNo, dil });
        // Kapanmış ya da bulunamayan teklifte de liste tazelenir.
        if (s.ok || s.hata === "teklif_kapandi" || s.hata === "teklif_yok") tazele(undefined, s.ok);
        return s;
      }),
    husumet: (hedef: string, islem: "ilan" | "kaldir") =>
      calis(`husumet:${hedef}:${islem}`, async (istekNo): Promise<Sonuc<{ hedef: string; husumet: boolean }>> => {
        const s = await k().husumet({ hedef, islem, istekNo });
        if (s.ok) tazele(hedef);
        return s;
      }),
    engelle: (hedef: string, islem: "engelle" | "kaldir") =>
      calis(`engelle:${hedef}:${islem}`, async (istekNo): Promise<Sonuc<{ engellenenler: KisiAdi[] }>> => {
        const s = await k().engelle({ hedef, islem, istekNo });
        if (s.ok) tazele(hedef, true);
        return s;
      }),
    duzenKaydet: (g: Omit<DuzenIstegi, "istekNo">) =>
      calis(`duzen:${JSON.stringify(g)}`, async (istekNo): Promise<Sonuc<{ duzen: DuzenGorunumu }>> => {
        const s = await k().duzen({ ...g, istekNo });
        if (s.ok) yay({ duzen: s.deger.duzen });
        return s;
      }),
    yalanla: (soylenti: string) =>
      calis(`yalanla:${soylenti}`, async (istekNo): Promise<Sonuc<{ soylentiler: SoylentiGorunumu[] }>> => {
        const s = await k().yalanla({ soylenti, istekNo, dil });
        if (s.ok) {
          if (hal.gelen) yay({ gelen: { ...hal.gelen, soylentiler: s.deger.soylentiler } });
          void o.yerlesimYukle(true);
        }
        return s;
      }),
    vitrinKaydet: (benId: string, goster: string[]) =>
      calis(`vitrin:${goster.join(",")}`, async (istekNo): Promise<Sonuc<{ vitrin: VitrinArmagani[] }>> => {
        const s = await k().vitrin({ goster, istekNo });
        if (s.ok && hal.profiller[benId]) yay({ profiller: { ...hal.profiller, [benId]: { ...hal.profiller[benId]!, vitrin: s.deger.vitrin } } });
        return s;
      }),
    sikayet: (hedef: string, neden: SikayetNedeni, aciklama?: string) =>
      calis(`sikayet:${hedef}:${neden}:${aciklama ?? ""}`, (istekNo): Promise<Sonuc<SikayetYaniti>> =>
        k().sikayet({ hedef, neden, ...(aciklama ? { aciklama } : {}), istekNo })),
  };
}
export type Toplum = ReturnType<typeof useToplum>;
