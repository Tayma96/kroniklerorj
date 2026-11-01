// Çevrimiçi istemci durumu (React bağlamı): oturum, profil, dünya, profil taslağı, davet, yükleniyor/hata;
// Faz 2: yerleşim durumu, kişi önbelleği, olay defteri (kalıcı imleçli), eylem (istekNo ile güvenli tekrar), tanıdık.
// Sağlayıcı app/online/_layout.tsx'te durur; bütün /online ekranları aynı durumu paylaşır.
// Tek oyunculu motor, kayıt ya da eski MP katmanı içe aktarılmaz.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ONLINE_SUNUCU_URL, sunucuAdresi } from "./ayar";
import { adDuzenle } from "./ad";
import { imlecOku, imlecYaz, istekNoUret, oturumOku, oturumSil, oturumYaz, taslakOku, taslakSil, taslakYaz, type Taslak } from "./depo";
import { useI18n } from "../i18n";
import { oturumHatasiMi } from "./hata";
import { httpIstemci, type OnlineIstemci } from "./istemci";
import { onlineEkranAcik } from "./kapi";
import { onizlemeTohumu, type Tohum } from "./onizleme";
import { sahteIstemci } from "./sahte";
import {
  basarisiz,
  type DavetBilgisi, type Dil, type DunyaOzeti, type EylemTuru, type EylemYaniti, type GirisYaniti, type Isaret, type Kisi, type Olay,
  type OlaylarYaniti, type OnlineHata, type Profil, type Sonuc, type TanidikYaniti, type YerlesimDurumu,
} from "./protokol";

export type OturumTuru = "sunucu" | "gelistirici";
export interface OnlineOturum {
  tur: OturumTuru;
  /** Google hesabındaki addan öneri (yalnız profil yokken). */
  adOnerisi?: string;
}
export type Islem = "geriYukle" | "giris" | "dunya" | "profil" | "davet" | "yerlesim" | "olaylar" | "kisi" | "eylem" | "tanidik";
/** POST /v1/eylem gövdesi (istekNo ve dil durum katmanında eklenir). */
export interface EylemGirdisi { tur: EylemTuru; hedef?: string; secim?: string; ozellik?: string }
/** Defterde bellekte tutulan en çok olay; ilk açılışta son kaç olaydan başlanır; bir yüklemede en çok kaç sayfa. */
const DEFTER_EN_COK = 60;
const DEFTER_PENCERE = 40;
const DEFTER_SAYFA = 3;
/** Ağ ya da sunucu kaynaklı (geçici) hata: aynı istekNo ile yeniden denemek güvenlidir. */
const geciciHata = (h: OnlineHata) => h === "ag_yok" || h === "zaman_asimi" || h === "sunucu_hatasi" || h === "gecersiz_yanit" || h === "hiz_siniri";

export interface OnlineDurum {
  /** İlk geri yükleme (kayıtlı oturum + profil) bitti mi. */
  hazir: boolean;
  /** Sunucu adresi ayarlı mı (ONLINE_SUNUCU_URL). */
  sunucuVar: boolean;
  /** Geliştirici oturumu sunulabilir mi (ONLINE_GELISTIRME ya da önizleme). */
  gelistiriciAcik: boolean;
  oturum: OnlineOturum | null;
  profil: Profil | null;
  dunya: DunyaOzeti | null;
  /** Dünya özetinin alındığı yerel an (saat farkı için). */
  dunyaAlindi: number;
  taslak: Taslak;
  davet: DavetBilgisi | null;
  /** Önizlemede davet kutusuna yazılı gelen kod. */
  davetOnKodu?: string;
  islem: Islem | null;
  yukleniyor: boolean;
  hata: OnlineHata | null;
  /** Son hatanın geldiği işlem. */
  hataIslem: Islem | null;
  // Faz 2
  yerlesim: YerlesimDurumu | null;
  /** Yerleşim durumunun alındığı yerel an (dönüm sayacı için). */
  yerlesimAlindi: number;
  /** GET /v1/kisi önbelleği (portre için yaş/cinsiyet de buradan okunur). */
  kisiler: Record<string, Kisi>;
  /** Olay defteri (yeniden eskiye değil, sıraya göre; ekran ters çevirir). */
  defter: Olay[];
  defterDahaVar: boolean;
  /** Bu açılışta, son okunan imleçten sonra gelen olay sayısı. */
  defterYeni: number;
  /** Son okunan sıra (bu açılıştan önce); "yeni" işareti için. */
  defterOkunan: number;

