// Vasiyet (Faz 7, karar Berkay): mirasın dağılımını oyuncu belirler (evlat, eş, akraba, vakıf). Oranlar tamsayı
// yüzde ve toplamı 100'dür. Alıcı yalnız eş, akraba (çocuk, kardeş, yeğen) ya da vakıf olabilir: iki hesap arasında
// servet pompalamanın tek yolu evliliktir ve o da yalnız yaşlılık ölümüyle, %10 vergiyle işler.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { akrabalar, olduMu } from "./hanedan.ts";
import { npcKimlik } from "./ortak.ts";
import type { Karakter, Kasaba } from "./tipler.ts";

export interface VasiyetPayi {
  /** "n12" (akraba NPC), "o3" (oyuncu eş) ya da "vakif". */
  kime: string;
  /** Tamsayı yüzde (1-100). */
  oran: number;
}

export interface Vasiyet {
  /** İstenen vâris (aday kimliği). Ölümde uygun değilse varsayılan kurala düşülür. */
  varis?: string;
  paylar?: VasiyetPayi[];
}

/** [PARAMETRE] Vasiyette en çok pay satırı. */
export const VASIYET_PAY_EN_COK = 8;
export const VAKIF = "vakif";

/** Vasiyette alıcı olabilecekler: eş, çocuklar, kardeşler, yeğenler (canlı) ve vakıf. */
export function vasiyetAlicilari(kasaba: Kasaba, kar: Karakter): Set<string> {
  const { cocuklar, kardesler, yegenler } = akrabalar(kasaba, kar);
  const alici = new Set<string>([VAKIF, ...[...cocuklar, ...kardesler, ...yegenler].map((n) => npcKimlik(n.i))]);
  if (kar.hd?.es) alici.add(kar.hd.es);
  return alici;
}

/** POST /v1/vasiyet gövdesindeki `vasiyet`i doğrular. null → vasiyeti siler (undefined döner). */
export function vasiyetDogrula(kasaba: Kasaba, kar: Karakter, ham: unknown): Sonuc<Vasiyet | undefined> {
  if (olduMu(kar)) return hata("olu");
  if (ham === null) return basarili(undefined);
  if (typeof ham !== "object" || Array.isArray(ham)) return hata("vasiyet_gecersiz");
  const g = ham as Record<string, unknown>;
  const alici = vasiyetAlicilari(kasaba, kar);
  const v: Vasiyet = {};
  if (g.varis !== undefined) {
    if (typeof g.varis !== "string" || g.varis === VAKIF || !alici.has(g.varis) || g.varis === kar.hd?.es) return hata("vasiyet_gecersiz");
    v.varis = g.varis;
  }
  if (g.paylar !== undefined) {
    if (!Array.isArray(g.paylar) || g.paylar.length === 0 || g.paylar.length > VASIYET_PAY_EN_COK) return hata("vasiyet_gecersiz");
    const paylar: VasiyetPayi[] = [];
    const gorulen = new Set<string>();
    let toplam = 0;
    for (const p of g.paylar) {
      if (typeof p !== "object" || p === null) return hata("vasiyet_gecersiz");
      const { kime, oran } = p as Record<string, unknown>;
      if (typeof kime !== "string" || !alici.has(kime) || gorulen.has(kime)) return hata("vasiyet_gecersiz");
      if (typeof oran !== "number" || !Number.isInteger(oran) || oran < 1 || oran > 100) return hata("vasiyet_gecersiz");
      gorulen.add(kime);
      toplam += oran;
      paylar.push({ kime, oran });
    }
    if (toplam !== 100) return hata("vasiyet_gecersiz");
    v.paylar = paylar;
  }
  if (!v.varis && !v.paylar) return hata("vasiyet_gecersiz");
  return basarili(v);
}
