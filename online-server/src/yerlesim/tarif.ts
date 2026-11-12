// Tarif ve alet aşınması (ana tasarım §5.4–5.5, dikey dilim E2). Usta iş: açık düğüm seviyesi + girdi + takat →
// çıktı. Beceri etkileri (v2): verim (+adet; araçla yüzde), araç (tarif hedefli `arac` etkisi: envanterdeki araçla
// +adet), araç ömrü (Aletçilik 3); başarı sayacı unvan yazar. Faz 6: çıktının kalite kademesi ve yapan izi (kalite.ts),
// zorunlu araç, yan çıktı; aracın etkisi aracı YAPANIN kalitesiyle artar (fazladan çıktı ve ömür).
// Her şey eskir: araç her kullanımda aşınır, etkin ömründe bir araç tükenir (en iyi kaliteli olan kullanılır).
// Akçe doğurmaz (yalnız mal çevirir); akçe NPC'ye satış ve siparişten gelir. Hata olursa hiçbir şey değişmez.

import { MALLAR, type MalId } from "../icerik/mallar.ts";
import { TARIFLER, tarifBul, type Tarif } from "../icerik/tarifler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { IS_KONDISYON, halDegistir, halGorunumu, type HalGorunumu } from "./hal.ts";
import { takatHarca, takatTazele } from "./karakter.ts";
import { TARIF_KILIDI } from "../icerik/agaclar/index.ts";
import { acikEtkiler, aracArtisi, basariSay, omurArtisi, sinerjiAcik, tasarrufOrani, tarifAcik, verimArtisi } from "./beceri-etki.ts";
import {
  ALET_KALITE_OMUR,
  ALET_KALITE_VERIM,
  KALITE_BECERI_TAVAN,
  enIyiKalite,
  kaliteliCikar,
  kaliteliEkle,
  urunKalitesi,
  type Kalite,
  type KaliteSonucu,
} from "./kalite.ts";
import { hizmetEkle } from "./meslek.ts";
import { envanterEkle } from "./npc-taban.ts";
import { tohumlu, type Zar } from "./rastgele.ts";
import type { Karakter } from "./tipler.ts";

/** [PARAMETRE] Bir aletin kullanım ömrü (bu kadar kullanımda bir alet tükenir). */
export const ALET_OMRU = 4;

/** Karakterin elindeki aracın etkin ömrü: malın ömrü (yoksa ALET_OMRU) + bildiği ömür etkileri (Aletçilik 3: +1)
 * + eldeki en iyi aracın kalitesi (yapanın ustalığı: ALET_KALITE_OMUR). */
export function aletOmru(k: Karakter, mal: string): number {
  const taban = Object.hasOwn(MALLAR, mal) ? (MALLAR[mal as MalId].omur ?? ALET_OMRU) : ALET_OMRU;
  return taban + omurArtisi(k, mal) + (ALET_KALITE_OMUR[enIyiKalite(k, mal)] ?? 0);
}

export interface Asinma {
  mal: MalId;
  kullanim: number;
  omur: number;
  asindi: boolean;
  /** Kullanılan aracın kalitesi (en iyisi kullanılır). */
  kalite: Kalite;
}

/** Aracı bir kullanım aşındırır; etkin ömür dolunca bir araç (kullanılan en iyi kaliteli olan) tükenir. */
export function aracAsindir(k: Karakter, mal: MalId): Asinma {
  const kalite = enIyiKalite(k, mal);
  const omur = aletOmru(k, mal);
  const as = (k.as ??= {});
  const kullanim = (as[mal] ?? 0) + 1;
  const asindi = kullanim >= omur;
  if (asindi) {
    if (!kaliteliCikar(k, mal, 1, kalite)) envanterEkle(k, mal, -1);
    delete as[mal];
  } else as[mal] = kullanim;
  return { mal, kullanim, omur, asindi, kalite };
}

/** Tarif hedefli `arac` etkisi (ör. doğrama + alet, un + değirmen taşı): araç malı, artış, envanterde var mı. */
export function etkiAraci(k: Karakter, t: Tarif): { mal: MalId; arti: number; var: boolean } | null {
  const e = aracArtisi(k, t.id);
  if (!e || !Object.hasOwn(MALLAR, e.mal)) return null;
  return { mal: e.mal as MalId, arti: e.arti, var: (k.ev?.[e.mal] ?? 0) > 0 };
}

/** Kullanılan araçların kalitesinden gelen fazladan çıktı (aracı yapanın ustalığı). */
function aracKaliteVerimi(k: Karakter, mallar: readonly MalId[]): number {
  return mallar.reduce((a, m) => a + (ALET_KALITE_VERIM[enIyiKalite(k, m)] ?? 0), 0);
}

/** Bu yapımda kullanılacak araç malları (tarifin aracı ve etki aracı; tekrarsız). */
function kullanilanAraclar(k: Karakter, t: Tarif): MalId[] {
  const liste: MalId[] = [];
  if (t.arac && (k.ev?.[t.arac.mal] ?? 0) > 0) liste.push(t.arac.mal);
  const ea = etkiAraci(k, t);
  if (ea?.var && !liste.includes(ea.mal)) liste.push(ea.mal);
  return liste;
}

