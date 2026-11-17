# Tek oyunculu yeniden yapılanma — tasarım ve yol haritası (17 Kasım 2026)

Kaynak: `denetim/01–06` (kod denetimi) ve `denetim/08-muadil-oyunlar.md` (BitLife, Fallen London, CK3).
Bağlayıcı süzgeç: `TASARIM_PUSULASI.md`. Çevrimiçi kod (`mobile/lib/online/`, `app/online/`, `online-server/`)
bu projenin dışındadır; başka hesap yürütür.

## Hedef cümlesi

"Her ay neye zaman ayıracağını seçtiğin, statının ve geçmişinin her kararda göründüğü, mesleğin,
medresen, hanın ve ocağınla ömür boyu ve kuşaklar boyu büyüdüğün AAA metin RPG'si."

## Değişmezler

- Yeni hikâye/olay yayı **eklenmez**. Mevcut olaylar bedel, stat kapısı ve neden satırıyla güçlendirilir.
  Yeni mekanik metin (sınav, işletme kararı, usta kapısı) mekaniğin parçası olarak yazılır, içerik şişirmesi değildir.
- Zamanlayıcı, FOMO, parayla atlama, farm yok. Her para/itibar/XP eylemi tur kilitli veya azalan getirili.
- Açık gerilim ≤5; bilgi aşamalı; her sonuç nedenini söyler.
- Kayıt alanları opsiyonel ve eklemeli; `migrate` (game.ts ~13033) her yeni alanı doldurur;
  `heirPreview` = `continueAsHeir`.
- 6 dil (tr/en/es/pt/ar/ru), `GameIcon`, `lib/theme.ts`, ≥44 px dokunma, 320/390 px.
- Rastgelelik: yeni ve dokunulan her zar `gameRandom(s)` (tohumlu) kullanır.

## Ana kararlar

### K1. Tek zar ve görünür şans (Fallen London "Broad")
- Tek fonksiyon `zar(s, {stat?, beceri?, hüner?, zorluk, tür})` → `{oran, kalemler[], basari}`.
  Formül: `oran = clamp(0.6 + 0.08*(etkinGüç − zorluk), 0.08, 0.95)`; etkinGüç = stat + beceri/2 + hüner/eşya/usta katkıları.
  Stat = zorluk → %60.
- Seçenekte etiket: "Zekâ 7 · güvenli %78" (güvenli ≥75, makul 50–74, riskli 25–49, umutsuz <25), dokununca kalem dökümü.
- Göç: `test()` (7273), ders (7592), sınav (7609), iş olayı (5811, tavansız hata), imza eylemi (5861), suç zarları,
  peştamal sınavı → `zar`. Eski özel oran fonksiyonları (teklifSansi, helalSansi, diyetSansi) aynı etiket bileşenini kullanır.

### K2. Statlar ömür boyu (CK3 odak + yaş eğrisi)
- 4 stat kalır; tavan 10 → **20** (çocuk 8 → 10). Eşik kademeleri: 1–5 acemi, 6–10 yetkin, 11–15 usta, 16–20 efsane.
  Mevcut kayıtlar aynı sayıyla kalır (ölçek genişler, sayı değişmez); zorluk değerleri yeni ölçekte 3–16.
- **Niyet (yıllık odak):** 13 yaşından itibaren her yıl başında 1 niyet: Hüner (zanaat), Çarşı (ticaret),
  Sefer (savaş), Ahi yolu (sosyal), İlim (zekâ). Niyet ilgili stat ve beceriye ayda XP akıtır ve bir hüner
  dalını hızlandırır. Değiştirmek bedava ama yıl içinde kazanılan niyet XP'si yarıya iner (taahhüt).
- XP eğrisi: seviye maliyeti 25+15×seviye kalır, 10 üstü ×1.5 (ilerleme 50–60 yaşa yayılır).
- Yaş: 40+ güç ve dayanıklılık yılda %10 olasılıkla −1 (dayanıklılık yüksekse daha geç); zekâ/karizma
  50+ yılda bir kez "hikmet" XP'si. Ölüme dek anlamlı büyüme ve kayıp.
- Her stat ekranda işlev cümlesiyle: "Karizma 7 — pazarlıkta ve kurda güçlü; son 12 ayda 9 kararda kullanıldı."
- Dayanıklılık işlevlendirilir: açlık/hastalık direnci, uzun iş (iş ücretine çarpan), yol olayları, yaşlanma.
  Karizma XP kaynakları çoğaltılır (sohbet, pazarlık, işletme), zekâ baskınlığı azaltılır.

### K3. Hüner ağacı 2.0
- 4 dal × 3 kademe kalır, kademe eşikleri beceri 3/6/9 → 4/8/12/16 (4 kademe, beceri tavanı 20).
- Her hüner ya bir **seçenek açar** ya bir **zarı değiştirir** ya da bir **sistemi** (işletme, kervan, sınav) değiştirir;
  düz +% yalnız ikincil. Ölü hünerler düzeltilir: Mucit (atölye tarifi açar), Kalkanlı (cephe savaşı),
  Çevik/Nişancı (zar kalemi), Tefeci (ticaret dalına uygun: alacak/faiz olayı).
