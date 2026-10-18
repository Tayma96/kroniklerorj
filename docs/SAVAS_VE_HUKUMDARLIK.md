# Savaş, askerlik ve hükümdarlık incelemesi

Kapsam: aktif Expo istemcisi ve tek oyunculu motor. Değişiklikler mevcut kaydı ve altı dili korur.

## Asker olunur mu, nasıl ilerler?

Evet. **Meslek → Asker** yolunun kademeleri **Acemi → Asker → Bölükbaşı → Sipahi**.
Mesleğe geçiş 13 yaşından itibaren; askerlik için temel şart **etkin güç 5 ve 100 savaş XP**.
Çalışma ücreti, savaş becerisi gelişimi, devriye/nöbet olayları, meslek kararları ve kademe
sınavı mevcut. Ustalık kademesi yalnız savaşı kazanmakla otomatik atlanmaz.

**Asker Ocağı ayrı bir teşkilattır**; meslek seçimi otomatik ocak üyeliği değildir.
Temel katılım itibarı 40; bazı hünerler eşiği düşürebilir. Devriye, sınır/asayiş görevleri
ve ocak itibarı var. **Örgütler → Cephe desteği**, bağlı olunan tarafın aktif savaşı varsa
16 yaşından itibaren açılır; ayda bir kullanılır. Savaş sicili, ganimet, yaralanma ve
ocak itibarı etkilenir. **Savaş** ekranında bireysel taktik karşılaşmalar; talim, silah,
zırh, kalkan, maiyet ve hasım hesaplaşması bulunur.

## Hükümdar savaşı ve asker olarak orduya katılma

Bireysel karşılaşma, lonca cephesi ve devlet ordusu aynı şey değildir. **Savaş → Ordu
cephesi** artık oyuncunun yurduna ait hükümdarın sınır seferini gösterir. Asker mesleği,
16 yaş, 25 sağlık, kendi beyliğinde bulunma ve kullanılmamış aylık savaş hakkıyla
çağrıya gönüllü katılınır; Asker Ocağı üyeliği aranmaz. Asker olmak otomatik seferberlik
veya ordunun başkomutanlığı anlamına gelmez. Gerçek isimli bağımsız hükümdarların
hanedan/diplomasi yapay zekâsı bu ilk sınır seferi modelinin kapsamında değildir.

Her ay üç kısa manga teması vardır: **safı koru / manganla ilerle / yaralı taşı**.
Yaklaşan hücum, ok atışı veya piyade baskısı görünür. Safı korumak manga zayiatını
azaltır; ilerlemek karşı ordunun az sayıda askerini ve moralini etkiler, süvari hücumuna
karşı ağır yara ve moral kaybı riski taşır. Yaralı taşıma mevcut yaralı havuzunu güvenli
bölgeye aktarır; bu askerler aynı muharebede yeniden savaşabilir sayıya eklenmez.
Kendi sağlık kaybı, temas, yaralılar ve kayıtlı RNG her kararda saklanır. Ekranı
kapatmak hamleyi geri almaz; görev ve kişisel düello aynı aylık hakkı paylaşır.

İki ordunun savaşabilir asker sayısı, morali ve ikmali ayrıdır. Aylık çatışmada iki taraf
aynı başlangıç gücünden karşılıklı zayiat verir. Üç ay sonunda veya erken çözülmede
kalan etkin güç üstünlüğü belirler; eşitlikte savunan mevzisini tutar. Oyuncu katılmasa
da ordu savaşır; bir manganın başarısı bütün ordu için otomatik zafer değildir.
Sınır seferi sonucu tek başına toprak ilhak etmez. Bölgedeki kervan riski ve genel
savaş enflasyonu etkilenir. Aynı anda tek NPC devlet cephesi vardır. Bir savaşın
tarafları arasında 12 aylık ateşkes; dünya için en az üç aylık yeni sefer aralığı vardır. Atanın askerlik görevi vârise geçmez; dünya cephesi takvimi yeniden tabanlanır.

Oyuncu hükümdarsa mevcut Hanedan seferi de aynı iki-ordu çözümünü kullanır. Yürüyüş
ve kuşatma hazırlığından sonra üç temaslık meydan muharebesi çözülür. Sefer emirleri
morali/ikmali etkiler; ekrandaki oran **göreli ordu gücü payıdır**, kesin kazanma
olasılığı değildir. Artık sonuç tek bağımsız zafer zarıyla belirlenmez.

