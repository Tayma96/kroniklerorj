// Varış: ilk girişte açılış sinematiği (lib/sinematik/oynatici — motor/kayıt çekmez), ardından "12 yaşında
// <yerleşim>'e indin — öğrenme döneminin 1. günü" kartı. Takvim ve ay dönümü sunucunun dünya saatinden gelir.
import { useEffect, useMemo, useState } from "react";
import { View, Text, Image, ScrollView, useWindowDimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { useI18n, applyParams } from "../../lib/i18n";
import { C, F } from "../../lib/theme";
import { GameIcon } from "../../lib/icons";
import { OnlineYakinda } from "../../lib/online-yakinda";
import { Sinematik } from "../../lib/sinematik/oynatici";
import { OnlineKapisi, useOnline } from "../../lib/online/durum";
import { onlineEkranAcik } from "../../lib/online/kapi";
import { sinematikGoruldu, sinematikIsaretle } from "../../lib/online/depo";
import { varisCekimleri } from "../../lib/online/varis-cekimler";
import { BASLANGIC_YASI, OGRENME_GUNU, yerlesimBul, type Cinsiyet, type Mevsim } from "../../lib/online/protokol";
import { AltinDugme, Bant, Cerceve, Check, CizgiDugme, giris, GLOW, Madalyon, ONL, Ornament, Sahne, TUR_IKON, UstBar, hiza, yon } from "../../lib/online/ui";

const KASABA: Record<Mevsim, number> = {
  kis: require("../../assets/tasarim/v4/town-kis.jpg"),
  ilkbahar: require("../../assets/tasarim/v4/town-ilkbahar.jpg"),
  yaz: require("../../assets/tasarim/v4/town-yaz.jpg"),
  sonbahar: require("../../assets/tasarim/v4/town-sonbahar.jpg"),
};
const KOY: Record<Mevsim, number> = {
  kis: require("../../assets/hero/cocuk_kis.jpg"),
  ilkbahar: require("../../assets/hero/cocuk_ilkbahar.jpg"),
  yaz: require("../../assets/hero/cocuk_yaz.jpg"),
  sonbahar: require("../../assets/hero/cocuk_sonbahar.jpg"),
};
const PORTRE: Record<Cinsiyet, number> = { erkek: require("../../assets/portre/e_cocuk.png"), kadın: require("../../assets/portre/k_cocuk.png") };
const SAAT_MS = 3_600_000;

function Bilgi({ icon, etiket, deger, rtl }: { icon: string; etiket: string; deger: string; rtl: boolean }) {
  return <View accessible accessibilityLabel={`${etiket}: ${deger}`} style={{ flex: 1, minWidth: 118, flexDirection: yon(rtl), alignItems: "center", gap: 9, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: "rgba(201,162,78,0.25)", backgroundColor: ONL.camKoyu }}>
    <GameIcon name={icon} size={18} color={C.gold} />
    <View style={{ flex: 1 }}>
      <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 10.5, letterSpacing: rtl ? 0 : 0.8, color: C.parchmentMuted, textAlign: hiza(rtl) }}>{etiket}</Text>
      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 16, color: C.parchment, textAlign: hiza(rtl) }}>{deger}</Text>
    </View>
  </View>;
}

