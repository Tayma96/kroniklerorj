# Kronikler Online — birleşik ana tasarım (8 Kasım 2026)

**Durum:** Berkay 8 Kasım'da tam yetki verdi ("plan proje eklenecek, çıkarılacak, değiştirilecek; sende artık").
Bu belge `docs/online/gdd/` altındaki GDD v0.4, Ek A ve Ek B'yi depodaki kodla ve `docs/online/OYNANIS_TASARIMI.md`
ile **uzlaştırır**. Bu belgede **[KARAR — Claude, 8 Kasım]** etiketli maddeler o yetkiyle kapatılmıştır; Berkay
istediği an tersine çevirebilir. Çelişkide sıra: Berkay'ın yeni sözü → bu belge → GDD ana belge → ekler →
`OYNANIS_TASARIMI.md` → eski `FAZn_PLAN.md`ler.

## 1. Amaç ve neden

Kronikler tek oyunculu ve çok oyunculu iki ayrı mod olarak yayınlanacak. Çevrimiçi mod, kısa mobil
oturumlarda oynanan kalıcı ve paylaşımlı bir **yaşam simülasyonudur**; krallık yönetimi yollardan yalnız biridir.
Oyuncu hedefi: "Kısa girsem bile anlamlı bir karar veririm; insanlar beni hatırlar; ben yokken dünya yaşar."

**Yayın kuralı (Berkay, 8 Kasım):** Oyun hazır olmadan yayınlanmaz. "Erken, yarım sürüm" yoktur. Fazlar yapım
sırasıdır, yayın dilimi değildir; ama her faz kendi içinde **bitmiş** (test, 6 dil, arayüz) teslim edilir.

## 2. Hedefler, hedef dışı, karşı hedefler

**Hedefler**
- Her meslek önemli, topluma katkısı hissedilir, her birinin kendine özgü cazibesi ve beceri ağacı vardır.
- Meslek kilitli sınıf değildir: demirci odun kesebilir (temel iş herkese açık), ama usta işi ustalık ister.
- Berkay tek başına ve ileride moderatörlerle oyunu yönetebilir (yönetici paneli, §7).
- Sunucu otoritedir; her önemli işlem idempotent ve kayıtlı bir dünya olayıdır.
- Hiçbir temel hizmet belirli bir oyuncunun çevrimiçi olmasına bağlı değildir (NPC tabanı).

**Hedef dışı (ilk sürüm):** gerçek zamanlı kalabalık savaş, üretken YZ'ye bağlı NPC kararı, oynanabilir Moğol,
mahkeme ve tanık ağırlığı (D-28), ses (Faz 16 sonra).

**Karşı hedefler (teknik olarak çalışsa da başarısızlık sayılır)**
- Ücretli güç, parayla bekleme atlama, paralı kutu, akçenin gerçek paraya dönmesi.
- Zorunlu günlük giriş, seri, kaçırınca ceza (evsizlik zinciri dışında, D-16).
- Yarım bırakılmış sistem; "var ama etkisiz" gösterge ya da düğüm.
- Tek oyunculu kodun, kaydının ya da `server/`–`mobile/lib/mp/protocol.ts` bayt eşliğinin bozulması.
- Berkay'a ek ücret çıkması (ücretsiz katman; sınıra yaklaşınca rapor, D-01).

## 3. Kısıtlar

- Teknik: Cloudflare Worker + Durable Object (`online-server/`), istemci Expo (`mobile/lib/online/`, `mobile/app/online/`).
  Eski Diyar sunucusu `server/` ve `mobile/lib/mp/` dokunulmazdır.
- Online karakter SP verisini okumaz (kimlik, kayıt, profil). İçerik verisi (ad listeleri, huylar) kopya olarak
  sunucuda tutulur; çalışma anında SP motoruna bağ yoktur.
- Oyuncu metni tr/en/es/pt/ar/ru; `GameIcon`, `lib/theme.ts`; 320/390 px, 44 px dokunma alanı.
- Zaman: 12 gerçek saat = 1 oyun ayı (D-03). Ortak tur kapısı yok.
- Dağıtım, gizli anahtar, Google istemci kimliği, mağaza ödemesi Berkay'ın elle işidir; ajan yapmaz.

