# Savaş mekaniği, 3D ve sayfa düzeni — araştırma ve öneri (28 Ekim 2026)

Kullanıcı isteği: savaş "ibreyi alana getir" gibi hissettirmesin; bireysel ve toplu savaş için
türdeki iyi örnekler incelensin, görselleştirme ve 3D olanağı denetlensin; sayfa içerikleri
doğru yere taşınsın. Bu belge karar önerisidir; uygulama sırası en altta.

## 1. Bugünkü durum (kod)

| Sistem | Dosya | Ne yapıyor | Sorun |
|---|---|---|---|
| Bireysel dövüş | `lib/combat.ts`, `app/oyun/savas.tsx` | Tur tabanlı taş-kağıt-makas: hamle / savuştur / özel / toparlan; duruş çarpanı; düşman arketipi ve fent payı. **Niyet sezme, nefes ve üstünlük (3/3 → bitiriş) zaten var.** | Mekanik sağlam; eksik olan görsel karşılık: düğme + metin. (Düzeltme: ilk sürümde niyet/nefes eksik sanılmıştı.) |
| Ordu / cephe | `lib/army.ts`, `lib/army-ui.tsx` | Aylık cephe hamlesi: tut / ilerle / kurtar; düşman emri: hücum / ok / baskı. | Tek düğmelik aylık seçim. Birlik türü, arazi, kanat, moral akışı görünmüyor. |
| Fırsat kartı | `lib/kart3d.tsx` (`FirsatKarti`) | Gezen işaretçiyi başarı alanında durdurma (zamanlama). | Kullanıcının beğenmediği "ibre" oyunu budur. Hüner/şans testi için zayıf ve tekrarlı. |

## 2. Türde ne işe yarıyor?

**Bireysel dövüş**

- *Slay the Spire, Into the Breach*: düşman bir sonraki hamlesini **niyet simgesiyle gösterir**. Oyuncu tahmin
  etmez, okur ve plan kurar. Bizdeki arketip + fent sistemine en uygun ders bu: niyet her zaman değil,
  hüner ve gözleme göre görünür (usta rakip yanıltıcı niyet gösterebilir).
- *Kingdom Come, For Honor*: yön/duruş üçgeni ve **dayanıklılık (nefes)**. Her ağır vuruş nefes yer; nefessiz
  kalan savunamaz. Bizdeki "toparlan" hamlesi buna doğal bağlanır.
- *Darkest Dungeon*: kalıcı **yara ve stres** — dövüşün bedeli dövüşten sonra da sürer. Oyunda kalıcı yara zaten var.
- *Banner Saga*: güç ile can aynı değer: yaralanan kişi daha zayıf vurur. Uzun dövüşte geri dönüş umudu yaratır.

**Toplu savaş**

- *Crusader Kings III*: savaş üç evre (manevra, ana çatışma, kovalama); **komutan, arazi ve taktik kartları** sonucu belirler.
  Oyuncu her saniyeyi değil, birkaç büyük kararı verir — kısa mobil oturuma uygun.
- *Knights of Honor / Total War Battles*: birlik türleri arasında üçgen (atlı > okçu > piyade > atlı) ve **kanatlar**.
- *Mount & Blade*: düzen emirleri (hat tut, hücum, kanattan sar) basit ama hissedilir.
- Tarihsel imza: **Turan taktiği / sahte ricat** ve atlı okçuluk. Selçuklu–Moğol çağında geçen bir oyun için
  başka hiçbir rakipte olmayan, ayırt edici bir mekanik olur.

## 3. Önerilen tasarım

### 3.1 Bireysel dövüş: "Oku, nefesini yönet, bitir" (motor hazır; aşağıdakiler görsel ve ince ayar)

1. Rakibin üstünde **niyet simgesi** (vuracak / savunacak / ağır vuruş hazırlıyor). Okunma payı mevcut `feint`
   ve oyuncunun savaş becerisinden gelir; usta rakipte niyet bazen "?" ya da yanıltıcıdır.
2. Dört hamle aynı kalır (motor korunur) ama her biri **nefes** harcar; toparlan nefes kazandırır.
3. Üç kez üst üste doğru okumak **"açık" yaratır**: bir sonraki hamle kritik ve sinematik (ağır çekim, kıvılcım, sarsıntı).
4. Arazi/silah farkı: kılıç, yay, mızrak, kalkan kendi kısa avantajını getirir (motorda `weaponClass` var).
5. Sonuç: yara, nam, rakibin hafızası (NPC hafıza sistemi) — dövüş hikâyeye bağlanır.

### 3.2 Toplu savaş: "Hazırlık → üç çatışma → akıbet"

- **Hazırlık:** keşif (arazi ve düşman düzeni ne kadar görünüyor), düzen: sol kanat / merkez / sağ kanat ve yedek.
  Birlik türleri: atlı okçu, ağır süvari, piyade, okçu. Erzak ve moral başlangıcı (bölge ambarı burada işe yarar).
