# NPC'nin kalıcı izlenimi

GDD §4.1: olay ayrıntısının unutulması, kişiyle geçmişin bütünüyle silinmesi değildir. Kişisel anı
24 ayrıntıyla sınırlı kalır; doğal sönme veya kapasite budaması sırasında küçük bir kalıcı özete geçer.
Özet gerçek görüşe (`gorus/relWith`), yakınların görüşüne ve altı boyutlu kişisel tavra katılır.

## Oynanış

- Yardım ve kırgınlığın ayrıntıları zamanla silinebilir. Profilde en belirgin canlı anı varsa o konuşulur;
  yoksa yeterince güçlü kalıcı iz mevcut Geçmişi konuş yüzeyini doldurur. Yeni menü yok.
- Katılım, görgü, duyum ve eski belirsiz kayıt başka cümleler kullanır. Görgü sahibi kişisel iyilik borcu
  kazanmaz. Duyum kendi gözüyle görülmüş diye anlatılmaz.
- Özet tarih, olay kimliği, kaynak zinciri ve şahit listesi tutmaz. Şahit açıklaması ve tanışığın iş
  teklifinin gerektirdiği gerçek olay anısını karşılamaz. Özet yeni söylenti üretmez.
- İz konuşması ay kilitli, kaynak/XP/ilişki ödülsüzdür. Kayıt sonrası tekrar açmak kilidi kaldırmaz.
- Helallik, can bağışı ve diyet mevcut koşullarında anı ile birlikte kalıcı kırgınlığı da hafifletir.
  Yeni hediyeler eski tehdidi otomatik bağışlatmaz.

## Sınırlar ve geçiş

Dört tema (can, söz, iyilik, hatır) × iki yön × kendi/dolaylı deneyim = **en çok 16 özet**.
Her hücrede yalnız en güçlü kesinlik ağırlıklı iz kalır. Aynı temada tekrar, eski izleri sonsuza dek
üst üste eklemez. Sıradan hoşbeş/iltifat/geçici rahatsızlık kalıcı sadakat üretmez.
Travmasız iz ilk gerçek kişilik ağırlıklı yükün %20'si (en çok 6), travma özeti %60'ı (en çok 30).
Travma ayrıntısı doğal olarak kaybolmaz; 24 ayrıntının tümü travmaysa en eski kayıt özetlenebilir.
Özetin genel görüş katkısı −40…+40, altı boyutta okuma mevcut −100…+100/0…100 sınırlarını kullanır.
Ara toplam defteri anı değişiminde, sıkıştırmada ve helallikte artımlı güncellenir; her okuma eski olay
listesini yeniden taramaz. Genel tek sayı görüşün eski anı gruplama yöntemi ayrıca durmaktadır.

`Memory.izYuku` ve `NpcState.izlenim` opsiyoneldir. Eski anıya ilk motor yazımında mevcut yükünden taban
çıkarılır; geçmişte daha güçlü bir olay varsayılmaz. Saf okuma kaydı değiştirmez. Eski doğrudan
`addMemory/decayMemories` çağrısı özet defteri verilmediyse eski imzayı/davranışı korur.
Vârisin kişisel NPC defteri sıfırlanır; mevcut nesil hesabı doğrudan geçmiş + kalıcı iz + önceki ata
hatırasını yarılar. Aile dışındaki yaşayanlarda eşik ve ±40 tavanı aynı kalır. Atanın iyilik borcu
vârisin şahsi borcu gibi devredilmez; vâris önizlemesinin para/itibar/puan hesabı değişmez.

## Denetim

`izlenim-check.cjs`: 3.770 hedefli senaryo; tüm anı türleri × üç kişilik × dört bilgi kaynağı,
800 aylık sönme, karışık ekleme/budama/helallik, altı defterin yeniden hesapla eşitliği, 24+16 sınırı,
sıradan sohbet ve tekrar getirisi, travma sıkıştırması, eski/belirsiz kayıt, gerçek görüş/konuşma/ay
kilidi, altı dil/iki cinsiyet ve vâris. Tek yardımın 25 yükünden 5 görüş izi kalır; özet 73 bayttır.
Bu tek örneğin boyutu bütün kasabanın kayıt veya düşük bellekli telefon bütçesi değildir.

Önceki 3.850 tavır/10.798 hafıza/1.666 söylenti/1.246 şahit/534 karşı söz/37 iş örneği temiz.
Yeni özet ve taban alanlarını ayırınca eski on akış/üç sentetik 30 ay hash'i aynıdır. Ham tabanın yalnız
sohbet hash'i yeni alanlar nedeniyle değişmiştir; karşılaştırma sonrası yeniden kaydedildi.
Bu sentetik taban gerçek oyuncu kaydı değildir. Yeni metinler altı dil, AR/RU cinsiyet-nötrdür.

Tam NPC → bütün varlıklar vektörü, LOD, gerçek mahkeme şahitliği ve çok turlu tonlu konuşma bu değişikliğin
kapsamını aşar. Bunlar tamamlanmış sayılmaz. Fiziksel telefon/oyuncu deneyi ayrıca gereklidir.

Doğrulama tamamlandı: 300 hayat HATA:0 (son motor görüntüsü, 7,0 dk; ölüm medyanı 64, 23–74).
30 hayat/21.198 ay: boş %11,4, bunalma %0,3, en çok iki gerilim; üç ip sınırı/ödeme %100 ve
diğer oynanış eşikleri temiz. Ayna +97,8/−97,8, vâris +44,4/−43,1; 16.494 olay yazımı temiz.
Sekiz gerçek küçük ekran tarayıcı akışı: altı dil ve TR/AR kırgınlık, 320×568/4× CPU, 44 px,
ödülsüz konuşma/ay kilidi, kayıt sonrası açma, tarih/şahit uydurma yok; yatay taşma/çalışma hatası yok.
Testte unutma hızılandırıldı; bu görsel akış 800 oyun ayını telefonda oynama iddiası değildir.
Web ve Android/Hermes paketleme geçti. Fiziksel telefon/oyuncu deneyi ve APK yok.
