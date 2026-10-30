# KRONİKLER ONLINE — Oyun Tasarım Belgesi

**Sürüm:** 0.2 — yaşam simülasyonu ve yaşayan toplum taslağı
**Durum:** Tasarım ilkeleri derlendi; kapsamı ve dengeyi etkileyen kararlar `Karar Kaydı`nda açıkça işaretli
**Tarih:** 25 Ekim 2026
**Kapsam:** Yalnız Kronikler’in çevrimiçi, kalıcı ve paylaşımlı dünya modu. Tek oyunculu oyun bu belgenin kapsamında değildir.

> Bu belge bir kod talimatı değil, ürün ve sistem sözleşmesidir. Codex’e uygulama işi verildiğinde bu belgenin ilgili fazı uygulanır; açık karar kapılarına bağlı işler, karar onaylanana dek uygulanmaz.

## 0. Codex için bağlayıcı çalışma sözleşmesi

Bu belgenin uygulanması istendiğinde Codex:

1. Önce `AGENTS.md` ve `OTURUM_HAFIZASI.md` dosyalarını okur; ürün kararı gereken işte `TASARIM_PUSULASI.md`yi de kullanır. Bu belgeyi online ürün hedefi için esas alır.
2. `docs/MULTIPLAYER.md` ve mevcut online kodunu eski Diyar uygulamasının envanteri olarak görür; mevcut yapıyı veya davranışları otomatik olarak koruma zorunluluğu saymaz. Eski GDD/arşiv belgelerini ayrıca izin olmadan açmaz.
3. Yalnız istenen fazı ve onu uçtan uca tamamlamak için gereken en küçük işi yapar. Bu belgeyi tek seferde bütün oyuna dönüştürmeye çalışmaz. Önce mevcut kodu hedefli denetler ve faza göre gerçek dosya/akış haritası çıkarır.
4. Online mod için kendi kimlik, karakter, tip, kayıt alanı, sunucu sözleşmesi ve yaşam döngüsünü oluşturur. Online mod hiçbir koşulda single-player karakter adını, kaydını veya varsayılan profilini okuyup kullanmaz. Single-player dosyalarını online runtime’a bağlamaz.
5. Tek oyunculu davranışı, dosyalarını ve kayıtlarını değiştirmez. Bir online özellikle SP kuralını paylaşmak gerekiyorsa dar kapsamlı adaptör, alan izin listesi ve açık gerekçe olmadan paylaşım yapmaz.
6. `Karar Kaydı`ndaki **[AÇIK KARAR]**ları veya nihai onay bekleyen **[UZLAŞI]**ları kendiliğinden kesinleştirmez. Bir karar bağımsız fazı engellemiyorsa işine devam eder; kararın gerektirdiği fazı bekletir ve etkisini raporlar.
7. Sunucu sonucunu otorite kabul eder. İstemciden gelen sonuç, RNG, sahiplik, itibar veya yetki bilgisini doğrulamadan kabul etmez. Her önemli işlem sebebi, bedeli ve sonucu olan kayıtlı bir dünya olayı üretir.
8. Altı dil desteğini ve mobil kısa oturum yapısını korur. Oyuncu metinlerini ekranlara gömülü sabit metin olarak eklemez; proje i18n düzenini kullanır.
9. Ücretli servis, ücretli API, gizli anahtar, canlı sunucuya entegrasyon, deploy, APK, commit veya push işlemi yapmaz; ayrıca istenmiş ve uygun görülmüş olmalıdır. Ücretsiz katmandaki kapasiteyi kanıtlanmış üretim kapasitesi gibi sunmaz.
10. İstenen doğrulamayı gerçekten çalıştırır; çalıştırmadığı testi geçmiş gibi bildirmez. Her faz sonunda değişen dosyaları, kararları, doğrulamayı ve kalan riski kısa raporlar.

### Belgedeki karar etiketleri

- **[KESİN — Berkay]** Berkay'ın açıkça belirttiği ürün yönüdür; Codex bunu tersine çeviremez.
- **[UZLAŞI — onay bekliyor]** Tasarım görüşmelerinde ortaklaşılan ilkedir; önemli ürün etkisi varsa uygulama öncesi Berkay'ın onayı gerekir.
- **[ÖNERİ]** Oynanabilir bir başlangıç tasarımıdır; onaylanmış kapsam veya kesin kural sayılmaz.
- **[PARAMETRE]** Alfa ölçümü ve dengelemesiyle belirlenecek sayısal değerdir. Örnekteki sayı norm değildir.
- **[AÇIK KARAR]** `Karar Kaydı`nda sahibi ve bağımlı fazı belirtilen, Codex'in kendi başına kapatamayacağı konudur.

## 1. Ürün tanımı

**[KESİN — Berkay] Kronikler Online bir yaşam simülasyonudur; krallık yönetimi oyunun kendisi değil, olası yaşam yollarından yalnızca biridir.** Oyuncular ve NPC'ler aynı yaşayan toplumun içinde çalışır, ilişki kurar, geçim sağlar, bilgi taşır, kurumları etkiler ve birbirlerinin hayatında iz bırakır. Bir oyuncu hükümdar olabilir; bir başkası çiftçi, demirci, tüccar, şifacı, haberci, arabulucu veya asker olarak toplumun akışını değiştirebilir. NPC'ler de yalnızca görev veren dekor değildir: kendi ihtiyaçları, bağları, bilgileri, gündemleri ve dünya üzerindeki ölçülebilir etkileri vardır.

Dünya katmanlıdır: kişisel hayat, yakın çevre, yerel toplum ve daha geniş kurumlar birbirini etkiler. Her aktörün etkisi aynı büyüklükte olmak zorunda değildir; fakat gündelik bir eylem bile yakın çevrede anlaşılır bir iz bırakabilmelidir. Büyük siyasal makamlar bu toplumsal simülasyonun bir parçasıdır, bütün oyuncuların ulaşması gereken son hedef değildir.

**Oyuncu vaadi:** “Dünyaya kısa süreliğine girsem bile anlamlı bir karar veririm; dünyadaki insanlar beni ve yaptıklarımı hatırlar; ben yokken dünya başkaları için yaşar, fakat oyun hayatımı kaçırma korkusuna dönüştürmez.”

### Tasarım hedefleri

- Oyuncu ve NPC aynı sosyal/siyasi kurallara tabi olsun; kontrol ve kimlik kaynakları ise ayrı kalsın.
- Her oturum 5–15 dakikada tamamlanabilen, sebebi ve sonucu anlaşılan en az bir anlamlı karar sunsun.
- Toplumdaki rol, yalnız unvan değil; başkalarının ihtiyaç duyduğu iş, sorumluluk ve pazarlık gücü yaratsın.
- Oyuncular arası işbirliği, rekabet, aracılık ve entrika aynı ilişki sisteminden doğsun.
- Oyuncu çevrimdışıyken dünya akabilsin; kısa yokluk zorunlu günlük giriş veya gizli/ani ceza yaratmasın. Uzun dönem karakter yaşlanması ve ölümü D-02 açık kararıdır.
- Toplam 10.000 hesap hedefi için mimari plan yapılsın; gerçek eşzamanlı kapasite ölçümle kanıtlansın.
- Oyuncu, her oturumda başka oyuncu çevrimiçi olmasa da kendi başına tamamlayabildiği anlamlı bir karar alsın; aynı oturumda en azından bir NPC tepkisi veya kısmi dünya sonucu görebilsin.
- Meslekler barışta ve kriz anında topluma katkı sağlasın; hiçbir temel hizmet belirli bir insan oyuncunun çevrimiçi olmasına bağlı kalmasın.
- NPC gündemleri boş bölgelerde de düşük sıklıkta sürsün; etkin oyuncu oturumlarında en az bir NPC kaynaklı yeni gündem veya gelişme üretilebilsin.

### Tasarım pusulasına uyum

En fazla 3–5 açık gerilim gösterilir. Yakın çevrede yaklaşık 15 önemli kişi bulunur; daha geniş nüfus katmanlı açılır. Para, sosyal bağ, bilgi/ustalık ve itibar birbirinden farklı sermayelerdir. Her önemli kararın bedeli, alternatifi, anlaşılır sonucu ve telafi yolu vardır. Arayüzü kilitleyen bekleme, yokluğa bağlı gizli/ani ceza, parayla bekleme atlama ve tekrarlı eylemden sınırsız kazanç yoktur. Uzun dönem karakter yaşamı ve makam devri `Karar Kaydı`na tabidir.

## 2. Kapsam ve kapsam dışı

### İlk ürün kapsamı

- Online’a özel hesap profili ve ayrı çevrimiçi karakter oluşturma.
- Kalıcı ortak toplum; oyuncu/NPC dizini, konum, hane/kurum ve kamu olayları.
- Sosyal ilişki, itibar, güven, bilgi ve söylenti sistemi.
- Oyuncu-NPC ve oyuncu-oyuncu görev/iş/karar etkileşimleri.
- Üretim, sipariş, tedarik ve değiş tokuşla birbirine bağlı ekonomi.
- Gündelik yaşam ve meslek katkıları; kurum, topluluk ve seçilmiş/atanmış liderlik bunların üzerinde yükselir.
- Söylenti, gözlem, diplomasi, hazırlık, savunma ve çevrimdışı talimatları içeren çatışma tasarımı.
- Makam devri, uyku/terk edilmiş hesap ve mülk sürekliliği için oyuncu yokluğunu cezaya çevirmeyen bir politika.
- Altı dil, kısa oturum, bağlantı kopması ve dönüş özeti.

### İlk sürümün kapsam dışı

- Sınırsız, her oyuncunun her şeyi yaptığı sandbox simülasyonu.
- Gerçek zamanlı fizik tabanlı kalabalık savaş veya binlerce karakterin istemcide aynı anda çizilmesi.
- Üretken yapay zekâ çağrısına bağlı her NPC karar döngüsü. NPC davranışı ölçülebilir kurallar/şablonlarla sunucu tarafında çalışır.
- Ücretli güç, çevrimiçi olma süresini satın alma, gerçek parayla siyasi yetki veya zorunlu günlük görev.
- Çevrimdışı oyuncunun karakterini otomatik oynatıp ölümüne/itibar kaybına götürmek.
- Bu belgede yazmayan her eski beta özelliğini aynen koruma taahhüdü.
- Bütün oyuncuların hükümdar, asker veya savaş katılımcısı olmasını gerektiren bir ilerleme yolu.
- Her NPC'yi her anda ayrıntılı simüle etmek veya her oyuncuya tüm dünya üzerinde eşit ölçekte etki vermek.

## 3. Temel oyuncu döngüsü

1. **Dünyayı oku:** dönüş özeti, yakındaki 3–5 gerilim, ilgili kişiler ve kurumlar gösterilir.
2. **Niyet seç:** arabuluculuk, görev alma/verme, üretim, pazarlık, araştırma, destek, yönetim veya çatışma.
3. **Bedel ve risk gör:** gereken zaman/ham madde/itibar/ilişki, yetki şartı ve muhtemel riskler açıklanır. Gizli bilgi varsa “bilinmiyor” diye belirtilir.
4. **Sunucu çözümlesin:** yetki, ön koşul, kaynak, sıra ve güvenlik kontrollerinden sonra tekil olay üretilir.
5. **Sonucu gör:** anlık netice ve sebep gösterilir; gecikmiş etkiler ilgili olduğunda izlenebilir bir gündem maddesi olur.
6. **İlişkiyi derinleştir:** karakterler sonucu hatırlar; sonraki fırsat/engel kişinin huyu, geçmişi ve bildiği gerçeklere göre değişebilir.

