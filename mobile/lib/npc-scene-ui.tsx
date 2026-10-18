import { View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { GameState } from "./game";
import type { NPC } from "./world";
import { npcVisual, NpcVisualRole } from "./npc-visual";
import { moodKey } from "./dialogue";
import { SAHNE_GORSEL, SahneTema } from "./sahne-tema";
import { Portre } from "./ui";
import { C } from "./theme";
const PLACES: Record<NpcVisualRole, SahneTema> = { farmer: "hasat", smith: "atolye_demirci", ruler: "kadi_divan", merchant: "ev_varlikli", healer: "medrese", soldier: "kadi_divan", fisher: "nehir", hunter: "gurbet_yol", shepherd: "hasat", baker: "ev_yoksul", musician: "ahi_tekke", commoner: "cami_avlu" };
// Kimlik portresi bütündür. Ayrı yüz/gövde parçaları birleştirilmez.
export function NpcSceneArt({ state, npc, mood = 0, dead = false }: { state: GameState; npc: NPC; mood?: number; dead?: boolean }) {
  const visual = npcVisual(state, npc, dead ? "notr" : moodKey(mood));
  return <View accessible={false} style={{ marginBottom: 8, opacity: dead ? 0.6 : 1 }}>
    <View style={{ height: 210, overflow: "hidden", borderRadius: 4, backgroundColor: C.bg, borderWidth: 1, borderColor: C.goldDim }}>
      <Image accessible={false} source={SAHNE_GORSEL[PLACES[visual.role]]} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <LinearGradient pointerEvents="none" colors={[C.bg + "00", C.bg + "00", C.bg + "AA"]} style={StyleSheet.absoluteFill} />
    </View>
    <View style={{ marginTop: -42, marginLeft: 12 }}><Portre age={npc.age} gender={npc.gender} seed={npc.id} size={90} /></View>
  </View>;
}