- **Çatışma (3–5 tur):** her tur bir **emir kartı**: ok yağmuru, hücum, hattı tut, kanattan sar, **sahte ricat**,
  yedeği sür. Kartlar düşman emrine karşı üçgende çözülür; kanat çökerse merkez moral kaybeder.
  Sahte ricat riskli: başarılıysa düşman dağılır, başarısızsa gerçek bozguna döner.
- **Akıbet:** kovala ya da yağmala, esir, ganimet, yaralı bakımı, şehre etkisi (zaten var olan `war-world` hasarı).
- Mevcut `ArmyWar` aylık ilerleyişi korunur; bu çatışma, cephede **büyük meydan muharebesi** olduğunda açılır.

### 3.3 "İbre" mini oyununun yerine

Fırsat kartındaki zamanlama oyunu kaldırılmalı. Yerine: hünere göre **iki-üç seçimli kısa sahne**
(ör. "kervanı yokuşta kurtar": halatla çek / omuz ver / yolu değiştir), her seçimin şansı ve bedeli açık.

## 4. Görselleştirme ve 3D

| Seçenek | Gerekenler | Artı | Eksi |
|---|---|---|---|
| **Skia 2.5D** (önerilen ilk adım) | `@shopify/react-native-skia` zaten kurulu | Yeni yerel modül yok; düşük donanımda akıcı; çevrimdışı. Katmanlı sprite, toz, ok yağmuru, kıvılcım, kamera sarsıntısı. | Gerçek 3D değil; animasyonlu karakter kareleri gerekir. |
| **three.js + expo-gl** (`@react-three/fiber/native`) | `expo-gl`, `three`, Metro'ya `glb/gltf` | Gerçek 3D, GLB modeller, kamera. | Yeni APK gerekir; Android'de GLB yükleme sorunları bildirilmiş; ısınma/pil; düşük cihazda kare kaybı. |
| **react-native-filament** (Margelo) | yeni yerel modül + config plugin | Yerel C++ PBR motoru, iyi performans. | Görece yeni; Expo 56 uyumu ayrıca denenmeli. |

**Model kaynağı:** CC0 düşük poligonlu karakter ve animasyon paketleri (KayKit — glTF; Quaternius — FBX,
GLB'ye dönüştürülür). Hazır paketler Avrupa şövalyesi görünümünde; Selçuklu/Anadolu kıyafeti, sarık, börk,
atlı okçu için yeniden dokulama ya da özel modelleme gerekir. APK boyutu bütçesi konmalı (ör. savaş seti ≤ 15 MB).

**Öneri:** İki hafta içinde Skia ile 2.5D canlandırılmış dövüş ve meydan muharebesi; 3D'yi yayından sonra
tek bir vitrin sahnesinde (meydan muharebesi ya da şehir görünümü) Filament veya three.js ile deneme
dalında, gerçek cihazda kare hızı ölçerek. 3D eklemek, model ve animasyon hazır olmadan oynanışı iyileştirmez.

## 5. Sayfa düzeni (bilgi mimarisi)

Ana ekran sadeleşti: içerik yerine **gündem madalyonları** (Bu Ayın Kararı, Uyarılar, Sofra, Emek,
yaş uğraşları, Gündem, Son Gelişmeler); içerik alttan açılan panellerde (`lib/home-hud.tsx`).

Sıradaki adım, mockup'taki alt menüye geçmek ve her içeriği tek bir yere bağlamak:

| Sekme | Toplanacak sayfalar |
|---|---|
| Ana sayfa (sahne) | Gündem madalyonları; portreye dokununca Karakter |
| Şehir | Pazar, atölye, mülkler, mahalle, mektep, örgütler, haberler, harita |
| İlerle (pusula) | Ay ilerletme, bekleyen karar |
| Kişiler | İlişkiler, NPC, çöpçatan, aile, hanedan ve nesil |
| Defter | Tarih, kronik, roman, hikâyeler, başarımlar, divan |

"Güç & Mevki" (örgüt, mevki, savaş, suç) Karakter altında "Yolun" başlığıyla toplanır; Menü sekmesi kalkar,
Ayarlar ana ekrandaki dişliden açılır. Her sayfa için "bu sayfada yapılabilen eylemler" listesi çıkarılıp
yinelenen eylemler (ör. aynı işin hem menüde hem şehirde olması) tekilleştirilir.

## 6. Uygulama sırası

1. Alt menüyü mockup düzenine geçir; Menü içeriğini Şehir / Kişiler / Defter / Karakter'e dağıt.
2. Fırsat kartındaki ibre oyununu seçimli kısa sahneyle değiştir.
3. Bireysel dövüşe niyet simgesi + nefes + açık; Skia ile iki figürlü dövüş sahnesi.
4. Meydan muharebesi: hazırlık / emir kartları / akıbet; Skia savaş alanı görünümü.
5. Yayından sonra: 3D vitrin denemesi (ayrı dal, gerçek cihaz ölçümü).

Kaynaklar: r3f kurulum belgesi (r3f.docs.pmnd.rs/getting-started/installation), pmndrs/native,
react-three-fiber GLB sorunu (github.com/pmndrs/react-three-fiber/issues/2700), KayKit (kaylousberg.itch.io/kaykit),
Quaternius (quaternius.itch.io), react-native-filament (github.com/margelo/react-native-filament).