## 4. Uzlaştırılan çelişkiler [KARAR — Claude, 8 Kasım]

| # | Çelişki | Karar | Neden |
|---|---|---|---|
| Ç1 | GDD "7 beylik" (D-05) ↔ Ek B "bölge + vali + Sultan + Moğol" (D-05′) | **D-05′ kabul.** Mevcut `dunya-veri.ts`deki 7 beylik **7 bölge (valilik)** olur; şehir/kasaba/köy verisi aynen kalır. "Beylik" adı yalnız bağımsızlık ilan eden devlete verilir. Kodda alan adları (`BEYLIKLER`) şimdilik korunur, görünen metin "bölge" olur; yeniden adlandırma P1'de. | Daha güçlü hikâye motoru (tırmanış, darbe); veri yapısı değişmeden geçiş. D-39 = **7**. |
| Ç2 | Meslek sayısı: Ek A 14 ↔ `OYNANIS_TASARIMI` §14.2 21 | **14 meslek** (Ek A §1.2). §14.2'deki fazlalar dal olarak içeri alınır (§5.2). | 21 meslek yarım kalma riskidir; 14'ü de "dört soru testini" geçiyor. |
| Ç3 | Ağaç yapısı: Ek A "3 kademe + şaheser" ↔ §14.3 "4 kademe (çırak/kalfa/usta/pir), 3 dal, düğüm" | **§14.3 ağacı + Ek A kuralları:** 4 kademe, 3 dal; düğüm **imkân açar, sayı artırmaz**; usta olurken şaheser; pir yalnız çırak yetiştirerek. | Berkay "her mesleğin beceri ağacı olmalı" dedi; Ek A "gizli sayı yok" kuralı korunur. |
| Ç4 | Ek A "stat artırma yok" ↔ sunucuda 6 özellik + 6 genel beceri zaten var | **Özellik ve genel beceriler kalır** ama yalnız **görünür** ve etkisi yazılı olarak (şans dökümü zaten gösteriliyor). Meslek ilerlemesi beceri sayısıyla değil ağaçla olur. Ek A'nın Hal katmanı eklenir. | Çalışan, testli kodu sökmek yarardan çok zarar; "gizli sayı yok" ilkesi şans dökümüyle zaten sağlanıyor. |
| Ç5 | Ek A "kondisyon" ↔ sunucudaki "takat" | **Takat eylem bütçesi olarak kalır.** Kondisyon ayrı Hal göstergesidir ve **aylık takat yenilenmesini** değiştirir (iyi: 6, yorgun: 5, bitkin: 4 [PARAMETRE]). | İki kavram ayrı işe yarar: takat = bu ay ne kadar iş, kondisyon = beden ne durumda. |
| Ç6 | İki faz numaralaması (depodaki `FAZ4–8_PLAN.md` ↔ GDD §20) | **GDD §20 numaraları esastır.** Eski planlar içerik kaynağı olarak kalır, adları §8'deki eşleme tablosuyla okunur. | Ana belge tek kaynak. |
| Ç7 | Çıraklık turu (12 yaşında 3 meslek dene) ↔ yaş eşikleri 12/13/16 (D-33) | Öğrenme döneminde (12→13) oyuncu **ustaların yanında ayak işi** yaparak 3 mesleği tanır (çırak düğümü değil, tanışma). Meslek seçimi 13'te; ağır meslekler (asker, madenci) 16'da kalfalık açar. | Yaş kuralı korunur, keşif hissi kalır. |
| Ç8 | Yönetici paneli hiç tasarlanmamış | §7'de tasarlandı; **yayın öncesi zorunlu**. | Berkay 8 Kasım. |
| Ç9 | Ölüm: "mümkün ama zor" (KESİN) ↔ barınma "ölüm yok" | Çelişki yok: evsizlik öldürmez (can tabanı %10); ölüm yaşlılık, çatışma, hastalıktan gelir. | — |

## 5. Meslek sistemi (birleşik)