  geriYukle(): Promise<void>;
  /** Faz 1d: Google kimlik belirteciyle giriş. */
  googleGiris(idToken: string): Promise<Sonuc<GirisYaniti>>;
  gelistiriciGiris(): void;
  cikis(): Promise<void>;
  taslakGuncelle(p: Partial<Pick<Taslak, "ad" | "cinsiyet" | "yerlesim">>): void;
  dunyaYukle(): Promise<Sonuc<DunyaOzeti>>;
  davetCoz(kod: string): Promise<Sonuc<DavetBilgisi>>;
  davetBirak(): void;
  profilOlustur(secim: { yerlesim: string } | { davet: string }): Promise<Sonuc<Profil>>;
  hataTemizle(): void;
  yerlesimYukle(sessiz?: boolean): Promise<Sonuc<YerlesimDurumu>>;
  olaylarYukle(devam?: boolean): Promise<Sonuc<OlaylarYaniti>>;
  kisiYukle(id: string): Promise<Sonuc<Kisi>>;
  /** Aynı eylem ağ hatasından sonra yeniden denenirse aynı istekNo gider (sunucu iki kez işlemez). */
  eylemYap(girdi: EylemGirdisi): Promise<Sonuc<EylemYaniti>>;
  tanidikIsaretle(hedef: string, isaret: Isaret | null): Promise<Sonuc<TanidikYaniti>>;
}

const Baglam = createContext<OnlineDurum | null>(null);
const bosTaslak = (): Taslak => ({ ad: "", cinsiyet: null, istekNo: istekNoUret() });

