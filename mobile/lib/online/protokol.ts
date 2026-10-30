// Kronikler Online istemci protokolü: online-server/src/tipler.ts biçimlerinin aynısı (oradan içe aktarılmaz;
// sunucu ayrı pakettir). Sunucuda bir biçim değişirse burası da aynı committe güncellenir.
// Hata metni istemcide çevrilir (lib/online/hata.ts → i18n-sayfa/online.ts).

export type Cinsiyet = "erkek" | "kadın";
export type YerlesimTuru = "koy" | "kasaba" | "sehir";
export type Mevsim = "kis" | "ilkbahar" | "yaz" | "sonbahar";

export interface Profil {
  hesapId: string;
  ad: string;
  cinsiyet: Cinsiyet;
  beylik: string;
  yerlesim: string;
  /** Dünya saatinin ay sayacında doğum ayı: oluşturulduğu ay − 12 yıl (12 × 12 ay). */
  dogumAyi: number;
  /** Oluşturma anı (ms). */
  olusturma: number;
  /** Davetle geldiyse davet edenin görünen adı. */
  davetEden?: string;
}

export interface DavetBilgisi {
  kod: string;
  yerlesim: string;
  beylik: string;
  davetEden: string;
}

export interface SaatOzeti {
  simdi: number;
  oyunAyi: number;
  yil: number;
  ay: number;
  mevsim: Mevsim;
  sonrakiDonum: number;
}

export interface YerlesimOzeti {
  id: string;
  ad: string;
  tur: YerlesimTuru;
  evKapasite: number;
  npc: number;
  /** Bu yerleşimde yaşayan oyuncu sayısı. */
  nufus: number;
}

export interface BeylikOzeti {
  id: string;
  ad: string;
  yerlesimler: YerlesimOzeti[];
}

export interface DunyaOzeti {
  saat: SaatOzeti;
  beylikler: BeylikOzeti[];
}

/** POST /v1/giris yanıtı. */
export interface GirisYaniti {
  oturum: string;
  profilVar: boolean;
  adOnerisi?: string;
}

/** POST /v1/profil gövdesi: davet varsa yerleşim yok sayılır (davet edenin yerleşimi geçer). */
export interface ProfilIstegi {
  ad: string;
  cinsiyet: Cinsiyet;
  yerlesim?: string;
  davet?: string;
  istekNo: string;
}

/** Sunucunun hata kodları (tipler.ts HATA_DURUMU ile aynı sıra). */
export const SUNUCU_HATALARI = [
  "gecersiz_istek", "govde_buyuk", "bulunamadi", "yontem_yok", "oturum_yok", "oturum_gecersiz",
  "oturum_suresi_doldu", "google_gecersiz", "google_erisilemiyor", "hiz_siniri", "profil_yok", "profil_var",
  "ad_uzunluk", "ad_karakter", "ad_yasak", "ad_alinmis", "cinsiyet_gecersiz", "yerlesim_gecersiz",
  "yerlesim_dolu", "davet_gecersiz", "davet_yok", "istekno_gecersiz", "yapilandirma_eksik", "sunucu_hatasi",
] as const;
export type HataKodu = (typeof SUNUCU_HATALARI)[number];

/** Yalnız istemcide doğan hatalar: adres boş, ağ yok, zaman aşımı, anlaşılmayan yanıt. */
export type IstemciHatasi = "sunucu_yok" | "ag_yok" | "zaman_asimi" | "gecersiz_yanit";
export type OnlineHata = HataKodu | IstemciHatasi;

export type Sonuc<T> = { ok: true; deger: T } | { ok: false; hata: OnlineHata };

export const basarili = <T,>(deger: T): Sonuc<T> => ({ ok: true, deger });
export const basarisiz = <T = never,>(hata: OnlineHata): Sonuc<T> => ({ ok: false, hata });

