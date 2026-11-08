// Çevrimiçi 14 meslek ve beceri ağaçları (ana tasarım §5.2–5.3). Her meslekte 3 dal, her dalda 4 kademe
// düğümü (çırak, kalfa, usta, pir). Düğüm sayı artırmaz, imkân açar; metinler istemcide
// `mes.<meslek>.<dal>.<kademe>` anahtarıyla çevrilir. Dal ve düğüm adları içerik verisidir (D-31).

import type { MalId } from "./mallar.ts";

export const MESLEK_IDLERI = [
  "ciftci",
  "oduncu",
  "demirci",
  "marangoz",
  "dokumaci",
  "asci",
  "hanci",
  "sifaci",
  "ozan",
  "katip",
  "tuccar",
  "arabulucu",
  "asker",
  "divan",
] as const;
export type MeslekId = (typeof MESLEK_IDLERI)[number];

export const KADEMELER = ["cirak", "kalfa", "usta", "pir"] as const;
export type Kademe = 0 | 1 | 2 | 3;

export type DugumTuru = "tarif" | "kalite" | "toplu" | "ozel" | "hak";
export type Aile = "toprak" | "zanaat" | "hizmet" | "ticaret" | "toplum";

export interface Dugum {
  id: string;
  dal: string;
  kd: Kademe;
  tur: DugumTuru;
  /** Bu düğümün işi başka mesleğin ürününü ister (meslekler arası bağ). */
  ister?: MalId[];
}

export interface Meslek {
  id: MeslekId;
  aile: Aile;
  dallar: readonly [string, string, string];
  dugumler: Dugum[];
  /** Ağır meslek: kalfalık 16 yaşında açılır (Ç7). */
  agir: boolean;
  musteri: MeslekId[];
  tedarik: MeslekId[];
}

/** Kademeye göre öntanımlı düğüm türü: çırak tarif, kalfa kalite, usta özel iş, pir toplumsal hak. */
const KADEME_TURU: readonly DugumTuru[] = ["tarif", "kalite", "ozel", "hak"];

interface Tanim {
  aile: Aile;
  dallar: readonly [string, string, string];
  agir?: boolean;
  musteri: MeslekId[];
  tedarik: MeslekId[];
  /** Düğüm kimliği → tür ya da ister istisnası. */
  ozel?: Record<string, { tur?: DugumTuru; ister?: MalId[] }>;
}

