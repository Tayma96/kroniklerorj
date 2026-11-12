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

// Faz 3a oyuncular arası hata kodları ayrı dosyada (toplum-veri.ts; yalnız tip alır, döngü yok).
import { TOPLUM_HATALARI, type ToplumHataKodu } from "./toplum-veri";
/** Sunucunun hata kodları (tipler.ts HATA_DURUMU ile aynı sıra). */
export const SUNUCU_HATALARI = [
  "gecersiz_istek", "govde_buyuk", "bulunamadi", "yontem_yok", "oturum_yok", "oturum_gecersiz",
  "oturum_suresi_doldu", "google_gecersiz", "google_erisilemiyor", "hiz_siniri", "profil_yok", "profil_var",
  "ad_uzunluk", "ad_karakter", "ad_yasak", "ad_alinmis", "cinsiyet_gecersiz", "yerlesim_gecersiz",
  "yerlesim_dolu", "davet_gecersiz", "davet_yok", "istekno_gecersiz", "sakin_yok", "kisi_yok", "eylem_gecersiz",
  "isaret_gecersiz", "imlec_gecersiz", "yas_kapisi", "ogrenme_kapali", "hedef_uygun_degil", "takat_yok", "para_yok",
  "zaten_cirak", "karar_verildi", "puan_yok", "meslek_gecersiz", "meslek_yok", "kademe_kapali", "dal_kapali", "dugum_kapali",
  "geri_alma_dolu", "mal_gecersiz", "kota_doldu", "verim_yok", "tarif_gecersiz", "girdi_yok", "mal_yok", "siparis_yok", "siparis_kapandi",
  "yapilandirma_eksik", "sunucu_hatasi",
  // Beceri ağacı v2 (online-server yerlesim/beceri.ts)
  "meslek_degisim_dolu", "dugum_gecersiz", "dugum_gizli", "seviye_tavan", "on_kosul_eksik", "ogrenme_suruyor", "ogrenme_yok",
  "kaynak_gecersiz", "hizlandirma_kapali", "hizlandirma_yok", "yeniden_bos",
  // P5 siyaset: darbe çatışması ve iki taraflı ateşkes.
  "darbe_kapali", "devlet_talep_var", "taraf_degil", "deger_sinir_disi", "stok_yok", "arac_yok", "ayni_kume",
] as const;
export type HataKodu = (typeof SUNUCU_HATALARI)[number] | ToplumHataKodu;

/** Yalnız istemcide doğan hatalar: adres boş, ağ yok, zaman aşımı, anlaşılmayan yanıt. */
export type IstemciHatasi = "sunucu_yok" | "ag_yok" | "zaman_asimi" | "gecersiz_yanit";
export type OnlineHata = HataKodu | IstemciHatasi;

export type Sonuc<T> = { ok: true; deger: T } | { ok: false; hata: OnlineHata };

export const basarili = <T,>(deger: T): Sonuc<T> => ({ ok: true, deger });
export const basarisiz = <T = never,>(hata: OnlineHata): Sonuc<T> => ({ ok: false, hata });

const KODLAR: ReadonlySet<string> = new Set<string>([...SUNUCU_HATALARI, ...TOPLUM_HATALARI]);
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

// ================================================================ Faz 2: yaşayan yerleşim
// online-server/src/yerlesim/motor.ts uç yanıtlarının biçimi (README "Uçlar" ve "İstemci anahtarları").
// Metinler {k, p} anahtarlarıyla gelir; istemci "onl." + k anahtarıyla çevirir (lib/online/metin.ts).

