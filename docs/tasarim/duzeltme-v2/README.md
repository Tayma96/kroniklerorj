# Üç ekran — kabul hedefini karşılamayan deneme

**Durum: birebir eşleşme sağlanmadı. Yeni deneme uygulamaya alınmadı.**
Kullanıcı yalnız [bu üç referans ekranla](../ekran-taslaklari-v1.png) birebir
örtüşen uygulamayı istedi. Yaklaşık sonuç bu şartı karşılamaz. Bu klasör uygulama
tarafından içe aktarılmaz; kaynak denemesi ve görsel karşılaştırma kaydıdır.
Önceden reddedilen ilk uyarlama temel dalda hâlâ vardır; bu kayıt onun yerine
onaylanmış tasarım geldiği anlamına gelmez.

## Karşılaştırma

| Ekran | Çalışan bileşenlerden görüntü | Referanstan kalan fark |
|---|---|---|
| Ana | [390](ana-390.png), [320](ana-320.png), [kaydırma](ana-390-kaydirma.png) | Panorama farklı; metal/doku/çerçeve ve ikonlar eşleşmiyor. Kart ölçüleri ve içerik yoğunluğu farklı; defter ilk görünümde referanstaki yere gelmiyor. |
| NPC | [390](npc-390.png) | İlk bütüncül demirci sahnesi montajı gideriyor ama referanstaki resim değil. Kimlik, güven ve konuşma yerleşimi de aynı değil. |
| Şehir | [390](city-390.png) | Birleşik üç gösterge, ilk dört mekân ve hemen altındaki ambar düzeni henüz yapılmadı. Görüntü ilk uyarlamayı gösteriyor. |

Bunlar Chromium/React Native Web önizlemeleridir; Android ekran görüntüsü veya APK
değildir. Örnek kayıt kullanılır. Yeni mockup resmi gibi sunulmaz.

## Korunan çalışma

`prototip.patch`, `509b9a5` üstüne hazırlanmış UI denemesidir; yalnız kaynak olarak
saklanır. Başlık fontu, gerçek ortak alt menü, ana ekran düzeni ve tek k07/olgun/demirci
sahnesi içerir. Üç ekranın tamamlandığı anlamına gelmez.
`kaynaklar` altındaki iki resim yamanın yeniden denenmesinde sırasıyla şu konumları
bekler; mevcut çalışan uygulama bu resimleri kullanmaz:

- `mobile/assets/npc/k07-olgun-demirci-sahne-v2.png`
- `mobile/assets/tasarim/anasayfa-mevsimler-v2.png`

Tamamlanmış tasarım veya kullanıcı onayı olmadan yama yeniden uygulanmamalı.

## Kontrolün sınırı

Deneme kaynağında TypeScript, i18n/ikon ve dil karışması kontrolleri geçti.
`kontrol.json`, ana ekranın 320/390 genişlik ve 4× CPU altında hata/taşma olmadan
çizilmesi ve dört ortak sekmenin en az 44 piksel dokunma alanıyla doğru rotalara
gitmesi kaydıdır. NPC/şehir 390 görüntüleri de JavaScript hatası olmadan alındı;
aynı kapsamda etkileşim testi yapılmadı. Bu sonuçların hiçbiri görsel eşleşme kanıtı
değildir. Fiziksel cihaz ve APK doğrulaması yapılmadı.
