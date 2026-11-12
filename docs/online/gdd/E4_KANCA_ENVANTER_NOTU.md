# E4 — beceri ağacı kanca envanteri

Durum: kısmi uygulama. `tasarruf` tüketicisi, ortak-durum/han tüketicileri, E4.3-A/B/C hizmet altyapısı ve E4.3-D sözleşmeleri çalışır. Oyuncu hanında yatak/oda kiralama artık hancının `yatak`/`oda` becerisine, has oda ise marangoz `kundekari` sinerjisine bağlıdır. Gerçek rota/kervan koruması ve kalan tüketiciler açıktır.

## Bu dalda bağlanan etki

- `tasarruf(hedef, mal, yuzde)`: beceri etkisi tarife kimliği veya tarif grubu ile eşleştirilir. Gerçek girdi gereksinimi, önizleme, eksik girdi kontrolü ve üretimden düşülen miktar aynı hesaplayıcıyı kullanır.
- Tasarruf yüzdesi toplamda %50 ile sınırlıdır. Bölünemeyen mal miktarında tam sayı aşağı yuvarlanır; her girdi türünden en az 1 adet gerekir.
- Hancı `hizmet("ikram")`: öğrenilmiş `serbetOcagi` üçüncü seviyesi NPC han menüsünde %10 indirim sağlar. Oyuncu işletmesinin fiyatı bu indirimle değiştirilmez; işletme sahibinin fiyat kontrolü korunur.
- Hancı `hizmet("yatak")` / `hizmet("oda")`: oyuncu hanında yatak ve oda kiralama kataloğunu açar; sunucu sahibi kalıcı karakterini yükleyip beceriyi doğrular. `hasOda`, `oda` hizmetine ek olarak Hancı `temizOda` üçüncü seviye + Marangoz `kundekari` birinci seviye `seckinOda` sinerjisini ister. GET barınma kataloğu yalnız yetkili oda türlerini gösterir; kapalı han oda sunmaz.
- Asker `hizmet("nobet")`: öğrenilmiş `surNobeti` ilk seviyesi, ana meslek artık asker olmasa da Haydut ortak derdine nöbet katkısı verir. Sunucu hem görünümde hem katkı yazarken beceriyi doğrular; askerin ana mesleği olması tek başına yeterli değildir.
- Ozan `hizmet("turku")`: öğrenilmiş `turkuMani` ilk seviyesi, ana meslek artık ozan olmasa da ortak derdin moral katkısını verir. Sunucu görünüm ve katkı yazımında beceriyi doğrular.
- Hizmet kataloğu: Şifacı `yaraBak` ve `kirikSar`, Ozan `turku`, Şifacı `lohusa` (`lohusaBakimi`, şifalı ot + bez girdisi), Ozan `teselli` (`teselli`, gönül etkisi), Hancı `sazGecesi` (`hanci.sazGecesi`, ekmek + çorba; `ortakSahne` sinerjisi), Arabulucu `barisSofrasi` (ekmek + çorba; `barisCorbasi` sinerjisi) ve Aşçı `ziyafet` (un + ekmek + çorba; `baklaYemegi` sinerjisi). Katalog hizmetleri gerçek beceri düğümü/seviyesiyle açılır; hazırlama, stok, ilan, alım ve teslim altyapısı bunları tüketir.
- Demirci `temelDovme` düğümünün `dovme/komur` etkisi, dövme grubu tariflerinde uygulanır. Kanca sayımı artık bu etkiyi bağlı kabul eder.\n- Çiftçi `yaylaGocu` ikinci seviye + Dokumacı `kislikCadir` birinci seviye birlikte öğrenilmişse `yaylaCadiri` sinerjisi çadır tarifinin kalite becerisine +10 ekler; tek düğüm yeterli değildir.
- Regresyon testi, kilit tarifi önizlemesi ve gerçek envanter düşümünü doğrular.

## Kalan kancaların envanteri

