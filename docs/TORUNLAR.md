# Gerçek torunlar ve aile sürekliliği

Torunların önceki isim listesi korunur. Yeni torun nüfusta kimlik, doğum yılı,
cinsiyet, yerleşim ve gerçek evlat üzerinden ebeveyn bağı taşıyan kişidir. Aile
ve hanedan ekranından profiline gidilir; portresi aynı kimlikle yaşlanır.

## Doğum ve yaş

Ek aylık doğum 52 yaş sonrası olasılık ve sekiz torun sınırını kullanır.
`EVLAT_YOLU.md` sonrası doğum gerçek aynı yerdeki iki yaşayan 18+ eşe bağlıdır;
kadında 44, erkekte 60 yaş üst sınırdır. Nüfusun doğal yıllık doğumu da gerçek
torun kaydı oluşturur; o toplam sekiz sınırına bağlı değildir. Aynı ebeveynden
aynı dünya yılında tekrar ek doğum olmaz; ebeveyn başına sekiz çocuk sınırı
vardır. Son evlat dalgasıyla sınır iki ebeveyn için birlikte uygulanır; önceki
eşten sekiz çocuğu olan kişiyle dokuzuncu doğum açılmaz. Oyuncu ailesine değen
yıllık evlilik/doğum da iki eşin 18 yaşını tamamlamasını bekler. Adlar
evlat/torun adlarıyla ayrılır, nüfus kimliği birincil anahtardır.
Yerleşim ebeveynin yerleşimidir.

İki ebeveynin gerçek bağı kurulur. Eş, evlilik veya ikinci ebeveyn uydurulmaz.
Yetişkin evlatların nüfus evlilik ve yerleşim akışına katılması sonraki
`EVLAT_YOLU.md` dalgasında uygulanmıştır.

Nüfusta önceden var olan gerçek evlat→çocuk bağı göçte/okumada tanınır. Eski
yalnız-ad kayıtlarına doğum yılı, cinsiyet, portre veya ebeveyn atanmaz. Aynı
adlı ikinci eski kayıt da kaybolmaz. Arayüz bu kişilerde yalnız adın bilindiğini
söyler; gerçek profil düğmesi sunmaz. Nesil devrinde eski adlar atanın defterinde
saklanıp gösterilir. Bilinen kişilerin kayıtları nüfus budamasında korunur.

## Oynanış

Bebek bakımında ailesine yardım, küçük çocukta avlu oyunu, mektep yaşında birlikte
öğrenme, gençte istediği yolu dinleme, yetişkinde kendi karar ve kaygılarını
konuşma vardır. Profil ve derin sohbet aynı aylık tek toruna zaman hakkını
kullanır. Bağ +4 (100 tavan), gerçek küçük anı ve akrabalık görüşü vardır;
para/XP/tur verilmez. Ölü, uzak veya zindandaki oyuncu bakım yapamaz.

Yaşa uygun aile sözü karşılıklı sohbeti kullanır; soru sonrası torunun ihtiyacı
anne-baba/evlat sözünden farklıdır. Bebek yetişkin konuşması yapmaz. Otomatik
torun anları yalnız gerçek yaşayan yerel 4+ kişide olur; 7 yaş altına ata binme,
yetişkine ilk ata binme/çocuk masalı verilmez. Küçük torunlar mevcut evlat ölüm
muafiyetini paylaşır, yetişkin torunun gerçek ölümünde aile haberi gelir.

Torun ve devredilen bilinen kan akrabaları flört/evlilik adayı olmaz. Profilde
bu kişilere evlilik teklifi satırı da gösterilmez. Diğer aile kollarında detaylı
yeğen/kuzen rolü henüz yoktur; genel kan akrabası etiketi vardır.

## Nesil devri

Kayıtlı gerçek kişi vâris her durumda kendi gerçek yaşından başlar. Nüfustaki çocuklar
aynı kimlik/yaş/öbür ebeveynle yeni oyuncunun evlatları olur; doğum turu yeni
takvime yeniden tabanlanır. Gerçek eşi varsa evlilik bağı korunur. Vârisin
nüfusta kendi kopyası silinir, oyuncuya ait çocuk/eş alanları aynı kişileri
işaret eder. Diğer aile kolundaki torunlar ve bilinen eski yakınlar kan akrabası
kalır. Kişisel anı/konuşma ve aylık bakım hakkı atadan taşınmaz.

`EVLAT_YOLU.md` sonrası çocuksuz kişinin yaşı da korunur. Kişi kaydı yoksa
doğum turu kullanılır; hiç yaş kaydı yoksa eski çocukluk başlangıcı sürer ve
kayıt eksikliği ekranda söylenir. Yeğen/çırak adayları ve tam soy ağacı ayrı
açık GDD işleridir. Önizleme gerçek yaş/çocuk sayısı ve mevcut puan/para/itibar
hesabını aynı kaynakla gösterir. Aşağıdaki denetim sonuçları ilk torun dalgasının
kendi kapsamına aittir; güncel ek doğrulama EVLAT_YOLU içindedir.

## Doğrulama

99 hedefli motor senaryosu: gerçek doğum/nüfus tutarlılığı, yaş/cinsiyet/dil,
her bakım aşaması, ortak ay hakkı, yaşa göre karşılıklı söz, uzaklık/ölüm/zindan,
eski ve bozuk kayıt, gerçek yaş/çocuk/eş/diğer aile kolu/vâris paritesi.
329 sohbet, 3.770 kalıcı iz ve 3.850 tavır örneği temiz. Tip, paket, göç,
altı dil/anahtar ve MP bayt paritesi temiz.

GDD tabanında dokuz akış ve üç sentetik 30 ay değişmedi. Vâris hash'inin
değişmesi eski motorla ayrıca karşılaştırıldı: yalnız üç bilinen akraba kimliği
ve sıfır tanışıklık hesabı eklendi; o örnekte yaş/para/itibar/nüfus/RNG aynı.
Taban bu kanıttan sonra güncellendi; gerçek oyuncu kaydı değildir.

Fiziksel telefon/oyuncu deneyi ve yeni APK bu çalışmanın doğrulaması değildir.
Tam GDD; bütün varlıklar görüşü/LOD, gerçek mahkeme/iftira kanıtı, kayıtlı üretim
RNG, daha derin meslek/okul/yol döngüleri ve tam soy ağacı hâlâ açıktır.

Son motor anlık görüntüsüyle 300 hayat: HATA:0, 6,0 dk; ölüm medyan 64
(14–74). 30 hayat/20.534 ay: boş %11,6, bunalma %0,2, en çok iki gerilim,
üç ip/ödeme %100, oynanış eşikleri temiz. Ayna +96,1/−97,8, vâris
+43,4/−43; 41.682 olay metni temiz. Bu dalga yeni geniş kontrol noktasıdır.

12 gerçek tarayıcı akışı kontrollü motor kayıtlarıyla: altı dil, 320×568,
dört kat CPU yavaşlatma, aileden gerçek profile geçiş, bebek/oyun/genç/yetişkin,
ara/son sohbet kaydı, aylık ortak hak, uzak kişi ve eski bilinmeyen adlar,
gerçek 45 yaş vâris/15 yaş evlat/aynı kimlik ve atada eski adların saklanması.
44 px, yatay taşma ve çalışma hatası yok; TR/AR yerleşim görselleri incelendi.
Web ve Android/Hermes paketleme geçti. İlk ekran denemesindeki yerel sunucu
kesintisinden sonra sabit son paket ve yeniden açılan sunucuyla tam akış tekrarlandı.

Son paketle önceki 15 aile sohbeti tarayıcı akışı da yeniden temiz geçti.