Bir eylem tek dokunuşla hemen bitmek zorunda değildir; fakat oyuncu çevrimdışıyken devam eden süreç için geri sayım beklemeye zorlanmaz. Üretim/sipariş gibi işler dünya olaylarıyla sonuçlanır ve oyuncu dönüşünde özetlenir.

## 4. Dünya nüfusu ve kimlik sınırı

### Kimlik ve çevrimiçi karakter

- Hesap kimliği, online karakter kimliği ve görünen ad ayrı alanlardır. Sunucu ID’leri değişmez ve benzersizdir; görünen ad kimlik veya yetki kanıtı değildir.
- İlk online girişte çevrimiçi profile özel ad seçilir. Online ad hiçbir yerde otomatik olarak single-player adından kopyalanmaz. SP adına fallback yasaktır.
- Bir hesabın karakter slotu ve yeniden adlandırma politikası `Karar Kaydı`nda onaylanana kadar şemaya sabitlenmez. Önerilen başlangıç: hesap başına bir etkin online karakter; ad benzersizliği dünya/realm içinde denetlenir; sakıncalı adlar sunucu tarafında filtrelenir.
- Online portre/kimlik, online üretim seçeneklerinden gelir. SP kayıt dosyasını içe aktarma, SP karakterini online’a yükseltme veya SP profilini silme yoktur.
- Her istek oturum belirteciyle hesap ve karaktere bağlanır. İstemcinin `actorId` vermesi tek başına kimlik doğrulamaz.

### Toplumsal nüfus katmanları

Nüfus, aynı anda tümünü simüle edip ekranda göstermek yerine önem ve etkileşim yakınlığına göre katmanlanır:

1. **Yakın çevre:** oyuncunun bulunduğu yer, ilişkileri ve etkin işleri içinde yaklaşık 15 önemli kişi.
2. **Yerel toplum:** mahalle/kasaba/ordu/lonca gibi kurumda ilgili olan NPC ve oyuncular.
3. **Diyar toplumu:** kamu görevlileri, ileri gelenler, temsilciler, liderler ve önemli olayların tarafları.
4. **Arka plan nüfusu:** ekonomik, askerî ve demografik toplamlara katkı veren, bireysel simülasyonu yalnızca olay/etkileşim onları önemli kıldığında etkinleşen sakinler.

Her NPC’ye kalıcı online `actorId` verilir. NPC ve oyuncu actor’ları bazı eylem/ilişki sözleşmelerini paylaşabilir; `actorKind`, kontrol sahibi, kimlik doğrulaması, karar üreticisi ve veri kaynağı açıkça farklı alanlardır. Bir NPC asla oyuncu hesabı gibi doğrulanmaz; oyuncu NPC kimliği taklit edemez.

## 5. Yaşayan dünya ve zaman

### Önerilen saat modeli

- “Herkes Hazır olunca ay ilerlesin” kapısı kaldırılır. Çevrimiçi oyuncular birbirini bekletmez.
- Dünya saati sunucuda akar; istemci yalnızca sunucunun verdiği zaman ve olayları gösterir. İstemci saatini değiştirmek ilerleme veya sonuç değiştirmez.
- Her saniye tüm nüfusu koşturmak yerine olay/alarm temelli işler ve toplu düşük frekanslı simülasyon kullanılır. Yalnız ilgili alanda/olayda aktör bireysel detayla simüle edilir.
- Dünya zamanı, karakterin biyolojik yaşı, oyuncunun gerçek hayatta çevrimdışı kaldığı süre ve UI oturumu ayrı kavramlardır.
- Öneri: oyuncu karakteri çevrimdışıyken yaşlanmaz ve kendiliğinden ölmez. Takvimdeki dünya olayları ilerleyebilir. Bu kural “yokluk cezası yok” ilkesinin ürün karşılığıdır.
- Ekonomik sipariş, yolculuk, diplomatik teklif gibi zaman alan işler ilerleyebilir; sonucu ve bitiş koşulu önceden görünür olur. Hiçbir süreç gerçek zamanlı giriş serisine veya online kalma zorunluluğuna bağlanmaz.

### Ay turunun yerine önerilen oynanış ritmi

Öneri, ayları daha sık atlatmak değil; oyuncuyu tur kilidinden çıkarıp **anlık karar + arka planda dünya ilerlemesi + ihtiyaç olduğunda olay** modeline geçmektir. Dünya saati akar, ama bütün dünya her dakika topluca “oynanmış” sayılmaz.

1. **Anlık kararlar:** konuşma, bilgi sorma, arabuluculuk teklifi, sözleşme imzalama, sipariş verme ve görev/otorite kullanma gibi işlemler sunucu doğrulamasından sonra hemen çözülür. Oyuncu bir sonraki ayı veya diğer oyuncuların Hazır olmasını beklemez.
2. **Rızaya bağlı oyuncu etkileşimleri:** başka oyuncunun cevabı gereken teklif (ittifak, ortaklık, arabuluculukta taviz kabulü) karşı tarafa bekleyen karar olarak gider. Varsayılan olarak kısa bir son tarih yoktur; cevap gelmemesi teklif sahibine otomatik kayıp veya yaptırım doğurmaz. Taraflar isterse teklife kendi süresini koyabilir.
3. **Arka plan işleri:** üretim, kervan, eğitim, inşa ve diplomatik haberleşme gibi işler sunucuda başlangıç/bitiş koşulu olan emirlerdir. Dünya saatiyle ilerler; oyuncunun çevrimiçi kalması gerekmez. Süre yalnızca oyuncu için bekleme duvarı oluşturuyorsa iş anlık/sonraki olay çözümüne çevrilir. İşin iptal, hızlandırma veya alternatif yol maliyeti açıkça gösterilir; parayla atlama yoktur.
4. **Dünya nabzı:** altyapı zamanı geldiğinde yalnız vadesi olan işleri ve ilgili bölge/kurum olaylarını işler. Başlangıç uygulaması için dakikalık tarama yalnız teknik bir alarm üst sınırı olabilir; tüm NPC’leri her dakikada simüle etme kuralı değildir. Ölçüm, daha seyrek toplu iş veya olay kuyruğunun daha iyi olup olmadığını belirler.
5. **Toplumsal gelişmeler:** NPC gündemleri sabit ay sonu olayları gibi değil, ihtiyaç/çıkar/temas/kanıt gibi tetikleyiciler oluştuğunda doğar. Oyuncuya görünen gündem kısa bir “ne oldu, niçin önemli, şimdi ne yapabilirim?” kartıdır.
6. **Özet ritmi:** günlük/haftalık özet yalnız okunabilir raporlama seçeneğidir; dünya ilerlemesinin kapısı değildir. Vergi, maaş ve bakım gibi düzenli ekonomi kalemleri hesapta tahakkuk edebilir, fakat bu tahakkuk global takvimi veya oturum açmayı bekletmez.

**Örnek kısa oturum:** Berkay girer, Ahmet’le gerilimin nedenini öğrenir, Hasan’dan tanık bilgisini ister ve iki tarafa farklı tavizli arabuluculuk teklifleri yollar. Teklifler hemen kayda geçer; taraflar çevrimiçi değilse dünya beklemez ve Berkay da beklemek zorunda kalmaz. Berkay aynı oturumda demirci siparişini veya garnizon görevini düzenler, çıkar. Ahmet sonradan teklife yanıt verir; olay kaydı ve Berkay’ın dönüş özeti güncellenir. Arada herkesi aynı ayı ilerletmeye zorlayan toplu buton yoktur.

Bu modelde **ay/yıl takvimi**, gerekiyorsa tarih etiketi ve uzun dönem anlatı içindir; oyuncu eylemi, NPC kararı, kaynak üretimi veya savaş çözümü için senkronizasyon birimi değildir. Başlangıçta gerçek zaman ölçeği ve uzun işlerin dakika/saat karşılıkları ürün testiyle ayarlanır; hiçbir iş oyuncuyu çevrimiçi tutmayı zorunlu kılmaz.

### Olay akışı

Sunucu her eylem/önemli değişiklik için değişmez bir `WorldEvent` kaydı üretir. Örnek alanlar: `eventId`, `realmId`, `sequence`, `type`, `actorId`, `targetIds`, `locationId`, `createdAtWorldTime`, `visibility`, `cause`, `costs`, `outcome`, `schemaVersion`, idempotency anahtarı. Kişisel sırlar kamu olayıyla aynı görünürlükte saklanmaz.

Bir olayın sonucu yazılır, sonra bildirim/özet/akış görünümü olaydan türetilir. Tekrar gelen ağ isteği aynı etkiyi iki kez uygulamaz. Olay teslimatının tekrarlanabileceği veya sıra dışı ulaşabileceği varsayılır; tüketen taraf sıra numarası ve idempotency ile toparlanır.

### Kolektif süreçler, varsayılanlar ve FOMO sınırı

**[UZLAŞI — onay bekliyor]** Oyuncuya görünen ortak ay/hafta/tur kapısı yoktur. Seçim, konsey, divan veya savaş aşaması gibi kolektif süreçler başlangıç ve kapanışını önceden ilan eder; katılım aralığı, oyuncunun dünyaya düzenli girmesini şart koşmayacak kadar uzun tutulur. Her sürecin varsayılan sonucu açılışta açıklanır. Kapanışları günde birkaç ortak sunucu çözümleme saatine yuvarlamak yalnız operasyonel bir seçenek olup, görünür dünya takvimi veya herkes için tur yaratmaz. NPC gündemi ve bakım tahakkuku için kullanılan sunucu kalp atışı altyapı ayrıntısıdır.

**Fırsatı kaçırmak tek başına ek ceza değildir:** oyuncunun önceden verdiği geçerli talimat uygulanır; böyle bir talimat yoksa süreç türü için önceden ilan edilmiş varsayılan uygulanır. Sürecin doğal sonucu (ör. hükümdarın görev süresinin bitmesi ve seçimin sonuçlanması) ayrıca açıklanır; yokluğa özel gizli ceza eklenmez. Oyuncu arayüzü bir sayaç bitene kadar kilitlenmez. Gerçek para veya premium para beklemeyi atlatamaz. **İlk alfada kazanılmış oyun içi kaynakla kişisel bekleme hızlandırması da kapalıdır;** ekonomi simülasyonu sonrasında D-14 olarak tekrar değerlendirilebilir.

| Süreç | Katılmayan oyuncunun başlangıç varsayılanı [ÖNERİ] | Açık kalan kural |
|---|---|---|
| Seçim | Çekimser | Yeter sayı, eşitlik, boş aday ve art arda yetersiz katılım kuralı |
| Kaynak kilitlemeyen teklif | Süresi dolunca otomatik ret; teklif sahibine ek ceza yok | Gelen kutusu yükü ve bitiş süresi parametresi |
| Kaynak/emanet kilitleyen teklif | Açıkça gösterilen son tarih; yanıtsızsa otomatik ret ve önceden açıklanan emanet iadesi | İade/masraf koşulu teklifte gösterilmeli |
| Konsey veya devredilmiş karar | Geçerli ön talimat; yoksa çekimserlik veya kurumun sınırlı bakım kuralı | Yetki kapsamı ve bakım harcama tavanı |
| Savaş fazı | Oyuncunun/kurumun ön talimatı; yoksa temel garnizon savunması, ek harcama veya karşı saldırı yok | Garnizonun mevcut kaynaklarla neleri yapabildiği |
| Egemenlik veya makam devri | Sessizlik rıza sayılmaz | Yalnız açık kabul veya önceden tanımlı savaş sonu hükmü geçerlidir |
| Üretim/taşıma emri | Kaynak rezerve edilmiş ve emir geçerliyse iş tamamlanır | İptal ve kayıp koşulları işlem başında gösterilir |