/** Öğrenme dönemi izi: 6 gün, bugünkü gün parlar. */
function OgrenmeIzi({ gun, rtl, t }: { gun: number; rtl: boolean; t: (k: string) => string }) {
  const P = 30;
  return <View accessible accessibilityLabel={applyParams(t("onl.v.donem"), [gun, OGRENME_GUNU])}>
    <View>
      <View pointerEvents="none" style={{ position: "absolute", top: P / 2 - 1, left: P / 2, right: P / 2, height: 2, backgroundColor: "rgba(168,130,63,0.35)" }} />
      <View style={{ flexDirection: yon(rtl), justifyContent: "space-between" }}>
        {Array.from({ length: OGRENME_GUNU }, (_, i) => {
          const n = i + 1, bitti = n < gun, bugun = n === gun;
          return <View key={n} style={[{ width: P, height: P, borderRadius: P / 2, alignItems: "center", justifyContent: "center", borderWidth: bugun ? 2 : 1.5, borderColor: bitti || bugun ? C.goldBright : "rgba(168,130,63,0.55)", backgroundColor: bitti ? C.gold : bugun ? C.cardHi : "rgba(14,10,6,0.95)" }, bugun ? GLOW : null]}>
            {bitti ? <Check size={13} /> : <Text style={{ fontFamily: F.display, fontSize: 13, color: bugun ? C.goldBright : C.parchmentMuted }}>{n}</Text>}
          </View>;
        })}
      </View>
    </View>
    <Text style={{ marginTop: 8, fontFamily: F.display, fontSize: 11.5, letterSpacing: rtl ? 0 : 1.2, color: C.gold, textAlign: "center" }}>{applyParams(t("onl.v.donem"), [gun, OGRENME_GUNU])}</Text>
  </View>;
}

