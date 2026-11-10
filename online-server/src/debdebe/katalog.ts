// Debdebe kataloğu (GDD §19, ana tasarım §6.1, araştırma 2026-11-09 §7). Yalnız görünüş: hiçbir ürün akçe, nam,
// savaş/siyaset sonucu ya da kapasite vermez. Tek istisna Berkay'ın gelir kararıdır (beceri ağacı v2 §3): süre
// kısaltma yalnız öğrenme süresini kısaltır; puan ve ön koşul hiçbir yolla atlanmaz.
// Fiyat doğrudandır (premium para yok, D-18 önerisi): her ürün bir mağaza "fiyat kademesi"ne bağlanır; mağaza kademeyi
// yerel paraya çevirir. Rastgele ödüllü paralı kutu yoktur. Saf veri + küçük yardımcılar.

/** [PARAMETRE] Fiyat kademeleri: ABD doları ve TL karşılığı (gösterim içindir; asıl fiyatı mağaza yerelleştirir). */
export const FIYAT_KADEMELERI = {
  kademe_099: { usd: 0.99, tl: 39.99 },
  kademe_199: { usd: 1.99, tl: 79.99 },
  kademe_299: { usd: 2.99, tl: 119.99 },
  kademe_399: { usd: 3.99, tl: 159.99 },
  kademe_499: { usd: 4.99, tl: 199.99 },
  kademe_599: { usd: 5.99, tl: 239.99 },
  kademe_799: { usd: 7.99, tl: 319.99 },
  kademe_999: { usd: 9.99, tl: 399.99 },
  kademe_1999: { usd: 19.99, tl: 799.99 },
} as const satisfies Record<string, { usd: number; tl: number }>;
export type FiyatKademesi = keyof typeof FIYAT_KADEMELERI;

/** Kuşanma yuvaları ve göründükleri yüzeyler. */
export const YUVALAR = {
  cerceve: ["masa", "profil"],
  anons: ["han", "sehirKapisi"],
  muhur: ["mektup", "levha", "profil"],
  balon: ["sohbet"],
  masaSusu: ["masa"],
  afis: ["han", "pano"],
  kaftan: ["portre", "masa", "han"],
  baslik: ["portre"],
  sancak: ["sehirKapisi", "han"],
  hanSusu: ["harita", "han"],
  arma: ["levha", "mektup", "sehirKapisi"],
  nisan: ["masa", "profil"],
  binek: ["sehirKapisi", "han"],
} as const satisfies Record<string, readonly string[]>;
export type Yuva = keyof typeof YUVALAR;
export const YUVA_ADLARI = Object.keys(YUVALAR) as Yuva[];

/**
 * Ürün türleri: `kalici` (sahiplik, kuşanılır), `armagan` (masadaki/yerleşimdeki birine verilir; alanda rozet ve
 * teveccüh), `kisaltma` (öğrenme süresi), `ayan` (aylık üyelik), `sezon` (Sezon Defteri ücretli izi).
 * `ayanOzel`/`sezonOdulu`: satılmaz; üyelikle ya da sezon iziyle gelir.
 */
export type UrunTuru = "kalici" | "armagan" | "kisaltma" | "ayan" | "sezon";

export interface Urun {
  tur: UrunTuru;
  /** Satılık ürünün kademesi; yoksa satılmaz (Ayan ya da sezon ödülü). */
  kademe?: FiyatKademesi;
  yuva?: Yuva;
  /** Armağanın alanda yazdığı teveccüh (tutar; Debdebe armağanı her kaynaktan tam sayılır, §6.2). */
  teveccuh?: number;
  /** Süre kısaltma: sabit dakika ya da kalan sürenin payı. */
  kisaltmaDk?: number;
  kisaltmaOran?: number;
  /** Yalnız Ayan üyeliği sürerken kuşanılır. */
  ayanOzel?: true;
  /** Sezon Defteri ödülü (kazanılınca kalıcıdır). */
  sezonOdulu?: true;
  /** Sezonluk sınırlı ürünün bitişi (ISO tarih; düz yazı gösterilir, sayaç yok). */
  bitis?: string;
}

