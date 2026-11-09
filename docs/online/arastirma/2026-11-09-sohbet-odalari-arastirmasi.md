# Sohbet odası uygulamaları araştırması → Han ve Debdebe

> Tarih: 9 Kasım 2026. Durum: **[ÖNERİ]** — GDD'yi değiştirmez; karar Berkay'ındır.
> Dayanak: GDD §16, §17 başı, §19, §23 (D-15, D-18, D-19, D-24, D-25), `TASARIM_PUSULASI.md`, Y1 yönetim çekirdeği (`online-server/README.md` "Yönetim").
>
> **Yöntem ve güven notu:** Oturumda sayfa getirme (WebFetch) ağ kuralına takıldı (apps.apple.com, topuplist.com çözülmedi).
> Bulgular web araması özetlerinden derlendi; kaynakların çoğu mağaza sayfası, üçüncü taraf rehber, satıcı blogu ya da
> şikâyet sitesi. Sayısal eşikler **doğrulanmamış** sayılmalı; desenler ise kaynaklar arasında tutarlı.

## 1. Kısa özet

1. Sesli oda uygulamalarının ortak iskeleti aynı: **oda sahibi + yöneticiler + 8–15 mikrofon koltuğu + dinleyiciler**; koltuk sahne, dinleyici seyircidir.
2. Gelirin çekirdeği **hediye**: coin alınır, animasyonlu hediye gönderilir; alıcı (host) "elmas" biriktirip çoğu zaman **nakde çevirir**. Bu bizde yasak (§19).
3. Statü iki eksende ölçülür: **zenginlik seviyesi** (gönderdiğin) ve **çekicilik seviyesi** (aldığın). Üstüne aylık **VIP/soyluluk (noble)** aboneliği gelir.
4. Harcamanın görünür yüzeyleri standart: **giriş efekti, binek (araç) animasyonu, profil çerçevesi, rozet, sohbet balonu, mikrofon dalgası, oda teması**.
5. **Sıralamalar** (günlük/haftalık en çok veren, en çok alan, en popüler oda) ve **PK** (iki oda/host arasında süreli hediye yarışı) harcamayı yarışmaya çevirir.
6. **Aile/klan** ve **ajans** yapıları aidiyet kurar; ajanslar host çalıştırır ve kullanıcıyı harcamaya yönlendiren "oda yöneticisi" baskısı bildirilmiştir.
7. En sorunlu desen **şanslı hediye / çark / şans kutusu**: harcanan coinin rastgele çarpanla geri dönmesi. Mağazalarda "Simulated Gambling" etiketi ve oran açıklama zorunluluğu doğuruyor.
8. Düzenleme sertleşiyor: Çin 2022'de reşit olmayanın hediye göndermesini yasakladı, 2025'te büyük bahşişe görünürlük veren sıralamaları hedef aldı; Brezilya ECA Digital (Mart 2026) reşit olmayana açık oyunda paralı kutuyu yasakladı; AB CPC gerçek fiyatın gösterilmesini istiyor.
9. İnsanlar **görünürlük, statü, tanınma, aidiyet ve karşılıklılık** için harcıyor; hediyenin anlamı "teşekkür edilmek" ve "orada görülmek". Bu itkiler kozmetikle, nakit ödül olmadan karşılanabilir.
10. Kronikler için ana sonuç: hanı **masa = koltuk sırası**, **hancı = oda sahibi**, **ozan sahnesi = konuşmacı sahnesi** olarak kurmak; Debdebe'yi **sabit fiyatlı, devredilmez, nakde dönmez** dönem görünüşleriyle doldurmak; Cömertler Levhası'nı **sayısız ve kademeli** göstermek.

## 2. Uygulama uygulama işleyiş

### 2.1 Genel tablo

