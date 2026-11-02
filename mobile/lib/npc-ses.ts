// NPC'nin kendi sesi: diyalog satırındaki tırnak içi söz, kişinin cinsiyetine ve yaşına uygun sesle (Türkçe).
// Her kişi kimliğine göre hep aynı sesi kullanır; aynı yaş grubundaki erkekler iki ses arasında bölünür.
// Çocuklarda ses çalmaz (yetişkin sesi uymaz). Kronks yalnız anlatıcıdır, burada yoktur.
import VERI from "./npc-sozler.json";
import { playNarration } from "./sound";

const NORM = (s: string) => s.toLocaleLowerCase("tr-TR").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
const SOZ = new Map<string, number>((VERI.sozler as { n: number; soz: string }[]).map((s) => [NORM(s.soz), s.n]));

function karma(id: string): number { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h; }

export function npcSesRolu(npc: { id: string; gender: string; age: number }): string | null {
  if (npc.age < 16) return null;
  const iki = karma(npc.id) % 2 === 0;
  if (npc.gender === "kadın") return npc.age >= 55 ? "F_yasli" : npc.age >= 30 ? "F_orta" : "F_genc";
  if (npc.age >= 55) return "M_yasli_kd";
  if (npc.age >= 25) return iki ? "M_orta_oa" : "M_genc_kd";
  return iki ? "M_genc" : "M_genc_kd";
}

// Satırda seslendirilmiş bir söz varsa kişinin sesiyle çalar; çaldıysa true.
export function npcSoyle(npc: { id: string; gender: string; age: number }, satir: string, lang: string): boolean {
  if (lang !== "tr" || !satir) return false;
  const rol = npcSesRolu(npc); if (!rol) return false;
  const m = satir.match(/["“«]([^"”»]{2,})["”»]/); if (!m) return false;
  const n = SOZ.get(NORM(m[1])); if (n == null) return false;
  playNarration(`npc.${rol}_${n}`);
  return true;
}
