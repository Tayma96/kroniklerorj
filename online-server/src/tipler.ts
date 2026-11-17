// Sunucu ile istemci arasındaki ortak biçimler ve hata kodları.
// mobile/lib/online/protokol.ts (Faz 1b) bu biçimlerin aynısını taşır. Hata metni istemcide çevrilir.

import type { YerlesimTuru } from "./dunya-veri.ts";
import type { Mevsim } from "./saat.ts";
import type { CikisKaydi } from "./mulk/transfer.ts";
import type { MulkAlt } from "./mulk/yerlesim-mulk.ts";
import type { SesAlt } from "./han/tipler.ts";

/** Mülk uçları (Faz 12–13; src/mulk/yerlesim-mulk.ts). */
export type MulkIletisiH = { islem: "mulk"; hesapId: string; alt: MulkAlt; isletme?: string | null; govde?: unknown; dil?: string | null };

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
  /** Yönetim: kurucunun bugünkü akçe telafisi tavanı (TELAFI_GUNLUK_AKCE) doldu. */
  telafi_gunluk_siniri: 429,
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
  // Künye (oyuncu numarası, arama, sayfa): src/kunye/
  numara_gecersiz: 400,
  arama_kisa: 400,
  arama_siniri: 429,
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
  /** Kül Yemini mührü: henüz emanet edilmedi / zaten kabul edildi. */
  muhur_yok: 409,
  muhur_alindi: 409,
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
  arabulucu_tarafsiz_degil: 409,
  tavan_doldu: 409,
  hediye_dongu: 409,
  aralik_dolu: 409,
  istek_yok: 404,
  /** istekNo tekrarsızlık penceresinde (24 sa) zaten işlendi; yanıtı artık saklı değil. */
  istek_tekrar: 409,
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
  /** H6: meydan okuma teklifi düştü (taraflardan biri kalktı ya da masadan çıktı). */
  teklif_dustu: 409,
  olay_yok: 404,
  atildi: 403,
  eylem_siniri: 429,
  ikram_gecersiz: 400,
  /** H7: masada ziyafet veren dışında hesap kümesi dışından yeterli oturan yok. */
  ziyafet_konuk_az: 409,
  yukseltme_gerekli: 426,
  // Faz 16 sesli sohbet
  ses_kapali: 503,
  ses_hatasi: 502,
  masa_sessiz: 409,
  // H2 masa ayarı
  masa_kilitli: 409,
  /** H9: özel masada oturmak için masa başının daveti gerekir. */
  davet_gerekli: 403,
  masada_degil: 409,
  ses_oturumu_yok: 409,
  sesi_kesildi: 403,
  soz_istegi_yok: 404,
  // H8 ozan sahnesi ve atışma
  sahne_acik: 409,
  sahne_yok: 404,
  sahne_yasak: 403,
  soz_verilmedi: 403,
  masa_mesgul: 409,
  atisma_yok: 404,
  atisma_suruyor: 409,
  sira_degil: 409,
  oylama_kapali: 409,
  oy_verildi: 409,
  kuyruk_dolu: 503,
  parametre_gecersiz: 400,
  deger_sinir_disi: 400,
  geri_yok: 409,
  rol_gecersiz: 400,
  eposta_gecersiz: 400,
  kurucu_degismez: 409,
  duyuru_gecersiz: 400,
  // Canlı etkinlikler (src/etkinlik/)
  etkinlik_gecersiz: 400,
  etkinlik_yok: 404,
  etkinlik_siniri: 409,
  etkinlik_suruyor: 409,
  etkinlik_katildin: 409,
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
  // Odanın getirdikleri (H12): src/yerlesim/oda-getiri.ts
  sandik_yok: 409,
  sandik_dolu: 409,
  ozel_oda_yok: 409,
  gorusme_yok: 409,
  gorusme_dolu: 409,
  gorusme_siniri: 429,
  sart_gecersiz: 400,
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
  // Mülkiyet ve işletme (Faz 12–13)
  isletme_yok: 404,
  isletme_kapali: 409,
  mulk_tur_gecersiz: 400,
  mulk_dolu: 409,
  mulk_siniri: 409,
  // 4.9 Çoklu han: geçersiz han numarası, sahipsiz arsa (han yok), aynı yerleşimde ikinci han.
  han_gecersiz: 400,
  han_yok: 404,
  han_siniri: 409,
  edinim_sarti: 409,
  ad_jetonu_yok: 409,
  tezyin_gecersiz: 400,
  tezyin_var: 409,
  tezyin_siniri: 409,
  tutar_gecersiz: 400,
  kasa_yetersiz: 409,
  cekim_tavani: 409,
  emanet_yetersiz: 409,
  transfer_bekliyor: 503,
  carpan_gecersiz: 400,
  yetki_gecersiz: 400,
  maas_gecersiz: 400,
  maas_kesinti: 409,
  personel_dolu: 409,
  zaten_calisan: 409,
  teklif_var: 409,
  vekil_var: 409,
  sozlesme_yok: 404,
  han_dolu: 409,
  // Tezgâh modeli (Dilim 1)
  tezgah_yok: 409,
  kepenk_kendiliginden: 409,
  depo_dolu: 409,
  raf_dolu: 409,
  raf_satir_dolu: 409,
  satir_yok: 404,
  fiyat_bant_disi: 400,
  fiyat_degisti: 409,
  devralma_kosulu: 409,
  depo_cekim_tavani: 409,
  vekil_han_sahibi: 409,
  kalite_gecersiz: 400,
  adet_gecersiz: 400,
  fiyat_gecersiz: 400,
  // Tezgâh modeli (Dilim 2: atölye)
  zanaat_yok: 409,
  zanaat_disi: 409,
  emir_acik: 409,
  tezgah_dolu: 409,
  emir_yok: 404,
  kez_gecersiz: 400,
  usta_yok: 409,
  havuz_dolu: 409,
  emek_gecersiz: 400,
  genisletme_yok: 409,
  malzeme_yok: 409,
  ust_uste: 409,
  maas_npc_taban: 400,
  // Topluluk (E5–E7)
  mesrep_gecersiz: 400,
  mesrep_erken: 409,
  mesrep_kilitli: 409,
  hami_gecersiz: 400,
  hami_uygun_degil: 409,
  hami_var: 409,
  hami_dolu: 409,
  bag_yok: 404,
  dert_yok: 404,
  dert_kapandi: 409,
  katki_gecersiz: 400,
  katki_siniri: 429,
  senlik_yok: 409,
  zaviye_gecersiz: 400,
  zaviye_yok: 404,
  zaviye_var: 409,
  zaviye_dolu: 409,
  zaviye_kuruluyor: 409,
  kidem_yetersiz: 409,
  aday_uygun_degil: 409,
  // Siyaset (Faz 7 + Ek B P1–P4)
  bolge_gecersiz: 400,
  makam_yok: 404,
  makam_kapali: 409,
  secim_kapali: 409,
  zaten_aday: 409,
  kume_cakisma: 409,
  ardisik_donem: 409,
  oy_hakki_yok: 403,
  sinir_asildi: 409,
  vekil_gecersiz: 400,
  itiraz_yok: 404,
  itiraz_kapali: 409,
  ozerklik_var: 409,
  darbe_var: 409,
  darbe_yok: 409,
  darbe_esik_eksik: 409,
  darbe_kapali: 409,
  darbe_soguma: 409,
  devlet_yok: 404,
  devlet_kapali: 409,
  devlet_talep_var: 409,
  ozerklik_yok: 409,
  soguma: 409,
  // Göç (D1, ONLINE_DURUM §4.5)
  goc_ayni_yer: 400,
  goc_yas: 403,
  goc_soguma: 409,
  goc_aile: 409,
  goc_mulk: 409,
  goc_makam: 409,
  goc_darbe: 409,
  goc_borc: 409,
  goc_sozlesme: 409,
  goc_acik_is: 409,
  goc_suruyor: 409,
  /** Eski yerleşimde geri alınacak emanet yok. */
  emanet_yok: 404,
  goc_hedef_kayitli: 409,
  // Kervan (D2): src/yerlesim/kervan.ts
  kervan_ayni_yer: 400,
  kervan_yuk_gecersiz: 400,
  kervan_yuk_siniri: 409,
  kervan_bedel_yok: 409,
  kervan_aylik_siniri: 409,
  kervan_mal_hedef: 409,
  kervan_ulasilamadi: 503,
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
  /** Davet kodlu anonim test girişi; yalnız ayrılmış test Worker'ında "1" yapılır. */
  TEST_GIRIS_ACIK?: string;
  /** Yalnız test Worker'ında kullanılan en az 32 karakterlik davet sırrı. */
  TEST_GIRIS_KODU?: string;
  /** Han masası: masa başına bir MasaDO (idFromName("masa:<yerlesim>:<han>:<no>")); para tutmaz. */
  MASA: DurableObjectNamespace;
  /** Tek örnek YonetimDO (idFromName("yonetim")): roller, işlem kaydı, parametreler, şikayet, yaptırım. */
  YONETIM: DurableObjectNamespace;
  /** Faz 12: işletme başına IsletmeDO (idFromName("isletme:<yerleşim>.<tür>.<no>")); kasa ve muhasebenin tek yazıcısı. */
  ISLETME?: DurableObjectNamespace;
  /** Kurucu e-postaları, virgülle ayrılmış (sır olarak konur). Boşsa hiç kimse kurucu değildir. */
  YONETICI_EPOSTALAR?: string;
  /** İsteğe bağlı: yönetici girişinde kabul edilen Google istemci kimlikleri; yoksa GOOGLE_CLIENT_ID. */
  YONETIM_GOOGLE_CLIENT_ID?: string;
  /** Debdebe satışı: "1" açık; başka her değer ya da yoksa kapalı (varsayılan). */
  DEBDEBE_ACIK?: string;
  /** "1": mağaza test (sandbox/lisans testçisi) satın almaları kabul edilir. Üretimde konmaz. */
  DEBDEBE_TEST_MAKBUZ?: string;
  /** Siyaset: bölge başına BolgeDO (idFromName("bolge:<id>")) ve tek SultanlikDO (idFromName("sultanlik")). */
  BOLGE: DurableObjectNamespace;
  SULTANLIK: DurableObjectNamespace;
  /** Faz 16 sesli sohbet: Cloudflare Realtime uygulama kimliği ([vars]). Boşsa ses kapalı (`ses_kapali`). */
  REALTIME_APP_ID?: string;
  /** Realtime uygulama anahtarı (sır: `wrangler secret put REALTIME_APP_TOKEN`). İstemciye hiç gitmez. */
  REALTIME_APP_TOKEN?: string;
  /** İsteğe bağlı TURN anahtarı (kısıtlı ağlar); yoksa STUN kullanılır. */
  REALTIME_TURN_ID?: string;
  REALTIME_TURN_TOKEN?: string;
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
export type HesapIleti = (
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
  | ToplulukIletisi
  | BarinmaIletisi
  /** `masa`: yalnız MasaDO'nun `rapor` yolu koyar (H4); istemci yolu taşımaz. */
  | { islem: "sikayet"; hesapId: string; govde: unknown; masa?: { ad: string; no: number } }
  | { islem: "duyurular"; hesapId: string }
  // Künye (src/kunye/hesap.ts): kendi numaran, oyuncu araması, oyuncu sayfası
  | { islem: "numara"; hesapId: string }
  | { islem: "oyuncuAra"; hesapId: string; no?: string | null; ad?: string | null; imlec?: string | null }
  | { islem: "kunye"; hesapId: string; numara: string; dil?: string | null }
  // Han masası (Faz 10): src/han/hesap-kopru.ts
  // 4.9 Çoklu han: `han` seçili han numarası (sorgudan; yoksa 1. han). Gövdeli uçlarda `han` gövdededir.
  | { islem: "han"; hesapId: string; dil?: string | null; han?: string | null }
  | { islem: "masaBilet"; hesapId: string; masa: string; han?: string | null }
  | { islem: "hanEylem" | "hanIkram" | "hanZiyafet"; hesapId: string; govde: unknown }
  // H10 han ilan panosu
  | { islem: "hanPano"; hesapId: string; han?: string | null }
  | { islem: "hanPanoYaz" | "hanPanoSil"; hesapId: string; govde: unknown }
  | { islem: "hanSes"; hesapId: string; masa: string; alt: SesAlt; govde: unknown; han?: string | null }
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
  /** Mülk ve işletme (Faz 12–13): aynen yerleşime gider. */
  | MulkIletisiH
  // Siyaset (Faz 7 + Ek B P1–P4): src/siyaset/hesap-kopru.ts
  | { islem: "siyaset"; hesapId: string; bolge?: string | null; kayitSayfa?: string | null }
  | { islem: "siyasetYaz"; hesapId: string; govde: unknown }
  /** YonetimDO → HesapDO: hesabın etkin yaptırım özeti (tamamı yazılır; tekrar güvenli). */
  | { islem: "yaptirimYaz"; hesapId: string; durum: HesapYaptirimi }
  /** POST /v1/oturumlar/kapat: hesabın oturum sürümünü artırır (bütün belirteçler düşer). */
  | { islem: "oturumlariKapat"; hesapId: string }
  /** Göç (D1): POST /v1/goc {hedef, istekNo} ve önizleme GET /v1/goc?hedef= (src/goc-hesap.ts). */
  | { islem: "goc"; hesapId: string; govde: unknown }
  | { islem: "gocOnizle"; hesapId: string; hedef: string | null }
  | { islem: "gocEmanetOnizle"; hesapId: string }
  | { islem: "gocEmanet"; hesapId: string; govde: unknown }
  /** Kervan (D2): önizleme GET /v1/kervan?hedef=&mallar=, POST /v1/kervan, POST /v1/kervan/haber (src/yerlesim/kervan-uclar.ts). */
  | KervanIstemciIletisi
) & {
  /** Worker → HesapDO: oyuncu belirtecindeki oturum sürümü (sürümsüz belirteç 0). İç iletilerde yoktur. */
  oturumSurumu?: number;
};

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
  ekonomi: "GET",
  telafiler: "GET",
  telafi: "POST",
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
  etkinlikler: "GET",
  "etkinlik-baslat": "POST",
  "etkinlik-durdur": "POST",
} as const satisfies Record<string, "GET" | "POST">;
export type YonetimUcu = keyof typeof YONETIM_UCLARI;

