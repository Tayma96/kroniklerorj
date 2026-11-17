// İşletme deposu (tezgâh modeli §4, dükkân ve atölye ortak çekirdeği): kalite partileriyle mal. Depo yerleşimin
// mülk defterinde (YerlesimDO, `mk.tz`) durur, karakter envanteriyle AYNI DO'da: envanter ↔ depo taşıma tek
// yazımdadır, iki DO arası mal aktarımı yoktur (mal ne çoğalır ne kaybolur; yarım durum oluşamaz). Biçim karakter
// envanteriyle aynıdır (`ev` adet, `kq` izli partiler) ve kalite.ts yardımcılarıyla taşınır (yapan izi korunur).

import type { MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { KALITELER, hepsiniTasi, kaliteliCikar, kaliteliEkle, kaliteAdedi, kaliteMi, partiEsMi, secilebilirAdet, partiParca, type Envanterli, type Kalite, type KaliteParti } from "../yerlesim/kalite.ts";
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
  /** Devralma sayacı: üst üste satışsız VE sahip/vekil tezgâh eylemi olmayan ay (satış ya da eylem anında sıfırlar). */
  kk: number;
  /** Son oyuncu satışının ayı ve sahibin/vekilin son tezgâh eyleminin ayı (kepenk ve devralma sayımı). */
  os?: number;
  se?: number;
  /** Çalışanların depodan envantere günlük alışı (adil değer): [TR günü, yerel kimlik → toplam]. */
  cg?: [gun: number, Record<string, number>];
  /** Depo defteri: çalışanın her depodan alışı [ay, kim, mal, kalite, adet] (en yeni sonda, sınırlı). */
  dd?: [ay: number, o: string, mal: string, kalite: number, adet: number][];
  /** Son gün sonu dökümü (ay dönümü; atölyede üretim dökümü). */
  gs?: unknown;
  // ── Dilim 2 ──
  /** Genişletme kademesi: kapasitesi (raf satırı, tezgâh, depo) açılmış en yüksek seviye. Eski kayıtta yok → bugünkü seviye. */
  gk?: number;
  /** Atölye: zanaat mesleği ve yapılan zanaat değişikliği sayısı. */
  za?: MeslekId;
  zs?: number;
  /** Atölye: oyuncu emek havuzu (bağlanan mesai; takat → emek 1:1). */
  eh?: number;
  /** Atölye: açık üretim emirleri ve emir sayacı. */
  ue?: UretimEmri[];
  en?: number;
  /** Atölye: son anlık üretim ya da toplu sipariş teslimi ayı (kepenk ölçütü). */
  ua?: number;
  /** Atölye: depodaki aletlerin aşınma sayacı (emirle ve anlık üretimde). */
  as?: Record<string, number>;
}

/** Üretim emri: tarif, toplam yapım, yapılan, açılış ayı, açan. */
export interface UretimEmri {
  n: number;
  tr: string;
  k: number;
  y: number;
  a: number;
  o: string;
}

export function bosTezgah(gk?: number): Tezgah {
  return gk === undefined ? { r: [], n: 0, kk: 0 } : { r: [], n: 0, kk: 0, gk };
}

export function depoAdedi(t: Envanterli): number {
  return Object.values(t.ev ?? {}).reduce((a, b) => a + b, 0);
}

/** Depo kapasitesi; `artiYuzde`: kanca bonusu (Dilim 3, tavanlı değer çağırandan; adet aşağı yuvarlanır). */
export function depoKapasitesi(tur: "dukkan" | "atolye", seviye: number, artiYuzde = 0): number {
  const tablo = DEPO_KAPASITE[tur];
  const taban = tablo[Math.max(0, Math.min(tablo.length - 1, seviye))]!;
  return taban + Math.floor((taban * Math.max(0, artiYuzde)) / 100);
}

export function partiToplam(p: readonly KaliteParti[]): number {
  return p.reduce((a, x) => a + x[1], 0);
}

/** Partileri (aynı kalite) yapan izine göre birleştirir. */
export function partiBirlestir(liste: KaliteParti[], gelen: readonly KaliteParti[]): void {
  for (const g of gelen) {
    const n = g[1];
    if (n <= 0) continue;
    const ayni = liste.find((p) => partiEsMi(p, g));
    if (ayni) ayni[1] += n;
    else liste.push(partiParca(g, n));
  }
}

/** Seçilebilir parti mi: adlı eşya yalnız kimliğiyle, kimlik verildiyse yalnız o eşya. */
const secilir = (p: KaliteParti, esyaId?: string): boolean => (esyaId === undefined ? !p[4] : p[4]?.i === esyaId);

/** Kimliksiz seçilebilen (adlı eşya hariç) ya da verilen eşyanın adedi. */
export function secilebilirToplam(liste: readonly KaliteParti[], esyaId?: string): number {
  return liste.filter((p) => secilir(p, esyaId)).reduce((a, x) => a + x[1], 0);
}

