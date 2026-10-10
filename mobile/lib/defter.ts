// Hanedan Defteri (kronik_defter): ölümden sağ çıkan tek kayıt. resetGame onu silmez; yeni oyun ve "Küllerden yeni ocak"
// onu okur. Defter kimlik taşır, güç taşımaz: soy kaydı, lakaplar, ölüm sıfatları, tamamlanan yaylar, görülen ikilemler,
// her hayatın en çok anılan kararları (Yankı izleri) ve seçilen soy yetenekleri. Para/mülk/itibar asla geçmez.
import { GameState, IzEt, IZ_ETLERI, deathEpithet, onemliIzler, hafizaEgilimi, SOY_YETENEKLERI } from "./game";

export interface DefterIz { k: string; et: IzEt; ref: number; }
export interface DefterSoy {
  anahtar: string; // aynı ölüm iki kez işlenmesin (idempotent)
  ad: string; soyad: string; cins: "erkek" | "kadın"; nesil: number; olumYasi: number; meslek: string;
  sifat?: string; lakaplar: string[]; egilim?: IzEt; izler: DefterIz[]; yaylar: string[]; yetenek?: string; secilen?: string;
}
export interface Defter { v: 1; soylar: DefterSoy[]; yaylar: string[]; ikilemler: string[]; }
export const DEFTER_KEY = "kronik_defter";
export const DEFTER_SOY_EN_COK = 60;

export function bosDefter(): Defter { return { v: 1, soylar: [], yaylar: [], ikilemler: [] }; }
const str = (x: unknown): x is string => typeof x === "string";
// Bozuk/eski defteri onar (göç): her alan korumalı; tanınmayan değer düşer, defter asla atılmaz.
export function defterGoc(raw: unknown): Defter {
  const d = bosDefter();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.yaylar)) d.yaylar = [...new Set(r.yaylar.filter(str))];
  if (Array.isArray(r.ikilemler)) d.ikilemler = [...new Set(r.ikilemler.filter(str))].slice(-400);
  if (Array.isArray(r.soylar)) for (const x of r.soylar) {
    if (!x || typeof x !== "object") continue; const o = x as Record<string, unknown>;
    if (!str(o.ad) || !str(o.anahtar)) continue;
    d.soylar.push({
      anahtar: o.anahtar, ad: o.ad, soyad: str(o.soyad) ? o.soyad : "", cins: o.cins === "kadın" ? "kadın" : "erkek",
      nesil: Number.isFinite(o.nesil) ? Math.max(1, Math.floor(o.nesil as number)) : 1, olumYasi: Number.isFinite(o.olumYasi) ? (o.olumYasi as number) : 0,
      meslek: str(o.meslek) ? o.meslek : "işsiz", sifat: str(o.sifat) && o.sifat ? o.sifat : undefined,
      lakaplar: Array.isArray(o.lakaplar) ? o.lakaplar.filter(str) : [],
      egilim: IZ_ETLERI.includes(o.egilim as IzEt) ? (o.egilim as IzEt) : undefined,
      izler: Array.isArray(o.izler) ? (o.izler as unknown[]).filter((z): z is DefterIz => !!z && typeof z === "object" && str((z as DefterIz).k) && IZ_ETLERI.includes((z as DefterIz).et)).map((z) => ({ k: z.k, et: z.et, ref: Number.isFinite(z.ref) ? z.ref : 0 })).slice(0, 3) : [],
      yaylar: Array.isArray(o.yaylar) ? o.yaylar.filter(str) : [],
      yetenek: str(o.yetenek) && SOY_YETENEKLERI.some((y) => y.id === o.yetenek) ? o.yetenek : undefined,
      secilen: str(o.secilen) && SOY_YETENEKLERI.some((y) => y.id === o.secilen) ? o.secilen : undefined,
    });
  }
  d.soylar = d.soylar.slice(-DEFTER_SOY_EN_COK);
  return d;
}
export function hayatAnahtari(s: GameState): string { const p = s.player; return [p.name, p.surname || "", p.generation, s.turn, p.age].join("|"); }
// Ölümü deftere işle (saf; aynı hayat ikinci kez işlenmez).
export function defterIsle(d0: Defter, s: GameState): Defter {
  const p = s.player; if (!p.dead) return d0;
  const anahtar = hayatAnahtari(s);
  if (d0.soylar.some((x) => x.anahtar === anahtar)) return d0;
  const d: Defter = { v: 1, soylar: [...d0.soylar], yaylar: [...d0.yaylar], ikilemler: [...d0.ikilemler] };
  const yaylar = [...(s.story?.completed || [])];
  for (const y of yaylar) if (!d.yaylar.includes(y)) d.yaylar.push(y);
  for (const iz of s.hafiza || []) if (!iz.ata && iz.k.startsWith("dil:")) { const id = iz.k.split(":")[1]; if (id && !d.ikilemler.includes(id)) d.ikilemler.push(id); }
  d.ikilemler = d.ikilemler.slice(-400);
  d.soylar.push({
    anahtar, ad: p.name, soyad: p.surname || "", cins: p.gender === "kadın" ? "kadın" : "erkek", nesil: p.generation || 1, olumYasi: p.age, meslek: p.profession,
    sifat: deathEpithet(s) || undefined, lakaplar: [...(p.lakaplar || [])], egilim: hafizaEgilimi(s.hafiza) || undefined,
    izler: onemliIzler(s.hafiza, 3).map((x) => ({ k: x.k, et: x.et, ref: x.ref || 0 })), yaylar, yetenek: p.soy_yetenek,
  });
  d.soylar = d.soylar.slice(-DEFTER_SOY_EN_COK);
  return d;
}
// Ölümde seçilen soy yeteneğini son kayda yaz (vâris ya da yeni ocak onu taşır).
export function defterSecim(d: Defter, anahtar: string, yetenek?: string): Defter {
  return { ...d, soylar: d.soylar.map((x) => (x.anahtar === anahtar ? { ...x, secilen: yetenek } : x)) };
}
export function sonSoy(d: Defter): DefterSoy | undefined { return d.soylar[d.soylar.length - 1]; }
