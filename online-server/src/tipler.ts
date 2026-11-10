// Sunucu ile istemci arasındaki ortak biçimler ve hata kodları.
// mobile/lib/online/protokol.ts (Faz 1b) bu biçimlerin aynısını taşır. Hata metni istemcide çevrilir.

import type { YerlesimTuru } from "./dunya-veri.ts";
import type { Mevsim } from "./saat.ts";

export type Cinsiyet = "erkek" | "kadın";

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
  /** Davet edenin görünen adı. */
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

export interface DunyaOzeti {
  saat: SaatOzeti;
  beylikler: { id: string; ad: string; yerlesimler: YerlesimOzeti[] }[];
}

/** Hata kodu → HTTP durumu. Gövde her zaman {hata: kod}. */
export const HATA_DURUMU = {
  gecersiz_istek: 400,
  govde_buyuk: 413,
  bulunamadi: 404,
  yontem_yok: 405,
  oturum_yok: 401,
  oturum_gecersiz: 401,
  oturum_suresi_doldu: 401,
  google_gecersiz: 401,
  google_erisilemiyor: 503,
  hiz_siniri: 429,
  profil_yok: 404,
  profil_var: 409,
  ad_uzunluk: 400,
  ad_karakter: 400,
  ad_yasak: 400,
  ad_alinmis: 409,
  cinsiyet_gecersiz: 400,
  yerlesim_gecersiz: 400,
  yerlesim_dolu: 409,
  davet_gecersiz: 400,
  davet_yok: 404,
  istekno_gecersiz: 400,
  sakin_yok: 404,
  kisi_yok: 404,
  eylem_gecersiz: 400,
  isaret_gecersiz: 400,
  imlec_gecersiz: 400,
  yas_kapisi: 403,
  ogrenme_kapali: 403,
  hedef_uygun_degil: 409,
  takat_yok: 409,
  para_yok: 409,
  zaten_cirak: 409,
  karar_verildi: 409,
  puan_yok: 409,
  meslek_gecersiz: 400,
  meslek_yok: 409,
  kademe_kapali: 409,
  dal_kapali: 409,
  dugum_kapali: 409,
  geri_alma_dolu: 409,
  // Beceri ağacı v2
  meslek_degisim_dolu: 409,
  dugum_gecersiz: 400,
  dugum_gizli: 409,
  seviye_tavan: 409,
  on_kosul_eksik: 409,
  ogrenme_suruyor: 409,
  ogrenme_yok: 409,
  kaynak_gecersiz: 400,
  hizlandirma_kapali: 403,
  hizlandirma_yok: 409,
  yeniden_bos: 409,
  mal_gecersiz: 400,
  kota_doldu: 409,
  verim_yok: 409,
  arac_yok: 409,
  parametre_capraz: 409,
  tarif_gecersiz: 400,
  girdi_yok: 409,
  mal_yok: 409,
  siparis_yok: 404,
  siparis_kapandi: 409,
  // Oyuncular arası (Faz 3a)
  teklif_gecersiz: 400,
  teklif_yok: 404,
  teklif_kapandi: 409,
  teklif_siniri: 429,
  taraf_degil: 403,
  kendine: 409,
  engelli: 403,
  tavan_doldu: 409,
  hediye_dongu: 409,
  aralik_dolu: 409,
  istek_yok: 404,
  soylenti_yok: 404,
  duzen_gecersiz: 400,
  oncelik_bekle: 409,
  // Yönetim (Y1) ve yaptırım
  uzaklastirildi: 403,
  susturuldu: 403,
  yetki_yok: 403,
  eposta_dogrulanmamis: 403,
  kendi_hedef: 403,
  gerekce_gecersiz: 400,
  gun_gecersiz: 400,
  yaptirim_gecersiz: 400,
  yaptirim_yok: 409,
  kendini_sikayet: 409,
  sikayet_gecersiz: 400,
  sikayet_yok: 404,
  sikayet_siniri: 429,
  // Han masası (Faz 10)
  masa_gecersiz: 400,
  masa_kapali: 409,
  masa_kalabalik: 409,
  koltuk_dolu: 409,
  zaten_oturuyor: 409,
  oturmuyor: 409,
  metin_gecersiz: 400,
  hedef_masada_degil: 409,
  kavga_yasak: 409,
  olay_yok: 404,
  atildi: 403,
  eylem_siniri: 429,
  ikram_gecersiz: 400,
  yukseltme_gerekli: 426,
  kuyruk_dolu: 503,
  parametre_gecersiz: 400,
  deger_sinir_disi: 400,
  geri_yok: 409,
  rol_gecersiz: 400,
  eposta_gecersiz: 400,
  kurucu_degismez: 409,
  duyuru_gecersiz: 400,
  hesap_yok: 404,
  // Hanedan (Faz 7)
  olu: 403,
  evli: 409,
  akraba_evlilik: 409,
  gorus_yetersiz: 409,
  vasiyet_gecersiz: 400,
  varis_gecersiz: 400,
  devir_yok: 409,
  devir_degisti: 409,
  // Ekonomi (Faz 6): oyuncu pazarı ve ısmarlama
  ilan_gecersiz: 400,
  ilan_yok: 404,
  ilan_kapandi: 409,
  ilan_siniri: 429,
  pompa_siniri: 409,
  ayni_kume: 403,
  ismarlama_gecersiz: 400,
  ismarlama_yok: 404,
  ismarlama_kapandi: 409,
  ismarlama_siniri: 429,
  // Barınma (Faz 14)
  barinma_kapali: 409,
  oda_gecersiz: 400,
  sure_gecersiz: 400,
  oda_var: 409,
  kira_siniri: 409,
  han_kapali: 409,
  konaklama_var: 409,
  tesis_kapali: 409,
  tesis_sart: 409,
  tesis_dolu: 409,
  mod_gecersiz: 400,
  // Üçgen (Faz 4)
  ucgen_gecersiz: 400,
  soz_yok: 404,
  talep_yok: 404,
  sart_yok: 404,
  dost_degil: 403,
  guven_yetersiz: 409,
  kirgin_degil: 409,
  casus_var: 409,
  hedef_siniri: 429,
  // Debdebe (Faz 11 + 15)
  debdebe_kapali: 403,
  urun_gecersiz: 400,
  urun_satilmaz: 409,
  zaten_sahip: 409,
  magaza_gecersiz: 400,
  magaza_yapilandirilmamis: 503,
  makbuz_gecersiz: 400,
  makbuz_kullanilmis: 409,
  makbuz_iade: 409,
  odeme_beklemede: 409,
  yuva_gecersiz: 400,
  yuva_kapali: 409,
  sahip_degil: 403,
  stok_yok: 409,
  armagan_siniri: 429,
  islem_yok: 404,
  yapilandirma_eksik: 500,
  sunucu_hatasi: 500,
} as const satisfies Record<string, number>;

