# Çevrimiçi durum ve tasarım borcu (14 Kasım 2026)

Kaynak: GDD v0.4 + Ek A/B, sohbet odası araştırması §5–6, `DEVIR_2026-11-10.md` "atlanmasın" listesi ve 14 Kasım
kod denetimi. Bu belge yaşar: madde kapanınca satırı silinir, yenisi eklenmez. Eski `FAZ_DURUM.md` (3 Kasım) geçersizdir.

## 1. Sağlam alanlar (denetimde eksik görülmedi)
Zaman ve Dönüş Kartı · barınma zinciri · han metin masası ve ses sunucusu · Debdebe temel akışı · mülk çekirdeği ·
evlilik/hanedan/vasiyet/devir (akçe, envanter, nam) · lonca/zaviye/hami/meşrep/şenlik · siyaset P1–P6 · yönetici
paneli Y1–Y3 · şikâyet/engelleme · ilk oturum ekranları · beceri ağacı.

## 1b. Canlı test sunucusu (14 Kasım)
`https://kronikler-online-test.berkaycinkilic.workers.dev` (Cloudflare ücretsiz plan, ayrı test Worker'ı; `OTURUM_ANAHTARI`
ve `TEST_GIRIS_KODU` tanımlı). Canlı uçtan uca deneme geçti: test girişi, profil (ad kuralı), yerleşim, olaylar, sohbet
eylemi, kişi, gelen, kronik, lonca, barınma, han özeti, ilan panosu, göç/kervan önizlemesi (doğru kapılarla), siyaset,
hanedan, topluluk, Debdebe, pazar, mülk, bütün oturumları kapatma; iki oyunculu han masası (WebSocket bağlantı, oturma,
ileti yayını, masa başı yetkisi). Durable Object'ler arası çağrılar gerçek ortamda çalışıyor. Cihazda deneme test APK'sı ile.

## 2. 10 Kasım "atlanmasın" listesinin durumu
| Madde | Durum |
|---|---|
| Handa sesli sohbet | Kod tam. API biçimi resmî Cloudflare belgesi ve kitaplığıyla doğrulandı, kısmi başarı kuralı uygulandı (14 Kasım); ses ayrı hız kovasında. Kalan: Berkay'ın Realtime uygulaması + gerçek cihaz denemesi. |
| Oda özellikleri (liste/keşif, seviye, mini oyun, söz isteme) | Söz isteme, keşif sırası (tanıdık masası önce), masa ayarı (kavga yasak, kilit, ses), sohbet filtresi, müdavim rozeti ve eylem etkileri var (14 Kasım). Ozan sahnesi/atışması (H8) sunucuda var, istemci açık; masa türleri (H9) açık. |
| Düello, suikast, kan davası | Düello var (14 Kasım, §4.1: rızalı, sunucu çözer, kaybeden bir şey kaybetmez, mevsimde bir nam). Suikast ve kan davası ilk sürümde yok (§4.2). |
| Darbe ve bağımsız devlet, diplomasi | P5–P6 var. Akçe ganimeti bağlandı (14 Kasım). Mülk devri ve ittifak dışı anlaşmalar açık. |
| Kül Yemini mührü | Bağlandı (14 Kasım): 13 yaşında emanet, karakter sayfasından kabul; yemin etkisi H5 ile gelir. |
| E4 meslek etkileri | Kısmi (`gdd/E4_KANCA_ENVANTER_NOTU.md`). |
| Mahkeme ve tanıklık (D-28) | Bilerek ertelendi. |
| Google girişi | `GOOGLE_CLIENT_ID` bekliyor. Belirteç güvenli depoya taşındı (14 Kasım). |

## 3. Açık işler (öncelik sırasıyla)

### Han (GDD §16, araştırma §5–6)
| # | Eksik | Boyut |
|---|---|---|
| H8 | Ozan sahnesi ve ozan atışması: **sunucu var (15 Kasım, §4.8), istemci açık** (sahne/atışma paneli, kıta ve oy düğmeleri, `olay.han.atisma*`/`soylenti.han.atisma` metinleri 6 dilde). | orta |
| H9 | Meclis ve tüccar masa türleri; lonca ve zaviye masası; hancı/kâhya moderasyon yetkisi. Özel masa (davetli) var (14 Kasım). | orta |
| H10 | Handa NPC'ler (hancı, ozan, haberci). İlan panosu var (14 Kasım). | orta |
| H11 | Debdebe giriş anonsu. Sohbet balonu ve masa süsü var (14 Kasım). | küçük |
| H12 | Oda getirileri sunucuda var (14 Kasım): sandık ve han emaneti, ikamet verisi, özel görüşme. Açık: istemci ekranı; ikamete bağlı kapı. | küçük |
| H13 | Çoklu han (§4.9): sunucu var (15 Kasım); istemci açık (han seçici, `hanlar` kartları, `han` parametresi, yeni hata metinleri `han_gecersiz/han_yok/han_siniri`). Açık tasarım: paylaşımlı NPC talep havuzu. | orta |

