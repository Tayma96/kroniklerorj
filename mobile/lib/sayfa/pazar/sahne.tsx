// Pazar sahnesi: kenardan kenara çarşı resmi, sabit kese + pazarlık hakkı + sekme çubuğu.
import { useEffect, useRef, useState } from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameIcon } from "../../icons";
import { BackLabel } from "../../ui";
import { useI18n } from "../../i18n";
import { useSadeMod } from "../../use-sade-mod";
import { C, F, T } from "../../theme";
import { Madalyon } from "./parcalar";

const CARSI = require("../../../assets/tasarim/v4/venue-pazar.jpg");
export const KENAR = 14; // sayfanın yatay iç boşluğu; sahne ve çubuk ekran kenarına taşar

export function PazarSahnesi({ title, econ, econTone, spec, onBack, rtl }: { title: string; econ: string; econTone: string; spec: string; onBack: () => void; rtl: boolean }) {
  const { t } = useI18n();
  return <View style={{ height: 184, marginHorizontal: -KENAR, overflow: "hidden", borderBottomWidth: 1, borderColor: C.goldDim + "88" }}>
    <Image accessible={false} source={CARSI} resizeMode="cover" style={{ position: "absolute", width: "100%", height: "100%" }} />
    <LinearGradient pointerEvents="none" colors={["rgba(8,5,2,0.62)", "rgba(8,5,2,0.05)", "rgba(8,5,2,0.25)", C.bg + "F0"]} locations={[0, 0.3, 0.6, 1]} style={StyleSheet.absoluteFill} />
    <Pressable onPress={onBack} accessibilityLabel={t("common.back")} style={{ position: "absolute", top: 8, left: rtl ? undefined : KENAR - 4, right: rtl ? KENAR - 4 : undefined, minHeight: 44, justifyContent: "center", paddingHorizontal: 10, borderRadius: 8, backgroundColor: "rgba(14,10,6,0.6)" }}>
      <BackLabel />
    </Pressable>
    <View style={{ position: "absolute", left: KENAR + 2, right: KENAR + 2, bottom: 12 }}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
        <Madalyon icon="pazar" size={30} />
        <Text style={{ fontFamily: F.display, fontSize: 13, letterSpacing: 2, color: C.goldBright, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6 }}>{t("scr.pazar").toUpperCase()}</Text>
      </View>
      <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 2, fontFamily: F.display, fontSize: 32, lineHeight: 40, color: C.parchment, textAlign: rtl ? "right" : "left", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } }}>{title}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: T.body, lineHeight: 20, color: C.parchment, textAlign: rtl ? "right" : "left", textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 8 }}>
        <Text style={{ color: econTone, fontFamily: F.display, fontSize: 14 }}>{econ}</Text>{" · " + spec}
      </Text>
    </View>
  </View>;
}

// Tellal: aktif piyasa olayı sahnenin hemen altında bir duyuru şeridi olarak.
export function TellalSeridi({ text, up, rtl }: { text: string; up: boolean; rtl: boolean }) {
  const { t } = useI18n();
  const tone = up ? C.blood : C.sage;
  return <View accessible accessibilityLabel={`${t("pazar.crier")}: ${text}`} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, marginTop: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: tone + "88", backgroundColor: tone + "1C" }}>
    <GameIcon name={up ? "coins" : "wheat"} size={22} color={tone} />
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 1.2, color: tone, textAlign: rtl ? "right" : "left" }}>{t("pazar.crier").toUpperCase()}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 20, color: C.parchment, textAlign: rtl ? "right" : "left" }}>{text}</Text>
    </View>
  </View>;
}

export type SekmeId = "food" | "goods" | "arms" | "caravan" | "sarraf";
export const SEKMELER: { id: SekmeId; icon: string; key: string }[] = [
  { id: "food", icon: "bread", key: "pazar.tab.food" },
  { id: "goods", icon: "amphora", key: "pazar.tab.goods" },
  { id: "arms", icon: "crossed-swords", key: "pazar.tab.arms" },
  { id: "caravan", icon: "camel", key: "pazar.tab.caravan" },
  { id: "sarraf", icon: "coins", key: "pazar.tab.sarraf" },
];

