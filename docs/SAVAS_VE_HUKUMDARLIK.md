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
etkiler. Devlet siyaseti ve müttefikler katkı verir. Güncel tahmin; üstünlük ve erzağı
birlikte gösterir. Hüküm zarı aynı hesap fonksiyonunu kullanır; sonraki ayın erzak
tüketimi ve olayları koşulları değiştirebilir. Sefer zarı kayıtta ilerler.

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

Ordu hâlâ soyut güç/üstünlük/erzakla temsil edilir; ayrı piyade-süvari birlikleri,
cephe konumlandırması ve tam devlet bütçesi yoktur. Merkez giderleri oyuncunun mevcut
para havuzundan, şehir yatırımları yerel hazineden işlenir. Yeni antlaşma ve sefer
emirleri tek oyunculu sistem içindir; MP protokolü değiştirilmedi. Canlı MP otoritesi,
telefon üstünde dokunma/okunabilirlik ve insanla denge testi ayrıca doğrulanmalıdır.
