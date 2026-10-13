import type { Memory } from "./npc-mind";
import { izlenimler, type IzlenimDefteri } from "./npc-izlenim";

export const BAKIS_KEYS = ["guven", "saygi", "korku", "yakinlik", "borc", "suphe"] as const;
export type BakisKey = typeof BAKIS_KEYS[number];
export type Bakis = Record<BakisKey, number>;
export interface BakisDefteri { v: 1; toplam: Bakis }
export interface BakisSahibi { anilar?: Memory[]; bakis?: BakisDefteri; izlenim?: IzlenimDefteri }
const empty = (): Bakis => ({ guven: 0, saygi: 0, korku: 0, yakinlik: 0, borc: 0, suphe: 0 });
const round = (x: number) => Math.round(x * 1000) / 1000;

// Yük zaten kişinin huyunu ve görgünün ağırlığını taşır. Aynı ilişki toplamı aynı tavır değildir.
export function aniBakisi(m: Pick<Memory, "tur" | "yuk" | "kanit" | "kesinlik">): Bakis {
  const y = Number.isFinite(m.yuk) ? m.yuk : 0;
  const certainty = Number.isFinite(m.kesinlik) ? Math.max(0, Math.min(1, m.kesinlik!)) : m.kanit === "duyum" ? .6 : 1;
  const personal = m.kanit !== "gorgu" && m.kanit !== "duyum";
  let b: Bakis = { guven: y * .25, saygi: y * .15, korku: 0, yakinlik: y * .6, borc: 0, suphe: -y * .2 };
  if (["tehdit", "saldiri", "kacirma", "kan", "yakinima_zarar", "suc_tanigi"].includes(m.tur))
    b = { guven: y * .45, saygi: y * .1, korku: -y * .9, yakinlik: y * .35, borc: 0, suphe: -y * .35 };
  else if (["ihanet", "dolandiricilik", "hirsizlik_tanigi", "soyulma", "ucret_odenmedi", "somuru", "iftira", "bluf"].includes(m.tur))
    b = { guven: y * .8, saygi: y * .25, korku: 0, yakinlik: y * .3, borc: 0, suphe: -y * .75 };
  else if (["hakaret", "alay", "haddini_asma"].includes(m.tur))
    b = { guven: y * .2, saygi: y * .75, korku: 0, yakinlik: y * .8, borc: 0, suphe: -y * .15 };
  else if (["yardim", "borc_kurtarma", "hayat_kurtarma", "savunma", "kefalet", "can_bagisi"].includes(m.tur))
    b = { guven: y * .45, saygi: y * .3, korku: 0, yakinlik: y * .5, borc: personal ? y * .65 : 0, suphe: -y * .25 };
  else if (["hediye", "comert_hediye", "sadaka", "vergi_affi", "vergi_hafif"].includes(m.tur))
    b = { guven: y * .15, saygi: y * .3, korku: 0, yakinlik: y * .5, borc: personal ? y * .25 : 0, suphe: -y * .1 };
  else if (["sir_saklama", "soz_tutma", "ortak_kazanc", "adalet", "barisma", "helallik", "diyet"].includes(m.tur))
    b = { guven: y * .65, saygi: y * .35, korku: 0, yakinlik: y * .4, borc: 0, suphe: -y * .4 };
  return Object.fromEntries(BAKIS_KEYS.map(k => [k, round(b[k] * certainty)])) as Bakis;
}

export function bakisDegistir(ledger: BakisDefteri, before?: Bakis, after?: Bakis): void {
  for (const k of BAKIS_KEYS) ledger.toplam[k] = round(ledger.toplam[k] - (before?.[k] || 0) + (after?.[k] || 0));
}
export function bakisHesapla(memories: Memory[] | undefined, impressions?: IzlenimDefteri): BakisDefteri {
  const ledger: BakisDefteri = { v: 1, toplam: empty() };
  for (const m of [...(memories || []), ...izlenimler(impressions)]) bakisDegistir(ledger, undefined, aniBakisi(m));
  return ledger;
}
function valid(b: BakisDefteri | undefined): b is BakisDefteri {
  return b?.v === 1 && !!b.toplam && BAKIS_KEYS.every(k => Number.isFinite(b.toplam[k]));
}
// Yalnız motor yazımında başlatılır. Okuma eski kaydı değiştirmez; yeni kayıtta altı toplama erişir.
export function bakisHazirla(owner: BakisSahibi): BakisDefteri {
  if (!valid(owner.bakis)) owner.bakis = bakisHesapla(owner.anilar, owner.izlenim);
  return owner.bakis;
}
export function bakisOku(owner?: BakisSahibi): Bakis {
  const total = valid(owner?.bakis) ? owner!.bakis!.toplam : bakisHesapla(owner?.anilar, owner?.izlenim).toplam;
  return Object.fromEntries(BAKIS_KEYS.map(k => [k, Math.round(Math.max(["korku", "borc", "suphe"].includes(k) ? 0 : -100, Math.min(100, total[k])))])) as Bakis;
}
// Helallik, can bağışı ve diyet anıyı hafifletirken ayrı tavrı bayat bırakmaz.
export function aniHafiflet(owner: BakisSahibi, match: (m: Pick<Memory, "tur" | "yuk">) => boolean, factor: number, whole = false): void {
  const ledger = bakisHazirla(owner);
  for (const m of owner.anilar || []) if (match(m)) {
    const before = aniBakisi(m);
    m.yuk = whole ? Math.round(m.yuk * factor) : round(m.yuk * factor);
    if (Number.isFinite(m.izYuku)) m.izYuku = round(m.izYuku! * factor);
    bakisDegistir(ledger, before, aniBakisi(m));
  }
  for (const m of izlenimler(owner.izlenim)) if (match(m)) {
    const before = aniBakisi(m);
    m.yuk = whole ? Math.round(m.yuk * factor) : round(m.yuk * factor);
    bakisDegistir(ledger, before, Math.abs(m.yuk) > .001 ? aniBakisi(m) : undefined);
  }
  if (owner.izlenim) owner.izlenim.izler = izlenimler(owner.izlenim);
}
export function bakisTavri(b: Bakis): string {
  if (b.korku >= 20 && b.guven < 5) return "cekingen";
  if (b.suphe >= 15 && b.guven < 5) return "suphe";
  if (b.borc >= 15) return "minnet";
  if (b.guven >= 15 && b.yakinlik >= 8) return "guven";
  if (b.saygi >= 12) return "saygi";
  if (b.yakinlik >= 10) return "sicak";
  if (b.yakinlik <= -8) return "kirgin";
  return "notr";
}
