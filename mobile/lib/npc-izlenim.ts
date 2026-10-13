import type { Memory } from "./npc-mind";

// Olayın kendisi değildir: tarih, şahit, kaynak ve olay kimliği saklanmaz.
export type Izlenim = Pick<Memory, "tur" | "yuk" | "kanit" | "kesinlik">;
export interface IzlenimDefteri { v: 1; izler: Izlenim[] }
export const IZLENIM_KAPASITE = 16;
const round = (n: number) => Math.round(n * 1000) / 1000;
export function izlenimGrubu(tur: string): string {
  if (["tehdit", "saldiri", "kacirma", "kan", "yakinima_zarar", "suc_tanigi"].includes(tur)) return "can";
  if (["ihanet", "dolandiricilik", "hirsizlik_tanigi", "soyulma", "ucret_odenmedi", "somuru", "iftira", "bluf", "sir_saklama", "soz_tutma", "ortak_kazanc", "adalet", "barisma", "helallik", "diyet"].includes(tur)) return "soz";
  if (["yardim", "borc_kurtarma", "hayat_kurtarma", "savunma", "kefalet", "can_bagisi", "hediye", "comert_hediye", "sadaka", "vergi_affi", "vergi_hafif"].includes(tur)) return "iyilik";
  return "hatir";
}
const indirect = (m: Izlenim) => m.kanit === "gorgu" || m.kanit === "duyum" || m.kanit === "eski";
const slot = (m: Izlenim) => izlenimGrubu(m.tur) + ":" + (m.yuk > 0 ? "+" : "-") + ":" + (indirect(m) ? "dolayli" : "kendi");
const weight = (m: Izlenim) => Math.abs(m.yuk) * (m.kesinlik ?? (m.kanit === "duyum" ? .6 : m.kanit === "eski" ? .4 : 1));
const valid = (m: Izlenim) => m && typeof m.tur === "string" && m.tur.length > 0 && m.tur.length < 48 && Number.isFinite(m.yuk) && Math.abs(m.yuk) > .001 && Math.abs(m.yuk) <= 30 && (m.kanit === undefined || ["katilim", "gorgu", "duyum", "eski"].includes(m.kanit)) && (m.kesinlik === undefined || Number.isFinite(m.kesinlik) && m.kesinlik >= 0 && m.kesinlik <= 1);
export function izlenimler(def?: IzlenimDefteri): Izlenim[] {
  if (def?.v !== 1 || !Array.isArray(def.izler)) return [];
  const seen = new Set<string>();
  return def.izler.slice(0, IZLENIM_KAPASITE).filter(m => { if (!valid(m) || seen.has(slot(m))) return false; seen.add(slot(m)); return true; });
}
export function izlenimHazirla(owner: { izlenim?: IzlenimDefteri }): IzlenimDefteri {
  if (owner.izlenim?.v !== 1 || !Array.isArray(owner.izlenim.izler) || owner.izlenim.izler.length !== izlenimler(owner.izlenim).length) owner.izlenim = { v: 1, izler: izlenimler(owner.izlenim) };
  return owner.izlenim;
}
// Sıradan selam/hoşbeş kalıcı sadakat üretmez. Yük zaten gerçek huyun çarpanını taşır.
export function izlenimTabani(m: Memory): number {
  if (Number.isFinite(m.izYuku)) return Math.sign(m.yuk) * Math.min(Math.abs(m.yuk), Math.abs(m.izYuku!), 30);
  if (Math.abs(m.yuk) < 3 || ["iltifat", "guzel_sohbet", "rahatsizlik", "tatsiz_konu", "flort_tanigi", "reddedilme", "ibadet_tanigi"].includes(m.tur)) return 0;
  return round(Math.sign(m.yuk) * Math.min(m.travma ? 30 : 6, Math.abs(m.yuk) * (m.travma ? .6 : .2)));
}
// Her tema/yön/kaynak sınıfında yalnız en güçlü iz kalır; tekrarlar ömür boyu toplanmaz.
export function izlenimBirlestir(def: IzlenimDefteri, memory: Memory): { before?: Izlenim; after?: Izlenim } {
  const y = izlenimTabani(memory);
  if (Math.abs(y) <= .001) return {};
  const next: Izlenim = { tur: memory.tur, yuk: y };
  if (memory.kanit) next.kanit = memory.kanit;
  if (Number.isFinite(memory.kesinlik)) next.kesinlik = Math.max(0, Math.min(1, memory.kesinlik!));
  const index = def.izler.findIndex(m => slot(m) === slot(next)), before = def.izler[index];
  if (before && weight(before) >= weight(next)) return {};
  if (index >= 0) def.izler[index] = next;
  else if (def.izler.length < IZLENIM_KAPASITE) def.izler.push(next);
  else return {};
  return { before, after: next };
}
export function izlenimToplami(def?: IzlenimDefteri): number {
  return Math.round(Math.max(-40, Math.min(40, izlenimler(def).reduce((n, m) => n + m.yuk, 0))));
}
export function belirginIzlenim(def?: IzlenimDefteri): Izlenim | null {
  return izlenimler(def).filter(m => weight(m) >= 1).sort((a, b) => weight(b) - weight(a))[0] || null;
}
export function izlenimSozAnahtari(m: Izlenim): string {
  const origin = m.kanit === "gorgu" ? "gorgu" : m.kanit === "duyum" ? "duyum" : m.kanit === "eski" ? "eski" : "kendi";
  const direction = m.yuk < 0 && izlenimGrubu(m.tur) === "can" && (origin === "kendi" || origin === "gorgu") ? "korku" : m.yuk > 0 ? "iyi" : "kotu";
  return "izlenim.soz." + origin + "." + direction;
}