### 5.1 İlke
Bir meslek ancak dört soruya cevap verirse vardır: **kim ister, çıktısı ne, ilerleme ne açar, NPC tabanı var mı**
(Ek A §1.1). Ve Berkay'ın üç şartı: **topluma katkı hissi, kendine özgü cazibe, beceri ağacı.**

### 5.2 14 meslek, dallar ve eşsiz cazibe

| # | Meslek | Aile | 3 dal | Eşsiz cazibe (yalnız o yapar) | §14.2'den içeri alınan |
|---|---|---|---|---|---|
| 1 | Çiftçi | Toprak | Ekin · Sürü ve av · Ambar | Yerleşimin karnı; kıtlıkta ambarı kader belirler | Çoban, avcı, balıkçı |
| 2 | Oduncu / madenci | Toprak | Orman · Maden · Taş ocağı | Zincirin başı; nadir damar ve sert odun yalnız ustada | — |
| 3 | Demirci | Zanaat | Alet · Silah · Zırh | Aletsiz hasat yok, silahsız savunma yok; pir damgası | Kuyumcu (İnce işçilik, alet dalının ucu) |
| 4 | Marangoz / yapı ustası | Zanaat | Yapı · Araç ve köprü · Tezyin | Ev, köprü, sur, han inşası; yerleşimin büyümesi | Yapı ustası |
| 5 | Dokumacı / deri ustası | Zanaat | Kumaş · Deri · Çadır ve sancak | Kış ve seferde hayati; zırh astarı | Debbağ |
| 6 | Aşçı / fırıncı | Zanaat | Fırın ve değirmen · Mutfak · Saklama | Kıtlıkta toplu mutfak; şenlik ziyafeti | Değirmenci, fırıncı |
| 7 | Hancı | Hizmet | Konaklama · Etkinlik · Haber | Söylentinin merkezi; barınma ve masa | — |
| 8 | Şifacı | Hizmet | Hekimlik · Ebelik · Şifalı otlar | Yarayı iyileştirir, doğumu güvenli kılar, zehre panzehir | Attar |
| 9 | Ozan / derviş | Hizmet | Sahne · Gönül · Destan | Gönül toparlar; destanla nam yayar | Müzisyen |
| 10 | Kâtip / ulak | Hizmet | Belge · Ulak · Defter ve tercüme | Sözleşme, vasiyet, güvenli mektup | Ulak |
| 11 | Tüccar / kervancı | Ticaret | Pazar · Kervan · Yol bilgisi | Uzak mal, fiyat bilgisi, şehirler arası arz | Kervancı |
| 12 | Arabulucu | Toplum | Uzlaştırma · Elçilik · (Hüküm, D-28 sonrası) | Husumeti kan davasına dönmeden bitirir | — |
| 13 | Asker | Toplum | Nöbet · Sefer · Keşif | Kervanı ve yerleşimi korur; garnizon | — |
| 14 | Divan görevlisi | Toplum | Hazine · Nizam · Meclis | Vergi, bütçe, kamu düzeni; makama giden yol | — |

Dal ve düğüm adları içerik verisidir; uygulama sırasında ihtiyaca göre uyarlanır (D-31).

> **9 Kasım:** §5.3 yerine `docs/superpowers/specs/2026-11-09-beceri-agaci-v2-design.md` geçerlidir (RPG beceri ağacı, öğrenme süresi, Tam Özgürlük Modeli, kalıcı bilgi).

### 5.3 Ağaç
- **Kademe:** Çırak → Kalfa → Usta → Pir. Süre gerçek gün cinsinden [PARAMETRE, D-30]; öneri: kalfa 12 oyun ayı
  (6 gün), usta 24 ay, pir yalnız en az 2 çırağı kalfa yapınca. Parayla atlama yok (D-14).
