import type { ReactNode } from "react";
import { View, Text, Image, ImageSourcePropType, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GameIcon } from "./icons";
import { DesignPressable } from "./design-pressable";
import { C, F, T } from "./theme";
import { useState } from "react";

// Panel köşelerinde pirinç gönye: mockup'taki işlenmiş çerçeve hissi, metnin önüne geçmeden.
function Corners({ tone }: { tone: string }) {
  const arm = { position: "absolute" as const, backgroundColor: tone, opacity: 0.75 };
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {([["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]] as const).map(([v, h]) => <View key={v + h}>
      <View style={[arm, { [v]: 3, [h]: 3, width: 12, height: 1.5 }]} />
      <View style={[arm, { [v]: 3, [h]: 3, width: 1.5, height: 12 }]} />
    </View>)}
  </View>;
}

// Ortak işlenmiş panel: koyu kahve zemin, ince pirinç çerçeve, altın başlık ve başlık altı ışık çizgisi.
export function OrnatePanel({ title, icon, right, children, tone = C.gold, inset = true }: { title?: string; icon?: string; right?: ReactNode; children: ReactNode; tone?: string; inset?: boolean }) {
  const frame = tone === C.gold ? C.borderHi : tone + "AA";
  return <View style={{ marginBottom: 12, borderWidth: 1, borderColor: frame, borderRadius: 6, overflow: "hidden", backgroundColor: C.card }}>
    <LinearGradient pointerEvents="none" colors={["#251B10", "#18120B", "#130E08"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderWidth: 1, borderColor: tone + "1F", borderRadius: 4 }} />
    <Corners tone={tone} />
    {title && <View style={{ paddingHorizontal: 14, paddingTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 28 }}>
        {icon && <GameIcon name={icon} color={tone} size={20} />}
        <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 19, lineHeight: 25, color: tone }}>{title}</Text>{right}
      </View>
      <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={[tone + "99", tone + "33", tone + "00"]} style={{ height: 1, marginTop: 8 }} />
    </View>}
    <View style={inset ? { paddingHorizontal: 14, paddingTop: title ? 10 : 14, paddingBottom: 14 } : undefined}>{children}</View>
  </View>;
}

const PANORAMAS = require("../assets/tasarim/diyar-panoramalari-v1.png");
export function Panorama({ row = 0, height = 190, source }: { row?: 0 | 1; height?: number; source?: ImageSourcePropType }) {
  const [width, setWidth] = useState(390);
  return <View accessible={false} onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ height, width: "100%", overflow: "hidden", backgroundColor: C.bg }}>
    <Image accessible={false} source={source || PANORAMAS} resizeMode={source ? "cover" : "stretch"} style={source ? { width: "100%", height: "100%" } : { position: "absolute", width: height * 4, height: height * 2, left: (width - height * 4) / 2, top: -row * height }} />
  </View>;
}

// Kenardan kenara sahne başlığı: başlık resmin üstüne doğrudan yazılır, alt kenar zemine erir.
// `bleed`: kaydırma alanının yatay iç boşluğu; resim ekran kenarına uzansın diye negatif kenar boşluğu olarak kullanılır.
export function IllustratedHeader({ title, sub, row = 0, source, height = 236, right, leading, bleed = 12, topInset = 0 }: { title: string; sub?: string; row?: 0 | 1; source?: ImageSourcePropType; height?: number; right?: ReactNode; leading?: ReactNode; bleed?: number; topInset?: number }) {
  return <View style={{ height: height + topInset, marginHorizontal: -bleed, marginTop: -topInset, overflow: "hidden", borderBottomWidth: 1, borderColor: C.goldDim + "88" }}>
    <Panorama row={row} height={height + topInset} source={source} />
    <LinearGradient pointerEvents="none" colors={["rgba(8,5,2,0.82)", "rgba(8,5,2,0.35)", "rgba(8,5,2,0)", C.bg + "C8"]} locations={[0, 0.3, 0.58, 1]} style={StyleSheet.absoluteFill} />
    <View style={{ position: "absolute", top: topInset + 10, left: bleed + 6, right: bleed + 2, flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {leading}
        <Text accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit style={{ fontFamily: F.display, fontSize: 32, lineHeight: 40, color: "#F7EBD2", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } }}>{title}</Text>
        {sub && <Text style={{ fontFamily: F.display, fontSize: 15, letterSpacing: 0.8, color: "#F1E2C2", lineHeight: T.lineLg, textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 8 }}>{sub}</Text>}
      </View>{right}
    </View>
  </View>;
}

// Sahne başlığındaki ikon düğmesi: zeminsiz, gölgeli altın ikon.
export function HeaderIconButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return <DesignPressable accessibilityLabel={label} onPress={onPress} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "rgba(8,5,2,0.35)" }}>
    <GameIcon name={icon} size={24} color={C.goldBright} />
  </DesignPressable>;
}

