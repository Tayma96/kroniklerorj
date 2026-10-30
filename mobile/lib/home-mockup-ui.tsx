// Ana sayfa — claude-paket mockup (ekran 1) ölçüleriyle.
// Ölçüler mockup'ın 476 px genişliğindeki ekranından 390 pt'ye (×0.82) çevrilmiştir; tek ekrana sığar.
// Paneller yarı saydamdır: ardındaki sahne zemini (lib/sayfa/ana/zemin.tsx) hafifçe sezilir.
import { useState, type ReactNode } from "react";
import { View, Text, Pressable, Image, StyleSheet, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Circle } from "react-native-svg";
import { GameIcon } from "./icons";
import { Portre, PressableScale } from "./ui";
import { KenBurns } from "./fx";
import { useGame } from "./store";
import { useI18n, applyParams, renderEvt } from "./i18n";
import { pendingMonthScene, chooseMonthDilemma } from "./month-scene";
import { ikilemTema, SAHNE_GORSEL } from "./sahne-tema";
import { etkiler, ETKI } from "./kart3d";
import { playTap, playEffect } from "./sound";
import { C, F } from "./theme";

export { MK, Ornament } from "./mk-sus";
import { MK, Ornament } from "./mk-sus";
const CAM = "rgba(22,16,10,0.74)";   // yarı saydam panel zemini
const CAM_KOYU = "rgba(14,10,6,0.5)"; // panel içi kutu


// Mockup paneli: yarı saydam koyu zemin, üstten sıcak ışık, 1 pt pirinç çerçeve, içte ince altın hat.
export function MkPanel({ children, style, red = false }: { children: ReactNode; style?: object; red?: boolean }) {
  return <View style={[{ marginHorizontal: MK.side, borderRadius: 5, borderWidth: 1, borderColor: red ? "#A13A2B" : MK.frame, backgroundColor: red ? "#3E0F0B" : CAM, overflow: "hidden" }, style]}>
    {red
      ? <LinearGradient pointerEvents="none" start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={["#7A1E15", "#5C1610", "#3E0F0B"]} style={StyleSheet.absoluteFill} />
      : <LinearGradient pointerEvents="none" colors={["rgba(255,214,150,0.08)", "rgba(255,214,150,0)"]} locations={[0, 0.55]} style={StyleSheet.absoluteFill} />}
    <View pointerEvents="none" style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderRadius: 3, borderWidth: 1, borderColor: red ? "rgba(255,190,160,0.14)" : "rgba(201,162,78,0.18)" }} />
    {children}
  </View>;
}

export function MkPanelHeader({ title, right, rtl }: { title: string; right?: ReactNode; rtl: boolean }) {
  return <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4, minHeight: 40 }}>
    <Ornament />
    <Text accessibilityRole="header" style={{ flex: 1, fontFamily: F.serif, fontSize: 17, lineHeight: 21, color: MK.gold, textAlign: rtl ? "right" : "left" }}>{title}</Text>
    {right}
  </View>;
}

function Chevron({ rtl, color = "#F4E8CF" }: { rtl: boolean; color?: string }) {
  return <Text accessible={false} style={{ fontFamily: F.serif, fontSize: 22, lineHeight: 24, color }}>{rtl ? "‹" : "›"}</Text>;
}

