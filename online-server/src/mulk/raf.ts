// Dükkân rafı (tezgâh modeli §5.1): satır = mal + kalite + adet + birim fiyat. Satır sayısı seviyeye göre, satır
// başına adet sınırlı; fiyat pazarın adil bandında (0,5–3 × taban × kalite değer çarpanı). Depo ↔ raf aynı yazımda.
// Raf boşsa ay dönümünde kepenk kendiliğinden iner (tezgah-donum.ts). Saf fonksiyonlar.

import type { MalId } from "../icerik/mallar.ts";
import { kaliteliCikar, kaliteliEkle, kaliteAdedi, KALITE_ADLARI, type Kalite, type KaliteParti } from "../yerlesim/kalite.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { partiBirlestir, partiCikar, partiToplam, type RafSatiri, type Tezgah } from "./depo.ts";
import { adil, cekicilik, npcTavani } from "./hane-butcesi.ts";
import { RAF_FIYAT_ALT, RAF_FIYAT_UST, RAF_SATIR, RAF_SATIR_ADET } from "./tezgah-kurallar.ts";

export function rafSatirSiniri(seviye: number): number {
  return RAF_SATIR[Math.max(0, Math.min(RAF_SATIR.length - 1, seviye))]!;
}

/** Fiyat bandı (birim): adil × [alt, üst], en az 1. */
export function fiyatBandi(mal: MalId, q: Kalite): { alt: number; ust: number } {
  const a = adil(mal, q);
  return { alt: Math.max(1, Math.floor(a * RAF_FIYAT_ALT)), ust: Math.max(1, Math.ceil(a * RAF_FIYAT_UST)) };
}

export function fiyatGecerli(mal: MalId, q: Kalite, f: unknown): f is number {
  if (!Number.isInteger(f)) return false;
  const b = fiyatBandi(mal, q);
  return (f as number) >= b.alt && (f as number) <= b.ust;
}

export function rafAdedi(s: RafSatiri): number {
  return partiToplam(s.p);
}

export function rafBos(t: Tezgah): boolean {
  return !t.r.some((s) => rafAdedi(s) > 0);
}

export function satirBul(t: Tezgah, n: unknown): RafSatiri | undefined {
  return Number.isInteger(n) ? t.r.find((s) => s.n === n) : undefined;
}

/** Depo → raf. Aynı mal + kalite satırı varsa ona eklenir (fiyat verilirse güncellenir); yoksa yeni satır (fiyat şart). */
export function rafaKoy(t: Tezgah, mal: MalId, q: Kalite, adet: number, fiyat: unknown, seviye: number, ek: { satir: number; adet: number } = { satir: 0, adet: 0 }): Sonuc<{ satir: RafSatiri }> {
  let s = t.r.find((x) => x.m === mal && x.q === q);
  if (fiyat !== undefined && !fiyatGecerli(mal, q, fiyat)) return hata("fiyat_bant_disi");
  if (!s) {
    if (fiyat === undefined) return hata("fiyat_gecersiz");
    if (t.r.length >= rafSatirSiniri(seviye) + ek.satir) return hata("raf_dolu");
  }
  if ((s ? rafAdedi(s) : 0) + adet > RAF_SATIR_ADET + ek.adet) return hata("raf_satir_dolu");
  if (kaliteAdedi(t, mal, q) < adet) return hata("mal_yok");
  const p = kaliteliCikar(t, mal, adet, q)!;
  if (!s) {
    s = { n: ++t.n, m: mal, q, p: [], f: fiyat as number };
    t.r.push(s);
  } else if (fiyat !== undefined) s.f = fiyat as number;
  partiBirlestir(s.p, p);
  return basarili({ satir: s });
}

/** Raf → depo (kapasite denetimi çağıranda). Satır boşalırsa kalkar. */
export function raftanAl(t: Tezgah, s: RafSatiri, adet: number): Sonuc<{ partiler: KaliteParti[] }> {
  const p = partiCikar(s.p, adet);
  if (!p) return hata("mal_yok");
  kaliteliEkle(t, s.m, p);
  if (rafAdedi(s) === 0) t.r = t.r.filter((x) => x !== s);
  return basarili({ partiler: p });
}

/** Satırdan satış (oyuncu ya da NPC): çıkan partiler döner; satır boşalırsa kalkar. */
export function raftanSat(t: Tezgah, s: RafSatiri, adet: number): KaliteParti[] | null {
  const p = partiCikar(s.p, adet);
  if (!p) return null;
  if (rafAdedi(s) === 0) t.r = t.r.filter((x) => x !== s);
  return p;
}

/** Satır görünümü: fiyat bandı, NPC tavanı ve bu fiyatın çarpanları (itibar verilirse). */
export function satirGorunumu(s: RafSatiri, itibar?: number) {
  const yapan = s.p.find((p) => p[2] !== undefined)?.[2];
  return {
    satir: s.n,
    mal: s.m,
    kalite: s.q,
    kaliteAdi: KALITE_ADLARI[s.q],
    adet: rafAdedi(s),
    fiyat: s.f,
    bant: fiyatBandi(s.m, s.q),
    npcTavan: npcTavani(s.m, s.q),
    adil: adil(s.m, s.q),
    ...(yapan ? { yapan } : {}),
    ...(itibar !== undefined ? { cekicilik: cekicilik(s.m, s.q, s.f, itibar) } : {}),
  };
}
