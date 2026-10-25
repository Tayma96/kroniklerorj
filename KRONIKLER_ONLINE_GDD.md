# KRONİKLER ONLINE — Oyun Tasarım Belgesi

**Sürüm:** 0.1 — kapsamlı tasarım önerisi
**Durum:** Uygulama referansı taslağı; yüksek etkili ürün kararları `Karar Kaydı` bölümünde onay bekliyor
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
6. Bu belge içindeki `ONAY GEREKİYOR` kararlarını kendiliğinden kesinleştirmez. Bir karar bağımsız fazı engellemiyorsa işine devam eder; kararın gerektirdiği fazı bekletir ve etkisini raporlar.
7. Sunucu sonucunu otorite kabul eder. İstemciden gelen sonuç, RNG, sahiplik, itibar veya yetki bilgisini doğrulamadan kabul etmez. Her önemli işlem sebebi, bedeli ve sonucu olan kayıtlı bir dünya olayı üretir.
8. Altı dil desteğini ve mobil kısa oturum yapısını korur. Oyuncu metinlerini ekranlara gömülü sabit metin olarak eklemez; proje i18n düzenini kullanır.
9. Ücretli servis, ücretli API, gizli anahtar, canlı sunucuya entegrasyon, deploy, APK, commit veya push işlemi yapmaz; ayrıca istenmiş ve uygun görülmüş olmalıdır. Ücretsiz katmandaki kapasiteyi kanıtlanmış üretim kapasitesi gibi sunmaz.
10. İstenen doğrulamayı gerçekten çalıştırır; çalıştırmadığı testi geçmiş gibi bildirmez. Her faz sonunda değişen dosyaları, kararları, doğrulamayı ve kalan riski kısa raporlar.

## 1. Ürün tanımı

Kronikler Online, oyuncuların ve NPC’lerin aynı kurumları, kaynakları, ilişkileri ve siyasi sonuçları paylaştığı kalıcı bir ortaçağ toplumudur. Oyuncu yalnızca kendi karakterinin hikâyesini ilerletmez; başkalarının hayatında iz bırakan bir toplumsal rol edinir. Bir NPC ile kurulan dostluk, iki düşman arasındaki arabuluculuk, orduya yapılan üretim, verilen söz veya işlenen ihanet dünya kayıtlarında sonuç doğurur.

**Oyuncu vaadi:** “Dünyaya kısa süreliğine girsem bile anlamlı bir karar veririm; dünyadaki insanlar beni ve yaptıklarımı hatırlar; ben yokken dünya başkaları için yaşar, fakat oyun hayatımı kaçırma korkusuna dönüştürmez.”

### Tasarım hedefleri

- Oyuncu ve NPC aynı sosyal/siyasi kurallara tabi olsun; kontrol ve kimlik kaynakları ise ayrı kalsın.
- Her oturum 5–15 dakikada tamamlanabilen, sebebi ve sonucu anlaşılan en az bir anlamlı karar sunsun.
- Toplumdaki rol, yalnız unvan değil; başkalarının ihtiyaç duyduğu iş, sorumluluk ve pazarlık gücü yaratsın.
- Oyuncular arası işbirliği, rekabet, aracılık ve entrika aynı ilişki sisteminden doğsun.
- Oyuncu çevrimdışıyken dünya akabilsin; çevrimdışı kalmak kişisel ölüm/yaşlanma cezası veya zorunlu günlük giriş sebebi olmasın.
- Toplam 10.000 hesap hedefi için mimari plan yapılsın; gerçek eşzamanlı kapasite ölçümle kanıtlansın.

### Tasarım pusulasına uyum

En fazla 3–5 açık gerilim gösterilir. Yakın çevrede yaklaşık 15 önemli kişi bulunur; daha geniş nüfus katmanlı açılır. Para, sosyal bağ, bilgi/ustalık ve itibar birbirinden farklı sermayelerdir. Her önemli kararın bedeli, alternatifi, anlaşılır sonucu ve telafi yolu vardır. Zamanlayıcı, FOMO, çevrimdışı ceza, parayla bekleme atlama ve tekrarlı eylemden sınırsız kazanç yoktur.