Tekrarlı eylem kazancı sert günlük cooldown yerine **(oyuncu, hedef NPC, eylem türü)** için azalan getiriyle dengelenir. Farklı eylem türleri birbirini otomatik kilitlemez; güvenlik, taciz ve ekonomi sınırları ayrıca uygulanır.

## 6. Sosyal simülasyon: ilişki, bilgi, hafıza

### İlişki modeli

İki aktör arasındaki bağ tek bir “dostluk puanı” değildir. Gerektikçe şu eksenlerden oluşur: güven, yakınlık, saygı, korku, husumet, görev/borç, yemin/sadakat. Her eksen sınırlı ve anlamlı aralıkta tutulur; aynı eylem tekrar ederek sınırsız ödül vermez. İlişki aktör çiftine özeldir: Ahmet NPC, Berkay oyuncudan nefret ederken Hasan oyuncuya güvenebilir.

Kurumlar ayrıca ortak itibar/sadakat ve üyelik taşır. Bireysel ilişki, grup görüşüyle karıştırılmaz. Karakter huyu (ör. gurur, merhamet, ihtiyat), çıkarı, statüsü, geçmiş olayları ve algıladığı bilgi tepkileri etkiler; huy sabit kader değildir ve her sonucu tek başına belirlemez.

### Gerçek, bilgi ve söylenti

- **Gerçek:** sunucunun olay defterinde olan biten.
- **Bilinen:** aktörün güvenilir kaynaktan öğrendiği olay.
- **Söylenti:** kaynağı ve güven düzeyiyle yayılan, bozulabilecek bilgi.
- **İnanç/yanılgı:** aktörün doğru sandığı ama doğruluğu garanti olmayan çıkarım.

Bir NPC sadece oyuncunun ekranında görünen bilgiye göre tepki vermez. Aktör, bilgiyi nasıl öğrendiği veya neden şüphelendiği ile temsil edilir. Söylenti temas, kurum, yer, haberci ve zaman üzerinden seyrelerek yayılır. Gizli eylem, otomatik olarak tüm dünyaya bildirim üretmez. Soruşturma; tanık, iz, kayıt, çıkar ve yanlış yönlendirme gibi kanıtlarla çalışır.

### Oyuncu örneği: Hasan, Ahmet ve Berkay

Başlangıç durumu: Ahmet NPC, Berkay oyuncuyla eski bir anlaşmazlık nedeniyle düşman; Hasan oyuncu arabulucu olabilir. Sistem tek bir “aralarını düzelt” düğmesine basıp başarı garantilemez.

1. Hasan önce iki tarafın bildiği/yanlış bildiği noktaları ve husumetin nedenini öğrenir. Ahmet’ten doğrudan bilgi alabilir, ortak tanıktan iz sürebilir veya kendi itibarını riske atarak Berkay’ı dinleyebilir.
2. Tarafların çıkarına göre öneri sunar: tazminat, ortak iş, aleni özür, tanık önünde yemin, üçüncü taraf garantisi, geçici ateşkes. Her yol farklı para, zaman, itibar, siyasi risk veya taviz ister.
3. Sunucu iki tarafın kişiliğini, ilişki geçmişini, teklifin inandırıcılığını, kanıtı ve çıkarını değerlendirir; gerekçeli sonuç üretir. Başarı güveni kademeli artırabilir ama geçmiş ihaneti silmez. Kısmi uzlaşma, reddetme, yeni şart veya geçici barış geçerli sonuçlardır.
4. Hasan taraf tutabilir, bir tarafa gizli bilgi taşıyabilir veya iki tarafa farklı vaat verebilir. Bunu yapmanın kısa vadeli getirisi ve yakalanma/itibar kaybı/karşı entrika ihtimali vardır. Hangi aktörün neyi bildiği ayrı kaydedilir.
5. Dönüş özetinde “Ahmet teklifi reddetti: tanığın Berkay lehine konuşmasına güvenmiyor” gibi neden görünür. Eylem sebebi ve sonuç kaybolmaz.

## 7. Eylem çözümleme ve doğruluk

İstemci niyet gönderir; sonucu belirlemez. Sunucu her eylemde şu sırayı izler:

1. Oturum, hesap, karakter ve yetkiyi doğrula.
2. Eylem türünü, hedefi, konumu, görünürlük sınırını ve sürümünü doğrula.
3. Ön koşul, mevcut ilişki/durum ve kaynağı atomik biçimde kontrol et.
4. Tekrarlı istek anahtarını kontrol et; aynı isteği çift uygulama.
5. Sunucu tarafında kural/olasılık çözümlemesini yap; sonucu ve nedenleri kaydet.
6. Kaynakları ve aktör/kurum durumunu tek işlem sınırında güncelle; olay kaydını oluştur.
7. İstemciye yetkili sonucu ve eylem sebebini ilet; yalnız görmeye hakkı olan alanları gönder.

Çatışan eşzamanlı işlemler sunucuda sıralanır veya koşullu güncelleme ile reddedilir; istemcilerin yerel saatine güvenilmez. Geçersiz işlem anlaşılır kod ve insan dilinde açıklama döndürür. Kritik işlemde bağlantı kesilmesi işlemin yarım uygulanmasına veya iki kez uygulanmasına yol açmamalıdır.

## 8. Toplumsal roller ve kurumlar

Rol, kilitli sınıf veya ömür boyu seçilen meslek değildir. Oyuncu güven, yetki, beceri, ilişki ve dünya ihtiyacına göre birden fazla katkı sunabilir; uzmanlaşma ona daha güçlü seçenekler verir. Hükümdarlık, savaş ve idare seçeneklerdir; meslek sistemi oyuncuyu bu rollere zorlamaz. Her rolün barışta da değer üreten bir katkısı, kaynak maliyeti, pazarlık gücü ve görünür sorumluluğu bulunur.

| Meslek / toplumsal rol [ÖNERİ] | Gündelik hayattaki katkı | Gerilim ve kriz anındaki katkı | Bedel / karşı oyun |
|---|---|---|---|
| Çiftçi / çoban | Gıda, hayvan, mevsimlik ürün ve yerel arz | Erzak sözleşmesi, ürün saklama, kıtlıkta paylaşım | Hava/hasat riski, emek ve piyasa fiyatı |
| Demirci / zanaatkâr | Alet, ev eşyası, tamir ve siparişli üretim | Silah/zırh/garnizon onarımı ve kalite seçimi | Girdi, iş gücü, termin ve müşteri güveni |
| Marangoz / yapı ustası | Ev, depo, araç, köprü ve bakım | Sur, kapı, kuşatma onarımı ve sefer yolu | Malzeme, süre ve iş güvenliği |
| Terzi / dokumacı / deri ustası | Giysi, kumaş, çadır ve günlük eşya | Soğuk/yağmur koruması, sancak, koşum ve sefer donanımı | Hammadde, kalite ve moda/statü talebi |
| Tüccar / kervancı | Bölgeler arası arz, nakliye, kredi ve fiyat bilgisi | Güvenli/alternatif rota, kıtlık tedariki, haber taşıma | Sermaye, yol riski, söz ve yerel talep |
| Aşçı / değirmenci / fırıncı | Gıda işleme, öğün ve yerel hizmet | Erzak koruma, toplu mutfak, kuşatılmış yerin beslenmesi | Stok, yakıt, bozulma ve fiyat |
| Şifacı / hekim / ebe | Gündelik bakım, doğum ve hastalık yardımı | Yaralı bakımı, salgın bilgisi ve triyaj | Malzeme, kapasite ve güven; oyuncu ölümü kararı bu role bağlanmaz |
| Haberci / kâtip / tercüman | Kayıt, mektup, sözleşme, ilan ve dil desteği | Tebligat, güvenilir haber, emir ve tanıklık zinciri | Rota, gizlilik, taraflılık ve sahte haber riski |
| İzci / rehber / avcı | Yerel yol, arazi, hava ve kaynak bilgisi | Sınır hareketliliği, kervan koridoru, keşif ve yanlış alarmı ayırt etme | Bilginin eskimesi, kişisel risk ve güvenilirlik |
| Asker / komutan | Barışta nöbet, eğitim, yol/yerleşim güvenliği | Garnizon, savunma planı, sefer, emir ve geri çekilme | Yetki, ikmal, moral ve siyasi hesap verebilirlik |
| Diplomat / arabulucu / yargıç | Anlaşma, uyuşmazlık çözümü, yemin ve kayıt | Ateşkes, esir değişimi, tazminat, taraflar arası arabuluculuk | Tarafsızlık, delil, yetki ve taraf güveni |
| Hükümdar / bey / divan görevlisi | Kamu bütçesi, hizmet, atama ve yerel öncelik | Alarm düzeyi, diplomasi, savunma ve sınırlı sefer yetkisi | Meşruiyet, kurum denetimi, vergi yükü ve halk tepkisi |
| Lonca / mahalle / hane temsilcisi | Ortak standart, ihtiyaç ve yatırım kararı | Erzak/iş gücü paylaşımı, tahliye ve toplu talep | Üye rızası, temsil adaleti ve kaynak kıtlığı |

Bu roller ilk günün zorunlu seçimi değildir. Onboarding, oyuncuya “meslek seç, sonra menüyü ezberle” dedirtmez; ilk iş ve yakın toplum ihtiyacından rolü keşfettirir.

### Meslek katkısının ortak döngüsü

**[ÖNERİ]** Her meslek aynı anlaşılır toplumsal döngüyle çalışır: toplumda veya bir aktörde görünür bir ihtiyaç doğar → oyuncu/NPC iş, hizmet veya sözleşme üstlenir → süre, girdi, risk ve ilişki maliyetini seçer → sunucu teslimatı ve etkisini kaydeder → müşteriler, NPC'ler ve yerel kurumlar tepki verir → yeni ihtiyaç veya pazarlık doğar. Ödül sadece para değildir; ustalık, güven, bağlantı, bilgi, itibar, kurum erişimi ve pazarlık seçeneği de olabilir.

NPC'ler temel hizmet ve tedarikin asgari seviyesini sağlar. Oyuncu daha iyi kalite, özelleştirme, güvenilir termin, daha uygun fiyat, uzmanlık, ilişki, ölçek veya özel sözleşmeyle fark yaratır. Böylece insan oyuncu yokluğu toplumun gıda, tedavi, onarım veya haber akışını kilitlemez; insan katkısı da dekoratif kalmaz.

Meslekler savaş ekranının alt menüsü değildir. Aynı üretim, ilişki ve bilgi ağları barışta geçim ve statü; kıtlıkta toplumsal dayanışma; kriz ve savaşta ise yeni iş, risk, fırsat ve anlaşmazlık üretir. Bir mesleğin her evresinde tek bir doğru yol veya zorunlu sürekli iş bulunmamalıdır.

### Yetki ve görev devri

