// Canlı etkinlikler (yönetici panelinden başlatılır/durdurulur). Saf modül: katalog, kapsam ve etki birleştirme.
// Ayrıntılı tasarım: docs/online/ETKINLIKLER.md.
// İlkeler (TASARIM_PUSULASI süzgeci):
// - Ücretsiz ve herkese eşit: katılım akçe istemez, Debdebe ile hızlanmaz; ödül tek seferlik (etkinlik başına bir kez).
// - Kayıp cezası yok: kaçıran oyuncu bir şey kaybetmez; etkinliğin açtığı dert erken biterse gösterge düşmez.
// - Zamanlayıcı baskısı yok: etkinlik süresi gerçek saattir ve katılım penceresi boyunca istenen an yapılır.
// - Farm yok: katılım takat ister, nam aylık tavan içinde kalır, mal armağanı 1–2 adet düşük değerli maldır.
// - Anlık: YonetimDO her yerleşim isteğinde etkin listeyi verir (parametrelerCalisma); durdurma bir sonraki istekte söner.

import type { MalId } from "../icerik/mallar.ts";
import type { MeslekId } from "../icerik/meslekler.ts";
import { BEYLIKLER, YERLESIMLER, yerlesimBul, type YerlesimTuru } from "../dunya-veri.ts";
import { PARAMETRELER, caprazIhlaller, type ParametreAdi } from "../yonetim/parametre.ts";
import type { DertTuru } from "../yerlesim/ortak-dert.ts";
import type { Nam } from "../yerlesim/karakter.ts";
import type { CalismaParametreleri } from "../yerlesim/tipler.ts";

export const ETKINLIK_TURLERI = [
  "senlik",
  "bereket",
  "kitlik",
  "kervan",
  "ozan",
  "panayir",
  "haydut",
  "salgin",
  "vakif",
  "dugun",
  "lonca",
  "pehlivan",
  "ferman",
  "kis",
  "ilim",
  "goc",
  "hasat",
  "hazine",
] as const;
export type EtkinlikTuru = (typeof ETKINLIK_TURLERI)[number];

/** dunya: her yer; beylik: bir beyliğin bütün yerleşimleri; tur: bütün şehirler/kasabalar/köyler; yerlesim: tek yer. */
export const KAPSAMLAR = ["dunya", "beylik", "tur", "yerlesim"] as const;
export const YERLESIM_TURLERI: readonly YerlesimTuru[] = ["sehir", "kasaba", "koy"];
export type Kapsam = (typeof KAPSAMLAR)[number];

/** Etkinliğin değiştirebildiği çalışma parametreleri (yönetici ayarının üstüne; parametre sınırları içinde kırpılır). */
export type EtkinlikParametresi = "TEMEL_CIKTI" | "NPC_CARPAN" | "KITLIK_PRIM" | "SIPARIS_ODUL_CARPANI" | "NPC_AYLIK_KOTA" | "STOK_CARPAN";
export interface ParametreDegisimi {
  carp?: number;
  ekle?: number;
}

export interface Katilim {
  /** Bir kez verilen nam (aylık nam tavanı ayrıca uygulanır). */
  nam: Nam;
  namN: number;
  /** Gönül (hal) artışı. */
  gonul: number;
  /** Tek seferlik küçük mal armağanı. */
  mal?: readonly [MalId, number];
  /** Bu mesleklerde nam ve gönül iki katı (aylık tavan yine geçerli). */
  meslek: readonly MeslekId[];
}

export interface EtkinlikTanimi {
  ikon: string;
  /** Panelde görünen ad ve açıklama (yönetici Türkçe görür; oyuncu metinleri istemcide 6 dilde). */
  ad: string;
  ozet: string;
  /** Panelde varsayılan süre (saat; 0 = durdurulana kadar). */
  saat: number;
  p?: Partial<Record<EtkinlikParametresi, ParametreDegisimi>>;
  /** Pazar bacı oranı (varsayılan PAZAR_BAC_ORANI'nın yerine; en düşük olan geçerli). */
  bac?: number;
  /** Oyuncu başına açık pazar ilanı tavanına ek. */
  ilanEk?: number;
  /** NPC'lerin oyuncudan aylık alım kotasına (npcSatisKotasi) mal başı ek. */
  satisEk?: number;
  /** Tüccar başına aylık kervan tavanına ek. */
  kervanEk?: number;
  /** İşletme vergisi alınmaz (beylik vergisi bu sürede sıfır sayılır). */
  vergisiz?: true;
  /** Yerleşimde hemen açılan ortak dert (etkinlik bitince kapanır; başarısızlık göstergesi düşürmez). */
  dert?: DertTuru;
  katilim: Katilim;
}

