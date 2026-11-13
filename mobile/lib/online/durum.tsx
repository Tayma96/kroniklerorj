// Çevrimiçi istemci durumu (React bağlamı): oturum, profil, dünya, profil taslağı, davet, yükleniyor/hata;
// Faz 2: yerleşim durumu, kişi önbelleği, olay defteri (kalıcı imleçli), eylem (istekNo ile güvenli tekrar), tanıdık.
// Meslek çekirdeği: meslek kaydı, envanter, lonca tablosu; meslek/temel iş/taban alımı istekNo'lu niyet olarak gider.
// Dikey dilim: meslek, beceri, envanter, Hal ve tarifler GET /v1/yerlesim `ben`den okunur (eski sunucuda yerel kopya);
// tarif, NPC'ye satış ve sipariş teslimi istekNo'lu niyettir; sonuçlar (Hal dahil) sunucudan gelir.
// Sağlayıcı app/online/_layout.tsx'te durur; bütün /online ekranları aynı durumu paylaşır.
// Tek oyunculu motor, kayıt ya da eski MP katmanı içe aktarılmaz.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ONLINE_SUNUCU_URL, ONLINE_TEST_GIRIS, sunucuAdresi } from "./ayar";
import { adDuzenle } from "./ad";
import { imlecOku, imlecYaz, istekNoUret, meslekOku, meslekYaz, oturumOku, oturumSil, oturumYaz, taslakOku, taslakSil, taslakYaz, testCihazKimligi, type Taslak } from "./depo";
import { useI18n } from "../i18n";
import { oturumHatasiMi } from "./hata";
import { httpIstemci, type OnlineIstemci } from "./istemci";
import type { BeceriIstemci } from "./beceri-agaci/beceri-veri";
import type { ToplumIstemci } from "./toplum-istemci";
import { onlineEkranAcik } from "./kapi";
import { onizlemeTohumu, type Tohum } from "./onizleme";
import { sahteIstemci } from "./sahte";
import {
  basarisiz, meslekKaydiMi,
  type Envanter, type IsId, type LoncaSatiri, type MalId, type MeslekIslemi, type MeslekId, type MeslekKaydi, type MeslekYaniti,
  type TabanAlYaniti, type TemelIsYaniti, type YazmaOrtak,
  type BeceriHaritasi, type HalGorunumu, type SatYaniti, type SiparisSatiri, type SiparisTeslimYaniti, type TarifSatiri, type TarifYaniti,
  type DavetBilgisi, type Dil, type DunyaOzeti, type EylemTuru, type EylemYaniti, type GirisYaniti, type Isaret, type Kisi, type Olay,
  type OlaylarYaniti, type OnlineHata, type Profil, type Sonuc, type TanidikYaniti, type YerlesimDurumu,
} from "./protokol";

export type OturumTuru = "sunucu" | "gelistirici";
export interface OnlineOturum {
  tur: OturumTuru;
  /** Google hesabındaki addan öneri (yalnız profil yokken). */
  adOnerisi?: string;
}
export type Islem = "geriYukle" | "giris" | "dunya" | "profil" | "davet" | "yerlesim" | "olaylar" | "kisi" | "eylem" | "tanidik"
  | "meslek" | "temelIs" | "tabanAl" | "lonca" | "tarif" | "sat" | "siparisler" | "siparis";
