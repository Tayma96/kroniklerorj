// Canlı masalar vitrini (saf): yerleşimdeki hanlarda oynanan ya da oyuncu bekleyen masa oyunları. MasaDO özet
// değişince yerleşime MUTLAK değeri bildirir ({han, masa, ozet?, z}); `ozet` yoksa kayıt silinir. Kayıtta yalnız açık
// bilgi vardır (tür, aşama, oyuncu/boş yer, seyirci); oyuncu kimliği, zar, tahta yoktur. YerlesimDO depo anahtarı VITRIN.

import { oyunTuruCoz, type OyunTuru, type OyunVitrinOzeti } from "./cati.ts";

/** YerlesimDO depo anahtarı. */
export const VITRIN = "mo";
/** [PARAMETRE] Kayıttaki en çok masa (9 han × 8 masa). */
export const VITRIN_EN_COK = 72;
/** [PARAMETRE] MasaDO özet değişmese de bu sürede bir kaydı tazeler (ms). */
export const VITRIN_TAZELE_MS = 30 * 60_000;
/** [PARAMETRE] Bu süredir tazelenmeyen kayıt listede görünmez ve silinir (MasaDO bildiremeden durduysa). */
export const VITRIN_BAYAT_MS = 3 * VITRIN_TAZELE_MS;

/** "han:masa" → [tür, aşama (0 bekleme, 1 oyun), oyuncu, enÇok, seyirci, z]. */
export type VitrinKaydi = Record<string, [tur: OyunTuru, asama: 0 | 1, oyuncu: number, enCok: number, seyirci: number, z: number]>;

export interface VitrinSatiri {
  han: number;
  masa: number;
  oyun: OyunTuru;
  asama: "bekleme" | "oyun";
  oyuncu: number;
  enCok: number;
  /** Bekleme aşamasında boş yer (oyunda 0). */
  bos: number;
  seyirci: number;
  /** Masaya oturup "katıl" diyerek girilebilir mi (bekleme ve boş yer var). */
  katilabilir: boolean;
}

export function vitrinAnahtari(o: OyunVitrinOzeti | undefined): string {
  return o ? `${o.tur}:${o.asama}:${o.oyuncu}:${o.enCok}:${o.seyirci}` : "-";
}

const tam = (v: unknown, a: number, b: number): v is number => Number.isInteger(v) && (v as number) >= a && (v as number) <= b;

/** Bildirimi uygular (yerinde). Eski `z` yok sayılır. Değişti mi döner. */
export function vitrinUygula(kayit: VitrinKaydi, ham: unknown): boolean {
  if (typeof ham !== "object" || ham === null) return false;
  const { han, masa, ozet, z } = ham as Record<string, unknown>;
  if (!tam(han, 1, 9) || !tam(masa, 1, 99) || typeof z !== "number" || !Number.isFinite(z)) return false;
  const a = `${han}:${masa}`;
  const eski = kayit[a];
  if (eski && eski[5] > z) return false;
  if (ozet === undefined) {
    if (!eski) return false;
    delete kayit[a];
    return true;
  }
  if (typeof ozet !== "object" || ozet === null) return false;
  const o = ozet as Record<string, unknown>;
  const tur = oyunTuruCoz(o.tur);
  if (!tur || (o.asama !== "bekleme" && o.asama !== "oyun") || !tam(o.enCok, 1, 8) || !tam(o.oyuncu, 0, o.enCok as number) || !tam(o.seyirci, 0, 99)) return false;
  kayit[a] = [tur, o.asama === "oyun" ? 1 : 0, o.oyuncu, o.enCok as number, o.seyirci, z];
  const anahtarlar = Object.keys(kayit);
  if (anahtarlar.length > VITRIN_EN_COK) {
    anahtarlar.sort((x, y) => kayit[x]![5] - kayit[y]![5]).slice(0, anahtarlar.length - VITRIN_EN_COK).forEach((x) => delete kayit[x]);
  }
  return true;
}

/** Bayat kayıtları siler (yerinde). Silindi mi döner. */
export function vitrinBudar(kayit: VitrinKaydi, simdi: number): boolean {
  let degisti = false;
  for (const [a, x] of Object.entries(kayit)) {
    if (simdi - x[5] > VITRIN_BAYAT_MS) {
      delete kayit[a];
      degisti = true;
    }
  }
  return degisti;
}

/** Herkese açık liste: önce katılınabilir masalar, sonra süren oyunlar; han ve masa sırasıyla. */
export function vitrinListesi(kayit: VitrinKaydi | undefined, simdi: number): VitrinSatiri[] {
  const r: VitrinSatiri[] = [];
  for (const [a, x] of Object.entries(kayit ?? {})) {
    if (simdi - x[5] > VITRIN_BAYAT_MS) continue;
    const [han, masa] = a.split(":").map(Number) as [number, number];
    const bekleme = x[1] === 0;
    const bos = bekleme ? Math.max(0, x[3] - x[2]) : 0;
    r.push({ han, masa, oyun: x[0], asama: bekleme ? "bekleme" : "oyun", oyuncu: x[2], enCok: x[3], bos, seyirci: x[4], katilabilir: bekleme && bos > 0 });
  }
  return r.sort((p, q) => Number(q.katilabilir) - Number(p.katilabilir) || p.han - q.han || p.masa - q.masa);
}
