// Karakter sayfasının görsel parçaları: altın çerçeveli pano, madalyon eylem, sekme çubuğu, rozet, çubuk.
// Dil: claude-paket mockup (yarı saydam koyu pano, pirinç çerçeve, Cinzel başlık, madalyon ikon).
import { type ReactNode } from "react";
import { View, Text, StyleSheet, type DimensionValue } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameIcon } from "../../icons";
import { useSadeMod } from "../../use-sade-mod";
import { hap } from "../../haptics";
import { C, F } from "../../theme";

export const KR = {
  frame: "#A8823F",     // pano çerçevesi (ana sayfa ile aynı pirinç)
  frameHi: "#C9A24E",
  ink: "#F4E8CF",
  well: "rgba(8,5,2,0.55)", // pano içi gömme kutu
  alert: "#B5331F",
};

// Arapça için yatay yön ve metin hizası (uygulama RTL'yi elle kurar).
export function yon(lang: string) {
  const rtl = lang === "ar";
  return { rtl, row: (rtl ? "row-reverse" : "row") as "row" | "row-reverse", ta: (rtl ? "right" : "left") as "right" | "left" };
}

// Giriş hareketi: sade modda kapalı.
export function Giris({ i = 0, children }: { i?: number; children: ReactNode }) {
  const sade = useSadeMod();
  return <Animated.View entering={sade ? undefined : FadeInDown.duration(260).delay(Math.min(i, 6) * 55)}>{children}</Animated.View>;
}

// Panonun köşelerindeki pirinç gönyeler.
function Gonye({ tone }: { tone: string }) {
  const arm = { position: "absolute" as const, backgroundColor: tone, opacity: 0.8 };
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {([["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]] as const).map(([v, h]) => <View key={v + h}>
      <View style={[arm, { [v]: 4, [h]: 4, width: 13, height: 1.5 }]} />
      <View style={[arm, { [v]: 4, [h]: 4, width: 1.5, height: 13 }]} />
    </View>)}
  </View>;
}

// Küçük başlık madalyonu.
export function MiniMadalyon({ icon, tone = C.gold, size = 30 }: { icon: string; tone?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 1.5, borderColor: tone }}>
    <GameIcon name={icon} size={Math.round(size * 0.55)} color={tone} />
  </View>;
}

// Altın çerçeveli pano: madalyonlu başlık, başlık altı ışık çizgisi, köşe gönyeleri.
export function Pano({ title, icon, right, children, tone = C.gold, rtl = false, pad = true }: { title?: string; icon?: string; right?: ReactNode; children: ReactNode; tone?: string; rtl?: boolean; pad?: boolean }) {
  return <View style={{ marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: tone === C.gold ? KR.frame : tone + "AA", overflow: "hidden", backgroundColor: "rgba(18,13,8,0.6)" }}>
    <LinearGradient pointerEvents="none" colors={["rgba(44,32,19,0.93)", "rgba(25,19,12,0.92)", "rgba(16,12,7,0.95)"]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 5, borderWidth: 1, borderColor: tone + "24" }} />
    <Gonye tone={tone} />
    {title ? <View style={{ paddingHorizontal: 12, paddingTop: 11 }}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, minHeight: 30 }}>
        {icon ? <MiniMadalyon icon={icon} tone={tone} /> : null}
        <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1, fontFamily: F.display, fontSize: 16, lineHeight: 22, letterSpacing: 0.4, color: tone, textAlign: rtl ? "right" : "left" }}>{title}</Text>
        {right}
      </View>
      <LinearGradient pointerEvents="none" start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} colors={[tone + "AA", tone + "30", tone + "00"]} style={{ height: 1, marginTop: 9 }} />
    </View> : null}
    <View style={pad ? { paddingHorizontal: 12, paddingTop: title ? 10 : 12, paddingBottom: 12 } : undefined}>{children}</View>
  </View>;
}

