// Yerleşim çekirdeğinin veri biçimleri. Depolanan kayıtlarda alan adları kısadır: kasaba başına yüzlerce
// NPC her dönümde yazılır. Dışarıya giden biçimler (uç yanıtları) uzun ve okunur adlar taşır.

import type { YerlesimTuru } from "../dunya-veri.ts";

/** NPC'ler arası bağ: [diğer NPC, tür (1 dost, 2 rakip), puan (−100..100), kuruluş ayı]. */
export type Bag = [diger: number, tur: 1 | 2, puan: number, kurulus: number];

/** Gündem kodları (ihtiyaç → hedef). */
export const GUNDEM = { yok: 0, gecim: 1, evlilik: 2, dostluk: 3 } as const;
export const GUNDEM_ADI = ["", "gecim", "evlilik", "dostluk"] as const;

export interface Npc {
  /** Kimlik (1'den başlar); dışarıda "n" + i. */
  i: number;
  /** Ad dizini (cinsiyetin havuzunda), soyad dizini. */
  a: number;
  s: number;
  /** 1 = kadın. */
  k: 0 | 1;
  /** Doğum ayı (dünya ay sayacı). */
  d: number;
  /** Yetişkin mesleği (MESLEKLER dizini); çocukken gösterimde "çocuk"/"çırak"tır. */
  m: number;
  /** Huy, tuhaflık, hayal (HUYLAR, TUHAFLIKLAR, HAYALLER dizinleri). */
  h: number;
  q: number;
  r: number;
  /** Hane numarası. */
  e: number;
  /** Eş, anne, baba (yoksa ya da öldüyse 0). */
  es: number;
  an: number;
  ba: number;
  /** NPC'ler arası dostluk ve rekabet bağları (iki yönlü tutulur). */
  b: Bag[];
  /** Gündem (GUNDEM). */
  g: number;
}

/** Sakin oyuncu dizini (ay dönümü karakterleri yüklemeden yaş ve öğrenme olaylarını üretir). */
export interface Sakin {
  /** Yerel kimlik: "o" + sıra. */
  o: string;
  /** HesapDO kimliği. */
  h: string;
  ad: string;
  /** 1 = kadın. */
  k: 0 | 1;
  /** Doğum ayı. */
  d: number;
  /** Ocağın hane numarası (yeni gelenler az oyunculu ocaklara dağıtılır). */
  e: number;
  /** Bu ay eylemle gittiği mekân ve ayı (harita karakterleri yüklemeden çizilir). */
  mk: string;
  ma: number;
}

export type Isaret = "tanidik" | "dost" | "dusman";

/** Oyuncu karakteri (yerleşimde tutulur; kimlik ve profil HesapDO'dadır). */
export interface Karakter {
  o: string;
  h: string;
  ad: string;
  k: 0 | 1;
  d: number;
  /** Hane ve NPC anne-baba (ocağın ailesi; yoksa 0). */
  e: number;
  an: number;
  ba: number;
  /** 6 özellik (1-10): güç, çeviklik, dayanıklılık, zekâ, karizma, sezgi. */
  oz: number[];
  /** 6 genel beceri (0-100): dövüş, söz, ticaret, zanaat, ilim, gizlilik. */
  be: number[];
  /** Nam (0-100): cömertlik, dindarlık, mertlik, çalışkanlık. */
  nm: number[];
  /** Dağıtılmamış özellik puanı. */
  op: number;
  /** Takat ve en son işlendiği ay (tembel tazelenir). */
  tk: number;
  ta: number;
  /** Para (akçe). */
  pa: number;
  /** Usta NPC (çıraklık; yoksa 0). */
  us: number;
  /** Bu ay eylemle gidilen mekân ve ayı. */
  mk: string;
  ma: number;
  /** Aylık kazanç tavanı sayaçları: ayı, beceri kazançları, nam kazançları. */
  ka: number;
  kb: number[];
  kn: number[];
  /** Tanıdıklar: kişi kimliği → işaret. */
  tn: Record<string, Isaret>;
  /** Olay imleci (Dönüş Kartı'nın başladığı sıra). */
  im: number;
  /** Son Dönüş Kartı (olay sıraları) ve hesaplandığı an (ms). */
  kt: number[];
  kz: number;
  /** Alınan öğrenme dönemi ödülleri (bit maskesi, gün 1 = bit 0). */
  og: number;
  /** Eylem sayaçları (öğrenme hedefleri). */
  sy: Record<string, number>;
  /** İlk gerçek karar ("" = verilmedi). */
  kr: string;
  /** 13 yaşına girdi; Kül Yemini mührü bekliyor (Faz 4'e bağlanır). */
  ky: 0 | 1;
  /** Eylem sayacı (zar tohumu). */
  en: number;
  /** Son istekNo yanıtları (tekrar güvenliği). */
  ist: [string, unknown][];
}

/** Anı: [tür, ilk yük, ay]. Yük zamanla söner (yarı ömür). */
export type Ani = [tur: string, yuk: number, ay: number];

/** Bir NPC'nin bir oyuncuyla geçmişi (oyuncu başına tutulur). */
export interface Iliski {
  /** Aranızda geçenler (kalıcı taban). */
  t: number;
  an: Ani[];
  /** Eylem türü → kullanıldığı aylar (azalan getiri penceresi). */
  az: Record<string, number[]>;
  /** Aylık görüş kazancı tavanı: ayı ve o ayki kazanç. */
  ka: number;
  kg: number;
}

/** NPC kimliği (sayı metni) → ilişki. */
export type IliskiHaritasi = Record<string, Iliski>;

/** Olay parametresindeki kişi başvurusu: ad, okunurken istenen dilde yazılır (ölen NPC'nin adı da kalır). */
export interface KisiRef {
  i: string;
  a?: number;
  s?: number;
  k?: 0 | 1;
  ad?: string;
}
export type OlayParam = string | number | KisiRef;

/** Olay defteri kaydı. */
export interface Olay {
  /** Sıra (1'den artar). */
  s: number;
  /** Oyun ayı. */
  a: number;
  /** Tür. */
  t: string;
  /** Kim, hedef (kişi kimliği; yoksa ""). */
  w: string;
  h: string;
  /** Görünürlük: "" herkes; aksi halde yalnız bu oyuncu (yerel kimlik). */
  g: string;
  /** Önem 1-10 (Dönüş Kartı). */
  n: number;
  /** Özet: i18n anahtarı ve parametreleri. */
  k: string;
  p: Record<string, OlayParam>;
}
export type OlayTaslagi = Omit<Olay, "s" | "a">;

/** Görüş ya da şans dökümünde bir kalem. */
export interface Kalem {
  k: string;
  d: number;
  p?: Record<string, string | number>;
}
/** Toplam = kalemlerin toplamı (kırpılırsa fark "sinir" kalemiyle görünür). */
export interface Dokum {
  toplam: number;
  kalemler: Kalem[];
}

/** Bellekteki yerleşim durumu. */
export interface Kasaba {
  y: string;
  tur: YerlesimTuru;
  /** Hedef NPC sayısı (nüfus dengesi). */
  hedef: number;
  /** Son işlenen ay. */
  ay: number;
  npc: Npc[];
  dizin: Map<number, Npc>;
  /** Sonraki NPC kimliği ve hane numarası. */
  ni: number;
  ne: number;
  sakin: Sakin[];
  /** Yüklenmiş karakterler ve ilişki haritaları (yerel kimlikle). */
  kar: Map<string, Karakter>;
  ili: Map<string, IliskiHaritasi>;
}