/** [PARAMETRE] Etkinlik kataloğu. Değerler denge sınırları içindedir; parametreler PARAMETRELER alt/üst sınırına kırpılır. */
export const ETKINLIKLER: Readonly<Record<EtkinlikTuru, EtkinlikTanimi>> = {
  senlik: {
    ikon: "party", ad: "Şenlik Günü", saat: 24,
    ozet: "Meydanda davul zurna. Pazar bacı yarıya iner; katılan herkes gönül kazanır, ozan, aşçı ve hancı iki kat.",
    bac: 0.025,
    katilim: { nam: "comertlik", namN: 1, gonul: 5, meslek: ["ozan", "asci", "hanci"] },
  },
  bereket: {
    ikon: "wheat", ad: "Bereket Mevsimi", saat: 48,
    ozet: "Temel işler bir fazla ürün verir, NPC satış fiyatları %20 düşer. Katılana 2 buğday; çiftçi iki kat.",
    p: { TEMEL_CIKTI: { ekle: 1 }, NPC_CARPAN: { carp: 0.8 } },
    katilim: { nam: "caliskanlik", namN: 1, gonul: 2, mal: ["bugday", 2], meslek: ["ciftci"] },
  },
  kitlik: {
    ikon: "bread", ad: "Kıtlık", saat: 48,
    ozet: "Ambarlar boşaldı: kıtlık ortak derdi açılır, eksik meslek primi iki katına çıkar. Erzak verenler öne çıkar.",
    p: { KITLIK_PRIM: { carp: 2 } },
    dert: "kitlik",
    katilim: { nam: "comertlik", namN: 1, gonul: 3, meslek: ["ciftci", "asci", "hanci"] },
  },
  kervan: {
    ikon: "camel", ad: "Kervan Mevsimi", saat: 72,
    ozet: "Yollar açık: tüccar ayda bir kervan fazla çıkarabilir. Katılan çalışkanlık namı alır; tüccar iki kat.",
    kervanEk: 1,
    katilim: { nam: "caliskanlik", namN: 1, gonul: 2, meslek: ["tuccar"] },
  },
  ozan: {
    ikon: "lyre", ad: "Ozan Gecesi", saat: 6,
    ozet: "Hanlarda saz gecesi. Katılan gönül kazanır; ozan iki kat. Atışmalar ve sahne için en iyi akşam.",
    katilim: { nam: "mertlik", namN: 1, gonul: 4, meslek: ["ozan"] },
  },
  panayir: {
    ikon: "coins", ad: "Panayır", saat: 48,
    ozet: "Pazar bacı alınmaz, oyuncu başına 3 ilan fazla açılır.",
    bac: 0,
    ilanEk: 3,
    katilim: { nam: "comertlik", namN: 1, gonul: 2, meslek: ["tuccar"] },
  },
  haydut: {
    ikon: "crossed-swords", ad: "Haydut Baskını", saat: 24,
    ozet: "Yollarda haydut var: haydut ortak derdi açılır. Kimse mal ya da akçe kaybetmez; nöbet ve alet katkısı öne çıkar.",
    dert: "haydut",
    katilim: { nam: "mertlik", namN: 1, gonul: 2, meslek: ["asker", "demirci"] },
  },
  salgin: {
    ikon: "healing", ad: "Salgın", saat: 24,
    ozet: "Ateşli hastalık yayıldı: salgın ortak derdi açılır. Şifacının bakımı öne çıkar; oyuncu karakteri ölmez, ceza yok.",
    dert: "salgin",
    katilim: { nam: "dindarlik", namN: 1, gonul: 2, meslek: ["sifaci", "asci"] },
  },
  vakif: {
    ikon: "prayer-beads", ad: "Vakıf Günü", saat: 24,
    ozet: "Vakıf yoksullar için mal topluyor: NPC'ler oyuncudan ayda 2 adet fazla alır. Katılan cömertlik kazanır.",
    satisEk: 2,
    katilim: { nam: "comertlik", namN: 2, gonul: 3, meslek: ["hanci", "katip"] },
  },
  dugun: {
    ikon: "ring", ad: "Düğün Mevsimi", saat: 48,
    ozet: "Kasabada düğün dernek: şölen malları NPC'den %10 ucuz. Katılan gönül kazanır; aşçı ve ozan iki kat.",
    p: { NPC_CARPAN: { carp: 0.9 } },
    katilim: { nam: "comertlik", namN: 1, gonul: 6, meslek: ["asci", "ozan"] },
  },
  lonca: {
    ikon: "anvil", ad: "Lonca Yarışması", saat: 72,
    ozet: "Loncalar yarışıyor: lonca siparişi ödülleri %6 artar. Katılan çalışkanlık namı alır; zanaatkârlar iki kat.",
    p: { SIPARIS_ODUL_CARPANI: { carp: 1.06 } },
    katilim: { nam: "caliskanlik", namN: 1, gonul: 2, meslek: ["demirci", "marangoz", "dokumaci"] },
  },
  pehlivan: {
    ikon: "fist", ad: "Pehlivan Şenliği", saat: 24,
    ozet: "Er meydanı kuruldu. Katılan mertlik namı ve gönül kazanır; asker iki kat. Düello ve meydan okuma günü.",
    katilim: { nam: "mertlik", namN: 2, gonul: 3, meslek: ["asker"] },
  },
  ferman: {
    ikon: "scroll", ad: "Sultan'ın Fermanı", saat: 48,
    ozet: "Ferman okundu: bu sürede işletme vergisi alınmaz. Katılan gönül kazanır; kâtip ve divan iki kat.",
    vergisiz: true,
    katilim: { nam: "dindarlik", namN: 1, gonul: 3, meslek: ["katip", "divan"] },
  },
  kis: {
    ikon: "flame", ad: "Kış Kıyamet", saat: 48,
    ozet: "Kar yolları kapadı: NPC satış fiyatı %20, kıtlık primi %50 artar (üretene kazanç). Katılana 2 odun; oduncu iki kat.",
    p: { NPC_CARPAN: { carp: 1.2 }, KITLIK_PRIM: { carp: 1.5 } },
    katilim: { nam: "comertlik", namN: 1, gonul: 3, mal: ["odun", 2], meslek: ["oduncu"] },
  },
  ilim: {
    ikon: "book", ad: "İlim Haftası", saat: 72,
    ozet: "Medrese kapılarını açtı. Katılan gönül ve çalışkanlık kazanır, 1 kâğıt alır; kâtip ve divan iki kat.",
    katilim: { nam: "caliskanlik", namN: 1, gonul: 3, mal: ["kagit", 1], meslek: ["katip", "divan"] },
  },
  goc: {
    ikon: "walk", ad: "Göç Dalgası", saat: 48,
    ozet: "Yolcular akın ediyor: NPC'ler ayda 1 adet fazla alır. Yeni geleni ağırlayan cömertlik kazanır; hancı iki kat.",
    satisEk: 1,
    katilim: { nam: "comertlik", namN: 1, gonul: 3, meslek: ["hanci", "arabulucu"] },
  },
  hasat: {
    ikon: "sheep", ad: "Hasat Bayramı", saat: 48,
    ozet: "Hasat ortak derdi açılır, temel işler bir fazla ürün verir. Katılana 2 ekmek; çiftçi iki kat.",
    p: { TEMEL_CIKTI: { ekle: 1 } },
    dert: "hasat",
    katilim: { nam: "caliskanlik", namN: 1, gonul: 3, mal: ["ekmek", 2], meslek: ["ciftci"] },
  },
  hazine: {
    ikon: "gems", ad: "Kayıp Hazine", saat: 24,
    ozet: "Eski bir haritanın izi bulundu. Arayan herkes 1 bakır bulur ve mertlik kazanır; tüccar ve kâtip iki kat nam.",
    katilim: { nam: "mertlik", namN: 1, gonul: 2, mal: ["bakir", 1], meslek: ["tuccar", "katip"] },
  },
};

