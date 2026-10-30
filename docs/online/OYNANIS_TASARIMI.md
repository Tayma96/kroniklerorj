# Kronikler Online — Oynanış ve Deneyim Tasarımı

Tarih: 30 Ekim 2026 · Durum: tasarım; Berkay'ın onayına sunuldu. Ürün sözleşmesi `KRONIKLER_ONLINE_GDD.md`,
teknik başlangıç `docs/online/FAZ0_DENETIM.md`. Bu belge "oyuncu ne yapar, ne hisseder" sorusunu cevaplar;
her faz bu deneyimin bir parçasını kurar. `[PARAMETRE]` işaretli sayılar kapalı testte ayarlanır.

## 1. Tek cümlelik vaat

**Küçük bir Anadolu kasabasında, gerçek insanlarla ve onlar kadar canlı NPC'lerle, kuşaklar boyu süren bir
hayat yaşarsın; yaptığın her iyilik ve kötülük kasabanın hafızasına yazılır ve bir gün sana geri döner.**

Üç his hedefi:
1. **Tek oyunculudaki serbestlik:** istediğin mesleği, aileyi, dostu, düşmanı seçersin; yol dayatılmaz.
2. **İnsanlar gerçek:** oyuncu da NPC de seni hatırlar, sebebini söyler, kendi hesabını yapar.
3. **Sonuç ağır ama adil:** zarar görebilirsin, ölebilirsin; ama her darbenin önceden işareti, sebebi ve
   telafi yolu vardır. Yokken pusuya düşürülmezsin.

## 2. Bugün kesinleşen kararlar (Berkay, 30 Ekim 2026)

| Konu | Karar | Tasarım karşılığı |
|---|---|---|
| Zaman | Ortak takvim; herkes aynı hızda yaşlanır | Dünya saati sunucuda akar; giren de girmeyen de yaşlanır (§3) |
| Çatışma | Ölüm mümkün ama zor; kanıtlanırsa ağır ceza | Çatışma merdiveni, hazırlık izi, kadı ve kan davası (§7) |
| Hayat | Hanedan sürer | Evlilik, doğum, ölüm, vâris; mal, nam ve husumet vârise geçer (§8) |
| Gelir | Sonra | Oynanışa güç satan hiçbir şey eklenmez; karar kapalı testten sonra |
| Dünya | Önce küçük kasabalar, sonra birleştir | Kasaba = bir dünya; ileride bölge yolları (§9) |
| Giriş | Google | Faz 1 |

## 3. Zaman ve yaş

**Öneri: 1 gerçek gün = 1 mevsim (3 ay) `[PARAMETRE]`.** Bir yıl 4 gün sürer.