export type HataKodu = keyof typeof HATA_DURUMU;

export type Basarili<T> = { ok: true; deger: T };
/** `bitis`: yalnız yaptırım engellerinde (uzaklastirildi/susturuldu); null = kalıcı. */
export type Basarisiz = { ok: false; hata: HataKodu; bitis?: number | null };
export type Sonuc<T> = Basarili<T> | Basarisiz;

export function basarili<T>(deger: T): Basarili<T> {
  return { ok: true, deger };
}

export function hata(kod: HataKodu): Basarisiz {
  return { ok: false, hata: kod };
}

export interface Env {
  HESAP: DurableObjectNamespace;
  DUNYA: DurableObjectNamespace;
  /** Yerleşim başına bir YerlesimDO (idFromName("yerlesim:<id>")). */
  YERLESIM: DurableObjectNamespace;
  /** Virgülle ayrılmış Google OAuth istemci kimlikleri ([vars]). */
  GOOGLE_CLIENT_ID?: string;
  /** Worker sırrı; en az 32 karakter. */
  OTURUM_ANAHTARI?: string;
  /** Han masası: masa başına bir MasaDO (idFromName("masa:<yerlesim>:<han>:<no>")); para tutmaz. */
  MASA: DurableObjectNamespace;
  /** Tek örnek YonetimDO (idFromName("yonetim")): roller, işlem kaydı, parametreler, şikayet, yaptırım. */
  YONETIM: DurableObjectNamespace;
  /** Kurucu e-postaları, virgülle ayrılmış (sır olarak konur). Boşsa hiç kimse kurucu değildir. */
  YONETICI_EPOSTALAR?: string;
  /** İsteğe bağlı: yönetici girişinde kabul edilen Google istemci kimlikleri; yoksa GOOGLE_CLIENT_ID. */
  YONETIM_GOOGLE_CLIENT_ID?: string;
  /** Debdebe satışı: "1" açık; başka her değer ya da yoksa kapalı (varsayılan). */
  DEBDEBE_ACIK?: string;
  /** "1": mağaza test (sandbox/lisans testçisi) satın almaları kabul edilir. Üretimde konmaz. */
  DEBDEBE_TEST_MAKBUZ?: string;
}

