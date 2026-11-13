// Kronikler Online istemci ayarları.

/**
 * Yeni çevrimiçi akışın (/online) geliştirici kapısı. Kapalıyken /online rotaları "Yakında" gösterir; açıkken
 * geliştirici oturumu sahte veriyle sunucusuz denenebilir. Ana menüdeki "beta"/"yakında" etiketi de bu kapıya bakar.
 */
export const ONLINE_GELISTIRME = process.env.EXPO_PUBLIC_ONLINE_GELISTIRME === "1";

/** Davet kodlu Google'sız test girişi; yalnız test APK derlemesinde açılır. */
export const ONLINE_TEST_GIRIS = process.env.EXPO_PUBLIC_ONLINE_TEST_GIRIS === "1";

/**
 * online-server Worker adresi (örn. "https://kronikler-online.<hesap>.workers.dev"). Berkay ilk dağıtımdan sonra
 * doldurur. Boşken istemci hiçbir isteği göndermez, "sunucu_yok" hatası döner; arayüz dostça bir not gösterir.
 */
export const ONLINE_SUNUCU_URL = process.env.EXPO_PUBLIC_ONLINE_SUNUCU_URL ?? "";

/** Tek bir HTTP isteğinin zaman aşımı. */
export const ZAMAN_ASIMI_MS = 10_000;
/** Yeniden denenebilir isteklerde toplam deneme sayısı (ilk istek dahil). */
export const DENEME_SAYISI = 3;

/** Sondaki eğik çizgiyi atar; boşsa undefined. */
export function sunucuAdresi(ham: string = ONLINE_SUNUCU_URL): string | undefined {
  const adres = ham.trim().replace(/\/+$/, "");
  return adres ? adres : undefined;
}
