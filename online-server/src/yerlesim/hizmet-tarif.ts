// E4.3 hizmet pazarı: bütün hazır hizmetler bu katalogdan tanımlanır. İstemci girdisine güvenilmez.
import type { MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";

export type HizmetHedefi = "kisi" | "hane" | "iki_taraf" | "kasaba";
export type HizmetEtki =
  | { tur: "hal"; alan: string; deger: number }
  | { tur: "gorus" | "nam" | "gosterge"; alan: string; deger: number }
  | { tur: "bilgi" | "kayit"; alan: string; deger?: number };

export interface HizmetTarifi {
  id: string;
  meslek: MeslekId;
  dugum: string;
  seviye: number;
  /** Varsa hizmet düğümüne ek olarak açılması gereken çapraz meslek sinerjisi. */
  acar?: string;
  girdi: Partial<Record<MalId, number>>;
  takat: number;
  /** Oyuncu başına hizmet başına aylık hazırlama tavanı. */
  aylikTavan: number;
  hedef: HizmetHedefi;
  etki: readonly HizmetEtki[];
  /** Hazır hizmet stoğu; ilan beklerken bu süre sonunda bozulur. */
  hazir: { adet: number; gecerlilikAy: number };
  fiyatTaban: number;
  /** NPC olay talebi varsa hazineden ayrılacak ödül; açılışta rezerve edilir. */
  npcOdul?: number;
}

/** Oyuncu pazarındaki hazır hizmetler: şifacı, ozan, hancı, aşçı ve çapraz meslek sinerjili hizmetler. */
export const HIZMET_TARIFLERI: readonly HizmetTarifi[] = [
  {
    id: "yaraBak",
    meslek: "sifaci",
    dugum: "sifaci.sargiMerhem",
    seviye: 2,
    girdi: { sifaliOt: 1 },
    takat: 1,
    aylikTavan: 20,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "can", deger: 10 }],
    hazir: { adet: 1, gecerlilikAy: 2 },
    fiyatTaban: 6,
  },
  {
    id: "kirikSar",
    meslek: "sifaci",
    dugum: "sifaci.kirikSarma",
    seviye: 1,
    girdi: { bez: 1, kereste: 1, sifaliOt: 1 },
    takat: 2,
    aylikTavan: 10,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "can", deger: 20 }],
    hazir: { adet: 1, gecerlilikAy: 2 },
    fiyatTaban: 12,
  },
  {
    id: "turku",
    meslek: "ozan",
    dugum: "ozan.turkuMani",
    seviye: 1,
    girdi: {},
    takat: 1,
    aylikTavan: 20,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "gonul", deger: 3 }],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 2,
  },
  {
    id: "lohusa",
    npcOdul: 8,
    meslek: "sifaci",
    dugum: "sifaci.lohusaBakimi",
    seviye: 1,
    girdi: { sifaliOt: 1, bez: 1 },
    takat: 2,
    aylikTavan: 8,
    hedef: "kisi",
    etki: [
      { tur: "hal", alan: "can", deger: 5 },
      { tur: "hal", alan: "kondisyon", deger: 8 },
    ],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 5,
  },
  {
    id: "sazGecesi",
    meslek: "hanci",
    dugum: "hanci.sazGecesi",
    seviye: 1,
    acar: "ortakSahne",
    girdi: { ekmek: 1, corba: 1 },
    takat: 2,
    aylikTavan: 4,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "gonul", deger: 5 }],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 6,
  },
  {
    id: "barisSofrasi",
    meslek: "arabulucu",
    dugum: "arabulucu.barisSofrasi",
    seviye: 1,
    acar: "barisCorbasi",
    girdi: { ekmek: 1, corba: 1 },
    takat: 2,
    aylikTavan: 4,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "gonul", deger: 6 }],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 7,
  },
  {
    id: "ziyafet",
    meslek: "asci",
    dugum: "asci.senlikZiyafeti",
    seviye: 1,
    acar: "baklaYemegi",
    girdi: { un: 1, ekmek: 1, corba: 1 },
    takat: 3,
    aylikTavan: 3,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "gonul", deger: 8 }],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 10,
  },
  {
    id: "teselli",
    npcOdul: 5,
    meslek: "ozan",
    dugum: "ozan.teselli",
    seviye: 1,
    girdi: {},
    takat: 1,
    aylikTavan: 12,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "gonul", deger: 5 }],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 3,
  },
] as const;

const DIZIN = new Map(HIZMET_TARIFLERI.map((x) => [x.id, x]));
export function hizmetTarifiBul(id: unknown): HizmetTarifi | undefined {
  return typeof id === "string" ? DIZIN.get(id) : undefined;
}
