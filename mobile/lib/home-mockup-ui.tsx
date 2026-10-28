// Ana sayfa — claude-paket mockup (ekran 1) ölçüleriyle.
// Ölçüler mockup'ın 476 px genişliğindeki ekranından 390 pt'ye (×0.82) çevrilmiştir; tek ekrana sığar.
import type { ReactNode } from "react";
import { View, Text, Image, Pressable, StyleSheet, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { GameIcon } from "./icons";
import { Portre, PressableScale } from "./ui";
import { useGame } from "./store";
import { useI18n, applyParams, renderEvt } from "./i18n";
import { pendingMonthScene, chooseMonthDilemma } from "./month-scene";
import { ikilemTema, SAHNE_GORSEL } from "./sahne-tema";
import { etkiler, ETKI } from "./kart3d";
import { hap } from "./haptics";
import { C, F } from "./theme";

export const MK = {
  side: 10,            // panel yan boşluğu
  heroH: 201,          // sahne yüksekliği (durum çubuğu hariç)
  frame: "#8C6B37",    // panel çerçevesi
  frameHi: "#C9A24E",  // ince altın vurgu
  panel: "#18120B",    // panel zemini
  ink: "#EDE1C8",      // gövde metni
  muted: "#B9A57F",    // ikincil metin
  gold: "#E2B65A",     // başlık altını
};

// Panel başlığındaki pusula süsü (mockup'taki halkalı yıldız).
export function Ornament({ size = 16, color = MK.gold }: { size?: number; color?: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 1 L13.6 10.4 L23 12 L13.6 13.6 L12 23 L10.4 13.6 L1 12 L10.4 10.4 Z" fill={color} />
    <Circle cx="12" cy="12" r="5.2" fill="none" stroke={color} strokeWidth="1.3" />
  </Svg>;
}

// Mockup paneli: koyu zemin, 1 pt pirinç çerçeve, içte ince altın hat.
export function MkPanel({ children, style, red = false }: { children: ReactNode; style?: object; red?: boolean }) {
  return <View style={[{ marginHorizontal: MK.side, borderRadius: 5, borderWidth: 1, borderColor: red ? "#A13A2B" : MK.frame, backgroundColor: MK.panel, overflow: "hidden" }, style]}>
    {red && <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={["#7A1E15", "#5C1610", "#3E0F0B"]} style={StyleSheet.absoluteFill} />}
    <View pointerEvents="none" style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderRadius: 3, borderWidth: 1, borderColor: red ? "rgba(255,190,160,0.14)" : "rgba(201,162,78,0.16)" }} />
    {children}
  </View>;
}

export function MkPanelHeader({ title, right, rtl }: { title: string; right?: ReactNode; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
    <Ornament />
    <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.serif, fontSize: 17, lineHeight: 21, color: MK.gold }}>{title}</Text>
    {right}
  </View>;
}

// Sahne: yaş × mevsim kahraman resmi; başlık açık gökyüzünde koyu yazı.
export function MkHero({ source, topInset, seasonIcon, title, sub, rtl, onBook, onSettings, bookLabel, settingsLabel }: { source: ImageSourcePropType; topInset: number; seasonIcon: string; title: string; sub: string; rtl: boolean; onBook: () => void; onSettings: () => void; bookLabel: string; settingsLabel: string }) {
  const ink = "#1C130A", halo = "rgba(255,246,228,0.95)";
  return <View style={{ height: MK.heroH + topInset, overflow: "hidden" }}>
    <Image accessible={false} source={source} resizeMode="cover" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
    <LinearGradient pointerEvents="none" colors={["rgba(255,248,232,0.30)", "rgba(255,248,232,0)", "rgba(21,16,10,0)", "#15100A"]} locations={[0, 0.28, 0.78, 1]} style={StyleSheet.absoluteFill} />
    <View style={{ position: "absolute", top: topInset + 14, left: 0, right: 0, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", paddingHorizontal: 12 }}>
      <View style={{ width: 44, alignItems: "center" }}><GameIcon name={seasonIcon} size={22} color={ink} /></View>
      <View style={{ width: 1.5, height: 36, backgroundColor: "rgba(28,19,10,0.55)", marginRight: 10 }} />
      <View style={{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }}>
        {/* Tarih satırı başlığın tam altında ortalı (mockup) */}
        <View style={{ alignItems: "center", maxWidth: "100%" }}>
          <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.display, fontSize: 28, lineHeight: 33, color: ink, textShadowColor: halo, textShadowRadius: 8 }}>{title}</Text>
          <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 16, color: "#24180C", textShadowColor: halo, textShadowRadius: 6 }}>{sub}</Text>
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={bookLabel} onPress={onBook} style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }}><GameIcon name="map" size={19} color={ink} /></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={settingsLabel} onPress={onSettings} style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }}><GameIcon name="ayarlar" size={19} color={ink} /></Pressable>
    </View>
  </View>;
}