export type YonetimIleti =
  | { islem: "parametrelerCalisma"; yerlesim?: string }
  | { islem: "giris"; yonetici: YoneticiKimligi }
  | { islem: "yonet"; yonetici: YoneticiKimligi; uc: YonetimUcu; govde?: unknown; sorgu?: Record<string, string | null> }
  /** HesapDO → YonetimDO: oyuncu şikayeti. */
  | { islem: "sikayetEkle"; sikayetci: string; govde: unknown; masa?: { ad: string; no: number }; ilan?: { id: string; metin: string } }
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
  "oyuncuArabuluculuk",
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

/** Topluluk (E5–E7) gövdeli işlemleri: POST /v1/mesrep, /v1/hami, /v1/ortak-dert, /v1/senlik, /v1/zaviye. */
export const TOPLULUK_ISLEMLERI = ["mesrep", "hami", "ortakDert", "senlik", "zaviye", "etkinlik"] as const;
export type ToplulukIslem = (typeof TOPLULUK_ISLEMLERI)[number];
/** Topluluk iletileri (HesapDO aynen YerlesimDO'ya iletir; `yerlesim` eklenir). */
export type ToplulukIletisi = { islem: ToplulukIslem; hesapId: string; govde: unknown } | { islem: "topluluk"; hesapId: string; dil?: string | null };

