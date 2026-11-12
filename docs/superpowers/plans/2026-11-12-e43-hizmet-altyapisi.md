# E4.3 Hizmet Altyapısı — Uygulama Planı

**Tarih:** 12 Kasım 2026  
**Dal:** `feature/online-p5-darbe-zinciri`  
**Durum:** E4.3-A/B/C tamamlandı. E4.3-D sözleşme altyapısı, NPC–oyuncu ve oyuncu–oyuncu arabuluculuk, mektup akışı ve senet tahsilat dökümü sunucu/mobil/6 dilde uygulandı. Gerçek kervan rotası koruması, rota sistemi bulunmadığı için blokeli; kalan beceri tüketicileri de açık.

## Neden bu plan

`hizmetAcik(kar, id)` beceri ağacındaki öğrenilmiş hizmet yetkisini sunucu tarafında doğrular. Şu an üç gerçek bağlantı var:

- Hancı `ikram`: NPC han menüsünde %10 indirim.
- Asker `nobet`: Haydut ortak derdine nöbet katkısı.
- Ozan `turku`: Ortak derdin moral katkısı.

Bunlar **tam hizmet tarifi / ilan / teslim altyapısı değildir**. Genel altyapı olmadan her yeni hizmeti rastgele bir mevcut eyleme bağlamak tasarım anlamını bozabilir. Bu plan, `docs/online/MESLEK_AGACLARI.md` §7.1–7.5'teki dört teslim yolunu kodla uyumlu hale getirir.

## Değişmezler

1. Her hizmet için tek tanım kaynağı: kimlik, meslek, açan düğüm/seviye, girdiler, takat, hedef tipi, görünür etki ve kota.
2. İstemci gönderdiği hizmet kimliğine güvenilmez; sunucu katalogdan tarif bulur ve `hizmetAcik` ile yetkiyi doğrular.
3. Akçe ve eşya tek işlemde güncellenir; başarısız işlemde kısmi harcama olmaz.
4. Hazır hizmetin stok, ilan ve geçerlilik süresi açıkça saklanır. Süresi dolan stok yarı tecrübe ile bozulur; aynı hizmet iki kez teslim edilemez.
5. Kendine hizmet serbest olabilir ama teslim tecrübesi/teveccüh ödülü üretmez.
6. Aynı hizmetçi → aynı alıcı için ayda en çok iki ödüllü teslim; aynı hesap kümesi ödüllü teslim sayılmaz.
7. NPC talep ödülü tanımlı kasaba kaynağından çıkar; sınırsız akçe üretimi yok.
8. Etki, Hal/görüş/nam/gösterge/bilgi/kayıt gibi var olan görünür sisteme yazılır; gizli güç çarpanı eklenmez.

## Veri modeli

`HizmetTarifi` (salt katalog):
- `id`, `meslek`, `dugum`, `seviye`
- `girdi: Partial<Record<MalId, number>>`
- `takat`, `hedef: kisi | hane | iki_taraf | kasaba`
- `etki[]`: tür, alan, değer
- `hazir?`: adet ve geçerlilik ayı
- `aydaEnCok?`

Yerleşim verisi:
- Hizmet ilanı: satıcı karakter/hesap kümesi, hizmet kimliği, kalan adet, birim fiyat, açılış/bitiş ayı, istekNo.
- Teslim defteri: ilan kimliği, alıcı, hesap kümesi özeti, ay, teslim sayısı ve uygulanan görünür etki.
- NPC talebi: hizmet kimliği, hedef, açılış/kapanış ayı, ödül, tek teslim sahibi ve tamamlanma izi.

Kişisel hesap kimlikleri halka açık defterde gösterilmez. Görünür defterde oyuncu adı, hizmet, adet ve tarih yer alır.

## API sınırları

