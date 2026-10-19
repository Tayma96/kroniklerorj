# Kronikler: Küllerin Mirası — Yol Haritası (Yayına Doğru)

> Durum: Çekirdek + tüm ana sistemler taşındı, offline APK/AAB çıkıyor.
> Eksik olan: **his, denge, yazım, sanat ve gerçek cihaz cilası.** Bu belge
> bunları yayına hazır hâle getirmek için. Etiketler: **[BEN]** kod/içerik
> bende, **[SEN]** karar/sanat/cihaz/Play sende, **[BİRLİKTE]** geri bildirim döngüsü.

> **19 Ekim yön güncellemesi:** Kullanıcı önceliği artık yeni hikâye metni değil; işlevsellik,
> sistemler arası bağ ve oynanış derinliği. Özellik geliştirmede güncel sıra
> [`docs/OYNANIS_DERINLIGI.md`](docs/OYNANIS_DERINLIGI.md); aşağıdaki yazım/sanat/yayın
> kontrol listesi bu yeni önceliğin yerine geçmez.

---

## 0. Çalışma Düzeni
- **Döngü:** Sen telefonda oynarsın → bug/his notunu atarsın → ben düzeltir, derinleştiririm → yeni APK.
- Ben RN'i **gözle göremiyorum**; bu yüzden görsel/akış kararlarında senin geri bildirimin kritik.
- Her değişiklik `tsc` + bundle ile doğrulanır; haftada birkaç test APK + sürüm dönümlerinde AAB.

---

## 1. HİS (Game Feel) — "elime iyi geliyor" hissi
**Hedef:** Her dokunuş tatmin etsin; geçişler yumuşak, anlar akılda kalsın.

- [x] **[BİLİNDE]** Geçiş animasyonları: ekranlar arası fade/slide, kart açılışları (react-native-reanimated). **[BEN]** — *10 Eki 2026 denetimi: `lib/motion.ts` ortak süre/eğri; Stack `slide_from_right`; reanimated 13+ ekranda. Cihazda his onayı §1 Kabul'de.*
- [x] **Dokunsal geri bildirim (haptics):** önemli aksiyonlarda hafif titreşim (expo-haptics). **[BEN]** — *`lib/haptics.ts` + `hap()` 27 dosyada; Ayarlar'da kapatılabilir.*
- [x] **Ay ilerletme ritmi:** "Ayı İlerle"de kısa bir geçiş/parşömen efekti, olayların sırayla belirmesi. **[BEN]** — *olay kartları `FadeInDown.delay(i*30)` ile sırayla gelir (`app/oyun/index.tsx`); yıl dönümü karnesi ayrı.*
- [x] **Dönüm noktası perdeleri:** şu an sade; küçük ışıltı/ses ile daha "olay" hissi. **[BEN]** — *`MilestoneModal` (`lib/ui.tsx`) yaylı ZoomIn + altın çerçeve; şenlik/divan anlarında çan (`playChime`, ses açıksa).*
- [ ] **Boşluk/tipografi cilası:** başlık hiyerarşisi, satır araları, kenar boşlukları — cihazda göz kontrolü. **[BİRLİKTE]** — *cihaz gerektirir (kod tarafında yapılacak bir şey kalmadı; göz kontrolü bekliyor).*
- [ ] **Yükleniş & splash:** açılışta tema rengiyle akıcı giriş (splash eklendi, cihazda doğrula). **[SEN test]** — *`expo-splash-screen` app.json'da tanımlı; cihaz doğrulaması bekliyor.*
- **Kabul:** 5 dk oynayınca "akıcı ve özenli" hissi; kör nokta/sarsıntı yok.

---

## 2. DENGE (Balance) — adil ve sürükleyici
**Hedef:** Ne çok kolay ne sinir bozucu; her yol (zanaat/savaş/ticaret/gölge) uygulanabilir.

