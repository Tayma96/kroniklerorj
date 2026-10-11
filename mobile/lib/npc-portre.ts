// Kalıcı kişi kimliği aynı yüzü korur; yaş yalnız aynı kişinin evresini değiştirir.
import type { ImageSourcePropType } from "react-native";

export const NPC_PORTRELER = {
  e01: { genc: require("../assets/npc/e01_genc.jpg"), olgun: require("../assets/npc/e01_olgun.jpg"), yasli: require("../assets/npc/e01_yasli.jpg") },
  e02: { genc: require("../assets/npc/e02_genc.jpg"), olgun: require("../assets/npc/e02_olgun.jpg"), yasli: require("../assets/npc/e02_yasli.jpg") },
  e03: { genc: require("../assets/npc/e03_genc.jpg"), olgun: require("../assets/npc/e03_olgun.jpg"), yasli: require("../assets/npc/e03_yasli.jpg") },
  e04: { genc: require("../assets/npc/e04_genc.jpg"), olgun: require("../assets/npc/e04_olgun.jpg"), yasli: require("../assets/npc/e04_yasli.jpg") },
  e05: { genc: require("../assets/npc/e05_genc.jpg"), olgun: require("../assets/npc/e05_olgun.jpg"), yasli: require("../assets/npc/e05_yasli.jpg") },
  e06: { genc: require("../assets/npc/e06_genc.jpg"), olgun: require("../assets/npc/e06_olgun.jpg"), yasli: require("../assets/npc/e06_yasli.jpg") },
  e07: { genc: require("../assets/npc/e07_genc.jpg"), olgun: require("../assets/npc/e07_olgun.jpg"), yasli: require("../assets/npc/e07_yasli.jpg") },
  e08: { genc: require("../assets/npc/e08_genc.jpg"), olgun: require("../assets/npc/e08_olgun.jpg"), yasli: require("../assets/npc/e08_yasli.jpg") },
  k01: { genc: require("../assets/npc/k01_genc.jpg"), olgun: require("../assets/npc/k01_olgun.jpg"), yasli: require("../assets/npc/k01_yasli.jpg") },
  k02: { genc: require("../assets/npc/k02_genc.jpg"), olgun: require("../assets/npc/k02_olgun.jpg"), yasli: require("../assets/npc/k02_yasli.jpg") },
  k03: { genc: require("../assets/npc/k03_genc.jpg"), olgun: require("../assets/npc/k03_olgun.jpg"), yasli: require("../assets/npc/k03_yasli.jpg") },
  k04: { genc: require("../assets/npc/k04_genc.jpg"), olgun: require("../assets/npc/k04_olgun.jpg"), yasli: require("../assets/npc/k04_yasli.jpg") },
  k05: { genc: require("../assets/npc/k05_genc.jpg"), olgun: require("../assets/npc/k05_olgun.jpg"), yasli: require("../assets/npc/k05_yasli.jpg") },
  k06: { genc: require("../assets/npc/k06_genc.jpg"), olgun: require("../assets/npc/k06_olgun.jpg"), yasli: require("../assets/npc/k06_yasli.jpg") },
  k07: { genc: require("../assets/npc/k07_genc.jpg"), olgun: require("../assets/npc/k07_olgun.jpg"), yasli: require("../assets/npc/k07_yasli.jpg") },
  k08: { genc: require("../assets/npc/k08_genc.jpg"), olgun: require("../assets/npc/k08_olgun.jpg"), yasli: require("../assets/npc/k08_yasli.jpg") },
} as const;

export type NpcKimlik = keyof typeof NPC_PORTRELER;
export type NpcEvre = "genc" | "olgun" | "yasli";
type Cinsiyet = "erkek" | "kadın";

// Sarıklı âlim (e05) isimsiz âlim figürleri için ayrılır; gerçek kişilerde rol değişince yüz değişmez.
const ERKEK: readonly NpcKimlik[] = ["e01", "e02", "e03", "e04", "e06", "e07", "e08"];
const KADIN: readonly NpcKimlik[] = ["k01", "k02", "k03", "k04", "k05", "k06", "k07", "k08"];

export function npcKimlik(seed: string | number, gender: Cinsiyet): NpcKimlik {
  let hash = 2166136261;
  const text = String(seed);
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  const pool = gender === "erkek" ? ERKEK : KADIN;
  return pool[hash % pool.length];
}

export function npcEvre(age: number): NpcEvre | null {
  if (!Number.isFinite(age) || age < 16) return null;
  return age < 35 ? "genc" : age < 60 ? "olgun" : "yasli";
}

export function npcPortreImage(age: number, gender: Cinsiyet, seed?: string | number): ImageSourcePropType | null {
  const evre = npcEvre(age);
  if (seed == null || evre == null) return null;
  return NPC_PORTRELER[npcKimlik(seed, gender)][evre];
}
