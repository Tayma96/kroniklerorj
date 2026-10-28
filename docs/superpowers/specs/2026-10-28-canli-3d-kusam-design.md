# Canlı 3D kuşamlı karakter — tasarım belgesi

Tarih: 28 Ekim 2026 · Durum: TASLAK (kullanıcı onayı bekliyor)

## 1. Amaç ve neden

Oyuncu kuşandığı eşyayı karakterinin üstünde görmeli; düello ve ordu savaşında karakter
gerçek bir insan gibi, **akıcı ve yumuşak** hareket etmeli. Kullanıcının ölçütü: mobil
Shadow Fight 3 akıcılığı. Bugün oyunda tam boy karakter yok; düelloda Karagöz çizimi var ve
kullanıcı bunu "çizgi film" diye reddetti. Önceki Blender denemeleri (MakeHuman giysileri)
"amatör" bulundu.

**En büyük kural:** hareketler robot gibi değil, insansı, akıcı ve yumuşak olacak.

## 2. Hedefler

- Erkek ve kadın yetişkin gövde, herkeste aynı varsayılan kıyafet.
- Görünen eşyalar: silah (9), kalkan (2), miğfer/başlık (3), zırh (4), eldiven (2), çizme (2)
  = 22 eşya. Kıyafet ve takı figürde görünmez.
- Eşyalar gövdeyle aynı iskelete bağlı; bedenle birlikte bükülür, "eklenti" gibi durmaz.
- Hareketler gerçek insan hareket kaydından (mocap); hareketler arası yumuşak geçiş.
- Üç yer: **karakter sayfası** (canlı takıp çıkarma), **düello**, **ordu savaşı** (komutan).
- Rakiplerin tipine göre görünür kuşamı olur (dövüş öncesi okunur bilgi).

## 3. Hedef olmayanlar

- Çocuk ve yaşlı gövdesi (çocukta yüz portresi kalır).
- Kıyafet ve takının figürde görünmesi.
- Serbest dolaşan kamera, açık dünya, çok oyunculu 3D.
- Bulut/sunucu render'ı; her şey cihazda ve çevrimdışı.

## 4. Başarısızlık sayılacaklar (anti-hedefler)

- Hareketler kesik, robotik ya da kayan ayaklı görünürse.
- Eşyalar gövdeye yapıştırılmış, havada ya da içinden geçen görünürse.
- Zayıf Android'de takılma (hedef 60 fps; alt sınır 30 fps sabit).
- APK'nın ölçüsüz büyümesi (3D varlık bütçesi hedefi ≤ 25 MB).

## 5. Kararlar (kullanıcı ve konsey)

| Konu | Karar | Kaynak |
|---|---|---|
| Yöntem | Oyun içinde canlı 3D (Shadow Fight 3 gibi) | Kullanıcı |
| Gövde | Erkek ve kadın yetişkin | Kullanıcı |
| Kıyafet | Varsayılan, herkeste aynı | Kullanıcı |
| Görünen eşyalar | Silah, kalkan, miğfer, zırh, eldiven, çizme | Kullanıcı |
| Düello kamerası | Sabit yan görünüş, hafif yukarıdan; sinematik an yalnız bitiriş vuruşunda | Konsey |
| Kalite derecesi | Yeni model değil; malzeme rengi/parlaklık/aşınma farkı | Konsey |
| Rakip kuşamı | Rakip tipine göre hazır takım, görünür | Oyun Tasarımcısı |
| Karakter sayfası | Takınca eşya yerine oturur (kısa animasyon, parıltı, ses, değer artışı); iki elli silah kalkanı düşürür | Oyun Tasarımcısı, Oyuncu |
| Vâris anı | Vâris babasının miğferini/silahını takınca özel an | Oyuncu |
| Ordu | Komutan tam kuşamlı 3D; askerler hafif, renklendirilmiş figürler | Konsey |
| Onay kapısı | Toplu üretimden önce telefonda görünüm ve akıcılık testi | Konsey, kullanıcı |

