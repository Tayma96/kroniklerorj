// Han masası (Faz 10) ortak biçimleri: WebSocket iletileri, masa görünümü, olay, iç iletiler.
// Masa para tutmaz: bu dosyadaki hiçbir biçimde akçe, kasa ya da fiyat alanı yoktur (GDD §13 "Masa DO").

import type { HataKodu, HesapYaptirimi } from "../tipler.ts";

/** Yerleşim türüne göre mekân: şehirde han, kasabada küçük han, köyde menzil (GDD §16 Yapı). */
export type HanTuru = "han" | "kucukHan" | "menzil";
/** Masa türleri (GDD §16). Bu fazda yalnız "acik" kullanılır; özel/meclis/tüccar sonraki fazların kancasıdır. */
export type MasaTuru = "acik" | "ozel" | "meclis" | "tuccar";

/**
 * Masa ayarı (kalıcı masa durumu). Hancı (mekân sahibi, Faz 13) masa açar/kapatır, kavgayı yasaklar.
 * `sesli` Faz 16 (ses) için yer tutucudur (Berkay: yaş sınırı yok, yaş kapısı alanı bilerek konmadı).
 * Para, koltuk satışı, atılmazlık ya da gizli giriş alanı bilerek yoktur.
 */
export interface MasaAyari {
  tur: MasaTuru;
  acik: boolean;
  sesli: boolean;
  kavgaYasak: boolean;
}

/** İsim plakası: yalnız kimlik ve görünen ad. Debdebe çerçevesi Faz 15'te eklenecek (oyun mantığı okumaz). */
export interface Plaka {
  hesap: string;
  ad: string;
}

export interface MasaGorunumu {
  no: number;
  /** Koltuk dizini 0..KOLTUK_SAYISI-1; boş koltuk null. */
  koltuklar: (Plaka | null)[];
  /** Masa başı: en eski oturan (ayrılınca bir sonrakine geçer). */
  masaBasi: string | null;
  /** Koltuk bekleme sırası (herkese görünür; para sırayı değiştirmez). */
  sira: Plaka[];
  /** Koltuksuz bağlı dinleyiciler (sıradakiler dahil). */
  ayakta: number;
  ayar: MasaAyari;
}

/** Butonlu eylemler (GDD §16 "Konuşma oyun durumunu bağlamaz"); `kabul` sözleşme/ittifak teklifine onaydır. */
export const HAN_EYLEMLERI = ["yemin", "sozlesme", "ittifak", "ihbar", "meydanOku", "kabul"] as const;
export type HanEylemi = (typeof HAN_EYLEMLERI)[number];
/** Olay türleri: butonlu eylemler + masa başının çıkarması. */
export type MasaOlayTuru = HanEylemi | "atma";

/**
 * Masa olayı: eylemin kendisi (kim, kime, neyi) ve o anda oturanların katılım listesi (yalnız kimlikler).
 * Sohbet içeriği burada yoktur. Oyun etkileri (nam, şeref, söylenti, dava) sonraki fazların kancasıdır.
 */
export interface MasaOlayi {
  no: number;
  masa: string;
  tur: MasaOlayTuru;
  kim: string;
  hedef?: string;
  /** `kabul`: onaylanan olayın numarası. */
  olay?: number;
  /** Söz/şart metni (yemin, sözleşme, ittifak): eylemin parçasıdır, sohbet değildir. */
  sart?: string;
  zaman: number;
  /** Olay anında koltukta oturanlar, koltuk sırasıyla. */
  katilim: string[];
  /** Sözleşme/ittifak: karşı tarafın onayı bekleniyor mu. */
  durum?: "teklif" | "kabul";
  /** Onaylandıysa onay olayının numarası. */
  kabulOlay?: number;
}

/** Worker → MasaDO yükseltme bileti (iç başlıkta taşınır; istemci bunu göremez ve yazamaz). */
export interface MasaBileti {
  masa: string;
  no: number;
  plaka: Plaka;
  yt: HesapYaptirimi;
}

