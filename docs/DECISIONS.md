# Mimari kararlar — güncel uygulama

## 11 Ekim 2026 — Tasarım belgesinin etkin koda uyarlanması

Bağlam: detaylı PDF eski web/Python uygulamasını varsayıyor ve doğrulama istiyor. Aktif Expo/TypeScript oyun ve Cloudflare MP var. Kullanıcı rutin kararlar ve öneriler için tam yetki verdi; onay beklenmez.

Karar: çalışan mobil çekirdek korunur; eski Python/web kaynakları arşivdir. Vite/Capacitor/Pyodide geçişi, Mongo üretim veri değişikliği veya MP kaldırma yapılmaz. Ay takvimi ve altı dil korunur. Mekanikte v7, sunumda v8 ve pusula geçerli; PDF bunları genişletir. Hayat Hırsı kalıcı reddedilmiştir.

Sonuç: ADR-1'in tek oyuncu kısmı fiilen istemcide; MP dünya otoritesi sunucuda fakat yerel karakter simülasyonu hâlâ istemcide. Güven sınırını sunucu otoriteli ilan etmiyoruz. ADR-2 veri ve denge ayrıştırması motor refactor öncesi davranış tabanı ister. ADR-3'te yerel soy defteri zaten ayrı anahtardır; sıcak oyun kaydının tümü JSON yazılıyor. ADR-4'te eylem/tur kilitleri mevcut fakat tüm protokol için evrensel idempotency/version kilidi kabulü açık.

## Ses katmanı — uygulanacak düşük riskli düzeltme

Ayrı müzik/ortam/efekt kanalları, tembel yerel oynatıcılar, sınırlı eşzamanlı ses, uygulama arka planında tüm kaynakları bırakma. Mevcut ayar anahtarları ve efekt çağrıları korunur. Ses bağlamı oyun durumunu yalnız okur; kaynak, zar, kayıt ve MP mesajına dokunmaz. Kapatma ve geç dönen seek yarışı kontrollü saat/oynatıcı testleriyle doğrulanır. Arka plan oynatma ve mikrofon izni kullanılmaz.

## 12 Ekim 2026 — Ses/sahne uygulandı

Karar hayata geçti: sınırlı tembel ses, iki ayrı ortam/müzik kanalı, bağımsız tercihler, güvenli kaynak bırakma. Sahne temasında net olay kimliği yoksa nötr kalınır. Yaş ve mevsim yalnız ses bağlamıdır; kayıt ve oyun zarı değişmez. Ortam ilk tercihi önceki müzik/sade moda göre seçilir ve kalıcılaşır. Sade modda dekoratif yakınlaşma/süzülme durur; karar işlevi sürer.

Tarayıcıya karşılık gelen çizim başlatması test ortamına aittir; aktif Android istemci için yeni web mimarisi varsayılmaz. Tarayıcı ses iptal hatası bilinen uyumluluk açığı olarak saklanır. APK ve sunucu dağıtımı tetiklenmedi.

## 12 Ekim 2026 — Selçuklu Anadolu'su ve yaş kimliği

Kullanıcı görsel/tasarım değişikliklerine yetki verdi ve Türk/Türkmen karakterlerle 1200'lü yılların Selçuklu
Anadolu'sunu istedi. Seçilen oyuncu seti korunur; yetişkin NPC yüzleri referans alınarak çocuk/ergen evreleri
eklenir. Kişi kimliğini seçen özet ve havuz sırası değiştirilmez. Dört atlas dosyası arayüzde hücre olarak
kadrajlanır; dosya pikseli yeniden işlenmez. Altı dilde mevcut etiketler kullanılır, ekran okuyucuya tam
değer verilir. Sade mod ortak abonelikle uygulanır ve dekoratif döngüler temizlenir. Kayıt yüklemek
kazanç sayılmaz. Ayrıntılar ve ölçüm sınırları `GORSEL_YAS.md` içinde.

## 12 Ekim 2026 — Sarı ışık topları kaldırıldı

Kullanıcı ekranda süzülen yuvarlak sarı ışıkları reddetti. Sikke yağmuru çizimi ve ana ekrandaki tüm
tetikleme/durum/zamanlayıcı katmanı silindi. Bu efekt yeniden eklenmez; kazancın gerçek değeri mevcut
gösterge ve bildirimle aktarılır.

## 12 Ekim 2026 — Kayıt yarışları ve oynanış önceliği

Ana oyun kaydı aynı anahtar adları ve 1.200 ms birleştirme ile tek yazım sırasına alındı; yeni hayat
ve içe alma eski işleri iptal eder. MP karakteri SP kuyruğuna girmez; dışa aktarım canlı SP belleğini
tercih eder. Ayrı hanedan defteri bu dalgada değişmedi. Kullanıcı kayıt işine ayrılan zamanı fazla
buldu ve oynanışı önceledi; sıradaki geliştirmeler çalışma ve meslek kararlarında görünür olacaktır.

## 12 Ekim 2026 — Garantici gerçek bir takasa dönüştü

