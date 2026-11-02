// Hayatın kilit anlarında anlatıcı (Kronks): kısa sinematik cümle + altyazı. Plan: docs/ANLATI_ANLAR.md.
// Durumdaki geçişleri izler (evlilik, ilk evlat, ebeveyn ölümü, 13 yaş, ilk meslek, ustalık, şöhret, yerleşim, taç,
// ölüm, vâris); savaş gibi ekran anları anlat() ile gelir. Her an hayat başına bir kez (cihazda kayıtlı).
import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./store";
import { useI18n } from "./i18n";
import { socialTierIndex } from "./game";
import { playNarration, stopNarration } from "./sound";
import { ANLATIM } from "./sinematik/anlatim";
import ANLAR from "./sinematik/anlar.json";
import { C, F } from "./theme";

export type AnId = "basla" | "genclik" | "ilk_is" | "evlilik" | "ilk_evlat" | "ebeveyn_vefat" | "usta" | "sohret" | "yerlesim" | "tac" | "savas" | "olum" | "varis";
const METIN = Object.fromEntries((ANLAR.anlar as { id: string }[]).map((a) => [a.id, a as unknown as Record<string, string>]));
const KEY = "kronikler_anlar_v1";
const GECIKME = 1200, ARA = 800;

// Ekranlardan gelen anlar (ör. savaş): tek dinleyici, katman bağlıyken çalışır.
let dis: ((id: AnId) => void) | null = null;
export function anlat(id: AnId) { dis?.(id); }

let calinan: Set<string> | null = null;
async function calindiMi(k: string): Promise<boolean> {
  if (!calinan) { try { calinan = new Set(JSON.parse((await AsyncStorage.getItem(KEY)) || "[]")); } catch { calinan = new Set(); } }
  if (calinan.has(k)) return true;
  calinan.add(k); AsyncStorage.setItem(KEY, JSON.stringify([...calinan].slice(-400))).catch(() => {});
  return false;
}

export function AnlarKatmani() {
  const { state } = useGame();
  const { lang } = useI18n();
  const insets = useSafeAreaInsets();
  const [altyazi, setAltyazi] = useState<null | { metin: string; tick: number }>(null);
  const kuyruk = useRef<AnId[]>([]);
  const caliyor = useRef(false);
  const dil = useRef(lang); dil.current = lang;
  const kimlik = useRef(""); // tohum:nesil — "bir kez" kaydının anahtarı
  if (state) kimlik.current = `${state.seed}:${state.player.generation || 1}`;

  const siradaki = () => {
    const id = kuyruk.current.shift(); if (!id) { caliyor.current = false; return; }
    caliyor.current = true;
    const L = ["tr", "en", "es", "pt", "ar", "ru"].includes(dil.current) ? dil.current : "tr";
    const parca = `an.${id}.${L}`; const ms = ANLATIM[parca]?.ms ?? 4000;
    setTimeout(() => {
      playNarration(parca);
      setAltyazi({ metin: METIN[id]?.[L] ?? "", tick: Date.now() });
      setTimeout(() => { setAltyazi(null); stopNarration(parca); setTimeout(siradaki, ARA); }, ms + 400);
    }, GECIKME);
  };
  const tetikle = async (id: AnId, ek = "") => {
    if (await calindiMi(`${kimlik.current}:${id}${ek}`)) return;
    kuyruk.current.push(id); if (!caliyor.current) siradaki();
  };
  useEffect(() => { dis = (id) => { void tetikle(id); }; return () => { dis = null; }; }, []);

  // Geçiş izleyici: ilk okumada yalnız kaydeder; nesil değişince (vâris) sıfırlar.
  const once = useRef<null | { gen: number; age: number; prof: string; married: boolean; kids: number; md: boolean; fd: boolean; caps: number; tier: number; settle: number; crowned: boolean; dead: boolean }>(null);
  useEffect(() => {
    if (!state) return;
    const p = state.player; const gen = p.generation || 1;
    const simdi = { gen, age: p.age, prof: p.profession, married: !!p.married, kids: (p.children || []).length, md: !!p.mother_dead, fd: !!p.father_dead,
      caps: (p.capstones || []).length, tier: socialTierIndex(p.fame), settle: (state.settlements || []).length, crowned: !!p.crowned, dead: !!p.dead };
    const o = once.current; once.current = simdi;
    if (!o) { if (state.turn === 0 && gen === 1 && !p.dead) void tetikle("basla"); return; }
    if (gen !== o.gen) { if (gen > o.gen && !p.dead) void tetikle("varis"); return; }
    if (simdi.dead && !o.dead) { void tetikle("olum"); return; }
    if (simdi.age >= 13 && o.age < 13) void tetikle("genclik");
    if (simdi.prof !== "işsiz" && o.prof === "işsiz") void tetikle("ilk_is");
    if (simdi.married && !o.married) void tetikle("evlilik");
    if (simdi.kids >= 1 && o.kids === 0) void tetikle("ilk_evlat");
    if (simdi.md && !o.md) void tetikle("ebeveyn_vefat", ":anne");
    if (simdi.fd && !o.fd) void tetikle("ebeveyn_vefat", ":baba");
    if (simdi.caps > o.caps) void tetikle("usta");
    if (simdi.tier > o.tier) void tetikle("sohret");
    if (simdi.settle > o.settle) void tetikle("yerlesim");
    if (simdi.crowned && !o.crowned) void tetikle("tac");
  }, [state]);

  if (!altyazi) return null;
  const rtl = lang === "ar";
  return <Animated.View key={altyazi.tick} pointerEvents="none" entering={FadeIn.duration(500)} exiting={FadeOut.duration(400)}
    style={{ position: "absolute", left: 18, right: 18, bottom: insets.bottom + 118, alignItems: "center" }}>
    <Text accessibilityLiveRegion="polite" style={{ maxWidth: 520, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, overflow: "hidden", backgroundColor: "rgba(12,8,4,0.86)", borderWidth: 1, borderColor: "rgba(201,162,78,0.45)",
      fontFamily: F.serifItalic, fontSize: 17, lineHeight: 24, color: C.parchment, textAlign: "center", writingDirection: rtl ? "rtl" : "ltr" }}>{altyazi.metin}</Text>
  </Animated.View>;
}