/**
 * Partilerden `adet` çıkarır (sondan başa); çıkanları döner. Adlı eşya yalnız `esyaId` ile ve yalnız o eşya çıkar.
 * Yetmezse null, hiçbir şey değişmez.
 */
export function partiCikar(liste: KaliteParti[], adet: number, esyaId?: string): KaliteParti[] | null {
  if (!(adet > 0) || secilebilirToplam(liste, esyaId) < adet) return null;
  const cikan: KaliteParti[] = [];
  let kalan = adet;
  for (let i = liste.length - 1; i >= 0 && kalan > 0; i--) {
    const p = liste[i]!;
    if (!secilir(p, esyaId)) continue;
    const d = Math.min(kalan, p[1]);
    p[1] -= d;
    kalan -= d;
    cikan.push(partiParca(p, d));
  }
  for (let i = liste.length - 1; i >= 0; i--) if (liste[i]![1] <= 0) liste.splice(i, 1);
  return cikan;
}

export interface TasimaGirdisi {
  mal: MalId;
  q: Kalite;
  adet: number;
  /** Adlı eşyanın kimliği (efsanevi/tılsımlı yalnız bununla seçilir; verilirse adet 1). */
  esya?: string;
}

/** Gövdedeki isteğe bağlı `esya` kimliği (geçersizse null; yoksa undefined). */
export function esyaKimligiCoz(ham: unknown): string | undefined | null {
  if (ham === undefined || ham === null) return undefined;
  return typeof ham === "string" && /^e[0-9a-z]{1,16}$/.test(ham) ? ham : null;
}

/** Gövdeden {mal, kalite?, adet, esya?} çözer. */
export function tasimaCoz(g: Record<string, unknown>, malBul: (v: unknown) => MalId | undefined, herMal = false): Sonuc<TasimaGirdisi> {
  const mal = malBul(g.mal);
  // Atölye deposu tabanı 0 olan zanaat mallarını da (kâtip: mürekkep, senet) taşır; su hiçbir depoya girmez.
  if (!mal || mal === "su" || (!herMal && !rafMaliMi(mal))) return hata("mal_gecersiz");
  const q = g.kalite === undefined ? 0 : g.kalite;
  if (!kaliteMi(q)) return hata("kalite_gecersiz");
  const adet = g.adet;
  if (!Number.isInteger(adet) || (adet as number) < 1 || (adet as number) > DEPO_TASIMA_EN_COK) return hata("adet_gecersiz");
  const esya = esyaKimligiCoz(g.esya);
  if (esya === null || (esya !== undefined && adet !== 1)) return hata("adet_gecersiz");
  return basarili({ mal, q: q as Kalite, adet: adet as number, ...(esya ? { esya } : {}) });
}

/** Seçimin eksik nedeni: adlı eşya yüzünden yetmiyorsa esya_kilitli, yoksa mal_yok. */
export function secimEksigi(k: Envanterli, mal: string, q: Kalite, adet: number, esya?: string): "mal_yok" | "esya_kilitli" | null {
  if (secilebilirAdet(k, mal, q, esya) >= adet) return null;
  return esya === undefined && kaliteAdedi(k, mal, q) >= adet ? "esya_kilitli" : "mal_yok";
}

/** Envanter → depo (kapasite denetimli). Kaynak ve depo aynı yazımdadır. */
export function depoyaKoy(kaynak: Envanterli, t: Tezgah, g: TasimaGirdisi, kapasite: number): Sonuc<{ partiler: KaliteParti[] }> {
  const eksik = secimEksigi(kaynak, g.mal, g.q, g.adet, g.esya);
  if (eksik) return hata(eksik);
  if (depoAdedi(t) + g.adet > kapasite) return hata("depo_dolu");
  const p = kaliteliCikar(kaynak, g.mal, g.adet, g.q, g.esya)!;
  kaliteliEkle(t, g.mal, p);
  return basarili({ partiler: p });
}

/** Depo → envanter. */
export function depodanAl(hedef: Envanterli, t: Tezgah, g: TasimaGirdisi): Sonuc<{ partiler: KaliteParti[] }> {
  const eksik = secimEksigi(t, g.mal, g.q, g.adet, g.esya);
  if (eksik) return hata(eksik);
  const p = kaliteliCikar(t, g.mal, g.adet, g.q, g.esya)!;
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
  // Her mal bütünüyle (izsiz, izli ve adlı eşya) taşınır: hiçbir parti silinmez.
  for (const mal of Object.keys(t.ev ?? {})) n += hepsiniTasi(t, hedef, mal as MalId);
  delete t.ev;
  delete t.kq;
  return n;
}

/** Depo görünümü: mal → kalite → adet ve başlıca yapan. */
export function depoGorunumu(t: Envanterli) {
  const l: { mal: string; kalite: Kalite; adet: number }[] = [];
  for (const mal of Object.keys(t.ev ?? {}).sort()) {
    for (const q of KALITELER) {
      const d = kaliteAdedi(t, mal, q);
      if (d > 0) l.push({ mal, kalite: q, adet: d });
    }
  }
  return l;
}