Normal çalışmaya göre yalnız daha az ücret veren garantici seçimi artık tokluktan üç puan daha az
harcar ve sağlık +1 verir (100 tavan). Diğer tarzların ücret/risk/RNG davranışı korunur. Oyuncu ücret
aralığı, bedel ve riskte kalanı önceden görür; önizleme ile gerçek ücret tek saf hesap kullanır.
Tarz seçimi zar/kayıt/tur değiştirmez. Aylık kilit yeni dinlenme yararını da tekrar kullanımından korur.

## 12 Ekim 2026 — Anı cephesini kişiselleştir

GDD S2 için mevcut anı çağrılarını koru; yeni anıda olay/sahip/kanıt alanları ve kişilik yükü üret,
eskilerin yükünü yeniden hesaplama. Geçmiş konuşması en belirgin anıyı görünür kılar; yeni ödül kanalı
oluşturmaz. Şimdiki tek kaynak halkası çok sıçramalı yayılım diye sunulmaz; onun gerçek kişi ağına
bağlanması ve artımlı çok boyutlu görüş ayrı açık uygulama adımlarıdır.

## 12 Ekim 2026 — GDD'yi tasarım kararlarıyla uygula

Kullanıcı belgeyi uygularken kendi fikir ve kararlarımızı da katmamızı istedi. Belge oyunun yönünü
belirler; her öneri birebir ve koşulsuz kopyalanmaz. Eklenen karar oyuncuya anlamlı seçim veya
anlaşılır sonuç getirmeli; Türk/Türkmen Selçuklu dönemi çizgisi, yaş kimliği ve etik sınırlar korunur.

Bu dalgada: yeni duyanların yayılımda önceliği, kaynak sorgusunda sayısal gizli puan yerine kişinin
sözü, kişiliğe göre farklı aktarım cümlesi ve başarısız müdahaleye aylık sınır. Uygulama/sınırlar
`SOYLENTI_AGI.md` içinde. Sonraki tasarım fırsatı, ispat ile karşı söz arasındaki seçim: şahit/kanıt
bulmak güven verebilir; sırf para dağıtmak tüm kişilerin inancını anında silmemeli. Bu son fikir henüz
uygulanmadı; tamamlanmış özellik olarak sayılmaz. Daha çok süs yerine ilişkilerin oynanışa etkisi öncelikli.

## 12 Ekim 2026 — Görülmek ile yaşamak ayrıdır

Açık sadaka toplumsal iz bıraksın, adsız hayır şahit üretmesin. Olayın tarafını ikinci kez şahit
yapma. Görgünün duygu yükü kişisel yaşantının %60'ı; huy yine çarpar. Üç şahit üç söylenti doğurmaz:
bir sahne, bir üretim denemesi. Kaynak sorusunda kişinin bizzat bildiği ile başkasından duyduğu
ayrılır. Liste/görüş/sohbet aynı kanıt türünü anlatır; özette en güçlü gerçek anı örnek alınır.
Kanıtla karşı söz ve mahkeme kullanımı sonraki açık uygulama adımlarıdır.

## 13 Ekim 2026 — Mobil oyuncuya sosyal sonuç getir

Kullanıcı oyunun mobil olduğunu ve toplum/oyuncu psikolojisine göre oynamaya değer kılınmasını vurguladı. Açık hayrın gerçek şahidinden kısa vadeli iş teklifi: sebebi anlaşılır, iki oyun seçeneği, ücret/yorgunluk takası. Ret veya sonraya bırakma baskı/ilişki cezası yaratmaz. Kısa oturumun ilgisini kişinin hatırlaması ve tekrar karşılaşma taşır; gerçek takvim/giriş serisi yok. GDD uygulanırken bu tasarım kararları eklenir. `HAYIR_FIRSATI.md` kapsam ve doğrulama sınırları.

## 13 Ekim 2026 — Susmak unutmak değildir

Gerçek kötü davranışın abartısını bir şahit düzeltebilir; davranışın kendisini silmez. Bu yüzden
açıklama kanonik anlatımı geri getirir, kesinliği ve gerçek anıları korur. Başta üç yerel kişi,
sonra mevcut bağlarla üç halka; kasabanın tamamına sihirli af yok. Kaynağı susturmak yalnız
onun aktarımını durdurur. Dostun savunması da sadece kendi duyumuna etki eder.

Ücretsiz şahit açıklamasının bedeli ayın müdahale hakkıdır; para/ilişki/XP kazandırmaz.
Yüzleşme ve susturma olasılıklı/riskli alternatif olarak görünür. Oyuncunun önüne ana akışta
tek iz getir; tüm ağ yollarını açan yeni menü ekleme. Açıklamanın gerçek kaynağı konuşmada
gösterilsin. `KARSI_SOZ.md` kapsam/doğrulama; asılsız iftiraya bağımsız kanıt ve mahkeme açık.

## 13 Ekim 2026 — Sevgi ve güven aynı değildir