/** POST /v1/meslek gövdesi (istekNo durum katmanında eklenir). */
export interface MeslekGirdisi { islem: MeslekIslemi; meslek: MeslekId; dal?: string; dugum?: string }
/** Bilinen meslek durumu: kayıt, kademe hizmet eşikleri ve mesleğe özel tecrübe/beceri puanı (sunucudan gelen son değer). */
export interface MeslekDurumu { kayit: MeslekKaydi; kademeHizmet: number[]; beceri?: BeceriHaritasi }
/** NPC'ye satışta bu ay bilinen kota (POST /v1/sat yanıtından; ay değişince geçersiz). */
export interface SatisKotasi { ay: number; satilan: number; tavan: number; kalan: number }
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
  /** Yalnız test APK'sında açık; davet kodu + kalıcı cihaz kimliğiyle Google'sız giriş. */
  testGiris(kod: string): Promise<Sonuc<GirisYaniti>>;
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
  /** Faz 3a oyuncular arası uçlar (o anki oturumun istemcisi; durum toplum-durum.tsx'te). */
  toplumIstemci(): ToplumIstemci;
  /** Beceri ağacı v2 uçları (o anki oturumun istemcisi). */
  beceriIstemci(): BeceriIstemci;
  // Meslek çekirdeği
  /** Bilinen son meslek durumu (GET /v1/yerlesim ben.meslek, yoksa son yazma yanıtı ya da yerel kopyası); bilinmiyorsa null. */
  meslekDurumu: MeslekDurumu | null;
  envanter: Envanter | null;
  lonca: LoncaSatiri[] | null;
  meslekIslem(girdi: MeslekGirdisi): Promise<Sonuc<MeslekYaniti>>;
  temelIsYap(is: IsId): Promise<Sonuc<TemelIsYaniti>>;
  tabanAl(mal: MalId, adet: number): Promise<Sonuc<TabanAlYaniti>>;
  loncaYukle(sessiz?: boolean): Promise<Sonuc<{ lonca: LoncaSatiri[] }>>;
  // Dikey dilim
  /** Sunucunun tarif listesi (ben.tarifler ya da son meslek/tarif yanıtı); bilinmiyorsa null. */
  tarifler: TarifSatiri[] | null;
  /** Hal (ben.hal; tarif ve sipariş yanıtları tazeler); eski sunucuda null. */
  hal: HalGorunumu | null;
  siparisler: SiparisSatiri[] | null;
  /** Bu ay o maldan bilinen satış kotası (yalnız bu ayki bir satıştan sonra bilinir). */
  satisKotasi(mal: MalId): SatisKotasi | null;
  tarifYap(tarif: string): Promise<Sonuc<TarifYaniti>>;
  sat(mal: MalId, adet: number): Promise<Sonuc<SatYaniti>>;
  siparisleriYukle(sessiz?: boolean): Promise<Sonuc<{ siparisler: SiparisSatiri[] }>>;
  siparisTeslim(siparis: string): Promise<Sonuc<SiparisTeslimYaniti>>;
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
  const [meslekDurumu, setMeslekDurumu] = useState<MeslekDurumu | null>(null);
  const [envanter, setEnvanter] = useState<Envanter | null>(null);
  const [lonca, setLonca] = useState<LoncaSatiri[] | null>(null);
  const [tarifler, setTarifler] = useState<TarifSatiri[] | null>(null);
  const [siparisler, setSiparisler] = useState<SiparisSatiri[] | null>(null);
  const [kotalar, setKotalar] = useState<Record<string, SatisKotasi>>({});
  /** Sunucu ben.meslek gönderiyor mu (gönderiyorsa yerel kopya ne okunur ne yazılır). */
  const benMeslekVar = useRef(false);
  const defterImlec = useRef<number | null>(null);
  const okunanImlec = useRef<number | null>(null);
  const bekleyenEylem = useRef(new Map<string, string>());
  const { lang } = useI18n();
  const dil = lang as Dil;

  const belirtec = useRef<string | null>(null);
  const mesgul = useRef(false);
  const http = useMemo(() => httpIstemci({ adres: sunucu, oturum: () => belirtec.current }), [sunucu]);
  const sahte = useRef<OnlineIstemci | null>(tohum?.gelistirici ? sahteIstemci(tohum.gecikme ?? 450, tohum.profil ?? null, { yas: tohum.yas, meslek: tohum.meslek }) : null);
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
    setMeslekDurumu(null);
    setEnvanter(null);
    setLonca(null);
    setTarifler(null);
    setSiparisler(null);
    setKotalar({});
    benMeslekVar.current = false;
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
    if (y.ok) {
      setYerlesim(y.deger);
      setYerlesimAlindi(Date.now());
      const b = y.deger.ben;
      if (b.tarifler) setTarifler(b.tarifler);
      if (b.meslek !== undefined) {
        // Dikey dilim sunucusu: meslek kaydı ben'den gelir (hiç meslek seçilmemişse null = boş kayıt).
        benMeslekVar.current = true;
        setMeslekDurumu({ kayit: b.meslek ?? { a: "", y: "", s: {} }, kademeHizmet: b.kademeHizmet ?? [], ...(b.beceri ? { beceri: b.beceri } : {}) });
        if (b.envanter) setEnvanter(b.envanter);
      } else if (!meslekDurumu && !tohum && oturum?.tur === "sunucu" && profil) {
        // Sunucu ben.meslek göndermiyorsa bilinen son durum yerel kopyadan gelir (ilk yazma yanıtı doğrusunu verir).
        const k = await meslekOku(profil.hesapId);
        if (k && meslekKaydiMi(k.m)) {
          setMeslekDurumu({ kayit: k.m, kademeHizmet: Array.isArray(k.k) ? (k.k as number[]) : [] });
          if (k.e && typeof k.e === "object") setEnvanter(k.e as Envanter);
        }
      }
    }
    return y;
  };
  /** Yazma yanıtındaki ortak alanlar: envanter, akçe ve kalan takat yerleşim durumuna işlenir. */
  const ortakIsle = (v: YazmaOrtak, meslek?: MeslekDurumu, hal?: HalGorunumu) => {
    setEnvanter(v.envanter);
    // Hal değiştiyse gelecek ayın takatı kondisyon kademesine bağlıdır (etki.p.takatAylik, sunucu aylikTakat).
    const aylik = hal?.kondisyon.etki.p.takatAylik;
    setYerlesim((d) => (d ? {
      ...d,
      ben: {
        ...d.ben, para: v.para, takat: { ...d.ben.takat, kalan: v.takat, ...(typeof aylik === "number" ? { aylik } : {}) }, envanter: v.envanter,
        ...(meslek ? { meslek: meslek.kayit, kademeHizmet: meslek.kademeHizmet, ...(meslek.beceri ? { beceri: meslek.beceri } : {}) } : {}),
        ...(hal ? { hal } : {}),
      },
    } : d));
    const hesap = profil?.hesapId;
    if (!benMeslekVar.current && !tohum && oturum?.tur === "sunucu" && hesap) {
      const m = meslek ?? meslekDurumu;
      void meslekYaz(hesap, m?.kayit ?? null, m?.kademeHizmet ?? null, v.envanter);
    }
  };
  /** istekNo'lu yazma: aynı niyet geçici hatadan sonra yeniden denenirse aynı istekNo gider. */
  const niyetle = async <T,>(anahtar: string, gonder: (istekNo: string) => Promise<Sonuc<T>>): Promise<Sonuc<T>> => {
    const istekNo = bekleyenEylem.current.get(anahtar) ?? istekNoUret();
    bekleyenEylem.current.set(anahtar, istekNo);
    const s = await gonder(istekNo);
    if (s.ok || !geciciHata(s.hata)) bekleyenEylem.current.delete(anahtar);
    return s;
  };
  const kisiAl = async (id: string): Promise<Sonuc<Kisi>> => {
    const k = await istemci().kisi(id, dil);
    if (k.ok) setKisiler((m) => ({ ...m, [id]: k.deger }));
    return k;
  };
  const loncaAl = async () => {
    const l = await istemci().lonca();
    if (l.ok) setLonca(l.deger.lonca);
    return l;
  };
  const siparisAl = async () => {
    const l = await istemci().siparisler(dil);
    if (l.ok) setSiparisler(l.deger.siparisler);
    return l;
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
    if (siparisler) void siparisAl();
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
    testGiris: (kod) =>
      calistir("giris", async () => {
        if (!ONLINE_TEST_GIRIS) return basarisiz("gecersiz_istek");
        const cihazId = await testCihazKimligi();
        const g = await http.testGiris(kod.trim(), cihazId);
        if (!g.ok) return g;
        belirtec.current = g.deger.oturum;
        await oturumYaz(g.deger.oturum);
        setOturum({ tur: "sunucu" });
        if (g.deger.profilVar) {
          const p = await http.profil();
          if (p.ok) setProfil(p.deger);
        }
        return g;
      }, true),
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
    toplumIstemci: () => istemci().toplum,
    beceriIstemci: () => istemci().beceri,
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
    meslekDurumu,
    envanter,
    lonca,
    meslekIslem: (g) =>
      calistir("meslek", async () => {
        const s = await niyetle(["meslek", g.islem, g.meslek, g.dal ?? "", g.dugum ?? ""].join("|"), (istekNo) => istemci().meslek({ ...g, istekNo }));
        if (s.ok) {
          const m: MeslekDurumu = { kayit: s.deger.meslek, kademeHizmet: s.deger.kademeHizmet, ...(s.deger.beceri ? { beceri: s.deger.beceri } : meslekDurumu?.beceri ? { beceri: meslekDurumu.beceri } : {}) };
          setMeslekDurumu(m);
          if (s.deger.tarifler) setTarifler(s.deger.tarifler);
          ortakIsle(s.deger, m);
          // Ana meslek değişince lonca sayıları da değişir.
          if (g.islem === "sec") void loncaAl();
        }
        return s;
      }, true),
    temelIsYap: (is) =>
      calistir("temelIs", async () => {
        const s = await niyetle("temelIs|" + is, (istekNo) => istemci().temelIs({ is, istekNo }));
        // Temel iş tecrübe ve Hal (kondisyon) değiştirir; ikisi de ben'de gelir.
        if (s.ok) { ortakIsle(s.deger); void yerlesimAl(); }
        return s;
      }, true),
    tabanAl: (mal, adet) =>
      calistir("tabanAl", async () => {
        const s = await niyetle(`tabanAl|${mal}|${adet}`, (istekNo) => istemci().tabanAl({ mal, adet, istekNo }));
        if (s.ok) ortakIsle(s.deger);
        return s;
      }, true),
    loncaYukle: (sessiz = false) => (sessiz ? loncaAl() : calistir("lonca", loncaAl)),
    tarifler,
    hal: yerlesim?.ben.hal ?? null,
    siparisler,
    satisKotasi: (mal) => {
      const k = kotalar[mal];
      return k && yerlesim && k.ay === yerlesim.saat.oyunAyi ? k : null;
    },
    tarifYap: (tarif) =>
      calistir("tarif", async () => {
        const s = await niyetle("tarif|" + tarif, (istekNo) => istemci().tarif({ tarif, istekNo }));
        if (s.ok) {
          setTarifler(s.deger.tarifler);
          ortakIsle(s.deger, undefined, s.deger.hal);
          // Tecrübe ve beceri puanı ben'de tazelenir.
          void yerlesimAl();
        }
        return s;
      }, true),
    sat: (mal, adet) =>
      calistir("sat", async () => {
        const s = await niyetle(`sat|${mal}|${adet}`, (istekNo) => istemci().sat({ mal, adet, istekNo }));
        if (s.ok) {
          ortakIsle(s.deger);
          const ay = yerlesim?.saat.oyunAyi ?? -1;
          setKotalar((k) => ({ ...k, [mal]: { ay, ...s.deger.kota } }));
          // Ambar değişince sipariş "elde" sayıları da değişir.
          if (siparisler) void siparisAl();
        }
        return s;
      }, true),
    siparisleriYukle: (sessiz = false) => (sessiz ? siparisAl() : calistir("siparisler", siparisAl)),
    siparisTeslim: (siparis) =>
      calistir("siparis", async () => {
        const s = await niyetle("siparis|" + siparis, (istekNo) => istemci().siparisTeslim({ siparis, istekNo, dil }));
        if (s.ok) {
          ortakIsle(s.deger, undefined, s.deger.hal);
          // Görüş, tecrübe ve sipariş listesi sunucudan tazelenir; teşekkür izi olayı deftere düşer.
          void Promise.all([siparisAl(), yerlesimAl()]);
        } else if (s.hata === "siparis_kapandi" || s.hata === "siparis_yok") void siparisAl();
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
