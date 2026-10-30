// Kronikler Online istemci ayarları.

/**
 * online-server Worker adresi (örn. "https://kronikler-online.<hesap>.workers.dev"). Berkay ilk dağıtımdan sonra
 * doldurur. Boşken istemci hiçbir isteği göndermez, "sunucu_yok" hatası döner; arayüz dostça bir not gösterir.
 */
export const ONLINE_SUNUCU_URL = "";

/** Tek bir HTTP isteğinin zaman aşımı. */
export const ZAMAN_ASIMI_MS = 10_000;
/** Yeniden denenebilir isteklerde toplam deneme sayısı (ilk istek dahil). */
export const DENEME_SAYISI = 3;

/** Sondaki eğik çizgiyi atar; boşsa undefined. */
export function sunucuAdresi(ham: string = ONLINE_SUNUCU_URL): string | undefined {
  const adres = ham.trim().replace(/\/+$/, "");
  return adres ? adres : undefined;
}
