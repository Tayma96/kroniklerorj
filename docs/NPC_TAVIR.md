# Güven ve korku ayrı izler — 13 Ekim 2026

GDD §4.1 ve §5.4 doğrultusunda kişinin oyuncuyla yaşadığı olaylar altı ayrı boyutta tutulur:
güven, saygı, korku, yakınlık, iyilik borcu ve şüphe. Eski tek ilişki toplamı ve dökümü korunur.
Bu yeni ayrım konuşmada gerçek sonuç üretir: korkusu en az 20, güveni 5'ten az olan yaşayan,
yerel 13+ kişi aile, dert ve hayal konularını açmaz. Oyuncu da en az 13 yaşında olmalıdır.
Ay kilidi işler; bu cevap kaynak, XP, ilişki veya tur kazandırmaz. Tekrarlamak korkuyu silmez.

Gerçek motor deneyi: iki gözdağına şahit olan çekingen NPC'nin önceki sıcak tabanı 80'dir.
Hediye sonrası toplam ilişki hâlâ +66, ama güven −13/korku 28. Özel konu kapanır. Kabul edilmiş
helallik sonrası güven 0/korku 11 olur ve özel konuşma yeniden açılabilir. Bu iki eylem tek
puan artışı olarak değerlendirilmez. Görgü anısı başkasına yardım edildiğini gösterdiğinde
şahit kendisi yardım almış gibi kişisel iyilik borcu yüklenmez.

## Artımlı defter ve eski kayıt

`NpcState.bakis` opsiyonel, sürümlü ve altı toplamdan oluşur. Kişilik anının yükünü zaten
değiştirir; altı boyut o yük, olay türü ve bilginin kesinliğinden türer. Anı eklenince katkısı
eklenir; 24 anı tavanında çıkarılanın katkısı silinir. Mevcut aylık unutma turunda eski katkı
çıkarılıp yeni katkı eklenir. Helallik, diyet, hakem kararına boyun eğme ve can bağışı gibi
ağırlık değişimleri de aynı defteri günceller. Oyuncu nesli değişince mevcut NPC durumu sıfırlanır.

Defterin toplamları erken kesilmez: 100'ü aşan korkunun bir kısmı hafifleyince yanlışlıkla
yarıya düşmüş görünmez. Sınırlar yalnız okunan görünümde uygulanır. Defter varsa okuma altı
değere erişir; anı listesini yeniden taramaz. Eski veya bozuk defterde en çok 24 anıdan saf
okuma yapılır; ilk motor yazımında defter başlatılır. Okuma, eski kaydı gizlice değiştirmez.

Bu katman yalnız NPC → oyuncu kişisel anılarını kapsar. Genel nam, aile/dost tepkisi ve
söylentiler mevcut ilişki hesabında ayrı kalır; altı boyuta hayali bilgi olarak eklenmez.
Eski tek puan hesabı hâlâ kendi anı dökümünü tarar. Bütün varlıklar arasındaki görüşün
artımlı olması, eski anının kalıcı izlenime dönüşmesi ve LOD bu dalgada tamamlanmış sayılmaz.

## Mobil görünüm

Profilde baskın tavır tek cümleyle görünür. Mevcut Neden bağlantısı açıldığında altı boyut
ve yalnız kişisel anıyı anlattığını belirten kısa açıklama gösterilir; yeni menü yoktur.
İyilik borcu bir para alacağı değildir. Döküm düğmesi ve konuşma seçenekleri en az 44 px
tanımlar; rol, etiket ve kapalı durumları aktarılır. Altı dil; yeni AR/RU metinleri nötrdür.
Tema renkleri/yazıları mevcut jetonlardan alınır. Oyuncu/NPC görselleri değiştirilmedi.

## Kanıt ve sınırlar

- `bakis-check.cjs`: 3.850 senaryo. Tüm anı türleri/kanıtlar, 30 × 120 karışık ekleme-sönme-
  hafifletme, budama, travma, erken doyma, eski/bozuk defter, saf ve taramasız okuma, gerçek
  gözdağı/hediye/helallik/konuşma, vâris ve altı dil/iki oyuncu cinsiyeti.
- Önceki 10.798 hafıza, 1.666 söylenti, 1.246 şahit, 534 karşı söz ve 37 iş fırsatı senaryosu temiz.
- Gerçek profil bileşeni ve oyun motoruyla 12 akış: altı dil × korkulu/helalleşmiş kişi.
  Baskın tavır, döküm, özel konuşmanın kapanması/açılması, kaynak değişmezliği ve ay kilidi
  doğrulandı. Cihaz bileşenleri taklit edildi; bu görsel yerleşim veya fiziksel telefon testi değildir.
- Eski durum şekli karşılaştırmasında yalnız yeni `bakis` alanı ayrıldığında 10 GDD akışı ve
  üç sentetik kaydın 30 aylık hash'leri aynı. Ham taban yalnız sohbetin ek defter alanı nedeniyle
  güncellendi; diğer dokuz akış ve üç 30 aylık örnek aynı. Gerçek kullanıcı altın kaydı yoktur.
- 30 hayat/19.823 ay: boş ay %11,3; bunalma %0,3; açık gerilim en çok üç; ilk karar medyan
  bir ay; kader ipi ödeme %100. Oynanış eşikleri temiz. Bu genel sim yeni kapalı konuşmanın
  görülme sıklığı veya gerçek oyuncunun keyfini ölçmez.
- Karakter aynası 12 hayat: yardımsever +96,6/zalim −98,9; vâris +43,3/−42,8. Yardımseverde
  158 dost/0 hasım, zalimde 0 dost/155 hasım. 16.728 olay yazımı temiz.
- Tip, dış bağımlılık bırakmayan motor paketi, göç, i18n/karışık dil, MP paritesi, web ve
  Android/Hermes paketleme geçti. Yerel tarayıcı bağlantısı
  önceki izin profilinde engellendi; bileşen deneyi bunu fiziksel ekran testi diye gizlemez.
  300 hayat kontrol noktasından sonra üçüncü motor dalgası; geniş denetim bir sonraki
  kadans noktasında veya APK öncesinde gerekir. APK tetiklenmedi.

Tam GDD hedefi açık: izlenim/LOD, bütün varlıklar arasında görüş, çok turlu tonlu konuşma,
bağımsız iftira kanıtı/mahkeme, kayıtlı üretim RNG ve gerçek cihaz/oyuncu doğrulaması.