## 2. Kapsam ve kapsam dışı

### İlk ürün kapsamı

- Online’a özel hesap profili ve ayrı çevrimiçi karakter oluşturma.
- Kalıcı ortak toplum; oyuncu/NPC dizini, konum, hane/kurum ve kamu olayları.
- Sosyal ilişki, itibar, güven, bilgi ve söylenti sistemi.
- Oyuncu-NPC ve oyuncu-oyuncu görev/iş/karar etkileşimleri.
- Üretim, sipariş, tedarik ve değiş tokuşla birbirine bağlı ekonomi.
- Yetki devri, kurumsal görev ve seçilmiş/atanmış liderlik.
- Çatışma, savunma, diplomasi ve çevrimdışı iktidar/varlık politikasının karara bağlanmış biçimi.
- Altı dil, kısa oturum, bağlantı kopması ve dönüş özeti.

### İlk sürümün kapsam dışı

- Sınırsız, her oyuncunun her şeyi yaptığı sandbox simülasyonu.
- Gerçek zamanlı fizik tabanlı kalabalık savaş veya binlerce karakterin istemcide aynı anda çizilmesi.
- Üretken yapay zekâ çağrısına bağlı her NPC karar döngüsü. NPC davranışı ölçülebilir kurallar/şablonlarla sunucu tarafında çalışır.
- Ücretli güç, çevrimiçi olma süresini satın alma, gerçek parayla siyasi yetki veya zorunlu günlük görev.
- Çevrimdışı oyuncunun karakterini otomatik oynatıp ölümüne/itibar kaybına götürmek.
- Bu belgede yazmayan her eski beta özelliğini aynen koruma taahhüdü.

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

Rol, kilitli sınıf veya ömür boyu seçilen meslek değildir. Oyuncu güven, yetki, beceri, ilişki ve dünya ihtiyacına göre birden fazla katkı sunabilir; uzmanlaşma ona daha güçlü seçenekler verir. Her rolün başkalarına yararı, kaynak maliyeti, pazarlık gücü ve görünür sorumluluğu bulunur.

| Rol örneği | Topluma katkı | Anlamlı karar | Sınır / karşı oyun |
|---|---|---|---|
| Hükümdar/bey | Bütçe, atama, savunma, diplomasi ve kamu önceliği | Vergi, ittifak, sefer, görev dağılımı | Meşruiyet, divan, kaynak, bağlı beyler ve halk tepkisi |
| Komutan/asker | Sefer planı, garnizon, keşif ve birlik disiplini | Riskli hedef/rota, savunma tertibi, emir kabulü | Yetki, lojistik, moral ve siyasi hesap verebilirlik |
| Demirci/zanaatkâr | Siparişe göre silah, zırh, alet ve tamir | Malzeme/kalite/termin/bedel | Girdi kıtlığı, teslimat, itibar ve müşteri seçimi |
| Tüccar/kervancı | Bölgeler arası arz, nakliye, finansman ve fiyat bilgisi | Rota, ortaklık, risk, kredi | Yol güvenliği, sermaye, söz ve yerel talep |
| Vezir/diplomat | Görüşme, arabuluculuk, anlaşma ve resmi kayıt | Hangi taviz, garanti ve bilgiyi kullanacağı | Hükümdar yetkisi, taraf güveni, gizlilik ve itibar |
| Zanaat loncası/yerel temsilci | Standart, ortak sipariş, üyelik ve yerel talep | Üretim payı, üyelik, ortak yatırım | Üye rızası, kıt kaynak, denetim ve rekabet |

Bu roller ilk günün zorunlu seçimi değildir. Onboarding, oyuncuya “meslek seç, sonra menüyü ezberle” dedirtmez; ilk iş ve yakın toplum ihtiyacından rolü keşfettirir.

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

## 10. Siyaset, çatışma ve çevrimdışı karar

### Kurumun, hükümdarın ve oyuncu karakterinin ayrılması

