# Sayfa denetimi — derinlik ve görselleştirme (28 Ekim 2026)

Yöntem: tek oyunculu 33 sayfanın her biri için kodda çağrılan motor eylemleri, bölümleri,
bağlantıları ve oyuncuya görünen Türkçe metinleri otomatik çıkarıldı; ardından sayfa sayfa incelendi.
"Derinlik" = mevcut sistemlere bağlanan, sonucu farklı gerçek bir karar. "Görsel" = metni
oynanabilir bir sahneye çeviren fırsat (2.5D Skia ya da 3D).

## Genel bulgular

1. **Oyun sistem olarak derin, sunum olarak metin.** Dövüşte niyet sezme, nefes ve
   "üstünlük 3/3 → bitiriş" zaten var; suçta keşif, kovalamaca sahnesi, kadı duruşması var;
   hanedanda vasiyet, taht, divan, sefer, yerleşim, entrika var. Eksik olan çoğu yerde
   mekanik değil, bu mekaniklerin **görülmesi ve hissedilmesi**.
2. **Bazı sayfalar fazla yüklü.** `hanedan` (63 KB, 14 bölüm), `npc` (44 KB), `pazar` (40 KB),
   `karakter` (60 KB) tek uzun kaydırmalı listeler. Alt sekmelere bölünmeli.
3. **Kaybolan işlevler.** Ana sayfadaki Önemli/Günlük/Dünya süzgeci tasarım değişikliğinde
   kaybolmuştu → Yaşam Defteri'ne taşındı (bu turda yapıldı). Yemek yeme düğmesi de kaybolmuştu
   (önceki turda Sofra ile düzeltildi).
4. **Ay sonu nedeni görünmüyor.** Ay ilerleyince akçe/nam/ilişki neden değişti, tek bakışta
   gösterilmiyor (yalnız yıllık karne var). Tasarım pusulası "sonuç her zaman nedenini söyler" diyor.
5. **Denge:** rastgele oynayan bot 40 yaşında nam 100'e ulaşıyor; nam eğrisi gözden geçirilmeli.
6. **"İbre" mini oyunu** (fırsat kartında gezen işaretçiyi durdurma) tekrarlı ve beceriyle ilgisiz.

## Sayfa sayfa