14 beceri ağacı dosyasının tamamı tarandı. Şu an mevcut sistem tüketicisi bulunmayan etkiler:
- `hizmet`: 52 kullanımın 18 tanesi gerçek tüketiciye bağlandı (`ikram`, `yatak`, `oda`, `nobet`, `talim`, `vergiSayimi`, `meclisKaydi`, `turku`, `yaraBak`, `kirikSar`, `lohusa`, `teselli`, `sazGecesi`, `barisSofrasi`, `ziyafet`, `araBul`, `muhafizlik`, `mektup`); 34 kullanım kaldı. E4.3-A/B/C tamamlandı; E4.3-D'nin ilk dilimi sunucu/mobil/6 dilde çalışır.
- `hak`: 203 kullanım — makam, lonca, ticaret, garnizon, sosyal yardım ve toplumsal ayrıcalıklar için sunucu tarafı yetki/eylem matrisi gerekir.
- `sinerji`: 21 kullanım — `ortakSahne` sinerjisi `sazGecesi`, `barisCorbasi` sinerjisi `barisSofrasi`, `seckinOda` sinerjisi oyuncu hanındaki has odayı açmak, `barisSansi` sinerjisi NPC arabuluculuğunda +10 şans, `yaylaCadiri` sinerjisi çadır kalite katkısı, `pulZirhAstari` sinerjisi pul zırh kalite katkısı, `ozelPastirma` sinerjisi pastırma kalite katkısı, `kasabaDegirmeni` sinerjisi un kalite katkısı, `hanKirisi` sinerjisi kiriş kalite katkısı, `kopruDemiri` sinerjisi ahşap köprü hakkı, `kagniHarmani` sinerjisi kağnı kalite katkısı ve `baklaYemegi` sinerjisi ziyafet hizmeti için tüketiliyor; 9 kullanım kaldı. Diğer kimliklerin gerçek tüketicileri henüz yok.
- `tasarruf`: 1 kullanım vardı; bu dalda bağlandı.
- `hakAcik(kar, hak)` ve `sinerjiAcik(kar, acar)` ortak sunucu çözümleyicileri eklendi. Sinerji çözümleyicisi hem açan becerinin etkisini hem de diğer meslekteki gerçek düğüm/seviyeyi doğrular. Bunlar altyapıdır; henüz 203 hak ve 9 sinerji tüketicisi açık kalır.

## Uygulama sırası

1. `hak` için tek bir yetki kayıt/çözümleyici kur; istemci düğüm seviyesini yetki kanıtı saymasın. Her eylem sunucuda `hakAcik` üzerinden doğrulansın.
2. `hizmet` için kalan iki taraflı iş akışlarını tamamla; ödeme kaynağı, teslim etkisi, iptal ve itibar akışını doğrula. E4.3-A/B/C tamamlandı.
3. `sinerji` için ortak çözümleyici ve kalan 15 `acar` kimliğinin gerçek tüketicilerini ekle; bir düğümün varlığı tek başına açılma sağlamasın, iki meslekteki seviye koşulu aranmalı.
4. Her bağ için gizli/öğrenilmiş seviye, hesap/hane tekilliği, tekrar güvenliği ve çevrimdışı davranış testleri yaz.

Bu üç sistem, farklı oyun döngülerini etkilediği için tek bir genel bonus yüzdesine indirgenmemelidir.