Krallık/beylik bir kurumdur; hükümdar ise oyuncu karakteridir. Hükümdarın çevrimdışı olması savaş ilanını, kuşatmayı veya diğer tarafın hamlesini dondurmaz. Ancak kurumun sonucu tek bir kişinin bildirim görüp anında dokunmasına bağlı olamaz. Bu yüzden savunma planı, emir devri, meşru temsilci, garnizon ve ikmal gibi sistemler önceden hazırlanabilir olmalıdır.

### Önerilen çevrimdışı davranış sözleşmesi — ONAY GEREKİYOR

Bu bölüm karar alınana kadar tasarım önerisidir, kod için kesin kural değildir:

- Çevrimdışı oyuncu karakteri otomatik NPC’ye dönüşmez; yaşlanmaz, ölmez, kendi adına entrika kurmaz veya kontrolsüz kaynak harcamaz.
- Savaş ve kurum olayları dünya tarafında ilerlemeye devam eder. Taht/şehir/ordu sonucu “kral oyunda değil” diye askıda kalmaz.
- Oyuncu önceden sınırlı savunma/iktidar talimatları verebilir (örn. garnizonu koru, açık savaşa girme, ikmal eşiğini gözet, belirlenen vekil komutanın savunmasını kabul et). Talimatlar kapsam, süre, harcama tavanı ve iptal koşulu taşır.
- Hükümdarın seçtiği yetkili vekil/konsey, yalnız kendisine devredilen yetkileri kullanır; her karar kayıtlıdır. Vekil rolü, karakterin yerine geçmek değildir.
- Mülk, makam, birlik ve bölge çatışmada kaybedilebilir; bu kişisel avatarın ölümünden ayrıdır. Kaybın şartı, savunma seçenekleri, tahmini risk ve gerekçesi önceden anlaşılır olur. Ani login cezası, gizli otomatik infaz veya “24 saat girmedin, taht gitti” kuralı yoktur.
- Oyuncu döndüğünde kamu olayları ile kendisini doğrudan ilgilendiren kararlar ayrılır; eylem sebebi, kayıp/kazanç ve toparlanma yolları özetlenir.

### Savaş ilkeleri

Savaşın amacı yalnız oyuncu öldürmek/ganimet toplamak değildir. Siyasi hedef ve bitiş koşulu (sınır, vergi, geçiş, tazminat, makam, ateşkes) savaş ilanında görünür olur. Savaş başlatmak gerekçe, kaynak, meşruiyet ve müttefik/karşı taraf tepkisi ister. Savunma; önceden emir, komutan, birlik, ikmal, istihbarat ve diplomasiyle güçlenir. Sonuçlar nüfus/kurum seviyesinde çözülür; bire bir canlı savaş animasyonu ilk sürüm zorunluluğu değildir.

Saldırı bildirimi, çevrimiçi olmayı şart koşan savunma penceresine bağlanmaz. Çevrimiçi oyuncu daha fazla taktik seçenek görebilir; çevrimdışı oyuncuya otomatik kişisel kayıp bindirilmez. Çevrimdışı savunma/iktidar kuralı kullanıcı tarafından onaylanmadan bu bölümün uygulaması durur.

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
- **Order / Contract / Inventory / Ledger:** emir, sipariş, malvarlığı ve kaynak değişim defteri.
- **WorldEvent / EventCursor:** değişmez olay ve istemci/işleyici ilerleme imleci.
- **Presence / StandingOrder:** anlık bağlantı bilgisi ile kalıcı oyuncu talimatının ayrımı.

Presence (online/away) kalıcı oyun durumu değildir. İstemci yeniden bağlanınca actor’ın otoritatif durumu sunucudan yüklenir. Şema/protokol değişiklikleri sürümlenir; deployment sırası sırasında istemci ve sunucu uyumu açıkça yönetilir. Online veri namespace’i ve yedekleme/erişim politikası SP kayıtlarından ayrıdır. Mevcut Diyar verisine geçiş, silme veya reset ayrı kullanıcı etkisi kararıdır.