// Bu ayın pazarlık hakkı: alış ve satış için birer jeton.
function Jeton({ label, ready }: { label: string; ready: boolean }) {
  const { t } = useI18n();
  return <View accessible accessibilityLabel={`${label}: ${t(ready ? "pazar.tok.ready" : "pazar.tok.spent")}`} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7, minHeight: 26, borderRadius: 13, borderWidth: 1, borderColor: ready ? C.gold + "99" : C.border, backgroundColor: ready ? "rgba(221,180,90,0.12)" : "transparent" }}>
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ready ? C.goldBright : "transparent", borderWidth: 1, borderColor: ready ? C.goldBright : C.parchmentMuted }} />
    <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: ready ? C.parchment : C.parchmentMuted, textDecorationLine: ready ? "none" : "line-through" }}>{label}</Text>
  </View>;
}

// Sabit çubuk: kese her an görünür; harcayınca kısa bir fark çipi belirir.
export function KeseCubugu({ money, buyReady, sellReady, tab, onTab, dots, rtl }: {
  money: number; buyReady: boolean; sellReady: boolean; tab: SekmeId; onTab: (id: SekmeId) => void; dots: Partial<Record<SekmeId, string>>; rtl: boolean;
}) {
  const { t } = useI18n();
  const sade = useSadeMod();
  const { width } = useWindowDimensions();
  const prev = useRef(money);
  const [fark, setFark] = useState<{ v: number; k: number } | null>(null);
  useEffect(() => {
    const d = money - prev.current; prev.current = money;
    if (!d) return;
    setFark({ v: d, k: Date.now() });
    const id = setTimeout(() => setFark(null), 1700);
    return () => clearTimeout(id);
  }, [money]);
  return <View style={{ marginHorizontal: -KENAR, paddingHorizontal: KENAR, paddingTop: 8, borderBottomWidth: 1, borderBottomColor: C.goldDim + "AA", backgroundColor: "rgba(14,10,6,0.97)" }}>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
      <View accessible accessibilityLabel={`${t("pazar.purse")}: ${money} ⚜`} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <Madalyon icon="coins" size={36} />
        <View>
          <Text style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 14, color: C.parchmentMuted, textAlign: rtl ? "right" : "left" }}>{t("pazar.purse")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: 19, lineHeight: 24, color: C.goldBright }}>{money} ⚜</Text>
        </View>
        {fark && <Animated.View key={fark.k} entering={sade ? undefined : FadeIn.duration(160)} exiting={sade ? undefined : FadeOut.duration(400)} style={{ paddingHorizontal: 6, borderRadius: 5, backgroundColor: (fark.v > 0 ? C.sage : C.blood) + "2A" }}>
          <Text style={{ fontFamily: F.display, fontSize: 13, color: fark.v > 0 ? C.sage : C.blood }}>{fark.v > 0 ? "+" : "−"}{Math.abs(fark.v)}</Text>
        </Animated.View>}
      </View>
      <View style={{ flex: 1, minWidth: 0, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
        <GameIcon name="scales" size={17} color={C.goldDim} />
        {width >= 370 ? <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 11.5, letterSpacing: 0.8, color: C.goldDim }}>{t("misc.bargain")}</Text> : null}
        <Jeton label={t("pazar.tok.buy")} ready={buyReady} />
        <Jeton label={t("pazar.tok.sell")} ready={sellReady} />
      </View>
    </View>
    <View accessibilityRole="tablist" style={{ flexDirection: rtl ? "row-reverse" : "row", marginTop: 6 }}>
      {SEKMELER.map((s) => {
        const on = s.id === tab;
        const dot = dots[s.id];
        return <Pressable key={s.id} accessibilityRole="tab" accessibilityLabel={t(s.key)} accessibilityState={{ selected: on }} onPress={() => onTab(s.id)}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 56, alignItems: "center", justifyContent: "center", paddingTop: 4, paddingBottom: 6, paddingHorizontal: 1, borderBottomWidth: 2.5, borderBottomColor: on ? C.gold : "transparent", backgroundColor: on ? "rgba(221,180,90,0.10)" : pressed ? "rgba(221,180,90,0.05)" : "transparent", borderTopLeftRadius: 8, borderTopRightRadius: 8 })}>
          <View>
            <GameIcon name={s.icon} size={21} color={on ? C.goldBright : C.parchmentMuted} />
            {dot ? <View style={{ position: "absolute", top: -2, right: -5, width: 9, height: 9, borderRadius: 5, backgroundColor: dot, borderWidth: 1.5, borderColor: C.bg }} /> : null}
          </View>
          <Text numberOfLines={2} style={{ marginTop: 3, fontFamily: on ? F.display : F.serif, fontSize: on ? 11.5 : 13, lineHeight: 15, color: on ? C.goldBright : C.parchmentDim, textAlign: "center" }}>{t(s.key)}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