/** [PARAMETRE] Aynı anda etkin etkinlik tavanı, en uzun süre (saat), tutulan geçmiş. */
export const ETKINLIK_ETKIN_EN_COK = 6;
export const ETKINLIK_SAAT_EN_COK = 24 * 14;
export const ETKINLIK_GECMIS_EN_COK = 30;
/** [PARAMETRE] Karakterde tutulan katıldığı etkinlik kimliği sayısı (tek sefer izi). */
export const KATILIM_IZ_EN_COK = 24;
/** [PARAMETRE] Katılımın takat bedeli. */
export const KATILIM_TAKAT = 1;

/** YonetimDO'da tutulan etkin etkinlik. */
export interface Etkinlik {
  id: string;
  tur: EtkinlikTuru;
  kapsam: Kapsam;
  /** Beylik ya da yerleşim kimliği (kapsam dünya ise yok). */
  hedef?: string;
  /** Başlangıç ve otomatik bitiş (ms); bit null = durdurulana kadar. */
  bas: number;
  bit: number | null;
  kim: string;
  /** Durdurulduysa (geçmişte). */
  dur?: number;
  durKim?: string;
}

/** Yerleşime giden özet (yönetici e-postası yok). */
export interface EtkinlikOzeti {
  id: string;
  tur: EtkinlikTuru;
  bas: number;
  bit: number | null;
}