## 15. Erişim, kötüye kullanım ve gizlilik

- Her eylem sunucu yetkilendirmesi, oran sınırı ve girdi doğrulaması alır. UI’da gizlemek güvenlik sayılmaz.
- Kaynak ve mülkiyet değişimi atomik deftere yazılır; admin/test araçları normal oyuncu yetkisiyle karışmaz.
- Chat, isim, rapor ve engelleme için veri saklama amacı ve görünürlük alanı tanımlanır. Gereksiz kişisel veri tutulmaz.
- NPC davranışı, oyuncular arası düşmanlık veya pazar fiyatı istemci tarafından keyfî belirlenemez.
- Moderasyon aksiyonu ve önemli yönetici işlemi denetlenebilir kayda girer. Gizli NPC/oyuncu bilgisi yetkisiz loglarda veya herkese açık olay akışında sızmaz.
- Sunucu yükünde oyuncu başına ve realm/bölge başına sınırlar gerekir; kötü niyetli kullanıcı tek bir global sistemi kilitleyememelidir.

## 16. Uygulama fazları ve çıkış ölçütleri

Fazlar bağımsız, incelenebilir ve çevrimdışı moda dokunmayan dilimlerdir. Codex her seferinde yalnızca açıkça istenen fazı uygular. Faz 0’da mevcut kaynak haritası ve uyumsuzluk raporu çıkarılmadan büyük mimari kod değişikliği yapılmaz.

| Faz | Çıktı | Tamamlanma ölçütü |
|---|---|---|
| 0. Denetim ve teknik taslak | Mevcut online girişleri, SP ile tüm temas noktaları, online kimlik fallback’leri, veri/protokol/hosting haritası, veri kaybı riski | Her iddia ilgili dosya/akışa bağlanmış; yeni mimari öneri, açık kararlar ve geçiş planı sunulmuş |
| 1. Online kimlik ve sert sınır | Ayrı online karakter/profile oluşturma ve kayıt namespace’i | Yeni online ad istenir; hiçbir SP ad/kayıt/profile erişimi yok; offline smoke/regresyon değişmemiş |
| 2. Dünya olayları ve zaman | Sunucu saati, event log/cursor, tekrar güvenli istek, reconnect özeti | Online işlemler otoritatif, idempotent; hazır olma çoğunluğu kilidi yok; gecikmiş istemci toparlanır |
| 3. Sosyal grafik ve bilgi | İlişki eksenleri, gerçek/bilgi/söylenti ayrımı, nedenli sosyal aksiyon | Ahmet-Berkay-Hasan senaryosu farklı sonuç/bedel üretebilir; bilgi sızıntısı test edilir |
| 4. NPC gündemi | Hedef, ihtiyaç, konum, hafıza ve olayla tetiklenen NPC kararı | NPC online oyuncuyla ortak kurallara girer; arka plan nüfusu gereksiz tam simülasyon istemez |
| 5. Sipariş ve ekonomi | Girdi, üretim, sipariş, teslimat, ledger, anti-farm | Gerçek stok düşer; tekrarlı istekte çift ödül yok; başka tedarik seçeneği görünür |
| 6. Kurum ve roller | Görev, yetki, makam, delegasyon, itiraz | Rol ihtiyaç doğurur; yetki sınırı ve kayıt vardır; boş makam dünyayı kilitlemez |
| 7. Çatışma ve çevrimdışı kural | Karar kaydı onaylandıktan sonra savaş/varlık sonucu ve dönüş özeti | Çevrimdışı kişi gelişi güzel ölmüyor; kurum savaşı dondurmuyor; kayıp ve sebebi açıklanabilir |
| 8. Entrika ve güvenlik | Kanıt, şüphe, söylenti, taciz/farm koruması, rapor/engelleme | Gizli bilgi yalnız hak sahiplerine; tekrar hedefleme ve kazanç istismarı sınırlandırılmış |
| 9. Ölçek ve dengeleme | Yük modeli, bölge/shard kararı, sentetik yük ve gerçek oyuncu kabul ölçümü | CCU hedefi ve p95 gecikme hata bütçesi tanımlı; yük testi ve maliyet raporu ile kapasite kanıtlı |

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
| Ekonomik tekelleşme | Yeni oyuncu üretim/tedarik yapamaz | Alternatif tedarik, sınırlı monopol etkisi ve gerçek arz talep dengesi |
| Griefing / sosyal taciz | Oyuncu oyundan atılır veya hedef olur | Yetki/rate limit, karşı oyun, rapor/engelleme, tekrar hedefleme sınırı |
| Tek sıcak servis/realm | Nüfus büyüdükçe gecikme ve kesinti | Bölgesel/domain shard, küçük işlemler, kuyruk idempotency ve ölçümlü kapasite |
| Kapsam patlaması | Online yeniden yapımı bitmez | Faz bazlı iş; her fazda oyuncu kabul ölçütü ve yalnız en küçük dikey dilim |