| Uygulama | Odak | Oda yapısı | Ekonomi ve statü | Sosyal yapı / oyun | Bilinen sorun |
|---|---|---|---|---|---|
| **WePlay** (WEJOY, Singapur) | Sesli parti + oyun (Space Werewolf, "Mic Grab" karaoke) | Canlı sesli odalar, oyun odaları | Hediyeler, "gift battle", otomatik yenilenen VIP (özel yüzükler, ayrıcalıklar) | Aile, mentorluk, oyun içi evlilik | İnceleme: hediye ekonomisi "tuhaf sosyal baskı" yaratıyor; 16–17+ |
| **SUGO** | Sesli sohbet partisi (MENA, Asya) | Çok koltuklu oda; host sahne sırasını yönetir; koltuk konuşma önceliği verir | Coin → hediye → alıcıda çekilebilir elmas; zenginlik ve çekicilik seviyesi; kraliyet unvanları; gülden "rüya şatosu"na kademe | Çift amblemi, koltukta geçen süreyle samimiyet puanı; oda sıralaması (hediye + izleyici + süre) | Play ~3,1 yıldız; açıklamasız yasak, çekim kaldırma, kaybolan coin şikâyeti |
| **Yalla / Yalla Ludo** (Yalla Group, BAE) | Sesli odalar + Ludo/Domino | Binlerce oda; 15 mikrofonlu kip | VIP abonelik, "VIP Baron" (~39,99 $), "Room Lock" (~59,99 $) satın alımları; günlük altın/elmas | Oyun odası + sesli sohbet birlikte | 2025: 341,9 M $ gelir, 44,8 M MAU; ödeyen sayısı %8–10 düşerken ödeyen başına gelir arttı |
| **Hago / Mico** | Parti + mini oyun + 3D alan / yabancılarla görüntülü sohbet | Temalı grup odası / 8 kişilik misafir odası | Animasyonlu hediye, ülkeye göre yayın listesi | Mini oyun, anlık çeviri | İkisi de 17+ |
| **Ahlan / Yaahlan, Sango, Azal** (benzerler) | MENA sesli oda | Grup odası | Aylık soyluluk aboneliği, VIP/PRO: giriş efekti, profil çerçevesi, mikrofon animasyonu | Oda/kullanıcı PK, kabile (tribe) | Youstar gibi benzerlerde "Lucky wheel" ve mağazada "Simulated Gambling" etiketi |
| **Discord Stage / Clubhouse** | Topluluk konuşması, AMA | Moderatör + konuşmacı + dinleyici; dinleyici sessiz girer, **el kaldırır**, moderatör sahneye alır; "söz isteği" kapatılabilir | Hediye çekirdeği yok | Etkinlik, konu başlığı | Clubhouse 2021 sonrası hızla söndü (genel bilgi, bu oturumda kaynaklanmadı): hediye ekonomisi olmayan ses odası tek başına tutmadı |
| **TapTap** (XD) | **Oyun topluluk platformu**, sesli oda değil | Forum, inceleme, "Moments" gönderileri, geliştirici grupları | SparkCoin ile uygulama içi alım | Ön kayıt, beta erişimi, oyuncu–geliştirici iletişimi | TapTap markalı sesli oda uygulaması bulunamadı; TapTap'in RTC'si oyunlara satılan bir ses SDK'sı |

**TapTap:** Kastedilen büyük olasılıkla oyun topluluğu TapTap. Dersi oda ekonomisi değil **topluluk yüzeyi** (inceleme, geliştirici duyurusu, gönderi akışı); han ilan panosu ve sezon duyurusu için model.

### 2.2 Ortak mekanikler (kısa)

- **Roller:** oda sahibi (ad, tema, kilit) → yönetici (susturma, atma, koltuk verme) → koltukta konuşan → dinleyici.
- **Koltuk:** 8–15 sabit koltuk; boşa oturma ya da istekle sahneye alınma; kilitli ve VIP koltuk.
- **Keşif:** popüler/yeni/ülke/oyun sekmeleri; sıralamada üstteki oda öne çıkar. **Oda seviyesi** hediye + süreyle yükselir, koltuk ve tema açar.
- **Hediye:** ucuzdan (gül) pahalıya (şato) kademe; pahalısı tüm odada, bazen tüm uygulamada yayınlanır; alıcıda gelir.
- **VIP/soyluluk:** abonelik ya da harcama eşiği (baron, kont, dük, kral); giriş efekti, özel koltuk, atılmazlık, gizli giriş.
- **Sıralama, aile, ajans, etkinlik:** günlük/haftalık veren-alan-oda listeleri; aile seviyesi ve aile PK'sı; ajans host çalıştırır ve paydan alır; PK, çark, şanslı hediye, "coin surge".
- **Fiyat:** coin paketleri (≈0,99–99,99 $), ilk yükleme bonusu, abonelik, süreli paket.

