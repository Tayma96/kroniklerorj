// Mülkler sayfasının küçük yapı taşları: sayı biçimi, madalyon, durum rozeti, eylem plakası, sekmeler, sahne başlığı.
import type { ReactNode } from "react";
import { View, Text, Image, StyleSheet, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Polyline, Polygon } from "react-native-svg";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameIcon } from "../../icons";
import { BackLabel } from "../../ui";
import { useSadeMod } from "../../use-sade-mod";
import { C, F } from "../../theme";

// Binlik ayırıcı dile göre: 18000 → 18.000 (tr) / 18,000 (en).
const SEP: Record<string, string> = { tr: ".", es: ".", pt: ".", ru: " ", en: ",", ar: "," };
export function fmt(n: number, lang: string): string {
  const s = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, SEP[lang] ?? ",");
  return n < 0 ? "-" + s : s;
}
export const signed = (n: number, lang: string) => (n > 0 ? "+" : "") + fmt(n, lang);
export const condTone = (c: number) => (c >= 75 ? C.sage : c >= 45 ? C.gold : C.blood);
const SHADOW = { textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } };

// Yıllık net defterinden küçük gelir eğrisi (en az iki tam yıl varsa).
export function Spark({ ledger, color, w = 64, h = 26 }: { ledger: { net: number }[]; color: string; w?: number; h?: number }) {
  const data = ledger.slice(-7).map((e) => e.net);
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1, pad = 3;
  const pts = data.map((v, i) => `${(pad + (i / (data.length - 1)) * (w - pad * 2)).toFixed(1)},${(h - pad - ((v - min) / rng) * (h - pad * 2)).toFixed(1)}`);
  return <Svg width={w} height={h}>
    <Polygon points={`${pad},${h} ${pts.join(" ")} ${w - pad},${h}`} fill={color} fillOpacity={0.22} />
    <Polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth={1.8} />
  </Svg>;
}

// Pirinç halkalı madalyon ikon (mockup dili).
export function Madalyon({ icon, tone = C.gold, size = 44 }: { icon: string; tone?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, borderWidth: 2, borderColor: tone }}>
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: size / 2 - 3, borderWidth: 1, borderColor: tone + "44" }} />
    <GameIcon name={icon} size={Math.round(size * 0.48)} color={tone} />
  </View>;
}

// Akçe değeri: sayı + sikke ikonu (+ isteğe bağlı "/ay").
export function Akce({ value, lang, tone = C.parchment, size = 15, sign = false, suffix, rtl }: { value: number; lang: string; tone?: string; size?: number; sign?: boolean; suffix?: string; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 4 }}>
    <Text numberOfLines={1} style={{ fontFamily: F.display, fontSize: size, lineHeight: size + 5, color: tone }}>{sign ? signed(value, lang) : fmt(value, lang)}</Text>
    <GameIcon name="akce" size={Math.round(size * 0.85)} color={tone} />
    {suffix ? <Text style={{ fontFamily: F.serif, fontSize: size - 2, color: C.parchmentMuted }}>{suffix}</Text> : null}
  </View>;
}

// Durum rozeti (bekçi, kiracı, nadas, bakım). `dark`: resim üstünde okunsun diye koyu zemin.
export function Rozet({ icon, label, tone = C.parchmentDim, dark, rtl }: { icon: string; label: string; tone?: string; dark?: boolean; rtl: boolean }) {
  return <View accessible accessibilityLabel={label} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: tone + "66", backgroundColor: dark ? "rgba(8,5,2,0.66)" : tone + "16" }}>
    <GameIcon name={icon} size={13} color={tone} />
    <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13.5, lineHeight: 18, color: tone }}>{label}</Text>
  </View>;
}

// Kademe: üç elmas, dolu olanlar ulaşılan kademe.
export function Kademe({ level, max, label, rtl }: { level: number; max: number; label: string; rtl: boolean }) {
  return <View accessible accessibilityLabel={`${label} ${level}/${max}`} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 7, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: "rgba(8,5,2,0.66)", borderWidth: 1, borderColor: C.goldDim }}>
    <Text style={{ fontFamily: F.display, fontSize: 11.5, lineHeight: 15, color: C.goldBright }}>{label} {level}</Text>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 4 }}>
      {Array.from({ length: max }, (_, k) => <View key={k} style={{ width: 7, height: 7, transform: [{ rotate: "45deg" }], borderWidth: 1, borderColor: C.gold, backgroundColor: k < level ? C.gold : "transparent" }} />)}
    </View>
  </View>;
}

