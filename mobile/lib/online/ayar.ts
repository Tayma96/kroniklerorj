// Kronikler Online istemci ayarları.

/**
 * Yeni çevrimiçi akışın (/online) geliştirici kapısı. Kapalıyken /online rotaları "Yakında" gösterir; açıkken
 * geliştirici oturumu sahte veriyle sunucusuz denenebilir. Ana menüdeki "beta"/"yakında" etiketi de bu kapıya bakar.
 */
export const ONLINE_GELISTIRME = process.env.EXPO_PUBLIC_ONLINE_GELISTIRME === "1";

/**
 * Sahte verili geliştirici oturumu düğmesi. Rota kapısından (ONLINE_GELISTIRME) ayrıdır: test girişi açık APK'da
 * rotalar açılır ama sahte oturum yalnız bu bayrak (iş akışında online_gelistirme girdisi) ya da __DEV__ ile görünür.
 */
export const ONLINE_SAHTE_OTURUM = process.env.EXPO_PUBLIC_ONLINE_SAHTE_OTURUM === "1";

/** Davet kodlu Google'sız test girişi; yalnız test APK derlemesinde açılır. */
export const ONLINE_TEST_GIRIS = process.env.EXPO_PUBLIC_ONLINE_TEST_GIRIS === "1";

/**
 * online-server Worker adresi (örn. "https://kronikler-online.<hesap>.workers.dev"). Berkay ilk dağıtımdan sonra
 * doldurur. Boşken istemci hiçbir isteği göndermez, "sunucu_yok" hatası döner; arayüz dostça bir not gösterir.
 */
export const ONLINE_SUNUCU_URL = process.env.EXPO_PUBLIC_ONLINE_SUNUCU_URL ?? "";

/** Test girişi davet kodunun uzunluk alt sınırı (sunucu TEST_GIRIS_KODU en az 32 karakter ister). */
export const TEST_KOD_EN_AZ = 32;

/** Tek bir HTTP isteğinin zaman aşımı. */
export const ZAMAN_ASIMI_MS = 10_000;
/** Yeniden denenebilir isteklerde toplam deneme sayısı (ilk istek dahil). */
export const DENEME_SAYISI = 3;

/** Sondaki eğik çizgiyi atar; boşsa undefined. */
export function sunucuAdresi(ham: string = ONLINE_SUNUCU_URL): string | undefined {
  const adres = ham.trim().replace(/\/+$/, "");
  return adres ? adres : undefined;
}
