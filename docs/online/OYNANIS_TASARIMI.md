# Kronikler Online — Oynanış ve Deneyim Tasarımı

Tarih: 30 Ekim 2026 · Durum: tasarım; Berkay'ın onayına sunuldu. Ürün sözleşmesi `KRONIKLER_ONLINE_GDD.md`,
teknik başlangıç `docs/online/FAZ0_DENETIM.md`. Bu belge "oyuncu ne yapar, ne hisseder" sorusunu cevaplar;
her faz bu deneyimin bir parçasını kurar. `[PARAMETRE]` işaretli sayılar kapalı testte ayarlanır.

## 1. Tek cümlelik vaat

**Anadolu'nun bir köyünde, kasabasında ya da şehrinde, gerçek insanlarla ve onlar kadar canlı NPC'lerle, kuşaklar boyu süren bir
hayat yaşarsın; yaptığın her iyilik ve kötülük kasabanın hafızasına yazılır ve bir gün sana geri döner.**

Üç his hedefi:
1. **Tek oyunculudaki serbestlik:** istediğin mesleği, aileyi, dostu, düşmanı seçersin; yol dayatılmaz.
2. **İnsanlar gerçek:** oyuncu da NPC de seni hatırlar, sebebini söyler, kendi hesabını yapar.
3. **Sonuç ağır ama adil:** zarar görebilirsin, ölebilirsin; ama her darbenin önceden işareti, sebebi ve
   telafi yolu vardır. Yokken pusuya düşürülmezsin.

## 2. Bugün kesinleşen kararlar (Berkay, 30 Ekim 2026)

| Konu | Karar | Tasarım karşılığı |
|---|---|---|
| Zaman | Ortak takvim; 12 saat = 1 ay; ay dönümü 00:00 ve 12:00 (TR) | Dünya saati sunucuda akar; giren de girmeyen de yaşlanır (§3) |
| Çatışma | Ölüm mümkün ama zor; kanıtlanırsa ağır ceza | Çatışma merdiveni, hazırlık izi, kadı ve kan davası (§7) |
| Hayat | Hanedan sürer | Evlilik, doğum, ölüm, vâris; mal, nam ve husumet vârise geçer (§8) |
| Gelir | Sonra | Oynanışa güç satan hiçbir şey eklenmez; karar kapalı testten sonra |
| Dünya | Tek dünya: Anadolu, 7 beylik; arkadaşlar aynı dünyada | Yerleşim başına sunucu parçası; davetle aynı yerleşim (§9) |
| Giriş | Google | Faz 1 |

## 3. Zaman, yaş ve başlangıç

**Karar (Berkay): 12 gerçek saat = 1 oyun ayı.** Ay dönümleri Türkiye saatiyle **00:00 ve 12:00**'de.
Bir oyun yılı 6 gün sürer; bir mevsim 1,5 gün. Herkes aynı takvimle yaşlanır.

**Karar (Berkay): her oyuncu 12 yaşında başlar.** Tek giriş yolu vardır.

