# KRONİKLER ONLINE — Oyun Tasarım Belgesi

**Sürüm:** 0.4 — tek birleşik belge (yaşam simülasyonu, han ve sosyal mekân, mülkiyet, barınma, Debdebe gelir modeli)
**Tarih:** 7 Kasım 2026
**Kapsam:** Yalnız Kronikler’in çevrimiçi, kalıcı ve paylaşımlı dünya modu. Tek oyunculu oyun bu belgenin kapsamında değildir.
**Önceki sürümler:** 0.2 (25 Ekim 2026), 0.3 (7 Kasım 2026). Bu dosya onların yerine geçer.

> Bu belge bir kod talimatı değil, ürün ve sistem sözleşmesidir. Ajana uygulama işi verildiğinde bu belgenin yalnız ilgili fazı uygulanır; açık karar kapılarına bağlı işler karar onaylanana dek uygulanmaz.

## Belge haritası

Claude Code’a verilecek belgeler:

| Dosya | Rol |
|---|---|
| `KRONIKLER_ONLINE_GDD.md` (bu belge) | Ana belge: ürün, zaman, ekonomi, çatışma, han, mülkiyet, barınma, Debdebe, fazlar, karar kaydı |
| `KRONIKLER_ONLINE_GDD_EK_A_MESLEK_VE_TOPLULUK.md` | Ek A: 14 meslek, Hal/Sanat/Meşrep, topluluk (hami, ortak dert, şenlik, müdavim, lonca/ahi), fazlar E1–E7 |
| `KRONIKLER_ONLINE_GDD_EK_B_SIYASI_YAPI.md` | Ek B: Sultan, Vali, Moğol dış güç, haraç, darbe ve bağımsızlık, fazlar P1–P6 |
| `KRONIKLER_HEDEF_LISTESI.md` | Plan ve hedefler (GDD değil, isteğe bağlı) |

**Öncelik:** Ekler ana belgeyi tamamlar. Çelişkide ana belge geçerlidir ve çelişki raporlanır; tek istisna, Ek B §1.1’deki **D-05′**tür (onaylanırsa ana belgedeki “7 beylik” yerini alır).
**Terim:** Ana belgede “hükümdar/beylik” geçen yerlerde Ek B §1.1’deki eşleme uygulanır (Sultan/Vali, bölge).
**Okuma bütçesi:** Ajan hepsini okumaz; “Ajan için özet”, §0, istenen faz ve ilgili ek bölümü yeterlidir.

## Değişiklik günlüğü (0.3 → 0.4)

- Gemini ve ChatGPT incelemelerinden gelen öneriler işlendi. **Hiçbiri [KESİN] değildir**; etiketler aşağıdadır.
- §16: masa katılım kaydı, yani bağlayıcı eylemde masada kimlerin oturduğu [UZLAŞI]; tanık ağırlığı ve mahkeme ertelendi (D-28). §19: bağlamsal Dene önizleme [ÖNERİ]. §18: dönüş ekranı, güvenli toparlanma ve opt-in otomatik konaklama [UZLAŞI]. §13: finansal bütünlük ve Durable Object ayrımı [ÖNERİ]. §17: işletme itibarı, meslek bağı, tedarik zinciri, sosyal yaşam [ÖNERİ]; işletme kötüye kullanım koruması [UZLAŞI].
- Alınmayanlar: Kasa/Rezervasyon/İşletme için ayrı Durable Object’ler (DO’lar arası para uzlaştırma yükü artar; işletme finansı tek DO’da kalır). Kahvehane örnekleri (1247’de yok).
- Fazlar 10, 11, 12, 13, 14 ve 17’nin kapsamı genişledi. Faz 0–9 değişmedi; eklemeler erken fazları bloklamaz.
- Karar kaydına D-28 ve D-29 eklendi.
- Belge haritası eklendi; Ek A ve Ek B ayrı dosyalardır. D-05 için güncelleme önerisi (D-05′) Ek B’dedir. Tarihler 7 Kasım 2026’ya düzeltildi.

## Değişiklik günlüğü (0.2 → 0.3)

- Yeni bölümler: Han ve sosyal mekân (§16), Mülkiyet ve işletmecilik (§17), Barınma ve evsizlik (§18), Debdebe ve gelir modeli (§19).
- D-03 çözüldü: ortak takvim **görünür** (12 gerçek saat = 1 oyun ayı), ama tur/ay **kapısı yok**. §5 buna göre yeniden yazıldı. Önceki “çevrimdışıyken yaşlanmaz” önerisi çıkarıldı; yaşlanma ve ölüm ayrıntısı `docs/online/OYNANIS_TASARIMI.md`’dedir.
- Fazlar 10–17 eklendi. Faz 0–9 numaraları korundu.
- Belge kısaltıldı: örnekler ve tekrarlar çıkarıldı. Bağlayıcı kurallar, tablolar, karar etiketleri ve tarihsel kaynaklar korundu.
- Bilinçli istisna: §18 evsizlik zinciri, v0.2’deki “yokluğa bağlı ceza yok” ilkesine görünür, kademeli ve tabanlı bir istisna getirir (D-16).
- Gelir modeli eklendi: yalnız görünüş satılır, güç/gelir/ilerleme/bekleme satılmaz (D-15).

## Ajan için özet (önce bunu oku)

1. **Ürün:** Yaşam simülasyonu; kalıcı paylaşımlı dünya (Anadolu, 7 beylik). Krallık yönetimi olası yollardan yalnız biridir.
2. **Zaman:** Tek ortak sunucu saati. 12 gerçek saat = 1 oyun ayı; ay dönümü 00:00 ve 12:00 (TR). Takvim görünür, ama eylemler ay dönümünü beklemez; ortak tur kapısı yoktur.
3. **Sunucu otoritedir.** İstemci niyet gönderir. Her önemli işlem idempotent, kayıtlı bir `WorldEvent` üretir.
4. **Kimlik:** Online karakter, SP’den kesin ayrıdır. Google ile giriş; SP adına geri düşüş yok.
5. **Gelir:** Yalnız **Debdebe** (görünüş). Gerçek para güç, gelir, ilerleme ya da bekleme atlatma satmaz. Oyun içi her şey akçe, nam ve emekle alınır. Akçe gerçek paraya çevrilmez.
6. **Han masası:** Konuşma oyun durumunu bağlamaz. Bağlayıcı olan butonlu eylemlerdir (yemin, sözleşme, ittifak, ihbar, meydan okuma); masadakiler olayın katılım listesine yazılır (§16). Tanık ağırlığı hesabı yoktur (ertelendi, D-28).
7. **Mülkiyet:** Oyuncu işletmeleri (han, şerbethane, dükkân…). Kasa işlemleri tek Durable Object’te atomik. Kahvehane 1247’de yoktur, kullanılmaz.
8. **Barınma:** İlk yerleşimde 48 saat (4 ay) ücretsiz misafirhane. 48. saatte uyarı, 72. saatte **Evsiz** unvanı ve stat debuff’ı, 144. saatte can kaybı. Can tabanı **%10**, ölüm yok. Geri dönen oyuncuya yargılamayan bir dönüş ekranı ve tek dokunuşla barınma sunulur (§18).
9. **Ölüm mümkün ama zor** (KESİN). Karakter yaşlanır, ölür, hanedan vârisle sürer.
10. **Açık kararlar** (§23) ajan tarafından kendiliğinden kesinleştirilmez.
11. **Okuma bütçesi:** Ajan tüm belgeyi okumaz. Bu özet, §0, istenen faz (§20), ilgili sistem bölümü ve §23 yeterlidir.

## 0. Ajan için bağlayıcı çalışma sözleşmesi

Bu belgenin uygulanması istendiğinde ajan:

01. Önce `AGENTS.md` ve `OTURUM_HAFIZASI.md` dosyalarını okur; ürün kararı gereken işte `TASARIM_PUSULASI.md`yi de kullanır. Bu belgeyi online ürün hedefi için esas alır.
02. `docs/MULTIPLAYER.md` ve mevcut online kodunu eski Diyar uygulamasının envanteri olarak görür; mevcut yapıyı otomatik koruma zorunluluğu saymaz. Eski GDD/arşiv belgelerini izinsiz açmaz.
03. Yalnız istenen fazı ve onu uçtan uca tamamlamak için gereken en küçük işi yapar. Önce mevcut kodu hedefli denetler.
04. Online mod için kendi kimlik, karakter, tip, kayıt alanı, sunucu sözleşmesi ve yaşam döngüsünü oluşturur. Online mod hiçbir koşulda SP karakter adını, kaydını veya profilini okumaz.
05. Tek oyunculu davranışı, dosyalarını ve kayıtlarını değiştirmez.
06. `Karar Kaydı`ndaki **[AÇIK KARAR]**ları ve nihai onay bekleyen **[UZLAŞI]**ları kendiliğinden kesinleştirmez; kararın gerektirdiği fazı bekletir, etkisini raporlar.
07. Sunucu sonucunu otorite kabul eder. İstemciden gelen sonuç, RNG, sahiplik, itibar, yetki ya da satın alma bilgisini doğrulamadan kabul etmez.
08. Altı dil desteğini ve mobil kısa oturum yapısını korur. Oyuncu metinlerini sabit gömmez; proje i18n düzenini kullanır.
09. Ücretli servis, ücretli API, gizli anahtar, canlı sunucuya entegrasyon, mağaza/ödeme entegrasyonu, deploy, APK, commit veya push işlemi yapmaz; bunlar ayrıca istenmiş olmalıdır. Ücretsiz katman kapasitesini kanıtlı üretim kapasitesi gibi sunmaz.
10. İstenen doğrulamayı gerçekten çalıştırır; çalıştırmadığı testi geçmiş gibi bildirmez. Faz sonunda değişen dosyaları, kararları, doğrulamayı ve kalan riski kısa raporlar.

### Karar etiketleri

- **[KESİN — Berkay]** Berkay’ın açıkça belirttiği yön; ajan tersine çeviremez.
- **[UZLAŞI — onay bekliyor]** Görüşmelerde ortaklaşılan ilke; önemli ürün etkisi varsa uygulama öncesi onay gerekir.
- **[ÖNERİ]** Oynanabilir başlangıç tasarımı; onaylı kapsam sayılmaz.
- **[PARAMETRE]** Alfa ölçümüyle belirlenecek sayısal değer; örnek sayı norm değildir.
- **[AÇIK KARAR]** Ajanın kendi başına kapatamayacağı konu.

## 1. Ürün tanımı

**[KESİN — Berkay]** Kronikler Online bir yaşam simülasyonudur; krallık yönetimi oyunun kendisi değil, olası yaşam yollarından yalnızca biridir. Oyuncular ve NPC’ler aynı yaşayan toplumun içinde çalışır, ilişki kurar, geçim sağlar, bilgi taşır, kurumları etkiler ve birbirlerinin hayatında iz bırakır. Bir oyuncu hükümdar, bir başkası çiftçi, demirci, tüccar, şifacı, haberci, arabulucu ya da hancı olabilir. NPC’ler dekor değildir: kendi ihtiyaçları, bağları, bilgileri ve ölçülebilir etkileri vardır.

Dünya katmanlıdır: kişisel hayat, yakın çevre, yerel toplum ve geniş kurumlar birbirini etkiler. Gündelik bir eylem bile yakın çevrede anlaşılır bir iz bırakmalıdır.

**Oyuncu hedefi:** “Kısa süreliğine girsem bile anlamlı bir karar veririm; insanlar beni ve yaptıklarımı hatırlar; ben yokken dünya yaşar.”

### Tasarım hedefleri

- Oyuncu ve NPC aynı sosyal/siyasi kurallara tabi olsun; kontrol ve kimlik kaynakları ayrı kalsın.
- Her oturum 5–15 dakikada tamamlanabilen, sebebi ve sonucu anlaşılan en az bir anlamlı karar sunsun.
- Rol, yalnız unvan değil; başkalarının ihtiyaç duyduğu iş, sorumluluk ve pazarlık gücü yaratsın.
- İşbirliği, rekabet, aracılık ve entrika aynı ilişki sisteminden doğsun.
- Hiçbir temel hizmet belirli bir insan oyuncunun çevrimiçi olmasına bağlı kalmasın; boş bölgelerde NPC gündemleri düşük sıklıkla sürsün.
- Oyuncu her oturumda başka oyuncu çevrimiçi olmasa da tamamlayabildiği anlamlı bir karar alsın; aynı oturumda en az bir NPC tepkisi veya kısmi sonuç görsün.
- 10.000 hesap hedefi için mimari plan yapılsın; gerçek eşzamanlı kapasite ölçümle kanıtlansın.
- Oyuncular başkalarına **görünür** olmak ister: han, masa, levha ve profil gibi yüzeyler gelir modelinin temelidir (§19).

### Tasarım pusulasına uyum

Her seferinde en fazla 3–5 açık gerilim gösterilir. Yakın çevrede yaklaşık 15 önemli kişi bulunur; geniş nüfus katmanlı açılır. Para, sosyal bağ, bilgi/ustalık ve itibar farklı sermayelerdir. Her önemli kararın bedeli, alternatifi, anlaşılır sonucu ve telafi yolu vardır. Arayüzü kilitleyen bekleme, parayla bekleme atlama ve tekrarlı eylemden sınırsız kazanç yoktur.