export type Dil = "tr" | "en" | "es" | "pt" | "ar" | "ru";
export type Isaret = "tanidik" | "dost" | "dusman";
export const ISARETLER: readonly Isaret[] = ["tanidik", "dost", "dusman"];
export const NPC_EYLEMLERI = ["sohbet", "yardim", "hediye", "ayakIsi", "cirak"] as const;
export type NpcEylemi = (typeof NPC_EYLEMLERI)[number];
export type EylemTuru = NpcEylemi | "mektep" | "puan" | "karar";
export const OZELLIKLER = ["guc", "ceviklik", "dayaniklilik", "zeka", "karizma", "sezgi"] as const;
export const BECERILER = ["dovus", "soz", "ticaret", "zanaat", "ilim", "gizlilik"] as const;
export const NAMLAR = ["comertlik", "dindarlik", "mertlik", "caliskanlik"] as const;
export const KARARLAR = ["zanaat", "ilim", "ticaret", "yol"] as const;
export type Ozellik = (typeof OZELLIKLER)[number];
export type Karar = (typeof KARARLAR)[number];
/** Özellik 1-10, beceri ve nam 0-100 (sunucu karakter.ts). */
export const OZELLIK_EN_COK = 10;
/** Öğrenme döneminde her eylemin/işaretin açıldığı gün (sunucu ogrenme.ts → OGRENME_GUNLERI.acilan). */
export const ACILIS_GUNU: Readonly<Record<string, number>> = {
  sohbet: 1, yardim: 1, tanidik: 1, cirak: 2, mektep: 3, puan: 3, ayakIsi: 4, hediye: 5, dost: 5, dusman: 5, karar: 6,
};

export interface KisiAdi { id: string; ad: string }
/** Çevrilecek metin: anahtar + parametreler (kişiler {id, ad}). */
export interface Ozet { k: string; p: Record<string, unknown> }
export interface Olay {
  sira: number;
  ay: number;
  tur: string;
  kim: string | null;
  hedef: string | null;
  gorunurluk: "herkes" | "ozel";
  onem: number;
  ozet: Ozet;
}
export interface Kalem { k: string; d: number; p?: Record<string, string | number> }
/** Toplam = kalemlerin toplamı (kırpma "sinir" kalemiyle görünür). */
export interface Dokum { toplam: number; kalemler: Kalem[] }
export interface HaritaKisisi { id: string; ad: string; oyuncu?: true }
export interface HaritaMekani { id: string; kisiler: HaritaKisisi[] }
export interface Odul { para?: number; beceri?: [string, number]; ozellikPuani?: number }
export interface OgrenmeGunu {
  gun: number;
  sistem: string;
  acik: boolean;
  hedef: Ozet;
  ilerleme: number;
  gerekli: number;
  tamam: boolean;
  odul: Odul;
}
export interface OgrenmeDurumu { gun: number; suruyor: boolean; gunler: OgrenmeGunu[] }
export interface Tanidik { id: string; ad: string; isaret: Isaret; oyuncu?: true; gorus?: number }
export interface AileUyesi { id: string; ad: string; rol: string }
export interface Ben {
  id: string;
  ad: string;
  cinsiyet: Cinsiyet;
  yas: number;
  dogumAyi: number;
  ozellikler: Record<string, number>;
  ozellikPuani: number;
  beceriler: Record<string, number>;
  nam: Record<string, number>;
  takat: { kalan: number; tavan: number; aylik: number };
  para: number;
  hane: AileUyesi[];
  usta: { id: string; ad: string; meslek: string } | null;
  mekan: string | null;
  karar: string | null;
  kulYemini: boolean;
  tanidiklar: Tanidik[];
  ogrenme: OgrenmeDurumu;
  /**
   * Dikey dilim (motor.ts #ben): meslek kaydı (hiç meslek seçilmemiş eski kayıtta null), kademe hizmet eşikleri,
   * envanter, mesleğe özel tecrübe/beceri puanı, Hal ve tarifler. Eski sunucu göndermeyebilir: hepsi opsiyonel.
   */
  meslek?: MeslekKaydi | null;
  kademeHizmet?: number[];
  envanter?: Envanter;
  beceri?: BeceriHaritasi;
  hal?: HalGorunumu;
  tarifler?: TarifSatiri[];
}
export interface YerlesimBilgisi { id: string; ad: string; tur: YerlesimTuru; beylik: string; npc: number; oyuncu: number }
/** GET /v1/yerlesim */
export interface YerlesimDurumu {
  saat: SaatOzeti;
  yerlesim: YerlesimBilgisi;
  ben: Ben;
  harita: HaritaMekani[];
  donusKarti: Olay[];
  oneriler: { id: string; ad: string; gorus: number }[];
  imlec: number;
}
/** GET /v1/olaylar?imlec= */
export interface OlaylarYaniti { olaylar: Olay[]; imlec: number; dahaVar: boolean; eksik: boolean }
export interface Getiri { tekrar: number; carpan: number }
export interface EylemKarti { tur: NpcEylemi; takat: number; acik: boolean; engel?: HataKodu; sans?: Dokum; getiri: Getiri }
export interface Bakis { id: string; ad: string; tur: string; deger: number; oyuncu?: true }
export interface KisiNpc {
  id: string;
  ad: string;
  oyuncu?: undefined;
  cinsiyet: Cinsiyet;
  yas: number;
  meslek: string;
  huy: string;
  tuhaflik: string;
  hayal: string;
  gundem: string | null;
  mekan: string | null;
  aile: AileUyesi[];
  sanaBakis: Dokum;
  /** §13.9: yalnız yakınsan (+30 üstü) görünür. */
  bakislari: { gorunur: boolean; liste: Bakis[] };
  eylemler: EylemKarti[];
  tanidik: Isaret | null;
}
export interface KisiOyuncu {
  id: string;
  ad: string;
  oyuncu: true;
  ben: boolean;
  cinsiyet: Cinsiyet;
  yas: number;
  mekan: string | null;
  tanidik: Isaret | null;
}
/** GET /v1/kisi/:id */
export type Kisi = KisiNpc | KisiOyuncu;
export interface EylemIstegi { tur: EylemTuru; hedef?: string; secim?: string; ozellik?: string; istekNo: string; dil?: Dil }
export interface VerilenOdul { gun: number; odul: Odul }
/** POST /v1/eylem */
export interface EylemYaniti {
  tur: EylemTuru;
  hedef?: string;
  hedefAd?: string | null;
  sans?: Dokum;
  zar?: number;
  basari: boolean;
  getiri?: Getiri;
  sonuc: Ozet;
  degisim: {
    gorus?: number;
    para?: number;
    beceri?: Record<string, number>;
    nam?: Record<string, number>;
    ozellik?: Record<string, number>;
    /** Hal: başarılı sohbet/yardımın gönüle katkısı. */
    gonul?: number;
  };
  takat: { kalan: number; tavan: number };
  ogrenme: VerilenOdul[];
  olay?: Olay;
}
export interface TanidikIstegi { hedef: string; isaret: Isaret | null; dil?: Dil }
/** POST /v1/tanidik */
export interface TanidikYaniti { tanidiklar: Tanidik[]; ogrenme: VerilenOdul[] }

