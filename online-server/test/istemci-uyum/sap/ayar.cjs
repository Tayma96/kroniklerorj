// istemci-uyum sapı: lib/online/ayar (test girişi açık, tek deneme, sabit test adresi).
module.exports = { ONLINE_GELISTIRME: false, ONLINE_SAHTE_OTURUM: false, ONLINE_TEST_GIRIS: true, ONLINE_SUNUCU_URL: "https://kronikler-online.test", TEST_KOD_EN_AZ: 32, ZAMAN_ASIMI_MS: 60000, DENEME_SAYISI: 1,
  sunucuAdresi: (ham = "https://kronikler-online.test") => ham.trim().replace(/\/+$/, "") || undefined };
