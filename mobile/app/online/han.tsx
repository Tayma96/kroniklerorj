// Han (Faz 10, GET /v1/han?han=N): yerleşimin hanları (4.9: şehirde 5, kasabada 2 yuva, köyde yalnız NPC hanı),
// seçili hanın atmosferi ve masaları: doluluk, ayakta dinleyici, sıra. Birden çok han varsa üstte han seçici; seçim
// yerleşim başına cihazda hatırlanır ve masa, pano, ikram, ziyafet ve ses çağrılarının hepsine `han` olarak gider.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, useWindowDimensions } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { hap } from "../../lib/haptics";
import { DesignPressable as Pressable } from "../../lib/design-pressable";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { BASMA_OLCEK, Bant, Cerceve, CizgiDugme, GeriDugme, Madalyon, belir, geriGit, giris, hiza, yon } from "../../lib/online/ui";
import { Baslik2, Rozet, SatirOku, SayfaBasi, Yukleniyor } from "../../lib/online/yasam-ui";
import { ekHataAnahtari, type EkHata } from "../../lib/online/ek-istemci";
import { HanPanosu } from "../../lib/online/han-pano";
import { useHanIstemci, IKRAMLAR, hanMenusu, hanNoCoz, type HanKarti, type HanOzeti, type MasaOzeti } from "../../lib/online/han-veri";
import { HanSayfa, IKRAM_IKON, Not } from "../../lib/online/han-ui";
import { HanSecici, MasaIskeleti, hanKartAdi, hanSirala } from "../../lib/online/han-secici";
import { hanSecimiOku, hanSecimiYaz } from "../../lib/online/depo";
import type { Dil } from "../../lib/online/protokol";

