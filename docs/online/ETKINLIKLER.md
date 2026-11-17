# Canlı etkinlikler — plan ve proje

Kurucu, yönetici panelinin **Etkinlikler** sekmesinden bir etkinliği seçer, kapsamını ve süresini belirler, **Eventi başlat**'a basar.
Etkinlik oyunda hemen açılır; **Eventi durdur** anında kapatır. Kod: `online-server/src/etkinlik/`, panel `src/yonetim/panel.ts`,
oyuncu bandı `mobile/lib/online/etkinlik-ui.tsx`, metinler `mobile/lib/i18n-sayfa/online17.ts`, testler `test/etkinlik.test.ts`.

## 1. İlkeler (TASARIM_PUSULASI süzgeci)
- **Ücretsiz ve eşit:** katılım akçe istemez, Debdebe ile hızlanmaz. Bütün oyuncular aynı ödülü görür.
- **Kayıp cezası yok:** kaçıran oyuncu hiçbir şey kaybetmez. Etkinliğin açtığı ortak dert başarısız olursa ya da erken biterse bölge göstergesi düşmez.
- **Zamanlayıcı baskısı yok:** süre gerçek saattir. Katılım, açık kaldığı süre boyunca istenen an yapılır.
- **Farm yok:** etkinlik başına karakter başına bir kez katılınır (iz `kar.ek`, son 24 etkinlik). Katılım 1 takat ister. Nam aylık tavan (3) içinde kalır. Mal armağanı en çok 2 düşük değerli maldır. Akçe yaratılmaz.
- **Denge sınırı:** parametre değişimleri yönetici parametre sınırlarına kırpılır (ör. NPC çarpanı 1,5'in altına inmez). Üst üste binen etkinlik de bu sınırı aşamaz.
- **Yetki ve kayıt:**
  - Listeyi Kurucu ve Moderatör görür; başlatma ve durdurma yalnız Kurucu yapar.
  - Her deneme işlem kaydına girer; başarılı işlemler gerekçe ve ayrıntıyla, reddedilenler de kayda geçer.
  - Yazan istekler `istekNo` ile tekrar güvenlidir.

## 2. Kapsam: bölgeye özel etkinlik
| Kapsam | Hedef | Kullanım |
|---|---|---|
| Bütün dünya | — | Bayram, genel şenlik |
| Bir beylik | Beylik kimliği | Bir bölgeyi canlandırmak |
| Yerleşim türü | Bütün şehirler / kasabalar / köyler | Köylere oyuncu çekmek, şehirleri rahatlatmak |
| Tek yerleşim | Belirli şehir, kasaba ya da köy | Hedefli canlandırma ya da boşaltma |

Panelde **Oyuncu sayılarını getir** her yerleşimin oyuncu sayısını gösterir: tablo ve seçim listeleri. Kalabalığı dağıtmak için boş yerlerde çekici bir etkinlik açılır (Panayır, Kervan Mevsimi, Bereket, Göç Dalgası). Sakin bir yer de aynı yolla canlandırılır.
Aynı tür etkinlik, ortak yerleşimi olan iki kapsamda aynı anda açılamaz (`etkinlik_suruyor`); farklı yerlerde açılabilir. Aynı anda en çok 6 etkinlik açık kalabilir.

## 3. Süre
1, 3, 6, 12 saat; 1, 2, 3, 7 gün; ya da **durdurana kadar**. Her etkinliğin varsayılan bir süresi vardır. En uzun süre 14 gündür.
Süresi dolan etkinlik kendiliğinden biter ve geçmişe "süresi doldu" olarak düşer. Durdurulan etkinlik geçmişe durduran kişi ve açık kaldığı süreyle yazılır.

## 4. Anlık dağıtım (teknik)
1. YonetimDO etkin listeyi `etk:aktif` anahtarında tutar; geçmiş `etk:gecmis` anahtarında (son 30 kayıt).
2. YerleşimDO her istekte `parametrelerCalisma {yerlesim}` çağırır. Yanıtta yönetici parametreleri ve bu yerleşimi kapsayan `ETKINLIKLER` listesi gelir.
3. `motor.parametreleriGuncelle` iki iş yapar:
   - Parametre değişimlerini uygular (`parametreUygula`).
   - Birleşik etkiyi `kasaba.pr.ETK` alanına yazar (`etkiBirlestir`): bac, ilan tavanı, kervan tavanı, vergisiz, dertler.
4. `motor.etkinlikSenkron` etkinlik dertlerini eşler. Yeni etkinliğin derdini açar; biten ya da durdurulan etkinliğin derdini aynı istekte kapatır.
   YonetimDO yanıt vermezse etkinlik durumu bilinmiyor sayılır ve dertlere dokunulmaz.
5. Oyuncu `/v1/yerlesim` yanıtında `etkinlikler` alanını alır: ödül, süre, katılım durumu ve meslek çarpanı.
6. Katılım isteği `POST /v1/etkinlik {id, istekNo}` biçimindedir. Topluluk yazma kabuğundan geçer: istekNo, karakter kaydı ve defter.

Durdurma "anlık"tır: oyuncunun bir sonraki dokunuşunda (yerleşim isteği) etki söner. Ay dönümü alarmında da aynı eşleme çalışır.

## 5. Etkinlik kataloğu (18)
Katılım sütununda ödül "nam · gönül · mal" sırasıyla verilir; listelenen mesleklerde nam ve gönül iki kattır.

| # | Etkinlik | Varsayılan | Sistem etkisi | Katılım ödülü | İki kat |
|---|---|---|---|---|---|
| 1 | Şenlik Günü | 24 sa | Pazar bacı %5 → %2,5 | +1 cömertlik · +5 gönül | ozan, aşçı, hancı |
| 2 | Bereket Mevsimi | 48 sa | Temel iş çıktısı +1, NPC satış fiyatı ×0,8 | +1 çalışkanlık · +2 · 2 buğday | çiftçi |
| 3 | Kıtlık | 48 sa | Kıtlık ortak derdi açılır, eksik meslek primi ×2 | +1 cömertlik · +3 | çiftçi, aşçı, hancı |
| 4 | Kervan Mevsimi | 72 sa | Tüccar başına aylık kervan +1 | +1 çalışkanlık · +2 | tüccar |
| 5 | Ozan Gecesi | 6 sa | Hanlarda sahne ve atışma akşamı | +1 mertlik · +4 | ozan |
| 6 | Panayır | 48 sa | Bac 0, ilan tavanı +3 | +1 cömertlik · +2 | tüccar |
| 7 | Haydut Baskını | 24 sa | Haydut ortak derdi (mal/akçe kaybı yok) | +1 mertlik · +2 | asker, demirci |
| 8 | Salgın | 24 sa | Salgın ortak derdi (ölüm yok) | +1 dindarlık · +2 | şifacı, aşçı |
| 9 | Vakıf Günü | 24 sa | NPC aylık alım kotası +2 | +2 cömertlik · +3 | hancı, kâtip |
| 10 | Düğün Mevsimi | 48 sa | NPC satış fiyatı ×0,9 | +1 cömertlik · +6 | aşçı, ozan |
| 11 | Lonca Yarışması | 72 sa | Lonca siparişi ödülü ×1,06 (çapraz kural: < 1,6) | +1 çalışkanlık · +2 | demirci, marangoz, dokumacı |
| 12 | Pehlivan Şenliği | 24 sa | Düello ve meydan okuma günü | +2 mertlik · +3 | asker |
| 13 | Sultan'ın Fermanı | 48 sa | Han ikramı, ziyafet, oda kirasında vergi 0 | +1 dindarlık · +3 | kâtip, divan |
| 14 | Kış Kıyamet | 48 sa | NPC satış fiyatı ×1,2, kıtlık primi ×1,5 (üretene kazanç) | +1 cömertlik · +3 · 2 odun | oduncu |
| 15 | İlim Haftası | 72 sa | Medrese açık | +1 çalışkanlık · +3 · 1 kâğıt | kâtip, divan |
| 16 | Göç Dalgası | 48 sa | NPC aylık alım kotası +1 | +1 cömertlik · +3 | hancı, arabulucu |
| 17 | Hasat Bayramı | 48 sa | Hasat ortak derdi, temel iş çıktısı +1 | +1 çalışkanlık · +3 · 2 ekmek | çiftçi |
| 18 | Kayıp Hazine | 24 sa | Hazine arayışı | +1 mertlik · +2 · 1 bakır | tüccar, kâtip |

Ortak dertli etkinliklerde (Kıtlık, Haydut, Salgın, Hasat) asıl oyun derde katkıdır. Katkıyı oyuncu Topluluk sayfasından verir; meslek katkı çarpanları mevcut ortak dert kuralındadır.
Aynı türde açık bir dert zaten varsa ikincisi açılmaz; etkinlik o derde katılır.

## 6. Oyuncu deneyimi
- Yaşam ekranında, "Şimdi" rehberinin üstünde **Canlı etkinlik** bandı görünür. Bantta şunlar bulunur:
  - etkinliğin simgesi ve adı;
  - kalan süre ya da "Bitişi duyurulana kadar sürer" yazısı;
  - etkinliğin ne değiştirdiği;
  - katılınca alınacak ödül, mesleğin öne çıkıyorsa bunun notu ve ortak dert notu;
  - **Katıl** düğmesi.
- Katılınca bant "Katıldın" rozetine döner. Bandın altında "kaçıran hiçbir şey kaybetmez" notu durur.
- Etkinlik durdurulunca bant bir sonraki yenilemede kaybolur.
- Metinler 6 dildedir (tr, en, es, pt, ar, ru).

## 7. Sonraki adımlar (öneri)
- Etkinlik başlarken isteğe bağlı otomatik duyuru metni (mevcut Duyuru ucu ile).
- Zamanlanmış başlatma (ör. cuma 20:00). Kronlu değil; panelde "şu saatte başlat" seçeneği olarak.
- Ozan Gecesi ve Pehlivan Şenliği için han sahnesi ve düello kancaları: etkinlik sırasında sahne ödülü ×2 (tavanlı).
