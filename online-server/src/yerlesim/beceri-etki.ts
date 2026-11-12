// Beceri etkilerinin oyuna bağlanması (beceri ağacı v2). Tam Özgürlük: karakterin HER meslekte öğrendiği düğüm
// seviyeleri sayılır (bilgi kullananındır; meslek değiştirmek etkisini silmez). Tarif ve usta iş kilitleri, verim,
// araç (alet) artışı, araç ömrü, gizli düğüm görünürlüğü ve başarı sayaçlarından kalıcı unvanlar.

import { IS_KILIDI, TARIF_KILIDI, UNVANLAR, beceriDugumu, type BeceriDugumu, type Etki, type OnKosul } from "../icerik/agaclar/index.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { dugumSeviyesi, ilerlemeGoc } from "./meslek.ts";
import type { Karakter } from "./tipler.ts";

/** [PARAMETRE] Araçlı çıktı yüzdesi tavanı (birden çok düğümün yüzdesi toplanır, bu kadarla kırpılır). */
export const VERIM_YUZDE_TAVAN = 50;
/** [PARAMETRE] Girdi tasarrufu etkilerinin toplam üst sınırı. */
export const TASARRUF_YUZDE_TAVAN = 50;

/** Karakterin öğrendiği bütün seviyelerin etkileri (her meslekte). */
export function* acikEtkiler(k: Karakter): Generator<Etki> {
  for (const [m, i] of Object.entries(k.ms?.s ?? {})) {
    if (!i) continue;
    ilerlemeGoc(i, m as MeslekId);
    for (const [id, sv] of Object.entries(i.sv ?? {})) {
      const d = beceriDugumu(id);
      if (!d) continue;
      for (let n = 0; n < Math.min(sv, d.seviye); n++) yield* d.seviyeler[n]!.etkiler;
    }
  }
}

export function kilitAcik(k: Karakter, kilit: OnKosul | undefined): boolean {
  return kilit === undefined || dugumSeviyesi(k, kilit.dugum) >= kilit.seviye;
}

/** Tarifi açan düğüm seviyesi öğrenilmiş mi (kilidi olmayan tarif yoktur; testle denetlenir). */
export const tarifAcik = (k: Karakter, id: string): boolean => Object.hasOwn(TARIF_KILIDI, id) && kilitAcik(k, TARIF_KILIDI[id]);
/** Usta işi açık mı (kilidi olmayan temel iş herkese açıktır). */
export const isAcik = (k: Karakter, id: string): boolean => kilitAcik(k, IS_KILIDI[id]);

/** Hedef tarif ya da işin çıktı artışı: sabit +adet ve (yalnız araçla) yüzde. */
export function verimArtisi(k: Karakter, hedef: string): { arti: number; yuzde: number } {
  let arti = 0;
  let yuzde = 0;
  for (const e of acikEtkiler(k)) {
    if (e.tur !== "verim" || e.hedef !== hedef) continue;
    arti += e.arti ?? 0;
    yuzde += e.yuzde ?? 0;
  }
  return { arti, yuzde: Math.min(VERIM_YUZDE_TAVAN, yuzde) };
}

/** Bu iş envanterdeki araçla yapılınca gelen artış (ilk tanımlanan araç malı; artışlar toplanır). */
export function aracArtisi(k: Karakter, hedef: string): { mal: string; arti: number } | undefined {
  let sonuc: { mal: string; arti: number } | undefined;
  for (const e of acikEtkiler(k)) {
    if (e.tur !== "arac" || e.hedef !== hedef) continue;
    if (!sonuc) sonuc = { mal: e.mal, arti: 0 };
    if (e.mal === sonuc.mal) sonuc.arti += e.arti;
  }
  return sonuc;
}

/** Öğrenilmiş mesleki hizmet yetkisi; tüketen sistem kendi eyleminde sunucu tarafında doğrular. */
export function hizmetAcik(k: Karakter, hizmet: string): boolean {
  return [...acikEtkiler(k)].some((e) => e.tur === "hizmet" && e.hizmet === hizmet);
}

/** Öğrenilmiş toplumsal hak; her yazma ucu kendi eyleminde bu çözümleyiciyi sunucuda çağırmalıdır. */
export function hakAcik(k: Karakter, hak: string): boolean {
  const acik = [...acikEtkiler(k)].some((e) => e.tur === "hak" && e.hak === hak);
  // Ahşap köprü projesi, marangozun köprücülük hakkına ek olarak demircinin dişli/metal ustalığını ister.
  return acik && (hak !== "ahsapKopru" || sinerjiAcik(k, "degirmenKopruDemiri"));
}

/** Çapraz meslek sinerjisi: açan düğüm tek başına yetmez, tanımlı öteki düğüm/seviye de öğrenilmiş olmalıdır. */
export function sinerjiAcik(k: Karakter, acar: string): boolean {
  return [...acikEtkiler(k)].some((e) => e.tur === "sinerji" && e.acar === acar && dugumSeviyesi(k, e.dugum) >= e.seviye);
}

/** Tarif/iş kimliği ya da tarif gruplarında, belirtilen girdiye uygulanan tasarruf yüzdesi. */
export function tasarrufOrani(k: Karakter, hedefler: readonly string[], mal: string): number {
  let yuzde = 0;
  for (const e of acikEtkiler(k)) {
    if (e.tur === "tasarruf" && e.mal === mal && hedefler.includes(e.hedef)) yuzde += e.yuzde;
  }
  return Math.min(TASARRUF_YUZDE_TAVAN, yuzde);
}

/** Aracın ömür artışı (kullanım). */
export function omurArtisi(k: Karakter, mal: string): number {
  let arti = 0;
  for (const e of acikEtkiler(k)) if (e.tur === "omur" && e.mal === mal) arti += e.arti;
  return arti;
}

/** Gizli düğüm görünür mü: öğrenilmiş, başarı sayacı eşiği geçmiş ya da nadir kitap envanterde. */
export function gizliGorunur(k: Karakter, d: BeceriDugumu): boolean {
  if (!d.gizli) return true;
  if (dugumSeviyesi(k, d.id) > 0) return true;
  const s = d.gizli.sayac;
  if (s && (k.bs?.[s.anahtar] ?? 0) >= s.esik) return true;
  return d.gizli.kitap !== undefined && (k.ev?.[d.gizli.kitap] ?? 0) > 0;
}

/** Başarı sayacını artırır (tek yönlü); eşiği ilk kez geçen unvanları kalıcı yazar ve döndürür (tek sefer izi). */
export function basariSay(k: Karakter, anahtar: string, n: number): string[] {
  if (!(n > 0)) return [];
  const bs = (k.bs ??= {});
  bs[anahtar] = (bs[anahtar] ?? 0) + n;
  const yeni: string[] = [];
  for (const u of UNVANLAR) {
    if (u.sayac !== anahtar || bs[anahtar]! < u.esik || (k.un ?? []).includes(u.id)) continue;
    (k.un ??= []).push(u.id);
    yeni.push(u.id);
  }
  return yeni;
}