Kişisel yaşantının altı boyutu eski ilişki toplamını kopyalamaz. Hediyenin yakınlık ve minnet
yararı, tehdidin korkusunu otomatik silmesin. Korku yüksek/güven düşükken özel konu kapanır;
helallik ve gerçek anının hafiflemesi bu durumu değiştirebilir. Sırf konuşmayı denemek ödül
veya yeni ceza oluşturmasın. Profilde bir tavır cümlesi, ayrıntılar mevcut Neden dökümünde.

Altı toplam ilk motor yazımında eski anılardan başlar, sonra anı değişimleriyle güncellenir.
Doyma yalnız görüntüde uygulanır; defterin ara toplamı kesilmez. Tüm varlıklar arasındaki
görüş, kalıcı izlenim ve LOD bu kişisel katmandan ayrı açık işlerdir. `NPC_TAVIR.md` sınırlar.

## 13 Ekim 2026 — Ayrıntı unutulur, tavırdan iz kalır

24 ayrıntı tavanını ölçümsüz büyütmek yerine en çok 16 küçük özet. Aynı tema/yön/deneyim sınıfında
tek en güçlü iz; sıradan sohbetin kalıcı puan biriktirmesi kapalı. Unutulan şahitlik özet üzerinden
yeniden kanıt olmaz. Helallik özeti de yumuşatır; vârise kişisel minnet değil mevcut ata görüşü geçer.
GDD'deki ayrı koleksiyon/LOD ve bütün varlıklar vektörü ayrıca açık. `NPC_IZLENIM.md` gerçek kapsam.

Kullanıcı NPC profilindeki sohbet ve etkileşimleri sığ buldu; eş/anne-baba/evlat/torun farkını istedi.
Sonraki öncelik, profil içindeki aile eylemleri ve oyuncunun yanıt verebildiği bağlamlı kısa konuşmadır.
Eşi bekâr anlatan aile satırı ve henüz yalnız isim/otomatik olay olan torunlar açık bulgulardır.

## 13 Ekim 2026 — Dinlemek gerçek desteğe bağlansın

Karşılıklı sohbet iki oyuncu yanıtı içinde niyet ve sonucu bağlar. Aile bakımını ayrı
ödül kanalına çevirmeden mevcut gerçek eylemi çağırır; gerçekleşmeyen destek olmuş
gibi yazılmaz. İlk yanıt düşünme alanıdır, kaynak/zar/ilişki değiştirmez. Kişilik
itiraza karşılığı değiştirir; dürüst sınır her kişide otomatik en iyi seçenek değildir.
Önce az sayıda ilgili konu, diğerleri açılır satır; yaş, güven/korku ve gerçek soy bağı
sözü belirler. `NPC_SOHBET.md` kapsam/sınırlar. Torunlar sıradaki açık iştir.

## 13 Ekim 2026 — Soy bağı adı değil kişiyi izlesin

Yeni torun gerçek evladın gerçek çocuğudur. Yaş ve yerleşim bakımı/sözü değiştirir;
uzaktaki veya yetişkin toruna beşik/avlu/ilk at sahnesi uydurulmaz. Eski yalnız ad
bilgisi eksik kalabilir, uydurma soy verisinden daha dürüsttür. Ortak aylık zaman
seçimi gerçek bağ yaratır; yeni para/XP musluğu yoktur.

Çocuğu olan vârise yedi yaş verip evlatlarını düşürme. Gerçek yaş/aynı çocuk kimliği,
öbür ebeveyn ve gerçek eş korunur; diğer aile kolu yabancı veya kur adayı olmaz.
Eski adlar atanın defterine kalır. `TORUNLAR.md` gerçek kapsam; bütün vârislerin
yaş modelini, bağımsız yetişkin evlat yaşamını ve tam soy ağacını tamamlanmış sayma.

## 14 Ekim 2026 — Yetişkin evlat bağımsızdır, bağ kopmaz

18 yaşını tamamlayan gerçek evlat eşini ve yerleşimini nüfus kurallarıyla seçer; oyuncu
onun yerine karar vermez. Oyuncu ailesine katılan eş de 18 yaşını doldurmuş olmalı.
Evlilik, göç, doğum ve yas gerçek kişi kayıtlarından çıkar; sahte eş/ev/çocuk üretilmez.
İki ebeveynin çocuk ve aynı yıl doğum sınırı birlikte uygulanır.

Uzaklık aile bağını menü cezasına çevirmesin: ücretsiz mektup iki oyun ayında ulaşır,
gerçek takvim/giriş serisi yoktur. Gönderim ödülsüzdür; sonuç yalnız teslimde bir kez gelir.
Yerel ilgiyle aynı aylık hakkı paylaşır. Ana panoda tek güncel haber kişiye götürür;
olay sıra kimliği kayıt göçünde korunur.

Vâris olmak kişiyi çocuklaştırmaz. Gerçek kişi yaşı, yeri, uygun mesleği, yaşayan eşi ve
evlilik süresi korunur; bilinmeyen geçmiş uydurulmaz, ölü kişi diriltilmez. Tam kimlik,
portre, geçmiş, dünya takvimi ve yedek vârisler ayrı açık kararlardır. Ayrıntılar ve
kanıt sınırları `EVLAT_YOLU.md` içindedir.
