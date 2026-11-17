// Ustalar Levhası (Faz 6; demirci pir düğümü "ustalarLevhasi" hakkının görünür yüzü): yerleşimde üretilen üstün ve
// şaheser malların kalıcı kaydı — kim, ne, hangi kalite, hangi ay. Tek sefer izi: aynı oyuncunun aynı malı aynı
// kalitede ikinci kez levhaya yazılmaz (levha kasılarak doldurulmaz). Tavan aşılırsa önce en eski üstün düşer,
// şaheserler kalır. Akçe ya da beceri vermez; yalnız iz ve olaydır. Saf fonksiyonlar.

import type { MalId } from "../icerik/mallar.ts";
import { KALITE_ADLARI, type Kalite } from "./kalite.ts";
import { oyuncuRef } from "./ortak.ts";
import { ekonomiAl } from "./pazar-tahta.ts";
import type { Karakter, Kasaba, OlayTaslagi } from "./tipler.ts";

/** [PARAMETRE] Levhaya giren en düşük kalite (2 = üstün) ve yerleşim başına tutulan en çok kayıt. */
export const LEVHA_EN_AZ_KALITE: Kalite = 2;
export const LEVHA_EN_COK = 300;

export interface LevhaKaydi {
  o: string;
  ad: string;
  ml: MalId;
  q: Kalite;
  ay: number;
  /** Tarif kimliği. */
  t: string;
  /** Atölye damgası (tezgâh Dilim 2): işletme kimliği ve o anki adı. */
  at?: [isletme: string, ad: string];
}

/** Üstün/şaheser ürünü levhaya yazar (ilk kez ise); yeni kayıt ve herkese açık olayı döndürür. */
export function levhaYaz(k: Kasaba, kar: Karakter, tarif: string, mal: MalId, q: Kalite, ay: number, atolye?: [isletme: string, ad: string]): { kayit: LevhaKaydi; olay: OlayTaslagi } | null {
  if (q < LEVHA_EN_AZ_KALITE) return null;
  const ek = ekonomiAl(k);
  if (ek.lv.some((x) => x.o === kar.o && x.ml === mal && x.q === q)) return null;
  const kayit: LevhaKaydi = { o: kar.o, ad: kar.ad, ml: mal, q, ay, t: tarif, ...(atolye ? { at: atolye } : {}) };
  ek.lv.push(kayit);
  while (ek.lv.length > LEVHA_EN_COK) {
    const i = ek.lv.findIndex((x) => x.q < 3);
    ek.lv.splice(i >= 0 ? i : 0, 1);
  }
  return {
    kayit,
    olay: { t: "levha", w: kar.o, h: "", g: "", n: q >= 3 ? 7 : 5, k: "olay.levha", p: { kim: oyuncuRef(kar), mal, kalite: KALITE_ADLARI[q], ...(atolye ? { atolye: atolye[0], atolyeAd: atolye[1] } : {}) } },
  };
}

/** GET /v1/levha: en yeni önce; oyuncu başına şaheser ve üstün sayısı. */
export function levhaGorunumu(k: Kasaba, malHam?: unknown) {
  const liste = (k.ek?.lv ?? []).filter((x) => typeof malHam !== "string" || x.ml === malHam);
  const ustalar = new Map<string, { id: string; ad: string; efsanevi: number; nadide: number; saheser: number; ustun: number }>();
  for (const x of liste) {
    const u = ustalar.get(x.o) ?? { id: x.o, ad: x.ad, efsanevi: 0, nadide: 0, saheser: 0, ustun: 0 };
    // Dilim 4: efsanevi (tılsımlı dahil) ve nadide ayrı sayılır; sıralama önce efsanevi.
    if (x.q >= 5) u.efsanevi++;
    else if (x.q === 4) u.nadide++;
    else if (x.q >= 3) u.saheser++;
    else u.ustun++;
    ustalar.set(x.o, u);
  }
  return {
    kayitlar: [...liste].reverse().map((x) => ({ oyuncu: { id: x.o, ad: x.ad }, mal: x.ml, kalite: KALITE_ADLARI[x.q], kademe: x.q, ay: x.ay, tarif: x.t, ...(x.at ? { atolye: { id: x.at[0], ad: x.at[1] } } : {}) })),
    ustalar: [...ustalar.values()].sort((a, b) => b.efsanevi - a.efsanevi || b.nadide - a.nadide || b.saheser - a.saheser || b.ustun - a.ustun || (a.id < b.id ? -1 : 1)),
  };
}