// Sahne: yaş × mevsim kahraman resmi, yavaş Ken Burns ile canlı (sade modda durağan); başlık açık gökyüzünde koyu yazı.
export function MkHero({ source, topInset, seasonIcon, title, sub, rtl, onBook, onSettings, bookLabel, settingsLabel }: { source: ImageSourcePropType; topInset: number; seasonIcon: string; title: string; sub: string; rtl: boolean; onBook: () => void; onSettings: () => void; bookLabel: string; settingsLabel: string }) {
  const ink = "#1C130A", halo = "rgba(255,246,228,0.95)";
  const { width } = useWindowDimensions();
  const narrow = width < 360;
  // Resim kare ve ekrandan biraz geniş: Ken Burns kayarken kenar boşluğu açılmaz; üstten hizalı, başlık gökyüzüne oturur.
  const pay = 24, kare = width + pay * 2;
  const btn = (label: string, icon: string, onPress: () => void) => <PressableScale haptic="tap" accessibilityLabel={label} onPress={() => { playTap(); onPress(); }} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
    <GameIcon name={icon} size={20} color={ink} />
  </PressableScale>;
  return <View style={{ height: MK.heroH + topInset, overflow: "hidden" }}>
    <KenBurns source={source} style={{ position: "absolute", top: 0, left: -pay, width: kare, height: kare }} />
    <LinearGradient pointerEvents="none" colors={["rgba(255,248,232,0.30)", "rgba(255,248,232,0)", "rgba(21,15,9,0)", "rgba(21,15,9,0.5)", "rgba(21,15,9,0.9)"]} locations={[0, 0.28, 0.6, 0.84, 1]} style={StyleSheet.absoluteFill} />
    <View style={{ position: "absolute", top: topInset + 12, left: 0, right: 0, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", paddingHorizontal: 8 }}>
      <View accessible={false} style={{ width: 44, alignItems: "center" }}><GameIcon name={seasonIcon} size={22} color={ink} /></View>
      <View style={{ width: 1.5, height: 36, backgroundColor: "rgba(28,19,10,0.55)", marginLeft: rtl ? 10 : 0, marginRight: rtl ? 0 : 10 }} />
      <View style={{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }}>
        {/* Tarih satırı başlığın tam altında ortalı (mockup) */}
        <View style={{ alignItems: "center", maxWidth: "100%" }}>
          <Text accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.display, fontSize: narrow ? 22 : 28, lineHeight: narrow ? 27 : 33, color: ink, textShadowColor: halo, textShadowRadius: 8 }}>{title}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: "#24180C", textShadowColor: halo, textShadowRadius: 6 }}>{sub}</Text>
        </View>
      </View>
      {btn(bookLabel, "map", onBook)}
      {btn(settingsLabel, "ayarlar", onSettings)}
    </View>
  </View>;
}

// Kimlik: 84 pt portre sahneden taşar; sağında ad, meslek, çizgi ve dört gösterge (dar ekranda 2×2).
export function MkIdentity({ age, gender, name, role, stats, rtl, onPortrait, portraitLabel }: { age: number; gender: "erkek" | "kadın"; name: string; role: string; stats: { icon: string; label: string; value: string; tone?: string }[]; rtl: boolean; onPortrait: () => void; portraitLabel: string }) {
  const narrow = useWindowDimensions().width < 360;
  return <View style={{ marginTop: -40, paddingHorizontal: 14, flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
    <PressableScale haptic="tap" accessibilityLabel={portraitLabel} onPress={() => { playTap(); onPortrait(); }} style={{ width: 88, height: 88, borderRadius: 44, padding: 2, backgroundColor: "#0E0A06", borderWidth: 2, borderColor: MK.frameHi, shadowColor: "#000", shadowOpacity: 0.6, shadowRadius: 6, elevation: 6 }}>
      <Portre age={age} gender={gender} size={80} ring={false} />
    </PressableScale>
    <View style={{ flex: 1, minWidth: 0, paddingTop: 44 }}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.serif, fontSize: 19, lineHeight: 23, color: "#F4E8CF", textAlign: rtl ? "right" : "left", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 4 }}>{name}</Text>
      <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 17, color: MK.muted, textAlign: rtl ? "right" : "left" }}>{role}</Text>
      <View style={{ height: 1, backgroundColor: "rgba(201,162,78,0.45)", marginTop: 6, marginBottom: 6 }} />
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: narrow ? "wrap" : "nowrap", rowGap: 6 }}>
        {stats.map((s, i) => { const sep = narrow ? i % 2 === 1 : i > 0; return <View key={s.label} accessible accessibilityLabel={`${s.label}: ${s.value}`} style={{ flex: narrow ? undefined : 1, width: narrow ? "50%" : undefined, minWidth: 0, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 4, paddingHorizontal: 3, borderLeftWidth: !rtl && sep ? 1 : 0, borderRightWidth: rtl && sep ? 1 : 0, borderColor: "rgba(201,162,78,0.3)" }}>
          <GameIcon name={s.icon} size={16} color={s.tone || MK.gold} />
          <View style={{ minWidth: 0, flexShrink: 1, alignItems: rtl ? "flex-end" : "flex-start" }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 14, color: MK.muted }}>{s.label}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 18, color: s.tone || "#F4E8CF" }}>{s.value}</Text>
          </View>
        </View>; })}
      </View>
    </View>
  </View>;
}

