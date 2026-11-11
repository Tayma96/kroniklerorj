# E4.3 Hizmet Altyapısı — Uygulama Planı

**Tarih:** 12 Kasım 2026  
**Dal:** `feature/online-p5-darbe-zinciri`  
**Durum:** E4.3-A katalog, hazırlama, ilan, iptal ve oyuncu tesliminin ilk sunucu dilimi uygulandı; uçtan uca HTTP testleri ve NPC talebi sonraki adımlar.

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
- [ ] HTTP uçtan uca istekNo tekrar güvenliği ve satıcıyı kalıcı depodan yükleme testi.
- Önce `yaraBak`, `turku`, `yatak`/oda gibi mevcut oyun durumuna doğrudan etki eden 3–4 hizmet.
- Hazırlıkta girdiler ve takat düşer; ilan satıcı çevrimdışıyken de satın alınabilir.
- Satın almada alıcı öder, satıcı kazanır, etki hedefe yazılır.
- Satıcı/alıcı hesap kümesi tekilleştirmesi, kendi hizmeti, stok yarışı, süre dolumu ve tekrar güvenliği testleri.

### E4.3-B — NPC hizmet talepleri
- Önce kaza → yaralı, doğum → lohusa, ölüm → yaslı hane talepleri.
- Talep başına tek ödeme; ilk geçerli teslim alır.
- Ödül kaynağı ve NPC çarpanı ekonomi değişmeziyle sınanır.

### E4.3-C — Kasaba görevleri
- Nöbet 4, sayım 1, meclis kaydı 1, talim 2 koltuk.
- Ay başında kota, uygun beceri, ulufe ve görünür gösterge etkisi.
- Görevler kapanınca tekrar teslim kabul edilmez.

### E4.3-D — İki taraflı işler
- Arabuluculuk, muhafız sözleşmesi, mektup/senet gibi işler mevcut teklif akışına bağlanır.
- Kabul, ret, süre aşımı, iptal ve tarafların hesap kümeleri doğrulanır.

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
