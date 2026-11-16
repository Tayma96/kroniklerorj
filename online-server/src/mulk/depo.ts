// İşletme deposu (tezgâh modeli §4, dükkân ve atölye ortak çekirdeği): kalite partileriyle mal. Depo yerleşimin
// mülk defterinde (YerlesimDO, `mk.tz`) durur, karakter envanteriyle AYNI DO'da: envanter ↔ depo taşıma tek
// yazımdadır, iki DO arası mal aktarımı yoktur (mal ne çoğalır ne kaybolur; yarım durum oluşamaz). Biçim karakter
// envanteriyle aynıdır (`ev` adet, `kq` izli partiler) ve kalite.ts yardımcılarıyla taşınır (yapan izi korunur).

import type { MalId } from "../icerik/mallar.ts";
import { kaliteliCikar, kaliteliEkle, kaliteAdedi, type Envanterli, type Kalite, type KaliteParti } from "../yerlesim/kalite.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { DEPO_KAPASITE, DEPO_TASIMA_EN_COK, rafMaliMi } from "./tezgah-kurallar.ts";

/** Raf satırı: bir mal + bir kalite + partiler (adet ve yapan izi) + birim fiyat. */
export interface RafSatiri {
  n: number;
  m: MalId;
  q: Kalite;
  p: KaliteParti[];
  f: number;
}

/** Bir işletmenin tezgâhı: depo (Envanterli), raf, sayaçlar ve son gün sonu dökümü. */
export interface Tezgah extends Envanterli {
  r: RafSatiri[];
  /** Raf satır sayacı. */
  n: number;
  /** Üst üste kepenkli geçen ay dönümü (devralma eşiği). */
  kk: number;
  /** Son gün sonu dökümü (ay dönümü). */
  gs?: unknown;
}

export function bosTezgah(): Tezgah {
  return { r: [], n: 0, kk: 0 };
}

export function depoAdedi(t: Envanterli): number {
  return Object.values(t.ev ?? {}).reduce((a, b) => a + b, 0);
}

export function depoKapasitesi(tur: "dukkan" | "atolye", seviye: number): number {
  const tablo = DEPO_KAPASITE[tur];
  return tablo[Math.max(0, Math.min(tablo.length - 1, seviye))]!;
}

export function partiToplam(p: readonly KaliteParti[]): number {
  return p.reduce((a, x) => a + x[1], 0);
}

/** Partileri (aynı kalite) yapan izine göre birleştirir. */
export function partiBirlestir(liste: KaliteParti[], gelen: readonly KaliteParti[]): void {
  for (const [q, n, yp] of gelen) {
    if (n <= 0) continue;
    const ayni = liste.find((p) => p[0] === q && p[2] === yp);
    if (ayni) ayni[1] += n;
    else liste.push(yp === undefined ? [q, n] : [q, n, yp]);
  }
}

/** Partilerden `adet` çıkarır (sondan başa); çıkanları döner. Yetmezse null, hiçbir şey değişmez. */
export function partiCikar(liste: KaliteParti[], adet: number): KaliteParti[] | null {
  if (!(adet > 0) || partiToplam(liste) < adet) return null;
  const cikan: KaliteParti[] = [];
  let kalan = adet;
  for (let i = liste.length - 1; i >= 0 && kalan > 0; i--) {
    const p = liste[i]!;
    const d = Math.min(kalan, p[1]);
    p[1] -= d;
    kalan -= d;
    cikan.push(p[2] === undefined ? [p[0], d] : [p[0], d, p[2]]);
  }
  for (let i = liste.length - 1; i >= 0; i--) if (liste[i]![1] <= 0) liste.splice(i, 1);
  return cikan;
}

export interface TasimaGirdisi {
  mal: MalId;
  q: Kalite;
  adet: number;
}

/** Gövdeden {mal, kalite?, adet} çözer. */
export function tasimaCoz(g: Record<string, unknown>, malBul: (v: unknown) => MalId | undefined): Sonuc<TasimaGirdisi> {
  const mal = malBul(g.mal);
  if (!mal || !rafMaliMi(mal)) return hata("mal_gecersiz");
  const q = g.kalite === undefined ? 0 : g.kalite;
  if (q !== 0 && q !== 1 && q !== 2 && q !== 3) return hata("kalite_gecersiz");
  const adet = g.adet;
  if (!Number.isInteger(adet) || (adet as number) < 1 || (adet as number) > DEPO_TASIMA_EN_COK) return hata("adet_gecersiz");
  return basarili({ mal, q: q as Kalite, adet: adet as number });
}

/** Envanter → depo (kapasite denetimli). Kaynak ve depo aynı yazımdadır. */
export function depoyaKoy(kaynak: Envanterli, t: Tezgah, g: TasimaGirdisi, kapasite: number): Sonuc<{ partiler: KaliteParti[] }> {
  if (kaliteAdedi(kaynak, g.mal, g.q) < g.adet) return hata("mal_yok");
  if (depoAdedi(t) + g.adet > kapasite) return hata("depo_dolu");
  const p = kaliteliCikar(kaynak, g.mal, g.adet, g.q)!;
  kaliteliEkle(t, g.mal, p);
  return basarili({ partiler: p });
}

/** Depo → envanter. */
export function depodanAl(hedef: Envanterli, t: Tezgah, g: TasimaGirdisi): Sonuc<{ partiler: KaliteParti[] }> {
  if (kaliteAdedi(t, g.mal, g.q) < g.adet) return hata("mal_yok");
  const p = kaliteliCikar(t, g.mal, g.adet, g.q)!;
  kaliteliEkle(hedef, g.mal, p);
  return basarili({ partiler: p });
}

/** Depo ve raftaki her şeyi hedefe (eski sahibin envanteri) boşaltır: iflas ve devralmada kayıp yok. */
export function tezgahBosalt(t: Tezgah, hedef: Envanterli): number {
  let n = 0;
  for (const s of t.r) {
    kaliteliEkle(hedef, s.m, s.p);
    n += partiToplam(s.p);
  }
  t.r = [];
  for (const [mal, adet] of Object.entries(t.ev ?? {})) {
    for (const q of [3, 2, 1, 0] as const) {
      const d = kaliteAdedi(t, mal, q);
      if (d <= 0) continue;
      const p = kaliteliCikar(t, mal as MalId, d, q);
      if (p) {
        kaliteliEkle(hedef, mal as MalId, p);
        n += d;
      }
    }
    void adet;
  }
  delete t.ev;
  delete t.kq;
  return n;
}

/** Depo görünümü: mal → kalite → adet ve başlıca yapan. */
export function depoGorunumu(t: Envanterli) {
  const l: { mal: string; kalite: Kalite; adet: number }[] = [];
  for (const mal of Object.keys(t.ev ?? {}).sort()) {
    for (const q of [0, 1, 2, 3] as const) {
      const d = kaliteAdedi(t, mal, q);
      if (d > 0) l.push({ mal, kalite: q, adet: d });
    }
  }
  return l;
}
