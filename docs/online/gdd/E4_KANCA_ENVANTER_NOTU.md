# E4 — beceri ağacı kanca envanteri

Durum: kısmi uygulama. `tasarruf` tüketicisi, üç ortak-durum/han tüketicisi, E4.3-A/B/C hizmet altyapısı ve E4.3-D sözleşmeleri çalışır. Oyuncu hanında yatak/oda kiralama artık hancının `yatak`/`oda` becerisine, has oda ise marangoz `kundekari` sinerjisine bağlıdır. Gerçek rota/kervan koruması ve kalan tüketiciler açıktır.

## Bu dalda bağlanan etki

- `tasarruf(hedef, mal, yuzde)`: beceri etkisi tarife kimliği veya tarif grubu ile eşleştirilir. Gerçek girdi gereksinimi, önizleme, eksik girdi kontrolü ve üretimden düşülen miktar aynı hesaplayıcıyı kullanır.
- Tasarruf yüzdesi toplamda %50 ile sınırlıdır. Bölünemeyen mal miktarında tam sayı aşağı yuvarlanır; her girdi türünden en az 1 adet gerekir.
- Hancı `hizmet("ikram")`: öğrenilmiş `serbetOcagi` üçüncü seviyesi NPC han menüsünde %10 indirim sağlar. Oyuncu işletmesinin fiyatı bu indirimle değiştirilmez; işletme sahibinin fiyat kontrolü korunur.
- Hancı `hizmet("yatak")` / `hizmet("oda")`: oyuncu hanında yatak ve oda kiralama kataloğunu açar; sunucu sahibi kalıcı karakterini yükleyip beceriyi doğrular. `hasOda`, `oda` hizmetine ek olarak Hancı `temizOda` üçüncü seviye + Marangoz `kundekari` birinci seviye `seckinOda` sinerjisini ister. GET barınma kataloğu yalnız yetkili oda türlerini gösterir; kapalı han oda sunmaz.
- Asker `hizmet("nobet")`: öğrenilmiş `surNobeti` ilk seviyesi, ana meslek artık asker olmasa da Haydut ortak derdine nöbet katkısı verir. Sunucu hem görünümde hem katkı yazarken beceriyi doğrular; askerin ana mesleği olması tek başına yeterli değildir.
- Ozan `hizmet("turku")`: öğrenilmiş `turkuMani` ilk seviyesi, ana meslek artık ozan olmasa da ortak derdin moral katkısını verir. Sunucu görünüm ve katkı yazımında beceriyi doğrular.
- Hizmet kataloğu: Şifacı `yaraBak` ve `kirikSar`, Ozan `turku`, Şifacı `lohusa` (`lohusaBakimi`, şifalı ot + bez girdisi), Ozan `teselli` (`teselli`, gönül etkisi), Hancı `sazGecesi` (`hanci.sazGecesi`, ekmek + çorba; `ortakSahne` sinerjisi) ve Arabulucu `barisSofrasi` (ekmek + çorba; `barisCorbasi` sinerjisi). Katalog hizmetleri gerçek beceri düğümü/seviyesiyle açılır; hazırlama, stok, ilan, alım ve teslim altyapısı bunları tüketir.
- Demirci `temelDovme` düğümünün `dovme/komur` etkisi, dövme grubu tariflerinde uygulanır. Kanca sayımı artık bu etkiyi bağlı kabul eder.
- Regresyon testi, kilit tarifi önizlemesi ve gerçek envanter düşümünü doğrular.

## Kalan kancaların envanteri

14 beceri ağacı dosyasının tamamı tarandı. Şu an mevcut sistem tüketicisi bulunmayan etkiler:
- `hizmet`: 52 kullanımın 17 tanesi gerçek tüketiciye bağlandı (`ikram`, `yatak`, `oda`, `nobet`, `talim`, `vergiSayimi`, `meclisKaydi`, `turku`, `yaraBak`, `kirikSar`, `lohusa`, `teselli`, `sazGecesi`, `barisSofrasi`, `araBul`, `muhafizlik`, `mektup`); 35 kullanım kaldı. E4.3-A/B/C tamamlandı; E4.3-D'nin ilk dilimi sunucu/mobil/6 dilde çalışır.
- `hak`: 203 kullanım — makam, lonca, ticaret, garnizon, sosyal yardım ve toplumsal ayrıcalıklar için sunucu tarafı yetki/eylem matrisi gerekir.
- `sinerji`: 21 kullanım — `ortakSahne` sinerjisi `sazGecesi`, `barisCorbasi` sinerjisi `barisSofrasi`, `seckinOda` sinerjisi oyuncu hanındaki has odayı açmak, `barisSansi` sinerjisi NPC arabuluculuğunda +10 şans için tüketiliyor; 17 kullanım kaldı. Diğer kimliklerin gerçek tüketicileri henüz yok.
- `tasarruf`: 1 kullanım vardı; bu dalda bağlandı.
- `hakAcik(kar, hak)` ve `sinerjiAcik(kar, acar)` ortak sunucu çözümleyicileri eklendi. Sinerji çözümleyicisi hem açan becerinin etkisini hem de diğer meslekteki gerçek düğüm/seviyeyi doğrular. Bunlar altyapıdır; henüz 203 hak ve 21 sinerji tüketicisi bağlanmış sayılmaz.

## Uygulama sırası

1. `hak` için tek bir yetki kayıt/çözümleyici kur; istemci düğüm seviyesini yetki kanıtı saymasın. Her eylem sunucuda `hakAcik` üzerinden doğrulansın.
2. `hizmet` için kalan iki taraflı iş akışlarını tamamla; ödeme kaynağı, teslim etkisi, iptal ve itibar akışını doğrula. E4.3-A/B/C tamamlandı.
3. `sinerji` için ortak çözümleyici ve kalan 19 `acar` kimliğinin gerçek tüketicilerini ekle; bir düğümün varlığı tek başına açılma sağlamasın, iki meslekteki seviye koşulu aranmalı.
4. Her bağ için gizli/öğrenilmiş seviye, hesap/hane tekilliği, tekrar güvenliği ve çevrimdışı davranış testleri yaz.

Bu üç sistem, farklı oyun döngülerini etkilediği için tek bir genel bonus yüzdesine indirgenmemelidir.


### 13 Kasım — barisSansi sinerjisi
- Ozan `barisIlahisi` ve Arabulucu `araBulma` düğümleri aynı karakterde öğrenilmişse `sinerjiAcik(ar, "barisSansi")` doğrulanır.
- NPC arabuluculuğunun gerekçeli şans dökümüne ayrı `sans.barisSansi` kalemiyle +10 eklenir; yalnız tek düğüm öğrenilmişse bonus verilmez.
- Mobil şans dökümünde kalem altı dilde açıklanır. Sinerji etkisi birden fazla kez eklenmez.