Mevcut sayılar (ayar yapılacak yerler — `mobile/lib/game.ts`):
- Beceri: 100 XP = 1 seviye; aksiyon başına 5–14 XP.
- Çalışma kazancı: `base + stat*2 + rnd(6)` × unvan × hüner çarpanı.
- Ölüm: 55+ artan risk; açlık 20 altı sağlık −6/ay.
- Savaş: güç farkı × 0.05 başarı; encounter güç 6–18.

- [ ] **[SEN→BEN]** 3–4 nesil oynayıp not al: "çok hızlı zenginleştim / sürekli açım / savaş çok kolay/zor / ilerleme yavaş". **[BİRLİKTE]** — *insan oyun testi gerekir.*
- [x] Erken oyun eğrisi: 13–20 yaş geçim sürdürülebilir mi? **[BEN]** — *`scripts/_smoke/ekonomi.cjs` (80 hayat/tür): 13–20 yaşta kesesi dibe vuran %0; 20 yaşında kese+emanet medyanı pasif ~935, etkin ~1.4k, usta ~1.65k.*
- [ ] Ekonomi: kasaba-bazlı fiyat + kıtlık/bolluk + kervan kârı dengeli mi (sömürü açığı var mı)? **[BEN]** — *şehirler arası arz-talep arbitrajı ve kervan yolculuğu mevcut; eksik parça oyuncunun yükü/hedefi seçememesi ve fiyat farkını yola çıkmadan görememesi. İlk oynanış dilimi bunu kapatıyor.*
- [ ] Savaş zorluğu: encounter güçleri ve yaralanma oranı; nemesis adil mi? **[BEN]** — *duman testi çökme olmadığını gösterir ama zorluk ölçümü yok; oyun testi notu ile ayarlanmalı.*
- [ ] Beceri/perk hızı: bir ömürde kaç perk açılıyor (hedef ~6–9)? **[BEN]** — *ölçüldü (ekonomi.cjs): yalnız çalışan oyuncu ömür sonunda 3, kart kararı veren 4 hüner kademesi hak ediyor. Bu politikalar talim/okuma yapmıyor; gerçek oyuncu sayısı cihaz testinden alınmalı, hedefin altındaysa XP artırılır.*
- [ ] Ömür temposu: bir nesil kaç "Ayı İlerle"de bitiyor (hedef: tatmin edici ama sürünmeyen)? **[BEN]** — *ölçüldü (oynanis.cjs, 60 hayat): medyan 708 ay / 657 karar, boş ay %15, bunalma %0.2, ölüm yaşı medyan 66. "Sürünüyor mu" kararı insan testine kalır.*
- **Kabul:** Farklı meslek/yol seçimleri kazançlı; ölüm hak edilmiş hissi; "bir ay daha" dedirten ilerleme.

---

## 3. YAZIM (Writing) — oyunun ruhu
**Hedef:** Türkçe akıcı, döneme (1247) yakışır; tekrar az, his yüksek. (Cihaz gerekmez, hemen başlanabilir.)

- [x] **Olay metni çeşitliliği:** aylık flavor, ikilemler, hikâye yayları — varyant sayısını artır (tekrar hissini kır). **[BEN]** — *oynanis.cjs: önemli satırların yalnız %5.7'si son iki yılda aynen tekrar; olay-metin.cjs 69.810 yazımda 0 sorun.*
- [ ] **Roman (Hayatın Romanı):** olayları kuru cümle yerine **anlatısal** birleştir; bölüm geçişleri, kapanış künyesi zenginleştir. **[BEN]** — *`app/oyun/roman.tsx` yaş bantlı bölümler + paylaşım kartı var; anlatı kalitesi için okuma onayı (§3 ton kararı) bekliyor.*
- [x] **NPC diyalogu:** kişilik+ruh haline göre replik havuzunu genişlet; hafızaya gönderme ("geçen sefer..."). **[BEN]** — *10 Eki: `derinlikKatmani` (`lib/dialogue.ts`) — önceki konunun takibi, kapanan kişiye ısrarla açılma, oyuncunun mesleği/şanı/korkusunu fark etme, kişilik ağzı, can dostu/hasım hoşbeşi, mevsim açılışı; 37 yeni anahtar × 6 dil + 33 dişil varyant; bekçi: `scripts/_smoke/diyalog.cjs`.*
- [ ] **Dönem dili:** unvanlar, deyimler, mevsim/şehir betimleri — sözlük tutarlılığı. **[BEN]** — *otomatik bekçi var (`dil-karisma.cjs`: 6 dilde karışma 0); sözlük tutarlılığı insan okuması ister.*
- [ ] **Onboarding/öğretici:** ilk 2 ayda nazik ipuçları (zorla değil). **[BEN]** — *kısmen: ilk oyunda tek seferlik `TutorialModal`, boş panoda `dash.emptyHint`, iş tarzı ipuçları. İlk iki aya yayılan bağlamsal ipucu yok; cihazda kafa karıştıran yer notu gelince eklenmeli.*
- [ ] **[SEN]** Ton kararı: ne kadar ağır/edebî vs sade? Birkaç örnek metin onayın. **[BİRLİKTE]**
- **Kabul:** 20 dk oynayınca metin tekrarları rahatsız etmiyor; roman okunası.

