// Han masası (Faz 10): üstte han sofrası ve çevresinde koltuklar (portre, ad, işaretler), altında ayaktakiler ve sohbet
// akışı (240 harf; saklanmaz). Bir koltuğa dokununca kişi kartı açılır: profil, armağan (ikram + Debdebe), butonlu eylemler
// (yemin, sözleşme, ittifak, ihbar, meydan okuma; masadakiler kayda geçer), sessize al, şikâyet ve masa başının
// moderasyonu. Kendi koltuğunda: kalk, ses, yemin. Bağlantı han-soket.ts'te; sonuçları sunucu verir.
import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
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
import { ekHataAnahtari } from "../../../lib/online/ek-istemci";
import { istekTekrarMi } from "../../../lib/online/hata";
import {
  KAPANIS, ILETI_EN_UZUN, SART_EN_UZUN, SIKAYET_NEDENLERI, harfSayisi, tekSatir, useHanIstemci,
  type HanEylemi, type MasaOlayi, type MenuSatiri, type Plaka, type SikayetNedeni,
} from "../../../lib/online/han-veri";
import { kapanisAnahtari, useMasa, type AkisOgesi } from "../../../lib/online/han-soket";
import { AnonsSeridi, EYLEM_IKON, HanSayfa, Not, type PlakaSesi } from "../../../lib/online/han-ui";
import { KoltukDuzeni, KoltukPortresi, isaretler, type Kutlama } from "../../../lib/online/han-koltuk-ui";
import { ArmaganCekmecesi, type ArmaganSonucu } from "../../../lib/online/han-armagan";
import { oyuncuKimligiMi } from "../../../lib/online/toplum-veri";
import { useSes } from "../../../lib/online/ses";
import type { Dil } from "../../../lib/online/protokol";

type SecimEylemi = Exclude<HanEylemi, "kabul">;
/** Sunucu kurallarının görünür kopyası (yalnız formu kurmak için; doğrulama sunucuda). */
const EYLEM_FORM: Record<SecimEylemi, { hedef: "zorunlu" | "secimli"; sart: boolean }> = {
  yemin: { hedef: "secimli", sart: true }, sozlesme: { hedef: "zorunlu", sart: true }, ittifak: { hedef: "zorunlu", sart: false },
  ihbar: { hedef: "zorunlu", sart: false }, meydanOku: { hedef: "zorunlu", sart: false },
};
/** Kişi kartındaki eylemler: oturana hepsi; sıradakine (ayakta) yalnız ihbar (sunucu ihbarı masadaki herkese açar). */
const OTURANA: SecimEylemi[] = ["sozlesme", "ittifak", "meydanOku", "yemin", "ihbar"];
const BESTE_HAN = 64; // yazı kutusu yüksekliği
const KUTLAMA_MS = 700; // giriş 260 + bekleme 700 + çıkış 260 ≈ 1,2 sn