const ETKI_LABEL: Record<string, string> = { money: "char.money", reputation: "soc.reputation.l", honor: "soc.honor.l", fear: "soc.fear.l", fame: "soc.fame.l", health: "char.health", stat_points: "char.attrs" };

// Bu Ayın Kararı: metin solda, sahne sağda soluklaşır; altta iki seçenek kutusu (dar ekranda alt alta).
export function MkDecision() {
  const { state, apply, mpMode } = useGame(), { t, tg, lang } = useI18n(), { width } = useWindowDimensions();
  if (!state || mpMode || state.player.dead) return null;
  const rtl = lang === "ar";
  const m = pendingMonthScene(state), d = m?.dilemma;
  const text = (key: string, fallback: string) => { const v = tg(key, state.player.gender === "kadın"); return v === key ? fallback : v; };
  if (!d || !m) {
    const event = [...state.history].reverse().find(e => e.day === state.turn && e.k?.startsWith("dil."));
    if (!event) return null;
    return <MkPanel style={{ marginBottom: 10 }}>
      <MkPanelHeader title={t("flow.monthDecision")} rtl={rtl} />
      <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: MK.ink, paddingHorizontal: 14, paddingBottom: 12, textAlign: rtl ? "right" : "left" }}>{renderEvt(event.k, event.text, event.p, lang, t, state.player.gender === "kadın")}</Text>
    </MkPanel>;
  }
  const tema = ikilemTema(d.id, d.icon);
  const two = width >= 340 && d.choices.length === 2;
  return <MkPanel style={{ marginBottom: 10 }}>
    {tema && <View pointerEvents="none" style={{ position: "absolute", top: 0, [rtl ? "left" : "right"]: 0, width: "46%", height: 118, overflow: "hidden" }}>
      <Image accessible={false} source={SAHNE_GORSEL[tema]} resizeMode="cover" style={{ width: "100%", height: "100%", opacity: 0.85 }} />
      <LinearGradient start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} colors={["rgba(22,16,10,0.95)", "rgba(22,16,10,0.4)", "rgba(22,16,10,0)"]} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(22,16,10,0)", "rgba(22,16,10,0.95)"]} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />
    </View>}
    <MkPanelHeader title={t("flow.monthDecision")} rtl={rtl} />
    <Text style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 19, color: MK.ink, paddingHorizontal: 14, paddingRight: rtl ? 14 : tema ? "30%" : 14, paddingLeft: rtl && tema ? "30%" : 14, minHeight: 56, textAlign: rtl ? "right" : "left", textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 3 }}>
      <Text style={{ color: MK.gold }}>{text(`dil.${d.id}.t`, d.title)}. </Text>{text(`dil.${d.id}.x`, d.text)}
    </Text>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 7, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 10 }}>
      {d.choices.map((choice, index) => {
        const label = text(`dil.${d.id}.c${index}`, choice.label);
        const list = etkiler(choice);
        const lead = [...list].sort((a, b) => Number(b.big) - Number(a.big))[0];
        return <PressableScale key={index} accessibilityLabel={label} haptic="selection" onPress={() => { playTap(); apply(s => chooseMonthDilemma(s, m.id, index)); }}
          style={{ flexGrow: 1, flexBasis: two ? "45%" : "100%", minHeight: 58, borderRadius: 4, borderWidth: 1, borderColor: MK.frame, backgroundColor: "rgba(18,13,8,0.88)", flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, paddingHorizontal: 9, paddingVertical: 7 }}>
          <View style={{ width: 34, alignItems: "center" }}>{lead ? <GameIcon name={ETKI[lead.k].icon} size={30} color={MK.gold} /> : <Ornament size={22} />}</View>
          <View style={{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }}>
            <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 18, color: "#F4E8CF", textAlign: rtl ? "right" : "left" }}>{label}</Text>
            {list.length > 0 && <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: MK.muted }}>{list.map((x) => t(ETKI_LABEL[x.k] || x.k)).join(" · ")}</Text>}
            {choice.sans !== undefined && <Text style={{ fontFamily: F.serif, fontSize: 12.5, lineHeight: 16, color: MK.muted }}>{applyParams(t("ahi.odds"), [choice.sans])}</Text>}
          </View>
        </PressableScale>;
      })}
    </View>
  </MkPanel>;
}