/** [PARAMETRE] Katalog. Kimlikler küçük harf + alt çizgi (mağaza ürün kimliği kuralına uyar). */
export const KATALOG = {
  // Portre çerçevesi
  cerceve_oymali: { tur: "kalici", kademe: "kademe_199", yuva: "cerceve" },
  cerceve_yaldizli: { tur: "kalici", kademe: "kademe_399", yuva: "cerceve" },
  cerceve_muhurlu: { tur: "kalici", kademe: "kademe_599", yuva: "cerceve" },
  // Giriş anonsu
  anons_metin: { tur: "kalici", kademe: "kademe_199", yuva: "anons" },
  anons_davul: { tur: "kalici", kademe: "kademe_399", yuva: "anons" },
  // Mühür ve arma (sözleşme geçerliliğini etkilemez)
  muhur_kisisel: { tur: "kalici", kademe: "kademe_299", yuva: "muhur" },
  muhur_lale: { tur: "kalici", kademe: "kademe_299", yuva: "muhur" },
  arma_hane: { tur: "kalici", kademe: "kademe_499", yuva: "arma" },
  // Sohbet balonu
  balon_parsomen: { tur: "kalici", kademe: "kademe_099", yuva: "balon" },
  balon_ipek: { tur: "kalici", kademe: "kademe_199", yuva: "balon" },
  // Masa süsü
  masa_hali: { tur: "kalici", kademe: "kademe_199", yuva: "masaSusu" },
  masa_mum: { tur: "kalici", kademe: "kademe_199", yuva: "masaSusu" },
  masa_sini: { tur: "kalici", kademe: "kademe_299", yuva: "masaSusu" },
  // Ziyafet afişi (yalnız görüntü; nam vermez)
  afis_ziyafet: { tur: "kalici", kademe: "kademe_299", yuva: "afis" },
  afis_ozan: { tur: "kalici", kademe: "kademe_199", yuva: "afis" },
  // Giyim
  kaftan_kadife: { tur: "kalici", kademe: "kademe_399", yuva: "kaftan" },
  kaftan_hilat: { tur: "kalici", kademe: "kademe_799", yuva: "kaftan" },
  baslik_sarik: { tur: "kalici", kademe: "kademe_199", yuva: "baslik" },
  // Sancak, binek, han süsü (hız, itibar, kapasite vermez)
  sancak_kervan: { tur: "kalici", kademe: "kademe_299", yuva: "sancak" },
  binek_eyer: { tur: "kalici", kademe: "kademe_499", yuva: "binek" },
  han_tabela: { tur: "kalici", kademe: "kademe_499", yuva: "hanSusu" },
  han_fener: { tur: "kalici", kademe: "kademe_299", yuva: "hanSusu" },
  // Tezyin nişanı (metinsiz rozet; unvan değil)
  nisan_lale: { tur: "kalici", kademe: "kademe_199", yuva: "nisan" },
  // Debdebe armağanları (devredilmez, satılamaz, akçeye dönmez; alana ya da hancıya para payı yok)
  armagan_gulsuyu: { tur: "armagan", kademe: "kademe_099", teveccuh: 20 },
  armagan_gulyagmuru: { tur: "armagan", kademe: "kademe_199", teveccuh: 45 },
  armagan_sini: { tur: "armagan", kademe: "kademe_199", teveccuh: 45 },
  armagan_sancak: { tur: "armagan", kademe: "kademe_299", teveccuh: 70 },
  armagan_hilat: { tur: "armagan", kademe: "kademe_499", teveccuh: 120 },
  // Süre kısaltma (yalnız beceri öğrenme süresi)
  kisaltma_30dk: { tur: "kisaltma", kademe: "kademe_099", kisaltmaDk: 30 },
  kisaltma_2sa: { tur: "kisaltma", kademe: "kademe_299", kisaltmaDk: 120 },
  kisaltma_yari: { tur: "kisaltma", kademe: "kademe_499", kisaltmaOran: 0.5 },
  // Ayan (aylık) ve Sezon Defteri ücretli izi
  ayan_aylik: { tur: "ayan", kademe: "kademe_399" },
  sezon_ucretli: { tur: "sezon", kademe: "kademe_499" },
  // Ayan'a özel (üyelik sürerken)
  ayan_cerceve: { tur: "kalici", yuva: "cerceve", ayanOzel: true },
  ayan_anons: { tur: "kalici", yuva: "anons", ayanOzel: true },
  ayan_masa: { tur: "kalici", yuva: "masaSusu", ayanOzel: true },
  // Sezon Defteri ödülleri (kazanılınca kalıcı)
  sezon_nisan: { tur: "kalici", yuva: "nisan", sezonOdulu: true },
  sezon_balon: { tur: "kalici", yuva: "balon", sezonOdulu: true },
  sezon_masa: { tur: "kalici", yuva: "masaSusu", sezonOdulu: true },
  sezon_cerceve: { tur: "kalici", yuva: "cerceve", sezonOdulu: true },
  sezon_sancak: { tur: "kalici", yuva: "sancak", sezonOdulu: true },
  sezon_afis: { tur: "kalici", yuva: "afis", sezonOdulu: true },
  sezon_kaftan: { tur: "kalici", yuva: "kaftan", sezonOdulu: true },
  sezon_arma: { tur: "kalici", yuva: "arma", sezonOdulu: true },
} as const satisfies Record<string, Urun>;
export type UrunId = keyof typeof KATALOG;