Birliklerin harita üzerinde konumlanması, bağımsız piyade/süvari alaylarının emri,
kuşatma makinesi simülasyonu ve esir değişimi henüz yoktur. Düşman emirleri manga
karşılaşmalarını anlatır; tam bir savaş alanı simülasyonu olarak sunulmaz. Yeni model
çevrimdışıdır; çok oyunculu protokol ve sunucu otoritesi değiştirilmedi.

## Savaşın bütün diyara yayılan sonuçları

Tek oyunculu kayıtta her beyliğin hasar, darlık, güvensizlik, yerinden edilme,
savaş yorgunluğu ve insan gücü kaybı vardır. Bunlar 0–100 ölçekli baskı değerleridir;
birebir nüfus sayımı değildir. Fetih ayrıca direnç bırakır. Yalnız yeni asker zayiatı
ve ilk sonuç kayda alınır; ekranı açmak, aynı ay iki kez hesaplamak veya kaydı yüklemek
hasarı/ganimeti çoğaltmaz. Cephe kimlikleri nesli içerir, takip defteri sınırlıdır.

| Neden | Bağlandığı gerçek hesap ve devam eden sonuç |
|---|---|
| Seferberlik ve insan gücü kaybı | NPC üretimi, işçili mülkün gerçek ürünü ve sonraki ordunun toplayabildiği asker azalır. |
| Hasar ve erzak darlığı | Gıda arz-talebi, fiyatlar, hane geçimi ve meslek ücreti etkilenir. İlaç talebi asker kaybıyla, nakliye baskısı güvensizlikle artar. |
| Savaş bölgesinden göç | Üç ayda en fazla bir gerçek NPC hanesi güvenli yerleşime taşınır. Eş ve küçük çocuklar birlikte gider; kimlik ve aile bağları korunur. Üretim önbelleği yenilenir. |
| Sığınan hane ve bozulan ticaret | Varılan bölgenin erzak/yerleşme baskısı ve savaş dışındaki bölgelerin ticaret darlığı artar; savaş yalnız cepheyi etkilemez. |
| Güvensiz yollar | Gerçek kervan baskın ihtimali ve oyuncunun yolculuk riski yükselir. Kervanla/atla gitmek riski azaltır, tamamen sıfırlamaz. |
| Yıkım ve yorgunluk | Valinin geliri/hazinesi, halk memnuniyeti ve hükümdar haracı düşer; otorite ve isyan/azil sistemleri baskı alır. |
| Fetih | Toprak ele geçse de direnç nedeniyle ilk günden tam vergi ve meşruiyet alınmaz. İmar ve barış direnci azaltır. |
| Sınır bozgunu | Oyuncu hükümdarsa hazine kaybı ve otorite düşüşü olur; zafer sivil zararları otomatik onarmaz. |
| Hükümdarın ölümü | Merkez, fetihler ve süreleri yeniden tabanlanmış ateşkesler vârise geçer; yeni hükümdar daha düşük otorite ve vali sadakatiyle başlar. |

Başka hükümdarlar oyuncunun topraklarına da sınır seferi açabilir. Hükümdar Savaş
sayfasından ayda bir ikmal/savunma hazırlığı/keşif emri verir; para bedeli ve gerçek
ordu etkisi vardır. Savunma sürerken yeni fetih seferi açılmaz. NPC sınır seferleri
baskın niteliğindedir; bu ilk modelde her sınır zaferi otomatik ilhak değildir.

Şehir, pazar ve yerleşim ayrıntısında üretim/gıda/vergi etkisiyle bunun nedeni birlikte
anlatılır. Herhangi bir yetişkin mesleğiyle (13+ oyun eşiği) bulunduğun yerde ayda bir:
8 buğdayla erzak yardımı; 4 kereste ve 90 × enflasyonla imar; 75 × enflasyonla yol
muhafızı desteği verilebilir. İhtiyaç yoksa eylem kapalıdır. Bedel gerçekten harcanır;
başka şehre giderek aylık kilit aşılamaz. İmar fetih direncini de hafifletir.