function masaNo(param: unknown): number {
  const n = Number(Array.isArray(param) ? param[0] : param);
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : 1;
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
  const [panel, setPanel] = useState<null | "eylem" | "armagan" | "rapor">(null);
  const [hedef, setHedef] = useState<string | null>(null);
  const [eylemTur, setEylemTur] = useState<SecimEylemi>("yemin");
  const [sart, setSart] = useState("");
  const [neden, setNeden] = useState<SikayetNedeni>("kufur");
  const [aciklama, setAciklama] = useState("");
  const [bekliyor, setBekliyor] = useState(false);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuSatiri[] | null>(null);
  const [kutlama, setKutlama] = useState<Kutlama | null>(null);
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
  useEffect(() => { if (!kutlama) return; const z = setTimeout(() => setKutlama(null), KUTLAMA_MS); return () => clearTimeout(z); }, [kutlama]);

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
  const ses = useSes({ no, istemci, ses: d.ses, ben, oturuyor, bagli: acik, sessiz: d.sessiz, gonder: m.gonderHam });
  const sesi = (h: string): PlakaSesi | undefined => (ses.kesik(h) ? "kesik" : ses.konusuyor(h) ? "konusuyor" : ses.mikAcik(h) ? "acik" : undefined);
  const isaretBul = (p: Plaka) => isaretler(p, { bas: masa?.masaBasi ?? null, sessiz: d.sessiz, sesi, soz: ses.sozIstedi });
  const benKesik = !!ben && ses.kesik(ben);
  const sozIstedim = !!ben && ses.sozIstedi(ben);

  const panelAc = (p: "eylem" | "armagan" | "rapor", h: string | null) => { istekNo.current = istekNoUret(); setHedef(h); setKisi(null); setPanel(p); setBilgi(null); };
  const eylemAc = (tur: SecimEylemi, h: string | null) => { setEylemTur(tur); setSart(""); panelAc("eylem", h); };
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
    // istek_tekrar: eylem daha önce işlenmiş; hata değil, panel kapanır ve yeni istekNo alınır.
    else if (istekTekrarMi(s.hata)) { setPanel(null); setSart(""); setBilgi(t("onl.h.istekTekrar")); istekNo.current = istekNoUret(); }
    else m.hataGoster(s.hata, s.bitis);
  };
  const armaganSonucu = (s: ArmaganSonucu) => {
    setPanel(null);
    setBilgi(s.bilgi);
    if (s.kutlama) {
      hap("success");
      // Hareket azaltıldıysa yalnız sunucunun yayınladığı anons satırı sohbette görünür.
      if (!isReduceMotion() && hedef) setKutlama({ id: istekNoUret(), icon: s.kutlama.icon, metin: applyParams(t("onl.han.kutlama"), [s.kutlama.oge, adBul(hedef)]) });
    }
    void o.yerlesimYukle(true);
  };
  const ziyafetIstekNo = useRef(istekNoUret());
  const ziyafetVer = async () => {
    setBekliyor(true);
    const s = await istemci.ziyafet({ masa: no, istekNo: ziyafetIstekNo.current });
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
    if (m.rapor(hedef, neden, aciklama)) { setPanel(null); setAciklama(""); }
  };

  const olayMetni = (x: MasaOlayi) => {
    const k = x.tur === "kabul" ? (x.teklifTur === "meydanOku" ? "onl.han.olay.kabulDuello" : "onl.han.olay.kabul") : x.tur === "atma" ? "onl.han.olay.atma" : x.hedef ? `onl.han.olay.${x.tur}` : `onl.han.olay.${x.tur}Yalniz`;
    return applyParams(t(k), [adBul(x.kim), x.hedef ? adBul(x.hedef) : "", x.katilim.length]);
  };
  const akisCiz = (a: AkisOgesi) => {
    if (a.tur === "anons") return <AnonsSeridi anons={a.anons} ad={adBul} rtl={rtl} t={t} />;
    if (a.tur === "olay") {
      const x = a.olay;
      const teklifTuru = x.tur === "sozlesme" || x.tur === "ittifak" || x.tur === "meydanOku";
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
        {bana && x.tur === "meydanOku" ? <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{t("onl.han.duelloNot")}</Text> : null}
        {bana ? <CizgiDugme etiket={t(x.tur === "meydanOku" ? "onl.han.duelloKabul" : "onl.han.kabulEt")} icon={x.tur === "meydanOku" ? "crossed-swords" : "ring"} rtl={rtl} kucuk kapali={bekliyor || !oturuyor} onPress={() => { istekNo.current = istekNoUret(); void eylemGonder("kabul", undefined, x.no); }} /> : null}
      </View>;
    }
    const benim = a.hesap === ben;
    return <View accessible accessibilityLabel={`${a.ad}: ${a.metin}`} style={{ alignSelf: benim ? (rtl ? "flex-start" : "flex-end") : rtl ? "flex-end" : "flex-start", maxWidth: "88%", borderRadius: 10, borderColor: a.balon ? "#F3D27A" : benim ? "rgba(243,210,122,0.6)" : "rgba(201,162,78,0.3)", borderWidth: a.balon ? 1.5 : 1, backgroundColor: a.balon ? "rgba(88,30,40,0.92)" : benim ? "rgba(70,50,22,0.92)" : "rgba(20,14,8,0.88)", paddingHorizontal: 10, paddingVertical: 7, gap: 2 }}>
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
  const notStil = { fontFamily: F.serifItalic, fontSize: 13, lineHeight: 18, color: C.parchmentMuted, textAlign: hiza(rtl) } as const;
  const kisiBen = !!kisi && kisi.hesap === ben;
  const kisiOturuyor = !!kisi && !!masa?.koltuklar.some((p) => p?.hesap === kisi.hesap);
  const kisiSira = kisi && masa ? masa.sira.findIndex((p) => p.hesap === kisi.hesap) : -1;
  const kisiIsaret = kisi ? isaretBul(kisi) : null;
  const masaAlt = masa ? (masa.ayar.kavgaYasak ? t("onl.han.isaret.kavgaYasak") : masa.ayar.tur === "ozel" ? t("onl.han.isaret.ozelMasa") : undefined) : undefined;

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
      {/* koltuklar ve sofra */}
      <View style={{ marginTop: 12 }}>
        <KoltukDuzeni koltuklar={masa.koltuklar} ben={ben} isaretBul={isaretBul} rtl={rtl} t={t} no={no} ayakta={masa.ayakta} alt={masaAlt} kutlama={kutlama}
          onKoltuk={(i, p) => {
            if (!p) { if (!oturuyor) m.otur(i); return; }
            setKisi(p);
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
        {ses.hata ? <Bant metin={t(ses.hata === "izin" ? "onl.ses.izinYok" : ekHataAnahtari(ses.hata))} rtl={rtl} eylem={t("onl.kapat")} onEylem={ses.hataTemizle} /> : null}
        {/* ziyafet bütün masaya: tek yeri burası */}
        {oturuyor ? <>
          <CizgiDugme etiket={t("onl.han.ziyafetVer")} icon="bread" rtl={rtl} kucuk kapali={!acik || bekliyor || digerOturanlar.length < 2} onPress={() => { void ziyafetVer(); }} />
          <Text style={[notStil, { fontSize: 12.5, lineHeight: 17 }]}>{t("onl.han.ziyafetNot")}</Text>
        </> : <Text style={notStil}>{t("onl.han.oturunca")}</Text>}
      </View>

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
        <ScrollView ref={akisKutu} nestedScrollEnabled style={{ maxHeight: 340 }} contentContainerStyle={{ padding: 10, gap: 8 }}>
          {d.akis.length ? d.akis.map((a) => <View key={a.id}>{akisCiz(a)}</View>)
            : <Text style={{ fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: "center", paddingVertical: 18 }}>{t("onl.han.sessizMasa")}</Text>}
        </ScrollView>
      </Cerceve>

      {masa.sira.length ? <>
        <Baslik2 metin={applyParams(t("onl.han.siraBaslik"), [masa.sira.length])} rtl={rtl} />
        <View style={{ gap: 6 }}>
          {masa.sira.map((p, i) => <Pressable key={p.hesap} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${p.ad}${ses.sozIstedi(p.hesap) ? ", " + t("onl.han.isaret.soz") : ""}`} onPress={() => { hap("tap"); if (p.hesap !== ben) setKisi(p); }}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(14,10,6,0.7)", borderWidth: 1, borderColor: "rgba(201,162,78,0.25)" }}>
            <Text style={{ width: 22, fontFamily: F.display, fontSize: 13, color: C.gold, textAlign: "center" }}>{i + 1}</Text>
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: p.hesap === ben ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{p.hesap === ben ? t("onl.han.sen") : p.ad}</Text>
            {ses.sozIstedi(p.hesap) ? <GameIcon name="star" size={14} color={C.goldBright} /> : null}
          </Pressable>)}
          <Text style={notStil}>{t("onl.han.siraNot")}</Text>
        </View>
      </> : null}

      {basBen ? <View style={{ gap: 6 }}>
        <Baslik2 metin={t("onl.han.ayarBaslik")} rtl={rtl} />
        {([["kavgaYasak", "crossed-swords"], ["kilitli", "shield"], ["sesli", "speaker"]] as const).map(([alan, ikon]) => {
          const deger = !!masa?.ayar[alan];
          return <Pressable key={alan} accessibilityRole="switch" accessibilityState={{ checked: deger, disabled: !acik }} accessibilityLabel={t("onl.han.ayar." + alan)} disabled={!acik}
            onPress={() => { hap("tap"); m.ayar({ [alan]: !deger }); }}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: deger ? C.goldBright : ONL.frame }}>
            <GameIcon name={ikon} size={15} color={deger ? C.goldBright : C.gold} />
            <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.ayar." + alan)}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 11.5, color: deger ? C.goldBright : C.goldDim }}>{t(deger ? "onl.br.hatirlatAcik" : "onl.br.hatirlatKapali")}</Text>
          </Pressable>;
        })}
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: masa?.ayar.tur === "ozel", disabled: !acik }} accessibilityLabel={t("onl.han.ayar.ozel")} disabled={!acik}
          onPress={() => { hap("tap"); m.ayar({ tur: masa?.ayar.tur === "ozel" ? "acik" : "ozel" }); }}
          style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: masa?.ayar.tur === "ozel" ? C.goldBright : ONL.frame }}>
          <GameIcon name="ring" size={15} color={masa?.ayar.tur === "ozel" ? C.goldBright : C.gold} />
          <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.han.ayar.ozel")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 11.5, color: masa?.ayar.tur === "ozel" ? C.goldBright : C.goldDim }}>{t(masa?.ayar.tur === "ozel" ? "onl.br.hatirlatAcik" : "onl.br.hatirlatKapali")}</Text>
        </Pressable>
        <Text style={notStil}>{t("onl.han.ayarNot")}</Text>
      </View> : masa?.ayar.kilitli ? <View style={{ marginTop: 10 }}><Not metin={t("onl.han.kilitliNot")} rtl={rtl} icon="shield" /></View>
        : masa?.ayar.tur === "ozel" ? <View style={{ marginTop: 10 }}><Not metin={t(ben && masa.ayar.davet?.includes(ben) ? "onl.han.ozelDavetli" : "onl.han.ozelNot")} rtl={rtl} icon="ring" /></View> : null}

      <View style={{ marginTop: 10, gap: 8 }}>
        <Not metin={t("onl.han.notSohbet")} rtl={rtl} icon="speaker" />
        <Not metin={t("onl.han.notKayit")} rtl={rtl} icon="scroll-open" />
      </View>
    </>}

    {/* kişi kartı */}
    <AltPanel acik={!!kisi} onKapat={() => setKisi(null)} etiket={kisi ? (kisiBen ? t("onl.han.kendiKoltugun") : kisi.ad) : ""} rtl={rtl} t={t}>
      {kisi && kisiIsaret ? <>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 14, paddingEnd: 36, paddingTop: 6 }}>
          <KoltukPortresi p={kisi} boyut={64} ben={kisiBen} i={kisiIsaret} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text accessibilityRole="header" numberOfLines={2} style={{ fontFamily: F.display, fontSize: 17, color: kisiBen ? C.goldBright : C.parchment, textAlign: hiza(rtl) }}>{kisiBen ? `${kisi.ad} · ${t("onl.han.sen")}` : kisi.ad}</Text>
            <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 6 }}>
              {kisiIsaret.bas ? <Rozet icon="crown" metin={t("onl.han.masaBasi")} renk={C.goldBright} /> : null}
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
          {/* kendi koltuğun: kalk, ses, yemin, profil */}
          {ses.gorunur && kisiOturuyor ? <AltinDugme etiket={t(ses.mik ? "onl.ses.mikKapat" : "onl.ses.mikAc")} icon="speaker" rtl={rtl} bekliyor={ses.bekliyor} kapali={!acik || benKesik || susturuldu} onPress={ses.mikDegistir}
            erisim={t(ses.mik ? "onl.ses.mikKapatErisim" : "onl.ses.mikAcErisim")} /> : null}
          {ses.gorunur && benKesik ? <Text style={notStil}>{t("onl.ses.kesildin")}</Text> : null}
          <CizgiDugme etiket={t("onl.han.eylem.yemin")} icon={EYLEM_IKON.yemin} rtl={rtl} kapali={!acik || !kisiOturuyor} onPress={() => eylemAc("yemin", null)} />
          <CizgiDugme etiket={t("onl.han.profilim")} icon="hood" rtl={rtl} onPress={() => { setKisi(null); router.push("/online/oyuncu/ben"); }} />
          <CizgiDugme etiket={t("onl.han.kalk")} icon="walk" rtl={rtl} kapali={!acik} onPress={() => { m.kalk(); setKisi(null); }} />
        </> : <>
          <View style={{ flexDirection: yon(rtl), gap: 8 }}>
            <View style={{ flex: 1 }}><CizgiDugme etiket={t("onl.han.profileGit")} icon="hood" rtl={rtl} kapali={!oyuncuKimligiMi(kisi.hesap)} onPress={() => { const id = kisi.hesap; setKisi(null); router.push(`/online/oyuncu/${id}`); }} /></View>
            <View style={{ flex: 1 }}><AltinDugme etiket={t("onl.han.armaganGonder")} icon="gems" rtl={rtl} kapali={!acik || !oturuyor} onPress={() => panelAc("armagan", kisi.hesap)} /></View>
          </View>
          {!oyuncuKimligiMi(kisi.hesap) ? <Text style={notStil}>{t("onl.han.profilYok")}</Text> : null}
          {!oturuyor ? <Text style={notStil}>{t("onl.han.oturunca")}</Text> : null}

          <Baslik2 metin={t("onl.han.kisiEylemleri")} rtl={rtl} ust={4} />
          <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
            {(kisiOturuyor ? OTURANA : (["ihbar"] as SecimEylemi[])).map((e) => {
              const yasak = e === "meydanOku" && !!masa?.ayar.kavgaYasak;
              return <View key={e} style={{ width: "48%", flexGrow: 1 }}>
                <CizgiDugme etiket={t("onl.han.eylem." + e)} icon={EYLEM_IKON[e]} rtl={rtl} kucuk kapali={!acik || !oturuyor || yasak} onPress={() => eylemAc(e, kisi.hesap)} />
              </View>;
            })}
          </View>
          {masa?.ayar.kavgaYasak && kisiOturuyor ? <Text style={[notStil, { color: C.ember }]}>{t("onl.han.kavgaYasakNot")}</Text> : null}

          {d.sessiz.includes(kisi.hesap)
            ? <CizgiDugme etiket={t("onl.han.sesiAc")} icon="speaker" rtl={rtl} onPress={() => { m.susturKaldir(kisi.hesap); setKisi(null); }} />
            : <CizgiDugme etiket={t("onl.han.sessizeAl")} icon="speaker" rtl={rtl} onPress={() => { m.sustur(kisi.hesap); setKisi(null); }} />}
          <Text style={notStil}>{t("onl.han.sessizNot")}</Text>
          {ses.gorunur ? <Text style={notStil}>{t("onl.ses.yerelNot")}</Text> : null}

          {basBen ? <>
            <Baslik2 metin={t("onl.han.moderasyon")} rtl={rtl} ust={4} />
            {ses.gorunur ? (ses.kesik(kisi.hesap)
              ? <CizgiDugme etiket={t("onl.ses.sesiniAc")} icon="speaker" rtl={rtl} onPress={() => { m.sesAc(kisi.hesap); setKisi(null); }} />
              : <CizgiDugme etiket={t("onl.ses.sesiniKes")} icon="speaker" rtl={rtl} onPress={() => { m.sesKapat(kisi.hesap); setKisi(null); }} />) : null}
            {kisiSira >= 0 ? <CizgiDugme etiket={t("onl.han.oneAl")} icon="hourglass" rtl={rtl} onPress={() => { m.oneAl(kisi.hesap); setKisi(null); }} /> : null}
            {masa?.ayar.tur === "ozel" ? (masa.ayar.davet?.includes(kisi.hesap)
              ? <CizgiDugme etiket={t("onl.han.davetKaldir")} icon="ring" rtl={rtl} onPress={() => { m.davet(kisi.hesap, true); setKisi(null); }} />
              : <CizgiDugme etiket={t("onl.han.davetEt")} icon="ring" rtl={rtl} onPress={() => { m.davet(kisi.hesap); setKisi(null); }} />) : null}
            <CizgiDugme etiket={t("onl.han.masadanCikar")} icon="walk" rtl={rtl} onPress={() => { m.at(kisi.hesap); setKisi(null); }} />
            <Text style={notStil}>{t("onl.han.atNot")}</Text>
          </> : null}

          <CizgiDugme etiket={t("onl.han.sikayet")} icon="shield" rtl={rtl} onPress={() => panelAc("rapor", kisi.hesap)} />
        </>}
      </> : null}
    </AltPanel>

    {/* eylem paneli: tür ve hedef kişi kartından gelir */}
    <AltPanel acik={panel === "eylem"} onKapat={() => setPanel(null)} etiket={t("onl.han.eylem." + eylemTur)} rtl={rtl} t={t}>
      <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 10, paddingEnd: 36 }}>
        <GameIcon name={EYLEM_IKON[eylemTur] ?? "scroll"} size={20} color={C.goldBright} />
        <Text accessibilityRole="header" numberOfLines={2} style={{ flex: 1, fontFamily: F.display, fontSize: 17, color: C.parchment, textAlign: hiza(rtl) }}>
          {hedef ? applyParams(t("onl.han.eylemBaslik"), [t("onl.han.eylem." + eylemTur), adBul(hedef)]) : t("onl.han.eylem." + eylemTur)}
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
      <AltinDugme etiket={t("onl.han.eylem." + eylemTur)} icon={EYLEM_IKON[eylemTur]} rtl={rtl} bekliyor={bekliyor}
        kapali={!oturuyor || (EYLEM_FORM[eylemTur].hedef === "zorunlu" && !hedef) || (eylemTur === "meydanOku" && !!masa?.ayar.kavgaYasak) || (EYLEM_FORM[eylemTur].sart && (!tekSatir(sart) || harfSayisi(tekSatir(sart)) > SART_EN_UZUN))}
        onPress={() => { void eylemGonder(eylemTur, hedef ?? undefined); }} />
    </AltPanel>

    {/* armağan çekmecesi: ikram (akçe) ve Debdebe */}
    <ArmaganCekmecesi acik={panel === "armagan"} onKapat={() => setPanel(null)} hedef={hedef ? { hesap: hedef, ad: adBul(hedef) } : null} masa={no} istemci={istemci}
      menu={menu} onMenu={(s) => setMenu((x) => (x?.some((y) => y.id === s.id) ? x : [...(x ?? []), s]))} para={o.yerlesim?.ben.para} oturuyor={oturuyor} rtl={rtl} t={t}
      onSonuc={armaganSonucu} />

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