const dizi = (v: unknown): v is unknown[] => Array.isArray(v);
const metinYaDaBos = (v: unknown) => v === null || metin(v);
const ozetMi = (v: unknown): v is Ozet => nesne(v) && metin(v.k) && nesne(v.p);
function olayMi(v: unknown): v is Olay {
  return nesne(v) && sayi(v.sira) && sayi(v.ay) && metin(v.tur) && metinYaDaBos(v.kim) && metinYaDaBos(v.hedef) && sayi(v.onem) && ozetMi(v.ozet);
}
const kalemMi = (v: unknown): v is Kalem => nesne(v) && metin(v.k) && sayi(v.d) && (v.p === undefined || nesne(v.p));
const dokumMi = (v: unknown): v is Dokum => nesne(v) && sayi(v.toplam) && dizi(v.kalemler) && v.kalemler.every(kalemMi);
const kisiAdiMi = (v: unknown): v is Nesne & KisiAdi => nesne(v) && metin(v.id) && metin(v.ad);
const saatMi = (v: unknown): v is SaatOzeti => nesne(v) && [v.simdi, v.oyunAyi, v.yil, v.ay, v.sonrakiDonum].every(sayi) && metin(v.mevsim);
const sayiHaritasi = (v: unknown) => nesne(v) && Object.values(v).every(sayi);
function benMi(v: unknown): v is Ben {
  if (!nesne(v) || !metin(v.id) || !metin(v.ad) || !cinsiyetMi(v.cinsiyet) || !sayi(v.yas) || !sayi(v.para)) return false;
  if (!sayiHaritasi(v.ozellikler) || !sayiHaritasi(v.beceriler) || !sayiHaritasi(v.nam) || !sayi(v.ozellikPuani)) return false;
  const tk = v.takat, og = v.ogrenme;
  if (!nesne(tk) || !sayi(tk.kalan) || !sayi(tk.tavan) || !sayi(tk.aylik)) return false;
  if (!dizi(v.hane) || !v.hane.every(kisiAdiMi) || !dizi(v.tanidiklar) || !v.tanidiklar.every(kisiAdiMi)) return false;
  if (!(nesne(og) && sayi(og.gun) && dizi(og.gunler) && og.gunler.every((g) => nesne(g) && sayi(g.gun) && metin(g.sistem) && ozetMi(g.hedef) && sayi(g.ilerleme) && sayi(g.gerekli) && nesne(g.odul)))) return false;
  // Dikey dilim alanları opsiyoneldir; gelmişse biçimi doğru olmalı.
  if (v.meslek !== undefined && v.meslek !== null && !meslekKaydiMi(v.meslek)) return false;
  if (v.envanter !== undefined && !envanterMi(v.envanter)) return false;
  if (v.beceri !== undefined && !beceriHaritasiMi(v.beceri)) return false;
  if (v.hal !== undefined && !halMi(v.hal)) return false;
  return v.tarifler === undefined || tarifListesiMi(v.tarifler);
}
const haritaMi = (v: unknown): v is HaritaMekani[] => dizi(v) && v.every((m) => nesne(m) && metin(m.id) && dizi(m.kisiler) && m.kisiler.every(kisiAdiMi));

