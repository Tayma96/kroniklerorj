import type { GameState } from "./game";
import type { NPC } from "./world";
export type NpcVisualRole = "farmer" | "smith" | "ruler" | "merchant" | "healer" | "soldier" | "fisher" | "hunter" | "shepherd" | "baker" | "musician" | "commoner";
const ROLES: Record<string, NpcVisualRole> = { "çiftçi": "farmer", "demirci": "smith", "tüccar": "merchant", "şifacı": "healer", "asker": "soldier", "balıkçı": "fisher", "avcı": "hunter", "çoban": "shepherd", "fırıncı": "baker", "müzisyen": "musician", "işsiz": "commoner" };
const CELLS: Record<NpcVisualRole, [number, number]> = { farmer: [0, 0], smith: [0, 1], ruler: [0, 2], merchant: [1, 0], healer: [1, 1], soldier: [1, 2], fisher: [2, 0], hunter: [2, 1], shepherd: [2, 2], baker: [3, 0], musician: [3, 1], commoner: [3, 2] };
export function npcVisual(s: GameState, npc: NPC, mood = "notr") {
  const controlled = s.player.crowned ? [s.player.crownSeat, ...(s.player.crownConquests || [])] : [];
  const ruler = Object.entries(s.diplomacy?.rulers || {}).some(([realm, r]) => r.personId === npc.id && !controlled.includes(realm));
  const role: NpcVisualRole = ruler ? "ruler" : ROLES[npc.profession] || "commoner";
  const [atlas, column] = CELLS[role];
  const row = ["sicak", "neseli"].includes(mood) ? 1 : ["soguk", "kus"].includes(mood) ? 2 : 0;
  return { role, ruler, atlas, column, row, costume: npc.age >= 18 };
}
