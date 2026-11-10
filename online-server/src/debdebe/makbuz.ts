// Mağaza makbuzu doğrulama sözleşmesi (GDD §19 teknik sözleşme: mağaza ödemesi → sunucuda makbuz doğrulama → varlık
// verme). Bu dosyada gerçek mağaza anahtarı ve ağ çağrısı YOKTUR. Gerçek doğrulayıcılar yayın öncesi bu arayüzü
// uygular:
//
//  - Google Play: istemci `purchaseToken` gönderir (makbuz). Sunucu Google Play Developer API'yi hizmet hesabıyla
//    çağırır: tek seferlik ürünlerde `purchases.products.get(packageName, productId, token)`, Ayan'da
//    `purchases.subscriptionsv2.get(packageName, token)`. `orderId` → islemKimligi, `purchaseState` 0 → "odendi",
//    1 → "iptal", 2 → "beklemede"; abonelikte `lineItems[0].expiryTime` → bitis. Varlık verildikten sonra tüketilebilir
//    ürün `consume`, kalıcı ürün ve abonelik `acknowledge` edilir (3 gün içinde onaylanmayan satın alma iade olur).
//    İadeler Real-time Developer Notifications (Pub/Sub) ya da Voided Purchases API ile gelir → yönetici iadesiyle aynı
//    yol (`debdebeIade`).
//  - App Store: istemci StoreKit 2 imzalı işlemini (JWS `signedTransactionInfo`) gönderir. Sunucu x5c zincirini Apple
//    kök sertifikasına kadar doğrular ya da App Store Server API `GET /inApps/v1/transactions/{transactionId}`
//    çağırır (ES256 JWT, In-App Purchase anahtarı). `transactionId` → islemKimligi, `productId` → urunKimligi,
//    `revocationDate` varsa "iade", abonelikte `expiresDate` → bitis. İadeler App Store Server Notifications V2
//    (`REFUND`) ile gelir.
//
// Doğrulayıcı mağazanın kendi işlem kimliğini döndürür; aynı işlem kimliği bütün hesaplarda bir kez varlık verir
// (YonetimDO defteri). Test için sahte doğrulayıcı `test/debdebe-yardimci.ts`'dedir; üretimde kullanılamaz.

import { hata, type Sonuc } from "../tipler.ts";

export const MAGAZALAR = ["google", "apple"] as const;
export type Magaza = (typeof MAGAZALAR)[number];

export type MakbuzDurumu = "odendi" | "beklemede" | "iade" | "iptal";

export interface MakbuzBilgisi {
  magaza: Magaza;
  /** Mağazanın işlem kimliği (Google `orderId`, Apple `transactionId`); bütün hesaplarda tektir. */
  islemKimligi: string;
  /** Mağaza ürün kimliği (`magazaUrunKimligi`). */
  urunKimligi: string;
  durum: MakbuzDurumu;
  /** Satın alma anı (ms). */
  zaman: number;
  /** Abonelik bitişi (ms; yalnız Ayan). */
  bitis?: number;
  /** Mağazanın test (sandbox / lisans testçisi) satın alması. */
  test?: boolean;
}

export interface MakbuzDogrulayici {
  /**
   * Makbuzu mağazada doğrular. Ağ ya da yapılandırma hatası `Basarisiz` döner (varlık verilmez, istemci aynı
   * istekNo ile yeniden dener).
   */
  dogrula(magaza: Magaza, makbuz: string, beklenenUrun: string): Promise<Sonuc<MakbuzBilgisi>>;
  /** Varlık verildikten sonra: tüketilebilir ürünü tüket (Google `consume`), ötekini onayla (`acknowledge`). */
  onayla?(magaza: Magaza, makbuz: string, urunKimligi: string, tuketilebilir: boolean): Promise<void>;
}

/** [PARAMETRE] Makbuz metninin en uzun boyu (Apple JWS birkaç KB olabilir). */
export const MAKBUZ_EN_UZUN = 8000;

export function magazaCoz(ham: unknown): Magaza | undefined {
  return typeof ham === "string" && (MAGAZALAR as readonly string[]).includes(ham) ? (ham as Magaza) : undefined;
}

/** Varsayılan: mağaza bağlantısı yapılandırılmamıştır (anahtarlar Berkay'ın mağaza ayarlarıyla gelir). */
export const yapilandirilmamisDogrulayici: MakbuzDogrulayici = {
  async dogrula() {
    return hata("magaza_yapilandirilmamis");
  },
};

/**
 * Doğrulama sonucunun beklenene uyup uymadığı (saf): ürün tutmalı, ödenmiş olmalı, işlem kimliği biçimli olmalı.
 * Test satın alması yalnız `testKabul` açıkken geçer (üretimde kapalı).
 */
export function makbuzDenetle(b: MakbuzBilgisi, magaza: Magaza, beklenenUrun: string, testKabul: boolean): Sonuc<MakbuzBilgisi> {
  if (b.magaza !== magaza || b.urunKimligi !== beklenenUrun) return hata("makbuz_gecersiz");
  if (typeof b.islemKimligi !== "string" || !/^[A-Za-z0-9._:-]{4,128}$/.test(b.islemKimligi)) return hata("makbuz_gecersiz");
  if (b.test && !testKabul) return hata("makbuz_gecersiz");
  if (b.durum === "beklemede") return hata("odeme_beklemede");
  if (b.durum !== "odendi") return hata("makbuz_iade");
  return { ok: true, deger: b };
}
