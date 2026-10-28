import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "./i18n";
import { View, Text, Modal, Pressable, ScrollView, StyleSheet, ImageBackground, type ImageSourcePropType } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, cancelAnimation, Easing } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Stop, Circle, Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GameIcon } from "./icons";
import { useSadeMod } from "./use-sade-mod";
import { hap } from "./haptics";
import { C, F } from "./theme";

// Ana ekran panelleri: bir yerden (ör. "Karara dön" düğmesi) açılmak istenen paneli bildirir.
export type HomeSheetId = "karar" | "uyari" | "sofra" | "emek" | "ugras" | "gundem" | "gunluk";
const listeners = new Set<(id: HomeSheetId) => void>();
let pending: HomeSheetId | null = null;
export function openHomeSheet(id: HomeSheetId) { pending = id; listeners.forEach((fn) => fn(id)); }
export function useHomeSheet(): [HomeSheetId | null, (id: HomeSheetId | null) => void] {
  const [open, setOpen] = useState<HomeSheetId | null>(() => { const p = pending; pending = null; return p; });
  useEffect(() => { const fn = (id: HomeSheetId) => { pending = null; setOpen(id); }; listeners.add(fn); return () => { listeners.delete(fn); }; }, []);
  return [open, setOpen];
}

// Madalyon düğme: pirinç halka, koyu göbek, kabartma ikon; köşede bildirim rozeti.
// Düz glif yerine işlenmiş bir "oyun simgesi" gibi okunur.
export function HudButton({ icon, label, badge, tone = "gold", pulse = false, onPress, size = 60 }: { icon: string; label: string; badge?: number | "!"; tone?: "gold" | "red" | "green"; pulse?: boolean; onPress: () => void; size?: number }) {
  const reduced = useSadeMod();
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = 0;
    if (!pulse || reduced) return;
    glow.value = withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1, false);
    return () => cancelAnimation(glow);
  }, [pulse, reduced]);
  const ring = tone === "red" ? ["#FFB59A", "#C2412F", "#5E140C"] : tone === "green" ? ["#CFF0B4", "#5E9A48", "#203A16"] : ["#FFF0BE", "#D4A443", "#6B4512"];
  const halo = useAnimatedStyle(() => ({ opacity: 0.25 + glow.value * 0.6, transform: [{ scale: 1 + glow.value * 0.12 }] }));
  const id = "hud" + tone;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { hap("tap"); onPress(); }} style={({ pressed }) => ({ width: size + 26, alignItems: "center", transform: [{ scale: pressed ? 0.94 : 1 }] })}>
    <View style={{ width: size, height: size }}>
      {pulse && <Animated.View pointerEvents="none" style={[{ position: "absolute", top: -6, left: -6, right: -6, bottom: -6, borderRadius: size, backgroundColor: ring[1] }, halo]} />}
      <View><Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="38%" cy="30%" r="75%">
            <Stop offset="0" stopColor={ring[0]} />
            <Stop offset="0.55" stopColor={ring[1]} />
            <Stop offset="1" stopColor={ring[2]} />
          </RadialGradient>
          <RadialGradient id={id + "c"} cx="50%" cy="40%" r="65%">
            <Stop offset="0" stopColor="#3A2A18" />
            <Stop offset="1" stopColor="#120C06" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="48" fill={`url(#${id})`} />
        <Circle cx="50" cy="50" r="39" fill={`url(#${id}c)`} stroke="#0B0703" strokeWidth="2" />
        <Path d="M 22 38 A 30 30 0 0 1 62 18" stroke="rgba(255,240,200,0.35)" strokeWidth="3" fill="none" strokeLinecap="round" />
      </Svg></View>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center" }]}>
        <GameIcon name={icon} size={size * 0.42} color={tone === "red" ? "#FFD2BE" : tone === "green" ? "#D8F5C2" : C.goldBright} />
      </View>
      {badge != null && badge !== 0 && <View style={{ position: "absolute", top: -2, right: -4, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#B5331F", borderWidth: 2, borderColor: "#FBE3C4" }}>
        <Text style={{ fontFamily: F.display, fontSize: 11, lineHeight: 14, color: "#FFF4E2" }}>{badge}</Text>
      </View>}
    </View>
    <Text numberOfLines={2} style={{ marginTop: 4, fontFamily: F.display, fontSize: 11.5, lineHeight: 14, color: "#F7EBD2", textAlign: "center", textShadowColor: "#000", textShadowRadius: 5, textShadowOffset: { width: 0, height: 1 } }}>{label}</Text>
  </Pressable>;
}

// Alttan açılan oyun paneli: başlığında madalyon, arkasında konuya ait sahne; kapatma ve geri tuşu çalışır.
export function GameSheet({ visible, onClose, title, icon, scene, children }: { visible: boolean; onClose: () => void; title: string; icon: string; scene?: ImageSourcePropType; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Pressable accessibilityLabel={title} accessibilityRole="button" onPress={onClose} style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(6,4,2,0.55)" }]} />
      <View style={{ maxHeight: "88%", borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1.5, borderBottomWidth: 0, borderColor: C.goldDim, overflow: "hidden", backgroundColor: "#1A130B" }}>
        {scene && <ImageBackground source={scene} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 150 }} imageStyle={{ opacity: 0.7 }}>
          <LinearGradient colors={["rgba(26,19,11,0.15)", "#1A130B"]} style={{ flex: 1 }} />
        </ImageBackground>}
        <View style={{ alignItems: "center", paddingTop: 8 }}><View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: "rgba(243,210,122,0.55)" }} /></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingTop: scene ? 40 : 12, paddingBottom: 10 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 2, borderColor: C.gold }}>
            <GameIcon name={icon} size={24} color={C.goldBright} />
          </View>
          <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 22, lineHeight: 28, color: "#F7EBD2", textShadowColor: "#000", textShadowRadius: 6 }}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("cine.close")} onPress={onClose} hitSlop={10} style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(14,10,6,0.7)", borderWidth: 1, borderColor: C.borderHi }}>
            <Svg width={16} height={16} viewBox="0 0 16 16"><Path d="M3 3 L13 13 M13 3 L3 13" stroke={C.goldBright} strokeWidth="2.2" strokeLinecap="round" /></Svg>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: insets.bottom + 24 }}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}