// Kimlik: 84 pt portre sahneden 33 pt taşar; sağında ad, meslek, çizgi ve dört gösterge.
export function MkIdentity({ age, gender, name, role, stats, rtl, onPortrait, portraitLabel }: { age: number; gender: "erkek" | "kadın"; name: string; role: string; stats: { icon: string; label: string; value: string; tone?: string }[]; rtl: boolean; onPortrait: () => void; portraitLabel: string }) {
  return <View style={{ marginTop: -40, paddingHorizontal: 16, flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
    <Pressable accessibilityRole="button" accessibilityLabel={portraitLabel} onPress={onPortrait} style={{ width: 88, height: 88, borderRadius: 44, padding: 2, backgroundColor: "#0E0A06", borderWidth: 2, borderColor: MK.frameHi, shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 6, elevation: 6 }}>
      <Portre age={age} gender={gender} size={80} ring={false} />
    </Pressable>
    <View style={{ flex: 1, minWidth: 0, paddingTop: 44 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.serif, fontSize: 18, lineHeight: 21, color: "#F4E8CF" }}>{name}</Text>
      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 16, color: MK.muted }}>{role}</Text>
      <View style={{ height: 1, backgroundColor: "rgba(201,162,78,0.45)", marginTop: 6, marginBottom: 6 }} />
      <View style={{ flexDirection: rtl ? "row-reverse" : "row" }}>
        {stats.map((s, i) => <View key={s.label} accessible accessibilityLabel={`${s.label}: ${s.value}`} style={{ flex: 1, minWidth: 0, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 4, paddingHorizontal: 3, borderLeftWidth: !rtl && i ? 1 : 0, borderRightWidth: rtl && i ? 1 : 0, borderColor: "rgba(201,162,78,0.3)" }}>
          <GameIcon name={s.icon} size={16} color={s.tone || MK.gold} />
          <View style={{ minWidth: 0, flexShrink: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 10, lineHeight: 12, color: MK.muted }}>{s.label}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 16, color: s.tone || "#F4E8CF" }}>{s.value}</Text>
          </View>
        </View>)}
      </View>
    </View>
  </View>;
}

const ETKI_LABEL: Record<string, string> = { money: "char.money", reputation: "soc.reputation.l", honor: "soc.honor.l", fear: "soc.fear.l", fame: "soc.fame.l", health: "char.health", stat_points: "char.attrs" };

// Bu Ayın Kararı: metin solda, sahne sağda soluklaşır; altta iki seçenek kutusu (56 pt).
export function MkDecision() {
  const { state, apply, mpMode } = useGame(), { t, tg, lang } = useI18n();
  if (!state || mpMode || state.player.dead) return null;
  const rtl = lang === "ar";
  const m = pendingMonthScene(state), d = m?.dilemma;
  const text = (key: string, fallback: string) => { const v = tg(key, state.player.gender === "kadın"); return v === key ? fallback : v; };
  if (!d || !m) {
    const event = [...state.history].reverse().find(e => e.day === state.turn && e.k?.startsWith("dil."));
    if (!event) return null;
    return <MkPanel style={{ marginBottom: 10 }}>
      <MkPanelHeader title={t("flow.monthDecision")} rtl={rtl} />
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: MK.ink, paddingHorizontal: 14, paddingBottom: 12 }}>{renderEvt(event.k, event.text, event.p, lang, t, state.player.gender === "kadın")}</Text>
    </MkPanel>;
  }
  const tema = ikilemTema(d.id, d.icon);
  return <MkPanel style={{ marginBottom: 10 }}>
    {tema && <View pointerEvents="none" style={{ position: "absolute", top: 0, [rtl ? "left" : "right"]: 0, width: "46%", height: 112, overflow: "hidden" }}>
      <Image accessible={false} source={SAHNE_GORSEL[tema]} resizeMode="cover" style={{ width: "100%", height: "100%", opacity: 0.85 }} />
      <LinearGradient start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} colors={[MK.panel, "rgba(24,18,11,0.35)", "rgba(24,18,11,0)"]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(24,18,11,0)", MK.panel]} locations={[0.55, 1]} style={StyleSheet.absoluteFill} />
    </View>}
    <MkPanelHeader title={t("flow.monthDecision")} rtl={rtl} />
    <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: MK.ink, paddingHorizontal: 14, paddingRight: rtl ? 14 : tema ? "30%" : 14, paddingLeft: rtl && tema ? "30%" : 14, minHeight: 52, textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 3 }}>
      <Text style={{ color: MK.gold }}>{text(`dil.${d.id}.t`, d.title)}. </Text>{text(`dil.${d.id}.x`, d.text)}
    </Text>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}>
      {d.choices.map((choice, index) => {
        const label = text(`dil.${d.id}.c${index}`, choice.label);
        const list = etkiler(choice);
        const lead = [...list].sort((a, b) => Number(b.big) - Number(a.big))[0];
        return <PressableScale key={index} accessibilityLabel={label} haptic="selection" onPress={() => apply(s => chooseMonthDilemma(s, m.id, index))}
          style={{ flexGrow: 1, flexBasis: d.choices.length === 2 ? "45%" : "100%", minHeight: 56, borderRadius: 4, borderWidth: 1, borderColor: MK.frame, backgroundColor: "#120D08", flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, paddingHorizontal: 9, paddingVertical: 7 }}>
          <View style={{ width: 34, alignItems: "center" }}>{lead ? <GameIcon name={ETKI[lead.k].icon} size={30} color={MK.gold} /> : <Ornament size={22} />}</View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 17, color: "#F4E8CF" }}>{label}</Text>
            {list.length > 0 && <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 11.5, lineHeight: 14, color: MK.muted }}>{list.map((x) => t(ETKI_LABEL[x.k] || x.k)).join(" · ")}</Text>}
            {choice.sans !== undefined && <Text style={{ fontFamily: F.serif, fontSize: 11.5, color: MK.muted }}>{applyParams(t("ahi.odds"), [choice.sans])}</Text>}
          </View>
        </PressableScale>;
      })}
    </View>
  </MkPanel>;
}