/** Dünya DO'suna profil kaydı isteği (HesapDO gönderir). */
export interface KayitIstegi {
  hesapId: string;
  ad: string;
  cinsiyet: Cinsiyet;
  yerlesim?: string;
  davet?: string;
}

// --- Worker → DO iç iletileri (dışarıya açık değildir) ---
export type HesapIleti =
  | { islem: "giris"; hesapId: string; sub: string }
  | { islem: "profil"; hesapId: string }
  | { islem: "profilOlustur"; hesapId: string; govde: unknown }
  | { islem: "davetOlustur"; hesapId: string }
  | { islem: "davetCoz"; hesapId: string; kod: string }
  | { islem: "yerlesim"; hesapId: string; dil?: string | null }
  | { islem: "olaylar"; hesapId: string; imlec?: string | null; dil?: string | null }
  | { islem: "kisi"; hesapId: string; kisi: string; dil?: string | null }
  | { islem: GovdeliIslem; hesapId: string; govde: unknown }
  | { islem: "lonca"; hesapId: string; dil?: string | null }
  | { islem: "siparisler"; hesapId: string; dil?: string | null }
  | { islem: "beceri"; hesapId: string; meslek?: string | null }
  | { islem: "oyuncu"; hesapId: string; oyuncu: string; dil?: string | null }
  | { islem: "gelen"; hesapId: string; dil?: string | null }
  | { islem: "duzenOku"; hesapId: string }
  | { islem: "ucgenOku"; hesapId: string; npc?: string | null; hedef?: string | null; dil?: string | null }
  | HanedanIletisi
  | EkonomiIletisi
  | BarinmaIletisi
  | { islem: "sikayet"; hesapId: string; govde: unknown }
  | { islem: "duyurular"; hesapId: string }
  // Han masası (Faz 10): src/han/hesap-kopru.ts
  | { islem: "han"; hesapId: string; dil?: string | null }
  | { islem: "masaBilet"; hesapId: string; masa: string }
  | { islem: "hanEylem" | "hanIkram"; hesapId: string; govde: unknown }
  // Debdebe (src/debdebe/hesap.ts)
  | { islem: "debdebe" | "debdebeLevha" | "debdebeSezon"; hesapId: string }
  | { islem: "debdebeDene"; hesapId: string; urun: string | null; dil?: string | null }
  | { islem: "debdebeKisi"; hesapId: string; kisi: string }
  | { islem: DebdebeIslem; hesapId: string; govde: unknown }
  /** İç: başka HesapDO'dan rozet ekle/sil, görünüş; YonetimDO'dan iade. İstemci ulaşamaz. */
  | { islem: "debdebeRozet"; hesapId: string; rozet: { id: string; u: string; v: string; z: number } }
  | { islem: "debdebeRozetSil"; hesapId: string; id: string }
  | { islem: "debdebeGorunum"; hesapId: string }
  | { islem: "debdebeIade"; hesapId: string; islemKimligi: string }
  /** YonetimDO → HesapDO: hesabın etkin yaptırım özeti (tamamı yazılır; tekrar güvenli). */
  | { islem: "yaptirimYaz"; hesapId: string; durum: HesapYaptirimi };

/** Hesabın etkin yaptırımları; alan yoksa o yaptırım yoktur. `bitis: null` = kalıcı. */
export interface HesapYaptirimi {
  uzaklastirma?: { bitis: number | null };
  susturma?: { bitis: number | null };
}

/** Yönetici kimliği: Worker yönetici belirtecinden çıkarır; rol her istekte YonetimDO'da yeniden çözülür. */
export interface YoneticiKimligi {
  eposta: string;
  sub: string;
  /** Yöneticinin kendi oyuncu hesabının kimliği (hesapKimligi(sub)); kendine fayda yasağı için. */
  hesap: string;
}