## 3. Ortak desenler ve "neden işe yarıyor"

- **Görünürlük:** Hediye ve giriş efekti, kalabalığın önünde "ben buradayım" demenin en kısa yolu. SUGO'nun kendi blogu bunu "çerçeveden bütün odaya hâkim olmaya" uzanan bir [lüks evrimi](https://blog.sugo.com/en/the-evolution-of-in-app-luxury-from-profile-frames-to-full-room-domination/) olarak anlatıyor.
- **Statü:** Zenginlik seviyesi ve soyluluk unvanı kalıcı bir etiket. Herkes ilk bakışta kimin "önemli" olduğunu görüyor.
- **Tanınma:** Douyin üzerine yapılan nitel çalışmada izleyiciler hediyeyi çoğunlukla **takdir ve destek** için gönderiyor; karşılığında beklenen şey küçük bir jest (teşekkür, anılma).
- **Aidiyet:** Aile, kabile ve çift yapıları kişiyi bir gruba bağlıyor; grup PK'sı "bizimkiler için" harcatıyor.
- **Karşılıklılık ve norm:** 392 izleyiciyle yapılan bir modelde arkadaşların ve diğer izleyicilerin normu hediye niyetini belirliyor. Başkası hediye verince vermemek göze batıyor.
- **Rekabet:** PK ve sıralama, statüyü süreli bir yarışa çeviriyor. Bu en güçlü ama en baskıcı kaldıraç.
- **Az kişiden çok gelir:** Yalla'da ödeyen sayısı düşerken ödeyen başına gelirin artması, gelirin büyük harcayanlara dayandığını gösteriyor.

**Çıkarım:** İlk beş itki kozmetikle ve oyun içi anlamla karşılanabilir; son ikisi zararlı desenlerin kaynağıdır ve bilinçli olarak zayıflatılmalıdır.

## 4. Zararlı desenler ve hukuki/mağaza riskleri

| Desen | Nerede görülüyor | Neden zararlı | Hukuk/mağaza |
|---|---|---|---|
| Şanslı hediye, çark, şans kutusu, "coin surge" | Migo, Poppo, Youstar | Para karşılığı rastgele çarpan = kumar benzeri; beklenen değer negatif, oran yayımlanmıyor | Google Play: simüle kumar içeriği kısıtlı, rastgele öğelerin oranı satın almadan önce açıklanmalı; Apple 3.1.1 oran açıklaması; Brezilya ECA Digital: reşit olmayana açık oyunda paralı kutu yasak |
| Hediyenin nakde dönmesi (elmas → para) | SUGO ve tüm host modeli | Platformu ücretli eşlik/flört işine çevirir; ajans sömürüsü | Apple: IAP para birimiyle bahşiş serbest, ama hediye "değiştirilemez", yalnız ilk alıcıya iade edilir; nakit çekimin mağazada kabulü belirsiz; ayrıca ödeme hizmeti ve vergi yükü |
| Ajans/host baskısı | Çin'de "oda yöneticisi"nin reşit olmayan host'lara açık dil öğretmesi (Sixth Tone) | Yalnızlık ve flört umudu sömürülür; buluşma vaadiyle harcatma | Çin 2022: 16 yaş altı host olamaz, reşit olmayan hediye gönderemez |
| Baskıcı harcama sıralaması | Günlük "en çok veren" listeleri, büyük bağışa görünürlük | Statü yarışını harcama yarışına çevirir; balina avı | Çin CAC Ekim 2025: büyük bahşişe görünürlük veren sıralamalar, hediye değeri sınırı ve büyük bahşiş uyarısı kampanyası |
| Karışık para birimleri ve gizli fiyat | Coin → elmas → altın zinciri | Gerçek fiyat kaybolur | AB CPC ilkeleri (Mart 2025): ürünün gerçek para karşılığı gösterilmeli; çoklu para ve çoklu dönüşümden kaçınılmalı; çocukların zaafı sömürülmemeli; süreli teklifle baskı (Star Stable soruşturması) |
| Süresi dolan hediye ve coin | Migo'da 24 saatte biten şanslı hediye | Hemen harca baskısı | Apple 3.1.1: IAP ile alınan kredi/para birimi sona eremez |
| Keyfî yasak, kaybolan bakiye; yapay sohbet kişileri | SUGO şikâyetleri; bir flört uygulaması ağı (2026) | Güven kaybı; yalnızlık sömürüsü | Tüketici şikâyeti, aldatıcı uygulama |
| Kullanıcı içeriği | Tüm sesli odalar | Taciz, çocuk güvenliği | Apple 1.2: filtreleme, rapor, engelleme ve iletişim bilgisi şart; Google UGC politikası benzer |

