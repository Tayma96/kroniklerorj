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
  yapilandirma_eksik: 500,
  sunucu_hatasi: 500,
} as const satisfies Record<string, number>;

export type HataKodu = keyof typeof HATA_DURUMU;

export type Basarili<T> = { ok: true; deger: T };
export type Basarisiz = { ok: false; hata: HataKodu };
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
  /** Virgülle ayrılmış Google OAuth istemci kimlikleri ([vars]). */
  GOOGLE_CLIENT_ID?: string;
  /** Worker sırrı; en az 32 karakter. */
  OTURUM_ANAHTARI?: string;
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
  | { islem: "davetCoz"; hesapId: string; kod: string };

export type DunyaIleti =
  | { islem: "ozet" }
  | { islem: "kayit"; istek: KayitIstegi }
  | { islem: "davetOlustur"; hesapId: string }
  | { islem: "davetCoz"; kod: string };