| Sayfa | Şu an | Eklenecek derinlik | Görsel / 3D fırsatı | Öncelik |
|---|---|---|---|---|
| Ana sayfa | Karar, uyarı, son gelişmeler | **Ay sonu özeti**: akçe ±, nam ±, ilişki ± ve nedeni (tek şerit) | Sahne mevsim/yaşla değişiyor | Yüksek |
| Karakter | Özellik dağıtımı, kuşam, aile bakımı, hekim, hamam, emek | **Hayat hedefi** seç (usta, vali, tüccar, âlim): yol üstündeki adımlar ve ilerleme | Kuşamın figürde görünmesi (sonra, model gerekir) | Orta |
| Beceri Ağacı | Dal ve hüner seçimi | Hüner seçimi zaten karar; değişiklik gerekmez | Ağaç görseli var | Düşük |
| Meslek | Peştamal sınavı, rakip usta, çırak, şaheser | Gelir geçmişi (son 12 ay) ve mesleğin şehre göre kârlılığı | Lonca bayrak yarışı sahnesi | Orta |
| Atölye | Üret + kasaba siparişi | **Üretim tarzı**: acele / özenli / usta işi — süre, malzeme ve kalite takası | Örs ve kıvılcım animasyonu | Orta |
| Pazar | Al-sat, pazarlık, kervan, sarraf, kiler, zekât | Mal başına fiyat geçmişi; haberlerdeki fiyat ipucundan doğrudan işleme | Tezgâh sahnesi, pazarlıkta satıcı portresi | Orta |
| Mülkler | Satın al, büyüt, işçi, bekçi, kiracı, nadas, kâhya | Mülke özgü küçük olaylar (kiracı şikâyeti, hasat kararı) | **İzometrik çiftlik/arsa görünümü**: alınan her mülk sahnede belirir | Yüksek |
| Mektep | Ders, sınav, kulüp, hoca | Sınavı tek tıktan çıkarıp 3 soruluk kısa seçim (özelliğe bağlı şans) | Ders amblemleri var | Düşük |
| Örgütler | Görev, katılım, güç kullanma, saray, sancak | Rütbe basamakları ve sıradaki rütbenin şartı tek yerde | Lonca sancak haritası | Orta |
| Gölge İşleri | Keşif, 4 suç, kovalamaca, kadı, zar meclisi, soruşturma | Mekanik yeterli | **Zar meclisi: fiziksel zar atma animasyonu**, kovalamaca sahnesi | Orta |
| Savaş | Duruş, hamle, niyet sezme, nefes, üstünlük, muhafız, hasım, talim | Mekanik var; ordu cephesi tek düğme — **meydan muharebesi** (hazırlık, emir kartları, sahte ricat) | **Dövüş arenası eklendi** (Karagöz perdesi, iki tasvir); meydan muharebesi sırada | Yüksek |
| Hanedan | Vasiyet, taht, divan, sefer, vali, yerleşim, görkem, entrika, kan davası | **Sekmelere bölündü** (Soy · Taht · Servet · Hanedanlar) | **Soy ağacı görünümü** | Orta |
| Nesil & Vâris | Vâris seçimi, yatırım, çeyiz, gözde, eğitim | Vâris kartlarında özellik karşılaştırması yan yana | Kart çevirme animasyonu | Orta |
| NPC profili | Sohbet, hediye, hedef yardımı/istismarı, çırak, flört, evlilik, dedikodu, helallik, hafıza | **Sohbet sahnesi yapıldı**: söz perdesi, iki sütun konu, eylem madalyonları; her eylemin açıklaması, bedeli ve şansı alttan açılan panelde, sonucu kişinin sözü olarak | Portreli diyalog sahnesi | Yapıldı |
| İlişkiler | Yakın çember ve tanışlar listesi | Kişiye göre süzgeç (aile, dost, hasım); kim kimi tanıyor | **İlişki ağı görseli** (çember) | Orta |
| Mahalle | Kim nerede, akşam sofrası, kasabanın gözü | Mekâna uğrayınca orada kimin olduğuna göre farklı karşılaşma | **Mahalle haritası**: cami, çarşı, han; kişiler pin olarak | Yüksek |
| Mevki & İtibar | İtibar/şeref/korku/şöhret, söylentiler, mevki | Söylentiye karşılık sonuçlarını önceden göster | Söylentinin yayıldığı kişiler zinciri | Düşük |
| Çöpçatan | Yaş/servete göre talip | Talibin huyu ve ailesiyle karşılaştırma | — | Düşük |
| Şehir | Durum, mekânlar, künye, iltizam | Yapılan bayındırlık eserleri sahnede görünsün | Şehir görünümü değişsin | Orta |
| Diyar (şehir künyesi) | Vergi, ferman, bayındırlık, valilik, yolculuk, at | Mekanik yeterli | — | Düşük |
| Harita | Beylikler, yerleşimler, git | Yolculuğun kendisi: rota, konak, yol olayı seçimi | **Yolda ilerleyen kervan animasyonu** | Orta |
| Diyar Haberleri | Fiyat ipuçları, dedikodu (yalnız okuma) | Haberden doğrudan eyleme: "ucuz şehre git", "pazara git" | — | Orta |
| Açık İşler | Bekleyen işlerin listesi | İlerleme çubuklu görev defteri | — | Düşük |
| Hikâyeler | Yay başlat/sürdür | Mekanik yeterli | — | Düşük |
| Başarımlar | Liste | Kazanılan başarımı lakap olarak seçebilme (yalnız görünüş) | — | Düşük |
| Divan | Günün davası (etkisiz, paylaşım) | Bilerek etkisiz; değişiklik gerekmez | — | — |
| Yaşam Defteri | Tam geçmiş, sinema modu | **Süzgeç eklendi** (Önemli/Günlük/Dünya); kişi araması | Sayfa çevirme | Yapıldı |
| Hayat Romanı, Kronik, Ocak | Kayıt ve devir | Mekanik yeterli | — | — |
| Yeni Oyun | Ad, cinsiyet, huy, doğduğun ocak | **Doğduğun ocak eklendi** (köylü, esnaf, hekim, sipahi): farklı başlangıç akçesi, beceri, babanın mesleği | Prolog sahnesi var | Yapıldı |
| Ayarlar, SSS, Emeği Geçenler | — | — | — | — |

## 3D ve canlandırma

| Fırsat | Önerilen teknik | Gerekenler | Değer |
|---|---|---|---|
| Dövüş arenası | Skia 2.5D: iki figür katmanı, niyet simgesi, kıvılcım, sarsıntı | Figür kareleri (duruş, hamle, savuşturma, yaralı) | Çok yüksek |
| Meydan muharebesi | Skia: kuşbakışı alan, birlik blokları, ok yağmuru | Birlik simgeleri, arazi dokusu | Yüksek |
| Zar meclisi | Reanimated ile sözde-3D zar dönüşü | Zar yüzleri (kodla çizilebilir) | Orta, ucuz |
| Mülk / mahalle | İzometrik 2.5D sahne | İzometrik bina görselleri | Yüksek |
| Harita yolculuğu | Skia rota animasyonu | Mevcut harita yeter | Orta |
| Gerçek 3D (karakter, şehir) | three.js + expo-gl ya da react-native-filament | Yeni yerel modül, yeni APK, Selçuklu temalı GLB modeller | Yayından sonra |

Öneri: iki haftada gerçek 3D yerine Skia ile 2.5D canlandırma. Skia zaten kurulu, yeni yerel
modül ve APK gerektirmez, düşük donanımda akıcıdır. Gerçek 3D modeller hazırlandığında tek bir
vitrin sahnesinde ayrı dalda denenir.

## Uygulama sırası (öneri)

1. Ay sonu özeti şeridi (ana sayfa) — sebep görünürlüğü.
2. Fırsat kartındaki ibre oyununu seçimli kısa sahneyle değiştir.
3. Hanedan sayfasını alt sekmelere böl; soy ağacı görünümü.
4. Dövüş arenası (Skia) — mevcut dövüş motoru üstüne görsel katman.
5. Doğduğun hane seçimi (yeni oyun).
6. NPC sohbet sahnesi; mahalle haritası; meydan muharebesi.