export const YONETIM_UCLARI = {
  ben: "GET",
  oyuncu: "GET",
  yaptirim: "POST",
  "yaptirim-kaldir": "POST",
  sikayetler: "GET",
  "sikayet-karar": "POST",
  parametreler: "GET",
  parametre: "POST",
  "parametre-geri": "POST",
  rol: "POST",
  duyuru: "POST",
  kayit: "GET",
  debdebe: "GET",
  "debdebe-iade": "POST",
} as const satisfies Record<string, "GET" | "POST">;
export type YonetimUcu = keyof typeof YONETIM_UCLARI;

export type YonetimIleti =
  | { islem: "giris"; yonetici: YoneticiKimligi }
  | { islem: "yonet"; yonetici: YoneticiKimligi; uc: YonetimUcu; govde?: unknown; sorgu?: Record<string, string | null> }
  /** HesapDO → YonetimDO: oyuncu şikayeti. */
  | { islem: "sikayetEkle"; sikayetci: string; govde: unknown }
  | { islem: "duyurular" }
  /** MasaDO → YonetimDO: masa başının çıkarması (yalnız eklenen kayıt; src/han/y1-kayit.ts). */
  | { islem: "masaAtma"; masa: string; kim: string; hedef: string; olay: number; zaman: number }
  /** HesapDO → YonetimDO: Debdebe işlem kimliğinin sahiplenilmesi (bütün hesaplarda tek; src/yonetim/y3.ts). */
  | { islem: "debdebeKayit"; kayit: { islem: string; magaza: string; urun: string; hesap: string; zaman: number; test?: boolean } };

/** Debdebe gövdeli işlemleri: POST /v1/debdebe/satin-al, /kusan, /armagan, /levha-gorunur. */
export const DEBDEBE_ISLEMLERI = ["debdebeSatinAl", "debdebeKusan", "debdebeArmagan", "debdebeLevhaGorunur"] as const;
export type DebdebeIslem = (typeof DEBDEBE_ISLEMLERI)[number];

/** Gövdeli (istekNo'lu ya da yazan) yerleşim işlemleri: HesapDO aynen YerlesimDO'ya iletir. */
export const GOVDELI_ISLEMLER = [
  "eylem",
  "tanidik",
  "meslek",
  "temelIs",
  "tabanAl",
  "tarif",
  "sat",
  "siparisTeslim",
  // Beceri ağacı v2
  "beceriOgren",
  "beceriIptal",
  "beceriHizlandir",
  "beceriYeniden",
  // Faz 3a: oyuncular arası
  "dostluk",
  "teklif",
  "teklifCevap",
  "husumet",
  "engelle",
  "duzen",
  "yalanla",
  "vitrin",
  // Faz 4 üçgen: kışkırtma, katılım, arabuluculuk, casus
  "ucgen",
  // Faz 10 han masası: ikram ödemesi (HesapDO masa kontrolünden sonra çağırır; istemci doğrudan ulaşamaz)
  "hanIkram",
] as const;
export type GovdeliIslem = (typeof GOVDELI_ISLEMLER)[number];

/** Hanedan (Faz 7) gövdeli işlemleri: POST /v1/vasiyet, /v1/devir, /v1/evlilik. */
export const HANEDAN_ISLEMLERI = ["vasiyet", "devir", "evlilik"] as const;
export type HanedanIslem = (typeof HANEDAN_ISLEMLERI)[number];
/** Hanedan iletileri (HesapDO aynen YerlesimDO'ya iletir; `yerlesim` eklenir). */
export type HanedanIletisi =
  | { islem: HanedanIslem; hesapId: string; govde: unknown }
  | { islem: "hanedan"; hesapId: string; dil?: string | null }
  | { islem: "devirOnizle"; hesapId: string; varis?: string | null; dil?: string | null }
  | { islem: "kronik"; hesapId: string; imlec?: string | null; dil?: string | null };

/** Ekonomi (Faz 6) gövdeli işlemleri: POST /v1/pazar/ilan, /v1/pazar/islem, /v1/pazar/geri, /v1/ismarlama,
 * /v1/ismarlama/cevap. */
