// Sezon Defteri (GDD §19): her sezon kozmetik ödüllü bir iz; bedava iz küçük, ücretli iz tam set verir. İlerleme
// oynayarak gelir (başarılı oyun yazmaları); günlük tavan ve istekNo izi ile farm edilemez. Ödüller yalnız kozmetiktir
// ve kazanılınca kalıcıdır. Bitiş tarihi düz yazı verilir (sayaç baskısı yok). Saf fonksiyonlar.

import type { GunlukSayac } from "../yonetim/sikayet.ts";
import { trGunu } from "../yonetim/sikayet.ts";
import type { UrunId } from "./katalog.ts";

/** [PARAMETRE] Sezon uzunluğu (gün), ilk sezonun başlangıcı (TR pazartesi 00:00), seviye puanı, en yüksek seviye. */
export const SEZON_GUN = 28;
export const SEZON_BASLANGIC = Date.UTC(2026, 10, 1, 21, 0, 0);
export const SEZON_SEVIYE_PUANI = 100;
export const SEZON_EN_YUKSEK = 20;
/** [PARAMETRE] Günlük sezon puanı tavanı (≈ 1,5 seviye/gün: iz ~2 haftalık düzenli oyunla dolar, farmla hızlanmaz). */
export const SEZON_GUNLUK_TAVAN = 150;
/** [PARAMETRE] Başarılı yazma başına sezon puanı (HesapDO iletinin adıyla bakar; listede olmayan puan vermez). */
export const SEZON_KAYNAK_PUANI: Readonly<Record<string, number>> = {
  eylem: 10,
  temelIs: 10,
  tarif: 15,
  sat: 5,
  siparisTeslim: 25,
  ismarlamaCevap: 15,
  pazarIslem: 10,
  teklifCevap: 10,
  ucgen: 10,
  hanEylem: 10,
  hanIkram: 10,
};
/** [PARAMETRE] İdempotentlik için tutulan son istek izleri. */
export const SEZON_IZ_EN_COK = 64;

export type Iz = "bedava" | "ucretli";

/** [PARAMETRE] Ödül şablonu (seviye → ürün). Bedava iz 4 ödül, ücretli iz 8 ödül. */
export const SEZON_ODULLERI: readonly { seviye: number; iz: Iz; urun: UrunId }[] = [
  { seviye: 2, iz: "bedava", urun: "sezon_nisan" },
  { seviye: 6, iz: "bedava", urun: "sezon_balon" },
  { seviye: 12, iz: "bedava", urun: "sezon_masa" },
  { seviye: 20, iz: "bedava", urun: "sezon_sancak" },
  { seviye: 1, iz: "ucretli", urun: "sezon_cerceve" },
  { seviye: 4, iz: "ucretli", urun: "sezon_afis" },
  { seviye: 8, iz: "ucretli", urun: "sezon_kaftan" },
  { seviye: 10, iz: "ucretli", urun: "sezon_arma" },
  { seviye: 14, iz: "ucretli", urun: "cerceve_yaldizli" },
  { seviye: 16, iz: "ucretli", urun: "balon_ipek" },
  { seviye: 18, iz: "ucretli", urun: "masa_mum" },
  { seviye: 20, iz: "ucretli", urun: "anons_davul" },
];

export interface SezonKaydi {
  /** Sezon numarası. */
  n: number;
  /** Puan. */
  p: number;
  /** Günlük sayaç (n = bugün kazanılan puan). */
  g: GunlukSayac;
  /** Ücretli iz: alındığı mağaza işlem kimliği. */
  u?: string;
  /** Son istek izleri (aynı istek iki kez puan vermez). */
  iz: string[];
}

const SEZON_MS = SEZON_GUN * 24 * 60 * 60 * 1000;

export function sezonNo(simdi: number): number {
  return Math.max(0, Math.floor((simdi - SEZON_BASLANGIC) / SEZON_MS));
}

export function sezonBaslangici(n: number): number {
  return SEZON_BASLANGIC + n * SEZON_MS;
}

export function sezonBitisi(n: number): number {
  return sezonBaslangici(n + 1);
}

export function sezonSeviyesi(p: number): number {
  return Math.min(SEZON_EN_YUKSEK, Math.floor(p / SEZON_SEVIYE_PUANI));
}

/** Bu sezonun kaydı (sezon döndüyse yenisi; eski sezonun kazanılmış ödülleri zaten kalıcıdır). */
export function sezonKaydi(sz: SezonKaydi | undefined, simdi: number): SezonKaydi {
  const n = sezonNo(simdi);
  if (sz && sz.n === n) return sz;
  return { n, p: 0, g: { gun: trGunu(simdi), n: 0 }, iz: [] };
}

/** `once` (dahil değil) ile `sonra` (dahil) arasındaki seviyelerin ödülleri. */
export function yeniOduller(once: number, sonra: number, ucretli: boolean): { seviye: number; iz: Iz; urun: UrunId }[] {
  return SEZON_ODULLERI.filter((o) => o.seviye > once && o.seviye <= sonra && (o.iz === "bedava" || ucretli));
}

/**
 * Oyun yazması başarılı oldu: sezon puanı eklenir (günlük tavanlı; aynı iz iki kez sayılmaz). Kazanılan yeni
 * ödülleri döndürür (çağıran sahipliğe yazar). `sz` yerinde değişir.
 */
export function sezonIlerle(sz: SezonKaydi, kaynak: string, iz: string, simdi: number): { eklenen: number; oduller: { seviye: number; iz: Iz; urun: UrunId }[] } {
  const puan = Object.hasOwn(SEZON_KAYNAK_PUANI, kaynak) ? SEZON_KAYNAK_PUANI[kaynak]! : 0;
  if (puan <= 0 || sz.iz.includes(iz)) return { eklenen: 0, oduller: [] };
  const gun = trGunu(simdi);
  if (sz.g.gun !== gun) sz.g = { gun, n: 0 };
  const eklenen = Math.max(0, Math.min(puan, SEZON_GUNLUK_TAVAN - sz.g.n));
  sz.iz.push(iz);
  if (sz.iz.length > SEZON_IZ_EN_COK) sz.iz.splice(0, sz.iz.length - SEZON_IZ_EN_COK);
  if (eklenen === 0) return { eklenen: 0, oduller: [] };
  const once = sezonSeviyesi(sz.p);
  sz.p += eklenen;
  sz.g.n += eklenen;
  return { eklenen, oduller: yeniOduller(once, sezonSeviyesi(sz.p), sz.u !== undefined) };
}

export function sezonGorunumu(sz: SezonKaydi, simdi: number, sahip: (u: UrunId) => boolean) {
  const seviye = sezonSeviyesi(sz.p);
  const gun = trGunu(simdi);
  return {
    sezon: sz.n,
    baslangic: sezonBaslangici(sz.n),
    bitis: sezonBitisi(sz.n),
    puan: sz.p,
    seviye,
    enYuksek: SEZON_EN_YUKSEK,
    seviyePuani: SEZON_SEVIYE_PUANI,
    bugun: { kazanilan: sz.g.gun === gun ? sz.g.n : 0, tavan: SEZON_GUNLUK_TAVAN },
    ucretli: sz.u !== undefined,
    kaynaklar: SEZON_KAYNAK_PUANI,
    oduller: SEZON_ODULLERI.map((o) => ({ ...o, acik: o.seviye <= seviye && (o.iz === "bedava" || sz.u !== undefined), sahip: sahip(o.urun) })),
  };
}
