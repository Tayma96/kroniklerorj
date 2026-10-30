// Çevrimiçi dünya "Yakında" ekranı: yeni çevrimiçi mod hazır olana dek çok oyunculu rotaların yerine geçer
// (KRONIKLER_ONLINE_GDD.md D-13, 30 Ekim 2026). Eski sunucuya hiç bağlanmaz.
import { View, Text, Image, StyleSheet, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInUp } from "react-native-reanimated";
import { DesignPressable as Pressable } from "./design-pressable";
import { useI18n } from "./i18n";
import { C, F } from "./theme";
import { GameIcon } from "./icons";
import { MK, Ornament } from "./mk-sus";
import { isReduceMotion } from "./perf";
import { hap } from "./haptics";

const SAHNE = require("../assets/tasarim/v4/venue-mahalle.jpg");
const MADDELER = [
  { icon: "castle", key: "onl.madde1" },
  { icon: "shield", key: "onl.madde2" },
  { icon: "hourglass", key: "onl.madde3" },
];

export function OnlineYakinda() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const rtl = lang === "ar";
  const ins = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const reduced = isReduceMotion();
  const giris = (ms: number) => (reduced ? undefined : FadeInUp.delay(ms).duration(600));
  const geri = () => { hap("tap"); if (router.canGoBack()) router.back(); else router.replace("/"); };
  const hiza = rtl ? "right" as const : "left" as const;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Image source={SAHNE} resizeMode="cover" style={[StyleSheet.absoluteFill, { height: H * 0.62 }]} />
      <LinearGradient pointerEvents="none" colors={["rgba(10,7,4,0.25)", "rgba(10,7,4,0.78)", C.bg]} locations={[0, 0.36, 0.58]} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1, justifyContent: "flex-end", paddingHorizontal: 20, paddingBottom: ins.bottom + 24 }}>
        <Animated.View entering={giris(100)} style={{ alignItems: "center", marginBottom: 14 }}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: MK.gold, backgroundColor: "rgba(201,162,78,0.14)" }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: rtl ? 0 : 2, color: C.goldBright }}>{t("gir.yakinda")}</Text>
          </View>
        </Animated.View>
        <Animated.Text entering={giris(200)} accessibilityRole="header" style={{ fontFamily: F.display, fontSize: 26, lineHeight: 34, color: C.parchment, textAlign: "center" }}>{t("onl.baslik")}</Animated.Text>
        <Animated.View entering={giris(300)} style={{ alignItems: "center", marginVertical: 10 }}><Ornament /></Animated.View>
        <Animated.Text entering={giris(380)} style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 24, color: C.parchmentDim, textAlign: "center", marginBottom: 18 }}>{t("onl.metin")}</Animated.Text>
        <Animated.View entering={giris(480)} style={{ borderWidth: 1, borderColor: MK.frameHi, borderRadius: 8, backgroundColor: "rgba(22,16,10,0.82)", padding: 14, gap: 12 }}>
          {MADDELER.map((m) => (
            <View key={m.key} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: MK.gold, backgroundColor: "#120C06" }}>
                <GameIcon name={m.icon} size={18} color={C.goldBright} />
              </View>
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 21, color: C.parchment, textAlign: hiza }}>{t(m.key)}</Text>
            </View>
          ))}
        </Animated.View>
        <Animated.Text entering={giris(580)} style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 20, color: C.parchmentMuted, textAlign: "center", marginTop: 16 }}>{t("onl.simdilik")}</Animated.Text>
        <Animated.View entering={giris(660)} style={{ marginTop: 18 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("onl.geri")} onPress={geri}
            style={{ minHeight: 52, borderRadius: 6, borderWidth: 1, borderColor: MK.gold, backgroundColor: "rgba(201,162,78,0.16)", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: F.display, fontSize: 15, letterSpacing: rtl ? 0 : 1.5, color: C.goldBright }}>{t("onl.geri")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
