// Şehir sayfası parçaları — claude-paket mockup ekran 3 ("Demirhan") dili:
// pirinç çerçeveli koyu paneller, pusula süslü başlık, göstergeli durum, resimli mekân kartları.
import type { ReactNode } from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { DesignPressable as Pressable } from "../../design-pressable";
import { PressableScale } from "../../ui";
import { GameIcon } from "../../icons";
import { C, F } from "../../theme";

export const SK = {
  side: 10,
  frame: "#A8823F",
  frameHi: "#C9A24E",
  panel: "rgba(24,18,11,0.95)",
  well: "#100C07",
  ink: "#EDE1C8",
  muted: "#B9A57F",
  gold: "#E2B65A",
  hair: "rgba(140,107,55,0.45)",
};

export function Ornament({ size = 16, color = SK.gold }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 1 L13.6 10.4 L23 12 L13.6 13.6 L12 23 L10.4 13.6 L1 12 L10.4 10.4 Z" fill={color} />
    <Circle cx="12" cy="12" r="5.2" fill="none" stroke={color} strokeWidth="1.3" />
  </Svg>;
}

// Panel: koyu zemin, pirinç çerçeve, içte ince altın hat. `tone="war"` kızıl savaş paneli.
export function SPanel({ children, style, tone }: { children: ReactNode; style?: object; tone?: "war" | "gold" }) {
  const war = tone === "war", gold = tone === "gold";
  return <View style={[{ marginHorizontal: SK.side, marginBottom: 10, borderRadius: 5, borderWidth: 1, borderColor: war ? "#A13A2B" : gold ? SK.frameHi : SK.frame, backgroundColor: SK.panel, overflow: "hidden" }, style]}>
    {war && <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={["#5C1610", "#3A0F0B", "#1E0D08"]} style={StyleSheet.absoluteFill} />}
    {gold && <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={["rgba(226,182,90,0.10)", "rgba(226,182,90,0)"]} style={StyleSheet.absoluteFill} />}
    <View pointerEvents="none" style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderRadius: 3, borderWidth: 1, borderColor: war ? "rgba(255,190,160,0.14)" : "rgba(201,162,78,0.16)" }} />
    {children}
  </View>;
}

export function SPanelHeader({ title, icon, right, rtl, color = SK.gold }: { title: string; icon?: string; right?: ReactNode; rtl: boolean; color?: string }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
    {icon ? <GameIcon name={icon} size={17} color={color} /> : <Ornament color={color} />}
    <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.serif, fontSize: 18, lineHeight: 22, color, textAlign: rtl ? "right" : "left" }}>{title}</Text>
    {right}
  </View>;
}

// Doluluk çubuğu: altın; düşükse kızıl.
export function Bar({ pct, low = false, height = 6, rtl = false }: { pct: number; low?: boolean; height?: number; rtl?: boolean }) {
  const w = Math.max(0, Math.min(100, pct));
  return <View style={{ height, borderRadius: height / 2, borderWidth: 1, borderColor: "rgba(168,130,63,0.7)", backgroundColor: "#0B0805", overflow: "hidden" }}>
    {w > 0 && <LinearGradient start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} colors={low ? ["#7E2419", "#D2553F"] : [C.goldDim, C.goldBright]} style={{ width: `${w}%`, height: "100%", alignSelf: rtl ? "flex-end" : "flex-start" }} />}
  </View>;
}

// Mockup'taki üçlü gösterge: ikon · ad · çubuk · değer. Ad sığmazsa (dar ekran, uzun dil)
// ikon değer satırına iner, ad bütün sütunu kullanır.
export function Gauge({ icon, label, pct, value, unit, low, rtl, sep, stacked }: { icon: string; label: string; pct: number; value: string; unit?: string; low?: boolean; rtl: boolean; sep: boolean; stacked: boolean }) {
  const tone = low ? "#E8796A" : SK.gold;
  const val = <Text numberOfLines={1} style={{ flex: 1, textAlign: rtl ? "left" : "right", fontFamily: F.display, fontSize: 12.5, lineHeight: 15, color: low ? "#E8796A" : "#F4E8CF" }}>{value}<Text style={{ fontFamily: F.serif, fontSize: 11, color: SK.muted }}>{unit}</Text></Text>;
  return <View accessible accessibilityLabel={`${label}: ${value}${unit || ""}`} style={{ flex: 1, minWidth: 0, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7, paddingHorizontal: stacked ? 6 : 8, borderLeftWidth: !rtl && sep ? 1 : 0, borderRightWidth: rtl && sep ? 1 : 0, borderColor: "rgba(201,162,78,0.28)" }}>
    {!stacked && <GameIcon name={icon} size={24} color={tone} />}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 15, color: SK.ink, textAlign: rtl ? "right" : "left" }}>{label}</Text>
      <View style={{ marginTop: 4 }}><Bar pct={pct} low={low} rtl={rtl} /></View>
      <View style={{ marginTop: 3, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
        {stacked && <GameIcon name={icon} size={15} color={tone} />}
        {val}
      </View>
    </View>
  </View>;
}

// Kahraman sahnesindeki küçük bilgi rozeti (dokunulmaz).
export function Chip({ icon, text, color = SK.gold, rtl }: { icon: string; text: string; color?: string; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 5, minHeight: 26, paddingHorizontal: 9, borderRadius: 13, borderWidth: 1, borderColor: "rgba(201,162,78,0.55)", backgroundColor: "rgba(14,10,6,0.78)" }}>
    <GameIcon name={icon} size={14} color={color} />
    <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: color === SK.gold ? SK.ink : color }}>{text}</Text>
  </View>;
}

