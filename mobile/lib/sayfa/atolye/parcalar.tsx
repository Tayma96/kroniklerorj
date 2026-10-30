// Atölye sayfasının ortak parçaları: ocak sahnesi, ustalık madalyonu, panel çerçevesi, parşömen renkleri, eşya ikonları.
import type { ReactNode } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { KenBurns, Ambiance } from "../../fx";
import { GameIcon } from "../../icons";
import { DesignPressable } from "../../design-pressable";
import { ITEMS } from "../../world";
import type { Recipe } from "../../game";
import { C, F } from "../../theme";

const ART = require("../../../assets/arka/atolye_demirci.jpg");
export const BLEED = 14; // kaydırma alanının yan boşluğu; sahne kenardan kenara uzansın diye

export const dir = (rtl: boolean) => (rtl ? "row-reverse" : "row") as "row" | "row-reverse";
export const align = (rtl: boolean) => (rtl ? "right" : "left") as "right" | "left";

// ── Tarif kategorileri ──
export type Cat = "food" | "arms" | "heal" | "wear";
const CAT_OF: Record<string, Cat> = {
  un: "food", ekmek: "food", corba: "food", turfanda: "food", tuzlu_balik: "food", balli_corek: "food", yun_kaftan: "wear",
  bicak: "arms", kilic: "arms", celik_kilic: "arms", kalkan: "arms", deri_zirh: "arms",
  yay: "arms", savas_balta: "arms", zincir_zirh: "arms",
  iksir: "heal",
};
export const CAT_ORDER: Cat[] = ["food", "arms", "heal", "wear"];
export const CAT_TONE: Record<Cat, string> = { food: "#8DB574", arms: C.emberSoft, heal: C.frost, wear: "#B998C6" };
export const CAT_ICON: Record<Cat, string> = { food: "bread", arms: "crossed-swords", heal: "healing", wear: "wool" };
// Listede olmayan yeni tarif de görünür kalsın: eşya türünden kategori çıkar.
export function catOf(r: Recipe): Cat {
  const known = CAT_OF[r.id]; if (known) return known;
  const it: any = ITEMS[r.out];
  if (it && ["silah", "kalkan", "zirh", "baslik", "eldiven"].includes(it.kind)) return "arms";
  if (it?.heal) return "heal";
  if (it && (it.kind === "kiyafet" || it.kind === "ayakkabi")) return "wear";
  return "food";
}

// ── Eşya ikonları (emoji yerine GameIcon) ──
const ITEM_ICON: Record<string, string> = {
  bugday: "wheat", un: "wheat", balik: "fishing", bal: "amphora", yun: "wool", sifa: "herbs", demir: "anvil", kereste: "saw", deri: "backpack",
  turfanda: "leaf", tuzlu_balik: "fishing", balli_corek: "bread", yun_kaftan: "wool", ekmek: "bread", corba: "bucket", iksir: "potion",
  bicak: "crossed-swords", kilic: "crossed-swords", celik_kilic: "crossed-swords", savas_balta: "crossed-swords", yay: "bow",
  kalkan: "kite", deri_zirh: "shield", zincir_zirh: "shield",
};
export function itemIcon(id: string): string {
  if (ITEM_ICON[id]) return ITEM_ICON[id];
  const it: any = ITEMS[id];
  if (!it) return "scroll";
  if (it.kind === "silah") return "crossed-swords";
  if (it.kind === "kalkan") return "kite";
  if (it.kind === "zirh") return "shield";
  if (it.kind === "baslik") return "hood";
  if (it.kind === "eldiven") return "fist";
  if (it.kind === "ayakkabi") return "boot";
  if (it.kind === "kiyafet") return "wool";
  if (it.heal) return "healing";
  if (it.feed || it.kind === "yiyecek") return "bread";
  return "scroll";
}

// ── Parşömen (sipariş sözleşmesi) renkleri: koyu mürekkep açık kâğıtta AA kontrastın üstünde ──
export const PARS = {
  hi: "#F0E2C0", mid: "#E3CDA0", lo: "#CFB27C", edge: "#8A6A3A",
  ink: "#2B1D0F", inkSoft: "#57412A", seal: "#8E2A1E", sealHi: "#B8432E", green: "#2F6B3A", red: "#9A2A1E",
};