const TANIMLAR: Record<MeslekId, Tanim> = {
  ciftci: {
    aile: "toprak",
    dallar: ["ekin", "suru", "ambar"],
    musteri: ["asci", "dokumaci", "tuccar"],
    tedarik: ["demirci"],
    ozel: { "ekin.1": { ister: ["alet"] }, "ambar.1": { tur: "toplu" } },
  },
  oduncu: {
    aile: "toprak",
    dallar: ["orman", "maden", "tas"],
    agir: true,
    musteri: ["demirci", "marangoz", "hanci"],
    tedarik: ["demirci"],
    ozel: { "maden.1": { ister: ["alet"] }, "orman.1": { tur: "toplu" } },
  },
  demirci: {
    aile: "zanaat",
    dallar: ["alet", "silah", "zirh"],
    musteri: ["ciftci", "oduncu", "asker", "marangoz"],
    tedarik: ["oduncu"],
    ozel: { "alet.1": { ister: ["kereste"] }, "zirh.2": { ister: ["deri"] }, "alet.2": { tur: "toplu" } },
  },
  marangoz: {
    aile: "zanaat",
    dallar: ["yapi", "arac", "tezyin"],
    musteri: ["hanci", "tuccar", "ciftci"],
    tedarik: ["oduncu", "demirci"],
    ozel: { "yapi.0": { ister: ["kereste"] } },
  },
  dokumaci: {
    aile: "zanaat",
    dallar: ["kumas", "deri", "cadir"],
    musteri: ["asker", "tuccar", "hanci"],
    tedarik: ["ciftci"],
    ozel: { "kumas.0": { ister: ["yun"] } },
  },
  asci: {
    aile: "zanaat",
    dallar: ["firin", "mutfak", "saklama"],
    musteri: ["hanci", "asker", "ozan"],
    tedarik: ["ciftci", "oduncu"],
    ozel: { "firin.0": { ister: ["tahil"] }, "mutfak.1": { tur: "toplu" } },
  },
  hanci: {
    aile: "hizmet",
    dallar: ["konaklama", "etkinlik", "haber"],
    musteri: ["tuccar", "ozan", "katip"],
    tedarik: ["asci", "marangoz"],
  },
  sifaci: {
    aile: "hizmet",
    dallar: ["hekimlik", "ebelik", "otlar"],
    musteri: ["asker", "hanci", "ciftci"],
    tedarik: ["ciftci"],
  },
  ozan: {
    aile: "hizmet",
    dallar: ["sahne", "gonul", "destan"],
    musteri: ["hanci", "divan"],
    tedarik: ["hanci"],
  },
  katip: {
    aile: "hizmet",
    dallar: ["belge", "ulak", "defter"],
    musteri: ["tuccar", "divan", "arabulucu"],
    tedarik: ["tuccar"],
  },
  tuccar: {
    aile: "ticaret",
    dallar: ["pazar", "kervan", "yol"],
    musteri: ["ciftci", "demirci", "dokumaci"],
    tedarik: ["katip", "marangoz"],
    ozel: { "kervan.1": { tur: "toplu" } },
  },
  arabulucu: {
    aile: "toplum",
    dallar: ["uzlastirma", "elcilik", "hukum"],
    musteri: ["divan", "tuccar"],
    tedarik: ["katip"],
  },
  asker: {
    aile: "toplum",
    dallar: ["nobet", "sefer", "kesif"],
    agir: true,
    musteri: ["divan", "tuccar"],
    tedarik: ["demirci", "dokumaci"],
  },
  divan: {
    aile: "toplum",
    dallar: ["hazine", "nizam", "meclis"],
    musteri: ["asker", "katip"],
    tedarik: ["katip"],
  },
};

function kur(id: MeslekId, t: Tanim): Meslek {
  const dugumler: Dugum[] = [];
  for (const dal of t.dallar) {
    for (let kd = 0 as Kademe; kd <= 3; kd = (kd + 1) as Kademe) {
      const o = t.ozel?.[`${dal}.${kd}`];
      dugumler.push({
        id: `${id}.${dal}.${kd}`,
        dal,
        kd,
        tur: o?.tur ?? KADEME_TURU[kd]!,
        ...(o?.ister ? { ister: o.ister } : {}),
      });
      if (kd === 3) break;
    }
  }
  return { id, aile: t.aile, dallar: t.dallar, dugumler, agir: t.agir ?? false, musteri: t.musteri, tedarik: t.tedarik };
}

export const MESLEKLER_ONLINE = Object.fromEntries(MESLEK_IDLERI.map((id) => [id, kur(id, TANIMLAR[id])])) as Record<
  MeslekId,
  Meslek
>;

export function meslekBul(id: unknown): Meslek | undefined {
  return typeof id === "string" && Object.hasOwn(MESLEKLER_ONLINE, id) ? MESLEKLER_ONLINE[id as MeslekId] : undefined;
}

export function dugumBul(m: Meslek, id: unknown): Dugum | undefined {
  return typeof id === "string" ? m.dugumler.find((d) => d.id === id) : undefined;
}

/** NPC meslekleri (`kisilik.ts` MESLEKLER adları) → çevrimiçi meslek. İşsiz NPC hiçbir mesleği doldurmaz. */
export const NPC_MESLEK_ESLEME: Record<string, MeslekId | null> = {
  çiftçi: "ciftci",
  demirci: "demirci",
  tüccar: "tuccar",
  balıkçı: "ciftci",
  avcı: "ciftci",
  çoban: "ciftci",
  fırıncı: "asci",
  müzisyen: "ozan",
  şifacı: "sifaci",
  asker: "asker",
  işsiz: null,
};
