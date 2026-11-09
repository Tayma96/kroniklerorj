// Çevrimiçi 14 meslek (ana tasarım §5.2): aile, ağırlık, müşteri ve tedarik bağları. Beceri ağaçları v2
// (spec 2026-11-09) `agaclar/` altındadır; v1'in 3 dal × 4 kademe düğümü göç tablosunda (`agaclar/index.ts`) yaşar.

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

export type Aile = "toprak" | "zanaat" | "hizmet" | "ticaret" | "toplum";

export interface Meslek {
  id: MeslekId;
  aile: Aile;
  /** Ağır meslek: kalfalık 16 yaşında açılır (Ç7). */
  agir: boolean;
  musteri: MeslekId[];
  tedarik: MeslekId[];
}

interface Tanim {
  aile: Aile;
  agir?: boolean;
  musteri: MeslekId[];
  tedarik: MeslekId[];
}

const TANIMLAR: Record<MeslekId, Tanim> = {
  ciftci: {
    aile: "toprak",
    musteri: ["asci", "dokumaci", "tuccar"],
    tedarik: ["demirci"],
  },
  oduncu: {
    aile: "toprak",
    agir: true,
    musteri: ["demirci", "marangoz", "hanci"],
    tedarik: ["demirci"],
  },
  demirci: {
    aile: "zanaat",
    musteri: ["ciftci", "oduncu", "asker", "marangoz"],
    tedarik: ["oduncu"],
  },
  marangoz: {
    aile: "zanaat",
    musteri: ["hanci", "tuccar", "ciftci"],
    tedarik: ["oduncu", "demirci"],
  },
  dokumaci: {
    aile: "zanaat",
    musteri: ["asker", "tuccar", "hanci"],
    tedarik: ["ciftci"],
  },
  asci: {
    aile: "zanaat",
    musteri: ["hanci", "asker", "ozan"],
    tedarik: ["ciftci", "oduncu"],
  },
  hanci: {
    aile: "hizmet",
    musteri: ["tuccar", "ozan", "katip"],
    tedarik: ["asci", "marangoz"],
  },
  sifaci: {
    aile: "hizmet",
    musteri: ["asker", "hanci", "ciftci"],
    tedarik: ["ciftci"],
  },
  ozan: {
    aile: "hizmet",
    musteri: ["hanci", "divan"],
    tedarik: ["hanci"],
  },
  katip: {
    aile: "hizmet",
    musteri: ["tuccar", "divan", "arabulucu"],
    tedarik: ["tuccar"],
  },
  tuccar: {
    aile: "ticaret",
    musteri: ["ciftci", "demirci", "dokumaci"],
    tedarik: ["katip", "marangoz"],
  },
  arabulucu: {
    aile: "toplum",
    musteri: ["divan", "tuccar"],
    tedarik: ["katip"],
  },
  asker: {
    aile: "toplum",
    agir: true,
    musteri: ["divan", "tuccar"],
    tedarik: ["demirci", "dokumaci"],
  },
  divan: {
    aile: "toplum",
    musteri: ["asker", "katip"],
    tedarik: ["katip"],
  },
};

function kur(id: MeslekId, t: Tanim): Meslek {
  return { id, aile: t.aile, agir: t.agir ?? false, musteri: t.musteri, tedarik: t.tedarik };
}

export const MESLEKLER_ONLINE = Object.fromEntries(MESLEK_IDLERI.map((id) => [id, kur(id, TANIMLAR[id])])) as Record<
  MeslekId,
  Meslek
>;

export function meslekBul(id: unknown): Meslek | undefined {
  return typeof id === "string" && Object.hasOwn(MESLEKLER_ONLINE, id) ? MESLEKLER_ONLINE[id as MeslekId] : undefined;
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