// Liste satırı: ikon, başlık, açıklama ve sağda ok ya da kısa bilgi. Panel içinde ince çizgiyle ayrılır.
export function ListRow({ icon, title, sub, right, onPress, tone = C.gold, first = false, boxed = false, rtl = false }: { icon?: string; title: string; sub?: string; right?: ReactNode; onPress?: () => void; tone?: string; first?: boolean; boxed?: boolean; rtl?: boolean }) {
  const body = <>
    {icon && <View style={{ width: 34, alignItems: "center" }}><GameIcon name={icon} size={boxed ? 26 : 20} color={tone} /></View>}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontFamily: boxed ? F.display : F.serif, fontSize: boxed ? 16 : T.body, lineHeight: boxed ? 22 : T.line, color: C.parchment }}>{title}</Text>
      {!!sub && <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 20, color: C.parchmentMuted }}>{sub}</Text>}
    </View>
    {right ?? (onPress ? <Text style={{ fontFamily: F.display, fontSize: 22, color: C.gold }}>{rtl ? "‹" : "›"}</Text> : null)}
  </>;
  const style = boxed
    ? { flexDirection: (rtl ? "row-reverse" : "row") as "row" | "row-reverse", alignItems: "center" as const, gap: 10, minHeight: 58, paddingVertical: 9, paddingHorizontal: 10, marginTop: first ? 0 : 8, borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, backgroundColor: "rgba(42,31,19,0.55)" }
    : { flexDirection: (rtl ? "row-reverse" : "row") as "row" | "row-reverse", alignItems: "center" as const, gap: 10, minHeight: 46, paddingVertical: 8, borderTopWidth: first ? 0 : 1, borderColor: C.border + "AA" };
  return onPress ? <DesignPressable accessibilityLabel={title} onPress={onPress} style={style}>{body}</DesignPressable> : <View style={style}>{body}</View>;
}

// Kırmızı/altın uyarı afişi: savaş, elçi, zindan gibi acil durumlar.
export function AlertBanner({ icon, title, sub, onPress, tone = C.blood, rtl = false }: { icon: string; title: string; sub?: string; onPress?: () => void; tone?: string; rtl?: boolean }) {
  const red = tone === C.blood;
  return <DesignPressable accessibilityLabel={title} onPress={onPress} style={{ marginBottom: 12, borderRadius: 6, borderWidth: 1, borderColor: red ? "#B4483A" : tone + "AA", overflow: "hidden" }}>
    <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={red ? ["#7E2219", "#5A1712", "#3A0F0B"] : [tone + "38", tone + "18", tone + "08"]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderWidth: 1, borderColor: red ? "rgba(255,190,150,0.16)" : tone + "26", borderRadius: 4 }} />
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
      <GameIcon name={icon} size={30} color={red ? "#F2D3B8" : tone} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.display, fontSize: 17, lineHeight: 23, color: red ? "#FBE9D2" : tone }}>{title}</Text>
        {!!sub && <Text style={{ fontFamily: F.serif, fontSize: T.body, lineHeight: T.line, color: red ? "#EBC9B0" : C.parchmentDim }}>{sub}</Text>}
      </View>
      {onPress && <Text style={{ fontFamily: F.display, fontSize: 24, color: red ? "#FBE9D2" : tone }}>{rtl ? "‹" : "›"}</Text>}
    </View>
  </DesignPressable>;
}

// Dikey çizgilerle ayrılmış gösterge şeridi (ikon, etiket, değer; isteğe bağlı çubuk).
export function StatStrip({ items, rtl = false }: { items: { icon: string; label: string; value: string; pct?: number; tone?: string }[]; rtl?: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "stretch" }}>
    {items.map((it, i) => <View key={it.label} accessible accessibilityLabel={`${it.label}: ${it.value}`} style={{ flex: 1, minWidth: 0, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6, paddingHorizontal: 6, borderLeftWidth: !rtl && i ? 1 : 0, borderRightWidth: rtl && i ? 1 : 0, borderColor: C.border }}>
      <GameIcon name={it.icon} size={22} color={it.tone || C.gold} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 15, color: C.parchmentMuted }}>{it.label}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.display, fontSize: 16, lineHeight: 21, color: it.tone || C.parchment }}>{it.value}</Text>
        {it.pct != null && <View style={{ height: 4, marginTop: 3, borderRadius: 2, backgroundColor: C.border, overflow: "hidden" }}>
          <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={[C.goldDim, it.tone || C.gold]} style={{ width: `${Math.max(0, Math.min(100, it.pct))}%`, height: 4 }} />
        </View>}
      </View>
    </View>)}
  </View>;
}