## 19. Karar kaydı — Codex’in varsayım yapamayacağı konular

`Öneri` ürün önerisidir; `ONAY GEREKİYOR` olanlar kullanıcı kararı gelmeden kesin uygulama kuralı değildir. Birbirinden bağımsız işler bu kararlar beklenirken ilerleyebilir.

| Konu | Önerilen başlangıç | Durum / etkisi |
|---|---|---|
| 10.000 oyuncu ne demek? | İlk hedef 10.000 kayıtlı hesap; CCU, eylem/s ve gecikme hedefi ayrıca ürün/operasyon kararıyla sayısallaştırılır | **ONAY GEREKİYOR:** kapasite tasarımı ve maliyet için kritik |
| Dünya modeli | Oyuncunun tek tarih algıladığı mantıksal ortak dünya; teknik olarak bölge/domain shard’larına ayrılabilir | **Öneri:** faz 0’da kaynak ve oyun akışıyla doğrula |
| Ay bazlı sıra | Herkesin Hazır olma çoğunluğu kaldırılır; sunucu olay saati kullanılır | **Öneri:** tasarım yönü net; faz 2’de davranış/maliyet doğrula |
| Çevrimdışı avatar | Oyuncu avatarı çevrimdışıyken yaşlanmaz/ölmez; kurum ve dünya ilerler | **ONAY GEREKİYOR:** önemli ürün kararı, faz 7 kilitli |
| Savaşta taht ve mülk | Savaş devam eder; yetki devri/ön emirle savunma; mülk/kurum kaybı açıklanır ve avatar ölümünden ayrılır | **ONAY GEREKİYOR:** faz 7 kilitli |
| Çevrimdışı NPC vekil | Oyuncu karakterini NPC gibi koşturma yok; oyuncu önceden sınırlı talimat/temsilci seçebilir | **ONAY GEREKİYOR:** faz 7 kilitli |
| Mevcut Diyar oyuncu kayıtları | Otomatik migration veya reset yok; önce şema ve oyuncu etkisi denetlenir | **ONAY GEREKİYOR:** eski veri kaybı/uyumluluk faz 0 raporuna göre |
| İlk çevrimiçi karakter sayısı | Hesap başına bir etkin online karakter önerisi | **ONAY GEREKİYOR:** çoklu karakter, alt hesap ve ekonomi etkisi |
| Online ad benzersizliği | Realm içinde benzersiz; SP adı kullanılmaz | **Öneri:** UX/moderasyon ile faz 1 öncesi teyit |
| Hosting ve ücret | Mevcut Cloudflare aday; ücretsiz araç şartını koru, yük kanıtı yokken ücret/kapasite sözü verme | **ONAY GEREKİYOR:** gerçek yük ve maliyet raporuyla karar |
| PvP kayıp şiddeti | İlerleme kaybettiren etkiler kademeli/telafi edilebilir; kalıcı avatar ölümü yok | **Öneri:** çatışma tasarım testinde oyuncu kabulüyle dengele |
| NPC simülasyon derinliği | Etkin aktörlerde zengin bireysel gündem; arka plan nüfusunda toplu temsil | **Öneri:** profil ve yük testi ile derinleştir |

