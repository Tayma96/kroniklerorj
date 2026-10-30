// Meslek vitrini: mesleğin kendi sahnesi, madalyon, unvan ve kazanç şeridi.
import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { professionById, careerTier, kariyerXp, workForecast } from "../../game";
import { professionNameL, careerTitleL } from "../../locale-data";
import { useGame } from "../../store";
import { useI18n } from "../../i18n";
import { useSadeMod } from "../../use-sade-mod";
import { EASE } from "../../motion";
import { Panel } from "../../ui";
import { GameIcon } from "../../icons";
import { C, F } from "../../theme";
import { Madalyon, Etiket, meslekSahnesi, meslekIkonu, yon, hiza } from "./ortak";

const GOLGE = { textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } };

// `ozel`: meslek dışı durum (çocukluk) için başlık, alt satır, ikon ve sahne kimliği.
export function MeslekVitrini({ ust, bosluk = 14, ozel }: { ust: number; bosluk?: number; ozel?: { ad: string; alt: string; icon: string; sahne: string } }) {
  const { state } = useGame();
  const { t, lang } = useI18n();
  const sade = useSadeMod();
  const rtl = lang === "ar";
  const zoom = useSharedValue(1);
  useEffect(() => {
    zoom.value = 1;
    if (sade) return;
    zoom.value = withRepeat(withTiming(1.07, { duration: 14000, easing: EASE.standard }), -1, true); // sahne yavaşça nefes alır
    return () => cancelAnimation(zoom);
  }, [sade]);
  const zoomStil = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));
  if (!state) return null;
  const p = state.player, kadin = p.gender === "kadın", pr = professionById(p.profession);
  const ad = ozel ? ozel.ad : professionNameL(p.profession, lang, kadin);
  const unvan = ozel ? ozel.alt : pr ? careerTitleL(p.profession, kariyerXp(p), lang, kadin) : t("meslek.issiz");
  return (
    <View style={{ height: 292 + ust, marginHorizontal: -bosluk, overflow: "hidden", borderBottomWidth: 1, borderColor: C.goldDim + "88" }}>
      <Animated.Image accessible={false} source={meslekSahnesi(ozel ? ozel.sahne : p.profession)} resizeMode="cover" style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }, zoomStil]} />
      <LinearGradient pointerEvents="none" colors={["rgba(8,5,2,0.62)", "rgba(8,5,2,0.05)", "rgba(8,5,2,0.10)", "rgba(12,9,5,0.94)"]} locations={[0, 0.3, 0.52, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: "absolute", left: bosluk + 2, right: bosluk + 2, bottom: 34, flexDirection: yon(rtl), alignItems: "flex-end", gap: 12 }}>
        <Madalyon icon={ozel ? ozel.icon : meslekIkonu(p.profession)} size={66} tone={C.goldBright} />
        <View style={{ flex: 1, minWidth: 0 }}>
          {!ozel && <Etiket rtl={rtl} tone="#F1E2C2">{t("scr.meslek")}</Etiket>}
          <Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={[{ fontFamily: F.display, fontSize: 30, lineHeight: 37, color: "#F7EBD2" }, GOLGE, hiza(rtl)]}>{ad}</Text>
          <Text style={[{ fontFamily: F.serifItalic, fontSize: 17, lineHeight: 23, color: C.goldBright }, GOLGE, hiza(rtl)]}>{unvan}</Text>
        </View>
      </View>
    </View>
  );
}

// Dar ekranda da kesilmeyen gösterge: ikon, değer, iki satıra sığan etiket.
function Gosterge({ icon, label, value, pct, tone, ayrac = false, rtl }: { icon: string; label: string; value: string; pct?: number; tone?: string; ayrac?: boolean; rtl: boolean }) {
  return <View accessible accessibilityLabel={`${label}: ${value}`} style={{ flex: 1, minWidth: 0, alignItems: "center", paddingHorizontal: 4, borderLeftWidth: ayrac && !rtl ? 1 : 0, borderRightWidth: ayrac && rtl ? 1 : 0, borderColor: C.border }}>
    <GameIcon name={icon} size={20} color={tone || C.gold} />
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.display, fontSize: 17, lineHeight: 22, color: tone || C.parchment, marginTop: 3 }}>{value}</Text>
    <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: C.parchmentMuted, textAlign: "center" }}>{label}</Text>
    {pct != null && <View style={{ alignSelf: "stretch", height: 4, marginTop: 5, marginHorizontal: 8, borderRadius: 2, backgroundColor: C.border, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: 4, backgroundColor: C.gold, alignSelf: rtl ? "flex-end" : "flex-start" }} />
    </View>}
  </View>;
}

// Kademe, aylık kazanç ve unvan payı: kariyerin para karşılığı tek bakışta.
export function KazancSeridi() {
  const { state } = useGame();
  const { t, lang } = useI18n();
  const rtl = lang === "ar";
  if (!state) return null;
  const p = state.player, pr = professionById(p.profession);
  if (!pr) return null;
  const kademe = careerTier(pr, kariyerXp(p)), f = workForecast(state);
  const carpan = Math.round(f.titleMult * 100) / 100;
  return (
    <View style={{ marginTop: -22 }}>
      <Panel>
        <View style={{ flexDirection: yon(rtl) }}>
          <Gosterge rtl={rtl} icon="medal" label={t("meslek.kademe")} value={`${kademe + 1}/${pr.tiers.length}`} pct={((kademe + 1) / pr.tiers.length) * 100} />
          <Gosterge rtl={rtl} icon="coins" label={t("meslek.kazanc")} value={`${f.min}–${f.max}`} tone={C.goldBright} ayrac />
          <Gosterge rtl={rtl} icon="star" label={t("meslek.unvan")} value={`×${carpan}`} ayrac />
        </View>
        <Text style={[{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 20, color: C.parchmentMuted, marginTop: 10 }, hiza(rtl)]}>{t("meslek.kazancNot")}</Text>
      </Panel>
    </View>
  );
}
