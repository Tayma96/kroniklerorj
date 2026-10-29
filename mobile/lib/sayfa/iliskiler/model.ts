// İlişkiler ekranının veri modeli: yakın çember ile yöre halkı dört gruba ayrılır (aile, yakın çevre, hasım, tanış).
// Motor çağrıları değişmez (yakinCember, npcsOf, relWith, kisiProfil); burada yalnız sınıflandırma ve sıralama yapılır.
import { npcsOf, relWith, yakinCember, kisiProfil, yoldasAdi, yoldasDurumu, type GameState } from "../../game";
import type { NPC } from "../../world";
import type { Lang } from "../../locale-data";
import { C } from "../../theme";

export type Grup = "aile" | "yakin" | "hasim" | "tanis";
export const GRUPLAR: readonly Grup[] = ["aile", "yakin", "hasim", "tanis"];
export const GRUP_IKON: Record<Grup, string> = { aile: "house", yakin: "prayer-beads", hasim: "crossed-swords", tanis: "walk" };
export const GRUP_TON: Record<Grup, string> = { aile: C.gold, yakin: C.sage, hasim: C.blood, tanis: C.parchmentDim };

// rol: yakın çemberdeki ya da ailedeki yeri (i18n anahtarı). cember: hayatını belirleyen 15 kişiden biri mi.
export type Kisi = { npc: NPC; v: number; rol?: string; uzak: boolean; loc: string; cember: boolean };
// Çocukluk yoldaşı çemberde değilse kendi kartıyla görünür (bağ ölçeği 0–100, durum etiketi).
export type Yoldas = { id: string; ad: string; kayitli: boolean; age: number; gender: "erkek" | "kadın"; seed: string; bag: number; durumKey: string; rakip: boolean };
export type IliskiModeli = { gruplar: Record<Grup, Kisi[]>; yoldas: Yoldas | null; yoldasGrup: Grup | null; sayi: Record<Grup, number>; toplam: number };

// İlişki bantları: eşik + ton (−100..+100).
export const BANTLAR = [
  { id: "dost", min: 50, tone: C.sage },
  { id: "arkadas", min: 20, tone: C.sage },
  { id: "tanis", min: -19, tone: C.parchmentDim },
  { id: "rakip", min: -49, tone: C.ember },
  { id: "dusman", min: -100, tone: C.blood },
] as const;
export function bantOf(v: number) { return BANTLAR.find((b) => v >= b.min) || BANTLAR[BANTLAR.length - 1]; }

const AILE_ROL = /^(char\.(mother|father)|cember\.(es|evlat|kardes|soz)|torun\.)/;
const HASIM_ROL = new Set(["cember.hasim", "cember.kanli", "cember.rakip"]);
export function rolTonu(rol: string): string {
  if (rol === "cember.kanli" || rol === "cember.hasim") return C.blood;
  if (rol === "cember.rakip") return C.ember;
  if (AILE_ROL.test(rol)) return C.gold;
  return C.sage;
}

// Çemberin dışındaki aile üyesi (kardeş, torun, akraba) yörede yaşıyorsa ailesinde görünür.
function aileRolu(s: GameState, n: NPC, lang: Lang): string | undefined {
  const r = kisiProfil(s, n.id, lang)?.aileRolu; if (!r) return undefined;
  const k = n.gender === "kadın" ? ".k" : "";
  return { anne: "char.mother", baba: "char.father", es: "cember.es" + k, evlat: "cember.evlat" + k, kardes: "cember.kardes" + k, torun: "torun.role", akraba: "torun.kin" }[r];
}

export function iliskiModeli(s: GameState, lang: Lang): IliskiModeli {
  const p = s.player;
  const gruplar: Record<Grup, Kisi[]> = { aile: [], yakin: [], hasim: [], tanis: [] };
  const cember = yakinCember(s, lang);
  const cemberde = new Set(cember.map((x) => x.npc.id));
  for (const { npc, rol, v, uzak, loc } of cember) {
    const g: Grup = AILE_ROL.test(rol) ? "aile" : HASIM_ROL.has(rol) ? "hasim" : "yakin";
    gruplar[g].push({ npc, v, rol, uzak, loc, cember: true });
  }

  let yoldas: Yoldas | null = null; let yoldasGrup: Grup | null = null;
  const cf = p.child_friend;
  if (cf && !cemberde.has(cf.id)) {
    const d = yoldasDurumu(p);
    const rakip = d === "rakip" || (d === "cocuk" && (cf.feud || 0) > cf.bond);
    const kayit = kisiProfil(s, cf.id, lang); // gerçek kişiyse yaşı kaydından, dokununca profili
    yoldas = {
      id: cf.id, ad: yoldasAdi(s, lang) || "", kayitli: !!kayit, age: kayit ? kayit.npc.age : Math.max(7, p.age), gender: cf.gender,
      seed: kayit ? cf.id : "cf_" + cf.seed, bag: Math.max(0, Math.min(100, cf.bond)), rakip,
      durumKey: rakip ? "child.friend.rivalStatus" : d === "omurluk" ? "child.friend.lifelong" : d === "ayrildi" ? "child.friend.parted" : "child.friend.label",
    };
    yoldasGrup = rakip ? "hasim" : "yakin";
  }

  // Bölgedeki herkes görünür; tanışmadıkların (ilişki 0) da "tanış" grubunda çıkar ki üzerine dokunup tanışabilesin.
  for (const n of npcsOf(s, lang)) {
    if (cemberde.has(n.id) || (yoldas && n.id === yoldas.id)) continue;
    const v = relWith(s, n.id); const rol = aileRolu(s, n, lang);
    const kisi: Kisi = { npc: n, v, rol, uzak: false, loc: p.location_name, cember: false };
    gruplar[rol ? "aile" : v >= 20 ? "yakin" : v <= -20 ? "hasim" : "tanis"].push(kisi);
  }
  // Çember kendi sırasını korur (eş, anne-baba, evlatlar…); yöre halkı ilişki gücüne göre dizilir.
  const yerel = (a: Kisi, z: Kisi) => Number(z.cember) - Number(a.cember);
  gruplar.yakin.sort((a, z) => yerel(a, z) || (a.cember ? 0 : z.v - a.v));
  gruplar.hasim.sort((a, z) => yerel(a, z) || (a.cember ? 0 : a.v - z.v));
  gruplar.tanis.sort((a, z) => Math.abs(z.v) - Math.abs(a.v));

  const sayi = Object.fromEntries(GRUPLAR.map((g) => [g, gruplar[g].length + (yoldasGrup === g ? 1 : 0)])) as Record<Grup, number>;
  return { gruplar, yoldas, yoldasGrup, sayi, toplam: GRUPLAR.reduce((a, g) => a + sayi[g], 0) };
}