## 2. Kapsam ve kapsam dışı

### İlk ürün kapsamı

- Online’a özel hesap profili ve ayrı çevrimiçi karakter.
- Kalıcı ortak toplum; oyuncu/NPC dizini, konum, hane/kurum ve kamu olayları.
- Sosyal ilişki, itibar, güven, bilgi ve söylenti sistemi.
- Oyuncu-NPC ve oyuncu-oyuncu görev, iş ve karar etkileşimleri.
- Üretim, sipariş, tedarik ve değiş tokuşla bağlı ekonomi.
- Gündelik yaşam ve meslek katkıları; kurum, topluluk ve liderlik bunların üzerinde.
- Han ve sosyal mekânlar; oyuncu işletmeleri; barınma (§16–§18).
- Debdebe: parayla yalnız görünüş (§19).
- Söylenti, gözlem, diplomasi, hazırlık, savunma ve çevrimdışı talimatlı çatışma.
- Makam devri, uyku/terk edilmiş hesap ve mülk sürekliliği.
- Altı dil, kısa oturum, bağlantı kopması ve dönüş özeti.

### İlk sürümün kapsam dışı

- Sınırsız sandbox simülasyonu.
- Gerçek zamanlı fizik tabanlı kalabalık savaş; binlerce karakterin istemcide çizilmesi.
- Her NPC karar döngüsünün üretken yapay zekâya bağlanması. NPC davranışı ölçülebilir kurallarla sunucuda çalışır.
- **Ücretli güç**, çevrimiçi olma süresini satın alma, gerçek parayla siyasi yetki, parayla bekleme atlatma, zorunlu günlük görev.
- Akçenin gerçek paraya çevrilmesi; hesap ya da mülkün gerçek para karşılığı satışı.
- Rastgele ödüllü paralı kutu.
- Çevrimdışı oyuncunun karakterini otomatik oynatıp itibar kaybına ya da ölüme götürmek.
- Eski beta özelliklerini aynen koruma taahhüdü.
- Bütün oyuncuların hükümdar, asker ya da savaş katılımcısı olmasını gerektiren ilerleme yolu.
- Her NPC’yi her anda ayrıntılı simüle etmek.

## 3. Temel oyuncu döngüsü

1. **Dünyayı oku:** dönüş özeti, yakındaki 3–5 gerilim, ilgili kişiler ve kurumlar.
2. **Niyet seç:** arabuluculuk, görev, üretim, pazarlık, araştırma, destek, yönetim ya da çatışma.
3. **Bedel ve riski gör:** zaman, ham madde, itibar, ilişki, yetki şartı ve riskler açıklanır; bilinmeyen bilgi “bilinmiyor” diye belirtilir.
4. **Sunucu çözümlesin:** yetki, ön koşul, kaynak ve güvenlik kontrollerinden sonra tekil olay üretilir.
5. **Sonucu gör:** anlık netice ve sebep; gecikmiş etkiler izlenebilir bir gündem maddesi olur.
6. **İlişkiyi derinleştir:** karakterler sonucu hatırlar; sonraki fırsat ya da engel geçmişe göre değişir.

Bir eylem tek dokunuşla bitmek zorunda değildir; ama oyuncu çevrimdışıyken devam eden süreç için geri sayım beklemeye zorlanmaz. Üretim ve sipariş gibi işler dünya olaylarıyla sonuçlanır ve dönüşte özetlenir.

## 4. Dünya nüfusu ve kimlik sınırı

### Kimlik ve çevrimiçi karakter

- Hesap kimliği, online karakter kimliği ve görünen ad ayrı alanlardır. Sunucu ID’leri değişmez; görünen ad kimlik ya da yetki kanıtı değildir.
- İlk online girişte çevrimiçi profile özel ad seçilir. SP adından otomatik kopya ve SP adına fallback yasaktır.
- Hesap başına bir etkin online karakter ve realm içinde ad benzersizliği [ÖNERİ]; sakıncalı adlar sunucuda filtrelenir.
- Online portre/kimlik online üretim seçeneklerinden gelir. SP kayıt içe aktarma, SP karakterini online’a yükseltme ya da SP profilini silme yoktur.
- Her istek oturum belirteciyle hesaba ve karaktere bağlanır. İstemcinin `actorId` vermesi tek başına kimlik doğrulamaz.
- Giriş: Google ile giriş. Sunucu kimlik belirtecini doğrular (D-06).

### Nüfus katmanları

1. **Yakın çevre:** yaklaşık 15 önemli kişi.
2. **Yerel toplum:** mahalle, kasaba, ordu, lonca gibi kurumdaki NPC ve oyuncular.
3. **Beylik toplumu:** kamu görevlileri, ileri gelenler, liderler ve önemli olayların tarafları.
4. **Arka plan nüfusu:** toplamlara katkı veren; olay ya da etkileşim önemli kıldığında etkinleşen sakinler.

Her NPC’ye kalıcı online `actorId` verilir. `actorKind`, kontrol sahibi, kimlik doğrulaması ve karar kaynağı açıkça farklı alanlardır. NPC oyuncu gibi doğrulanmaz; oyuncu NPC kimliğini taklit edemez.

Davet edilen arkadaş davet edenin yerleşiminde başlar (D-05).

## 5. Yaşayan dünya ve zaman

### Ortak takvim [KESİN — Berkay, D-03]

- **12 gerçek saat = 1 oyun ayı.** Ay dönümü 00:00 ve 12:00 (TR).
- Herkes 12 yaşında başlar; ilk 6 gün öğrenme dönemidir; etkileşimler 12/13/16 yaşlarında kademeli açılır. Ayrıntı: `docs/online/OYNANIS_TASARIMI.md` §3.
- Takvim **görünür** ve herkes için ortaktır. Ama eylemler ay dönümünü beklemez; “Hazır olunca ay ilerlesin” kapısı ve ortak tur kilidi yoktur.
- Dünya saati sunucuda akar. İstemci saati ilerleme ya da sonuç değiştirmez. Sayaçlar oyuncu çevrimdışıyken de işler (bkz. §18).
- Dünya zamanı, karakterin biyolojik yaşı, gerçek çevrimdışı süre ve UI oturumu ayrı kavramlardır. Yaşlanma ve ölüm ayrıntısı `OYNANIS_TASARIMI.md` §8’dedir (D-02, KESİN).

### Oynanış ritmi

1. **Anlık kararlar:** konuşma, bilgi sorma, arabuluculuk teklifi, sözleşme, sipariş ve yetki kullanımı sunucu doğrulamasından sonra hemen çözülür.
2. **Rızaya bağlı teklifler:** başka oyuncunun cevabı gereken teklif karşı tarafa bekleyen karar olarak gider. Cevap gelmemesi teklif sahibine ceza değildir. Taraflar teklife kendi süresini koyabilir.
3. **Arka plan işleri:** üretim, kervan, eğitim, inşa ve haberleşme; başlangıç/bitiş koşullu emirlerdir, dünya saatiyle ilerler. İptal ve alternatif yol maliyeti görünür; parayla atlama yoktur.
4. **Dünya nabzı:** yalnız vadesi gelen işler ve ilgili bölge/kurum olayları işlenir; tüm NPC’ler her dakika simüle edilmez.
5. **NPC gündemleri:** sabit ay sonu olayı değil; ihtiyaç, çıkar, temas ve kanıt tetikleyicileriyle doğar. Oyuncuya “ne oldu, niçin önemli, şimdi ne yapabilirim?” kartı gösterilir.
6. **Özet:** günlük/haftalık özet okunabilir raporlamadır, dünya ilerlemesinin kapısı değildir.

### Olay akışı

Sunucu her önemli değişiklik için değişmez bir `WorldEvent` üretir: `eventId`, `realmId`, `sequence`, `type`, `actorId`, `targetIds`, `locationId`, `createdAtWorldTime`, `visibility`, `cause`, `costs`, `outcome`, `schemaVersion`, idempotency anahtarı. Kişisel sırlar kamu olayıyla aynı görünürlükte saklanmaz. Bildirim, özet ve akış görünümü olaydan türetilir. Teslimatın tekrarlanabileceği ve sıra dışı gelebileceği varsayılır.

### Kolektif süreçler ve kaçırma [UZLAŞI — onay bekliyor]

Seçim, konsey, divan ya da savaş aşaması gibi süreçler başlangıç ve kapanışını önceden ilan eder; katılım aralığı oyuncuyu düzenli girişe zorlamayacak kadar uzundur; varsayılan sonuç açılışta açıklanır. Fırsat kaçırmak tek başına ek ceza değildir: önceden verilmiş geçerli talimat uygulanır, yoksa ilan edilmiş varsayılan uygulanır. Arayüz sayaç bitene kadar kilitlenmez. Gerçek ya da premium para beklemeyi atlatamaz. **İlk alfada kazanılmış oyun içi kaynakla kişisel bekleme hızlandırması da kapalıdır** (D-14).

| Süreç | Katılmayan oyuncunun varsayılanı [ÖNERİ] | Açık kalan kural |
|---|---|---|
| Seçim | Çekimser | Yeter sayı, eşitlik, boş aday, art arda yetersiz katılım |
| Kaynak kilitlemeyen teklif | Süresi dolunca otomatik ret; ceza yok | Gelen kutusu yükü, bitiş süresi |
| Kaynak/emanet kilitleyen teklif | Açık son tarih; yanıtsızsa otomatik ret ve önceden açıklanan iade | İade/masraf koşulu teklifte gösterilir |
| Konsey/devredilmiş karar | Geçerli ön talimat; yoksa çekimserlik ya da kurumun sınırlı bakım kuralı | Yetki kapsamı, bakım harcama tavanı |
| Savaş fazı | Ön talimat; yoksa temel garnizon savunması, ek harcama ya da karşı saldırı yok | Garnizonun mevcut kaynaklarla yapabilecekleri |
| Egemenlik / makam devri | Sessizlik rıza sayılmaz | Yalnız açık kabul ya da önceden tanımlı savaş sonu hükmü |
| Üretim/taşıma emri | Kaynak rezerve edilmiş ve emir geçerliyse iş tamamlanır | İptal ve kayıp koşulları işlem başında gösterilir |

Tekrarlı eylem kazancı sert günlük cooldown yerine **(oyuncu, hedef NPC, eylem türü)** için azalan getiriyle dengelenir.

## 6. Sosyal simülasyon: ilişki, bilgi, hafıza

### İlişki modeli

İlişki tek “dostluk puanı” değildir: güven, yakınlık, saygı, korku, husumet, görev/borç ve yemin/sadakat eksenleri. Her eksen sınırlıdır; aynı eylem tekrar ederek sınırsız ödül vermez. İlişki aktör çiftine özeldir. Kurumlar ortak itibar/sadakat taşır; bireysel ilişki grup görüşüyle karıştırılmaz. Karakter huyu, çıkarı, statüsü ve algıladığı bilgi tepkiyi etkiler; huy kader değildir.

### Gerçek, bilgi ve söylenti

- **Gerçek:** olay defterinde olan biten.
- **Bilinen:** aktörün güvenilir kaynaktan öğrendiği olay.
- **Söylenti:** kaynağı ve güven düzeyiyle yayılan, bozulabilen bilgi.
- **İnanç/yanılgı:** aktörün doğru sandığı çıkarım.

NPC yalnız oyuncunun ekranındaki bilgiye göre tepki vermez; bilgiyi nasıl öğrendiği temsil edilir. Söylenti temas, kurum, yer, haberci ve zaman üzerinden seyrelerek yayılır. Gizli eylem otomatik olarak herkese bildirilmez. Soruşturma tanık, iz, kayıt ve çıkarla çalışır.

### Örnek: Hasan, Ahmet ve Berkay

Ahmet (NPC) ile Berkay (oyuncu) düşmandır; Hasan (oyuncu) arabulucu olabilir. Hasan nedeni öğrenir (doğrudan sorma, tanık, itibar riski); tazminat, ortak iş, aleni özür, tanık önünde yemin, üçüncü taraf garantisi ya da geçici ateşkes önerir; her yol farklı bedel ister. Sunucu kişilikleri, geçmişi, teklifin inandırıcılığını, kanıtı ve çıkarı değerlendirip gerekçeli sonuç üretir. Kısmi uzlaşma, ret, yeni şart ya da geçici barış geçerli sonuçlardır. Hasan taraf tutabilir, gizli bilgi taşıyabilir ya da iki tarafa farklı vaat verebilir; bunun getirisi ve yakalanma/itibar riski vardır. Dönüş özeti nedeni gösterir (“Ahmet reddetti: tanığın Berkay lehine konuşmasına güvenmiyor”).

## 7. Eylem çözümleme ve doğruluk

İstemci niyet gönderir; sonucu belirlemez. Sunucu sırayla:

1. Oturum, hesap, karakter ve yetkiyi doğrular.
2. Eylem türünü, hedefi, konumu, görünürlüğü ve sürümü doğrular.
3. Ön koşulu, ilişkiyi ve kaynağı atomik biçimde kontrol eder.
4. Tekrar anahtarını kontrol eder; aynı isteği çift uygulamaz.
5. Kural/olasılık çözümlemesini sunucuda yapar; sonucu ve nedenleri kaydeder.
6. Kaynakları ve aktör/kurum durumunu tek işlem sınırında günceller; olay kaydını oluşturur.
7. İstemciye yetkili sonucu ve sebebi iletir; yalnız görmeye hakkı olan alanları gönderir.

Eşzamanlı çatışan işlemler sunucuda sıralanır ya da koşullu güncellemeyle reddedilir. Geçersiz işlem anlaşılır kod ve insan diliyle açıklanır. Bağlantı kesilmesi işlemin yarım ya da iki kez uygulanmasına yol açmaz.

## 8. Toplumsal roller ve kurumlar

Rol kilitli sınıf değildir. Oyuncu güven, yetki, beceri ve dünya ihtiyacına göre birden fazla katkı sunabilir. Hükümdarlık ve savaş seçeneklerdir; meslek sistemi oyuncuyu bu rollere zorlamaz. Her rolün barışta da değer üreten bir katkısı, maliyeti ve pazarlık gücü vardır.

| Rol [ÖNERİ] | Gündelik katkı | Kriz katkısı | Bedel / karşı oyun |
|---|---|---|---|
| Çiftçi / çoban | Gıda, hayvan, yerel arz | Erzak sözleşmesi, kıtlıkta paylaşım | Hava/hasat riski, emek, fiyat |
| Demirci / zanaatkâr | Alet, tamir, siparişli üretim | Silah/zırh onarımı | Girdi, iş gücü, termin |
| Marangoz / yapı ustası | Ev, depo, köprü, bakım | Sur ve kapı onarımı | Malzeme, süre |
| Terzi / dokumacı / deri ustası | Giysi, kumaş, çadır | Koruma, sancak, sefer donanımı | Hammadde, kalite, statü talebi |
| Tüccar / kervancı | Bölgeler arası arz, nakliye, kredi | Alternatif rota, kıtlık tedariki, haber | Sermaye, yol riski, söz |
| Aşçı / değirmenci / fırıncı | Gıda işleme | Toplu mutfak, kuşatmada beslenme | Stok, yakıt, bozulma |
| Şifacı / hekim / ebe | Bakım, doğum, hastalık | Yaralı bakımı, salgın bilgisi | Malzeme, kapasite, güven |
| Haberci / kâtip / tercüman | Kayıt, mektup, sözleşme | Tebligat, güvenilir haber | Rota, gizlilik, taraflılık |
| İzci / rehber / avcı | Yol, arazi, hava bilgisi | Keşif, yanlış alarmı ayırt etme | Bilgi eskimesi, risk |
| Asker / komutan | Nöbet, eğitim, güvenlik | Garnizon, savunma, sefer | Yetki, ikmal, moral |
| Diplomat / arabulucu / yargıç | Anlaşma, uyuşmazlık, yemin | Ateşkes, esir değişimi, tazminat | Tarafsızlık, delil |
| Hükümdar / bey / divan görevlisi | Bütçe, hizmet, atama | Alarm, diplomasi, sınırlı sefer | Meşruiyet, denetim, vergi yükü |
| Lonca / mahalle / hane temsilcisi | Ortak standart ve yatırım | Erzak/iş gücü paylaşımı, tahliye | Üye rızası, kaynak kıtlığı |
| **Hancı / mekân sahibi** | Konaklama, yemek, masa, etkinlik (§16–17) | Haber ve söylenti merkezi, sığınak | Maliyet, itibar, moderasyon |

Onboarding “meslek seç, menüyü ezberle” dedirtmez; ilk iş ve yakın toplum ihtiyacından rolü keşfettirir.

### Meslek katkısının ortak döngüsü [ÖNERİ]

İhtiyaç doğar → oyuncu/NPC iş ya da sözleşme üstlenir → süre, girdi, risk ve ilişki maliyetini seçer → sunucu teslimatı ve etkiyi kaydeder → müşteriler, NPC’ler ve kurumlar tepki verir → yeni ihtiyaç ya da pazarlık doğar. Ödül yalnız para değildir: ustalık, güven, bağlantı, bilgi, itibar ve kurum erişimi de olabilir. NPC’ler temel hizmet ve tedarikin asgari seviyesini sağlar; oyuncu kalite, özelleştirme, güvenilir termin, uzmanlık ve ilişkiyle fark yaratır.

### Yetki ve görev devri

Unvan sınırsız admin erişimi değildir. Her makamın açık yetki listesi, görev süresi, bütçe sınırı, itiraz yolu ve işlem kaydı vardır. Delegasyon kapsamı ve süresi görünür olur. Hesap paylaşarak delegasyon yapılmaz. Boş makam toplumu kilitlemez; geçici kurum kuralları ve yedek temsil devreye girer; bu mekanizmanın maliyeti ve sınırı vardır. Oyuncunun iktidarını sessizce bot devralmaz.

## 9. Ekonomi ve karşılıklı bağımlılık

- Ekonomi gerçek girdileri ve sınırlı talebi bağlar. Sipariş; ürün, miktar, kalite, teslim yeri, ödeme/emanet ve teslim koşulunu taşır. Hayali stok ve istemcide yaratılan eşya kabul edilmez.
- Üretim girdi, iş gücü/ustalık ve altyapı ister. Arz, talep ve gecikme yerel piyasada fark yaratır; olay anında ayrıntı, aksi halde toplu değer kullanılır.
- Ordu belirli bir oyuncu demircinin çevrimiçi olmasına bağlı kalmaz: açık sipariş, başka üretici ve ikmal düzeyi alternatiftir.
- Vergi ve kamu siparişi ekonomiye kaynak aktarır; aşırı yük kademeli ve geri alınabilir etki yapar.
- İstismar kontrolleri: döngüsel kazanç, sahte işlem, akçe transferi, karşılıksız tekrar ödülü, bot/flood ve fiyat manipülasyonu izlenir.
- Yeni oyuncu için asgari katkı yolu bulunur; kritik malzeme tekeli süresiz tek oyuncuda kilitlenmez (yedek tedarik, kamu alımı, alternatif malzeme, ithalat).
- Temel hizmetlerde NPC taban kapasitesi vardır; tek çevrimdışı oyuncu zorunlu darboğaz yaratamaz.
- Borç, emanet, kira ve sözler uykuya geçince silinmez; borçtan kaçış için yokluk kullanılamaz.
- **Akçe gerçek paraya çevrilmez.** Hesap ya da mülkün gerçek para karşılığı devri yasaktır [UZLAŞI — onay bekliyor].
- NPC gelirleri para basma kaynağıdır: günlük tavan ve vergi, bakım, maaş, tedarik gibi giderlerle dengelenir.
- Beklemeyi hızlandırma ilk alfada kapalıdır; D-14, ekonomi simülasyonundan sonra yeniden değerlendirilir.

## 10. Siyaset, çatışma ve çevrimdışı karar

Bu bölümün genel paketi **[UZLAŞI — onay bekliyor]**; sefer alarmı ve meslek etkileri **[ÖNERİ]**; sayısal değerler **[PARAMETRE]**dir. Ajan bunları kesinleştiremez.

### Kurum, makam ve karakter

Beylik bir kurumdur; hükümdar bu kurumda görev yapan kişilerden biridir. Hükümdar çevrimdışıyken kurumun önceden tanımlı sınırlı kuralları işler; diğer oyuncular ve NPC’ler devam eder.

### Hazırlık, ilan ve gizleme

Hazırlık başlatmak otomatik savaş ilanı değildir; bir niyet ve kaynak taahhüdüdür. Oyuncu açık ilan mı, sınırlı gizli harekât mı istediğini seçer.

1. **Açık ilanlı sefer [ÖNERİ]:** Gerekçe, hedef ve istenen siyasi sonuç açıklanır; ilan ve tebliğ yapılır. Meşruiyet ve itibar; gerekçenin inandırıcılığı, verilen sözler, müttefiklerin tepkisi, yerel halka etkisi ve sonuç üzerinden değişir. İlan, savunanın önceden verdiği talimatı uygulamasını sağlar.
2. **Gizli harekât / ani baskın [ÖNERİ]:** Gizlilik, keşif, yerel destek ve iz azaltma maliyetiyle daha dar hedefe yönelir; ortaya çıkarsa güven ve diplomasi sonuçları doğar. Şehir/taht/egemenliği tek hamlede ele geçiren bedava kestirme değildir; büyük birlik ve uzun ikmal iz bırakır; geniş savaşın korumalarını atlayamaz.

Hazırlık izleri “savaş geliyor” alarmı olarak herkese gösterilmez. Oyuncular ve NPC’ler hareketi kendi konum, iş, temas ve bilgileri ölçüsünde fark eder: sınırda birlik, erzak/at/metal siparişlerinde artış, onarım, yol trafiği, haberci ve elçi hareketi, pazar sıkışması, geçiş izni. İzci, kervancı, haberci, esir, elçi ve tanık bilgiyi farklı güven düzeyleriyle taşır. Yanlış alarm, gecikmiş haber, yalan ve karşı istihbarat mümkündür; gizli planın tamamı istemciye verilmez.

**Tarihsel süzgeç:** 13. yüzyıl Anadolu’su tek ve değişmez bir siyasi düzen değildi; özellikle 1243 Kösedağ sonrası güç ilişkileri farklılaştı. Dönem/yıl ve bölge kararı verilmeden her beylik için sabit ordu, haberleşme ya da diplomasi kuralı “tarihsel gerçek” diye yazılmaz. Kaynaklar tasarım ilhamıdır; her komşunun bütün hazırlığı göreceğinin kanıtı değildir.

