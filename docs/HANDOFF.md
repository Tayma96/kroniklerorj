# Devir — 11 Ekim 2026

Yapılan: yeni 25 sayfalık PDF çalışan kodla eşleştirildi; `AUDIT.md` envanter, mimari farklar ve ilk 10 akış; `DECISIONS.md` kararlar; 10 akış hash tabanı ve üç sentetik yaşam evresinde 30 ay simülasyon. Kullanıcı tüm rutin geliştirmeleri onay beklemeden yürütme yetkisini yineledi. APK/PR yalnız açık istekle, çalışma dalı apk.

Yapılmayan: gerçek oyuncu altın kayıtları elde değil; telefon ve canlı API ölçümü yapılmadı; PDF'nin tamamı uygulanmış değil. Aktif olmayan eski FastAPI API için sahte OpenAPI çıkarılmadı. Kontrollü test RNG, kayıtlı üretim RNG olarak sunulmadı.

Testler: mobil tsc ve iki dil denetçisi temiz; v1 göç 51 tur; 30 hayat / 20.136 ay oynanış eşikleri temiz. `gdd-baseline.cjs --kaydet` referans kaydını üretir; normal çağrı hashleri mevcut tabanla karşılaştırır. Tick p95 7,73 ms (konteyner). Ayrıntı AUDIT içinde.

Sıradaki: ses oynatıcılarını tembel ve sınırlı hale getir; rota/yaş/mevsim bağlamını bağla, ayarları koru, iptal/arka plan yarışını sınayıp Android paketi çıkar. Görsel taslakları ve yeni gradyan bağımlılığı henüz etkin sahne değildir. Sonraki motor değişikliği ayrı dalga ve tüm motor kapılarıyla yapılır.

Riskler: üretim RNG kayıtta yok; game.ts 10.886 satır; altın kayıt, cihaz, canlı sunucu ve lisansların mağaza yayın son kontrolü ayrıca gerekli. PDF'de öneri olan birçok konu zaten kısmen mevcut; yeniden yazmadan envanterle.

## Ses ve sahne kontrol noktası — 12 Ekim 2026

Ses/sahne dalgası uygulandı: `SES_SAHNE.md` değişiklikler, önce/sonra, test ve açık sınırlar. 63 kayıt bağlamsal katalogda; geçişte ≤4 döngü / ≤4 efekt, normalde 2 döngü. 15 resim anlamsal sahne eşlemesine bağlı, nötr geri dönüş var; görünmeyen modal ses açmaz. Altı dilde ortam ayarı; eski ayar ve kayıtlar korunur. Android/Hermes export geçti, gerçek APK yapılmadı. 390 px / 4× CPU'da çalışma kararı, seçimi, sonucu ve günlük oynandı; TR/AR ayar görselleri incelendi. Tarayıcı çizim altyapısı yalnız test ortamında başlatıldı; hızlı web ses aç/kapatında kütüphane iptal hatası ayrıca açık. Fiziksel cihaz testi yok. Motor/MP değişmedi, davranış tabanı aynı. Sıradaki: ortak neden dökümü ve kayıtlı RNG için ayrı doğrulanmış motor dalgası.

## Görsel kimlik kontrol noktası — 12 Ekim 2026

Kullanıcı görsel yönünü Türk/Türkmen karakterler, 1200'lü yılların Selçuklu Anadolu'su olarak belirledi.
`GORSEL_YAS.md` tamamlanan sunum dalgası ve sınırları; `YAS_KAYNAK.json` dört yeni atlasın gerçek yönergeleri,
kimlikleri, hücreleri ve dosya özetleri. Seçilen oyuncu portreleri korunur; NPC'lere çocuk/ergen evreleri eklendi.
Ana başlık/göstergeler daha okunur; kayıt yüklemesi sahte kazanç çıkarmaz; sade mod canlı uygulanır.
Altı dilde 9 ana ekran + 8 NPC profil örneği hatasız; Android paketleme ve davranış tabanı temiz.
Motor/MP/oyuncu varlıkları değişmedi. Fiziksel cihaz ve yeni APK yapılmadı; önceki ses cihaz kontrolü,
kayıtlı üretim RNG ve ortak neden dökümü işleri ayrı durur.

## Son görsel tercih — 12 Ekim 2026