### 13 Kasım — barisSansi sinerjisi
- Ozan `barisIlahisi` ve Arabulucu `araBulma` düğümleri aynı karakterde öğrenilmişse `sinerjiAcik(ar, "barisSansi")` doğrulanır.
- NPC arabuluculuğunun gerekçeli şans dökümüne ayrı `sans.barisSansi` kalemiyle +10 eklenir; yalnız tek düğüm öğrenilmişse bonus verilmez.
- Mobil şans dökümünde kalem altı dilde açıklanır. Sinerji etkisi birden fazla kez eklenmez.
- GitHub Actions [run #732](https://github.com/Tayma96/kroniklerorj/actions/runs/43306958896): **452 test / 451 geçti / 0 başarısız / 1 atlandı**; mobil TypeScript, çeviri/dil kontrolleri, sunucu TypeScript ve Worker yapılandırma kontrolleri başarılı.


### 13 Kasım — yaylaCadiri sinerjisi
- Çiftçi `yaylaGocu` ve Dokumacı `kislikCadir` düğümleri aynı karakterde öğrenilmişse `cadir` tarifinin kalite becerisine +10 eklenir.
- Yalnız bir düğüm öğrenilmişse katkı oluşmaz; sinerji mevcut sunucu çözümleyicisiyle doğrulanır.
- Regresyon testi Çiftçi `yaylaGocu` ikinci seviye ve Dokumacı `kislikCadir` birinci seviye koşullarını; tek düğüm durumlarını kapsar.


### 13 Kasım — pulZirhAstari sinerjisi
- Dokumacı `zirhAstari` ve Demirci `zirhUstaligi` birinci seviyeleri aynı karakterde öğrenilmişse `pulZirh` tarifinin kalite becerisine +10 eklenir.
- Demirci düğümünün kendi +25 zırh kalite etkisi korunur; sinerji yalnız `pulZirh` tarifine uygulanır, zincir ve kalkan gibi diğer zırh tariflerine yayılmaz.
- Regresyon testi iki düğümün birlikte gerekliliğini, tek düğüm durumlarını ve bonusun tarif kapsamını doğrular.


### 13 Kasım — ozelPastirma sinerjisi
- Aşçı `pastirmaci` üçüncü seviyesi ve Çiftçi `kesimVePost` birinci seviyesi aynı karakterdeyse `pastirma` tarifinin kalite becerisine +10 eklenir.
- Aşçının kendi +20 pastırma kalite etkisi korunur; sinerji yalnız `pastirma` tarifinde geçerlidir, kuru ete veya başka tariflere yayılmaz.
- Regresyon testi iki düğümün birlikte gerekliliğini, tek düğüm durumlarını ve bonusun tarif kapsamını doğrular.


### 13 Kasım — kasabaDegirmeni sinerjisi
- Oduncu `degirmenTasi` ikinci seviyesi ve Aşçı `degirmenUnu` birinci seviyesi aynı karakterdeyse `un` tarifinin kalite becerisine +10 eklenir.
- Aşçının üçüncü seviyedeki kendi +15 un kalite etkisi korunur; sinerji yalnız un tarifine uygulanır.
- Regresyon testi iki düğümün birlikte gerekliliğini, tek düğüm durumlarını ve bonusun tarif kapsamını doğrular.


### 13 Kasım — hanKirisi sinerjisi
- Oduncu `kirisDirek` ikinci seviyesi ve Marangoz `hanInsasi` birinci seviyesi aynı karakterdeyse `kiris` tarifinin kalite becerisine +10 eklenir.
- Sinerji yalnız kiriş üretimine uygulanır; kereste gibi diğer tarifleri etkilemez.
- Regresyon testi iki düğümün birlikte gerekliliğini, tek düğüm durumlarını ve tarif kapsamını doğrular.


### 13 Kasım — üç sinerji tüketicisi daha
- `kopruDemiri`: Marangoz `koprucu` düğümünün açtığı `ahsapKopru` hakkı, Demirci `gelismisAletler` ikinci seviye olmadan kullanılamaz. Hak çözümleyicisi bu özel çapraz koşulu sunucu tarafında doğrular.
- `kagniHarmani`: Çiftçi `topluHarman` üçüncü seviye + Marangoz `tekerlek` birinci seviye kağnı tarifine +10 kalite becerisi verir.
- `baklaYemegi`: Aşçı `senlikZiyafeti` hizmeti, Çiftçi `nadas` birinci seviye sinerjisiyle birlikte açılır; ziyafet un, ekmek ve çorba tüketir, hedefte +8 gönül etkisi verir.
- Üç tüketicinin de tek düğüm/eksik seviye durumları için regresyon testleri eklendi.
- Güncel E4 sinerji sayımı: 12/21 tüketici bağlı, 9 kaldı. CI henüz doğrulanmadı.
