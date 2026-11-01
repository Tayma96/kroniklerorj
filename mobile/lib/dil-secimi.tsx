// İlk açılış dil ekranı: kayıtlı dil yoksa giriş ekranından önce gelir. Seçilen dil oyunun metinlerini ve
// açılış sinematiğinin anlatıcı kaydını belirler. Başlıklar altı dilde sabittir (henüz dil seçilmedi).
import { useState } from "react";
import { View, Text, Pressable, Image, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "./theme";
import { LANGS } from "./locale-data";
import { useI18n } from "./i18n";
import { useSadeMod } from "./use-sade-mod";
import { hap } from "./haptics";
import { Ornament } from "./mk-sus";

const BASLIK = "Dilini seç · Choose your language";
const ALT = "Elige tu idioma · Escolha seu idioma · اختر لغتك · Выберите язык";
const ARKA = require("../assets/yeni_oyun_bg.jpg");

export function DilSecimi() {
  const { setLang } = useI18n();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useSadeMod();
  const [secilen, setSecilen] = useState<string | null>(null);
  const narrow = width < 360;
  const sec = (code: string) => {
    if (secilen) return;
    hap("selection"); setSecilen(code);
    setTimeout(() => setLang(code as Parameters<typeof setLang>[0]), reduced ? 0 : 260);
  };
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Image accessible={false} source={ARKA} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, width, height }} />
    <LinearGradient pointerEvents="none" colors={["rgba(10,7,4,0.88)", "rgba(10,7,4,0.3)", "rgba(10,7,4,0.62)", "rgba(10,7,4,0.97)"]} locations={[0, 0.34, 0.6, 1]} style={{ position: "absolute", top: 0, left: 0, width, height }} />
    <View style={{ flex: 1, paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20, paddingHorizontal: 22, justifyContent: "center" }}>
      <Animated.View entering={reduced ? undefined : FadeIn.duration(900)} style={{ alignItems: "center", marginBottom: 26 }}>
        <Text accessibilityRole="header" style={{ fontFamily: "Cinzel_700Bold", fontSize: narrow ? 34 : 42, lineHeight: narrow ? 44 : 54, letterSpacing: 3, color: C.goldBright, textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 12 }}>KRONIKLER</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 10 }}>
          <View style={{ width: 46, height: 1, backgroundColor: "rgba(201,162,78,0.6)" }} />
          <Ornament size={13} />
          <View style={{ width: 46, height: 1, backgroundColor: "rgba(201,162,78,0.6)" }} />
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 18, lineHeight: 24, color: C.parchment, textAlign: "center" }}>{BASLIK}</Text>
        <Text style={{ marginTop: 4, fontFamily: F.serifItalic, fontSize: 14, lineHeight: 20, color: C.parchmentDim, textAlign: "center" }}>{ALT}</Text>
      </Animated.View>
      <View accessibilityRole="radiogroup" style={{ gap: 10, width: "100%", maxWidth: 420, alignSelf: "center" }}>
        {LANGS.map((l, i) => {
          const aktif = secilen === l.code;
          return <Animated.View key={l.code} entering={reduced ? undefined : FadeInUp.delay(250 + i * 70).duration(480)}>
            <Pressable onPress={() => sec(l.code)} accessibilityRole="radio" accessibilityLabel={l.label} accessibilityState={{ checked: aktif, selected: aktif }}
              style={({ pressed }) => ({ minHeight: 56, borderRadius: 10, borderWidth: aktif ? 2 : 1.5, borderColor: aktif ? C.goldBright : "rgba(168,130,63,0.75)", backgroundColor: aktif ? "#2A1F13" : pressed ? "#1F170E" : "rgba(20,14,8,0.92)", flexDirection: l.rtl ? "row-reverse" : "row", alignItems: "center", paddingHorizontal: 18, gap: 14 })}>
              <Text style={{ width: 30, fontFamily: "Cinzel_700Bold", fontSize: 12, letterSpacing: 1.5, color: aktif ? C.goldBright : C.goldDim, textAlign: "center" }}>{l.code.toUpperCase()}</Text>
              <View style={{ width: 1, alignSelf: "stretch", marginVertical: 12, backgroundColor: "rgba(201,162,78,0.35)" }} />
              <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 20, lineHeight: 27, color: aktif ? C.goldBright : C.parchment, textAlign: l.rtl ? "right" : "left" }}>{l.label}</Text>
            </Pressable>
          </Animated.View>;
        })}
      </View>
    </View>
  </View>;
}