Kullanıcı sarı yuvarlak ışık/sikke yağmurunu kaldırttı. Çizim bileşeni ve ana ekrandaki tetikleyici,
durum, zamanlayıcı ve tam ekran katmanı silindi; tekrar eklenmez. Oyun motoruna müdahale yok.
Tip/i18n/dil kontrolleri temiz. Hareketler açıkken 27 akçe kazancı alındı; beş anlık görüntüde sikke
çizimi ve çalışma zamanı hatası yok. Ayrı arayüz bulgusu: çalış düğmesinin orta noktası ilerlet düğmesi
tarafından örtülebiliyor; doğrulamada çalışma düğmesinin sol bölgesine normal basış kullanıldı.

## Ana panoda erişim düzeltildi — 12 Ekim 2026

Son örtüşme giderildi: ilerlet düğmesinin yükseldiği alan ana panoda ayrıldı; çalışma eylemi yukarıda,
bilgi/uğraş alanı kaydırılır. Altı dilde kısa ekran dahil 8 örnek: merkezden normal çalışma basışı para
kazandırdı, tur aynı kaldı; arada en az 14 px. Günlük iç içe kaydırmayı destekler; düğme etiketleri eklendi.
Tip/i18n/dil temiz. Sonraki somut GDD açığı: kayıt yazım yarışları, içe almada bekleyen eski yazım ve
sıfırlanmış oyunun yedekten geri açılması. Bunlar henüz onarılmadı; kayıt kuyruğu ve hata testleri gerekir.

## Ana oyun kaydı ve güncel öncelik — 12 Ekim 2026

Yukarıdaki ana kayıt yarışları onarıldı; `KAYIT_GUVENLIGI.md` gerçek kapsam ve deneyler. 13 kuyruk,
11 gerçek sağlayıcı geçişi ve altı dilde hata/yeniden saklama akışı temiz; Android paketleme geçti.
Yeni APK/cihaz testi yok. Ayrı hanedan defteri ve üretim RNG hâlâ açık. Kullanıcı doğrudan oynanışı
önceliklendirdi; sıradaki iş meslek döngüsü ve çalışma tarzlarının gerçek kazanç/risk görünürlüğü.

## Çalışma seçimi uygulandı — 12 Ekim 2026

`EMEK.md`: garantici daha az yorucu, ücret/risk önizlemesi ve gerçek ücret hesabı tek kaynağa bağlı.
Diğer üç tarzın RNG/durum davranışı aynı; 1.628 hedefli deney, 1.296 önceki motor karşılaştırması ve
altı dilde hesap/çalışma akışı temiz. 30 hayat oynanış eşikleri ve Android paketleme temiz. GDD'nin
geri kalan NPC/anlatı/ekonomi işleri açık; kullanıcı somut oynanış artışlarını öncelikli istiyor.

## NPC geçmişi — 12 Ekim 2026

`NPC_HAFIZA.md`: kişiliğe bağlı yeni anı yükü ve kimlik/kanıt alanları; belirgin anı seçimi; profil ve
geçmiş konuşması. Yeni eylem kaynak/ilişki/XP vermez. 10.798 hedefli örnek ve 7 altı dilli gerçek motor/UI
akışı temiz; karakter aynası, diyalog/olay, 30 hayat eşikleri ve Android paketleme temiz. GDD tabanında
yalnız sohbet değişti; eski motorla doğrulama ve gerekçe saklandı. Çok sıçramalı dedikodu, altı boyutlu
artımlı görüş, izlenim/LOD ve çok turlu konuşma hâlâ açık; yeni alanlar bu kabul maddelerinin kanıtı değil.

## Söylenti ağı ve tasarım serbestisi — 12 Ekim 2026

Kullanıcı GDD'yi uygularken kendi fikir/kararlarımızı eklememizi istedi. Kaynak sorgusu, en yeni
duyanların yayılım önceliği, kişiliğe bağlı aktarım cümleleri ve müdahaleye aylık sınır uygulandı.
`SOYLENTI_AGI.md` kapsam/sınır/doğrulama; eski söylentiler bölgesel davranışı korur, yeni söz yalnız
gerçek duyanlarda görüşe girer. Üç aktarım/48 kişi/ayda sekiz teslim ve 24 yoklama. 1.666 hedefli
senaryo, altı dilde küçük ekranda gerçek motor → kaynak sorgusu, 10 GDD akışı/üç 30 aylık sentetik
kayıt, karakter aynası, 30 hayat/18.569 ay oynanış temiz. APK/dağıtım yok. Tam GDD hedefi açık;
sonraki görünür aday tek olayın üç canlı tanığında farklı yorum veya kanıtla karşı söylenti.
Susturma/yüzleşme başarısı henüz tüm söylentiyi kaldırır; kişilere ayrı düzeltme anısı açık.