// Kırmızı uyarı afişi (56 pt).
export function MkAlert({ icon, title, sub, rtl, onPress, red = true }: { icon: string; title: string; sub: string; rtl: boolean; onPress: () => void; red?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => { hap("tap"); onPress(); }} style={({ pressed }) => ({ marginBottom: 10, opacity: pressed ? 0.88 : 1 })}>
    <MkPanel red={red}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8 }}>
        <GameIcon name={icon} size={30} color={red ? "#F4E1CC" : MK.gold} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 19, color: "#FBEBD6" }}>{title}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 15, color: red ? "#E9CBB6" : MK.muted }}>{sub}</Text>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 22, color: "#FBEBD6" }}>{rtl ? "‹" : "›"}</Text>
      </View>
    </MkPanel>
  </Pressable>;
}

// Son Gelişmeler: başlık + iç kutuda 35 pt satırlar (ikon · cümle · zaman).
export function MkRecent({ title, seeAll, empty, rows, rtl, onSeeAll }: { title: string; seeAll: string; empty: string; rows: { key: string; icon: string; text: string; when: string; fresh: boolean; landmark: boolean }[]; rtl: boolean; onSeeAll: () => void }) {
  return <MkPanel style={{ marginBottom: 8 }}>
    <MkPanelHeader title={title} rtl={rtl} right={<Pressable accessibilityRole="button" accessibilityLabel={seeAll} onPress={onSeeAll} hitSlop={10} style={{ minHeight: 30, justifyContent: "center" }}><Text style={{ fontFamily: F.serif, fontSize: 12, color: "#E9DDC4" }}>{seeAll}  {rtl ? "‹" : "›"}</Text></Pressable>} />
    <View style={{ marginHorizontal: 12, marginTop: 2, marginBottom: 12, borderRadius: 3, borderWidth: 1, borderColor: "rgba(140,107,55,0.55)", backgroundColor: "#100C07" }}>
      {rows.length ? rows.map((r, i) => <View key={r.key} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, minHeight: 35, paddingHorizontal: 10, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderColor: "rgba(140,107,55,0.35)" }}>
        <View style={{ width: 22, alignItems: "center" }}><GameIcon name={r.icon} size={17} color={r.landmark ? C.goldBright : MK.gold} /></View>
        <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: r.landmark ? C.goldBright : MK.ink }}>{r.text}</Text>
        {r.fresh && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.goldBright }} />}
        <Text style={{ fontFamily: F.serif, fontSize: 10.5, color: MK.muted }}>{r.when}</Text>
      </View>) : <Text style={{ fontFamily: F.serif, fontSize: 12.5, color: MK.muted, padding: 10 }}>{empty}</Text>}
    </View>
  </MkPanel>;
}

// Yaşam Defteri satırı (49 pt).
export function MkBookRow({ title, sub, rtl, onPress }: { title: string; sub: string; rtl: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => { hap("tap"); onPress(); }} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
    <MkPanel>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, minHeight: 49, paddingHorizontal: 12, paddingVertical: 6 }}>
        <GameIcon name="book" size={28} color={MK.gold} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 18, color: "#F4E8CF" }}>{title}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 11.5, lineHeight: 14, color: MK.muted }}>{sub}</Text>
        </View>
        <Text style={{ fontFamily: F.serif, fontSize: 22, color: "#F4E8CF" }}>{rtl ? "‹" : "›"}</Text>
      </View>
    </MkPanel>
  </Pressable>;
}
