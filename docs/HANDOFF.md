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