| Hayat dönemi | Oyun yılı | Gerçek süre |
|---|---|---|
| Öğrenme dönemi (12→13) | 1 | **6 gün** |
| İlk gençlik (13→16) | 3 | 18 gün |
| Gençlik (16→20) | 4 | 24 gün |
| Yetişkinlik (20→40) | 20 | 120 gün |
| Olgunluk (40→60) | 20 | 120 gün |
| Yaşlılık (60→~70) | ~10 | ~60 gün |
| Bir hayat (12'den ölüme) | ~58 | **~1 yıl** |
| Oyunda doğan vâris 0→16 | 16 | 96 gün; ebeveyn yaşarken büyür |

**Öğrenme dönemi (ilk 6 gün)** oyunun öğreticisidir; ama gerçek dünyada, gerçek insanlarla geçer:
- açılış sinematiği ve ocağın kuruluşu;
- bir zanaatın ilk adımları: çıraklık ya da yetişkin bir oyuncunun yanında çıraklık;
- mektep: okuma, hesap, ilk özellik puanları;
- yerleşimin NPC'leri ve çocuk-genç oyuncularla tanışma, ilk dost ve ilk küs;
- günlük küçük hedefler: oyunu adım adım tanıtır, her gün yeni bir sistem açar.

**Etkileşimler yaşa göre kademe kademe açılır:**

| Yaş | Açık olan |
|---|---|
| 12+ | Dostluk ve küslük, ayak işi (küçük para), çıraklık, mektep, dedikodu duymak, aile işi |
| 13+ | **Kül Yemini mührü gelir** (tek oyunculudaki gibi). Küçük ticaret, sözleşmeli iş, kavga (4. basamak), söylenti yaymak, lonca çıraklığı, flört |
| 16+ | Mülk, evlilik, düello, makam, ittifak sözü, 5-7. basamaklar |

**Usta–çırak bağı:** yetişkin oyuncu genç oyuncuyu çırak alabilir. Çırak ustasından daha hızlı öğrenir;
usta da emeğinden pay, yetenek ağacında "pir" puanı ve sadık bir genç kazanır. Davetle gelen arkadaş,
davet edenin hanesine akraba ya da çırak olarak yerleşebilir.

**Ay dönümü** (günde iki kez): NPC kararları; ürün, ücret, kira ve vergi; yaşlanma, doğum, ölüm ve olaylar
çözülür. Herkese **Dönüş Kartı** hazırlanır.

**Yokken ne olur (yokluk cezası yok):**
- Karakter "olağan düzen"ini yaşar: mesleğinde çalışır, evini geçindirir, ailesine bakar. Bunları sen
  önceden ayarlarsın, varsayılanları da makuldür.
- Kaçırdığın şey fırsatlardır, ceza değildir.
- Kullanılmayan takat en çok 2 aylık kadar taşınır. Bir gün gelmesen kaybın yoktur, ama biriktirip
  farm da yapılamaz.

## 4. Bir oturum: oyuncu ne yapar, ne hisseder

Hedef 5-15 dakika. Ekranlar tek oyunculudakilerle aynı ailedendir: ana sayfa, karakter, ilişkiler, mahalle,
menü. Fark şu: listelerde gerçek oyuncular da vardır, isimlerinin yanında küçük bir mühür bulunur.

1. **Dönüş Kartı (10 sn):** "Sen yokken" özeti, en çok 5 madde:
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
  Yerleşim başına NPC ve oyuncu sayısı yerleşim türüne göre değişir `[PARAMETRE: köy ~80 NPC / 10-25 oyuncu,
  kasaba ~200 / 30-60, şehir ~400 / 60-150]`. Az oyuncu olsa da yerleşim canlı kalır.
- **Hafızası oyuncuları da kapsar:** görüş, tek oyunculudaki kalemler toplamıdır (`gorus()`). Anılara
  oyuncuların adı yazılır: "Berkay kıtlıkta bana un vermişti."
- **Gündem:** her ay dönümünde NPC ihtiyacına göre bir hedef seçer:
  - geçim, evlilik, borç, intikam, makam, göç;
  - bu hedef oyunculara dokunabilir: "Murat lonca kethüdası olmak istiyor, destek arıyor."
  - Gündemler Dönüş Kartı'nda fırsat olarak görünür.
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

### 6.0 Tanıdıklar ve işaretler (oyuncunun elinde)

Karar (Berkay): kimin önemli olduğunu oyun değil oyuncu seçer.

- **Tanıdıklarım listesi:** oyuncu ve NPC profilinde "Tanıdıklarıma ekle" düğmesi var. Listedeki kişi bir
  işaret alır: **tanıdık · dost · düşman**. Dönüş Kartı ve gerilimler önce bu listedeki kişilerden beslenir.
  Listede olmayanlardan da önemli olaylar gelir: biri sana saldırırsa ya da teklif yaparsa listeye önerilir.
- **İşaret ile görüş ayrıdır:**
  - Senin işaretin, senin niyetin ve takip listendir.
  - NPC'nin sana bakışı ise yaşadıklarınızdan doğar (§5).
  - Bir NPC'yi "dost" işaretlemek onu seni sevmeye zorlamaz. Ama dost işaretli NPC'nin derdi ve fırsatı
    Dönüş Kartı'nda öne çıkar; ona yardım etmek kolaylaşır.
- **Oyuncular arası:**
  - **Dostluk karşılıklıdır:** istek gönderilir, kabul edilirse ikiniz de "dost" olursunuz.
  - **Düşman işareti iki türlüdür:**
    - **İçinden (gizli):** yalnız sen görürsün. Düşmanca eylemler (§7) için gerekmez; ama gizli yapılan
      hamle açığa çıkarsa nam kaybı ağırdır.
    - **Açık husumet:** meydanda ilan edilir; karşı taraf ve yerleşim görür. Düello davetini ve açık
      rekabeti açar. Açık düşmana yapılan hamlelerin nam bedeli daha hafiftir, çünkü "mertçe"dir. İlan
      edilen taraf da tetikte olur.
- **NPC önerisi:** sık etkileştiğin ya da seni etkileyen NPC'ler "listene ekle?" diye önerilir. Liste
  sınırsızdır; ekranda en yakın 15 kişi öne çıkar.

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
- **Şans (karar, Berkay):** iyi hazırlanmış girişim, olağan dikkatteki hedefe karşı **%30**. Hedefin
  dikkati bunu değiştirir:
  - **dikkatsiz** hedef (×1,5, en çok %45):
    - gece yalnız dolaşır;
    - her gün aynı saatte aynı yerdedir;
    - meyhanede sızar;
    - muhafız tutmaz;
    - uyarıları görmezden gelir;
    - düşmanıyla aynı sofraya oturur.
  - **tetikte** hedef (×1/3, ~%10):
    - muhafızı vardır;
    - yolunu ve saatini değiştirir;
    - dostlarıyla gezer;
    - kapısını kilitler;
    - yemeğini tattırır (zehre karşı).
  - "Sezgi" özelliği ve "Göz" dalı işaretleri erken fark ettirir (§14). Attar dalındaki panzehir zehri boşa
    çıkarır.
  Başarısız girişim çoğunlukla yaralanma ve büyük iz bırakır.
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
- **Vasiyet (karar, Berkay):** mirasın dağılımını oyuncu belirler: hangi evlada, eşe, akrabaya, vakfa ne
  kalacağı. Vasiyet yoksa mal eşit bölünür. Her mirasta %10 veraset vergisi kasaba hazinesine gider.
- Az pay alan evlat küsebilir; vasiyet hanede yeni gerilimler doğurur. Kimin nesi var da bilinir.
- Ölümde vâris seçilir. Mal, nam, borç ve husumet vârise geçer. Yerleşimin kroniğine bir satır yazılır.
- Vâris yoksa uzak bir akraba gelir; çevrimiçi hanedan kolay kolay sönmez.

## 9. Tek dünya: Anadolu, 7 beylik

**Karar (Berkay):** tek bir dünya. Davet edilen arkadaş, davet edenle aynı dünyada ve görebileceği yerde başlar.

- **Yapı:** 7 beylik; her beylikte bir merkez şehir, kasabalar ve köyler `[PARAMETRE: beylik başına ~1 şehir,
  2-3 kasaba, 4-6 köy]`. Köy tarım ve hayvancılık, kasaba zanaat ve lonca, şehir ticaret, siyaset ve
  medrese ağırlıklıdır.
- **Yerleşim seçimi:** oyuncu beyliği ve yerleşimi istediği gibi seçer.
- **Sınır ev sayısıdır, kilit değil:** bir yerleşimde yaşamak için bir hanede yer gerekir: kendi evin, kira,
  ailenin evi ya da ustanın yanı. Köyün evi azdır, şehrin çoktur. Ev yapılınca yerleşim büyür. Sayılar
  (köy 10-25, kasaba 30-60, şehir 60-150 etkin oyuncu) bir **yoğunluk hedefidir**. Bu hedefin üç sebebi var:
  - her oyuncunun çevresinde ~15 önemli kişi kalsın; kalabalıkta kimse kimseyi tanımaz;
  - NPC'ler kaybolmasın;
  - yerleşimin toprağı ve işi yetsin.
  Ayrıca her yerleşim bir sunucu parçasıdır ve bu yoğunluk ücretsiz katmanda rahat çalışır.
- **Davet:** davet linkiyle gelen, davet edenin yerleşiminde başlar; kapasite sınırı davette esnektir.
  İsterse davet edenin **ailesinin uzak akrabası ya da komşusu** olarak doğar ve ilk bağları hazır gelir.
- **Yollar:** yerleşimler arasında yolculuk, kervan, göç, evlilik ve ticaret var. Arkadaşın başka beylikte
  olsa da gidip görebilirsin; yol süresi ve riski vardır.
- **Kurumlar:**
  - köy kethüdası;
  - kasaba lonca kethüdası, kadı, subaşı;
  - şehirde ağa ya da bey ve divan;
  - beylik düzeyinde bey ve beylikler arası diplomasi (Faz 8+).
  Makam boşsa NPC tutar; makam hiçbir zaman tek kişinin girişini beklemez.
- **Teknik karşılık:** tek mantıksal dünya, yerleşim başına bir sunucu parçası (GDD §13). Oyuncu bunu görmez.
  Yerleşimler arası olaylar sırayla ve tekrar güvenli iletilir.

## 10. Kolaylık ilkeleri

- İlk oturumda yalnız tek bir bağ, tek bir iş ve tek bir karar açılır. Siyaset ve entrika sonra açılır.
- Her eylem kartı "ne harcarım, şansım ne, neden, kim öğrenebilir" sorularına cevap verir.
- Oyunculara yapılan tekliflerin varsayılan sonucu baştan yazılır. Cevap gelmezse otomatik ret olur, ceza yok.
- Sohbet sınırlı ve hız sınırlıdır. Bildirimler isteğe bağlı ve özetlidir.

## 11. Fazlar

Her faz ayrı bir uygulama planı ister (yazılacak), kendi oynanabilir testi vardır ve tek oyunculuya dokunmaz.

| Faz | Oyuncu ne yaşar | İçerik | Kabul (oynanabilir test) |
|---|---|---|---|
| 1. Kimlik ve varış | Google ile girer, adını seçer, beylik ve yerleşim seçer (ya da davetle arkadaşının yanına), doğar (10) ya da göç eder (16) | Google doğrulama, hesap/profil, kasaba listesi, prolog (sinematik + 3 çocukluk sahnesi) | Temiz telefonda 3 dakikada kasabaya iniş; tek oyunculu ad hiç görünmez |
| 2. Yaşayan yerleşim çekirdeği | Bir ay yaşar: haritada kim nerede, NPC'lerle sohbet/yardım/iş, Dönüş Kartı | Sunucu saati ve ay dönümü, sunucuda NPC nüfusu, mekânlar, takat, görüş dökümü, olağan düzen | 2 gün oynamayan oyuncu döndüğünde gerekçeli özet görür; NPC'ler o yokken yaşamıştır |
| 3. Oyuncular arası | Başka oyuncuyu profilinde görür, dostluk/ortaklık/borç teklif eder, gelen kutusu | Teklif ve gelen kutusu, varsayılanlar, sınırlı sohbet, söylenti | İki oyuncu birbirini beklemeden teklifleşir; cevapsız teklif cezasız düşer |
| 4. Üçgen | Kışkırtma, arabuluculuk, şahitlik, casus | Görüşe "dostunun dostu" ve "duydukları" kalemleri, ittifak sözü, haber verme | §6.1 ve §6.2 senaryoları en az iki farklı sonuçla oynanır |
| 5. Ekonomi ve meslek | Meslek, sipariş, pazar; NPC taban tedariki | Sipariş/sözleşme, yerel fiyat, farm koruması | Tek bir oyuncu yokken kasaba aç kalmaz |
| 6. Çatışma ve adalet | Merdivenin 1-7. basamakları, kadı, kan davası | İz/kanıt, savunma ve olağan düzen, korumalar, ceza | Çevrimdışı hedef işaret almadan ölmez; kanıtlı katil ağır bedel öder |
| 7. Hanedan ve zaman | Evlilik, doğum, yaşlılık, ölüm, vâris | Yaşlanma ve ölüm, vâris devri, kronik | Bir hanedan 3 kuşak simüle edilir, devir kusursuz |
| 8. Kurum ve siyaset | Lonca, kadı, ağa makamı; seçim | Yetki listesi, dönem, vekil | Makam boşken kasaba kilitlenmez |
| 9. Ölçek, denge, gelir | Çok kasaba, kasabalar arası yol | Ölçüm, maliyet raporu, gelir kararı | Ücretsiz katman sınırı raporlanır |

## 12. Açık sorular (Berkay'a)

1. ~~Zaman hızı~~ — karar: 12 saat = 1 ay; 10 yaşında başlangıç ya da 16 yaşında göç.
2. ~~Ay dönümü saati~~ — karar: 00:00 ve 12:00 (TR).
3. ~~Yoğunluk~~ — karar: ev sayısıyla doğal sınır; hedefler köy 10-25, kasaba 30-60, şehir 60-150.
4. ~~Suikast~~ — karar: iyi hazırlıkta %30; hedefin dikkati ×1,5 ile ×1/3 arası değiştirir (§7).
5. ~~İçerik paylaşımı~~ — karar: evet; meslekler ve beceriler genişletilir, her mesleğin yetenek ağacı olur (§14).

## 13. Kurallar ve korumalar (kurucu denetiminden sonra) `[ÖNERİ]`

Bir uygulayıcının tahmin etmek zorunda kalacağı 12 nokta, aşağıdaki kurallarla kapatılır. Dönem hukukuna
dayananlar ayrıca belirtilmiştir.

1. **Çevrimdışıyken ölüm.**
   - Suikastin ilk işaretiyle sonucu arasında en az 48 gerçek saat geçer.
   - Hedef bu sürede oyuna girmediyse, ev halkı "tetikte" olur ve başarı şansı yarıya iner.
   - 7 gün oyuna girmeyen karakter "inziva"ya çekilir ve 5-7. basamaklara kapanır. Ancak hazırlığı daha
     önce başlamış bir girişim inzivada da sürer; bu sayede tehdit görünce çıkıp saklanma yolu kapanır.
   - Bildirim isteğe bağlıdır. İşaret her zaman Dönüş Kartı'na düşer.
2. **Ölümün bedeli ve ölümden kâr.**
   - Vâris malı %10 veraset vergisiyle alır; vergi kasaba hazinesine gider.
   - Mal, oyuncunun vasiyetine göre bölünür; vasiyet yoksa eşit pay (§8).
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
   - Ay dönümünde yalnız gündem, yaşlanma ve ekonomi toplu işlenir.
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
      - 2 oyun yılı (12 gün) olaysız geçmesi.
    - 16 yaş altı hiçbir zaman hedef olamaz.
    - Kan davası içindeki ölüm de soruşturulur.

**Berkay'ın kararları (31 Ekim):** miras vasiyetle (2), vâris boşluğu varsayılanı kabul (4), mevsim
(1,5 gün) başına 2 düşmanca eylem kabul (5).

## 14. Meslekler, özellikler ve yetenek ağaçları

Tek oyunculudaki 15 meslek, 4 özellik ve 4 beceri temeldir; çevrimiçinde derinleşir. İçerik ortaktır (karar,
Berkay); kimlik, kayıt ve motor ayrıdır.

### 14.1 Özellikler (6) ve genel beceriler (6)

- **Özellikler:** Güç, Çeviklik, Dayanıklılık, Zekâ, Karizma, **Sezgi**. Çeviklik ve Sezgi yeni; Sezgi
  işaretleri, yalanı ve tehlikeyi fark ettirir.
- **Genel beceriler:** Dövüş, Söz (ikna, arabuluculuk), Ticaret, Zanaat, İlim (okuma, hesap, hukuk), Gizlilik
  (casusluk, iz, entrika).
- Becerinin nasıl artacağı:
  - yaparak öğrenme: tek oyunculudaki gibi;
  - mektep;
  - bir ustadan ders.
  Ay başına kazanç tavanlıdır; farm yoktur.

### 14.2 Meslek aileleri (21 meslek)

| Aile | Meslekler |
|---|---|
| Toprak | Çiftçi, Çoban, Avcı, Balıkçı, **Değirmenci** |
| Zanaat | Demirci, Marangoz, Kuyumcu, Dokumacı, **Debbağ**, **Yapı ustası** |
| Ticaret ve hizmet | Tüccar, **Kervancı**, Hancı, Fırıncı |
| İlim ve şifa | Kâtip, Şifacı, **Attar**, Müzisyen |
| Kılıç ve yol | Asker, **Ulak** |

Kalın olanlar çevrimiçiyle gelir.

### 14.3 Her mesleğin yetenek ağacı

- **Yapı:** her mesleğin **3 dalı** ve **4 kademesi** vardır. Kademeler Ahilik basamaklarıdır: çırak, kalfa,
  usta, pir.
  - Bir kademeye çıkmak için hizmet süresi ve peştamal sınavı gerekir. Tek oyunculudaki 30 aylık kademe kuralı
    çevrimiçinde 12 ay olur `[PARAMETRE]`.
  - Her kademede o mesleğin dallarına puan dağıtılır.
- **Düğümler** şunları açar:
  - tarif ya da hizmet;
  - kalite ya da hız;
  - özel eylem (ör. şaheser sipariş);
  - toplumsal hak (lonca oyu, çırak alma, dükkân açma).
- **Uzmanlaşma:** usta ancak bir dalı sonuna kadar götürebilir. Aynı meslekten iki oyuncu farklı ustalar olur,
  birbirine ihtiyaç duyar.
- **Meslekler arası bağ:** üst düğümler başka mesleklerin ürününü ister. Ör. demircinin zırhı debbağın derisini
  ve dokumacının astarını ister. Bu ürünü oyuncu ya da NPC sağlar; NPC tabanı her zaman vardır.
- **Pişmanlık hakkı:** yılda 1 puan geri alınabilir. Kalıcı kilit yoktur ama hızlı değiştirme de yoktur.
- **Usta–çırak:** usta, çırağının ağacında öğrettiği daldan **ders** verebilir. Çırak o dalı daha hızlı açar,
  usta "pir" puanı kazanır. Pir kademesi yalnız çırak yetiştirerek açılır.

**Örnek — Demirci:**

| Kademe | Silah dalı | Alet dalı | Zırh dalı |
|---|---|---|---|
| Çırak | Bıçak, hançer | Nal, çivi | Deri yelek onarımı |
| Kalfa | Kılıç, mızrak ucu (kalite +) | Saban, orak (köylü talebi, ucuz-dayanıklı) | Zincir örme |
| Usta | **Şaheser kılıç** (sipariş, ün) | Değirmen ve köprü demiri (yapı ustasıyla) | Pul zırh (debbağ derisiyle) |
| Pir | Kendi damgası: kılıçları tanınır, fiyatı artar | Lonca kethüdalığı hakkı | Ordu siparişi (savaş zamanı) |

**Dallar (her meslek için 3):**

| Meslek | Dallar |
|---|---|
| Çiftçi | Tahıl · Bağ-bahçe · Toprak ağalığı (ırgat çalıştırma) |
| Çoban | Sürü · Süt-yün · Yayla göçü |
| Avcı | Yay · Tuzak · İz sürme (Sezgi'ye bağlı) |
| Balıkçı | Ağ · Kayık · Tuzlama |
| Değirmenci | Un · Su değirmeni · Ambar (kıtlık zamanı) |
| Demirci | Silah · Alet · Zırh |
| Marangoz | Yapı · Araba-kayık · Oyma |
| Kuyumcu | Mühür-yüzük · Süs · Sarraflık |
| Dokumacı | Kumaş · Halı-kilim · Boya |
| Debbağ | Deri · Koşum · Zırh astarı |
| Yapı ustası | Ev · Köprü-sur · Han-cami (vakıf işi) |
| Tüccar | Pazar · Uzak ticaret · Kredi |
| Kervancı | Yol · Muhafız · Han ağı |
| Hancı | Konaklama · Mutfak · Haber (söylentinin merkezi) |
| Fırıncı | Ekmek · Tatlı · Toplu mutfak (kıtlık) |
| Kâtip | Belge-sözleşme · Hukuk (kadılık yolu) · Divan (siyaset) |
| Şifacı | Cerrahlık · Ebelik · Salgın |
| Attar | Ot · Merhem · Zehir-panzehir |
| Müzisyen | Saz · Destan (itibar) · Meclis (karizma) |
| Asker | Kılıç-kalkan · Ok-yay · Komuta |
| Ulak | Hız · Gizli mektup · Casusluk (Göz) |

**Ekran:** karakter sayfasındaki meslek sekmesinde ağaç dikey bir şerit olarak görünür. Dallar yan yana durur,
kilitli düğümün yanında açılış şartı yazar. 3D kuşam karakteri, açılan zırh ve silah düğümleriyle
görsel olarak değişir.

### 14.4 Her meslek vazgeçilmez (karar, Berkay)

Hedef: herkes hükümdar olmaya koşarsa yerleşim çöker. Bir meslek boş kaldığında eksikliği herkes hisseder.
Hükümdarın gücü bile zanaatkârların emeğinden gelir.

**Altı mekanizma:**
1. **Her şey eskir ve tükenir:**
   - alet, nal, giysi, zırh, ev ve köprü yıpranır;
   - ekmek bayatlar, et bozulur;
   - yıpranan her şey yeniden yapılmak ya da onarılmak zorundadır.
   Bu yüzden talep hiç bitmez.
2. **Zincirler:** her mesleğin en az iki müşteri mesleği ve en az bir tedarikçisi vardır (aşağıdaki tablo).
   Bir halka koptuğunda zincirin geri kalanı yavaşlar.
3. **NPC tabanı var ama zayıf:**
   - NPC zanaatkâr yalnız çırak ve kalfa kalitesinde çalışır;
   - ayda sınırlı iş alır, 2-3 kat pahalıdır ve onarım aylar sürer;
   - usta ve pir işlerini hiç yapamaz.
   Kimse açlıktan ölmez, kimse kilitlenmez (GDD §1); ama fark çok büyüktür.
4. **Yerleşim refahı meslek doluluğuna bağlıdır:**
   - her yerleşimin bir **lonca tablosu** vardır ve hangi mesleklerin dolu, hangilerinin boş olduğu görünür;
   - boş meslek refahı, savunmayı, nüfus artışını ve vergiyi düşürür. Örnekler:
     - demirci yoksa saban kırılır, hasat düşer, asker silahsız kalır;
     - ebe yoksa doğum riski artar;
     - şifacı yoksa yaralar geç iyileşir ya da öldürür.
5. **Kıtlık kazanç demektir:**
   - boş ya da az dolu mesleğin ücreti ve fiyatı yükselir;
   - o mesleğe başlayana lonca yardımı ve hazır siparişler gelir: "Bu kasabada demirci yok".
   Oyuncular kendiliğinden boşluklara akar.
6. **Hükümdar zanaatkâra muhtaçtır:**
   - beyin ordusu demirci, debbağ, dokumacı ve kervancı ister;
   - hazinesi vergiden, yani üretimden dolar;
   - makama aday olmak için bir meslekte en az usta olmak gerekir `[PARAMETRE]`;
   - makamlar azdır, meslek ise herkese yeter.

**Her mesleğin eşsiz toplumsal gücü** (çevrimiçi etkileşimde yalnız o meslek yapabilir):

| Meslek | Eşsiz rolü |
|---|---|
| Demirci | Silah ve zırh: savunma ve suikastte belirleyici; aletsiz hasat yok |
| Şifacı | Yarayı iyileştirir: düello ve suikast sonrası hayat kurtarır; salgını durdurur |
| Şifacı (Ebelik dalı) | Doğumu güvenli kılar: hanedanların devamı ona bağlı |
| Attar | Zehir ve panzehir: suikastin ve korunmanın anahtarı |
| Kâtip | Sözleşme, vasiyet, mahkeme belgesi: hukuki güvence, kadılık yolu |
| Hancı | Söylentinin merkezi: haber toplar, yayar, susturur |
| Ulak | Mektup ve gizli haber: yerleşimler arası iletişim, casusluk |
| Kervancı | Yerleşimler arası mal ve yolcu; yollar onunla güvenli |
| Tüccar | Fiyat bilgisi, kredi, uzak mal |
| Yapı ustası | Ev demektir yerleşimin büyümesi; köprü, sur, han |
| Çiftçi, Çoban, Değirmenci, Fırıncı, Balıkçı, Avcı | Yerleşimin karnı: kıtlıkta kaderi belirler |
| Dokumacı, Debbağ | Giysi, çadır, koşum, zırh astarı; kışın ve seferde hayati |
| Marangoz | Araba, kayık, ev ahşabı; yol ve tarım onunla döner |
| Kuyumcu | Mühür ve sarraflık: belgeyi mühürler, akçeyi tartar; Kül Yemini mührünü o okur |
| Müzisyen | Destan yazar: hanedanların namını kalıcı kılar, meclisi coşturur |
| Asker | Asayiş ve sefer; subaşının kolu |

**Zincir örnekleri:**
- buğday: çiftçi → değirmenci → fırıncı → herkes;
- yün ve deri: çoban → dokumacı / debbağ → giysi, zırh astarı, koşum;
- demir: tüccar / kervancı (ithal) → demirci → çiftçi (saban), asker (kılıç), marangoz (çivi);
- ev: marangoz + yapı ustası + demirci → yeni hane → yerleşim büyür.

**Kabul ölçütü (simülasyon):** bir yerleşimde bir meslekte hiç oyuncu yokken 2 oyun yılı simüle edilir. Refah,
fiyat ve savunma ölçülebilir biçimde düşmeli, o mesleğe giren oyuncunun kazancı ortalamanın üstüne çıkmalı.
Hiçbir meslek bu testi "fark edilmedi" sonucuyla geçmemeli.
