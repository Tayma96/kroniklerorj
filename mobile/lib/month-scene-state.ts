import type { Dilemma } from "./events";
import type { GameState, Opportunity } from "./game";
export interface MonthScene {
  id: string; turn: number; generation: number; kind: "senlik" | "ikilem" | "orta" | "firsat" | "kapi" | "bos"; done: boolean;
  dilemma?: Omit<Dilemma, "when">; opp?: Opportunity;
  stage?: "intro" | "play" | "result"; success?: boolean;
}
export function pendingMonthScene(s: GameState): MonthScene | undefined {
  const m = s.monthScene;
  return !s.mpRealm && !s.player.dead && !(s.player.jail && s.player.jail.left > 0) && m && !m.done && m.turn === s.turn && m.generation === (s.player.generation || 1) && (m.dilemma || m.opp) ? m : undefined;
}
// Kayıt bozulduysa karar üretme veya ödül uydurma; yalnız güvenli veriyi geri yükle.
export function repairMonthScene(raw: unknown, s: GameState): MonthScene | undefined {
  if (!raw || typeof raw !== "object" || s.mpRealm || s.player.dead) return undefined;
  const m = raw as MonthScene;
  if (m.turn !== s.turn || m.generation !== (s.player.generation || 1) || m.id !== `month:${m.generation}:${m.turn}` || !["senlik", "ikilem", "orta", "firsat", "kapi", "bos"].includes(m.kind) || typeof m.done !== "boolean") return undefined;
  const base: MonthScene = { id: m.id, turn: m.turn, generation: m.generation, kind: m.kind, done: m.done };
  if (m.done) return base;
  const text = (v: unknown) => typeof v === "string" && v.length <= 8000;
  const delta = (v: unknown): boolean => !!v && typeof v === "object" && !Array.isArray(v) && Object.entries(v).every(([k, val]) => k === "nam" ? !!val && typeof val === "object" && Object.values(val).every(Number.isFinite) : ["addItem", "veraset"].includes(k) ? text(val) : k === "marry" ? typeof val === "boolean" : typeof val === "number" && Number.isFinite(val));
  if (["senlik", "ikilem", "orta"].includes(m.kind)) {
    const d = m.dilemma;
    if (!d || ![d.id, d.title, d.text, d.icon].every(text) || !Array.isArray(d.choices) || d.choices.length < 2 || d.choices.length > 8 || !d.choices.every(c => c && text(c.label) && text(c.result) && delta(c.delta) && (c.gercek === undefined || delta(c.gercek)) && (c.rk === undefined || text(c.rk)) && (c.sans === undefined || Number.isFinite(c.sans) && c.sans >= 0 && c.sans <= 100))) return undefined;
    base.dilemma = { id: d.id, title: d.title, text: d.text, icon: d.icon, ...(text(d.not) ? { not: d.not } : {}), choices: d.choices.map(c => ({ label: c.label, result: c.result, delta: c.delta, ...(c.gercek ? { gercek: c.gercek } : {}), ...(c.rk ? { rk: c.rk } : {}), ...(c.sans !== undefined ? { sans: c.sans } : {}) })) };
    return base;
  }
  if (m.kind === "firsat") {
    const o = m.opp;
    if (!o || ![o.id, o.key, o.title, o.desc].every(text) || !["strength", "intelligence", "charisma", "stamina"].includes(o.stat) || !Number.isFinite(o.reward) || o.reward < 0 || !Number.isFinite(o.risk) || o.risk < 0 || o.risk > 1 || m.stage !== undefined && !["intro", "play", "result"].includes(m.stage) || m.stage === "result" && typeof m.success !== "boolean") return undefined;
    return { ...base, opp: { id: o.id, key: o.key, title: o.title, desc: o.desc, reward: o.reward, risk: o.risk, stat: o.stat, ...(Number.isFinite(o.minAge) ? { minAge: o.minAge } : {}) }, stage: m.stage || "intro", ...(m.stage === "result" ? { success: m.success } : {}) };
  }
  return undefined;
}