// Eylem plakası: üstte ikon + ad, altta bedel. `primary` altın dökme; yetmeyen bedel kızıl yazılır.
export function Plaka({ icon, label, cost, costTone, lang, tone = C.gold, primary, disabled, onPress, a11y, hint, expanded, rtl }: {
  icon: string; label: string; cost?: number; costTone?: string; lang: string; tone?: string; primary?: boolean; disabled?: boolean;
  onPress?: () => void; a11y?: string; hint?: string; expanded?: boolean; rtl: boolean;
}) {
  const sade = useSadeMod(); const gold = primary && !disabled; const ink = gold ? C.inkOnGold : tone;
  return <Pressable accessibilityLabel={a11y || label} accessibilityHint={hint} accessibilityState={{ disabled: !!disabled, expanded }} disabled={disabled || !onPress} onPress={onPress}
    style={({ pressed }) => ({ flex: 1, minHeight: 52, borderRadius: 7, overflow: "hidden", borderWidth: 1, borderColor: gold ? C.goldBright : pressed ? C.goldBright : tone === C.gold ? C.borderHi : tone + "AA", borderBottomWidth: pressed && !sade ? 1 : 3, borderBottomColor: gold ? C.goldDim : C.bg, opacity: disabled ? 0.55 : 1, transform: [{ translateY: pressed && !sade ? 2 : 0 }] })}>
    {gold ? <LinearGradient pointerEvents="none" colors={[C.goldBright, C.gold, C.goldDim]} style={StyleSheet.absoluteFill} /> : <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: C.cardHi }]} />}
    {gold ? <View pointerEvents="none" style={{ position: "absolute", top: 1, left: 5, right: 5, height: 1, backgroundColor: "rgba(255,248,220,0.6)" }} /> : null}
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, paddingVertical: 5 }}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 5, maxWidth: "100%" }}>
        <GameIcon name={icon} size={15} color={ink} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12.5, lineHeight: 17, letterSpacing: 0.4, color: ink }}>{label}</Text>
      </View>
      {cost != null ? <Akce value={cost} lang={lang} size={14} tone={gold ? C.inkOnGold : costTone || C.parchment} rtl={rtl} /> : null}
    </View>
  </Pressable>;
}

// Bölüm başlığı (sağdan sola uyumlu): ikon + altın başlık + ışık çizgisi.
export function Baslik({ icon, title, right, rtl }: { icon: string; title: string; right?: ReactNode; rtl: boolean }) {
  return <View style={{ marginBottom: 12 }}>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, minHeight: 28 }}>
      <GameIcon name={icon} size={20} color={C.gold} />
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.serif, fontSize: 21, lineHeight: 26, color: C.gold, textAlign: rtl ? "right" : "left" }}>{title}</Text>
      {right}
    </View>
    <LinearGradient pointerEvents="none" start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} colors={[C.gold + "99", C.gold + "33", C.gold + "00"]} style={{ height: 1, marginTop: 8 }} />
  </View>;
}