- `GET /v1/hizmet`: öğrenilmiş hizmetler, hazırlanmış stok, ilanlar, açık NPC talepleri ve kurallar.
- `POST /v1/hizmet/hazirla`: hizmet girdilerini ve takatini harcar, süreli stok üretir.
- `POST /v1/hizmet/ilan`: hazırlanmış stoktan fiyatlı ilan açar/kapatır.
- `POST /v1/hizmet/satin-al`: alıcı ödemesi, satıcı kasası ve görünür etkiyi atomik uygular.
- `POST /v1/hizmet/talep-teslim`: NPC talebini ilk uygun teslim sahibine verir.
- `POST /v1/hizmet/gorev`: koltuklu kasaba görevine başvuru/teslim; görev kotası ve ulufe.
- İki taraflı işler, mevcut teklif/cevap akışıyla entegre edilir; ayrı, paralel bir sözleşme motoru yazılmaz.

Her POST, `istekNo` ile tekrar güvenli olmalı. Yerleşim sınırları ve yetki kontrolleri sunucuda yapılmalı.

## Uygulama sırası

### E4.3-A — Ortak katalog ve hazır hizmet pazarı
- [x] Ortak katalog ve sunucu tarafı beceri kapısı.
- [x] Hazırlama: girdi + takat aynı işlemde düşer; geçerli süreli stok oluşur.
- [x] `GET /v1/hizmet` ve `POST /v1/hizmet/hazirla` uçları.
- [x] Hazır stoktan ilan açma/kapatma; iptalde süresi geçmemiş stoğu iade etme.
- [x] Alımda alıcı ödemesi, satıcı bakiyesi ve hedef etkisini aynı ekonomi işlemi içinde yazma; satıcı tecrübesi aynı hesap/hane kümesinde verilmez.
- [x] Stok kapasitesi, hesap-hane kümesi, kendi hizmeti ve süre dolumu için çekirdek regresyon testleri.
- [x] HTTP uçtan uca istekNo tekrar güvenliği ve satıcıyı kalıcı depodan yükleme testi (DO yeniden açılışıyla).
- [x] Süresi dolan hazır stok ve açık ilan stoğu ay dönümünde kapanır; satılmayan adet başına yarım hizmet tecrübesi verilir ve tekrar ödül engellenir.
- [x] `lohusa` ve `teselli` gerçek beceri düğümlerine bağlandı; hazırlama ve girdi tüketimi regresyon testleri eklendi.
- [x] `sazGecesi` Hancı + Ozan çapraz meslek sinerjisiyle açılır; sinerji yoksa hazırlama sunucuda reddedilir.
- [x] 6 dilde hizmet katalog/pazar metinleri ve mobil hizmet ekranı: `mobile/app/online/hizmet.tsx` ekranı katalog, hazırlama, hazır stok, fiyatlı ilan, satın alma, ilanı geri çekme ve yenileme akışlarını sunucu uçlarına bağlar; tüm ekran metinleri `online6.ts` içinde 6 dilde tanımlıdır. Yaşam ekranından doğrudan erişilir. GitHub Actions CI #213 (önceki) ve #43131233649 doğrulamasında mobil TypeScript, 62 görsel yolu, sunucu testleri (**374 toplam / 373 geçti / 0 başarısız / 1 atlandı**) ve sunucu TypeScript başarılı.

- Önce `yaraBak`, `turku`, `yatak`/oda gibi mevcut oyun durumuna doğrudan etki eden 3–4 hizmet.
- Hazırlıkta girdiler ve takat düşer; ilan satıcı çevrimdışıyken de satın alınabilir.
- Satın almada alıcı öder, satıcı kazanır, etki hedefe yazılır.
- Satıcı/alıcı hesap kümesi tekilleştirmesi, kendi hizmeti, stok yarışı, süre dolumu ve tekrar güvenliği testleri.