/** Ekonomi (Faz 6) gövdeli işlemleri: POST /v1/pazar/ilan, /v1/pazar/islem, /v1/pazar/geri, /v1/ismarlama,
 * /v1/ismarlama/cevap. */
export const EKONOMI_ISLEMLERI = ["pazarIlan", "pazarIslem", "pazarGeri", "ismarla", "ismarlamaCevap", "hizmetHazirla", "hizmetIlan", "hizmetIslem", "hizmetGeri", "hizmetTalepTeslim", "hizmetGorev"] as const;
export type EkonomiIslem = (typeof EKONOMI_ISLEMLERI)[number];
/** Ekonomi iletileri (HesapDO aynen YerlesimDO'ya iletir; `yerlesim` eklenir). */
export type EkonomiIletisi =
  | { islem: EkonomiIslem; hesapId: string; govde: unknown }
  | { islem: "pazar"; hesapId: string; mal?: string | null; dil?: string | null }
  | { islem: "hizmet"; hesapId: string; dil?: string | null }
  | { islem: "ismarlamalar"; hesapId: string; dil?: string | null }
  | { islem: "levha"; hesapId: string; mal?: string | null }
  | { islem: "defter"; hesapId: string; ay?: string | null };
/** Barınma (Faz 14) gövdeli işlemleri: POST /v1/barinma/kira, tesis, otomatik; H12 sandik, emanet, gorusme. */
export const BARINMA_ISLEMLERI = ["barinmaKira", "barinmaTesis", "barinmaOtomatik", "barinmaSandik", "barinmaEmanet", "barinmaGorusme"] as const;
export type BarinmaIslem = (typeof BARINMA_ISLEMLERI)[number];
/** Barınma iletileri (HesapDO aynen YerlesimDO'ya iletir; `yerlesim` eklenir). */
export type BarinmaIletisi =
  | { islem: BarinmaIslem; hesapId: string; govde: unknown }
  | { islem: "barinma" | "donus"; hesapId: string; dil?: string | null; han?: string | null };