## 20. Codex’e verilecek uygulama promptu

Aşağıdaki metni her uygulama isteğinde ilgili faz ve kabul kapsamı doldurularak kullan:

> `KRONIKLER_ONLINE_GDD.md` dosyasını ve `AGENTS.md`, `OTURUM_HAFIZASI.md` yönergelerini oku. Bu görev yalnız **Faz [numara/ad]** kapsamındadır. Önce mevcut kodda bu fazın online girişlerini, veri kaynağını, sunucu sözleşmesini ve ilgili UI akışını hedefli şekilde incele; eski Multiplayer/Diyar davranışını gereksinim kabul etme. GDD’deki ilgili kurala ve şu kabul ölçütlerine göre en küçük uçtan uca dilimi uygula: **[ölçütleri buraya yaz]**. Online kimliği, kayıtları ve runtime’ı single-player karakter/ad/save verisinden kesin biçimde ayır; SP akışını ve kayıtlarını değiştirme. `Karar Kaydı`nda ONAY GEREKİYOR olan ve bu faza bağlı kararı kendin verme; bağımsız işi sürdür, engellenen kısmı ve etkisini bildir. Sonuçlar sunucu otoritesinden gelsin; yetki, tekrar güvenliği, hata/bağlantı toparlaması, neden açıklaması ve altı dil gereksinimini kapsa. Ücretli servis, canlı entegrasyon, deploy, APK, commit ve push yapma. Yalnız istenen faza uygun doğrulamayı çalıştır ve gerçekten çalıştırdıklarını raporla. Sonunda değişen dosyaları, SP sınırını nasıl koruduğunu, test/kanıtı ve kalan riskleri özetle. Önce plan/inceleme istendiyse hiçbir dosyayı değiştirme.

### Codex için yalnız inceleme promptu

> `KRONIKLER_ONLINE_GDD.md`yi ürün hedefi, `AGENTS.md` ve `OTURUM_HAFIZASI.md`yi çalışma sınırı kabul et. Kod değiştirme. Yalnız Faz 0 denetimini yap: online giriş/kimlik/ad fallback’leri, online-SP import ve kayıt temasları, client-server protokolü, kalıcılık ve canlı deploy bağları için dosya/akış kanıtını çıkar. Mevcut beta davranışını yeni gereksinim varsayma. GDD’ye göre hedef sınır, mevcut sapma, olası veri kaybı/oyuncu etkisi, faz bağımlılıkları ve en küçük yeniden kurulum planını raporla. Eski GDD/arşiv dosyalarını açma. Canlı sunucuya bağlanma. Belirsiz kararları kendin doldurma.

## 21. Belgenin yönetişimi ve kapsam değişikliği

- Bu GDD online modun ürün/oynanış hedefidir; `AGENTS.md` ile `OTURUM_HAFIZASI.md` repo çalışma kurallarıdır. Çakışmada repo kurallarına uyulur; ürün çelişkisi görünür biçimde raporlanır.
- `TASARIM_PUSULASI.md` genel oyun kalite ölçütüdür. Bu belge yalnız online mod için ayrıntılandırır.
- `docs/MULTIPLAYER.md` mevcut Diyar uygulama envanteridir, yeni hedef tasarım değildir. Kod incelemesi bu belgedeki gerçekleri doğrulamalıdır.
- Yeni kapsam, açık karar tablosuna durum/tarih ve gerekçeyle eklenir. Kullanıcı onayı olmadan kapsam dışı bir mekanik sessizce “v1”e sokulmaz.
- Tasarım revizyonu yapılınca Codex promptu, kabul ölçütü ve ilgili fazlar aynı değişiklikte gözden geçirilir.
- Yeni ürün davranışının başarılı olup olmadığı; yalnız test sayısıyla değil, gerçek oyuncunun kısa oturumda kararı anlayıp sonucun sebebini görebilmesiyle değerlendirilir.

