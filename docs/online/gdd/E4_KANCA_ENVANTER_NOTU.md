# E4 — beceri ağacı kanca envanteri

Durum: kısmi uygulama. `tasarruf` tüketicisi, üç ortak-durum/han tüketicisi ve E4.3 hizmet kataloğu/pazarı ilk dilimi çalışır. Katalogdaki her hizmet gerçek beceri düğümüne bağlıdır; NPC talebi, görev ve iki taraflı iş akışları henüz tamamlanmadı.

## Bu dalda bağlanan etki

- `tasarruf(hedef, mal, yuzde)`: beceri etkisi tarife kimliği veya tarif grubu ile eşleştirilir. Gerçek girdi gereksinimi, önizleme, eksik girdi kontrolü ve üretimden düşülen miktar aynı hesaplayıcıyı kullanır.
- Tasarruf yüzdesi toplamda %50 ile sınırlıdır. Bölünemeyen mal miktarında tam sayı aşağı yuvarlanır; her girdi türünden en az 1 adet gerekir.
- Hancı `hizmet("ikram")`: öğrenilmiş `serbetOcagi` üçüncü seviyesi NPC han menüsünde %10 indirim sağlar. Oyuncu işletmesinin fiyatı bu indirimle değiştirilmez; işletme sahibinin fiyat kontrolü korunur.
- Asker `hizmet("nobet")`: öğrenilmiş `surNobeti` ilk seviyesi, ana meslek artık asker olmasa da Haydut ortak derdine nöbet katkısı verir. Sunucu hem görünümde hem katkı yazarken beceriyi doğrular; askerin ana mesleği olması tek başına yeterli değildir.
- Ozan `hizmet("turku")`: öğrenilmiş `turkuMani` ilk seviyesi, ana meslek artık ozan olmasa da ortak derdin moral katkısını verir. Sunucu görünüm ve katkı yazımında beceriyi doğrular.
- Hizmet kataloğu: Şifacı `yaraBak` ve `kirikSar`, Ozan `turku`, Şifacı `lohusa` (`lohusaBakimi`, şifalı ot + bez girdisi), Ozan `teselli` (`teselli`, gönül etkisi) ve Hancı `sazGecesi` (`hanci.sazGecesi`, ekmek + çorba; `ortakSahne` sinerjisi). Bu beş hizmet gerçek beceri düğümü/seviyesiyle açılır; hazırlama, stok, ilan, alım ve teslim altyapısı bunları tüketir.
- Demirci `temelDovme` düğümünün `dovme/komur` etkisi, dövme grubu tariflerinde uygulanır. Kanca sayımı artık bu etkiyi bağlı kabul eder.
- Regresyon testi, kilit tarifi önizlemesi ve gerçek envanter düşümünü doğrular.

## Kalan kancaların envanteri

14 beceri ağacı dosyasının tamamı tarandı. Şu an mevcut sistem tüketicisi bulunmayan etkiler:
- `hizmet`: 52 kullanımın 8 tanesi gerçek tüketiciye bağlandı (`ikram`, `nobet`, `turku`, `yaraBak`, `kirikSar`, `lohusa`, `teselli`, `sazGecesi`); 44 kullanım kaldı. Katalog ve oyuncu pazarı ilk dilimdir; NPC talepleri, kasaba görevleri, iki taraflı işler, 6 dil ve istemci akışı hâlâ açık.
- `hak`: 203 kullanım — makam, lonca, ticaret, garnizon, sosyal yardım ve toplumsal ayrıcalıklar için sunucu tarafı yetki/eylem matrisi gerekir.
- `sinerji`: 21 kullanım — `ortakSahne` sinerjisi `sazGecesi` hizmetini açmak için tüketiliyor; 20 kullanım kaldı. Diğer kimliklerin gerçek tüketicileri henüz yok.
- `tasarruf`: 1 kullanım vardı; bu dalda bağlandı.
- `hakAcik(kar, hak)` ve `sinerjiAcik(kar, acar)` ortak sunucu çözümleyicileri eklendi. Sinerji çözümleyicisi hem açan becerinin etkisini hem de diğer meslekteki gerçek düğüm/seviyeyi doğrular. Bunlar altyapıdır; henüz 203 hak ve 21 sinerji tüketicisi bağlanmış sayılmaz.

## Uygulama sırası

1. `hak` için tek bir yetki kayıt/çözümleyici kur; istemci düğüm seviyesini yetki kanıtı saymasın. Her eylem sunucuda `hakAcik` üzerinden doğrulansın.
2. `hizmet` için katalog/pazarın ardından NPC talebi, kasaba görevi ve iki taraflı iş akışlarını tamamla; ödeme kaynağı, teslim etkisi, iptal ve itibar akışını doğrula.
3. `sinerji` için ortak çözümleyici ve 20 `acar` kimliğinin gerçek tüketicileri ekle; bir düğümün varlığı tek başına açılma sağlamasın, iki meslekteki seviye koşulu aranmalı.
4. Her bağ için gizli/öğrenilmiş seviye, hesap/hane tekilliği, tekrar güvenliği ve çevrimdışı davranış testleri yaz.

Bu üç sistem, farklı oyun döngülerini etkilediği için tek bir genel bonus yüzdesine indirgenmemelidir.
