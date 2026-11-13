// Çevrimiçi meslek içeriği: online-server/src/icerik/meslekler.ts, mallar.ts, tarifler.ts ve yerlesim/meslek.ts,
// temel-is.ts, npc-taban.ts, tarif.ts, pazar.ts, hal.ts [PARAMETRE] değerlerinin kopyası (sunucu paketi içe aktarılmaz; sunucuda değişirse burası da aynı
// committe güncellenir). Yalnız arayüzde açılış şartını, ağacın biçimini ve NPC etiket fiyatını yazmak içindir;
// sonucu (kademe, düğüm, çıktı, fırsat, ödenen fiyat) her zaman sunucu belirler.
import type { BeceriPuani, Envanter, Kademe, KondisyonKademesi, MalId, MeslekId, MeslekIlerleme, TarifSatiri } from "./protokol";
import { IS_IDLERI, MAL_IDLERI, MESLEK_IDLERI, type IsId } from "./protokol";

export type DugumTuru = "tarif" | "kalite" | "toplu" | "ozel" | "hak";
export type Aile = "toprak" | "zanaat" | "hizmet" | "ticaret" | "toplum";
export interface Dugum { id: string; dal: string; kd: Kademe; tur: DugumTuru; ister?: MalId[] }
export interface MeslekTanimi {
  id: MeslekId;
  aile: Aile;
  dallar: readonly [string, string, string];
  dugumler: Dugum[];
  agir: boolean;
  musteri: MeslekId[];
  tedarik: MeslekId[];
}

/** [PARAMETRE] sunucu meslek.ts / temel-is.ts / npc-taban.ts. */
export const MESLEK_YASI = 13;
export const AGIR_KALFA_YASI = 16;
export const PIR_CIRAK = 2;
export const GERI_ALMA_ARALIK = 12;
export const TEMEL_IS_YASI = 13;
export const TEMEL_TAKAT = 1;
export const NPC_CARPAN = 2.5;
export const NPC_AYLIK_KOTA = 3;
/** Sunucu yanıtı gelmeden önce kademe eşiği gösterilecekse (kalfa, usta, pir). Yanıttaki kademeHizmet önce gelir. */
export const KADEME_HIZMET_VARSAYILAN: readonly number[] = [0, 24, 72, 72];

const KADEME_TURU: readonly DugumTuru[] = ["tarif", "kalite", "ozel", "hak"];
type Tanim = Omit<MeslekTanimi, "id" | "dugumler" | "agir"> & { agir?: boolean; ozel?: Record<string, { tur?: DugumTuru; ister?: MalId[] }> };

const TANIMLAR: Record<MeslekId, Tanim> = {
  ciftci: { aile: "toprak", dallar: ["ekin", "suru", "ambar"], musteri: ["asci", "dokumaci", "tuccar"], tedarik: ["demirci"], ozel: { "ekin.1": { ister: ["alet"] }, "ambar.1": { tur: "toplu" } } },
  oduncu: { aile: "toprak", dallar: ["orman", "maden", "tas"], agir: true, musteri: ["demirci", "marangoz", "hanci"], tedarik: ["demirci"], ozel: { "maden.1": { ister: ["alet"] }, "orman.1": { tur: "toplu" } } },
  demirci: { aile: "zanaat", dallar: ["alet", "silah", "zirh"], musteri: ["ciftci", "oduncu", "asker", "marangoz"], tedarik: ["oduncu"], ozel: { "alet.1": { ister: ["kereste"] }, "zirh.2": { ister: ["deri"] }, "alet.2": { tur: "toplu" } } },
  marangoz: { aile: "zanaat", dallar: ["yapi", "arac", "tezyin"], musteri: ["hanci", "tuccar", "ciftci"], tedarik: ["oduncu", "demirci"], ozel: { "yapi.0": { ister: ["kereste"] } } },
  dokumaci: { aile: "zanaat", dallar: ["kumas", "deri", "cadir"], musteri: ["asker", "tuccar", "hanci"], tedarik: ["ciftci"], ozel: { "kumas.0": { ister: ["yun"] } } },
  asci: { aile: "zanaat", dallar: ["firin", "mutfak", "saklama"], musteri: ["hanci", "asker", "ozan"], tedarik: ["ciftci", "oduncu"], ozel: { "firin.0": { ister: ["tahil"] }, "mutfak.1": { tur: "toplu" } } },
  hanci: { aile: "hizmet", dallar: ["konaklama", "etkinlik", "haber"], musteri: ["tuccar", "ozan", "katip"], tedarik: ["asci", "marangoz"] },
  sifaci: { aile: "hizmet", dallar: ["hekimlik", "ebelik", "otlar"], musteri: ["asker", "hanci", "ciftci"], tedarik: ["ciftci"] },
  ozan: { aile: "hizmet", dallar: ["sahne", "gonul", "destan"], musteri: ["hanci", "divan"], tedarik: ["hanci"] },
  katip: { aile: "hizmet", dallar: ["belge", "ulak", "defter"], musteri: ["tuccar", "divan", "arabulucu"], tedarik: ["tuccar"] },
  tuccar: { aile: "ticaret", dallar: ["pazar", "kervan", "yol"], musteri: ["ciftci", "demirci", "dokumaci"], tedarik: ["katip", "marangoz"], ozel: { "kervan.1": { tur: "toplu" } } },
  arabulucu: { aile: "toplum", dallar: ["uzlastirma", "elcilik", "hukum"], musteri: ["divan", "tuccar"], tedarik: ["katip"] },
  asker: { aile: "toplum", dallar: ["nobet", "sefer", "kesif"], agir: true, musteri: ["divan", "tuccar"], tedarik: ["demirci", "dokumaci"] },
  divan: { aile: "toplum", dallar: ["hazine", "nizam", "meclis"], musteri: ["asker", "katip"], tedarik: ["katip"] },
};

