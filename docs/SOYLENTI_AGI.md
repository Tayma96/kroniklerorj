# Söylentinin yolu — 12 Ekim 2026

GDD §4.1'in kişi ağı, kaynak zinciri ve gerçek/bilinen ayrımı uygulandı. Yeni söylenti önce yalnız
onu çıkaran kişide bulunur. Her ay yaşayan 13+ kişilerin bugünkü yerleşim, aile, dost/hasım ve meslek
bağları üzerinden aktarılır. Aynı yerleşimin çarşı ve iş temasları seyrek halkalarla yaklaştırılır;
gerçek sokak/komşuluk konum verisi yoktur. Uzak bağ anında haber taşımaz; kişi göç ederse duyduğu
söz yanında kalır ve yeni yerindeki bağlarına aktarabilir.

Sözü duymayan kişiye söylenti görüş kalemi yazılmaz. İlk anlatıcının kendi anısı ayrıca hesaplandığı
için ona aynı söylenti ikinci kez yüklenmez. Duyanların görüş etkisi kesinlik × anlatım büyümesiyle
ölçeklenir; mevcut kişilik ve dostluk ağırlıkları korunur. Dost yalnız gerçekten duyduğu kötü söze
karşı çıkabilir. Eski, ağ alanı bulunmayan söylenti bölgesel davranışını korur; uydurma geçmiş zinciri
oluşturulmaz. Vâris devrinde oyuncuya ait söylentiler ve konuşma kilitleri mevcut boşaltmayla sıfırlanır.

## Uygulamadaki tasarım kararları

- **Yeni duyan önce konuşsun:** en yeni eski-ay duyumları önceliklidir. Sürekli ilk anlatıcıya öncelik
  vermek ağı onun yakın çevresine sıkıştırıyordu. Bu ay duyan, gelecek aydan önce aktarmaz.
- **Yüzde yerine kişinin sözü:** profilin Kaynağını sor konuşması son aktaranı ve temkinli/uzak duyumu
  açıklar. Oyuncuya gizli kesinlik yüzdesi veya tüm kişilerin kaynak yolları dökülmez. Aynı kişiyle
  ayda bir sorgu yapılabilir; para, ilişki, XP ve tur ödülü yoktur. Kronikte kaynak açıklaması altı
  dilde yeniden çözülür; söylentinin ayrıntılı alıntısı anlık konuşmada gösterilir.
- **Kişiliğe bağlı aktarım:** ilkeli/sabırlı kişi daha seyrek ve daha az kesinlik kaybıyla aktarır;
  kurnaz/hırslı/kibirli/aceleci daha sık, daha fazla büyüterek aktarır. Mevcut farklı söylenti
  cümleleri, bu aktarıcılardan geçerken değişebilir. Tek varyantlı türde yeni olgu uydurulmaz.
- **Ölçülü müdahale:** aynı söylentiye yüzleş/yay/sustur ayda toplam bir kez. Başarısız yüzleşme
  art arda basılarak garanti başarıya çevrilemez. Olumlu sözü yaymanın ömürlük tek kullanımı korunur.
- **Sınırlı maliyet:** 12 söylenti × 48 duyan; en çok üç aktarım, ayda söylenti başına sekiz yeni
  duyan/24 zar yoklaması, anlatıcı başına iki yeni duyan. Aynı kişi ve zincir halkası tekrar eklenmez.

Sosyal ekrandaki kişi sayısı sistemin yayılım özetidir; oyuncunun herkesi sorguladığını göstermez.
NPC profilinde ise yalnız o kişinin gerçekten bildiği bir konu açılır. Butonlar 44 px; altı dil.

## Sınırlar

GDD bütünü tamamlanmış değildir. Canlı üç tanıklı olay sonraki dalgada bağlandı (`SAHITLER.md`); altı boyutlu artımlı görüş, izlenim/LOD,
çok turlu tonlu sohbet açık. Şahit açıklaması sonraki dalgada bağlandı (`KARSI_SOZ.md`): yeni ağda
yüzleşme/susturma yalnız ilk kaynağı susturur; dost savunması yalnız dostun duyumunu değiştirir.
Gerçek olayın abartısı kişi kişi düzeltilir; eski ağsız söylentinin topluca kaldırılması korunur.
Asılsız iftirayı bağımsız kanıtla çürütme ve mahkemede şahit kullanımı hâlâ açık.
Kaynak sorgusu doğruluğu kanıtlamaz. Üretim RNG hâlâ kayda alınmaz.

## Doğrulama

Hedefli 1.666 senaryo: üç halkalı zincir, kesinlik/anlatım/varyant değişimi, yinelenme ve işlem
sınırları, ay kilitleri, duyulmayan kişi, ilk kaynak, eski kayıt, vâris, altı dil/iki oyuncu cinsiyeti.
200 yoğun ağ × sekiz ay sınırlı işlem yükü. Aylık oyun motoruna bağlı yayılım ayrıca denetlendi.
10 mevcut GDD davranış hash'i ve üç sentetik kayıt × 30 ay değişmedi; bunlar yeni yayılım kabulünün
yerine geçmez. Tip, paket, göç ve iki dil denetçisi temiz. Fiziksel cihaz/gerçek oyuncu altın kaydı yok.
300 hayatlık geniş denetim bu ara dalgada tekrarlanmadı; depo kadansına göre sonraki kontrol noktasında.

Altı dilde 320×568 / dört kat yavaşlatılmış tarayıcıda gerçek motorun üç aylık yayılımı → kaynak
sorusu → ay kilidi oynandı; kaynak ve belirsizlik metni okunuyor, oyuncu/ilişki/tur değişmiyor,
tarayıcı hatası yok. 12 hayatlık karakter aynasında yardımsever +97,1 / zalim −96,3; vâris
bakışı +43,8 / −42,2. 30 hayat / 18.569 ay: boş ay %11,8, 3+ pencere %0,2, en çok iki açık
gerilim; oynanış eşikleri temiz. 16.578 olay metni altı dilde temiz. Android/Hermes paketleme geçti.