- [TDV İslâm Ansiklopedisi — Kösedağ Savaşı](https://islamansiklopedisi.org.tr/kosedag-savasi)
- [Marmara Üniversitesi — Anadolu Selçuklularında İstihbarat](https://openaccess.marmara.edu.tr/entities/publication/88822baa-9008-4dfa-8f87-17d7789a53d8)
- [Cambridge History of Turkey — Anatolia under the Mongols](https://www.cambridge.org/core/books/abs/cambridge-history-of-turkey/anatolia-under-the-mongols/73C5FC788C55900D12455E170F5535C8)

### Beylik alarmı [ÖNERİ]

Alarm kurumun hazırlık durumu ve maliyetli kararıdır; bedava savunma bonusu ya da tüm oyunculara zorunlu görev değildir. Yetkili, temsilci ya da sınırlı NPC görevli talimata göre alarmı değiştirebilir; kral çevrimdışı diye seviye değişimi kilitlenmez.

| Durum | Anlamı | Bedel ve toplum etkisi |
|---|---|---|
| Olağan düzen | Normal nöbet ve garnizon | Olağan maaş/ikmal |
| Şüpheli hareket | Güvenilirliği sınırlı işaret araştırılır | Keşif emeği; yanlış alarmın itibar ve ticaret maliyeti |
| Yüksek teyakkuz | Sınır nöbeti, depo/kapı gözetimi, kısmi stok | Ek maaş/erzak; iş gücü ve kervan akışı kayar |
| Genel seferberlik | Eşik sağlanırsa birlikler toplanır | En yüksek tekrarlayan maliyet; üretim, pazar, moral ve hane hayatında baskı |

Seviye değişiminin kapsamı, maliyeti ve etkisi önce gösterilir. Düşürülen alarmda tüketilen kaynak ve bozulan güven kendiliğinden geri gelmez.

### Savunma süresi ve ön talimat [UZLAŞI — onay bekliyor]

Dar, çevrimiçi olmayı gerektiren tepki penceresi varsayılan değildir. Açık ilanlı savaşın her çözüm fazı için en erken çözüm zamanı `max(aktif oyuncu giriş aralığı P90, alfa asgari tebliğ)` olur. 36–48 saat yalnız alfa hipotezidir. Ölçüt hedefin alışkanlığını ifşa etmez; seyrek oyuncuyu ödüllendirmez. “Aktif oyuncu” tanımı alfa öncesi sabitlenir; veri toplulaştırılmış tutulur ve saldırana gösterilmez.

Savunmanın temeli önceden verilmiş talimat (kapsamı, süresi, harcama sınırı ve iptal koşulu görünür), yetkili temsilci, garnizon ve alarm düzeyidir. Tebliğ süresi çözümü erteler, katılımı zorunlu kılmaz. Daha dar canlı pencere ancak alfada çevrimdışı savunan kayıpları eşik üstünde çıkarsa yeniden değerlendirilir.

### Savaş fazı, hedef sınırı, kayıp tavanı

- Bir hedefte, tüm saldırganlar genelinde aynı anda en fazla bir çözümlenmemiş faz bulunur; yeni fazlar ilan sırasıyla kuyruğa girer.
- Bir saldıranın aynı hedef için en fazla bir kuyruk kaydı olur. Kayıt son kullanma süresi ve faz açma bedeli taşır; ilerlemeyen faz zaman aşımıyla kapanır (ucuz faz açıp hedefi kilitleme teşviki azalır).
- Mülk kaybı tavanı **hedef başına** ve kayan zaman penceresinde ölçülür; birden çok saldırganın kaybı çarpması önlenir. Sayı ve pencere [PARAMETRE].
- Saldıran hedefin kaba direnç bantlarını görür; savunan ayrıntılı risk ve kayıp dökümünü görür.
- Haraç/vasallık gibi siyasi sonuçlar mülk kaybı tavanından ayrı çözülür; açık şart, rıza/yetki kuralı, süre sınırı ve kötüye kullanım limiti taşır. Sessizlik egemenlik devri ya da teslim sayılmaz.

### Savaşın sonu ve ateşkes

Savaşın ilan edilen siyasi hedefi ve bitiş yolu olmalıdır. Azami savaş süresi/yorgunluk eşiği [PARAMETRE]; süre dolunca statükoyu koruyan otomatik ateşkes savaşı sonsuz tacize dönüşmekten çıkarır. Sessizlikle mülk, makam ya da egemenlik devredilmez. Ön talimat ateşkes tekliflerini kapsayabilir. Ateşkes sonrası yeniden saldırı bekleme sınırı yalnız önceki saldırana uygulanır; savunanın aynı savaşta kaybettiği mülkü geri alma istisnası korunur.

### Yokluk, uyku ve makam devri [UZLAŞI — onay bekliyor]

Oyuncu çevrimdışıyken kurum ve dünya akar; makamın sonucu tek kişinin girişine kilitlenmez. Karakter oyuncu adına otomatik karar vermez, entrika kurmaz ya da kontrolsüz kaynak harcamaz. Makam devri, dönem sınırı, seçim/halef usulü, meşruiyet aşınması ve terk edilmiş makam kuralı karakter ölümünden bağımsız gereksinimdir (**A-04a**). Ölüm, vâris ve hane ayrı karardır (**A-04b**; D-02 KESİN yönü §23’te). SP hanedan verisi online’a taşınmaz.

| Yokluk süresi [PARAMETRE] | Davranış | Koruma / açık nokta |
|---|---|---|
| 0–7 gün | Ön talimat ve yetki devri işler; yokluk tek başına yaptırım doğurmaz (**§18 evsizlik zinciri bu kuralın bilinçli istisnasıdır**) | Uyarı/vekil ayarı için UX tasarlanır |
| 7–30 gün | Oyuncunun belirlediği temsilci ya da kurumun kısıtlı geçici usulü temsil eder | Vekil büyük siyasi kararı tek başına alamaz |
| 30–90 gün | Uyku kademesi adayı: kişisel üretim/gelir ve rutin bakım/vergi birlikte durur | Başka oyuncu/kurumlara kira, borç, emanet ve sözleşme sürer; borç silinmez |
| 90 gün sonrası | Boş kalan makam önceden açıklanmış seçim/devir yoluna girer; karakter silinmez | Giden hükümdar vekil atayamaz |
| 180–365 gün | Sahipsiz mülkün kurum emanetine alınması değerlendirilebilir | Dönüşte eşdeğer karşılık hakkı korunur |

Bakım/vergi açığı mülk ya da makamı otomatik kaybettirmez. Dönüşte kamu olayları ile kişisel sonuçlar ayrılmış, sebep ve toparlanma yolları gösterilen bir özet alınır.

### Seçim sürekliliği [ÖNERİ]

Yeter sayı, eşitlik ve boş adaylık kuralları seçim açılmadan ilan edilir. Art arda yetersiz katılımda yeter sayı kademeli düşer; alt sınır ve başarılı seçim sonrası sıfırlama belirlenir. Yetersiz katılım makamı süresiz askıda bırakmaz. Geçici vekil yalnız günlük bakım ve önceden yetkilendirilmiş işleri yürütür; giden hükümdar vekili tek taraflı atayamaz.

## 11. Entrika, güven ve oyuncu koruması

İhanet ve gizli iş geçerli oyun tarzıdır; riskli ve bedelli olmalıdır: fırsat, yakalanma olasılığı, şüphe ve karşılık. Failin amacı, hedefin bilgisi ve üçüncü tarafların söylentisi ayrı tutulur. Sunucu gizli bilgiyi yanlış kişiye göndermez.

- **Ölüm mümkün ama zor [KESİN — Berkay, 30 Ekim 2026]:** hazırlık izi, savunma ve korumalar vardır; kanıtlanırsa ağır ceza ve kan davası (`OYNANIS_TASARIMI.md` §7). Suikast/kalıcı karakter silme ilk sürümde yoktur.
- Tekrarlı hedefleme, alt hesapla taciz, yeni oyuncu avlama, zorlayıcı ekonomik kilit ve girişe zorlayan savaş penceresi sınırlandırılır.
- İtibar ya da kaynak kaybı tek kötü zarla oyuncuyu oyundan çıkarmaz; itiraz, destek ya da telafi yolu vardır.
- Sohbet ve ad güvenliği yalnız istemci filtresi değildir: sunucu oran sınırı, rapor/engelleme, moderasyon kaydı ve gizlilik sınırları gerekir (§16).
- Gerçek para/şantajla oyun içi güç kazanmak, tehdit ve taciz oyun sistemi değildir.

## 12. Mobil deneyim, bildirim ve dönüş

- Ana ekran bir kerede 3–5 gerilimi ve bir sonraki eylemi gösterir. Her seçenek “ne harcarım, ne kazanabilirim, ne bilmiyorum, kim öğrenebilir?” sorularını yanıtlar.
- Bildirimler opt-in ve özetlenebilir. Acil savunma bildirimi bile sonucu bildirim süresine değil kurum kuralına bağlar.
- Yeniden bağlanınca idempotent olay imleciyle kaçırılan kamu olayları ve kişisel özet alınır. Uzun yokluktan dönüşte **dönüş ekranı** gösterilir (§18, Dönüş ekranı).
- Bağlantı kopmasında son işlem “sonuçlandı / reddedildi / henüz bilinmiyor” olarak ayrılır; tekrar gönderim ikinci etki doğurmaz.
- Yeni oyuncu ilk dakikalarda tek bir yerel ilişki, iş ve karar deneyimler.
- Altı dil: Türkçe, İngilizce, İspanyolca, Portekizce, Arapça, Rusça. Çoğul, sağdan sola düzen ve isim biçimi i18n kurallarıyla ele alınır.

## 13. Online teknik sınırlar ve 10.000 oyuncu senaryosu

“10.000 oyuncu” kayıtlı hesap hedefidir; eşzamanlı bağlantı (CCU) hedefi değildir. Rapor şunları ayrı verir: kayıtlı hesap, günlük/haftalık/aylık etkin kullanıcı, tepe CCU, eylem/saniye, bölge başına aktif aktör, olay yazma/okuma, kuyruk bekleme ve hata oranı. Yük testiyle kanıtlanır.

Mantıksal sınırlar: kimlik ve realm yönlendirme; yerel bölge/kurum durumu; toplumsal olaylar; düşük frekanslı küresel siyaset; olay/işleme altyapısı (idempotency, sıra, tekrar teslimat, sürümlü şema); okuma modeli. Tek global nesne, tüm nüfus taraması ya da bütün geçmişi istemciye göndermek kabul edilmez. Shard sınırı ticaret/diplomasiyi gizlice engellememeli.

**Uygulama biçimi [ÖNERİ]:** Ayrı mikroservisler yerine tek Worker içinde modüller (mülk, işletme, personel, ekonomi, masa, Debdebe). Mülk/işletme başına bir Durable Object (kasa ve maaş işlemleri içinde atomik), masa başına bir Durable Object (WebSocket), oyuncu başına cüzdan.

### Finansal bütünlük ve Durable Object ayrımı [ÖNERİ]

- **Masa DO (gerçek zamanlı):** yalnız oturum, katılım ve sohbet akışı. Para tutmaz, para işlemi yapmaz. Popüler bir handa çok sayıda masa olabilir: her masa ayrı DO’dur, han başına masa sayısı üst sınırlıdır ve masa trafiği han/işletme DO’sundan geçmez.
- **İşletme DO (finansal çekirdek):** ayarlar, kasa, rezervasyon, personel ve muhasebe **aynı DO’da** (tek yazıcı) tutulur. Bunları ayrı DO’lara bölmek DO’lar arası para uzlaştırma yükü yaratır; bölünmez.
- **Oyuncu cüzdanı DO:** oyuncunun akçesi.
- **DO’lar arası para transferi** (kasa ↔ cüzdan, maaş, kira): zorunlu işlem kimliği; tekrarlanan istek ikinci kez para üretmez (idempotent); **emanet (escrow)** ve çıkış kutusu (outbox) deseni: önce kaynakta bloke et, sonra hedefte yaz, sonra kesinleştir; yarım kalan işlem uzlaştırma döngüsüyle ya tamamlanır ya telafi edilir.
- İşletme defteri denetlenebilir ve uzlaştırılabilir olur (toplam akçe değişmezi testi).
- Faz 12 ön koşulu: transfer protokolü çift gönderim, yarım kalan işlem ve eşzamanlı yazma senaryolarında testle kanıtlanmış olmalı.

**Cloudflare adayının sınırları:** Mevcut beta Workers ve Durable Objects kullanır; bu yeni mimari için otomatik karar değildir. Resmî belgelere göre Durable Object tek iş parçacıklıdır, yatay ölçek için işin birden çok nesneye bölünmesi gerekir ve ~1.000 istek/s sert garanti değil yumuşak eşiktir. WebSocket hibernation kapasiteyi ispatlamaz. Queue teslimatı en az bir kez olabilir ve sıra garantisi yoktur; tüketici idempotent olmalıdır. Ücretsiz plan hedef nüfus için varsayılmaz.

- [Durable Objects best practices](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)
- [Durable Objects WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Durable Objects platform limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [Queues delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)
- [How Queues work](https://developers.cloudflare.com/queues/reference/how-queues-works/)

## 14. Veri alanları ve kalıcılık sözleşmesi

Uygulama fazı mevcut şemaları inceleyip gerçek tipleri çıkarır; aşağıdakiler kavramsal sınırlardır.

- **OnlineAccount / OnlineProfile:** hesap bağı, ayarlar, moderasyon durumu.
- **OnlineActor:** oyuncu/NPC actor ID, tür, profil, durum, konum, kontrol kaynağı.
- **Institution / Membership / AuthorityGrant:** kurum, üyelik, makam, yetki/delegasyon.
- **Relationship / Knowledge / Rumor:** aktör çiftine özel ilişki, kaynaklı bilgi, söylenti.
- **Profession / Service / Order / Contract / Inventory / Ledger:** ustalık, hizmet, emir, sipariş, malvarlığı, kaynak defteri.
- **RealmAlarm / WarPlan / StandingOrder / WarPhase:** alarm, hazırlık/ilan, talimat, faz/kuyruk.
- **AbsencePolicy / OfficeTerm / SleepStatus / PropertyTrust:** temsil kuralı, makam dönemi, uyku kademesi, mülk emaneti.
- **Property / Business / Staff / Wallet / Escrow / TransferLedger / BusinessReputation:** mülk, işletme, personel ve yetki matrisi, cüzdan, emanet, transfer defteri, işletme itibarı (§13, §17).
- **Table / TableSeat / Attendance / Oath / Pact:** han masası, koltuk, katılım (yalnız kim oturdu; içerik değil), yemin ve sözleşme (§16).
- **Lodging / HomelessState / ShelterGrant / AutoLodgingPolicy / ReturnSummary:** konaklama kaydı, evsizlik durumu, karakter × şehir misafir koruması, otomatik konaklama tercihi, dönüş özeti (§18).
- **cosmetic.\*:** Debdebe varlıkları, sahiplik, seviye, hediye, makbuz (§19). Oyun mantığı bu alanı **okumaz**.
- **WorldEvent / EventCursor:** değişmez olay ve ilerleme imleci.
- **Presence:** anlık bağlantı bilgisi; kalıcı oyun durumu değildir.

Şema/protokol değişiklikleri sürümlenir. Online veri namespace’i ve yedekleme/erişim politikası SP kayıtlarından ayrıdır. Mevcut Diyar verisine geçiş, silme ya da reset ayrı kullanıcı etkisi kararıdır.

## 15. Erişim, kötüye kullanım ve gizlilik

- Her eylem sunucu yetkilendirmesi, oran sınırı ve girdi doğrulaması alır; UI’da gizlemek güvenlik değildir.
- Kaynak ve mülkiyet değişimi atomik deftere yazılır; admin/test araçları oyuncu yetkisiyle karışmaz.
- Sohbet, ad, rapor ve engelleme için saklama amacı ve görünürlük tanımlanır; gereksiz kişisel veri tutulmaz. Ses kaydedilmez.
- NPC davranışı, düşmanlık ya da pazar fiyatı istemciden belirlenemez.
- Moderasyon ve yönetici işlemleri denetlenebilir kayda girer; gizli bilgi yetkisiz loglara ve kamu akışına sızmaz.
- Oyuncu başına ve bölge başına sunucu sınırları, tek kötü niyetli kullanıcının global sistemi kilitlemesini önler.
- Reklam/ödeme: satın alma sunucuda doğrulanır; istemci “satın aldım” demesi yetmez (§19).

## 16. Han ve sosyal mekân

**[KESİN — Berkay, 7 Kasım 2026]** Şehirlerde han gibi sosyal mekânlar bulunur. Oyuncu hana girer, “Masaya otur” der, masada isimler görünür, masada sohbet edilir (önce metin, sonra ses). Siyaset, diplomasi, karakter gelişimi, kavga ve planlar bu masalarda konuşulur. Ayrıntılar **[ÖNERİ]**dir.

### Yapı

- Her şehirde han; kasabada küçük han; köyde han yerine menzil/meydan [ÖNERİ].
- Masalar 4–8 kişiliktir. Koltukta oyuncunun **isim plakası** görünür.
- Masa türleri: açık (herkes), özel (davetli), meclis (kurum üyeleri), tüccar.
- Dönem uygunluğu: kahvehane 1247’de yoktur. Şerbethane, ahi zaviyesi, aşevi (imaret), hamam ve kervansaray kullanılır.

### Sohbet ve ses

- İlk sürüm **metinli**. Ses sonraki fazdır (Faz 16); ücretli üçüncü taraf hizmettir ve bütçe/moderasyon kararı ister.
- Ses: bas-konuş varsayılan; yalnız masadakiler duyar; **kaydedilmez**.
- Sohbet içeriği saklanmaz. Yalnız masada kimin oturduğu (katılım listesi) saklanır.

### Konuşma oyun durumunu bağlamaz

Serbest sohbet oyunu bağlamaz. Bağlayıcı olan yalnız butonlu eylemlerdir; sunucu doğrular, olay üretir ve masadakileri olayın katılım listesine yazar.

| Eylem | Sonuç | Katılım listesi |
|---|---|---|
| Yemin et | Kayıtlı söz | Masadakiler |
| Sözleşme sun | İki tarafın onayıyla yürürlük | Masadakiler |
| İttifak öner | Diplomasi olayı | Masadakiler |
| İhbar et | Söylenti ya da dava olayı | Masadakiler |
| Meydan oku | Kavga ya da şeref olayı | Masadakiler |
| Ziyafet ver | Debdebe ve nam olayı | Masadakiler |

### Kavga

“Meydan oku” ile başlar, sunucu çözer. İlk sürümde sonuç nam ve şerefle sınırlıdır; ağır kayıp yok. Masa sahibi “kavga yasak” seçebilir. Ölüm kuralları §11’e tabidir.

### Masa katılım kaydı [UZLAŞI — onay bekliyor]

Bağlayıcı bir eylem (yemin, sözleşme, ittifak, ihbar, meydan okuma) gerçekleştiğinde sunucu, **o anda masada kimlerin oturduğunu** olaya yazar. Amaç ispat tartışması değil, bilginin kimde olduğunu bilmektir: söylenti ve haber sistemi (§6) olayı yalnız orada bulunanların bildiğini varsayar; orada olmayan oyuncular ve NPC’ler haberi sonradan başkasından öğrenir.

- Eylemin kendisi (kim, kime, neyi söz verdi, iki taraf onayladı mı) sunucuda kayıtlıdır. Kanıt budur; oyuncuların hafızası ya da beyanı kanıt sayılmaz.
- **Saklanan:** olay kimliği ve masadaki katılımcı listesi. **Saklanmayan:** sohbet içeriği ve ses.
- Tanık ağırlığı (güvenilirlik, itibar, tarafsızlık hesabı) **yoktur**.
- **Ertelenenler [AÇIK KARAR D-28]:** tanık ağırlığı, mahkeme, sahte tanıklık, iftira ve rüşvet. Gerçek oyuncu sayısı ve uyuşmazlık verisi görülmeden tasarlanmaz.

### Canlılık ve oynanış bağları

- Han boş kalmaz: hancı, ozan, haberci ve tüccar NPC’leri masalarda oturur. İlan panosu, iş ilanı ve söylenti kaynağı olurlar. Sohbet yalnız oyuncular arasındadır.
- Karakter gelişimi: usta-çırak sohbeti ve hikâye anlatımı küçük ustalık/ilişki kazancı verebilir; azalan getiri ve günlük sınır uygulanır (anti-farm).
- Hancı bir oyuncu mesleğidir (§17).

### Moderasyon

Rapor, engelleme, sessize alma, masa sahibinin masadan atma yetkisi, oran sınırı ve küfür filtresi (6 dil, bütçelenmeli). Yaş derecelendirmesi ve mağazanın kullanıcı içeriği kuralları yayın öncesi doğrulanır.

### Debdebe yüzeyleri

Giriş anonsu, isim plakası çerçevesi, masa süsü, sohbet balonu, ziyafet afişi (§19).

## 17. Mülkiyet ve işletmecilik

**[KESİN — Berkay, 7 Kasım 2026]** Oyuncular han, dükkân ve pazar yeri gibi işletmeleri satın alıp açabilir. Sahibi adı değiştirebilir, dekore edebilir ve çalışan alabilir. Ayrıntılar **[ÖNERİ]**dir.

### Ortak çekirdek

**Mülk, İşletme, Personel, Kasa, İtibar.** Han, dükkân, hamam ve kervansaray aynı çekirdeği kullanır, yalnız işlevleri farklıdır. Mikroservis yerine tek Worker içinde modül (§13).

### Mülk türleri [ÖNERİ; kapasiteler PARAMETRE]

Küçük han, büyük han, şerbethane, aşevi (imaret), ahi zaviyesi, hamam, kervansaray, bedesten dükkânı, demirci, pazar tezgâhı.

### Edinim

- Şart: **akçe + nam eşiği ya da lonca üyeliği** [AÇIK KARAR D-17]. Tek hamlede satın alınamaz.
- Kişi başına başlangıç sınırı: 2 mülk [PARAMETRE].
- Mülk oyun içi akçeyle satılabilir, kiralanabilir ve devredilebilir. Gerçek para karşılığı hesap/mülk devri yasaktır (§9).

### Yönetim paneli

Metin ve düğmelerden oluşur: kasa, kapasite, çalışanlar, itibar, fiyatlar, işletme kuralları, muhasebe raporu, görünüm.

### Kişiselleştirme (oyun içi akçeyle)

Mimari tarz, atmosfer (sakin, hareketli, lüks, mütevazı), aydınlatma, özel alanlar (misafir odası, toplantı odası). Bu seçimler müşteri profilini ve itibarı etkileyebilir; **akçeyle** alınır. Gerçek paranın aldığı katman ayrıdır (§19). Mekân adı: ilk değiştirme ücretsiz; sonraki değiştirme ad jetonuyla (cosmetic). Otomatik filtre uygulanır; taklit ve hakaret yasaktır.

### Çalışanlar ve yetkiler

Sahip oyuncu ya da NPC işe alır. Roller: hancı, garson, aşçı, ozan, mekân yöneticisi. Yetkiler tek tek verilir.

| Yetki | Açıklama |
|---|---|
| Kasa | Kasayı kullanma |
| Müşteri | Müşteri kabul etme |
| Fiyat | Fiyat değiştirme |
| Personel | Yeni personel önerme |
| Vekâlet | Geçici yönetim |
| Masa | Masa moderasyonu (sessize al, at) |

Maaş sözleşmeyle bağlanır ve **emanet kasasından** ödenir. Ödemeyen işveren sözleşmeyi bozmuş sayılır.

### Gelir, gider, gelişim

- Gelir: NPC müşteri (günlük tavanlı), oyuncu müşteri (konaklama, yemek, masa), etkinlik ve kiralama.
- Gider: vergi, bakım, maaş, tedarik.
- Seviye: Mütevazı → Gelişen → Tanınmış → Prestijli → Şehrin Simgesi. Yükselme yalnız paraya bağlı değildir: müşteri memnuniyeti, itibar, faaliyet süresi ve ekonomik başarı birlikte sayılır. **Kapasite gerçek parayla artmaz.**
- İflasta mülk beyliğe döner; karakter, nam ve kişisel varlıklar silinmez. Sahibi uzun süre ilgilenmezse (parametre) mülk vekile devredilir ya da kamu açık artırmasına çıkar.

### İşletme itibarı, meslek, tedarik ve sosyal yaşam [ÖNERİ]

- **İki ayrı itibar:** karakter itibarı (kişinin saygınlığı) ve işletme itibarı (müşteri gözündeki değer). Biri diğerini etkileyebilir, ama aynı değer değildir. Sahibi saygın olup hanı kötü hizmet verebilir, ya da tersi. (Ayrı alan Faz 12’de.)
- **Meslek bağı:** Han satın almak iyi hancı olmak değildir. Hancılık hizmet kalitesini, aşçılık yemek kalitesini, muhasebe gider yönetimini, tüccarlık tedarik avantajını etkiler. Sahip bunları uzman çalışanlarla karşılayabilir; böylece savaşçı olmak istemeyen oyuncuya anlamlı bir ilerleme yolu olur. (Faz 13.)
- **Tedarik zinciri:** Demirci demiri başka oyuncudan alır, kervansaray taşır, tüccar başka şehirde satar. Ürünlerin hammadde, maliyet ve talep farkı vardır; aynı şehirdeki beş demirci aynı ürünü satmaz. (Faz 17.)
- **Sosyal yaşam:** han sahibi haftalık ziyafet ya da ozan gecesi düzenler; ahi zaviyesi usta-çırak buluşması yapar; işletmeler arası tedarik sözleşmeleri; bir oyuncunun başkasının işletmesinde kariyer yapması. (Faz 17.)

### İşletme kötüye kullanım koruması [UZLAŞI — onay bekliyor]

- Sahip çalışanı sebepsiz mağdur edemez: işten çıkarma ve maaş kesintisi sözleşme kurallarına ve kayda bağlıdır.
- Çalışan kasadan sınırsız para çekemez: yetkiye bağlı günlük tavan.
- İşletme kasası kişisel cüzdan gibi kullanılamaz: kasa→cüzdan çekimi kayıtlı ve tavanlıdır.
- Sahip–çalışan sözleşmeleri kayıtlıdır.
- Devirde borç ve sözleşmeler alıcıya açıkça gösterilir.
- Çoklu hesapla işletme ekonomisini manipüle etme (sahte müşteri, karşılıklı işlem) izlenir ve sınırlandırılır.

### Teknik

Kasa ve maaş işlemleri işletme DO’sunda atomik yazılır; DO’lar arası transferler §13’teki finansal bütünlük kurallarına tabidir. Dekor sayısı ve işletme durum boyutu için tavan konur.

## 18. Barınma ve evsizlik

**[KESİN — Berkay, 7 Kasım 2026]** Oyuncunun konaklayacak yeri olmalıdır. Zaman ortak ve tek bir dünya saatine bağlı olduğundan sayaç oyuncu çevrimdışıyken de işler.

### Evsizlik zinciri

Zincir, misafir korumasının bittiği andan sayılır.

| Aşama | Zaman (koruma bitişinden) | Sonuç |
|---|---|---|
| Misafir koruması | İlk yerleşimde 48 saat (4 ay); diğer şehirlerde 12 saat (1 ay) | Ücretsiz misafirhane |
| Acil uyarı | Koruma bittiğinde | “Acil kalacak yer bulmalısın” |
| Evsiz | +24 saat | **Evsiz** unvanı ve stat debuff’ı |
| Can kaybı | +72 saat | Can düşmeye başlar |

İlk yerleşim örneği: 48. saat uyarı, 72. saat Evsiz, 144. saat can kaybı. Bitişten önce bir hatırlatma gösterilir [ÖNERİ].

- **Can tabanı: %10. Ölüm yok** [KESİN]. Taban altına inilmez.
- **Konaklama sayılanlar:** kiralık han odası, kiralık ev, ev ya da mülk, başka oyuncu/NPC’nin süreli misafir daveti, uygun sosyal tesis. Konaklama bulununca zincir durur, Evsiz unvanı kalkar, debuff hızla toparlanır.
- Debuff değerleri, toparlanma hızı ve can kaybı hızı [PARAMETRE].

### Misafir koruması kuralları [KESİN]

- İlk yerleşim: 4 ay (48 saat), **karakter ömründe bir kez**.
- Sonraki her şehir: 1 ay (12 saat), **şehir başına yalnız bir kez**. Aynı şehre gidip gelmek korumayı yenilemez. Kayıt: karakter × şehir (`ShelterGrant`).

### Güvenlik ağları [UZLAŞI — onay bekliyor]

- **Otomatik konaklama talimatı:** yeterli akçe varsa han odası otomatik kiralanır (§10 ön talimat ilkesi).
- Dönüş özeti sebebi gösterir. Uyarılar uygulama içi ve opt-in push ile gelir.
- Etkinleştirme koşulu: kiralık oda sistemi (en azından NPC hanlar) yayında değilse zincir açılmaz.
- Uyku kademesinde (30+ gün) zincirin davranışı [AÇIK KARAR]. Taban %10 olduğu için sınırsız kayıp yoktur.

### Dönüş ekranı ve güvenli toparlanma [UZLAŞI — onay bekliyor]

- Uzun yokluktan dönen oyuncunun ilk ekranı **dönüş ekranıdır**. Durum (evsizlik, can, debuff) açık ve yargılamadan gösterilir: etkiler gizlenmez, ama toparlanabilir oldukları ve nasıl toparlanacakları belirtilir. Dil “ceza” değil “durum”dur (“yorgun”, “toparlan”); sayılar ve süreler dürüsttür.
- **Dönüş özeti:** konaklama durumu ve sona eren rezervasyonlar; işletmenin gelir ve giderleri; gelen mektuplar ve davetler; kamu ve siyasi olaylar; karakterin durumu.
- **Tek dokunuşla toparlanma:** yakındaki seçenekler (ücretsiz sosyal tesis/misafirhane; yeterli akçe varsa oda). Seçilince zincir durur ve toparlanma başlar.
- **Otomatik konaklama tercihi** oyuncunun önceden etkinleştirdiği opt-in bir talimattır; **varsayılan kapalı**, ilk günlerde öneri olarak sunulur. Modlar: (1) yeterli akçe varsa en ucuz uygun odayı kirala; (2) yalnız ücretsiz sosyal tesisi kullan; (3) harcama yapma, yalnız uyar.
- Uyku kademesindeki (30+ gün) davranış D-22’dedir.

### Odanın getirdikleri [ÖNERİ; oyun içi akçeyle]

- **Özel görüşme:** masadaki herkes olayın katılım listesine yazılır; odaya yalnız davetliler girer ve yalnız onlar yazılır. Rüşvet, gizli ittifak ve entrika burada kurulur. Karşı risk: hancı güveni, duvar kulağı.
- **Sandık:** eşya güvenliği; ölümde mirasçıya geçer.
- **Adres:** mektup, ilan ve davetler odaya düşer; ikamet şartı gerektiren işlerde (lonca, esnaf kaydı) geçerli adrestir.
- **Koruma:** kilit, muhafız ve misafir hakkı (hancının himayesindeki misafire saldırmak itibar kaybettirir).
- **Yolculuk:** uzun kervan/taşıma emirlerinde menzil han; risk azalır, yoldan haber toplanır.
- **Statü:** oda seviyesi ve oda süsü (§19).

### Kira

Peşin ve dönemlik (1, 3, 12 ay). Süre bitince oda boşalır, eşyalar han emanetine geçer, **borç doğmaz**. Oda kiralamak için yaş eşiği `OYNANIS_TASARIMI.md` §3’teki etkileşim eşiklerine bağlanır.

## 19. Debdebe ve gelir modeli

**[KESİN — Berkay, 7 Kasım 2026]** Oyun ekonomisine doğrudan etki eden para kazanma yolu eklenmez. Gelir; dekorasyon, görünüş ve skin alanlarında, oyuncuya saygın görünme hissi veren satışlardan gelir.

**Debdebe testi:** Bir satın alma oyuncunun akçe kazanmasını, nam kazanmasını, savaş ya da siyaset sonucunu veya bekleme sürelerini değiştiriyorsa Debdebe’ye girmez; oyun içi yolla verilir. Yeni her özellik bu teste sokulur.

### İnsanlar neden satın alır

Her ürün başkalarının gördüğü bir yüzeye bağlanır: han girişi, han masası, şehir meydanı levhası, profil kartı, sohbet balonu, mektup ve ferman, etkinlik afişi. Benzer sohbet odası uygulamalarında çerçeve, giriş efekti, rozet, hediye ve cömertler sıralaması ana gelir kalemidir.

### Katalog [ÖNERİ]

| Kategori | Örnek | Nerede görünür |
|---|---|---|
| Giyim | Hil’at, kaftan, başlık, kemer | Portre, masa, han |
| Portre çerçevesi | Oymalı, yaldızlı, mühürlü | Profil, masa plakası |
| Mühür ve arma | Kişisel ya da hane mührü | Mektup, ferman, levha |
| Giriş anonsu | “X Bey Han’a girdi”, davul ve boru | Han, şehir kapısı |
| Tezyin nişanı | Görsel rozet (metin unvanı değil) | İsim plakası |
| Sohbet balonu | Mühürlü, parşömen, ipek | Sohbet |
| Binek donanımı | İşlemeli eyer, kervan bayrağı | Şehir kapısı, han önü |
| Masa süsü | Halı, mum, bakır sini | Kendi masan |
| Oda süsü | Tezyin paketleri | “Odamı göster” ile davetlilere |
| Hayır eseri | Çeşme, sebil, levha | Meydan |
| Etkinlik afişi | Ziyafet, ozan gecesi, ihale | Han, pano |
| Tabela ve mekân görünümü | Han tabelası, vitrin etiketi | Şehir haritası |

### Debdebe seviyesi ve Cömertler Levhası

Harcama **Debdebe puanı** biriktirir. Seviye mühür rengiyle görünür (Bakır, Gümüş, Altın, Lacivert, Zümrüt). Seviye yalnız etikettir; oyun mantığı onu okumaz. Her şehirde haftalık ve sezonluk **Cömertler Levhası**; sezon sonunda ilk sıralar kalıcı levhaya yazılır. Hediye ve hayır eserleri de sayılır.

### Hediyeleşme

Masadaki birine hil’at, ikram ya da gül suyu gönderilir; alan kişide “X’in armağanı” rozeti görünür. Hediyeler devredilemez ve oyuncular arası akçeye çevrilemez; günlük hediye sınırı vardır. “Han’a ziyafet”: masadakilere afiş ve ikram görüntüsü gösterilir, sahibi levhada anılır.

### Sezon Defteri ve Ayan

- **Sezon Defteri:** her sezon kozmetik ödüllü bir iz; ücretsiz iz küçük, ücretli iz tam set verir.
- **Ayan (aylık abonelik):** özel çerçeve, giriş anonsu, ek mühür yuvası, masa süsü. Güç, gelir ya da kapasite yok.

### Sunum kuralları [UZLAŞI — onay bekliyor]

- Fiyatlar sabit ve görünür. Rastgele ödüllü paralı kutu yok.
- **Dene [ÖNERİ]:** Satın almadan önce ürün üç bağlamda simüle edilir: han masası (plaka, giyim, balon), şehir kapısı (giriş anonsu, unvan, binek) ve profil kartı. Önizleme canlı masada yapılmaz; aynı ortamı simüle eden, gerçek oyuncuları göstermeyen bir sahnedir. Kalabalık etkisi için sahneye NPC figüranlar konur.
- Satın alma çift dokunuşla onaylanır; harcama özeti ekranı vardır.
- Sezonluk sınırlı ürünlerin bitiş tarihi açık yazılır; sayaçla baskı yapılmaz.
- Reşit olmayanı hedefleyen sunum yok; harcama uyarısı/limit ayarı [ÖNERİ].

### Teknik sözleşme

- Debdebe verisi ayrı `cosmetic` alanında tutulur. **Oyun mantığı bu alanı okumaz**; test bunu zorlar: oyun hesaplayan modüller `cosmetic` içe aktaramaz.
- Satın alma akışı: mağaza ödemesi → sunucuda makbuz doğrulama → varlık verme. İşlem **idempotent**; iade ve iptal durumu ele alınır.
- Akçe ile gerçek para arasında dönüşüm yoktur. Premium para birimi kullanılırsa akçeye çevrilemez [AÇIK KARAR D-18].
- Mağaza komisyonu, vergi ve şirket yapısı yayın öncesi doğrulanır [AÇIK KARAR D-19].
- Tek oyunculu moddaki reklam/gelir kararı bu belgenin kapsamı dışındadır.

### Ölçüm

Hana giren oyuncu oranı, masada kalma süresi, ilk satın almaya kadar geçen süre, ödeme yapan oran, hediye gönderen oranı, rapor edilen masa oranı, sunucu maliyeti / gelir.

## 20. Uygulama fazları ve çıkış ölçütleri

Fazlar bağımsız, incelenebilir ve çevrimdışı (SP) moda dokunmayan dilimlerdir. Ajan her seferinde yalnız açıkça istenen fazı uygular. Faz 0’da mevcut kaynak haritası, D-13 canlı beta kararı ve SP sınırı çıkarılmadan büyük mimari değişiklik yapılmaz. Önce dar bir yaşam simülasyonu dikey dilimi kanıtlanır; savaş ve çoklu kurum kapsamı buna dayanarak açılır. Faz 0–9 numaraları v0.2 ile aynıdır.

| Faz | Çıktı | Tamamlanma ölçütü |
|---|---|---|
| 0. Denetim, güvenlik, teknik taslak | Online girişleri; SP temas/fallback’leri; kimlik, veri, protokol, hosting ve deploy haritası; eski beta canlı erişimi; maliyet, veri kaybı ve geçiş raporu | Her iddia dosya/akış kanıtına bağlı; D-13 için uygulanacak işlem ayrı açık; GDD işinden canlı değişiklik varsayılmamış |
| 1. Online kimlik ve sert SP sınırı | Ayrı online hesap/karakter ve kayıt alanı; Google girişi | Online ad istenir; SP ad/kayıt/profil erişimi yok; SP akışı ve kayıtları değişmemiş |
| 2. Dünya olayları, dönüş özeti, zaman | Sunucu olayı/imleç, idempotent yazma, ortak takvim (12 saat = 1 ay), kolektif süreçler için ilan edilmiş süre ve varsayılan | Ortak tur/ay kilidi yok; kaçırma tek başına ceza üretmiyor; bağlantı kopması çift etki yapmıyor |
| 3. Yaşam simülasyonu dikey dilimi | Küçük yerel toplumda bir meslek, bir NPC gündemi, bir hizmet/sözleşme ve sosyal tepki | Oyuncu insan yanıtı beklemeden karar tamamlıyor; aynı oturumda NPC kaynaklı kısmi sonucu görüyor |
| 4. Sosyal grafik ve bilgi | İlişki eksenleri, gerçek/bilgi/söylenti, hafıza, gerekçeli NPC davranışı | Hasan–Ahmet–Berkay senaryosu en az iki farklı maliyet/risk üretiyor; bilgi sınırları korunuyor |
| 5. Katmanlı NPC gündemi | İhtiyaç, hedef, konum ve olay tetikli bireysel karar; arka plan istatistikleri | Etkin oturumda en az bir NPC kaynaklı yeni gündem; boş bölgede düşük sıklıklı olay |
| 6. Sipariş, meslek ve ekonomi | Üretim/teslimat, stok, defter, insan/NPC tedariki, anti-farm; akçe cüzdanı | Gerçek girdi/teslimat değişiyor; NPC temel tedarik sağlıyor; döngü sınırsız kazanç üretmiyor |
| 7. Kurum, temsil, makam devri | Yetki, görev süresi, seçim/atama, sınırlı vekâlet, itiraz | Makam yokluğu toplumu kilitlemiyor; delege yetki sınırı aşılamıyor |
| 8. Hazırlık, diplomasi, çevrimdışı çatışma | Alarm, haber/söylenti, ilanlı savaş/gizli baskın, ön talimat, hedef tavanı, ateşkes | Yalnız onaylı kararlar uygulanmış; savunan çevrimiçi olmak zorunda değil; faz/kayıp/ateşkes istismarı sınırlı |
| 9. Denge, ölçek, güvenlik | NPC gündem hacmi tahmini, maliyet/CCU modeli, abuse/rapor akışı | 10.000 hesap ve CCU ayrı; kapasite, gecikme ve içerik maliyeti kanıtla raporlanmış |
| 10. Han masası (metinli) | Masa, koltuk, isim plakası, rapor/engel/sessize alma, katılım listesi; butonlu eylemler (yemin, sözleşme, ittifak, ihbar, meydan okuma); olaya masa katılım listesi yazılması (§16) | Üç hesap bir masada konuşuyor; eylemler olay ve katılım listesi üretiyor; serbest sohbet oyun durumunu değiştirmiyor; katılım kaydı sohbet içeriği taşımıyor. Ön koşul: Faz 2, 3, 4 |
| 11. Debdebe v1 ve ödeme altyapısı | Çerçeve, giriş anonsu, mühür, bağlamsal Dene önizleme (han, şehir kapısı, profil), makbuz doğrulama; `cosmetic` ayrımı | Satın alma idempotent, iade testi geçiyor, oyun modülleri `cosmetic` okumuyor. Ön koşul: Faz 10; D-18/D-19 kararları |
| 12. Mülkiyet çekirdeği | Han sahipliği, panel, kasa, isim, tezyin, edinim şartı; ayrı işletme itibarı; kasa↔cüzdan transfer protokolü (işlem kimliği, emanet, uzlaştırma) | Kasa işlemleri atomik; iflas karakteri silmiyor; kapasite parayla artmıyor; transfer protokolü çift gönderim ve yarım işlem senaryolarında testle kanıtlı, toplam akçe değişmiyor. Ön koşul: Faz 6; D-17 |
| 13. Çalışan, yetki, maaş, emanet | İşe alım, yetki matrisi, emanet kasası; meslek–kalite bağı; işletme kötüye kullanım koruması (§17) | Yetki matrisi testi geçiyor; ödemeyen işveren sözleşmeyi bozmuş sayılıyor; kasa çekim tavanı ve sözleşme kaydı çalışıyor. Ön koşul: Faz 12 |
| 14. Oda kiralama ve barınma | Kiralık oda (NPC hanlar dahil), misafir koruması, evsizlik zinciri, opt-in otomatik konaklama tercihi, can tabanı %10; dönüş ekranı ve tek dokunuşla toparlanma | Zincir §18 tablosuna uyuyor; ölüm yok; şehir başına bir kez koruma; oda sistemi yokken zincir kapalı; dönüş ekranı durumu açık ve yargılamadan gösteriyor, tek dokunuşla barınma sunuyor. Ön koşul: Faz 6 |
| 15. Hediye, Sezon Defteri, Ayan, Cömertler Levhası | Hediyeleşme, sezon izi, abonelik, levha | Hediye devredilemiyor, günlük sınır çalışıyor; paralı kutu yok. Ön koşul: Faz 11 |
| 16. Ses | Üçüncü taraf ses, bas-konuş, kayıt yok | Moderasyon araçları sesle çalışıyor; bütçe onaylı. Ön koşul: Faz 10 |
| 17. Diğer mülk türleri ve ortak işletme | Şerbethane, hamam, kervansaray, tedarik zinciri ve anlaşması, işletme etkinlikleri, lonca işletmesi | Ortak çekirdek yeniden kullanılıyor. Ön koşul: Faz 12 |

## 21. Ürün kabul ölçütleri

Bu ölçütler “özellik dosyada var mı?” yerine “oyuncu için sözleşme çalışıyor mu?” diye sorar.

### Kimlik ve SP ayrımı

- Temiz online başlangıçta online isim/karakter akışı vardır; hiçbir SP ismi otomatik gelmez.
- SP kaydı olmayan hesap online oynayabilir; online kaydı olmayan cihaz SP oynamaya devam eder.
- SP kaydını silmek/içe aktarmak online kurulumun ön koşulu değildir.

### Sosyal dünya

- İki oyuncu aynı NPC’yi görür; NPC’nin iki oyuncuyla ilişkisi ayrı olabilir.
- Arabuluculukta en az iki farklı makul strateji farklı maliyet ve risk taşır.
- Eylem sonucu “başarılı/başarısız”dan ibaret değildir; sebep açıklanır. Söylenti ve gizli bilgi anında yayılmaz.

### Topluluk ve süreklilik

- Lider çevrimdışıyken diğerleri dünyada işlem yapabilir; savaş sonucu liderin anlık bağlantısına kilitlenmez.
- Dünya devam ederken geri dönen oyuncu gerekçeli özet alır.
- Hükümdarlık/askerlik dışındaki en az üç meslek gündelik toplumda iş üretir; temel hizmet bir insan oyuncunun çevrimiçi olmasına bağlı değildir.
- Yoklukta makam süreci ve ekonomik yükümlülükler mülk/karakter cezasından ayrı işler; uyku oyuncular arası borcu silmez.

### Oturum ve NPC gündemi

- Her oturumda oyuncu, başka insanı beklemeden tamamlayabileceği en az bir karar bulur ve aynı oturumda kısmi bir yansıma görür.
- Etkin oturumda en az bir NPC kaynaklı yeni gündem ölçülür; boş bölgelerde de düşük sıklıklı gelişme üretilir.
- Süreçlerin katılmayan oyuncu varsayılanı süreç başında görünür.

### Savaş ve kamu düzeni

- Hazırlıkların her zaman görüldüğü varsayılmaz; sinyaller kaynak ve güvenilirlik taşır; gizli plan sızmaz.
- Alarm bedelsiz savunma bonusu değildir.
- Saldırı ve savunma çözümü oyuncunun çevrimiçi olmasına bağlanmaz.
- Otomatik savaş sonu sessizlikle egemenlik/mülk devretmez.

### Han, mülkiyet ve Debdebe

- Han masasında serbest sohbet oyun durumunu değiştirmez; yalnız butonlu eylemler olay üretir.
- Ses kaydedilmez; yalnız masa katılım listesi saklanır.
- Hiçbir Debdebe ürünü akçe, nam, savaş/siyaset sonucu ya da bekleme süresini etkilemez; test bunu doğrular.
- Mülk kapasitesi ve geliri gerçek parayla artmaz. Kasa işlemleri atomik ve idempotenttir.
- Satın alma tekrar gönderilse tek kez varlık verir; iade varlığı geri alır.
- DO’lar arası para transferleri çift gönderimde ikinci kez para üretmez; yarım kalan transfer uzlaştırılır; toplam akçe değişmezi testle doğrulanır.
- Dene önizlemesi han, şehir kapısı ve profil bağlamında çalışır ve gerçek oyuncu göstermez.

### Barınma

- Yeni oyuncu ilk yerleşimde 48 saat ücretsiz misafirhane alır; sonraki her şehirde şehir başına bir kez 12 saat.
- Zincir (uyarı, Evsiz, can kaybı) §18 zamanlarıyla çalışır; can **%10’un altına inmez** ve ölüm yoktur.
- Konaklama bulununca zincir durur ve debuff toparlanır. Otomatik konaklama talimatı yeterli akçeyle çalışır.
- Oda sistemi yayında değilse zincir açılmaz.
- Uzun yokluktan dönen oyuncu önce dönüş ekranını görür; durum açık ve yargılamadan sunulur; tek dokunuşla barınmaya ulaşır. Otomatik konaklama varsayılan kapalı, opt-in.

### Teknik ve oynanış sağlığı

- Her kritik yazmada tekrar güvenliği, yetki ve sunucu doğrulaması vardır; bekleyen işlem iki kez kaynak tüketmez.
- Altı dilde yeni metinler eksiksizdir; uzunluk ve RTL düzeni cihazda kontrol edilir.
- Ölçek, 10.000 hesap ya da CCU başarısı sayısal ölçüm olmadan “tamamlandı” sayılmaz.
- Sentetik test eğlence kanıtı sayılmaz; denge, okunabilirlik ve gerçek cihaz oturumu oyuncuyla değerlendirilir.

## 22. Başlıca riskler ve cevaplar

| Risk | Oyuncuda görünen sorun | Cevap |
|---|---|---|
| Online/SP sızıntısı | Yanlış isim, kayıt ya da davranış | Ayrı identity/domain/storage; import yok; sınır testleri |
| Tek hükümdar darboğazı | Dünya tek kişiyi bekler | Yetki devri, kurum kuralları, ön talimat |
| Çevrimdışı kayıp | Oyuncu yokken karakter/makam kaybı | Avatarı kurumdan ayır; kayıp koşulu görünür; karar onayı |
| Her şey simüle edilir | Maliyet ve karmaşa artar | Katmanlı nüfus; olay anında ayrıntı |
| NPC’ler dekor kalır | Paylaşımlı dünya hissi oluşmaz | Kalıcı aktör kimliği, çıkar, ilişki, kaynaklı bilgi |
| Oyun yönetim simine dönüşür | Gündelik yaşam gölgede kalır | Önce yerel yaşam dikey dilimi |
| Meslekler zorunlu darboğaz olur | Tek demirci yokken dünya durur | NPC taban hizmeti, alternatif tedarik |
| Her hazırlık anında görünür | Gizlilik anlamsızlaşır | Kaynaklı bilgi, yerel kapsama, yanlış söylenti |
| Alarm ücretsiz savunma olur | Hep seferberlik en iyi seçim olur | Kademeli bedel, yetki sınırı |
| Ekonomik tekelleşme | Yeni oyuncu üretemez | Alternatif tedarik, sınırlı tekel etkisi |
| Griefing / taciz | Oyuncu oyundan soğur | Yetki, oran sınırı, rapor/engel, tekrar hedefleme sınırı |
| Tek sıcak servis | Gecikme ve kesinti | Bölgesel/domain shard, küçük işlem, idempotent kuyruk |
| Kapsam patlaması | Online yeniden yapımı bitmez | Faz bazlı iş, her fazda oyuncu ölçütü |
| Debdebe P2W’ye kayar | Ödemeyenler kaçar | Debdebe testi; `cosmetic` ayrımı ve test |
| Han sohbeti kötüye kullanılır | Taciz, spam, reklam | Rapor, engel, sessize alma, oran sınırı, filtre, masa sahibi yetkisi |
| Ses maliyeti ve moderasyon yükü | Bütçe ve güvenlik sorunu | Önce metin; ses ayrı faz ve bütçe kararı |
| Para çoğaltma (kasa) | Ekonomi çöker | Atomik DO, idempotency, denetim kaydı |
| Evsizlik zinciri yeni oyuncuyu kaçırır | İlk haftada ceza hissi | 48 saat koruma, otomatik konaklama talimatı, can tabanı %10, hızlı toparlanma |
| Evsizlik için gezgin sömürüsü | Her şehirde bedava konaklama | Şehir başına bir kez koruma |
| Gri pazar (hesap/akçe satışı) | Ekonomi bozulur | Akçe paraya çevrilmez; devir yasağı; izleme |
| Kapsam şişmesi (yeni öneriler) | Online yeniden yapımı bitmez | Eklemeler [ÖNERİ]/[UZLAŞI] etiketli ve fazlara dağıtılmış; Faz 0–3 bloklanmaz |
| DO’lar arası para kaybı | Para çoğalır ya da kaybolur | İşletme kasası, rezervasyon ve ayar tek DO’da; transferde işlem kimliği, emanet, uzlaştırma |
| Dönüş ekranı gerçeği gizler | Oyuncu neden zayıfladığını anlamaz | Durum açık sayılarla gösterilir; ton yargılamaz |

## 23. Karar kaydı — Ajanın varsayım yapamayacağı konular

Etiketler §0’da tanımlıdır.

### [KESİN — Berkay]

| Konu | Karar |
|---|---|
| Ürün kimliği | Yaşam simülasyonu; krallık yönetimi tek yol değil. |
| D-01 finansman (30 Ekim 2026) | Ücretsiz katmanda başlanır; sınırlara yaklaşınca maliyet raporu ve ücretli plan önerisi sunulur. Durdurma koşulu açık. |
| D-02 karakter ömrü (30 Ekim 2026) | Karakter yaşlanır, ölür; hanedan vârisle sürer. Ayrıntı: `OYNANIS_TASARIMI.md` §8. |
| D-03 zaman | **12 gerçek saat = 1 oyun ayı**; ay dönümü 00:00 ve 12:00 (TR). Herkes 12 yaşında başlar; ilk 6 gün öğrenme dönemi; etkileşimler 12/13/16’da açılır. Ayrıntı: `OYNANIS_TASARIMI.md` §3. Takvim görünür; ortak tur kapısı yok. |
| D-05 toplum (30–31 Ekim 2026) | Tek dünya: Anadolu, 7 beylik; her beylikte şehir, kasaba, köyler. Davet edilen arkadaş davet edenin yerleşiminde başlar. Teknikte yerleşim başına sunucu parçası. **Ek B (D-05′) bu kararı güncellemeyi önerir: kurgusal bölgeler + vali + tek Sultan + Moğol dış güç; Berkay onayı bekliyor.** |
| D-06 hesap (30 Ekim 2026) | Google ile giriş; sunucu kimlik belirtecini doğrular; görünen ad ayrı seçilir; SP adına geri düşüş yok. |
| D-13 beta güvenliği (30 Ekim 2026) | İstemcide çok oyunculu giriş “Yakında” kartına çevrilir; eski sunucuya bağlanılmaz. Canlı Worker’ı kapatma/silme Berkay’ın işidir; ajan sunucuya dokunmaz. |
| Kayıp şiddeti (30 Ekim 2026) | Ölüm mümkün ama zor; hazırlık izi, savunma ve korumalar; kanıtlanırsa ağır ceza ve kan davası (`OYNANIS_TASARIMI.md` §7). |
| **D-15 gelir modeli (7 Kasım 2026)** | Gerçek para yalnız dekorasyon, görünüş ve skin satar; ekonomiye doğrudan etki eden gelir yolu yok (§19). |
| **D-16 barınma (7 Kasım 2026)** | Evsizlik zinciri §18’deki gibi: ilk yerleşimde 48 saat, uyarı, +24 saat Evsiz, +72 saat can kaybı; **can tabanı %10, ölüm yok**; ilk yerleşim bir kez, diğer şehirler 12 saat ve şehir başına bir kez. Sayaç çevrimdışıyken de işler. |
| **D-20 oyuncu mekânları (7 Kasım 2026)** | Oyuncular han, dükkân ve pazar yeri açıp dekore edebilir, adını değiştirebilir, çalışan alabilir. Hanlarda masaya oturma, görünen isimler, (sonra) ses ve konu özgürlüğü (§16–17). |

### [UZLAŞI — onay bekliyor]

| Konu | İlke | Etki |
|---|---|---|
| K-09 bekleme | Arayüz kilitleyen bekleme yok; kaçırma ek ceza üretmez; para beklemeyi atlatmaz. **§18 evsizlik zinciri bilinçli istisnadır.** | Varsayılan tablosu ve kaynak/para kuralları uygulanmadan önce onay. |
| A-03 savaş tebliği | Dar canlı pencere varsayılan değil; çözüm zamanı aktif oyuncu giriş aralığı P90’ından önce olmaz. | P90 tanımı, alfa 36–48 saat aralığı onay/ölçüm ister. |
| N-5 kayıp tavanı | Kayan mülk kaybı tavanı hedef başına; siyasi sonuçlar ayrı anti-abuse’a tabi. | Sayı/dönem Faz 8 öncesi. |
| N-7/N-11 savaş fazı | Hedef başına bir açık faz; saldıran başına bir kuyruk kaydı; maliyet, sıra, son tarih, zaman aşımı. | Faz 8. |
| N-10/N-12 savaş sonu | Ön talimat barış tercihini kapsar; azami süre statükoyu koruyan ateşkes üretir; yeniden saldırı soğuma sınırı önceki saldırana uygulanır. | Otomatik ateşkes egemenlik/mülk devretmez. |
| A-04a makam devri | Dönem sınırı, meşruiyet erimesi, seçim/devir, terk edilmiş hesap yolu. | Faz 7. |
| Uyku — K-04/N-6/N-8/N-9 | Kademeli yokluk; borç ve emanet sürer; rutin gider ve kişisel üretim birlikte durabilir. | Eşikler yalnız örnektir; mekanizma onay bekler. |
| N-13 seçim | Yeter sayı, eşitlik, boş adaylık kuralı süreç başında açıklanır; kademeli düşen yeter sayı; sınırlı vekil. | Taban, reset ve vekil yetkisi açık. |
| N-3/R-02 oturum/NPC | İnsan yanıtı beklemeyen karar ve aynı oturumda kısmi sonuç; etkin oturumda NPC gündemi. | Sayılar alfa ölçümü. |
| A-14/D-11 SP içerik | Varsayılan SP içerik paylaşımı yok. | Ortak içerik ancak ayrı kapsam kararıyla. |
| D-14 hızlandırma | İlk alfada kazanılmış kaynakla da bekleme atlatma yok. | Faz 6 simülasyonu sonrası. |
| D-03′ takvim gösterimi | Takvim görünür ama ortak kapı yoktur; kolektif kapanışlar ilan edilir. | Faz 2. |
| Han eylemleri | Konuşma oyunu bağlamaz; yalnız butonlu eylem olay üretir; masadakiler olaya yazılır. | Faz 10. |
| D-05′ siyasi yapı | Kurgusal bölgeler, 5–7 vali, tek Sultan, Moğol dış güç (NPC); darbe ve bağımsızlık aşamalı ve eşikli. | Ek B, P1–P6; D-05’i günceller. |
| Debdebe sunumu | Sabit fiyat, paralı kutu yok, Dene önizleme, çift dokunuş onayı. | Faz 11. |
| Akçe gerçek paraya çevrilmez; hesap/mülk devri yasak | Gri pazar ve mağaza riski. | Faz 6, 12. |
| Otomatik konaklama talimatı | Oyuncunun önceden etkinleştirdiği opt-in tercih (üç mod); varsayılan kapalı. | Faz 14. |
| Masa katılım kaydı | Bağlayıcı eylemde masadakiler olaya yazılır; tanık ağırlığı hesabı yok; sohbet içeriği saklanmaz. | Faz 10. |
| Dönüş ekranı | Yargılamayan dil, açık durum, tek dokunuşla toparlanma. | Faz 14; §12. |
| İşletme kötüye kullanım koruması | Kasa tavanı, kayıtlı sözleşme, devirde borç görünürlüğü, çoklu hesap izleme. | Faz 13. |

### [AÇIK KARAR]

| Karar | Öneri / mevcut taslak | Sahibi ve bağlı faz |
|---|---|---|
| D-01 durdurma koşulu | Yatırım, maliyet ve başarısızlıkta kapatma/arşiv planı yazılı olsun. | Berkay |
| D-09 ekonomi | Üretim, bakım, iş gücü, enflasyon, NPC taban arzı ve geri dönüş yollarını simülasyonla dengele. | Berkay; Faz 6 öncesi |
| D-04 süre ve yokluk parametreleri | Tebliğ, teklif, uyku, faz süreleri ölçülecek parametre. | Berkay + alfa verisi |
| A-04b ölüm/vâris | Çevrimiçi karakter ölümü, hane ve miras ayrıntısı. | Berkay; ekonomi fazından önce |
| N-4 canlı sunucu aksiyonu | D-13 kapsamında geri alınabilir kapatma ya da kimlik yaması. | Berkay |
| Tarihsel yıl/bölge | 13. yüzyılın hangi aralığı ve siyasi coğrafyası. | Berkay; fraksiyon/takvim/kurum isimlerinden önce |
| NPC gündem içerik yükü | Faz 3 sonrası şablon hacmi tahmini. | Faz 5 öncesi |
| 10.000 oyuncu/CCU | Kayıtlı hesap, eşzamanlılık ve etki yükü ayrı ölçülür. | Yük testi |
| Hosting/ücret ve shard | Cloudflare yalnız adaydır. | Berkay; Faz 0 raporu sonrası |
| Hesap başına karakter ve ad | Bir etkin online karakter; realm içinde ad benzersizliği. | Faz 1 öncesi |
| **D-17 mülk edinme eşiği** | Akçe + nam eşiği ya da lonca üyeliği. | Berkay; Faz 12 |
| **D-18 premium para birimi** | Doğrudan fiyat mı, premium para mı? Premium akçeye çevrilemez. | Berkay; Faz 11 |
| **D-19 mağaza komisyonu, vergi, şirket** | Yayın öncesi doğrulanır; muhasebeciye danışılır. | Berkay; Faz 11 |
| **D-21 debuff ve toparlanma değerleri** | Evsiz stat debuff’ı, can kaybı hızı, toparlanma süresi. | Berkay + alfa; Faz 14 |
| **D-22 uyku kademesinde zincir** | Uyku (30+ gün) karakterde zincirin davranışı. Taban %10 olduğu için sınırsız kayıp yok. | Berkay; Faz 14 |
| **D-23 sosyal tesisler** | İmaret/zaviye gibi yoksul konukluk yerleri konaklama sayılsın mı? | Berkay; Faz 14 |
| **D-24 ses sağlayıcı ve bütçe** | Üçüncü taraf ses, moderasyon yükü, yaş derecelendirmesi. | Berkay; Faz 16 |
| **D-25 moderasyon dilleri** | 6 dilde küfür filtresi kapsamı. | Berkay; Faz 10 |
| **D-26 NPC gelir tavanı ve vergi oranları** | Denge testiyle belirlenir. | Faz 6/12 |
| **D-28 tanık ağırlığı ve mahkeme (ileri)** | Tanık ağırlığı, sahte tanıklık, iftira, rüşvet ve mahkeme; gerçek oyuncu verisi görülmeden tasarlanmaz. | Berkay; Faz 10 sonrası |
| **D-29 işletme itibarı ve tedarik zinciri kapsamı** | v1’de mi, sonra mı? | Berkay; Faz 12/17 |

## 24. Ajan için uygulama istemleri

Her uygulama isteğinde ilgili faz ve kabul kapsamını doldurup kullan:

> `KRONIKLER_ONLINE_GDD.md`yi, `AGENTS.md` ve `OTURUM_HAFIZASI.md` yönergelerini oku. Belgenin tamamını okuma: “Ajan için özet”, §0, §20’de istenen faz, ilgili sistem bölümü ve §23 yeterlidir. Bu görev yalnız **Faz [numara/ad]** kapsamındadır. Önce mevcut kodda bu fazın online girişlerini, veri kaynağını, sunucu sözleşmesini ve UI akışını hedefli incele; eski Multiplayer/Diyar davranışını gereksinim sayma. GDD’deki ilgili kurala ve şu kabul ölçütlerine göre en küçük uçtan uca dilimi uygula: **[ölçütleri yaz]**. Online kimlik, kayıt ve runtime’ı SP karakter/ad/save verisinden kesin ayır; SP akışını değiştirme. **[AÇIK KARAR]** ve onay bekleyen **[UZLAŞI]** maddelerini kesinleştirme; bağımsız işi sürdür, engellenen kısmı raporla. Sonuçlar sunucu otoritesinden gelsin; yetki, tekrar güvenliği, hata toparlama, neden açıklaması ve altı dil gereksinimini kapsa. Ücretli servis, mağaza/ödeme entegrasyonu, canlı entegrasyon, deploy, APK, commit ve push yapma. Yalnız istenen faza uygun doğrulamayı çalıştır ve gerçekten çalıştırdıklarını raporla. Sonunda değişen dosyaları, SP sınırını nasıl koruduğunu, kanıtı ve kalan riskleri özetle. Önce plan/inceleme istendiyse hiçbir dosyayı değiştirme.

Ek koşullar:

- Ürünü yaşam simülasyonu olarak ele al; krallık yönetimini tek ilerleme yolu yapma. Önce istenen fazdaki en küçük yerel yaşam döngüsünü tamamla.
- **[UZLAŞI]**, **[ÖNERİ]**, **[PARAMETRE]** ve **[AÇIK KARAR]** ayrımını koru. Örnek sayıyı onaylı kural sayma.
- Oyuncunun insan yanıtı beklemeden tamamlayabildiği bir karar ve aynı oturumda kısmi sonuç hedefle; yapay bekleme ekleme.
- Temel hizmetlerde NPC taban kapasitesi bırak.
- Savaş fazında hazırlık izlerini kaynak ve güvenilirlikle sınırla; çevrimiçi savunma zorunluluğu ekleme.
- **Debdebe/ödeme fazlarında:** gerçek paranın akçe, nam, güç, gelir, kapasite ya da bekleme sürelerine dokunmasını engelle; `cosmetic` ayrımını testle zorla; makbuz doğrulamasını sunucuda ve idempotent yap.
- **Han fazlarında:** serbest sohbeti oyun durumuna bağlama; yalnız butonlu eylemler olay üretsin; ses kaydı ve sohbet içeriği saklama.
- **Barınma fazında:** §18 zamanlarına, can tabanına (%10) ve “ölüm yok” kuralına uy; oda sistemi yokken zinciri etkinleştirme. Otomatik konaklamayı varsayılan açma; dönüş ekranında durumu gizleme.
- **Finans fazlarında:** DO’lar arası her para transferinde işlem kimliği, idempotency, emanet ve uzlaştırma kullan; işletme kasası, rezervasyon ve ayarlarını tek DO’da tut; masa DO’sunda para işlemi yapma.
- **Han fazında:** olaya yalnız masa katılım listesini yaz; sohbet içeriği ya da ses saklama; tanık ağırlığı ya da mahkeme ekleme (D-28).
- Tarihsel iddiayı dönem/bölge kararı kesinleşene kadar esin kaynağı olarak sun.

### Yalnız inceleme istemi (Faz 0)

> `KRONIKLER_ONLINE_GDD.md`yi ürün hedefi, `AGENTS.md` ve `OTURUM_HAFIZASI.md`yi çalışma sınırı kabul et. Kod değiştirme. Yalnız Faz 0 denetimini yap: online giriş/kimlik/ad fallback’leri, online–SP import ve kayıt temasları, istemci–sunucu protokolü, kalıcılık ve canlı deploy bağları için dosya/akış kanıtını çıkar. Mevcut beta davranışını yeni gereksinim varsayma. GDD’ye göre hedef sınır, mevcut sapma, olası veri kaybı/oyuncu etkisi, faz bağımlılıkları ve en küçük yeniden kurulum planını raporla. Eski GDD/arşiv dosyalarını açma. Canlı sunucuya bağlanma. Belirsiz kararları kendin doldurma.

## 25. Belgenin yönetişimi ve kapsam değişikliği

- Bu GDD online modun ürün/oynanış hedefidir; `AGENTS.md` ve `OTURUM_HAFIZASI.md` repo çalışma kurallarıdır. Çakışmada repo kurallarına uyulur; ürün çelişkisi görünür biçimde raporlanır.
- `TASARIM_PUSULASI.md` genel kalite ölçütüdür; bu belge yalnız online mod için ayrıntılandırır. `docs/online/OYNANIS_TASARIMI.md` KESİN kararların (D-02, D-03) ayrıntı kaynağıdır; bu belgeyle çelişirse Berkay’a sorulur.
- `docs/MULTIPLAYER.md` mevcut Diyar envanteridir, hedef tasarım değildir.
- Yeni kapsam karar tablosuna durum, tarih ve gerekçeyle eklenir. Onay olmadan kapsam dışı mekanik “v1”e sokulmaz.
- Tasarım revizyonunda istemler, kabul ölçütleri ve ilgili fazlar aynı değişiklikte gözden geçirilir.
- Başarı, yalnız test sayısıyla değil; gerçek oyuncunun kısa oturumda kararı anlayıp sonucun sebebini görebilmesiyle değerlendirilir.
- Bu belge büyüdüğünde ajan okuma maliyetini düşürmek için “Ajan için özet” bölümü güncel tutulur; ayrıntılı bölümler yalnız ilgili faz için okunur.
