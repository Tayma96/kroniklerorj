// Han masa oyunları (Çanak Zarı, Dokuz Taş) istemci biçimleri: online-server/src/han/oyun/cati.ts (OyunGorunumu),
// canak.ts / dokuztas.ts (açık durum ve `ben`) ve vitrin.ts (GET /v1/han/masalar) ile birebir. Sunucu yetkilidir: sıra,
// hamle geçerliliği, el sonucu ve kazanan sunucudan gelir. Buradaki tahta geometrisi (komşuluk, üçleme çizgileri) yalnız
// görüntü ipucudur (dokunulabilir noktaların vurgusu, "taş al" sorusu); doğrulama sunucudadır.
import { useCallback, useEffect, useRef, useState } from "react";
import { useOnline } from "./durum";
import { ekCagir, metinMi, nesneMi, sayiMi, type EkSonuc } from "./ek-istemci";
import { sahteVitrin } from "./sahte-masa-oyun";

export const OYUN_TURLERI = ["canak", "dokuztas"] as const;
export type OyunTuru = (typeof OYUN_TURLERI)[number];
export type OyunAsamasi = "bekleme" | "oyun" | "bitti";
export type OyunSonucTuru = "kazandi" | "berabere" | "dagildi";
export type OyunAdimi = [number, Record<string, unknown> | "pas" | "cekil"];

export interface OyunOyuncusu { hesap: string; ad: string; yok?: number; cekildi?: true }

/** Sunucu OyunGorunumu (kişiye özel; `ben` yalnız izleyen oyuncuysa). */
export interface OyunGorunumu {
  id: number;
  tur: OyunTuru;
  asama: OyunAsamasi;
  kurucu: string;
  enAz: number;
  enCok: number;
  oyuncular: OyunOyuncusu[];
  n: number;
  sira: string | null;
  taahhut?: string;
  durum?: Record<string, unknown>;
  ben?: Record<string, unknown>;
  dagit: string[];
  pasAcik: boolean;
  sabir: number;
  sonuc?: { tur: OyunSonucTuru; kazanan: string[] };
  tohum?: string;
  kayit?: OyunAdimi[];
  kesik?: true;
}

// ---------------------------------------------------------------- Çanak Zarı

export type ElTuru = "uclu" | "sirali" | "cift" | "tek";
export const EL_TURLERI: readonly ElTuru[] = ["uclu", "sirali", "cift", "tek"];
export interface CanakEli { el: number; zarlar: (number[] | null)[]; turler: (ElTuru | null)[]; alan: number | null }
export interface CanakDurumu { el: number; elEnCok: number; hedef: number; acan: number; kazanc: number[]; cikti: boolean[]; yeniledi: (number | null)[]; gecmis: CanakEli[] }
export interface CanakBen { zarlarim: number[]; elim: ElTuru }

// ---------------------------------------------------------------- Dokuz Taş

export const NOKTA = 24;
export interface DokuzSon { kim: 0 | 1; kaynak?: number; hedef: number; al?: number }
export interface DokuzDurumu { tahta: number[]; el: [number, number]; taslar: [number, number]; ucma: [boolean, boolean]; sessiz: number; sessizEnCok: number; son?: DokuzSon }

/** [sunucu dokuztas.ts KOMSU] Nokta komşulukları (kare*8+k; k sol üst köşeden saat yönünde). Görüntü ipucu. */
export const KOMSU: readonly (readonly number[])[] = Array.from({ length: NOKTA }, (_, p) => {
  const kare = Math.floor(p / 8);
  const k = p % 8;
  const l = [kare * 8 + ((k + 7) % 8), kare * 8 + ((k + 1) % 8)];
  if (k % 2 === 1) {
    if (kare > 0) l.push(p - 8);
    if (kare < 2) l.push(p + 8);
  }
  return l.sort((a, b) => a - b);
});
/** [sunucu dokuztas.ts UCLEMELER] 16 üçleme çizgisi. */
export const UCLEMELER: readonly (readonly [number, number, number])[] = [
  ...[0, 1, 2].flatMap((kare) => [0, 2, 4, 6].map((k) => [kare * 8 + k, kare * 8 + k + 1, kare * 8 + ((k + 2) % 8)] as const)),
  ...[1, 3, 5, 7].map((k) => [k, 8 + k, 16 + k] as const),
];
/** Noktanın 7×7 ızgaradaki yeri (sütun, satır). */
export function noktaYeri(p: number): [number, number] {
  const c = Math.floor(p / 8);
  const k = p % 8;
  const lo = c, hi = 6 - c, o = 3;
  return ([[lo, lo], [o, lo], [hi, lo], [hi, o], [hi, hi], [o, hi], [lo, hi], [lo, o]] as [number, number][])[k]!;
}
export const uclemede = (tahta: readonly number[], p: number): boolean => {
  const i = tahta[p];
  if (i === undefined || i < 0) return false;
  return UCLEMELER.some((u) => u.includes(p) && u.every((q) => tahta[q] === i));
};
/** Görüntü ipucu: i'nin rakibinden alabileceği taşlar (sunucu kuralının aynası; doğrulama sunucuda). */
export function alinabilirIpucu(tahta: readonly number[], i: number): number[] {
  const taslar = tahta.flatMap((x, p) => (x === 1 - i ? [p] : []));
  const disarda = taslar.filter((p) => !uclemede(tahta, p));
  return disarda.length ? disarda : taslar;
}
export type DokuzAsama = "koyma" | "surme" | "ucma";
export const dokuzAsamasi = (d: DokuzDurumu, i: number): DokuzAsama => (d.el[i]! > 0 ? "koyma" : d.ucma[i] ? "ucma" : "surme");

