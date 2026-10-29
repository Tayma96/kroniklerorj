// Menü merkezi bileşenleri — claude-paket mockup ekran 3 (şehir) dilinde: aydınlık sahne başlığı,
// kendi resmiyle mekân kartları, altın çerçeve, madalyon rafı. Sade modda giriş/dokunma hareketi kapalı.
import { useEffect, type ReactNode } from "react";
import { View, Text, Image, Pressable, StyleSheet, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, cancelAnimation, Easing } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { GameIcon } from "../../icons";
import { hap } from "../../haptics";
import { playTap } from "../../sound";
import { MK, MkPanel, Ornament } from "../../home-mockup-ui";
import { C, F } from "../../theme";
import type { Rozet } from "./menu-data";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const CREAM = "#F7EBD2", SHADE = "rgba(0,0,0,0.92)";

// Dokunma: hafif çöküş + ses + titreşim. Sade modda yalnız anlık soluklaşma.
export function MenuPress({ onPress, label, hint, style, reduced, children }: { onPress: () => void; label: string; hint?: string; style?: StyleProp<ViewStyle>; reduced: boolean; children: ReactNode }) {
  const scale = useSharedValue(1), dim = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: dim.value }));
  return <AnimatedPressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} hitSlop={4}
    onPressIn={() => { if (reduced) dim.value = 0.82; else scale.value = withTiming(0.965, { duration: 90, easing: Easing.out(Easing.quad) }); }}
    onPressOut={() => { dim.value = 1; if (!reduced) scale.value = withSpring(1, { damping: 14, stiffness: 240 }); }}
    onPress={() => { hap("tap"); playTap(); onPress(); }}
    style={[{ minHeight: 44 }, style, anim]}>
    {children}
  </AnimatedPressable>;
}

// Bekleyen iş rozeti: acil olan kan kırmızısı; sade değilse bir kez nabız atar.
export function RozetDot({ r, reduced, size = 22 }: { r: Rozet; reduced: boolean; size?: number }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduced || !r.urgent) return;
    pulse.value = withRepeat(withSequence(withTiming(1.14, { duration: 520 }), withTiming(1, { duration: 520 })), 3, false);
    return () => cancelAnimation(pulse);
  }, [reduced, r.urgent, pulse]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  if (r.n <= 0) return null;
  return <Animated.View pointerEvents="none" style={[{ minWidth: size, height: size, borderRadius: size / 2, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", backgroundColor: r.urgent ? "#B8352B" : MK.gold, borderWidth: 1.5, borderColor: r.urgent ? "#FFD2C2" : "#FFF0C8", shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 4, elevation: 4 }, anim]}>
    <Text style={{ fontFamily: F.display, fontSize: 12, lineHeight: 15, color: r.urgent ? "#FFF4EC" : C.inkOnGold }}>{r.n}</Text>
  </Animated.View>;
}

// Sahne başlığı: mevsimin kasabası (mockup ekran 3). Kasaba resimlerinin solunda koyu çardak var; yazı her mevsimde
// okunsun diye krem yazı + koyu gölge ve üstte hafif karartma. Dişli = Ayarlar, harita = Diyar Haritası.
// Altta altın "Şehri Gez" düğmesi Şehir / Diyar sayfasına götürür.
export function MenuHero({ source, topInset, seasonIcon, title, sub, rtl, narrow, reduced, cta, ctaHint, onCta, mapLabel, onMap, settingsLabel, onSettings }: {
  source: ImageSourcePropType; topInset: number; seasonIcon: string; title: string; sub: string; rtl: boolean; narrow: boolean; reduced: boolean;
  cta: string; ctaHint: string; onCta: () => void; mapLabel: string; onMap: () => void; settingsLabel: string; onSettings: () => void;
}) {
  const h = (narrow ? 186 : 204) + topInset;
  const iconBtn = (icon: string, label: string, onPress: () => void) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => { hap("tap"); playTap(); onPress(); }} hitSlop={4}
    style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? "rgba(20,14,8,0.85)" : "rgba(20,14,8,0.55)", borderWidth: 1, borderColor: "rgba(226,182,90,0.55)" })}>
    <GameIcon name={icon} size={20} color={MK.gold} />
  </Pressable>;
  return <View style={{ height: h, overflow: "hidden", borderBottomWidth: 1, borderColor: MK.frame }}>
    <Image accessible={false} source={source} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, right: 0, height: h + 30, width: "100%" }} />
    <LinearGradient pointerEvents="none" colors={["rgba(8,5,2,0.78)", "rgba(8,5,2,0.18)", "rgba(21,16,10,0)", "rgba(21,16,10,0.9)"]} locations={[0, 0.42, 0.6, 1]} style={StyleSheet.absoluteFill} />
    <View style={{ position: "absolute", top: topInset + 12, left: 0, right: 0, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", paddingHorizontal: 10, gap: 6 }}>
      <View style={{ width: 34, alignItems: "center" }}><GameIcon name={seasonIcon} size={22} color={MK.gold} /></View>
      <View style={{ width: 1.5, height: 38, backgroundColor: "rgba(226,182,90,0.55)" }} />
      <View style={{ flex: 1, minWidth: 0, paddingHorizontal: 4, alignItems: rtl ? "flex-end" : "flex-start" }}>
        <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.display, fontSize: narrow ? 24 : 30, lineHeight: narrow ? 30 : 36, color: CREAM, textShadowColor: SHADE, textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } }}>{title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 18, color: "#F1E2C2", textShadowColor: SHADE, textShadowRadius: 7 }}>{sub}</Text>
      </View>
      {iconBtn("map", mapLabel, onMap)}
      {iconBtn("ayarlar", settingsLabel, onSettings)}
    </View>
    <View style={{ position: "absolute", bottom: 12, left: 12, right: 12, flexDirection: rtl ? "row-reverse" : "row" }}>
      <MenuPress label={cta} hint={ctaHint} onPress={onCta} reduced={reduced} style={{ borderRadius: 5, borderWidth: 1, borderColor: "#FFE8A9", overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 6, elevation: 5 }}>
        <LinearGradient colors={["#F4D889", "#DDAE4D", "#B77C2F"]} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, minHeight: 44, paddingHorizontal: 14 }}>
          <GameIcon name="castle" size={20} color={C.inkOnGold} />
          <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 14, letterSpacing: 0.6, color: C.inkOnGold }}>{cta}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 20, lineHeight: 22, color: C.inkOnGold }}>{rtl ? "‹" : "›"}</Text>
        </LinearGradient>
      </MenuPress>
    </View>
  </View>;
}