// Kırmızı uyarı afişi (56 pt).
export function MkAlert({ icon, title, sub, rtl, onPress, red = true }: { icon: string; title: string; sub: string; rtl: boolean; onPress: () => void; red?: boolean }) {
  return <PressableScale haptic="tap" accessibilityLabel={`${title}. ${sub}`} onPress={() => { playTap(); onPress(); }} style={{ marginBottom: 10 }}>
    <MkPanel red={red}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, minHeight: 58, paddingHorizontal: 14, paddingVertical: 8 }}>
        <GameIcon name={icon} size={30} color={red ? "#F4E1CC" : MK.gold} />
        <View style={{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }}>
          <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: "#FBEBD6" }}>{title}</Text>
          <Text numberOfLines={2} style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: red ? "#E9CBB6" : MK.muted, textAlign: rtl ? "right" : "left" }}>{sub}</Text>
        </View>
        <Chevron rtl={rtl} color="#FBEBD6" />
      </View>
    </MkPanel>
  </PressableScale>;
}

// Afişin altındaki ikincil uyarılar: hiçbiri gizlenmez, her biri kendi panelini açar (44 pt).
export function MkAlertChips({ items, rtl }: { items: { key: string; icon: string; title: string; red: boolean; onPress: () => void }[]; rtl: boolean }) {
  if (!items.length) return null;
  return <View style={{ marginHorizontal: MK.side, marginTop: -3, marginBottom: 10, flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 6 }}>
    {items.map((it) => <PressableScale key={it.key} haptic="tap" accessibilityLabel={it.title} onPress={() => { playTap(); it.onPress(); }}
      style={{ flexGrow: 1, flexBasis: items.length > 1 ? "45%" : "100%", minHeight: 44, borderRadius: 5, borderWidth: 1, borderColor: it.red ? "#A13A2B" : MK.frame, backgroundColor: it.red ? "rgba(92,22,16,0.86)" : CAM, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 8, paddingHorizontal: 10 }}>
      <GameIcon name={it.icon} size={18} color={it.red ? "#F4E1CC" : MK.gold} />
      <Text numberOfLines={1} style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: "#FBEBD6", textAlign: rtl ? "right" : "left" }}>{it.title}</Text>
      <Chevron rtl={rtl} color="#FBEBD6" />
    </PressableScale>)}
  </View>;
}

