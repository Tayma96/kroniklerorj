import { View, Text } from "react-native";
import { GameState, npcBakisi } from "./game";
import { BAKIS_KEYS, bakisTavri } from "./npc-bakis";
import { useI18n } from "./i18n";
import { C, F } from "./theme";

export function NpcTavri({ state, id, detailed = false }: { state: GameState; id: string; detailed?: boolean }) {
  const { t, lang } = useI18n(), b = npcBakisi(state, id), stance = bakisTavri(b);
  if (!detailed) return stance === "notr" ? null : <Text style={{ fontFamily: F.serifItalic, fontSize: 12, color: stance === "cekingen" || stance === "suphe" || stance === "kirgin" ? C.parchmentMuted : C.sage, lineHeight: 18, marginTop: 7 }}>{t("bakis.t." + stance)}</Text>;
  return <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border }}>
    <Text style={{ fontFamily: F.display, fontSize: 10, color: C.goldDim, marginBottom: 6 }}>{t("bakis.title")}</Text>
    {BAKIS_KEYS.map(k => <View key={k} style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", gap: 8, paddingVertical: 3 }}>
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 12, color: C.parchmentDim }}>{t("bakis." + k)}</Text>
      <Text style={{ fontFamily: F.display, fontSize: 12, color: k === "korku" || k === "suphe" ? b[k] > 0 ? C.blood : C.parchmentMuted : b[k] < 0 ? C.blood : b[k] > 0 ? C.sage : C.parchmentMuted }}>{b[k] > 0 ? "+" : ""}{b[k]}</Text>
    </View>)}
    <Text style={{ fontFamily: F.serifItalic, fontSize: 11, color: C.parchmentMuted, lineHeight: 17, marginTop: 6 }}>{t("bakis.hint")}</Text>
  </View>;
}