---

## 4. SANAT (Art) — görsel kimlik
**Hedef:** Kül & Köz estetiği; portreler/sahneler/ikonlar tutarlı ve güzel.

Mevcut: 14 portre (yaş×cinsiyet), 16 hero sahnesi (yaş×mevsim), 54 game-icon (altın vektör), yeni-oyun arkaplanı.

- [ ] **[SEN]** Portre derinliği kararı: mesleğe/loncaya/statüye göre varyant ister miyiz? (üretimi sen/araç ile) **[BİRLİKTE]**
- [ ] **Hero sahneleri:** önemli anlara özel (evlilik, savaş zaferi, ölüm, taht) görseller. **[SEN üretim → BEN bağlama]**
- [ ] **Lonca armaları / hanedan mühürleri:** 5 lonca + hanedanlar için amblem. **[SEN/araç → BEN]**
- [ ] **Eşya ikonları:** 24 eşya için tutarlı küçük ikon seti (şu an emoji+vektör karışık). **[BEN vektör / SEN özel]** — *emoji kalmadı, eşyalar ortak game-icons vektörlerini kullanıyor (`i18n-icon-check` ad geçerliliğini denetler); eşyaya özel set sanat kararı.*
- [ ] **Harita görseli:** şu an düğüm yerleşimi; elle çizilmiş parşömen harita zemini. **[SEN → BEN bağlama]**
- [x] **Tutarlılık geçişi:** tüm ekranlarda emoji→game-icon birliği. **[BEN]** — *10 Eki taraması: `app/`+`lib/` arayüz kodunda renkli emoji yok; kalan tipografik işaretlerden Android'de emojiye dönebilen ⚠ ⚑ ♂ ♀ metin sunumuna (U+FE0E) sabitlendi.*
- **Kabul:** Ekranlar arası görsel dil bir bütün; "amatör" hissi yok.

---

## 5. CİHAZ CİLASI & TEKNİK (Device Polish / QA)
**Hedef:** Her telefonda sağlam, hızlı, kayıpsız.