Bir unvan, sınırsız admin erişimi değildir. Her makamın açık yetki listesi, görev süresi/seçim veya atama usulü, bütçe sınırı, geri alma/itiraz yolu ve işlem kaydı vardır. Hükümdar belirli kararları vezir/komutan/kâtibe devredebilir. Delegasyon kapsamı ve süresi görünür olur; devreden kişi sonradan hangi işlemlerin yapıldığını görebilir. Kişisel hesabı paylaşarak delegasyon yapılmaz.

Boş makam toplumun tümünü kilitlemez: geçici kurum kuralları veya yedek temsil mekanizması devreye girer. Bu mekanizmanın maliyeti ve yetki sınırı vardır; oyuncunun iktidarını sessizce bot devralmaz.

## 9. Ekonomi ve karşılıklı bağımlılık

- Ekonomi, gerçek girdileri ve sınırlı talebi birbirine bağlar. Sipariş; ürün, miktar, kalite, teslim yeri, ödeme/emanet, malzeme kaynağı ve teslim koşulunu taşır.
- Üretim için gerekli girdi, iş gücü/ustalık ve kurum altyapısı tanımlanır. Kaynak yoksa sonuç yoktur; hayali stok veya istemci tarafından yaratılan eşya kabul edilmez.
- Arz, talep ve teslimat gecikmesi yerel piyasalarda fark yaratır. Her bölgenin bütün ekonomisi her saniye tam simüle edilmek zorunda değildir; toplu değerler ve olay anında ayrıntı kullanılır.
- Üretici fiyat, kalite, termin ve alıcı arasında seçim yapar. Ordu, belirli oyuncu demircinin çevrimiçi olmasına bağlı kalmaz: açık sipariş/başka üretici/ikmal düzeyi görünür alternatiflerdir.
- Vergi ve kamu siparişi ekonomiye kaynak aktarır; aşırı yük yerel memnuniyet ve ticari canlılığı etkiler, fakat etki kademeli ve geri alınabilir olur.
- Pazar ve oyuncu davranışı istismar kontrolleri içerir: aynı hesaplarla döngüsel kazanç, sahte işlem, altın transferi, karşılıksız tekrar ödülü, bot/flood ve fiyat manipülasyonu izlenir.
- Yeni oyuncu için asgari katkı yolu bulunur; kritik malzeme tekelinin tek oyuncuda süresiz kilitlenmesi önlenir (yedek tedarik, kamu alımı, alternatif malzeme veya ithalat gibi oyun içi seçeneklerle).
- Toplumun temel hizmetlerinde NPC taban kapasitesi ve alternatif tedarik bulunur. Oyuncu uzmanı hizmetin niteliğini, hızı veya koşullarını farklılaştırır; tek çevrimdışı oyuncu zorunlu darboğaz yaratamaz.
- Sipariş ve kamu alımı gönüllü/şeffaf sözleşmelerdir. Oyuncunun kişisel borcu, emanet ödemesi, kira veya kurumlara karşı verdiği söz uykuya geçince silinmez ya da durmaz; borçtan kaçış için yokluk/uyku kullanılamaz.
- Ekonomide beklemeyi hızlandırma, alfa başlangıcında oyun içi kazanılmış kaynakla da kapalıdır. D-14, üretim ve kaynak dolaşımı simülasyonundan sonra tekrar değerlendirilecek açık karardır.

## 10. Siyaset, çatışma ve çevrimdışı karar

Bu bölümdeki paket **[UZLAŞI — onay bekliyor]**, sefer alarmı ve meslek etkileri ise **[ÖNERİ]** statüsündedir. Sayısal değerler `[PARAMETRE]` kabul edilir; Codex bunları kesinleştiremez.

### Kurum, makam ve karakter

Beylik/krallık bir kurumdur; hükümdar oyuncu karakteri bu kurumda görev yapan kişilerden biridir. Oyuncunun hükümdar olması, oyunun yönetim ekranına dönüşmesi veya bütün toplumun tek kişinin girişini beklemesi anlamına gelmez. Hükümdar çevrimdışıyken kurumun önceden tanımlı sınırlı kuralları işler; diğer oyuncular ve NPC'ler işlerine, ilişkilerine ve kararlarına devam eder.

### Savaşa giden yol: hazırlık, ilan ve gizleme

Bir hükümdarın **hazırlık başlatması otomatik olarak savaş ilanı değildir**. Hazırlık bir niyet ve kaynak taahhüdü doğurur; oyuncu açık ilan mı, yoksa sınırlı gizli harekât mı istediğini seçer. Her iki yolda da kaynak, yetki ve sonradan doğan toplumsal etki vardır.

1. **Açık ilanlı sefer [ÖNERİ]:** Saldıran gerekçesini, hedefini ve istediği siyasi sonucu açıklar. Hazırlık aşamasından sonra ilan ve tebliğ yapılır. Açık davranmak tek başına “onur puanı” vermez. Meşruiyet ve itibar; gerekçenin inandırıcılığı, verilen sözler, hedef ve müttefiklerin bunu nasıl gördüğü, sivillere/yerel halka etkisi ve seferin sonucu üzerinden değişir. İlan, savunanın neyin tehlikede olduğunu anlamasını ve önceden verdiği talimatı uygulamasını sağlar.
2. **Gizli harekât / ani baskın [ÖNERİ]:** Gizlilik, keşif, yerel destek ve iz azaltma maliyetiyle daha dar bir hedefe yönelir; ortaya çıkarsa güven, itibar ve diplomasi sonuçları doğurur. Ani baskın şehir/taht/egemenliği tek hamlede ele geçiren ücretsiz bir kestirme değildir. Büyük birlik, uzun ikmal ve açık yol hareketleri daha çok iz bırakır; gizleme bunları sıfırlamaz. Bu seçenek geniş ölçekli savaş ilanının tüm korumalarını atlayamaz.

Hazırlık izleri tek bir “savaş geliyor” alarmı halinde herkese anında gösterilmez. Oyuncular ve NPC'ler hareketi kendi konumları, işleri, temasları ve bilgileri ölçüsünde fark edebilir: sınırda birlik toplanması, erzak/at/metal siparişlerindeki artış, onarım, yol trafiği, haberci ve elçi hareketi, pazar sıkışması, geçiş izni veya yerel konuşmalar. İzci, kervancı, haberci, esir, elçi veya tanık bilgiyi farklı güven düzeyleriyle taşıyabilir. Yanlış alarm, gecikmiş haber, yalan ve karşı istihbarat mümkündür; istemciye gizli planın tamamı verilmez.

**Tarihsel süzgeç:** 13. yüzyıl Anadolu'su tek ve değişmez bir siyasi düzen değildi; özellikle 1243 Kösedağ Savaşı sonrasındaki güç ilişkileri önceki dönemden farklılaştı. Bu nedenle dönem/yıl ve bölge kararı verilmeden her beylik için sabit ordu, haberleşme veya diplomasi kuralı “tarihsel gerçek” diye yazılmamalıdır. Kösedağ anlatısında tâbi güçlerden asker istenmesi, Kayseri'de ordu toplanması, Sivas'ta silah ve erzak bulunması ve güzergâh/mevzi tartışmaları; büyük hazırlığın lojistik ve siyasi izler bırakabileceğine örnektir. Anadolu Selçuklularında istihbarat üzerine akademik çalışma casus, haberci, elçi, tüccar ve esir gibi bilgi kanallarını inceler. Bunlar oyuna tarihsel ilham sağlar; her komşunun bütün hazırlığı mutlaka göreceğinin kanıtı değildir.

