import { View, Text, Pressable } from "react-native";
import { useGame } from "./store";
import { useI18n, applyParams } from "./i18n";
import { playerArmyWar, canJoinArmy, joinArmy, canServeArmy, serveArmy, DefenseOrder, canCommandDefense, commandDefense, defenseOrderCost } from "./game";
import { FrontMove } from "./army";
import { C, F } from "./theme";

export function ArmyFront() {
  const { state, apply } = useGame();
  const { t } = useI18n();
  if (!state) return null;
  const war = playerArmyWar(state);
  const text = (key: string, params: (string | number)[]) => applyParams(t(key), params);
  const card = { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 14, marginBottom: 14 };
  if (!war) return <View style={card}>
    <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 15 }}>{t("army.title")}</Text>
    <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 12, lineHeight: 19, marginTop: 6 }}>{t(state.mpRealm ? "army.multiplayer" : "army.peace")}</Text>
  </View>;
  const duty = war.service;
  const rounds = duty?.actionTurn === state.turn ? duty.rounds : 0;
  const canAct = canServeArmy(state);
  const joinable = canJoinArmy(state);
  return <View style={card}>
    <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 15 }}>{t("army.title")}</Text>
    <Text style={{ fontFamily: F.serif, color: C.goldDim, fontSize: 13, marginTop: 6 }}>{t("beylik." + war.attacker)} · {t("beylik." + war.defender)}</Text>
    <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 12, lineHeight: 19, marginTop: 6 }}>{t("army.scale")}</Text>
    {(["a", "b"] as const).map(side => {
      const army = war[side];
      return <View key={side} style={{ marginTop: 10 }}>
        <Text style={{ fontFamily: F.display, color: side === "a" ? C.ember : C.azure, fontSize: 12 }}>{t("beylik." + (side === "a" ? war.attacker : war.defender))}</Text>
        <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 12, lineHeight: 19 }}>{text("army.status", [army.troops, Math.round(army.morale), Math.round(side === "a" && state.crownCampaign?.armies === war ? state.crownCampaign.supplies ?? army.supplies : army.supplies)])}</Text>
        {!!((army.wounded || 0) + (army.evacuated || 0)) && <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 11, lineHeight: 17 }}>{text("army.wounded", [army.wounded || 0, army.evacuated || 0])}</Text>}
      </View>;
    })}
    <Text style={{ fontFamily: F.serifItalic, color: C.parchmentMuted, fontSize: 12, lineHeight: 19, marginTop: 10 }}>{war.winner
      ? text("army.result", [t("beylik." + (war.winner === "a" ? war.attacker : war.defender))])
      : text("army.month", [state.player.crowned ? state.crownCampaign?.month ?? war.month : war.month])}</Text>
    {!war.winner && state.player.crowned && war === state.realmArmyWar && <>
      <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 12, lineHeight: 19, marginTop: 8 }}>{t("ww.defense")}</Text>
      {(["ikmal", "siper", "kesif"] as DefenseOrder[]).map(order => <Pressable key={order} disabled={!canCommandDefense(state, order)} onPress={() => apply(s => commandDefense(s, order))} style={{ minHeight: 48, padding: 10, borderWidth: 1, borderColor: C.border, borderRadius: 7, marginTop: 8, justifyContent: "center", opacity: canCommandDefense(state, order) ? 1 : 0.45 }}>
        <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 12 }}>{t("ww.order." + order)} · {text("ww.coins", [defenseOrderCost(state, order)])}</Text>
      </Pressable>)}
    </>}
    {!war.winner && !state.player.crowned && <>
      {!duty ? <>
        <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 12, lineHeight: 19, marginTop: 8 }}>{t("army.eligibility")}</Text>
        <Pressable disabled={!joinable} onPress={() => apply(joinArmy)} style={{ minHeight: 48, justifyContent: "center", borderWidth: 1, borderColor: joinable ? C.goldDim : C.border, borderRadius: 7, paddingHorizontal: 12, marginTop: 8, opacity: joinable ? 1 : 0.5 }}>
          <Text style={{ fontFamily: F.display, fontSize: 12, color: C.parchment }}>{t("army.join")}</Text>
        </Pressable>
      </> : <>
        <Text style={{ fontFamily: F.serif, color: C.goldDim, fontSize: 12, lineHeight: 19, marginTop: 8 }}>{text("army.duty", [rounds])}</Text>
        {canAct && <Text style={{ fontFamily: F.serifItalic, color: C.ember, fontSize: 12, lineHeight: 19, marginTop: 6 }}>{t("army.enemy." + duty.enemy)}</Text>}
        {(["hold", "advance", "rescue"] as FrontMove[]).map(move => <Pressable key={move} disabled={!canAct} onPress={() => apply(s => serveArmy(s, move))} style={{ minHeight: 54, justifyContent: "center", padding: 10, marginTop: 8, borderWidth: 1, borderRadius: 7, borderColor: C.border, opacity: canAct ? 1 : 0.5 }}>
          <Text style={{ fontFamily: F.display, color: C.parchment, fontSize: 12 }}>{t("army.move." + move)}</Text>
          <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 11, lineHeight: 17, marginTop: 3 }}>{t("army.help." + move)}</Text>
        </Pressable>)}
        {!canAct && <Text style={{ fontFamily: F.serif, color: C.parchmentMuted, fontSize: 12, lineHeight: 19, marginTop: 8 }}>{t(rounds >= 3 ? "army.dutyDone" : "army.unfit")}</Text>}
        {duty.last && <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.serifItalic, color: C.parchment, fontSize: 12, lineHeight: 19, marginTop: 8 }}>{text("army.contact", [t("army.move." + duty.last.move), duty.last.hurt, duty.last.morale, duty.last.saved])}</Text>}
      </>}
    </>}
  </View>;
}
