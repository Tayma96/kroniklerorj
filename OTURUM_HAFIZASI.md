# Kronikler — kısa oturum özeti

## Kurallar ve erişim
- Depo `Tayma96/kroniklerorj`, yalnız `apk`; Türkçe tek satır commit, force push yok.
- Kullanıcı HER tamamlanan küçük işlemi hemen commit/push istiyor. Biriktirme.
- Uzun smoke/300 hayat yok; tip, hedefli kontrol, kayıt/i18n denetimi. Arşiv/GDD izni yok.
- `mobile/AGENTS.md`, ürün için `TASARIM_PUSULASI.md`. Yeni metinler 6 dil; kayıtlar eklemeli.
- Sunucu dağıtımı/MP protokol değişikliği yok. Yeni savaş modeli çevrimdışı.
- Tayma96 terminal girişi: `env -u GH_TOKEN -u GITHUB_TOKEN GH_CONFIG_DIR=/workspace/.gh-tayma96 gh ...`
  Miras GH_TOKEN Tayma67'dir. Kimlik bilgisi dosyalarını okuma/yazdırma.

## Kod ve APK
- Hazır üç commit pushlandı: d9e6391, 5f4f7d6, 9a695c2. 22906ce kısa APK kontrol seçeneği.
- Actions 39125665457 başarılı; apk-latest halen 22906ce. APK indirildi ve doğrulandı:
  com.kronikler.app, 1.0.0 (100), ARM64, gömülü JS/23 kitaplık, geçerli Debug v2 imzası.
- https://github.com/Tayma96/kroniklerorj/releases/download/apk-latest/Kronikler.apk
- Bu APK sonraki ordu/diyar geliştirmelerini İÇERMEZ. Gerçek cihaz testi yok.

## Ordu ve diyar dalgası
- 496bc2a: asker olarak yurdun ordusuna katılım, ayda 3 manga teması, iki ordunun sayı/moral/ikmali.
- f44fb88: kalıcı bölgesel hasar/darlık/göç/yorgunluk/insan gücü ve toparlanma.
- 9b0fa9b: gerçek arz, fiyat, ücret, hane/mülk geliri, vergi/otorite/ordu toplanmasına bağlantı.
- 007d117: şehir/pazar/yerleşimde neden-sonuç kartı, ayda bir gerçek bedelli sivil yardım.
- 0b169d6: gerçek NPC hanesi göçü, güvenli yurda dönüş, üretim önbelleği ve yolculuk riski.
- d85a02c: karşı hükümdar sınır saldırısı, ücretli savunma, ateşkes, fetih direnci, taht mirası.
- 46e0168: taşınarak başkentin insan gücü kaybından kaçma açığı kapatıldı.
- Her parça hedefli test sonrası ayrı pushlandı. Son iş: CI denetimleri/belgeler de ayrı push.

## Doğrulama ve sınırlar
- tsc, motor/UI bundle; check-war-world, check-war-impact, check-army, check-war;
  kayıt göçü, vâris paritesi, 6 dil/ikon temiz. Uzun smoke çalışmadı.
- Eski/kusurlu kayıtta baskılar onarılır; MP etkilerden yalıtıldı, protokoller eşit.
- Birlik harita komutası, isimli hükümdar diplomasisi ve NPC maliyesi tamamlanmış değildir.
- Görsel 320/390/CPU ve gerçek telefon testi yapılmadı. Ayrıntı `docs/SAVAS_VE_HUKUMDARLIK.md`.