export function turMu(v: unknown): v is EtkinlikTuru {
  return typeof v === "string" && Object.hasOwn(ETKINLIKLER, v);
}

export function kapsamMi(v: unknown): v is Kapsam {
  return typeof v === "string" && (KAPSAMLAR as readonly string[]).includes(v);
}

/** Kapsam hedefi geçerli mi (beylik/yerleşim kimliği var mı). */
export function hedefGecerli(kapsam: Kapsam, hedef: unknown): hedef is string | undefined {
  if (kapsam === "dunya") return hedef === undefined || hedef === null || hedef === "";
  if (typeof hedef !== "string") return false;
  if (kapsam === "tur") return (YERLESIM_TURLERI as readonly string[]).includes(hedef);
  return kapsam === "beylik" ? BEYLIKLER.some((b) => b.id === hedef) : yerlesimBul(hedef) !== undefined;
}

export function suruyor(e: Pick<Etkinlik, "bit" | "dur">, simdi: number): boolean {
  return e.dur === undefined && (e.bit === null || simdi < e.bit);
}

/** Etkinlik bu yerleşimi kapsıyor mu. */
export function kapsiyor(e: Pick<Etkinlik, "kapsam" | "hedef">, yerlesim: string): boolean {
  if (e.kapsam === "dunya") return true;
  if (e.kapsam === "yerlesim") return e.hedef === yerlesim;
  if (e.kapsam === "tur") return yerlesimBul(yerlesim)?.tur === e.hedef;
  return BEYLIKLER.some((b) => b.id === e.hedef && b.yerlesimler.some((y) => y.id === yerlesim));
}

/** İki kapsamın ortak yerleşimi var mı (aynı tür etkinlik üst üste binmesin). */
export function kesisir(a: Pick<Etkinlik, "kapsam" | "hedef">, b: Pick<Etkinlik, "kapsam" | "hedef">): boolean {
  return YERLESIMLER.some((y) => kapsiyor(a, y.id) && kapsiyor(b, y.id));
}

/** Kapsamın içerdiği yerleşim sayısı (panelde "kaç yere gidiyor" göstergesi). */
export function kapsamBoyu(e: Pick<Etkinlik, "kapsam" | "hedef">): number {
  return YERLESIMLER.filter((y) => kapsiyor(e, y.id)).length;
}

export function ozetle(e: Etkinlik): EtkinlikOzeti {
  return { id: e.id, tur: e.tur, bas: e.bas, bit: e.bit };
}

/** Yerleşimde etkin olan etkinliklerin birleşik etkisi. */
export interface EtkinlikEtkisi {
  bac?: number;
  ilanEk: number;
  kervanEk: number;
  /** NPC alım kotası eki (en büyüğü; eski kayıtta yok → 0). */
  satisEk?: number;
  vergisiz: boolean;
  /** Etkinlik kimliği → açılacak dert. */
  dertler: { id: string; dert: DertTuru }[];
}

export function etkiBirlestir(liste: readonly EtkinlikOzeti[]): EtkinlikEtkisi {
  const e: EtkinlikEtkisi = { ilanEk: 0, kervanEk: 0, vergisiz: false, dertler: [] };
  for (const o of liste) {
    const t = ETKINLIKLER[o.tur];
    if (!t) continue;
    if (t.bac !== undefined) e.bac = Math.min(e.bac ?? t.bac, t.bac);
    e.ilanEk = Math.max(e.ilanEk, t.ilanEk ?? 0);
    e.kervanEk = Math.max(e.kervanEk, t.kervanEk ?? 0);
    if (t.satisEk) e.satisEk = Math.max(e.satisEk ?? 0, t.satisEk);
    if (t.vergisiz) e.vergisiz = true;
    if (t.dert) e.dertler.push({ id: o.id, dert: t.dert });
  }
  return e;
}