export function yerlesimDurumuMi(v: unknown): v is YerlesimDurumu {
  if (!nesne(v) || !saatMi(v.saat) || !benMi(v.ben) || !haritaMi(v.harita) || !sayi(v.imlec)) return false;
  const y = v.yerlesim;
  return nesne(y) && metin(y.id) && metin(y.ad) && turMu(y.tur) && dizi(v.donusKarti) && v.donusKarti.every(olayMi)
    && dizi(v.oneriler) && v.oneriler.every((o) => kisiAdiMi(o) && sayi(o.gorus));
}
export function olaylarYanitiMi(v: unknown): v is OlaylarYaniti {
  return nesne(v) && dizi(v.olaylar) && v.olaylar.every(olayMi) && sayi(v.imlec) && typeof v.dahaVar === "boolean";
}
export function kisiYanitiMi(v: unknown): v is Kisi {
  if (!kisiAdiMi(v) || !cinsiyetMi(v.cinsiyet) || !sayi(v.yas)) return false;
  if (v.oyuncu === true) return typeof v.ben === "boolean";
  const b = v.bakislari;
  return metin(v.meslek) && metin(v.huy) && dizi(v.aile) && v.aile.every(kisiAdiMi) && dokumMi(v.sanaBakis)
    && nesne(b) && typeof b.gorunur === "boolean" && dizi(b.liste)
    && dizi(v.eylemler) && v.eylemler.every((e) => nesne(e) && metin(e.tur) && sayi(e.takat) && typeof e.acik === "boolean" && (e.sans === undefined || dokumMi(e.sans)));
}
export function eylemYanitiMi(v: unknown): v is EylemYaniti {
  return nesne(v) && metin(v.tur) && typeof v.basari === "boolean" && ozetMi(v.sonuc) && nesne(v.degisim)
    && nesne(v.takat) && sayi(v.takat.kalan) && dizi(v.ogrenme) && (v.sans === undefined || dokumMi(v.sans))
    && (v.olay === undefined || olayMi(v.olay));
}
export function tanidikYanitiMi(v: unknown): v is TanidikYaniti {
  return nesne(v) && dizi(v.tanidiklar) && v.tanidiklar.every(kisiAdiMi) && dizi(v.ogrenme);
}
/** Kişi kimliği biçimi (sunucu ortak.ts kisiCoz): NPC "n<sayı>", oyuncu "o<sayı>". */
export const kisiKimligiMi = (v: unknown): v is string => typeof v === "string" && /^(n|o)[1-9][0-9]{0,8}$/.test(v);