- [TDV İslâm Ansiklopedisi — Kösedağ Savaşı](https://islamansiklopedisi.org.tr/kosedag-savasi)
- [Marmara Üniversitesi — Anadolu Selçuklularında İstihbarat](https://openaccess.marmara.edu.tr/entities/publication/88822baa-9008-4dfa-8f87-17d7789a53d8)
- [Cambridge History of Turkey — Anatolia under the Mongols](https://www.cambridge.org/core/books/abs/cambridge-history-of-turkey/anatolia-under-the-mongols/73C5FC788C55900D12455E170F5535C8)

### Beylik alarmı ve toplum tepkisi

**[ÖNERİ]** Alarm bir kurumun hazırlık durumu ve maliyetli kararıdır; ücretsiz savunma bonusu veya tüm oyunculara zorunlu savaş görevi değildir. Kurumun yetkilisi, önceden seçilmiş temsilci veya sınırları belirli NPC görevli, talimata göre alarmı değiştirebilir. Kral/bey çevrimdışı diye seviye değişimi kilitlenmez; delegasyon ve harcama sınırı kayıtlıdır.

| Durum | Oyun içi anlamı | Beklenen bedel ve toplum etkisi |
|---|---|---|
| Olağan düzen | Olağan nöbet, normal garnizon ve yerel işler | Olağan maaş/ikmal; üretim ve pazar normal |
| Şüpheli hareket | Güvenilirliği sınırlı bir işaret araştırılır; keşif ve haber toplama artırılır | Keşif emeği/küçük masraf; yanlış alarmın itibar ve ticaret maliyeti olabilir |
| Yüksek teyakkuz | Sınır nöbeti, kritik depo/kapı gözetimi, kısmi stok hazırlığı | Ek maaş/erzak; bazı iş gücü ve kervan akışı askeri ihtiyaca kayar |
| Genel seferberlik | Yetki ve kaynak eşiği sağlanırsa uygun birlikler toplanır; savunma emirleri uygulanır | En yüksek tekrarlayan hazine/erzak maliyeti; üretim, pazar, moral ve hane hayatında belirgin baskı |

Seviye değişiminin kapsamı, maliyeti ve muhtemel etkisi önce gösterilir. Alarm yükseldikçe hazırlık artabilir ama halkın/çalışanların zamanı, kaynak ve ticaret üzerindeki fırsat maliyeti de büyür. Acil ihtiyaç yerel ekonomide yeni sipariş ve iş doğurur; bütün demirciler, çiftçiler veya askerler otomatik olarak savaşa alınmaz. Durum düşünce alarm düşürülebilir, ancak tüketilen kaynak ve bozulan güven kendiliğinden geri gelmez.

### Savunma süresi ve önceden verilmiş talimat

**[UZLAŞI — onay bekliyor]** Dar, oyuncunun çevrimiçi olmasını gerektiren tepki penceresi varsayılan tasarımdan çıkarılmıştır. Açık ilanlı savaşın her çözüm fazı için önerilen en erken çözüm zamanı `max(popülasyon düzeyindeki aktif oyuncu giriş aralığı P90, alfa için seçilen asgari tebliğ)` olur. Başlangıçtaki 36–48 saat yalnız alfa parametresi hipotezidir; giriş verisi ve oyun testiyle ayarlanır. Ölçüt tek tek hedefin alışkanlığını ifşa etmez ve seyrek oyuncuya daha uzun süre vererek seyrek girişi ödüllendirmez. `Aktif oyuncu` tanımı alfa öncesi sabitlenir; veri kimliksiz/toplulaştırılmış tutulur ve saldırana gösterilmez.

Oyuncu tebliğ sırasında çevrimiçi olursa ek taktik seçenek bulabilir; katılmak zorunda değildir. Savunmanın temeli önceden verilmiş, kapsamı/süresi/harcama sınırı/iptal koşulu görünen talimat, yetkili temsilci, mevcut garnizon ve alarm düzeyidir. Tebliğ süresi aşamasının ne zaman çözülebileceğini sınırlar, çevrimiçi katılımı zorunlu kılmaz. Daha dar gerçek zamanlı savunma penceresi ancak alfada çevrimdışı savunan kayıpları ölçülen eşik üzerinde çıkarsa yeniden değerlendirilir.

### Savaş fazı, hedef sınırı ve kayıp tavanı

- Bir savunulan hedefte, bütün saldırganlar ve savaş kayıtları genelinde aynı anda en fazla bir çözümlenmemiş faz bulunur. Yeni fazlar ilan sırasına göre kuyruğa girer.
- Bir saldıranın aynı hedef için en fazla bir kuyruk kaydı bulunur. Kayıtların son kullanma süresi ve faz açma bedeli olur. Açılan fazın ilan edilen ilerleme/çözüm son tarihi vardır; ilerlemeyen faz zaman aşımına uğrar ve belirlenmiş varsayılanla kapanır. Böylece ucuz faz açıp hedefi veya kuyruğu kilitleme teşviki azaltılır.
- Mülk kaybı tavanı **saldıran başına değil, hedef başına** ve kayan zaman penceresinde ölçülür; birden çok saldırganın kaybı çarpmasını önler. Eski kayıplar pencere dışına çıktıkça tavan alanı yenilenir; hedef bir kez saldırıldı diye kalıcı bağışıklık kazanmaz. Sayı ve pencere süresi `[PARAMETRE]`dir.
- Saldıran, hedefin kesin kayıp hesabı yerine kaba direnç bantlarını görür. Savunan ayrıntılı risk ve kayıp dökümünü görür.
- Haraç/vasallık gibi siyasi sonuçlar mülk kaybı tavanından ayrı bir hatta çözülür; bu ayrılık sınırsız siyasi baskı izni değildir. Her siyasi hedefin açık şartı, rıza/yetki kuralı, süre sınırı ve kötüye kullanım limiti ayrıca tanımlanır. Sessizlik egemenlik devri veya teslim kabulü sayılmaz.

### Savaşın sonu ve ateşkes

Savaşın ilan edilen siyasi hedefi ve bitiş yolu olmalıdır. Uzun hazırlık, ilan, çözüm fazları, ikmal ve diplomasi kaynak tüketir. Azami savaş süresi veya savaş yorgunluğu eşiği `[PARAMETRE]` olarak tanımlanır; süre dolunca statükoyu koruyan otomatik ateşkes/armistice savaşı sonsuz tacize dönüşmekten çıkarır. Sessizlikle mülk, makam veya egemenlik devredilmez. Ön talimatlar ateşkes teklifini kabul etme/ret etme veya hangi asgari koşulda kabul edileceğini kapsayabilir. Ateşkes sonrası yeniden saldırı bekleme sınırı yalnız ateşkes öncesi saldırana uygulanır; savunanın aynı savaşta kaybettiği mülkü geri almaya yönelik tanımlı istisna ayrıca korunur. Süre ve kapsam alfa/karar parametresidir.

### Yokluk, uyku ve makam devri

**[UZLAŞI — onay bekliyor]** Oyuncu çevrimdışıyken kurum ve dünya akmaya devam eder; makamın/kurumun sonucu tek kişinin anlık girişine kilitlenmez. Karakter, oyuncu adına otomatik olarak NPC gibi karar vermez, entrika kurmaz veya kontrolsüz kaynak harcamaz. Karakterin çevrimdışıyken yaşlanma/ölüm politikası ise D-02'de açık karardır. Makamlar için dönem sınırı, seçim/halef usulü, meşruiyet aşınması ve terk edilmiş makam devri karakter ölümünden bağımsız gereksinimdir (**A-04a**). Karakter ölümü, vâris ve hane sistemi ayrı, zorunlu olmayan karardır (**A-04b**); tek oyunculu hanedan verisi çevrimiçi dünyaya taşınmaz.

**Uyku kademeleri [ÖNERİ; eşikler PARAMETRE]:**

| Örnek yokluk süresi | Önerilen davranış | Koruma / açık tasarım noktası |
|---|---|---|
| 0–7 gün | Ön talimatlar ve yetki devri işler; çevrimdışı olma tek başına yaptırım doğurmaz | 7 gün yalnız ilk test eşiği; uyarı/vekil ayarı için UX tasarlanır |
| 7–30 gün | Oyuncu açıkça belirlediği temsilci veya kurumun kısıtlı geçici usulüyle temsil edilir | Vekil büyük siyasi/egemenlik kararını tek başına alamaz; mevcut talimatı aşamaz |
| 30–90 gün | Otomatik uyku kademesi adayı: kişisel üretim/gelir ve dünyaya ödenen rutin bakım/vergi birlikte durur | Diğer oyuncu/kurumlara kira, borç, emanet ve sözleşme yükümlülükleri sürer; borç silinmez |
| 90 gün sonrası | Uzun süre boş kalan makam, önceden açıklanmış seçim/kurum devri yoluna girer; karakter silinmez | Geçici vekil giden hükümdar tarafından atanamaz; büyük/kural değiştirici karar alamaz |
| 180–365 gün | Uzun süre sahipsiz mülkün kurum emanetine alınması değerlendirilebilir | Süre ve mekanizma açık karardır; dönüşte eşdeğer karşılık/bedel talebi korunur |

Uykuya geçişte gecikme ve asgari uyku süresi, tehdit anında gir-çık istismarını azaltmak için değerlendirilecek; eşikler seçilmeden kesin mekanizma sayılmaz. Bakım/vergi açığı mülk veya makamı otomatik kaybettirmez; yalnız yeni isteğe bağlı harcamaları, önceden ilan edilen borç tavanı içinde sınırlayabilir. Oyuncu döndüğünde kamu olayları ile kişisel/kurumsal sonuçlar ayrılmış, sebep ve toparlanma yolları gösterilen bir özet alır.

### Seçim sürekliliği ve geçici vekil

**[ÖNERİ]** Seçim yeter sayısı, eşitlik ve boş adaylık kuralları seçim açılmadan ilan edilir. Art arda yeter sayıya ulaşmayan seçimlerde yeter sayı kademeli düşebilir; alt sınır ve başarılı seçimden sonra sıfırlama kuralı belirlenir. Yetersiz katılımın makamı süresiz askıda bırakmasına veya boykotla kilitlenmesine izin verilmez. Geçici vekil yalnız günlük bakım/önceden yetkilendirilmiş işleri yürütür; giden hükümdar geçici vekili tek taraflı atayamaz. Seçim ve temsil değerleri `[PARAMETRE]` değil, Berkay onayı gerektiren ürün/kurum kararlarıdır.

## 11. Entrika, güven ve oyuncu koruması

İhanet ve gizli iş çevirmek geçerli oyun tarzıdır; cezasız ve risksiz düğme değildir. Her eylemde fırsat, bedel, yakalanma olasılığı/kanıt üretme ihtimali, şüphe ve olası karşılık bulunur. Failin amacı, hedefin bilgisi ve üçüncü tarafların duyduğu söylenti farklı tutulur. Sunucu, gizli bilgiyi yanlış kişiye göndermez.

- Suikast/kalıcı karakter silme ilk sürüm kapsamı dışıdır; daha sonra eklenirse ayrı açık ürün kararı, karşı oyun ve telafi tasarımı ister.
- Tekrarlı hedefleme, alt hesapla taciz, yeni oyuncu avlama, zorlayıcı ekonomik kilit ve oyuncuyu girişe zorlayan savaş penceresi sınırlandırılır.
- İtibar veya kaynak kaybı tek kötü zarla oyuncuyu oyundan çıkarmaz. İtiraz, destek veya telafi yolunun oyun içi gerekçesi olur.
- Sohbet ve kullanıcı adı güvenliği yalnız istemci filtresi değildir; sunucu oran sınırı, rapor/engelleme, moderasyon kaydı ve gizlilik sınırları gerekir.
- Kişisel bilgiyi oyun dünyasına taşımak, gerçek para/şantajla oyun içi güç kazanmak, tehdit veya taciz oyun sistemi değildir.

## 12. Mobil deneyim, bildirim ve dönüş

- Ana ekran oyuncuya bir kerede 3–5 önemli gerilimi ve bir sonraki eylemi gösterir. Devlet/ekonomi/ilişki ayrıntısı ihtiyaç anında açılır.
- Her önemli seçenek “ne harcarım, ne kazanabilirim, ne bilmiyorum, kim öğrenebilir?” sorularını yanıtlar.
- Bildirimler opt-in ve özetlenebilir; dünya bildirimleri kullanıcıyı oyuna çekmek için alarm yağmuruna dönüşmez. Acil savunma kararı push bildirimi gerektiriyorsa bile sonucu bildirim süresine değil kurum kuralına bağlanır.
- Yeniden bağlanınca idempotent event cursor üzerinden kaçırılan kamu olayları ve kişisel özet alınır. Tam dünya geçmişi her açılışta istemciye aktarılmaz.
- Bağlantı kopmasında son işlem durumu “sonuçlandı / reddedildi / henüz bilinmiyor” olarak ayrılır. İstemci aynı işlemi tekrar gönderirse ikinci etki oluşmaz.
- Yeni oyuncu ilk dakikalarda tek bir yerel ilişki, iş ve karar deneyimler; bütün siyaset/ekonomi ekranları bir anda açılmaz.
- Mevcut proje altı dili destekler: Türkçe, İngilizce, İspanyolca, Portekizce, Arapça ve Rusça. Çoğul, sağdan sola düzen ve isim biçimi ilgili i18n kurallarıyla ele alınır.

## 13. Online teknik sınırlar ve 10.000 oyuncu senaryosu

### Nüfus tanımı

“10.000 oyuncu” ürün hedefi, “10.000 oyuncu aynı anda bağlı” kapasite hedefi değildir. Ürün ve operasyon raporu en az şu ölçüleri ayrı verir: kayıtlı hesap, aylık/haftalık/günlük etkin kullanıcı, en yüksek eşzamanlı bağlantı (CCU), eylem/saniye, bölge başına aktif aktör, olay yazma/okuma, kuyruk bekleme ve hata oranı. Eşzamanlılık hedefi, beklenen tepe saati ve oyun yükü profili ayrıca belirlenip yük testiyle kanıtlanır.

### Mantıksal dünya, fiziksel bölümlendirme

Oyuncu açısından amaç ortak bir tarihin/dünyanın parçası olmaktır. Teknik tarafta her şeyi tek bir global, her işi yapan nesneye veya tek sıcak veritabanı kaydına yığmak yasaktır. Dünya şu mantıksal sınırlara ayrılır; gerçek servis/DB seçimi faz 0 denetiminden sonra kesinleşir:

- **Kimlik ve realm yönlendirme:** kimlik doğrulama, aktif dünya/realm bulma ve bölgeye yöneltme.
- **Yerel bölge/kurum durumu:** konum, yerel ekonomi, nüfus dilimi, garnizon ve yakın olaylar.
- **Toplumsal olaylar:** ilişki ve söylenti olaylarını erişim sınırlarıyla saklama/dağıtma.
- **Küresel siyaset:** düşük frekanslı beylikler arası antlaşma, savaş durumu ve kamu duyuruları.
- **Olay/işleme altyapısı:** idempotency, sıra/cursor, tekrar teslimat ve sürümlü şemalar.
- **Sorgu/okuma modeli:** istemcinin yalnızca ilgili konum, aktör, kurum ve cursor’dan sonraki değişiklikleri alması.

Tek mantıksal realm birden fazla fiziksel shard/bölge kullanabilir. Sınır ötesi işlem açık protokolle yürütülür; global tüm oyuncu listesini her istek için taramak, tüm NPC’leri her tick’te güncellemek veya bütün olay geçmişini istemciye göndermek kabul edilebilir yaklaşım değildir. Shard sınırı oyuncuların ticaret/diplomasi yapmasını gizlice engellememeli; aktarımın gecikmesi ve kısmi başarısızlığı tasarlanmalıdır.

### Mevcut Cloudflare adayının sınırları

Mevcut beta Cloudflare Workers ve Durable Objects kullanıyor. Bu, yeni mimariyi otomatik olarak aynı biçimde sürdürme kararı değildir. Resmî belgeler Durable Object’lerin tek-thread çalıştığını, yatay ölçek için işin birden çok nesneye bölünmesi gerektiğini ve bir nesne için yaklaşık 1.000 istek/s değerinin sert garanti değil yumuşak tasarım eşiği olduğunu belirtiyor. WebSocket hibernation binlerce bağlantıya imkân verebilir; bu tek başına CPU, bellek veya oyun işlemi kapasitesini ispatlamaz. Queue teslimatı en az bir kez olabilir ve sıra garantisi yoktur; tüketici idempotent olmalı ve sıra numarasını ele almalıdır. Bu sebeple seçilen sağlayıcı ve ücretli kapasite, yük profili olmadan taahhüt edilmez.

Resmî teknik başvuru:

- [Durable Objects best practices](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)
- [Durable Objects WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Durable Objects platform limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Queues delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)
- [How Queues work](https://developers.cloudflare.com/queues/reference/how-queues-works/)

Bu kaynaklar kapasite garantisi değildir; yalnız mimari riskleri ve güncel platform kısıtlarını ortaya koyar. Ücretsiz planla hedef nüfusun mümkün olduğu varsayılmaz; tahmin edilen maliyet ve darboğazlar ayrı karar olarak raporlanır.

## 14. Veri alanları ve kalıcılık sözleşmesi

Uygulama fazı mevcut şemaları inceleyip gerçek tipleri çıkarır; aşağıdaki kavramsal kayıtlar zorunlu sınırları tarif eder, kod isimlerini dayatmaz:

- **OnlineAccount / OnlineProfile:** hesap bağı, çevrimiçi ayarlar ve moderasyon durumu.
- **OnlineActor:** oyuncu/NPC actor ID, tür, profil, durum, konum ve kontrol kaynağı.
- **Institution / Membership / AuthorityGrant:** kurum, üyelik, makam ve açık yetki/delegasyon.
- **Relationship / Knowledge / Rumor:** aktör çiftine özel ilişki, kaynaklı bilgi ve söylenti.
- **Profession / Service / Order / Contract / Inventory / Ledger:** meslek ustalığı, hizmet ihtiyacı, emir, sipariş, malvarlığı ve kaynak değişim defteri.
- **RealmAlarm / WarPlan / StandingOrder / WarPhase:** kurumun alarmı, hazırlık ve ilan niyeti, oyuncu/kurum talimatı ve faz/kuyruk durumu.
- **AbsencePolicy / OfficeTerm / SleepStatus / PropertyTrust:** önceden seçilmiş temsil kuralı, makam dönemi, uyku kademesi ve varsa uzun süreli mülk emaneti.
- **WorldEvent / EventCursor:** değişmez olay ve istemci/işleyici ilerleme imleci.
- **Presence:** anlık bağlantı bilgisi; kalıcı karakter/kurum talimatından ayrı.

Presence (online/away) kalıcı oyun durumu değildir. İstemci yeniden bağlanınca actor’ın otoritatif durumu sunucudan yüklenir. Şema/protokol değişiklikleri sürümlenir; deployment sırası sırasında istemci ve sunucu uyumu açıkça yönetilir. Online veri namespace’i ve yedekleme/erişim politikası SP kayıtlarından ayrıdır. Mevcut Diyar verisine geçiş, silme veya reset ayrı kullanıcı etkisi kararıdır.

## 15. Erişim, kötüye kullanım ve gizlilik

- Her eylem sunucu yetkilendirmesi, oran sınırı ve girdi doğrulaması alır. UI’da gizlemek güvenlik sayılmaz.
- Kaynak ve mülkiyet değişimi atomik deftere yazılır; admin/test araçları normal oyuncu yetkisiyle karışmaz.
- Chat, isim, rapor ve engelleme için veri saklama amacı ve görünürlük alanı tanımlanır. Gereksiz kişisel veri tutulmaz.
- NPC davranışı, oyuncular arası düşmanlık veya pazar fiyatı istemci tarafından keyfî belirlenemez.
- Moderasyon aksiyonu ve önemli yönetici işlemi denetlenebilir kayda girer. Gizli NPC/oyuncu bilgisi yetkisiz loglarda veya herkese açık olay akışında sızmaz.
- Sunucu yükünde oyuncu başına ve realm/bölge başına sınırlar gerekir; kötü niyetli kullanıcı tek bir global sistemi kilitleyememelidir.

## 16. Uygulama fazları ve çıkış ölçütleri

Fazlar bağımsız, incelenebilir ve çevrimdışı moda dokunmayan dilimlerdir. Codex her seferinde yalnızca açıkça istenen fazı uygular. Faz 0’da mevcut kaynak haritası, D-13 canlı beta kararı ve SP sınırı çıkarılmadan büyük mimari kod değişikliği yapılmaz. Önce dar bir yaşam-simülasyonu dikey dilimi kanıtlanır; savaş ve çoklu kurum kapsamı buna dayanarak açılır.

| Faz | Çıktı | Tamamlanma ölçütü |
|---|---|---|
| 0. Denetim, güvenlik ve teknik taslak | Online girişleri; SP temas/fallback'leri; kimlik, veri, protokol, hosting ve deploy haritası; eski beta canlı erişim durumu; maliyet, veri kaybı ve geçiş raporu | Her iddia dosya/akış kanıtına bağlı; D-13 için uygulanacak işlem ayrıca açık; hiçbir canlı değişiklik GDD işinden varsayılmamış |
| 1. Online kimlik ve sert SP sınırı | Ayrı online hesap/karakter oluşturma ve kayıt alanı | Yeni online ad istenir; hiçbir SP ad/kayıt/profile erişimi yok; SP akışı ve kayıtları değişmemiş |
| 2. Dünya olayları, dönüş özeti ve zaman | Sunucu olayı/cursor, idempotent yazma, kolektif süreçler için ilan edilen süre ve varsayılanlar | Ortak tur/ay kilidi yok; kaçırma başlı başına ceza üretmiyor; bağlantı kopması çift etkiye yol açmıyor |
| 3. Yaşam simülasyonu dikey dilimi | Tek küçük yerel toplumda bir oyuncu mesleği, bir NPC gündemi, bir hizmet/sözleşme ve sosyal tepki | Oyuncu insan yanıtı beklemeden bir kararı tamamlayabiliyor; aynı oturumda NPC kaynaklı kısmi sonucu görüyor; NPC ve oyuncu katkısı açıklanıyor |
| 4. Sosyal grafik ve bilgi | İlişki eksenleri, gerçek/bilgi/söylenti, hafıza ve gerekçeli NPC davranışı | Hasan-Ahmet-Berkay senaryosu en az iki farklı maliyet/risk üretebilir; bilgi sınırları korunur |
| 5. Katmanlı NPC gündemi | İhtiyaç, hedef, konum ve olayla tetiklenen bireysel karar; arka plan istatistikleri | Etkin oyuncu oturumunda en az bir NPC kaynaklı yeni gündem; boş bölgelerde düşük sıklıklı sunucu olayı; tam simülasyon şartı yok |
| 6. Sipariş, meslek ve ekonomi | Üretim/teslimat, stok ve defter, insan/NPC tedariki, anti-farm | Gerçek girdi/teslimat değişir; NPC temel tedarik sağlar; aynı oyuncu-NPC-eylem türü döngüsü sınırsız kazanç üretmez |
| 7. Kurum, temsil ve makam devri | Yetki, görev süresi, seçim/atama, sınırlı vekâlet ve itiraz | Makam yokluğu toplumu kilitlemez; delege yetki sınırını aşamaz; makam devri karakter ölümüne bağlı değildir |
| 8. Hazırlık, diplomasi ve çevrimdışı çatışma | Alarm, haber/söylenti, ilanlı savaş/gizli baskın, ön talimat, hedef tavanı ve ateşkes | Sadece onaylı kararlar uygulanmış; savunanın çevrimiçi olması gerekmez; aynı hedefte faz/kayıp/ateşkes istismarı sınırlandırılmış |
| 9. Denge, ölçek ve güvenlik | NPC gündem hacmi tahmini, maliyet/CCU modeli, abuse/rapor akışı ve ölçüm | 10.000 kayıtlı hesap ve CCU birbirinden ayrılmış; kapasite, gecikme ve içerik üretim maliyeti kanıtla raporlanmış |

## 17. Ürün kabul ölçütleri

Bu ölçütler “özellik dosyada var mı?” yerine “oyuncu için sözleşme çalışıyor mu?” diye sorar. Fazın teknik doğrulaması bu ürün ölçütlerini de kapsar.

### Kimlik ve SP ayrımı

- Temiz online başlangıçta online isim/karakter oluşturma akışı vardır; oyun hiçbir SP ismini otomatik getirmez.
- SP kaydı bulunmayan hesap online oynayabilir; online kayıt bulunmayan cihaz SP oynamaya devam edebilir.
- SP kaydını silmek, değiştirmek veya içe aktarmak online kurulumun ön koşulu değildir.
- Online actor ID ve hesabın doğrulanması isim metnine bağlı değildir.

### Sosyal dünya

- İki oyuncu aynı NPC’yi görür; NPC’nin iki oyuncuyla ilişkisi ayrı ayrı farklı olabilir.
- Oyuncu, NPC ile başka oyuncu arasındaki anlaşmazlığa aracı olabilir; en az iki farklı makul stratejinin maliyeti ve riski farklıdır.
- Eylem sonucu “başarılı/başarısız” metninden ibaret değildir: hangi bilgi/çıkar/ilişki sebep oldu açıklanır.
- Söylenti ve gizli bilgi tüm dünyaya anında yayılmaz; kaynak ve güven düzeyi taşır.

### Topluluk ve süreklilik

- Lider çevrimdışıyken diğer oyuncular/kurumlar dünyada işlem yapabilir; savaş sonucu liderin anlık bağlantısına kilitlenmez.
- Çevrimdışı avatarın ölüm/yaşlanma ve mülk/iktidar kaybı kuralı kullanıcı onayıyla kesinleştirilmeden uygulanmaz.
- Dünya devam ederken oyuncu geri dönünce gerekçeli özet alır; yokluk tek başına ceza değildir.
- Her rol için gerçek katkı ve alternatif tedarik/karşı oyun yolu vardır.
- Hükümdarlık/askerlik dışındaki en az üç meslek gündelik toplumda iş üretir; aynı meslek kriz ve savaş halinde yeni, maliyetli katkılar sunabilir.
- Toplumun temel hizmeti bir insan oyuncunun çevrimiçi olmasına bağlı değildir; NPC taban hizmeti oyuncunun uzmanlık ve ilişki katkısını değersizleştirmez.
- Yoklukta makam süreci ve ekonomik yükümlülükler mülk/karakter cezasından ayrı işler; uyku oyuncular arası borç/emanet yükümlülüğünü silmez.

### Oturum ve NPC gündemi

- Her oturumda oyuncu, başka insanın çevrimiçi olmasını beklemeden tamamlayabileceği en az bir anlamlı karar bulur.
- Bu kararın en az bir kısmi yansıması aynı oturumda görülebilir; örneğin NPC yanıtı, sipariş kabulü, yeni söylenti veya kurum tepkisi.
- Etkin oyuncu oturumu başına en az bir NPC kaynaklı yeni gündem ölçülür; boş bölgelerde de düşük sıklıklı, sunucu tarafı gelişme üretilir. Sıklık/başarı eşiği alfa verisiyle belirlenir.
- Seçim, savaş, teklif ve üretim süreçlerinin katılmayan oyuncu varsayılanı süreç başında görünür; ilan edilmiş koşul dışında ek yokluk cezası yoktur.

### Savaş ve kamu düzeni

- Büyük hazırlıkların her zaman görüldüğü varsayılmaz; sinyaller kaynak/konum/güvenilirlik taşır, gizli plan istemciye sızmaz.
- Alarm yükseltmek bedelsiz savunma buff'ı değildir; hazine, erzak, üretim, pazar ve hane hayatı etkisi vardır.
- Saldırı ve savunma çözümü oyuncunun çevrimiçi olmasına bağlanmaz; tebliğ, ön talimat, hedef düzeyindeki kayan kayıp tavanı, faz kuyruğu ve süre sonu tasarımı birlikte değerlendirilir.
- Savaşın otomatik bitişi sessizlikle egemenlik/mülk devretmez; ateşkes ve aynı savaşta kaybedilmiş mülkü geri alma istisnası açıklıdır.

### Teknik/oynanış sağlığı

- Her kritik yazma isteğinde tekrar güvenliği, yetki ve sunucu doğrulaması vardır.
- Bekleyen işlem bağlantı tekrarında iki kez kaynak tüketmez/ödül üretmez.
- Altı dilde yeni oyuncu metinleri eksiksizdir; metin uzunluğu ve RTL düzeni cihazda kontrol edilir.
- NPC nüfus ölçeği, 10.000 hesap ölçeği veya CCU başarısı sayısal ölçüm olmadan “tamamlandı” diye işaretlenmez.
- Sentetik test sonucu eğlence kanıtı sayılmaz; denge, okunabilirlik ve gerçek cihaz oturumu ayrıca oyuncuyla değerlendirilir.

## 18. Başlıca riskler ve cevaplar

| Risk | Oyuncuda görünen sorun | Tasarım/uygulama cevabı |
|---|---|---|
| Online/SP sızıntısı | Yanlış isim, kayıt veya davranış | Ayrı online identity/domain/storage; import yok; hedefli sınır testleri |
| Tek hükümdar darboğazı | Dünya tek kişinin girişini bekler | Yetki devri, kurum kuralları ve önceden belirlenmiş sınırlı talimat |
| Çevrimdışı kayıp | Oyuncu yokken taht/karakteri keyfî kaybeder | Avatarı kurumdan ayır; kayıp koşulunu görünür yap; karar onayı kapısı |
| Her şey simüle ediliyor | Maliyet, karmaşa ve performans artar | Katmanlı nüfus; olay anında ayrıntı; toplu düşük frekans güncellemesi |
| NPC’ler dekor kalır | Paylaşılan dünya hissi oluşmaz | Kalıcı aktör kimliği, çıkar, ilişki, kaynaklı bilgi ve görünür karar nedeni |
| Oyun yönetim simine dönüşür | Meslekler ve gündelik yaşam gölgede kalır | Önce yerel yaşam dikey dilimi; siyaset ve savaş toplumun üst katmanı; ilk oturum ölçütleri |
| Meslekler zorunlu darboğaz olur | Tek demirci, şifacı veya hükümdar yokken dünya durur | NPC taban hizmeti, alternatif tedarik ve oyuncuya kalite/uzmanlık farkı |
| Her hazırlık anında görünür | Gizlilik ve istihbarat anlamsızlaşır | Kaynaklı bilgi, yerel kapsama, yanlış söylenti, karşı istihbarat ve hazırlık ölçeğine bağlı iz |
| Alarm ücretsiz savunma olur | Sürekli tam seferberlik en iyi seçim olur | Kademeli ve görünür hazine/erzak/iş gücü/pazar/moral bedeli; kurum yetki sınırı |
| Ekonomik tekelleşme | Yeni oyuncu üretim/tedarik yapamaz | Alternatif tedarik, sınırlı monopol etkisi ve gerçek arz talep dengesi |
| Griefing / sosyal taciz | Oyuncu oyundan atılır veya hedef olur | Yetki/rate limit, karşı oyun, rapor/engelleme, tekrar hedefleme sınırı |
| Tek sıcak servis/realm | Nüfus büyüdükçe gecikme ve kesinti | Bölgesel/domain shard, küçük işlemler, kuyruk idempotency ve ölçümlü kapasite |
| Kapsam patlaması | Online yeniden yapımı bitmez | Faz bazlı iş; her fazda oyuncu kabul ölçütü ve yalnız en küçük dikey dilim |

## 19. Karar kaydı — Codex’in varsayım yapamayacağı konular

Etiketler bölüm 0'da tanımlıdır. Berkay'ın yaşam simülasyonu yönü **[KESİN]**; aşağıdaki tasarım uzlaşıları ve yeni sistem taslakları kendi başlarına nihai oyun kuralı değildir. Codex bağımsız fazları sürdürebilir, ancak açık kararın etkilediği davranışı sessizce seçemez.

### Berkay'ın kesinleştirdiği ürün yönü

| Konu | Kesin yön |
|---|---|
| Ürün kimliği | Yaşam simülasyonu; krallık yönetimi tek olası yaşam/meslek yolundan biri. Oyuncular ve NPC'ler toplumun gündelik ve kurumsal yaşamını birlikte etkiler. |

### Tasarım görüşmelerinde uzlaşılan, nihai onay bekleyen ilkeler

| Konu | Birleşik tasarım ilkesi | Uygulama etkisi |
|---|---|---|
| D-03 — zaman | Genel, oyuncuya görünen tur/ay kapısı yok; dünya olay temelli işler. Kolektif süreç başta ilan edilmiş uzun katılım aralığı ve varsayılan sonuç taşır. | **[KESİN — Berkay, 30 Ekim 2026]** Ortak takvim: herkes aynı hızda yaşlanır; yokken "olağan düzen" işler, yokluk cezası yok. Hız önerisi 1 gün = 1 mevsim `[PARAMETRE]` (§3). |
| K-09 — bekleme/FOMO | Arayüz kilitleyen bekleme yok; kaçırma ek ceza üretmez; para/premium para beklemeyi atlatmaz. Alfa başlangıcında kazanılmış oyun içi kaynakla hızlandırma da yok. | Varsayılan tablosu ve kaynak/para kuralları uygulanmadan önce onaylanmalı. |
| A-03 — savaş tebliği | Dar, canlı katılım penceresi varsayılan değil. İlanlı savaş çözümü popülasyon düzeyinde ölçülen aktif oyuncu giriş aralığı P90'ından önce olmaz; ön emir, delegasyon ve kayıp tavanı asıl korumadır. | P90 tanımı, alfa 36–48 saat aralığı ve savaş parametreleri onay/ölçüm gerektirir. |
| N-5 — kayıp tavanı | Kayan mülk kaybı tavanı tüm saldırganlara karşı hedef başınadır; siyasi sonuçlar ayrı ama kendi anti-abuse kuralına tabidir. | Sayı, dönem ve direnç bandı faz 8 öncesinde kararlaştırılır. |
| N-7/N-11 — savaş fazı/kuyruğu | Hedef başına bir açık faz; saldıran başına bir kuyruk kaydı; maliyet, sıra, son tarih ve zaman aşımı ile slot/kuyruk kilidi önlenir. | Faz 8; sıra ve cezalar açık parametre/kurum kuralı. |
| N-10/N-12 — savaş sonu | Ön emir barış/ateşkes tercihini kapsar; azami süre/yorgunluk statükoyu koruyan ateşkes üretir. Yeniden saldırı soğuma sınırı önceki saldırana uygulanır; savunanın aynı savaşta kaybettiğini geri alma istisnası vardır. | Otomatik ateşkes egemenlik veya mülk devretmez. |
| A-04a/A-04b — makam ve yaşam | Makam devri, dönem sınırı ve terk edilmiş hesap kuralı karakter ölümünden bağımsız gereksinimdir. Ölüm/vâris/hane ayrı ve isteğe bağlı ürün kararıdır. SP hanedanı online'a aktarılmaz. | Makam devri Faz 7'de; ölüm/vâris seçilmeden ekonomi ve kalıcı karakter tasarımı sabitlenmez. |
| Uyku — K-04/N-6/N-8/N-9 | Kademeli yokluk; oyuncular/kurumlara karşı borç ve emanet sürer. Dünyaya ödenen rutin gider ile kişisel üretim/gelir birlikte durabilir; açık mülk kaybına dönüşmez. Uzun terkte mülk emaneti ve dönüş karşılığı değerlendirilir. | 7/30/90/180–365 gün yalnız parametre örnekleri; mekanizma nihai onay bekler. |
| N-13 — seçim | Yeter sayı, eşitlik ve boş adaylık kuralı süreç başında açıklanır. Art arda yetersiz katılımda yeter sayı kademeli azalabilir; sınırlı geçici vekil atanır. | Taban, reset ve vekil yetkisi açık kurum kararıdır. |
| N-3/R-02 — oturum/NPC | Oturumda insan yanıtı beklemeyen bir karar ve aynı oturumda görülen kısmi sonuç; etkin oturumda NPC kaynaklı gündem, boş bölgede düşük sıklıklı olay. | İçerik/sıklık sayıları alfa ölçümüdür; tasarım geçiş ölçütüne alınır. |
| A-14/D-11 — SP içerik | Varsayılan SP içerik paylaşımı yok; online kimlik, runtime, tip ve depolama sınırı kesin. | Ortak içerik ancak ayrı kapsam kararıyla. |

### Açık kararlar ve uygulama kapıları

| Karar | Öneri / mevcut taslak | Durum, sahibi ve bağlı faz |
|---|---|---|
| D-01 — finansman ve durdurma koşulu | Yatırım, yayın maliyeti ve başarısızlık halinde kapatma/arsiv planı yazılı olsun. | **[KESİN — Berkay, 30 Ekim 2026]** Ücretsiz katmanda başlanır; sınırlara yaklaşınca maliyet raporu ve ücretli plan önerisi Berkay'a sunulur. Durdurma koşulu hâlâ açık. |
| D-05 — toplum boyutu | Tek büyük mantıksal toplum mu, birden çok toplum/realm mi? Kayıtlı hesap hedefi ile aynı anda etkin oyuncu farklı ölçülerdir. | **[KESİN — Berkay, 30 Ekim 2026]** Önce küçük kasaba dünyaları (her biri ~50–200 oyuncu, dolunca yenisi); ileride bölgeler arası ticaret/diplomasiyle bağlanır. Sayılar alfa parametresidir. |
| D-06 — hesap ve kimlik | Kalıcı güç/ekonomi öncesi doğrulanmış hesap bağı; sağlayıcıyı resmi kurallar, kullanıcı erişimi ve kurtarma gereksinimiyle seç. | **[KESİN — Berkay, 30 Ekim 2026]** Google ile giriş. Sunucu Google kimlik belirtecini doğrular; görünen ad ayrı seçilir, SP adına geri düşüş yok. |
| D-13 — mevcut MP beta güvenliği | Önceki denetimde beta Worker'ın canlı yanıt verdiği, kimlik doğrulamasının bulunmadığı, APK'da MP girişi/host adresi olduğu ve `apk` dalına sunucu değişikliklerinin otomatik deploy edildiği raporlandı. Olası sıra: geri alınabilir sunucu tarafı kapatma anahtarı, ardından kimlik/izin yaması; menü değişikliği sonraki APK ile. | **[KESİN — Berkay, 30 Ekim 2026]** İstemcide çok oyunculu giriş "Yakında" kartına çevrilir, eski sunucuya bağlanılmaz. Canlı Worker'ı kapatma/silme Berkay'ın işidir; bu iş sunucuya dokunmaz. |
| D-02 — karakter ömrü | A-04a makam devrini uygula; ölüm, vâris ve hane kararını ekonomi tasarımından önce ver. | **[KESİN — Berkay, 30 Ekim 2026]** Karakter yaşlanır, ölür; hanedan vârisle sürer. Ayrıntı: `docs/online/OYNANIS_TASARIMI.md` §8. |
| D-09 — ekonomi | Kaynak üretimi, bakım, iş gücü, enflasyon, oyuncu/NPC taban arzı ve geri dönüş yollarını simülasyonla dengele. | **[AÇIK KARAR — Berkay]** Faz 6'da kalıcı ekonomi kurulmadan önce. |
| D-14 — hızlandırma | İlk alfada kişisel üretim beklemesi oyun içi kazanılmış kaynakla da atlanmasın; kaynak dolaşımı testinden sonra tekrar değerlendir. | **[UZLAŞI — nihai onay bekliyor]** Faz 6 ekonomi simülasyonu sonrası. |
| D-03 — görünür genel takvim | Oyuncuya görünen genel tur yok; kolektif son tarihler ilanlı/uzun; görünmeyen sunucu kalp atışı yalnız altyapıdır. | **[UZLAŞI — nihai onay bekliyor]** Faz 2. |
| D-04 — süre ve yokluk parametreleri | Tebliğ, teklif, uyku, faz ve süre sonu sayıları ölçülecek parametreler; örnek sayılar norm değil. | **[AÇIK KARAR — Berkay + alfa verisi]** Çatışma ve ekonomi fazı öncesi. |
| A-04a — makam devri | Dönem sınırı, meşruiyet erimesi, seçim/devir ve terk edilmiş hesap yolu. | **[UZLAŞI — nihai onay bekliyor]** Faz 7. |
| A-04b — ölüm/vâris | Çevrimiçi karakter ölümü, hane ve miras. | **[AÇIK KARAR — Berkay]** Gerekli değil; seçilirse ekonomi fazından önce tasarlanmalı. |
| A-01′ — kolektif kapanış | İlan edilmiş kapanışları operasyonel dünya çözümleme saatlerine yuvarlama değerlendirilebilir; oyuncuya genel takvim göstermemeli. | **[ÖNERİ]** Zamanlama ölçüldükten sonra teknik/UX kararı. |
| A-03 — canlı tepki penceresi | Dar pencere varsayılan değil; çevrimdışı savunan kayıpları veride yüksek kalırsa yeniden aç. | **[UZLAŞI — nihai onay bekliyor]** Faz 8 öncesi. |
| N-4 — canlı sunucu aksiyonu | D-13 kapsamında geri alınabilir kapatma veya doğrudan kimlik yaması seçenekleri. | **[AÇIK KARAR — Berkay]** Canlı sistem değişikliği ayrı açık görev ve güncel doğrulama ister. |
| Meslekler ve alarm kademeleri | İlk dikey dilimde sınırlı bir meslek/NPC işi; alarm ve geniş meslek listesi daha sonra. | **[ÖNERİ]** İçerik ve ekonomi simülasyonuyla daralt. |
| Tarihsel yıl/bölge | 13. yüzyılın hangi aralığı ve hangi siyasi coğrafyası? Kaynaklar tasarım ilhamı; tarihsel ayrıntı karar verilmeden sabit değil. | **[AÇIK TASARIM KARARI]** Fraksiyon, takvim, sefer ve kurum isimlerinden önce. |
| NPC gündem içerik yükü | Faz 3 dikey diliminden sonra tekrar kullanılabilir gündem, sonuç ve tepki şablonlarının hacmini tahmin et. | **[AÇIK TASARIM İŞİ]** Faz 5'ten önce tahmin tablosu; canlı içerik üretim bütçesi bilinmiyor. |
| 10.000 oyuncu/CCU | 10.000 kayıtlı hesap hedefi, eşzamanlılık ve etki yükü aynı metrik değildir. | **[ÖNERİ]** Ürün ve operasyon ölçümüyle sayısallaştır; yük kanıtı olmadan kapasite sözü verme. |
| Hosting/ücret ve fiziksel shard | Cloudflare yalnız mevcut adaydır; ücretsiz katman üretim kapasitesi kabul edilmez. | **[AÇIK KARAR — Berkay]** Faz 0 raporu, maliyet tahmini ve yük profili sonrası. |
| İlk hesap başına karakter ve ad | Bir etkin online karakter ve realm içinde ad benzersizliği başlangıç önerisi; SP fallback yok. | **[ÖNERİ]** Hesap kurtarma, alt hesap ve moderasyon kararıyla Faz 1 öncesi. |
| Çevrimiçi kayıp şiddeti | Karakter ölümü ve geri döndürülemez kayıp ayrı onay olmadan yok; kurumsal kayıp anlaşılır, kademeli ve telafi yolu olan şekilde tasarlanır. | **[KESİN — Berkay, 30 Ekim 2026]** Ölüm mümkün ama zor; hazırlık izi, savunma ve korumalar; kanıtlanırsa ağır ceza ve kan davası (§7). |

## 20. Codex’e verilecek uygulama promptu

Aşağıdaki metni her uygulama isteğinde ilgili faz ve kabul kapsamı doldurularak kullan:

> `KRONIKLER_ONLINE_GDD.md` dosyasını ve `AGENTS.md`, `OTURUM_HAFIZASI.md` yönergelerini oku. Bu görev yalnız **Faz [numara/ad]** kapsamındadır. Önce mevcut kodda bu fazın online girişlerini, veri kaynağını, sunucu sözleşmesini ve ilgili UI akışını hedefli şekilde incele; eski Multiplayer/Diyar davranışını gereksinim kabul etme. GDD’deki ilgili kurala ve şu kabul ölçütlerine göre en küçük uçtan uca dilimi uygula: **[ölçütleri buraya yaz]**. Online kimliği, kayıtları ve runtime’ı single-player karakter/ad/save verisinden kesin biçimde ayır; SP akışını ve kayıtlarını değiştirme. `Karar Kaydı`ndaki **[AÇIK KARAR]**ları ve nihai onay bekleyen **[UZLAŞI]**ları bu faz için kendin kesinleştirme; bağımsız işi sürdür, engellenen kısmı ve etkisini bildir. Sonuçlar sunucu otoritesinden gelsin; yetki, tekrar güvenliği, hata/bağlantı toparlaması, neden açıklaması ve altı dil gereksinimini kapsa. Ücretli servis, canlı entegrasyon, deploy, APK, commit ve push yapma. Yalnız istenen faza uygun doğrulamayı çalıştır ve gerçekten çalıştırdıklarını raporla. Sonunda değişen dosyaları, SP sınırını nasıl koruduğunu, test/kanıtı ve kalan riskleri özetle. Önce plan/inceleme istendiyse hiçbir dosyayı değiştirme.

Uygulama promptuna şu ek koşulları da uygula:

- Ürünü yaşam simülasyonu olarak ele al; krallık yönetimini bütün oyuncuların ana/tek ilerleme yolu yapma. Önce istenen fazdaki en küçük yerel yaşam döngüsünü tamamla.
- Meslek, NPC, alarm ve savaş sistemlerinde **[UZLAŞI]**, **[ÖNERİ]**, **[PARAMETRE]** ve **[AÇIK KARAR]** ayrımını koru. Örnek sayıyı veya yeni fikri onaylanmış kural sayma.
- Her oturum ölçütüyle uyumlu olarak oyuncunun insan yanıtı beklemeden tamamlayabildiği bir karar ve aynı oturumda görülen kısmi bir sonucu hedefle; bu ölçütü karşılamak için yapay bekleme ekleme.
- Temel toplum hizmetlerinde NPC taban kapasitesi veya alternatif tedarik bırak; belirli bir çevrimdışı oyuncuyu zorunlu darboğaz yapma.
- Savaş hazırlığı/haberleşme görevindeysen hazırlık izlerini kaynak ve güvenilirlikle sınırla; alarm seviyesinin ekonomik ve toplumsal bedelini göster; çevrimiçi savunma zorunluluğu ekleme.
- Tarihsel iddiayı oyunun dönem ve bölge kararı kesinleşene kadar esin kaynağı olarak sun; kaynağa bağla ve bütün bölgeler/dönemler için evrensel kural çıkarma.

### Codex için yalnız inceleme promptu

> `KRONIKLER_ONLINE_GDD.md`yi ürün hedefi, `AGENTS.md` ve `OTURUM_HAFIZASI.md`yi çalışma sınırı kabul et. Kod değiştirme. Yalnız Faz 0 denetimini yap: online giriş/kimlik/ad fallback’leri, online-SP import ve kayıt temasları, client-server protokolü, kalıcılık ve canlı deploy bağları için dosya/akış kanıtını çıkar. Mevcut beta davranışını yeni gereksinim varsayma. GDD’ye göre hedef sınır, mevcut sapma, olası veri kaybı/oyuncu etkisi, faz bağımlılıkları ve en küçük yeniden kurulum planını raporla. Eski GDD/arşiv dosyalarını açma. Canlı sunucuya bağlanma. Belirsiz kararları kendin doldurma.

## 21. Belgenin yönetişimi ve kapsam değişikliği

- Bu GDD online modun ürün/oynanış hedefidir; `AGENTS.md` ile `OTURUM_HAFIZASI.md` repo çalışma kurallarıdır. Çakışmada repo kurallarına uyulur; ürün çelişkisi görünür biçimde raporlanır.
- `TASARIM_PUSULASI.md` genel oyun kalite ölçütüdür. Bu belge yalnız online mod için ayrıntılandırır.
- `docs/MULTIPLAYER.md` mevcut Diyar uygulama envanteridir, yeni hedef tasarım değildir. Kod incelemesi bu belgedeki gerçekleri doğrulamalıdır.
- Yeni kapsam, açık karar tablosuna durum/tarih ve gerekçeyle eklenir. Kullanıcı onayı olmadan kapsam dışı bir mekanik sessizce “v1”e sokulmaz.
- Tasarım revizyonu yapılınca Codex promptu, kabul ölçütü ve ilgili fazlar aynı değişiklikte gözden geçirilir.
- Yeni ürün davranışının başarılı olup olmadığı; yalnız test sayısıyla değil, gerçek oyuncunun kısa oturumda kararı anlayıp sonucun sebebini görebilmesiyle değerlendirilir.

