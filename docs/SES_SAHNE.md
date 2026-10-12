# Ses ve sahne dalgası — 12 Ekim 2026

## Yapılan

63 yerel kayıt tek katalogda: 21 ezgi, 15 ortam, 27 efekt. Müzik yaş evresi, ekran, mevsim ve gerçek büyük anlarla değişir. Çarşı, atölye, mektep, divan, yol ve miras ekranları ayrı bağlam taşır. Değirmen ortamı yalnız gerçekten değirmen varsa kullanılır. Atölyede örs/dokuma mesleğe bağlıdır. Metinlerden veya çevrilmiş cümlelerden tema tahmini yapılmaz; mevcut olay kimlikleri kullanılır.

Mevcut efekt çağrıları ve müzik/efekt ayar anahtarları korunur. Ortam ayrı, kalıcı ayardır; ilk varsayılan önceki müzik tercihi ve sade moda saygı gösterir. Düşük kaynak varsayılanında müzik/ortam kapalıdır, kullanıcı açabilir. Gecikmiş ayar okuması yeni dokunuşu ezmez; yazımlar sıraya alınır. Mikrofon ve arka plan oynatma eklenti ayarları kapalıdır.

Sahne açılınca kendi ses katmanı üstte yer alır; kapanınca alttaki güncel bağlama döner. Gizli modal ses katmanı açmaz. Ölüm, doğum, düğün, zafer gibi mevcut çağrılar sınırlı süreli ezgi taşır. Yeni kronik olayları uzunluktan değil `q/hseq` sırasından izlenir; ilk açılışta eski olaylar yeniden çalınmaz. Ayarlar ekranında kayıt geri yüklemesi eski hayatın seslerini tetiklemez.

15 kurtarılmış arka plan tabloya bağlandı. Anlamsal eşleşmesi olmayan kararda koyu nötr zemin korunur; her olaya yoksul ev, cenaze veya savaş resmi zorlanmaz. Seçim ve ustalık kartları perspektifini korur; arka planda kısa kamera yakınlaşması, metnin altında koyu geçiş, küçük ekranda kaydırma var. Sade mod yüklenirken/değişirken kartlar güncellenir; sürekli hareket ve dönüşler kapanır, kapanan kartın animasyonları temizlenir. Oyuncu/NPC portreleri ve yaş sınırları değişmedi.

## Önce / sonra

| Ölçüt | Önce | Sonra |
|---|---|---|
| Efekt kanalı izole, ilk dokunuşta açılan oynatıcı | 17 | 1 |
| Arka plan müziği | Tek ana tema | Yaş / ekran / mevsim / sahne bağlamı |
| Ortam denetimi | Yok | Müzikten bağımsız, 6 dilde ayar |
| Açık kaynak tavanı | Efektler bırakılmadan saklanıyor | Normal 2 döngü, geçişte en çok 4; en çok 4 efekt |
| Arka plan / kapatma | Kalıcı dinleyici; yalnız müziği durduruyor | Dinleyici, efekt, döngü ve zamanlayıcı temizleniyor |
| Karar sahnesi | Koyu zemin | Eşleşen özgün resim + okunur kart; kısa ekranda kaydırma |

Oynatıcı sayısı kontrollü testte ve eski `ensure` çağrı yapısından ölçülür; gerçek cihaz RAM/pil kazancı diye sunulmaz. Geçişte toplam tepe sınırı 4 döngü + 4 efekttir.

## Etkilenen dosyalar

- `mobile/lib/sound.ts`, `ses-mikser.ts`, `ses-katalog.ts`, `ses-plan.ts`, `ses-yonetmen.tsx`: ayar, katman, sınırlı oynatıcı ve bağlam.
- `mobile/lib/kart3d.tsx`, `sahne-tema.ts`, `perf.ts`: arka plan, sade mod, küçük ekran, animasyon temizleme.
- `mobile/app/_layout.tsx`, `app/oyun/ayarlar.tsx`, `lib/i18n-sahne.ts`, `lib/i18n.tsx`, `app.json`: yaşam döngüsü ve altı dilde ayar; gerekli yerel gradyan bağımlılığı SDK 56 ile eşleşir.
- `ses-check.cjs`, `kurtarma-check.cjs`, `gdd-baseline.cjs` ve APK/AAB kalite kapıları: yaşam döngüsü ve oyun davranışı bekçileri.

Oyun motoru, oyun kayıt şeması ve MP mesaj protokolü değişmedi; API uç nokta eklenmedi. Yeni yerel bağımlılık için sonraki APK tam derleme ister; mevcut telefona kod güncellemesi yapıldı diye sunulmaz.

## Test sonuçları ve sınırlar

- tsc; i18n/ikon; dil karışması; varlık kurtarma denetimi: temiz.
- 200 hızlı ses geçişi: sınırlar korunuyor. Geç seek, susturma, arka plan, hatalı oynatıcı, hatalı ses modu, geç ayar yükü, sade mod varsayılanı, katman önceliği ve yeniden açılma: temiz; kalan dinleyici/zamanlayıcı yok.
- 10 oyun akışının hashleri ve üç sentetik 30 aylık tekrar, önceki davranış tabanıyla aynı. Motor dokunulmadığı için 300 hayat tekrar koşulmadı; önceki varlık dalgasındaki 300 hayat HATA 0, bu denetimde 30 hayat eşikleri temiz.
- Android/Hermes paketleme başarılı: 215 varlık, yaklaşık 12 MB JS/Hermes paketi. Bu bir APK kurulum testi değildir.
- 390×844 tarayıcı, 4× CPU: TR/AR ayar görüntüleri; iş → karar → sonuç → günlük → ay ilerletme. Kart ve seçenekler sığıyor. Görsel denetim sırasında Skia'nın tarayıcı WASM altyapısı yalnız yerel test sunucusunda başlatıldı; bu destek dosyaları üretim kaynağına eklenmedi.
- Tarayıcıda sesin çok hızlı açılıp kapatılmasında `expo-audio` web uygulamasının iptal edilen `play()` sözünü yakalamadığı görüldü. Son görsel akış sessiz çalıştırıldı ve hata vermedi. Tarayıcı ses desteği sorunsuz diye raporlanmaz. Android/iOS'da fiziksel dinleme, Bluetooth/kesinti ve 30 dakikalık bellek/pil ölçümü yapılmadı.
- Belge tüm oyunun bittiğini veya bütün PDF kabul maddelerinin sağlandığını iddia etmez. Gerçek oyuncu altın kayıtları ve kayıtlı üretim RNG hâlâ açık işlerdir.

## Sıradaki

Ortak sonuç nedenlerinin kısa dökümü ve kayıtlı RNG için ayrı motor dalgası; karakterizasyon, göç, vâris ve oynanış kapılarıyla. Tarayıcı ses iptalinin desteklenen bir web oynatıcı üzerinden çözülmesi ayrı uyumluluk işi. Çocuk NPC'lerin kimliğe özgü yaş serileri için arşivde olmayan görseller ayrıca üretilebilir; mevcut portreler sessizce değiştirilmeyecek.

Uygulama, gradyan ve ses yaşam döngüsü için sürüme uygun resmi [Expo Audio](https://docs.expo.dev/versions/v56.0.0/sdk/audio/) ve [LinearGradient](https://docs.expo.dev/versions/v56.0.0/sdk/linear-gradient/) belgeleri kontrol edildi.