## Şahitlik kontrol noktası — 12 Ekim 2026

`SAHITLER.md`: gerçek aynı sahne/üç canlı kişi, farklı hafıza/görüş/söz; açık sadaka şahitli,
adsız hayır gizli. Muhatap ayrı, ortak olay tek söylenti, kaynak sorusu görgü/katılım/duyum ayrımı.
Profilde diğer şahitlere geçiş; özet ve otomatik sözlerde şahidin mağdur gibi konuşması düzeltildi.
1.246 hedefli örnek ve sekiz küçük ekran örneği temiz. Son motor görüntüsüyle 300 hayat HATA:0;
kirli-kopya damgası yolu düzeltildi. 30 hayat/19.528 ay, ayna ve metin denetimleri temiz. GDD'nin
artımlı vektör/izlenim, kanıtla karşı söylenti, mahkeme şahitliği, tonlu sohbet ve RNG işleri açık.
APK/PR/dağıtım yok; fiziksel cihaz denemesi yapılmadı. Yalnız apk dalı, tam geliştirme yetkisi sürüyor.

## Mobil sosyal sonuç — 13 Ekim 2026

`HAYIR_FIRSATI.md`: açık sadakanın gerçek şahidinden, ortak olaya bağlı kısa vadeli iş fırsatı. Aynı ay çalışma takası, ücret/bedel görünür; ret/süre sonu cezasız. Sonraya bırakma ve ana panodan geri açma; tek teklif, ikinci dönüm noktası penceresi yok. 37 motor ve 12 gerçek ana ekran bileşen örneği temiz. 10 GDD akışı/üç sentetik kayıt aynı; 30 hayat/21.051 ay, ayna/metin/göç/dil temiz. Bu oturum yerel tarayıcı bağlantısını engelledi; bileşen deneyi görsel/telefon QA sayılmaz. 300 hayat kadansı bir önceki dalgada; yeni APK yok. Tam GDD işleri açık.

Gönderim sınırı (13 Ekim 2026): GitHub bağlı okuma ile uzak apk=ae38a80 doğrulandı. Yerel ağ GitHub adını çözemedi; bağlı GitHub yazma aracı onay gereksinimi/never politikası nedeniyle işlemi engelledi. Bu dalga yerelde commit ve çıktı yamasıyla hazırdır, uzak dala gönderilmiş sayılmaz. İzinli ağ/yazma erişimi geldiğinde yalnız apk dalına normal ileri gönderim yapılmalı; uzak durum yeniden doğrulanmalı.

Sonraki izinli ağ oturumunda `dd4b01d50a0c73d323a9038fbb5641a2eb4457c3` uzak apk'ya
gönderildi; bağımsız uzak dal okuması doğruladı. Terminal Tayma96 erişimi geçerliydi. Önceki
başarısız kimlik doğrulamasını kalıcı hesap sorunu diye tekrarlama. Yeni ortam yeniden sınırlı
ağa dönebilir; yeni commit'in gönderimini ayrı doğrula, eski gönderim kanıtını ona uygulama.

## Şahit açıklaması — 13 Ekim 2026

`KARSI_SOZ.md`: gerçek ortak olay/görgü anısına bağlı açıklama başta üç dolaylı yerel duyumun
abartısını düzeltir, ardından gerçek bağlarla en çok üç halkada yayılır. Gerçek olayın olumsuz
etkisi ve ilk bilenlerin hafızası korunur. Kaynak susması diğerlerinin bildiğini silmez; dost ve
örgüt müdahaleleri de yereldir. Eski ağsız kayıt davranışı korunur. Ödülsüz/aylık tek müdahale.

Ana panoda tek söylenti izi ilgili karta gider; kaynak/şahit/bedel/gerçek yüzde görünür.
534 hedefli senaryo, önceki ağ/şahit/iş denetimleri, GDD hashleri, 30 hayat ve metin/ayna temiz.
Dokuz küçük ekran tarayıcı akışı gerçek motor ve saklanan kayıtla temiz; 44 px, altı dil,
uzak-susmuş kaynak ve büyük yazı. Android/Hermes paketleme geçti, APK/telefon QA yok.
Tam GDD açık: mahkeme, bağımsız iftira kanıtı, artımlı altı boyutlu görüş/izlenim/LOD, tonlu
çok turlu sohbet, üretim RNG. Sıradaki görünür sonuç bunlardan seçilsin; tekrar kayıt bakımına
ve uzun izin teşhisine sapılmasın. Yalnız apk; yayınlama sonucu ayrıca kaydedilmeli.

