import { DesignPressable as Pressable } from "./design-pressable";
import { View, Text} from "react-native";
import { belirginIzlenim, izlenimSozAnahtari, type IzlenimDefteri } from "./npc-izlenim";
import { useI18n } from "./i18n";
import { GameIcon } from "./icons";
import { C, F } from "./theme";

export function NpcIzlenimi({ def, used, onPress }: { def?: IzlenimDefteri; used: boolean; onPress: () => void }) {
  const { t, lang } = useI18n(), imprint = belirginIzlenim(def);
  if (!imprint) return null;
  return <View style={{ backgroundColor: C.card, borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, padding: 12, marginBottom: 10 }}>
    <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", gap: 7, marginBottom: 6 }}>
      <GameIcon name="scroll" size={14} color={imprint.yuk > 0 ? C.sage : C.ember} />
      <Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, color: C.gold }}>{t("izlenim.title")}</Text>
    </View>
    <Text style={{ fontFamily: F.serifItalic, fontSize: 15, lineHeight: 22, color: C.parchmentDim }}>{t(izlenimSozAnahtari(imprint))}</Text>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchmentMuted, marginTop: 5 }}>{t("izlenim.hint")}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={t("mind.recall.action")} accessibilityState={{ disabled: used }} disabled={used} onPress={onPress} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, marginTop: 8, opacity: used ? .5 : 1 }}>
      <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.gold }}>{t(used ? "mind.recall.done" : "mind.recall.action")}</Text>
    </Pressable>
  </View>;
}