export function urunBul(ham: unknown): UrunId | undefined {
  return typeof ham === "string" && Object.hasOwn(KATALOG, ham) ? (ham as UrunId) : undefined;
}

export function urun(id: UrunId): Urun {
  return KATALOG[id];
}

/** Mağaza ürün kimliği (Google Play ve App Store Connect'te aynı kimlikle açılır). */
export function magazaUrunKimligi(id: UrunId): string {
  return `debdebe_${id}`;
}

/** Debdebe puanı: harcamanın ABD doları sentine göre (kademeye bağlı; yerel fiyattan bağımsız). */
export function urunPuani(id: UrunId): number {
  const k = urun(id).kademe;
  return k ? Math.round(FIYAT_KADEMELERI[k].usd * 100) : 0;
}

/** [PARAMETRE] Debdebe seviyeleri (mühür rengi; yalnız etiket, oyun mantığı okumaz). Eşik: birikmiş puan. */
export const DEBDEBE_SEVIYELERI = [
  { ad: "bakir", esik: 1 },
  { ad: "gumus", esik: 1000 },
  { ad: "altin", esik: 3000 },
  { ad: "lacivert", esik: 8000 },
  { ad: "zumrut", esik: 20000 },
] as const;
export type SeviyeAdi = (typeof DEBDEBE_SEVIYELERI)[number]["ad"];

export function seviyeAdi(puan: number): SeviyeAdi | null {
  let s: SeviyeAdi | null = null;
  for (const x of DEBDEBE_SEVIYELERI) if (puan >= x.esik) s = x.ad;
  return s;
}

/** [PARAMETRE] Ayan: üyelik süresi (mağaza abonelik bitişi vermezse), ek mühür yuvası, kayıtlı takım sayısı. */
export const AYAN_SURE_GUN = 30;
export const AYAN_RAHATLIK = {
  /** Kuşanılabilen mühür sayısı (üye olmayanda 1). */
  muhurYuvasi: 2,
  /** Kayıtlı görünüş takımı (üye olmayanda 1). */
  takim: 3,
} as const;

/** Katalog görünümü (istemci metni `debdebe.urun.<id>`). */
export function katalogGorunumu() {
  return (Object.keys(KATALOG) as UrunId[]).map((id) => {
    const u = urun(id);
    return {
      id,
      tur: u.tur,
      ...(u.yuva ? { yuva: u.yuva, yuzey: YUVALAR[u.yuva] } : {}),
      ...(u.kademe ? { kademe: u.kademe, fiyat: FIYAT_KADEMELERI[u.kademe], magaza: magazaUrunKimligi(id) } : {}),
      satilik: u.kademe !== undefined,
      ...(u.teveccuh ? { teveccuh: u.teveccuh } : {}),
      ...(u.kisaltmaDk ? { kisaltmaDk: u.kisaltmaDk } : {}),
      ...(u.kisaltmaOran ? { kisaltmaOran: u.kisaltmaOran } : {}),
      ...(u.ayanOzel ? { ayanOzel: true } : {}),
      ...(u.sezonOdulu ? { sezonOdulu: true } : {}),
      ...(u.bitis ? { bitis: u.bitis } : {}),
    };
  });
}