## 6. Yaklaşımlar (değerlendirilen)

1. **Canlı 3D (seçildi):** her eşya birleşimi bedava, en akıcı hareket, küçük boyut. Bedeli:
   yeni yerel modül ve APK, zayıf cihaz performans testi.
2. Önceden işlenmiş kare dizileri: akıcı ama yüzlerce MB ve günlerce render; geçişler kısıtlı.
3. 2D iskelet animasyonu (Shadow Fight 2): küçük ve akıcı ama gerçekçi dokuda eklem dikişleri
   görünür (Karagöz riski).

Konsey başta önceden işlenmiş katmanları önerdi; kullanıcının "Shadow Fight 3 kadar akıcı"
ölçütü canlı 3D'yi zorunlu kıldı.

## 7. Teknik tasarım

### 7.1 3D motoru

Depo: Expo 56.0.11, RN 0.85.3 (Yeni Mimari zorunlu), Reanimated 4.3.1 + worklets 0.8.3,
Skia 2.6.2. APK, GitHub Actions'ta `expo prebuild` + `gradlew assembleRelease` (yalnız arm64)
ile derlenir; EAS kullanılmaz. `metro.config.js` yok (GLB için eklenecek). `assets/` 81 MB.

| | react-native-filament 1.11 (Margelo) | expo-gl + three.js 0.186 + R3F 9.8 |
|---|---|---|
| Çizim | Yerel, ayrı iş parçacığında (JS'i yormaz) | JS iş parçacığında (Hermes), oyun koduyla yarışır |
| Animasyon | Deri bağlama + iki hareket arası yumuşak geçiş | Olgun karıştırma (`crossFadeTo`), çoklu katman |
| Eşya | Kemiğe bağlama yok; tüm eşyalar tek GLB'de aynı iskelete bağlı, göster/gizle | Aynı iskeleti paylaşan çoklu SkinnedMesh |
| Risk | RN 0.85'te denenmemiş; `worklets-core` ile Reanimated 4 çakışması; Expo çökme kayıtları | Android'de kenar yumuşatma (MSAA) yok; gömülü doku yükleme kırılgan |
| APK etkisi | ~4 MB (iddia) | ~2-4 MB |

**Karar:** önce Filament ile 1-2 günlük **teknik deneme** (Kapı 0), gerçek derleme hattında,
gerçek telefonda: tek gövde + iki hareket + yumuşak geçiş. Çakışma çözülemezse three.js + R3F'ye
geçilir (gölgesiz ya da yassı gölge, basit malzeme, ≤ 60 kemik, ≤ 1024 px ayrı dokular,
düşük piksel oranı, dövüşte arayüz yeniden çizimini durdurma). Seçim deneme sonucuyla kesinleşir.

### 7.2 Varlık hattı (Blender, bu bulut makinesinde)

- **Gövde:** MPFB (MakeHuman) erkek ve kadın yetişkin, `game_engine` iskeleti, ~15-20 bin üçgen,
  yüz için iyi deri dokusu; varsayılan kıyafet tek parça, gövdeyle birlikte ağırlıklı.
- **Sert eşyalar** (silah, kalkan, miğfer): **tamamı Blender'da modellenir** (kullanıcı kararı:
  yapay zekâ üretimi yok). Betikle temel biçim + elle ayrıntı, dönem kaynaklarına göre ölçü;
  Poly Haven CC0 PBR dokuları (çelik, pirinç, deri, ahşap) ve yıpranma; düşük poligon + normal
  haritası pişirme. İlgili kemiğe bağlanır (el, baş).
- **Giyilen eşyalar** (zırh, eldiven, çizme): gövdenin üstüne Blender'da kurulur ya da üretilip
  oturtulur; ağırlıklar gövdeden aktarılır (data transfer), içinden geçme düzeltilir.
