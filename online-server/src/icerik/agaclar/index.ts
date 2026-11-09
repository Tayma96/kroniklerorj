// 14 meslek ağacı (beceri ağacı v2) ve türetilmiş tablolar: düğüm dizini, tarif/iş kilitleri (hangi düğümün
// hangi seviyesi açar), eski düğüm kimliği göçü (v1 `meslek.dal.kademe` → v2 düğüm + seviye) ve unvanlar.

import { MESLEK_IDLERI, type MeslekId } from "../meslekler.ts";
import arabulucu from "./arabulucu.ts";
import asci from "./asci.ts";
import asker from "./asker.ts";
import ciftci from "./ciftci.ts";
import demirci from "./demirci.ts";
import divan from "./divan.ts";
import dokumaci from "./dokumaci.ts";
import hanci from "./hanci.ts";
import katip from "./katip.ts";
import marangoz from "./marangoz.ts";
import oduncu from "./oduncu.ts";
import ozan from "./ozan.ts";
import sifaci from "./sifaci.ts";
import tuccar from "./tuccar.ts";
import type { Agac, BeceriDugumu, Etki, OnKosul } from "./tipler.ts";

export type { Agac, BeceriDugumu, Bolum, Etki, OnKosul, Seviye } from "./tipler.ts";
export { BOLUM_BEDEL, BOLUM_SURE_DK } from "./tipler.ts";

export const AGACLAR: Record<MeslekId, Agac> = {
  ciftci, oduncu, demirci, marangoz, dokumaci, asci, hanci, sifaci, ozan, katip, tuccar, arabulucu, asker, divan,
};

const DIZIN = new Map<string, BeceriDugumu>(MESLEK_IDLERI.flatMap((m) => AGACLAR[m].dugumler.map((d) => [d.id, d] as const)));

export function beceriDugumu(id: unknown): BeceriDugumu | undefined {
  return typeof id === "string" ? DIZIN.get(id) : undefined;
}

/** Bütün düğümler (ağaç sırasıyla). */
export const TUM_DUGUMLER: readonly BeceriDugumu[] = [...DIZIN.values()];

/** Etkinin hangi düğüm seviyesinde olduğu (etki toplamı için düz liste). */
export interface EtkiKaydi {
  dugum: string;
  seviye: number;
  etki: Etki;
}
export const ETKILER: readonly EtkiKaydi[] = TUM_DUGUMLER.flatMap((d) =>
  d.seviyeler.flatMap((s, n) => s.etkiler.map((etki) => ({ dugum: d.id, seviye: n + 1, etki }))),
);

function kilitler(tur: "tarif" | "is"): Record<string, OnKosul> {
  const sonuc: Record<string, OnKosul> = {};
  for (const { dugum, seviye, etki } of ETKILER) {
    const ad = etki.tur === "tarif" && tur === "tarif" ? etki.tarif : etki.tur === "is" && tur === "is" ? etki.is : undefined;
    if (ad && !Object.hasOwn(sonuc, ad)) sonuc[ad] = { dugum, seviye };
  }
  return sonuc;
}
/** Tarif ve usta iş kilitleri: kimlik → onu açan ilk düğüm seviyesi. */
export const TARIF_KILIDI: Readonly<Record<string, OnKosul>> = kilitler("tarif");
export const IS_KILIDI: Readonly<Record<string, OnKosul>> = kilitler("is");

// ---------------------------------------------------------------- v1 → v2 göçü

/** v1 dalları (sütun sırasıyla). */
export const ESKI_DALLAR: Record<MeslekId, readonly [string, string, string]> = {
  ciftci: ["ekin", "suru", "ambar"],
  oduncu: ["orman", "maden", "tas"],
  demirci: ["alet", "silah", "zirh"],
  marangoz: ["yapi", "arac", "tezyin"],
  dokumaci: ["kumas", "deri", "cadir"],
  asci: ["firin", "mutfak", "saklama"],
  hanci: ["konaklama", "etkinlik", "haber"],
  sifaci: ["hekimlik", "ebelik", "otlar"],
  ozan: ["sahne", "gonul", "destan"],
  katip: ["belge", "ulak", "defter"],
  tuccar: ["pazar", "kervan", "yol"],
  arabulucu: ["uzlastirma", "elcilik", "hukum"],
  asker: ["nobet", "sefer", "kesif"],
  divan: ["hazine", "nizam", "meclis"],
};

/**
 * Göç istisnaları: eski düğüm, açtığı tarif/işi kaybettirmemek için yeni düğümün 2. seviyesine çevrilir
 * (ör. `oduncu.maden.0` kömür tarifini ve cevher usta işini birlikte açıyordu).
 */
const GOC_ISTISNA: Record<string, OnKosul> = {
  "demirci.alet.0": { dugum: "demirci.aletcilik", seviye: 1 },
  "demirci.alet.1": { dugum: "demirci.aletcilik", seviye: 2 },
  "oduncu.orman.0": { dugum: "oduncu.baltacilik", seviye: 2 },
  "oduncu.maden.0": { dugum: "oduncu.madencilik", seviye: 2 },
  "ciftci.suru.0": { dugum: "ciftci.hayvancilik", seviye: 2 },
};

/** Eski düğüm kimliği → yeni düğüm ve seviye (çırak→çırak, kalfa→kalfa, usta→usta, pir→pir; aynı sütun). */
export function gocKarsiligi(eski: string): OnKosul | undefined {
  if (Object.hasOwn(GOC_ISTISNA, eski)) return GOC_ISTISNA[eski];
  const [m, dal, kdHam] = eski.split(".");
  if (!m || !Object.hasOwn(ESKI_DALLAR, m)) return undefined;
  const sutun = ESKI_DALLAR[m as MeslekId].indexOf(dal ?? "");
  const kd = Number(kdHam);
  if (sutun < 0 || !Number.isInteger(kd) || kd < 0 || kd > 3) return undefined;
  const bolum = (["cirak", "kalfa", "usta", "pir"] as const)[kd]!;
  const d = AGACLAR[m as MeslekId].dugumler.find((x) => x.bolum === bolum && (bolum === "pir" || x.sutun === sutun));
  return d ? { dugum: d.id, seviye: 1 } : undefined;
}

// ---------------------------------------------------------------- unvanlar (spec §5)

export interface Unvan {
  id: string;
  meslek: MeslekId;
  /** Başarı sayacı (`k.bs`) ve eşiği: tarif:<id> = üretilen adet, is:<id> = iş çıktısı, sat:akce = NPC satış akçesi,
   * teslim:<mal> = sipariş teslim adedi. */
  sayac: string;
  esik: number;
}

/** [PARAMETRE] Kalıcı unvanlar; metin `onl.unvan.<id>`. */
export const UNVANLAR: readonly Unvan[] = [
  { id: "demirci.aletUstasi", meslek: "demirci", sayac: "tarif:alet", esik: 20 },
  { id: "demirci.silahUstasi", meslek: "demirci", sayac: "teslim:kilic", esik: 20 },
  { id: "ciftci.bereketliToprak", meslek: "ciftci", sayac: "tarif:hasat", esik: 200 },
  { id: "oduncu.damarBilen", meslek: "oduncu", sayac: "is:cevher", esik: 100 },
  { id: "tuccar.kervanUstadi", meslek: "tuccar", sayac: "sat:akce", esik: 500 },
];
