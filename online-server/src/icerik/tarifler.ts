// Çevrimiçi tarifler (ana tasarım §5.4–5.5, dikey dilim: çiftçi–oduncu–demirci zinciri). Tarifi beceri ağacındaki
// bir düğüm seviyesi açar (`agaclar/` `tarif` etkisi; kilit tablosu `TARIF_KILIDI`); girdiyi çıktıya çevirir, takat ve kondisyon harcar, mesleğine hizmet yazar. Sayılar [PARAMETRE].
// `arac`: envanterde varsa çıktıyı artıran ve kullanıldıkça aşınan alet. Metinler istemcide `tarif.<id>` anahtarıyla.

import type { MalId } from "./mallar.ts";
import type { MeslekId } from "./meslekler.ts";

export interface Tarif {
  id: string;
  meslek: MeslekId;
  girdi: Partial<Record<MalId, number>>;
  cikti: [MalId, number];
  takat: number;
  hizmet: number;
  /** Araç: envanterde varsa çıktı `adet` olur, bir kullanım aşınması yazılır; `zorunlu`sa araçsız yapılamaz. */
  arac?: { mal: MalId; adet: number; zorunlu?: true };
  /** Yan çıktılar (ana çıktının yanında sabit adet; verim etkisi yalnız ana çıktıya). */
  yan?: Partial<Record<MalId, number>>;
  /** Kalite etkisi grupları: `kalite` etkisinin hedefi tarif kimliği ya da bu gruplardan biri olabilir. */
  grup?: readonly string[];
}

