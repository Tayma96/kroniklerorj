# Mimari kararlar — güncel uygulama

## 11 Ekim 2026 — Tasarım belgesinin etkin koda uyarlanması

Bağlam: detaylı PDF eski web/Python uygulamasını varsayıyor ve doğrulama istiyor. Aktif Expo/TypeScript oyun ve Cloudflare MP var. Kullanıcı rutin kararlar ve öneriler için tam yetki verdi; onay beklenmez.

Karar: çalışan mobil çekirdek korunur; eski Python/web kaynakları arşivdir. Vite/Capacitor/Pyodide geçişi, Mongo üretim veri değişikliği veya MP kaldırma yapılmaz. Ay takvimi ve altı dil korunur. Mekanikte v7, sunumda v8 ve pusula geçerli; PDF bunları genişletir. Hayat Hırsı kalıcı reddedilmiştir.

Sonuç: ADR-1'in tek oyuncu kısmı fiilen istemcide; MP dünya otoritesi sunucuda fakat yerel karakter simülasyonu hâlâ istemcide. Güven sınırını sunucu otoriteli ilan etmiyoruz. ADR-2 veri ve denge ayrıştırması motor refactor öncesi davranış tabanı ister. ADR-3'te yerel soy defteri zaten ayrı anahtardır; sıcak oyun kaydının tümü JSON yazılıyor. ADR-4'te eylem/tur kilitleri mevcut fakat tüm protokol için evrensel idempotency/version kilidi kabulü açık.

## Ses katmanı — uygulanacak düşük riskli düzeltme

Ayrı müzik/ortam/efekt kanalları, tembel yerel oynatıcılar, sınırlı eşzamanlı ses, uygulama arka planında tüm kaynakları bırakma. Mevcut ayar anahtarları ve efekt çağrıları korunur. Ses bağlamı oyun durumunu yalnız okur; kaynak, zar, kayıt ve MP mesajına dokunmaz. Kapatma ve geç dönen seek yarışı kontrollü saat/oynatıcı testleriyle doğrulanır. Arka plan oynatma ve mikrofon izni kullanılmaz.
