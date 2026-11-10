// Beceri ağacı v2 — 14 meslek için istemci yardımcıları. Ağaç verisinin kendisi sunucudadır
// (online-server/src/icerik/agaclar/); sahte istemci agac-aynasi.ts aynasını kullanır. Metin anahtarları sunucuyla aynı:
// ad onl.ba.<meslek>.<anahtar>, seviye etkisi onl.ba.<id>.s<n>; açıklama yalnız istemcide: onl.ba.<id>.a.
import { MESLEK_IDLERI, type MeslekId } from "../protokol";
import { AGAC_AYNASI, BOLUM_BEDEL } from "./agac-aynasi";
import type { Bolum, KademeNo } from "./beceri-veri";

export type KademeAd = "cirak" | "kalfa" | "usta" | "pir";
export const KADEME_SIRA: readonly KademeAd[] = ["cirak", "kalfa", "usta", "pir"];
export const kademeAdOf = (k: KademeNo | number) => KADEME_SIRA[Math.max(0, Math.min(3, k))];

/** Ağaçların başlık arması (ikonlar.ts). */
export const MESLEK_ARMA: Record<MeslekId, string> = {
  ciftci: "ciftcilik", oduncu: "odunculuk", demirci: "demircilik", marangoz: "marangozluk", dokumaci: "dokumacilik", asci: "ascilik",
  hanci: "hancilik", sifaci: "sifacilik", ozan: "ozanlik", katip: "katiplik", tuccar: "tuccarlik", arabulucu: "arabuluculuk",
  asker: "askerlik", divan: "divanlik",
};

export const meslekMi = (v: unknown): v is MeslekId => typeof v === "string" && (MESLEK_IDLERI as readonly string[]).includes(v);

/** Aynadaki düğüm bilgisi (Mesleki Geçmiş ve Tüm Beceriler başka mesleklerin düğümlerini de gösterir). */
export function aynaDugum(id: string): { ikon: string; bolum: Bolum; azami: number } | undefined {
  const [m, a] = id.split(".");
  const d = meslekMi(m) ? AGAC_AYNASI[m].find((x) => x[0] === a) : undefined;
  return d ? { ikon: d[1], bolum: d[2], azami: d[5].length } : undefined;
}

/** Gizli düğüm hariç ağacın tamamı (≈ 82 puan; tavan buna yetmez → uzmanlaşma). */
export const agacToplam = (m: MeslekId) =>
  AGAC_AYNASI[m].filter((d) => d[2] !== "gizli").reduce((t, d) => t + [...d[5]].reduce((s, _, n) => s + (BOLUM_BEDEL[d[2]][n] ?? 0), 0), 0);

/** Varsayılan seçili düğüm: orta sütunun kalfa düğümü. */
export const varsayilanSecim = (m: MeslekId) => `${m}.${AGAC_AYNASI[m].find((d) => d[2] === "kalfa" && d[3] === 1)![0]}`;
export const PUAN_TAVANI_VARSAYILAN = 40;
