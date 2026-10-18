export type AccordKind = "ateskes" | "ticaret" | "savunma" | "yardim" | "baris";
export interface RealmRuler { personId: string; reign: number; treasury: number; legitimacy: number; aggression: number; honor: number; }
export interface RealmBond { trust: number; grievance: number; }
export interface RealmAccord { id: string; a: string; b: string; kind: AccordKind; signed: number; until: number; missed?: number; lastWar?: string; }
export interface RealmOffer { id: string; from: string; to: string; kind: AccordKind; until: number; payment: number; counter?: boolean; }
export interface DiplomacyState {
  rulers: Record<string, RealmRuler>;
  relations: Record<string, RealmBond>;
  accords: RealmAccord[];
  offers: RealmOffer[];
  actionTurn?: number;
  lastTurn?: number;
  lastWar?: string;
}
export interface DiplomaticContext {
  ownPower: number; targetPower: number; exhaustion: number; targetExhaustion: number;
  honor: number; activeWar: boolean; need: number;
}
export const ACCORDS: AccordKind[] = ["ateskes", "ticaret", "savunma", "yardim", "baris"];
export const realmPair = (a: string, b: string) => [a, b].sort().join("|");
const clamp = (n: number, low = 0, high = 100) => Math.max(low, Math.min(high, n));
export function emptyDiplomacy(): DiplomacyState { return { rulers: {}, relations: {}, accords: [], offers: [] }; }
export function realmBond(d: DiplomacyState | undefined, a: string, b: string): RealmBond { return d?.relations[realmPair(a, b)] || { trust: 0, grievance: 0 }; }
export function changeBond(d: DiplomacyState, a: string, b: string, trust: number, grievance = 0): void {
  const previous = realmBond(d, a, b);
  d.relations[realmPair(a, b)] = { trust: clamp(previous.trust + trust, -100, 100), grievance: clamp(previous.grievance + grievance) };
}
export function findAccord(d: DiplomacyState | undefined, a: string, b: string, kind: AccordKind | undefined, turn: number): RealmAccord | undefined {
  return d?.accords.find(t => realmPair(t.a, t.b) === realmPair(a, b) && (!kind || t.kind === kind) && t.until > turn);
}
export function quoteAccord(d: DiplomacyState, a: string, b: string, kind: AccordKind, c: DiplomaticContext) {
  const bond = realmBond(d, a, b), ruler = d.rulers[b];
  const ratio = c.ownPower / Math.max(1, c.ownPower + c.targetPower);
  const factors = {
    trust: bond.trust / 400 - bond.grievance / 500,
    honor: (c.honor - 40) / 500 + ((ruler?.honor ?? 50) - 50) / 1000,
    fatigue: (kind === "baris" || kind === "ateskes") ? (c.exhaustion + c.targetExhaustion) / 1000 : 0,
    balance: kind === "baris" ? (ratio - 0.5) * 0.4 : (ratio - 0.5) * 0.12,
    temperament: -((ruler?.aggression ?? 50) - 40) / (kind === "baris" ? 700 : 1200),
  };
  const base = { ateskes: 0.6, ticaret: 0.55, savunma: 0.38, yardim: 0.32, baris: 0.42 }[kind];
  const charity = kind === "yardim" ? c.need / 500 - ((ruler?.treasury ?? 800) < 150 ? 0.3 : 0) : 0;
  const odds = clamp(base + Object.values(factors).reduce((a, b) => a + b, 0) + charity, 0.08, 0.92);
  const reparations = kind === "baris" ? Math.round(Math.max(0, 0.5 - ratio) * 400) : 0;
  const payment = ({ ateskes: 120, ticaret: 180, savunma: 240, yardim: 120, baris: 100 }[kind]) + reparations;
  const eligible = kind === "baris" ? c.activeWar : !c.activeWar && (kind !== "yardim" || c.need >= 8);
  return { odds, payment, duration: kind === "yardim" ? 6 : 12, eligible, factors, reparations };
}
export function signAccord(d: DiplomacyState, a: string, b: string, kind: AccordKind, turn: number, id: string): RealmAccord {
  const agreement: RealmAccord = { id, a, b, kind, signed: turn, until: turn + (kind === "yardim" ? 6 : 12) };
  d.accords = d.accords.filter(t => !(realmPair(t.a, t.b) === realmPair(a, b) && t.kind === kind));
  d.accords.push(agreement); changeBond(d, a, b, kind === "baris" ? 3 : 8, kind === "baris" ? -8 : -2);
  return agreement;
}
export function breakAccords(d: DiplomacyState, a: string, b: string, turn: number): boolean {
  if (!d.accords.some(t => realmPair(t.a, t.b) === realmPair(a, b) && t.until > turn)) return false;
  d.accords = d.accords.filter(t => realmPair(t.a, t.b) !== realmPair(a, b));
  changeBond(d, a, b, -35, 20);
  // Verilen sözün tutulmadığını üçüncü devletler de görür.
  for (const realm of Object.keys(d.rulers)) if (realm !== a && realm !== b) changeBond(d, a, realm, -5, 2);
  return true;
}
export function repairDiplomacy(raw: unknown, ids: readonly string[], turn: number): DiplomacyState {
  const result = emptyDiplomacy(); if (!raw || typeof raw !== "object") return result;
  const input = raw as DiplomacyState;
  for (const id of ids) {
    const r = input.rulers?.[id];
    if (r && typeof r.personId === "string" && r.personId.length <= 100 && Number.isFinite(r.reign)) result.rulers[id] = {
      personId: r.personId, reign: r.reign, treasury: Number.isFinite(r.treasury) ? clamp(r.treasury, 0, 10000) : 800,
      legitimacy: Number.isFinite(r.legitimacy) ? clamp(r.legitimacy) : 60,
      aggression: Number.isFinite(r.aggression) ? clamp(r.aggression) : 50, honor: Number.isFinite(r.honor) ? clamp(r.honor) : 50,
    };
  }
  if (input.relations && typeof input.relations === "object") for (const [key, bond] of Object.entries(input.relations)) {
    const pair = key.split("|");
    if (pair.length === 2 && pair[0] !== pair[1] && pair.every(id => ids.includes(id)) && bond) result.relations[realmPair(pair[0], pair[1])] = {
      trust: Number.isFinite(bond.trust) ? clamp(bond.trust, -100, 100) : 0, grievance: Number.isFinite(bond.grievance) ? clamp(bond.grievance) : 0,
    };
  }
  if (Array.isArray(input.accords)) result.accords = input.accords.filter(t => t && ids.includes(t.a) && ids.includes(t.b) && t.a !== t.b && ACCORDS.includes(t.kind) && typeof t.id === "string" && Number.isFinite(t.signed) && t.signed <= turn && Number.isFinite(t.until) && t.until > turn && t.until <= turn + 12).slice(-32).map(t => ({
    id: t.id, a: t.a, b: t.b, kind: t.kind, signed: t.signed, until: t.until, missed: Math.floor(clamp(Number.isFinite(t.missed) ? t.missed! : 0, 0, 2)), ...(typeof t.lastWar === "string" ? { lastWar: t.lastWar } : {}),
  }));
  if (Array.isArray(input.offers)) result.offers = input.offers.filter(o => o && ids.includes(o.from) && ids.includes(o.to) && o.from !== o.to && ACCORDS.includes(o.kind) && typeof o.id === "string" && Number.isFinite(o.until) && o.until > turn && o.until <= turn + 3 && Number.isFinite(o.payment)).slice(-2).map(o => ({ id: o.id, from: o.from, to: o.to, kind: o.kind, until: o.until, payment: clamp(o.payment, 0, 1000), counter: o.counter === true }));
  for (const key of ["lastTurn", "actionTurn"] as const) if (Number.isFinite(input[key]) && input[key]! <= turn) result[key] = input[key];
  if (typeof input.lastWar === "string") result.lastWar = input.lastWar;
  return result;
}
