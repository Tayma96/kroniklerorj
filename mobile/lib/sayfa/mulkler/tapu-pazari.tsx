// Tapu pazarı: bu şehirde alınabilecek mülkler, resimli tapu kartları hâlinde (fiyat, getiri, geri ödeme, şart).
import { View, Text, Image, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { MULK_YAS, PROPERTY_TYPES, buyProperty, mulkSarti, propAlimTahmini, propBuyCost, type GameState } from "../../game";
import { placeName } from "../../locale-data";
import { mulkImage } from "../../assets";
import { useI18n, applyParams } from "../../i18n";
import { hap } from "../../haptics";
import { playCoin } from "../../sound";
import { useSadeMod } from "../../use-sade-mod";
import { GameIcon } from "../../icons";
import { OrnatePanel } from "../../ornament-ui";
import { C, F } from "../../theme";
import { Akce, Baslik, Plaka, fmt } from "./parca";

type Apply = (fn: (s: GameState) => GameState) => void;

function Satir({ icon, text, tone = C.parchmentDim, rtl }: { icon: string; text: string; tone?: string; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-start", gap: 5 }}>
    <View style={{ paddingTop: 2 }}><GameIcon name={icon} size={13} color={tone} /></View>
    <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: tone, textAlign: rtl ? "right" : "left" }}>{text}</Text>
  </View>;
}

function TapuKarti({ id, state, apply, delay }: { id: string; state: GameState; apply: Apply; delay: number }) {
  const { t, lang } = useI18n(); const rtl = lang === "ar"; const sade = useSadeMod();
  const p = state.player, cost = propBuyCost(state, id), sart = mulkSarti(state, id), ta = propAlimTahmini(state, id);
  const can = p.money >= cost && p.age >= MULK_YAS && sart.ok;
  const short = sart.ok && p.age >= MULK_YAS ? Math.max(0, cost - p.money) : 0;
  const owned = p.properties.filter((pr) => pr.type === id).length, name = t("pt." + id);
  return <Animated.View entering={sade ? undefined : FadeInDown.delay(delay).duration(360)} style={{ flexBasis: "46%", flexGrow: 1, borderRadius: 8, borderWidth: 1, borderColor: can ? C.borderHi : C.border, overflow: "hidden", backgroundColor: "rgba(22,16,9,0.94)" }}>
    <View style={{ height: 88 }}>
      <Image accessible={false} source={mulkImage(id)} resizeMode="cover" style={{ width: "100%", height: "100%", opacity: can ? 1 : 0.75 }} />
      <LinearGradient pointerEvents="none" colors={["rgba(8,5,2,0)", "rgba(8,5,2,0.9)"]} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
      <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ position: "absolute", left: 8, right: 8, bottom: 5, fontFamily: F.display, fontSize: 16, lineHeight: 21, color: C.parchment, textAlign: rtl ? "right" : "left", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 }}>{name}</Text>
      {owned > 0 && <View style={{ position: "absolute", top: 6, right: rtl ? undefined : 6, left: rtl ? 6 : undefined, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: C.gold }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, lineHeight: 15, color: C.inkOnGold }}>{applyParams(t("mulkler.ownedN"), [owned], lang)}</Text>
      </View>}
    </View>
    <View style={{ flex: 1, padding: 8, gap: 4 }}>
      <Akce value={ta.aylik} sign lang={lang} size={15} tone={ta.aylik >= 0 ? C.sage : C.blood} suffix={t("mulkler.ay")} rtl={rtl} />
      {ta.yil != null && <Satir icon="hourglass" text={applyParams(t("mulk.geriOdeme"), [ta.yil], lang)} rtl={rtl} />}
      <Satir icon="iliskiler" text={applyParams(t("mulkler.slots"), [PROPERTY_TYPES[id].slots], lang)} rtl={rtl} />
      {!sart.ok && <Satir icon="medal" text={applyParams(t("mulk.sart"), [sart.itibar, sart.unvan + 1], lang)} tone={C.ember} rtl={rtl} />}
      <View style={{ flexGrow: 1, minHeight: 4 }} />
      <Plaka primary icon="scroll" label={t("mulkler.buy")} cost={cost} costTone={short ? C.blood : undefined} lang={lang} rtl={rtl} disabled={!can}
        a11y={`${t("mulkler.buy")}: ${name}, ${fmt(cost, lang)}`} onPress={() => { hap("success"); playCoin(); apply((s) => buyProperty(s, id)); }} />
      {short > 0 && <Text style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 17, color: C.blood, textAlign: "center" }}>{applyParams(t("mulkler.short"), [fmt(short, lang)], lang)}</Text>}
    </View>
  </Animated.View>;
}

export function TapuPazari({ state, apply }: { state: GameState; apply: Apply }) {
  const { t, lang } = useI18n(); const rtl = lang === "ar"; const p = state.player;
  const note = { fontFamily: F.serifItalic, fontSize: 13.5, lineHeight: 19, color: C.parchmentMuted, textAlign: rtl ? "right" as const : "left" as const };
  return <OrnatePanel>
    <Baslik icon="map" title={`${t("mulk.buyHere")} · ${placeName(p.location_name, lang)}`} rtl={rtl} />
    {p.age < MULK_YAS && <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, padding: 10, marginBottom: 10, borderRadius: 7, borderWidth: 1, borderColor: C.ember + "77", backgroundColor: C.ember + "14" }}>
      <GameIcon name="hourglass" size={18} color={C.ember} />
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 14.5, lineHeight: 20, color: C.parchmentDim, textAlign: rtl ? "right" : "left" }}>{applyParams(t("mulk.yasKucuk"), [MULK_YAS], lang)}</Text>
    </View>}
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 10 }}>
      {Object.keys(PROPERTY_TYPES).map((id, k) => <TapuKarti key={id} id={id} state={state} apply={apply} delay={60 + k * 50} />)}
    </View>
    <Text style={[note, { marginTop: 12 }]}>{t("mulk.locNote")}</Text>
    <Text style={[note, { marginTop: 4 }]}>{t("mulk.priceNote")}</Text>
  </OrnatePanel>;
}
