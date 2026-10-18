import { View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { GameState } from "./game";
import type { NPC } from "./world";
import { npcVisual, NpcVisualRole } from "./npc-visual";
import { moodKey } from "./dialogue";
import { npcPortreFrame } from "./npc-portre";
import { SAHNE_GORSEL, SahneTema } from "./sahne-tema";
import { Portre } from "./ui";
import { useSadeMod } from "./use-sade-mod";
import { C } from "./theme";
const COSTUMES = [require("../assets/npc/meslek/uretim-hukumdar-v1.png"), require("../assets/npc/meslek/hizmet-v1.png"), require("../assets/npc/meslek/kir-v1.png"), require("../assets/npc/meslek/kasaba-v1.png")];
const PLACES: Record<NpcVisualRole, SahneTema> = { farmer: "hasat", smith: "atolye_demirci", ruler: "kadi_divan", merchant: "ev_varlikli", healer: "medrese", soldier: "kadi_divan", fisher: "nehir", hunter: "gurbet_yol", shepherd: "hasat", baker: "ev_yoksul", musician: "ahi_tekke", commoner: "cami_avlu" };
// Yüz ailesi/yaş ayrı kalır; değişen meslek ve ruh hâli yalnız gövde/ortam seçer.
export function NpcSceneArt({ state, npc, mood = 0, dead = false }: { state: GameState; npc: NPC; mood?: number; dead?: boolean }) {
  const reduced = useSadeMod(), visual = npcVisual(state, npc, dead ? "notr" : moodKey(mood));
  const frame = npcPortreFrame(npc.age, npc.gender, npc.id), tone = dead ? C.parchmentMuted : visual.row === 1 ? C.sage : visual.row === 2 ? C.ember : C.gold;
  const width = 252, height = 168;
  return <View accessible={false} style={{ height: 220, overflow: "hidden", borderRadius: 12, backgroundColor: C.bg, marginBottom: 12, opacity: dead ? 0.6 : 1, borderWidth: 1, borderColor: tone + "55" }}>
    {!reduced && <Image accessible={false} source={SAHNE_GORSEL[PLACES[visual.role]]} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: 0.42 }]} />}
    <LinearGradient pointerEvents="none" colors={[C.bg + "18", C.bg + "55", C.bg + "F5"]} style={StyleSheet.absoluteFill} />
    <View style={{ width, height: 220, alignSelf: "center" }}>
      {visual.costume && frame ? <>
        <View style={{ position: "absolute", top: 6, left: 78, width: 96, height: 100, overflow: "hidden", borderRadius: 46, backgroundColor: C.card, borderWidth: 1, borderColor: tone + "88" }}>
          <Image accessible={false} source={frame.source} style={{ position: "absolute", width: 307.2, height: 172.8, left: -105.6, top: -32.6 }} resizeMode="stretch" />
        </View>
        <View style={{ position: "absolute", top: 58, width, height, overflow: "hidden" }}>
          <Image accessible={false} source={COSTUMES[visual.atlas]} resizeMode="stretch" style={{ position: "absolute", width: width * 3, height: height * 3, left: -visual.column * width, top: -visual.row * height }} />
        </View>
      </> : <View style={{ alignSelf: "center", paddingTop: 28 }}><Portre age={npc.age} gender={npc.gender} seed={npc.id} size={132} /></View>}
    </View>
  </View>;
}