// ================================================================ Meslek çekirdeği (ana tasarım §5)
// online-server/src/icerik/meslekler.ts, mallar.ts, yerlesim/meslek.ts, temel-is.ts, npc-taban.ts, lonca.ts ve
// motor.ts (#tekrarGuvenli, meslek, temelIs, tabanAl, lonca) yanıtlarının birebir biçimi. Kısa alan adları
// sunucunun kayıt biçimidir (MeslekKaydi aynen döner). Sonucu sunucu hesaplar; istemci yalnız niyet gönderir.

export const MESLEK_IDLERI = [
  "ciftci", "oduncu", "demirci", "marangoz", "dokumaci", "asci", "hanci", "sifaci", "ozan", "katip", "tuccar", "arabulucu", "asker", "divan",
] as const;
export type MeslekId = (typeof MESLEK_IDLERI)[number];
export const KADEMELER = ["cirak", "kalfa", "usta", "pir"] as const;
export type Kademe = 0 | 1 | 2 | 3;
export const MAL_IDLERI = [
  "odun", "sertOdun", "tas", "ot", "yun", "su", "kereste", "cevher", "komur", "tahil", "deri", "alet", "nal", "sifaliOt", "inceYun",
] as const;
export type MalId = (typeof MAL_IDLERI)[number];
export const IS_IDLERI = ["odun", "tas", "ot", "yun", "su"] as const;
export type IsId = (typeof IS_IDLERI)[number];
/** Sunucu envanteri Record<string, number> olarak gönderir (yalnız sıfırdan büyük adetler). */
export type Envanter = Partial<Record<string, number>>;

/** Bir meslekteki ilerleme (sunucu meslek.ts MeslekIlerleme). */
export interface MeslekIlerleme {
  /** Kademe: 0 çırak, 1 kalfa, 2 usta, 3 pir. */
  kd: Kademe;
  /** Açık dallar. */
  dl: string[];
  /** Açık düğümler ("<meslek>.<dal>.<kademe>"). */
  dg: string[];
  /** Hizmet puanı (yan meslekte yarım eklenir, kesirli olabilir). */
  hz: number;
  /** Kalfa yaptığı çırak sayısı (pir şartı). */
  cy: number;
}
/** Sunucu meslek.ts MeslekKaydi: ana (a) ve yan (y) meslek, meslek başına ilerleme, son geri alma ayı. */
export interface MeslekKaydi {
  a: MeslekId | "";
  y: MeslekId | "";
  s: Partial<Record<MeslekId, MeslekIlerleme>>;
  ga?: number;
}
export type MeslekIslemi = "sec" | "yan" | "kademe" | "dal" | "dugum" | "geriAl";
/** POST /v1/meslek gövdesi. */
export interface MeslekIstegi { islem: MeslekIslemi; meslek: MeslekId; dal?: string; dugum?: string; istekNo: string }
/** #tekrarGuvenli her yazma yanıtına envanter, para ve takatin kalanını (sayı) ekler. */
export interface YazmaOrtak { envanter: Envanter; para: number; takat: number }
/** POST /v1/meslek yanıtı (beceri ve tarifler dikey dilimde eklendi; eski sunucuda yok). */
export interface MeslekYaniti extends YazmaOrtak { meslek: MeslekKaydi; kademeHizmet: number[]; beceri?: BeceriHaritasi; tarifler?: TarifSatiri[] }
/** POST /v1/temel-is gövdesi. */
export interface TemelIsIstegi { is: IsId; istekNo: string }
/** POST /v1/temel-is yanıtı: çıktı, usta iş mi, eklenen hizmet ve fırsat dökümü (kalemler bu_is, meslekte). */
export interface TemelIsYaniti extends YazmaOrtak { is: IsId; mal: MalId; adet: number; usta: boolean; hizmet: number; firsat: Dokum }
/** POST /v1/taban-al gövdesi. */
export interface TabanAlIstegi { mal: MalId; adet: number; istekNo: string }
/** POST /v1/taban-al yanıtı: birim fiyat dökümü (taban, npc_pahali), alınan adet. */
export interface TabanAlYaniti extends YazmaOrtak { fiyat: Dokum; adet: number }
export type LoncaDurumu = "bos" | "az" | "dolu";
export interface LoncaSatiri { meslek: MeslekId; oyuncu: number; npc: number; durum: LoncaDurumu }
/** GET /v1/lonca yanıtı. */
export interface LoncaYaniti { lonca: LoncaSatiri[] }

