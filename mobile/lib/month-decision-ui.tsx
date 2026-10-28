import { View, Text, Image, StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useGame } from "./store";
import { useI18n, applyParams, renderEvt } from "./i18n";
import { pendingMonthScene, chooseMonthDilemma } from "./month-scene";
import { OrnatePanel } from "./ornament-ui";
import { EtkiIzi, etkiler, ETKI } from "./kart3d";
import { ikilemTema, SAHNE_GORSEL } from "./sahne-tema";
import { GameIcon } from "./icons";
import { C, F, T } from "./theme";
import { PressableScale } from "./ui";

const ETKI_LABEL: Record<string, string> = { money: "char.money", reputation: "soc.reputation.l", honor: "soc.honor.l", fear: "soc.fear.l", fame: "soc.fame.l", health: "char.health", stat_points: "char.attrs" };

// Ayın kararı: mockup'taki gibi metnin sağında soluklaşan sahne, altta iki büyük seçenek.
export function MonthDecisionCard({ bare = false }: { bare?: boolean } = {}) {
  const { state, apply, mpMode } = useGame(), { t, tg, lang } = useI18n(), { width } = useWindowDimensions();
  if (!state || mpMode || state.player.dead) return null;
  const m = pendingMonthScene(state), d = m?.dilemma;
  const text = (key: string, fallback: string) => { const value = tg(key, state.player.gender === "kadın"); return value === key ? fallback : value; };
  if (!d || !m) {
    const event = [...state.history].reverse().find(e => e.day === state.turn && e.k?.startsWith("dil."));
    return event ? <OrnatePanel title={bare ? undefined : t("flow.monthDecision")} icon="sun"><Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchment, lineHeight: T.line }}>{renderEvt(event.k, event.text, event.p, lang, t, state.player.gender === "kadın")}</Text></OrnatePanel> : null;
  }
  const tema = ikilemTema(d.id, d.icon);
  const rtl = lang === "ar";
  const two = width >= 340 && d.choices.length === 2;
  return <OrnatePanel title={bare ? undefined : t("flow.monthDecision")} icon="sun">
    <View style={{ minHeight: tema ? 112 : 0 }}>
      {tema && <View pointerEvents="none" style={{ position: "absolute", top: -10, bottom: -6, [rtl ? "left" : "right"]: -14, width: "52%", overflow: "hidden" }}>
        <Image accessible={false} source={SAHNE_GORSEL[tema]} resizeMode="cover" style={{ width: "100%", height: "100%", opacity: 0.9 }} />
        <LinearGradient start={{ x: rtl ? 1 : 0, y: 0 }} end={{ x: rtl ? 0 : 1, y: 0 }} colors={["#1A130B", "rgba(26,19,11,0.45)", "rgba(26,19,11,0)"]} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={["rgba(24,18,11,0)", "rgba(20,15,9,0.85)"]} locations={[0.65, 1]} style={StyleSheet.absoluteFill} />
      </View>}
      <Text style={{ fontFamily: F.serif, fontSize: 18, lineHeight: 22, color: C.goldBright, marginBottom: 4, paddingRight: tema && !rtl ? "22%" : 0, paddingLeft: tema && rtl ? "22%" : 0 }}>{text(`dil.${d.id}.t`, d.title)}</Text>
      <Text style={{ fontFamily: F.serif, fontSize: T.bodyLg, lineHeight: T.lineLg, color: C.parchment, paddingRight: tema && !rtl ? "18%" : 0, paddingLeft: tema && rtl ? "18%" : 0, textShadowColor: "rgba(0,0,0,0.8)", textShadowRadius: 4 }}>{text(`dil.${d.id}.x`, d.text)}</Text>
    </View>
    <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 9, marginTop: 14 }}>
      {d.choices.map((choice, index) => {
        const label = text(`dil.${d.id}.c${index}`, choice.label);
        const lead = etkiler(choice).sort((a, b) => Number(b.big) - Number(a.big))[0]; // seçeneğin en büyük etkisi ikon olur
        return <PressableScale key={index} accessibilityLabel={label} haptic="selection" onPress={() => apply(s => chooseMonthDilemma(s, m.id, index))}
          style={{ flexGrow: 1, flexBasis: two ? "45%" : "100%", minHeight: 64, borderRadius: 6, borderWidth: 1, borderColor: C.borderHi, overflow: "hidden" }}>
          <LinearGradient colors={["#2C2114", "#1E160D"]} style={{ flexGrow: 1, flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 9, paddingVertical: 10, paddingHorizontal: 11 }}>
            <View pointerEvents="none" style={{ position: "absolute", top: 2, left: 2, right: 2, bottom: 2, borderWidth: 1, borderColor: "rgba(221,180,90,0.14)", borderRadius: 4 }} />
            {lead ? <GameIcon name={ETKI[lead.k].icon} size={30} color={C.goldBright} /> : <View style={{ width: 8, height: 8, backgroundColor: C.gold, transform: [{ rotate: "45deg" }] }} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontFamily: F.serif, fontSize: 17, lineHeight: 21, color: "#F6EAD0" }}>{label}</Text>
              {/* Alt satır (mockup "Şan kazan, risk al"): yön söylemeden neyin kıpırdayacağı yazıyla */}
              {etkiler(choice).length > 0 && <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 17, color: C.parchmentDim, marginTop: 1 }}>{etkiler(choice).map((x) => t(ETKI_LABEL[x.k] || x.k)).join(" · ")}</Text>}
              {choice.sans !== undefined && <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchmentMuted, marginTop: 4 }}>{applyParams(t("ahi.odds"), [choice.sans])}</Text>}
            </View>
          </LinearGradient>
        </PressableScale>;
      })}
    </View>
  </OrnatePanel>;
}
