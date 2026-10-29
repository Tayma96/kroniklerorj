// Pazar sayfasının küçük yapı taşları: madalyon, tente, dokunsal düğme, fiyat yönü, çip.
import type { ReactNode } from "react";
import { View, Text, type ViewStyle } from "react-native";
import { DesignPressable as Pressable } from "../../design-pressable";
import { GameIcon } from "../../icons";
import { C, F } from "../../theme";

// Madalyon: koyu zemin, tonlu halka, içte ince ikinci halka.
export function Madalyon({ icon, tone = C.gold, size = 44, dim = false }: { icon: string; tone?: string; size?: number; dim?: boolean }) {
  const ring = dim ? C.border : tone;
  return <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center", backgroundColor: "#120C06", borderWidth: 1.5, borderColor: ring }}>
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: size / 2 - 3, borderWidth: 1, borderColor: ring + "40" }} />
    <GameIcon name={icon} size={Math.round(size * 0.5)} color={dim ? C.parchmentMuted : tone} />
  </View>;
}

// Dokunsal oyun düğmesi: alt kenar gölgesi basınca kaybolur, düğme iki piksel iner.
export function dugmeStil(pressed: boolean, tone: string, disabled: boolean, filled = false): ViewStyle {
  return {
    minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10,
    borderRadius: 8, borderWidth: 1,
    borderColor: disabled ? C.border : pressed ? C.goldBright : tone + "AA",
    borderBottomWidth: pressed || disabled ? 1 : 3,
    borderBottomColor: disabled ? C.border : "#080503",
    backgroundColor: disabled ? "rgba(23,17,10,0.55)" : filled ? (pressed ? tone + "40" : tone + "2B") : pressed ? C.surface : "#241B11",
    transform: [{ translateY: pressed && !disabled ? 2 : 0 }],
  };
}

// Genel eylem düğmesi (ikon + yazı, isteğe bağlı alt satır).
export function EylemDugmesi({ label, sub, icon, tone = C.gold, disabled = false, filled = false, onPress, a11y, rtl = false, style }: {
  label: string; sub?: string; icon?: string; tone?: string; disabled?: boolean; filled?: boolean; onPress: () => void; a11y?: string; rtl?: boolean; style?: ViewStyle;
}) {
  const col = disabled ? C.parchmentMuted : tone;
  return <Pressable accessibilityLabel={a11y || [label, sub].filter(Boolean).join(", ")} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [dugmeStil(pressed, tone, disabled, filled), { flexDirection: rtl ? "row-reverse" : "row" }, style]}>
    {icon ? <GameIcon name={icon} size={17} color={col} /> : null}
    <View style={{ flexShrink: 1, alignItems: "center" }}>
      <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 13.5, lineHeight: 18, color: col, textAlign: "center" }}>{label}</Text>
      {sub ? <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: 13, lineHeight: 16, color: disabled ? C.parchmentMuted : C.parchmentDim }}>{sub}</Text> : null}
    </View>
  </Pressable>;
}

// Bölünmüş ticaret düğmesi: solda fiil (AL/SAT), sağda terazi = pazarlık. RTL'de aynalanır.
export function TicaretDugmesi({ verb, price, tone, disabled, haggleDisabled, onPress, onHaggle, a11y, haggleA11y, rtl }: {
  verb: string; price?: number; tone: string; disabled: boolean; haggleDisabled: boolean; onPress: () => void; onHaggle: () => void; a11y: string; haggleA11y: string; rtl: boolean;
}) {
  const start = rtl ? { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 } : { borderTopRightRadius: 0, borderBottomRightRadius: 0 };
  const end = rtl ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 } : { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 };
  return <View style={{ flex: 1, minWidth: 0, flexDirection: rtl ? "row-reverse" : "row" }}>
    <Pressable accessibilityLabel={a11y} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [dugmeStil(pressed, tone, disabled, true), start, { flex: 1, minWidth: 0 }]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 14, letterSpacing: price != null ? 0 : 0.6, color: disabled ? C.parchmentMuted : tone === C.gold ? C.goldBright : tone }}>
        {verb}{price != null ? <Text style={{ fontSize: 13, color: disabled ? C.parchmentMuted : C.parchment }}>{" " + price + "⚜"}</Text> : null}
      </Text>
    </Pressable>
    <Pressable accessibilityLabel={haggleA11y} accessibilityState={{ disabled: haggleDisabled }} disabled={haggleDisabled} onPress={onHaggle}
      style={({ pressed }) => [dugmeStil(pressed, tone, haggleDisabled), end, rtl ? { marginRight: -1 } : { marginLeft: -1 }, { width: 48, paddingHorizontal: 0 }]}>
      <GameIcon name="scales" size={20} color={haggleDisabled ? C.parchmentMuted : tone} />
    </Pressable>
  </View>;
}