// Panel başlığındaki pusula süsü (claude-paket mockup'ındaki halkalı yıldız).
export function Ornament({ size = 16, color = C.gold }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 1 L13.6 10.4 L23 12 L13.6 13.6 L12 23 L10.4 13.6 L1 12 L10.4 10.4 Z" fill={color} />
    <Circle cx="12" cy="12" r="5.2" fill="none" stroke={color} strokeWidth="1.3" />
  </Svg>;
}

// Koyu panel: pirinç çerçeve, içte ince altın hat, köşe gönyeleri.
export function Frame({ children, style, tone = C.gold }: { children: ReactNode; style?: object; tone?: string }) {
  const arm = { position: "absolute" as const, backgroundColor: tone, opacity: 0.7 };
  return <View style={[{ borderRadius: 7, borderWidth: 1, borderColor: tone === C.gold ? "#A8823F" : tone + "AA", overflow: "hidden", backgroundColor: "rgba(20,14,8,0.6)" }, style]}>
    <LinearGradient pointerEvents="none" colors={["rgba(42,31,19,0.94)", "rgba(25,18,11,0.92)", "rgba(18,13,8,0.95)"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: 4, borderWidth: 1, borderColor: tone + "22" }} />
    {([["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]] as const).map(([v, h]) => <View key={v + h} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[arm, { [v]: 3, [h]: 3, width: 12, height: 1.5 }]} />
      <View style={[arm, { [v]: 3, [h]: 3, width: 1.5, height: 12 }]} />
    </View>)}
    {children}
  </View>;
}

// Bölüm başlığı: süs + altın başlık + sağda isteğe bağlı rozet; altında sönen ışık çizgisi.
export function SectionTitle({ title, right, rtl }: { title: string; right?: ReactNode; rtl: boolean }) {
  return <View style={{ marginBottom: 10 }}>
    <View style={{ flexDirection: dir(rtl), alignItems: "center", gap: 9, minHeight: 30 }}>
      <Ornament size={17} />
      <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.serif, fontSize: 21, lineHeight: 26, color: C.gold, textAlign: align(rtl), textShadowColor: "#000", textShadowRadius: 6 }}>{title}</Text>
      {right}
    </View>
    <LinearGradient pointerEvents="none" start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} colors={[C.gold + "AA", C.gold + "33", C.gold + "00"]} style={{ height: 1, marginTop: 6 }} />
  </View>;
}

// Küçük etiket rozeti (koyu zeminde).
export function Tag({ text, tone = C.gold, icon }: { text: string; tone?: string; icon?: string }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 12, borderWidth: 1, borderColor: tone + "77", backgroundColor: tone + "1C" }}>
    {icon ? <GameIcon name={icon} size={12} color={tone} /> : null}
    <Text style={{ fontFamily: F.display, fontSize: 12, letterSpacing: 0.4, color: tone }}>{text}</Text>
  </View>;
}

// Çıktı/eşya madalyonu: koyu disk, kategori renginde halka ve ikon.
export function ItemDisc({ id, tone, size = 50, light = false }: { id: string; tone: string; size?: number; light?: boolean }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: light ? PARS.edge : tone, backgroundColor: light ? "rgba(43,29,15,0.10)" : "rgba(10,7,4,0.88)", alignItems: "center", justifyContent: "center", shadowColor: light ? "#000" : tone, shadowOpacity: light ? 0.15 : 0.45, shadowRadius: 6, elevation: 3 }}>
    <View pointerEvents="none" style={{ position: "absolute", top: 3, left: 3, right: 3, bottom: 3, borderRadius: size / 2, borderWidth: 1, borderColor: light ? PARS.edge + "55" : tone + "44" }} />
    <GameIcon name={itemIcon(id)} size={Math.round(size * 0.5)} color={light ? PARS.ink : tone} />
  </View>;
}

