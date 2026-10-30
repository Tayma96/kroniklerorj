// Meslek sayfasının ortak parçaları: mesleğe göre sahne/ikon, giriş hareketi, madalyon, sekmeler ve eylem düğmesi.
import type { ReactNode } from "react";
import { View, Text, Image, StyleSheet, Pressable, type ImageSourcePropType, type TextStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SAHNE_GORSEL } from "../../sahne-tema";
import { MULK_HERO, venueImage } from "../../assets";
import { GameIcon } from "../../icons";
import { GameButton } from "../../ui";
import { DUR, EASE } from "../../motion";
import { useSadeMod } from "../../use-sade-mod";
import { C, F, L } from "../../theme";
import type { SaheserAlani } from "../../game";

// Her meslek kendi mekânında görünür: tezgâh, tarla, nehir, divan…
const SAHNE: Record<string, ImageSourcePropType> = {
  çiftçi: SAHNE_GORSEL.hasat, demirci: SAHNE_GORSEL.atolye_demirci, tüccar: venueImage("pazar"), balıkçı: SAHNE_GORSEL.nehir,
  avcı: SAHNE_GORSEL.gurbet_yol, marangoz: SAHNE_GORSEL.atolye_demirci, çoban: MULK_HERO, fırıncı: SAHNE_GORSEL.ev_yoksul,
  asker: SAHNE_GORSEL.mogol_baskin, müzisyen: SAHNE_GORSEL.dugun, şifacı: SAHNE_GORSEL.medrese, katip: SAHNE_GORSEL.kadi_divan,
  kuyumcu: venueImage("pazar"), dokumacı: SAHNE_GORSEL.ahi_tekke, hancı: SAHNE_GORSEL.ev_varlikli,
};
export function meslekSahnesi(id: string): ImageSourcePropType { return SAHNE[id] || SAHNE_GORSEL.ahi_tekke; }

const IKON: Record<string, string> = {
  çiftçi: "wheat", demirci: "anvil", tüccar: "scales", balıkçı: "fishing", avcı: "bow", marangoz: "saw", çoban: "sheep",
  fırıncı: "bread", asker: "crossed-swords", müzisyen: "lyre", şifacı: "herbs", katip: "scroll-open", kuyumcu: "gems",
  dokumacı: "wool", hancı: "camel", işsiz: "walk",
};
export function meslekIkonu(id: string): string { return IKON[id] || "anvil"; }

const ESER_IKON: Record<SaheserAlani, string> = { bereket: "wheat", zanaat: "anvil", ticaret: "coins", savas: "crossed-swords", sosyal: "crown", saglik: "healing" };
export function eserIkonu(alan: SaheserAlani): string { return ESER_IKON[alan] || "star"; }

export const yon = (rtl: boolean) => (rtl ? "row-reverse" : "row") as "row" | "row-reverse";
export const hiza = (rtl: boolean): TextStyle => ({ textAlign: rtl ? "right" : "left", writingDirection: rtl ? "rtl" : "ltr" });

// Mesleğin sahnesi bütün ekranı kaplar; üstte aydınlık, aşağıda metin için koyulaşır.
export function MeslekFresk({ source, children }: { source: ImageSourcePropType; children: ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Image accessible={false} source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
    <LinearGradient pointerEvents="none" colors={["rgba(10,7,4,0.62)", "rgba(12,9,5,0.84)", "rgba(12,9,5,0.92)"]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
    {children}
  </View>;
}

// Kaydırılan içerik sırayla süzülerek gelir; sade modda hareket yok.
export function Giris({ sira = 0, children }: { sira?: number; children: ReactNode }) {
  const sade = useSadeMod();
  if (sade) return <View>{children}</View>;
  return <Animated.View entering={FadeInDown.duration(DUR.screen).delay(Math.min(sira, 6) * 60).easing(EASE.decel)}>{children}</Animated.View>;
}

// Pirinç halkalı madalyon: meslek, eser ve kademe ikonları için.
export function Madalyon({ icon, size = 44, tone = C.gold, dim = false, dolu = false }: { icon: string; size?: number; tone?: string; dim?: boolean; dolu?: boolean }) {
  const kenar = dim ? C.border : tone;
  return <View accessible={false} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: kenar, backgroundColor: dolu ? tone : "rgba(16,11,6,0.88)", alignItems: "center", justifyContent: "center" }}>
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: size / 2, borderWidth: 1, borderColor: dolu ? "rgba(255,241,192,0.55)" : dim ? "transparent" : tone + "38" }} />
    <GameIcon name={icon} size={Math.round(size * 0.5)} color={dolu ? C.inkOnGold : dim ? C.parchmentMuted : tone} />
  </View>;
}