Şahit açıklaması dalgası gönderilemedi: yerel GitHub DNS/ağ erişimi kapalı, ağ izni aracı
bu tur ek yetki vermedi. Bağlı okuma uzak apk'yı dd4b01d olarak doğruladı. Yeni commit hazır;
yetki geldiğinde normal ileri gönderim ve bağımsız uzak kimlik doğrulaması gerekir.

Gönderim güncellemesi: 13 Ekim'deki workspace-write/otomatik inceleme izniyle fetch→normal
push→bağımsız ls-remote başarılı. Uzak apk artık `983f6c650b3b675608a83985854fb8ed404f4cf7`.
Cihaz girişi gerekmedi. Kullanıcı her commit'i hemen pushlamamızı istedi; aynı adımda uzak
kimliği doğrula. Yetkili ağ yükseltmesi kullanılabilirken normal DNS hata döngüsüne sapılmasın.

## Kişisel tavır — 13 Ekim 2026

`NPC_TAVIR.md`: kişisel anıların altı ayrı toplamı artımlı tutulur. Toplam ilişki +66 olsa bile
tehdit şahidinde korku 28/güven −13 özel konuşmayı kapatır; helallik sonrası korku 11 ile açılabilir.
Profilde tek tavır ve mevcut dökümün içinde altı değer; 44 px/etiket/ay kilidi/altı dil.
3.850 hedefli senaryo, önceki hafıza/ağ/şahit/iş örnekleri, 12 gerçek profil bileşen akışı temiz.
Eski şekil hashleri aynı; yeni defter yüzünden yalnız sohbetin ham hash'i güncellendi.
30 hayat/19.823 ay, ayna ve metin temiz. Cihaz sınırları taklit edildi; gerçek ekran/telefon QA yok.
300 hayat kadansından sonra üçüncü motor dalgası. Bir sonraki motor dalgasında kontrol noktası
planla. Tam GDD açık; kalıcı izlenim/LOD, çok varlıklı görüş, tonlu çok turlu sohbet, gerçek
mahkeme/iftira kanıtı ve kayıtlı üretim RNG sıradaki büyük işler. Web ve Android/Hermes
paketleme geçti. Son yayın sonucu ayrıca kaydedilir.

## Kalıcı NPC izlenimi — 13 Ekim 2026

`NPC_IZLENIM.md`: 24 ayrıntı + en çok 16 ucuz iz; görüş ve altı tavır boyutunda gerçek etki,
helallik/diyet/can bağışıyla yumuşama, unutulan şahitlikten kanıt üretmeme. 3.770 hedefli ve
önceki hafıza/ağ/tavır denetimleri temiz. Sekiz küçük ekran akışı altı dil/44 px/kayıt sonrası kilit.
Son motor görüntüsüyle 300 hayat HATA:0; yeni kontrol noktası bu dalgadır. 30 hayat/21.198 ay,
ayna/metin/tip/göç/dil/MP/web/Android-Hermes temiz. APK/telefon QA yok. Tam GDD açık.
Kullanıcı NPC sohbeti/etkileşimlerini özellikle derinleştirmemizi istedi: aile rolüne göre gerçek
profil eylemleri ve oyuncu karşılıkları öncelik. Eşi bekâr anlatan gercekSatir dalı hatalı; torunlar
henüz yalnız isim/otomatik olay. Bitmemiş işleri yapılmış sayma. Mevcut tam erişim/ağ/never
profilinde normal terminal erişimi var, sandbox_permissions verme, tekrar izin/kod isteme.

## Karşılıklı aile sohbeti — 13 Ekim 2026