export function OnlineDurumSaglayici({ children, tohum }: { children: ReactNode; tohum?: Tohum | null }) {
  const sunucu = sunucuAdresi(ONLINE_SUNUCU_URL);
  const [hazir, setHazir] = useState(!!tohum);
  const [oturum, setOturum] = useState<OnlineOturum | null>(tohum?.gelistirici ? { tur: "gelistirici" } : null);
  const [profil, setProfil] = useState<Profil | null>(tohum?.profil ?? null);
  const [dunya, setDunya] = useState<DunyaOzeti | null>(tohum?.dunya ?? null);
  const [dunyaAlindi, setDunyaAlindi] = useState(() => Date.now());
  const [taslak, setTaslak] = useState<Taslak>(() => tohum?.taslak ?? bosTaslak());
  const [davet, setDavet] = useState<DavetBilgisi | null>(null);
  const [islem, setIslem] = useState<Islem | null>(null);
  const [hata, setHata] = useState<OnlineHata | null>(null);
  const [hataIslem, setHataIslem] = useState<Islem | null>(null);
  const [yerlesim, setYerlesim] = useState<YerlesimDurumu | null>(null);
  const [yerlesimAlindi, setYerlesimAlindi] = useState(() => Date.now());
  const [kisiler, setKisiler] = useState<Record<string, Kisi>>({});
  const [defter, setDefter] = useState<Olay[]>([]);
  const [defterDahaVar, setDefterDahaVar] = useState(false);
  const [defterYeni, setDefterYeni] = useState(0);
  const [defterOkunan, setDefterOkunan] = useState(-1);
  const defterImlec = useRef<number | null>(null);
  const okunanImlec = useRef<number | null>(null);
  const bekleyenEylem = useRef(new Map<string, string>());
  const { lang } = useI18n();
  const dil = lang as Dil;

  const belirtec = useRef<string | null>(null);
  const mesgul = useRef(false);
  const http = useMemo(() => httpIstemci({ adres: sunucu, oturum: () => belirtec.current }), [sunucu]);
  const sahte = useRef<OnlineIstemci | null>(tohum?.gelistirici ? sahteIstemci(tohum.gecikme ?? 450, tohum.profil ?? null) : null);
  const istemci = (): OnlineIstemci => (oturum?.tur === "gelistirici" && sahte.current ? sahte.current : http);

  const yerlesimiBirak = () => {
    setYerlesim(null);
    setKisiler({});
    setDefter([]);
    setDefterDahaVar(false);
    setDefterYeni(0);
    defterImlec.current = null;
    okunanImlec.current = null;
    bekleyenEylem.current.clear();
  };
  const oturumuDusur = useCallback(async () => {
    belirtec.current = null;
    setOturum(null);
    setProfil(null);
    yerlesimiBirak();
    await oturumSil();
  }, []);

  /**
   * Bir işlemi çalıştırır, hata durumunu tutar; oturum hatasında oturumu düşürür. `kilit` yalnız yazan işlemlerde
   * (giriş, profil) çift dokunuşu engeller.
   */
  const calistir = async <T,>(ad: Islem, is: () => Promise<Sonuc<T>>, kilit = false): Promise<Sonuc<T>> => {
    if (kilit) {
      if (mesgul.current) return basarisiz<T>("hiz_siniri");
      mesgul.current = true;
    }
    setIslem(ad);
    setHata(null);
    setHataIslem(null);
    try {
      const sonuc = await is();
      if (!sonuc.ok) {
        setHata(sonuc.hata);
        setHataIslem(ad);
        if (oturumHatasiMi(sonuc.hata) && oturum?.tur === "sunucu") await oturumuDusur();
      }
      return sonuc;
    } finally {
      if (kilit) mesgul.current = false;
      setIslem((i) => (i === ad ? null : i));
    }
  };

  const geriYukle = useCallback(async () => {
    if (tohum) return;
    setIslem("geriYukle");
    setHata(null);
    try {
      const [kayitliTaslak, kayitliOturum] = await Promise.all([taslakOku(), oturumOku()]);
      if (kayitliTaslak) setTaslak(kayitliTaslak);
      if (!kayitliOturum) return;
      belirtec.current = kayitliOturum;
      setOturum({ tur: "sunucu" });
      const p = await http.profil();
      if (p.ok) setProfil(p.deger);
      else if (oturumHatasiMi(p.hata)) await oturumuDusur();
      else if (p.hata !== "profil_yok") setHata(p.hata);
    } finally {
      setIslem(null);
      setHazir(true);
    }
  }, [http, oturumuDusur, tohum]);

  useEffect(() => { void geriYukle(); }, [geriYukle]);

  // Taslak her değişimde (kısa gecikmeyle) saklanır: uygulama kapansa da aynı istekNo ile sürer.
  useEffect(() => {
    if (!hazir || tohum) return;
    const id = setTimeout(() => { void taslakYaz(taslak); }, 300);
    return () => clearTimeout(id);
  }, [taslak, hazir, tohum]);

  // --- Faz 2: yaşayan yerleşim
  const yerlesimAl = async (): Promise<Sonuc<YerlesimDurumu>> => {
    const y = await istemci().yerlesim(dil);
    if (y.ok) { setYerlesim(y.deger); setYerlesimAlindi(Date.now()); }
    return y;
  };
  const kisiAl = async (id: string): Promise<Sonuc<Kisi>> => {
    const k = await istemci().kisi(id, dil);
    if (k.ok) setKisiler((m) => ({ ...m, [id]: k.deger }));
    return k;
  };
  /** Eylem ya da işaretten sonra sessiz tazeleme: görüş, şans, takat ve öğrenme sunucudan yeniden gelir. */
  const tazele = async (kisi?: string) => {
    await Promise.all([yerlesimAl(), kisi ? kisiAl(kisi) : Promise.resolve(null)]);
  };
  /** Olay defterini kalıcı imleçten ileri doğru (sayfa sayfa) çeker; okunanı imlece yazar. */
  const defterCek = async (devam: boolean): Promise<Sonuc<OlaylarYaniti>> => {
    const hesap = profil?.hesapId ?? "";
    const kalici = !tohum && oturum?.tur === "sunucu" && !!hesap;
    const son = yerlesim?.imlec ?? 0;
    if (okunanImlec.current === null) okunanImlec.current = kalici ? (await imlecOku(hesap)) ?? -1 : -1;
    // Sunucudaki son sıradan ilerideki imleç geçersizdir (yerleşim sıfırlandıysa); baştan okunur.
    if (okunanImlec.current > son && yerlesim) okunanImlec.current = -1;
    const okunan = okunanImlec.current;
    let bas = devam && defterImlec.current !== null ? defterImlec.current
      : okunan >= 0 ? Math.max(okunan - DEFTER_PENCERE, son - DEFTER_EN_COK * DEFTER_SAYFA, 0) : Math.max(0, son - DEFTER_PENCERE);
    let gelen: Olay[] = [];
    let sonuc: Sonuc<OlaylarYaniti> = basarisiz("gecersiz_yanit");
    for (let i = 0; i < DEFTER_SAYFA; i++) {
      sonuc = await istemci().olaylar(bas, dil);
      if (!sonuc.ok) break;
      gelen = gelen.concat(sonuc.deger.olaylar);
      bas = sonuc.deger.imlec;
      if (!sonuc.deger.dahaVar) break;
    }
    if (!sonuc.ok && !gelen.length) return sonuc;
    defterImlec.current = bas;
    setDefter((eski) => {
      const harita = new Map((devam ? eski : []).map((o) => [o.sira, o]));
      for (const o of gelen) harita.set(o.sira, o);
      return [...harita.values()].sort((a, b) => a.sira - b.sira).slice(-DEFTER_EN_COK);
    });
    setDefterOkunan(okunan);
    if (!devam) setDefterYeni(okunan >= 0 ? gelen.filter((o) => o.sira > okunan).length : 0);
    setDefterDahaVar(sonuc.ok ? sonuc.deger.dahaVar : true);
    if (kalici) await imlecYaz(hesap, bas);
    return sonuc.ok ? sonuc : basarisiz(sonuc.hata);
  };

  // Dil değişince NPC adları o dilde yeniden gelir.
  const ilkDil = useRef(dil);
  useEffect(() => {
    if (ilkDil.current === dil) return;
    ilkDil.current = dil;
    setKisiler({});
    setDefter([]);
    defterImlec.current = null;
    if (yerlesim) void yerlesimAl();
  }, [dil]); // eslint-disable-line react-hooks/exhaustive-deps

  const deger: OnlineDurum = {
    hazir,
    sunucuVar: !!sunucu,
    gelistiriciAcik: onlineEkranAcik(),
    oturum,
    profil,
    dunya,
    dunyaAlindi,
    taslak,
    davet,
    davetOnKodu: tohum?.davetKodu,
    islem,
    yukleniyor: islem !== null,
    hata,

    geriYukle,
    googleGiris: (idToken) =>
      calistir("giris", async () => {
        const g = await http.giris(idToken);
        if (!g.ok) return g;
        belirtec.current = g.deger.oturum;
        await oturumYaz(g.deger.oturum);
        setOturum({ tur: "sunucu", ...(g.deger.adOnerisi ? { adOnerisi: g.deger.adOnerisi } : {}) });
        if (g.deger.profilVar) {
          const p = await http.profil();
          if (p.ok) setProfil(p.deger);
        }
        return g;
      }, true),
    gelistiriciGiris: () => {
      if (!onlineEkranAcik()) return;
      sahte.current = sahteIstemci();
      yerlesimiBirak();
      setProfil(null);
      setDavet(null);
      setHata(null);
      setOturum({ tur: "gelistirici" });
    },
    cikis: async () => {
      sahte.current = null;
      setDavet(null);
      setHata(null);
      await oturumuDusur();
    },
    taslakGuncelle: (p) => setTaslak((t) => ({ ...t, ...p })),
    dunyaYukle: () =>
      calistir("dunya", async () => {
        const d = await istemci().dunya();
        if (d.ok) { setDunya(d.deger); setDunyaAlindi(Date.now()); }
        return d;
      }),
    davetCoz: (kod) =>
      calistir("davet", async () => {
        const d = await istemci().davetCoz(kod);
        setDavet(d.ok ? d.deger : null);
        return d;
      }),
    davetBirak: () => { setDavet(null); setHata(null); },
    profilOlustur: (secim) =>
      calistir("profil", async () => {
        if (!taslak.cinsiyet) return basarisiz<Profil>("cinsiyet_gecersiz");
        const k = istemci();
        let s = await k.profilOlustur({
          ad: adDuzenle(taslak.ad),
          cinsiyet: taslak.cinsiyet,
          istekNo: taslak.istekNo,
          ...("davet" in secim ? { davet: secim.davet } : { yerlesim: secim.yerlesim }),
        });
        // Önceki deneme sunucuda tamamlanmış ama yanıtı yolda kalmışsa profil zaten vardır.
        if (!s.ok && s.hata === "profil_var") s = await k.profil();
        if (s.ok) {
          setProfil(s.deger);
          setDavet(null);
          setTaslak(bosTaslak());
          if (!tohum) await taslakSil();
        }
        return s;
      }, true),
    hataTemizle: () => { setHata(null); setHataIslem(null); },
    yerlesim,
    yerlesimAlindi,
    kisiler,
    defter,
    defterDahaVar,
    defterYeni,
    defterOkunan,
    hataIslem,
    yerlesimYukle: (sessiz = false) => (sessiz ? yerlesimAl() : calistir("yerlesim", yerlesimAl)),
    olaylarYukle: (devam = false) => calistir("olaylar", () => defterCek(devam)),
    kisiYukle: (id) => calistir("kisi", () => kisiAl(id)),
    eylemYap: (g) =>
      calistir("eylem", async () => {
        const anahtar = [g.tur, g.hedef ?? "", g.secim ?? "", g.ozellik ?? ""].join("|");
        const istekNo = bekleyenEylem.current.get(anahtar) ?? istekNoUret();
        bekleyenEylem.current.set(anahtar, istekNo);
        const s = await istemci().eylem({ ...g, istekNo, dil });
        if (s.ok || !geciciHata(s.hata)) bekleyenEylem.current.delete(anahtar);
        if (s.ok) {
          const kalan = s.deger.takat.kalan;
          setYerlesim((d) => (d ? { ...d, ben: { ...d.ben, takat: { ...d.ben.takat, kalan } } } : d));
          void tazele(g.hedef);
        }
        return s;
      }, true),
    tanidikIsaretle: (hedef, isaret) =>
      calistir("tanidik", async () => {
        const s = await istemci().tanidik({ hedef, isaret, dil });
        if (s.ok) {
          const liste = s.deger.tanidiklar;
          setYerlesim((d) => (d ? { ...d, ben: { ...d.ben, tanidiklar: liste }, oneriler: d.oneriler.filter((x) => x.id !== hedef) } : d));
          setKisiler((m) => (m[hedef] ? { ...m, [hedef]: { ...m[hedef], tanidik: isaret } as Kisi } : m));
          if (s.deger.ogrenme.length) void yerlesimAl();
        }
        return s;
      }, true),
  };

  return <Baglam.Provider value={deger}>{children}</Baglam.Provider>;
}

export function useOnline(): OnlineDurum {
  const d = useContext(Baglam);
  if (!d) throw new Error("useOnline: OnlineDurumSaglayici yok");
  return d;
}

/**
 * Ekran sarmalayıcısı: uygulamada sağlayıcı _layout'tadır; ekran tek başına çizilirse (tasarım önizlemesi)
 * kendi sağlayıcısını önizleme tohumuyla kurar.
 */
export function OnlineKapisi({ children }: { children: ReactNode }) {
  const var_ = useContext(Baglam);
  const [tohum] = useState(onizlemeTohumu);
  if (var_) return <>{children}</>;
  return <OnlineDurumSaglayici tohum={tohum}>{children}</OnlineDurumSaglayici>;
}