function kur(id: MeslekId, t: Tanim): MeslekTanimi {
  const dugumler: Dugum[] = [];
  for (const dal of t.dallar) {
    for (const kd of [0, 1, 2, 3] as Kademe[]) {
      const o = t.ozel?.[`${dal}.${kd}`];
      dugumler.push({ id: `${id}.${dal}.${kd}`, dal, kd, tur: o?.tur ?? KADEME_TURU[kd], ...(o?.ister ? { ister: o.ister } : {}) });
    }
  }
  return { id, aile: t.aile, dallar: t.dallar, dugumler, agir: t.agir ?? false, musteri: t.musteri, tedarik: t.tedarik };
}

export const MESLEKLER = Object.fromEntries(MESLEK_IDLERI.map((id) => [id, kur(id, TANIMLAR[id])])) as Record<MeslekId, MeslekTanimi>;

/** Malın NPC taban değeri ve asıl üreten meslek (sunucu mallar.ts). taban 0 = ticareti yapılmaz (su). */
export const MALLAR: Record<MalId, { taban: number; meslek: MeslekId }> = {
  odun: { taban: 1, meslek: "oduncu" }, sertOdun: { taban: 4, meslek: "oduncu" }, tas: { taban: 1, meslek: "oduncu" },
  ot: { taban: 1, meslek: "sifaci" }, yun: { taban: 2, meslek: "ciftci" }, su: { taban: 0, meslek: "hanci" },
  kereste: { taban: 3, meslek: "oduncu" }, cevher: { taban: 3, meslek: "oduncu" }, komur: { taban: 3, meslek: "oduncu" },
  tahil: { taban: 2, meslek: "ciftci" }, deri: { taban: 3, meslek: "dokumaci" }, alet: { taban: 14, meslek: "demirci" },
  nal: { taban: 4, meslek: "demirci" }, sifaliOt: { taban: 3, meslek: "sifaci" }, inceYun: { taban: 4, meslek: "ciftci" },
  kagit: { taban: 6, meslek: "tuccar" }, murekkep: { taban: 0, meslek: "katip" }, senet: { taban: 0, meslek: "katip" },
};
/** NPC'nin satabildiği mallar (su hariç). */
export const NPC_MALLARI: readonly MalId[] = MAL_IDLERI.filter((m) => MALLAR[m].taban > 0);
/** NPC etiket fiyatı (birim). Ödenen tutarın dökümü alımdan sonra sunucudan gelir. */
export const npcEtiketFiyati = (mal: MalId) => Math.ceil(MALLAR[mal].taban * NPC_CARPAN);

/** Temel işler (sunucu temel-is.ts TEMEL_ISLER): çıktı malı, işi kendi işi sayan meslek, usta iş düğümü. */
export const TEMEL_ISLER: Record<IsId, { mal: MalId; meslek: MeslekId; usta?: { dugum: string; mal: MalId } }> = {
  odun: { mal: "odun", meslek: "oduncu", usta: { dugum: "oduncu.orman.0", mal: "sertOdun" } },
  tas: { mal: "tas", meslek: "oduncu", usta: { dugum: "oduncu.maden.0", mal: "cevher" } },
  ot: { mal: "ot", meslek: "sifaci", usta: { dugum: "sifaci.otlar.0", mal: "sifaliOt" } },
  yun: { mal: "yun", meslek: "ciftci", usta: { dugum: "ciftci.suru.0", mal: "inceYun" } },
  su: { mal: "su", meslek: "hanci" },
};
export const ISLER: readonly IsId[] = IS_IDLERI;

// ---------------------------------------------------------------- simgeler (GameIcon adları)