### E4.3-B — NPC hizmet talepleri
- [x] Gerçek aylık olay kaynakları: doğum → anneye lohusa bakımı; ölüm → yaşayan eşe, yoksa aynı hanedeki yetişkin yakına teselli. Yaralı/kaza talebi eklenmedi; oyunda gerçek yaralanma olayı ve NPC sağlık modeli yok.
- [x] Talep başına tek teslim ve tek ödeme. Teslim, bir adet hazırlanmış hizmet stoğunu tüketir, hizmetçi tecrübesi verir ve tamamlanma kaydını kroniğe yazar.
- [x] Ödül tarifte tanımlıdır (lohusa 8, teselli 5 akçe). Açılışta kasaba hanesinden rezerve edilir; bakiye yetersizse talep açılmaz. Süre dolumu veya hedef NPC'nin ölümü halinde rezerv hazineye iade edilir.
- [x] Aynı hanedeki oyuncu kendi hanesine açılan NPC talebinden ödül alamaz; aynı hane için aynı anda birden fazla açık talep ve aynı kaynak olayın tekrarından doğan kopya engellenir.
- [x] İstekNo'lu `POST /v1/hizmet/talep-teslim`; tamamlanmış talebin ikinci kez teslimi ödeme/tecrübe üretmez. Mobil ekranda açık NPC talepleri, ödül ve son ay gösterilir; hazırlanmış uygun stok yoksa teslim düğmesi kapanır.
- [x] Talep açılış/teslim kronik metinleri ve ekran metinleri 6 dilde. NPC'lerin oyuncu `Hal` modeli bulunmadığı için teslim, olmayan bir sağlık değerini değiştirmez; bakım/teselli hizmeti görünür olay ve hazine ödülüyle kayda geçer.
- [x] Regresyonlar: doğum/ölüm talep türü, yetersiz hazine, tekrar açılış, hane engeli, teslim ve çift teslim, stok tüketimi, süre sonu/hedef ölümü iadesi.
- [x] GitHub Actions [run #285](https://github.com/Tayma96/kroniklerorj/actions/runs/43136662787): **385 test / 384 geçti / 0 başarısız / 1 atlandı**; mobil TypeScript, 62 görsel yolu, sunucu testleri ve sunucu TypeScript başarılı.

### E4.3-C — Kasaba görevleri
- [x] Aylık pano: 4 sur nöbeti, 1 vergi sayımı, 1 meclis kaydı, 2 mızrak talimi koltuğu. Görevler yalnız kasaba hanesinde yeterli bakiye varsa açılır; her koltuğun 4 akçelik ulufesi açılışta rezerve edilir.
- [x] Nöbet için Asker `surNobeti` + mızrak; talim için Asker `mizrakTalimi`; sayım için Divan `vergiSayimi`; meclis kaydı için Divan `meclisKatipligi` hizmet düğümü sunucuda doğrulanır.
- [x] Nöbet/talim asayişi, sayım asayişi ve meclis kaydı morali artırır. Asayiş veya moral düşüklüğü haydut olay riskini yükseltir; nöbet bu riski doğrudan azaltan göstergeyi iyileştirir.
- [x] Aynı hesap veya aynı hane ayda birden fazla kamu görevi ulufesi alamaz. Görev koltuğu tek teslimlidir; ay sonunda kullanılmayan ulufe hazineye iade edilir. Eski kayıtlar için 12 aylık görev defteri sınırı uygulanır.
- [x] `GET /v1/hizmet` görev panosunu döndürür; istekNo'lu `POST /v1/hizmet/gorev` görevi teslim eder. Mobil hizmet ekranında 6 dilde görev adı, ulufe, takat ve teslim akışı vardır; tamamlanma kroniği 6 dilde çevrilir.
- [x] Testler: aylık koltuk sayısı, hazine rezervi/iadesi, beceri kapısı, mızrak gereksinimi ve aşınması, takat, hesap/hane tekilliği, tek teslim ve asayiş/moral etkisi.

### E4.3-D — İki taraflı işler
- [x] Ayrı sözleşme motoru yazılmadı; mevcut teklif/cevap akışına `is` türü eklendi. Müşteri ücreti teklif açarken emanet olarak kilitler; çalışan kabul eder, işi teslim eder ve ödeme ancak teslimde çalışana geçer.
- [x] Arabuluculuk (`arabulucu.araBulma`): 1 takat; teklif NPC hedefi ve uzlaşma bedeli seçer, kabulde gerçek üçgen talebi açılır, teslimde NPC–oyuncu ilişkisi mevcut arabuluculuk motoruyla değişir. İş ücreti arabulucuya, tazminat NPC/iadeye gider; moral sonuç yönüne göre artar/azalır.
- [x] Kervan muhafızlığı (`asker.kervanMuhafizligi`): 2 takat, zincir ustalığı düğümü ve zincir gerekir; teslimde zincir aşınır, kasaba asayişi +1.
- [x] Mektup (`katip.koyMektubu`): müşteri aynı kasabadaki üçüncü oyuncuyu seçer ve en çok 240 karakterlik metin verir. Çalışan teslim ettiğinde alıcıya özel kronik olayı gönderilir; müşteri de teslim bildirimi alır. Aynı gönderen-hedef çifti ayda bir mektup iletebilir; engel ve hesap/hane kümesi kontrolleri hem açılışta hem teslimde uygulanır.
- [x] Teklif başına istekNo tekrar güvenliği; oyuncu başına en çok iki açık iş sözleşmesi; kabul, ret, iptal, süre aşımı, yanlış tarafın teslimi, çift teslim ve emanet iadesi mevcut teklif defterinde doğrulanır.
- [x] İş türü, mektup hedefi/metni, alıcıya özel olay ve sözleşme durumları mobilde 6 dilde. Alıcı dost listesinden seçilebilir veya oyuncu koduyla girilebilir.
- [x] Regresyonlar: hizmet düğümü, zincir ustalığı, zincir aşınması, takat, moral/asayiş, emanet/ödeme, aynı hesap-hane, aynı hedefe aylık mektup sınırı, engelli hedef ve özel olay alıcısı.
- [x] Arabuluculuk teklifi gerçek NPC uzlaşma motoruna bağlandı; sözleşme ücreti ve NPC tazminatı ayrı emanetlenir, teslim/ret/iptal/süre aşımında tekil sonuç ve iade uygulanır. Bu kapsam NPC–oyuncu kırgınlığıdır; iki oyuncu arasındaki husumet için ayrı hakem/uzlaşma protokolü henüz yok.
- [x] İki oyuncu arasındaki husumet için ayrı hakem/uzlaşma protokolü tamamlandı (D2-A–E; ayrıntı aşağıda).
- [ ] Kervan muhafızlığı hâlâ yalnız sözleşme tesliminde zincir aşındırıp kasaba asayişini artırır. Gerçek rota koruması için çevrimiçi oyunda kervan seferi/rota/konum ve yolculuk adımı modeli yoktur; haydut yalnız kasaba tetiği ve ortak derttir. Bu bağlantı, gerçek rota/sefer sistemi eklenmeden tamamlanmış sayılmayacak.
- [x] Oyuncu borcu mevcut teklif kaydında zaten faiz, vade, kalan borç ve kısmi tahsilatla tutuluyordu. Senet eki olarak her tahsilatın ayı ve tutarı kalıcı `bo` dökümüne yazılır; aktif ve kapanmış borç kartında altı dilde gösterilir. Eski kayıtlar için alan isteğe bağlıdır.
- [x] Senet kartı borç kapandıktan sonra da `kalan 0` bakiyesini ve vade bilgisini göstermeye devam eder; kapanmış borç yalnızca geçmiş ödeme listesi olarak görünmez, kapanış bakiyesi de anlaşılır. Tahsilat dökümünde mutlak oyun ayına ek olarak yerelleştirilmiş göreli zaman (bu ay/kaç ay önce) gösterilir.
- [x] Mobil teklif formu haritadaki NPC hedefini, uzlaşma bedelini ve isteğe bağlı tazminatı seçtirir; teklif kartı ve sonuç nedeni altı dilde gösterilir. Eski hedefi olmayan arabuluculuk teklifleri emanet iadesiyle kapanır.
- [x] GitHub Actions [run #439](https://github.com/Tayma96/kroniklerorj/actions/runs/43195634565): **412 test / 411 geçti / 0 başarısız / 1 atlandı**; mobil TypeScript, 62 görsel yolu, sunucu testleri ve sunucu TypeScript başarılı.
- [x] GitHub Actions [run #364](https://github.com/Tayma96/kroniklerorj/actions/runs/43141638764): **402 test / 401 geçti / 0 başarısız / 1 atlandı**; mobil TypeScript, 62 statik görsel yolu, sunucu testleri ve sunucu TypeScript başarılı.

## Kabul ölçütleri

- Her katalog hizmetinin açılır/kapalı yetki testi ve gerçek etki testi var.
- Hazır stok, ilan, satın alma, teslim ve NPC talebi için çift harcama/çift ödeme testi var.
- Çevrimdışı satıcıdan satın alma başarılı.
- Kendine hizmet ve aynı hesap kümesi ödüllü teslim üretmiyor.
- Akçe değişmezi: alıcı kaybı = satıcı kazancı (NPC talebi hariç; orada kaynak defteri açık).
- Takat ve mal kaybı başarısız işlemde sıfır.
- 6 dilde görünür olay metni ve istemci akışı olmadan özellik tamamlandı sayılmaz.

## Şimdilik kapsam dışı

- Bu plan, bütün 52 hizmet etkisini tek seferde bağlamaz.
- Diplomatik tanınma, çatışma ateşkesi ve mağaza iade bildirimleri bu hizmet fazının parçası değildir.


## E4.3-D2 — Oyuncu–oyuncu arabuluculuğu (tasarım sözleşmesi)

Bu dilim, NPC arabuluculuğunu oyunculara doğrudan uygulamaz. Oyuncu–oyuncu anlaşmazlığında üç ayrı irade vardır: şikâyetçi, karşı taraf ve tarafsız arabulucu. Hiçbir tarafın sessizliği kabul sayılmaz; NPC akışındaki rastgele başarı/ret zarı burada kullanılmaz.

### Değişmezler

1. **Üçlü açık rıza:** Dosya açan oyuncu, karşı taraf ve arabulucu ayrı ayrı katılımı kabul eder. Bir davet cevapsız kalırsa süre sonunda yalnızca dosya düşer; para/itibar cezası uygulanmaz.
2. **Tarafsızlık:** Arabulucu taraflardan biri olamaz; taraflardan biriyle aynı hesap/ocak kümesinde olamaz; taraflardan biriyle engel kaydı varsa dosya açılamaz. Arabulucunun iki tarafla dostluk veya açık husumet bağı varsa tarafsızlık kontrolü başarısız olur. Bu kontroller hem açılışta hem son teklif öncesinde yenilenir.
3. **Bağlayıcı karar yok, çift imzalı uzlaşma var:** Arabulucu hüküm vermez; yalnızca tek bir uzlaşma taslağı sunar. Taslakta tarafların yapacağı ödeme/teslim ve son tarih açıkça yer alır. İki taraf da aynı sürüm numarasını onaylamadan uygulanmaz.
4. **Emanet ve atomiklik:** Para/mal, yalnızca taslak iki tarafça onaylandıktan ve iki tarafın da gerekli bakiyesi doğrulandıktan sonra emanet hesabına alınır. Her iki tarafın emanetinin alınması tek işlemde gerçekleşir; biri başarısızsa ikisi de değişmeden kalır. Teslim/ödeme bir kez uygulanır; tekrar istek aynı sonucu döndürür.
5. **Geri çekme sınırı:** Her taraf taslak imzalanmadan önce çekilebilir. İki imzadan sonra tek taraflı iptal yoktur; yalnızca süreli yükümlülük/emanet iadesi kuralları işler. Süre aşımı, karşı tarafa otomatik zafer veya yeni akçe üretmez; yatırılmış emanet sözleşmede belirtilen iade/teslim kuralına göre kapanır.
6. **Arabulucu ücreti:** Ücret başta emanetlenir; yalnızca iki taraflı imza ve başarılı kapanıştan sonra ödenir. Arabulucu kendi davasında taraf olamaz ve kendi hesabı/ocağına bağlı dosyadan ücret kazanamaz.
7. **Gizlilik ve kayıt:** Her iki tarafa özel müzakere metni herkese açık olay olarak yayımlanmaz. Meydanda yalnızca tarafların uzlaşmayı imzaladığı ve dosyanın kapandığı bilgisi görünür; kişisel hesap kimlikleri veya özel mesajlar deftere yazılmaz.
8. **İstek tekilliği:** Dosya kimliği, sürüm ve istekNo ile idempotent olur. Aynı taraf çifti için aynı anda tek açık dosya; aynı istekNo ile tekrar açılış ikinci emanet/ödeme oluşturmaz.

### Uygulama sırası

- D2-A: Kalıcı dosya/katılım/durum modeli ve salt doğrulama fonksiyonları.
- D2-B: Üçlü davet, kabul/ret/çekilme ve tarafsızlık kontrolleri.
- D2-C: Sürümlü uzlaşma taslağı, çift imza ve atomik emanet.
- D2-D: Süre sonu, idempotency, engelleme/ölüm/karakter yüklenememesi ve tekrar teslim testleri.
- D2-E: API, mobil ekran ve altı dil.

**İlk kod dilimi için kapsam:** D2-A; mevcut `Toplum` kayıt şemasına isteğe bağlı alan eklemeden önce kalıcı verinin sürümleme/varsayılan okuma biçimi incelenecek. NPC arabuluculuk defteriyle aynı diziye karıştırılmayacak.

### Uygulama durumu — 2026-11-12

- Üçlü davet, açık rıza, tarafsız arabulucu denetimi, ret/çekilme ve ay dönümünde cevapsız davetin düşmesi sunucuya bağlandı.
- Sürümlü uzlaşma taslağı ve iki tarafın ayrı ayrı aynı sürümü imzalaması API ve gelen kutusu ekranına bağlandı.
- İkinci imzada iki tarafın bakiyesi birlikte doğrulanıyor; yetersiz bakiye varsa imza ve iki bakiye de değişmiyor. Yeterliyse iki ödeme tek yerleşim yazımında emanete alınıyor.
- Emanet, yalnızca uzlaşmanın iki tarafından birinin tek seferlik uygulama isteğiyle alacaklı tarafa aktarılır; arabulucu aktarımı başlatamaz. Tekrar istek ikinci aktarım oluşturmaz.
- İmzalı uzlaşmaya varsayılan üç aylık uygulama süresi eklendi. Süre aşılırsa emanet iki tarafa da özgün tutarlarıyla iade edilir; iade izi ikinci iade/ödeme girişimini engeller. Süresi dolan taslak ikinci imzayla emanet kesintisi yapamaz. Gelen kutusu kartında son uygulama ayı gösterilir; altı dilde çevrildi.
- Arabulucu taslağı sunmadan hemen önce üç karakterin de yüklü olduğunu, engel kayıtlarını ve tarafsızlık koşullarını yeniden doğrular.
- Davet/taslak/imza aşamasında üç katılımcıdan biri ölür veya karakter kaydı bulunamazsa dosya cezasız düşer; ilk imzadan sonra taraf ölürse ikinci imza emanet kesintisi yapamaz. İmzalı uzlaşmada şikâyetçi veya karşı taraf ölürse dosya cezasız kapanır ve iki tarafın emanetleri özgün karakter kayıtlarına (ölünün tereke kaydı dâhil) iade edilir. Ay dönümü bunu otomatik yapar; tarafın uygulama isteği de ay dönümünü beklemeden aynı güvenli iadeyi tetikler. Arabulucunun imzalı uzlaşma sonrasındaki ölümü ise iki tarafın rızasını geçersiz kılmaz.
- **Henüz kapsam dışı:** mal/ürün teslimi, arabulucu ücreti, ayrı bir son teslim tarihi ve hesabın kapanıp karakter kaydının bulunamaması. Bu başlıklar tamamlanmadan D2 bütünüyle bitmiş sayılmayacak.