// Grup başlığı: pusula süsü, altın başlık, sağa uzanan pirinç hat.
export function GroupHead({ title, rtl }: { title: string; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, marginBottom: 9, paddingHorizontal: 2 }}>
    <Ornament size={17} />
    <Text accessibilityRole="header" style={{ fontFamily: F.serif, fontSize: 19, lineHeight: 23, color: MK.gold }}>{title}</Text>
    <LinearGradient pointerEvents="none" start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} colors={["rgba(201,162,78,0.7)", "rgba(201,162,78,0)"]} style={{ flex: 1, height: 1 }} />
  </View>;
}

// Mekân kartı: kendi sahnesi tüm kartı kaplar; alt kenarda ad, kısa açıklama ve ok (mockup: Pazar, Mahalle...).
// `emblem`: kare arma gibi kırpılmaması gereken resim — koyu zeminde madalyon olarak durur.
export function VenueTile({ title, sub, source, r, width, height, rtl, reduced, onPress, emblem = false }: { title: string; sub: string; source: ImageSourcePropType; r: Rozet; width: number | `${number}%`; height: number; rtl: boolean; reduced: boolean; onPress: () => void; emblem?: boolean }) {
  const compact = typeof width === "number"; // yarım kart: madalyon üstte ortada, yazı altta tam genişlik
  const medal = compact ? Math.min(60, height - 70) : Math.min(84, height - 20);
  const label = r.n > 0 ? `${title} (${r.n})` : title;
  return <MenuPress label={label} hint={sub} onPress={onPress} reduced={reduced} style={{ width, height, borderRadius: 6, borderWidth: 1, borderColor: r.urgent && r.n > 0 ? "#B8463A" : MK.frame, backgroundColor: MK.panel, overflow: "hidden" }}>
    {emblem ? <>
      <LinearGradient pointerEvents="none" start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 1 }} colors={["#33261A", "#1E160D", "#120D07"]} style={StyleSheet.absoluteFill} />
      <Image accessible={false} source={source} resizeMode="cover" style={[{ position: "absolute", top: -height * 0.35, width: height * 1.7, height: height * 1.7, opacity: 0.07 }, rtl ? { right: -height * 0.3 } : { left: -height * 0.3 }]} />
      <Image accessible={false} source={source} resizeMode="cover" style={[{ position: "absolute", top: compact ? 12 : (height - medal) / 2, width: medal, height: medal, borderRadius: medal / 2, borderWidth: 2, borderColor: MK.frameHi }, compact ? { left: ((width as number) - medal) / 2 - 1 } : rtl ? { left: 16 } : { right: 36 }]} />
    </> : <>
      <Image accessible={false} source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={["rgba(12,8,4,0)", "rgba(12,8,4,0.08)", "rgba(12,8,4,0.78)", "rgba(12,8,4,0.94)"]} locations={[0, 0.36, 0.7, 1]} style={StyleSheet.absoluteFill} />
    </>}
    <View pointerEvents="none" style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderRadius: 4, borderWidth: 1, borderColor: "rgba(226,182,90,0.22)" }} />
    <View pointerEvents="none" style={[{ position: "absolute", top: 7 }, rtl ? { left: 7 } : { right: 7 }]}><RozetDot r={r} reduced={reduced} /></View>
    <View pointerEvents="none" style={{ position: "absolute", left: 10, right: 8, bottom: 7, flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-end", gap: 4 }}>
      <View style={[{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }, emblem && !compact ? (rtl ? { paddingLeft: medal + 20 } : { paddingRight: medal + 30 }) : null]}>
        <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 18, lineHeight: 20, color: "#FBF0D9", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 6, textAlign: rtl ? "right" : "left" }}>{title}</Text>
        <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 14.5, color: "#DCCBA6", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 4, textAlign: rtl ? "right" : "left" }}>{sub}</Text>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 22, lineHeight: 24, color: "#F4E8CF" }}>{rtl ? "‹" : "›"}</Text>
    </View>
  </MenuPress>;
}