/**
 * Çıktı adedi: araçla ya da araçsız taban, + verim etkileri, + etki aracı artışı, + aracın kalitesi; tarifin
 * aracıyla yapılınca yüzde artış (aşağı yuvarlanır). `aracVar` tarifin kendi aracını söyler (önizlemede zorlanabilir).
 */
export function ciktiAdedi(k: Karakter, t: Tarif, aracVar: boolean): number {
  const v = verimArtisi(k, t.id);
  const ea = etkiAraci(k, t);
  const mallar: MalId[] = [];
  if (aracVar && t.arac) mallar.push(t.arac.mal);
  if (ea?.var && !mallar.includes(ea.mal)) mallar.push(ea.mal);
  const taban = (aracVar ? t.arac!.adet : t.cikti[1]) + v.arti + (ea?.var ? ea.arti : 0) + aracKaliteVerimi(k, mallar);
  return aracVar && v.yuzde > 0 ? Math.floor((taban * (100 + v.yuzde)) / 100) : taban;
}

/** [PARAMETRE] Çiftçi yayla göçü + dokumacı kışlık çadır bilgisiyle çadır kalitesine ek katkı. */
export const YAYLA_CADIRI_KALITE_BONUS = 10;
/** [PARAMETRE] Dokumacı zırh astarı + demirci zırh ustalığıyla pul zırh kalitesine ek katkı. */
export const PUL_ZIRH_ASTARI_KALITE_BONUS = 10;
/** [PARAMETRE] Aşçı pastırmacı + çiftçi kesim/post bilgisiyle pastırma kalitesine ek katkı. */
export const OZEL_PASTIRMA_KALITE_BONUS = 10;
/** [PARAMETRE] Oduncu değirmen taşı + aşçı değirmen unu bilgisiyle un kalitesine ek katkı. */
export const KASABA_DEGIRMENI_KALITE_BONUS = 10;
/** [PARAMETRE] Oduncu kiriş/direk + marangoz han inşası bilgisiyle kiriş kalitesine ek katkı. */
export const HAN_KIRISI_KALITE_BONUS = 10;
/** [PARAMETRE] Çiftçi toplu harman + marangoz tekerlek bilgisiyle kağnı kalitesine ek katkı. */
export const KAGNI_HARMANI_KALITE_BONUS = 10;

/** Tarifin kalite düğümü yüzdeleri (hedef: tarif kimliği ya da grubu), tavanlı. */
export function kaliteBecerisi(k: Karakter, t: Tarif): number {
  const hedefler = new Set([t.id, ...(t.grup ?? [])]);
  let toplam = 0;
  for (const e of acikEtkiler(k)) if (e.tur === "kalite" && hedefler.has(e.hedef)) toplam += e.yuzde;
  if (t.id === "cadir" && sinerjiAcik(k, "yaylaCadiri")) toplam += YAYLA_CADIRI_KALITE_BONUS;
  if (t.id === "pulZirh" && sinerjiAcik(k, "pulZirhAstari")) toplam += PUL_ZIRH_ASTARI_KALITE_BONUS;
  if (t.id === "pastirma" && sinerjiAcik(k, "ozelPastirma")) toplam += OZEL_PASTIRMA_KALITE_BONUS;
  if (t.id === "un" && sinerjiAcik(k, "kasabaDegirmeni")) toplam += KASABA_DEGIRMENI_KALITE_BONUS;
  if (t.id === "kiris" && sinerjiAcik(k, "hanKirisi")) toplam += HAN_KIRISI_KALITE_BONUS;
  if (t.id === "kagni" && sinerjiAcik(k, "kagniHarmani")) toplam += KAGNI_HARMANI_KALITE_BONUS;
  return Math.min(KALITE_BECERI_TAVAN, toplam);
}

/** Öğrenilmiş tasarruf etkileri sonrası gerçek girdi miktarı; tam sayı mallarda en az 1 korunur. */
export function girdiGorunumu(k: Karakter, t: Tarif): Partial<Record<MalId, number>> {
  const girdi: Partial<Record<MalId, number>> = {};
  const hedefler = [t.id, ...(t.grup ?? [])];
  for (const [mal, n] of Object.entries(t.girdi) as [MalId, number][]) {
    const tasarruf = tasarrufOrani(k, hedefler, mal);
    girdi[mal] = tasarruf > 0 ? Math.max(1, Math.floor(n * (100 - tasarruf) / 100)) : n;
  }
  return girdi;
}

function eksikGirdi(k: Karakter, t: Tarif): Partial<Record<MalId, number>> {
  const eksik: Partial<Record<MalId, number>> = {};
  for (const [mal, n] of Object.entries(girdiGorunumu(k, t)) as [MalId, number][]) {
    const var_ = k.ev?.[mal] ?? 0;
    if (var_ < n) eksik[mal] = n - var_;
  }
  return eksik;
}