const MESLEK_KUMESI: ReadonlySet<string> = new Set(MESLEK_IDLERI);
const MAL_KUMESI: ReadonlySet<string> = new Set(MAL_IDLERI);
const meslekIdMi = (v: unknown): v is MeslekId => typeof v === "string" && MESLEK_KUMESI.has(v);
const meslekVeyaBos = (v: unknown) => v === "" || meslekIdMi(v);
const metinDizisi = (v: unknown): v is string[] => dizi(v) && v.every(metin);
function ilerlemeMi(v: unknown): v is MeslekIlerleme {
  return nesne(v) && (v.kd === 0 || v.kd === 1 || v.kd === 2 || v.kd === 3) && metinDizisi(v.dl) && metinDizisi(v.dg) && sayi(v.hz) && sayi(v.cy);
}
export function meslekKaydiMi(v: unknown): v is MeslekKaydi {
  if (!nesne(v) || !meslekVeyaBos(v.a) || !meslekVeyaBos(v.y) || !nesne(v.s)) return false;
  if (v.ga !== undefined && !sayi(v.ga)) return false;
  return Object.entries(v.s).every(([id, i]) => meslekIdMi(id) && ilerlemeMi(i));
}
const envanterMi = (v: unknown): v is Envanter => nesne(v) && Object.values(v).every(sayi);
const yazmaOrtakMi = (v: Nesne) => envanterMi(v.envanter) && sayi(v.para) && sayi(v.takat);
export function meslekYanitiMi(v: unknown): v is MeslekYaniti {
  return nesne(v) && yazmaOrtakMi(v) && meslekKaydiMi(v.meslek) && dizi(v.kademeHizmet) && v.kademeHizmet.every(sayi)
    && (v.beceri === undefined || beceriHaritasiMi(v.beceri)) && (v.tarifler === undefined || tarifListesiMi(v.tarifler));
}
export function temelIsYanitiMi(v: unknown): v is TemelIsYaniti {
  return nesne(v) && yazmaOrtakMi(v) && metin(v.is) && metin(v.mal) && MAL_KUMESI.has(v.mal) && sayi(v.adet)
    && typeof v.usta === "boolean" && sayi(v.hizmet) && dokumMi(v.firsat);
}
export function tabanAlYanitiMi(v: unknown): v is TabanAlYaniti {
  return nesne(v) && yazmaOrtakMi(v) && dokumMi(v.fiyat) && sayi(v.adet);
}
export function loncaYanitiMi(v: unknown): v is LoncaYaniti {
  return nesne(v) && dizi(v.lonca) && v.lonca.every((r) => nesne(r) && meslekIdMi(r.meslek) && sayi(r.oyuncu) && sayi(r.npc)
    && (r.durum === "bos" || r.durum === "az" || r.durum === "dolu"));
}

// ================================================================ Dikey dilim (Faz 3 + E1 Hal + E2)
// online-server/src/yerlesim/hal.ts (halGorunumu), meslek.ts (beceriGorunumu), tarif.ts (tarifListesi, tarifYap),
// pazar.ts (npcyeSat), siparis.ts (siparisGorunumu, siparisTeslim) ve motor.ts (tarif, sat, siparisTeslim,
// siparisler) yanıtlarının birebir biçimi. Etki ve neden metinleri anahtardır ("onl." + k ile çevrilir).