- **Tecrübe ve beceri puanı (Berkay, 9 Kasım):** oyuncu bir meslekte çalıştıkça (temel iş, tarif, sipariş, ileride
  oyuncu siparişi) o mesleğe özel **tecrübe** kazanır. Tecrübe barı her `PUAN_TECRUBE` (6) dolduğunda **1 beceri puanı**
  gelir; puan yalnız o mesleğin ağacında harcanır. Düğüm bedeli kademeye göre 1/2/3/4; mesleğe girişte 1 başlangıç
  puanı (ilk tarif açılabilsin). Kademe toplam tecrübeyle açılır. Geri alma puanı iade eder. [PARAMETRE]
- **Dal:** çırak bir dal seçer; kalfa ikincisini, usta üçüncüsünü açar. **Uzmanlaşma:** yalnız bir dal pir ucuna
  kadar gider; aynı meslekten iki oyuncu farklı ustalar olur ve birbirine ihtiyaç duyar.
- **Düğüm = imkân:** yeni tarif/hizmet, kalite düzeyi, toplu sipariş, özel eylem (şaheser sipariş) ya da toplumsal hak
  (lonca oyu, çırak alma, dükkân açma). Her düğümün etkisi ve açılış şartı arayüzde yazılıdır. Etkisiz düğüm yok.
- **Meslekler arası bağ:** üst düğümler başka mesleğin ürününü ister (pul zırh → deri ustasının derisi). NPC tabanı
  her zaman vardır ama zayıftır.
- **Pişmanlık:** yılda 1 düğüm geri alınır. **Meslek değiştirme ustalığı silmez**; dönüşte toparlanma hızlıdır.
- **Ana + yan sanat:** biri tam, biri yarı hızda ilerler.

### 5.4 Temel iş / usta iş (demirci–odun sorunu)
- **Temel iş herkese açıktır:** odun kesmek, taş toplamak, ot ve yün toplamak, su taşımak, basit onarım. Hız düşük,
  çıktı sade, aynı kaynakta **azalan getiri** (mevcut `1/(1+n)` deseni, 6 ay penceresi).
- **Usta iş meslek düğümüne bağlıdır:** sert odun, nadir damar, kalite, toplu sipariş.
- **Fırsat maliyeti görünür:** demirci odun keserken arayüz "Bu takatle demirde ~X akçe kazanırdın; oduncudan
  almak ~Y akçe" der. Ticaret zorlamadan doğar. Kimse kilitlenmez.

### 5.5 Topluma katkı hissi (vazgeçilmezlik)
`OYNANIS_TASARIMI` §14.4'ün altı mekanizması aynen geçerlidir: her şey eskir; zincirler; NPC tabanı var ama
zayıf (çırak/kalfa kalitesi, 2–3 kat pahalı, sınırlı); **lonca tablosu** yerleşimde dolu/boş meslekleri gösterir ve
boş meslek refahı düşürür; kıtlık kazanç demektir ("Bu kasabada demirci yok" hazır siparişleri); makama aday
olmak için bir meslekte usta olmak gerekir [PARAMETRE].
Ek olarak: **teşekkür izi** — oyuncunun ürettiği ve teslim ettiği her iş, alıcının dönüş kartında adıyla görünür
("Saban'ın demirci Ayşe'den; bu yıl hasat %12 arttı"). Katkı soyut sayı değil, isimli bir iz olur.

### 5.6 Hal ve Meşrep
- **Hal:** can, kondisyon, gönül. Büyümez, dalgalanır; her birinin görünür etkisi var (Ek A §2.1, Ç5).
- **Meşrep:** üç eksen seçimi (Ek A §2.3); puan harcanmaz; NPC tepkisi ve olay seçeneklerini değiştirir.

## 6. Topluluk ve siyaset
Ek A §3 (hami, usta-çırak, ortak dert, şenlik, müdavim, lonca/ahi) ve Ek B (Sultan, 7 vali, Moğol, haraç,
meşruiyet, müzakereli özerklik, darbe zinciri, bağımsız devlet) bu belgeyle **onaylanmış tasarımdır**. Açık
kararlar [KARAR — Claude, 8 Kasım]: D-38 karışık atama; D-39 **7 bölge**; D-40 Sultan başta NPC; D-41 Moğol v1'de
oynanmaz; D-35/D-46 ceza yalnız bölge göstergelerine. Sayısal eşikler [PARAMETRE] olarak kalır, alfa ile ayarlanır.

