import { DesignPressable as Pressable } from "./design-pressable";
import { View, Text} from "react-native";
import { GameState, aileHaberi, evlatMektubu } from "./game";
import { useI18n, renderEvt } from "./i18n";
import { GameIcon } from "./icons";
import { C, F } from "./theme";

export function AileHaberi({ state, onOpen }: { state: GameState; onOpen: (id: string, q: number) => void }) {
  const { t, lang } = useI18n(), news = aileHaberi(state);
  if (!news) return null;
  const openLabel = t(news.event.k?.startsWith("evlat.died") ? "evlat.news.remember" : "evlat.news.open");
  return <View testID="family-news" style={{ marginHorizontal: 12, marginTop: 8, padding: 12, borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, backgroundColor: C.card }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 5 }}><GameIcon name="family" size={14} color={C.gold} /><Text style={{ fontFamily: F.display, fontSize: 13, color: C.gold }}>{t("evlat.news.title")}</Text></View>
    <Text style={{ fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchment }}>{renderEvt(news.event.k, news.event.text, news.event.p, lang, t, state.player.gender === "kadın")}</Text>
    <Pressable testID="family-news-open" accessibilityRole="button" accessibilityLabel={openLabel} onPress={() => onOpen(news.id, news.event.q!)} style={({ pressed }) => ({ minHeight: 44, marginTop: 8, justifyContent: "center", paddingHorizontal: 10, borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, backgroundColor: pressed ? C.cardHi : C.surface })}>
      <Text style={{ fontFamily: F.serif, fontSize: 15, color: C.gold }}>{openLabel}</Text>
    </Pressable>
  </View>;
}

export function EvlatMektubu({ state, id, onSend }: { state: GameState; id: string; onSend: () => void }) {
  const { t } = useI18n(), status = evlatMektubu(state, id);
  if (!status) return null;
  const disabled = status.pending || status.used;
  const label = t(status.pending ? "evlat.letter.pending" : state.player.child_time_turn === state.turn ? "evlat.letter.used" : status.used ? "evlat.letter.full" : "evlat.letter.send");
  return <Pressable testID="child-letter" accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onSend} style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.borderHi, borderRadius: 5, backgroundColor: pressed ? C.cardHi : C.card, opacity: disabled ? .6 : 1 })}>
    <GameIcon name="scroll" size={17} color={C.gold} /><Text style={{ flex: 1, fontFamily: F.serif, fontSize: 15, lineHeight: 22, color: C.parchment }}>{label}</Text>
  </Pressable>;
}