| Hayat dönemi | Oyun yılı | Gerçek süre |
|---|---|---|
| Çocukluk (7→16), yeni oyuncu | 9 yıl | **İlk oturumda oynanan prolog** (aşağıda) |
| Gençlik (16→20) | 4 | 16 gün |
| Yetişkinlik (20→40) | 20 | 80 gün |
| Olgunluk (40→60) | 20 | 80 gün |
| Yaşlılık (60→~70) | ~10 | ~40 gün |
| Bir hayat (16'dan ölüme) | ~50 | **~7 ay** |
| Oyunda doğan vâris 0→16 | 16 | 64 gün; ebeveyn yaşarken büyür |

Neden "1 gün = 1 ay" değil: 7'den 13'e 72 gün, bir hayat 600 gün sürerdi. Kuşak hissi kaybolur, kasabaya
yeni gelen oyuncu aylarca çocuk kalırdı.

**Çocukluk prologu.** Yeni oyuncu 7 yaşında çocuk olarak beklemez. İlk oturumda açılış sinematiği ve ardından
gelen 3 çocukluk sahnesiyle 7'den 16'ya kadar oynar:
- Bu sahneler gerçek kasaba NPC'leriyle geçer: "Demirci Murat'ın oğluyla kavga ettin mi, barıştın mı?"
- Kararlar mizacı, ilk becerileri ve 2-3 ilk bağı (bir dost, bir küs) belirler.
- Oyuncu 16 yaşında kasabaya "kendi ayakları üstünde" çıkar. NPC'ler onu tanır, çünkü çocukluğu onlarla geçti.

**Mevsim dönümü.** Her gün sabah 05:00'te (Türkiye saati) dünya bir mevsim ilerler `[PARAMETRE]`:
- NPC'ler kararlarını verir; ürün, ücret, kira ve vergi işler.
- Yaşlanma, doğum, ölüm ve olaylar çözülür.
- Herkese "Mevsim Kartı" hazırlanır.

**Yokken ne olur (yokluk cezası yok):**
- Karakterin "olağan düzen"ini yaşar: mesleğinde çalışır, evini geçindirir, ailesine bakar. Bunları sen
  önceden ayarlarsın, varsayılanları da makuldür.
- Kaçırdığın şey fırsatlardır, ceza değildir.
- Kullanılmayan takat bir sonraki mevsime en çok 1 mevsimlik kadar taşınır. Böylece iki gün gelmesen
  de kaybın yoktur, ama biriktirip farm da yapılamaz.

## 4. Bir oturum: oyuncu ne yapar, ne hisseder

Hedef 5-15 dakika. Ekranlar tek oyunculudakilerle aynı ailedendir: ana sayfa, karakter, ilişkiler, mahalle,
menü. Fark şu: listelerde gerçek oyuncular da vardır, isimlerinin yanında küçük bir mühür bulunur.

1. **Mevsim Kartı (10 sn):** "Sen yokken" özeti, en çok 5 madde:
   - "Kâtip Hasan senin hakkında iyi konuştu (Hasan: oyuncu)."
   - "Demirci Murat'ın kızı evlendi."
   - "Rakibin Ahmet, Murat'la iki kez görüştü — sebebi bilinmiyor."
2. **Açık gerilimler (en çok 5):** her biri bir karttır. Kartta kimin, neden ve şimdi ne yapabileceğin yazar:
   "Murat sana kırgın (−42): geçen kış borcunu geç ödedin · yakınına kaba davrandın."
3. **Takat harcama (5-6 eylem/mevsim `[PARAMETRE]`):**
   - **Mekân:** mahalle haritasından bir mekâna git (çarşı, cami, kahvehane, meydan, han). Orada o mevsim kim
     varsa, oyuncu ya da NPC, onlarla etkileşirsin.
   - **Eylem:** sohbet, hediye, yardım, teklif, ikna, arabuluculuk, ticaret, iş, dava ya da entrika.
   - **Görünürlük:** her eylem kabul şansını ve sebeplerini gösterir. Tek oyunculudaki `teklifSansi` dökümünün
     aynısıdır.
4. **Sonuç (anında):** NPC hemen cevap verir. Oyuncuya yapılan teklif onun gelen kutusuna düşer; cevap gelene
   kadar seni bekletmez.
5. **Çıkış:** "Olağan düzen"ini gözden geçir. Ör. "dükkânı açık tut, borç isteyene hayır de, kapıları gece kilitle".

Akıştaki his: "Bu mevsim Murat'ın gönlünü alırsam Ahmet'in planı boşa çıkar."

## 5. NPC'ler de yaşıyor

Tek oyunculudaki nüfus ilkeleri aynen geçerli (`mobile/NUFUS.md`): dekor yok, sebep görünür, farm yok.
Çevrimiçi farklar:

- **Kalıcı kişi:** her NPC'nin evi, ailesi, mesleği, huyu, hayali ve derdi vardır. Yaşlanır, evlenir, ölür.
  Kasabada 150-250 NPC ve 30-60 oyuncu `[PARAMETRE]`. Az oyuncu olsa da kasaba canlı kalır.
- **Hafızası oyuncuları da kapsar:** görüş, tek oyunculudaki kalemler toplamıdır (`gorus()`). Anılara
  oyuncuların adı yazılır: "Berkay kıtlıkta bana un vermişti."
- **Gündem:** her mevsim dönümünde NPC ihtiyacına göre bir hedef seçer:
  - geçim, evlilik, borç, intikam, makam, göç;
  - bu hedef oyunculara dokunabilir: "Murat lonca kethüdası olmak istiyor, destek arıyor."
  - Gündemler Mevsim Kartı'nda fırsat olarak görünür.
- **Yeri ve vakti var:** NPC o mevsim belli bir mekândadır. Mahalle haritasında oyuncularla birlikte görünür.
- **Konuşur:** söylentiler NPC ağı üzerinden yakından uzağa yayılır. Her söylentinin kaynağı ve güveni vardır;
  her NPC her şeyi bilmez.
- **Kendi hamlesini yapar:** dost NPC çorba getirir. Hasım NPC aleyhine konuşur. Çok kinci olan, bir
  oyuncunun teklifiyle ya da kendi başına zarar planlar.
- **Oyuncu yokken NPC karar vermez:** oyuncunun yerine kimse oynamaz. Yalnız onun "olağan düzen"i işler.

## 6. Oyuncu–NPC–oyuncu üçgeni (çekirdek)

Bütün sosyal mekanik tek bir kurala dayanır: **NPC'nin bir oyuncuya bakışı, başka insanlardan duyduğundan ve
dostlarının bakışından da etkilenir.** Bu yüzden oyuncular NPC'ler üzerinden birbirine dokunabilir.

Görüşe çevrimiçinde eklenen kalemler (sebep dökümünde görünür):

| Kalem | Değer `[PARAMETRE]` |
|---|---|
| Dostunun dostu / düşmanının dostu | NPC'nin sevdiği kişilerin sana bakışının %10'u (±10) |
| Duydukları | Söylentiler, kaynağının güveniyle tartılır; yalanlanırsa söner |
| Sözleşme ve ittifak | Biriyle ittifak sözü verdiyse onun düşmanına −15 |
| Arabuluculuk sonucu | Barış: kırgınlık yarıya iner; şartlı barış: şart yerine gelince sıfırlanır |

### 6.1 Kışkırtma: "düşmanım, bana kızgın NPC'yi ikna edip bana saldırır"

Ahmet (oyuncu) Berkay'ın düşmanıdır. Murat (NPC) Berkay'a −42 bakıyor. Ahmet çarşıda Murat'la buluşur ve
**"Murat'ı Berkay'a karşı kazan"** eylemini seçer.

- **Şans:**
  - Murat'ın Berkay'a kızgınlığı ne kadar büyükse o kadar artar.
  - Murat Ahmet'i ne kadar seviyorsa o kadar artar.
  - Huyu etkiler: kinci ve hırslı kolay ikna olur, mert ve dindar zor.
  - Ahmet'in sözü ve becerisi etkiler.
  - Teklif etkiler: para, ortaklık, intikamdan pay, söz.
- **Başarı:** ikisi arasında 2 mevsimlik **ittifak sözü** doğar. Bundan sonra Murat Ahmet'in hamlelerine katılır:
  - laf yayar;
  - kadıda yalancı tanıklık eder;
  - boykota katılır;
  - baskına adam verir.
  Her katılım Murat için de risktir: yakalanırsa onun namı da yanar.
- **Başarısızlık:** Murat reddeder. Dürüst huyluysa ya da Berkay'a kızgınlığı sınırlıysa **Berkay'a haber verir**:
  "Ahmet seni kötüledi, bana para teklif etti." Ahmet'in namı düşer ve plan açığa çıkar.
- **Görünürlük:** Berkay'ın dostu olan bir oyuncu ya da NPC aynı mekândaysa görüşmeyi fark edebilir. Bu
  "kaynaklı bilgi" olarak Berkay'ın kartına düşer.

### 6.2 Arabuluculuk: "dostum, arası iyi olduğu NPC ile benim aramı düzeltir"

Hasan (oyuncu) Berkay'ın dostudur ve Murat'la (+35) arası iyidir. Hasan **"Berkay ile Murat'ın arasını bul"** der.

- **Şans:**
  - Murat'ın Hasan'a güveni artırır.
  - Kırgınlığın büyüklüğü ve sebebi etkiler: kan davası, küçük laftan çok daha zordur.
  - Berkay'ın önerdiği bedel artırır: özür, tazminat, meydanda helallik, ortak iş.
  - Tanıklar etkiler.
- **Sonuç çeşitleri:**
  - barış;
  - şartlı barış ("borcunu öde, sonra konuşuruz");
  - ateşkes;
  - ret.
  Başarı yalnız kırgınlığı azaltır, geçmişi silmez. Anı kalır, sönerek ağırlaşmaz.
- **Hasan'ın riski:** başarısız arabuluculuk Hasan'ın Murat'taki itibarından düşer. İki tarafa farklı söz
  verirse (ikili oyun) yakalanma riski vardır.

### 6.3 Diğer üçgen eylemleri

- **Şahitlik ve kefalet:** kadıda dost NPC ya da oyuncu senin lehine konuşur; düşmanınki aleyhine konuşur.
- **Haberci ve casus:** bir NPC'ye para verip birini izletirsin. Gelen bilgi güvenilirlik derecesiyle gelir;
  yanlış olabilir.
- **Ortak düşman:** iki oyuncu aynı NPC'ye karşı ya da bir NPC'yi korumak için birleşir.
- **Evlilik ittifakı:** hanedanlar arası evlilik, NPC ailelerinin bakışını da değiştirir.

Hepsi tek oyunculudaki teklif ve görüş motorunu, kalem dökümüyle kullanır. Yeni bir "puan" icat edilmez.

## 7. Çatışma merdiveni ve adalet

Her basamak bir öncekinden pahalı, daha çok iz bırakan ve daha ağır cezalı.

| Basamak | Ne yapar | İz/kanıt | Ceza (kanıtlanırsa) |
|---|---|---|---|
| 1. Laf, iftira | İtibar ve görüş düşer | Söylentinin kaynağı izlenebilir | Yalanlanınca nam kaybı, kadıda iftira cezası |
| 2. Boykot, ticari baskı | Satış ve sipariş düşer | Görünür | Lonca kınaması |
| 3. Dava | Kadıda alacak, mülk, hakaret | Belge ve tanık | Kaybedene bedel |
| 4. Kavga, darp | Yara ve sağlık kaybı | Tanık | Para cezası, sicil |
| 5. Baskın, sabotaj | Mülk ve stok zararı (hedef başına tavanlı) | İz, tanık, suç ortağı | Tazminat, hapis, sürgün |
| 6. Düello | Yara; ölümüne düello yalnız iki taraf kabul ederse | Açık | Yok (kabul edilmiş); kasabanın gözü değişir |
| 7. Suikast | Ölüm mümkün | Hazırlık izleri, suç ortağı, tanık | **Kısas ya da idam (karakter ölür, vâris geçer), sürgün, diyet; hanedana "kanlı" lekesi; kan davası** |

**Ölüm neden zor:**
- **Hazırlık:** suikast en az 2 mevsim süren bir hazırlık ister. Hedef keşfedilir, ortak (NPC ya da oyuncu)
  bulunur, araç alınır. Her adım kasabada **işaret** bırakır: "evinin çevresinde yabancılar görüldü", "Ahmet
  kiralık adam arıyormuş". Dost ağı bunları hedefe taşıyabilir.
- **Savunma:** hedefin kapı kilidi, muhafızı, ev halkı ve dost NPC'leri vardır. Hedef çevrimdışıyken bunlar
  "olağan düzen"le savunur. Çevrimiçiyse ek önlem alabilir.
- **Şans:** başarı olasılığı düşüktür `[PARAMETRE]`. Başarısız girişim çoğunlukla yaralanma ve büyük iz
  bırakır.
- **Korumalar:**
  - Kasabadaki ilk 7 gün ile 16 yaş altı ve 65 yaş üstü karakterler 5-7. basamakların hedefi olamaz.
  - Aynı hedefe yılda bir suikast girişimi yapılabilir.
  - Mülk kaybı hedef başına tavanlıdır (GDD N-5).

**Kanıt ve kadı:** ölüm ya da ağır suçtan sonra soruşturma açılır:
- Tanıklar, suç ortağının itirafı, izler ve söylentiler kanıt sayılır. Her kanıtın güveni vardır.
- Kadı bir NPC'dir. Oyuncu kadı makamı Faz 8'de gelir.
- Yetersiz kanıtta dava düşer ama söylenti kalır.
- Kanıtlanırsa ağır ceza uygulanır ve kurbanın ailesi ile NPC dostlarında **kan davası** açılır (tek
  oyunculudaki kişiye bağlı kan davası sistemi).

## 8. Hanedan, aile ve ölüm

- Oyuncular arası evlilik, iki oyuncunun da kabulüyle olur. NPC ile evlilik tek oyunculudaki gibidir.
- Çocuklar kasabada doğar ve büyür, NPC'lerle çocukluk geçirir.
- Ölümde vâris seçilir. Mal, nam, borç ve husumet vârise geçer. Kasabanın kroniğine bir satır yazılır.
- Vâris yoksa uzak bir akraba gelir; çevrimiçi hanedan kolay kolay sönmez.

## 9. Kasaba, kurumlar, büyüme

- **Kasaba = bir dünya:** 30-60 oyuncu ve NPC'ler. Dolunca yeni kasaba açılır.
- **Kurumlar:**
  - lonca: kethüda;
  - kadı;
  - subaşı: asayiş;
  - ağa ya da bey: kasabanın yöneticisi;
  - vakıf ve cami.
  Makam yoksa ya da boşsa NPC tutar. Oyuncular seçimle ya da atamayla gelir; makam hiçbir zaman tek kişinin
  girişini beklemez.
- **Birleştirme (sonra):** kasabalar arasında yol, kervan ve ticaret; sonra diplomasi ve sefer.

## 10. Kolaylık ilkeleri

- İlk oturumda yalnız tek bir bağ, tek bir iş ve tek bir karar açılır. Siyaset ve entrika sonra açılır.
- Her eylem kartı "ne harcarım, şansım ne, neden, kim öğrenebilir" sorularına cevap verir.
- Oyunculara yapılan tekliflerin varsayılan sonucu baştan yazılır. Cevap gelmezse otomatik ret olur, ceza yok.
- Sohbet sınırlı ve hız sınırlıdır. Bildirimler isteğe bağlı ve özetlidir.

## 11. Fazlar

Her faz ayrı bir uygulama planı ister (yazılacak), kendi oynanabilir testi vardır ve tek oyunculuya dokunmaz.

| Faz | Oyuncu ne yaşar | İçerik | Kabul (oynanabilir test) |
|---|---|---|---|
| 1. Kimlik ve varış | Google ile girer, adını seçer, kasaba seçer, prolog oynar, 16 yaşında kasabaya iner | Google doğrulama, hesap/profil, kasaba listesi, prolog (sinematik + 3 çocukluk sahnesi) | Temiz telefonda 3 dakikada kasabaya iniş; tek oyunculu ad hiç görünmez |
| 2. Yaşayan kasaba çekirdeği | Bir mevsim yaşar: haritada kim nerede, NPC'lerle sohbet/yardım/iş, Mevsim Kartı | Sunucu saati ve mevsim dönümü, sunucuda NPC nüfusu, mekânlar, takat, görüş dökümü, olağan düzen | 2 gün oynamayan oyuncu döndüğünde gerekçeli özet görür; NPC'ler o yokken yaşamıştır |
| 3. Oyuncular arası | Başka oyuncuyu profilinde görür, dostluk/ortaklık/borç teklif eder, gelen kutusu | Teklif ve gelen kutusu, varsayılanlar, sınırlı sohbet, söylenti | İki oyuncu birbirini beklemeden teklifleşir; cevapsız teklif cezasız düşer |
| 4. Üçgen | Kışkırtma, arabuluculuk, şahitlik, casus | Görüşe "dostunun dostu" ve "duydukları" kalemleri, ittifak sözü, haber verme | §6.1 ve §6.2 senaryoları en az iki farklı sonuçla oynanır |
| 5. Ekonomi ve meslek | Meslek, sipariş, pazar; NPC taban tedariki | Sipariş/sözleşme, yerel fiyat, farm koruması | Tek bir oyuncu yokken kasaba aç kalmaz |
| 6. Çatışma ve adalet | Merdivenin 1-7. basamakları, kadı, kan davası | İz/kanıt, savunma ve olağan düzen, korumalar, ceza | Çevrimdışı hedef işaret almadan ölmez; kanıtlı katil ağır bedel öder |
| 7. Hanedan ve zaman | Evlilik, doğum, yaşlılık, ölüm, vâris | Yaşlanma ve ölüm, vâris devri, kronik | Bir hanedan 3 kuşak simüle edilir, devir kusursuz |
| 8. Kurum ve siyaset | Lonca, kadı, ağa makamı; seçim | Yetki listesi, dönem, vekil | Makam boşken kasaba kilitlenmez |
| 9. Ölçek, denge, gelir | Çok kasaba, kasabalar arası yol | Ölçüm, maliyet raporu, gelir kararı | Ücretsiz katman sınırı raporlanır |

## 12. Açık sorular (Berkay'a)

1. Zaman hızı: 1 gün = 1 mevsim uygun mu? (Bir hayat ~7 ay sürer.)
2. Mevsim dönümü saati: sabah 05:00 mü, başka bir saat mi?
3. Oyuncu sayısı: kasaba başına 30-60 oyuncu doğru hedef mi?
4. Suikast başarısı: "zor" ne kadar zor olsun? Önerim: iyi hazırlanmış girişimde bile en çok %25.
5. Tek oyunculuyla içerik paylaşımı: meslek, eşya ve olay metinleri paylaşılsın mı? Kimlik, kayıt ve motor
   ayrı kalır. Önerim: evet.

## 13. Kurallar ve korumalar (kurucu denetiminden sonra) `[ÖNERİ]`

Bir uygulayıcının tahmin etmek zorunda kalacağı 12 nokta, aşağıdaki kurallarla kapatılır. Dönem hukukuna
dayananlar ayrıca belirtilmiştir.

1. **Çevrimdışıyken ölüm.**
   - Suikastin ilk işaretiyle sonucu arasında en az 48 gerçek saat geçer.
   - Hedef bu sürede oyuna girmediyse, ev halkı "tetikte" olur ve başarı şansı yarıya iner.
   - 7 gün oyuna girmeyen karakter "inziva"ya çekilir ve 5-7. basamaklara kapanır. Ancak hazırlığı daha
     önce başlamış bir girişim inzivada da sürer; bu sayede tehdit görünce çıkıp saklanma yolu kapanır.
   - Bildirim isteğe bağlıdır. İşaret her zaman Mevsim Kartı'na düşer.
2. **Ölümün bedeli ve ölümden kâr.**
   - Vâris malı %10 veraset vergisiyle alır; vergi kasaba hazinesine gider.
   - Mal, dönem miras paylarıyla evlatlar arasında bölünür. Bu, büyük servetleri kendiliğinden dağıtır.
   - Beceriler geçmez. NPC'lerin vârise bakışı, ebeveyne bakışlarının %30'udur.
   - Kendini öldürmek mümkün değildir.
   - Ölümüne düello iki tarafın da 20 yaşını geçmiş olmasını ve yılda en çok bir kez yapılmasını gerektirir.
   - **Katil mirasçı olamaz** (dönem hukuku): miras için aile içi cinayet miras hakkını düşürür.
3. **Kanıt ve kadı.**
   - Her kanıtın bir güveni vardır.
   - Mahkûmiyet için toplam güven eşiği ve en az iki bağımsız kaynak gerekir.
   - İdam için en yüksek eşik aranır: itiraf ya da **iki bağımsız şahit** (dönem hukuku). Altında kalan
     davalarda ceza sürgün ya da diyettir.
   - Yalancı şahitlik yakalanırsa, şahit davadaki cezayı kendisi çeker.
   - Vekil NPC sorguda, işverenine bağlılığına göre itiraf edebilir.
   - Her davada bir kez bey divanına itiraz edilebilir (Faz 8).
4. **Vâris boşluğu.**
   - Vâris 16 yaşından küçükse, ailede yetişkin bir akraba (kardeş, yeğen) varsa hanedanı o sürdürür. Çocuk
     vâris, vasinin korumasında büyür.
   - Yetişkin akraba yoksa oyuncu çocuğu "çocukluk uğraşları"yla oynar, mülkü vasi yönetir.
5. **Taciz sınırı.**
   - İki kişi arasında mevsim başına en çok 2 düşmanca eylem yapılabilir. Aynı türün tekrarında getiri azalır.
   - Arabuluculukla yapılan **barış yemini** 4 mevsim korur. Yemini bozanın namı ağır düşer.
   - Sohbet için şikâyet ve engelleme vardır. Tekrarlanan davalarda kadı **men** kararı verebilir.
6. **Terk edilen karakter.**
   - 30 gün oyuna girmeyen karakter aktif oyuncu sayılmaz; ittifak ve "dostunun dostu" hesabına girmez.
   - 180 gün sonra mülkü vakıf emanetine geçer.
   - Karakter doğal ömrünü yaşayıp ölebilir. Oyuncu döndüğünde vâris ya da kendisiyle devam eder.
7. **Çoklu hesap.**
   - Bir Google hesabıyla aynı anda tek etkin hanedan kurulabilir.
   - Oyuncular arası hediye ve borç mevsim başına tavanlıdır, tekrarında getiri azalır.
   - "Dostunun dostu" kalemi yalnız en az 4 mevsimlik bağları sayar; ±10 tavanı vardır.
   - Aynı cihazdan açılan hesaplar birbirini sayamaz.
8. **Eylemlerin çözümü.**
   - Bir kasabanın bütün eylemlerini tek bir sunucu nesnesi sırayla işler. Aynı NPC için yarışan iki eylemi
     geliş sırası belirler. Oyuncu–NPC eylemi anında çözülür.
   - Mevsim dönümünde yalnız gündem, yaşlanma ve ekonomi toplu işlenir.
9. **Başkasının ilişkisini görmek.**
   - Bir NPC'nin üçüncü bir kişiye bakışını yalnız şu durumlarda görürsün:
     - o NPC'ye yakınsan (+30 üstü);
     - bir söylenti duyduysan;
     - casus tuttuysan.
   - Bunun dışında kartta "bilinmiyor" ya da kaba bir aralık ("kızgın görünüyor") yazar. Gerçek ile bilinen
     ayrı kalır.
10. **NPC kaynaklı zarar.**
    - Çevrimdışı oyuncuya NPC'den gelen zarar 1-2. basamakla (laf, boykot) sınırlıdır ve mevsim başına
      tavanlıdır.
    - NPC'nin mülke zarar vermesi önce görünür bir tehdit ister, ardından en az bir mevsim bekler.
    - Bu bir yokluk cezası değildir: aynı kurallar çevrimiçi oyuncuya da işler.
11. **Ekonomi çevrimi.**
    - Para üretimle girer: NPC talebi, ücretler, hasat.
    - Vergi, bakım, tüketim ve veraset vergisiyle çıkar. Vergiler kasaba hazinesinden kamu işlerine harcanır.
    - Yeni gelen oyuncu seçtiği ocağın ailesiyle (NPC anne-baba-kardeş) ve ocağa göre bir başlangıç kesesiyle
      gelir. Vakıf yardımı da vardır.
    - Ücret servete değil beceriye bağlıdır. Böylece geç gelen yetişebilir.
12. **Kan davasının sonu.**
    - Kan davası şu yollarla söner:
      - diyet kabulü;
      - helallik;
      - 8 mevsim olaysız geçmesi.
    - 16 yaş altı hiçbir zaman hedef olamaz.
    - Kan davası içindeki ölüm de soruşturulur.

**Berkay'ın onayına sunulanlar:**
- 2. maddedeki dönem miras payları;
- 4. maddedeki vâris boşluğu varsayılanı;
- 5. maddedeki taciz sınırının sertliği.
