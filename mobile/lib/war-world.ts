import type { ArmyWar } from "./army";

export interface WarRegion {
  damage: number;
  shortage: number;
  insecurity: number;
  displacement: number;
  exhaustion: number;
  manpowerLoss: number;
}
interface FrontStamp { month: number; a: number; b: number; settled: boolean; }
export interface WarWorld {
  regions: Record<string, WarRegion>;
  fronts: Record<string, FrontStamp>;
  lastTurn?: number;
  aidTurn?: number;
  migrationTurn?: number;
}
export type CivilAid = "food" | "rebuild" | "patrol";
const fields = ["damage", "shortage", "insecurity", "displacement", "exhaustion", "manpowerLoss"] as const;
const bounded = (v: number, low = 0, high = 100) => Math.max(low, Math.min(high, v));
const clean = (v: number) => Math.round(bounded(v) * 100) / 100;
export function peacefulRegion(): WarRegion {
  return { damage: 0, shortage: 0, insecurity: 0, displacement: 0, exhaustion: 0, manpowerLoss: 0 };
}
export function warRegion(world: WarWorld | undefined, id: string): WarRegion {
  return world?.regions[id] || peacefulRegion();
}
function region(world: WarWorld, id: string): WarRegion {
  return world.regions[id] || (world.regions[id] = peacefulRegion());
}
export function emptyWarWorld(): WarWorld { return { regions: {}, fronts: {} }; }

// Her muharebenin yalnız yeni zayiatı yazılır. Okuma/render, aynı ay tekrar çağrı ve
// sonucun tekrar yüklenmesi ne hasarı ne barış sonucunu çoğaltır.
export function recordWar(world: WarWorld, war: ArmyWar): boolean {
  const stamp = world.fronts[war.id] || { month: -1, a: war.a.initial, b: war.b.initial, settled: false };
  if (stamp.settled || stamp.month >= war.month && !war.winner) return false;
  const lost = [Math.max(0, stamp.a - war.a.troops) / war.a.initial, Math.max(0, stamp.b - war.b.troops) / war.b.initial];
  for (const [i, id] of [war.attacker, war.defender].entries()) {
    const r = region(world, id);
    const loss = lost[i] * 100;
    // Meydan ve yürüyüş yükü daha çok savunanın toprağında; asker kaybı iki yurda da döner.
    r.manpowerLoss = clean(r.manpowerLoss + loss * 0.55);
    r.exhaustion = clean(r.exhaustion + loss * 0.35 + (stamp.month < 0 ? 2 : 0));
    r.damage = clean(r.damage + loss * (i === 1 ? 0.45 : 0.16));
    r.shortage = clean(r.shortage + loss * 0.35);
    r.insecurity = clean(r.insecurity + loss * (i === 1 ? 0.4 : 0.2));
    r.displacement = clean(r.displacement + loss * (i === 1 ? 0.32 : 0.1));
    if (war.winner) {
      const won = war.winner === (i === 0 ? "a" : "b");
      r.insecurity = clean(r.insecurity + (won ? -2 : 5));
      r.exhaustion = clean(r.exhaustion + (won ? 0 : 3));
    }
  }
  world.fronts[war.id] = { month: war.month, a: war.a.troops, b: war.b.troops, settled: !!war.winner };
  // Sınırlı defter; nesil dahil benzersiz kimlikler geçmiş sonucun yeniden uygulanmasını önler.
  const ids = Object.keys(world.fronts);
  for (const id of ids.slice(0, Math.max(0, ids.length - 16))) if (world.fronts[id].settled) delete world.fronts[id];
  return true;
}

