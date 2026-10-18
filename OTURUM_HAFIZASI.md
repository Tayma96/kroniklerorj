# Kronikler — güncel çalışma özeti (19 Ekim 2026)

## Kurallar
- Tayma96/kroniklerorj; yalnız `apk`. Commit Türkçe ve tek satır; değişikliği tamamlayınca uzak dalı doğrula.
- APK, PR, dağıtım ve Cloudflare işlemi yalnız açıkça istenirse. Kullanıcı sormadıysa otomatik test çalıştırma.
- Ekranda yeni metin varsa tr/en/es/pt/ar/ru. Kayıt ve MP protokolünü koru. Anahtarları okuma/yazdırma.
- Yalnız ücretsiz araç; ücret riski varsa çağrı yapma. Bu oturumda yerleşik ImageGen görünmüyor, Higgsfield bağlı değil, Canva kredi durumu doğrulanamıyor; yeni AI görseli üretilmedi.

## Tasarım yönü
- Oyun: 1247 Anadolu'sunda çevrimdışı, reklam/satın alım içermeyen hanedan yaşam simülasyonu.
- Kullanıcı bütün oyunda daha canlı, profesyonel, oyun hissi veren ve mockuplara yakın tasarım istiyor; düz/ofis düğmeleri ve soluk, ağır gölgeli ekranlar istemiyor.
- NPC ekranı mockup yapısını izlemeli; Aybike yalnız örnek, sabit karakter değil. Her NPC'nin yaşı, mesleği ve ruh hâline uyan kendine ait portresi olmalı. Kahraman görseli portre olarak kullanılmamalı; başsız kıyafet atlası portreye bindirilmemeli. Bu tam portre seti henüz yapılmadı.
- `apk` uzak dalındaki `69ff1b2` önceki tasarım turudur: kasaba/venue görselleri, NPC ekranı ve düğme cilası. Kullanıcı sonucu inceletmek istedi; onaylanmış nihai tasarım sayma. Diğer sohbete kullanıcı açıkça yetki vermeden mesaj gönderme.

## Son tamamlanan tur
- Kullanıcı kapsamı tüm oyunun sistematik iyileştirilmesine genişletti. `70fc1c3` (`apk`) mobil paleti ısıtıp aydınlatır; ortak kabartmalı `GameButton` karar kartı, ana pano, meslek/ustalık ve vâris geçişinde kullanılır; paneller/sahne başlıkları ile dokunma alanları cilalandı. Oynanış/çeviri metni değişmedi.
- `git diff --check` temiz; otomatik test, görsel önizleme ve APK çalıştırılmadı. Uzak dal yerel ağaçla eşit, çalışma alanı temiz.
- ChatGPT tarayıcı görsel üretimi `list_apps` zaman aşımı yüzünden denenemedi; bu turda yeni yapay zekâ görseli yok. NPC'lere yaş/meslek/ruh hâline özgü ayrı portre seti hâlâ açık iş.
