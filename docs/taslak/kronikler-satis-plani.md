# Kronikler — 7 Günde ~500 $ Planı (Araştırma Raporu)

*Hazırlanma: 10 Ekim 2026. Yalnızca araştırma ve taslak: hiçbir şey yayınlanmadı, hiçbir hesap açılmadı, kimseyle iletişime geçilmedi. Repo salt-okunur incelendi. "Tahmin" diye işaretli rakamlar benim değerlendirmem, kaynaklı veri değil.*

## 0. Kısa sonuç

- **7 günde 500 $ "kazanılmış" olabilir ama "elde" olması zor.** itch.io'dan gelen para (Türkiye'den Payoneer ile) satıştan sonra 7 gün bekletiliyor, ardından payout incelemesi ~10–14 gün sürüyor. Google Play'de yeni kişisel hesapla 7 günde yayına çıkmak **imkânsız** (14 günlük kapalı test kuralı).
- 500 $'a ulaşma şansı en yüksek kanal: **kaynak kod / IP'nin bir alıcıya gizli satışı ya da lisanslanması**. itch PWYW + bağışlar gerçekçi olarak birkaç on dolar getirir.
- Benim tahminim: 7 günde **anlaşma imzalanıp 500 $+ ödeme alınma ihtimali düşük (~%10–20)**. 2–4 haftalık süreyle ihtimal belirgin şekilde artar.
- **Satıştan önceki kritik engel:** eski kopya `Tayma67/Kronikler` hâlâ **public** (GitHub API: `private: false`, son push 7 Ekim 2026, lisans dosyası yok). Kodun neredeyse tamamı oradan okunabiliyor. Bu kopya gizlenene kadar "münhasır kaynak kod" satmak güvenilir olmaz. Yeni repo `Tayma96/kroniklerorj` dışarıdan 404 veriyor, yani gizli.

## 1. Oyun ve repo hakkında özet

- **Ne:** *Kronikler: Küllerin Mirası*. 1247 Anadolu'sunda geçen, nesiller boyu süren bir **hanedan yaşam simülasyonu**. Çocukluk, mektep, 15 meslek, 5 lonca, evlilik ve çocuklar, hatırlayan NPC'ler, rakip hanedanlar, kan davası, divan/arzuhal ve "Kül Yemini" ana destanı var. Ölünce oyun vârisle sürüyor. Oyun tamamen çevrimdışı, reklamsız ve satın alımsız, 6 dil destekliyor (TR/EN/ES/PT/AR/RU). Mağaza paketinde yaş sınıfı PEGI 16 seçilmiş. Kaynaklar: `mobile/MAGAZA.md`, `mobile/BASIN-KITI.md`, GDD v7/v8.
- **Teknik:** Expo SDK 56 / React Native 0.85, paket adı `com.kronikler.app`. Mobil tarafta yaklaşık 30 bin satır TS/TSX, eski backend'de ~37 bin satır Python (eski web sürümü), ayrıca ~1,4 bin satırlık çok oyunculu sunucu (`server/`) var. 300 hayatlık otomatik smoke testi ve oyuncu-bot simülasyonları mevcut.
- **Geçmiş:** 1.356 commit (7 Haziran → 7 Ekim 2026). `git shortlog` sayımına göre **1.301 commit "Claude", 55 commit "Tayma67"** imzalı. Yani kod büyük ölçüde bir yapay zekâ kodlama ajanınca yazılmış (brifte geçen ~1.214 sayısından daha yüksek).
- **Build:** `dist/Kronikler.apk` Temmuz tarihli eski bir build ve 3–7 Ekim commit'lerini içermiyor. `YAYIN.md`'ye göre GitHub Actions APK'ları **debug anahtarıyla** imzalanıyor. Bu Play Store için uygun değil. `eas.json`'da `production` profili AAB üretecek şekilde hazır.

### Lisans / varlık denetimi (satışı doğrudan etkiliyor)

