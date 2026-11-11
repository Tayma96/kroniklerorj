# E4 — beceri ağacı kanca envanteri

Durum: kısmi uygulama. Var olan sistemlere bağlanabilen ilk `tasarruf` etkisi çalışır hale getirildi; kalan etkiler henüz kanca olarak kalır.

## Bu dalda bağlanan etki

- `tasarruf(hedef, mal, yuzde)`: beceri etkisi tarife kimliği veya tarif grubu ile eşleştirilir. Gerçek girdi gereksinimi, önizleme, eksik girdi kontrolü ve üretimden düşülen miktar aynı hesaplayıcıyı kullanır.
- Tasarruf yüzdesi toplamda %50 ile sınırlıdır. Bölünemeyen mal miktarında tam sayı aşağı yuvarlanır; her girdi türünden en az 1 adet gerekir.
- Demirci `temelDovme` düğümünün `dovme/komur` etkisi, dövme grubu tariflerinde uygulanır. Kanca sayımı artık bu etkiyi bağlı kabul eder.
- Regresyon testi, kilit tarifi önizlemesi ve gerçek envanter düşümünü doğrular.

## Kalan kancaların envanteri

14 beceri ağacı dosyasının tamamı tarandı. Şu an mevcut sistem tüketicisi bulunmayan etkiler:
- `hizmet`: 52 kullanım — oyuncuya/başka oyuncuya sunulan mesleki hizmet kataloğu, teklif/rezervasyon, teslim ve kalite/itibar akışı gerekir.
- `hak`: 203 kullanım — makam, lonca, ticaret, garnizon, sosyal yardım ve toplumsal ayrıcalıklar için sunucu tarafı yetki/eylem matrisi gerekir.
- `sinerji`: 21 kullanım — 20 farklı `acar` kimliği var; mevcut tarif ve temel iş kataloglarında bunlara karşılık gelen tüketici bulunmuyor. Çapraz meslek koşulu sağlanınca yeni tarif/hizmet/eylem açılmalı.
- `tasarruf`: 1 kullanım vardı; bu dalda bağlandı.

## Uygulama sırası

1. `hak` için tek bir yetki kayıt/çözümleyici kur; istemci düğüm seviyesini yetki kanıtı saymasın. Her eylem sunucuda `hakAcik` üzerinden doğrulansın.
2. `hizmet` için hizmet kataloğu, teklif, kabul, ödeme/emanet, teslim, iptal ve itibar akışı tasarla. Sadece görünür rozet veya hizmet puanı vermek tamamlanmış sayılmaz.
3. `sinerji` için ortak çözümleyici ve 20 `acar` kimliğinin gerçek tüketicileri ekle; bir düğümün varlığı tek başına açılma sağlamasın, iki meslekteki seviye koşulu aranmalı.
4. Her bağ için gizli/öğrenilmiş seviye, hesap/hane tekilliği, tekrar güvenliği ve çevrimdışı davranış testleri yaz.

Bu üç sistem, farklı oyun döngülerini etkilediği için tek bir genel bonus yüzdesine indirgenmemelidir.
