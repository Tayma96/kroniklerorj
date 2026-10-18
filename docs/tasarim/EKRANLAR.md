# Kronikler — ekran ve NPC sanat yönü

> Durum: ilk uyarlama kullanıcı tarafından reddedildi. Son şart yalnız üç referans
> ekranla birebir eşleşen uygulamadır. [Yeni deneme](duzeltme-v2/README.md) de bu
> hedefi karşılamadığı için uygulamaya alınmadı. Bu belge bitiş/onay kaydı değildir.

Kullanıcı 18 Ekim 2026'da seçilen iyileştirme sırasını ve sayfa taslaklarına göre tasarım
çalışmasını yetkilendirdi. Claude GDD'si bütünüyle kabul edilmedi; mevcut Tasarım
Pusulası geçerlidir. Mülk tavanı, otomatik gelir kesintisi, sistem dondurma uygulanmaz.

Görsel taslak: [üç ekran](ekran-taslaklari-v1.png). Bu resim tasarım referansıdır;
uygulamanın ekran görüntüsü değildir. Resimdeki örnek kişi öyküleri/sayılar oyun verisi
sayılmaz. Uygulamada yalnız gerçek kayıt, mevcut takvim, ilişkiler ve eylemler kullanılır.

## Ortak görünüm

Koyu kahverengi parşömen, sıcak Anadolu ışığı, sınırlı pirinç-altın vurgusu. Başlıklarda
Cinzel; açıklama/olaylarda Crimson Text. Gövde 15–16, etiket 13, ikincil yazı en az12;
karar bedeli ve sonucu ikincil yazıya saklanmaz. Küçük ekranlarda tek/iki sütun;
dokunma en az44. Sistem yazı büyütmesi kapatılmaz. Sayfa başlığı, durum, ana karar ve
ayrıntı sırası korunur. Doku metnin arkasında kısık; resim ağırlıkla üst sahnededir.

## Ekran aileleri

| Aile | Düzen ve korunacak bilgi |
|---|---|
| Ana ekran | Yaş/mevsim sahnesi, kişi ve gerçek dört gösterge; aylık karar; acil insan/savaş/elçilik uyarısı; son üç gelişme; tam deftere bağlantı. İç içe günlük kaydırması yok. |
| NPC profili | Kalıcı yaş/yüz kimliği ve meslek ortamı; gerçek ad/yaş/meslek/ruh hâli ve ilişki. Sonra tanıma ve konuşma. Uydurma yaşam öyküsü yazılmaz. |
| Şehir | Mekân sahnesi; gerçek yerel durum; iki sütun rota kartları; sivil yardım/ambar; ayrıntılar aşağıda. |
| Meslek/pazar/mülk/ordu | Ortak başlık ve okunur işlem kartları; bedel, şart ve sonuç birlikte. Var olan mekanik ve ekonomi kapıları korunur. |
| Hanedan/diplomasi | Devlet/kişi kimliği; yürürlükteki sözler; seçili tek hedef ve işlem; devam eden yükümlülükler açık. |
| Defter | Tam günlük filtreleri; tarih, roman ve hanedan kaydı erişilebilir. Etkileşimli Hikâyeler ve Divan ayrı deneyim olarak kalır. |
| Ayarlar/yardım | Tek sütun, açık etiketler, büyük dokunma alanları; ses/titreşim/sade mod korunur. |

## NPC kimliği, meslek, ruh hâli

Mevcut yaş/yüz ailesi korunur: kişi meslek değiştirince başka bir yüze dönüşmez.
Reddedilen yüz/gövde montajı `509b9a5` ile çalışma zamanından kaldırıldı. Mevcut
uygulama bütün portre ve meslek ortamını ayrı gösterir; 36 gövde/duruş atlası artık
ekranda kullanılmaz. Meslek ve ruh hâline göre bütüncül sahne seti tamamlanmış değildir.
Yeni denemede yalnız k07/olgun/demirci için tek bütüncül sahne üretildi; bu sahne de
birebir kabul hedefini karşılamayan denemeyle birlikte uygulamanın dışında tutulur.

## Kabul

320/390 genişlik, uzun ad, çocuk/yetişkin/yaşlı, erkek/kadın, ruh hâli/meslek değişimi,
altı dil ve büyük yazı. Tarayıcı denemesi gerçek Android/Hermes veya fiziksel cihaz
kabulünün karşılığı değildir. Aylık karar/risk/fırsat sonucu kayıtta, çift uygulama ve
hızlı ilerleme kapıları hedefli kontrol edilir. Her tamamlanan parça ayrı pushlanır.

## Bütün sayfalar

42 gerçek sayfanın tasarım envanteri `mobile/lib/screen-design.ts` içindedir.
[Tüm sayfa düzenleri ve önizleme galerisi](GALERI.md) tarayıcıda çekilmiş örnek
kayıtları gösterir. Bunlar Android ekran görüntüsü değildir. `PageHeader` sahneyi
rotadan seçer; başlık/açıklama yerel metindir, resme basılmamıştır. Kartlar çift
pirinç çizgili parşömen, köşeler 4–5; metin resmin üstünde karartmayla ayrılır.
Ana ekran/NPC/şehir, mülk afişi, harita ve açılış kendi sahne düzenini korur.
Alt menüde ay ilerletme için 76 piksel yer bırakılır; etiketler en az12 ve sarılır.
Çalışma seçenekleri kaydırmadadır; ölümde vâris/ocak eylemleri kişi kartının hemen
ardındadır. Savaş ve gelen diplomasi uyarıları aylık kararın ardından gelir.
Şehir güvenliği `asayisOf`, refahı `cityFx` kullanır; hasar/yerel olay/NPC hizmetleriyle
aynı kaynaktan değişir. Nüfus künyesi dünyanın makro nüfusudur; ekonomi kartındaki
isimli sakin/işgücü sayısıyla karıştırılmaz.

## Önizlemeyi yeniden üretme

Ürün bağımlılıklarına tarayıcı paketi eklenmez. İsteğe bağlı masaüstü kontrolü:

```sh
npm install --prefix /tmp/kronikler-webview react@19.2.3 react-dom@19.2.3 react-native-web@0.21.2 playwright@1.62.1 --no-audit --no-fund
cd mobile
npm run design:check
npm run design:preview
python3 -m http.server 8765 --directory /tmp/kronikler-webview/public
```

Başka terminalde `WIDTH=320 npm run design:gallery` veya `WIDTH=390 npm run design:gallery`.
`CHROMIUM_PATH` kurulu Chromium yoludur; varsayılan `/usr/bin/chromium`.
`KRONIKLER_PREVIEW_DEPS`, `KRONIKLER_PREVIEW_URL` yolları değiştirilebilir.
Tarayıcıda `?screen=/oyun/diplomasi&state=ruler&lang=ar` gibi bir adres açılır.
`state=child|ruler|dead|war|decision`, `long=1`, `reduce=1` desteklenir.
Adaptör ses/titreşim/Skia/saklama/ağ işlemlerini devre dışı bırakır; sekme kabuğunu
basitçe taklit eder. Gerçek sayfa bileşenleri, yerel resimler ve motorun örnek kaydı
kullanılır. Bu araç oyunun başka bir sürümü veya sunucusu değildir.