`NPC_SOHBET.md`: profilde iki oyuncu karşılığı, kişilik/gerçek aile/yaş bağlamı, ortak
bakım ay hakkı ve bedeli. Eşi bekâr anlatma düzeldi; seçilen evlatla ilgilenilir.
İlk yanıt ödülsüz; ayda tek derin sohbet, eski olumlu puan tavanı, korku ve gerçek
eylem kabulü denetlenir. Ara ve tamamlanmış sohbet kayıt sonrası doğru açılır.
329 motor + 15 gerçek küçük ekran akışı, tip/göç/dil/GDD/MP/web/Android-Hermes temiz.
30 hayat/19.766 ay, ayna/olay metni temiz. 300 hayat önceki dalgada; APK/telefon QA yok.
Sıradaki torunların gerçek kişi/yaş/soy bağı ve etkileşimi: eski isimlere bilinmeyen
doğum/ebeveyn uydurma, vârisin gerçek başlangıç yaşı ve nüfus aktarımını önce oku.

## Gerçek torun ve aile sürekliliği — 13 Ekim 2026

`NPC_SOHBET` dalgası d13bc1b apk'ya gönderildi ve uzak kimlik doğrulandı.
`TORUNLAR.md`: kimlik/yaş/gerçek evlat üzerinden ebeveyn, aileden profile geçiş,
beş bakım aşaması ve yaşa özgü karşılıklı söz. Profil/sohbet ay hakkı ortak;
eski yalnız adlara doğum/ebeveyn uydurulmaz, atanın defterine kalır. Çocuğu olan
vâris gerçek yaş/aynı çocuk/gerçek eşle devam eder; başka kol kan akrabası kalır.
Çocuğu olmayan eski yedi yaş başlangıcı sürer. Kişisel hafıza/ay hakkı sıfırlanır.
99 motor, 329/3.770/3.850 önceki örnek, 12 gerçek küçük ekran/altı dil/44 px,
göç/dil/MP/GDD/web/Android-Hermes temiz. Yeni kontrol noktası 300 hayat HATA:0.
30 hayat/20.534 ay, ayna ve 41.682 olay metni temiz. Telefon/yeni APK yok.
GDD vâris hash'i yalnız gerçek eski yakınların kimlik/tanışıklık ekidir; eski
motorla karşılaştırıldıktan sonra güncellendi. Sıradaki aile üyelerinin kendi
gündemleri ve sohbetin sonraki karşılaşmadaki kişisel sonucu; bağımsız yetişkin
evlat evlenme/ayrılma, ayrıntılı soy rolleri/tam soy ağacı ve tam GDD hâlâ açıktır.

## Yetişkin evlat yolu — 14 Ekim 2026

`EVLAT_YOLU.md`: gerçek yetişkin evlat evlenir/göçer; gerçek çiftin çocuğu torun olur.
Oyuncu soyunda akraba eşleşmesi, 18 yaş altı eş/doğum ve iki ebeveynden birinin sekiz
çocuğu varken yeni doğum engellenir. Aylık/yıllık doğum haberi doğru evlat profiline gider.
Uzak evlada iki oyun aylık, ödülsüz gönderilen kervan mektubu; teslimde tek bağ/anı sonucu.
Yerel bakım hakkıyla ortak ay kilidi. Yeni haber ve mektup kayıtları göçte ayıklanır.

Gerçek yaşayan vâris kendi yaşı/mesleği/yeri/eşi/evlilik süresiyle devam eder; ölü aday
seçilemez, yaşayan yoksa oyun ölüyü diriltmez. Eski olay sayacı en büyük `q` değerine
onarılır. 75/99/329/3.770/3.850 motor örneği, 10 GDD akışı/üç 30 aylık kayıt, tip/dil/MP,
web ve Android/Hermes temiz. 30 hayat/20.614 ay eşikleri, ayna ve 27.780 metin temiz.
15 evlat, 12 torun, 15 sohbet küçük ekran akışı altı dilde geçti. Telefon/APK testi yok.

Sıradaki büyük aile işi doğrudan evlat ölümünü yedek vâris akışıyla güvenle açmak; sonra
yeğen/torun/çırak adayları. Dünya takvimi vârisle bütün ekranlarda kesintisiz sürmüyor;
NPC'den oyuncuya tam ad/portre/geçmiş aktarımı da eksik. Bunları bitmiş sayma. Yalnız
`apk`; biten her commit normal push ve bağımsız uzak kimlik okumasıyla doğrulanmalı.

Uygulama gönderimi tamamlandı: `5409ecd221bf2c618424e50655f7b50909bc7693`
yerel `apk`, `origin/apk` ve bağımsız uzak dal okumasında aynıydı; cihaz girişi gerekmedi.
