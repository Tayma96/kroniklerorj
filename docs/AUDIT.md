# Kronikler — güncel kod denetimi

Taban: `1431f73`, `apk`; bu dalga kayıtlı yol/ticaret/savaş kararlarını ekler.
Kapsam: güncel oturum özeti, tasarım pusulası, yol haritası, aktif motor,
ana ekranın karar akışı, kayıt kuyruğu, pazar, yol ve taktik savaş kodu ile hedefli testler.
Önceki GDD yüzdeleri bu incelemede yeniden ölçülmedi.

## Aktif mimari ve ürün

- İstemci `mobile/`: Expo 56, React Native, TypeScript. `legacy/` aktif uygulama değildir.
- `lib/game.ts` yaklaşık 11.900 satır / 1,08 MB; ana aylık döngü `advance`.
  Bir tur bir ay, bir yıl 12 tur. Başlangıç 1247; çevrimdışı öncelik korunur.
- Motor; yaşam, NPC/aile, ekonomi, suç, savaş, hanedan ve vâris akışlarını aynı durumda tutar.
  Tek dosyanın büyüklüğü bakım yüküdür; rastgelelik ve kayıt sözleşmeleri sağlamlaşmadan
  toplu modül ayırma yapılmamalı. Bu dalgada yalnız ortak zar çekirdeği ayrıldı.
- Kayıt `kronikler_save_v1`, önceki sağlam yedek `_bak`; hanedan defteri ayrı.
  `kayit-kuyrugu.ts` yazımları 1.200 ms birleştirir ve seri işler; arka planda flush edilir.
- MP istemcisi ve Cloudflare Worker/Durable Object sunucusu mevcut. Yerel simülasyonun
  tamamı sunucu otoriteli değildir. Canlı erişim, güvenlik ve hile dayanıklılığı ayrı doğrulama ister.
- Altı dil tr/en/es/pt/ar/ru. Bu kontrolde 9.381 sözlük anahtarı, 54 ikon ve 34 ikon alias'ı tarandı.

## Doğrulanan davranış ve eksikler

| Akış | Mevcut durum | Açık iş / kabul sınırı |
|---|---|---|
| Aylık karar | `MonthScene` tur/nesil kimliğiyle kaydediliyor; bekleyen kart yeniden açılıyor, seçim tek kez uygulanıyor ve ay ilerleyişi çözülmemiş kararda duruyor. Eski/kopuk kart güvenli biçimde eleniyor. | Farklı aylık olay ailelerinin tamamında RNG ve yeniden başlatma davranışı ayrıca taranmalı. |
| Rastgelelik | `rng_state` kayıtta; eski kayıt için kararlı başlangıç ve idempotent göç var. Suçun yanında yol, pazarlık, kervan, piyasa ve savaşın aşağıdaki kararları taşındı. | `game.ts` içinde hâlâ 265 doğrudan `Math.random()` çağrısı; yaşam/NPC/aylık kart sistemleri dahil kalan yollar aşamalı taşınmalı. Tam aylık dünya tekrarı henüz garanti değil. |
| Yol | Dört rota, pusu, köpek koruması, at kaybı, yol olayı, eve dönüş kayıtlı zar kullanıyor. 52 sonuç anahtarı doğrulandı. | Yol olayının aylık kazanç kilidi mevcut. Mesafe, konaklama ve yol üzerinde oyuncunun vereceği ek kararlar ayrı ürün işi. |
| Pazar | Pazarlık ve blöf, güncel kayıt üstünde tek zar harcıyor; arayüz ortam zarı atmıyor. Müzakere fiyatı, sabrı ve son sözü opsiyonel oyuncu kaydında saklanıyor; aynı ay/şehir/mal için ekran yeniden açıldığında görüşme sürüyor. Alım/satım ödül ve XP kapıları korunuyor, tamamlanan işlem tekrar pazarlık açmıyor. | Kervan yükü ve rota avantajlarının piyasa getirisiyle uzun vadeli denge simülasyonu ayrıca ele alınmalı. |
| Mülk/üretim | Tarla hasadı mevsim ve nadasla değişiyor; değirmen un için 2 buğday tüketiyor, aynı şehirdeki tarla ürünü veya oyuncunun bulunduğu şehirde taşıdığı stoktan besleniyor. Eksik girdi otomatik alınmıyor, hasat artığı oyuncuda kalıyor. Oyuncu çırak alırken dört beceri dalından birini seçiyor; dersler seçilen dala beceri XP'si kazandırıyor ve eski kayıttaki eksik dal güvenle tamamlanıyor. Yıllık mülk defteri gerçek 12 aylık net nakdi, işçi/bekçi/bakım/enflasyonla biriktiriyor; eski eksik veriler korunup yalnız tam yıllar grafiğe giriyor. | İşçi ücretleri, mülk geliri, ürün fiyatı ve üretim darboğazının uzun dönem kârlılığı; ayrıca çıraklığın zaman ve beceri karşılığı birlikte dengelenmeli. |
| Kervan/piyasa | Rota/konak, yağma/kayıp, sigorta ve varış kârı; kıtlık/bolluk ve enflasyon zarları taşındı. | Aylık diğer sistemler hâlâ farklı sonuçlar doğurabilir. Bu alt sistemlerin tekrar testi, bütün `advance` için tekrar garantisi değildir. |
| Savaş | Cephe ve ocak savaşlarının zarları, yaralanma ve sıradan yenilgiden doğan hasım kayda bağlı. Taktik dövüş girişte ayrılan alt akışla ilerliyor; hamleler önceki durumu değiştirmiyor. | Taktik ara durum yalnız ekranda; çıkışta girişin aylık kilidi kalır. Taç seferi ve kan davası gibi kalan savaş bağlantılı sistemlerin RNG geçişi sürmeli. |
| Suç/mahkeme | Gerçek mağdur/tanık, delil, uzlaşma, soruşturmacı, sahte iz ve 3–6 aylık dosya mevcut. İlgili üç test yeniden geçti. | Ortak sonuç/neden dökümü diğer eylemlerle birlikte genişletilecek. |
| Aile/vâris | Gerçek kişi kimliği ve evlat→torun→yeğen→çırak sırası var. Önizleme huy, yatırım, eğitim, seçili soy yeteneği, son söz ve hanedan eserlerinin başlangıç özellik/beceri etkilerini gösteriyor; gerçek devir aynı hesabı kullanıyor. Önceki kimlik/yaş/itibar/servet denetimleri mevcut. | Çok turlu ortak yaşam kararları, tam soy ağacı ve gerçek oyuncu kayıtlarıyla deneme sırada; yeni miras özelliği bu oturumda çalıştırılmadı. |
| NPC/meslek | Hafıza, söylenti, tavır, sohbet, meslek yolu ve hanedan şaheseri kodda mevcut. | Özellik varlığı tam tasarım kabulü değildir; 3–6 turluk konuşma, hoca/silsile ve kararların okunabilirliği geliştirme alanı. |
| Kayıt/yerelleştirme | Yeni GameState alanı gerekmiyor; mevcut RNG formatı korunuyor. Yedekli seri kayıt, göç ve altı dil kontrolleri temiz. | Gerçek Android güncellemesi, uygulamayı kapatma/açma ve kullanıcı kayıtlarıyla kabul testi gerekir. |

