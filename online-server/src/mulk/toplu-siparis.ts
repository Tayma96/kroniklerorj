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
import { damgaliAdet, damgaliCikar, kaliteliEkle, kaliteMi, partiParca, type KaliteParti } from "../yerlesim/kalite.ts";
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
  /** Teslim edilen adet (kanca indirimiyle `adet`ten az olabilir; yoksa `adet`). */
  ti?: number;
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

/** Kanca indirimiyle teslim adedi: adet − ⌊adet × yüzde / 100⌋ (en az 1). Ödül değişmez (§7 Dilim 3). */
export function teslimAdedi(adet: number, indirimYuzde = 0): number {
  return Math.max(1, adet - Math.floor((adet * Math.max(0, indirimYuzde)) / 100));
}

/**
 * Teslim planı (denge, Dilim 3): kanca indirimi YALNIZ atölyenin kendi ürettiği (kendi damgasını taşıyan) partilerle
 * geçerlidir; depodaki damgalı mal indirimli adedi karşılamıyorsa tam adet istenir (damgasız mal karışmaz). Böylece
 * NPC stoğundan ya da pazardan alınan mal indirimle teslim edilip al-sat kârı doğuramaz (ödül/adet ≤ 1,4 × taban <
 * NPC stok fiyatı 1,5 × taban).
 */
export function teslimPlani(s: Pick<TopluSiparis, "adet" | "mal">, t: Tezgah, isletme: string, indirimYuzde = 0): { adet: number; indirimYuzde: number; damgali: boolean } {
  const ind = teslimAdedi(s.adet, indirimYuzde);
  if (ind < s.adet && damgaliAdet(t, s.mal, isletme) >= ind) return { adet: ind, indirimYuzde, damgali: true };
  return { adet: s.adet, indirimYuzde: 0, damgali: false };
}

/**
 * Teslim: atölye zanaatı siparişinki, depoda yeterli mal (her kalite; önce sade), üst üste değil. Mal depodan düşer.
 * `indirim`: sipariş zanaatına göre tavanlı kanca yüzdesi (mulk/kanca.ts topluIndirim); ödülü değiştirmez ve yalnız
 * atölye damgalı partilerle teslimde uygulanır (`teslimPlani`).
 */
export function topluTeslim(d: TopluDefter, idHam: unknown, isletme: string, ad: string, t: Tezgah, ay: number, indirim: (m: MeslekId) => number = () => 0): Sonuc<{ siparis: TopluSiparis; parti: KaliteParti[]; saOnce?: string; adet: number; indirimYuzde: number }> {
  const s = typeof idHam === "string" ? d.l.find((x) => x.id === idHam) : undefined;
  if (!s) return hata("siparis_yok");
  if (s.durum !== "acik" || ay >= s.son) return hata("siparis_kapandi");
  if (t.za !== s.meslek) return hata("zanaat_disi");
  if (d.sa === isletme) return hata("ust_uste");
  const plan = teslimPlani(s, t, isletme, indirim(s.meslek));
  const adet = plan.adet;
  let parti: KaliteParti[];
  if (plan.damgali) {
    const c = damgaliCikar(t, s.mal, adet, isletme);
    if (!c) return hata("mal_yok");
    parti = c;
  } else {
    const izliOnce = (t.kq?.[s.mal] ?? []).map((p) => [...p] as KaliteParti);
    if (!depodanDus(t, s.mal, adet)) return hata("mal_yok");
    parti = dusenPartiler(izliOnce, t.kq?.[s.mal] ?? [], adet);
  }
  const saOnce = d.sa;
  s.durum = "teslim";
  s.al = isletme;
  s.alAd = ad;
  s.ta = ay;
  if (adet < s.adet) s.ti = adet;
  d.sa = isletme;
  return basarili({ siparis: s, adet, indirimYuzde: plan.indirimYuzde, parti, ...(saOnce !== undefined ? { saOnce } : {}) });
}

/** Depodan düşen partiler (önce/sonra izli parti farkı; kalanı izsiz sade). */
function dusenPartiler(once: readonly KaliteParti[], sonra: readonly KaliteParti[], adet: number): KaliteParti[] {
  const cikan: KaliteParti[] = [];
  for (const p of once) {
    const k = sonra.find((x) => x[0] === p[0] && x[2] === p[2] && x[3] === p[3]);
    const d = p[1] - (k?.[1] ?? 0);
    if (d > 0) cikan.push(partiParca(p, d));
  }
  const izsiz = adet - cikan.reduce((a, p) => a + p[1], 0);
  if (izsiz > 0) cikan.unshift([0, izsiz]);
  return cikan;
}

/** Kayıttaki parti listesini doğrular (adet toplamı tutmalı); geçersizse yalnız sade adet (kalite uydurulmaz). */
export function partiCoz(ham: unknown, adet: number): KaliteParti[] {
  const sade: KaliteParti[] = [[0, adet]];
  if (!Array.isArray(ham)) return sade;
  const l: KaliteParti[] = [];
  for (const p of ham) {
    if (!Array.isArray(p) || !kaliteMi(p[0]) || !Number.isInteger(p[1]) || p[1] <= 0) return sade;
    if ((p[2] !== undefined && p[2] !== null && typeof p[2] !== "string") || (p[3] !== undefined && p[3] !== null && typeof p[3] !== "string")) return sade;
    l.push(partiParca([p[0], p[1], p[2] ?? undefined, p[3] ?? undefined], p[1]));
  }
  return l.reduce((a, p) => a + p[1], 0) === adet ? l : sade;
}

/**
 * Teslim kaydı işletmece reddedildi (ör. yansı gelmeden iflas): sipariş yeniden açılır, "son alan" eski değerine
 * döner, mal kayıttaki partilerle (eski kayıtta sade) depoya iade edilir. Sipariş listeden düştüyse yalnız mal döner.
 */
export function topluGeriAl(d: TopluDefter | undefined, y: Record<string, unknown>, isletme: string, depo: Pick<Tezgah, "ev" | "kq"> | undefined): { mal: MalId; parti: KaliteParti[] } | undefined {
  const s = d?.l.find((x) => x.id === y.siparis);
  if (!d || !s || s.durum !== "teslim" || s.al !== isletme) return undefined;
  const adet = s.ti ?? s.adet;
  s.durum = "acik";
  delete s.al;
  delete s.alAd;
  delete s.ta;
  delete s.ti;
  if (d.sa === isletme) {
    if (typeof y.saOnce === "string") d.sa = y.saOnce;
    else delete d.sa;
  }
  const parti = partiCoz(y.parti, adet);
  if (depo) kaliteliEkle(depo, s.mal, parti);
  return { mal: s.mal, parti };
}

export function topluGorunumu(d: TopluDefter | undefined, ay: number, benim?: { isletme: string; t: Tezgah; indirim?: (m: MeslekId) => number }) {
  return [...(d?.l ?? [])].reverse().map((s) => {
    const acik = s.durum === "acik" && ay < s.son;
    const depoda = benim ? (benim.t.ev?.[s.mal] ?? 0) : 0;
    const plan = benim ? teslimPlani(s, benim.t, benim.isletme, benim.indirim?.(s.meslek) ?? 0) : { adet: s.adet, indirimYuzde: 0 };
    const teslimAdet = plan.adet;
    const indirim = plan.indirimYuzde;
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
        ? { depoda, teslimAdet, indirimYuzde: indirim, teslimEdebilir: acik && benim.t.za === s.meslek && d?.sa !== benim.isletme && depoda >= teslimAdet, ustUste: d?.sa === benim.isletme }
        : {}),
    };
  });
}
