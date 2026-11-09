// Tarif ve alet aşınması (ana tasarım §5.4–5.5, dikey dilim E2). Usta iş: açık düğüm + girdi + takat → çıktı.
// Her şey eskir: araç her kullanımda aşınır, ALET_OMRU kullanımda bir alet tükenir. Akçe doğurmaz (yalnız mal
// çevirir); akçe NPC'ye satış ve siparişten gelir. Hata olursa hiçbir şey değişmez.

import type { MalId } from "../icerik/mallar.ts";
import { TARIFLER, tarifBul, type Tarif } from "../icerik/tarifler.ts";
import { basarili, hata, type Sonuc } from "../tipler.ts";
import { IS_KONDISYON, halDegistir, halGorunumu, type HalGorunumu } from "./hal.ts";
import { takatHarca, takatTazele } from "./karakter.ts";
import { dugumAcikMi, hizmetEkle } from "./meslek.ts";
import { envanterEkle } from "./npc-taban.ts";
import type { Karakter } from "./tipler.ts";

/** [PARAMETRE] Bir aletin kullanım ömrü (bu kadar kullanımda bir alet tükenir). */
export const ALET_OMRU = 4;

function eksikGirdi(k: Karakter, t: Tarif): Partial<Record<MalId, number>> {
  const eksik: Partial<Record<MalId, number>> = {};
  for (const [mal, n] of Object.entries(t.girdi) as [MalId, number][]) {
    const var_ = k.ev?.[mal] ?? 0;
    if (var_ < n) eksik[mal] = n - var_;
  }
  return eksik;
}

/** Bütün tarifler: düğüm açık mı, eksik girdi, şu an yapılabilir mi (takat dahil). */
export function tarifListesi(k: Karakter) {
  return Object.values(TARIFLER).map((ham) => {
    const t = ham as Tarif;
    const acik = dugumAcikMi(k, t.dugum);
    const eksik = eksikGirdi(k, t);
    const aracVar = t.arac !== undefined && (k.ev?.[t.arac.mal] ?? 0) > 0;
    return {
      id: t.id,
      meslek: t.meslek,
      dugum: t.dugum,
      girdi: t.girdi,
      cikti: { mal: t.cikti[0], adet: aracVar ? t.arac!.adet : t.cikti[1] },
      takat: t.takat,
      hizmet: t.hizmet,
      arac: t.arac ? { mal: t.arac.mal, adet: t.arac.adet, var: aracVar, kullanim: k.as?.[t.arac.mal] ?? 0, omur: ALET_OMRU } : null,
      acik,
      eksik,
      yapilabilir: acik && Object.keys(eksik).length === 0 && k.tk >= t.takat,
    };
  });
}

export interface TarifSonucu {
  tarif: string;
  cikti: { mal: MalId; adet: number };
  girdi: Partial<Record<MalId, number>>;
  arac: { mal: MalId; kullanim: number; omur: number; asindi: boolean } | null;
  hizmet: number;
  hal: HalGorunumu;
}

export function tarifYap(k: Karakter, idHam: unknown, ay: number): Sonuc<TarifSonucu> {
  const t = tarifBul(idHam);
  if (!t) return hata("tarif_gecersiz");
  if (!dugumAcikMi(k, t.dugum)) return hata("dugum_kapali");
  if (Object.keys(eksikGirdi(k, t)).length > 0) return hata("girdi_yok");
  takatTazele(k, ay);
  if (!takatHarca(k, ay, t.takat)) return hata("takat_yok");
  for (const [mal, n] of Object.entries(t.girdi) as [MalId, number][]) envanterEkle(k, mal, -n);
  let adet = t.cikti[1];
  let arac: TarifSonucu["arac"] = null;
  if (t.arac && (k.ev?.[t.arac.mal] ?? 0) > 0) {
    adet = t.arac.adet;
    const as = (k.as ??= {});
    const kullanim = (as[t.arac.mal] ?? 0) + 1;
    const asindi = kullanim >= ALET_OMRU;
    if (asindi) {
      envanterEkle(k, t.arac.mal, -1);
      delete as[t.arac.mal];
    } else as[t.arac.mal] = kullanim;
    arac = { mal: t.arac.mal, kullanim, omur: ALET_OMRU, asindi };
  }
  envanterEkle(k, t.cikti[0], adet);
  const hizmet = hizmetEkle(k, t.meslek, t.hizmet);
  halDegistir(k, ay, { kondisyon: -IS_KONDISYON * t.takat }, "hal.neden.tarif");
  return basarili({ tarif: t.id, cikti: { mal: t.cikti[0], adet }, girdi: t.girdi, arac, hizmet, hal: halGorunumu(k, ay) });
}
