# E4.3 Hizmet Altyapısı — Uygulama Planı

**Tarih:** 12 Kasım 2026  
**Dal:** `feature/online-p5-darbe-zinciri`  
**Durum:** E4.3-A/B/C tamamlandı. E4.3-D iki taraflı iş sözleşmelerinin ilk dilimi sunucu, mobil ve 6 dilde uygulandı; gerçek anlaşmazlık çözümü, gerçek kervan rotası koruması ve senet defteri gibi daha derin etkiler açık. Kalan beceri tüketicileri de açık.

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
- [x] Arabuluculuk (`arabulucu.araBulma`): 2 takat, hizmet tecrübesi ve kasaba morali +1.
- [x] Kervan muhafızlığı (`asker.kervanMuhafizligi`): 2 takat, zincir ustalığı düğümü ve zincir gerekir; teslimde zincir aşınır, kasaba asayişi +1.
- [x] Mektup (`katip.koyMektubu`): müşteri aynı kasabadaki üçüncü oyuncuyu seçer ve en çok 240 karakterlik metin verir. Çalışan teslim ettiğinde alıcıya özel kronik olayı gönderilir; müşteri de teslim bildirimi alır. Aynı gönderen-hedef çifti ayda bir mektup iletebilir; engel ve hesap/hane kümesi kontrolleri hem açılışta hem teslimde uygulanır.
- [x] Teklif başına istekNo tekrar güvenliği; oyuncu başına en çok iki açık iş sözleşmesi; kabul, ret, iptal, süre aşımı, yanlış tarafın teslimi, çift teslim ve emanet iadesi mevcut teklif defterinde doğrulanır.
- [x] İş türü, mektup hedefi/metni, alıcıya özel olay ve sözleşme durumları mobilde 6 dilde. Alıcı dost listesinden seçilebilir veya oyuncu koduyla girilebilir.
- [x] Regresyonlar: hizmet düğümü, zincir ustalığı, zincir aşınması, takat, moral/asayiş, emanet/ödeme, aynı hesap-hane, aynı hedefe aylık mektup sınırı, engelli hedef ve özel olay alıcısı.
- [ ] Derinleştirme: arabuluculuk şu an kasaba moraline katkı verir; henüz iki oyuncunun husumetini kapatmaz. Muhafızlık kasaba asayişini artırır; henüz belirli kervan rotasında haydut saldırısını önlemez. Senet/borç kaydı ayrı bir sözleşme eki olarak eklenmedi.
- [x] GitHub Actions [run #355](https://github.com/Tayma96/kroniklerorj/actions/runs/43141089447): **402 test / 401 geçti / 0 başarısız / 1 atlandı**; mobil TypeScript, 62 statik görsel yolu, sunucu testleri ve sunucu TypeScript başarılı.

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
