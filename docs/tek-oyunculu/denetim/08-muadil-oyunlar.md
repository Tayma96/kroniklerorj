# Denetim 8 — Muadil oyunlar ve sayfa sayfa uyarlama (17 Kasım)

Kapsam: tek oyunculu Kronikler. Kaynak: web (sonda), denetim 01–04, TASARIM_PUSULASI.
Menü adları sürüme göre değişebilir; aşağıdaki ekran yapıları ana hatlarıyla verilmiştir.

## 1. Seçilen üç oyun ve gerekçe

| Oyun | Neden | Eleme notu |
|---|---|---|
| **BitLife** (mobil) | Aynı tür: doğum→ölüm, yıl tuşu, okul/iş/ilişki/mülk, vâris olarak devam. Mobil sadeliğin kıyas noktası. | Reklam/parayla atlama modelini almayacağız. |
| **Fallen London** (+Sunless) (mobil/tarayıcı metin) | Statın her kararda **kapı ve şans** olarak görünmesi (quality-based narrative). Bizim en büyük açığımız: 344 seçenekten 1'i stat okuyor. | Mum (action) zamanlayıcısı alınmaz. |
| **Crusader Kings III** (hanedan) | Ömür boyu ilerleme (lifestyle/perk), stres/huy, eğitim→huy, hanedan şöhreti/miras. Vâris döngüsünün altın standardı. | Masaüstü karmaşıklığı ve harita alınmaz. |

