import { GameState, advance, applyDilemma, resolveOpportunity, gameRandom, gunlukDuzen, duzenYemek, kirilmaSec } from "./game";
import { ayinSahnesi } from "./events";
import { pendingMonthScene, repairMonthScene, MonthScene } from "./month-scene-state";
import { tFor } from "./i18n";
import type { Lang } from "./locale-data";
export { pendingMonthScene } from "./month-scene-state";
export function prepareMonthScene(prev: GameState, since?: number): GameState {
  if (prev.mpRealm || prev.player.dead || prev.turn <= 0 || prev.monthScene?.turn === prev.turn && prev.monthScene.generation === (prev.player.generation || 1)) return prev;
  const work = { ...prev }, rolled = ayinSahnesi(work, since, () => gameRandom(work));
  const generation = prev.player.generation || 1;
  const raw: MonthScene = { id: `month:${generation}:${prev.turn}`, generation, turn: prev.turn, kind: rolled.tur, done: !rolled.dilemma && !rolled.opp && !rolled.kir, ...(rolled.kir ? { kir: { ...rolled.kir } } : {}),
    ...(rolled.dilemma ? { dilemma: JSON.parse(JSON.stringify(rolled.dilemma)) } : {}), ...(rolled.opp ? { opp: { ...rolled.opp }, stage: "intro" } : {}) };
  const s = { ...rolled.s, rng_state: work.rng_state };
  return { ...s, monthScene: repairMonthScene(raw, s) };
}
function finish(s: GameState): GameState {
  const m = s.monthScene!;
  return { ...s, monthScene: { id: m.id, generation: m.generation, turn: m.turn, kind: m.kind, done: true } };
}
export function chooseMonthDilemma(prev: GameState, id: string, index: number): GameState {
  const m = pendingMonthScene(prev), d = m?.dilemma, choice = Number.isInteger(index) ? d?.choices[index] : undefined;
  if (!m || m.id !== id || !d || !choice) return prev;
  const key = choice.rk || `dil.${d.id}.r${index}`, translated = tFor((prev.dil || "tr") as Lang, key);
  const s = finish(applyDilemma(prev, choice.gercek || choice.delta, translated === key ? choice.result : translated, `${d.id}:${index}`, d.id.startsWith("fest_"), key));
  // Gerçekleşen etki (azalan getiri ve zar sonrası): kartın yazdığı değil, oyuncuya gerçekten olan.
  const etki: Record<string, number> = {};
  for (const k of ["money", "reputation", "honor", "fame", "fear", "health", "stat_points"] as const) { const v = Math.round((s.player[k] as number) - (prev.player[k] as number)); if (v) etki[k] = v; }
  return { ...s, monthScene: { ...s.monthScene!, secim: { id: d.id, i: index, label: choice.label, etki } } };
}
// Kader kırılması anında seçim: içerik kayıttan türetilir; geçersiz seçim ya da bayat sahne durumu değiştirmez.
export function chooseMonthKirilma(prev: GameState, id: string, index: number): GameState {
  const m = pendingMonthScene(prev), k = m?.kir;
  if (!m || m.id !== id || !k) return prev;
  const s0 = kirilmaSec(prev, k.tip, index, k.kisi);
  if (s0 === prev) return prev;
  const s = finish(s0), etki: Record<string, number> = {};
  for (const x of ["money", "reputation", "honor", "fame", "fear", "health", "stat_points"] as const) { const v = Math.round((s.player[x] as number) - (prev.player[x] as number)); if (v) etki[x] = v; }
  return { ...s, monthScene: { ...s.monthScene!, secim: { id: "kir." + k.tip, i: index, label: k.tip, etki } } };
}
export function progressMonthOpportunity(prev: GameState, id: string, stage: "play" | "result", success?: boolean): GameState {
  const m = pendingMonthScene(prev);
  if (!m?.opp || m.id !== id || m.stage === "result" || stage === "result" && (m.stage !== "play" || typeof success !== "boolean") || stage === "play" && m.stage === "play") return prev;
  return { ...prev, monthScene: { ...m, stage, ...(stage === "result" ? { success } : {}) } };
}
export function resolveMonthOpportunity(prev: GameState, id: string, pass = false): GameState {
  const m = pendingMonthScene(prev);
  if (!m?.opp || m.id !== id) return prev;
  if (m.stage === "result") return finish(resolveOpportunity(prev, m.opp, m.success));
  return pass ? finish(prev) : prev;
}
// Ara aylardaki kararı atlama; her ay kapanışı ve kartı aynı kayıt nesnesinde hazırlanır.
export function advanceWithMonthScene(prev: GameState, months = 1, stopAtEvent = false): GameState {
  if (prev.mpRealm) return prev;
  let s = prev;
  for (let i = 0; i < Math.min(12, Math.max(0, Math.floor(months))); i++) {
    if (pendingMonthScene(s) || s.player.dead) break;
    s = gunlukDuzen(s); // Hissiyat 4: ayın rutini (çalış, acıkınca ye) ay geçerken kendiliğinden
    const before = s, next = duzenYemek(advance(s, 1)); // yeni ayın sofrası da düzende
    if (next.turn === before.turn) break;
    s = prepareMonthScene(next, before.hseq ?? 0);
    if (pendingMonthScene(s) || s.pendingScene || s.micro || s.saga?.scene || s.player.crowned && s.divan || s.player.tezgah) break; // tezgâh kararı bekliyorsa çok aylık ilerleme durur
    if (stopAtEvent && (s.player.hunger <= 30 || s.player.health <= 40 || s.history.some(e => e.landmark && e.day >= s.turn))) break;
  }
  return s;
}
