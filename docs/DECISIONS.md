# Mimari kararlar — güncel uygulama

## 11 Ekim 2026 — Tasarım belgesinin etkin koda uyarlanması

Bağlam: detaylı PDF eski web/Python uygulamasını varsayıyor ve doğrulama istiyor. Aktif Expo/TypeScript oyun ve Cloudflare MP var. Kullanıcı rutin kararlar ve öneriler için tam yetki verdi; onay beklenmez.

Karar: çalışan mobil çekirdek korunur; eski Python/web kaynakları arşivdir. Vite/Capacitor/Pyodide geçişi, Mongo üretim veri değişikliği veya MP kaldırma yapılmaz. Ay takvimi ve altı dil korunur. Mekanikte v7, sunumda v8 ve pusula geçerli; PDF bunları genişletir. Hayat Hırsı kalıcı reddedilmiştir.

Sonuç: ADR-1'in tek oyuncu kısmı fiilen istemcide; MP dünya otoritesi sunucuda fakat yerel karakter simülasyonu hâlâ istemcide. Güven sınırını sunucu otoriteli ilan etmiyoruz. ADR-2 veri ve denge ayrıştırması motor refactor öncesi davranış tabanı ister. ADR-3'te yerel soy defteri zaten ayrı anahtardır; sıcak oyun kaydının tümü JSON yazılıyor. ADR-4'te eylem/tur kilitleri mevcut fakat tüm protokol için evrensel idempotency/version kilidi kabulü açık.

## Ses katmanı — uygulanacak düşük riskli düzeltme

Ayrı müzik/ortam/efekt kanalları, tembel yerel oynatıcılar, sınırlı eşzamanlı ses, uygulama arka planında tüm kaynakları bırakma. Mevcut ayar anahtarları ve efekt çağrıları korunur. Ses bağlamı oyun durumunu yalnız okur; kaynak, zar, kayıt ve MP mesajına dokunmaz. Kapatma ve geç dönen seek yarışı kontrollü saat/oynatıcı testleriyle doğrulanır. Arka plan oynatma ve mikrofon izni kullanılmaz.

## 12 Ekim 2026 — Ses/sahne uygulandı

Karar hayata geçti: sınırlı tembel ses, iki ayrı ortam/müzik kanalı, bağımsız tercihler, güvenli kaynak bırakma. Sahne temasında net olay kimliği yoksa nötr kalınır. Yaş ve mevsim yalnız ses bağlamıdır; kayıt ve oyun zarı değişmez. Ortam ilk tercihi önceki müzik/sade moda göre seçilir ve kalıcılaşır. Sade modda dekoratif yakınlaşma/süzülme durur; karar işlevi sürer.

Tarayıcıya karşılık gelen çizim başlatması test ortamına aittir; aktif Android istemci için yeni web mimarisi varsayılmaz. Tarayıcı ses iptal hatası bilinen uyumluluk açığı olarak saklanır. APK ve sunucu dağıtımı tetiklenmedi.

## 12 Ekim 2026 — Selçuklu Anadolu'su ve yaş kimliği

Kullanıcı görsel/tasarım değişikliklerine yetki verdi ve Türk/Türkmen karakterlerle 1200'lü yılların Selçuklu
Anadolu'sunu istedi. Seçilen oyuncu seti korunur; yetişkin NPC yüzleri referans alınarak çocuk/ergen evreleri
eklenir. Kişi kimliğini seçen özet ve havuz sırası değiştirilmez. Dört atlas dosyası arayüzde hücre olarak
kadrajlanır; dosya pikseli yeniden işlenmez. Altı dilde mevcut etiketler kullanılır, ekran okuyucuya tam
değer verilir. Sade mod ortak abonelikle uygulanır ve dekoratif döngüler temizlenir. Kayıt yüklemek
kazanç sayılmaz. Ayrıntılar ve ölçüm sınırları `GORSEL_YAS.md` içinde.

## 12 Ekim 2026 — Sarı ışık topları kaldırıldı

Kullanıcı ekranda süzülen yuvarlak sarı ışıkları reddetti. Sikke yağmuru çizimi ve ana ekrandaki tüm
tetikleme/durum/zamanlayıcı katmanı silindi. Bu efekt yeniden eklenmez; kazancın gerçek değeri mevcut
gösterge ve bildirimle aktarılır.
