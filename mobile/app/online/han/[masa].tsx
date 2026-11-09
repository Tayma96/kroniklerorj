// Han masası (Faz 10): koltuklar yuvarlak masanın çevresinde isim plakalarıyla, ayaktakiler ve sıra, sohbet akışı
// (240 harf; saklanmaz), otur/kalk, sessize al, şikâyet, masa başına at/öne al, butonlu eylemler (yemin, sözleşme,
// ittifak, ihbar, meydan okuma; masadakiler kayda geçer), ikram menüsü ve anonslar. Bağlantı han-soket.ts'te.
import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useI18n, applyParams } from "../../../lib/i18n";
import { C, F } from "../../../lib/theme";
import { GameIcon } from "../../../lib/icons";
import { hap } from "../../../lib/haptics";
import { DesignPressable as Pressable } from "../../../lib/design-pressable";
import { OnlineYakinda } from "../../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../../lib/online/durum";
import { onlineEkranAcik } from "../../../lib/online/kapi";
import { istekNoUret } from "../../../lib/online/depo";
import { AltinDugme, Bant, Cerceve, CizgiDugme, GeriDugme, ONL, geriGit, hiza, yon } from "../../../lib/online/ui";
import { AltPanel, Baslik2, Rozet, SayfaBasi, Yukleniyor } from "../../../lib/online/yasam-ui";
import { ekHataAnahtari } from "../../../lib/online/ek-istemci";
import {
  HAN_EYLEMLERI, IKRAMLAR, KAPANIS, ILETI_EN_UZUN, KOLTUK_SAYISI, SART_EN_UZUN, SIKAYET_NEDENLERI, harfSayisi, tekSatir, useHanIstemci,
  type HanEylemi, type IkramId, type MasaOlayi, type MenuSatiri, type Plaka, type SikayetNedeni,
} from "../../../lib/online/han-veri";
import { kapanisAnahtari, useMasa, type AkisOgesi } from "../../../lib/online/han-soket";
import { AnonsSeridi, EYLEM_IKON, HanSayfa, IKRAM_IKON, IsimPlakasi, Not } from "../../../lib/online/han-ui";
import type { Dil } from "../../../lib/online/protokol";

type Ceviri = (k: string) => string;
type SecimEylemi = Exclude<HanEylemi, "kabul">;
const SECIM_EYLEMLERI = HAN_EYLEMLERI.filter((e): e is SecimEylemi => e !== "kabul");
/** Sunucu kurallarının görünür kopyası (yalnız formu kurmak için; doğrulama sunucuda). */
const EYLEM_FORM: Record<SecimEylemi, { hedef: "zorunlu" | "secimli"; sart: boolean }> = {
  yemin: { hedef: "secimli", sart: true }, sozlesme: { hedef: "zorunlu", sart: true }, ittifak: { hedef: "zorunlu", sart: false },
  ihbar: { hedef: "zorunlu", sart: false }, meydanOku: { hedef: "zorunlu", sart: false },
};
const BESTE_HAN = 64; // yazı kutusu yüksekliği

function masaNo(param: unknown): number {
  const n = Number(Array.isArray(param) ? param[0] : param);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : 1;
}

