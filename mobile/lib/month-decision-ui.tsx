import { View, Text, useWindowDimensions } from "react-native";
import { useGame } from "./store";
import { useI18n, applyParams, renderEvt } from "./i18n";
import { pendingMonthScene, chooseMonthDilemma } from "./month-scene";
import { OrnatePanel } from "./ornament-ui";
import { EtkiIzi } from "./kart3d";
import { C, F, T, L } from "./theme";
import { GameButton } from "./ui";
export function MonthDecisionCard() {
  const { state, apply, mpMode } = useGame(), { t, tg, lang } = useI18n(), { width } = useWindowDimensions();
  if (!state || mpMode || state.player.dead) return null;
  const m = pendingMonthScene(state), d = m?.dilemma;
  const text = (key: string, fallback: string) => { const value = tg(key, state.player.gender === "kadın"); return value === key ? fallback : value; };
  if (!d || !m) {
    const event = [...state.history].reverse().find(e => e.day === state.turn && e.k?.startsWith("dil."));
    return event ? <OrnatePanel title={t("flow.monthDecision")} icon="scroll-open"><Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchment, lineHeight: T.line }}>{renderEvt(event.k, event.text, event.p, lang, t, state.player.gender === "kadın")}</Text></OrnatePanel> : null;
  }
  return <OrnatePanel title={t("flow.monthDecision")} icon={d.icon}>
    <Text style={{ fontFamily: F.display, fontSize: T.label, color: C.gold, marginBottom: 5 }}>{text(`dil.${d.id}.t`, d.title)}</Text>
    <Text style={{ fontFamily: F.serif, fontSize: T.body, lineHeight: T.line, color: C.parchment }}>{text(`dil.${d.id}.x`, d.text)}</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 }}>
      {d.choices.map((choice, index) => <GameButton key={index} variant="choice" accessibilityLabel={text(`dil.${d.id}.c${index}`, choice.label)} haptic="selection" onPress={() => apply(s => chooseMonthDilemma(s, m.id, index))} style={{ flexGrow: 1, flexBasis: width >= 360 && d.choices.length === 2 ? "45%" : "100%" }}>
        <Text style={{ fontFamily: F.display, fontSize: T.label, color: C.parchment }}>{text(`dil.${d.id}.c${index}`, choice.label)}</Text>
        <EtkiIzi c={choice} />
        {choice.sans !== undefined && <Text style={{ fontFamily: F.serif, fontSize: T.caption, color: C.parchmentMuted, marginTop: 6 }}>{applyParams(t("ahi.odds"), [choice.sans])}</Text>}
      </GameButton>)}
    </View>
  </OrnatePanel>;
}
