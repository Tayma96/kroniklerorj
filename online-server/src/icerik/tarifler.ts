// Çevrimiçi tarifler (ana tasarım §5.4–5.5, dikey dilim: çiftçi–oduncu–demirci zinciri). Tarif bir meslek
// düğümüne bağlıdır; girdiyi çıktıya çevirir, takat ve kondisyon harcar, mesleğine hizmet yazar. Sayılar [PARAMETRE].
// `arac`: envanterde varsa çıktıyı artıran ve kullanıldıkça aşınan alet. Metinler istemcide `tarif.<id>` anahtarıyla.

import type { MalId } from "./mallar.ts";
import type { MeslekId } from "./meslekler.ts";

export interface Tarif {
  id: string;
  meslek: MeslekId;
  /** Gereken düğüm (`meslek.dal.kademe`); hangi meslek ilerlemesinde açık olduğu önemsizdir. */
  dugum: string;
  girdi: Partial<Record<MalId, number>>;
  cikti: [MalId, number];
  takat: number;
  hizmet: number;
  /** Araç: envanterde varsa çıktı `adet` olur, bir kullanım aşınması yazılır. */
  arac?: { mal: MalId; adet: number };
}

export const TARIFLER = {
  kereste: { id: "kereste", meslek: "oduncu", dugum: "oduncu.orman.0", girdi: { odun: 1 }, cikti: ["kereste", 1], takat: 1, hizmet: 2 },
  komur: { id: "komur", meslek: "oduncu", dugum: "oduncu.maden.0", girdi: { odun: 1 }, cikti: ["komur", 1], takat: 1, hizmet: 2 },
  nal: { id: "nal", meslek: "demirci", dugum: "demirci.alet.0", girdi: { cevher: 1, komur: 1 }, cikti: ["nal", 2], takat: 1, hizmet: 2 },
  alet: {
    id: "alet", meslek: "demirci", dugum: "demirci.alet.1", girdi: { cevher: 2, komur: 1, kereste: 1 }, cikti: ["alet", 1], takat: 2,
    hizmet: 3,
  },
  hasat: {
    id: "hasat", meslek: "ciftci", dugum: "ciftci.ekin.0", girdi: {}, cikti: ["tahil", 3], takat: 2, hizmet: 2,
    arac: { mal: "alet", adet: 5 },
  },
  kirkim: { id: "kirkim", meslek: "ciftci", dugum: "ciftci.suru.0", girdi: {}, cikti: ["yun", 2], takat: 1, hizmet: 1 },
} as const satisfies Record<string, Tarif>;
export type TarifId = keyof typeof TARIFLER;

export function tarifBul(id: unknown): Tarif | undefined {
  return typeof id === "string" && Object.hasOwn(TARIFLER, id) ? (TARIFLER[id as TarifId] as Tarif) : undefined;
}
