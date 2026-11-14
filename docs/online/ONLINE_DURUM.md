# Çevrimiçi durum ve tasarım borcu (14 Kasım 2026)

Kaynak: GDD v0.4 + Ek A/B, sohbet odası araştırması §5–6, `DEVIR_2026-11-10.md` "atlanmasın" listesi ve 14 Kasım
kod denetimi. Bu belge yaşar: madde kapanınca satırı silinir, yenisi eklenmez. Eski `FAZ_DURUM.md` (3 Kasım) geçersizdir.

## 1. Sağlam alanlar (denetimde eksik görülmedi)
Zaman ve Dönüş Kartı · barınma zinciri · han metin masası ve ses sunucusu · Debdebe temel akışı · mülk çekirdeği ·
evlilik/hanedan/vasiyet/devir (akçe, envanter, nam) · lonca/zaviye/hami/meşrep/şenlik · siyaset P1–P6 · yönetici
paneli Y1–Y3 · şikâyet/engelleme · ilk oturum ekranları · beceri ağacı.

## 2. 10 Kasım "atlanmasın" listesinin durumu
| Madde | Durum |
|---|---|
| Handa sesli sohbet | Kod tam. API biçimi Cloudflare kitaplığıyla doğrulandı (14 Kasım), ses ayrı hız kovasında. Kalan: Berkay'ın Realtime uygulaması + gerçek cihaz denemesi. |
| Oda özellikleri (liste/keşif, seviye, mini oyun, söz isteme) | Söz isteme var. Keşif sırası, masa ayarı, ozan sahnesi/atışması yok → §3 Han. |
| Düello, suikast, kan davası | Yok → §4 tasarım. |
| Darbe ve bağımsız devlet, diplomasi | P5–P6 var. Akçe ganimeti bağlandı (14 Kasım). Mülk devri ve ittifak dışı anlaşmalar açık. |
| Kül Yemini mührü | Bağlandı (14 Kasım): 13 yaşında emanet, karakter sayfasından kabul; yemin etkisi H5 ile gelir. |
| E4 meslek etkileri | Kısmi (`gdd/E4_KANCA_ENVANTER_NOTU.md`). |
| Mahkeme ve tanıklık (D-28) | Bilerek ertelendi. |
| Google girişi | `GOOGLE_CLIENT_ID` bekliyor. Belirteç güvenli depoya taşındı (14 Kasım). |

## 3. Açık işler (öncelik sırasıyla)

### Han (GDD §16, araştırma §5–6)
| # | Eksik | Boyut |
|---|---|---|
| H1 | Keşif sırası: tanıdığın oturduğu masa → yeri olan → boş. Harcama sırayı etkilemez. | küçük |
| H2 | Masa ayarı: masa başı "kavga yasak", masa kilidi ve sessiz masa seçer (bugün ayarı yazan yok). | küçük |
| H3 | Sohbet küfür filtresi (6 dil) ve yeni hesaba ilk saatlerde kısa ileti sınırı. | orta |
| H4 | Şikâyet kaydına masa kimliği. Müdavim rozeti plakada. | küçük |
| H5 | Butonlu eylemlerin oyun etkisi: yemin, sözleşme, ittifak, ihbar bugün yalnız masa kaydı. Katılım listesi yerleşim olayına ve söylentiye girmeli ("orada olan bilir, diğerleri sonradan duyar"). | büyük |
| H6 | Meydan okuma sonucu (düello, §4). | orta |
| H7 | Akçeyle ziyafet (nam olayı) ile Debdebe ziyafet afişi (yalnız görüntü) ayrımı. | orta |
| H8 | Ozan sahnesi (tek anlatıcı, dinleyici söz ister) ve ozan atışması (masadakilerin ücretsiz oyu, ödül yalnız anılma). | orta |
| H9 | Masa türleri özel/meclis/tüccar; lonca ve zaviye masası; hancı/kâhya moderasyon yetkisi (mülk yetki matrisinden). | orta |
| H10 | Handa NPC'ler (hancı, ozan, haberci) ve ilan panosu. | orta |
| H11 | Debdebe yüzeyleri handa: sohbet balonu, masa süsü, giriş anonsu. | orta |
| H12 | Oda getirileri: özel görüşme, sandık, ikamet şartı (bayraklar var, kullanan yok). | büyük |

### Dünya
| # | Eksik | Boyut |
|---|---|---|
| D1 | Seyahat/göç: başka şehre gitme uçları yok; "başka şehirde 12 saat" koruması bu yüzden hiç tetiklenmiyor. | büyük |
| D2 | Kervan ve şehirler arası ticaret; menzil han; yeni işletme türleri (hamam, kervansaray, imaret, bedesten). | büyük |
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

### 4.5 Han eylem etkileri (H5)
Yemin → mertlik (mühürlü, çift başına ayda bir). Sözleşme ve ittifak kabulü → iki taraf arasında küçük olumlu iz.
İhbar → hedef hakkında yalanlanabilir söylenti; ihbar edene kazanç yok. Hepsinde masadakiler tanık, diğerleri duyum.

## 5. Berkay'ın kararına bağlı gerilimler (koda dokunulmadı)
- **Süre kısaltma satışı:** Debdebe kataloğunda gerçek parayla beceri süresi kısaltma var (`kisaltma_*`, karakter başına
  en çok 3). 9 Kasım beceri ağacı spec'i bunu istiyor; GDD D-14/D-15 ve "parayla atlatma yok" süzgeci yasaklıyor.
  `DEBDEBE_ACIK` kapalıyken çalışmaz. Yayın öncesi tek karar gerekir.
- **Debdebe armağanı teveccühü:** 9 Kasım kararıyla ("zengin oyuncu etkisini görmeli") tam sayılıyor. Teveccüh kademesi
  işletmenin NPC müşteri gelirine (kademe × %5, seviye tavanlı), seçim liyakatine (tavan 6) ve ahi başı adaylığına
  giriyor; yani gerçek para dolaylı oyun gücü veriyor. GDD "Debdebe yalnız görünüş" der.
- **Açık kararların koddaki öneri değerleri:** D-17 edinim eşiği, D-21 yoksunluk değerleri, D-22 uyku, D-23 imaret
  konaklaması koda "öneri" etiketiyle girdi.
- **Yaş:** handa ve seste yaş sınırı yok (Berkay). Mağaza yaş derecelendirmesi yayın öncesi doğrulanmalı (D-24).