// Defter rafı: kayıt sayfaları madalyon olarak (yuvarlak altın halka + ikon + ad).
export function DefterShelf({ items, cols, rtl, reduced }: { items: { key: string; label: string; icon: string; r: Rozet; onPress: () => void }[]; cols: number; rtl: boolean; reduced: boolean }) {
  return <MkPanel style={{ marginHorizontal: 0 }}>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", justifyContent: "center", paddingVertical: 12, paddingHorizontal: 4, rowGap: 8 }}>
      {items.map((m) => <MenuPress key={m.key} label={m.r.n > 0 ? `${m.label} (${m.r.n})` : m.label} onPress={m.onPress} reduced={reduced} style={{ width: `${100 / cols}%`, alignItems: "center", paddingHorizontal: 3, paddingVertical: 2 }}>
        <View style={{ width: 54, height: 54 }}>
          <LinearGradient colors={["#F1D488", "#B9893A", "#6E4B1C"]} style={{ width: 54, height: 54, borderRadius: 27, padding: 2.5 }}>
            <View style={{ flex: 1, borderRadius: 25, backgroundColor: "#1A130B", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.5)" }}>
              <GameIcon name={m.icon} size={25} color={MK.gold} />
            </View>
          </LinearGradient>
          <View pointerEvents="none" style={[{ position: "absolute", top: -4 }, rtl ? { left: -6 } : { right: -6 }]}><RozetDot r={m.r} reduced={reduced} size={20} /></View>
        </View>
        <Text numberOfLines={2} style={{ marginTop: 5, fontFamily: F.serif, fontSize: 13, lineHeight: 15, color: MK.ink, textAlign: "center" }}>{m.label}</Text>
      </MenuPress>)}
    </View>
  </MkPanel>;
}

// Seni Bekleyenler: rozetli sayfalar tek bakışta; dokununca oraya gider.
export function PendingStrip({ title, items, rtl, reduced }: { title: string; items: { key: string; label: string; icon: string; r: Rozet; onPress: () => void }[]; rtl: boolean; reduced: boolean }) {
  return <MkPanel style={{ marginHorizontal: 0 }}>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingTop: 10 }}>
      <Ornament size={15} />
      <Text accessibilityRole="header" style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: MK.gold }}>{title}</Text>
    </View>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 8, padding: 10, paddingTop: 8 }}>
      {items.map((m) => <MenuPress key={m.key} label={`${m.label} (${m.r.n})`} onPress={m.onPress} reduced={reduced}
        style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7, paddingHorizontal: 10, borderRadius: 22, borderWidth: 1, borderColor: m.r.urgent ? "#B8463A" : "rgba(201,162,78,0.55)", backgroundColor: m.r.urgent ? "rgba(122,30,21,0.55)" : "rgba(42,31,19,0.85)" }}>
        <GameIcon name={m.icon} size={17} color={m.r.urgent ? "#F4C9B8" : MK.gold} />
        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 17, color: "#F4E8CF", flexShrink: 1 }}>{m.label}</Text>
        <RozetDot r={m.r} reduced={reduced} size={20} />
      </MenuPress>)}
    </View>
  </MkPanel>;
}

// Alt sıra: Ayarlar ve Yeni Hayat (alt alta; uzun dillerde de kesilmez).
export function FooterButton({ icon, label, danger = false, onPress, reduced, rtl }: { icon: string; label: string; danger?: boolean; onPress: () => void; reduced: boolean; rtl: boolean }) {
  const tone = danger ? "#E07A6A" : MK.gold;
  return <MenuPress label={label} onPress={onPress} reduced={reduced} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 9, minHeight: 48, paddingHorizontal: 12, borderRadius: 5, borderWidth: 1, borderColor: danger ? "rgba(200,64,64,0.55)" : MK.frame, backgroundColor: danger ? "rgba(92,22,16,0.55)" : "rgba(24,18,11,0.92)" }}>
    <GameIcon name={icon} size={18} color={tone} />
    <Text numberOfLines={2} style={{ flexShrink: 1, textAlign: "center", fontFamily: F.display, fontSize: 12.5, letterSpacing: 1, color: danger ? "#F0A898" : MK.ink }}>{label}</Text>
  </MenuPress>;
}