### Dünya
| # | Eksik | Boyut |
|---|---|---|
| D1 | Göç ve emanet çekme var (14 Kasım). Açık: göç sırasında han masasına haber; müdavim rozetinin yeni yerde hesaplanması; yalnız son göçün emaneti çekilebilir. | küçük |
| D2 | Kervan sunucu ve istemcisi var (14 Kasım, §4.7). Açık: navlun, haydut ve muhafız ikinci dilim. | orta |
| D3 | Ölümde makamın devri (A-04a onay bekliyor). Mülk vârise geçiyor (14 Kasım); oyuncu borcu teklif taşıyıcısıyla geçiyor. | orta |
| D4 | Sahipsiz mülk: uzun yoklukta vekile devir ya da kamu açık artırması. | orta |
| D5 | Öğrenme döneminde meslek tadım turu (Ek A §2.4; kod genel sistem turu yapıyor, D-33 açık). | orta |
| D6 | Sunucudan push (dönüm, teklif). Barınma için cihazda yerel, isteğe bağlı hatırlatma var (14 Kasım); push için FCM kurulumu Berkay'da. | orta |

### Siyaset
| # | Eksik | Boyut |
|---|---|---|
| S3 | P6 ek anlaşma türleri: saldırmazlık, ticaret, ortak savunma. | orta |
| S4 | Beylikler arası ilanlı savaş kuyruğu (N-7/N-11). | büyük |
| S5 | 14 meslek gelir dengesi (sim 6 mesleği ölçüyor). | orta |

### Gelir
| # | Eksik | Boyut |
|---|---|---|
| G1 | İstemcide mağaza satın alma ve iade bildirimleri (RTDN, App Store V2). Sırlar olmadan açılmaz. | orta |

## 4. Tasarım kararları (ilk sürüm)
Süzgeç: zamanlayıcı baskısı yok, kayıp tavanlı, parayla atlatma yok, farm yok, sessizlik teslimiyet değil, gizli sayı yok.
Dayanak: GDD §11 ("ölüm mümkün ama zor; suikast ve kalıcı karakter silme ilk sürümde yok"), §16 ("meydan okumanın
sonucu ilk sürümde nam ve şerefle sınırlı, ağır kayıp yok"), `OYNANIS_TASARIMI.md` §7 ve §13.

### 4.1 Düello (han masasında "Meydan oku")
- **Rıza:** meydan okunan oyuncu aynı masada "kabul" ederse düello olur. Kabul etmemek ya da yanıtsız kalmak hiçbir şey
  kaybettirmez; teklif masa dağılınca düşer. Masa başı "kavga yasak" seçtiyse meydan okunamaz.
- **Kapılar:** iki taraf da 16–65 yaşında ve yerleşimde en az 7 gündür. Aynı hane ya da hesap kümesi düello edemez.
- **Çözüm:** sunucu çözer; istemci sonuç gönderemez. Güç = dövüş becerisi + güç + çeviklik + dayanıklılık + Hal
  (kondisyon) + zar; döküm iki tarafa ve tanıklara kalem kalem gösterilir.
- **Sonuç:** kazanan mertlik namı alır (aylık nam tavanı içinde); kaybeden nam, akçe ya da mal kaybetmez. İki taraf da
  birer takat harcar. Bahis ve akçe ödülü yoktur (servet pompalanamaz).
- **Tanıklık:** masada oturanlar olayı bizzat görür, diğerleri söylentiyle duyar (H5 köprüsü).
- **Farm süzgeci:** aynı çift mevsimde (3 ay) bir kez nam üretir; sonraki düellolar yalnız kayda geçer.
- **Ertelenen:** yaralayan kavga ve ölümüne düello (suikastle birlikte).

### 4.2 Suikast ve kan davası — ilk sürümde yok
GDD §11 gereği. Tasarım `OYNANIS_TASARIMI.md` §7 ve §13'te hazır (en az 2 mevsim hazırlık, işaretler, %30 taban şans,
48 saat çevrimdışı koruması, yılda bir girişim, kadı ve kanıt eşiği, katil mirasçı olamaz). Ön koşulları: mahkeme ve
tanıklık (D-28), ölümde mülk devri (D3). Kan davası kanıtlanmış ölümden doğar; ölüm gelmeden açılmaz. Bugünkü husumet
ve arabuluculuk (E4.3-D) bunun barışçıl alt basamağıdır.