// Ustalık madalyonu: dövme altın halka, içinde örs ve seviye.
export function SkillMedallion({ level, label, size = 72 }: { level: number; label: string; size?: number }) {
  return <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size, borderRadius: size / 2, padding: 3, overflow: "hidden", backgroundColor: "#8A5E24", shadowColor: "#000", shadowOpacity: 0.65, shadowRadius: 8, elevation: 6 }}>
    <LinearGradient pointerEvents="none" colors={["#FFE8A9", "#D9A94E", "#8A5E24"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
    <View style={{ flex: 1, borderRadius: size / 2, backgroundColor: "#1A120A", borderWidth: 1, borderColor: "#5E3F17", alignItems: "center", justifyContent: "center" }}>
      <GameIcon name="anvil" size={Math.round(size * 0.22)} color={C.goldDim} />
      <Text style={{ fontFamily: F.display, fontSize: Math.round(size * 0.34), lineHeight: Math.round(size * 0.4), color: C.goldBright }}>{level}</Text>
    </View>
  </View>;
}

// Ocak sahnesi: yaşayan resim (Ken Burns), yükselen közler; başlık üstteki koyu duvarda okunur, örs ve kıvılcım açıkta kalır.
export function ForgeHero({ topInset, title, kicker, rtl, backLabel, onBack }: { topInset: number; title: string; kicker: string; rtl: boolean; backLabel: string; onBack: () => void }) {
  const { width } = useWindowDimensions();
  const h = 232 + topInset;
  return <View style={{ height: h, marginHorizontal: -BLEED, overflow: "hidden", backgroundColor: C.bg }}>
    <KenBurns source={ART} style={StyleSheet.absoluteFill} />
    <LinearGradient pointerEvents="none" colors={["rgba(8,5,2,0.80)", "rgba(8,5,2,0.30)", "rgba(8,5,2,0)", "rgba(14,10,6,0.45)", C.bg]} locations={[0, 0.3, 0.52, 0.8, 1]} style={StyleSheet.absoluteFill} />
    <Ambiance width={width} height={h} count={16} flakes={false} />
    <View style={{ position: "absolute", top: topInset + 6, left: 10, right: 10, flexDirection: dir(rtl) }}>
      <DesignPressable accessibilityLabel={backLabel} onPress={onBack} style={({ pressed }) => ({ paddingHorizontal: 14, borderRadius: 22, backgroundColor: pressed ? "rgba(60,40,18,0.85)" : "rgba(8,5,2,0.6)", borderWidth: 1, borderColor: C.goldDim + "99" })}>
        <Text style={{ fontFamily: F.display, fontSize: 13, color: C.goldBright }}>{backLabel}</Text>
      </DesignPressable>
    </View>
    <View style={{ position: "absolute", top: topInset + 60, left: 18, right: 18, alignItems: rtl ? "flex-end" : "flex-start" }}>
      <View style={{ flexDirection: dir(rtl), alignItems: "center", gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(18,12,6,0.8)", borderWidth: 1.5, borderColor: C.gold }}><GameIcon name="anvil" size={16} color={C.goldBright} /></View>
        <Text numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.serif, fontSize: 16, color: "#F1E2C2", textShadowColor: "#000", textShadowRadius: 6 }}>{kicker}</Text>
      </View>
      <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.display, fontSize: 32, lineHeight: 40, marginTop: 4, color: "#F7EBD2", textAlign: align(rtl), textShadowColor: "rgba(0,0,0,0.95)", textShadowRadius: 10, textShadowOffset: { width: 0, height: 2 } }}>{title}</Text>
    </View>
  </View>;
}

// Var/gerek çubuğu: malzemenin ne kadarının elde olduğunu tek bakışta gösterir.
export function NeedBar({ have, need, ok, light = false }: { have: number; need: number; ok: boolean; light?: boolean }) {
  const pct = Math.max(0, Math.min(1, need > 0 ? have / need : 1));
  return <View style={{ height: 4, borderRadius: 2, backgroundColor: light ? "rgba(43,29,15,0.18)" : "rgba(255,255,255,0.08)", overflow: "hidden" }}>
    <View style={{ width: `${pct * 100}%`, height: 4, borderRadius: 2, backgroundColor: ok ? (light ? PARS.green : C.sage) : (light ? PARS.seal : C.emberSoft) }} />
  </View>;
}