export const MESLEK_IKON: Record<MeslekId, string> = {
  ciftci: "wheat", oduncu: "saw", demirci: "anvil", marangoz: "house", dokumaci: "wool", asci: "bread", hanci: "beer",
  sifaci: "healing", ozan: "lyre", katip: "scroll", tuccar: "scales", arabulucu: "family", asker: "shield", divan: "crown",
};
export const AILE_IKON: Record<Aile, string> = { toprak: "leaf", zanaat: "anvil", hizmet: "amphora", ticaret: "coins", toplum: "banner" };
export const MAL_IKON: Record<MalId, string> = {
  odun: "saw", sertOdun: "saw", tas: "castle", ot: "leaf", yun: "wool", su: "bucket", kereste: "saw", cevher: "gems", komur: "flame",
  tahil: "wheat", deri: "backpack", alet: "anvil", nal: "anvil", sifaliOt: "herbs", inceYun: "sheep",
  kagit: "scroll", murekkep: "droplet", senet: "scroll-text",
};
export const IS_IKON: Record<IsId, string> = { odun: "saw", tas: "castle", ot: "herbs", yun: "sheep", su: "bucket" };
export const TUR_IKON: Record<DugumTuru, string> = { tarif: "scroll-open", kalite: "star", toplu: "coins", ozel: "medal", hak: "crown" };

// ---------------------------------------------------------------- açılış şartı (yalnız gösterim; karar sunucuda)

export type DugumHali = "acik" | "acilabilir" | "kilitli";
export type KilitSebebi = "dal" | "kademe" | "onceki" | "pirTek" | "puan";

/**
 * Düğümün arayüz hâli ve kilitliyse sunucu meslek.ts dugumAc koşullarından hangisine takıldığı. `puan`: o meslekte
 * kalan beceri puanı (sunucu ben.beceri); bilinmiyorsa puan koşulu gösterilmez (karar yine sunucuda).
 */
export function dugumHali(m: MeslekTanimi, i: MeslekIlerleme | undefined, d: Dugum, puan?: number): { hal: DugumHali; sebep?: KilitSebebi } {
  if (i?.dg.includes(d.id)) return { hal: "acik" };
  if (!i || !i.dl.includes(d.dal)) return { hal: "kilitli", sebep: "dal" };
  if (d.kd > i.kd) return { hal: "kilitli", sebep: "kademe" };
  if (d.kd > 0 && !i.dg.includes(`${m.id}.${d.dal}.${d.kd - 1}`)) return { hal: "kilitli", sebep: "onceki" };
  if (d.kd === 3 && i.dg.some((x) => x.endsWith(".3"))) return { hal: "kilitli", sebep: "pirTek" };
  if (puan !== undefined && puan < DUGUM_BEDEL[d.kd]) return { hal: "kilitli", sebep: "puan" };
  return { hal: "acilabilir" };
}
/** Açık düğüm geri alınabilir mi (üstündeki düğüm açık değilse). Pişmanlık aralığını sunucu denetler. */
export const geriAlinabilir = (m: MeslekTanimi, i: MeslekIlerleme | undefined, d: Dugum) =>
  !!i?.dg.includes(d.id) && !i.dg.includes(`${m.id}.${d.dal}.${d.kd + 1}`);
/** Kaç dal açılabilir (çırak 1, kalfa 2, usta ve pir 3). */
export const dalHakki = (i: MeslekIlerleme | undefined) => Math.min((i?.kd ?? 0) + 1, 3);

// ---------------------------------------------------------------- tecrübe ve beceri puanı (sunucu meslek.ts)

/** [PARAMETRE] Bir beceri puanı için tecrübe, düğüm bedeli (çırak, kalfa, usta, pir), mesleğe girişte verilen puan. */
export const PUAN_TECRUBE = 6;
export const DUGUM_BEDEL: readonly number[] = [1, 2, 3, 4];
export const BASLANGIC_PUANI = 1;
/** Sunucu beceriPuani kopyası: yalnız sahte istemci ve eski sunucu (ben.beceri yok) gösterimi için. */
export function beceriPuaniYerel(i: MeslekIlerleme, kademeHizmet: readonly number[] = KADEME_HIZMET_VARSAYILAN): BeceriPuani {
  const kazanilan = BASLANGIC_PUANI + Math.floor(i.hz / PUAN_TECRUBE);
  const harcanan = i.dg.reduce((a, id) => a + (DUGUM_BEDEL[Number(id.split(".")[2])] ?? 0), 0);
  return {
    tecrube: i.hz, kazanilan, harcanan, kalan: kazanilan - harcanan, sonrakiPuan: PUAN_TECRUBE - (i.hz % PUAN_TECRUBE),
    sonrakiKademe: i.kd >= 3 ? null : kademeHizmet[i.kd + 1] ?? null,
  };
}

// ---------------------------------------------------------------- tarifler, satış ve Hal (sunucu tarifler.ts, tarif.ts, pazar.ts, hal.ts)