export const EKONOMI_ISLEMLERI = ["pazarIlan", "pazarIslem", "pazarGeri", "ismarla", "ismarlamaCevap"] as const;
export type EkonomiIslem = (typeof EKONOMI_ISLEMLERI)[number];
/** Ekonomi iletileri (HesapDO aynen YerlesimDO'ya iletir; `yerlesim` eklenir). */
export type EkonomiIletisi =
  | { islem: EkonomiIslem; hesapId: string; govde: unknown }
  | { islem: "pazar"; hesapId: string; mal?: string | null; dil?: string | null }
  | { islem: "ismarlamalar"; hesapId: string; dil?: string | null }
  | { islem: "levha"; hesapId: string; mal?: string | null }
  | { islem: "defter"; hesapId: string; ay?: string | null };
/** Barınma (Faz 14) gövdeli işlemleri: POST /v1/barinma/kira, /v1/barinma/tesis, /v1/barinma/otomatik. */
export const BARINMA_ISLEMLERI = ["barinmaKira", "barinmaTesis", "barinmaOtomatik"] as const;
export type BarinmaIslem = (typeof BARINMA_ISLEMLERI)[number];
/** Barınma iletileri (HesapDO aynen YerlesimDO'ya iletir; `yerlesim` eklenir). */
export type BarinmaIletisi =
  | { islem: BarinmaIslem; hesapId: string; govde: unknown }
  | { islem: "barinma" | "donus"; hesapId: string; dil?: string | null };

/** Yerleşime sakin kaydı (profil oluşunca HesapDO gönderir; tekrar güvenli). */
export interface SakinKaydi {
  hesapId: string;
  ad: string;
  cinsiyet: Cinsiyet;
  dogumAyi: number;
}

/** HesapDO → YerlesimDO. `yerlesim` profildeki işaretçidir (DO adını bilmez). */
export type YerlesimIleti =
  | { islem: "sakinEkle"; yerlesim: string; sakin: SakinKaydi }
  | { islem: "durum"; yerlesim: string; hesapId: string; dil?: string | null }
  | { islem: "olaylar"; yerlesim: string; hesapId: string; imlec?: string | null; dil?: string | null }
  | { islem: "kisi"; yerlesim: string; hesapId: string; kisi: string; dil?: string | null }
  | { islem: GovdeliIslem; yerlesim: string; hesapId: string; govde: unknown }
  | { islem: "lonca"; yerlesim: string; hesapId: string; dil?: string | null }
  | { islem: "siparisler"; yerlesim: string; hesapId: string; dil?: string | null }
  | { islem: "beceri"; yerlesim: string; hesapId: string; meslek?: string | null }
  | { islem: "oyuncu"; yerlesim: string; hesapId: string; oyuncu: string; dil?: string | null }
  | { islem: "gelen"; yerlesim: string; hesapId: string; dil?: string | null }
  | { islem: "duzenOku"; yerlesim: string; hesapId: string }
  /** Şikayet hedefi: yerel oyuncu kimliği (`o12`) → hesap kimliği (aynı yerleşimin sakini). */
  | { islem: "sakinHesabi"; yerlesim: string; hesapId: string; hedef: string }
  | { islem: "ucgenOku"; yerlesim: string; hesapId: string; npc?: string | null; hedef?: string | null; dil?: string | null }
  /** Han masası bileti için: oyuncunun iki yönlü engel listesi (hesap kimlikleri). */
  | { islem: "engeller"; yerlesim: string; hesapId: string }
  | (HanedanIletisi & { yerlesim: string })
  | (EkonomiIletisi & { yerlesim: string })
  | (BarinmaIletisi & { yerlesim: string })
  /** Debdebe armağanı teveccühü ve iadede geri alınması (HesapDO gönderir; istemci ulaşamaz). */
  | { islem: "armaganTeveccuh" | "armaganGeri"; yerlesim: string; hesapId: string; govde: unknown };

export type DunyaIleti =
  | { islem: "ozet" }
  | { islem: "kayit"; istek: KayitIstegi }
  | { islem: "davetOlustur"; hesapId: string }
  | { islem: "davetCoz"; kod: string }
  /** YonetimDO → DunyaDO: ada ya da hesap kimliğine göre kayıtlı profil. */
  | { islem: "oyuncuBul"; ad?: string; hesap?: string }
  /** Cömertler Levhası (src/debdebe/levha.ts). */
  | { islem: "levhaYaz"; yazim: { beylik: string; hesap: string; ad: string; puan: number; seviye: string | null; gorunur: boolean } }
  | { islem: "levhaOku"; beylik: string };