// ---------------------------------------------------------------- biçim denetimi

const tamMi = (v: unknown): v is number => Number.isInteger(v);
const diziMi = <T,>(v: unknown, f: (x: unknown) => x is T): v is T[] => Array.isArray(v) && v.every(f);
const zarMi = (v: unknown): v is number => tamMi(v) && v >= 1 && v <= 6;
const elTuruMu = (v: unknown): v is ElTuru => typeof v === "string" && (EL_TURLERI as readonly string[]).includes(v);
const oyuncuMu = (v: unknown): v is OyunOyuncusu => nesneMi(v) && metinMi(v.hesap) && metinMi(v.ad) && (v.yok === undefined || sayiMi(v.yok));

export function oyunGorunumuMu(v: unknown): v is OyunGorunumu {
  return nesneMi(v) && tamMi(v.id) && typeof v.tur === "string" && (OYUN_TURLERI as readonly string[]).includes(v.tur)
    && (v.asama === "bekleme" || v.asama === "oyun" || v.asama === "bitti") && metinMi(v.kurucu) && tamMi(v.enAz) && tamMi(v.enCok)
    && diziMi(v.oyuncular, oyuncuMu) && tamMi(v.n) && (v.sira === null || metinMi(v.sira)) && diziMi(v.dagit, metinMi)
    && typeof v.pasAcik === "boolean" && sayiMi(v.sabir) && (v.durum === undefined || nesneMi(v.durum)) && (v.ben === undefined || nesneMi(v.ben));
}

export function canakDurumu(o: OyunGorunumu): CanakDurumu | null {
  const d = o.durum;
  if (o.tur !== "canak" || !nesneMi(d)) return null;
  const elMi = (g: unknown): g is CanakEli => nesneMi(g) && tamMi(g.el) && Array.isArray(g.zarlar) && g.zarlar.every((z) => z === null || diziMi(z, zarMi))
    && Array.isArray(g.turler) && g.turler.every((x) => x === null || elTuruMu(x)) && (g.alan === null || tamMi(g.alan));
  if (!tamMi(d.el) || !tamMi(d.elEnCok) || !tamMi(d.hedef) || !tamMi(d.acan) || !diziMi(d.kazanc, tamMi) || !Array.isArray(d.cikti)
    || !Array.isArray(d.yeniledi) || !d.yeniledi.every((x) => x === null || tamMi(x)) || !diziMi(d.gecmis, elMi)) return null;
  return d as unknown as CanakDurumu;
}
export function canakBen(o: OyunGorunumu): CanakBen | null {
  const b = o.ben;
  return nesneMi(b) && diziMi(b.zarlarim, zarMi) && b.zarlarim.length === 3 && elTuruMu(b.elim) ? (b as unknown as CanakBen) : null;
}
export function dokuzDurumu(o: OyunGorunumu): DokuzDurumu | null {
  const d = o.durum;
  if (o.tur !== "dokuztas" || !nesneMi(d)) return null;
  if (!diziMi(d.tahta, tamMi) || d.tahta.length !== NOKTA || !diziMi(d.el, tamMi) || !diziMi(d.taslar, tamMi) || !Array.isArray(d.ucma)
    || !tamMi(d.sessiz) || !tamMi(d.sessizEnCok)) return null;
  return d as unknown as DokuzDurumu;
}

// ---------------------------------------------------------------- iletiler ve hatalar

/** İstemci → sunucu masa oyunu iletileri (masa soketi). */
export type OyunIletisi =
  | { t: "oyunAc"; oyun: OyunTuru }
  | { t: "oyunKatil" }
  | { t: "oyunAyril" }
  | { t: "oyunBaslat" }
  | { t: "hamle"; n: number; hamle: Record<string, unknown> }
  | { t: "oyunPas"; n: number }
  | { t: "oyunDagit" }
  | { t: "oyunKapat" };
export const OYUN_KOMUTLARI: ReadonlySet<string> = new Set(["oyunAc", "oyunKatil", "oyunAyril", "oyunBaslat", "hamle", "oyunPas", "oyunDagit", "oyunKapat"]);

