// Ürün kalitesi ve yapan izi (Faz 6, beceri ağacı v2 §7): tarifle üretilen malın kalite kademesi (sade, iyi,
// üstün, şaheser) beceriden çıkar ve malın üstüne yapanın kimliği yazılır ("Usta Ayşe'nin sabanı"). Kalite puanı
// dökümle döner (gizli sayı yok): meslek kademesi + zanaat becerisi + kalite düğümleri + kullanılan aracın kalitesi
// + küçük deterministik zar. Aletin etkisi yalnız kullananın bilgisinden değil, aleti YAPANIN kalitesinden de gelir
// (fazladan çıktı ve ömür).
//
// Saklama (geriye uyumlu): `ev` adetin tek kaynağıdır. `kq` yalnız izli partileri tutar: mal → [kalite, adet,
// yapan?] (kaliteye göre azalan). İzsiz kalan (ev − Σ parti) sade sayılır; eski sayısal envanter böylece olduğu
// gibi geçerlidir. Envanterden düşüş (`envanterEkle` eksi) önce izsiz sadeyi, sonra en düşük kaliteyi tüketir;
// belirli bir kalitenin aktarımı (`kaliteliCikar`/`kaliteliEkle`) partileri yapan iziyle taşır. Saf fonksiyonlar.

import { TARIFLER, type Tarif } from "../icerik/tarifler.ts";
import type { MalId } from "../icerik/mallar.ts";
import type { Zar } from "./rastgele.ts";
import type { Dokum, Karakter } from "./tipler.ts";

export const KALITE_ADLARI = ["sade", "iyi", "ustun", "saheser"] as const;
export type KaliteAdi = (typeof KALITE_ADLARI)[number];
/** 0 sade, 1 iyi, 2 üstün, 3 şaheser. */
export type Kalite = 0 | 1 | 2 | 3;
/** Parti: [kalite, adet, yapan (yerel oyuncu kimliği; bilinmiyorsa yok)]. */
export type KaliteParti = [kalite: Kalite, adet: number, yapan?: string];

/** [PARAMETRE] Kalite kademesinin eşikleri (puan; sade, iyi, üstün, şaheser). */
export const KALITE_ESIK: readonly number[] = [0, 30, 55, 85];
/** [PARAMETRE] Tarifin mesleğindeki kademeye göre puan (çırak, kalfa, usta, pir). */
export const KALITE_KADEME_PUANI: readonly number[] = [0, 10, 20, 30];
/** [PARAMETRE] Zanaat becerisi (0–100) bu sayıya bölünerek puana eklenir (en çok 20). */
export const KALITE_ZANAAT_BOLEN = 5;
/** [PARAMETRE] Kalite düğümü yüzdelerinin toplam tavanı (birden çok düğüm toplanır). */
export const KALITE_BECERI_TAVAN = 60;
/** [PARAMETRE] Deterministik zar: 0..KALITE_ZAR−1 eklenir (aynı oyuncu, tarif, ay ve sayaçla aynı çıkar). */
export const KALITE_ZAR = 20;
/** [PARAMETRE] Kullanılan aracın kalitesine göre: ürün kalite puanı, fazladan çıktı, fazladan ömür. */
export const ALET_KALITE_PUANI: readonly number[] = [0, 5, 10, 20];
export const ALET_KALITE_VERIM: readonly number[] = [0, 0, 1, 2];
export const ALET_KALITE_OMUR: readonly number[] = [0, 1, 2, 3];
/** [PARAMETRE] Oyuncu pazarında adil değer çarpanı (pompa sınırı ve karşılaştırma dökümü; NPC fiyatı kaliteye bakmaz). */
export const KALITE_DEGER_CARPANI: readonly number[] = [1, 1.25, 1.6, 2.5];
/** [PARAMETRE] Mal başına tutulan en çok izli parti (fazlası en düşük kaliteden izsiz sadeye döner). */
export const KALITE_PARTI_EN_COK = 8;

export const kaliteMi = (v: unknown): v is Kalite => v === 0 || v === 1 || v === 2 || v === 3;

