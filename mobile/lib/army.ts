// Ordu ölçeği: kişisel başarı bütün meydan muharebesinin sonucu değildir.
import { nextRandom } from "./random";

export interface Army {
  troops: number;
  initial: number;
  morale: number;
  supplies: number;
  wounded?: number;
  evacuated?: number;
}
export type FrontMove = "hold" | "advance" | "rescue";
export type EnemyOrder = "charge" | "arrows" | "press";
export interface ArmyWar {
  id: string;
  attacker: string;
  defender: string;
  started: number;
  lastTick: number;
  month: number;
  goal?: "raid" | "conquest";
  peace?: boolean;
  commandTurn?: number;
  a: Army;
  b: Army;
  winner?: "a" | "b";
  ended?: number;
  service?: {
    side: "a" | "b";
    generation: number;
    joined: number;
    actionTurn?: number;
    rounds: number;
    enemy: EnemyOrder;
    last?: { move: FrontMove; hurt: number; morale: number; saved: number };
  };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export function armyStrength(a: Army): number {
  return a.troops * (0.3 + a.morale / 125) * (0.45 + a.supplies / 180);
}
export function armyForecast(w: ArmyWar, side: "a" | "b" = "a"): number {
  const mine = armyStrength(w[side]), theirs = armyStrength(w[side === "a" ? "b" : "a"]);
  return mine + theirs > 0 ? mine / (mine + theirs) : 0.5;
}
export function makeArmy(troops: number, supplies = 80): Army {
  const n = Math.round(clamp(troops, 100, 5000));
  return { troops: n, initial: n, morale: 70, supplies, wounded: 0, evacuated: 0 };
}
export function nextEnemy(rng: { rng_state?: number }): EnemyOrder {
  return (["charge", "arrows", "press"] as const)[Math.floor(nextRandom(rng) * 3)];
}

// İki taraf da aynı başlangıç durumundan hasar verir. Birlik, moral ve ikmal gerçektir;
// düşen moral kaçışı, erzak yokluğu zayiatı artırır. Rastgelelik kayıt içinde ilerler.
export function clashArmies(w: ArmyWar, rng: { rng_state?: number }, turn: number): void {
  if (w.winner || w.lastTick >= turn) return;
  const aPower = armyStrength(w.a), bPower = armyStrength(w.b);
  const lossA = Math.min(w.a.troops, Math.round((35 + bPower * 0.11) * (0.8 + nextRandom(rng) * 0.4)));
  const lossB = Math.min(w.b.troops, Math.round((35 + aPower * 0.11) * (0.8 + nextRandom(rng) * 0.4)));
  w.a.troops -= lossA; w.b.troops -= lossB;
  for (const [army, loss] of [[w.a, lossA], [w.b, lossB]] as const) {
    army.wounded = (army.wounded || 0) + Math.round(loss * 0.6);
    army.supplies = clamp(army.supplies - 18);
    army.morale = clamp(army.morale - Math.round(loss / army.initial * 100) - (army.supplies < 25 ? 10 : 2));
  }
  w.month++; w.lastTick = turn;
  const routedA = w.a.morale <= 20 || w.a.troops <= w.a.initial * 0.35;
  const routedB = w.b.morale <= 20 || w.b.troops <= w.b.initial * 0.35;
  if (routedA || routedB || w.month >= 3) {
    // Eşitlikte savunan mevziyi korur; iki ordu da yok olmuşsa hücum fetih sayılmaz.
    w.winner = routedA && !routedB ? "b" : routedB && !routedA ? "a" : armyStrength(w.a) > armyStrength(w.b) ? "a" : "b";
    w.ended = turn;
  }
}

// Asker yalnız kendi manga görevine karar verir: bütün orduya emir vermez.
// Katkı üç temasla ve ayda bir görevle sınırlı; şahsi can anında kayda yazılır.
export function frontContact(w: ArmyWar, rng: { rng_state?: number }, move: FrontMove, protection: number, skill: number): { hurt: number; morale: number; saved: number } {
  const duty = w.service!;
  const mine = w[duty.side], enemy = w[duty.side === "a" ? "b" : "a"];
  const squadLoss = Math.min(mine.troops, move === "hold" ? 1 : duty.enemy === "press" ? 4 : 3);
  mine.troops -= squadLoss;
  mine.wounded = (mine.wounded || 0) + squadLoss;
  const roll = nextRandom(rng);
  let hurt: number, morale: number, saved = 0;
  if (move === "hold") {
    hurt = duty.enemy === "arrows" ? 5 : 8;
    morale = duty.enemy === "charge" ? 2 : 1;
    enemy.morale = clamp(enemy.morale - (duty.enemy === "charge" ? 2 : 1));
  } else if (move === "advance") {
    hurt = duty.enemy === "charge" ? 15 : 10;
    const exposed = duty.enemy === "charge";
    morale = exposed ? -2 : 2;
    enemy.troops = Math.max(0, enemy.troops - (exposed ? 2 : 7));
    enemy.morale = clamp(enemy.morale - (exposed ? 0 : 2));
  } else {
    hurt = duty.enemy === "press" ? 11 : 6;
    saved = Math.min(mine.wounded, duty.enemy === "press" ? 2 : 5);
    mine.wounded -= saved;
    mine.evacuated = (mine.evacuated || 0) + saved;
    // Kurtarılanlar savaş dışıdır: doğrudan safa geri eklenmez, moralleri desteklenir.
    morale = duty.enemy === "press" ? 1 : 2;
  }
  hurt = Math.max(2, Math.round(hurt + roll * 3 - clamp(protection, 0, 10) * 0.5 - clamp(skill, 0, 10) * 0.2));
  mine.morale = clamp(mine.morale + morale);
  duty.rounds++;
  duty.last = { move, hurt, morale, saved };
  duty.enemy = nextEnemy(rng);
  return duty.last;
}

// Kaynak dışından gelen kayıt, sonlu ve sınırlı sayılarla kullanılabilir olmalı.
export function repairArmyWar(raw: unknown, ids: readonly string[], turn: number): ArmyWar | null {
  if (!raw || typeof raw !== "object") return null;
  const w = raw as ArmyWar;
  if (typeof w.id !== "string" || !ids.includes(w.attacker) || !ids.includes(w.defender) || w.attacker === w.defender ||
      !Number.isFinite(w.started) || w.started > turn || !Number.isFinite(w.lastTick) || w.lastTick > turn ||
      !Number.isFinite(w.month) || w.winner !== undefined && !["a", "b"].includes(w.winner)) return null;
  for (const army of [w.a, w.b]) {
    if (!army || ![army.troops, army.initial, army.morale, army.supplies].every(Number.isFinite)) return null;
    army.initial = Math.round(clamp(army.initial, 100, 5000));
    army.troops = Math.round(clamp(army.troops, 0, army.initial));
    army.morale = clamp(army.morale); army.supplies = clamp(army.supplies);
    army.wounded = Number.isFinite(army.wounded) ? Math.round(clamp(army.wounded!, 0, army.initial - army.troops)) : 0;
    army.evacuated = Number.isFinite(army.evacuated) ? Math.round(clamp(army.evacuated!, 0, army.initial - army.troops - army.wounded)) : 0;
  }
  w.month = Math.floor(clamp(w.month, 0, 3));
  if (w.goal !== undefined && !["raid", "conquest"].includes(w.goal)) delete w.goal;
  if (w.peace !== undefined) w.peace = w.peace === true;
  if (w.commandTurn !== undefined && (!Number.isFinite(w.commandTurn) || w.commandTurn > turn)) delete w.commandTurn;
  if (w.winner && (!Number.isFinite(w.ended) || w.ended! > turn)) w.ended = turn;
  const d = w.service;
  if (d) {
    if (!["a", "b"].includes(d.side) || !Number.isFinite(d.generation) || !Number.isFinite(d.joined) || d.joined > turn) delete w.service;
    else {
      d.rounds = Number.isFinite(d.rounds) ? Math.floor(clamp(d.rounds, 0, 3)) : 3;
      if (d.actionTurn !== undefined && (!Number.isFinite(d.actionTurn) || d.actionTurn > turn)) { delete d.actionTurn; d.rounds = 3; }
      if (!["charge", "arrows", "press"].includes(d.enemy)) d.enemy = "press";
      if (d.last && (!["hold", "advance", "rescue"].includes(d.last.move) || ![d.last.hurt, d.last.morale, d.last.saved].every(Number.isFinite))) delete d.last;
    }
  }
  return w;
}