// Değer çubuğu: koyu oluk, altından renge geçen dolgu.
export function Cubuk({ pct, tone = C.gold, h = 5, rtl = false }: { pct: number; tone?: string; h?: number; rtl?: boolean }) {
  const w = `${Math.max(0, Math.min(100, pct))}%` as DimensionValue;
  return <View style={{ height: h, borderRadius: h / 2, backgroundColor: "rgba(0,0,0,0.45)", borderWidth: h >= 5 ? 0.5 : 0, borderColor: C.border, overflow: "hidden", flexDirection: rtl ? "row-reverse" : "row" }}>
    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={[C.goldDim, tone]} style={{ width: w, height: "100%" }} />
  </View>;
}

// Küçük künye rozeti (yaş, yer, nesil…).
export function Rozet({ icon, text, tone = C.gold }: { icon?: string; text: string; tone?: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 5, minHeight: 26, paddingHorizontal: 8, borderRadius: 13, borderWidth: 1, borderColor: tone + "66", backgroundColor: "rgba(10,7,4,0.6)" }}>
    {icon ? <GameIcon name={icon} size={12} color={tone} /> : null}
    <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchment }}>{text}</Text>
  </View>;
}

// Onay işareti (yazı tipine bağlı kalmasın diye çizim).
export function Tik({ size = 12, color = KR.ink }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 16 16"><Path d="M3 8.6 L6.6 12.2 L13.2 4.4" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

// Madalyon eylem: yuvarlak pirinç halka, altında kısa ad; etiket (bedel/hak), yapıldı işareti ve "!" uyarısı.
export function Madalyon({ icon, label, a11y, tone = C.gold, tag, done = false, alert = false, disabled = false, onPress, width = "25%" }: { icon: string; label: string; a11y?: string; tone?: string; tag?: string; done?: boolean; alert?: boolean; disabled?: boolean; onPress: () => void; width?: DimensionValue }) {
  const dim = done || disabled; // "yapıldı" yalnız görünüştür; ayrıntı paneli yine açılabilir
  return <Pressable accessibilityRole="button" accessibilityLabel={a11y || label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ width, alignItems: "center", justifyContent: "flex-start", paddingTop: 7, paddingBottom: 2, opacity: disabled && !done ? 0.45 : 1, transform: [{ scale: pressed ? 0.93 : 1 }] })}>
    <View style={{ width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: done ? "rgba(14,10,6,0.85)" : "#130D07", borderWidth: 2, borderColor: done ? C.border : tone, shadowColor: tone, shadowOpacity: dim ? 0 : 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } }}>
      <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 24, borderWidth: 1, borderColor: (done ? C.border : tone) + "55" }} />
      <GameIcon name={icon} size={27} color={done ? C.parchmentMuted : tone} />
      {done ? <View style={{ position: "absolute", bottom: -3, right: -3, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#2F5E35", borderWidth: 1.5, borderColor: "#9FD08A" }}><Tik size={12} /></View> : null}
      {alert && !done ? <View style={{ position: "absolute", top: -3, right: -3, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: KR.alert, borderWidth: 1.5, borderColor: "#FBE3C4" }}><Text style={{ fontFamily: F.display, fontSize: 11, lineHeight: 14, color: "#FFF4E2" }}>!</Text></View> : null}
    </View>
    {tag && !done ? <View style={{ marginTop: -9, minWidth: 30, height: 18, paddingHorizontal: 6, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 1, borderColor: tone }}>
      <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: 10.5, lineHeight: 13, color: tone }}>{tag}</Text>
    </View> : <View style={{ height: 9 }} />}
    <Text numberOfLines={2} style={{ marginTop: 4, maxWidth: "100%", paddingHorizontal: 2, fontFamily: F.display, fontSize: 12, lineHeight: 15, color: done ? C.parchmentMuted : C.parchment, textAlign: "center" }}>{label}</Text>
  </Pressable>;
}