/**
 * Yönetici parametrelerinin üstüne etkinlik değişimlerini uygular. Varsayılan değer PARAMETRELER'den gelir; sonuç
 * parametre sınırlarına kırpılır (ör. NPC çarpanı 1,5'in altına inmez), tamsayı parametreler yuvarlanır.
 */
export function parametreUygula(pr: CalismaParametreleri, liste: readonly EtkinlikOzeti[]): CalismaParametreleri {
  const sonuc: CalismaParametreleri = { ...pr };
  for (const o of liste) {
    const p = ETKINLIKLER[o.tur]?.p;
    if (!p) continue;
    for (const [ad, d] of Object.entries(p) as [EtkinlikParametresi, ParametreDegisimi][]) {
      const tanim = PARAMETRELER[ad];
      let v = sonuc[ad] ?? tanim.varsayilan;
      if (d.carp !== undefined) v *= d.carp;
      if (d.ekle !== undefined) v += d.ekle;
      v = Math.min(tanim.ust, Math.max(tanim.alt, v));
      sonuc[ad] = tanim.tam ? Math.round(v) : Math.round(v * 1000) / 1000;
    }
  }
  return caprazKirp(sonuc);
}

/**
 * Çapraz kurallar (yonetim/parametre.ts CAPRAZ_KURALLAR) etkinlikler birlikte açıkken de bozulmasın: ihlalde çarpan
 * kurala uyan sınıra kırpılır. siparisNpc: önce sipariş ödül çarpanı, alt sınırdaysa kıtlık primi düşer. stokKitlik:
 * stok çarpanı 1 + kıtlık primine çıkar, üst sınırdaysa kıtlık primi düşer. Sonuç ihlalsizdir (test: 18 etkinlik ve
 * ikili birleşimleri).
 */
export function caprazKirp(pr: CalismaParametreleri): CalismaParametreleri {
  const d = (ad: ParametreAdi): number => (pr[ad as keyof CalismaParametreleri] as number | undefined) ?? PARAMETRELER[ad].varsayilan;
  const yaz = (ad: "SIPARIS_ODUL_CARPANI" | "KITLIK_PRIM" | "STOK_CARPAN", v: number) => {
    const t = PARAMETRELER[ad];
    pr[ad] = Math.min(t.ust, Math.max(t.alt, v));
  };
  const asagi = (v: number) => Math.floor(v * 1000 - 1e-6) / 1000;
  const yukari = (v: number) => Math.ceil(v * 1000 - 1e-6) / 1000;
  for (let i = 0; i < 4; i++) {
    const ihlal = caprazIhlaller(d);
    if (ihlal.length === 0) break;
    if (ihlal.includes("siparisNpc")) {
      yaz("SIPARIS_ODUL_CARPANI", asagi(d("NPC_CARPAN") / (1 + d("KITLIK_PRIM"))));
      if (!caprazIhlaller(d).includes("siparisNpc")) continue;
      yaz("KITLIK_PRIM", asagi(d("NPC_CARPAN") / d("SIPARIS_ODUL_CARPANI") - 1));
    }
    if (caprazIhlaller(d).includes("stokKitlik")) {
      yaz("STOK_CARPAN", yukari(1 + d("KITLIK_PRIM")));
      if (!caprazIhlaller(d).includes("stokKitlik")) continue;
      yaz("KITLIK_PRIM", asagi(d("STOK_CARPAN") - 1));
    }
  }
  return pr;
}

/** Gelen ham listeyi doğrular (YonetimDO yanıtı; bilinmeyen tür atılır). */
export function ozetListesiCoz(ham: unknown): EtkinlikOzeti[] {
  if (!Array.isArray(ham)) return [];
  return ham.flatMap((x) => {
    if (typeof x !== "object" || x === null) return [];
    const o = x as Record<string, unknown>;
    if (typeof o.id !== "string" || !turMu(o.tur) || typeof o.bas !== "number") return [];
    const bit = typeof o.bit === "number" ? o.bit : null;
    return [{ id: o.id, tur: o.tur, bas: o.bas, bit }];
  }).slice(0, ETKINLIK_ETKIN_EN_COK);
}