// Son Gelişmeler: başlık + iç kutuda satırlar (ikon · cümle · zaman).
// `fill`: ekranda kalan boşluğu kaplar; satırlar ölçülür ve yalnız tam sığanlar gösterilir (iki satırlık olay kırpılmaz).
const SATIR_TAHMIN = 56; // ölçülmemiş satır için üst sınır (iki satır metin + boşluk)
export function MkRecent({ title, seeAll, empty, more = "", rows, rtl, onSeeAll, fill = false, scene }: { title: string; seeAll: string; empty: string; more?: string; rows: { key: string; icon: string; text: string; when: string; fresh: boolean; landmark: boolean }[]; rtl: boolean; onSeeAll: () => void; fill?: boolean; scene?: ImageSourcePropType }) {
  const [boxH, setBoxH] = useState(0);
  const [rowH, setRowH] = useState<Record<string, number>>({});
  let cap = 3, used = 0;
  if (fill && boxH) {
    cap = 0;
    for (const r of rows) { const h = rowH[r.key] ?? SATIR_TAHMIN; if (used + h > boxH) break; used += h; cap++; }
    cap = Math.max(1, cap);
  }
  const shown = rows.slice(0, cap);
  const olc = (key: string, h: number) => setRowH((m) => {
    if (m[key] === h) return m;
    const n: Record<string, number> = {};
    for (const r of rows) if (m[r.key] != null) n[r.key] = m[r.key];
    n[key] = h; return n;
  });
  return <MkPanel style={{ marginBottom: 8, flex: fill ? 1 : undefined, minHeight: fill ? 150 : undefined }}>
    <MkPanelHeader title={title} rtl={rtl} right={<Pressable accessibilityRole="button" accessibilityLabel={seeAll} onPress={() => { playTap(); onSeeAll(); }} hitSlop={6} style={({ pressed }) => ({ minHeight: 44, minWidth: 44, justifyContent: "center", paddingHorizontal: 4, opacity: pressed ? 0.7 : 1 })}>
      <Text style={{ fontFamily: F.serif, fontSize: 13.5, color: "#E9DDC4" }}>{seeAll}  {rtl ? "‹" : "›"}</Text>
    </Pressable>} />
    {/* fill: satırlar kutunun içinde mutlak durur; kutu yüksekliği yalnız boş alandan gelir, satırlar onu büyütüp sayfayı taşırmaz. */}
    <View onLayout={fill ? (e) => setBoxH(e.nativeEvent.layout.height) : undefined} style={{ flex: fill ? 1 : undefined, marginHorizontal: 12, marginTop: 0, marginBottom: 12, borderRadius: 3, borderWidth: 1, borderColor: "rgba(140,107,55,0.55)", backgroundColor: CAM_KOYU, overflow: "hidden" }}>
      {/* Boş kalan alt kısım karanlık kutu değil, soluk bir yol sahnesi: hayatın sayfaları daha yazılacak. */}
      {fill && scene && boxH - used > 110 && <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: used, bottom: 0 }}>
        <Image accessible={false} source={scene} resizeMode="cover" style={{ width: "100%", height: "100%", opacity: 0.5 }} />
        <LinearGradient colors={["rgba(14,10,6,0.96)", "rgba(14,10,6,0.25)", "rgba(14,10,6,0.6)"]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      </View>}
      <View style={fill ? { position: "absolute", top: 0, left: 0, right: 0 } : undefined}>
        {shown.length ? shown.map((r, i) => <View key={r.key} onLayout={fill ? (e) => olc(r.key, Math.ceil(e.nativeEvent.layout.height)) : undefined} style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, minHeight: 42, paddingHorizontal: 10, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderColor: "rgba(140,107,55,0.35)" }}>
          <View style={{ width: 22, alignItems: "center" }}><GameIcon name={r.icon} size={18} color={r.landmark ? C.goldBright : MK.gold} /></View>
          <Text numberOfLines={2} style={{ flex: 1, fontFamily: F.serif, fontSize: 14, lineHeight: 18, color: r.landmark ? C.goldBright : MK.ink, textAlign: rtl ? "right" : "left" }}>{r.text}</Text>
          {r.fresh && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.goldBright }} />}
          <Text style={{ fontFamily: F.serif, fontSize: 12, color: MK.muted }}>{r.when}</Text>
        </View>) : <Text style={{ fontFamily: F.serif, fontSize: 14, color: MK.muted, padding: 10, textAlign: rtl ? "right" : "left" }}>{empty}</Text>}
      </View>
      {fill && shown.length > 0 && shown.length === rows.length && boxH - used > 44 && <Text style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 10, textAlign: "center", fontFamily: F.serifItalic, fontSize: 13.5, color: "#D9C69C", textShadowColor: "#000", textShadowRadius: 4 }}>{more}</Text>}
    </View>
  </MkPanel>;
}

// Yaşam Defteri satırı (52 pt): sayfa sesiyle açılır.
export function MkBookRow({ title, sub, rtl, onPress }: { title: string; sub: string; rtl: boolean; onPress: () => void }) {
  return <PressableScale haptic="tap" accessibilityLabel={`${title}. ${sub}`} onPress={() => { playEffect("sayfa"); onPress(); }}>
    <MkPanel>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 12, minHeight: 52, paddingHorizontal: 12, paddingVertical: 6 }}>
        <GameIcon name="book" size={28} color={MK.gold} />
        <View style={{ flex: 1, minWidth: 0, alignItems: rtl ? "flex-end" : "flex-start" }}>
          <Text style={{ fontFamily: F.serif, fontSize: 16, lineHeight: 20, color: "#F4E8CF" }}>{title}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: MK.muted }}>{sub}</Text>
        </View>
        <Chevron rtl={rtl} />
      </View>
    </MkPanel>
  </PressableScale>;
}
