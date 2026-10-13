import { huyOf, OYUNCU } from "./nufus";
import type { Nufus } from "./nufus";

export interface RumorHearing {
  id: string; turn: number; chain: string[]; certainty: number; distortion: number; retelling?: number;
  evidence?: "katilim" | "gorgu" | "duyum" | "eski";
  sessiz?: boolean; // kişi sözü aktarmaz; duyduğu veya gördüğü unutulmaz
  aciklama?: { id: string; turn: number; hops?: number }; // açıklamayı yapan gerçek görgü sahibi ve bu kişinin duyduğu ay
}
export const RUMOR_LIMITS = { people: 48, hops: 3, deliveries: 8, attempts: 24 } as const;
export type RumorGraph = Record<string, string[]>;

// Yaşayan, konuşma yaşındaki kişilerin bugünkü çevresi. Uzak bağ aynı ay haber taşımaz.
export function rumorGraph(pop: Nufus, years: number): RumorGraph {
  const graph: RumorGraph = {}, towns: Record<string, string[]> = {}, jobs: Record<string, string[]> = {};
  for (const k of Object.values(pop.k)) if (k.id !== OYUNCU && k.ol == null && years - k.dy >= 13) {
    graph[k.id] = []; (towns[k.loc] ||= []).push(k.id); (jobs[k.loc + "|" + k.prof] ||= []).push(k.id);
  }
  const link = (a: string, b?: string) => {
    if (!b || !graph[a] || !graph[b] || a === b || pop.k[a].loc !== pop.k[b].loc) return;
    if (!graph[a].includes(b)) graph[a].push(b);
    if (!graph[b].includes(a)) graph[b].push(a);
  };
  for (const id of Object.keys(graph)) {
    const k = pop.k[id];
    for (const other of [k.es, k.baba, k.anne, ...(k.cocuk || []), ...(k.dost || []), ...(k.hasim || [])]) link(id, other);
  }
  // Aynı çarşı/iş çevresinin seyrek halkaları: tüm kasabayı tam bağlı yapma.
  for (const group of [...Object.values(towns), ...Object.values(jobs)]) {
    group.sort(); for (let i = 0; i < group.length; i++) link(group[i], group[(i + 1) % group.length]);
  }
  return graph;
}

export function rumorOrigin(id: string, turn: number): RumorHearing[] {
  return [{ id, turn, chain: [id], certainty: 1, distortion: 1, retelling: 0 }];
}

// Ayın başındaki duyumlar konuşur; bu ay duyan ancak sonraki ay aktarabilir.
// Aynı kişi ikinci kez eklenmez. Okuma ve konuşma, yayılım zarını ilerletmez.
export function spreadRumor(heard: RumorHearing[], graph: RumorGraph, pop: Nufus, turn: number, random: () => number, variants = 1): RumorHearing[] {
  const out = heard.slice(0, RUMOR_LIMITS.people), known = new Set(out.map(h => h.id));
  let attempts = 0, deliveries = 0;
  // Açıklama yeni bir söylenti listesi yaratmaz: mevcut duyumlar aynı bütçede düzeltilir.
  for (const h of heard) if (h.aciklama && !h.sessiz && (h.aciklama.hops || 0) < RUMOR_LIMITS.hops && h.aciklama.turn < turn && graph[h.id]) {
    for (const id of graph[h.id]) {
      const index = out.findIndex(x => x.id === id), receiver = out[index];
      if (!receiver || receiver.aciklama || receiver.chain.length === 1 || receiver.evidence === "gorgu" || receiver.evidence === "katilim") continue;
      if (attempts >= RUMOR_LIMITS.attempts || deliveries >= RUMOR_LIMITS.deliveries) return out;
      attempts++; if (random() >= .65) continue;
      out[index] = { ...receiver, distortion: 1, retelling: 0, aciklama: { id: h.aciklama.id, turn, hops: (h.aciklama.hops || 0) + 1 } }; deliveries++;
    }
  }
  for (const h of [...heard].sort((a, b) => b.turn - a.turn)) {
    if (h.sessiz || h.turn >= turn || h.chain.length - 1 >= RUMOR_LIMITS.hops || !graph[h.id] || (h.aciklama && (h.aciklama.turn >= turn || (h.aciklama.hops || 0) >= RUMOR_LIMITS.hops))) continue;
    const current = out.find(x => x.id === h.id);
    if (current?.aciklama && !h.aciklama) continue; // bu ay açıklamayı öğrenen eski abartıyı aynı turda yeniden taşımaz
    const trait = huyOf(pop.k[h.id]);
    const careful = ["mert", "dindar", "ciddi", "sabırlı"].includes(trait);
    const dramatic = ["kurnaz", "hırslı", "kibirli", "aceleci"].includes(trait);
    let sent = 0;
    for (const id of graph[h.id]) {
      if (known.has(id) || h.chain.includes(id)) continue;
      if (attempts >= RUMOR_LIMITS.attempts || deliveries >= RUMOR_LIMITS.deliveries || out.length >= RUMOR_LIMITS.people) return out;
      attempts++;
      if (random() >= (careful ? .35 : dramatic ? .65 : .5)) continue;
      out.push({ id, turn, chain: [...h.chain, id], certainty: Math.round(h.certainty * (careful ? .85 : dramatic ? .68 : .78) * 1000) / 1000,
        distortion: h.aciklama ? 1 : Math.min(1.5, Math.round(h.distortion * (dramatic ? 1.12 : 1.03) * 1000) / 1000),
        retelling: h.aciklama ? 0 : Math.min(Math.max(0, variants - 1), (h.retelling || 0) + (dramatic ? 1 : 0)), evidence: "duyum",
        ...(h.aciklama ? { aciklama: { id: h.aciklama.id, turn, hops: (h.aciklama.hops || 0) + 1 } } : {}) });
      known.add(id); deliveries++; if (++sent >= 2) break;
    }
  }
  return out;
}