// Fiyat yönü: yukarı (alıcı için pahalılaşıyor, kan) / aşağı (ucuzluyor, adaçayı). Yazı tipine bağlı olmayan üçgen.
export function FiyatYonu({ dir, label }: { dir: -1 | 0 | 1; label: string }) {
  if (!dir) return null;
  const col = dir > 0 ? C.blood : C.sage;
  const tri: ViewStyle = dir > 0
    ? { borderBottomWidth: 7, borderBottomColor: col }
    : { borderTopWidth: 7, borderTopColor: col };
  return <View accessible accessibilityLabel={label} style={{ width: 16, height: 16, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: col + "26" }}>
    <View style={[{ width: 0, height: 0, borderLeftWidth: 4.5, borderRightWidth: 4.5, borderLeftColor: "transparent", borderRightColor: "transparent" }, tri]} />
  </View>;
}

// Küçük bilgi çipi (ikon + kısa değer).
export function Cip({ text, tone = C.parchmentDim, icon, filled = false }: { text: string; tone?: string; icon?: string; filled?: boolean }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, minHeight: 20, borderRadius: 5, borderWidth: 1, borderColor: tone + (filled ? "77" : "44"), backgroundColor: tone + (filled ? "22" : "10") }}>
    {icon ? <GameIcon name={icon} size={11} color={tone} /> : null}
    <Text style={{ fontFamily: F.display, fontSize: 12, lineHeight: 16, color: tone }}>{text}</Text>
  </View>;
}

// Tente: çizgili pazar örtüsü + fistolu alt kenar; tezgâhın başlığı altında.
export function Tente({ tone }: { tone: string }) {
  const n = 14;
  return <View accessible={false} pointerEvents="none">
    <View style={{ flexDirection: "row", height: 11 }}>
      {Array.from({ length: n }, (_, i) => <View key={i} style={{ flex: 1, backgroundColor: i % 2 ? C.parchment + "D9" : tone }} />)}
    </View>
    <View style={{ flexDirection: "row", height: 7 }}>
      {Array.from({ length: n }, (_, i) => <View key={i} style={{ flex: 1, borderBottomLeftRadius: 7, borderBottomRightRadius: 7, backgroundColor: i % 2 ? C.parchment + "C0" : tone + "E0" }} />)}
    </View>
  </View>;
}

// Tezgâh kartı: tente, madalyon başlık, içerik.
export function Tezgah({ title, icon, tone, count, rtl, children }: { title: string; icon: string; tone: string; count?: number; rtl: boolean; children: ReactNode }) {
  return <View style={{ marginBottom: 14, borderRadius: 10, borderWidth: 1, borderColor: tone + "77", overflow: "hidden", backgroundColor: "rgba(22,16,9,0.9)" }}>
    <Tente tone={tone} />
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4 }}>
      <Madalyon icon={icon} tone={tone} size={36} />
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 16, lineHeight: 22, color: C.parchment, textAlign: rtl ? "right" : "left" }}>{title}</Text>
      {count != null ? <Text style={{ fontFamily: F.display, fontSize: 13, color: C.parchmentMuted }}>{count}</Text> : null}
    </View>
    <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>{children}</View>
  </View>;
}

// Bölüm kartı (kervan, sarraf, kiler): ince pirinç çerçeve, ikonlu başlık, sağda kısa değer.
export function Bolum({ title, icon, tone = C.gold, right, rtl, children }: { title: string; icon: string; tone?: string; right?: ReactNode; rtl: boolean; children: ReactNode }) {
  return <View style={{ marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: tone === C.gold ? C.borderHi : tone + "88", backgroundColor: "rgba(22,16,9,0.9)", padding: 12 }}>
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 7, borderWidth: 1, borderColor: tone + "1F" }} />
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <Madalyon icon={icon} tone={tone} size={34} />
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.display, fontSize: 15.5, lineHeight: 21, color: tone === C.gold ? C.gold : tone, textAlign: rtl ? "right" : "left" }}>{title}</Text>
      {right}
    </View>
    {children}
  </View>;
}

// Açıklama satırı (italik, okunur soluk metin).
export function Not({ children, tone = C.parchmentMuted, rtl, mt = 0, mb = 8 }: { children: ReactNode; tone?: string; rtl: boolean; mt?: number; mb?: number }) {
  return <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 21, color: tone, marginTop: mt, marginBottom: mb, textAlign: rtl ? "right" : "left" }}>{children}</Text>;
}

// Alt başlık (bölüm içi küçük başlık).
export function AltBaslik({ text, right, rtl }: { text: string; right?: ReactNode; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
    <Text style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12.5, letterSpacing: 1, color: C.parchmentDim, textTransform: "uppercase", textAlign: rtl ? "right" : "left" }}>{text}</Text>
    {right}
  </View>;
}

export function Ayrac() {
  return <View style={{ height: 1, backgroundColor: C.border, marginVertical: 11 }} />;
}