/** Yuvarlak masa ve çevresindeki koltuklar (koltuk sayısına göre elips üstünde eşit aralık). */
function MasaCizimi({ koltuklar, ben, bas, sessiz, rtl, t, onKoltuk, no, ayakta }: {
  koltuklar: (Plaka | null)[]; ben: string | null; bas: string | null; sessiz: string[]; rtl: boolean; t: Ceviri; no: number; ayakta: number;
  onKoltuk: (i: number, p: Plaka | null) => void;
}) {
  const { width } = useWindowDimensions();
  const W = Math.min(width - 32, 460);
  const plakaW = Math.max(78, Math.min(112, Math.round(W * 0.3)));
  const H = 330;
  const rx = W / 2 - plakaW / 2;
  const ry = H / 2 - 36;
  const n = koltuklar.length || KOLTUK_SAYISI;
  const benOturuyor = !!ben && koltuklar.some((p) => p?.hesap === ben);
  return <View style={{ width: W, height: H, alignSelf: "center" }}>
    {/* masa */}
    <View pointerEvents="none" style={{ position: "absolute", left: W / 2 - W * 0.2, top: H / 2 - 50, width: W * 0.4, height: 100, borderRadius: 999, borderWidth: 2, borderColor: "#6B4F2A", overflow: "hidden", shadowColor: "#FFAA44", shadowOpacity: 0.35, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } }}>
      <LinearGradient colors={["#6A4524", "#3E2714", "#2A190C"]} style={StyleSheet.absoluteFill} />
      <View style={{ position: "absolute", top: 6, left: 6, right: 6, bottom: 6, borderRadius: 999, borderWidth: 1, borderColor: "rgba(232,196,106,0.25)" }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}>
        <GameIcon name="flame" size={18} color={C.emberSoft} />
        <Text style={{ fontFamily: F.display, fontSize: 12, color: C.goldBright }}>{applyParams(t("onl.han.masaNo"), [no])}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>{applyParams(t("onl.han.ayakta"), [ayakta])}</Text>
      </View>
    </View>
    {Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const x = (rtl ? -1 : 1) * Math.cos(a) * rx;
      const y = Math.sin(a) * ry;
      const p = koltuklar[i] ?? null;
      const left = W / 2 + x - plakaW / 2;
      const top = H / 2 + y - 35;
      const benim = !!p && p.hesap === ben;
      const etiket = p ? `${applyParams(t("onl.han.koltuk"), [i + 1])}: ${p.ad}${p.hesap === bas ? ", " + t("onl.han.masaBasi") : ""}` : `${applyParams(t("onl.han.koltuk"), [i + 1])}: ${t(benOturuyor ? "onl.han.bosKoltuk" : "onl.han.oturErisim")}`;
      return <Pressable key={i} accessibilityRole="button" accessibilityLabel={etiket} onPress={() => { hap("tap"); onKoltuk(i, p); }}
        style={({ pressed }) => ({ position: "absolute", left, top, width: plakaW, minHeight: 70, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
        {p ? <IsimPlakasi plaka={p} ben={benim} bas={p.hesap === bas} sessiz={sessiz.includes(p.hesap)} genislik={plakaW} rtl={rtl} />
          : <View style={{ width: plakaW, minHeight: 70, borderRadius: 9, borderWidth: 1, borderStyle: "dashed", borderColor: "rgba(201,162,78,0.55)", backgroundColor: "rgba(14,10,6,0.55)", alignItems: "center", justifyContent: "center", gap: 2, paddingHorizontal: 4 }}>
            <GameIcon name="house" size={14} color={C.goldDim} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 11, color: benOturuyor ? C.parchmentMuted : C.goldBright }}>{t(benOturuyor ? "onl.han.bosKoltuk" : "onl.han.otur")}</Text>
          </View>}
      </Pressable>;
    })}
  </View>;
}

