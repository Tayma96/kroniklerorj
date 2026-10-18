# Kronikler — kısa oturum özeti

> Başlangıçta yalnız bu dosya. Mobil değişiklikte `mobile/AGENTS.md`, ürün kararında
> `TASARIM_PUSULASI.md`. Arşiv/GDD/PDF yalnız kullanıcının o oturumdaki açık izniyle.

## Kurallar

- Depo `Tayma96/kroniklerorj`, dal `apk`. Biten işi Türkçe tek satır commit/push et,
  uzak dalı doğrula. Araç/model imzası ve cron yok. Anahtarları okuma/yazdırma.
- Rutin geliştirme için onay bekleme. APK, PR ve sunucu dağıtımı yalnız açık istekle.
- Mobil, çevrimdışı öncelikli; 1200'ler Selçuklu Anadolu'su, aylık tur. Türk yüzleri;
  Araplaştırma, sarı ışık/sikke yağmuru yok. Seçili erkek portresi keçe başlıklı,
  kadın işlemeli başlıklı. Yeni metin tr/en/es/pt/ar/ru; GameIcon ve tema jetonları.
- Farm/P2W yok. Kayıt alanları opsiyonel; vâris önizleme paritesi ve MP protokol
  bayt eşliği korunur. Sentetik test, cihaz/oyuncu kabulü değildir.

## Durum

- Test bütçesi: varsayılan kısa + başarılı kaynak önbelleği; geniş smoke yalnız açık istek/APK.
  Kullanıcı bu düzenlemede smoke istemedi; yalnız statik kontrol yapıldı.

- Bu dalga yerel committe. Push 403: bağlantı Tayma67; Tayma96 deposuna yazma yetkisi yok.
  Yazma erişimi sağlanınca yerel commit kaybedilmeden uzak dalla karşılaştırılıp gönderilmeli.

- Aylık yaşam, meslek yolları/şaheser, yaş portreleri/ses, NPC hafıza/söylenti/tavır,
  tohum/yönetmen, rakip haneler ve kimlikli aile/vâris akışları mevcut.
  Küçük evlat korunur; vâris sırası evlat→torun→yeğen→yetişmiş çırak; hayalet eylem yok.
- Ağır suç mahkemesi gerçek mağdur/tanık ve delil kullanır; bedelli uzlaşma var.
  Kaçılan iş 3–6 aylık NPC soruşturmasına dönüşebilir; saklanma/sahte iz delili düşürür,
  yeni suç hızlandırır, olgun delil mahkemeye taşınır.
- Kayıtlı RNG suçtan yol/pusu, pazarlık/blöf, kervan/piyasa, cephe/ocak savaşı ve
  yaralanmaya yayıldı. Taktik dövüş tohumlu alt akışta; çekirdek `mobile/lib/random.ts`.
  Yaşam/NPC/aylık kartlar henüz tam taşınmadı; tam aylık tekrar garantisi yok.
- Son kontrol: tsc/bundle/göç/i18n/dil/MP temiz; 4.370 kayıt tekrarı, 52 yol sonucu,
  153 dövüş/1.810 hamle; suç, 7 vâris kümesi, 13 kayıt senaryosu temiz.
  Güncel inceleme: `docs/AUDIT.md`. Yeni bekçi: `rng-yol-ticaret-savas-check.cjs`.

## Sırada

1. Aylık ikilem/fırsat kartı ekran belleğinde: kararı kayda al, açılışta geri getir ve
   tek uygula. Kart RNG'sini taşı; yaşam/NPC/sefer RNG ve ortak neden dökümünü sürdür.
2. Müzakere sabrı kapat/açta sıfırlanıyor; kalıcılaştır. Rota/mal üstünlüğünü ölç.
3. 3–6 turluk NPC/aile sohbeti, ortak yaşam kararları, hoca/silsile, soy ağacı, LOD.
4. Gerçek oyuncu kayıtları ve düşük donanımlı Android/uzun oturum testi.

`mobile/AGENTS.md` test kadansına uy; kısmî işi tam GDD diye sunma.
