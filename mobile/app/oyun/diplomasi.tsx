import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "../../lib/store";
import { useI18n, applyParams, yuzdeL } from "../../lib/i18n";
import { campaignTargets, regionOf, kisiProfil, realmDiplomacyView, canProposeRealmAccord, proposeRealmAccord, canAnswerRealmOffer, answerRealmOffer, breakRealmAccords, inJail } from "../../lib/game";
import { ACCORDS, AccordKind } from "../../lib/diplomacy";
import { BackLabel, PageHeader, ScreenFresk } from "../../lib/ui";
import { C, F } from "../../lib/theme";

const body = { fontFamily: F.serif, fontSize: 13, lineHeight: 20, color: C.parchmentMuted, marginTop: 7 };
const card = { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 13, marginTop: 12 };
function Action({ label, onPress, enabled = true, danger = false }: { label: string; onPress: () => void; enabled?: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !enabled }} disabled={!enabled} onPress={onPress} style={{ minHeight: 48, justifyContent: "center", borderWidth: 1, borderColor: danger ? C.blood : C.goldDim, borderRadius: 8, padding: 11, marginTop: 9, opacity: enabled ? 1 : 0.45 }}>
    <Text style={{ fontFamily: F.display, fontSize: 12, color: danger ? C.blood : C.gold }}>{label}</Text>
  </Pressable>;
}
export default function Diplomasi() {
  const { state, apply } = useGame(), { t, lang } = useI18n(), router = useRouter(), insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(""), [kind, setKind] = useState<AccordKind>("ateskes");
  const [message, setMessage] = useState<{ key: string; turn: number; target: string } | null>(null);
  if (!state) return null;
  const p = state.player, available = p.crowned && !state.mpRealm;
  const targets = campaignTargets(state), id = targets.some(x => x.id === selected) ? selected : targets[0]?.id;
  const own = p.crownSeat || regionOf(p.home_name || p.location_name);
  const quote = id ? realmDiplomacyView(state, id, kind) : null;
  const text = (key: string, ...values: (string | number)[]) => applyParams(t(key), values);
  const realm = (key: string) => t("beylik." + key);
  const acted = state.diplomacy?.actionTurn === state.turn || p.crown_action_turn === state.turn || p.dead || inJail(p);
  const offers = state.diplomacy?.offers.filter(o => o.to === own && o.until > state.turn) || [];
  return <ScreenFresk style={{ paddingTop: insets.top }}>
    <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 14 }}><BackLabel /></Pressable>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: insets.bottom + 110 }}>
      <PageHeader kicker={t("scr.hanedan")} title={t("dp.title")} sub={t("dp.intro")} />
      {!available ? <Text style={body}>{t("dp.locked")}</Text> : <>
        {offers.length > 0 && <View style={card}>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.gold }}>{t("dp.inbox")}</Text>
          {offers.map(o => <View key={o.id} style={{ marginTop: 8 }}>
            <Text style={body}>{text("dp.offerTerms", realm(o.from), t("dp.kind." + o.kind), o.payment, o.until - state.turn)}</Text>
            <Text style={body}>{t("dp.term." + o.kind)}</Text>
            {o.kind === "yardim" && <Text style={body}>{text("dp.recipient", realm(o.counter ? own : o.from), realm(o.counter ? o.from : own))}</Text>}
            <Action label={t("dp.accept")} enabled={canAnswerRealmOffer(state, o.id, true)} onPress={() => apply(s => answerRealmOffer(s, o.id, true))} />
            <Action label={t("dp.decline")} enabled={canAnswerRealmOffer(state, o.id, false)} onPress={() => apply(s => answerRealmOffer(s, o.id, false))} />
          </View>)}
        </View>}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
          {targets.map(target => <Pressable key={target.id} accessibilityRole="button" accessibilityState={{ selected: target.id === id }} onPress={() => setSelected(target.id)} style={{ minHeight: 44, justifyContent: "center", padding: 10, borderWidth: 1, borderColor: target.id === id ? C.gold : C.border, borderRadius: 8, maxWidth: "100%" }}>
            <Text style={{ fontFamily: F.display, fontSize: 12, color: target.id === id ? C.gold : C.parchment }}>{realm(target.id)}</Text>
          </Pressable>)}
        </View>
        {quote && id && <>
          <View style={card}>
            <Text style={{ fontFamily: F.display, fontSize: 15, color: C.gold }}>{realm(id)}</Text>
            {quote.ruler && <>
              <Action label={text("dp.ruler", kisiProfil(state, quote.ruler.personId, lang)?.npc.name || realm(id))} onPress={() => router.push({ pathname: "/oyun/npc/[id]", params: { id: quote.ruler!.personId } })} />
              <Text style={body}>{text("dp.court", Math.round(quote.ruler.treasury), Math.round(quote.ruler.legitimacy), quote.ruler.aggression, quote.ruler.honor)}</Text>
              <Text style={body}>{text("dp.bond", Math.round(quote.bond.trust), Math.round(quote.bond.grievance), state.relationships[quote.ruler.personId] || 0)}</Text>
            </>}
            {quote.accords.map(a => <View key={a.id}>
              <Text style={{ ...body, color: C.sage }}>{text("dp.active", t("dp.kind." + a.kind), a.until - state.turn)}</Text>
              {a.kind === "yardim" && <Text style={body}>{text("dp.recipient", realm(a.a), realm(a.b))}</Text>}
            </View>)}
          </View>
          <View style={card}>
            <View style={{ gap: 6 }}>
              {ACCORDS.map(k => <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: k === kind }} onPress={() => setKind(k)} style={{ minHeight: 44, padding: 10, justifyContent: "center", borderWidth: 1, borderColor: k === kind ? C.gold : C.border, borderRadius: 7 }}>
                <Text style={{ fontFamily: F.display, fontSize: 12, color: k === kind ? C.gold : C.parchment }}>{t("dp.kind." + k)}</Text>
              </Pressable>)}
            </View>
            <Text style={body}>{t("dp.term." + kind)}</Text>
            {kind === "yardim" && <Text style={body}>{text("dp.recipient", realm(own), realm(id))}</Text>}
            <Text style={{ ...body, color: C.parchment }}>{text("dp.quote", quote.payment, yuzdeL(Math.round(quote.odds * 100), lang), quote.duration)}</Text>
            <Text style={body}>{text("dp.factors", ...[quote.factors.trust, quote.factors.honor, quote.factors.fatigue, quote.factors.balance, quote.factors.temperament, quote.personal].map(v => `${v > 0 ? "+" : ""}${Math.round(v * 100)}`))}</Text>
            <Text style={body}>{t("dp.costWarning")}</Text>
            <Action label={t("dp.send")} enabled={canProposeRealmAccord(state, id, kind)} onPress={() => apply(s => { const r = proposeRealmAccord(s, id, kind); setMessage({ key: "dp.result." + r.status, turn: s.turn, target: id }); return r.state; })} />
            {!canProposeRealmAccord(state, id, kind) && <Text style={body}>{t("dp.unavailable")}</Text>}
            {message?.turn === state.turn && message.target === id && <Text accessibilityLiveRegion="polite" style={{ ...body, color: C.gold }}>{t(message.key)}</Text>}
          </View>
          {quote.accords.length > 0 && <View style={card}>
            <Text style={body}>{t("dp.breachTerms")}</Text>
            <Action danger label={t("dp.breach")} enabled={!acted} onPress={() => apply(s => breakRealmAccords(s, id))} />
          </View>}
        </>}
      </>}
    </ScrollView>
  </ScreenFresk>;
}
