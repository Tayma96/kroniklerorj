import { View, Text } from "react-native";
import { useGame } from "./store";
import { useI18n, applyParams, yuzdeL } from "./i18n";
import { cityEconomy } from "./game";
import { C, F } from "./theme";
export function NpcEconomyCard() {
  const { state } = useGame(), { t, lang } = useI18n();
  if (!state || state.mpRealm) return null;
  const e = cityEconomy(state, state.player.location_name);
  const body = { fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchmentMuted, marginTop: 6 };
  return <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 5, padding: 13, marginBottom: 12 }}>
    <Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{t("dp.npc.title")}</Text>
    <Text style={body}>{applyParams(t("dp.npc.numbers"), [e.residents, Math.round(e.mouths * 10) / 10, Math.round(e.productive * 10) / 10])}</Text>
    <Text style={body}>{applyParams(t("dp.npc.services"), [e.services.trade, e.services.care, e.services.security, e.services.culture].map(n => yuzdeL(Math.round(n * 100), lang)))}</Text>
    <Text style={body}>{t("dp.npc.hint")}</Text>
  </View>;
}