function VarisEkran() {
  const router = useRouter();
  const { t, rtl, lang } = useI18n();
  const ins = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const o = useOnline();
  const { ilk } = useLocalSearchParams<{ ilk?: string }>();
  const p = o.profil;
  const [sinema, setSinema] = useState(ilk === "1" && !!p);
  const [simdi, setSimdi] = useState(() => Date.now());

  useEffect(() => { if (!o.dunya && o.oturum) void o.dunyaYukle(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ilk === "1" && p) void sinematikGoruldu(p.hesapId).then((g) => { if (g) setSinema(false); });
  }, [ilk, p?.hesapId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const id = setInterval(() => setSimdi(Date.now()), 30_000); return () => clearInterval(id); }, []);

  const yer = p ? yerlesimBul(o.dunya, p.yerlesim) : undefined;
  const yerAd = yer?.yerlesim.ad ?? p?.yerlesim ?? "";
  const cekimler = useMemo(() => varisCekimleri(p?.cinsiyet ?? "erkek", yerAd, t, lang), [p?.cinsiyet, yerAd, t, lang]);

  if (!p) {
    return <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", padding: 20 }}>
      <Bant tur="bilgi" metin={t("onl.v.profilYok")} rtl={rtl} eylem={t("onl.p.giriseDon")} onEylem={() => router.replace("/online")} />
    </View>;
  }
  if (sinema) {
    return <Sinematik cekimler={cekimler} onDone={() => { setSinema(false); void sinematikIsaretle(p.hesapId); }} />;
  }

  const saat = o.dunya?.saat;
  const sunucuSimdi = saat ? saat.simdi + (simdi - o.dunyaAlindi) : simdi;
  const oyunAyi = saat ? saat.oyunAyi + (sunucuSimdi >= saat.sonrakiDonum ? 1 : 0) : p.dogumAyi + BASLANGIC_YASI * 12;
  const yas = Math.floor((oyunAyi - p.dogumAyi) / 12);
  const gun = Math.min(OGRENME_GUNU, Math.max(1, Math.floor((oyunAyi - p.dogumAyi - BASLANGIC_YASI * 12) / 2) + 1));
  const kalan = saat ? Math.max(0, saat.sonrakiDonum - sunucuSimdi) : 0;
  const mevsim: Mevsim = saat?.mevsim ?? "yaz";
  const tur = yer?.yerlesim.tur ?? "kasaba";
  const sahne = tur === "koy" ? KOY[mevsim] : KASABA[mevsim];
  const dar = W < 360;

  return <Sahne gorsel={sahne} oran={0.52} koyu={0.1}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: ins.top + 6, paddingHorizontal: 16, paddingBottom: ins.bottom + 20 }}>
      <UstBar adim={3} rtl={rtl} t={t} />
      <View style={{ flexGrow: 1, minHeight: Math.max(dar ? 70 : 100, H * 0.12) }} />

      <Animated.View entering={giris(80)} style={{ alignItems: "center" }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: ONL.gold, backgroundColor: "rgba(14,10,6,0.6)" }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 2, color: C.goldBright }}>{t("onl.v.ust")}</Text>
        </View>
        <Text accessibilityRole="header" style={{ marginTop: 8, fontFamily: F.display, fontSize: dar ? 30 : 34, lineHeight: dar ? 38 : 42, color: C.parchment, textAlign: "center", textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 10 }}>{yerAd}</Text>
        <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 7, marginTop: 2 }}>
          <GameIcon name={TUR_IKON[tur]} size={15} color={C.goldBright} />
          <Text style={{ fontFamily: F.serif, fontSize: 15.5, color: C.parchmentDim, textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 6 }}>{t("onl.tur." + tur)} · {yer?.beylik.ad ?? p.beylik}</Text>
        </View>
        <View style={{ marginVertical: 10 }}><Ornament size={15} /></View>
      </Animated.View>

      <Animated.View entering={giris(180)}>
        <Cerceve ic={{ padding: 14, gap: 14 }}>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 13 }}>
            <View style={[{ width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: C.goldBright, overflow: "hidden" }, GLOW]}>
              <Image accessible={false} source={PORTRE[p.cinsiyet]} resizeMode="cover" style={{ width: "100%", height: "100%" }} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 18, color: C.goldBright, textAlign: hiza(rtl) }}>{p.ad}</Text>
              <Text style={{ fontFamily: F.serif, fontSize: 16.5, lineHeight: 23, color: C.parchment, textAlign: hiza(rtl) }}>{applyParams(t("onl.v.cumle"), [yas, yerAd, gun], lang)}</Text>
            </View>
          </View>
          <OgrenmeIzi gun={gun} rtl={rtl} t={t} />
          <View style={{ flexDirection: yon(rtl), flexWrap: "wrap", gap: 8 }}>
            <Bilgi icon="hourglass" etiket={t("onl.v.donum")} deger={saat ? applyParams(t("onl.v.kalan"), [Math.floor(kalan / SAAT_MS), Math.floor((kalan % SAAT_MS) / 60_000)]) : "—"} rtl={rtl} />
            <Bilgi icon="sun" etiket={t("onl.v.takvim")} deger={saat ? `${saat.yil} · ${t("onl.mevsim." + mevsim)}` : "—"} rtl={rtl} />
            {p.davetEden ? <Bilgi icon="family" etiket={t("onl.v.davetEden")} deger={p.davetEden} rtl={rtl} /> : null}
          </View>
          <View style={{ flexDirection: yon(rtl), alignItems: "center", gap: 9, paddingTop: 2 }}>
            <Madalyon icon="graduate-cap" size={30} />
            <Text style={{ flex: 1, fontFamily: F.serifItalic, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: hiza(rtl) }}>{t("onl.v.ipucu")}</Text>
          </View>
        </Cerceve>
      </Animated.View>

      <Animated.View entering={giris(280)} style={{ marginTop: 14, gap: 10 }}>
        {/* Faz 2: yerleşimin gün döngüsü ekranı buraya bağlanır; şimdilik ana menüye döner. */}
        <AltinDugme etiket={t("onl.v.basla")} icon="walk" rtl={rtl} onPress={() => { void sinematikIsaretle(p.hesapId); router.replace("/"); }} />
        <CizgiDugme etiket={t("onl.v.sinematik")} icon="scroll-open" rtl={rtl} kucuk onPress={() => setSinema(true)} />
      </Animated.View>
    </ScrollView>
  </Sahne>;
}

export default function OnlineVaris() {
  return onlineEkranAcik() ? <OnlineKapisi><VarisEkran /></OnlineKapisi> : <OnlineYakinda />;
}