Barışta hasar ve kayıp yavaş söner. Yol ve geçim güvenli hale geldikten en az bir dünya
yılı sonra yerinden edilmiş hane yurduna dönebilir. Oyuncunun yakın ailesi, işe aldığı
kişiler ve açık ilişkileri otomatik taşınmaz; aile geçimi üzerindeki ekonomik baskı
korunur. Soyut ordu kayıpları rastgele seçilen kent NPC'lerini öldürmek için kullanılmaz.

Model nedensel bir oyun simülasyonudur; katsayılar tarihsel ölçüm iddiası taşımaz.
Gerçek isimli bağımsız hükümdar diplomasisi, NPC devlet hazinesi/esir pazarlığı,
birliklerin haritada konumlandırılması ve tam kuşatma simülasyonu hâlâ ayrı işlerdir.
Bu dalgada bu sistemler bitmiş gibi sunulmaz. Çok oyunculu sunucu otoritesi değişmedi.

Hedefli testler: `check-war-world.cjs`, `check-war-impact.cjs`, `check-army.cjs`,
`check-war.cjs`, eski kayıt göçü ve vâris önizleme/devir paritesi. Tip, motor/UI paketleme
ve altı dil/ikon kontrolleri uygulandı. Uzun hayat simülasyonu çalıştırılmadı; gerçek
telefon, 320/390 piksel görsel ve CPU performans kabulü ayrıca yapılmalıdır.

## Bireysel savaşta bu dalgada değişenler

Eski çekirdek hamle–savuştur–özel karşılaşması, duruş ve düşman niyetinden oluşuyordu.

- **Nefes:** dayanıklılığa göre 64–100 başlangıç kapasitesi. Hamle 12, savuşturma 7,
  özel 24 nefes; saldırgan duruş +4, savunmacı −2 tüketir. Değerler ekranda görünür.
- **Yorulma:** nefes yetmezse hasar çarpanı 0,55; alınan hasar çarpanı 1,20.
- **Toparlan:** bir turda 26 + savaş becerisi kadar nefes; karşılığında düşman saldırısı
  gelir. Sağlık yenilemez, ücretsiz savunma veya kaçış değildir.
- **Üstünlük:** kazanılan hamleler en çok üç kademeli ivme verir; kademe başına %5
  saldırı katkısı. Beraberlik, kayıp ve toparlanma ivmeyi sıfırlar.
- **Rakip uyumu:** aynı hamle iki kez tekrarlandığında rakip %60 ihtimalle karşı
  hamleye ağırlık verir. Niyet göstergesi ve fent riski korunur; tekrar uyarısı görünür.
- Başarılı savuşturma 10 nefes geri verir. Zırh, kalkan, silah sınıfı ve çaresiz düşman
  etkileri sürer. Dövüşe 15 sağlıkla giren karakter 20 sağlık kazanmaz.
- Aylık giriş/ödül kilidi korunur; ölü, hapiste, 13 yaşından küçük veya 15 sağlığın
  altında karakter motor kapısından da dövüşe giremez. Sonuçta sonlu sağlık değeri aranır.

## Sultan/hükümdar olunur mu?

Evet: **Hanedan → Taht**. Mevcut eşikler **35 yaş, 140 hanedan gücü, 70 itibar,
60 şöhret ve 5.000 akçe**; ayrıca teşkilat desteği veya sarayda Vezir ve üstü mevki gerekir.
Nitelikli oyuncu tahta kesin çıkmaz: rakip hanelere göre hesaplanan bir başarı şansı vardır.
İddia bedeli başarısızlıkta da harcanır; kayıp itibar, şöhret ve sağlık kaybettirir.

Tahta çıkınca otorite, fermanlar, saray heyeti ve ücretleri, vali atama/azil, haraç,
sefer, taht iddiacısı, uzlaşma/bastırma ve isyan mekanikleri vardır. Hükümdarlık
meslekten ayrı bir statüdür. Bireysel dövüş ile devlet seferi ayrı ölçeklerdir.

## Sefer, diplomasi, ticaret ve yönetimde yapılan iyileştirmeler

### Sefer

Üç aylık yürüyüş–kuşatma–hüküm akışı sürer; artık yalnız otomatik bekleyiş değildir.
Başlangıç erzağı 65; ayda 20 tüketilir. 25 altı erzak, üstünlükten 5 puan daha götürür.
Sefer bedeli 800 akçenin enflasyona göre değeri; ekrandaki bedel ile motor aynıdır.