### 4.3 Kül Yemini mührü
- 13 yaşında yerleşimin en yaşlısı mührü emanet eder (olay bugün düşüyor). Oyuncu karakter sayfasından **mührü
  kabul eder**; süre baskısı yoktur, mühür kaybolmaz, kabul etmemek ceza getirmez.
- Kabul eden karakterin han yeminleri "mühürlü" sayılır: yeminin nam etkisi (H5) yalnız mühürlü yeminde işler ve
  tanıklık olayına mühür işareti düşer. Mühür satın alınamaz, devredilemez; vârise geçmez, vâris 13 yaşında kendi
  mührünü alır.
- Tek oyunculudaki nesiller aşan destan çevrimiçine taşınmaz (çevrimiçi, tek oyunculuyla içerik paylaşmaz; A-14/D-11
  onay bekliyor). Çevrimiçi destan ayrı bir içerik işi olarak Berkay'ın kararına kalır.

### 4.4 Darbe ganimeti yalnız akçe
Kaybeden taraftan akçesinin en çok %25'i alınır ve kazananlara bölünür; mülk alınmaz. Neden: tapu yerleşime bağlıdır ve
kazanan çoğu zaman başka yerleşimdedir; mülk kaybı emekle uzun sürede telafi edilir (pusula 8); GDD N-5'teki "en çok
1 mülk" bir üst sınırdır, zorunluluk değildir. `siyaset/ganimet.ts` saf mülk hesabı ileride açılırsa diye duruyor.

### 4.5 Göç (D1, ilk sürüm)
- **Ne:** karakterin yerleşimini kalıcı değiştirmesi (GDD §5 "yollar", D-16 "diğer şehirler"). Ziyaret/yolculuk ve
  kervan ayrı iştir (D2).
- **Kapılar:** 16 yaş ve üstü, ölü değil; kendi işletmesi yok (önce devreder); makamı yok (önce çekilir); açık darbe
  tarafı değil; açık borç senedi yok. Göçten sonra 12 oyun ayı (6 gün) yeniden göç yok.
- **Giden:** akçe (yol bedeli küçük ve sabit, dünyadan çıkar), envanter (taşıma sınırı üstü yerleşimde emanete kalır),
  özellik, beceri, meslek ve beceri ağacı, nam, teveccüh, Kül Yemini, Debdebe (hesapta). **Kalan:** yerleşimin NPC
  görüşleri ve tanıdıklar (yeni yerde sıfırdan; eski yerde "göç etti" anısı), hane NPC'leri (akrabalık kaydı korunur).
- **Varış:** hedef şehirde misafirhane hakkı 12 saat, şehir başına bir kez (`barinma.ts` hazır). Yerleşimin kroniğine
  "X göç etti" / "X geldi" satırları.
- **Teknik:** HesapDO yürütür, üç adım ve her biri `istekNo` ile tekrar güvenli: (1) eski YerlesimDO karakteri
  mühürler ve göç paketini verir, (2) yeni YerlesimDO paketle sakin kaydeder, (3) eski YerlesimDO kaydı kapatır. Adım
  arası kesintide HesapDO kalıcı kuyruğu yeniden dener; akçe ve mal iki yerde birden var olmaz.

### 4.7 Kervan (D2, ilk sürüm)
Dayanak: `MESLEK_AGACLARI.md` tüccar ağacı `tuccar.kervan.0–1`, `tuccar.yol.0`; Ek A §1.3 tedarik zinciri.
- **Kim:** `tuccar.kervan.0` düğümü olan tüccar (sunucuda `hakAcik`/düğüm denetimi). Bedel: 2 nal + 1 koşum + 2 takat.
- **Ne:** en çok 12 malı aynı beylikteki başka yerleşime ya da komşu beyliğin yerleşimine yollar. Tüccar evinde kalır; mal
  yolda 1 oyun ayı (12 gerçek saat) gider. Bu bir bekleme değil yolculuktur: bekleme parayla kısaltılmaz, beklerken başka
  iş yapılır, gecikme ceza getirmez.
