// Olağan düzen (Faz 3a): oyuncu yokken işleyen ayarlar. Gelen her teklif türüne cevapsız kalınca verilecek cevap
// ve borç isteyene cevap (en çok tutarla). Teklif oluşurken alıcının düzeninden varsayılan sonuç yazılır ("baştan
// yazılır"; teklif sahibi beklemez) ve son cevap ayı geçince ay dönümünde uygulanır. Saf fonksiyonlar.

import { basarili, hata, type Sonuc } from "../tipler.ts";
import { NPC_TEKLIF_TURLERI, OYUNCU_TEKLIF_TURLERI, type Sartlar, type TeklifTuru, type VarsayilanSonuc } from "./toplum.ts";
import type { Karakter } from "./tipler.ts";

export const GELEN_CEVAPLARI = ["bekle", "kabul", "ret"] as const;
export type GelenCevap = (typeof GELEN_CEVAPLARI)[number];
const TURLER: readonly TeklifTuru[] = [...OYUNCU_TEKLIF_TURLERI, ...NPC_TEKLIF_TURLERI];
/** Evlilik kancaları yokken kabul edilmez (Faz 7'de evlilik doğurur; rıza yüz yüze verilir). */
export const KENDILIGINDEN_KABUL_YOK: readonly TeklifTuru[] = ["gorucu", "npcDunur", "is"];
/** [PARAMETRE] Borç isteyene kendiliğinden verilebilecek en çok tutar (bir istek için). */
export const DUZEN_BORC_EN_COK = 20;

export interface Duzen {
  /** Gelen teklif türü → cevap (yoksa bekle: cevapsız düşer). Borç isteme hariç. */
  g: Partial<Record<TeklifTuru, GelenCevap>>;
  /** Borç isteyene (oyuncu "iste" ya da NPC) cevap ve kabul edilecek en çok tutar. */
  bc: GelenCevap;
  be: number;
}

export function duzenAl(k: Karakter): Duzen {
  return k.dz ?? { g: {}, bc: "bekle", be: 0 };
}

export function borcIstemeMi(tur: TeklifTuru, s: Sartlar): boolean {
  return tur === "npcBorc" || (tur === "borc" && s.yn === "iste");
}

/** Alıcının düzenine göre cevapsız kalınca ne olacağı. */
export function varsayilanSonuc(alici: Karakter, tur: TeklifTuru, s: Sartlar): VarsayilanSonuc {
  const d = duzenAl(alici);
  if (borcIstemeMi(tur, s)) {
    if (d.bc === "ret") return "ret";
    return d.bc === "kabul" && (s.tu ?? 0) <= d.be ? "kabul" : "dustu";
  }
  const c = d.g[tur] ?? "bekle";
  if (c === "kabul") return KENDILIGINDEN_KABUL_YOK.includes(tur) ? "dustu" : "kabul";
  return c === "ret" ? "ret" : "dustu";
}

function nesneMi(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const cevapMi = (v: unknown): v is GelenCevap => typeof v === "string" && (GELEN_CEVAPLARI as readonly string[]).includes(v);

/** POST /v1/duzen gövdesi: {gelen?: {tur: cevap}, borcCevap?, borcEnCok?}. Hepsi ya da hiçbiri uygulanır. */
export function duzenGuncelle(k: Karakter, govde: Record<string, unknown>): Sonuc<Duzen> {
  const d = structuredClone(duzenAl(k));
  if (govde.gelen !== undefined) {
    if (!nesneMi(govde.gelen)) return hata("duzen_gecersiz");
    for (const [tur, c] of Object.entries(govde.gelen)) {
      if (!(TURLER as readonly string[]).includes(tur) || !cevapMi(c)) return hata("duzen_gecersiz");
      if (c === "kabul" && KENDILIGINDEN_KABUL_YOK.includes(tur as TeklifTuru)) return hata("duzen_gecersiz");
      if (c === "bekle") delete d.g[tur as TeklifTuru];
      else d.g[tur as TeklifTuru] = c;
    }
  }
  if (govde.borcCevap !== undefined) {
    if (!cevapMi(govde.borcCevap)) return hata("duzen_gecersiz");
    d.bc = govde.borcCevap;
  }
  if (govde.borcEnCok !== undefined) {
    const b = govde.borcEnCok;
    if (typeof b !== "number" || !Number.isInteger(b) || b < 0 || b > DUZEN_BORC_EN_COK) return hata("duzen_gecersiz");
    d.be = b;
  }
  k.dz = d;
  return basarili(d);
}

export function duzenGorunumu(k: Karakter) {
  const d = duzenAl(k);
  const gelen = Object.fromEntries(TURLER.map((t) => [t, d.g[t] ?? "bekle"])) as Record<TeklifTuru, GelenCevap>;
  return {
    gelen,
    borcCevap: d.bc,
    borcEnCok: d.be,
    sinir: { borcEnCok: DUZEN_BORC_EN_COK, kendiligindenKabulYok: KENDILIGINDEN_KABUL_YOK, cevaplar: GELEN_CEVAPLARI },
  };
}