/** Bütün tarifler: düğüm açık mı, eksik girdi, şu an yapılabilir mi (takat dahil). */
export function tarifListesi(k: Karakter) {
  return Object.values(TARIFLER).map((ham) => {
    const t = ham as Tarif;
    const acik = tarifAcik(k, t.id);
    const eksik = eksikGirdi(k, t);
    const aracVar = t.arac !== undefined && (k.ev?.[t.arac.mal] ?? 0) > 0;
    const zorunluEksik = t.arac?.zorunlu === true && !aracVar;
    const ea = etkiAraci(k, t);
    const kilit = TARIF_KILIDI[t.id];
    return {
      id: t.id,
      meslek: t.meslek,
      dugum: kilit?.dugum ?? null,
      seviye: kilit?.seviye ?? null,
      girdi: girdiGorunumu(k, t),
      cikti: { mal: t.cikti[0], adet: ciktiAdedi(k, t, aracVar) },
      yan: t.yan ?? null,
      takat: t.takat,
      hizmet: t.hizmet,
      arac: t.arac
        ? {
            mal: t.arac.mal,
            adet: ciktiAdedi(k, t, true),
            var: aracVar,
            zorunlu: t.arac.zorunlu === true,
            kullanim: k.as?.[t.arac.mal] ?? 0,
            omur: aletOmru(k, t.arac.mal),
            kalite: enIyiKalite(k, t.arac.mal),
          }
        : null,
      etkiAraci: ea ? { ...ea, kullanim: k.as?.[ea.mal] ?? 0, omur: aletOmru(k, ea.mal), kalite: enIyiKalite(k, ea.mal) } : null,
      kaliteBecerisi: kaliteBecerisi(k, t),
      acik,
      eksik,
      yapilabilir: acik && !zorunluEksik && Object.keys(eksik).length === 0 && k.tk >= t.takat,
    };
  });
}

export interface TarifSonucu {
  tarif: string;
  cikti: { mal: MalId; adet: number };
  /** Yan çıktılar (yoksa null). */
  yan: Partial<Record<MalId, number>> | null;
  girdi: Partial<Record<MalId, number>>;
  /** Tarifin aracı; etki aracı ayrıca aşınırsa `etkiAraci`. */
  arac: Asinma | null;
  etkiAraci: Asinma | null;
  /** Ürünün kalite kademesi ve dökümü; ürün yapan (bu oyuncu) iziyle envantere girer. */
  kalite: KaliteSonucu;
  yapan: string;
  hizmet: number;
  hal: HalGorunumu;
}

/** Kalite zarı: aynı oyuncu, tarif, ay ve üretim sayacıyla aynı sonuç (deterministik). */
export function kaliteZari(k: Karakter, t: Tarif, ay: number): Zar {
  return tohumlu("kalite", k.o, t.id, ay, k.bs?.[`tarif:${t.id}`] ?? 0);
}

export function tarifYap(k: Karakter, idHam: unknown, ay: number, zar?: Zar): Sonuc<TarifSonucu> {
  const t = tarifBul(idHam);
  if (!t) return hata("tarif_gecersiz");
  if (!tarifAcik(k, t.id)) return hata("dugum_kapali");
  if (Object.keys(eksikGirdi(k, t)).length > 0) return hata("girdi_yok");
  const aracVar = t.arac !== undefined && (k.ev?.[t.arac.mal] ?? 0) > 0;
  if (t.arac?.zorunlu && !aracVar) return hata("arac_yok");
  takatTazele(k, ay);
  if (!takatHarca(k, ay, t.takat)) return hata("takat_yok");
  const girdi = girdiGorunumu(k, t);
  for (const [mal, n] of Object.entries(girdi) as [MalId, number][]) envanterEkle(k, mal, -n);
  const adet = ciktiAdedi(k, t, aracVar);
  const araclar = kullanilanAraclar(k, t);
  const aracKalite = araclar.length > 0 ? (Math.max(...araclar.map((m) => enIyiKalite(k, m))) as Kalite) : null;
  const kalite = urunKalitesi(k, t, kaliteBecerisi(k, t), aracKalite, zar ?? kaliteZari(k, t, ay));
  const ea = etkiAraci(k, t);
  const arac: Asinma | null = t.arac && aracVar ? aracAsindir(k, t.arac.mal) : null;
  // Etki aracı tarifin aracıyla aynıysa bir kez aşınır.
  const etki: Asinma | null = ea?.var && ea.mal !== t.arac?.mal ? aracAsindir(k, ea.mal) : null;
  kaliteliEkle(k, t.cikti[0], [[kalite.kademe, adet, k.o]]);
  for (const [mal, n] of Object.entries(t.yan ?? {}) as [MalId, number][]) if (n > 0) kaliteliEkle(k, mal, [[0, n, k.o]]);
  basariSay(k, `tarif:${t.id}`, adet);
  const hizmet = hizmetEkle(k, t.meslek, t.hizmet);
  halDegistir(k, ay, { kondisyon: -IS_KONDISYON * t.takat }, "hal.neden.tarif");
  return basarili({
    tarif: t.id,
    cikti: { mal: t.cikti[0], adet },
    yan: t.yan ?? null,
    girdi,
    arac,
    etkiAraci: etki,
    kalite,
    yapan: k.o,
    hizmet,
    hal: halGorunumu(k, ay),
  });
}
