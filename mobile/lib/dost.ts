// Dost Haneler (kronik_dost): sunucusuz, yalnız bu cihazda. Defterden kısa bir hane kodu üretilir (yalnız kimlik: soyadı,
// son ata, kuşak, eğilim, tamamlanan yay sayısı); arkadaşın kodu elle girilir, Kronik'te dost hane olarak listelenir.
// Ağ yok, para/güç/eşya geçmez; kod bozuksa (sağlama tutmazsa) reddedilir.
import { Defter } from "./defter";
import { IZ_ETLERI, IzEt } from "./game";

export const DOST_KEY = "kronik_dost";
export const DOST_EN_COK = 20;
export interface DostHane { s: string; a: string; n: number; e?: IzEt; y: number; }
export interface DostKayit { v: 1; h: DostHane[]; }
export function bosDost(): DostKayit { return { v: 1, h: [] }; }

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
function utf8(str: string): number[] { const o: number[] = []; for (const ch of str) { let c = ch.codePointAt(0)!; if (c < 0x80) o.push(c); else if (c < 0x800) o.push(0xc0 | (c >> 6), 0x80 | (c & 63)); else if (c < 0x10000) o.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); else o.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); } return o; }
function deUtf8(b: number[]): string { let s = ""; for (let i = 0; i < b.length;) { const x = b[i++]; let c: number; if (x < 0x80) c = x; else if (x < 0xe0) c = ((x & 31) << 6) | (b[i++] & 63); else if (x < 0xf0) { c = ((x & 15) << 12) | ((b[i++] & 63) << 6); c |= b[i++] & 63; } else { c = ((x & 7) << 18) | ((b[i++] & 63) << 12); c |= (b[i++] & 63) << 6; c |= b[i++] & 63; } s += String.fromCodePoint(c); } return s; }
function b64(b: number[]): string { let s = ""; for (let i = 0; i < b.length; i += 3) { const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0); s += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : "") + (i + 2 < b.length ? B64[n & 63] : ""); } return s; }
function deB64(s: string): number[] | null { const o: number[] = []; let buf = 0, bit = 0; for (const ch of s) { const v = B64.indexOf(ch); if (v < 0) return null; buf = (buf << 6) | v; bit += 6; if (bit >= 8) { bit -= 8; o.push((buf >> bit) & 255); } } return o; }
function saglama(s: string): string { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return ((h >>> 0) % 1679616).toString(36).padStart(4, "0").toUpperCase(); }
const temiz = (x: string, n: number) => x.replace(/[|\n\r\t]/g, " ").trim().slice(0, n);

// Defterin son soyundan hane kodu (defter boşsa null).
export function haneKodu(d: Defter): string | null {
  const son = d.soylar[d.soylar.length - 1]; if (!son) return null;
  const e = son.egilim ? IZ_ETLERI.indexOf(son.egilim) : -1;
  const ham = [temiz(son.soyad || son.ad, 24), temiz(son.ad, 24), Math.min(99, son.nesil), e, Math.min(999, d.yaylar.length)].join("|");
  const g = b64(utf8(ham)); return "KR1-" + g + "-" + saglama(g);
}
export function koduCoz(kod: string): DostHane | null {
  const m = /^KR1-([A-Za-z0-9_-]+)-([0-9A-Z]{4})$/.exec(kod.trim()); if (!m || saglama(m[1]) !== m[2]) return null;
  const b = deB64(m[1]); if (!b) return null;
  const p = deUtf8(b).split("|"); if (p.length !== 5) return null;
  const n = Number(p[2]), e = Number(p[3]), y = Number(p[4]);
  if (!p[0] || !p[1] || !Number.isInteger(n) || n < 1 || !Number.isInteger(y) || y < 0) return null;
  return { s: temiz(p[0], 24), a: temiz(p[1], 24), n, y, ...(e >= 0 && IZ_ETLERI[e] ? { e: IZ_ETLERI[e] } : {}) };
}
const ayni = (a: DostHane, b: DostHane) => a.s === b.s && a.a === b.a && a.n === b.n;
// Ekle (aynı hane güncellenir, en çok 20, en yeni sonda).
export function dostEkle(k: DostKayit, h: DostHane): DostKayit { return { v: 1, h: [...k.h.filter((x) => !ayni(x, h)), h].slice(-DOST_EN_COK) }; }
export function dostCikar(k: DostKayit, i: number): DostKayit { return { v: 1, h: k.h.filter((_, j) => j !== i) }; }
export function dostGoc(raw: unknown): DostKayit {
  const d = bosDost(); if (!raw || typeof raw !== "object" || !Array.isArray((raw as { h?: unknown }).h)) return d;
  for (const x of (raw as { h: unknown[] }).h) {
    if (!x || typeof x !== "object") continue; const o = x as Record<string, unknown>;
    if (typeof o.s !== "string" || typeof o.a !== "string" || !o.s || !o.a) continue;
    const n = Number.isInteger(o.n) && (o.n as number) > 0 ? (o.n as number) : 1; const y = Number.isInteger(o.y) && (o.y as number) >= 0 ? (o.y as number) : 0;
    d.h.push({ s: temiz(o.s, 24), a: temiz(o.a, 24), n, y, ...(IZ_ETLERI.includes(o.e as IzEt) ? { e: o.e as IzEt } : {}) });
  }
  d.h = d.h.slice(-DOST_EN_COK); return d;
}
