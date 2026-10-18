import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { GameState } from "./game";
import type { NPC } from "./world";
import { npcVisual } from "./npc-visual";
import { moodKey } from "./dialogue";
import { SAHNE_GORSEL, type SahneTema } from "./sahne-tema";
import { Portre } from "./ui";
import { useI18n } from "./i18n";
import { professionNameL, traitL } from "./locale-data";
import { GameIcon } from "./icons";
import { C, F, T } from "./theme";

const PLACES: Record<string, SahneTema> = {
  farmer: "hasat", smith: "atolye_demirci", ruler: "kadi_divan", merchant: "ev_varlikli",
  healer: "medrese", soldier: "kadi_divan", fisher: "nehir", hunter: "gurbet_yol",
  shepherd: "hasat", baker: "ev_yoksul", musician: "ahi_tekke", commoner: "cami_avlu",
};

// Meslek sahnesiyle kimlik portresi ayrı tutulur; meslek atlası portre katmanı olarak kullanılmaz.
export function NpcSceneArt({ state, npc, mood = 0, dead = false, relation = 0, relationLabel }: {
  state: GameState; npc: NPC; mood?: number; dead?: boolean; relation?: number; relationLabel: string;
}) {
  const { t, lang, tg } = useI18n();
  const moodId = moodKey(mood);
  const visual = npcVisual(state, npc, dead ? "notr" : moodId);
  const relationTone = relation >= 20 ? C.sage : relation <= -20 ? C.blood : C.gold;
  const moodTone = ["sicak", "neseli"].includes(moodId) ? C.sage : ["soguk", "kus"].includes(moodId) ? C.azure : C.gold;
  const role = dead ? t("npc.late") : visual.ruler ? tg("visual.ruler", npc.gender === "kadın") : professionNameL(npc.profession, lang, npc.gender === "kadın");
  const relationPct = Math.max(0, Math.min(100, ((relation + 100) / 200) * 100));

  return <View accessible={false} style={{ marginBottom: 12, overflow: "hidden", borderRadius: 14, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.card, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 7, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}>
    <View style={{ height: 222, overflow: "hidden", backgroundColor: C.surface }}>
      <Image accessible={false} source={SAHNE_GORSEL[PLACES[visual.role]]} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(246,211,146,0.07)" }]} />
      <LinearGradient pointerEvents="none" colors={["rgba(13,10,6,0.02)", "rgba(13,10,6,0.03)", "rgba(13,10,6,0.58)"]} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: relationTone + "B8", backgroundColor: "rgba(18,13,8,0.84)" }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: relationTone }} />
        <Text numberOfLines={1} style={{ maxWidth: 150, fontFamily: F.display, fontSize: T.caption, letterSpacing: 0.5, color: relationTone }}>{relationLabel.toUpperCase()}</Text>
      </View>
    </View>

    <View style={{ paddingHorizontal: 12, paddingBottom: 13 }}>
      <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "flex-end", gap: 11, marginTop: -42 }}>
        <View style={{ padding: 3, borderRadius: 48, borderWidth: 1, borderColor: dead ? C.goldDim : moodTone, backgroundColor: C.card, shadowColor: dead ? C.gold : moodTone, shadowOpacity: 0.28, shadowRadius: 6, elevation: 4 }}>
          <Portre age={npc.age} gender={npc.gender} seed={npc.id} size={78} />
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: T.title, lineHeight: 23, color: C.parchment, textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 6 }}>{npc.name}</Text>
          <Text numberOfLines={1} style={{ fontFamily: F.serifItalic, fontSize: T.body, color: C.parchmentMuted, marginTop: 2 }}>{role} · {npc.age} {t("misc.age")}</Text>
        </View>
      </View>

      <View style={{ marginLeft: lang === "ar" ? 0 : 93, marginRight: lang === "ar" ? 93 : 0, marginTop: 8 }}>
        <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 5 }}>
          <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentDim }}>{t("npc.rel")}</Text>
          <Text style={{ fontFamily: F.display, fontSize: T.caption, color: relationTone }}>{relation > 0 ? "+" + relation : relation}</Text>
        </View>
        <View style={{ height: 8, overflow: "hidden", borderRadius: 5, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.bg }}>
          <View style={{ width: `${relationPct}%`, height: "100%", borderRadius: 4, backgroundColor: relationTone, shadowColor: relationTone, shadowOpacity: 0.45, shadowRadius: 4 }} />
        </View>
      </View>

      {!dead && <View style={{ flexDirection: lang === "ar" ? "row-reverse" : "row", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, borderWidth: 1, borderColor: moodTone + "66", backgroundColor: moodTone + "14" }}>
          <GameIcon name="prayer-beads" size={14} color={moodTone} />
          <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: T.caption, color: C.parchmentDim }}>{t("dlg.mood." + moodId)}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.surface }}>
          <GameIcon name="star" size={13} color={C.gold} />
          <Text numberOfLines={1} style={{ maxWidth: 180, fontFamily: F.serif, fontSize: T.caption, color: C.parchmentDim }}>{traitL(npc.trait, lang)}</Text>
        </View>
      </View>}
    </View>
  </View>;
}