## 5. Kronikler uyarlaması

### 5.1 Eşleme

| Sohbet odası | Kronikler | Not |
|---|---|---|
| Oda | **Han** (şehir), küçük han (kasaba), menzil/meydan (köy) | §16; kahvehane yok (1247) |
| Koltuk / mikrofon | **Masa koltuğu** (4–8), isim plakası | Masa türü: açık, özel, meclis, tüccar |
| Oda sahibi | **Hancı** (oyuncu mesleği, §17) ya da NPC hancı | Han düzeni; masa sahibi masa düzeni |
| Yönetici | Hancının yetki verdiği **kâhya** [ÖNERİ] | §17 yetki matrisi (Faz 13) |
| Sahne + dinleyici | **Ozan sahnesi** | Bir anlatıcı, dinleyiciler; "söz iste" |
| Hediye | **Armağan** (gül suyu, ikram, hil'at) | Devredilmez, nakde dönmez, günlük sınırlı |
| VIP / soyluluk | **Debdebe kademesi** (Bakır→Zümrüt) + **Ayan** aboneliği | Yalnız etiket |
| Giriş / binek efekti | **Giriş anonsu**, davul-zurna, binek donanımı | Han kapısında ve şehir kapısında |
| Aile / klan | Hane, lonca, ahi zaviyesi | Zaten oyun içi kurum; satın alınmaz |
| PK | **Ozan atışması** (ücretsiz oy, yalnız anılma) | Hediyeyle oy yok |
| Sıralama | **Cömertler Levhası** (sayısız, kademeli) | §7.3 |

### 5.2 Alınacaklar

| Öğe | İlham | Bizdeki karşılığı | Neden kural uyumlu | Risk |
|---|---|---|---|---|
| Koltuklu masa | Sesli oda koltukları | 4–8 koltuk, plakalı; boş koltuğa dokunup otur | Oturmak oyunu bağlamaz; katılım listesinin kaynağı | Koltuk yetmez → otomatik yeni masa |
| Söz iste | Discord Stage el kaldırma | Ozan sahnesinde dinleyici "söz iste"r, anlatıcı ya da hancı kabul eder | Ücretsiz; para sırayı değiştirmez | Kayırma → sıra herkese görünür |
| Giriş anonsu | Giriş efekti | "Kayserili Hasan Bey Han'a girdi" + kısa davul | Yalnız `cosmetic` | Spam → anons aralığı [PARAMETRE], "anonsları kıs" |
| Çerçeve, mühür, tezyin nişanı | Çerçeve, rozet | Oymalı/yaldızlı plaka çerçevesi, kişisel mühür | Etiket; oyun mantığı okumaz | Unvan sanılması → metinsiz görsel rozet (§19) |
| Sohbet balonu | Balon | Parşömen, ipek, mühürlü balon | Yalnız görünüş | Kontrast; 6 dil ve sağdan sola (ar) |
| Binek donanımı | Araç efekti | İşlemeli eyer, kervan sancağı; han önünde durur | Hız/kapasite vermez | "Hızlı at" algısı → "yalnız görünüş" etiketi |
| Armağan | Hediye | Masadakine gül suyu, ikram sinisi, hil'at; alanda "X'in armağanı" rozeti | Devredilmez, akçeye dönmez, günlük sınır (§19) | Dilenme → "armağan iste" düğmesi yok; alıcı rozeti gizleyebilir |
| Ziyafet afişi | Oda geneli büyük hediye | Masaya/hana ikram görüntüsü, levhada anılma | Yalnız görünüş | **§16'daki "Ziyafet ver → nam olayı" ile çakışır** (bkz. 5.4) |
| Debdebe kademesi | Zenginlik seviyesi, noble | Mühür rengi | Etiket, oyun okumaz | "Güç" algısı → koltuk/atılmazlık ayrıcalığı yok |
| Ayan aboneliği | VIP abonelik | Çerçeve, anons, ek mühür yuvası, masa süsü | Güç/gelir/kapasite yok (§19) | Bitince kayıp baskısı → kalıcı öğeler kalır |
| Ozan atışması | PK | İki ozan metinle (sonra sesle) deyiş söyler; masa ücretsiz oy verir | Kişi başı bir bedava oy; ödül yalnız anılma | Oy çetesi → yalnız masadakiler oylar; nam yok |
| Çift/dostluk amblemi | SUGO pair | "Yol arkadaşı" yan yana oturunca ince bağ işareti | Oyun içi ilişkiden gelir, satılmaz | Flört baskısı → çift onay, kolay kaldırma |
| Topluluk panosu | TapTap Moments | Han ilan panosu: etkinlik, iş ilanı, ozan gecesi | Butonlu ilan | Spam → oran sınırı, rapor |

### 5.3 Alınmayacaklar ve yerine konan

| Alınmayan | Neden | Yerine |
|---|---|---|
| Hediye ile host'a/hancıya nakit, elmas birimi | D-15, §19; ajans sömürüsü; ödeme ve vergi yükü (D-19) | Alanda rozet ve "armağan defteri"; hancıya pay yok. Hancı geliri yalnız oyun içi akçe (yemek, oda, hizmet) |
| Şanslı hediye, çark, şans kutusu, sandık | Kumar benzeri; mağaza ve Brezilya riski; §19 "paralı kutu yok" | Sabit fiyatlı ürün, Dene önizleme |
| Coin surge, ilk yükleme bonusu, sayaçlı paket | Pusula ilke 6 (kaçırma korkusu); AB CPC | Sabit fiyat; sezon ürününde bitiş tarihi düz yazı |
| Para karşılığı koltuk, kilitli VIP koltuk, atılmazlık | Para güç satmaz; moderasyonu deler | Koltuk ilk gelen; hancı/masa sahibi kuralı herkese eşit |
| Para karşılığı gizli giriş | Moderasyonu ve katılım kaydını bozar | Yok; katılım listesi herkes için aynı |
| Oda seviyesi hediyeyle yükselir | Para → han kapasitesi = güç (Faz 12: "kapasite parayla artmıyor") | Han itibarı yalnız oyun içi hizmetle (§17) |
| Uygulama geneli dev hediye yayını | Harcamayı herkese bağırır, baskı kurar | Yalnız masa içi kısa animasyon |
| Günlük "en çok veren" sayısal listesi, "X seni geçti" bildirimi | Balina avı; Çin 2025 | Sayısız, kademeli Cömertler Levhası (§7.3) |
| Ajans, host maaşı, hedef kotası | Sömürü | Ozan bir oyun içi rol; ödülü akçe/nam (oyun içi emekle, anti-farm sınırlı) |
| Süresi dolan armağan/para birimi | Apple 3.1.1; baskı | Satın alınan öğe kalıcı |
| Yapay "kalabalık" oyuncu gibi davranan NPC | Yalnızlık sömürüsü | NPC'ler açıkça NPC; sohbet yalnız oyuncular arası (§16) |

### 5.4 GDD ile olası çakışma

§16 tablosunda **"Ziyafet ver → Debdebe ve nam olayı"** satırı var; §19'da "Han'a ziyafet" Debdebe ürünü. Gerçek parayla alınan ziyafet nam verirse Debdebe testini (§19) bozar. **Öneri:** iki ayrı eylem — (a) **akçeyle ziyafet**: oyun içi, nam olayı üretir, butonlu eylem; (b) **ziyafet afişi** (Debdebe): yalnız görüntü ve levhada anılma, nam yok. İkisi aynı anda yapılabilir; nam yalnız (a)'dan gelir.

## 6. Han masası akışı önerisi

1. **Hana gir.** Kapıda giriş anonsu (varsa, aralık sınırlı). Ekranda masalar, doluluk, tür, NPC'ler ve ilan panosu.
2. **Masa seç.** Tür §16'daki gibi. Liste sırası: arkadaş/hane üyesi olan masa → dolu ama yer olan → boş. **Harcama sıralamayı etkilemez.**
3. **Otur.** Boş koltuğa dokun. Plaka: ad, hane, mühür rengi, çerçeve.
4. **Konuş (Faz 10, metin).** Oran sınırı, 6 dil küfür filtresi (D-25), yeni hesaba ilk saatlerde kısa mesaj sınırı [PARAMETRE]. Sohbet **saklanmaz**; istemciden çıkınca kaybolur.
5. **Butonlu eylem.** Yemin, sözleşme, ittifak, ihbar, meydan okuma, akçeyle ziyafet. Sunucu doğrular, olay üretir; onay gerekenlerde iki dokunuş.
6. **Katılım kaydı.** Olaya o anda masada oturanların listesi yazılır; sohbet içeriği yazılmaz (§16 [UZLAŞI]).
7. **Kalk.** Plaka kalkar; masa sahibi ayrılırsa sahiplik masadaki en eski oturana geçer [ÖNERİ].

**Ozan sahnesi:** Büyük handa bir anlatıcı + çok dinleyicili "sahne masası". Dinleyici yalnız tepki (alkış, "Aferin!") ve "söz iste" gönderir; serbest yazı sahnedekilerde. Metin fazında NPC ozan destan anlatır, oyuncu ozan metinle sahne alır.

**Ses (Faz 16, D-24):** Bas-konuş; yalnız masadakiler duyar; kayıt yok (sağlayıcı sözleşmesinde kayıt yapılmadığı doğrulanmalı). Ses masaları ayrı işaretli, **yaşı doğrulanmış yetişkinlere** açık [ÖNERİ]; ses kapalı oyuncu aynı masada metinle katılır. Ses içeriği saklanmadığı için ses moderasyonu anlık eylemlere dayanır: kişisel sessize alma, masa sahibinin atması, şikâyet.

**Moderasyon katmanları (Y1 bağlantısı):**

| Katman | Kim | Araç | Kapsam |
|---|---|---|---|
| Kişisel | Her oyuncu | Engelle, kişisel sessize al, anonsları kıs | Yalnız kendisi |
| Masa | Masa sahibi | Masadan at (bu masa, süre [PARAMETRE]), "kavga yasak", masa kilidi | Bir masa |
| Han | Hancı / kâhya | Handan uzaklaştır (süreli), han kuralları | Bir han; yetki matrisi Faz 13 |
| Oyun | Y1 moderatör/kurucu | Şikâyet kuyruğu, **susturma bayrağı** (≤30 gün; Y1'de kayıtlı, Faz 10 sohbet okuyacak), uzaklaştırma | Tüm oyun; işlem kaydı silinmez |

- Masadaki "Şikâyet et" mevcut `/v1/sikayet` → Y1 kuyruğuna bağlanır; kayda masa kimliği ve zaman eklenir.
- Hancı ve masa sahibi yetkileri **hiçbir zaman** Debdebe kademesinden gelmez.
- Sohbet saklanmadığından şikâyet kanıtı zayıf; Apple 1.2 "rapora zamanında işlem" ister. Seçenek: şikâyet edilen mesajın şikâyet kaydına kısa süreli eklenmesi (§16 değişir → açık soru 3).

## 7. Debdebe kataloğu önerisi

Fiyatlar **[PARAMETRE]**, mağaza fiyat kademesi olarak ABD doları karşılığı; yerel kademeye mağaza çevirir. D-18 için öneri: **doğrudan fiyat** (premium para yok). AB CPC ilkeleri gerçek fiyatın görünmesini ve çoklu para biriminden kaçınmayı istiyor; doğrudan fiyat bunu kendiliğinden sağlar.

| # | Öğe | Yüzey | Fiyat aralığı [PARAMETRE] | Not |
|---|---|---|---|---|
| 1 | Parşömen / ipek sohbet balonu | Sohbet | 0,99–1,99 | Okunabilirlik testi |
| 2 | Oymalı plaka çerçevesi | Masa plakası, profil | 1,99–3,99 | |
| 3 | Yaldızlı / mühürlü çerçeve | Masa plakası, profil | 3,99–5,99 | |
| 4 | Kişisel mühür | Mektup, ferman, sözleşme | 2,99–4,99 | Sözleşme geçerliliğini etkilemez |
| 5 | Hane arması | Levha, sancak, mektup | 4,99–7,99 | Hane reisi alır, üyeler gösterir |
| 6 | Giriş anonsu (metin) | Han kapısı | 1,99–2,99 | Aralık sınırlı |
| 7 | Davul-zurna anonsu | Han kapısı, şehir kapısı | 3,99–6,99 | Ses kısılabilir |
| 8 | Kaftan / hil'at | Portre, masa | 3,99–9,99 | Dönem danışmanlığı |
| 9 | Başlık ve kemer | Portre | 1,99–3,99 | |
| 10 | Tezyin nişanı (metinsiz rozet) | Plaka | 1,99–3,99 | Unvan değil |
| 11 | İşlemeli eyer, binek donanımı | Şehir kapısı, han önü | 4,99–9,99 | Hız vermez |
| 12 | Kervan sancağı | Şehir kapısı, han önü | 2,99–5,99 | |
| 13 | Masa süsü (halı, mum, bakır sini) | Kendi masan | 1,99–3,99 | |
| 14 | Han tabelası / vitrin | Şehir haritası | 4,99–9,99 | Mülk sahibi; itibar vermez |
| 15 | Armağan: gül suyu / ikram sinisi / hil'at | Masada alıcı | 0,99 / 1,99 / 4,99 | Günlük sınır [PARAMETRE], devredilmez |
| 16 | Ziyafet afişi | Han, pano | 1,99–4,99 | Nam yok (5.4) |
| 17 | Hayır eseri levhası (çeşme, sebil) | Meydan | 4,99–19,99 | Sınırlı yuva → süreli dönüşüm [ÖNERİ] |
| 18 | Ayan (aylık) | Çeşitli | 2,99–4,99/ay | Güç yok |
| 19 | Sezon Defteri (ücretli iz) | Çeşitli | 4,99–9,99/sezon | Ücretsiz iz de gerçek |

**Dene önizleme (§19):** Her ürün sayfasında "Dene" üç sahne açar: han masası (plaka, giyim, balon, masa süsü), şehir kapısı (anons, binek, sancak), profil kartı. Sahnede gerçek oyuncu yok; NPC figüranlar kalabalık etkisi verir. Önizleme ücretsiz ve sınırsız; satın alma çift dokunuş + harcama özeti; aylık harcama limiti ayarı; reşit olmayana satış kapalı ya da ebeveyn onaylı [ÖNERİ].

### 7.1 Cömertler Levhası'nın baskıcı olmayan biçimi

- **Sayı yok:** Tutar, puan ve sıra numarası gösterilmez. Levhada kademeler var: "Şehrin cömertleri" (Zümrüt/Lacivert mührü olanlar) ve "Bu hafta anılanlar". Kademe içinde adlar **alfabetik ya da her açılışta karışık**.
- **Oyun içi cömertliği de say:** Akçeyle ziyafet, akçeyle hayır eseri, lonca bağışı levhaya girer. Böylece levha gerçek paranın tekelinde olmaz.
- **Tavan:** Haftalık levha puanında kişi başı tavan [PARAMETRE]; tavanı aşan harcama levhayı değiştirmez. Balina avının nedeni ortadan kalkar.
- **Görünmek isteğe bağlı:** Varsayılan **kapalı**; oyuncu "adım levhada anılsın" der. Reşit olmayan hesap levhada görünmez.
- **Bildirim yok:** "X seni geçti", "ilk 3'e girmek için şu kadar" türü mesaj yok. Hafta sonu sayaç yok; sezon bitiş tarihi düz yazı.
- **Kalıcı levha:** Sezon sonunda kademeye girenler kalıcı levhaya yazılır; sıra numarası olmadan.
- **Levha hiçbir oyun etkisi vermez:** nam, itibar, makam, koltuk önceliği yok.

## 8. Açık sorular (Berkay'a)

1. **D-18:** Doğrudan fiyat (önerimiz) mi, premium para mı? Premium para seçilirse AB CPC ilkeleri gereği her üründe gerçek fiyat da gösterilmeli.
2. **Ziyafet çakışması (5.4):** "Akçeyle ziyafet = nam" ve "Debdebe ziyafet afişi = yalnız görüntü" ayrımını onaylıyor musun?
3. **Şikâyet kanıtı:** Sohbet saklanmıyor. Şikâyet anında yalnız şikâyet edilen mesajın şikâyet kaydına kısa süreli eklenmesine izin veriyor musun, yoksa şikâyet yalnız kimlik + zaman + masa ile mi kalsın?
4. **Yaş sınırı:** Online mod için alt yaş kaç (13/16/18)? Ses masaları ve Debdebe satışı için 18+ ya da ebeveyn onayı ister miyiz?
5. **Armağanın alıcıdaki karşılığı:** Hil'at armağanı alıcıya giyilebilir kalıcı bir kozmetik mi versin, yoksa yalnız "X'in armağanı" rozeti mi? (Giyilebilir olursa devredilmez ve satılamaz kalır.)

## Kaynaklar

- WePlay: [App Store](https://apps.apple.com/us/app/weplay-game-voice-chat/id1589399089) (inceleme: [orcz](https://orcz.com/weplay-review-karaoke-night-in-a-crowd-you-cant-quite-see/))
- SUGO: [App Store](https://apps.apple.com/us/app/id1574436604), [SUGO blog: hediye sistemi](https://blog.sugo.com/en/how-does-a-virtual-gifting-system-work-in-voice-social-platforms/), [SUGO blog: kraliyet unvanları](https://blog.sugo.com/en/the-prestige-economy-how-virtual-royal-titles-drive-status-and-retention/), [topuplist rehberi](https://topuplist.com/blogs/detail/sugo-chat-party-guide-rooms-gifts-levels-rewards), [Pair (note.com)](https://note.com/secretliver/n/nb2cefbd134d0), [bittopup 2026 puan analizi](https://bittopup.com/article/sugo-coin-prices-october-2026), [şikâyet: çekim kaldırıldı](https://www.sikayetvar.com/en/sugo-us/sugo-app-removed-withdrawal-option-and-blocks-diamond-cash-out)
- Yalla: [2025 sonuçları (barchart)](https://www.barchart.com/story/news/650416/yalla-group-limited-announces-unaudited-fourth-quarter-and-full-year-2025-financial-results), [Yalla Ludo App Store](https://apps.apple.com/us/app/id1419536376)
- Hago, Mico ve benzerleri: [Hago App Store](https://apps.apple.com/app/id1400667917), [MICO App Store](https://apps.apple.com/ng/app/id908023218), [Sango](https://apps.apple.com/tr/app/sango/id1509626067), [Azal](https://apps.apple.com/app/id1546607031), [Yaahlan](https://apps.apple.com/us/app/yaahlan-fun-games-make-friends/id6448329713), [Youstar](https://apps.apple.com/us/app/-/id1377028992)
- Discord/Clubhouse: [Discord Stage SSS](https://support.discord.com/hc/articles/1500005513722)
- TapTap: [TapTap RTC](https://developer.taptap.io/docs/sdk/rtc/features/), [TapTap duyurusu](https://www.taptap.io/kr/post/1992583)
- Şanslı hediye: [Migo Live oran analizi](https://buffget.com/news/migo-live-lucky-gift-odds-is-it-worth-gambling-full-breakdown-he9dch)
- Host/ajans: [Sixth Tone: reşit olmayan host'lar](https://m.sixthtone.com/news/1017421/honey-trap%3A-underage-live-chat-hosts-getting-paid-to-flirt), [Digital Trends: yapay kişiler](https://www.digitaltrends.com/?p=6007993)
- Mağaza: [Apple Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [Apple forum: coin ve nakit çekim](https://developer.apple.com/forums/thread/126848), [Google Play ödeme politikası](https://play.google.com/about/monetization-ads/payments), [Google Play kumar politikası](https://support.google.com/googleplay/android-developer/answer/9858738)
- Düzenleme: [CNBC: Çin 2022](https://www.cnbc.com/2022/05/07/china-to-ban-minors-from-tipping-livestreamers-watching-after-10-pm.html), [Sixth Tone: 2025 bahşiş kampanyası](https://www.sixthtone.com/news/1017784), [Baker McKenzie: AB CPC ilkeleri](https://connectontech.bakermckenzie.com/european-consumer-protection-network-issues-new-key-principles-on-in-game-virtual-currencies-impact-for-gaming-and-gambling-entities-in-belgium-the-eu-and-beyond/), [Mattos Filho: ECA Digital](https://www.mattosfilho.com.br/en/unico/brazils-eca-digital/)
- Motivasyon: [Douyin hediye motivasyonu (arXiv)](https://arxiv.org/pdf/2108.05960), [PMC: sosyal değişim](https://pmc.ncbi.nlm.nih.gov/articles/PMC10793923)
