// E4.3 hizmet pazarı: bütün hazır hizmetler bu katalogdan tanımlanır. İstemci girdisine güvenilmez.
import type { MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";

export type HizmetHedefi = "kisi" | "hane" | "iki_taraf" | "kasaba";
export type HizmetEtki =
  | { tur: "hal"; alan: string; deger: number }
  /** Kanca partisi 2: alıcının bu ailedeki araçlarının aşınma sayacını adet başına `deger` kullanım geri alır. */
  | { tur: "onarim"; alan: "alet" | "silah" | "zirh"; deger: number }
  /** Kanca partisi 2: alıcının malını işler (adet başına `girdiAdet` `girdi` → `deger` `alan`; tarifle aynı oran). */
  | { tur: "isleme"; alan: MalId; deger: number; girdi: MalId; girdiAdet: number }
  | { tur: "gorus" | "nam" | "gosterge"; alan: string; deger: number }
  | { tur: "bilgi" | "kayit"; alan: string; deger?: number };

export interface HizmetTarifi {
  id: string;
  meslek: MeslekId;
  dugum: string;
  seviye: number;
  /** Varsa hizmet düğümüne ek olarak açılması gereken çapraz meslek sinerjisi. */
  acar?: string;
  /** Birbirini karşılıklı tanımlayan veya birlikte zorunlu olan çapraz sinerjiler. */
  acars?: readonly string[];
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
  /**
   * Kanca partisi 2: kalite etkisi grupları. `kalite` etkisinin hedefi hizmet kimliği ya da bu gruplardan biriyse
   * hazırlanan hizmetin hal etkisi yüzde artar (hizmet-pazari.ts hizmetKalitesi).
   */
  grup?: readonly string[];
  /**
   * Kanca partisi 2: araç etkisinin hedefi (`arac` etkisi `hedef`). Hazırlarken envanterde o araç varsa ilk hal etkisine
   * adet başına `arti × birim` eklenir ve araç bir kullanım aşınır.
   */
  arac?: { hedef: string; birim: number };
}

/** Oyuncu pazarındaki hazır hizmetler: şifacı, ozan, hancı, aşçı ve çapraz meslek sinerjili hizmetler. */
export const HIZMET_TARIFLERI: readonly HizmetTarifi[] = [
  {
    id: "yaraBak",
    grup: ["sifa"],
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
    grup: ["sifa"],
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
    arac: { hedef: "sazliSahne", birim: 1 },
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
    // Kanca partisi 2: çocuk hastalıkları bilgisi (`kalite:cocukRiski`) lohusa ve güç doğum bakımının kalitesidir.
    grup: ["sifa", "cocukRiski"],
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
    acars: ["ortakSahne", "sazGecesi"],
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
  // ── Kanca partisi 2 (18 Kasım): ağaçtaki boşta hizmetler. Hal etkili olanlar oyuncu pazarında; onarım ve işleme
  // alıcının aracına/malına uygulanır. Bütün akçe oyuncudan oyuncuya; değerler [PARAMETRE].
  {
    id: "gucDogum",
    grup: ["sifa", "cocukRiski"],
    meslek: "sifaci",
    dugum: "sifaci.gucDogum",
    seviye: 1,
    girdi: { sifaliOt: 2, bez: 1 },
    takat: 3,
    aylikTavan: 4,
    hedef: "kisi",
    etki: [
      { tur: "hal", alan: "can", deger: 15 },
      { tur: "hal", alan: "kondisyon", deger: 12 },
    ],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 12,
  },
  {
    id: "yaraDikisi",
    grup: ["sifa"],
    arac: { hedef: "yaraDikisi", birim: 10 },
    meslek: "sifaci",
    dugum: "sifaci.yaraDikisi",
    seviye: 1,
    girdi: { sifaliOt: 1, bez: 1 },
    takat: 2,
    aylikTavan: 6,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "can", deger: 25 }],
    hazir: { adet: 1, gecerlilikAy: 2 },
    fiyatTaban: 14,
  },
  {
    id: "dertlesme",
    meslek: "ozan",
    dugum: "ozan.dertlesme",
    seviye: 1,
    girdi: {},
    takat: 1,
    aylikTavan: 12,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "gonul", deger: 6 }],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 3,
  },
  {
    id: "turkuYak",
    grup: ["destan"],
    arac: { hedef: "sazliSahne", birim: 1 },
    meslek: "ozan",
    dugum: "ozan.kahramanlikTurkusu",
    seviye: 1,
    girdi: {},
    takat: 2,
    aylikTavan: 8,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "gonul", deger: 5 }],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 4,
  },
  {
    id: "atisma",
    arac: { hedef: "sazliSahne", birim: 1 },
    meslek: "ozan",
    dugum: "ozan.atisma",
    seviye: 1,
    girdi: {},
    takat: 2,
    aylikTavan: 6,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "gonul", deger: 6 }],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 5,
  },
  {
    id: "barisIlahisi",
    meslek: "ozan",
    dugum: "ozan.barisIlahisi",
    seviye: 1,
    girdi: {},
    takat: 1,
    aylikTavan: 8,
    hedef: "kisi",
    etki: [{ tur: "hal", alan: "gonul", deger: 5 }],
    hazir: { adet: 1, gecerlilikAy: 1 },
    fiyatTaban: 4,
  },
  {
    id: "onarimHizmeti",
    meslek: "demirci",
    dugum: "demirci.temelDovme",
    seviye: 3,
    girdi: { komur: 1 },
    takat: 1,
    aylikTavan: 10,
    hedef: "kisi",
    etki: [
      { tur: "onarim", alan: "alet", deger: 2 },
      { tur: "onarim", alan: "silah", deger: 2 },
    ],
    hazir: { adet: 1, gecerlilikAy: 2 },
    fiyatTaban: 6,
  },
  {
    id: "yelekOnarimi",
    meslek: "demirci",
    dugum: "demirci.zirhYapimi",
    seviye: 1,
    girdi: { civi: 1 },
    takat: 1,
    aylikTavan: 8,
    hedef: "kisi",
    etki: [{ tur: "onarim", alan: "zirh", deger: 2 }],
    hazir: { adet: 1, gecerlilikAy: 2 },
    fiyatTaban: 6,
  },
  {
    id: "postTabaklama",
    meslek: "dokumaci",
    dugum: "dokumaci.tabaklama",
    seviye: 3,
    girdi: { ot: 1 },
    takat: 1,
    aylikTavan: 10,
    hedef: "kisi",
    etki: [{ tur: "isleme", alan: "deri", deger: 2, girdi: "post", girdiAdet: 2 }],
    hazir: { adet: 1, gecerlilikAy: 2 },
    fiyatTaban: 4,
  },
] as const;

const DIZIN = new Map(HIZMET_TARIFLERI.map((x) => [x.id, x]));
export function hizmetTarifiBul(id: unknown): HizmetTarifi | undefined {
  return typeof id === "string" ? DIZIN.get(id) : undefined;
}