Değerlendirilip elenenler: Reigns (tek eksen kart; derinlik yok, ama "kart" dili ana ekran için ilham), King of Dragon Pass/Six Ages (danışman yorumu harika → öneri 6'ya taşındı, ama klan yönetimi tekil hayat değil), Life is a Game/Alter Ego (BitLife alt kümesi), Choice of Games (stat gate iyi ama doğrusal), A Dark Room (keşif/açılım ritmi; zamanlayıcıya dayanıyor), Mount & Blade (kariyer serbestliği güzel, metin değil).

## 2. Oyunların ekran yapısı ve mekanikleri

### 2.1 BitLife

- **Gezinme:** Ana ekran tek akış (yıl yıl olay günlüğü) + alt şerit 4 düğme ve ortada büyük **"Age +"**: Occupation (Meslek), Assets (Varlık), Age, Relationships (İlişkiler), Activities (Etkinlikler). Toplam 5 giriş.
- **Ana ekran:** Üstte ad/para, ortada yılın metin günlüğü, altta 4 bar (Mutluluk, Sağlık, Zekâ, Görünüş). Olaylar açılır pencere kartı: 2–4 seçenek, çoğu sonuç gizli.
- **Karakter/stat:** 4 bar, 0–100, çoğu rastgele doğar; etkinliklerle (spor salonu, kitap, meditasyon) küçük artış. Gizli statlar (karma, atletizm vb.) belirli kariyerlerde kapı olur.
- **Beceri/ilerleme:** Ayrı beceri ağacı yok; ilerleme = iş kademesi + "special careers" (ünlü, sporcu, kraliyet) içindeki aşamalar.
- **Eğitim:** Okul otomatik; oyuncu "daha çok çalış", kulüp/klik seçer; üniversite bölümü ve yüksek lisans seçimi mesleğin kapısı.
- **Kariyer:** "Jobs" listesi gerçek ilanlar gibi; **mülakat soruları** (2–3 soru kartı) + eğitim/stat şartı. 13'te part-time/freelance. Terfi: çalışma çabası + yıl.
- **İlişkiler:** Tek liste, kişi başına ilişki barı; eylem menüsü (vakit geçir, iltifat, tartış, para iste).
- **Aile/vâris:** Ölünce çocuk listesinden biri seçilir, miras aktarılır; "Generations" sayacı. Vasiyet ekranı.
- **Ekonomi/işletme:** Assets: mülk, araç, eşya, yatırım; işletme/kira genişleme paketleri ücretli.
- **Kayıt:** Yaşam günlüğü kaydırılır; "Graveyard" geçmiş hayatlar listesi. Başarı "ribbon"ları hayatı tek sözcükle etiketler (ör. "Zengin", "Akademisyen").
- **Ders:** 5 giriş noktası ve tek akış mobilde çok güçlü. Zayıflık: kararların nedeni gizli, ilerleme sığ, ölü seçenek bol.
- **Ele:** God Mode/Time Machine (parayla geri sarma), ödüllü reklam, Bitizenship paywall, "özel kariyer" paketleri.

### 2.2 Fallen London / Sunless serisi

- **Gezinme:** Üst sekmeler: Story (bölge + kart destesi + kalıcı "storylet"ler), Possessions (eşya/kuşam), Myself (statlar ve tüm "quality"ler), Fate (premium), Profile/Journal. Sunless Sea/Skies'ta harita + liman menüsü + "Captain" ekranı.
- **Ana ekran:** Bulunduğun yerdeki kalıcı hikâyeler + eldeki **kartlar** (rastgele çekilir, tut/at). Her kart dalı başlığında gereken quality ve **başarı şansı yazılı** ("chancy", "low-risk", yüzde).
- **Stat kullanımı:** 4 ana stat (Watchful, Shadowy, Dangerous, Persuasive) her dalda test edilir. Zorluk = statın zorluğa eşitken %60 (Broad); Narrow testlerde her puan %10 kaydırır. Şans yalnız "Luck" türünde ve açıkça etiketli. Kuşam statı artırır → eşya ile stat bağlantısı anlamlı.
- **İlerleme:** "Menace" (Wounds, Scandal, Suspicion, Nightmares) başarısızlıkta artar, eşiği aşınca seni ceza bölgesine taşır (ölüm yok, **telafi edilebilir kayıp**). Hikâye yayları quality sayaçlarıyla ilerler; "Ambition" ve "Profession" geç oyunda uzun kemer.
- **Meslek:** Oyuncu seçer, değiştirebilir; meslek bir quality'dir ve özel kart/dal açar.
- **İlişkiler/aile:** Kişiler quality olarak tutulur (ör. "Acquaintance: X 3"); aile/vâris yok (Sunless Sea'de "kalıt" var: ölümde bir mirası sonraki kaptana aktar — biz bunu zaten yapıyoruz).
- **Kayıt:** Journal/"Remembered"; olay metni kalıcı.
- **Ele:** **Mum/action zamanlayıcısı** (eylem hakkı zamanla dolar), Fate ile hikâye satın alma, farm döngüleri ("grind" topluluk şikâyeti).

### 2.3 Crusader Kings III

- **Gezinme:** Sol üst portre → Karakter ekranı (statlar, huylar, sekmeler: aile, ilişkiler, unvan), sağ altta Lifestyle, alt şeritte Dynasty, Council, Court, Realm, Military, Intrigue, Faith, Decisions (yaklaşık 9–10 menü). Olay penceresi tam ekran ortada.
- **Stat:** 5 stat (Diplomacy, Martial, Stewardship, Intrigue, Learning) + Prowess. Statlar doğrudan kurul görevlerinde, savaşta, planlarda ve **olay seçeneklerinin başarı şansında** kullanılır; seçenek üzerinde ipucu "Diplomacy 12 → %70".
- **İlerleme:** 5 lifestyle × 3 perk ağacı; **odak (focus)** seçersin, ay ay XP akar, perk açılır. Bir ömürde 2–3 ağaç bitirilir → ilerleme ölüme dek sürer. Son perk bir **huy** verir. Yaşla stat düşer (yaşlılık), hastalık/yara.
- **Stres:** Huyuna aykırı seçim stres verir (merhametli kişi infaz ederse). Eşikler aşılınca başa çıkma huyu (içki, kendine zarar, gezgin). Huy = kimlik; karar = bedel.
- **Eğitim:** Çocuğa **eğitmen + odak** atanır, 16'da eğitim huyu (1–4 kademe) ve odak statı. Çocukluk huyu olaylarla şekillenir.
- **Aile/vâris:** Vâris otomatik (veraset yasası), oyuncu oyunu ona geçirir. Dynasty ekranı: şöhret (renown) tüm hanedanın üyelerinden birikir, **legacy** ağaçlarına harcanır (ör. "hanedan üyeleri daha iyi eğitim alır").
- **Ekonomi:** Para/prestij/dindarlık üç döviz; binalar yapılır, ama kişisel işletme yok.
- **Kayıt:** Kronik/hanedan ağacı; ölüm ekranı "hükümdarlık özeti".
- **Ele:** Masaüstü harita ve 10 menü; DLC ile mekanik satın alma. Gerçek zamanlı akış zaten yok (duraklatılabilir) → uyumlu.

## 3. Kronikler için sayfa sayfa uyarlama

Hedef gezinme (denetim 03 ile uyumlu): **5 sekme — Bugün / Ben / İnsanlar / Çarşı / Defter**, ortada "Ay İlerle". 21 menü kartı kalkar; her şey bu beşin altında katmanlı açılır. BitLife'ın 5 girişi kanıttır: mobilde fazlası kaybolur.

### Bugün (ana ekran)
- **Onlarda:** BitLife tek günlük akış + kart; FL eldeki 3–5 kart + kalıcı hikâyeler; CK3 olay penceresi.
- **Bizde:** Üstte ay/yaş/4 sermaye şeridi; ortada **en çok 3 "gündem kartı"** (açık gerilimler) + 1 ayın kararı; altta kısa ay özeti. Uyarı çipleri, MkHal/MkKirilma blokları kalkar veya karta dönüşür. Tarih'e 3 düğme → tek "Defter'de aç".
- **Daha iyisi:** Gündem kartları FL kartı gibi **tutulabilir/ertelenebilir** ama süreleri yok (FOMO yok). Her kartın altında "neden burada" satırı (ör. "Kalfa Yusuf seni pazarda kötüledi, 2 ay önce"). Elle tek ekranda 5 gerilim tavanı motor düzeyinde zorlanır.

### Ben (karakter + stat + huy)
- **Onlarda:** BitLife 4 bar; FL Myself sayfasında tüm quality'ler; CK3 portre + stat + huy + stres barı.
- **Bizde:** Portre, 4 stat, 4 beceri, **huylar** ve **gönül yükü (stres)** tek sayfada; ham XP sayısı yerine "Zekâ 7 — kâtiplik sınavlarında güçlü" gibi işlev cümlesi. Yaşla stat eğrisi (35+ güç/dayanıklılık yavaş düşer, zekâ/karizma "hikmet" olarak sürer).
- **Daha iyisi:** Her statın yanında "son 12 ayda bu stat 9 kararda kullanıldı" sayacı → statın anlamı görünür. Kuşam artık statı da etkiler (eşya 30 parça, hiçbiri güç/zekâ vermiyor).

### Beceri ağacı (hünerler)
- **Onlarda:** CK3 odak → aylık XP → perk; son perk huy verir; ömürde 2–3 ağaç.
- **Bizde:** 4 dal × 3 kademe ağacı kalır ama **odak (niyet)** eklenir: "Bu yıl neye niyet ettin?" — Ahi yolu (sosyal), Sefer (savaş), Çarşı (ticaret), Hüner (zanaat). Niyet ayda XP akıtır; ilerleme 28'de değil ölüme dek sürer çünkü kademe maliyeti artar ve **ikinci/üçüncü dal** açılabilir. Dal sonu bir huy/lakap verir ("Cömert", "Gazi", "Hâce").
- **Daha iyisi:** Ölü hünerler (Mucit, kalkanlı, çevik/nişancı) karar seçeneklerine kapı olarak bağlanır; bir hüner ya bir seçenek açar ya şansı değiştirir, ikisini de yapmıyorsa silinir.

### Mektep / medrese
- **Onlarda:** BitLife okul otomatik + "daha çok çalış"; CK3 **eğitmen + odak**, sonuçta eğitim huyu.
- **Bizde:** "XP makinesi" yerine **hoca bir NPC** (yakın çevreye girer) ve yıllık tek odak seçimi; 17'de sonuç bir **icazet** (Kur'an/hat/hesap/tıp/kılıç) — ileride kapı açan kalıcı belge. Ders tıklama döngüsü kalkar: yılda 2–3 anlamlı mektep olayı + sınav.
- **Daha iyisi:** Mektepte arkadaşlar (akran 3–4 kişi) yetişkinlikte ortak/rakip olarak döner; medrese → kadılık/kâtiplik, sıbyan → çıraklık yolu ayrımı oyuncu kararıdır. 18+ ölü sayfa yerine "ders halkası" (yetişkin talebe veya müderris olma) — geç oyun içerik.

### Meslek (ahilik, peştamal)
- **Onlarda:** BitLife iş ilanı + mülakat soruları; FL meslek seçilir/değişir; CK3 kurul görevi stat ister.
- **Bizde:** 13'te atama yerine **"Usta kapısı" sahnesi**: hocanın, babanın ve mahallenin önerdiği 3 usta; oyuncu seçer, her usta farklı huy ve kapı (stat şartı görünür). Çırak→kalfa→usta→pir kalır; peştamal sınavı stat + beceri + ustayla bağ okuyan **3 aşamalı kart** (FL tarzı şans etiketiyle).
- **Daha iyisi:** Meslek değiştirmek sıfırlamaz: beceri ve namın bir kısmı taşınır ("asker iken öğrendiğin disiplin"). Her meslek tek imza eylemi yerine **yıllık bir usta işi siparişi** zinciri (şaheser), lonca/ahi zaviyesiyle bağlı. Pir kademesi: çırak yetiştirmek → ilerleme yaşlılıkta da sürer.

### İşletme / han / dükkân (yeni)
- **Onlarda:** BitLife kira/iş paketleri (ücretli); CK3 bina; FL yok. Boşluk büyük — farklılaşma fırsatı.
- **Bizde:** Mülkler "pasif çarpan" olmaktan çıkar. Han, dükkân, atölye bir **işletme kartı**: 3 ayar (fiyat, kalfa sayısı, kalite), mevsimlik bir karar, kervan/refah/güvenlik ile gelir. Hancı mesleği han işletmesine bonus ve özel olay alır.
- **Daha iyisi:** **Vakıf** ile hayır işi işletmeyi hanedana bağlar: vakfettiğin han itibar + hanedan şöhreti verir, vâris onu devralır ama satamaz. Mülk sayısı yerine işletme sayısı 1–3 ile sınırlı (farm kapalı; her biri bir gerilim kaynağı).

### İnsanlar (ilişkiler + sosyal + mahalle)
- **Onlarda:** BitLife tek liste + bar; CK3 dost/rakip/aşık/vasi rolleri; FL kişi = quality.
- **Bizde:** Tek sayfa, üç halka: **Yakın (≈15)**, Mahalle, Şehir. Her kişide rol rozeti (dost, rakip, hoca, usta, borçlu, gönül) ve son 3 etkileşimin nedeni. Söylenti = kişi kartında "duyduğun".
- **Daha iyisi:** CK3 gibi rol ilişkileri **mekanik** sonuç doğurur: rakip pazarda fiyat kırar, dost peştamal sınavında kefil olur. Gerçek/bilinen ayrımı: kişinin huyu sen öğrendikçe açılır.

### Aile / hanedan
- **Onlarda:** BitLife vâris seçimi + miras; CK3 hanedan şöhreti + legacy, eğitmen atama.
- **Bizde:** Hanedan + nesil + ocak + OcakSekmesi tek "**Ocak**" sayfası: soy ağacı, çocukların eğitimi (hoca ve odak ata), evlilik, ve **Ocak namı** (CK3 renown karşılığı). Ölüm ekranı hayat özeti + lakap + vâris seçimi.
- **Daha iyisi:** Ocak namı, kuşaklar boyunca birikip "**Ocak gelenekleri**"ne harcanır (ör. "Ahi Ocağı: çocuklar çıraklığa +1 beceriyle başlar", "Kâtipler Ocağı", "Gazi Ocağı"). Bu, vâris devrini zirve yapar ve ilerlemeyi hayat ötesine taşır.

### Defter (tarih + roman + kronik + hikâyeler + başarım)
- **Onlarda:** BitLife günlük + mezarlık + ribbon; CK3 kronik; FL journal.
- **Bizde:** Tek Defter, üç sekme: **Bu hayat** (yıl yıl), **Ocak** (kuşaklar, mezar taşları), **Yaylar** (açık/kapanmış hikâye yayları). Roman = Bu hayat'ın "anlatı görünümü" düğmesi. Ayarlar/SSS/krediler Defter'in altına.
- **Daha iyisi:** Her kayıt satırı nedeni gösterir ve ilgili kişiye/karta bağlanır. Hayat sonunda BitLife ribbon'ı gibi bir **lakap** ("Hancı Hasan", "Kefil Ali") ve mezar taşı kitabesi.

### Çarşı (pazar + kervan + atölye + mülk + şehir)
- **Onlarda:** BitLife Assets; CK3 Realm/binalar.
- **Bizde:** Çarşı sekmesi: üstte "Senin işin" (meslek tezgâhı + işletmeler), altta Pazar, Kervan, Mülk, Şehir (divan, haberler). Güç/suç/savaş 13+ yaşla açılan alt grup.
- **Daha iyisi:** Kervan seçenekleri kâr-risk-ilişki üçgeninde (en yüksek spread artık baskın değil: yol eşkıyası, lonca kızgınlığı). Fiyatlar NPC işletmeleriyle (rakip hancı) dalgalanır.

### Elenenler ve nedeni
- **Enerji/mum zamanlayıcısı (FL):** zaman baskısı ve geri dönme zorunluluğu → ilke 6.
- **Ödüllü reklam, reklamla devam (BitLife):** oyun akışını keser, parayla/dikkatle atlama.
- **Time Machine/God Mode (BitLife), Fate (FL):** parayla sonuç değiştirme → kayıp anlamsızlaşır, ilke 6 ve 8.
- **Günlük giriş ödülü, sınırlı süreli etkinlik:** FOMO, yokluk cezası.
- **Grind döngüleri (FL "fidgeting"):** farm kapalı ilkesi; aynı eylemin tekrarı ödül vermez.
- **CK3 10 menü:** mobilde ilke 4'e aykırı; yalnız mekanikleri alıyoruz, menüyü değil.

## 4. En yüksek etkili 10 mekanik (öncelik sırası)

1. **Görünür stat kapıları ve şans etiketi** — *"Gücün yetiyor mu, gör ve karar ver."* Tek `test()` formülü (FL Broad: stat=zorluk → %60) bütün olay/iş/sınav zarlarını toplar; seçenekte "Zekâ 7 · güvenli %78" yazar; 344 seçeneğin en az üçte biri bir stat/beceri/hüner okur.
2. **Niyet (odak) ile ömür boyu ilerleme** — *"Her yıl kim olmak istediğini seçersin."* CK3 focus karşılığı; addStatXp/gainSkill akışını yıllık niyete bağlar, kademe maliyeti artar, ikinci dal açılır, 35+ yaşla stat eğrisi → 28 yaş tavanı kalkar.
3. **Usta kapısı (meslek seçimi)** — *"Hangi ustanın peştamalını kuşanacağını sen seçersin."* 13 yaş atamasını 3 usta adayı sahnesine çevirir; meslekSarti kapıları görünür olur, usta NPC yakın çevreye girer, değişimde kısmi taşıma.
4. **Han/dükkân işletmesi** — *"Kendi hanını işletirsin, kervan senin kapına gelir."* PROPERTY_TYPES'ı 3 ayarlı işletme kartına çevirir; hancı/tüccar/kuyumcu meslekleri ve refah/güvenlik/kervan sistemine bağlanır, 1–3 işletme sınırı.
5. **Ocak namı ve gelenekleri** — *"Dedenin adı kapıları açar."* CK3 renown/legacy; ölüm-vâris akışına, EDU_TRACKS'a ve itibara bağlanır; kuşaklar arası kalıcı ilerleme.
6. **Danışan sesler (KoDP tarzı)** — *"Kararı vermeden önce annen, ustan ve dostun ne der, duyarsın."* Yakın çevreden 2–3 NPC karar kartında huylarına göre tek satır tavsiye verir; ilişki sistemini kararlara bağlar, "gerçek ile bilinen" ayrımını taşır.
7. **Huy ve gönül yükü (stres)** — *"Huyuna aykırı yaşarsan bedelini içinde taşırsın."* CK3 stresi; huyla çelişen seçim yük verir, eşikte başa çıkma huyu; ölü kararları azaltır (her seçeneğin kişiye göre bedeli olur).
8. **Hoca NPC + icazet** — *"Medreseden eline icazetinle çıkarsın."* Mektep tıklamasını hoca bağı + yıllık odak + 17'de icazet belgesine çevirir; icazet kâtip/kadı/şifacı kapısı ve divan girişine bağlanır.
9. **Telafi edilebilir tehlike sayaçları** — *"Rezil oldun, ama itibarını emekle geri kazanabilirsin."* FL menace: Söz (skandal), Şüphe (suç), Yara, Borç; eşikte geçici bir yay (kadı huzuru, şifahane) açar, sonra döner; suç/kumar risksiz gelirini dengeler.
10. **Lakap ve mezar taşı** — *"Bir hayat tek bir adla hatırlanır."* BitLife ribbon karşılığı; hayat kapanışında başarım ve geçmişten lakap + kitabe üretir, Defter'in Ocak sekmesine ve vâris başlangıç olayına bağlanır.

## Kaynaklar

- Fallen London Wiki — Broad difficulty: https://fallenlondon.wiki/wiki/Broad
- Fallen London Wiki — Narrow challenge: https://fallenlondon.wiki/wiki/Template:NarrowChallenge/doc
- Fallen London Wiki — Luck: https://fallenlondon.wiki/wiki/Luck
- Fallen London Wiki — Has challenge: https://fallenlondon.wiki/wiki/Property:Has_challenge
- Emily Short — Beyond branching (quality-based narrative): https://emshort.blog/2016/04/12/beyond-branching-quality
- Emily Short — StoryNexus montage/deckbuilding: https://emshort.blog/2017/07/25/montage-and-other-effects-in-storynexus/
- Failbetter forum — grind tartışması: https://community.failbettergames.com/t/fidgeting-writer-and-other-grinds/15338
- PC Gamer — CK3 lifestyle sistemi: https://www.pcgamer.com/crusader-kings-3-shows-off-more-of-its-rpg-lifestyle-system
- Prima Games — CK3 lifestyle, huy, eğitim: https://primagames.com/gaming/crusader-kings-3-lifestyle-focus-traits-skills/2
- Prima Games — CK3 hanedan legacy: https://primagames.com/gaming/crusader-kings-iii-dynasty-legacy-houses-cadet-branches
- GuildOrder — CK3 renown ve legacy: https://guildorder.com/games/ck3/wiki/dynasty-renown-and-legacies
- Paradox dev diary 09 — Lifestyles: https://admin-forum.paradoxplaza.com/forum/developer-diary/ck3-dev-diary-09-lifestyles.1308005/page-8
- BitLife Wiki — Careers/Jobs: https://bitlife-life-simulator.fandom.com/wiki/Careers/Jobs
- TheGamer — BitLife başlangıç rehberi: https://www.thegamer.com/bitlife-beginner-tips-tricks-strategy-guide/
- Gamezebo — BitLife okul/etkinlikler: https://www.gamezebo.com/walkthroughs/bitlife-version-1-23-guide-school-life-activities-cliques-frats-sororities-grade-school-and-more-explained/
- App Store — BitLife (satın alımlar): https://apps.apple.com/app/bitlife-life-simulator/id1374403536
- Game Brain — BitLife inceleme özeti: https://gamebrain.co/game/bitlife-life-simulator
