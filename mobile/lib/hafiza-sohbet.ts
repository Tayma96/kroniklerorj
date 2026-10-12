import type { NPC } from "./world";
import type { Memory } from "./npc-mind";
import { tFor, applyParams } from "./i18n";
import type { Lang } from "./locale-data";

export function recollectionGroup(trait: string): "sicak" | "ilkeli" | "cikarci" | "cekingen" {
  if (["dindar", "mert", "ciddi"].includes(trait)) return "ilkeli";
  if (["kurnaz", "hırslı", "kibirli"].includes(trait)) return "cikarci";
  if (["utangaç", "dertli", "yalnız", "sabırlı", "unutkan"].includes(trait)) return "cekingen";
  return "sicak";
}

export function memoryQuote(memory: Pick<Memory, "tur">, lang: Lang = "tr", female = false): string {
  const key = "mem.remember." + memory.tur;
  const feminine = female ? tFor(lang, key + ".f") : key + ".f";
  let quote = feminine !== key + ".f" ? feminine : tFor(lang, key);
  if (quote === key) quote = tFor(lang, "mind.recall.faded");
  return quote;
}

// Kişinin gerçekten taşıdığı anı konuşur; hesap ve metin aynı bellek nesnesinden gelir.
export function recollectionLine(npc: NPC, memory: Memory, turn: number, lang: Lang = "tr", female = false): string {
  const quote = memoryQuote(memory, lang, female);
  const months = Math.max(0, turn - memory.hafta);
  const when = months === 0 ? tFor(lang, "mind.recall.now") : applyParams(tFor(lang, "mind.recall.ago"), [months], lang);
  const tone = tFor(lang, "mind.recall." + (memory.yuk > 0 ? "good." : "bad.") + recollectionGroup(npc.trait));
  return applyParams(tFor(lang, "mind.recall.line"), [when, tone, quote], lang);
}
