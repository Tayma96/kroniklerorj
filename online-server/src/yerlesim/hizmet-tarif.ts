// E4.3 hizmet pazarı: bütün hazır hizmetler bu katalogdan tanımlanır. Bu ilk dilim katalog sözleşmesini
// kurar; hazırlama/ilan/teslim yürütücüsü henüz bu kayıtlara bağlanmış değildir. İstemci girdisine güvenilmez.
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
  girdi: Partial<Record<MalId, number>>;
  takat: number;
  hedef: HizmetHedefi;
  etki: readonly HizmetEtki[];
  /** Hazır hizmet stoğu; ilan beklerken bu süre sonunda bozulur. */
  hazir: { adet: number; gecerlilikAy: number };
  fiyatTaban: number;
}

/** İlk uygulanacak hizmetler: şifacının doğrudan iyileştirmesi ve ozanın han sahnesi. */
export const HIZMET_TARIFLERI: readonly HizmetTarifi[] = [
  {
    id: "yaraBak",
    meslek: "sifaci",
    dugum: "sifaci.sargiMerhem",
    seviye: 2,
    girdi: { merhem: 1 },
    takat: 1,
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
    girdi: { bez: 1, kereste: 1, merhem: 1 },
    takat: 2,
    hedef: "kisi",
    etki: [
      { tur: "hal", alan: "can", deger: 20 },
      { tur: "kayit", alan: "yaraliDurumunuBitir" },
    ],
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
    hedef: "kasaba",
    etki: [{ tur: "hal", alan: "gonul", deger: 3 }],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 2,
  },
] as const;

const DIZIN = new Map(HIZMET_TARIFLERI.map((x) => [x.id, x]));
export function hizmetTarifiBul(id: unknown): HizmetTarifi | undefined {
  return typeof id === "string" ? DIZIN.get(id) : undefined;
}