- Dışa aktarma: gövde başına bir GLB (iskelet + animasyonlar) + eşya başına GLB (aynı iskelet).
- Doku bütçesi: eşya başına 512-1024 px, sıkıştırılmış (KTX2/webp).

### 7.3 Hareket hattı

**Kaynaklar (ticari kullanıma uygun):**

| Hareket | Kaynak |
|---|---|
| Muhafız duruşu, bekleme | CMU 76_04 (savunma duruşu) + elle yazılmış nefes katmanı |
| İleri/geri adım | 100STYLE (CC BY 4.0) ya da CMU yürüyüş kesitleri |
| Hafif saldırı (2-3 çeşit) | CMU 02_07, 02_08, 02_09 kılıç oyunu kesitleri |
| Ağır/özel vuruş | CMU 02_09 baş üstü vuruş |
| Savuşturma/blok | CMU 144 (kadın) bloklar, 76_02-03 kaçınma |
| Darbe alma, sendeleme | CMU 85_07 sendeleme; eksikler KayKit/Quaternius (CC0) |
| Yere düşme/yenilgi | CMU 90_16, 90_18 |
| Zafer, karakter sayfası beklemesi | KayKit (CC0), CMU sakin duruş |

- CMU: ürüne gömülü ticari kullanım serbest; ham veri yeniden satılamaz/dağıtılamaz.
- Eksik hareketler (darbe alma, zafer) CC0 paketlerden (KayKit, Quaternius) Blender'da iskelete
  aktarılıp elle düzeltilir. Yapay zekâ hareket üretimi kullanılmaz (kullanıcı kararı).