/** Yerleşime sakin kaydı (profil oluşunca HesapDO gönderir; tekrar güvenli). */
export interface SakinKaydi {
  hesapId: string;
  ad: string;
  cinsiyet: Cinsiyet;
  dogumAyi: number;
}

/** Kervan istemci iletileri (HesapDO aynen YerlesimDO'ya iletir; `yerlesim` eklenir). */
export type KervanIstemciIletisi =
  | { islem: "kervan"; hesapId: string; hedef: string | null; mallar: string | null }
  | { islem: "kervanGonder" | "kervanHaber"; hesapId: string; govde: unknown };

/** HesapDO → YerlesimDO. `yerlesim` profildeki işaretçidir (DO adını bilmez). */
export type YerlesimIleti =
  | { islem: "ekonomiSagligi"; yerlesim: string }
  | { islem: "yonetimTelafi"; yerlesim: string; hesapId: string; govde: unknown }
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
  /** Künye: hesabın güncel karakterinin herkese açık alanları (`hesapId` sayfası istenen hesap; src/kunye/gorunum.ts). */
  | { islem: "kunye"; yerlesim: string; hesapId: string; dil?: string | null }
  | { islem: "ucgenOku"; yerlesim: string; hesapId: string; npc?: string | null; hedef?: string | null; dil?: string | null }
  /** Han masası bileti için: oyuncunun iki yönlü engel listesi (hesap kimlikleri). */
  | { islem: "engeller"; yerlesim: string; hesapId: string; han?: unknown }
  /** 4.9: yerleşimin açık hanları (kart: sahip, seviye, fc, oda doluluğu, müdavim rozetim, masa özeti kayıttan). */
  | { islem: "hanlar"; yerlesim: string; hesapId: string }
  /** 4.9: MasaDO/HesapDO → YerlesimDO masa doluluk bildirimi (mutlak değer; govde {kayitlar}); istemci ulaşamaz. */
  | { islem: "masaDoluluk"; yerlesim: string; hesapId: string; govde: unknown }
  /** H1: han keşif sırası için oyuncunun dostları ve hane üyeleri (hesap kimlikleri). */
  | { islem: "hanTanidiklar"; yerlesim: string; hesapId: string }
  /** H7: HesapDO → YerlesimDO ziyafet ödemesi ve etkisi (masa kontrolünden sonra; istekNo ile tekrar güvenli). */
  | { islem: "hanZiyafet"; yerlesim: string; hesapId: string; govde: unknown }
  /** H10: ilan panosu (oku/yaz/sil; yazma ve silme istekNo ile tekrar güvenli). */
  | { islem: "hanPano"; yerlesim: string; hesapId: string; alt: "oku" | "yaz" | "sil"; govde?: unknown; han?: unknown }
  /** H10 şikâyet: ilan kimliği → sahibinin hesap kimliği ve metni (yalnız sakin sorar). */
  | { islem: "hanPanoIlan"; yerlesim: string; hesapId: string; ilan: string }
  /** H5: HesapDO → YerlesimDO masa olayı (tekrar güvenli; govde {anahtar, olay}); istemci ulaşamaz. */
  | { islem: "hanOlayi"; yerlesim: string; hesapId: string; govde: unknown }
  | (MulkIletisiH & { yerlesim: string })
  /** IsletmeDO → YerlesimDO: işletmenin çıkış kutusu (kasa → cüzdan, yansı, iflas); işlem kimliğiyle bir kez uygulanır. */
  | { islem: "mulkGiris"; yerlesim: string; hesapId: string; kayitlar: CikisKaydi[] }
  /** Siyaset (Faz 7/P1): HesapDO → YerlesimDO, doğrulanmış siyasi kimlik (src/siyaset/hesap-kopru.ts). */
  | { islem: "siyasetKimlik"; yerlesim: string; hesapId: string }
  /** Darbe ganimeti (BolgeDO → YerlesimDO; istemci ulaşamaz): kaybedenin akçe kesintisi ve kazananın payı. */
  | { islem: "ganimetKes" | "ganimetPay"; yerlesim: string; hesapId: string; govde: unknown }
  | (HanedanIletisi & { yerlesim: string })
  | (EkonomiIletisi & { yerlesim: string })
  | (BarinmaIletisi & { yerlesim: string })
  /** Debdebe armağanı teveccühü ve iadede geri alınması (HesapDO gönderir; istemci ulaşamaz). */
  | { islem: "armaganTeveccuh" | "armaganGeri"; yerlesim: string; hesapId: string; govde: unknown }
  | (ToplulukIletisi & { yerlesim: string })
  /** HesapDO → YerlesimDO (masa bileti sonrası): müdavim han ziyareti; istemci doğrudan ulaşamaz. */
  | { islem: "mudavimZiyaret"; yerlesim: string; hesapId: string; han?: unknown }
  /** Göç (D1; HesapDO yürütür, istemci ulaşamaz): önizleme; (1) çıkış, (2) giriş, (3) tamam; (2) kalıcı reddinde iptal. */
  | { islem: "gocOnizle"; yerlesim: string; hesapId: string; hedef: string }
  | { islem: "gocCikis" | "gocGiris" | "gocTamam" | "gocIptal"; yerlesim: string; hesapId: string; govde: unknown }
  /** Göç emaneti geri alma (HesapDO yürütür; işlem kimliğiyle tekrar güvenli; istemci ulaşamaz). */
  | { islem: "emanetOnizle"; yerlesim: string; hesapId: string }
  | { islem: "emanetCikis" | "emanetGiris" | "emanetTamam" | "emanetIptal"; yerlesim: string; hesapId: string; govde: unknown }
  | (KervanIstemciIletisi & { yerlesim: string })
  /** Kervan (D2; YerlesimDO → YerlesimDO, istemci ulaşamaz): varış (işlem kimliğiyle bir kez) ve salt okuma fiyat özeti. */
  | { islem: "kervanVaris"; yerlesim: string; islemNo: string; kaynak: string; yuk: unknown }
  | { islem: "fiyatOzeti"; yerlesim: string; hesap?: string; yuk?: unknown; va?: number }
  | (BarinmaIletisi & { yerlesim: string });