export interface TarifTanimi { id: string; meslek: MeslekId; dugum: string; girdi: Partial<Record<MalId, number>>; cikti: [MalId, number]; takat: number; hizmet: number; arac?: { mal: MalId; adet: number } }
/** [PARAMETRE] Dikey dilim tarifleri (çiftçi–oduncu–demirci zinciri). Adları istemcide onl.tarif.<id>. */
export const TARIFLER: readonly TarifTanimi[] = [
  { id: "kereste", meslek: "oduncu", dugum: "oduncu.orman.0", girdi: { odun: 1 }, cikti: ["kereste", 1], takat: 1, hizmet: 2 },
  { id: "komur", meslek: "oduncu", dugum: "oduncu.maden.0", girdi: { odun: 1 }, cikti: ["komur", 2], takat: 1, hizmet: 2 },
  { id: "nal", meslek: "demirci", dugum: "demirci.alet.0", girdi: { cevher: 1, komur: 1 }, cikti: ["nal", 2], takat: 1, hizmet: 2 },
  { id: "alet", meslek: "demirci", dugum: "demirci.alet.1", girdi: { cevher: 2, komur: 1, kereste: 1 }, cikti: ["alet", 1], takat: 2, hizmet: 3 },
  { id: "hasat", meslek: "ciftci", dugum: "ciftci.ekin.0", girdi: {}, cikti: ["tahil", 3], takat: 2, hizmet: 2, arac: { mal: "alet", adet: 5 } },
  { id: "kirkim", meslek: "ciftci", dugum: "ciftci.suru.0", girdi: {}, cikti: ["yun", 2], takat: 1, hizmet: 1 },
];
export const TARIF_IKON: Record<string, string> = { kereste: "saw", komur: "flame", nal: "anvil", alet: "anvil", hasat: "wheat", kirkim: "sheep" };
/** [PARAMETRE] Aletin kullanım ömrü; NPC'nin oyuncudan aylık alım kotası (mal başına); kıtlık primi oranı. */
export const ALET_OMRU = 4;
export const NPC_SATIS_KOTASI = 6;
/** Kasaba talebi: yüksek değerli demirci mallarında daha dar aylık alım. */
export const npcSatisKotasi = (mal: MalId, digerMeslektas = 0) => (mal === "alet" || mal === "nal") && digerMeslektas <= 0 ? 2 : NPC_SATIS_KOTASI;
export const KITLIK_PRIM = 0.5;
/** Satılabilen mallar (su ticarete girmez). */
export const satilirMi = (mal: MalId) => MALLAR[mal].taban > 0;
/** Kıtlık primi (o malın mesleğinde oyuncu yoksa); asıl fiyat dökümünü satıştan sonra sunucu verir. */
export const kitlikPrimi = (mal: MalId) => Math.ceil(MALLAR[mal].taban * KITLIK_PRIM);

/** Sunucu tarifListesi kopyası: yalnız sahte istemci ve eski sunucu (ben.tarifler yok) gösterimi için. */
export function tarifListesiYerel(acikMi: (dugum: string) => boolean, ev: Envanter, takat: number, kullanim: Partial<Record<string, number>> = {}): TarifSatiri[] {
  return TARIFLER.map((t) => {
    const eksik: Envanter = {};
    for (const [mal, n] of Object.entries(t.girdi)) if ((ev[mal] ?? 0) < (n ?? 0)) eksik[mal] = (n ?? 0) - (ev[mal] ?? 0);
    const aracVar = !!t.arac && (ev[t.arac.mal] ?? 0) > 0;
    const acik = acikMi(t.dugum);
    return {
      id: t.id, meslek: t.meslek, dugum: t.dugum, girdi: { ...t.girdi }, cikti: { mal: t.cikti[0], adet: aracVar && t.arac ? t.arac.adet : t.cikti[1] },
      takat: t.takat, hizmet: t.hizmet,
      arac: t.arac ? { mal: t.arac.mal, adet: t.arac.adet, var: aracVar, kullanim: kullanim[t.arac.mal] ?? 0, omur: ALET_OMRU } : null,
      acik, eksik, yapilabilir: acik && Object.keys(eksik).length === 0 && takat >= t.takat,
    };
  });
}

/** [PARAMETRE] Hal (sunucu hal.ts): kondisyon kademesinin alt sınırı ve aylık takat; gösterge tavanı. */
export const HAL_TAVAN = 100;
export const KONDISYON_KADEMELERI: readonly { kademe: KondisyonKademesi; alt: number; takat: number }[] = [
  { kademe: "iyi", alt: 60, takat: 6 },
  { kademe: "yorgun", alt: 30, takat: 5 },
  { kademe: "bitkin", alt: 0, takat: 4 },
];
export const HAL_IKON = { can: "healing", kondisyon: "boot", gonul: "sun" } as const;