- **Varış:** mal hedefin NPC alıcısına hedefin fiyatıyla (hedefteki kıtlık primi dahil) ve tüccarın o yerleşimdeki aylık
  varış kotasıyla satılır. Satılmayan mal tüccarın envanterine geri döner (14 Kasım kararı: yolda ya da hedefte mal
  takılı kalmaz). Hasılat tüccara döner. Akçe yoktan doğmaz: satış mevcut `npcyeSat` kuralıyla yapılır.
- **Durum (14 Kasım):** sunucu bitti (583 test); istemci ekranı sırada. Haydut/muhafız ve navlun ikinci dilim.
- **Farm süzgeci:** tüccar başına ayda en çok 2 kervan; aynı mal aynı hedefe ayda bir; varış kotası; kendi yerleşimine
  kervan yok. Fiyat farkı kıtlıktan gelir, kıtlık satışla kapanır (kendi kendini dengeler).
- **Toplu yük (`tuccar.kervan.1`):** arabayla 30 mal; başkasının malını navlunla taşıma ikinci dilimdir.
- **Fiyat haberi (`tuccar.yol.0`):** 1 takatle komşu 3 yerleşimin lonca tablosu ve en pahalı 3 malı (1 ay geçerli).
- **Haydut ve muhafız:** ikinci dilim (asayiş ortak derdi ve asker hizmeti ile birlikte).
- **Teknik:** kaynak YerlesimDO malı kervan kaydına alır (envanterden düşer); varış ayında hedef YerlesimDO satışı yapar;
  hasılat kaynak YerlesimDO'ya kalıcı çıkış kutusuyla döner (işletme transferi deseni). Her adım işlem kimliğiyle tekrar
  güvenli; mal ve akçe iki yerde birden var olmaz.

### 4.6 Han eylem etkileri (H5)
Yemin → mertlik (mühürlü, çift başına ayda bir). Sözleşme ve ittifak kabulü → iki taraf arasında küçük olumlu iz.
İhbar → hedef hakkında yalanlanabilir söylenti; ihbar edene kazanç yok. Hepsinde masadakiler tanık, diğerleri duyum.

### 4.8 Ozan sahnesi ve atışma (H8)
- **Sahne:** oturan biri açar, anlatıcı olur; açıkken yalnız anlatıcı ve onun ya da masa başının söz verdiği oturanlar
  yazar (`sozIste`/`sozVer` oturanlara da işler). Anlatıcı ya da masa başı kapatır; anlatıcı kalkınca/çıkınca biter.
  Masa başı `sahneYasak` ayarıyla sahneyi kapatabilir. Ozan meslekliye plakada yalnız görünür "ozan" işareti.
- **Atışma:** rızalı teklif (eylem `atisma`, düello kalıbı; taraf kalkınca teklif düşer). Kabulde sırayla a, b… her biri
  3 kıta (`ATISMA_KITA`); bu sırada kimse serbest yazamaz, söz isteyemez. Sonra oylama: o anda oturan, taraf olmayan
  herkesin bir değişmez oyu. Herkes oyunca ya da taraf/masa başı kapatınca biter; zamanlayıcı yok. Oy yoksa hükümsüz,
  eşitlikte berabere. Taraf kalkarsa ya da kıta aşamasında kapatılırsa iptal.
- **Ödül yalnız anılma:** masa olayı (`atismaSonuc`) + yerleşimde tanıklık ve kazanan hakkında söylenti (bakış etkisi 0).
  Akçe, nam, XP, teveccüh yok; kaybeden bir şey kaybetmez. Sahne ve atışma aynı masada aynı anda olmaz.

### 4.9 Çoklu han (15 Kasım, sunucu)
- **Yuva:** şehir 5, kasaba 2 han; köyde oyuncu hanı yok (yalnız NPC hanı; oda/masa/pano çalışır). 1. han bugünkü han
  (kimlik/masa adı aynı; sahipsizken NPC). 2.+ yuva arsadır: edinilince han olur; sahipsiz arsa listede yok, masası yok.
- **Boyut/bedel:** edinim şehir 600, kasaba 250; bakım şehir 10, kasaba 6; oda kapasitesi şehir [5,8,11,14,18], kasaba
  [3,5,7,9,12]. Masa sayısı zaten yerleşim türüne göre (şehir 8, kasaba 4, köy 2); değişmedi.