// Savaş dışındaki diyar da göç ve ticaret baskısı alır. Önceki ayın fotoğrafı kullanılır:
// bölge sırasına göre aynı ay içinde zincirleme/üstel yayılma oluşmaz.
export function tickWarWorld(world: WarWorld, fronts: ArmyWar[], turn: number, ids: readonly string[]): boolean {
  if (world.lastTurn !== undefined && world.lastTurn >= turn) return false;
  world.lastTurn = turn;
  const active = new Set(fronts.filter(w => !w.winner).flatMap(w => [w.attacker, w.defender]));
  const previous = Object.fromEntries(ids.map(id => [id, { ...warRegion(world, id) }]));
  for (const id of ids) {
    const r = region(world, id), fighting = active.has(id);
    const external = ids.filter(other => other !== id);
    const incoming = external.reduce((sum, other) => sum + previous[other].displacement, 0) / Math.max(1, external.length);
    const tradeShock = external.reduce((sum, other) => sum + previous[other].shortage, 0) / Math.max(1, external.length);
    r.damage = clean(r.damage - (fighting ? 0 : 0.8));
    r.shortage = clean((fighting ? r.shortage + 1.8 : Math.max(0, r.shortage - 1.6)) + tradeShock * 0.012 + incoming * 0.008);
    r.insecurity = clean(r.insecurity + (fighting ? 1.2 : -1.1));
    r.displacement = clean(r.displacement + (fighting ? r.damage * 0.025 : -0.7));
    r.exhaustion = clean(r.exhaustion + (fighting ? 1.5 : -0.8));
    r.manpowerLoss = clean(r.manpowerLoss - (fighting ? 0 : 0.35));
  }
  return true;
}

export function warEffects(r: WarRegion, mobilized = false) {
  return {
    prosperity: -(r.damage * 0.3 + r.shortage * 0.1 + r.displacement * 0.08),
    security: -(r.insecurity * 0.35 + r.displacement * 0.1),
    production: bounded(1 - r.damage * 0.004 - r.manpowerLoss * 0.003 - (mobilized ? 0.1 : 0), 0.35, 1),
    foodDemand: 1 + r.shortage * 0.007 + r.displacement * 0.003 + (mobilized ? 0.12 : 0),
    transport: 1 + r.insecurity * 0.0015,
    revenue: bounded(1 - r.damage * 0.005 - r.displacement * 0.0025 - r.exhaustion * 0.0015, 0.25, 1),
    recruitment: bounded(1 - r.manpowerLoss * 0.006 - r.exhaustion * 0.003, 0.25, 1),
    roadRisk: Math.min(0.14, (r.insecurity + r.displacement * 0.4) / 700),
    unrest: r.exhaustion * 0.16 + r.shortage * 0.1 + r.displacement * 0.08,
  };
}
export function aidNeeded(r: WarRegion, kind: CivilAid): boolean {
  return kind === "food" ? r.shortage >= 4 || r.displacement >= 4
    : kind === "rebuild" ? r.damage >= 4 : r.insecurity >= 4;
}
export function applyCivilAid(world: WarWorld, id: string, kind: CivilAid, turn: number): boolean {
  const r = region(world, id);
  if (world.aidTurn === turn || !aidNeeded(r, kind)) return false;
  world.aidTurn = turn;
  if (kind === "food") { r.shortage = clean(r.shortage - 9); r.displacement = clean(r.displacement - 3); }
  else if (kind === "rebuild") { r.damage = clean(r.damage - 7); r.exhaustion = clean(r.exhaustion - 2); }
  else r.insecurity = clean(r.insecurity - 8);
  return true;
}
export function repairWarWorld(raw: unknown, ids: readonly string[], turn: number): WarWorld {
  const result = emptyWarWorld();
  if (!raw || typeof raw !== "object") return result;
  const input = raw as WarWorld;
  if (input.regions && typeof input.regions === "object") for (const id of ids) {
    const r = input.regions[id]; if (!r || typeof r !== "object") continue;
    result.regions[id] = peacefulRegion();
    for (const field of fields) result.regions[id][field] = Number.isFinite(r[field]) ? clean(r[field]) : 0;
  }
  if (input.fronts && typeof input.fronts === "object") for (const [id, stamp] of Object.entries(input.fronts).slice(-16)) {
    if (stamp && [stamp.month, stamp.a, stamp.b].every(Number.isFinite)) result.fronts[id] = {
      month: bounded(Math.floor(stamp.month), -1, 3), a: bounded(stamp.a, 0, 5000), b: bounded(stamp.b, 0, 5000), settled: stamp.settled === true,
    };
  }
  for (const key of ["lastTurn", "aidTurn", "migrationTurn"] as const) if (Number.isFinite(input[key]) && input[key]! <= turn) result[key] = Math.floor(input[key]!);
  return result;
}