## 6.1 Han hediyeleri ve yaş (Berkay, 9 Kasım) [KARAR]
- **Yaş sınırı şimdilik yok** (metin ve ileride ses masaları dahil). Mağaza yaş derecelendirmesi yayın öncesi ayrıca ele alınır.
- **İkram (akçeyle, handan):** masadaki biri hancının menüsünden ikram (şerbet, ekmek, yemek, gül suyu) sipariş edip
  masadaki birine gönderir. Ürün **handan satın alınır**: oyuncu hancıda akçe işletme kasasına girer (stok aşçıdan),
  NPC hancıda sabit pahalı menü ve akçe dünyadan çıkar. Etki: alanın gönlü küçük artış, ilişki küçük artış (tavanlı,
  azalan getiri), masaya anons. Anında tüketilir, devredilmez.
- **Armağan (envanterden):** oyuncunun kendi malı (demircinin kılıcı, dokumacının kumaşı) alanın envanterine geçer ve
  kullanılabilir; malda yapanın adı yazar (teşekkür izi/usta damgası). Servet pompalamaya karşı aylık tavan, aynı
  kişiye azalan getiri, hesap kümesi denetimi (Faz 3 hediye kuralları). Her yerde verilir; masada verilirse anons.
- **Debdebe armağanı (gerçek parayla, yalnız görünüş):** hil'at, gül yağmuru, sancak animasyonu; doğrudan sabit fiyat
  (premium para yok, D-18 önerisi). Alanda "X'in armağanı" rozeti/görünüşü; oyun etkisi yok; devredilemez, satılamaz,
  akçeye dönmez; hancıya ya da alana para payı yok; günlük sınır; Cömertler Levhası tutar/sıra göstermez.

## 6.2 Profil sayfası ve teveccüh (Berkay, 9 Kasım) [KARAR]
- GDD kuralları spontane yazıldı; bağlayıcı değil yön göstericidir. Gelir gerekir ama oyuncu küstürülmez:
  sonuç satılmaz; görünürlük, kimlik, rahatlık ve sınırlı **sosyal** avantaj satılabilir.
- **Profil sayfası:** her oyuncunun; kendisi "Karakterim"den, başkaları kişi/masa/listeden görür. Ad, yaş, meslek ve
  kademe, hane/hanedan, nam, teveccüh kademesi, armağan vitrini ("X'in armağanı"), şaheserler, Debdebe çerçevesi,
  ortak tanıdıklar; başkasında: dostluk, teklif, armağan, engelle, şikayet. Sahibi vitrinde gösterilecekleri seçer.
- **Teveccüh:** alınan hediyelerden (ikram, armağan, Debdebe armağanı) doğan ayrı itibar. **Oyunda işe yarar**:
  seçim/makam adaylığında sınırlı meşruiyet desteği, NPC ilk izlenimine küçük artı, hancı/aşçı/esnafa NPC müşteri ve
  sipariş önceliği, ozana sahne önceliği ve müdavim hızı, ahi başı adaylık şartı. Bilinçli "sosyal P2W": kendine değil,
  başkasından gelir.
- **Sınırlar [PARAMETRE] (Berkay, 9 Kasım: "zengin oyuncu etkisini görmeli"):** teveccüh hediyenin **tutarıyla**
  artar; veren başına tavan yok, farklı veren şartı yok. Debdebe (gerçek para) armağanı her kaynaktan tam sayılır.
  Akçeyle ikram/armağan aynı hesap kümesinden ya da aynı haneden gelirse sayılmaz (bedava akçe döndürerek teveccüh
  üretilmesin). Etki kademeleri görünür ve hissedilir; sönme çok yavaş (ödenen paranın etkisi kaybolmasın). Kademeyle
  gösterilir.

