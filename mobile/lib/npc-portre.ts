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
export type NpcEvre = "cocuk" | "ergen" | "genc" | "olgun" | "yasli";
type Cinsiyet = "erkek" | "kadın";

// Her atlas: 4 sütun × 2 satır. Bir kişinin çocuk/ergen çifti yan yana durur.
const YAS_ATLASLARI = {
  e01_04: require("../assets/npc/e01-04_yas-atlas-v1.png"),
  e05_08: require("../assets/npc/e05-08_yas-atlas-v1.png"),
  k01_04: require("../assets/npc/k01-04_yas-atlas-v1.png"),
  k05_08: require("../assets/npc/k05-08_yas-atlas-v1.png"),
} as const;

export interface NpcPortreFrame {
  source: ImageSourcePropType;
  columns: number;
  rows: number;
  column: number;
  row: number;
}

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
  if (!Number.isFinite(age) || age < 0) return null;
  return age < 13 ? "cocuk" : age < 18 ? "ergen" : age < 35 ? "genc" : age < 60 ? "olgun" : "yasli";
}

export function npcPortreFrame(age: number, gender: Cinsiyet, seed?: string | number): NpcPortreFrame | null {
  const evre = npcEvre(age);
  if (seed == null || evre == null) return null;
  const identity = npcKimlik(seed, gender);
  if (evre === "cocuk" || evre === "ergen") {
    const index = Number(identity.slice(1)) - 1;
    const group = `${identity[0]}${index < 4 ? "01_04" : "05_08"}` as keyof typeof YAS_ATLASLARI;
    const pair = index % 4;
    return { source: YAS_ATLASLARI[group], columns: 4, rows: 2, column: (pair % 2) * 2 + (evre === "ergen" ? 1 : 0), row: Math.floor(pair / 2) };
  }
  return { source: NPC_PORTRELER[identity][evre], columns: 1, rows: 1, column: 0, row: 0 };
}

// Kaynak dosyası; atlaslı yaşları ekrana çizerken hücre bilgisi için npcPortreFrame kullanılır.
export function npcPortreImage(age: number, gender: Cinsiyet, seed?: string | number): ImageSourcePropType | null {
  return npcPortreFrame(age, gender, seed)?.source ?? null;
}