- **Sınır:** kişi aynı yerleşimde en çok 1 han (`han_siniri`; edinim ve devirde); kişi başı 2 mülk sürer.
- **Rekabet:** ödeme (kira, ikram, ziyafet) seçilen hanın kasasına; fc han başına. Günlük ikram/ziyafet/eylem/pano
  tavanları, tek oda, kendi hanına kira yok, aynı küme bayrağı kişi başınadır. NPC gelir formülü değişmedi.
- **Han başına:** müdavimlik, pano, masa ayarı, keşif sırası. Söylenti/tanıklık yerleşim düzeyinde.
- **Kapanış:** 1. han iflasta NPC'ye döner, diğeri kapanır; peşin kira bitişe dek geçerli, sandık/emanet yerleşimde.
- **Protokol:** `?han=N` (GET /v1/han, /v1/han/pano, /v1/barinma, masa baglan/ses) ya da gövdede `han`; yoksa 1. han.
- **Alt istek bütçesi:** GET /v1/han yalnız seçili hanın masalarını canlı sorar; diğer kartların masa özeti yerleşimin
  doluluk kaydından (MasaDO değişince mutlak değer bildirir). Testle kilitli: ≤ 12 alt istek.

### 4.10 Tezgâh modeli: dükkân ve atölye (16–17 Kasım)
Tasarım `docs/superpowers/specs/2026-11-16-tezgah-modeli-design.md`, protokol `…-tezgah-istemci-brief.md`.
- **Dilim 1 (dükkân, han yolcu havuzu):** sunucu ve ekranlar bitti; denge denetimi düzeltmeleri işlendi.
- **Dilim 2 (atölye) sunucusu bitti, denge denetiminden geçti (17 Kasım):** zanaat, atölyede üretim, emek havuzu, üretim
  emri, toplu sipariş, genişletme. Denetimde kapatılanlar: maaşı emanetten karşılanmayan NPC emek vermez ve NPC işe alımı
  emanet ister; iflas eden atölyede yazma uçları reddeder; reddedilen toplu teslimde mal ve sipariş geri gelir; edilgen
  atölyenin aylık net kazancı 35 akçeyle sim testinde kilitli (bağlayan sınır meslek bütçesi).
- **Atölye ekranı yok** (sıradaki iş). Dilim 3 (meslek kancaları) ve Dilim 4 (eşya kademeleri) tasarımda.
- Bilinen küçük açıklar: işletme yansısı geç gelirse maaşı biten NPC bir ay daha emek verebilir; deposu iade edilmiş
  iflas atölyesinde reddedilen toplu teslimin malı teslim edene döner (karakter yüklü değilse dönmez); reddedilen teslim
  o ayı "üretimli" saymaya devam eder.

### 4.11 Canlı etkinlikler (16 Kasım)
Yönetici panelinden başlatılıp durdurulan 18 etkinlik; kapsam dünya, beylik, yerleşim türü ya da tek yerleşim.
Plan ve kurallar: `docs/online/ETKINLIKLER.md`. Yönetici girişi için `YONETIM_GOOGLE_CLIENT_ID` ve `YONETICI_EPOSTALAR`
henüz tanımlı değil (Berkay ile birlikte).