// İki sekmeli seçici: Mülklerin / Tapu Pazarı. Sayı rozeti ikonun köşesinde; dar ekranda ad iki satıra iner.
export function Sekmeler<K extends string>({ items, value, onChange, rtl }: { items: { key: K; label: string; icon: string; badge?: number }[]; value: K; onChange: (k: K) => void; rtl: boolean }) {
  const narrow = useWindowDimensions().width < 360;
  return <View accessibilityRole="tablist" style={{ flexDirection: rtl ? "row-reverse" : "row", gap: 6, padding: 4, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: C.borderHi, backgroundColor: "rgba(14,10,6,0.86)" }}>
    {items.map((it) => {
      const on = it.key === value;
      return <Pressable key={it.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={it.badge != null ? `${it.label} (${it.badge})` : it.label} onPress={() => { if (!on) onChange(it.key); }}
        style={({ pressed }) => ({ flex: 1, minHeight: 48, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: (narrow ? 8 : 10) + (it.badge != null ? 8 : 0), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, borderWidth: 1, borderColor: on ? C.gold : "transparent", backgroundColor: on ? C.cardHi : pressed ? C.surface : "transparent" })}>
        <View>
          <GameIcon name={it.icon} size={19} color={on ? C.goldBright : C.parchmentMuted} />
          {it.badge != null ? <View style={{ position: "absolute", top: -8, right: rtl ? undefined : -11, left: rtl ? -11 : undefined, minWidth: 18, height: 17, paddingHorizontal: 4, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: on ? C.gold : C.surface, borderWidth: 1, borderColor: on ? C.goldBright : C.borderHi }}>
            <Text style={{ fontFamily: F.display, fontSize: 10.5, lineHeight: 13, color: on ? C.inkOnGold : C.parchmentDim }}>{it.badge}</Text>
          </View> : null}
        </View>
        <Text numberOfLines={2} style={{ flexShrink: 1, fontFamily: F.display, fontSize: narrow ? 13 : 14, lineHeight: narrow ? 16 : 18, color: on ? C.goldBright : C.parchmentDim, textAlign: "center" }}>{it.label}</Text>
      </Pressable>;
    })}
  </View>;
}

// Ölçü hücreleri: üstte etiket (iki satıra kadar), altta ikon + değer. Dar ekranda değer kesilmez.
export function Olculer({ items, rtl }: { items: { icon: string; label: string; value: string; tone?: string }[]; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "stretch" }}>
    {items.map((it, k) => <View key={it.label} accessible accessibilityLabel={`${it.label}: ${it.value}`} style={{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "flex-end", gap: 3, paddingHorizontal: 4, borderLeftWidth: !rtl && k ? 1 : 0, borderRightWidth: rtl && k ? 1 : 0, borderColor: C.border }}>
      <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 15, color: C.parchmentMuted, textAlign: "center" }}>{it.label}</Text>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 5, maxWidth: "100%" }}>
        <GameIcon name={it.icon} size={15} color={it.tone || C.gold} />
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 16, lineHeight: 21, color: it.tone || C.parchment }}>{it.value}</Text>
      </View>
    </View>)}
  </View>;
}

// Sahne başlığı. Resim alanı bilinçli olarak sade bırakıldı: ileride izometrik mülk görünümü bu kareye oturur;
// üst katmanda yalnız geri düğmesi, kese ve başlık durur, alt yarı sahneye açıktır.
export function MulkSahnesi({ source, title, hint, purse, purseLabel, onBack, topInset, rtl }: { source: ImageSourcePropType; title: string; hint: string; purse: string; purseLabel: string; onBack: () => void; topInset: number; rtl: boolean }) {
  return <View style={{ height: 222 + topInset, overflow: "hidden", borderBottomWidth: 1, borderColor: C.goldDim }}>
    <Image accessible={false} source={source} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
    <LinearGradient pointerEvents="none" colors={["rgba(8,5,2,0.82)", "rgba(8,5,2,0.34)", "rgba(8,5,2,0)", "rgba(14,10,6,0.9)"]} locations={[0, 0.36, 0.62, 1]} style={StyleSheet.absoluteFill} />
    <View style={{ position: "absolute", top: topInset + 8, left: 12, right: 12, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
      <Pressable onPress={onBack} style={{ paddingHorizontal: 12, borderRadius: 8, backgroundColor: "rgba(8,5,2,0.55)", borderWidth: 1, borderColor: C.goldDim }}><BackLabel /></Pressable>
      <View accessible accessibilityLabel={purseLabel} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "rgba(8,5,2,0.62)", borderWidth: 1, borderColor: C.goldDim }}>
        <GameIcon name="akce" size={16} color={C.goldBright} />
        <Text style={{ fontFamily: F.display, fontSize: 15, lineHeight: 20, color: C.goldBright }}>{purse}</Text>
      </View>
    </View>
    <View style={{ position: "absolute", top: topInset + 62, left: 16, right: 16 }}>
      <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.display, fontSize: 32, lineHeight: 40, color: C.parchment, textAlign: rtl ? "right" : "left", ...SHADOW }}>{title}</Text>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 16, lineHeight: 21, color: C.parchment, textAlign: rtl ? "right" : "left", ...SHADOW }}>{hint}</Text>
    </View>
  </View>;
}
