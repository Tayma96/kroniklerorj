// Hane bütçesi (tezgâh modeli §5.2) ve han yolcu havuzu (§5.3): yerleşimin sınırlı NPC talebini raflar ve hanlar
// arasında çekicilikle paylaştıran saf hesap. Rastgelelik yoktur; sıra sabittir (mal kataloğu sırası, dükkân kimliği,
// satır no), bu yüzden aynı girdi her zaman aynı sonucu verir (tekrar güvenli, kaçan aylar sırayla işlenebilir).
//
// Değişmez: bir maldan harcanan ≤ b_mal; yerleşimde NPC'nin dükkânlara harcadığı toplam ≤ ΣB (dükkân sayısı akçe
// basmaz). Han payları toplamı ≤ Y. Her satır neden kodu ve F/Q/R/H çarpanlarıyla döner (gizli sayı yok).

import type { YerlesimTuru } from "../dunya-veri.ts";
import { MALLAR, MAL_IDLERI, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { KALITE_DEGER_CARPANI, type Kalite } from "../yerlesim/kalite.ts";
import { KALITE_GELIR_YUZDE, NPC_GELIR_TAVAN } from "./kurallar.ts";
import {
  F_ALT,
  F_US,
  F_UST,
  HANE_BUTCESI,
  H_TAVAN_YUZDE,
  KITLIK_BUTCE_CARPANI,
  NPC_HAN_CEKICILIK,
  NPC_TAVAN_CARPANI,
  PAY_YONTEMI,
  Q_CARPANI,
  R_BOLEN,
  R_TABAN,
  URETICI_MESLEKLER,
  YOLCU_BUTCESI,
  YOLCU_FIYAT_US,
  YOLCU_TAVAN_CARPANI,
  type PayYontemi,
} from "./tezgah-kurallar.ts";

/** Satırın NPC'ye satılamama/az satılma nedeni (gün sonu dökümü). */
export type Neden = "butce" | "stok" | "tavan" | "rakip" | "seviyeTavani";
/** Meslek düzeyi: rafta hiç malı yoksa bütçe "kimse satmadı" diye yanar. */
export type MeslekNedeni = "kimseSatmadi" | "satildi";

export interface TalepSatiri {
  /** Eşsiz satır anahtarı ("<işletme>#<no>"), dükkân kimliği, mal, kalite, rafta adet, birim fiyat. */
  id: string;
  dukkan: string;
  mal: MalId;
  q: Kalite;
  adet: number;
  fiyat: number;
  /** H girdisi: beceri/hizmet etkisi yüzdesi (Dilim 1'de 0). */
  hYuzde?: number;
}

export interface Dukkan {
  id: string;
  itibar: number;
  /** Bu ay kalan NPC hasılat tavanı (seviye tavanı). */
  tavan: number;
}

export interface Carpanlar {
  F: number;
  Q: number;
  R: number;
  H: number;
}

export interface SatirSonucu {
  id: string;
  dukkan: string;
  mal: MalId;
  q: Kalite;
  fiyat: number;
  /** Satılan adet ve hasılat; satıştan sonra rafta kalan. */
  adet: number;
  hasilat: number;
  kalan: number;
  /** Pay (0–1) ve çarpanları; çekicilik a = F × Q × R × H. */
  pay: number;
  a: number;
  carpan: Carpanlar;
  /** Bu malın o ayki bütçesi ve NPC fiyat tavanı. */
  bMal: number;
  npcTavan: number;
  neden: Neden;
}

export interface MeslekOzeti {
  meslek: MeslekId;
  B: number;
  kitlik: boolean;
  malSayisi: number;
  harcanan: number;
  neden: MeslekNedeni;
}

export interface TalepSonucu {
  yontem: PayYontemi;
  satirlar: SatirSonucu[];
  meslekler: MeslekOzeti[];
  /** ΣB ve NPC'nin dükkânlara harcadığı toplam (≤ ΣB). */
  butce: number;
  harcanan: number;
}

const yuvarla = (x: number, b = 4) => Math.round(x * 10 ** b) / 10 ** b;

/** Malın adil birimi taban × kalite değer çarpanı (kç). */
export function adil(mal: MalId, q: Kalite): number {
  return MALLAR[mal].taban * (KALITE_DEGER_CARPANI[q] ?? 1);
}

/** NPC fiyat tavanı (birim; aşan satır NPC'ye satmaz). */
export function npcTavani(mal: MalId, q: Kalite): number {
  return Math.floor(NPC_TAVAN_CARPANI * adil(mal, q) + 1e-9);
}

/** H çarpanı: 1 + toplam% (tavanlı). Dilim 1'de kancalar boştur. */
export function hCarpani(yuzde = 0): number {
  return 1 + Math.max(0, Math.min(H_TAVAN_YUZDE, yuzde)) / 100;
}

/** Satır çekiciliği ve çarpanları (döküm). */
export function cekicilik(mal: MalId, q: Kalite, fiyat: number, itibar: number, hYuzde = 0): Carpanlar & { a: number } {
  const oran = Math.max(F_ALT, Math.min(F_UST, adil(mal, q) / Math.max(1, fiyat)));
  const F = yuvarla(oran ** F_US);
  const Q = Q_CARPANI[q] ?? 1;
  const R = yuvarla(R_TABAN + Math.max(0, itibar) / R_BOLEN);
  const H = hCarpani(hYuzde);
  return { F, Q, R, H, a: yuvarla(F * Q * R * H, 6) };
}

/** Meslek başına aylık bütçe B; o meslekte yerleşimde yaşayan oyuncu yoksa kıtlık çarpanı. */
export function meslekButcesi(tur: YerlesimTuru, oyuncuSayisi: (m: MeslekId) => number): Map<MeslekId, { B: number; kitlik: boolean }> {
  const s = new Map<MeslekId, { B: number; kitlik: boolean }>();
  for (const m of URETICI_MESLEKLER) {
    const kitlik = oyuncuSayisi(m) <= 0;
    s.set(m, { B: Math.floor(HANE_BUTCESI[tur] * (kitlik ? KITLIK_BUTCE_CARPANI : 1)), kitlik });
  }
  return s;
}

const MAL_SIRA = new Map(MAL_IDLERI.map((m, i) => [m, i]));

/**
 * Yerleşimin bütün raf satırları için NPC talebini çözer. `satirlar`: rafta adedi olan satırlar (sıra önemsiz;
 * içeride sabitlenir). `dukkanlar`: itibar ve bu ay kalan seviye tavanı. Saf; girdileri değiştirmez.
 */
export function talepCoz(
  tur: YerlesimTuru,
  satirlar: readonly TalepSatiri[],
  dukkanlar: ReadonlyMap<string, Dukkan>,
  oyuncuSayisi: (m: MeslekId) => number,
  yontem: PayYontemi = PAY_YONTEMI,
): TalepSonucu {
  const butceler = meslekButcesi(tur, oyuncuSayisi);
  const sirali = satirlar
    .filter((s) => s.adet > 0 && MALLAR[s.mal].taban > 0 && dukkanlar.has(s.dukkan))
    .sort((a, b) => (MAL_SIRA.get(a.mal)! - MAL_SIRA.get(b.mal)!) || (a.dukkan < b.dukkan ? -1 : a.dukkan > b.dukkan ? 1 : 0) || (a.id < b.id ? -1 : 1));
  // Meslek başına rafta bulunan, NPC'ye gerçekten satılabilir (fiyat ≤ NPC tavanı) farklı mal sayısı: B bunlar
  // arasında eşit bölünür. Tavan üstü satır bütçeyi sulandırmaz.
  const malMeslek = new Map<MeslekId, Set<MalId>>();
  for (const s of sirali) {
    if (s.fiyat > npcTavani(s.mal, s.q)) continue;
    const m = MALLAR[s.mal].meslek;
    if (!malMeslek.has(m)) malMeslek.set(m, new Set());
    malMeslek.get(m)!.add(s.mal);
  }
  const kalanTavan = new Map([...dukkanlar].map(([id, d]) => [id, Math.max(0, d.tavan)]));
  const sonuc: SatirSonucu[] = [];
  const harcananMeslek = new Map<MeslekId, number>();
  const mallar = [...new Set(sirali.map((s) => s.mal))];
  for (const mal of mallar) {
    const meslek = MALLAR[mal].meslek;
    const B = butceler.get(meslek)?.B ?? 0;
    const bMal = Math.floor(B / Math.max(1, malMeslek.get(meslek)?.size ?? 1));
    const grup = sirali.filter((s) => s.mal === mal);
    const r = malCoz(grup, bMal, dukkanlar, kalanTavan, yontem);
    harcananMeslek.set(meslek, (harcananMeslek.get(meslek) ?? 0) + r.reduce((t, x) => t + x.hasilat, 0));
    sonuc.push(...r);
  }
  const meslekler: MeslekOzeti[] = URETICI_MESLEKLER.map((m) => {
    const b = butceler.get(m)!;
    const n = malMeslek.get(m)?.size ?? 0;
    return { meslek: m, B: b.B, kitlik: b.kitlik, malSayisi: n, harcanan: harcananMeslek.get(m) ?? 0, neden: n > 0 ? "satildi" : "kimseSatmadi" };
  });
  return {
    yontem,
    satirlar: sonuc,
    meslekler,
    butce: meslekler.reduce((t, m) => t + m.B, 0),
    harcanan: sonuc.reduce((t, x) => t + x.hasilat, 0),
  };
}

/** Tek malın satırları: iki aşama (pay; stok/tavan yetmeyenin kullanmadığı pay bir kez kalanlara), artan yanar. */
function malCoz(grup: readonly TalepSatiri[], bMal: number, dukkanlar: ReadonlyMap<string, Dukkan>, kalanTavan: Map<string, number>, yontem: PayYontemi): SatirSonucu[] {
  const n = grup.length;
  const ic = grup.map((s) => {
    const c = cekicilik(s.mal, s.q, s.fiyat, dukkanlar.get(s.dukkan)!.itibar, s.hYuzde ?? 0);
    const tavan = npcTavani(s.mal, s.q);
    return { s, c, tavan, uygun: s.fiyat <= tavan, adet: 0, hak: 0, kisit: false as boolean, tavanDoldu: false as boolean };
  });
  const uygun = ic.filter((x) => x.uygun);
  const toplamA = uygun.reduce((t, x) => t + x.c.a, 0);
  const birim = (x: (typeof ic)[number]) => (yontem === "adet" ? adil(x.s.mal, x.s.q) : x.s.fiyat);
  // Satırın alabileceği adet: hak (akçe) → adet (bütçe: fiyatla; adet talebi: adil birimle), stok ve dükkân tavanıyla.
  const al = (x: (typeof ic)[number], hak: number) => {
    const talep = Math.floor(hak / Math.max(1, birim(x)) + 1e-9);
    const stok = x.s.adet - x.adet;
    const tavanAdet = Math.floor((kalanTavan.get(x.s.dukkan) ?? 0) / x.s.fiyat);
    const d = Math.max(0, Math.min(talep, stok, tavanAdet));
    if (d < talep) {
      x.kisit = true;
      if (tavanAdet < Math.min(talep, stok)) x.tavanDoldu = true;
    }
    x.adet += d;
    kalanTavan.set(x.s.dukkan, (kalanTavan.get(x.s.dukkan) ?? 0) - d * x.s.fiyat);
    return d;
  };
  let harcanan = 0;
  if (toplamA > 0 && bMal > 0) {
    for (const x of uygun) {
      x.hak = (bMal * x.c.a) / toplamA;
      harcanan += al(x, x.hak) * x.s.fiyat;
    }
    // Adet talebi biçiminde fiyat adilden yüksekse harcama b_mal'ı aşabilir: en pahalı orandan birer adet geri.
    while (harcanan > bMal) {
      const enPahali = uygun.filter((x) => x.adet > 0).sort((a, b) => b.s.fiyat / birim(b) - a.s.fiyat / birim(a))[0]!;
      enPahali.adet--;
      enPahali.kisit = true;
      kalanTavan.set(enPahali.s.dukkan, (kalanTavan.get(enPahali.s.dukkan) ?? 0) + enPahali.s.fiyat);
      harcanan -= enPahali.s.fiyat;
    }
    // İkinci aşama: kısıtlı satırların kullanmadığı pay (akçe) kısıtsızlara çekicilikle bir kez dağıtılır.
    const artik = uygun.filter((x) => x.kisit).reduce((t, x) => t + Math.max(0, x.hak - x.adet * x.s.fiyat), 0);
    const kalanlar = uygun.filter((x) => !x.kisit && x.adet < x.s.adet);
    const kalanA = kalanlar.reduce((t, x) => t + x.c.a, 0);
    if (artik > 0 && kalanA > 0) {
      for (const x of kalanlar) {
        // Kalan bütçe tavanı: b_mal aşılmaz.
        const pay = Math.min((artik * x.c.a) / kalanA + (x.hak - x.adet * x.s.fiyat), bMal - harcanan);
        if (pay <= 0) continue;
        const ek = Math.min(Math.floor(pay / x.s.fiyat + 1e-9), x.s.adet - x.adet, Math.floor((kalanTavan.get(x.s.dukkan) ?? 0) / x.s.fiyat));
        if (ek <= 0) continue;
        x.adet += ek;
        kalanTavan.set(x.s.dukkan, (kalanTavan.get(x.s.dukkan) ?? 0) - ek * x.s.fiyat);
        harcanan += ek * x.s.fiyat;
      }
    }
  }
  return ic.map((x) => {
    const pay = x.uygun && toplamA > 0 ? x.c.a / toplamA : 0;
    const neden: Neden = !x.uygun ? "tavan" : x.adet >= x.s.adet ? "stok" : x.tavanDoldu ? "seviyeTavani" : n > 1 && pay < 1 / n ? "rakip" : "butce";
    return {
      id: x.s.id,
      dukkan: x.s.dukkan,
      mal: x.s.mal,
      q: x.s.q,
      fiyat: x.s.fiyat,
      adet: x.adet,
      hasilat: x.adet * x.s.fiyat,
      kalan: x.s.adet - x.adet,
      pay: yuvarla(pay),
      a: x.c.a,
      carpan: { F: x.c.F, Q: x.c.Q, R: x.c.R, H: x.c.H },
      bMal,
      npcTavan: x.tavan,
      neden,
    };
  });
}

// ── Han yolcu havuzu (§5.3) ──

export interface YolcuHani {
  no: number;
  /** null: NPC hanı (sahipsiz 1. han; sabit çekicilik, payı yanar). */
  isletme: string | null;
  fc: number;
  /** Kalite toplamı (kademe), işletme itibarı, seviye sırası. */
  kalite: number;
  itibar: number;
  seviye: number;
  hYuzde?: number;
}

export interface YolcuPayi {
  no: number;
  isletme: string | null;
  a: number;
  carpan: { F: number; K: number; R: number; H: number };
  pay: number;
  /** Paydan düşen (Y × pay) ve tavanlı tutar (akçe; NPC hanında yanar). */
  hak: number;
  tutar: number;
  tavan: number;
}

export interface YolcuSonucu {
  Y: number;
  hanlar: YolcuPayi[];
  /** Oyuncu hanlarına giden toplam (≤ Y). */
  dagitilan: number;
}

/** Açık hanlar yerleşimin Y bütçesini çekicilikle paylaşır; han başına seviye tavanı sürer. */
export function yolcuCoz(tur: YerlesimTuru, hanlar: readonly YolcuHani[]): YolcuSonucu {
  const Y = YOLCU_BUTCESI[tur];
  const ic = [...hanlar]
    .sort((a, b) => a.no - b.no)
    .map((h) => {
      if (h.isletme === null) return { h, carpan: { F: 1, K: 1, R: 1, H: 1 }, a: NPC_HAN_CEKICILIK };
      const F = yuvarla((100 / Math.max(1, h.fc)) ** YOLCU_FIYAT_US);
      const K = yuvarla(1 + (h.kalite * KALITE_GELIR_YUZDE) / 100);
      const R = yuvarla(R_TABAN + Math.max(0, h.itibar) / R_BOLEN);
      const H = hCarpani(h.hYuzde ?? 0);
      return { h, carpan: { F, K, R, H }, a: yuvarla(F * K * R * H, 6) };
    });
  const toplamA = ic.reduce((t, x) => t + x.a, 0);
  const sonuc = ic.map((x): YolcuPayi => {
    const pay = toplamA > 0 ? x.a / toplamA : 0;
    const hak = Math.floor(Y * pay + 1e-9);
    const tavan = x.h.isletme === null ? hak : Math.floor((NPC_GELIR_TAVAN[x.h.seviye] ?? NPC_GELIR_TAVAN[0]!) * YOLCU_TAVAN_CARPANI[tur]);
    return { no: x.h.no, isletme: x.h.isletme, a: x.a, carpan: x.carpan, pay: yuvarla(pay), hak, tutar: Math.min(hak, tavan), tavan };
  });
  return { Y, hanlar: sonuc, dagitilan: sonuc.filter((x) => x.isletme !== null).reduce((t, x) => t + x.tutar, 0) };
}
