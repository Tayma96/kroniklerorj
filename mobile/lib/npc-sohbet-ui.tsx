import { View, Text, Pressable } from "react-native";
import { GameState, npcKonusmasi, sohbetDevamSatiri, sohbetDestegi } from "./game";
import type { SohbetYanit } from "./npc-sohbet";
import { useI18n, applyParams } from "./i18n";
import { C, F } from "./theme";

export function SohbetDevami({ state, id, onReply }: { state: GameState; id: string; onReply: (answer: SohbetYanit) => void }) {
  const { t, lang } = useI18n(), talk = npcKonusmasi(state, id);
  if (!talk) return null;
  const support = sohbetDestegi(state, id);
  const choices: SohbetYanit[] = talk.adim === 1 ? ["dinle", "sor", "itiraz"] : talk.adim === 2 ? ["destek", "sinir", "kapat"] : [];
  const label = (choice: SohbetYanit) => t(choice === "destek" ? support.key : "sohbet.choice." + choice) + (choice === "destek" && support.cost > 0 ? " · " + applyParams(t("sohbet.cost"), [support.cost], lang) : "");
  return <View testID="npc-sohbet" style={{ backgroundColor: C.cardHi, borderWidth: 1, borderColor: C.borderHi, borderRadius: 12, padding: 12, marginBottom: 10 }}>
    <Text style={{ fontFamily: F.display, fontSize: 10, color: C.gold, marginBottom: 5 }}>{t("sohbet.title")}</Text>
    <Text style={{ fontFamily: F.serif, fontSize: 12, lineHeight: 17, color: C.parchmentMuted, marginBottom: 7 }}>{applyParams(t("sohbet.resume"), [t(talk.konu === "aile" && talk.bag !== "diger" ? "sohbet.topic.aile" : "dlg.intent." + talk.konu)], lang)}</Text>
    {talk.ilk && <Text style={{ fontFamily: F.serifItalic, fontSize: 12, lineHeight: 18, color: C.parchmentMuted, marginBottom: 7 }}>{t("sohbet.player")}: {t("sohbet.choice." + talk.ilk)}</Text>}
    {talk.son && <Text style={{ fontFamily: F.serifItalic, fontSize: 12, lineHeight: 18, color: C.parchmentMuted, marginBottom: 7 }}>{t("sohbet.player")}: {t(talk.son === "destek" ? support.key : "sohbet.choice." + talk.son)}</Text>}
    <Text accessibilityLiveRegion="polite" style={{ fontFamily: F.serif, fontSize: 14, lineHeight: 21, color: C.parchment }}>{sohbetDevamSatiri(state, id, lang)}</Text>
    {choices.map(choice => { const disabled = choice === "destek" && support.disabled; return <Pressable key={choice} testID={"npc-sohbet-" + choice} accessibilityRole="button" accessibilityLabel={label(choice)} accessibilityState={{ disabled }} disabled={disabled} onPress={() => onReply(choice)} style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", paddingVertical: 9, paddingHorizontal: 10, borderWidth: 1, borderColor: C.borderHi, borderRadius: 8, marginTop: 8, opacity: disabled ? .45 : 1, backgroundColor: pressed ? C.card : C.surface })}>
      <Text style={{ fontFamily: F.serif, fontSize: 13, lineHeight: 19, color: C.parchment }}>{label(choice)}{disabled ? " · " + t(support.reason === "money" ? "sohbet.lowMoney" : support.key.startsWith("sohbet.care.") ? support.key + ".used" : "soc.lock.done") : ""}</Text>
    </Pressable>; })}
  </View>;
}