## 6.3 Barınma: aile evi (Berkay, 9 Kasım) [KARAR]
- Ailesinin evinde (ocak; yaşayan aile hanesi) kalan oyuncu konaklamış sayılır, evsizlik zincirine girmez.
- Memleketine dönüp aile evinde kalan oyuncu da evsiz sayılmaz (aradan geçen süre ve başka şehirde geçirilen zaman
  fark etmez). Şehirler arası göç geldiğinde (`barinma.ts` `OCAK_KONAKLAMA`) memleket = doğduğu yerleşim + aile hanesi
  yaşıyorsa kuralı uygulanır; hane tükenirse (aile kalmadıysa) bu hak düşer.

## 7. Yönetici paneli (yeni)

### 7.1 Rol ve yetki
- Sistem ilk günden **rol + yetki** ile kurulur. Bugün tek kullanıcı: **Kurucu** (Berkay). Sonra **Moderatör**
  eklenir; yetkiler tek tek verilir.
- **Moderatöre verilebilir:** şikayet kuyruğu, susturma, geçici uzaklaştırma (≤7 gün [PARAMETRE]), oyuncu geçmişi
  görüntüleme, ad değiştirme zorunluluğu.
- **Yalnız Kurucu:** akçe/eşya iadesi, işlem geri alma (telafi olayı), parametre değiştirme, kalıcı uzaklaştırma,
  Debdebe iadesi, dünya olayı (şenlik, ortak dert, duyuru), rol verme/alma.

### 7.2 Değişmez kurallar
- **Her yönetici işlemi kayda geçer:** kim, ne, ne zaman, hedef, **zorunlu gerekçe**. Kayıt yalnız eklenir; silinemez
  (Kurucu dahil).
- **Yönetici hesabı oyun karakterinden ayrıdır.** Yönetici kendi karakterine ya da kendi hesap kümesine iade/akçe
  veremez; sunucu reddeder.
- Hiçbir yönetici işlemi dünyayı sessizce değiştirmez: iade ve geri alma birer **telafi `WorldEvent`**idir; toplam
  akçe değişmezi bunları ayrıca sayar.
- Parametre değişikliği sürümlüdür; eski değer saklanır, tek işlemle geri alınır. Değerler kod sabitlerinin üstüne
  yazılan sunucu ayarıdır; ayar yoksa koddaki varsayılan geçerlidir.

### 7.3 Ekranlar
Oyuncu ara/kartı · şikayet kuyruğu · yaptırımlar · ekonomi sağlığı (toplam akçe, akış, şüpheli kazanç) ·
parametreler · dünya olayları ve duyuru · işlem kaydı · sunucu sağlığı ve ücretsiz kota kullanımı · Debdebe
satın alma/iade (Faz 11 ile).

### 7.4 Yer ve güvenlik
- **Sunucu:** `online-server/` içinde ayrı `/yonetim/*` uçları; ayrı yönetici oturum belirteci (oyuncu belirteciyle
  karışmaz), Google girişi + sunucuda kayıtlı yönetici e-posta listesi, oran sınırı.