/** Brief §2 hata kodları: her birinin oyuncuya sıcak metni `onl.mo.hata.<kod>`. */
export const OYUN_HATALARI = [
  "oturmuyor", "masa_mesgul", "oyun_turu_gecersiz", "oyun_var", "oyun_yok", "oyun_dolu", "oyun_basladi", "oyuncu_az", "oyuncu_degil",
  "yetki_yok", "sira_degil", "hamle_gecersiz", "hamle_no", "pas_yok", "gecersiz_istek", "hiz_siniri", "ag_yok",
] as const;
export type OyunHatasi = (typeof OYUN_HATALARI)[number];
const OH: ReadonlySet<string> = new Set(OYUN_HATALARI);
export const oyunHatasiCoz = (h: string): OyunHatasi => (OH.has(h) ? (h as OyunHatasi) : "gecersiz_istek");

// ---------------------------------------------------------------- canlı masalar vitrini

export interface VitrinSatiri { han: number; masa: number; oyun: OyunTuru; asama: "bekleme" | "oyun"; oyuncu: number; enCok: number; bos: number; seyirci: number; katilabilir: boolean }
const satirMi = (v: unknown): v is VitrinSatiri => nesneMi(v) && tamMi(v.han) && tamMi(v.masa) && typeof v.oyun === "string" && (OYUN_TURLERI as readonly string[]).includes(v.oyun)
  && (v.asama === "bekleme" || v.asama === "oyun") && tamMi(v.oyuncu) && tamMi(v.enCok) && tamMi(v.bos) && tamMi(v.seyirci) && typeof v.katilabilir === "boolean";
const vitrinMi = (v: unknown): v is { masalar: VitrinSatiri[] } => nesneMi(v) && diziMi(v.masalar, satirMi);

/** GET /v1/han/masalar (geliştirici oturumunda sahte liste). Ekran odaklanınca ve "yenile"de çekilir; yoklama yok. */
export function useVitrin(etkin: boolean) {
  const o = useOnline();
  const sahte = o.oturum?.tur === "gelistirici";
  const [liste, setListe] = useState<VitrinSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const canli = useRef(true);
  useEffect(() => () => { canli.current = false; }, []);
  const yukle = useCallback(async () => {
    if (!etkin) return;
    setYukleniyor(true);
    const r: EkSonuc<{ masalar: VitrinSatiri[] }> = sahte
      ? await new Promise((c) => setTimeout(() => c({ ok: true, deger: { masalar: sahteVitrin() } }), 200))
      : await ekCagir({ yontem: "GET", yol: "/v1/han/masalar", tekrar: true }, vitrinMi);
    if (!canli.current) return;
    setYukleniyor(false);
    if (r.ok) { setListe(r.deger.masalar); setHata(null); } else setHata(r.hata);
  }, [etkin, sahte]);
  useEffect(() => { void yukle(); }, [yukle]);
  return { liste, hata, yukleniyor, yukle };
}

// ---------------------------------------------------------------- denetim: SHA-256(tohum) === taahhüt

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
/** Küçük, bağımlılıksız SHA-256 (UTF-8 metin → onaltılık); yalnız mühür doğrulaması için. */
export function sha256Hex(metin: string): string {
  const bayt = Array.from(unescape(encodeURIComponent(metin)), (c) => c.charCodeAt(0));
  const uzunluk = bayt.length * 8;
  bayt.push(0x80);
  while (bayt.length % 64 !== 56) bayt.push(0);
  for (let i = 7; i >= 0; i--) bayt.push(i >= 4 ? 0 : (uzunluk >>> (i * 8)) & 0xff);
  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  const sag = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let o = 0; o < bayt.length; o += 64) {
    for (let i = 0; i < 16; i++) w[i] = (bayt[o + i * 4]! << 24) | (bayt[o + i * 4 + 1]! << 16) | (bayt[o + i * 4 + 2]! << 8) | bayt[o + i * 4 + 3]!;
    for (let i = 16; i < 64; i++) {
      const s0 = sag(w[i - 15]!, 7) ^ sag(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = sag(w[i - 2]!, 17) ^ sag(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = [h[0]!, h[1]!, h[2]!, h[3]!, h[4]!, h[5]!, h[6]!, h[7]!];
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (sag(e, 6) ^ sag(e, 11) ^ sag(e, 25)) + ((e & f) ^ (~e & g)) + K[i]! + w[i]!) >>> 0;
      const t2 = ((sag(a, 2) ^ sag(a, 13) ^ sag(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0]! + a) >>> 0; h[1] = (h[1]! + b) >>> 0; h[2] = (h[2]! + c) >>> 0; h[3] = (h[3]! + d) >>> 0;
    h[4] = (h[4]! + e) >>> 0; h[5] = (h[5]! + f) >>> 0; h[6] = (h[6]! + g) >>> 0; h[7] = (h[7]! + hh) >>> 0;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, "0")).join("");
}
/** Bitince açılan tohum baştaki mühürle (taahhüt) eşleşiyor mu; tohum/taahhüt yoksa null. */
export const muhurDogru = (o: OyunGorunumu): boolean | null => (o.tohum && o.taahhut ? sha256Hex(o.tohum) === o.taahhut.toLowerCase() : null);