function partiler(k: Karakter, mal: string): KaliteParti[] {
  return k.kq?.[mal] ?? [];
}

function yaz(k: Karakter, mal: string, liste: KaliteParti[]): void {
  const temiz = liste.filter((p) => p[1] > 0 && (p[0] > 0 || p[2] !== undefined));
  temiz.sort((a, b) => b[0] - a[0] || ((a[2] ?? "") < (b[2] ?? "") ? -1 : 1));
  while (temiz.length > KALITE_PARTI_EN_COK) temiz.pop();
  if (temiz.length === 0) {
    if (k.kq) delete k.kq[mal];
    if (k.kq && Object.keys(k.kq).length === 0) delete k.kq;
  } else (k.kq ??= {})[mal] = temiz;
}

/** İzli partilerin toplamı envanteri aşarsa (eski yol `envanterEkle` eksiyle düştüyse) en düşük kaliteden kırpar. */
export function kaliteKirp(k: Karakter, mal: string): void {
  const liste = partiler(k, mal);
  if (liste.length === 0) return;
  let fazla = liste.reduce((a, p) => a + p[1], 0) - (k.ev?.[mal] ?? 0);
  if (fazla <= 0) return;
  const kopya = liste.map((p) => [...p] as KaliteParti);
  for (let i = kopya.length - 1; i >= 0 && fazla > 0; i--) {
    const d = Math.min(fazla, kopya[i]![1]);
    kopya[i]![1] -= d;
    fazla -= d;
  }
  yaz(k, mal, kopya);
}

/** Bu kalitede elde kaç adet var (sade: izsiz + izli sade). */
export function kaliteAdedi(k: Karakter, mal: string, q: Kalite): number {
  const liste = partiler(k, mal);
  const izli = liste.filter((p) => p[0] === q).reduce((a, p) => a + p[1], 0);
  if (q > 0) return izli;
  return (k.ev?.[mal] ?? 0) - liste.filter((p) => p[0] > 0).reduce((a, p) => a + p[1], 0);
}

/** Bu kalite ya da üstünde elde kaç adet var. */
export function enAzKaliteAdedi(k: Karakter, mal: string, q: Kalite): number {
  let n = 0;
  for (let x = q; x <= 3; x++) n += kaliteAdedi(k, mal, x as Kalite);
  return n;
}

/** Eldeki en iyi kalite (yoksa 0). */
export function enIyiKalite(k: Karakter, mal: string): Kalite {
  if ((k.ev?.[mal] ?? 0) <= 0) return 0;
  return (partiler(k, mal)[0]?.[0] ?? 0) as Kalite;
}

/** Belirli kalitede `adet` malı çıkarır (sadede önce izsiz); yetmezse hiçbir şey değişmez, null döner. */
export function kaliteliCikar(k: Karakter, mal: MalId, adet: number, q: Kalite): KaliteParti[] | null {
  if (!(adet > 0) || kaliteAdedi(k, mal, q) < adet) return null;
  const liste = partiler(k, mal).map((p) => [...p] as KaliteParti);
  const cikan: KaliteParti[] = [];
  let kalan = adet;
  if (q === 0) {
    const izsiz = (k.ev?.[mal] ?? 0) - liste.reduce((a, p) => a + p[1], 0);
    const d = Math.min(kalan, Math.max(0, izsiz));
    if (d > 0) cikan.push([0, d]);
    kalan -= d;
  }
  for (let i = liste.length - 1; i >= 0 && kalan > 0; i--) {
    const p = liste[i]!;
    if (p[0] !== q) continue;
    const d = Math.min(kalan, p[1]);
    p[1] -= d;
    kalan -= d;
    cikan.push(p[2] === undefined ? [q, d] : [q, d, p[2]]);
  }
  const ev = (k.ev ??= {});
  const yeni = (ev[mal] ?? 0) - adet;
  if (yeni > 0) ev[mal] = yeni;
  else delete ev[mal];
  yaz(k, mal, liste);
  return cikan;
}

