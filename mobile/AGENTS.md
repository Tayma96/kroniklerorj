# Kronikler — kısa geliştirme kuralları

> Başlangıçta `OTURUM_HAFIZASI.md` ve `TASARIM_PUSULASI.md` özetlerini oku.
> Tam arşivleri kendi kararınla açma; kullanıcı o oturumda açıkça izin verirse aç.
> Expo API'sine dokunuyorsan yalnız kullanılan API için v56 belgesini kontrol et.

## Sert kurallar

- Yalnız `apk` dalında çalış ve oraya push et. Commit Türkçe ve tek satır olsun; araç/model
  adı veya footer ekleme. Cron/zamanlayıcı kurma.
- Cloudflare veya başka erişim anahtarını okuma, yazdırma ya da commit'leme. Sunucu dağıtımı
  kullanıcıya aittir. APK, PR ve dağıtım yalnız açıkça istenirse yapılır.
- Oyuncuya görünen her yeni metin tr/en/es/pt/ar/ru dillerinde olsun. AR/RU cinsiyetini doğru
  kur; mümkünse nötr anlat. Emoji yerine `GameIcon`, renk/font için `lib/theme.ts` kullan.
- Para, itibar veya XP eylemlerinde tur kilidi, tek sefer izi ya da azalan getiri bulunmalı.
  Farm ve P2W yok.
- Yeni kayıt alanları opsiyonel ve eklemeli olmalı. `heirPreview` ile `continueAsHeir` aynı
  sonucu göstermeli. `mobile/lib/mp/protocol.ts` ile `server/src/protocol.ts` bayt eşliğini koru.
- Kronikte yeni olayları dizi uzunluğuyla değil `e.q` / `s.hseq` sırasıyla tanı.

## Çalışma ve doğrulama

Başlamadan önce uzak `apk` dalını al, yerelin eşit veya ileride olduğunu doğrula. Bitince
push et, uzak dalın commit kimliğini doğrula ve çalışma alanını temiz bırak.

`lib/game.ts` değiştiğinde sırasıyla:

1. Yama sabitlerini bir kopyada doğrula; eşleşme yoksa gerçek dosyaya dokunma.
2. TypeScript kontrolü ve dış paket bırakmayan esbuild paketi çalıştır.
3. Değişen davranışın bütün dal, bedel, kapı ve vâris aktarımını hedefli simülasyonla doğrula.
4. Kayıt göçü, i18n/ikon ve dil karışması kontrollerini çalıştır.
5. `git diff --check` ile biçim hatasını denetle.

300 hayat smoke testi her 4–5 motor dalgasında ve her APK öncesinde çalışır; her küçük
değişiklikte çalıştırılmaz. UI değişikliklerini 320 ve 390 piksel genişlikte, 4× CPU yavaşlatmada,
en az 44 piksel dokunma alanıyla ve taşma olmadan denetle.

## Kontrol yönlendirmesi

- Olay metni veya kart: `olay-metin.cjs` + `olu-karar.cjs`
- Görüş, itibar, söylenti, tohum veya vâris: `karakter-ayna.cjs`
- Kül Yemini destanı: `saga-fuzz.cjs`
- `game.ts`: bundle + hedefli sim + `migrate-check.cjs`
- i18n: `i18n-icon-check.cjs` + `dil-karisma.cjs`

İlgili denetleyicinin temiz sonucu zorunludur. Sentetik test, gerçek oyuncu/cihaz testinin
yerine geçmez.

## Hızlı kod haritası

- Motor: `mobile/lib/game.ts`
- Olaylar ve metinler: `mobile/lib/events.ts`, `mobile/lib/i18n.tsx`
- Nüfus/NPC: `mobile/lib/nufus.ts`
- Ekranlar: `mobile/app/`
- Çok oyunculu protokol: `mobile/lib/mp/protocol.ts`, `server/src/protocol.ts`

Tasarım kararlarını kısa `TASARIM_PUSULASI.md` süzgecinden geçir. Eski gerekçeleri aramak
yerine güncel kısa özetleri esas al; arşiv okumak için kullanıcıdan açık izin iste.