/** Mesleğe özel tecrübe ve beceri puanı (sunucu meslek.ts BeceriPuani). */
export interface BeceriPuani {
  tecrube: number;
  kazanilan: number;
  harcanan: number;
  kalan: number;
  /** Bir sonraki puana kalan tecrübe. */
  sonrakiPuan: number;
  /** Bir sonraki kademeye gereken toplam tecrübe; pir ise null. */
  sonrakiKademe: number | null;
}
export type BeceriHaritasi = Partial<Record<MeslekId, BeceriPuani>>;

export type Gosterge = "can" | "kondisyon" | "gonul";
export type CanDurumu = "saglam" | "yarali";
export type KondisyonKademesi = "iyi" | "yorgun" | "bitkin";
export type GonulDurumu = "sen" | "olagan" | "kirgin";
/** Etki: i18n anahtarı (hal.can.saglam …) ve sayılar (gizli sayı yok). */
export interface HalEtki { k: string; p: Record<string, number> }
export interface HalNedeni { gosterge: Gosterge; fark: number; neden: string; ay: number }
export interface HalGorunumu {
  can: { deger: number; durum: CanDurumu; etki: HalEtki };
  kondisyon: { deger: number; kademe: KondisyonKademesi; etki: HalEtki };
  gonul: { deger: number; durum: GonulDurumu; etki: HalEtki };
  nedenler: HalNedeni[];
}
/** tarifListesi satırı: düğüm açık mı, eksik girdi, araç ve aşınması, şu an yapılabilir mi (takat dahil). */
export interface TarifSatiri {
  id: string;
  meslek: MeslekId;
  dugum: string;
  girdi: Envanter;
  cikti: { mal: MalId; adet: number };
  takat: number;
  hizmet: number;
  arac: { mal: MalId; adet: number; var: boolean; kullanim: number; omur: number } | null;
  acik: boolean;
  eksik: Envanter;
  yapilabilir: boolean;
}
/** POST /v1/tarif gövdesi ve yanıtı. */
export interface TarifIstegi { tarif: string; istekNo: string }
export interface TarifYaniti extends YazmaOrtak {
  tarif: string;
  cikti: { mal: MalId; adet: number };
  girdi: Envanter;
  arac: { mal: MalId; kullanim: number; omur: number; asindi: boolean } | null;
  hizmet: number;
  hal: HalGorunumu;
  tarifler: TarifSatiri[];
}
/** POST /v1/sat gövdesi ve yanıtı: birim fiyat dökümü (taban, kitlik), tutar ve aylık kota. */
export interface SatIstegi { mal: MalId; adet: number; istekNo: string }
export interface SatYaniti extends YazmaOrtak {
  mal: MalId;
  adet: number;
  birim: Dokum;
  tutar: number;
  kota: { satilan: number; tavan: number; kalan: number };
}
export type SiparisDurumu = "acik" | "teslim" | "dustu";
/** GET /v1/siparisler satırı (en yeni önce). */
export interface SiparisSatiri {
  id: string;
  mal: MalId;
  adet: number;
  odul: number;
  hizmet: number;
  meslek: MeslekId;
  acilis: number;
  son: number;
  kalanAy: number;
  durum: SiparisDurumu;
  isteyen: KisiAdi | null;
  alan: KisiAdi | null;
  teslimAy: number | null;
  elde: number;
  teslimEdebilir: boolean;
}
export interface SiparislerYaniti { siparisler: SiparisSatiri[] }
/** POST /v1/siparis/teslim gövdesi ve yanıtı: ödül, hizmet, gönül, görüş artışları (kimlik → artış), teşekkür izi. */
export interface SiparisTeslimIstegi { siparis: string; istekNo: string; dil?: Dil }
export interface SiparisTeslimYaniti extends YazmaOrtak {
  siparis: string;
  mal: MalId;
  adet: number;
  odul: number;
  hizmet: number;
  gonul: number;
  gorus: Record<string, number>;
  hal: HalGorunumu;
  olay?: Olay;
}

