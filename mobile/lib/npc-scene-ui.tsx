import { View, Text, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { GameState } from "./game";
import type { NPC } from "./world";
import { npcVisual } from "./npc-visual";
import { moodKey } from "./dialogue";
import { SAHNE_GORSEL, type SahneTema } from "./sahne-tema";
import { Portre } from "./ui";
import { npcPortreFrame } from "./npc-portre";
import { useI18n } from "./i18n";
import { professionNameL, traitL } from "./locale-data";
import { GameIcon } from "./icons";
import { C, F, T } from "./theme";

const PLACES: Record<string, SahneTema> = {
  farmer: "hasat", smith: "atolye_demirci", ruler: "kadi_divan", merchant: "ev_varlikli",
  healer: "medrese", soldier: "kadi_divan", fisher: "nehir", hunter: "gurbet_yol",
  shepherd: "hasat", baker: "ev_yoksul", musician: "ahi_tekke", commoner: "cami_avlu",
};

const ROLE_ICON: Record<string, string> = {
  farmer: "wheat", smith: "anvil", ruler: "crown", merchant: "coins", healer: "herbs", soldier: "shield",
  fisher: "fishing", hunter: "bow", shepherd: "sheep", baker: "bread", musician: "lyre", commoner: "walk",
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

  // Yetişkinin kendi sinematik portresi sahne olur (mockup: kişi kendi ortamında); başka bir kişinin göründüğü
  // meslek resmi kimliği bozar. Çocuk/ergen atlas karesi geniş sahneye uymaz: meslek ortamı + yuvarlak portre kalır.
  const frame = npcPortreFrame(npc.age, npc.gender, npc.id);
  const own = frame && frame.columns === 1 ? frame.source : null;
  const rtl = lang === "ar";
  return <View accessible={false} style={{ marginBottom: 12, marginHorizontal: -14, overflow: "hidden", borderBottomWidth: 1, borderColor: C.goldDim + "88", backgroundColor: C.bg }}>
    <View style={{ height: own ? 300 : 230, overflow: "hidden", backgroundColor: C.surface }}>
      <Image accessible={false} source={own || SAHNE_GORSEL[PLACES[visual.role]]} resizeMode="cover" style={[StyleSheet.absoluteFill, own ? { width: "100%", height: "112%", top: "-2%" } : null, dead ? { opacity: 0.6 } : null]} />
      <LinearGradient pointerEvents="none" colors={["rgba(8,5,2,0.45)", "rgba(8,5,2,0)", "rgba(14,10,6,0.25)", C.bg]} locations={[0, 0.25, 0.62, 1]} style={StyleSheet.absoluteFill} />
      <View style={{ position: "absolute", top: 10, [rtl ? "left" : "right"]: 12, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 6, borderWidth: 1, borderColor: relationTone + "B8", backgroundColor: "rgba(14,10,6,0.82)" }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: relationTone }} />
        <Text numberOfLines={1} style={{ maxWidth: 150, fontFamily: F.display, fontSize: T.caption, letterSpacing: 0.5, color: relationTone }}>{relationLabel.toUpperCase()}</Text>
      </View>
    </View>

    <View style={{ paddingHorizontal: 14, paddingBottom: 12, marginTop: own ? -74 : -46 }}>
      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "flex-end", gap: 12 }}>
        {!own && <View style={{ padding: 3, borderRadius: 50, borderWidth: 1, borderColor: dead ? C.goldDim : C.gold, backgroundColor: C.bg }}>
          <Portre age={npc.age} gender={npc.gender} seed={npc.id} size={84} />
        </View>}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={2} style={{ fontFamily: F.display, fontSize: 26, lineHeight: 32, color: "#F7EBD2", textShadowColor: "rgba(0,0,0,0.9)", textShadowRadius: 8 }}>{npc.name} <Text style={{ fontFamily: F.serif, fontSize: 17, color: C.parchmentDim }}>{npc.age} {t("misc.age")}</Text></Text>
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", flexWrap: "wrap", gap: 7, marginTop: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.borderHi, backgroundColor: "rgba(23,17,10,0.88)" }}>
              <GameIcon name={dead ? "tombstone" : ROLE_ICON[visual.role] || "walk"} size={14} color={C.gold} />
              <Text numberOfLines={1} style={{ maxWidth: 160, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{role}</Text>
            </View>
            {!dead && <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: moodTone + "88", backgroundColor: "rgba(23,17,10,0.88)" }}>
              <GameIcon name="prayer-beads" size={14} color={moodTone} />
              <Text numberOfLines={1} style={{ fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{t("dlg.mood." + moodId)}</Text>
            </View>}
            {!dead && <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.borderHi, backgroundColor: "rgba(23,17,10,0.88)" }}>
              <GameIcon name="star" size={13} color={C.gold} />
              <Text numberOfLines={1} style={{ maxWidth: 160, fontFamily: F.serif, fontSize: 14, color: C.parchment }}>{traitL(npc.trait, lang)}</Text>
            </View>}
          </View>
        </View>
      </View>

      <View style={{ flexDirection: rtl ? "row-reverse" : "row", alignItems: "center", gap: 10, marginTop: 12 }}>
        <GameIcon name="iliskiler" size={22} color={relationTone} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: rtl ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 4 }}>
            <Text style={{ fontFamily: F.serif, fontSize: T.body, color: C.parchmentDim }}>{t("npc.rel")}</Text>
            <Text style={{ fontFamily: F.display, fontSize: 13, color: relationTone }}>{relation > 0 ? "+" + relation : relation}</Text>
          </View>
          <View style={{ height: 8, overflow: "hidden", borderRadius: 4, borderWidth: 1, borderColor: C.borderHi, backgroundColor: C.bg }}>
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={[relationTone + "88", relationTone]} style={{ width: `${relationPct}%`, height: "100%" }} />
          </View>
        </View>
      </View>
    </View>
  </View>;
}