export type DunyaIleti =
  | { islem: "ozet" }
  | { islem: "kayit"; istek: KayitIstegi }
  | { islem: "davetOlustur"; hesapId: string }
  | { islem: "davetCoz"; kod: string }
  /** YonetimDO → DunyaDO: ada ya da hesap kimliğine göre kayıtlı profil. */
  | { islem: "oyuncuBul"; ad?: string; hesap?: string }
  /** Künye (HesapDO → DunyaDO; src/kunye/numara.ts): numara üret/oku, numarayla bul, ad dizinini tazele, ad öneki ara. */
  | { islem: "numaraAl"; hesapId: string }
  | { islem: "numaraBul"; numara: string }
  | { islem: "numaraAdTazele"; hesapId: string; ad: string }
  | { islem: "adAra"; onek: string; imlec: string | null }
  /** Cömertler Levhası (src/debdebe/levha.ts). */
  | { islem: "levhaYaz"; yazim: { beylik: string; hesap: string; ad: string; puan: number; seviye: string | null; gorunur: boolean } }
  | { islem: "levhaOku"; beylik: string }
  /** Göç (D1): HesapDO → DunyaDO; kayıtlı yerleşimi taşır, nüfus sayaçlarını günceller (hedef doluysa yerlesim_dolu). `geri`: iptalde eski yere dönüş (kapasiteye bakılmaz). */
  | { islem: "gocKayit"; hesapId: string; kaynak: string; hedef: string; geri?: boolean };