Her ay **bir** emir:

| Emir | Bedel | Gerçek etkisi |
|---|---|---|
| İkmal | 120 × enflasyon | Erzak +35, en çok 100. |
| Keşif | 60 × enflasyon | Üstünlük +3; sıradaki yürüyüş/kuşatma iyi olay şansı %50 → %80. |
| Hücum | 20 erzak, 3 sağlık | Üstünlük +7; en az 25 erzak ve 8 sağlık gerekir. |

Hedefin mevcut sancak istikrarı ve hâkim teşkilatın askerî tavrı savunma direncini
etkiler. Devlet siyaseti ve müttefikler katkı verir. Güncel güç payı; hazırlığın morale ve erzağın etkin güce katkısını gösterir. Sonraki ayın
erzak tüketimi ve olayları koşulları değiştirebilir. Muharebe zayiatı kayıtlı RNG ile
hesaplanır; finalde tek bağımsız zafer zarı kullanılmaz.

### Diplomasi ve ticaret

Hanelere elçi, ittifak ve evlilik teklifleri ile iddiacıyla uzlaşma zaten vardı.
Beylikler için iki süreli seçenek eklendi:

| Antlaşma | Elçilik bedeli | Etkisi |
|---|---|---|
| Ticaret ahdi | 180 × enflasyon | 12 ay saldırmazlık; o beyliğe giden kervanın getiri çarpanına +0,06. |
| Ateşkes | 120 × enflasyon | 12 ay saldırmazlık. |

Her ikisi antlaşma bölgesindeki kervan baskın ihtimalini 4 puan azaltır; asgarî risk
korunur. Başarı; sosyal güç, otorite, şeref ve korkuya bağlıdır. Elçilik bedeli ret
halinde de ödenir. Antlaşma varken aynı hedefe sefer ve haraç talebi engellenir;
süresi geçince açılır. Devam eden seferin hedefiyle yeni antlaşma yapılamaz.
Elçilik, haraç, iddiacıya müdahale ve siyaset değişimi aynı aylık taht hakkını paylaşır.

### Devlet siyaseti ve sınırlar

| Siyaset | Gelir ve siyasi/askerî sonuç |
|---|---|
| Denge | Tam haraç geliri, ek katkı yok. |
| Refah | Haraç −%20; otoritenin aylık hedefi +8. |
| Seferberlik | Haraç −%15; sefer şansı +7 puan; otorite hedefi −4. |

Otorite hedefi anlık ücretsiz +8 değildir: mevcut aylık yakınsama hesabında işler.
Siyaset değişimi ayda bir taht eylemini harcar; gelir çiftçiliği üretmez.

Yabancı, fethedilmemiş şehre doğrudan vali atama ve oradan haraç toplama açığı kapatıldı.
Hükümdarlık sınırı; tahta çıkılan beylik ve fetihlerle belirlenir. Taht merkezi kayda
sabitlenir; ev/şehir değiştirerek yeni beylik sahiplenilemez. Eski kayıtta merkez,
kayıt göçünde mevcut ana yurttan kurulur. Şehir valiliğinin vergi/yatırım/yerel hazine
akışı mevcut sistemi kullanmaya devam eder.

## Doğrulama ve kalan kabul işi

Hedefli kontrol: emir bedeli ve aylık kilit, üç aşamanın kayıt tekrarında eşliği,
antlaşma/süre/sefer-haraç engeli, gerçek kervan getirisi, sınır ve vali kapısı, siyaset
etkisi, bozuk/eski kayıt göçü, nefes/toparlanma/yorgunluk ve altı dil. TypeScript ve
i18n/ikon/dil denetimleri temiz. Geniş hayat simülasyonu bu dalgada çalıştırılmadı.

Ordu artık savaşabilir sayı/moral/ikmal ve yaralı havuzuyla temsil edilir; ayrı piyade-süvari birlikleri,
cephe konumlandırması ve tam devlet bütçesi yoktur. Merkez giderleri oyuncunun mevcut
para havuzundan, şehir yatırımları yerel hazineden işlenir. Yeni antlaşma ve sefer
emirleri tek oyunculu sistem içindir; MP protokolü değiştirilmedi. Canlı MP otoritesi,
telefon üstünde dokunma/okunabilirlik ve insanla denge testi ayrıca doğrulanmalıdır.
