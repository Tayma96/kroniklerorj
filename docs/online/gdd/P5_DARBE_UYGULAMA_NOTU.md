# Ek B P5–P6 — darbe ve bağımsız devlet uygulama notu

Durum: sunucu tarafında ilk oynanabilir dilim; eşikler alfa parametresidir. Tanınma isteği/yanıtı iki bölge DO'su arasında tekrar güvenli outbox teslimiyle çalışır; ittifak ve kapsamlı diplomatik anlaşmalar bu sürümün dışında kalır.
Dal: `feature/online-p5-darbe-zinciri`.

## P5 — darbe akışı

1. Yalnız etkin vali kendi bölgesinde gizli hazırlık başlatabilir.
2. Şehir beyi ve ahi başı makamlarının gerçek sahipleri taahhüt verir; vekiller veremez.
3. Aynı hesap veya hane kümesinden ikinci taahhüt alınmaz.
4. Vali bölge kasasından garnizon sadakati yatırımı yapabilir; akçe defteri korunur ve hazine rezervi bırakılır.
5. Eşik tamamlanmadan açık ilan veya baskın açılamaz.
6. Açık ilan bir ay tebliğden sonra çatışmaya geçer; baskın çatışmayı başlatır. Çatışma bir sonraki aylık adımda deterministik, denetlenebilir güç hesabıyla çözülür.
7. Sonuçlar:
   - Bastırıldı: vali makamı boşaltılır; karakter ve mülkleri silinmez.
   - Pat/çıkmaz: mevcut statüko korunur.
   - Başarı: kurucu bey olur ve P6 bağımsız devlet kaydı oluşturulur.
   - Moğol müdahalesi: Moğol tutumu sefer kademesindeyse müdahale sonucu çıkar; otomatik ilhak veya karakter silme yoktur.
8. Çözümde çevrimiçi oyuncu beklenmez; sessiz makamlar otomatik savunma tabanını korur. İlan sonrası şehir beyi ve ahi başı makamlarının gerçek sahipleri `darbeSavunma` ön emri verebilir; emirler çatışma çözülmeden önce kaydedilir, aynı hesap/hane kümesi ikinci emir veremez ve açık savunma puanı çatışma hesabına eklenir. Vekil emir veremez.
9. Hazırlık aşamasında kurucu vazgeçebilir; altı aylık soğuma uygulanır. Bölge başına tek açık plan vardır.

## P5 — alfa parametreleri

Bütün değerler `online-server/src/siyaset/sabitler.ts` içindeki `DARBE` nesnesindedir:
- Tüm şehir beyi koltuklarından destek (en az bir).
- En az bir ahi başı desteği; ikinci ahi başı desteği veya 40 ve altı bölge meşruiyeti ek gerekçe sağlar.
- Garnizon sadakati en az 60; başlangıç 20.
- Hazine rezervi 40 akçe.
- Meşruiyet 40 veya altı ya da iki ahi başı desteği.
- Garnizon yatırımı 20 akçelik birimlerle, 20–200 aralığında; birim başına 10 sadakat.
- Tebliğ ve çatışma süreleri birer oyun ayı; sonuç farkı 25.
- Açık savunma emri: şehir beyi +6, ahi başı +3; toplam savunma emri katkısı en çok +30.

Bunlar nihai tasarım kararı değildir. GDD'deki D-43 ve D-46 kararları uyarınca alfa verisiyle ayarlanmalıdır. Çatışma hesabı şu an mülk kaybı üretmez; mülk kaybı tavanı/ganimet sistemi eklenene kadar mülke otomatik el koyma yoktur.

## P6 — bağımsız devlet v1

- Başarılı darbe, kurucuyu Bey yapar; destekçilerden en çok beş kişi ilk Divan'a girer.
- Bey devlet adını (3–32 karakter) ve vergi kademesini ayarlayabilir.
- Bey Divan'a yalnız darbe taahhüdü veren kişilerden üye ekleyip çıkarabilir; en çok beş üye.
- Moğol ilişkisi `harac` veya `diren` seçilebilir. Harac seçilirse vergi gelirinin Sultan haraç payına denk gelen kısmı doğrudan dünyadan çıkar; diren seçilirse ödeme yapılmaz.
- Sultan'a barışla dönüş talebi verilebilir. İki oyun ayı sonra bölge ve Sultan meşruiyeti en az 55 ise kabul edilir; değilse talep reddedilir. Kabul edilene kadar bölge bağımsızdır.
- Tanınma talebi kayda alınır; başka bağımsız devletlerin diplomatik yanıt uçları henüz yoktur.
- Her oyuncu kendi bağlılığını isteğe bağlı olarak `bagli` veya `tarafsiz` seçebilir. Eylemsizlik tarafsızlıktır; toplu/zorunlu yemin yoktur.

## Güvenlik ve veri ilkeleri