- **Arayüz:** ilk sürüm **tek dosyalık web paneli** (`online-server/yonetim/`), Worker'dan statik sunulur. Telefon
  tarayıcısında çalışır. Uygulamaya gizli menü konmaz (APK'dan sızma ve kötüye kullanım riski).
- Ücretsiz kalır: ek servis yok.

## 8. Tek faz sırası

GDD §20 numaraları esastır. Eski depo planları içerik kaynağıdır.

| Sıra | Faz | İçerik | Eski depo planı |
|---|---|---|---|
| 1 | **K. Kapanış** | Faz 1 eksikleri (güvenli depo, `kapi.ts` bağı; Google girişi Berkay'ın istemci kimliğine bağlı), Faz 2 eksikleri (yarım istemci dalı, protokol tipleri, sim ölçütleri) | `FAZ_DURUM.md` "ilk 3 iş" |
| 2 | **M. Meslek çekirdeği** (sunucu) | 14 meslek verisi, ağaç modeli, temel iş/usta iş, azalan getiri, fırsat maliyeti, NPC taban arzı | `FAZ5_PLAN.md` (meslek kısmı) |
| 3 | **3 + E1 + E2** Dikey dilim | Hal göstergeleri; çiftçi + oduncu/madenci + demirci zinciri uçtan uca (sunucu + istemci); bir NPC gündemi; bir sözleşme; sosyal tepki; lonca tablosu | `FAZ3_PLAN.md` |
| 4 | **Y1** Yönetici çekirdeği | Rol/yetki, işlem kaydı, oyuncu ara, susturma/uzaklaştırma, şikayet kuyruğu, parametre katmanı | — |
| 5 | 4 Sosyal grafik ve bilgi | Üçgen, söylenti, hafıza | `FAZ4_PLAN.md` |
| 6 | 6 + E3 Ekonomi ve sanat | Pazar, sipariş, cüzdan, kademe/dal/usta-çırak/şaheser, Ustalar Levhası; Y2 ekonomi sağlığı | `FAZ5_PLAN.md` |
| 7 | 10 Han masası | Metin, butonlu eylemler, katılım listesi; moderasyon Y1'e bağlanır | — |
| 8 | 14, 12, 13 | Barınma, mülk, çalışan | — |
| 9 | E4 Kalan meslekler | 11 meslek, aile aile | — |
| 10 | 5, E5 | NPC gündemi, Meşrep | — |
| 11 | H Hanedan | Yaşlanma, ölüm, vâris | `FAZ7_PLAN.md` |
| 12 | 7 + P1–P4 | Kurum, makam, bölge, Sultan, haraç, Moğol, meşruiyet, özerklik | `FAZ8_PLAN.md` |
| 13 | 8 + P5–P6 | Çatışma, darbe, bağımsız devlet | `FAZ6_PLAN.md` |
| 14 | E6, E7 | Hami, ortak dert, şenlik, müdavim, lonca | — |
| 15 | 11 + Y3, 15 | Debdebe, ödeme (D-18/D-19 Berkay), hediye, sezon | — |
| 16 | 9 | Denge, yük testi, güvenlik denetimi — **yayın kapısı** | — |
| 17 | 16, 17 | Ses, diğer mülkler (yayın sonrası olabilir) | — |

Her faz: önce o faz için `docs/superpowers/plans/` altında plan, sonra uygulama, sunucu testleri, gerekirse mobil
`tsc` + i18n denetimi, 320/390 önizleme, inceleme ajanı.

## 9. Alt ajanlar [KARAR — Claude, 8 Kasım]
Berkay sayıyı bana bıraktı. Kota kuralı (ajan başına ~100 bin token) yüzünden **az ve keskin**:
- `online-sunucu` — `online-server/` modül ve test yazımı (Worker/DO, idempotent olay, tekrar güvenliği).
- `online-istemci` — `mobile/lib/online/` ve `mobile/app/online/` ekranları, 6 dil, önizleme.
- `denge-denetcisi` — salt okuma + test çalıştırma: farm, akçe değişmezi, P2W, gizli sayı, NPC tabanı denetimi.
Kod incelemesi mevcut `code-reviewer`, güvenlik `security-reviewer`, React `react-reviewer` ile yapılır.
Paralel en çok 2 ajan; her ajana tek iş, dosya yolları, bitiş ölçütü.

## 10. Kurucuya kalanlar (Berkay)
Google istemci kimliği ve dağıtım; ödeme/şirket/vergi (D-18, D-19); bölge ve yıl adlarının tarihî tonu (D-45)
isterse; parametrelerin alfa ayarı. Bunlar dışında yapım ajana aittir.

## 11. Yaklaşımlar
- **A. GDD'yi olduğu gibi uygulamak** (17 faz + E + P): çelişkiler (Ç1–Ç7) çözülmeden kod yazılır, iki numaralama
  karışır. Reddedildi.
- **B. Her şeyi baştan yazmak:** Faz 1–2'nin 67 testli kodu çöpe gider. Reddedildi.
- **C. Uzlaştır + mevcut kodu koru + tek sıra (seçilen):** mevcut sunucu korunur, çelişkiler bu belgede kapanır,
  meslek çekirdeği erkenden kurulur çünkü dikey dilim ona dayanır; yönetici paneli yayın kapısından önce gelir.
