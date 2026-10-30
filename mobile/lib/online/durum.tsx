// Çevrimiçi istemci durumu (React bağlamı): oturum, profil, dünya, profil taslağı, davet, yükleniyor/hata.
// Sağlayıcı app/online/_layout.tsx'te durur; bütün /online ekranları aynı durumu paylaşır.
// Tek oyunculu motor, kayıt ya da eski MP katmanı içe aktarılmaz.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ONLINE_SUNUCU_URL, sunucuAdresi } from "./ayar";
import { adDuzenle } from "./ad";
import { istekNoUret, oturumOku, oturumSil, oturumYaz, taslakOku, taslakSil, taslakYaz, type Taslak } from "./depo";
import { oturumHatasiMi } from "./hata";
import { httpIstemci, type OnlineIstemci } from "./istemci";
import { onlineEkranAcik } from "./kapi";
import { onizlemeTohumu, type Tohum } from "./onizleme";
import { sahteIstemci } from "./sahte";
import {
  basarisiz,
  type DavetBilgisi, type DunyaOzeti, type GirisYaniti, type OnlineHata, type Profil, type Sonuc,
} from "./protokol";

export type OturumTuru = "sunucu" | "gelistirici";
export interface OnlineOturum {
  tur: OturumTuru;
  /** Google hesabındaki addan öneri (yalnız profil yokken). */
  adOnerisi?: string;
}
export type Islem = "geriYukle" | "giris" | "dunya" | "profil" | "davet";

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

  const belirtec = useRef<string | null>(null);
  const mesgul = useRef(false);
  const http = useMemo(() => httpIstemci({ adres: sunucu, oturum: () => belirtec.current }), [sunucu]);
  const sahte = useRef<OnlineIstemci | null>(tohum?.gelistirici ? sahteIstemci() : null);
  const istemci = (): OnlineIstemci => (oturum?.tur === "gelistirici" && sahte.current ? sahte.current : http);

  const oturumuDusur = useCallback(async () => {
    belirtec.current = null;
    setOturum(null);
    setProfil(null);
    await oturumSil();
  }, []);

  /** Bir işlemi tek seferlik çalıştırır; oturum hatasında oturumu düşürür. */
  const calistir = async <T,>(ad: Islem, is: () => Promise<Sonuc<T>>): Promise<Sonuc<T>> => {
    if (mesgul.current) return basarisiz<T>("hiz_siniri");
    mesgul.current = true;
    setIslem(ad);
    setHata(null);
    try {
      const sonuc = await is();
      if (!sonuc.ok) {
        setHata(sonuc.hata);
        if (oturumHatasiMi(sonuc.hata) && oturum?.tur === "sunucu") await oturumuDusur();
      }
      return sonuc;
    } finally {
      mesgul.current = false;
      setIslem(null);
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
      }),
    gelistiriciGiris: () => {
      if (!onlineEkranAcik()) return;
      sahte.current = sahteIstemci();
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
      }),
    hataTemizle: () => setHata(null),
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
  if (var_) return <>{children}</>;
  return <OnlineDurumSaglayici tohum={onizlemeTohumu()}>{children}</OnlineDurumSaglayici>;
}