- İstemci makamı veya siyasi kimliği yetki kanıtı değildir; eylem sunucunun doğruladığı siyasi kimlik ve gerçek makam sahibiyle kontrol edilir.
- Hazırlık izleri yalnız katılımcılara görünür; ilan/çatışma ve sonuç bölgeye açılır.
- Destek hesap/hane kümesine göre tekilleştirilir.
- Bölge kasası yatırımları ve haraç hareketleri kayıtlıdır; eski Durable Object kayıtlarında yeni alanlar isteğe bağlıdır.
- Başarısız darbe karakteri silmez; mülk otomatik aktarılmaz.
- Oyuncu bağlılığı bireysel ve gönüllüdür.

## Henüz tamamlanmayan bağlantılar

- Başka bağımsız devletler arasında tanıma, ittifak, ticaret, sınır ve diplomatik anlaşma uçları.
- Tanınma talebine dış devlet yanıtı ve Divan'ın gerçek oyuncu koltuklarıyla yönetimi.
- Savunma ön emirlerinin mobil ekranı, 6 dilde metinleri ve çatışma raporunda emir dökümü henüz yok; sunucu eylemi ve güç hesabı eklendi.
- Gerçek oyuncu/mülk vergi tahsilatının `vergiYatir` kancasına kaynak işlemle atomik bağlanması. BolgeDO alıcısı ve anahtar tekrar güvenliği var; tahsilat çağrı noktası henüz bulunup bağlanmadı.
- Çatışma sırasında açık müzakere, ateşkes şartları ve mülk kaybı tavanı. Şimdilik çıkmaz statükoyu korur ve mülk kaybı uygulanmaz.

## Doğrulama

`online-server/package.json` komutları:
- `npm run typecheck`
- `npm test`

CI run #201 başarılı (commit `71445a6`): 374 test / 373 geçti / 0 başarısız / 1 atlandı; mobil TypeScript, 62 statik görsel yolu ve sunucu TypeScript kontrolü başarılı. Savunma ön emri testleri bu çalışmada doğrulandı.

## P6 iki bölgeli tanınma köprüsü
- `BolgeIleti` yalnız DO iç çağrıları için `taninmaIstekAl` ve `taninmaYanitAl` mesajlarını tanımlar; Worker'ın oyuncu uçları bunları kabul etmez.
- `BolgeDO` kalıcı `diplomasiGiden` outbox'ını alıcı DO onaylayana kadar tutar; alarm ve sonraki isteklerde tekrar dener.
- Alıcı tarafı kanonik beylik kimliğini/adını doğrular, aynı isteği tekrar güvenli kabul eder ve bekleyen istek üstüne ikinci istek almaz.
- Kaynak tarafı yalnız bekleyen hedef/istek kimliği eşleşen kararı kabul eder. DO→DO geri çağrı döngüsü iç iletilerde gönderim yapmayarak engellenir.
- Entegrasyon testi iki bölge DO'su arasında tam istek/kabul akışını doğrular.
- CI [#43132539771](https://github.com/Tayma96/kroniklerorj/actions/runs/43132539771): **375 test / 374 geçti / 0 başarısız / 1 atlandı**; tüm TypeScript ve görsel yolu kontrolleri başarılı.

## İki taraflı statüko ateşkesi — 12 Kasım 2026

- Açık darbe ilanı veya çatışma çözülmeden önce saldıran tarafın gerçek başlatıcısı ya da açık savunma ön emri vermiş makam sahibi statüko ateşkesi önerebilir.
- Teklif, kendi tarafınca kabul edilemez. Yalnız karşı tarafın gerçek katılımcısı aynı istek kimliğiyle kabul/ret verebilir.
- Kabul edilirse darbe `ateskes` durumuna geçer ve altı aylık soğuma başlar. Sonuç zafer/yenilgi diye yazılmaz; otomatik ganimet, mülk devri veya el koyma yapılmaz.
- Ret çatışmayı sürdürür; teklif sahibi/karşı taraf yeniden teklif verebilir. Çözüm ayı geçtikten sonra teklif ve yanıt kapalıdır.
- İstek kimliği ve dış DO yazma kabuğu tekrar güvenli çalışır; yeni hata kodları mobil protokolde tanınır ve üç özel hata altı dilde çevrilmiştir.
- Testler: saldıranın teklifi/savunmanın kabulü, savunmanın teklifi/saldıranın reddi, üçüncü kişi reddi, yanlış istek kimliği, teklif süresi ve soğuma.
- GitHub Actions [run #265](https://github.com/Tayma96/kroniklerorj/actions/runs/43135546373): **380 test / 379 geçti / 0 başarısız / 1 atlandı**; mobil TypeScript, 62 statik görsel yolu, sunucu testleri ve sunucu TypeScript başarılı. Ateşkes kayıtları altı dilde çevrildi.
- Sınır: bu ilk dilim yalnız müzakere/ateşkes protokolüdür. Mülk kaybı ve ganimet hâlâ uygulanmaz; mülk kaybı tavanı ayrı tasarım/uygulama gerektirir.