- Kullanılmayacaklar: HY-Motion (AB/İngiltere/Kore'de lisanssız), MoMask/MotionGPT
  (ticari olmayan AMASS verisiyle eğitilmiş), Bandai Namco, LAFAN1, AMASS (ticari değil).
- Mixamo isteğe bağlı: ücretsiz ve oyunlarda serbest, ama kullanıcının Adobe hesabıyla elle
  indirme ister.

**Akıcılık (Blender'da hazırlanır):** 120 → 30 kare/sn; kılıç hareketleri 1,2-1,5 kat
hızlandırılır; her vuruşa 2-4 karelik hazırlanma ve sonunda taşma-oturma eklenir; ayaklar
IK ile yere sabitlenip pişirilir (kayan ayak yok); adım ve geri tepme kök kemiğine taşınır;
sol el sürümleri aynalanarak üretilir; her hareket ayrı NLA izi olarak GLB'ye çıkar.

**Akıcılık (oyunda):** yumuşak geçiş süreleri — bekleme→muhafız 0,15-0,25 sn, saldırıya
giriş 0,05-0,1 sn, darbe kesmesi ~0,05 sn, toparlanma 0,15-0,25 sn; üst gövde saldırısı alt
gövde duruşunun üstüne katmanlanır; her beklemede düşük ağırlıklı nefes katmanı; vuruş anında
kısa donma (hafif 30-50 ms, ağır 60-100 ms, kritik 100-150 ms) ve hafif kamera sarsıntısı.

### 7.4 Oyun içi davranış

- **Karakter sayfası:** üstte tam boy 3D karakter, sakin bekleme hareketi; parmakla döndürme.
  Eşya takılınca kısa yerleşme animasyonu + parıltı + ses + değer çipi; çıkarılınca kaybolur.
- **Düello:** iki karakter karşılıklı, sabit kamera. Hamle → saldırı hareketi, savuştur → kalkan
  ya da silahla karşılama, özel → ağır vuruş, toparlan → geri çekilip nefes. Rakip niyeti ve
  mevcut düello kuralları değişmez; yalnız görsel katman değişir. Üstünlük 3/3 bitirişte
  yakınlaşma ve ağır çekim.
- **Ordu savaşı:** meydan muharebesi sayfası yapılırken komutan bu karakterle; askerler hafif
  figürler. Bu projede yalnız altyapı.
- Yedek: 3D başlatılamazsa (eski cihaz) mevcut 2D görünüme düşer; oyun bozulmaz.

## 8. Aşamalar ve onay kapıları

| Aşama | İş | Kapı (kullanıcı onayı) |
|---|---|---|
| 0. Teknik deneme | Filament (olmazsa three.js) + tek gövde + 2 hareket + yumuşak geçiş, gerçek derleme hattında test APK | Telefonda açılıyor, akıcı mı? |
| 1. Görünüm ve akıcılık | Erkek gövde, varsayılan kıyafet, kılıç + miğfer + zırh; bekleme, saldırı, savuşturma | "Akıcı ve gerçek" demeden toplu üretim yok |
| 2. Varlık üretimi | Kadın gövde, 22 eşyanın tamamı, tüm hareketler | Eşya sayfası (kontak sayfa) incelemesi |
| 3. Karakter sayfası | Canlı 3D figür, takma/çıkarma animasyonu, vâris anı | Telefonda deneme |
| 4. Düello | Tüm hareketler, rakip kuşamları, bitiriş anı, eski 2D'ye yedek | Telefonda deneme |
| 5. Ordu altyapısı | Komutan figürü, asker figürü taslağı (meydan muharebesiyle birlikte) | Meydan muharebesi tasarımında |

Her aşama ayrı plan, alt ajanlarla uygulama, inceleme ajanı ve doğrulamayla ilerler.

## 9. Kısıtlar

- Kullanıcının bilgisayarı yok; her şey bulut makinesinde, sonuçlar telefonda görülür.
- Bulut makinesinde GPU yok: Blender CPU ile; yapay zekâ üretimi kullanılmaz.
- Yalnız ücretsiz araçlar ve ticari kullanıma uygun lisanslar.
- 6 dil, `GameIcon`, `lib/theme.ts`, `apk` dalı, Türkçe tek satır commit.

## 10. İnceleme sonrası kararlar

Benim kararlarım (kullanıcı itiraz edebilir):
- **Düello sıra tabanlı kalır.** 3D yalnız seçilen hamlenin sonucunu oynatır; tur başına bir
  karşılaşma (saldıran hareket + karşılık). Gerçek zamanlı tuş zamanlaması yok.
- **Yaş:** 16 yaş altı karakterler 3D'ye girmez, mevcut 2D görünüm kalır. Yetişkin gövdede yaş,
  saç, sakal ve ten rengi birkaç çeşitle verilir. 3D baş mevcut portrelerle birebir aynı olmak
  zorunda değil, yalnız ten ve saç rengi uyumlu.
- **Yapay zekâ yok (kullanıcı kararı):** tüm eşyalar ve düzeltmeler Blender'da; `HF_TOKEN`
  gerekmez. Kalite Kapı 1'de kullanıcıya gösterilir.
- **Kapı 0 geçme ölçütü:** kullanıcının telefonunda en az 30 kare/sn sabit, hedef 60. Bellek
  taşması yok, açılış 3 sn altında.

Kullanıcıya sorulanlar: aşağıdaki "Açık sorular".

## 11. Açık sorular

1. Bu proje sayfa sırasıyla (giriş → yeni oyun → ana sayfa) ilerleyen işten önce mi gelir,
   paralel mi yürür?
2. Silah hareket setleri: 4 tip öneriliyor. Tek elli kılıç/hançer/bıçak/yatağan bir set;
   gürz ve savaş baltası ağır vuruş seti; mızrak dürtme seti; yay atış seti. Uygun mu?
3. Test APK'ları: Kapı 0 ve Kapı 1 için GitHub Actions'ta test APK derlemeye izin; kullanıcının
   telefon modeli.

## 12. Uygulayıcıya kalanlar

- Kemik adlandırma ve dışa aktarma ayrıntıları, doku sıkıştırma biçimi.
- Kamera açısının ince ayarı, ışık kurulumu.
- Rakip tiplerinin kuşam tablosu (oyun dengesine göre).