// Büyük resimli mekân kartı (Pazar, Mahalle, Mülkler, Hanedan).
export function VenueCard({ source, title, desc, onPress, rtl, height }: { source: ImageSourcePropType; title: string; desc: string; onPress: () => void; rtl: boolean; height: number }) {
  const narrow = useWindowDimensions().width < 360;
  return <PressableScale accessibilityLabel={`${title}. ${desc}`} onPress={onPress} haptic="tap"
    style={{ flexBasis: "46%", flexGrow: 1, height, borderRadius: 5, borderWidth: 1, borderColor: SK.frame, backgroundColor: C.card, overflow: "hidden" }}>
    <Image accessible={false} source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
    <LinearGradient pointerEvents="none" colors={["rgba(14,10,6,0)", "rgba(14,10,6,0.55)", "rgba(14,10,6,0.96)"]} locations={[0.3, 0.62, 1]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderRadius: 3, borderWidth: 1, borderColor: "rgba(226,182,90,0.22)" }} />
    <View style={{ flex: 1, flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-end", gap: 4, paddingHorizontal: 10, paddingBottom: 8 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: narrow ? 15 : 17, lineHeight: narrow ? 20 : 22, color: "#F7EBD2", textShadowColor: "#000", textShadowRadius: 5, textAlign: rtl ? "right" : "left" }}>{title}</Text>
        <Text numberOfLines={narrow ? 3 : 2} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 15, color: "#E3D3B2", textShadowColor: "#000", textShadowRadius: 4, textAlign: rtl ? "right" : "left" }}>{desc}</Text>
      </View>
      <Text style={{ fontFamily: F.serif, fontSize: 24, lineHeight: 26, color: "#F7EBD2" }}>{rtl ? "‹" : "›"}</Text>
    </View>
  </PressableScale>;
}

// Yuvarlak resimli madalyon (küçük mekânlar, eserler).
export function Medallion({ source, icon, size = 42 }: { source?: ImageSourcePropType; icon?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: SK.frameHi, backgroundColor: "#1A130B", overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
    {source ? <Image accessible={false} source={source} resizeMode="cover" style={{ width: "100%", height: "100%" }} /> : icon ? <GameIcon name={icon} size={size * 0.52} color={SK.gold} /> : null}
  </View>;
}

// Küçük mekân döşemesi: madalyon resim + ikonlu ad + ok.
export function VenueTile({ source, icon, title, onPress, rtl }: { source: ImageSourcePropType; icon: string; title: string; onPress: () => void; rtl: boolean }) {
  const narrow = useWindowDimensions().width < 360; // dar ekranda tek sütun: adlar hecelenip kırılmasın
  return <PressableScale accessibilityLabel={title} onPress={onPress} haptic="tap"
    style={{ flexBasis: narrow ? "100%" : "46%", flexGrow: 1, minHeight: 56, borderRadius: 4, borderWidth: 1, borderColor: SK.hair, backgroundColor: SK.well, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, paddingHorizontal: 8, paddingVertical: 6 }}>
    <View>
      <Medallion source={source} />
      {/* Mekânın ikonu madalyonun köşesinde rozet */}
      <View style={{ position: "absolute", bottom: -3, [rtl ? "left" : "right"]: -4, width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: SK.frameHi, backgroundColor: "#140F09", alignItems: "center", justifyContent: "center" }}>
        <GameIcon name={icon} size={12} color={SK.gold} />
      </View>
    </View>
    <Text numberOfLines={2} style={{ flex: 1, minWidth: 0, fontFamily: F.display, fontSize: 12.5, lineHeight: 16, color: "#F4E8CF", textAlign: rtl ? "right" : "left" }}>{title}</Text>
    <Text style={{ fontFamily: F.serif, fontSize: 20, color: SK.muted }}>{rtl ? "‹" : "›"}</Text>
  </PressableScale>;
}

// Künye satırı: ikon · etiket · değer.
export function InfoRow({ icon, label, value, last, rtl }: { icon: string; label: string; value: string; last?: boolean; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, minHeight: 40, paddingVertical: 7, borderBottomWidth: last ? 0 : 1, borderBottomColor: "rgba(140,107,55,0.35)" }}>
    <GameIcon name={icon} size={16} color={SK.gold} />
    <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.5, color: SK.muted }}>{label}</Text>
    <Text style={{ flex: 1, flexShrink: 1, textAlign: rtl ? "left" : "right", fontFamily: F.serif, fontSize: 15, lineHeight: 19, color: SK.ink }}>{value}</Text>
  </View>;
}

// Satır düğme (harita): madalyon ikon · başlık/alt yazı · ok.
export function LinkRow({ icon, title, sub, onPress, rtl }: { icon: string; title: string; sub: string; onPress: () => void; rtl: boolean }) {
  return <Pressable accessibilityLabel={title} accessibilityHint={sub} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}>
    <SPanel>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8 }}>
        <Medallion icon={icon} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 19, color: "#F4E8CF", textAlign: rtl ? "right" : "left" }}>{title}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: SK.muted, textAlign: rtl ? "right" : "left" }}>{sub}</Text>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 22, color: "#F4E8CF" }}>{rtl ? "‹" : "›"}</Text>
      </View>
    </SPanel>
  </Pressable>;
}