// Küçük başlık (Cinzel küçük harfleri zaten küçük büyük harf gibi durur; dile göre büyütme yapılmaz).
export function Etiket({ children, rtl, tone = C.goldDim, mt = 0 }: { children: ReactNode; rtl: boolean; tone?: string; mt?: number }) {
  return <Text style={[{ fontFamily: F.display, fontSize: 12.5, letterSpacing: 1.2, lineHeight: 18, color: tone, marginTop: mt }, hiza(rtl)]}>{children}</Text>;
}

// Okunur rozet: kısa durum (kademe, aşama, mevcut meslek).
export function Rozet({ text, icon, tone = C.gold }: { text: string; icon?: string; tone?: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingVertical: 3, paddingHorizontal: 9, borderRadius: 12, borderWidth: 1, borderColor: tone + "77", backgroundColor: tone + "1F" }}>
    {icon ? <GameIcon name={icon} size={13} color={tone} /> : null}
    <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.display, fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: tone }}>{text}</Text>
  </View>;
}

// Oyunsu eylem düğmesi: tek dokunuş, açık etiket, kapalıyken neden yazar.
export function EylemDugmesi({ label, icon, onPress, disabled = false, variant = "primary", rtl, mt = 12 }: { label: string; icon: string; onPress: () => void; disabled?: boolean; variant?: "primary" | "secondary" | "danger"; rtl: boolean; mt?: number }) {
  const renk = disabled ? C.parchmentMuted : variant === "primary" ? C.inkOnGold : C.goldBright;
  return <GameButton accessibilityLabel={label} icon={icon} variant={disabled ? "secondary" : variant} disabled={disabled} onPress={onPress} rtl={rtl} style={{ marginTop: mt }}>
    <Text style={[{ fontFamily: F.display, fontSize: 13.5, letterSpacing: 0.8, lineHeight: 18, color: renk }, hiza(rtl)]}>{label}</Text>
  </GameButton>;
}

export type SekmeId = "kariyer" | "lonca" | "meslekler";
// Üç sekme: altın çerçeveli yuva; seçili sekme dolgu alır, bekleyen işi olan sekmede köz noktası yanar.
export function Sekmeler({ secili, sekmeler, onSec, rtl }: { secili: SekmeId; sekmeler: { id: SekmeId; ad: string; icon: string; isaret?: boolean; isaretAd?: string }[]; onSec: (id: SekmeId) => void; rtl: boolean }) {
  return <View accessibilityRole="tablist" style={{ flexDirection: yon(rtl), gap: 6, padding: 4, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: C.borderHi, backgroundColor: "rgba(16,11,6,0.86)" }}>
    {sekmeler.map((s) => { const on = s.id === secili; return (
      <Pressable key={s.id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={s.isaret && s.isaretAd ? `${s.ad}, ${s.isaretAd}` : s.ad} hitSlop={4} onPress={() => onSec(s.id)}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: L.touch + 10, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 4, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: on ? C.goldBright : pressed ? C.borderHi : "transparent", backgroundColor: on ? "rgba(221,180,90,0.20)" : pressed ? C.cardHi : "transparent", transform: [{ translateY: pressed ? 1 : 0 }] })}>
        <GameIcon name={s.icon} size={18} color={on ? C.goldBright : C.parchmentMuted} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ maxWidth: "100%", fontFamily: F.display, fontSize: 12.5, lineHeight: 16, letterSpacing: 0.3, textAlign: "center", color: on ? C.goldBright : C.parchmentDim }}>{s.ad}</Text>
        {s.isaret ? <View accessible={false} style={{ position: "absolute", top: 6, right: rtl ? undefined : 8, left: rtl ? 8 : undefined, width: 9, height: 9, borderRadius: 5, backgroundColor: C.ember, borderWidth: 1, borderColor: "#FFD2A8" }} /> : null}
      </Pressable>
    ); })}
  </View>;
}