function MasaKarti({ m, koltuk, rtl, t, sira, onAc }: { m: MasaOzeti; koltuk: number; rtl: boolean; t: (k: string) => string; sira: number; onAc: () => void }) {
  const dolu = m.oturan >= koltuk;
  const kapali = !m.ayar.acik;
  const durum = kapali ? t("onl.han.masaKapali") : dolu ? t("onl.han.masaDolu") : m.oturan ? t("onl.han.masaYerVar") : t("onl.han.masaBos");
  const alt = [...(m.tanidik ? [applyParams(t("onl.han.tanidikVar"), [m.tanidik])] : []), applyParams(t("onl.han.oturan"), [m.oturan, koltuk]), applyParams(t("onl.han.ayakta"), [m.ayakta]), ...(m.sira ? [applyParams(t("onl.han.sirada"), [m.sira])] : [])].join(" · ");
  return <Animated.View entering={giris(Math.min(sira, 8) * 40)}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${applyParams(t("onl.han.masaNo"), [m.no])}. ${durum}. ${alt}`} accessibilityState={{ disabled: kapali }} disabled={kapali}
      onPress={() => { hap("tap"); onAc(); }} style={({ pressed }) => ({ transform: [{ scale: pressed ? BASMA_OLCEK : 1 }], opacity: kapali ? 0.55 : 1 })}>
      <Cerceve aktif={!dolu && m.oturan > 0 && !kapali} ic={{ flexDirection: yon(rtl), alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12, minHeight: 76 }}>
        <Madalyon icon="flame" size={42} aktif={!dolu && m.oturan > 0 && !kapali} />
        <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.parchment }}>{applyParams(t("onl.han.masaNo"), [m.no])}</Text>
            <Rozet metin={durum} renk={kapali ? C.parchmentMuted : dolu ? C.ember : m.oturan ? C.goldBright : C.sage} dolu={dolu && !kapali} />
            {m.tanidik ? <Rozet icon="family" metin={applyParams(t("onl.han.tanidikVar"), [m.tanidik])} renk={C.sage} /> : null}
            {m.ayar.kilitli ? <Rozet icon="shield" metin={t("onl.han.kilitli")} renk={C.parchmentMuted} /> : null}
          </View>
          <View accessible={false} style={{ flexDirection: yon(rtl), gap: 5 }}>
            {Array.from({ length: koltuk }, (_, i) => <View key={i} style={{ width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: C.gold, backgroundColor: i < m.oturan ? C.goldBright : "transparent" }} />)}
          </View>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: C.parchmentDim, textAlign: hiza(rtl) }}>{alt}</Text>
        </View>
        <SatirOku rtl={rtl} />
      </Cerceve>
    </Pressable>
  </Animated.View>;
}

/** Seçili han yoksa (sunucu han_yok/han_gecersiz: sahibi bıraktı, yuva boşaldı) 1. hana dönülür. */
const HAN_GITTI: ReadonlySet<string> = new Set(["han_yok", "han_gecersiz"]);

function HanEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const dar = useWindowDimensions().width < 360;
  const o = useOnline();
  const { han: hanParam } = useLocalSearchParams<{ han?: string }>();
  const paramHan = hanParam === undefined ? null : hanNoCoz(Array.isArray(hanParam) ? hanParam[0] : hanParam);
  const yerId = o.yerlesim?.yerlesim.id ?? null;
  // null: cihazdaki son seçim okunuyor (o sürede hiçbir han istenmez; yanlış hanın masaları görünmez).
  const [secili, setSecili] = useState<number | null>(paramHan);
  const istemci = useHanIstemci(secili ?? 1);
  const [ozet, setOzet] = useState<HanOzeti | null>(null);
  const [hanlar, setHanlar] = useState<HanKarti[]>([]);
  const [turAdi, setTurAdi] = useState<string | null>(null);
  const [hata, setHata] = useState<EkHata | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const sira = useRef(0);

  // Parametre yoksa yerleşimin son seçili hanı (yoksa 1).
  useEffect(() => {
    if (secili !== null) return;
    let iptal = false;
    if (!yerId) {
      // Yerleşim kimliği gelene dek beklenir (kayıtlı seçim okunamaz); profil kesin yoksa ya da kimlik hiç gelmezse 1.
      if (!o.hazir) return;
      const z = setTimeout(() => { if (!iptal) setSecili(1); }, o.profil ? 4000 : 0);
      return () => { iptal = true; clearTimeout(z); };
    }
    void hanSecimiOku(yerId).then((n) => { if (!iptal) setSecili(n ?? 1); });
    return () => { iptal = true; };
  }, [yerId, o.hazir, !!o.profil]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (paramHan !== null && paramHan !== secili) sec(paramHan); }, [paramHan]); // eslint-disable-line react-hooks/exhaustive-deps

  // `sessiz`: ekrana dönüşte yenileme; iskelet/yükleniyor göstermez, hata olursa eski veri kalır.
  const yukle = useCallback(async (sessiz = false) => {
    if (secili === null) return;
    const n = ++sira.current;
    if (!sessiz) setYukleniyor(true);
    const s = await istemci.han(lang as Dil);
    if (n !== sira.current) return; // başka han seçildi: eski yanıt atılır
    if (!sessiz) setYukleniyor(false);
    if (s.ok) {
      setOzet(s.deger); setHata(null); setTurAdi(s.deger.han.ad);
      setHanlar(s.deger.hanlar ?? []);
    } else if (sessiz) return;
    else if (HAN_GITTI.has(s.hata) && istemci.hanNo !== 1) {
      setBilgi(t("onl.hs.hanGitti"));
      if (yerId) void hanSecimiYaz(yerId, 1);
      setSecili(1);
    } else setHata(s.hata);
  }, [istemci, lang, secili]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (o.profil) void yukle(); }, [o.profil?.hesapId, yukle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ekrana odak dönüşünde sessiz yenile (ilk odakta ilk yükleme zaten çalışır).
  const yukleRef = useRef(yukle);
  yukleRef.current = yukle;
  const ilkOdak = useRef(true);
  const ozetVar = useRef(false);
  ozetVar.current = !!ozet;
  useFocusEffect(useCallback(() => {
    if (ilkOdak.current) { ilkOdak.current = false; return; }
    if (ozetVar.current) void yukleRef.current(true);
  }, []));

  const sec = (no: number) => {
    if (no === secili) return;
    if (yerId) void hanSecimiYaz(yerId, no);
    sira.current++; // yoldaki yanıt yok sayılır
    setOzet(null); setHata(null); setBilgi(null); setYukleniyor(false);
    setSecili(no);
  };

  // Kart sırası ilk yüklemede hesaplanır; han kümesi değişmedikçe sabit kalır (sayılar güncellenir, kartlar parmağın altında yer değiştirmez).
  const kume = hanlar.map((k) => k.no).sort((x, y) => x - y).join(",");
  const kartSirasi = useMemo(() => hanSirala(hanlar).map((k) => k.no), [kume]); // eslint-disable-line react-hooks/exhaustive-deps
  const kart = hanlar.find((k) => k.no === secili);
  const coklu = hanlar.length > 1;
  const tur = ozet?.han.tur ?? "han";
  const atmosfer = t("onl.han.atmosfer." + tur);
  const baslik = kart && turAdi ? hanKartAdi(kart, turAdi, t) : ozet ? ozet.han.ad : t("onl.han.baslik");
  const menu = hanMenusu(ozet);
  return <HanSayfa>
    <View style={{ flexDirection: yon(rtl), alignItems: "center" }}>
      <GeriDugme rtl={rtl} etiket={t("onl.geri")} onPress={() => geriGit(router, "/online/sokak")} />
    </View>
    <View style={{ marginTop: 8 }}>
      <SayfaBasi ust={ozet?.yerlesim.ad ?? o.yerlesim?.yerlesim.ad ?? t("onl.han.ust")} baslik={baslik} alt={atmosfer} rtl={rtl} />
    </View>

    {!o.profil && o.hazir ? <View style={{ marginTop: 16 }}><Bant tur="bilgi" metin={t("onl.v.profilYok")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={() => router.replace("/online")} /></View> : null}
    {bilgi ? <View style={{ marginTop: 12 }}><Bant tur="bilgi" metin={bilgi} rtl={rtl} eylem={t("onl.kapat")} onEylem={() => setBilgi(null)} /></View> : null}

    {coklu && secili !== null && turAdi ? <HanSecici hanlar={hanlar} sira={kartSirasi} secili={secili} turAdi={turAdi} rtl={rtl} t={t} onSec={sec}
      onSahip={(id) => router.push(`/online/oyuncu/${encodeURIComponent(id)}`)} /> : null}
    {kart && !kart.acik ? <Animated.View entering={belir()} style={{ marginTop: 10 }}><Bant tur="bilgi" metin={t("onl.hs.kapaliBant")} rtl={rtl} /></Animated.View> : null}

    <Baslik2 metin={t("onl.han.masalar")} rtl={rtl} sag={ozet ? <Text style={{ fontFamily: F.display, fontSize: 12, color: C.gold }}>{ozet.masalar.length}</Text> : undefined} />
    {hata && !ozet ? <Bant metin={t(ekHataAnahtari(hata))} rtl={rtl} eylem={t("onl.yenidenDene")} onEylem={() => { void yukle(); }} />
      : !ozet ? (coklu ? <MasaIskeleti rtl={rtl} etiket={t("onl.han.yukleniyor")} /> : <Yukleniyor metin={t("onl.han.yukleniyor")} />)
      : <View key={secili ?? 1} style={{ gap: 10 }}>
        {ozet.masalar.map((m, i) => <MasaKarti key={m.no} m={m} koltuk={ozet.koltuk} rtl={rtl} t={t} sira={i} onAc={() => router.push(`/online/han/${m.no}?han=${secili ?? 1}`)} />)}
      </View>}
    {ozet ? <View style={{ marginTop: 10 }}><CizgiDugme etiket={t("onl.han.yenile")} icon="hourglass" rtl={rtl} kucuk kapali={yukleniyor} onPress={() => { void yukle(); }} /></View> : null}

    {o.profil && secili !== null ? <HanPanosu key={secili} istemci={istemci} /> : null}

    <Baslik2 metin={t("onl.han.menu")} rtl={rtl} />
    <Cerceve ic={{ padding: 12, gap: 10 }}>
      <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
        {IKRAMLAR.map((id) => {
          const fiyat = menu?.find((x) => x.id === id)?.fiyat;
          return <View key={id} accessible accessibilityLabel={`${t("onl.han.ikram." + id)}${fiyat !== undefined ? ", " + applyParams(t("onl.han.akce"), [fiyat]) : ""}`}
            style={{ flexDirection: yon(rtl), alignItems: "center", gap: 6, paddingHorizontal: 10, minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: "rgba(201,162,78,0.55)", backgroundColor: "rgba(14,10,6,0.6)", flexBasis: dar ? "100%" : "47%", flexGrow: 1 }}>
            <GameIcon name={IKRAM_IKON[id]} size={15} color={C.goldBright} />
            <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, color: C.parchment, textAlign: hiza(rtl) }}>{t("onl.han.ikram." + id)}</Text>
            {fiyat !== undefined ? <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.goldBright }}>{applyParams(t("onl.han.akce"), [fiyat])}</Text> : null}
          </View>;
        })}
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 19, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t(kart?.sahip === "oyuncu" ? "onl.hs.menuNotOyuncu" : "onl.han.menuNot")}</Text>
    </Cerceve>

    <View style={{ marginTop: 16, gap: 8 }}>
      <Not metin={t("onl.han.notSohbet")} rtl={rtl} icon="speaker" />
      <Not metin={t("onl.han.notKayit")} rtl={rtl} icon="scroll-open" />
    </View>
  </HanSayfa>;
}

export default function OnlineHan() {
  return onlineEkranAcik() ? <OnlineKapisi><HanEkran /></OnlineKapisi> : <OnlineYakinda />;
}