/** Partileri envantere ekler (aynı kalite ve yapan birleşir). */
export function kaliteliEkle(k: Karakter, mal: MalId, gelen: readonly KaliteParti[]): void {
  const toplam = gelen.reduce((a, p) => a + Math.max(0, p[1]), 0);
  if (toplam <= 0) return;
  const ev = (k.ev ??= {});
  ev[mal] = (ev[mal] ?? 0) + toplam;
  const liste = partiler(k, mal).map((p) => [...p] as KaliteParti);
  for (const [q, n, yp] of gelen) {
    if (n <= 0 || (q === 0 && yp === undefined)) continue;
    const ayni = liste.find((p) => p[0] === q && p[2] === yp);
    if (ayni) ayni[1] += n;
    else liste.push(yp === undefined ? [q, n] : [q, n, yp]);
  }
  yaz(k, mal, liste);
}

/** Partilerin ilk (en çok adetli) yapanı (pazar ve levha izi). */
export function baslicaYapan(liste: readonly KaliteParti[]): string | undefined {
  let enIyi: KaliteParti | undefined;
  for (const p of liste) if (p[2] !== undefined && (!enIyi || p[1] > enIyi[1])) enIyi = p;
  return enIyi?.[2];
}

/** `kalite` etkisinin hedefi bir tarifin kimliği ya da grubu mu (bağlı etki; değilse kanca). */
export function kaliteHedefiMi(hedef: string): boolean {
  return Object.values(TARIFLER).some((t) => t.id === hedef || ("grup" in t && (t.grup as readonly string[]).includes(hedef)));
}

export interface KaliteSonucu {
  kademe: Kalite;
  ad: KaliteAdi;
  dokum: Dokum;
  /** Bir üst kademe için gereken puan (şaheserde null). */
  sonrakiEsik: number | null;
}

export function kademeBul(puan: number): Kalite {
  let q = 0;
  for (let i = 0; i < KALITE_ESIK.length; i++) if (puan >= KALITE_ESIK[i]!) q = i;
  return q as Kalite;
}

/**
 * Ürün kalitesi: döküm (kademe, zanaat, beceri, araç, zar) → kademe. `beceri`: tarifin kalite düğümü yüzdeleri
 * (tarif.ts `kaliteBecerisi`), `aracKalite`: kullanılan aracın kalitesi (araçsızsa null).
 */
export function urunKalitesi(k: Karakter, t: Tarif, beceri: number, aracKalite: Kalite | null, zar: Zar): KaliteSonucu {
  const kd = k.ms?.s[t.meslek]?.kd ?? 0;
  const kalemler = [
    { k: "kalite.kademe", d: KALITE_KADEME_PUANI[kd] ?? 0 },
    { k: "kalite.zanaat", d: Math.floor(Math.max(0, Math.min(100, k.be[3] ?? 0)) / KALITE_ZANAAT_BOLEN) },
    { k: "kalite.beceri", d: Math.min(KALITE_BECERI_TAVAN, Math.max(0, beceri)) },
  ];
  if (aracKalite !== null) kalemler.push({ k: "kalite.arac", d: ALET_KALITE_PUANI[aracKalite] ?? 0 });
  kalemler.push({ k: "kalite.zar", d: Math.floor(zar() * KALITE_ZAR) });
  const toplam = kalemler.reduce((a, x) => a + x.d, 0);
  const kademe = kademeBul(toplam);
  return { kademe, ad: KALITE_ADLARI[kademe], dokum: { toplam, kalemler }, sonrakiEsik: KALITE_ESIK[kademe + 1] ?? null };
}

/** Envanterin kalite görünümü: yalnız izli partisi olan mallar (adet, kalite adı, yapan). */
export function kaliteGorunumu(k: Karakter) {
  return Object.fromEntries(
    Object.entries(k.kq ?? {}).map(([mal, liste]) => [
      mal,
      liste.map(([q, adet, yapan]) => ({ kalite: KALITE_ADLARI[q], kademe: q, adet, yapan: yapan ?? null })),
    ]),
  );
}
