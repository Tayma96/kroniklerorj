# Kronikler — kısa oturum özeti (18 Ekim 2026)

## Kurallar / erişim
- Tayma96/kroniklerorj; yalnız apk. Her tamamlanan küçük iş hemen commit/push.
- Türkçe tek satır commit; force/cron/alt ajan yok. Uzun smoke/life simülasyonu yok.
- mobile/AGENTS.md + TASARIM_PUSULASI.md geçerli; arşivi izinsiz açma.
- Yeni metinler tr/en/es/pt/ar/ru. APK/PR/dağıtım yalnız açıkça istenirse.
- Tayma96 API ile doğrulandı. Miras GH_TOKEN Tayma67; saved CLI kullan:
  env -u GH_TOKEN -u GITHUB_TOKEN GH_CONFIG_DIR=/workspace/.gh-tayma96 gh ...
- Push: git -c credential.helper= -c 'credential.helper=!env -u GH_TOKEN -u GITHUB_TOKEN GH_CONFIG_DIR=/workspace/.gh-tayma96 gh auth git-credential' push origin HEAD:apk
- Kimlik/anahtar dosyalarını okuma veya yazdırma.

## Son kullanıcı şartı / tasarım durumu
- Kullanıcı önce bütün sayfaları istedi; sonra ilk uyarlamayı sert biçimde REDDETTİ.
- Son şart: yalnız sevdiği üç mockup birebir yapılabiliyorsa uygulansın.
- Referans docs/tasarim/ekran-taslaklari-v1.png; tasarım bitmiş/onaylı DEĞİL.
- 509b9a5: kötü NPC yüz/gövde montajı çalışma zamanından kaldırıldı.
- Yeni deneme de eşleşmedi. Uygulama değişiklikleri geri alındı; yalnız docs altında
  kaynak yama, iki yeni sanat resmi ve tarayıcı görüntüleri korundu:
  docs/tasarim/duzeltme-v2/README.md. Bu klasör oyunda kullanılmaz.
- Yama tabanı 509b9a5. Onaylanmış tasarım gibi yeniden uygulama.
- Eski reddedilen 42 sayfalık uyarlama temel dalda hâlâ var; düzelmiş sayma.
- docs/tasarim/GALERI.md eski reddedilen galeri; EKRANLAR.md durum düzeltildi.
- Bütüncül meslek/ruh hâli NPC sahne seti yok; tek k07/olgun/demirci resmi denemede.

## Korunan motor / kontroller
- Aylık karar/risk/fırsat ara sonucu kalıcı; yeniden açma/çift seçim/hızlı ilerleme korumalı.
- Savaş/diplomasi/NPC ekonomi: docs/SAVAS_VE_HUKUMDARLIK.md.
- Claude GDD yalnız incelendi; mülk tavanı/sistem dondurma/gelir kesintisi kabul edilmedi.
- Denemede tsc, i18n/ikon, dil karışması ve 320/390 ortak alt menü testi geçti;
  bunlar görsel eşleşme kanıtı değil. Deneme uygulamada etkin değil.
- Tarayıcı önizlemesi fiziksel cihaz/Android/Hermes testi değildir. Uzun smoke yok.

## APK
- Yeni APK üretilmedi. apk-latest hâlâ 22906ce; yeni motor/tasarımı İÇERMEZ.
- https://github.com/Tayma96/kroniklerorj/releases/download/apk-latest/Kronikler.apk