export const TARIFLER = {
  kereste: { id: "kereste", meslek: "oduncu", girdi: { odun: 1 }, cikti: ["kereste", 1], takat: 1, hizmet: 2 },
  komur: { id: "komur", meslek: "oduncu", girdi: { odun: 1 }, cikti: ["komur", 1], takat: 1, hizmet: 2 },
  nal: { id: "nal", meslek: "demirci", girdi: { cevher: 1, komur: 1 }, cikti: ["nal", 2], takat: 1, hizmet: 2 },
  alet: {
    id: "alet", meslek: "demirci", girdi: { cevher: 2, komur: 1, kereste: 1 }, cikti: ["alet", 1], takat: 2,
    hizmet: 3,
  },
  hasat: {
    id: "hasat", meslek: "ciftci", girdi: {}, cikti: ["tahil", 3], takat: 2, hizmet: 2,
    arac: { mal: "alet", adet: 5 },
  },
  kirkim: { id: "kirkim", meslek: "ciftci", girdi: {}, cikti: ["yun", 2], takat: 1, hizmet: 1 },
  // ---- Faz 6: ağaç kancalarının gerçek tariflere çevrilmesi (MESLEK_AGACLARI §3.3; taban §3.1 kuralıyla) ----
  // Çiftçi
  sabanSurumu: {
    id: "sabanSurumu", meslek: "ciftci", girdi: {}, cikti: ["bugday", 2], takat: 2, hizmet: 3,
    arac: { mal: "alet", adet: 4, zorunlu: true },
  },
  kesim: { id: "kesim", meslek: "ciftci", girdi: {}, cikti: ["et", 2], yan: { post: 1 }, takat: 2, hizmet: 3 },
  baklagil: { id: "baklagil", meslek: "ciftci", girdi: {}, cikti: ["bakla", 4], takat: 2, hizmet: 3 },
  zahire: { id: "zahire", meslek: "ciftci", girdi: { tahil: 4, bez: 1 }, cikti: ["zahire", 1], takat: 1, hizmet: 2 },
  // Oduncu
  kesmeTas: { id: "kesmeTas", meslek: "oduncu", girdi: { tas: 3 }, cikti: ["kesmeTas", 1], takat: 1, hizmet: 2 },
  blok: {
    id: "blok", meslek: "oduncu", girdi: { kesmeTas: 2 }, cikti: ["blok", 1], takat: 2, hizmet: 3,
    arac: { mal: "alet", adet: 1, zorunlu: true },
  },
  kiris: { id: "kiris", meslek: "oduncu", girdi: { sertOdun: 2, kereste: 1 }, cikti: ["kiris", 1], takat: 2, hizmet: 3 },
  bakirOcagi: {
    id: "bakirOcagi", meslek: "oduncu", girdi: { kereste: 1 }, cikti: ["bakir", 2], takat: 2, hizmet: 3,
    arac: { mal: "alet", adet: 2, zorunlu: true },
  },
  degirmenTasi: {
    id: "degirmenTasi", meslek: "oduncu", girdi: { blok: 2, sertOdun: 1 }, cikti: ["degirmenTasi", 1], takat: 3, hizmet: 4,
  },
  // Demirci
  civi: { id: "civi", meslek: "demirci", girdi: { cevher: 1, komur: 1 }, cikti: ["civi", 4], takat: 1, hizmet: 2 },
  bicak: {
    id: "bicak", meslek: "demirci", girdi: { cevher: 1, komur: 1 }, cikti: ["bicak", 2], takat: 1, hizmet: 2, grup: ["dovme"],
  },
  mizrak: {
    id: "mizrak", meslek: "demirci", girdi: { cevher: 1, komur: 1, kereste: 1 }, cikti: ["mizrak", 1], takat: 1, hizmet: 2,
    grup: ["silah", "dovme"],
  },
  kilic: {
    id: "kilic", meslek: "demirci", girdi: { cevher: 2, komur: 2, deri: 1 }, cikti: ["kilic", 1], takat: 3, hizmet: 4,
    grup: ["silah", "dovme"],
  },
  zincir: {
    id: "zincir", meslek: "demirci", girdi: { cevher: 3, komur: 2 }, cikti: ["zincir", 1], takat: 3, hizmet: 4,
    grup: ["zirh", "zirhDayanikliligi"],
  },
  kalkan: {
    id: "kalkan", meslek: "demirci", girdi: { kereste: 2, cevher: 1 }, cikti: ["kalkan", 1], takat: 1, hizmet: 2,
    grup: ["zirh", "zirhDayanikliligi"],
  },
  pulZirh: {
    id: "pulZirh", meslek: "demirci", girdi: { zincir: 1, deri: 2, astar: 1 }, cikti: ["pulZirh", 1], takat: 4, hizmet: 5,
    grup: ["zirh", "zirhDayanikliligi"],
  },
  // Marangoz
  dograma: { id: "dograma", meslek: "marangoz", girdi: { kereste: 2, civi: 2 }, cikti: ["dograma", 1], takat: 1, hizmet: 2 },
  kagni: { id: "kagni", meslek: "marangoz", girdi: { kereste: 4, nal: 2 }, cikti: ["kagni", 1], takat: 2, hizmet: 3 },
  araba: {
    id: "araba", meslek: "marangoz", girdi: { kiris: 1, kereste: 4, civi: 4, kosum: 1 }, cikti: ["araba", 1], takat: 3, hizmet: 4,
  },
  oyma: { id: "oyma", meslek: "marangoz", girdi: { kereste: 1 }, cikti: ["oyma", 1], takat: 1, hizmet: 2 },
  saz: { id: "saz", meslek: "marangoz", girdi: { sertOdun: 1, deri: 1 }, cikti: ["saz", 1], takat: 1, hizmet: 2, grup: ["oyma"] },
  kundekari: {
    id: "kundekari", meslek: "marangoz", girdi: { sertOdun: 2, dograma: 1 }, cikti: ["kundekari", 1], takat: 3, hizmet: 4,
  },
  // Dokumacı
  bez: { id: "bez", meslek: "dokumaci", girdi: { yun: 2 }, cikti: ["bez", 1], takat: 1, hizmet: 2 },
  tabak: { id: "tabak", meslek: "dokumaci", girdi: { post: 2, ot: 1 }, cikti: ["deri", 2], takat: 1, hizmet: 2, grup: ["deri"] },
  kece: { id: "kece", meslek: "dokumaci", girdi: { yun: 3 }, cikti: ["kece", 1], takat: 1, hizmet: 2 },
  kumas: { id: "kumas", meslek: "dokumaci", girdi: { inceYun: 2 }, cikti: ["kumas", 1], takat: 1, hizmet: 2 },
  giysi: { id: "giysi", meslek: "dokumaci", girdi: { kumas: 1, post: 1 }, cikti: ["giysi", 1], takat: 1, hizmet: 2 },
  kosum: { id: "kosum", meslek: "dokumaci", girdi: { deri: 2, civi: 1 }, cikti: ["kosum", 1], takat: 1, hizmet: 2, grup: ["deri"] },
  cizme: { id: "cizme", meslek: "dokumaci", girdi: { deri: 2 }, cikti: ["cizme", 1], takat: 1, hizmet: 2, grup: ["deri"] },
  cadir: { id: "cadir", meslek: "dokumaci", girdi: { kece: 2, kereste: 1, bez: 1 }, cikti: ["cadir", 1], takat: 2, hizmet: 3 },
  astar: { id: "astar", meslek: "dokumaci", girdi: { kumas: 1, deri: 1 }, cikti: ["astar", 1], takat: 2, hizmet: 3 },
  // Kâtip: mürekkep ve senet (MESLEK_AGACLARI §2.10).
  murekkep: { id: "murekkep", meslek: "katip", girdi: { komur: 1, ot: 1 }, cikti: ["murekkep", 2], takat: 1, hizmet: 2 },
  senet: { id: "senet", meslek: "katip", girdi: { kagit: 1, murekkep: 1 }, cikti: ["senet", 1], takat: 1, hizmet: 2 },
  // Aşçı
  ekmek: { id: "ekmek", meslek: "asci", girdi: { tahil: 2, odun: 1 }, cikti: ["ekmek", 3], takat: 1, hizmet: 2, grup: ["sofra"] },
  corba: { id: "corba", meslek: "asci", girdi: { tahil: 1, su: 1 }, cikti: ["corba", 2], takat: 1, hizmet: 2, grup: ["sofra"] },
  un: { id: "un", meslek: "asci", girdi: { bugday: 2 }, cikti: ["un", 2], takat: 1, hizmet: 2 },
  kuruEt: { id: "kuruEt", meslek: "asci", girdi: { et: 2, tuz: 1 }, cikti: ["kuruEt", 2], takat: 1, hizmet: 2 },
  peksimet: { id: "peksimet", meslek: "asci", girdi: { un: 2, odun: 1 }, cikti: ["peksimet", 3], takat: 1, hizmet: 2 },
  pastirma: { id: "pastirma", meslek: "asci", girdi: { kuruEt: 2, sifaliOt: 1 }, cikti: ["pastirma", 1], takat: 1, hizmet: 2 },
  erzakSandigi: {
    id: "erzakSandigi", meslek: "asci", girdi: { zahire: 2, kuruEt: 2, peksimet: 3 }, cikti: ["erzakSandigi", 1], takat: 2,
    hizmet: 3,
  },
} as const satisfies Record<string, Tarif>;
export type TarifId = keyof typeof TARIFLER;

export function tarifBul(id: unknown): Tarif | undefined {
  return typeof id === "string" && Object.hasOwn(TARIFLER, id) ? (TARIFLER[id as TarifId] as Tarif) : undefined;
}
