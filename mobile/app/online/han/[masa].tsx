// Han masası (Faz 10): üstte han sofrası ve çevresinde koltuklar (portre, ad, işaretler), altında ayaktakiler ve sohbet
// akışı (240 harf; saklanmaz). Bir koltuğa dokununca kişi kartı açılır: profil, armağan (ikram + Debdebe), butonlu eylemler
// (yemin, sözleşme, ittifak, ihbar, meydan okuma, atışma; masadakiler kayda geçer), sessize al, engelle, şikâyet ve masa
// başının moderasyonu. Kendi koltuğunda: kalk, ses, yemin, sahneyi aç. H8: ozan sahnesi (sofranın yerinde sahne şeridi,
// söz verilmeyen dinleyicide yazı kutusu yerine "söz iste") ve atışma (atışma panosu, kıta kutusu, oylama).
// Bağlantı han-soket.ts'te; sıra, oy ve sonuç sunucudan gelir.
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n, applyParams } from "../../../lib/i18n";
import { C, F } from "../../../lib/theme";
import { GameIcon } from "../../../lib/icons";
import { hap } from "../../../lib/haptics";
import { isReduceMotion } from "../../../lib/perf";
import { DesignPressable as Pressable } from "../../../lib/design-pressable";
import { OnlineYakinda } from "../../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../../lib/online/durum";
import { onlineEkranAcik } from "../../../lib/online/kapi";
import { istekNoUret } from "../../../lib/online/depo";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, ONL, geriGit, hiza, yon } from "../../../lib/online/ui";
import { AltPanel, Baslik2, Rozet, SayfaBasi, Yukleniyor } from "../../../lib/online/yasam-ui";
import { hataAnahtari, istekTekrarMi } from "../../../lib/online/hata";
import {
  KAPANIS, ILETI_EN_UZUN, SART_EN_UZUN, SIKAYET_NEDENLERI, hanMenusu, hanNoCoz, harfSayisi, seciliKart, tekSatir, useHanIstemci,
  type HanEylemi, type MasaOlayi, type MenuSatiri, type Plaka, type SikayetNedeni,
} from "../../../lib/online/han-veri";
import { kapanisAnahtari, useMasa, type AkisOgesi } from "../../../lib/online/han-soket";
import { AnonsSeridi, EYLEM_IKON, HanSayfa, Not, SecimOgesi, hanHataAnahtari, type PlakaSesi } from "../../../lib/online/han-ui";
import { KoltukDuzeni, KoltukPortresi, isaretler, type Kutlama } from "../../../lib/online/han-koltuk-ui";
import { ArmaganCekmecesi, type ArmaganSonucu } from "../../../lib/online/han-armagan";
import { hanKartAdi } from "../../../lib/online/han-secici";
import { AtismaPanosu, DurumSeridi, KitaBalonu, KitaKutusu, SahneSeridi } from "../../../lib/online/han-sahne-ui";
import { oyuncuKimligiMi } from "../../../lib/online/toplum-veri";
import { useToplum } from "../../../lib/online/toplum-durum";
import { useSes } from "../../../lib/online/ses";
import { MasaOyunPaneli } from "../../../lib/online/masa-oyun-ui";
import type { Dil } from "../../../lib/online/protokol";

type SecimEylemi = Exclude<HanEylemi, "kabul">;
type Panel = null | "eylem" | "armagan" | "rapor";
/** Sunucu kurallarının görünür kopyası (yalnız formu kurmak için; doğrulama sunucuda). */
const EYLEM_FORM: Record<SecimEylemi, { hedef: "zorunlu" | "secimli"; sart: boolean }> = {
  yemin: { hedef: "secimli", sart: true }, sozlesme: { hedef: "zorunlu", sart: true }, ittifak: { hedef: "zorunlu", sart: false },
  ihbar: { hedef: "zorunlu", sart: false }, meydanOku: { hedef: "zorunlu", sart: false }, atisma: { hedef: "zorunlu", sart: false },
};
/** Kişi kartındaki eylemler: oturana hepsi; sıradakine (ayakta) yalnız ihbar (sunucu ihbarı masadaki herkese açar). */
const OTURANA: SecimEylemi[] = ["sozlesme", "ittifak", "meydanOku", "atisma", "yemin", "ihbar"];
const TEKLIF_TURLERI: ReadonlySet<string> = new Set(["sozlesme", "ittifak", "meydanOku", "atisma"]);
const BESTE_HAN = 64; // yazı kutusu yüksekliği
const KUTLAMA_MS = 650; // giriş 300 + bekleme 650 + çıkış 220 ≈ 1,2 sn
const SONUC_MS = 2400; // atışma sonucu panoda okunacak kadar kalır, sonra sohbet satırı olarak sürer
const ALT_ESIK = 48; // sohbet bu kadar alttaysa "altta" sayılır

function masaNo(param: unknown): number {
  const n = Number(Array.isArray(param) ? param[0] : param);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : 1;
}

function zamanYaz(ms: number, lang: string) {
  try { return new Date(ms).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}

type IletiOgesi = Extract<AkisOgesi, { tur: "ileti" }>;
/** Sohbet satırı: öğe, `benim`, `rtl`, `t`, `lang` değişmedikçe yeniden çizilmez (yeni satır gelince eskiler dokunulmaz). */
const IletiSatiri = memo(function IletiSatiri({ a, benim, rtl, t, lang }: { a: IletiOgesi; benim: boolean; rtl: boolean; t: (k: string) => string; lang: string }) {
  return <View accessible accessibilityLabel={`${a.ad}: ${a.metin}`} style={{ alignSelf: benim ? (rtl ? "flex-start" : "flex-end") : rtl ? "flex-end" : "flex-start", maxWidth: "88%", borderRadius: 10, borderColor: a.balon ? "#F3D27A" : benim ? "rgba(243,210,122,0.6)" : "rgba(201,162,78,0.3)", borderWidth: a.balon ? 1.5 : 1, backgroundColor: a.balon ? "rgba(88,30,40,0.92)" : benim ? "rgba(70,50,22,0.92)" : "rgba(20,14,8,0.88)", paddingHorizontal: 10, paddingVertical: 7, gap: 2 }}>
    <View style={{ flexDirection: yon(rtl), gap: 8, alignItems: "baseline" }}>
      <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 11.5, color: benim ? C.goldBright : C.gold }}>{benim ? t("onl.han.sen") : a.ad}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentMuted }}>{zamanYaz(a.zaman, lang)}</Text>
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{a.metin}</Text>
  </View>;
});

function MasaEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const ins = useSafeAreaInsets();
  const { masa: param, han: hanParam } = useLocalSearchParams<{ masa?: string; han?: string }>();
  const no = masaNo(param);
  // 4.9: masa seçili hanın masasıdır; bağlanma, eylem, ikram, ziyafet ve ses aynı `han` ile gider.
  const hanNo = hanNoCoz(Array.isArray(hanParam) ? hanParam[0] : hanParam);
  const hanYolu = `/online/han?han=${hanNo}`;
  const o = useOnline();
  const toplum = useToplum();
  const istemci = useHanIstemci(hanNo);
  const m = useMasa(o.profil ? no : undefined, hanNo);
  const d = m.durum;
  const [metin, setMetin] = useState("");
  const [kisiHesap, setKisiHesap] = useState<string | null>(null);
  const [panel, setPanelD] = useState<Panel>(null);
  const [hedef, setHedef] = useState<string | null>(null);
  const [hedefAd, setHedefAd] = useState("");
  const [eylemTur, setEylemTur] = useState<SecimEylemi>("yemin");
  const [sart, setSart] = useState("");
  const [neden, setNeden] = useState<SikayetNedeni>("kufur");
  const [aciklama, setAciklama] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [panelHata, setPanelHata] = useState<string | null>(null);
  const [raporBekliyor, setRaporBekliyor] = useState(false);
  const [menu, setMenu] = useState<MenuSatiri[] | null>(null);
  const [hanAd, setHanAd] = useState<string | null>(null);
  const [kutlama, setKutlama] = useState<Kutlama | null>(null);
  const [onay, setOnay] = useState<null | "at" | "engelle">(null);
  const [yeni, setYeni] = useState(0);
  const [gizliSon, setGizliSon] = useState<string | null>(null);
  const [, setSaat] = useState(0);
  const istekNo = useRef<string>(istekNoUret());
  const panelRef = useRef<Panel>(null);
  const panelNo = useRef(0);
  const eylemKilit = useRef(false);
  const kabulNo = useRef(new Map<number, string>());
  const kabulKilit = useRef(new Set<number>());
  const akisKutu = useRef<ScrollView>(null);
  const altta = useRef(true);
  const [kitaTaslak, setKitaTaslak] = useState("");

  const setPanel = (p: Panel) => { panelRef.current = p; setPanelD(p); };

  // Fiyatlar sunucudan: GET /v1/han menüsü (yoksa ilk ikram yanıtındaki fiyat öğrenilir).
  useEffect(() => {
    let iptal = false;
    if (o.profil) void istemci.han(lang as Dil).then((s) => {
      if (iptal || !s.ok) return;
      const mn = hanMenusu(s.deger);
      if (mn) setMenu(mn);
      const k = seciliKart(s.deger);
      setHanAd(k && (s.deger.hanlar?.length ?? 0) > 1 ? hanKartAdi(k, s.deger.han.ad, t) : null);
    });
    return () => { iptal = true; };
  }, [istemci, lang, o.profil?.hesapId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Şikâyet: panel, sunucunun "rapor" yanıtı ya da hatası gelene dek açık kalır.
  const ilkRapor = useRef(d.raporlandi);
  useEffect(() => {
    if (d.raporlandi <= ilkRapor.current) return;
    ilkRapor.current = d.raporlandi;
    setRaporBekliyor(false);
    if (panelRef.current === "rapor") { setPanel(null); setAciklama(""); }
    setBilgi(t("onl.han.raporAlindi"));
  }, [d.raporlandi, t]);
  useEffect(() => { if (raporBekliyor && (d.hata || d.bag !== "acik")) setRaporBekliyor(false); }, [raporBekliyor, d.hata, d.bag]);
  // Yeni satır: kullanıcı alttaysa ya da satır kendisininse kaydır; değilse "yeni iletiler" rozeti.
  const sonSatir = d.akis[d.akis.length - 1];
  useEffect(() => {
    if (!sonSatir) return;
    const benim = (sonSatir.tur === "ileti" || sonSatir.tur === "kita") && sonSatir.hesap === d.ben?.hesap;
    if (altta.current || benim) {
      const z = setTimeout(() => akisKutu.current?.scrollToEnd({ animated: !isReduceMotion() }), 60);
      setYeni(0);
      return () => clearTimeout(z);
    }
    setYeni((x) => x + 1);
  }, [sonSatir?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!kutlama) return; const z = setTimeout(() => setKutlama(null), KUTLAMA_MS); return () => clearTimeout(z); }, [kutlama]);
  // Susturma bitince ekran kendiliğinden açılır.
  const susturmaBitis = d.susturma?.bitis ?? null;
  useEffect(() => {
    if (!susturmaBitis) return;
    const ms = susturmaBitis - Date.now();
    if (ms <= 0) return;
    const z = setTimeout(() => setSaat((x) => x + 1), Math.min(ms + 50, 2_000_000_000));
    return () => clearTimeout(z);
  }, [susturmaBitis]);
  // Atışma sonucu panoda kısa süre kalır.
  const son = d.atismaSon && d.atismaSon.id !== gizliSon ? d.atismaSon : null;
  useEffect(() => { if (!son) return; const z = setTimeout(() => setGizliSon(son.id), SONUC_MS); return () => clearTimeout(z); }, [son?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kıta taslağı ekranda tutulur (yeniden bağlanma/sıra gidip gelmesi silmez); yalnız kıtam kabul edilince ya da atışma bitince silinir.
  const kitaIz = useRef<{ olay: number; kita: number } | null>(null);
  const atOlay = d.atisma?.olay ?? null, atKita = d.atisma?.kita ?? null, atSira = d.atisma?.sira ?? null, benHesap = d.ben?.hesap ?? null;
  useEffect(() => {
    if (atOlay === null || atKita === null) { kitaIz.current = null; setKitaTaslak(""); return; }
    const on = kitaIz.current;
    if (on && on.olay === atOlay && atKita > on.kita && atSira !== benHesap) setKitaTaslak("");
    kitaIz.current = { olay: atOlay, kita: atKita };
  }, [atOlay, atKita, atSira, benHesap]);

  const masa = d.masa;
  const ben = d.ben?.hesap ?? null;
  const tumPlakalar = useMemo(() => [...(masa?.koltuklar.filter((p): p is Plaka => !!p) ?? []), ...(masa?.sira ?? [])], [masa]);
  const plakaBul = (h: string) => tumPlakalar.find((p) => p.hesap === h);
  const adBul = (h: string) => (h === ben ? d.ben?.ad ?? t("onl.han.sen") : plakaBul(h)?.ad ?? t("onl.han.birMisafir"));
  const oturuyor = !!ben && !!masa?.koltuklar.some((p) => p?.hesap === ben);
  const siradaYer = masa && ben ? masa.sira.findIndex((p) => p.hesap === ben) : -1;
  const basBen = !!ben && masa?.masaBasi === ben;
  const bosVar = !!masa?.koltuklar.some((p) => p === null);
  const digerOturanlar = (masa?.koltuklar.filter((p): p is Plaka => !!p && p.hesap !== ben)) ?? [];
  const susturuldu = !!d.susturma && (d.susturma.bitis === null || d.susturma.bitis > Date.now());
  const acik = d.bag === "acik" && !!masa;
  const sahne = d.sahne;
  const atisma = d.atisma;
  const mesgul = !!sahne || !!atisma;
  const ses = useSes({ no, istemci, ses: d.ses, ben, oturuyor, bagli: acik, sessiz: d.sessiz, gonder: m.gonderHam });
  const sesi = (h: string): PlakaSesi | undefined => (ses.kesik(h) ? "kesik" : ses.konusuyor(h) ? "konusuyor" : ses.mikAcik(h) ? "acik" : undefined);
  const sozIstiyor = (h: string) => ses.sozIstedi(h) || !!sahne?.istek.includes(h);
  const isaretBul = (p: Plaka) => isaretler(p, { bas: masa?.masaBasi ?? null, sessiz: d.sessiz, sesi, soz: sozIstiyor, anlatici: sahne?.anlatici ?? null });
  const benKesik = !!ben && ses.kesik(ben);
  const sozIstedim = !!ben && ses.sozIstedi(ben);
  const hata = (kod: Parameters<typeof hanHataAnahtari>[0]) => t(hanHataAnahtari(kod));

  // Kişi kartı güncel plakadan türetilir; kişi masadan düşünce kart kapanır.
  const kisi = kisiHesap ? plakaBul(kisiHesap) ?? null : null;
  useEffect(() => {
    if (kisiHesap && masa && !kisi) { setKisiHesap(null); setOnay(null); setBilgi(t("onl.han.kisiAyrildi")); }
  }, [kisiHesap, kisi, masa, t]);
  const kartAc = (h: string) => { setOnay(null); setKisiHesap(h); };
  const kartKapat = () => { setOnay(null); setKisiHesap(null); };

  const panelAc = (p: Exclude<Panel, null>, h: string | null) => {
    panelNo.current += 1;
    istekNo.current = istekNoUret();
    setHedef(h); setHedefAd(h ? adBul(h) : "");
    kartKapat(); setPanelHata(null); m.hataTemizle(); setPanel(p); setBilgi(null);
  };
  const eylemAc = (tur: SecimEylemi, h: string | null) => { setEylemTur(tur); setSart(""); panelAc("eylem", h); };
  const gonder = () => {
    const m2 = tekSatir(metin);
    if (!m2 || harfSayisi(m2) > ILETI_EN_UZUN) return;
    if (m.yaz(m2)) setMetin("");
  };
  /** Butonlu eylem. Sonuç geldiğinde panel yalnız hâlâ aynı açılıştaysa kapanır; hata panel açıksa panelde gösterilir. */
  const eylemGonder = async (tur: SecimEylemi, h?: string) => {
    if (eylemKilit.current) return;
    eylemKilit.current = true;
    const acilis = panelNo.current;
    const ayni = () => panelNo.current === acilis && panelRef.current === "eylem";
    setBekliyor(true); setPanelHata(null);
    const s = await istemci.eylem({ masa: no, tur, istekNo: istekNo.current, ...(h ? { hedef: h } : {}), ...(EYLEM_FORM[tur].sart && tekSatir(sart) ? { sart: tekSatir(sart) } : {}) });
    eylemKilit.current = false;
    setBekliyor(false);
    if (s.ok || istekTekrarMi(s.hata)) {
      istekNo.current = istekNoUret();
      if (ayni()) { setPanel(null); setSart(""); }
      setBilgi(t(s.ok ? "onl.han.eylemYazildi" : "onl.h.istekTekrar"));
    } else if (ayni()) { hap("error"); setPanelHata(hata(s.hata)); }
    else m.hataGoster(s.hata, s.bitis);
  };
  /** Teklif kabulü: istek kimliği olay numarasına bağlı, çift dokunuş tek istek. */
  const kabulEt = async (x: MasaOlayi) => {
    if (kabulKilit.current.has(x.no)) return;
    kabulKilit.current.add(x.no);
    let no2 = kabulNo.current.get(x.no);
    if (!no2) { no2 = istekNoUret(); kabulNo.current.set(x.no, no2); }
    const s = await istemci.eylem({ masa: no, tur: "kabul", olay: x.no, istekNo: no2 });
    kabulKilit.current.delete(x.no);
    if (s.ok || istekTekrarMi(s.hata)) setBilgi(t(s.ok ? "onl.han.eylemYazildi" : "onl.h.istekTekrar"));
    else m.hataGoster(s.hata, s.bitis);
  };
  const armaganSonucu = (s: ArmaganSonucu) => {
    const ayni = panelNo.current === s.oturum && panelRef.current === "armagan";
    if (ayni) setPanel(null);
    // Madalyon sofranın üstünde çıkar; sofranın yerinde sahne/atışma varsa bilgi bandı kullanılır.
    const kutla = !!s.kutlama && !isReduceMotion() && !!hedef && !d.sahne && !d.atisma;
    if (s.kutlama) hap("success");
    // Tek net geri bildirim: kutlama madalyonu görünüyorsa bilgi bandı çıkmaz (sohbette anons satırı kalır).
    if (kutla && s.kutlama) setKutlama({ id: istekNoUret(), icon: s.kutlama.icon, metin: applyParams(t("onl.han.kutlama"), [s.kutlama.oge, hedefAd]) });
    else setBilgi(s.bilgi);
    void o.yerlesimYukle(true);
  };
  const ziyafetIstekNo = useRef(istekNoUret());
  const ziyafetVer = async () => {
    if (eylemKilit.current) return;
    eylemKilit.current = true;
    setBekliyor(true);
    const s = await istemci.ziyafet({ masa: no, istekNo: ziyafetIstekNo.current });
    eylemKilit.current = false;
    setBekliyor(false);
    if (s.ok) {
      hap("success");
      setBilgi(applyParams(t(s.deger.nam > 0 ? "onl.han.ziyafetVerildiNam" : "onl.han.ziyafetVerildi"), [s.deger.bedel, s.deger.para, s.deger.nam]));
      ziyafetIstekNo.current = istekNoUret();
      void o.yerlesimYukle(true);
    } else if (istekTekrarMi(s.hata)) { setBilgi(t("onl.h.istekTekrar")); ziyafetIstekNo.current = istekNoUret(); }
    else m.hataGoster(s.hata, s.bitis);
  };
  const raporGonder = () => {
    if (!hedef) return;
    setPanelHata(null);
    if (m.rapor(hedef, neden, aciklama)) setRaporBekliyor(true);
    else setPanelHata(hata("ag_yok"));
  };
  const engelle = async (k: string) => {
    setOnay(null);
    const s = await toplum.engelle(k, "engelle");
    if (s.ok || istekTekrarMi(s.hata)) { kartKapat(); setBilgi(t("onl.han.engellendi")); }
    else setBilgi(t(hataAnahtari(s.hata)));
  };

  const olayMetni = (x: MasaOlayi) => {
    if (x.tur === "atismaSonuc") {
      const oy = x.oy ?? [0, 0];
      return applyParams(t("onl.han.olay.atismaSonuc." + (x.sonuc ?? "kazandi")), [adBul(x.kim), x.hedef ? adBul(x.hedef) : "", oy[0], oy[1]]);
    }
    const k = x.tur === "kabul" ? (x.teklifTur === "meydanOku" ? "onl.han.olay.kabulDuello" : x.teklifTur === "atisma" ? "onl.han.olay.kabulAtisma" : "onl.han.olay.kabul")
      : x.tur === "atma" ? "onl.han.olay.atma" : x.hedef ? `onl.han.olay.${x.tur}` : `onl.han.olay.${x.tur}Yalniz`;
    return applyParams(t(k), [adBul(x.kim), x.hedef ? adBul(x.hedef) : "", x.katilim.length]);
  };
  const akisCiz = (a: AkisOgesi) => {
    if (a.tur === "anons") return <AnonsSeridi anons={a.anons} ad={adBul} rtl={rtl} t={t} />;
    if (a.tur === "kita") {
      return <KitaBalonu ad={a.ad} metin={a.metin} sira={a.sira} toplam={a.toplam} a={a.a} benim={a.hesap === ben} rtl={rtl} t={t} />;
    }
    if (a.tur === "olay") {
      const x = a.olay;
      const teklifTuru = TEKLIF_TURLERI.has(x.tur);
      const kabulBekliyor = teklifTuru && x.durum === "teklif" && d.kabuller[x.no] === undefined;
      const bana = kabulBekliyor && x.hedef === ben;
      return <View accessible={!bana} style={{ borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,162,78,0.55)", backgroundColor: "rgba(36,26,14,0.92)", padding: 10, gap: 6 }}>
        <View style={{ flexDirection: yon(rtl), gap: 8, alignItems: "center" }}>
          <GameIcon name={EYLEM_IKON[x.tur] ?? "scroll"} size={16} color={C.goldBright} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>{olayMetni(x)}</Text>
        </View>
        {x.sart ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`“${x.sart}”`}</Text> : null}
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <Rozet icon="scroll-open" metin={applyParams(t("onl.han.kayitta"), [x.katilim.length])} />
          {kabulBekliyor ? <Rozet metin={t("onl.han.teklifBekliyor")} renk={C.ember} /> : teklifTuru && d.kabuller[x.no] !== undefined ? <Rozet metin={t("onl.han.kabulEdildi")} renk={C.sage} dolu /> : null}
        </View>
        {bana && x.tur === "meydanOku" ? <Text style={notStil}>{t("onl.han.duelloNot")}</Text> : null}
        {bana && x.tur === "atisma" ? <Text style={notStil}>{t("onl.han.atisma.kabulNot")}</Text> : null}
        {bana ? <CizgiDugme etiket={t(x.tur === "meydanOku" ? "onl.han.duelloKabul" : x.tur === "atisma" ? "onl.han.atisma.kabulEt" : "onl.han.kabulEt")} icon={x.tur === "meydanOku" ? "crossed-swords" : x.tur === "atisma" ? "lyre" : "ring"} rtl={rtl} kucuk kapali={!acik || !oturuyor} onPress={() => { void kabulEt(x); }} /> : null}
      </View>;
    }
    return <IletiSatiri a={a} benim={a.hesap === ben} rtl={rtl} t={t} lang={lang} />;
  };

  const notStil = { fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) } as const;
  const kalan = ILETI_EN_UZUN - harfSayisi(tekSatir(metin));
  // Sahnede yalnız anlatıcı ve söz verilenler yazar.
  const sahneSozum = !!sahne && !!ben && (sahne.anlatici === ben || sahne.soz.includes(ben));
  const sahneIstedim = !!sahne && !!ben && sahne.istek.includes(ben);
  const yazamaz = !acik || !oturuyor || susturuldu || (!!sahne && !sahneSozum);
  const serit = (icerik: ReactNode) => <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>{icerik}</KeyboardAvoidingView>;
  const yaziKutusu = <View style={{ paddingBottom: ins.bottom + 8, paddingTop: 8, paddingHorizontal: 12, borderTopWidth: 1, borderColor: ONL.frame, backgroundColor: "rgba(17,12,7,0.97)", gap: 4 }}>
    <View style={{ flexDirection: yon(rtl), gap: 8, alignItems: "center" }}>
      <TextInput value={metin} onChangeText={(v) => setMetin(v.replace(/[\r\n]+/g, " "))} editable={!yazamaz} maxLength={ILETI_EN_UZUN * 2}
        placeholder={t(susturuldu ? "onl.han.susturuldun" : !oturuyor ? "onl.han.yazmakIcinOtur" : "onl.han.yazIpucu")} placeholderTextColor={C.parchmentMuted}
        accessibilityLabel={t("onl.han.yazErisim")} onSubmitEditing={gonder} returnKeyType="send" blurOnSubmit={false}
        style={{ flex: 1, minHeight: 44, maxHeight: 88, borderRadius: 8, borderWidth: 1, borderColor: yazamaz ? "rgba(168,130,63,0.35)" : ONL.frameHi, backgroundColor: "rgba(14,10,6,0.9)", color: C.parchment, fontFamily: F.serif, fontSize: 16, paddingHorizontal: 12, paddingVertical: 8, textAlign: hiza(rtl) }} />
      <Pressable accessibilityRole="button" accessibilityLabel={t("onl.han.gonder")} accessibilityState={{ disabled: yazamaz || kalan < 0 || !tekSatir(metin) }} disabled={yazamaz || kalan < 0 || !tekSatir(metin)} onPress={() => { hap("tap"); gonder(); }}
        style={({ pressed }) => ({ width: 48, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: C.goldBright, backgroundColor: pressed ? C.gold : "rgba(201,162,78,0.18)", opacity: yazamaz || kalan < 0 || !tekSatir(metin) ? 0.45 : 1 })}>
        <GameIcon name="scroll" size={18} color={C.goldBright} />
      </Pressable>
    </View>
    <Text style={{ fontFamily: F.serif, fontSize: 12, color: kalan < 0 ? C.ember : C.parchmentMuted, textAlign: hiza(rtl) }}>{`${applyParams(t("onl.han.harfKaldi"), [Math.max(0, kalan), ILETI_EN_UZUN])} · ${t("onl.han.saklanmaz")}`}</Text>
  </View>;
  // Alt şerit: atışmanın kıta aşamasında sırası gelene kıta kutusu, ötekilere durum; sahnede sözü olmayan oturana "söz iste".
  let alt: ReactNode = yaziKutusu;
  let altYukseklik = BESTE_HAN + 30;
  if (acik && atisma?.asama === "kita") {
    if (atisma.sira === ben) { alt = <KitaKutusu altBosluk={ins.bottom} acik={acik} rtl={rtl} t={t} value={kitaTaslak} onChange={setKitaTaslak} enCok={d.kitaEnCok ?? undefined} onGonder={(k) => m.kita(k)} />; altYukseklik = 196; }
    else { alt = <DurumSeridi altBosluk={ins.bottom} rtl={rtl} metin={applyParams(t("onl.han.atisma.siraOnda"), [atisma.sira ? adBul(atisma.sira) : ""])} />; altYukseklik = 64; }
  } else if (acik && sahne && oturuyor && !sahneSozum) {
    alt = <DurumSeridi altBosluk={ins.bottom} rtl={rtl} icon="star" metin={t(sahneIstedim ? "onl.han.sahne.sozBekliyorsun" : "onl.han.sahne.dinliyorsun")}
      eylem={t(sahneIstedim ? "onl.han.sahne.vazgec" : "onl.ses.sozIste")} onEylem={() => (sahneIstedim ? m.sozGeri() : m.sozIste())} />;
    altYukseklik = 72;
  }

  const suresiz = d.susturma?.bitis === null;
  const kisiBen = !!kisi && kisi.hesap === ben;
  const kisiOturuyor = !!kisi && !!masa?.koltuklar.some((p) => p?.hesap === kisi.hesap);
  const kisiSira = kisi && masa ? masa.sira.findIndex((p) => p.hesap === kisi.hesap) : -1;
  const kisiIsaret = kisi ? isaretBul(kisi) : null;
  const sahneYoneticisi = !!sahne && (sahne.anlatici === ben || basBen);
  const kisiProfil = kisi?.kisi && oyuncuKimligiMi(kisi.kisi) ? kisi.kisi : null;
  const masaAlt = masa ? (masa.ayar.kavgaYasak ? t("onl.han.isaret.kavgaYasak") : masa.ayar.tur === "ozel" ? t("onl.han.isaret.ozelMasa") : undefined) : undefined;
  const hedefMasada = !!hedef && tumPlakalar.some((p) => p.hesap === hedef);
  const panelHataMetni = panelHata ?? (d.hata && d.bag !== "kapandi" ? hata(d.hata.kod) : null);
  const panelHatasi = panelHataMetni ? <Text accessibilityRole="alert" style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: C.ember, textAlign: hiza(rtl) }}>{panelHataMetni}</Text> : null;
  const orta = atisma || son
    ? <AtismaPanosu atisma={atisma} son={atisma ? null : son} plaka={plakaBul} ad={adBul} ben={ben} basBen={basBen} acik={acik} rtl={rtl} t={t} onOy={(h) => m.oy(h)} onBitir={() => m.atismaKapat()} />
    : sahne ? <SahneSeridi sahne={sahne} anlaticiAd={adBul(sahne.anlatici)} ben={ben} basBen={basBen} acik={acik} rtl={rtl} t={t} onKapat={() => m.sahneKapat()} />
    : undefined;
  const altaIn = () => { setYeni(0); altta.current = true; akisKutu.current?.scrollToEnd({ animated: !isReduceMotion() }); };
  const kaydirildi = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    altta.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - ALT_ESIK;
    if (altta.current && yeni) setYeni(0);
  };

  return <HanSayfa alt={serit(alt)} altYukseklik={altYukseklik}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.han.hanaDon")} onPress={() => geriGit(router, hanYolu)} />
      <View style={{ flex: 1 }} />
      {masa ? <Rozet icon="walk" metin={applyParams(t("onl.han.ayakta"), [masa.ayakta])} /> : null}
    </View>
    <View style={{ marginTop: 6 }}>
      <SayfaBasi ust={hanAd ?? t("onl.han.ust")} baslik={applyParams(t("onl.han.masaNo"), [no])} alt={masa ? (masa.ayar.kavgaYasak ? t("onl.han.kavgaYasakAlt") : t("onl.han.acikMasaAlt")) : undefined} rtl={rtl} />
    </View>

    {/* bağlantı ve hata bantları */}
    <View style={{ marginTop: 10, gap: 8 }}>
      {!o.profil && o.hazir ? <Bant tur="bilgi" metin={t("onl.v.profilYok")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={() => router.replace("/online")} /> : null}
      {d.bag === "yeniden" ? <Bant tur="bilgi" metin={applyParams(t("onl.han.yenidenBaglaniyor"), [d.deneme])} rtl={rtl} /> : null}
      {d.bag === "kapandi" ? <Bant metin={t(d.kapanis === null && d.hata ? hanHataAnahtari(d.hata.kod) : kapanisAnahtari(d.kapanis))} rtl={rtl}
        eylem={t(d.kapanis === KAPANIS.atildi ? "onl.han.hanaDon" : "onl.han.yenidenBaglan")} onEylem={() => (d.kapanis === KAPANIS.atildi ? geriGit(router, hanYolu) : m.yenidenBaglan())} /> : null}
      {d.hata && d.bag !== "kapandi" && !panel ? <Bant metin={d.hata.kod === "susturuldu" ? (d.hata.bitis ? applyParams(t("onl.han.susturulduBitis"), [new Date(d.hata.bitis).toLocaleString(lang)]) : t("onl.han.susturulduSuresiz")) : hata(d.hata.kod)} rtl={rtl} eylem={t("onl.kapat")} onEylem={m.hataTemizle} /> : null}
      {bilgi ? <Bant tur="bilgi" metin={bilgi} rtl={rtl} eylem={t("onl.kapat")} onEylem={() => setBilgi(null)} /> : null}
      {d.sonAnons && d.sonAnons.kim !== ben ? <AnonsSeridi key={d.sonAnons.id} anons={d.sonAnons} ad={adBul} rtl={rtl} t={t} buyuk /> : null}
    </View>

    {!masa ? (d.bag === "kapandi" ? null : <Yukleniyor metin={t("onl.han.baglaniyor")} />) : <>
      {/* koltuklar ve sofra (sahnede sahne şeridi, atışmada atışma panosu) */}
      <View style={{ marginTop: 12 }}>
        <KoltukDuzeni koltuklar={masa.koltuklar} ben={ben} isaretBul={isaretBul} rtl={rtl} t={t} no={no} ayakta={masa.ayakta} alt={masaAlt} kutlama={kutlama} orta={orta}
          onKoltuk={(i, p) => {
            if (!p) { if (!oturuyor) m.otur(i); return; }
            kartAc(p.hesap);
          }} />
      </View>

      {/* ayaktakinin denetimi: otur / sıra / söz iste; oturan kendi koltuğundan kalkar, sesini açar */}
      <View style={{ marginTop: 10, gap: 8 }}>
        {oturuyor ? <Text style={notStil}>{t("onl.han.koltugunaDokun")}</Text>
          : <View style={{ flexDirection: yon(rtl), gap: 8 }}>
            <View style={{ flex: 1 }}>
              {siradaYer >= 0 ? <CizgiDugme etiket={applyParams(t("onl.han.siradanCik"), [siradaYer + 1])} icon="walk" rtl={rtl} kucuk kapali={!acik} onPress={() => m.kalk()} />
                : <AltinDugme etiket={t(bosVar ? "onl.han.bosaOtur" : "onl.han.siraGir")} icon={bosVar ? "house" : "hourglass"} rtl={rtl} kapali={!acik} onPress={() => m.otur()} />}
            </View>
            {ses.gorunur ? <View style={{ flex: 1 }}><CizgiDugme etiket={t(sozIstedim ? "onl.ses.sozGeri" : "onl.ses.sozIste")} icon="star" rtl={rtl} kucuk kapali={!acik} onPress={() => (sozIstedim ? m.sozGeri() : m.sozIste())} /></View> : null}
          </View>}
        {susturuldu ? <Not metin={suresiz ? t("onl.han.susturulduSuresiz") : applyParams(t("onl.han.susturulduBitis"), [new Date(d.susturma!.bitis!).toLocaleString(lang)])} rtl={rtl} icon="speaker" /> : null}
        {ses.gorunur && oturuyor && benKesik ? <Not metin={t("onl.ses.kesildin")} rtl={rtl} icon="speaker" /> : null}
        {ses.gorunur && !oturuyor ? <Not metin={t(sozIstedim ? "onl.ses.sozBekliyor" : "onl.ses.dinliyorsun")} rtl={rtl} icon="speaker" /> : null}
        {ses.gorunur && ses.mik ? <Not metin={t("onl.ses.kayitYok")} rtl={rtl} icon="speaker" /> : null}
        {ses.neden ? <Not metin={t(ses.neden)} rtl={rtl} icon="speaker" /> : null}
        {ses.hata ? <Bant metin={t(ses.hata === "izin" ? "onl.ses.izinYok" : hanHataAnahtari(ses.hata))} rtl={rtl} eylem={t("onl.kapat")} onEylem={ses.hataTemizle} /> : null}
        {/* ziyafet bütün masaya: tek yeri burası */}
        {oturuyor ? <>
          <CizgiDugme etiket={t("onl.han.ziyafetVer")} icon="bread" rtl={rtl} kucuk kapali={!acik || bekliyor || digerOturanlar.length < 2} onPress={() => { void ziyafetVer(); }} />
          <Text style={[notStil, { fontSize: 12.5, lineHeight: 17 }]}>{t("onl.han.ziyafetNot")}</Text>
        </> : <Text style={notStil}>{t("onl.han.oturunca")}</Text>}
      </View>

      {/* masa oyunları (Çanak Zarı, Dokuz Taş): açma, bekleme, oyun, bitiş, seyirci */}
      <MasaOyunPaneli m={m} ben={ben} oturuyor={oturuyor} acik={acik} mesgul={mesgul} rtl={rtl} t={t} />

      {basBen && d.ses?.soz.length ? <>
        <Baslik2 metin={applyParams(t("onl.ses.sozBaslik"), [d.ses.soz.length])} rtl={rtl} />
        <View style={{ gap: 6 }}>
          {d.ses.soz.map((p) => <View key={p.hesap} style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(14,10,6,0.7)", borderWidth: 1, borderColor: "rgba(201,162,78,0.25)" }}>
            <GameIcon name="star" size={14} color={C.goldBright} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{p.ad}</Text>
            <CizgiDugme etiket={t("onl.ses.sozVer")} icon="house" rtl={rtl} kucuk kapali={!acik || !bosVar} onPress={() => m.sozVer(p.hesap)} />
            <CizgiDugme etiket={t("onl.ses.reddet")} rtl={rtl} kucuk kapali={!acik} onPress={() => m.sozVer(p.hesap, false)} />
          </View>)}
          {!bosVar ? <Text style={notStil}>{t("onl.ses.sozDolu")}</Text> : null}
        </View>
      </> : null}

      {/* sohbet */}
      <Baslik2 metin={t("onl.han.sohbet")} rtl={rtl} />
      <Cerceve ic={{ padding: 0 }}>
        <ScrollView ref={akisKutu} nestedScrollEnabled onScroll={kaydirildi} scrollEventThrottle={100} style={{ maxHeight: 340 }} contentContainerStyle={{ padding: 10, gap: 8 }}>
          {d.akis.length ? d.akis.map((a) => <View key={a.id}>{akisCiz(a)}</View>)
            : <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: "center", paddingVertical: 18 }}>{t("onl.han.sessizMasa")}</Text>}
        </ScrollView>
      </Cerceve>
      {yeni > 0 ? <View style={{ marginTop: 6, alignSelf: "center" }}>
        <CizgiDugme etiket={applyParams(t("onl.han.yeniIleti"), [yeni])} icon="scroll" rtl={rtl} kucuk onPress={altaIn} />
      </View> : null}

      {masa.sira.length ? <>
        <Baslik2 metin={applyParams(t("onl.han.siraBaslik"), [masa.sira.length])} rtl={rtl} />
        <View style={{ gap: 6 }}>
          {masa.sira.map((p, i) => {
            const benim = p.hesap === ben;
            return <Pressable key={p.hesap} accessibilityRole="button" accessibilityState={{ disabled: benim }} disabled={benim} accessibilityLabel={`${i + 1}. ${benim ? t("onl.han.sen") : p.ad}${sozIstiyor(p.hesap) ? ", " + t("onl.han.isaret.soz") : ""}`}
              onPress={() => { hap("tap"); kartAc(p.hesap); }}
              style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(14,10,6,0.7)", borderWidth: 1, borderColor: "rgba(201,162,78,0.25)" }}>
              <Text style={{ width: 22, fontFamily: F.display, fontSize: 13, color: C.gold, textAlign: "center" }}>{i + 1}</Text>
              <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: benim ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{benim ? t("onl.han.sen") : p.ad}</Text>
              {sozIstiyor(p.hesap) ? <GameIcon name="star" size={14} color={C.goldBright} /> : null}
            </Pressable>;
          })}
          <Text style={notStil}>{t("onl.han.siraNot")}</Text>
        </View>
      </> : null}

      {basBen ? <View style={{ gap: 6 }}>
        <Baslik2 metin={t("onl.han.ayarBaslik")} rtl={rtl} />
        {([["kavgaYasak", "crossed-swords", !!masa.ayar.kavgaYasak], ["kilitli", "shield", !!masa.ayar.kilitli], ["sesli", "speaker", !!masa.ayar.sesli], ["sahneIzin", "lyre", !masa.ayar.sahneYasak], ["ozel", "ring", masa.ayar.tur === "ozel"]] as const).map(([alan, ikon, deger]) =>
          <Pressable key={alan} accessibilityRole="switch" accessibilityState={{ checked: deger, disabled: !acik }} accessibilityLabel={t("onl.han.ayar." + alan)} disabled={!acik}
            onPress={() => {
              hap("tap");
              if (alan === "ozel") m.ayar({ tur: deger ? "acik" : "ozel" });
              else if (alan === "sahneIzin") m.ayar({ sahneYasak: deger });
              else m.ayar({ [alan]: !deger });
            }}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: deger ? C.goldBright : ONL.frame }}>
            <GameIcon name={ikon} size={15} color={deger ? C.goldBright : C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.ayar." + alan)}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 11.5, color: deger ? C.goldBright : C.goldDim }}>{t(deger ? "onl.br.hatirlatAcik" : "onl.br.hatirlatKapali")}</Text>
          </Pressable>)}
        <Text style={notStil}>{t("onl.han.ayarNot")}</Text>
      </View> : masa.ayar.kilitli ? <View style={{ marginTop: 10 }}><Not metin={t("onl.han.kilitliNot")} rtl={rtl} icon="shield" /></View>
        : masa.ayar.tur === "ozel" ? <View style={{ marginTop: 10 }}><Not metin={t(ben && masa.ayar.davet?.includes(ben) ? "onl.han.ozelDavetli" : "onl.han.ozelNot")} rtl={rtl} icon="ring" /></View> : null}

      <View style={{ marginTop: 10, gap: 8 }}>
        <Not metin={t("onl.han.notSohbet")} rtl={rtl} icon="speaker" />
        <Not metin={t("onl.han.notKayit")} rtl={rtl} icon="scroll-open" />
      </View>
    </>}

    {/* kişi kartı: güncel plakadan */}
    <AltPanel acik={!!kisi} onKapat={kartKapat} etiket={kisi ? (kisiBen ? t("onl.han.kendiKoltugun") : kisi.ad) : ""} rtl={rtl} t={t}>
      {kisi && kisiIsaret ? <>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 14, paddingEnd: 36, paddingTop: 6 }}>
          <KoltukPortresi p={kisi} boyut={64} ben={kisiBen} i={kisiIsaret} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: F.display, fontSize: 17, color: kisiBen ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{kisiBen ? `${kisi.ad} · ${t("onl.han.sen")}` : kisi.ad}</Text>
            <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
              {typeof kisi.nam === "number" ? <Rozet icon="medal" metin={applyParams(t("onl.han.isaret.nam"), [kisi.nam])} renk={C.goldBright} /> : null}
              {kisiIsaret.bas ? <Rozet icon="crown" metin={t("onl.han.masaBasi")} renk={C.goldBright} /> : null}
              {kisiIsaret.anlatici ? <Rozet icon="lyre" metin={t("onl.han.sahne.anlatici")} renk={C.emberSoft} /> : null}
              {kisiIsaret.ozan ? <Rozet icon="lyre" metin={t("onl.han.isaret.ozan")} renk={C.goldBright} /> : null}
              {kisiIsaret.mudavim ? <Rozet icon="amphora" metin={t("onl.han.isaret.mudavim")} renk={C.sage} /> : null}
              {kisi.cerceve ? <Rozet icon="gems" metin={t("onl.han.isaret.cerceve")} renk="#F3D27A" /> : null}
              {kisiSira >= 0 ? <Rozet icon="hourglass" metin={applyParams(t("onl.han.isaret.sirada"), [kisiSira + 1])} /> : null}
              {kisiIsaret.soz ? <Rozet icon="star" metin={t("onl.han.isaret.soz")} renk={C.goldBright} /> : null}
              {kisiIsaret.sessiz ? <Rozet icon="speaker" metin={t("onl.han.isaret.sessiz")} renk={C.parchmentMuted} /> : null}
              {kisiIsaret.ses ? <Rozet icon="speaker" metin={t("onl.ses.plaka." + kisiIsaret.ses)} renk={kisiIsaret.ses === "kesik" ? C.ember : C.sage} /> : null}
            </View>
          </View>
        </View>

        {kisiBen ? <>
          {/* kendi koltuğun: ses, yemin, sahne, profil, kalk */}
          {ses.gorunur && kisiOturuyor ? <AltinDugme etiket={t(ses.mik ? "onl.ses.mikKapat" : "onl.ses.mikAc")} icon="speaker" rtl={rtl} bekliyor={ses.bekliyor} kapali={!acik || benKesik || susturuldu} onPress={ses.mikDegistir}
            erisim={t(ses.mik ? "onl.ses.mikKapatErisim" : "onl.ses.mikAcErisim")} /> : null}
          {ses.gorunur && benKesik ? <Text style={notStil}>{t("onl.ses.kesildin")}</Text> : null}
          <CizgiDugme etiket={t("onl.han.eylem.yemin")} icon={EYLEM_IKON.yemin} rtl={rtl} kapali={!acik || !kisiOturuyor} onPress={() => eylemAc("yemin", null)} />
          {kisiOturuyor && !sahne ? <>
            <CizgiDugme etiket={t("onl.han.sahne.ac")} icon="lyre" rtl={rtl} kapali={!acik || !!masa?.ayar.sahneYasak || !!atisma} onPress={() => { m.sahneAc(); kartKapat(); }} />
            <Text style={notStil}>{t(masa?.ayar.sahneYasak ? "onl.han.sahne.yasak" : atisma ? "onl.han.atisma.masaMesgul" : "onl.han.sahne.acNot")}</Text>
          </> : null}
          <CizgiDugme etiket={t("onl.han.profilim")} icon="hood" rtl={rtl} onPress={() => { kartKapat(); router.push("/online/oyuncu/ben"); }} />
          <CizgiDugme etiket={t("onl.han.kalk")} icon="walk" rtl={rtl} kapali={!acik} onPress={() => { m.kalk(); kartKapat(); }} />
        </> : <>
          <View style={{ flexDirection: yon(rtl), gap: 8 }}>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.han.profileGit")} icon="hood" rtl={rtl} kapali={!kisiProfil} onPress={() => { if (!kisiProfil) return; kartKapat(); router.push(`/online/oyuncu/${kisiProfil}`); }} /></View>
            <View style={{ flex: 1 }}><AltinDugme etiket={t("onl.han.armaganGonder")} icon="gems" rtl={rtl} kapali={!acik || !oturuyor} onPress={() => panelAc("armagan", kisi.hesap)} /></View>
          </View>
          {!kisiProfil ? <Text style={notStil}>{t("onl.han.profilYok")}</Text> : null}
          {!oturuyor ? <Text style={notStil}>{t("onl.han.oturunca")}</Text> : null}

          {sahneYoneticisi && kisiOturuyor && sahne && kisi.hesap !== sahne.anlatici ? <>
            <Baslik2 metin={t("onl.han.sahne.baslik")} rtl={rtl} ust={4} />
            {sahne.soz.includes(kisi.hesap)
              ? <CizgiDugme etiket={t("onl.han.sahne.sozGeriAl")} icon="star" rtl={rtl} kapali={!acik} onPress={() => { m.sozVer(kisi.hesap, false); kartKapat(); }} />
              : sahne.istek.includes(kisi.hesap) ? <View style={{ flexDirection: yon(rtl), gap: 8 }}>
                <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.ses.sozVer")} icon="star" rtl={rtl} kapali={!acik} onPress={() => { m.sozVer(kisi.hesap); kartKapat(); }} /></View>
                <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.ses.reddet")} rtl={rtl} kapali={!acik} onPress={() => { m.sozVer(kisi.hesap, false); kartKapat(); }} /></View>
              </View>
              : <Text style={notStil}>{t("onl.han.sahne.sozIstemedi")}</Text>}
          </> : null}

          <Baslik2 metin={t("onl.han.kisiEylemleri")} rtl={rtl} ust={4} />
          <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
            {(kisiOturuyor ? OTURANA : (["ihbar"] as SecimEylemi[])).map((e) => {
              const yasak = (e === "meydanOku" && !!masa?.ayar.kavgaYasak) || (e === "atisma" && mesgul);
              return <View key={e} style={{ width: "48%", flexGrow: 1 }}>
                <CizgiDugme etiket={t("onl.han.eylem." + e)} icon={EYLEM_IKON[e]} rtl={rtl} kucuk kapali={!acik || !oturuyor || yasak} onPress={() => eylemAc(e, kisi.hesap)} />
              </View>;
            })}
          </View>
          {masa?.ayar.kavgaYasak && kisiOturuyor ? <Text style={[notStil, { color: C.ember }]}>{t("onl.han.kavgaYasakNot")}</Text> : null}
          {mesgul && kisiOturuyor ? <Text style={notStil}>{t("onl.han.atisma.masaMesgul")}</Text> : null}

          {d.sessiz.includes(kisi.hesap)
            ? <CizgiDugme etiket={t("onl.han.sesiAc")} icon="speaker" rtl={rtl} kapali={!acik} onPress={() => { m.susturKaldir(kisi.hesap); kartKapat(); }} />
            : <CizgiDugme etiket={t("onl.han.sessizeAl")} icon="speaker" rtl={rtl} kapali={!acik} onPress={() => { m.sustur(kisi.hesap); kartKapat(); }} />}
          <Text style={notStil}>{t("onl.han.sessizNot")}</Text>
          {ses.gorunur ? <Text style={notStil}>{t("onl.ses.yerelNot")}</Text> : null}

          {basBen ? <>
            <Baslik2 metin={t("onl.han.moderasyon")} rtl={rtl} ust={4} />
            {ses.gorunur ? (ses.kesik(kisi.hesap)
              ? <CizgiDugme etiket={t("onl.ses.sesiniAc")} icon="speaker" rtl={rtl} kapali={!acik} onPress={() => { m.sesAc(kisi.hesap); kartKapat(); }} />
              : <CizgiDugme etiket={t("onl.ses.sesiniKes")} icon="speaker" rtl={rtl} kapali={!acik} onPress={() => { m.sesKapat(kisi.hesap); kartKapat(); }} />) : null}
            {kisiSira >= 0 ? <CizgiDugme etiket={t("onl.han.oneAl")} icon="hourglass" rtl={rtl} kapali={!acik} onPress={() => { m.oneAl(kisi.hesap); kartKapat(); }} /> : null}
            {masa?.ayar.tur === "ozel" ? (masa.ayar.davet?.includes(kisi.hesap)
              ? <CizgiDugme etiket={t("onl.han.davetKaldir")} icon="ring" rtl={rtl} kapali={!acik} onPress={() => { m.davet(kisi.hesap, true); kartKapat(); }} />
              : <CizgiDugme etiket={t("onl.han.davetEt")} icon="ring" rtl={rtl} kapali={!acik} onPress={() => { m.davet(kisi.hesap); kartKapat(); }} />) : null}
            {onay === "at" ? <View style={{ gap: 6 }}>
              <Text accessibilityRole="alert" style={[notStil, { color: C.ember }]}>{applyParams(t("onl.han.atOnay"), [kisi.ad])}</Text>
              <View style={{ flexDirection: yon(rtl), gap: 8 }}>
                <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.han.vazgec")} rtl={rtl} kucuk onPress={() => setOnay(null)} /></View>
                <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.han.masadanCikar")} icon="walk" rtl={rtl} kucuk kapali={!acik} onPress={() => { m.at(kisi.hesap); kartKapat(); }} /></View>
              </View>
            </View> : <CizgiDugme etiket={t("onl.han.masadanCikar")} icon="walk" rtl={rtl} kapali={!acik} onPress={() => setOnay("at")} />}
            <Text style={notStil}>{t("onl.han.atNot")}</Text>
          </> : null}

          {kisiProfil ? (onay === "engelle" ? <View style={{ gap: 6 }}>
            <Text accessibilityRole="alert" style={[notStil, { color: C.ember }]}>{t("onl.tp.engel.engelleAlt")}</Text>
            <View style={{ flexDirection: yon(rtl), gap: 8 }}>
              <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.han.vazgec")} rtl={rtl} kucuk onPress={() => setOnay(null)} /></View>
              <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.tp.engel.engelle")} icon="shield" rtl={rtl} kucuk kapali={!!toplum.islem} onPress={() => { void engelle(kisiProfil); }} /></View>
            </View>
          </View> : <CizgiDugme etiket={t("onl.tp.engel.engelle")} icon="shield" rtl={rtl} onPress={() => setOnay("engelle")} />) : null}
          <CizgiDugme etiket={t("onl.han.sikayet")} icon="shield" rtl={rtl} onPress={() => panelAc("rapor", kisi.hesap)} />
        </>}
      </> : null}
    </AltPanel>

    {/* eylem paneli: tür ve hedef kişi kartından gelir */}
    <AltPanel acik={panel === "eylem"} onKapat={() => setPanel(null)} etiket={t("onl.han.eylem." + eylemTur)} rtl={rtl} t={t}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingEnd: 36 }}>
        <GameIcon name={EYLEM_IKON[eylemTur] ?? "scroll"} size={20} color={C.goldBright} />
        <Text accessibilityRole="header" numberOfLines={2} style={{ flex: 1, fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl) }}>
          {hedef ? applyParams(t("onl.han.eylemBaslik"), [t("onl.han.eylem." + eylemTur), hedefAd]) : t("onl.han.eylem." + eylemTur)}
        </Text>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.eylemAcik." + eylemTur)}</Text>
      {eylemTur === "meydanOku" && masa?.ayar.kavgaYasak ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.ember, textAlign: hiza(rtl) }}>{t("onl.han.kavgaYasakNot")}</Text> : null}
      {eylemTur === "yemin" ? <Text style={notStil}>{t(o.yerlesim?.ben.muhurlu ? "onl.han.yeminMuhurlu" : "onl.han.yeminMuhursuz")}</Text> : null}
      <Text style={notStil}>{t("onl.han.taniklikNot")}</Text>
      {EYLEM_FORM[eylemTur].sart ? <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.han.sart")}</Text>
        <TextInput value={sart} onChangeText={(v) => setSart(v.replace(/[\r\n]+/g, " "))} multiline maxLength={SART_EN_UZUN * 2} accessibilityLabel={t("onl.han.sart")} placeholder={t("onl.han.sartIpucu." + eylemTur)} placeholderTextColor={C.parchmentMuted}
          style={{ minHeight: 64, borderRadius: 8, borderWidth: 1, borderColor: ONL.frameHi, backgroundColor: "rgba(14,10,6,0.9)", color: C.parchment, fontFamily: F.serif, fontSize: 15.5, padding: 10, textAlign: hiza(rtl), textAlignVertical: "top" }} />
        <Text style={{ fontFamily: F.serif, fontSize: 12, color: harfSayisi(tekSatir(sart)) > SART_EN_UZUN ? C.ember : C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.han.harfKaldi"), [Math.max(0, SART_EN_UZUN - harfSayisi(tekSatir(sart))), SART_EN_UZUN])}</Text>
      </View> : null}
      <Not metin={applyParams(t("onl.han.kayitNotu"), [masa?.koltuklar.filter(Boolean).length ?? 0])} rtl={rtl} icon="scroll-open" />
      {hedef && !hedefMasada ? <Text style={notStil}>{applyParams(t("onl.han.ag.hedefGitti"), [hedefAd])}</Text> : null}
      {panelHatasi}
      <AltinDugme etiket={t("onl.han.eylem." + eylemTur)} icon={EYLEM_IKON[eylemTur]} rtl={rtl} bekliyor={bekliyor}
        kapali={!oturuyor || (!!hedef && !hedefMasada) || (EYLEM_FORM[eylemTur].hedef === "zorunlu" && !hedef) || (eylemTur === "meydanOku" && !!masa?.ayar.kavgaYasak) || (eylemTur === "atisma" && mesgul) || (EYLEM_FORM[eylemTur].sart && (!tekSatir(sart) || harfSayisi(tekSatir(sart)) > SART_EN_UZUN))}
        onPress={() => { void eylemGonder(eylemTur, hedef ?? undefined); }} />
    </AltPanel>

    {/* armağan çekmecesi: ikram (akçe) ve Debdebe */}
    <ArmaganCekmecesi acik={panel === "armagan"} oturum={panelNo.current} onKapat={() => setPanel(null)} hedef={hedef ? { hesap: hedef, ad: hedefAd } : null} hedefMasada={hedefMasada} masa={no} istemci={istemci}
      menu={menu} onMenu={(s) => setMenu((x) => (x?.some((y) => y.id === s.id) ? x : [...(x ?? []), s]))} para={o.yerlesim?.ben.para} oturuyor={oturuyor} rtl={rtl} t={t}
      onSonuc={armaganSonucu} />

    {/* şikâyet paneli */}
    <AltPanel acik={panel === "rapor"} onKapat={() => { setPanel(null); setRaporBekliyor(false); }} etiket={t("onl.han.sikayet")} rtl={rtl} t={t}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{hedef ? applyParams(t("onl.han.sikayetBaslik"), [hedefAd]) : t("onl.han.sikayet")}</Text>
      <View style={{ gap: 6 }}>
        {SIKAYET_NEDENLERI.map((n) => <SecimOgesi key={n} bicim="satir" metin={t("onl.han.neden." + n)} secili={neden === n} rtl={rtl} onPress={() => setNeden(n)} />)}
      </View>
      <TextInput value={aciklama} onChangeText={setAciklama} multiline maxLength={200} accessibilityLabel={t("onl.han.aciklama")} placeholder={t("onl.han.aciklama")} placeholderTextColor={C.parchmentMuted}
        style={{ minHeight: 60, borderRadius: 8, borderWidth: 1, borderColor: ONL.frameHi, backgroundColor: "rgba(14,10,6,0.9)", color: C.parchment, fontFamily: F.serif, fontSize: 15.5, padding: 10, textAlign: hiza(rtl), textAlignVertical: "top" }} />
      <Not metin={t("onl.han.sikayetNot")} rtl={rtl} icon="shield" />
      {panelHatasi}
      <AltinDugme etiket={t("onl.han.sikayetGonder")} icon="shield" rtl={rtl} bekliyor={raporBekliyor} kapali={!acik} onPress={raporGonder} />
    </AltPanel>
  </HanSayfa>;
}

export default function OnlineMasa() {
  return onlineEkranAcik() ? <OnlineKapisi><MasaEkran /></OnlineKapisi> : <OnlineYakinda />;
}