- Dal sonu (kademe 4) bir **huy/lakap** verir: Hâce, Gazi, Bezirgân, Ahi Baba.
- Bir hayatta 2 dal tamamlanabilir, 3.'sü kısmen → seçim gerçek.

### K4. Mektep → sıbyan + medrese + icazet
- Hoca gerçek NPC (yakın çevreye girer, huyu var). Yaş 7–12 sıbyan: yılda 2–3 **seçimli** mektep sahnesi
  (mevcut 11 SCHOOL_EVENTS seçimli karta dönüştürülür) + yıllık odak dersi; ders tıklama makinesi kalkar
  (ders düğmeleri ayda 1 "çalış" eylemine iner, odak dersine XP).
- 12 yaşta yol kararı: **Çıraklık yolu** (13'te usta kapısı, zanaat/ticaret avantajı) veya **Medrese yolu**
  (13–17 medrese, zekâ/sosyal; çıraklığa 17'de geç başlanır ama kâtip/kadı/şifacı/müderris kapıları).
- 17'de **icazet** (hat, hesap, fıkıh, tıp, kılıç-kalkan [tekke/talimhane]): kalıcı belge; meslek kapısı
  (`meslekSarti`), divan girişi, evlilik görüşü, iş zarına kalem.
- 18+ mektep sayfası "Ders halkası" olur: yılda bir ders alma ya da (zekâ ≥12 + icazet) müderrislik → yaşlılık içeriği.
- Akranlar: mektepte 2–3 akran NPC yakın çevreye girer; yetişkinlikte ortak/rakip olarak mevcut sistemlere bağlanır.

### K5. Meslek: usta kapısı ve kariyer
- 13'te atama kalkar → **Usta kapısı sahnesi**: mahalleden 3 usta adayı (biri çocukluk hayaline, biri ailene,
  biri rastgele yakın meslek); her biri meslek + huy + şart (görünür) + kısa vaat. "Henüz değil" seçeneği:
  1 yıl ırgatlık (düşük ücret) sonra tekrar kapı. Medrese yolunda kapı 17'de.
- Meslek değiştirme: beceri XP'si korunur, kariyer XP'sinin %30'u taşınır, kademe çırağa iner.
- `MESLEK_YOLLARI` her mesleğe özgün etki; `WORK_STYLES` yeniden dengelenir: garantici (az ücret, +dayanıklılık,
  kaza yok), olağan, hırslı (fazla ücret, başarısızlıkta sağlık −), kayıtsız kaldırılır → "yarım gün"
  (az ücret, ay içinde ek bir eylem hakkı).
- Peştamal sınavı K1 zarıyla 3 aşamalı (ustalık, ahlak, sohbet) kart; usta bağı ve lonca kefili kalem verir.
- Pir kademesi: çırak yetiştirme (yakın çevreye çırak NPC), yaşlılıkta ilerleme.
- Meslek ↔ lonca birleşir: meslek ekranındaki lonca sekmesi ile `FACTIONS` tek kavram "Lonca"; her meslek bir
  loncaya bağlı (eksik 5 meslek → Ahi zaviyesi/Çiftçi-Çoban birliği), örgüte giriş meslek veya itibar ister.
  Gölge Kardeşliği ayrı "yeraltı" olarak kalır.

### K6. İşletme (han, dükkân, atölye)
- Han/dükkân/atölye mülkleri **işletme kartı** olur: 3 ayar (fiyat: ucuz/olağan/pahalı; kadro: 1–3 kalfa;
  kalite: sade/iyi/seçkin) + mevsimde 1 işletme kararı (mevcut tezgâh kartı kalıbı). Gelir: refah, güvenlik,
  kervan trafiği, rakip, ayarlar, sahibin mesleği (hancı→han, tüccar→dükkân, zanaatkâr→atölye).
- **Şöhret** (işletme namı 0–100): kaliteli ve adil işletme yükseltir; şöhret itibar ve müşteri getirir.
- Sınır: aynı anda en çok 3 işletme (farm kapalı, her biri bir gerilim). Tarla/bağ/değirmen/ev pasif kalır ama
  tip avantajı alır (değirmen tarlaya çarpan, ev kiracı olayı).
- **Vakıf:** işletme vakfedilebilir → satılamaz, gelirin bir kısmı hayra, kalıcı itibar + Ocak namı; vâris devralır.

### K7. İnsanlar ve kancalar
- **Danışan sesler:** ay kararında yakın çevreden 2 kişi huyuna göre tek satır tavsiye (anne, usta, dost, eş);
  tavsiyeye uyup uymamak görüşü etkiler.
- NPC aylık küçük girişimler (selam, kırgınlık, yardım isteği, iş teklifi) huya göre; yıllık tick'e ek hafif aylık tick.
- `gossipAbout` gerçek söylenti ağına (`spreadRumor`) bağlanır.
- NPC–NPC husumeti: taraf seçme/arabuluculuk kartı (mevcut ikilem kalıbıyla).
- Savaşın kişisel bedeli: savaş bölgesindeki yakın çevre ölüm/yara/gazi dönüşü.
- Suç → aile: sabıka çocuk görüşüne ve vâris başlangıç itibarına; tehlike sayaçları (Söz, Şüphe, Borç, Yara)
  eşikte telafi edilebilir yay (kadı huzuru, şifahane, alacaklı).
- Taçsız oyuncuya siyaset kapısı: elçi/muhbir/tüccar rolüyle diplomasi ve divan etkisi; divan durum etkiler.

### K8. Ocak (hanedan) ilerlemesi
- Hanedan + nesil + ocak + karakter/ocak sekmesi tek **Ocak** sayfası.
- **Ocak namı** kuşaklar boyu birikir (başarımlar, icazet, ustalık, vakıf, gazilik, şaheser); **Ocak gelenekleri**ne
  harcanır (ör. Ahi Ocağı: çocuklar çıraklığa +beceriyle; Kâtipler Ocağı: medrese kapısı kolay; Gazi Ocağı).
- Vâris huyu çocuğun gerçek `Kisi.tr` huyundan ve yetiştirmeden gelir (`childNature` addan türemez).
- Hayat sonu: lakap + mezar taşı kitabesi; yıl karnesi geçen yıla göre fark gösterir.

### K9. Gezinme ve ana ekran (5 sekme)
- **Bugün** (ana) · **Ben** (karakter, statlar, hünerler, niyet, mektep/medrese) · **İnsanlar** (yakın/mahalle/şehir
  halkaları, söylenti, çöpçatan) · **Çarşı** (senin işin: meslek + işletmeler; pazar, kervan, atölye, mülk, şehir/harita,
  haberler; 13+ Güç: lonca, suç, savaş, saray) · **Defter** (bu hayat, ocak, yaylar/görevler, başarımlar, roman;
  ayarlar/SSS/krediler). Ortada Ay İlerle (uzun bas ipucu görünür).
- Bugün: en çok 3 gündem kartı + ayın kararı + "bu ay önerisi" satırı; tekrar eden tarih düğmeleri teke iner.
- Ortak **ay bütçesi:** 57 ayrı kilit yerine "ay vakti" 3 (çocukta 2, yaşlılıkta 2): çalışmak 1, ders 1, işletme 1,
  yolculuk 2, sosyal eylemler 1 … Böylece "bu ay neye zaman ayırdım" ikilemi doğar. Mevcut tur kilitleri
  (farm koruması) korunur; vakit ek kısıttır.
- Bağlamsal öğretici (`sp.tut.b2–b6` ve `TutorialModal` canlanır), yeni hayat onayı, erişilebilirlik etiketleri.

### K10. Olay kalitesi (yeni hikâye yok)
- Hayat boyu görülen ikilem kümesi (opsiyonel alan), vâriste sıfırlanır; havuz tükenince boş ay.
- Bariz doğru seçenekli kartlara bedel/alternatif değer (önce en sık 40 kart); seçeneklerin ≥1/3'ü K1 zarı okur.
- Gecikmeli sonuçta neden satırı (`kok`) kronikte ve landmark olmayan dönüşte gösterilir.

## Yol haritası (her faz tek commit dizisi, `apk`)

| Faz | Kapsam | Kabul ölçütü |
|---|---|---|
| F0 Temel | K1 `zar` + şans etiketi bileşeni; hata düzeltmeleri (effStat takı, iş zarı tavanı, çocuk +1 düğmesi, yeni hayat onayı, gossipAbout→spreadRumor) | tsc, smoke, migrate-check |
| F1 Stat ve niyet | K2 tamamı, stat işlev cümleleri, eşya stat bonusları | hedefli sim: 20/40/60 yaş stat dağılımı, 60 yaşta hâlâ büyüme |
| F2 Hüner 2.0 | K3 | her hünerin uygulama yeri ve etkisi testli |
| F3 Mektep/medrese | K4 | 7–17 yaş akışı sim; icazet kapıları |
| F4 Meslek | K5, WORK_STYLES dengesi, lonca birleşimi | olu-karar temiz; meslek başına kapı testi |
| F5 İşletme | K6, mülk tipleri, kervan risk üçgeni | ekonomi.cjs: 60 yaşta nakit ≤ 8 yıllık gider; farm yok |
| F6 İnsanlar/kancalar | K7 | karakter-ayna, olu-karar |
| F7 Ocak | K8 | heirPreview = continueAsHeir; vâris sim |
| F8 Gezinme | K9 (5 sekme, ay vakti, öğretici) | 320/390 px, react-reviewer |
| F9 Olay kalitesi | K10 | olay-metin, olu-karar, tekrar oranı ölçümü |
| F10 Son | performans (clone), erişilebilirlik, 300 hayat | smoke:full |

Akış her fazda: yönetici brief → `coder` (opus) → `tester` (sonnet: tsc, i18n, dil-karisma, olu-karar, hedefli smoke)
→ arayüz varsa `react-reviewer` → yönetici diff incelemesi → commit/push. Ekonomi fazlarında `denge-denetcisi`.
Kritik fazlarda (F1, F5, F8) `coder`dan iki yaklaşım istenir.