// Sekme çubuğu: ikon üstte, ad altta; seçili sekme altın çerçeveli; "!" noktası.
export function Sekmeler<T extends string>({ items, value, onChange, rtl = false }: { items: { id: T; icon: string; label: string; dot?: boolean }[]; value: T; onChange: (id: T) => void; rtl?: boolean }) {
  return <View accessibilityRole="tablist" style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 4, padding: 4, borderRadius: 9, borderWidth: 1, borderColor: KR.frame, backgroundColor: "rgba(16,11,6,0.97)", shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
    {items.map((it) => {
      const on = it.id === value;
      return <Pressable key={it.id} accessibilityRole="tab" accessibilityLabel={it.label} accessibilityState={{ selected: on }} onPress={() => { if (!on) { hap("selection"); onChange(it.id); } }}
        style={({ pressed }) => ({ flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 2, borderRadius: 6, borderWidth: 1, borderColor: on ? C.gold : "transparent", backgroundColor: on ? "rgba(201,162,78,0.17)" : pressed ? "rgba(201,162,78,0.08)" : "transparent" })}>
        <GameIcon name={it.icon} size={19} color={on ? C.goldBright : C.parchmentMuted} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ maxWidth: "100%", fontFamily: F.display, fontSize: 11.5, lineHeight: 14, color: on ? C.goldBright : C.parchmentMuted }}>{it.label}</Text>
        {it.dot ? <View style={{ position: "absolute", top: 5, right: 7, width: 9, height: 9, borderRadius: 5, backgroundColor: KR.alert, borderWidth: 1, borderColor: "#FBE3C4" }} /> : null}
      </Pressable>;
    })}
  </View>;
}

// İkincil eylem düğmesi (ziyaret, vakit geçir, sev…): ≥ 44 pt, pirinç kenar, yapıldıysa sönük.
export function Dugme({ icon, label, onPress, disabled = false, tone = C.gold, a11y, rtl = false, full = false }: { icon?: string; label: string; onPress: () => void; disabled?: boolean; tone?: string; a11y?: string; rtl?: boolean; full?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={a11y || label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => { hap("tap"); onPress(); }}
    style={({ pressed }) => ({ alignSelf: full ? "stretch" : rtl ? "flex-end" : "flex-start", flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 44, paddingHorizontal: 14, borderRadius: 7, borderWidth: 1, borderBottomWidth: pressed || disabled ? 1 : 2.5, borderColor: disabled ? C.border : tone + "AA", borderBottomColor: disabled ? C.border : "#080503", backgroundColor: disabled ? "rgba(10,7,4,0.5)" : pressed ? "rgba(201,162,78,0.08)" : "rgba(42,31,19,0.9)", opacity: disabled ? 0.55 : 1, transform: [{ translateY: pressed ? 1.5 : 0 }] })}>
    {icon ? <GameIcon name={icon} size={16} color={disabled ? C.parchmentMuted : tone} /> : null}
    <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12.5, lineHeight: 16, letterSpacing: 0.4, color: disabled ? C.parchmentMuted : tone, textAlign: "center" }}>{label}</Text>
  </Pressable>;
}

// Bölüm içi alt başlık (çizgiyle ayrılmış).
export function AltBaslik({ icon, title, count, rtl = false, first = false }: { icon: string; title: string; count?: number | string; rtl?: boolean; first?: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7, marginTop: first ? 0 : 12, paddingTop: first ? 0 : 12, borderTopWidth: first ? 0 : 1, borderTopColor: C.border + "AA", marginBottom: 8 }}>
    <GameIcon name={icon} size={14} color={C.goldDim} />
    <Text style={{ fontFamily: F.display, fontSize: 12.5, letterSpacing: 0.8, color: C.parchmentDim }}>{title}</Text>
    {count != null ? <Text style={{ fontFamily: F.display, fontSize: 12.5, color: C.gold }}>{count}</Text> : null}
  </View>;
}
