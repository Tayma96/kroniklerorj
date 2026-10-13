import { View, Text, Pressable } from "react-native";
import { GameState, torunlar } from "./game";
import { Portre } from "./ui";
import { GameIcon } from "./icons";
import { useI18n, applyParams } from "./i18n";
import { C, F } from "./theme";

export function Torunlar({ state, onOpen }: { state: GameState; onOpen: (id: string) => void }) {
  const { t, lang } = useI18n(), people = torunlar(state, lang);
  if (!people.length) return null;
  return <View testID="grandchildren" style={{ marginTop: 11, paddingTop: 11, borderTopWidth: 1, borderTopColor: C.border }}>
    <Text style={{ fontFamily: F.display, fontSize: 11, color: C.gold, marginBottom: 7 }}>{t("torun.title")} · {people.length}</Text>
    {people.map((person, i) => <Pressable key={person.id || "old-" + i} testID={person.id ? "grandchild-" + person.id : "grandchild-legacy-" + i} disabled={!person.id} accessibilityRole={person.id ? "button" : undefined} accessibilityLabel={person.ad + " · " + (person.id ? person.olu ? t("npc.late") : person.yas + " " + t("misc.age") : t("torun.legacy"))} onPress={() => person.id && onOpen(person.id)} style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 7, paddingHorizontal: 8, marginBottom: 5, borderWidth: 1, borderColor: C.border, borderRadius: 8, backgroundColor: pressed ? C.cardHi : C.bg, opacity: person.olu ? .6 : 1 })}>
      {person.id && person.gender && person.yas !== undefined ? <Portre age={person.yas} gender={person.gender} seed={person.id} size={34} ring={false} /> : <GameIcon name="family" size={25} color={C.parchmentMuted} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.serif, fontSize: 13, color: C.parchment }}>{person.ad}{person.id ? " · " + (person.olu ? t("npc.late") : person.yas + " " + t("misc.age")) : ""}</Text>
        <Text style={{ fontFamily: F.serifItalic, fontSize: 11, lineHeight: 16, color: C.parchmentMuted }}>{person.ebeveyn ? applyParams(t("torun.parent"), [person.ebeveyn], lang) : t("torun.legacy")}</Text>
      </View>
    </Pressable>)}
  </View>;
}