## Bu dalganın doğrulaması

- Mobil `tsc --noEmit` temiz; motor dış paket bırakmadan headless paketlendi.
- `rng-yol-ticaret-savas-check.cjs`: **4.370 aynı kayıt/aynı karar karşılaştırması**,
  **52 yol sonucu**, **153 dövüş / 1.810 hamle**. Ortam `Math.random` çağrılırsa test
  hata verir; giriş durumunun değişmemesi, JSON sonrası tekrar, zafer/yenilgi,
  kalkan/fent/çaresizlik, yaralanma, kervan/sigorta ve aylık kilitler denetlenir.
- Test paketinde aylık alt sistemler ayrı çağrılır; üretim dışa aktarımları genişletilmez.
- Mevcut suç RNG, mahkeme ve soruşturma testleri temiz.
- Vâris: 7 küme; kayıt kuyruğu: 13 senaryo / 500 birleştirilmiş hamle, aynı anda en çok 1 depo işlemi.
- Eski v1 kayıt göçü: 51 tur sorunsuz. Göç tekrarında RNG korunuyor.
- i18n/ikon ve dil karışması: 0 sorun. MP protokolünün iki kopyası bayt eş.
- Bu dalgada yerleşim veya metin değişmedi. Gerçek cihaz, küçük ekran, dokunma hissi,
  uzun oturum, denge ve eğlence kabulü için oyuncu/cihaz testi hâlâ gerekli.

## Sonraki öncelikler

1. [x] Aylık ikilem/fırsat kartını ve çözülmemiş kararını kalıcılaştır; yeniden açılışta aynı
   seçenekleri getir, sonucu bir kez uygula. Bu geçişte aylık kart RNG'sini kayda bağla.
2. Kalan yaşam/NPC/sefer zarlarını hedefli dalgalarla taşı; ortak sonuç/neden dökümü ekle.
3. [x] Müzakere fiyatı/sabrı/son sözünü kayda bağla; ekranı kapatıp açınca bedelsiz yeni pazarlık başlamasın.
4. İşçi ücreti, mülk geliri, buğday/un fiyatı ve üretim darboğazını uzun dönem örneklerinde karşılaştır.
5. Kervan rota/yük avantajının uzun vadeli kâr-risk dengesini simüle et.
6. 3–6 turluk aile/NPC sohbeti ve ilişkiye özgü ortak yaşam kararları.
7. Gerçek oyuncu kayıtları, düşük donanımlı Android ve uzun oturum ölçümüyle öncelikleri doğrula.

Yeni özellik sayısı yerine kararı kaybetmeme, nedenini anlama ve anlamlı bedel önceliklidir.