const malIdMi = (v: unknown): v is MalId => typeof v === "string" && MAL_KUMESI.has(v);
const etkiMi = (v: unknown): v is HalEtki => nesne(v) && metin(v.k) && sayiHaritasi(v.p);
const gostergeMi = (v: unknown) => nesne(v) && sayi(v.deger) && etkiMi(v.etki);
function halMi(v: unknown): v is HalGorunumu {
  if (!nesne(v) || !gostergeMi(v.can) || !gostergeMi(v.kondisyon) || !gostergeMi(v.gonul) || !dizi(v.nedenler)) return false;
  if (!metin((v.can as Nesne).durum) || !metin((v.kondisyon as Nesne).kademe) || !metin((v.gonul as Nesne).durum)) return false;
  return v.nedenler.every((n) => nesne(n) && metin(n.gosterge) && sayi(n.fark) && metin(n.neden) && sayi(n.ay));
}
function beceriHaritasiMi(v: unknown): v is BeceriHaritasi {
  return nesne(v) && Object.entries(v).every(([m, b]) => meslekIdMi(m) && nesne(b)
    && [b.tecrube, b.kazanilan, b.harcanan, b.kalan, b.sonrakiPuan].every(sayi) && (b.sonrakiKademe === null || sayi(b.sonrakiKademe)));
}
const ciktiMi = (v: unknown) => nesne(v) && malIdMi(v.mal) && sayi(v.adet);
function tarifSatiriMi(v: unknown): v is TarifSatiri {
  if (!nesne(v) || !metin(v.id) || !meslekIdMi(v.meslek) || !metin(v.dugum) || !envanterMi(v.girdi) || !ciktiMi(v.cikti)) return false;
  if (!sayi(v.takat) || !sayi(v.hizmet) || typeof v.acik !== "boolean" || !envanterMi(v.eksik) || typeof v.yapilabilir !== "boolean") return false;
  const a = v.arac;
  return a === null || (nesne(a) && malIdMi(a.mal) && sayi(a.adet) && typeof a.var === "boolean" && sayi(a.kullanim) && sayi(a.omur));
}
const tarifListesiMi = (v: unknown): v is TarifSatiri[] => dizi(v) && v.every(tarifSatiriMi);
export function tarifYanitiMi(v: unknown): v is TarifYaniti {
  if (!nesne(v) || !yazmaOrtakMi(v) || !metin(v.tarif) || !ciktiMi(v.cikti) || !envanterMi(v.girdi) || !sayi(v.hizmet) || !halMi(v.hal)) return false;
  const a = v.arac;
  return (a === null || (nesne(a) && malIdMi(a.mal) && sayi(a.kullanim) && sayi(a.omur) && typeof a.asindi === "boolean")) && tarifListesiMi(v.tarifler);
}
export function satYanitiMi(v: unknown): v is SatYaniti {
  const k = nesne(v) ? v.kota : null;
  return nesne(v) && yazmaOrtakMi(v) && malIdMi(v.mal) && sayi(v.adet) && dokumMi(v.birim) && sayi(v.tutar)
    && nesne(k) && sayi(k.satilan) && sayi(k.tavan) && sayi(k.kalan);
}
const kisiYaDaBos = (v: unknown) => v === null || kisiAdiMi(v);
function siparisSatiriMi(v: unknown): v is SiparisSatiri {
  return nesne(v) && metin(v.id) && malIdMi(v.mal) && [v.adet, v.odul, v.hizmet, v.acilis, v.son, v.kalanAy, v.elde].every(sayi)
    && meslekIdMi(v.meslek) && (v.durum === "acik" || v.durum === "teslim" || v.durum === "dustu")
    && kisiYaDaBos(v.isteyen) && kisiYaDaBos(v.alan) && (v.teslimAy === null || sayi(v.teslimAy)) && typeof v.teslimEdebilir === "boolean";
}
export function siparislerYanitiMi(v: unknown): v is SiparislerYaniti {
  return nesne(v) && dizi(v.siparisler) && v.siparisler.every(siparisSatiriMi);
}
export function siparisTeslimYanitiMi(v: unknown): v is SiparisTeslimYaniti {
  return nesne(v) && yazmaOrtakMi(v) && metin(v.siparis) && malIdMi(v.mal) && [v.adet, v.odul, v.hizmet, v.gonul].every(sayi)
    && sayiHaritasi(v.gorus) && halMi(v.hal) && (v.olay === undefined || olayMi(v.olay));
}
