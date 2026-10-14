# Evlatların kendi hayatı ve uzaktaki aile bağı

GDD §4.1/§5.2/§6.1: aile üyeleri profil satırından ibaret değildir. Gerçek
yetişkin evlat nüfusun evlilik ve yerleşim akışına katılır. Evlilik/doğum/göç
haberleri gerçek kişilerle kroniğe yazılır; ana akıştaki tek aile haberi ilgili
kişinin profiline gider. Yeni zorunlu pencere veya onay menüsü yoktur.

## Bağımsızlık ve soy bağı

18 yaş altı evlat ve küçük torun ocağında kalır; yetişkin evlat kendi evliliğini
ve yerleşimini kurabilir. Ölüm muafiyeti ile yerinde tutma ayrı kurallardır.
Sonraki `YEDEK_VARIS.md` dalgasıyla reşit evlat gerçek ölüm akışına katılmış,
küçükler korunmuş ve evlat→torun→yeğen→yetişmiş çırak sırası uygulanmıştır.

Oyuncu nüfusta kişi olarak bulunmadığı için farklı öbür ebeveynleri olan
evlatlar eski NPC grafiğinde kardeş görünmeyebiliyordu. Nüfusun evlilik seçimi
gerçek NPC soy bağına ek olarak oyuncunun bilinen aile grubunu da korur:
kardeş/evlat/torun/bilinen yakın arasında evlilik oluşturulmaz. Dışarıdaki
gerçek uygun kişi seçilir; zorla eş veya evlilik yaratılmaz.

Ek aylık torun doğumu da artık gerçek, yaşayan, aynı yerdeki iki 18+ eşe
bağlıdır. Eşlik simetrik, cinsiyet ve doğurganlık yaşları uygun olmalıdır.
Oyuncu ailesine değen yıllık nüfus evliliği ve doğumu da iki kişinin 18 yaşını
tamamlamasını bekler. Nüfusun yıllık doğal doğumu aynı torun listesine gerçek
kimlikle girer. Her iki ebeveynin çocuk tavanı ve aynı yıl doğumu birlikte
denetlenir; önceki eşten sekiz çocuk varken dokuzuncu çocuk açılmaz.
Torun adı doğumda aile adlarıyla ayrılır ve diller arasında sabit kalır.
Yeni evlilik, yeni bebeğin gelişi ve son iki yıldaki eş kaybı aile sohbetinde
farklı söz/ihtiyaç üretir. Bunlar yalnız nüfus kaydındaki gerçek bağdan çıkar.

## Uzak evlada mektup

Yaşayan, yetişkin ve uzaktaki gerçek evlada profilden ücretsiz kervan mektubu
gönderilir. Yerel evlatla vakit ve mektup aynı aylık evlat hakkını paylaşır.
Aynı kişiye bekleyen ikinci mektup yoktur, aynı anda en çok iki mektup yoldadır.
Gönderimde kaynak, ilişki, anı veya XP ödülü verilmez; iki oyun ayı sonra
ulaşınca bağ +3 (100 tavan), gerçek küçük sohbet anısı ve kronik haberi oluşur.
Yükleme/yeniden açma teslim etmez; ödül gerçek ay ilerlemesinde yalnız bir kezdir.
Ölü/eksik/evlat bağı kopmuş muhataba ulaşmaz, ödül vermez. Gerçek takvim veya
oyuna dönmeme cezası yoktur. Vâris atanın kişisel bekleyen mektubunu üstlenmez.

Genel evlatla zaman eylemi artık yalnız aynı yerdeki yaşayan uygun evlatlar
arasından en küçüğünü seçer. Uzakta veya ölü bir evlada oturup bakım yapılmış
gibi anlatmaz. Yerel evlat yoksa düğme durumu bunu açıkça söyler.

## Gerçek yaşta nesil devri

Kayıtlı gerçek kişi her durumda gerçek yaşını korur; çocuğu yok diye yedi yaşa
dönmez. Bilinen yaş, yaşayan eş, evlilik yılı, bulunduğu yer ve kayıtlı uygun
meslek korunur. Meslek geçmişine kayıtsız XP/ustalık uydurulmaz. Evlilik tarihi
yeni oyuncu takvimine yeniden tabanlanır; bilinen beş yıllık evlilik yeni
evlenmiş gibi başlamaz. Önizleme aynı yaş ve mevcut para/puan/itibarı gösterir.

