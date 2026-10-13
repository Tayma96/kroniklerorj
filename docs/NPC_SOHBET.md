# Karşılıklı sohbet ve aile profili

NPC profili artık ilk sözü dinleyip ayrılmakla sınırlı değildir. Dert, aile, iş ve hedef
konularında oyuncu dinler, soru sorar veya itiraz eder; ardından gerçek ihtiyaca destek,
dürüst bir sınır veya konuşmayı bitirme seçer. Kişilik ilk karşılığı, aile bağı ve yaş
ihtiyacı değiştirir. Eş kendi evliliğini bekârlık gibi anlatmaz.

## Gerçek eylemler

Eşle baş başa zaman, anne/babayı ziyaret ve seçilen evlatla zaman profilden yapılır.
Karakter ekranındaki mevcut eylemlerle aynı aylık hak ve gerçek bedel kullanılır.
Evlat seçimi en küçük çocuğa yönlendirilmez. Yetişkin evlat kendi karar ve kaygılarını
anlatır; kendisine ait olmayan bir ev veya eş uydurulmaz. Eşin çalışma huyuna bağlı
mevcut yarı bedel iadesi önizlemede de hesaba katılır.

Destek sözü ancak alttaki bakım/hedef eylemi gerçekten gerçekleştiyse yapılmış sayılır.
Para eksikliği ile o ay aileye zaten zaman ayrılması farklı açıklanır. İlk oyuncu
yanıtı kaynak, zar veya ilişki değiştirmez; sonucun küçük sohbet etkisi mevcut aylık
12 olumlu puan sınırını paylaşır. Gerçek bakım kendi eski ödülünü verir, ek ödül verilmez.
Her NPC için ayda tek tamamlanan derin konuşma vardır; sohbetin son karşılığı hatırlanır.

Üç yaş altına sohbet verilmez; 3–6 yaşta oyun/hoşbeş ve küçük bir yakınlık vardır,
yetişkin dert ve iş konuşması yoktur. Daha büyük evlatların çocukluk, ergenlik ve
yetişkinlik sözleri ayrıdır. Yüksek korku/düşük güven özel sözü kapatır; konuşma
açıldıktan sonra korku oluşursa devam da aynı sınıra uyar. Uzak, ölü veya değişmiş
aile bağı, eski ay ve vâris eski konuşmayı devam ettiremez.

## Mobil arayüz ve kayıt

Önce 3–4 bağlama uygun konu görünür, diğerleri tek açılır satırdadır. Konuşma mevcut
profilde devam eder; yeni pencere yoktur. Yanıta kaydırma, 44 px düğmeler, erişilebilir
rol/etiket/kapalı durum, altı dil ve AR/RU nötr kuruluş kullanılır. Aile hakkı kullanıldı
etiketi belirli başka çocuğun veya ebeveynin ziyaret edildiği izlenimini vermez.

`NpcState.konusma` opsiyoneldir; eski kayıt değişmeden okunur. Ara adım ve bitmiş
konuşma kaydedilip tekrar açılır. Vâris mevcut kişisel NPC defteri sıfırlama kuralını
korur. Player/GameState ve MP protokolü değişmemiştir.

## Doğrulama ve açık işler

329 hedefli motor örneği: gerçek evlilik/aile, yaşlar 2/5/9/15/25, üç kişilik, bütün
yanıt yolları, gerçek bedel, ortak ay hakları, reddedilen eylem, korku, geçersiz bağlam,
altı dil ve vâris. Tip, harici bağımlılık ayırmadan paket, göç, dil/anahtar, GDD'nin
on akışı ve üç 30 aylık sentetik tabanı temiz; eski GDD tabanı değiştirilmedi.

15 gerçek profil tarayıcı akışı: altı dil, eş/anne/baba/seçilen evlat/bebek, parasız
hedef ve ölü oyuncu; 320×568, dört kat CPU yavaşlatma, ara/son kayıt tekrar açma,
44 px, yatay taşma ve çalışma hatası yok. Türkçe/Arapça ara konuşma görselleri incelendi.
Web ve Android/Hermes paketleme geçti; fiziksel telefon deneyi veya yeni APK değildir.

30 hayat/19.766 ay: boş %11,7, bunalma %0,2, en çok iki gerilim, ip ödeme %100;
ayna +94,7/−98,4, vâris +43,9/−43,2, 16.650 olay metni temiz. 300 hayat kontrol
noktası bir önceki kalıcı iz dalgasıdır; bu ilk ara motor dalgasıdır.

Torunlar henüz isim/otomatik olay düzeyindedir; sıradaki gerçek kişi, yaş, soy bağı
ve etkileşim işidir. Tam GDD, bütün varlıklar görüşü/LOD, mahkeme ve bağımsız iftira
kanıtı, kayıtlı üretim RNG ve fiziksel cihaz/oyuncu deneyi tamamlanmış sayılmaz.
