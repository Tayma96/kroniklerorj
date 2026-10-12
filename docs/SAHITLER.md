# Aynı olay, üç bakış — 12 Ekim 2026

GDD §4.1'deki tek olayı gören üç NPC kabulü artık yaşayan kişilerle bağlıdır. Açık sadaka,
hakaret, tehdit ve mevcut skandal şahitliği çağrıları, aynı yerleşimdeki yaşayan 13+ kişilerden
en çok üçünü seçer. Küçük yerde daha az kişi bulunabilir; kimse yoksa hayalî şahit üretilmez.
Muhatap şahit havuzundan çıkar; kendi başına gelen olay için ikinci bir anı almaz.

Açık sadaka görülür; adsız sadaka taşına şahit yazılmaz. Bu, oyuncuya gösterişli hayır ile
mahrem hayır arasında daha anlamlı bir tercih getirir. Akçe/şeref/XP bedelleri ve mevcut aylık
kilitler korunur. Şahitliğin kendisi oyuncuya yeni para/itibar/XP ödülü vermez.

## Hafıza ve konuşma

Şahit, olay türünün temel yükünün %60'ını kendi huy çarpanıyla alır. Katılımcının yükü korunur.
Şahitler aynı olay referansını taşır; ayrı anı kimlikleri ve sahipleri vardır. Hakarette muhatabın
anısı da bu referansa ve gerçek şahit listesine bağlanır. Suç şahitleri kurbandan ayrılır; suç
mağdurunun sonradan öğrenme/soruşturma zinciri bu dalgada bütünüyle ortaklaştırılmaz.

Somut aynı sahne: çeşme başında sadaka dağıtımı, üç canlı kişi. Cömert kişinin yükü 7,5;
dindarın 6,6; kurnazın 3,9. Görüşleri ve Geçmişi konuş yanıtları farklıdır. Eşit tek temas
olanağı ve aynı rastgele eşik verildiğinde ilkelinin susması, sıcak kişinin normal aktarımı,
çıkarcının büyüterek aktarımı ayrıca sınanır; bu ayrı karşılaştırma gerçek bütün kasabanın
her seferinde tam bu üç sonucu vermesini garanti etmez.

Şahit kendisini mağdur gibi anlatmaz. Altı olay için görgü alıntıları ve sekiz kişilik tonu altı
dilde var. Profildeki belirgin anı, anı özeti, görüşün gerekçesi ve otomatik sohbet gönderisi aynı
kanıt türünü kullanır. Türü topluca anlatan özet/gerekçe, o türdeki en güçlü gerçek anıyı örnek
olarak seçer; puan hesabı aynı kalır. Yeni şahidin sözü, muhatabın mevcut kişisel anı metnini silmez.

Profil **Olayı gördü / Olayı yaşadı** ayrımını gösterir. Diğer şahitler adlarıyla, 44 px erişilebilir
bağlantılarla açılır. Kronik sahneyi görenleri söyler; adlar dil değiştirilince yeniden çözülür.
Arapça/Rusça yeni bildirim ve etiketler cinsiyet varsayımı taşımayan kuruluşlarla yazılır.

## Söylenti

Ortak sahnenin anıları birlikte işlenir; aynı olay için tek üretim zarı ve en çok bir söylenti.
Anılar başarıdan bağımsız işlenmiş sayılır; üç şahidin anısı üç ayrı tekrar şansı vermez. Kaynağın
yanı sıra diğer doğrudan bilenler de başlangıçta kesinlik 1 ile yer alır. Kendi anısı olan kişi
aynı söylentiden ikinci bir görüş yükü almaz. Aktarım alan kişi **duyum** kaydı alır.

Kaynağını sor konuşması doğrudan görgü, bizzat yaşama ve aktarılmış sözü ayrı anlatır. Eski
kayıtlardaki ortak sahnesiz anılar birleştirilmez; eski yükler değiştirilmez. Tanık listesi olmayan
eski anı da aylık işlenebilir. Anı tavanı 24, söylenti tavanı 12, aktarım sınırları korunur.

## Açık kapsam

Bu çalışma kanıtla karşı söylenti veya mahkeme hükmü değildir. Şahit listesi soruşturmada henüz
kullanılmaz. Başarılı susturma/yüzleşmenin söylentiyi tümden kaldırması önceki davranıştır. Altı
boyutlu artımlı görüş, izlenim/LOD, kayıtlı RNG ve çok turlu tonlu konuşma açık. Çok tanıklı sahne
kabulüne ilerlemek, bütün S2/GDD'nin bittiği anlamına gelmez. Eski sekiz metinlik NPC konuşma
listesi hâlâ yazıldığı dilde saklanır; yerelleştirilmiş kronik bununla karıştırılmamalıdır.

## Doğrulama

`sahit-check.cjs`: 1.246 örnek; gerçek aynı sahne/üç yaşayan kişi, farklı yük/görüş/söz, gerçek
muhatabın ayrı tutulması, tek söylenti, küçük/boş yer, gizli hayır, ölü/çocuk/parasız/ay kilidi,
otomatik görgü göndermesi ve unutkanlık, görüş gerekçesi, eski çıplak anı, vâris, altı dil/iki
oyuncu cinsiyeti. Önceki hafıza ve söylenti denetimleri de geçer. 10 GDD akışı ve üç sentetik
30 aylık kayıt aynı kalır; bunlar yeni sahne testinin yerine geçmez.

Sekiz tarayıcı örneği: altı dil ve üç Türkçe kişilik, 320×568 / dört kat yavaşlatılmış CPU.
Geçmiş konuşması, görgü metni/etiketi ve diğer şahidin profiline geçiş oynandı; oyuncu/ilişki/tur
ödülü yok, tarayıcı hatası yok. Tip, paket, göç, i18n ve dil denetimi temiz. Fiziksel telefon
ve gerçek oyuncu altın kaydı yok; Android paketleme APK yayını sayılmaz.

Son motor görüntüsüyle 300 hayat × tüm eylemler: **HATA: 0**, 3,8 dk; görüntü `50aecd4+kirli`
olarak doğru damgalandı. Önceden kirli-kopya denetçisi depo kökünde yanlış `lib/` yoluna bakıyordu;
çalışma dizini mobil köke düzeltildi. Bu damga sonradan oluşturulan commit'in adı değildir.
Sonra yalnız Arapça/Rusça etiket/bildirimler nötrleştirildi; dil ve UI kontrolleri yeniden yapıldı.
30 hayat / 19.528 ay: boş ay %11,5, 3+ pencere %0,2, açık gerilim en çok iki; eşikler temiz.
Karakter aynası 12 hayat: yardımsever +95,7 / zalim −98,3; vâris +42,9 / −43,5. 16.620 olay
metni altı dilde temiz. Android/Hermes paketleme geçti; yeni APK/PR/dağıtım yapılmadı.