Gerçek kişi kaydı yoksa doğum turu varsa yaşı ondan bulunur. Hiç yaş kaydı yoksa
eski çocukluk başlangıcı sürer; arayüz yaşın kayıtlı olmadığını söyler.
Rahmetli kişi vâris seçilmez. İlk aday rahmetliyse yaşayan evlat seçilir;
yaşayan doğrudan evlat kalmadıysa kimlik tabanlı torun, gerçek yeğen ve
yetişmiş aktif çırak sırası devreye girer. Ayrıntılar `YEDEK_VARIS.md` içindedir.

`child_letters` (en çok iki), `family_news` ve önizleme alanları eklenmiştir.
Yeni Player alanları opsiyoneldir; bozuk kayıt ayıklaması/yeniden yükleme
idempotenttir. Vâris kişisel mektup ve haber alanlarını açıkça sıfırlar.
Haber kaynağı kronik uzunluğu yerine gerçek `q` kimliğidir; eski karta basmak
yeni haberi silmez. Kaynak kırpıldıysa yeni tarih/olay uydurulmaz.
Eski veya yarım kayıtta olay sayacı geçmişteki en büyük `q` değerine yükseltilir;
yeni aile haberi aynı sıra numaralı eski bir olaya yanlış bağlanmaz.

## Doğrulama ve açık işler

75 hedefli senaryo: gerçek yıllık evlilik/göç/doğum, kayıtta ortak NPC ebeveyni
olmayan kardeşlerin korunması, iki aylık teslim/tekrar/kayıt/kaybolan muhatap,
ortak hak, altı dil/iki cinsiyet, 0–65 yaş vâris/meslek/eş/tarih/önizleme,
rahmetli aday/yerel bakım/haber sırası, 18 yaş altı eş koruması, iki ebeveynin
çocuk sınırı ve aylık doğum haberi ile yeni ebeveyn/evlilik/yas sözleri.
99 torun ve 329 sohbet örneği temiz. Eski torun fixture'i gerçek çift şartına,
çocuksuz vâris beklentisi gerçek yaşa göre güncellendi; davranış sınırı gevşetilmedi.

Tip/paket/göç/dil/anahtar, 3.770 kalıcı iz ve 3.850 tavır örneği, MP bayt paritesi
temiz. GDD'nin on akışı ve üç sentetik 30 ay tabanı değişmedi. Bunlar gerçek
oyuncu/telefon kaydı değildir. Son motorla 30 hayat/20.614 ayda boş ay %11,7,
bunalma %0,2, en çok üç açık gerilim, ilk karar bir ay ve çöküş sarmalı %0;
eşikler geçti. Ayna 22. yılda +94,6/−97,8, vâris +41,8/−42,2; 27.780 olay
metni altı dilde temiz. 300 hayat bir önceki dalganın kontrol noktasıdır; bu ilk
ara motor dalgasıdır. Yeni APK veya fiziksel telefon deneyi yoktur.

15 evlat akışı altı dilde 320×568 ve 4× CPU yavaşlatmayla geçti: ana haberden
gerçek ebeveyne geçiş, uzaktaki evlada mektup, kayıt sonrası bekleme, iki oyun
ayı sonra tek teslim, gerçek 30 yaş/meslek/eş/şehirle vâris ve ölü aday kilidi.
12 torun ve 15 aile sohbeti akışı aynı son paketle yeniden temiz geçti. Dokunma
hedefleri en az 44 px, yatay taşma ve çalışma zamanı hatası yok. Festival karar
perdesi açıksa oyuncu gibi önce karar çözüldü; arka plandaki habere yapay basış
yapılmadı. Web ve Android/Hermes paketleme geçti.

Tam soy ağacı ve uzak soy rolleri, dünya takviminin bütün ekranlarda nesiller
boyu sürekliliği, NPC→oyuncu tüm kişisel geçmiş/portre aktarımı, çok varlıklı
görüş/LOD, gerçek mahkeme/iftira, kayıtlı üretim RNG ve diğer GDD işleri açıktır.
