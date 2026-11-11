# Ek B P5 — darbe hazırlığı uygulama notu

Durum: ilk sunucu dilimi uygulandı; çatışma çözümü ve bağımsız devlet henüz uygulanmadı.
Kapsam: feature/online-p5-darbe-zinciri dalı.

## Bu dilimdeki akış

1. Bölge valisi yalnız kendi etkin vali makamı üzerinden darbe hazırlığı açabilir.
2. Planın ilk aşaması gizlidir. Hazırlık izi ve destek/ikmal dökümü yalnız planı başlatan ve destek taahhüdü veren oyunculara gösterilir.
3. Şehir beyi ve ahi başı makamlarının gerçek sahipleri, kendi makamlarıyla yazılı destek taahhüdü verebilir. Vekil destek veremez.
4. Aynı hesap veya hane kümesinden ikinci destek kabul edilmez.
5. Vali, bölge kasasından garnizon sadakati yatırımı yapabilir. Her yatırımda hazine rezervi korunur; hareket deftere gider.
6. İlan, taahhüt eşiği karşılanmadan açılamaz. Açık ilan bir oyun ayı tebliğ süresinden sonra çatışmaya geçer; ani baskın doğrudan çatışma aşamasına geçer.
7. Hazırlık aşamasında başlatan vazgeçebilir; vazgeçme sonrası soğuma uygulanır.

## İlk dilimdeki eşikler

Bütün değerler online-server/src/siyaset/sabitler.ts içindeki DARBE nesnesindedir ve alfa verisiyle ayarlanacak parametrelerdir:

- Bölgedeki şehir beyi koltuklarının tamamından destek (en az bir).
- En az iki ahi başı desteği.
- Garnizon sadakati en az 60.
- Bölge kasasında en az 40 akçe rezerv.
- Meşruiyet 40 veya altı ya da en az iki ahi başı desteğiyle görünür yerel ileri gelen desteği.
- Garnizon yatırımı 20 akçelik birimlerle, 20–200 aralığında yapılır; her birim sadakati 10 artırır.

Bu eşikler geçici oyun parametreleridir; GDD'deki D-43 kararı gereği alfa verisi olmadan nihai kabul edilmemelidir.

## Güvenlik ve veri ilkeleri

- İstemcinin gönderdiği makam veya siyasi kimlik yetki kanıtı sayılmaz; eylemde mevcut oyuncuKoltugu ve yerleşimden doğrulanan SiyasiKimlik kullanılır.
- Tek bölge için tek açık plan vardır.
- Destek taahhütleri hesap/hane kümesine göre tekilleştirilir.
- Hazırlık izleri herkese yayınlanmaz.
- Garnizon ikmali bölge kasasından çıkar; mevcut defter değişmezi korunur.
- BolgeDurumu.darbe isteğe bağlıdır; eski Durable Object kayıtları için geriye dönük uyumludur.

## Bu dilimde olmayanlar

- Çatışma çözümü, tarafların ön talimatları, çevrimdışı savunma ve otomatik ateşkes.
- Bastırılma, çıkmaz/ateşkes, başarı ve Moğol müdahalesi sonuçları.
- Başarılı darbeden sonra bağımsız Polity, Divan, vergi çerçevesi ve diplomatik tanınma.
- Oyuncu/mülk vergisi tahsilatından vergiYatir kancasına çağrı noktası. Mevcut BolgeDO alıcısı var; tahsilatın gerçek para düşümüyle aynı işlem/tekrar güvenliği içinde bağlanacağı kaynak henüz belirlenmedi.

## Sonraki dilim

Önce bu hazırlık akışını derleme ve testlerle doğrula. Ardından Faz 8 / GDD §10 ile uyumlu tek çatışma fazı, ön talimatlı çevrimdışı savunma, kayıp tavanı ve dört sonucun sunucu tarafı çözümünü ekle. Sayısal süre ve kayıp tavanları GDD'deki [PARAMETRE] olarak kalmalıdır.