- [ ] **[SEN]** Çok cihaz testi: küçük/büyük ekran, çentik, geri-tuşu davranışı. **[SEN→BEN]**
- [ ] **Uzun kayıt performansı:** çok nesil + uzun geçmiş (history 250 ile sınırlı, NPC 30) — takılma var mı? **[BİRLİKTE]** — *masaüstü ölçümü (4 varis, 2.737 ay): ay başına ort. 5 ms, en uzun 46 ms; kayıt 248 KB, JSON okuma 2.4 ms. Telefon 5–10 kat yavaş varsayılsa bile akıcı; gerçek cihaz onayı bekliyor.*
- [x] **Kayıt sağlamlığı:** sürüm güncellemesinde eski kayıt açılıyor mu (migration test). **[SEN test]** — *`scripts/_smoke/migrate-check.cjs` + `eski-kayit-v1.json` her APK/AAB derlemesinden önce koşar ("ESKİ KAYIT GÖÇÜ OK"). Cihazda güncelleme-üstüne-kurulum denemesi yine önerilir.*
- [ ] **Ses kalitesi:** sentetik tık/çan hoş mu, yoksa gerçek asset mi koyalım? **[BİRLİKTE]**
- [ ] **İkon/splash cihazda:** ana ekran ikonu ve açılış doğru mu. **[SEN test]**
- [ ] **Erişilebilirlik:** font ölçeği, kontrast, dokunma hedef boyutları. **[BEN]** — *kısmen: sistem yazı ölçeği 1.25'e kadar izlenir (`app/_layout.tsx`), hareket azaltma/performans anahtarı var. Kontrast: 10 Eki'de en çok kullanılan soluk metin jetonu `parchmentMuted` (477 kullanım) kart zemininde 3.42:1'den 4.78:1'e (WCAG AA) çıkarıldı; `goldDim` 3.5:1 ve `ink` 3.1:1 yalnız süs/ikon için uygun, küçük metinde kullanılmamalı. Dokunma hedefleri cihazda ölçülmeli.*
- **Kabul:** Çökme yok; 3+ nesil akıcı; güncelleme kaydı bozmuyor.

---

## 6. YAYIN (Release) — `mobile/YAYIN.md` ile birlikte
- [ ] **[SEN]** Google Play Developer hesabı (25$), uygulama imzalama.
- [ ] **[SEN/BİRLİKTE]** Mağaza metinleri (başlık, açıklama, kategori, içerik derecesi).
- [ ] **[SEN]** Ekran görüntüleri + öne çıkan görsel (oyunu oynayıp al).
- [ ] **[SEN]** Gizlilik politikası URL (oyun veri toplamıyor → basit). — *metin hazır (`mobile/store/GIZLILIK.md`) ama depo özel: herkese açık bir adres (GitHub Pages / itch / kendi alan adı) ve açık iletişim e-postası gerekiyor.*
- [ ] **[BİRLİKTE]** Play "internal testing" ile kapalı beta → geri bildirim turu.
- [ ] **AAB:** `eas build --profile production` (versionCode `mobile/app.json`dan; bkz. mobile/YAYIN.md "Sürüm numarası"). — *iş akışı hazır (kalite kapısı + secret'tan imza); KEYSTORE_* secret'larının girilmesi ve ilk derlemenin elle tetiklenmesi sende.*

---

## 7. ZAMAN ÇİZELGESİ (~4 hafta)
| Hafta | Odak | Çıktı |
|------|------|-------|
| **1** | Denge + His + cihaz QA (senin ilk oynayışın) | Oynanış akıcı, dengeli; ilk bug turu kapandı |
| **2** | Yazım derinliği (metin/roman/diyalog/onboarding) | Tekrar azaldı, anlatı güçlendi, öğretici var |
| **3** | Sanat (portre/sahne/arma/ikon/harita) + ses | Görsel-işitsel kimlik bütünleşti |
| **4** | Çok-cihaz QA + performans + mağaza + kapalı beta | Play internal testing'de yayında |

---

## 8. HEMEN (oynanış derinliği)
1. **[x] [BEN]** Pazar kervanında oyuncuya yük/şehir seçimi ve şehirler arası fiyat farkı gösterimi eklendi.
2. **[x] [BEN]** Atölye mesleğini şehir ekonomisine bağlayan sipariş döngüsü eklendi: üç yerel talep, görünür ücret, sipariş şehrinde üretim koşulu, vadesiz kabul, iptal, ayda bir teslim ve halk/lonca itibarı tercihi. **Sıradaki:** çıraklık, meslek uzmanlığı ve mülk üretim zincirini oyuncu kararlarına bağla; ardından NPC-aile ve şehir-güç bağlantıları.
3. **[BİRLİKTE]** Gerçek cihaz/oyun hissi gerektiren denge ve okunabilirlik kararlarını kullanıcının oyun gözlemleri geldikçe plana işle.

> Not: Bu belge yaşar; her hafta güncellenir. "Bir an önce" için en hızlı yol — senin oynayış notların + benim paralel yazım/denge çalışmam.