// Malzeme fişi: ikon, ad, var/gerek ve doluluk çubuğu. `light`: parşömen üstünde mürekkep tonları.
export function InputChip({ id, name, have, need, rtl, light = false }: { id: string; name: string; have: number; need: number; rtl: boolean; light?: boolean }) {
  const ok = have >= need;
  const ink = light ? PARS.ink : C.parchment;
  const count = ok ? (light ? PARS.green : C.sage) : (light ? PARS.red : C.blood);
  return <View accessible accessibilityLabel={`${name}: ${have}/${need}`} style={{ flexGrow: 1, flexBasis: "45%", minWidth: 128, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 6, borderWidth: 1,
    borderColor: ok ? (light ? PARS.green + "99" : C.sage + "99") : (light ? PARS.edge + "88" : C.border),
    backgroundColor: light ? "rgba(255,250,235,0.38)" : ok ? "rgba(74,154,90,0.12)" : "rgba(10,7,4,0.6)" }}>
    <View style={{ flexDirection: dir(rtl), alignItems: "center", gap: 6 }}>
      <GameIcon name={itemIcon(id)} size={15} color={light ? PARS.inkSoft : C.parchmentDim} />
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 19, color: ink, textAlign: align(rtl) }}>{name}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 13, color: count }}>{have}/{need}</Text>
    </View>
    <View style={{ marginTop: 5 }}><NeedBar have={have} need={need} ok={ok} light={light} /></View>
  </View>;
}

// Tezgâh durumu: ustalık madalyonu + ilerleme, bu ayın ocak durumu ve atölyenin kuralı. Sahnenin alt kenarına biner.
export type ForgeMode = "ready" | "rest" | "closed";
export function ForgeStatus({ level, xp, mode, rtl, labels }: { level: number; xp: number; mode: ForgeMode; rtl: boolean; labels: { skill: string; medal: string; badge: string; progress: string; line: string; rule: string } }) {
  const maxed = level >= 10;
  const pct = maxed ? 1 : Math.max(0, Math.min(1, (xp - level * 100) / 100));
  const tone = mode === "ready" ? C.sage : mode === "rest" ? C.emberSoft : C.blood;
  const icon = mode === "ready" ? "flame" : mode === "rest" ? "hourglass" : "prisoner";
  return <Frame style={{ marginTop: -38, marginBottom: 20 }}>
    <View style={{ padding: 12 }}>
      <View style={{ flexDirection: dir(rtl), gap: 12, alignItems: "center" }}>
        <SkillMedallion level={level} label={labels.medal} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: dir(rtl), alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontFamily: F.display, fontSize: 17, color: C.gold }}>{labels.skill}</Text>
            <Tag text={labels.badge} tone={tone} icon={icon} />
          </View>
          <View accessible accessibilityRole="progressbar" accessibilityLabel={labels.progress} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }} style={{ marginTop: 9, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "#3A2A16", overflow: "hidden", flexDirection: dir(rtl) }}>
            <LinearGradient colors={["#F3D27A", "#C99A45", "#8A5E24"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ width: `${pct * 100}%`, height: "100%" }} />
          </View>
          <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: C.parchmentMuted, marginTop: 4, textAlign: align(rtl) }}>{labels.progress}</Text>
        </View>
      </View>
      <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={[C.gold + "00", C.gold + "55", C.gold + "00"]} style={{ height: 1, marginVertical: 11 }} />
      <View style={{ flexDirection: dir(rtl), gap: 9, alignItems: "center" }}>
        <GameIcon name={icon} size={17} color={tone} />
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 16, lineHeight: 21, color: C.parchment, textAlign: align(rtl) }}>{labels.line}</Text>
      </View>
      <Text style={{ fontFamily: F.serifItalic, fontSize: 14, lineHeight: 20, color: C.parchmentMuted, marginTop: 7, textAlign: align(rtl) }}>{labels.rule}</Text>
    </View>
  </Frame>;
}