### 4.12 Denetim 17 Kasım (arkadaş denemesi öncesi; testler `test/denetim-17kasim.test.ts` ve ilgili dosyalar)
- E1 İşletme devri: fiyat edinim bedelinin ×0,5–×2 bandında; aşan kısım armağan tavanına; kümede fiyatsız; 12 ay soğuma.
- E2 Zaviye kasası dağılınca yatıranlara oranlı döner, artan hazineye; üye başı aylık yatırma tavanı 200.
- E3 Teveccühe veren-alan çifti başı aylık tavan 20; oyuncu hanında küme ödemesi kasaya girmez, kişi başı ayda 20 akçe üstü armağan tavanına sayılır.
- E4 Etkinlik parametrelerinde çapraz kural kırpması (tek ve ikili birleşimler); Panayır stok indirimi kalktı, Lonca ×1,06.
- E5 Debdebe süre kısaltma ürünleri kaldırıldı; Debdebe teveccühü ekonomik etkilere (sipariş önceliği, ahi, müşteri) sayılmaz.
- E6 Vakıf Günü / Göç Dalgası NPC'lerin oyuncudan alım kotasını gerçekten artırır (`satisEk`).
- E7 Ortak dert ve şenlik katkı sayacı defterden ayrı (`ks`): defter dolsa da tavan ve tek sefer ödül korunur.
- E8 Sahipsiz ilan iadesinde stok tavanını aşan mal taban değeriyle hazineye.
- E9 Oyun karakteri olmayan yönetici telafi verebilir.
- E10 Vâris ölünün o ayki `ns`, `tb`, `ek` (ve armağan) sayaçlarını devralır.
- S1 `ZAR_SIRRI` yok/kısaysa yedek yalnız `ZAR_YEDEK_IZINLI=1` iken; değilse zar isteyen yazma `yapilandirma_eksik`. İki Worker'da da sır tanımlı olmalı.
- S2 YerlesimDO ve IsletmeDO istek sırası (bolge-do kalıbı; DO→DO iç iletiler sırasız, kilitlenme yok); hata olunca bellekteki kasaba atılır.
- S3 HesapDO istek sırası (iç iletiler ve masa şikâyeti sırasız).
- S4 `GET /v1/dunya` 45 sn kenar önbelleği.
- S5 Test girişi: cihaz başına dakikada 10, IP başına saatte 5 yeni hesap; yeni hesapta cihaz kimliği 22+ karakter (eski hesaplar girer).
- S6 Davetle kayıt üst sınırı ev kapasitesi × 1,25.
- S7 1 MB'yi aşan depo değeri uyarı logu (anahtar ve boyut).
- S8 Uzlaşma notu tek satır, maskeli, uzunluk temiz metinle.
- S9/S10 Yöneticinin hesabına yalnız kurucu yaptırım verir, kendine yok; hedef yaptırım listesi son 50 (etkinler kalır).
- S11 Masa doluluk bildirimi 3 sn içinde birleştirilir.
- S12 Ad benzersizliğinde ı/i/l katlanır (yeni adlar; eski çakışanlar bozulmaz).
- S13 İstek izi 24 saat ve 1000 kimlikle sınırlı.
- F1 Süre eşikli testler (hanedan-sim, sim, gündem) 500 ms; tam takım 5 kez art arda temiz.
- B (18 Kasım ekonomi denetimi B, `test/ekonomi-denetim-b.test.ts`; yönetici/kurucu sınırsız, tavanlar yalnız oyuncu-oyuncu):
  B1 tazminat yalnız bir tam ay çalışılmış sözleşmeye, armağan tavanına sayılır (`hv`/`ha`), aynı işveren-çalışan 12 ay yeniden işe alınamaz;
  B2 devirde kasa+emanet eski sahibe iade (alıcıya geçmez, mirasta kalır), depo/raf malı adil değerle (×0,9–×1,5) devir bandına girer;
  B3 girişte IP'nin HMAC özeti (`OTURUM_ANAHTARI` tuzlu, ham IP yok; son 3) karakter/sakin `kk`; `ayniKume` ve `kumeAnahtarlari` okur;
  B4/B7 han ikramı, ziyafeti ve kirasında armağan kısmı sahibin `ha`sına da; sahibin aylık serbest han geliri 300 (üstü armağan); kirada küme ödemesi dünyadan çıkar;
  B5 siyasi kimlik ve NPC görüşü ekonomik teveccüh (Debdebe hariç); B6 zaviye `ver` tavanı ayrı `vs` sayacında;
  B9 mirasta devir soğuması taşınır; B10 `kn`,`tz`,`ai`,`ef`,`hk`,`hsg`,`kk` ve zaviye/teveccüh yerel kimlikli sayaçları vârise geçer;
  B11 stok tavanını aşan sahipsiz mal yok olur, hazineye akçe yazılmaz (E8'in yerine).

## 5. Berkay'ın kararına bağlı gerilimler
- **Süre kısaltma satışı:** 17 Kasım denetimiyle kaldırıldı (E5); geri getirmek Berkay kararı.
- **Debdebe armağanı teveccühü:** görünen kademeye tam sayılır; 17 Kasım'dan beri ekonomik etkilere (sipariş önceliği,
  ahi şartı, NPC müşteri) sayılmaz (E5). Seçim liyakati hâlâ görünen kademeyi okur.
- **Açık kararların koddaki öneri değerleri:** D-17 edinim eşiği, D-21 yoksunluk değerleri, D-22 uyku, D-23 imaret
  konaklaması koda "öneri" etiketiyle girdi.
- **Yaş:** handa ve seste yaş sınırı yok (Berkay). Mağaza yaş derecelendirmesi yayın öncesi doğrulanmalı (D-24).