function zamanYaz(ms: number, lang: string) {
  try { return new Date(ms).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
}

function MasaEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const ins = useSafeAreaInsets();
  const { masa: param } = useLocalSearchParams<{ masa?: string }>();
  const no = masaNo(param);
  const o = useOnline();
  const istemci = useHanIstemci();
  const m = useMasa(o.profil ? no : undefined);
  const d = m.durum;
  const [metin, setMetin] = useState("");
  const [kisi, setKisi] = useState<Plaka | null>(null);
  const [panel, setPanel] = useState<null | "eylem" | "ikram" | "rapor">(null);
  const [hedef, setHedef] = useState<string | null>(null);
  const [eylemTur, setEylemTur] = useState<SecimEylemi>("yemin");
  const [sart, setSart] = useState("");
  const [ikram, setIkram] = useState<IkramId>("serbet");
  const [neden, setNeden] = useState<SikayetNedeni>("kufur");
  const [aciklama, setAciklama] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuSatiri[] | null>(null);
  const istekNo = useRef<string>(istekNoUret());
  const akisKutu = useRef<ScrollView>(null);

  // Fiyatlar sunucudan: GET /v1/han menüsü (yoksa ilk ikram yanıtındaki fiyat öğrenilir).
  useEffect(() => {
    let iptal = false;
    if (o.profil) void istemci.han(lang as Dil).then((s) => { if (!iptal && s.ok && s.deger.menu) setMenu(s.deger.menu); });
    return () => { iptal = true; };
  }, [istemci, lang, o.profil?.hesapId]); // eslint-disable-line react-hooks/exhaustive-deps
  const ilkRapor = useRef(d.raporlandi);
  useEffect(() => { if (d.raporlandi > ilkRapor.current) { setBilgi(t("onl.han.raporAlindi")); ilkRapor.current = d.raporlandi; } }, [d.raporlandi, t]);
  useEffect(() => { const z = setTimeout(() => akisKutu.current?.scrollToEnd({ animated: true }), 60); return () => clearTimeout(z); }, [d.akis.length]);

  const masa = d.masa;
  const ben = d.ben?.hesap ?? null;
  const tumPlakalar = useMemo(() => [...(masa?.koltuklar.filter((p): p is Plaka => !!p) ?? []), ...(masa?.sira ?? [])], [masa]);
  const adBul = (h: string) => (h === ben ? d.ben?.ad ?? t("onl.han.sen") : tumPlakalar.find((p) => p.hesap === h)?.ad ?? t("onl.han.birMisafir"));
  const oturuyor = !!ben && !!masa?.koltuklar.some((p) => p?.hesap === ben);
  const siradaYer = masa && ben ? masa.sira.findIndex((p) => p.hesap === ben) : -1;
  const basBen = !!ben && masa?.masaBasi === ben;
  const bosVar = !!masa?.koltuklar.some((p) => p === null);
  const digerOturanlar = (masa?.koltuklar.filter((p): p is Plaka => !!p && p.hesap !== ben)) ?? [];
  const susturuldu = !!d.susturma && (d.susturma.bitis === null || d.susturma.bitis > Date.now());
  const acik = d.bag === "acik" && !!masa;

  const panelAc = (p: "eylem" | "ikram" | "rapor", h: string | null) => { istekNo.current = istekNoUret(); setHedef(h); setKisi(null); setPanel(p); setBilgi(null); };
  const gonder = () => {
    const m2 = tekSatir(metin);
    if (!m2 || harfSayisi(m2) > ILETI_EN_UZUN) return;
    if (m.yaz(m2)) setMetin("");
  };
  const eylemGonder = async (tur: HanEylemi, h?: string, olayNo?: number) => {
    setBekliyor(true);
    const s = await istemci.eylem({ masa: no, tur, istekNo: istekNo.current, ...(h ? { hedef: h } : {}), ...(olayNo !== undefined ? { olay: olayNo } : {}), ...(EYLEM_FORM[tur as SecimEylemi]?.sart && tekSatir(sart) ? { sart: tekSatir(sart) } : {}) });
    setBekliyor(false);
    if (s.ok) { setPanel(null); setSart(""); setBilgi(t("onl.han.eylemYazildi")); istekNo.current = istekNoUret(); }
    else m.hataGoster(s.hata, s.bitis);
  };
  const ikramGonder = async () => {
    if (!hedef) return;
    setBekliyor(true);
    const s = await istemci.ikram({ masa: no, hedef, ikram, istekNo: istekNo.current });
    setBekliyor(false);
    if (s.ok) {
      setPanel(null);
      setMenu((x) => (x?.some((y) => y.id === ikram) ? x : [...(x ?? []), { id: ikram, fiyat: s.deger.fiyat }]));
      setBilgi(applyParams(t("onl.han.ikramGitti"), [t("onl.han.ikram." + ikram), adBul(hedef), s.deger.fiyat, s.deger.para]));
      istekNo.current = istekNoUret();
      void o.yerlesimYukle(true);
    } else m.hataGoster(s.hata, s.bitis);
  };
  const raporGonder = () => {
    if (!hedef) return;
    if (m.rapor(hedef, neden, aciklama)) { setPanel(null); setAciklama(""); }
  };

  const olayMetni = (x: MasaOlayi) => {
    const k = x.tur === "kabul" ? "onl.han.olay.kabul" : x.tur === "atma" ? "onl.han.olay.atma" : x.hedef ? `onl.han.olay.${x.tur}` : `onl.han.olay.${x.tur}Yalniz`;
    return applyParams(t(k), [adBul(x.kim), x.hedef ? adBul(x.hedef) : "", x.katilim.length]);
  };
  const akisCiz = (a: AkisOgesi) => {
    if (a.tur === "anons") return <AnonsSeridi anons={a.anons} ad={adBul} rtl={rtl} t={t} />;
    if (a.tur === "olay") {
      const x = a.olay;
      const kabulBekliyor = (x.tur === "sozlesme" || x.tur === "ittifak") && x.durum === "teklif" && d.kabuller[x.no] === undefined;
      const bana = kabulBekliyor && x.hedef === ben;
      return <View accessible={!bana} style={{ borderRadius: 9, borderWidth: 1, borderColor: "rgba(201,162,78,0.55)", backgroundColor: "rgba(36,26,14,0.92)", padding: 10, gap: 6 }}>
        <View style={{ flexDirection: yon(rtl), gap: 8, alignItems: "center" }}>
          <GameIcon name={EYLEM_IKON[x.tur] ?? "scroll"} size={16} color={C.goldBright} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 19, color: C.parchment, textAlign: hiza(rtl) }}>{olayMetni(x)}</Text>
        </View>
        {x.sart ? <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{`“${x.sart}”`}</Text> : null}
        <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <Rozet icon="scroll-open" metin={applyParams(t("onl.han.kayitta"), [x.katilim.length])} />
          {kabulBekliyor ? <Rozet metin={t("onl.han.teklifBekliyor")} renk={C.ember} /> : (x.tur === "sozlesme" || x.tur === "ittifak") && d.kabuller[x.no] !== undefined ? <Rozet metin={t("onl.han.kabulEdildi")} renk={C.sage} dolu /> : null}
        </View>
        {bana ? <CizgiDugme etiket={t("onl.han.kabulEt")} icon="ring" rtl={rtl} kucuk kapali={bekliyor || !oturuyor} onPress={() => { istekNo.current = istekNoUret(); void eylemGonder("kabul", undefined, x.no); }} /> : null}
      </View>;
    }
    const benim = a.hesap === ben;
    return <View accessible accessibilityLabel={`${a.ad}: ${a.metin}`} style={{ alignSelf: benim ? (rtl ? "flex-start" : "flex-end") : rtl ? "flex-end" : "flex-start", maxWidth: "88%", borderRadius: 10, borderWidth: 1, borderColor: benim ? "rgba(243,210,122,0.6)" : "rgba(201,162,78,0.3)", backgroundColor: benim ? "rgba(70,50,22,0.92)" : "rgba(20,14,8,0.88)", paddingHorizontal: 10, paddingVertical: 7, gap: 2 }}>
      <View style={{ flexDirection: yon(rtl), gap: 8, alignItems: "baseline" }}>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 11.5, color: benim ? C.goldBright : C.gold }}>{benim ? t("onl.han.sen") : a.ad}</Text>
        <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: C.parchmentMuted }}>{zamanYaz(a.zaman, lang)}</Text>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 20, color: C.parchment, textAlign: hiza(rtl) }}>{a.metin}</Text>
    </View>;
  };

  const kalan = ILETI_EN_UZUN - harfSayisi(tekSatir(metin));
  const yazamaz = !acik || !oturuyor || susturuldu;
  const yaziKutusu = <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
    <View style={{ paddingBottom: ins.bottom + 8, paddingTop: 8, paddingHorizontal: 12, borderTopWidth: 1, borderColor: ONL.frame, backgroundColor: "rgba(17,12,7,0.97)", gap: 4 }}>
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
    </View>
  </KeyboardAvoidingView>;

  const suresiz = d.susturma?.bitis === null;
  return <HanSayfa alt={yaziKutusu} altYukseklik={BESTE_HAN + 30}>
    <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6 }}>
      <GeriDugme rtl={rtl} etiket={t("onl.han.hanaDon")} onPress={() => geriGit(router, "/online/han")} />
      <View style={{ flex: 1 }} />
      {masa ? <Rozet icon="walk" metin={applyParams(t("onl.han.ayakta"), [masa.ayakta])} /> : null}
    </View>
    <View style={{ marginTop: 6 }}>
      <SayfaBasi ust={t("onl.han.ust")} baslik={applyParams(t("onl.han.masaNo"), [no])} alt={masa ? (masa.ayar.kavgaYasak ? t("onl.han.kavgaYasakAlt") : t("onl.han.acikMasaAlt")) : undefined} rtl={rtl} />
    </View>

    {/* bağlantı ve hata bantları */}
    <View style={{ marginTop: 10, gap: 8 }}>
      {!o.profil && o.hazir ? <Bant tur="bilgi" metin={t("onl.v.profilYok")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={() => router.replace("/online")} /> : null}
      {d.bag === "yeniden" ? <Bant tur="bilgi" metin={applyParams(t("onl.han.yenidenBaglaniyor"), [d.deneme])} rtl={rtl} /> : null}
      {d.bag === "kapandi" ? <Bant metin={t(d.kapanis === null && d.hata ? ekHataAnahtari(d.hata.kod) : kapanisAnahtari(d.kapanis))} rtl={rtl}
        eylem={t(d.kapanis === KAPANIS.atildi ? "onl.han.hanaDon" : "onl.han.yenidenBaglan")} onEylem={() => (d.kapanis === KAPANIS.atildi ? geriGit(router, "/online/han") : m.yenidenBaglan())} /> : null}
      {d.hata && d.bag !== "kapandi" ? <Bant metin={d.hata.kod === "susturuldu" ? (d.hata.bitis ? applyParams(t("onl.han.susturulduBitis"), [new Date(d.hata.bitis).toLocaleString(lang)]) : t("onl.han.susturulduSuresiz")) : t(ekHataAnahtari(d.hata.kod))} rtl={rtl} eylem={t("onl.kapat")} onEylem={m.hataTemizle} /> : null}
      {bilgi ? <Bant tur="bilgi" metin={bilgi} rtl={rtl} eylem={t("onl.kapat")} onEylem={() => setBilgi(null)} /> : null}
      {d.sonAnons ? <AnonsSeridi key={d.sonAnons.id} anons={d.sonAnons} ad={adBul} rtl={rtl} t={t} buyuk /> : null}
    </View>

    {!masa ? (d.bag === "kapandi" ? null : <Yukleniyor metin={t("onl.han.baglaniyor")} />) : <>
      <View style={{ marginTop: 12 }}>
        <MasaCizimi koltuklar={masa.koltuklar} ben={ben} bas={masa.masaBasi} sessiz={d.sessiz} rtl={rtl} t={t} no={no} ayakta={masa.ayakta}
          onKoltuk={(i, p) => {
            if (!p) { if (!oturuyor) m.otur(i); return; }
            setKisi(p);
          }} />
      </View>

      {/* otur / kalk / sıra */}
      <View style={{ marginTop: 6, gap: 8 }}>
        {oturuyor ? <CizgiDugme etiket={t("onl.han.kalk")} icon="walk" rtl={rtl} kucuk kapali={!acik} onPress={() => m.kalk()} />
          : siradaYer >= 0 ? <CizgiDugme etiket={applyParams(t("onl.han.siradanCik"), [siradaYer + 1])} icon="walk" rtl={rtl} kucuk kapali={!acik} onPress={() => m.kalk()} />
          : <AltinDugme etiket={t(bosVar ? "onl.han.bosaOtur" : "onl.han.siraGir")} icon={bosVar ? "house" : "hourglass"} rtl={rtl} kapali={!acik} onPress={() => m.otur()} />}
        {susturuldu ? <Not metin={suresiz ? t("onl.han.susturulduSuresiz") : applyParams(t("onl.han.susturulduBitis"), [new Date(d.susturma!.bitis!).toLocaleString(lang)])} rtl={rtl} icon="speaker" /> : null}
      </View>

      {masa.sira.length ? <>
        <Baslik2 metin={applyParams(t("onl.han.siraBaslik"), [masa.sira.length])} rtl={rtl} />
        <View style={{ gap: 6 }}>
          {masa.sira.map((p, i) => <Pressable key={p.hesap} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${p.ad}`} onPress={() => { hap("tap"); if (p.hesap !== ben) setKisi(p); }}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(14,10,6,0.7)", borderWidth: 1, borderColor: "rgba(201,162,78,0.25)" }}>
            <Text style={{ width: 22, fontFamily: F.display, fontSize: 13, color: C.gold, textAlign: "center" }}>{i + 1}</Text>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: p.hesap === ben ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{p.hesap === ben ? t("onl.han.sen") : p.ad}</Text>
          </Pressable>)}
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.han.siraNot")}</Text>
        </View>
      </> : null}

      {/* eylemler ve ikram */}
      <Baslik2 metin={t("onl.han.eylemler")} rtl={rtl} />
      <View style={{ flexDirection: yon(rtl), gap: 8 }}>
        <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.han.eylemYap")} icon="scales" rtl={rtl} kucuk kapali={!acik || !oturuyor} onPress={() => panelAc("eylem", digerOturanlar[0]?.hesap ?? null)} /></View>
        <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.han.ikramEt")} icon="amphora" rtl={rtl} kucuk kapali={!acik || !oturuyor || !tumPlakalar.some((p) => p.hesap !== ben)} onPress={() => panelAc("ikram", digerOturanlar[0]?.hesap ?? null)} /></View>
      </View>
      {!oturuyor ? <Text style={{ marginTop: 6, fontFamily: F.serifItalic, fontSize: 13, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.han.oturunca")}</Text> : null}

      {/* sohbet */}
      <Baslik2 metin={t("onl.han.sohbet")} rtl={rtl} />
      <Cerceve ic={{ padding: 0 }}>
        <ScrollView ref={akisKutu} nestedScrollEnabled style={{ maxHeight: 340 }} contentContainerStyle={{ padding: 10, gap: 8 }}>
          {d.akis.length ? d.akis.map((a) => <View key={a.id}>{akisCiz(a)}</View>)
            : <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: "center", paddingVertical: 18 }}>{t("onl.han.sessizMasa")}</Text>}
        </ScrollView>
      </Cerceve>
      <View style={{ marginTop: 10, gap: 8 }}>
        <Not metin={t("onl.han.notSohbet")} rtl={rtl} icon="speaker" />
        <Not metin={t("onl.han.notKayit")} rtl={rtl} icon="scroll-open" />
      </View>
    </>}

    {/* kişi paneli */}
    <AltPanel acik={!!kisi} onKapat={() => setKisi(null)} etiket={kisi?.ad ?? ""} rtl={rtl} t={t}>
      {kisi ? <>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingEnd: 36 }}>
          <IsimPlakasi plaka={kisi} bas={kisi.hesap === masa?.masaBasi} ben={kisi.hesap === ben} sessiz={d.sessiz.includes(kisi.hesap)} genislik={180} rtl={rtl} />
          {kisi.hesap === masa?.masaBasi ? <Rozet icon="crown" metin={t("onl.han.masaBasi")} renk={C.goldBright} /> : null}
        </View>
        {kisi.hesap === ben ? <CizgiDugme etiket={t("onl.han.kalk")} icon="walk" rtl={rtl} onPress={() => { m.kalk(); setKisi(null); }} /> : <>
          <CizgiDugme etiket={t("onl.han.ikramEt")} icon="amphora" rtl={rtl} kapali={!oturuyor} onPress={() => panelAc("ikram", kisi.hesap)} />
          <CizgiDugme etiket={t("onl.han.eylemYap")} icon="scales" rtl={rtl} kapali={!oturuyor} onPress={() => panelAc("eylem", kisi.hesap)} />
          {d.sessiz.includes(kisi.hesap)
            ? <CizgiDugme etiket={t("onl.han.sesiAc")} icon="speaker" rtl={rtl} onPress={() => { m.susturKaldir(kisi.hesap); setKisi(null); }} />
            : <CizgiDugme etiket={t("onl.han.sessizeAl")} icon="speaker" rtl={rtl} onPress={() => { m.sustur(kisi.hesap); setKisi(null); }} />}
          <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.han.sessizNot")}</Text>
          <CizgiDugme etiket={t("onl.han.sikayet")} icon="shield" rtl={rtl} onPress={() => panelAc("rapor", kisi.hesap)} />
          {basBen && masa?.sira.some((p) => p.hesap === kisi.hesap) ? <CizgiDugme etiket={t("onl.han.oneAl")} icon="hourglass" rtl={rtl} onPress={() => { m.oneAl(kisi.hesap); setKisi(null); }} /> : null}
          {basBen ? <CizgiDugme etiket={t("onl.han.masadanCikar")} icon="walk" rtl={rtl} onPress={() => { m.at(kisi.hesap); setKisi(null); }} /> : null}
          {basBen ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.han.atNot")}</Text> : null}
        </>}
      </> : null}
    </AltPanel>

    {/* eylem paneli */}
    <AltPanel acik={panel === "eylem"} onKapat={() => setPanel(null)} etiket={t("onl.han.eylemYap")} rtl={rtl} t={t}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.han.eylemYap")}</Text>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
        {SECIM_EYLEMLERI.map((e) => {
          const yasak = e === "meydanOku" && !!masa?.ayar.kavgaYasak;
          const secili = eylemTur === e;
          return <Pressable key={e} accessibilityRole="radio" accessibilityState={{ selected: secili, disabled: yasak }} accessibilityLabel={t("onl.han.eylem." + e)} disabled={yasak}
            onPress={() => { hap("tap"); setEylemTur(e); }}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 22, borderWidth: 1.5, borderColor: secili ? C.goldBright : ONL.frame, backgroundColor: secili ? "rgba(201,162,78,0.25)" : "rgba(14,10,6,0.6)", opacity: yasak ? 0.45 : 1 }}>
            <GameIcon name={EYLEM_IKON[e]!} size={15} color={secili ? C.goldBright : C.gold} />
            <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.parchment }}>{t("onl.han.eylem." + e)}</Text>
          </Pressable>;
        })}
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.eylemAcik." + eylemTur)}</Text>
      {masa?.ayar.kavgaYasak ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, color: C.ember, textAlign: hiza(rtl) }}>{t("onl.han.kavgaYasakNot")}</Text> : null}
      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t(EYLEM_FORM[eylemTur].hedef === "zorunlu" ? "onl.han.hedefSec" : "onl.han.hedefSecimli")}</Text>
      <View style={{ gap: 6 }}>
        {EYLEM_FORM[eylemTur].hedef === "secimli" ? <SecimSatiri metin={t("onl.han.hedefYok")} secili={hedef === null} rtl={rtl} onPress={() => setHedef(null)} /> : null}
        {(eylemTur === "ihbar" ? tumPlakalar.filter((p) => p.hesap !== ben) : digerOturanlar).map((p) => <SecimSatiri key={p.hesap} metin={p.ad} secili={hedef === p.hesap} rtl={rtl} onPress={() => setHedef(p.hesap)} />)}
        {!digerOturanlar.length && eylemTur !== "yemin" ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13.5, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.han.kimseYok")}</Text> : null}
      </View>
      {EYLEM_FORM[eylemTur].sart ? <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.han.sart")}</Text>
        <TextInput value={sart} onChangeText={(v) => setSart(v.replace(/[\r\n]+/g, " "))} multiline maxLength={SART_EN_UZUN * 2} accessibilityLabel={t("onl.han.sart")} placeholder={t("onl.han.sartIpucu." + eylemTur)} placeholderTextColor={C.parchmentMuted}
          style={{ minHeight: 64, borderRadius: 8, borderWidth: 1, borderColor: ONL.frameHi, backgroundColor: "rgba(14,10,6,0.9)", color: C.parchment, fontFamily: F.serif, fontSize: 15.5, padding: 10, textAlign: hiza(rtl), textAlignVertical: "top" }} />
        <Text style={{ fontFamily: F.serif, fontSize: 12, color: harfSayisi(tekSatir(sart)) > SART_EN_UZUN ? C.ember : C.parchmentMuted, textAlign: hiza(rtl) }}>{applyParams(t("onl.han.harfKaldi"), [Math.max(0, SART_EN_UZUN - harfSayisi(tekSatir(sart))), SART_EN_UZUN])}</Text>
      </View> : null}
      <Not metin={applyParams(t("onl.han.kayitNotu"), [masa?.koltuklar.filter(Boolean).length ?? 0])} rtl={rtl} icon="scroll-open" />
      <AltinDugme etiket={t("onl.han.eylem." + eylemTur)} icon={EYLEM_IKON[eylemTur]} rtl={rtl} bekliyor={bekliyor}
        kapali={(EYLEM_FORM[eylemTur].hedef === "zorunlu" && !hedef) || (EYLEM_FORM[eylemTur].sart && (!tekSatir(sart) || harfSayisi(tekSatir(sart)) > SART_EN_UZUN))}
        onPress={() => { void eylemGonder(eylemTur, hedef ?? undefined); }} />
    </AltPanel>

    {/* ikram paneli */}
    <AltPanel acik={panel === "ikram"} onKapat={() => setPanel(null)} etiket={t("onl.han.ikramEt")} rtl={rtl} t={t}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{t("onl.han.ikramBaslik")}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.menuNot")}</Text>
      <View style={{ gap: 6 }}>
        {IKRAMLAR.map((id) => {
          const fiyat = menu?.find((x) => x.id === id)?.fiyat;
          const secili = ikram === id;
          return <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: secili }} accessibilityLabel={`${t("onl.han.ikram." + id)}${fiyat !== undefined ? ", " + applyParams(t("onl.han.akce"), [fiyat]) : ""}`}
            onPress={() => { hap("tap"); setIkram(id); }}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 50, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1.5, borderColor: secili ? C.goldBright : "rgba(168,130,63,0.5)", backgroundColor: secili ? "rgba(90,64,24,0.55)" : "rgba(14,10,6,0.6)" }}>
            <GameIcon name={IKRAM_IKON[id]} size={20} color={secili ? C.goldBright : C.gold} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.display, fontSize: 13.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.han.ikram." + id)}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.ikramAcik." + id)}</Text>
            </View>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright }}>{fiyat !== undefined ? applyParams(t("onl.han.akce"), [fiyat]) : t("onl.han.fiyatHancida")}</Text>
          </Pressable>;
        })}
      </View>
      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 1, color: C.gold, textAlign: hiza(rtl) }}>{t("onl.han.kimeIkram")}</Text>
      <View style={{ gap: 6 }}>
        {tumPlakalar.filter((p) => p.hesap !== ben).map((p) => <SecimSatiri key={p.hesap} metin={p.ad} secili={hedef === p.hesap} rtl={rtl} onPress={() => setHedef(p.hesap)} />)}
      </View>
      <Not metin={t("onl.han.ikramEtki")} rtl={rtl} icon="amphora" />
      <AltinDugme etiket={hedef ? applyParams(t("onl.han.ikramGonder"), [t("onl.han.ikram." + ikram), adBul(hedef)]) : t("onl.han.hedefSec")} icon={IKRAM_IKON[ikram]} rtl={rtl} bekliyor={bekliyor} kapali={!hedef || !oturuyor} onPress={() => { void ikramGonder(); }} />
    </AltPanel>

    {/* şikâyet paneli */}
    <AltPanel acik={panel === "rapor"} onKapat={() => setPanel(null)} etiket={t("onl.han.sikayet")} rtl={rtl} t={t}>
      <Text accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl), paddingEnd: 36 }}>{hedef ? applyParams(t("onl.han.sikayetBaslik"), [adBul(hedef)]) : t("onl.han.sikayet")}</Text>
      <View style={{ gap: 6 }}>
        {SIKAYET_NEDENLERI.map((n) => <SecimSatiri key={n} metin={t("onl.han.neden." + n)} secili={neden === n} rtl={rtl} onPress={() => setNeden(n)} />)}
      </View>
      <TextInput value={aciklama} onChangeText={setAciklama} multiline maxLength={200} accessibilityLabel={t("onl.han.aciklama")} placeholder={t("onl.han.aciklama")} placeholderTextColor={C.parchmentMuted}
        style={{ minHeight: 60, borderRadius: 8, borderWidth: 1, borderColor: ONL.frameHi, backgroundColor: "rgba(14,10,6,0.9)", color: C.parchment, fontFamily: F.serif, fontSize: 15.5, padding: 10, textAlign: hiza(rtl), textAlignVertical: "top" }} />
      <Not metin={t("onl.han.sikayetNot")} rtl={rtl} icon="shield" />
      <AltinDugme etiket={t("onl.han.sikayetGonder")} icon="shield" rtl={rtl} kapali={!acik} onPress={raporGonder} />
    </AltPanel>
  </HanSayfa>;
}

function SecimSatiri({ metin, secili, rtl, onPress }: { metin: string; secili: boolean; rtl: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: secili }} accessibilityLabel={metin} onPress={() => { hap("tap"); onPress(); }}
    style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: secili ? C.goldBright : "rgba(168,130,63,0.4)", backgroundColor: secili ? "rgba(90,64,24,0.5)" : "rgba(14,10,6,0.55)" }}>
    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: secili ? C.goldBright : C.goldDim, alignItems: "center", justifyContent: "center" }}>
      {secili ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.goldBright }} /> : null}
    </View>
    <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.parchment, textAlign: hiza(rtl) }}>{metin}</Text>
  </Pressable>;
}

export default function OnlineMasa() {
  return onlineEkranAcik() ? <OnlineKapisi><MasaEkran /></OnlineKapisi> : <OnlineYakinda />;
}
