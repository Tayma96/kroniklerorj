// Toplu sipariş (tezgâh modeli Dilim 2, §6): lonca siparişinin atölye boyu. Yerleşimde aynı anda en çok bir açık
// sipariş, ay dönümünde (açık yoksa) atölyesi olan zanaatlar arasında dönüşümlü açılır; mal o zanaatın bir tarif
// çıktısıdır, taban değeri (adet × taban) ≤ TOPLU_DEGER_EN_COK, ödül ⌈değer × TOPLU_ODUL_CARPANI⌉ (≤ 84). Yalnız o
// zanaattaki bir atölyenin DEPOSUNDAN teslim edilir; ilk teslim eden atölye alır, aynı atölye üst üste iki siparişi
// alamaz. Ödül lonca siparişi gibi kasabadan (NPC) gelir ve atölye kasasına "tezgah" kaydıyla gider. Saf.

import { MALLAR, type MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { TARIFLER } from "../icerik/tarifler.ts";
import { dizinSec, tohumlu } from "../yerlesim/rastgele.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { depodanDus } from "./atolye.ts";
import type { Tezgah } from "./depo.ts";
import { TOPLU_DEGER_EN_COK, TOPLU_ODUL_CARPANI, TOPLU_SURE, TOPLU_TUTMA_AY } from "./tezgah-kurallar.ts";

export interface TopluSiparis {
  /** "t<ay>". */
  id: string;
  meslek: MeslekId;
  mal: MalId;
  adet: number;
  /** Taban değer (adet × taban) ve ödül. */
  deger: number;
  odul: number;
  acilis: number;
  /** Bu ay ve sonrasında kapalı. */
  son: number;
  durum: "acik" | "teslim" | "dustu";
  /** Teslim eden atölye, adı ve ay. */
  al?: string;
  alAd?: string;
  ta?: number;
}

export interface TopluDefter {
  l: TopluSiparis[];
  /** Son açılan siparişin zanaatı (dönüşüm sırası) ve son teslim alan atölye (üst üste kuralı). */
  sm?: MeslekId;
  sa?: string;
}

/** Zanaatın toplu siparişe uygun malları: tarif çıktısı, 0 < taban ≤ değer tavanı (tekrarsız, sıralı). */
export function topluMallari(meslek: MeslekId): MalId[] {
  const l = Object.values(TARIFLER)
    .filter((t) => t.meslek === meslek)
    .map((t) => t.cikti[0] as MalId)
    .filter((m) => MALLAR[m].taban > 0 && MALLAR[m].taban <= TOPLU_DEGER_EN_COK);
  return [...new Set(l)].sort();
}

/** Sipariş tutarları: adet = ⌊tavan / taban⌋, değer = adet × taban, ödül = ⌈değer × çarpan⌉. */
export function topluTutar(mal: MalId): { adet: number; deger: number; odul: number } {
  const taban = MALLAR[mal].taban;
  const adet = Math.max(1, Math.floor(TOPLU_DEGER_EN_COK / taban));
  const deger = adet * taban;
  return { adet, deger, odul: Math.ceil(deger * TOPLU_ODUL_CARPANI) };
}

/** Ay dönümü: süresi dolan düşer, eskiler temizlenir; açık yoksa sıradaki zanaat için yenisi açılır. */
export function topluDonumu(d: TopluDefter, yerlesim: string, ay: number, zanaatlar: readonly MeslekId[]): { acilan?: TopluSiparis; dusen: TopluSiparis[] } {
  const dusen: TopluSiparis[] = [];
  for (const s of d.l) {
    if (s.durum === "acik" && ay >= s.son) {
      s.durum = "dustu";
      dusen.push(s);
    }
  }
  d.l = d.l.filter((s) => s.durum === "acik" || ay - (s.ta ?? s.son) < TOPLU_TUTMA_AY);
  if (d.l.some((s) => s.durum === "acik")) return { dusen };
  const sirali = [...new Set(zanaatlar)].filter((m) => topluMallari(m).length > 0).sort();
  if (!sirali.length) return { dusen };
  const sonraki = sirali.find((m) => d.sm === undefined || m > d.sm) ?? sirali[0]!;
  const mallar = topluMallari(sonraki);
  const mal = mallar[dizinSec(mallar.length, tohumlu("toplu", yerlesim, ay))]!;
  const tt = topluTutar(mal);
  const s: TopluSiparis = { id: `t${ay}`, meslek: sonraki, mal, adet: tt.adet, deger: tt.deger, odul: tt.odul, acilis: ay, son: ay + TOPLU_SURE, durum: "acik" };
  d.l.push(s);
  d.sm = sonraki;
  return { acilan: s, dusen };
}

/** Teslim: atölye zanaatı siparişinki, depoda yeterli mal (her kalite; önce sade), üst üste değil. Mal depodan düşer. */
export function topluTeslim(d: TopluDefter, idHam: unknown, isletme: string, ad: string, t: Tezgah, ay: number): Sonuc<{ siparis: TopluSiparis }> {
  const s = typeof idHam === "string" ? d.l.find((x) => x.id === idHam) : undefined;
  if (!s) return hata("siparis_yok");
  if (s.durum !== "acik" || ay >= s.son) return hata("siparis_kapandi");
  if (t.za !== s.meslek) return hata("zanaat_disi");
  if (d.sa === isletme) return hata("ust_uste");
  if (!depodanDus(t, s.mal, s.adet)) return hata("mal_yok");
  s.durum = "teslim";
  s.al = isletme;
  s.alAd = ad;
  s.ta = ay;
  d.sa = isletme;
  return basarili({ siparis: s });
}

export function topluGorunumu(d: TopluDefter | undefined, ay: number, benim?: { isletme: string; t: Tezgah }) {
  return [...(d?.l ?? [])].reverse().map((s) => {
    const acik = s.durum === "acik" && ay < s.son;
    const depoda = benim ? (benim.t.ev?.[s.mal] ?? 0) : 0;
    return {
      id: s.id,
      meslek: s.meslek,
      mal: s.mal,
      adet: s.adet,
      deger: s.deger,
      odul: s.odul,
      odulDokum: { toplam: s.odul, kalemler: [{ k: "taban", d: s.deger }, { k: "toplu_carpani", d: s.odul - s.deger }] },
      acilis: s.acilis,
      son: s.son,
      kalanAy: Math.max(0, s.son - ay),
      durum: s.durum,
      alan: s.al ? { isletme: s.al, ad: s.alAd ?? "", ay: s.ta ?? null } : null,
      ...(benim
        ? { depoda, teslimEdebilir: acik && benim.t.za === s.meslek && d?.sa !== benim.isletme && depoda >= s.adet, ustUste: d?.sa === benim.isletme }
        : {}),
    };
  });
}