| Varlık | Kaynak | Durum |
|---|---|---|
| Meslek/arayüz ikonları | game-icons.net, **CC BY 3.0** (`frontend/CREDITS.md`, `mobile/lib/icon-paths.ts`) | Ticari kullanım serbest, ama **atıf zorunlu**. Mobil uygulamada görünür bir atıf/künye ekranı bulamadım. Yayından önce eklenmeli. |
| Fontlar | Cinzel, Crimson Text (`@expo-google-fonts`) | Google Fonts / SIL OFL. Oyunda kullanılabilir. Fontlar ayrı olarak satılamaz. |
| Portre/hero/arma görselleri (~41 dosya) | Yerel **SD-Turbo** ile üretilmiş (`PROJE_DURUMU.md`) | SD-Turbo, [Stability AI Community License](https://huggingface.co/stabilityai/sd-turbo/blob/main/LICENSE.md) kapsamında. Yıllık geliri 1 M $ altında olanlar için ticari kullanım serbest, ancak **Stability'ye kayıt** şartı var. Yapay zekâ çıktısının telif koruması belirsiz, bu yüzden alıcıya "münhasır sanat" diye satılamaz. |
| Ses/müzik | Sentezle üretilmiş (sürüm notlarında "tel sentezi") | Özgün görünüyor. Doğrulanmalı. |
| `mobile/LICENSE` | Expo şablonunun MIT lisansı (telif: 650 Industries) | **Yanıltıcı.** Oyunun kendi lisans dosyası yok. Satıştan önce düzeltilmeli. |
| Kodun telif durumu | Kodun ~%96'sı yapay zekâ ajanı commit'i | ABD Telif Ofisi'ne göre insan katkısı olmayan yapay zekâ çıktısı korunmuyor ([Copyrightability raporu, 2025](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf)). Türkiye'de durum belirsiz, hukukçuya danışılmalı. Bu belirsizlik IP değerini düşürür. Tasarım belgeleri (GDD), yönlendirme ve metin seçimleri insan katkısı olarak öne çıkarılabilir. |

## 2. Para kanalları: hız ve 7 güne uygunluk

| Kanal | Maliyet / kesinti | İlk paraya süre | 7 güne uygun mu? |
|---|---|---|---|
| **itch.io PWYW (Android APK)** | Ücretsiz. Varsayılan pay %10 (0–%100 arası ayarlanabilir), artı ödeme işlemcisi ücreti (~%2,9 + 0,30 $) ([itch ödemeleri](https://itch.io/docs/creators/payments)) | Sayfa aynı gün açılabilir. "Collected by itch.io" modunda gelir 7 gün bekletiliyor, payout insan incelemesinden geçip **~14 gün** sürebiliyor ([itch forum](https://itch.io/t/3492918/why-is-my-payout-delayed-on-itchio-and-how-does-tax-information-affect-it)) | Satış evet, elde para **hayır**. "Direct to you" modu PayPal/Stripe istiyor ve ikisi de Türkiye'de yok. Türk kullanıcı için yol **Payoneer** ([itch duyurusu](https://itch.io/t/654159/payoneer-payout-destination-now-available-for-all-accounts), [TR örneği](https://itch.io/t/1961278/im-from-turkey-how-can-get-payment)). |
| **Google Play** | 25 $ tek seferlik. Kimlik doğrulaması 5 güne kadar sürebiliyor ([Play yardım](https://support.google.com/googleplay/android-developer/answer/13628312)) | 13 Kasım 2023'ten sonra açılan kişisel hesaplar **12+ testçiyle 14 gün kesintisiz kapalı test** yapmak zorunda. Kural güncel ([Play yardım](https://support.google.com/googleplay/android-developer/answer/14151465)). Üretim erişimi incelemesi genelde ≤7 gün. Gerçekçi süre 3–4 hafta ([IndieAppCircle](https://www.indieappcircle.com/blog/google-play-12-testers-14-days-requirement)) | **Hayır.** Uzun vadeli. Oyun zaten ücretsiz/IAP'siz, yani Play tek başına gelir getirmez. |
| **Kaynak kod / IP satışı (özel alıcı)** | Komisyon yok. Escrow kullanılırsa ücreti var | Pazarlığa bağlı, günler ile haftalar arası | **Tek gerçekçi 500 $ yolu**, ama kapanış riski yüksek. |
| **Acquire.com** | — | Gelirsiz projeleri yalnız SaaS/AI ise ve <25 bin $ ise kabul ediyor ([Acquire](https://help.acquire.com/what-pre-revenue-businesses-are-allowed)) | **Hayır.** Gelirsiz bir oyun kabul edilmez. |
| **Flippa** | İlan ücreti var (tutar doğrulanmadı) | Gelirsiz oyun ilanları var ama alıcı bulmak haftalar sürer | Zayıf. Fiyat keşfi için faydalı. |
| **SideProjectors** | — | Gelirsiz oyun ilanları burada da var (aşağıdaki emsallere bakın) | Zayıf/orta. |
| **itch.io "source code" ürünü** (münhasır olmayan) | itch payı | Satış aynı hafta olabilir, para 3 hafta sonra gelir | Münhasır IP satışıyla **çelişir**. İkisinden biri seçilmeli. |
| **CodeCanyon / SellMyApp** | Şablon fiyatları 12–64 $ ([CodeCanyon örnekleri](https://codecanyon.net/item/neon-nexus-galactic-tycoon-complete-idle-game-source-code-react-typescript-admob/61083093)) | İnceleme günler ile haftalar sürer | **Hayır.** |
| **r/gameDevClassifieds** | Ücretsiz | Kurallar asıl olarak işe alım için. Bitmiş oyun **satın almak isteyen** `[PAID]` alıcı ilanları da var ([örnek](https://www.reddit.com/r/gameDevClassifieds/comments/1rcilny/paid_licensing_or_buying_your_fully_playable/)) | Satış ilanı vermek yerine **alıcı ilanlarını taramak** daha uygun. |
| **r/INAT** | Ücretsiz | Ekip arkadaşı bulma yeri, satış yeri değil | Hayır. |
| **Ko-fi** | Bağışta %0 ([Ko-fi](https://ko-fi.com/pricing)) | Anında, ama para PayPal/Stripe'a gidiyor | Türkiye'den **pratikte hayır**. |
| **Patreon** | Yeni yaratıcılar için %10 + işlem ücreti ([Patreon](https://support.patreon.com/hc/en-gb/articles/22581195376909-Creator-fees-FAQs)) | Aylık döngüyle çalışıyor, kitle gerektiriyor | Hayır. |
| **Kickstarter** | Kampanya bittikten sonra 14 gün, ardından 3–14 iş günü daha ([Kickstarter](https://help.kickstarter.com/hc/en-us/articles/360010120934-If-my-project-is-successfully-funded-how-do-I-receive-my-funds)). Türkiye'nin yaratıcı ülkesi olarak desteklenip desteklenmediği doğrulanmalı | 1 ay+ | **Hayır.** |
| **Türk kanalları:** [Technopat Oyun Programlama](https://www.technopat.net/sosyal/bolum/oyun-programlama.324/), [ÜNOG](https://unog.dev/) (6 bin+ üye), DEV.TURK, Turkish Game Dev Collective | Ücretsiz | Hızlı geri bildirim verir, alıcı bulma ihtimali düşük ama sıfır değil | Görünürlük ve alıcı keşfi için evet. |
| **Yayıncılar** | Gelir paylaşımı | Haftalar ile aylar | Hayır, uzun vadeli. |

## 3. Değer tahmini

### 3a. Oyun ürünü olarak (itch, kitlesiz yeni geliştirici)

- itch anketinde (169 geliştirici) ömür boyu görüntülenme **medyanı 1.582**. Çoğu oyun ilk aydan sonra neredeyse hiç trafik almıyor ([How To Market A Game](https://howtomarketagame.com/2025/05/12/benchmark-itch-io-traffic/)).
- Pretendo örneği: 4 ayda 11 oyunla toplam 303,50 $ gelir. PWYW indirenlerin ~%5'i ödeme yapmış, ortalama ödeme 2,74 $ ([Pretendo](https://pretendo.games/2020/01/03/pretendos-first-4-months-self-publishing-on-itch-io/)).
- Steam'de 113 bin satan bir oyun itch'te yalnızca 414 satış / 706 $ yapmış ([Skydome](https://skydome.itch.io/thehive/devlog/1142956/itchio-sales-reality-check-and-why-it-doesnt-mean-your-game-is-bad)). Şanslı bir istisna 5 haftada 6.555 $ kazanmış ([r/gamedev](https://www.reddit.com/r/gamedev/comments/snlw8r/itchio_can_be_a_decent_source_of_revenue_but_only/)).
- **Tahmin, ilk hafta:** 200–1.500 görüntülenme, 20–150 indirme, **0–60 $** brüt. Türk topluluklarında iyi karşılanırsa iyimser senaryo **100–200 $**. 500 $ itch'ten gelmez.

### 3b. Kaynak kod + tam IP devri (bkz. Ek A)

## 4. Gerekli adımlar (kontrol listesi)

**Hesaplar ve ödeme**
- [ ] itch.io hesabı → Seller settings → **"Collected by itch.io, paid later"** modu → Payouts → **Payoneer** bağlanır. Vergi formu (W-8BEN) doldurulur. ABD stopajı uygulanabilir ([itch](https://itch.io/docs/creators/payments)). Payoneer onayı 1–3 gün sürebilir (tahmin).
- [ ] PayPal 2016'dan beri Türkiye'de çalışmıyor, Stripe da Türkiye'yi desteklemiyor (doğrulanmalı). Bu yüzden Ko-fi ve "Direct to you" kullanılamaz.
- [ ] IP satışında ödeme: alıcıdan Payoneer veya SWIFT ile banka havalesi. Escrow.com'un TR desteği **doğrulanmalı**.

**Google Play (uzun vade)**
- [ ] 25 $'lık kişisel hesap + kimlik doğrulaması (≤5 gün) → kapalı test (12+ testçi, 14 gün kesintisiz; 15–18 testçi toplanması öneriliyor) → üretim başvurusu.
- [ ] Data safety formu, içerik derecelendirme anketi (PEGI 16), hedef kitle.

**Build**
- [ ] En son commit'ten (`0c6f566`, 7 Ekim) temiz bir build alınmalı. `OTURUM_HAFIZASI.md`'deki kural gereği APK yalnız kullanıcı isteyince üretiliyor, bu adımı kullanıcı onaylamalı.
- [ ] **Kendi release keystore'u** oluşturulmalı (debug imza kullanılmamalı). Keystore yedeklenmeli. Play için `eas build --profile production` ile AAB, itch için `preview` APK veya `assembleRelease`.
- [ ] `versionCode` artırılmalı, gerçek cihazda test edilmeli. Uygulama içine CC BY atıf/künye ekranı eklenmeli.

**Yasal / mağaza**
- [ ] Gizlilik politikası `mobile/store/GIZLILIK.md` dosyasında hazır. Ancak linki `Tayma67/Kronikler`'e işaret ediyor ve repo gizlenince kırılacak. Politika itch sayfasında ya da GitHub Pages / Google Sites'ta barındırılmalı.
- [ ] Mağaza görselleri: `icon-512.png` ve `feature-graphic.png` hazır. Ekran görüntüleri eksik (listesi itch taslağında).
- [ ] Lisans temizliği: kendi LICENSE dosyası (Tüm hakları saklıdır / EULA), `CREDITS` dosyasının mobil sürüme taşınması, Stability Community kaydı.
- [ ] itch AI Disclosure işaretlenmeli: "AI Assisted — Code, Graphics, Text".

**Vergi (kısa not, mali müşavirle doğrulanmalı)**
- Yalnız akıllı telefon/tablet uygulaması satışında ve gelir Türkiye'deki banka hesabına geliyorsa **GVK mük. 20/B istisnası** uygulanabilir. Bu durumda banka %15 tevkifat keser ([özet](https://www.muhasebetr.com/appp/yazarlarimiz/firatinsel/091/)).
- Tescilli özgün yazılım/eser satışında **GVK 18** istisnası tartışılabilir ([Nelsus](https://nelsus.com.tr/bilgisayar-programlari-calismalarinin-gelir-vergisi-kanunu-nun-18-inci-maddesi-kapsaminda-olup-olmadigi-hk/)). Yapay zekâ ile yazılmış kodun "eser" sayılıp sayılmadığı belirsiz.
- IP satış bedeli ayrı değerlendirilmeli. **Doğrulanması gerekiyor.**

## 5. Yedi günlük plan

Önerilen karışım: **A = gizli IP/kaynak satışı (ana hedef)**, **B = itch PWYW (sosyal kanıt ve küçük gelir)**, C = bağış yok (Türkiye'den pratik değil). Kanal dürüst seçilmeli: münhasır IP satılacaksa itch'te kaynak kod satılmamalı. Oyunun kendisi itch'te ücretsiz/PWYW olarak kalabilir, sayfa da alıcıya devredilebilir.

| Gün | İş |
|---|---|
| **1 (Paz 11 Eki)** | `Tayma67/Kronikler` **gizlenir** (Berkay yapmalı) ve public release APK linki kaldırılır. LICENSE dosyası düzeltilir. Asgari fiyat (rezerv) ve hedef fiyat kendi içinde belirlenir. itch ve Payoneer hesapları açılır, vergi formu doldurulur. |
| **2** | Son commit'ten release-imzalı APK alınır, cihazda test edilir. 10 ekran görüntüsü ve 60 saniyelik video hazırlanır. CC BY atıf ekranı eklenir. Teaser tek sayfası ve NDA şablonu hazırlanır (bkz. Ek B). |
| **3** | itch sayfası taslaktan yayına alınır (PWYW, min 0 $, önerilen 3,99 $). İlk devlog yazılır. Türk toplulukları (Technopat, ÜNOG, DEV.TURK) ve r/BitLife-benzeri / r/incremental topluluklarına kurallarına uygun tek tanıtım yapılır (**kullanıcı onayıyla**). |
| **4** | Hedef alıcı listesine (Ek B) kişiselleştirilmiş gizli teaser gönderilir (**kullanıcı onayıyla**). r/gameDevClassifieds'taki `[PAID]` alıcı ilanları taranır. |
| **5** | NDA imzalayanlara demo video ve izlenen APK verilir. 30 dakikalık ekran paylaşımlı demo yapılır. İlk teklifi alıcının vermesi istenir. |
| **6** | Teklifler toplanır. "Son teklif günü Pazar 18 Eki" diye net bir tarih verilir. itch geri bildirimine göre fiyat ayarlanır. |
| **7** | En iyi teklif seçilir. Niyet mektubu (LOI) imzalanır, alıcı ödemeyi yapar (peşin ya da Payoneer/banka), repo davetiyle devir başlar. itch geliri bu noktada henüz çekilemez (≥3 hafta). |

**Dürüst değerlendirme:** 500 $'a ulaşmak için en iyi bileşim, **tek bir 500–1.500 $'lık münhasır olmayan lisans veya IP anlaşması** artı itch'ten gelecek 0–100 $. 7 günde bir anlaşmanın kapanması iyimser bir senaryo. 14–30 güne yayılırsa ihtimal belirgin şekilde artar.

## Ek A — Kaynak kod + tam IP devri: fiyat aralığı

**Emsaller** (çoğu *istenen* fiyat, gerçekleşen satış fiyatı değil):

| Proje | Durum | Fiyat |
|---|---|---|
| [Perekup](https://www.sideprojectors.com/project/97418/perekup-3d-car-flipping-game-full-source) (SideProjectors) | Gelirsiz, yapay zekâ destekli, tam kaynak, Android test build'i | **2.500 $** istenen, pazarlığa açık |
| [WonderFrost](https://www.sideprojectors.com/project/95895/wonderfrost-match-explore) | Yayın öncesi Unity bulmaca oyunu, tam devir | **2.250 $** istenen |
| BreachSix Games ([Flippa](https://flippa.com/buy/games)) | Gelirsiz, 150 seviye, 10 dil | **5.000 $** istenen |
| Food Truck Go ([Flippa](https://flippa.com/buy/apps/android)) | 10 bin+ indirme, ~371 $/ay gelir | **1.500 $** |
| Horror Hospital portföyü (Türkiye, [Flippa](https://flippa.com/buy/games)) | 39 M+ indirme, ~181 $/ay | 20–22 bin $ fiyat rehberi |
| Acquire.com | Gelirsiz projeler yalnız SaaS ise ve <25 bin $ ise kabul ediliyor ([Acquire](https://help.acquire.com/what-pre-revenue-businesses-are-allowed)) | — |
| Münhasır olmayan kaynak satışları | itch: Domyns yaşam simi kiti **~5 $**, Axirune Godot kaynak paketi **24,99 $** · CodeCanyon RN oyun şablonları **12–64 $** | Kopya başına |

**Kronikler için aralık (TAHMİN):**
- **Düşük: 500–1.500 $.** Hızlı satış, flipper alıcı, public kopya hâlâ ortadaysa.
- **Orta: 2.000–4.000 $.** Temiz lisans, public kopya gizlenmiş, NDA'lı süreç, birkaç teklif. Perekup/WonderFrost/BreachSix bandına denk.
- **Yüksek: 5.000–10.000 $.** Yalnızca stratejik bir alıcı çıkarsa: Türk/Osmanlı temalı içerik ve 6 dilli büyük metin gövdesini değerli bulan bir stüdyo. Bu fiyatı destekleyen gerçekleşmiş bir emsal bulamadım.

**Değeri düşüren etkenler:**
1. Kodun ~%96'sı yapay zekâ commit'i. Telif koruması belirsiz, alıcı "neyi münhasır satın alıyorum?" diye soracaktır. Ayrıca bu tür kodu yeniden üretmek ucuzladı.
2. Gelir, kullanıcı ve mağaza varlığı yok. Gelir çarpanı uygulanamıyor, değer yalnız maliyet/varlık değeri.
3. Varlık lisansları: CC BY atfı eksik, SD-Turbo kaydı yok, yapay zekâ görselleri münhasır değil, LICENSE dosyası yanlış.
4. **`Tayma67/Kronikler` public.** Aynı geçmiş 7 Ekim'e kadar orada duruyor. Gizlenmezse münhasırlık sıfıra yakın; gizlense bile önceden klonlanmış olabilir (API'de 0 fork / 0 yıldız görünüyor, bu olumlu). Alıcıya bu durum açıkça söylenmeli ve sözleşmeye "bilinen eski kopya" maddesi yazılmalı.
5. Debug-imzalı eski APK dolaşımda.

**Değeri artıran etkenler:** çalışan bir oyun olması, 6 dil, GDD ve tasarım belgeleri, otomatik test altyapısı, çok oyunculu sunucu ve niş kültürel tema.

## Ek B — Gizli fiyat keşfi stratejisi (taslak, hiçbir şey gönderilmedi)

1. **Kör teaser:** Tek sayfa. Repo adı, link ve fiyat içermez. Tür, 6 dil, içerik sayıları, kod büyüklüğü (~30 bin satır TS + test altyapısı), 3 ekran görüntüsü ve "tam IP devri veya münhasır olmayan lisans" seçenekleri yer alır.
2. **NDA'dan önce kod yok.** Kısa, iki dilli, karşılıklı bir NDA kullanılır. NDA'dan sonra sırasıyla video demo → izlenen (alıcı adına özel) APK → teklif sonrası salt-okunur repo erişimi gelir. Not: APK içindeki JS paketi kısmen geri çözülebilir, bu yüzden APK NDA'dan sonra verilmeli.
3. **Önce alıcı fiyat versin.** "Bağlayıcı olmayan ön teklifinizi bekliyoruz." Rezerv fiyat gizli tutulur.
4. **Son tarihli kapalı teklif:** 5–7 günlük net bir tarih ve "en iyi iki teklifle görüşülecektir" ibaresi. Tek alıcı varsa münhasır olmayan lisans alternatifi sunulur.
5. **Kademeli devir:** LOI → ödeme (peşin veya escrow) → repo transferi ve keystore devri → 1–2 haftalık destek.
6. **Hedef alıcı tipleri:**
   - Anlatı/strateji ağırlıklı küçük **Türk mobil stüdyoları** (ÜNOG ve DEV.TURK çevresi).
   - Tarih temalı içerik üreten Türk YouTuber/yayıncı ekipleri.
   - "BitLife-benzeri" oyun yayıncıları ve yeniden kaplama (reskin) yapan flipper'lar.
   - Bitmiş oyun **satın alma** ilanı veren r/gameDevClassifieds `[PAID]` alıcıları.
   - Flippa ve SideProjectors yalnızca fiyat keşfi için, kör ilan olarak (ilan vermek de yayın sayılır, **onay gerekir**).
   
   Hiper-casual odaklı büyük stüdyolar (Rollic, Dream Games tipi) bu tür için uygun alıcı değil (tahmin).
7. **Kırmızı çizgi:** Eski public repo gizlenmeden hiçbir alıcıya "münhasır" vaadi verilmemeli.

## Dosyalar
- Rapor: `/workspace/kronikler-satis-plani.md`
- itch sayfa taslağı (TR/EN açıklama, 10 etiket, fiyat gerekçesi, ekran görüntüsü listesi, devlog fikri): `/workspace/kronikler-itch-sayfa-taslak.md`