/** İstemci → sunucu (WebSocket metin çerçevesi, JSON). */
export type IstemciIletisi =
  | { t: "otur"; koltuk?: number }
  | { t: "kalk" }
  | { t: "yaz"; metin: string }
  | { t: "sustur"; hedef: string }
  | { t: "susturKaldir"; hedef: string }
  | { t: "at"; hedef: string }
  | { t: "oneAl"; hedef: string }
  | { t: "rapor"; hedef: string; neden: string; aciklama?: string; istekNo: string };

/** Sunucu → istemci. */
export type SunucuIletisi =
  | { t: "hosgeldin"; ben: Plaka; susturma: { bitis: number | null } | null; masa: MasaGorunumu }
  | { t: "durum"; masa: MasaGorunumu }
  | { t: "ileti"; hesap: string; ad: string; koltuk: number; metin: string; zaman: number }
  | { t: "olay"; olay: MasaOlayi }
  | { t: "anons"; anons: MasaAnonsu }
  | { t: "sessiz"; liste: string[] }
  | { t: "rapor"; sonuc: unknown }
  | { t: "hata"; hata: HataKodu; istek?: string; bitis?: number | null };

/** Soket eki (hibernation'da soketle birlikte saklanır, ≤2 KB). Sohbet metni hiçbir zaman buraya yazılmaz. */
export interface SoketEki {
  /** Masa DO adı. */
  m: string;
  no: number;
  h: string;
  a: string;
  /** Koltuk dizini ya da null (ayakta). */
  k: number | null;
  /** Oturma anı (masa başı için). */
  o: number | null;
  /** Sıraya giriş anı ya da null. */
  s: number | null;
  /** Yerel sessize alınanlar (yalnız bu bağlantı için). */
  sus: string[];
  /** İleti hızı ve genel komut hızı (pencere, sayı). */
  hz?: { pencere: number; sayi: number };
  kz?: { pencere: number; sayi: number };
  yt: HesapYaptirimi;
  /** 1 = devredildi ya da çıkarıldı: hesaba katılmaz, kapanışı yok sayılır. */
  x?: 1;
}

/** HesapDO → MasaDO iç iletileri. */
export type MasaIleti =
  | { islem: "ozet"; masa: string; no: number }
  | { islem: "eylem"; masa: string; hesap: string; girdi: EylemGirdisi }
  | { islem: "cikar"; masa: string; hesap: string }
  | { islem: "yaptirim"; masa: string; hesap: string; durum: HesapYaptirimi }
  /** İkram öncesi: gönderen oturuyor mu, alan masada mı, engel var mı (ödeme bundan sonra yapılır). */
  | { islem: "ikramKontrol"; masa: string; hesap: string; hedef: string }
  /** Masaya anons: saklanmaz, katılım listesi yoktur. */
  | { islem: "anons"; masa: string; anons: MasaAnonsu };

/**
 * Masaya anons türleri (hediye ailesi). Bu fazda yalnız `ikram` (NPC hancı menüsünden akçeyle) çalışır;
 * `armagan` (envanterden) ve `debdebe` (Faz 15) aynı biçimi kullanacak. Anons saklanmaz, katılım listesi yazılmaz.
 */
export type AnonsTuru = "ikram" | "armagan" | "debdebe";
export interface MasaAnonsu {
  tur: AnonsTuru;
  kim: string;
  hedef: string;
  /** İkram/armağan/Debdebe öğesinin kimliği (ör. "serbet"). */
  oge: string;
  zaman: number;
}

export interface EylemGirdisi {
  masa: number;
  tur: HanEylemi;
  hedef?: string;
  olay?: number;
  sart?: string;
  istekNo: string;
}

export interface MasaOzeti {
  no: number;
  oturan: number;
  ayakta: number;
  sira: number;
  ayar: MasaAyari;
}

export interface HanOzeti {
  yerlesim: { id: string; ad: string };
  han: { tur: HanTuru; ad: string };
  koltuk: number;
  masalar: MasaOzeti[];
}