const KODLAR: ReadonlySet<string> = new Set(SUNUCU_HATALARI);
export function hataKoduMu(v: unknown): v is HataKodu {
  return typeof v === "string" && KODLAR.has(v);
}

// Davet kodu: sunucudaki mantik.ts ile aynı alfabe ve uzunluk (0/O, 1/I/L yok).
export const DAVET_ALFABESI = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const DAVET_UZUNLUGU = 6;
export const BASLANGIC_YASI = 12;
/** Öğrenme dönemi: 12→13 yaş = 12 oyun ayı = 6 gerçek gün (günde iki ay dönümü). */
export const OGRENME_GUNU = 6;

/** Büyük harfe çevirir, boşluk/tireyi atar, alfabe dışını ayıklar (yazarken). */
export function davetKoduTemizle(ham: string): string {
  let kod = "";
  for (const h of ham.toUpperCase()) if (DAVET_ALFABESI.includes(h)) kod += h;
  return kod.slice(0, DAVET_UZUNLUGU);
}
export function davetKoduGecerli(kod: string): boolean {
  return kod.length === DAVET_UZUNLUGU && [...kod].every((h) => DAVET_ALFABESI.includes(h));
}

// ---------------------------------------------------------------- yanıt biçim denetimi

type Nesne = Record<string, unknown>;
const nesne = (v: unknown): v is Nesne => typeof v === "object" && v !== null && !Array.isArray(v);
const metin = (v: unknown): v is string => typeof v === "string";
const sayi = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const cinsiyetMi = (v: unknown): v is Cinsiyet => v === "erkek" || v === "kadın";
const turMu = (v: unknown): v is YerlesimTuru => v === "koy" || v === "kasaba" || v === "sehir";

export function girisYanitiMi(v: unknown): v is GirisYaniti {
  return nesne(v) && metin(v.oturum) && typeof v.profilVar === "boolean" && (v.adOnerisi === undefined || metin(v.adOnerisi));
}
export function profilMi(v: unknown): v is Profil {
  return nesne(v) && metin(v.hesapId) && metin(v.ad) && cinsiyetMi(v.cinsiyet) && metin(v.beylik) && metin(v.yerlesim)
    && sayi(v.dogumAyi) && sayi(v.olusturma) && (v.davetEden === undefined || metin(v.davetEden));
}
export function davetBilgisiMi(v: unknown): v is DavetBilgisi {
  return nesne(v) && metin(v.kod) && metin(v.yerlesim) && metin(v.beylik) && metin(v.davetEden);
}
export function davetKoduYanitiMi(v: unknown): v is { kod: string } {
  return nesne(v) && metin(v.kod);
}
function yerlesimMi(v: unknown): v is YerlesimOzeti {
  return nesne(v) && metin(v.id) && metin(v.ad) && turMu(v.tur) && sayi(v.evKapasite) && sayi(v.npc) && sayi(v.nufus);
}
export function dunyaMi(v: unknown): v is DunyaOzeti {
  if (!nesne(v) || !nesne(v.saat) || !Array.isArray(v.beylikler)) return false;
  const s = v.saat;
  if (![s.simdi, s.oyunAyi, s.yil, s.ay, s.sonrakiDonum].every(sayi) || !metin(s.mevsim)) return false;
  return v.beylikler.every((b) => nesne(b) && metin(b.id) && metin(b.ad) && Array.isArray(b.yerlesimler) && b.yerlesimler.every(yerlesimMi));
}

/** Dünya özetinde yerleşimi beyliğiyle bulur. */
export function yerlesimBul(dunya: DunyaOzeti | null | undefined, id: string): { yerlesim: YerlesimOzeti; beylik: BeylikOzeti } | undefined {
  for (const beylik of dunya?.beylikler ?? []) {
    const yerlesim = beylik.yerlesimler.find((y) => y.id === id);
    if (yerlesim) return { yerlesim, beylik };
  }
  return undefined;
}
