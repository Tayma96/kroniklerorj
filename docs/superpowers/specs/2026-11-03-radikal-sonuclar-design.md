# Radikal sonuçlar ve sade oyun akışı: tasarım ve plan (3 Kasım 2026)

Durum: **TASLAK, Berkay'ın onayını bekliyor.** Onay gelmeden oyun koduna dokunulmaz (Superpowers: plan → onay → kod).
Hazırlayanlar: üç rol ajanı (oyun tasarımcısı, sistem ve denge analisti, arayüz/bilgi mimarisi tasarımcısı) ve ana oturum.
Ajanlar yalnız okudu ve ölçtü; hiçbir oyun dosyası değişmedi.

---

## 0. Senin vereceğin kararlar (önem sırasıyla)

Bu kararlar gelmeden tasarımın bazı parçaları yazılamaz. Her birinde önerim ve gerekçesi var.

| # | Karar | Önerim | Neden |
|---|---|---|---|
| 1 | **Geri alınamaz kayba izin var mı?** Tasarım pusulasının 8. kuralı ("kayıplar emekle telafi edilebilir olsun") bazı büyük kararlarda gevşetilsin mi? İflas, zindan damgası, kapanan lonca kapısı, terk edilen yurt, hasım eliyle ölen biri. | **Evet, ama "kuşakla dönüşüm" ile.** Kayıp emekle geri alınmaz; vârise "ibret" ya da "yük" olarak geçer ve vârisin başka bir yolu açılır. | Bu izin olmadan oyun "daha büyük sayılı +/-" olmaktan öteye geçemez. Radikal sonuç, geri dönmeyen sonuç demektir. |
| 2 | **Kırılma anı ayın geçişini durdursun mu?** (Yalnız "Ayı İlerlet"e basan oyuncu için.) | **Evet.** Kırılma bekler, oyuncu seçmeden ay geçmez; zamanlayıcı yok. | Alternatif "süre dolunca güvenli seçenek" pusulanın 6. kuralına (zamanlayıcı yok) aykırı. |
| 3 | **Hayatın Derdi** ne olsun? | **Tamamen kaldırılsın.** | Sonucu yok, ana ekrana bir panel ekliyor. Yönü artık kırılmalar verecek. Arayüz ajanı "Karakter'de tek satır" önerdi; ben kaldırmayı öneriyorum. |
| 4 | **Bir ömürde kaç kırılma?** | **5–8** (koşullara göre; tipik 5–7). İki kırılma arası en az ~8 yıl. | Az ama ağır. Her biri hatırlanır. |
| 5 | **Aylık küçük eylemler** (NPC kanalları, uğraş, hekim, hamam, eş, ebeveyn, çocuk, hayvan, her biri "bu ay bir kez" kilitli) ne olsun? | **Tek bir "Bu ay sana açık" sayfasında toplansın**, üstünde "yapmasan da olur" yazsın; düzen (otomatik rutin) aile bakımını da üstlensin. | "Kullanmalı mıyım" kaygısının kaynağı bu dağınık aylık listeler. |
| 6 | **Kötü haber tonu:** zindan, iflas, kan davası kutlama gibi değil, kasvetli (kırmızı vurgu, çan sesi) gösterilsin mi? | **Evet.** | Bugün zindan hükmü bile altın renk ve parçacık patlamasıyla açılıyor; bu, ağır sonucu hafifletiyor. |
| 7 | **İflas oyunu bitirebilir mi?** | **Hayır.** İflas hayatı kırar, oyunu bitirmez; toparlanma vâris yoluyla ya da 8–10 yıl sonraki "yeniden başlangıç" kırılmasıyla. | Küstürmeden ağır olmak. |
| 8 | **Göçten sonra eski kasabaya dönüş** mümkün mü? | **Evet, sıfır tanınırlıkla.** | Kapı kapanır ama duvar örülmez. |
| 9 | **Zindanda geçen aylarda aile** ne olur? | **Eş küser, evlat büyür, mülke el konabilir.** | Zindan gerçekten bir kırılma olsun. |
| 10 | **Çok oyunculu modda** kırılmalar? | **İlk sürümde kapalı.** | Sunucu turu 5 dakikada bir ilerliyor; bekleyen kırılma onu kilitlerdi. |
| 11 | **Birleşmeler:** Atölye + Meslek tek ekran, Çöpçatan → kişi sayfasındaki "evlen" yolu? | **Evet, ama son aşamada.** | Riskli yeniden yapı; önce hissedilen değişiklikler. |
| 12 | **Sinematik ve anlatıcı sesi:** kırılma anları için 2–3 çekimlik mini sahne ve yeni anlatıcı cümleleri (6 dil) ElevenLabs kotasından harcansın mı? | **Önce sessiz ve görselsiz yapılsın, kota durumuna göre sonra eklensin.** | Ek ücret çıkmaması kuralı. |

---

## 1. Amaç ve neden

Berkay'ın sözleriyle:
- "Yaptığın hareketler, eylemler ve seçimler gerçekten **radikal sonuçlar doğurmuyor**."
- "Daha az ekran, kompakt görünüş, **tıkla ve sonucu gör, hisset**."
- "Her yerde bir seçenek çıkıyor; kullanmalı mıyım, kullansam bir şey değişir mi, kullanmasam bir şey olur mu düşünceleri kafayı yoruyor, oynayasım kaçıyor; gizli saklı sayfalarda bile seçenekler var."
- "Site gibi, tık hissi veriyor."
- Yeni ve yarım sistem eklenmesinden rahatsız ("Yine yeni eklemeler yapıyorsun").

**Amaç:** Az sayıda ama hayatı gerçekten bir yöne kıran karar; bunların dışındaki her şeyin sade, isteğe bağlı ve öyle olduğunu açıkça söyleyen bir akış.

## 2. Hedefler, hedef olmayanlar, istenmeyenler

**Hedefler**
- Bir ömürde 5–8 "kader kırılması": seçim yol kapatır/açar, hayat sınıfını oynatır, kişileri kalıcı değiştirir, vârise geçer, geri dönmez.
- Her seçimin sonucu seçimden **önce** cümleyle görünür, seçimden **sonra** ekranda hissedilir.
- Ana ekran "bu ay" tek akış: zorunlu olan tek şey üstte, isteğe bağlı olanlar "yapmasan da olur" diye ayrılmış.
- Gezinme noktası 35'ten ~20'ye.

**Hedef olmayanlar**
- Yeni bir büyük sistem eklemek. Kırılmalar var olan sistemlere (meslek, evlilik, suç, göç, borç, hasım, ordu, vakıf) **bağlanır**.
- Çok oyunculu modu değiştirmek (ilk sürümde kırılma kapalı).
- 3D sinematik dövüşü bu planla birleştirmek (ayrı iş, `docs/SAVAS_SINEMATIK_PLAN.md`).

**İstenmeyenler (teknik olarak çalışsa bile başarısızlık sayılır)**
- Kırılma da "+5 itibar, +3 şöhret" gibi sayıyla bitiyorsa.
- Ana ekrana yeni panel eklenip kalabalık artıyorsa.
- Oyuncu bir kırılmadan sonra hayatında bir şeyin değiştiğini **görmüyorsa** (yurt, meslek, ev, kişiler, kahraman görseli).
- Bir seçenek her bakımdan öbüründen iyiyse (ölü karar).
- Kayıp oyuncuyu küstürüp oyunu bıraktırıyorsa.

## 3. Teşhis: bugün neden radikal sonuç çıkmıyor

### 3.1 Ölçülmüş genel tablo
- Kararların ~%45'inde bir seçeneğin toplam etkisi ≤5 puan.
- İtibar 233 yerde değişiyor, yalnız 11 yerde bir kapı açıyor (şeref 110/10, şöhret 61/13); kapıların çoğu lakap ve mersiye metni.
- Yalnız "Ayı İlerlet"e basan oyuncu (düzen açık) 57–60 yaşına sorunsuz yaşıyor; kartların hiçbiri onun yolunu değiştirmiyor.
- 300 hayatlık tam test (3 Kasım): 0 hata, medyan ölüm yaşı 64.

### 3.2 Metin vaat ediyor, mekanik yapmıyor (oyun tasarımcısı, örnekler `mobile/lib/` altında)
1. `orta_goc` (`events.ts:1438`): "bu kasabada yaşlanmak istemiyorum" diyor; seçimler yalnız `honor +2` / `rep +2, honor −2`. Oyuncunun yurdu hiç değişmiyor: `home_name` yalnız doğumda atanıyor (`game.ts:3100`), `travelTo` (`game.ts:7187`) yalnız bulunduğu yeri değiştiriyor. **Göç oyuncu için fiilen yok.**
2. `orta_kalfa` (`events.ts:1428`): sonuç "kalfan karşı sokağa tezgâh kurdu" diyor; kalfa rakibi (`p.rakip`) bu karttan doğmuyor.
3. `orta_hayal` (`events.ts:1456`): "gençlik hayalin, vakit var mı?" sorusu meslek değişimini (`changeProfession`, `game.ts:7429`) tetiklemiyor; `stat_points +1, money −40` ile `money +15` arasında seçim.
4. `hac_daveti`/`yasli_hac`: "adın Hacı diye anıldı" diyor; gerçek Hacı pâyesi (`PRESTIGE.hac`, 7000 akçe, `legacy.hac`) kurulmuyor.
5. `yasli_vakif` (`events.ts:687`): 60 akçeye `fame +12, honor +12`; gerçek vakıf 28.000 akçe ve vâris mirası veriyor (`PRESTIGE.vakif`, `legacyRep`). Öbür seçenek boş (`delta: {}`), yani ölü karar.
6. `haydut_teklif`/`golge_davet`: "çeteye katıl" sonucu tek seferlik `+45/+35 akçe`; gölge loncası (`joinFaction`), suç merdiveni (`doCrime`, `crime_heat`) ve zindan bağlanmıyor.
7. `kervan_ortak`, `kumar`, `spekulasyon`: bahis sabit (−60, −20, −35 akçe); 40 yaşında binlerce akçesi olan için anlamsız. "Büyük kâr, büyük risk" boş, çünkü bahis servete oranlı değil.
8. Hikâye yayları (`arcs.ts`): `kan_davasi` "barış" yalnız `honor +10, rep +8`, gerçek bir davayı kapatmıyor; `lonca_secimi` kethüdalık veriyor ama unvan yok.
9. `applyDilemma` (`game.ts:11250`): sağlık ve itibar ±%25 bulanıklaştırılıyor; yıllar sonra dönen tohumlar bile en çok ±8 itibar, +120 akçe.
10. **İflas yok:** borç mülke kısmi el koyuyor (`game.ts:4169-4195`), mülk yoksa nakdin %30'u gidiyor; ne yurt ne meslek kaybı.
11. `son_sefer` (`events.ts:1598`): "evlatlardan biri gitsin" seçeneğinde evlat gitmiyor.

**Doğru çalışan örnek (korunacak model):** `son_vasiyet` (`events.ts:1559`) gerçekten `veraset` yazıyor; aile çatlağı ve vâris meşruiyeti buna bağlı.

### 3.3 Arayüz neden "site gibi" (arayüz tasarımcısı)
- **4 sekme, 30 gizli ekran** (`_layout.tsx:258-289`); menü 21 hedef, 4 grup: "Şehir / Güç / Aile / Defter" oyuncuya eylem değil yer söylüyor; oyuncu "ne yapmalıyım" yerine "nereye gideyim" diye düşünüyor.
- **Gizli sayfada karar:** ana sayfadaki "Gündem" sayfası (`index.tsx:574-790`) mikro an, Kan Defteri, Kül Yemini, Divan arzuhali, kervan, hikâye çağrısı, açık hesaplar barındırıyor; şeritte yalnız "N madde" yazıyor. Bazılarında "yok sayılırsa ertesi ay kaybolur" uyarısı var (pusula kural 6'ya ters).
- **Aylık "bir kez" kilitleri:** kişi sayfası kanalları (`npc/[id].tsx:165-173`), uğraş takatı (`month-actions-ui.tsx:95-109`), hekim, hamam, eş, ebeveyn, çocuk, kedi, köpek düğmeleri. Oyuncu her ay 15–25 küçük şeyin listesini görüyor; hepsi aynı kalıp, hangisinin önemli olduğu belirsiz; kaçırmanın bedeli yok ama kilit "kaçırma baskısı" gibi okunuyor.
- **Geri bildirim zayıf:** ayın kararı seçilince panel tek satıra iniyor, seçilen seçeneğin etkisi o satırda yok (`home-mockup-ui.tsx:117-141`); önizleme yalnız "hangi alan" diyor, yön ve büyüklük yok.
- **Ağır sonuç yanlış tonda:** `MilestoneModal` ölüm ve pabuç dışındaki her şeyi kutlama sayıyor (`ui.tsx:185`). Zindan hükmü (`game.ts:8327`) ve yakalanma (`game.ts:8311`) altın renk ve parçacık patlamasıyla açılıyor. Kan davasının açıldığı anın töreni yok. İflas, göç, kan davası, zindan için ayrı bir an kartı yok (`feel.tsx` yalnız evlilik, doğum, taht, yerleşim, ölüm, ustalık, ün kademesi).
- **Üst üste dokuz pencere yolu** (`index.tsx:272-386`): sınav kartı, kilometre taşı, ikilem, fırsat, tezgâh, hesap, kişi teklifi, yıl karnesi; art arda iki üç pencere açılabiliyor.
- **Hiçbir şeyi değiştirmeyen ya da başkasıyla aynı işi yapan ekranlar:** Haberler, Harita, Kronik, Tarih, Roman, Başarımlar, Emeği Geçenler (`emek`), SSS, Divan (ölü), İlişkiler (yalnız yönlendirir); tekrarlar: Atölye/Meslek, Çöpçatan/kişi sayfasında evlilik, Mahalle/kişi sohbeti, Görevler/Hayatın Derdi, Beceriler/Karakter.

### 3.4 Motor neden sonucu düzleştiriyor (sistem ve denge analisti)
*(Analist raporu geldiğinde bu bölüm doldurulacak: düzleştirici envanteri, seçim politikalarına göre ayrışma simülasyonu, motor modeli, istismar riskleri, kabul ölçütleri.)*

---

## 4. Yaklaşımlar

| | Yaklaşım | Ne yapar | Bedeli | Değerlendirme |
|---|---|---|---|---|
| **A** | **Kader kırılmaları + sadeleşme** (önerilen) | Ömre 5–8 ağır karar; her biri var olan bir sistemi gerçekten değiştirir (meslek, yurt, eş, servet sınıfı, suç, hasım, beylik, vakıf). Küçük kartların çoğu tek satırlık ortama iner. Arayüz "bu ay" tek akışa iner. | Orta-büyük iş; ~70 yeni metin × 6 dil; iki gerçek yeni mekanik (yurt değiştirme, iflas). | Berkay'ın iki isteğini birlikte karşılar: radikal sonuç ve az ekran. Yeni sistem değil, bağlama. |
| B | Var olan kartları büyütmek | Etkileri 3–5 katına çıkarır, yapıyı korur. | Ucuz. | Seçenekler yine birbirine denk kalır; "+15 itibar" da bir şey değiştirmez. Yol değişimi yok. **Elenir.** |
| C | Bölümlü hayat (senaryolu dallar) | Hayatı yazılı bölümlere böler, her bölüm sonunda dallanır. | Çok büyük içerik maliyeti; simülasyon serbestliğini öldürür. | Kronikler'in açık dünya yapısına ters. **Elenir.** |

## 5. Tasarım (Yaklaşım A)

### 5.1 "Radikal sonuç" tanımı
Bir sonuç şu beş şeyden en az birini yapıyorsa radikaldir:
1. **Yol kapatır ya da açar:** meslek, lonca, yurt, eş ya da dava durumu kalıcı değişir.
2. **Hayat sınıfını oynatır:** yoksul/varlıklı, tanınmış/lekeli, hapisteki/beyin adamı.
3. **Bir kişiyi kalıcı değiştirir:** dost, hasım, eş ya da evlat artık başka biridir ve hatırlar.
4. **Vârise geçer:** miras, borç, düşman ya da kapı.
5. **Geri dönmez:** telafi yok, dönüşüm var.

### 5.2 Uygulama ilkeleri
- **Az ama ağır:** ömürde 5–8 kırılma; iki kırılma arası en az ~8 yıl; kırılma açıkken yeni ip açılmaz (en çok 3–5 açık gerilim).
- **Sonuç önceden cümleyle söylenir:** "Bu yol seni çarşının kapısından çıkarır." Sayı değil cümle.
- **Her seçenek bir şey kazandırır ve bir şeyi kapatır;** güvenli seçenek de bir kapı kapatır. Hiçbir seçenek boş (`delta: {}`) olamaz.
- **Bahisler servete oranlı:** sabit −60 akçe değil, servetin belli bir payı.
- **Kırılma sonuçlarında bulanıklaştırma (±%25 jit) kapalı;** yalnız görünür zar ve koşul belirler.
- **Kırılma tek seferliktir** (id başına), çiftlik yapılamaz.
- **Pusuladan korunanlar:** zamanlayıcı yok, kaçırma korkusu yok, parayla atlama yok, sebep görünürlüğü %100, altı dil, çevrimdışı, eski kayıt uyumu.

### 5.3 Mekanizma (tek kalıp)
- Ay yönetmeni (`ayinSahnesi`, `events.ts:1654`) yeni bir sahne türü alır: `"kirilma"`. Koşul sağlanırsa ve son kırılmadan yeterli süre geçtiyse çıkar.
- Bekleyen kırılma ay geçişini durdurur (`advanceWithMonthScene`, `advanceUntilEvent`, düzen).
- Yeni **opsiyonel** kayıt alanları: `Player.kader?: { id, secim, turn }[]` (alınan kırılmalar), `GameState.kirilma?: { id, turn }` (bekleyen), `Player.yol?: string` (yaşam yolu etiketi). Eski kayıtta tanımsız; göç (migrate) dokunmaz.
- Her sonuç kronikte `landmark` bir olay olarak durur ve kökünü (`kok`) taşır.
- Vâris etkisi tek saf fonksiyonda: `kaderMirasi(s)` hem `heirPreview` hem `continueAsHeir` tarafından çağrılır (iki ekran aynı sonucu gösterir).

### 5.4 Kırılma kataloğu

Her kırılmada: tetikleyici, 3 seçenek, her seçeneğin **anlık / orta vade (1–5 yıl) / uzun vade (ömür ve vâris)** sonucu ve bağlanacağı gerçek fonksiyonlar.

**K1. Çıraklık ayrımı (13–17 yaş)**
- Tetik: 13 yaş, meslek seçimi açıldığında (bugünkü `cocuk_cirak`, `usta_teklif` kartları bunun yerine geçer).
- A) **Ustanın çırağı ol:** anlık meslek değişir (`changeProfession`), usta bağlanır (`ustamKim`); orta vade: sınavlarda ustanın desteği (`ustaDestegi`, `game.ts:8750`), küsersen aleyhte; uzun vade: meslek zirvesi (`capstones`).
- B) **Aile işinde kal:** orta vade aile mülkü, düşük risk; uzun vade lonca kapısı geç açılır, kök güçlü.
- C) **Yola düş:** anlık şehir değişir + yeni yurt (K5 kapısı); orta vade tanınırlık düşük (`recognition`, `game.ts:11510`); uzun vade gezilen şehirler ve ağ, vâris göçmen doğar.
- Ekranda: tek ekran, üç satır sonuç ("Ustan: Hacer. Kapı: loncalı. Geri dönüş: yok").

**K2. Gönül ve hane (18–30)**
- Tetik: bekâr ve evlenebilir, ya da `genc_ilkask`.
- A) **Sevda eşi:** `proposeMarriage`; eş bağı yüksek, ekonomi zayıf; vâris sevgiyle büyür (`child_bond`).
- B) **Görücü ve varlıklı eş:** `proposeArranged`, çeyiz sandığı (vârise geçer); eşin ailesi etkili; sınıf yükselir, eş ailesi vasiyete karışır (`asabiye`).
- C) **Bekâr kal, kendini yola ver:** soy yolu kapanır; vâris yeğen ya da çırak olur.

**K3. Suç eşiği (16–35)**
- Tetik: para ve tokluk dipte, ya da korku/zalimlik yüksek (bugünkü `haydut_teklif`, `golge_davet` koşulları).
- A) **Çeteye gir:** gölge loncası (`joinFaction("golge")`) + ilk suç (`doCrime`); orta vade takip ısısı (`crime_heat`), mahkeme (`trial`, `game.ts:8300`); uzun vade suç geçmişi tohumu, zindan, vârise kara hatıra.
- B) **Dürüst kal, borçlan:** borç (`borrow`, `game.ts:343`) ve faiz; ödeyemezsen mülke el koyma; itibar korunur.
- C) **Şehri terk et:** şehir ve yurt değişir.

**K4. Servet sınavı (30–45)**
- Tetik: net servet eşiği + ortaklık ya da yatırım teklifi (bugünkü `kervan_ortak`, `orta_dukkan`, `spekulasyon`).
- A) **Büyük ortaklık (servetin ~%40'ı):** zar servete oranlı ve görünür. Kazanırsan tüccar kademesi; kaybedersen **iflas** (yeni küçük kural): mülklerin yarısı gider, "batık" damgası, 5 yıl borç ve lonca çağrısı yok. Vâris "ibret" miras alır.
- B) **Mülke yatır** (`buyProperty`): düşük gelir; yerleşim kurma yolu (`foundSettlement`); konak vârise.
- C) **Emanete bırak** (`deposit`): güvenli, yıllık ~%2; hiçbir kapı açılmaz.

**K5. Göç ya da kök (35–50)**
- Tetik: `orta_goc` koşulu + eş, ya da kıtlık/savaş bölgesi.
- A) **Göç et:** yeni fonksiyon `yurtDegistir(s, hedef)` yurdu (`home_name`) değiştirir; eski mülk satılır ya da kiraya verilir; lonca ve çevre bağları yarıya iner; tanınırlık düşer; eş kabullenir ya da küser; vâris yeni bölgede doğar.
- B) **Kal ve kök sal:** itibar ve lonca bağı artar; eş küsebilir; kıtlıkta kalmanın bedeli.
- C) **Ertele (söz ver):** mevcut göç ipi (6–14 ay) gerçek etki kazanır: vadede ya göç ya söz bozma (itibar kaybı).
- Ekranda: harita geçişi; ana ekranın başlığı ve kahraman görseli yeni yurdu gösterir.

**K6. Hasımla hesaplaşma (16+)**
- Tetik: bir kişinin kini eşiği aştığında (`hatir`), `kan_davasi` yayı, eski rakip kartları.
- A) **Barış (helallik):** `reconcileNemesis`; kin söner, Kan Defteri açılmaz.
- B) **Hesaplaş:** hasım dövüşü (`nemesisEncounter`, `applyNemesisOutcome`) yüzleşme sahnesiyle; kazanırsan hasım kapanır, kaybedersen yara ya da ölüm; ölürsen vârise kan borcu.
- C) **Kaç, sürgün ol:** itibar kaybı; hasım izini sürer, vâris devralır.

**K7. Beyin kapısı (25–60)**
- Tetik: savaş, beylik sadakati sorusu, taht koşulu.
- A) **Askere gir, sadık ol** (`joinArmy`): cephe riski, terfi; kalıcı yara olabilir.
- B) **Biat et, askerlik yok:** hane tutumu olumlu; güç sınırlı; savaşta vergi.
- C) **Karşı çık ya da taht iste** (`claimThrone`): başarıda taç; başarısızlıkta "hain" (itibar −30); uzun vadede hanedan ya da hain soyu.

**K8. Son sayfa (55+)**
- Tetik: vakıf, hac ve vasiyet kartları.
- A) **Vakıf kur** (gerçek `legacy.vakif`, vârise itibar mirası).
- B) **Hacca git** (gerçek `legacy.hac`, saygınlık +6, bu kişide kalır).
- C) **Mirası böl / vasiyet** (`veraset`, aile çatlağı).

### 5.5 Küçük kararların akıbeti (~170 kart)
- **Kırılmaya terfi eder** (kendi başına çıkmaz, kırılmanın tetiği ya da çeşidi olur), ~45 kart:
  K1 `cocuk_cirak`, `usta_teklif`, `orta_kalfa`, `orta_usta`, `genc_usta_sirri`, `usta_sirri_d493`, `lonca_oy`, `orta_hayal` ·
  K2 `genc_ilkask`, `es_dargin`, `es_hastalik`, `es_kusluk` ·
  K3 `golge_davet`, `haydut_teklif`, `yol_haydut`, `yol_kacak`, `genc_suclama`, `yalanci_sahit`, `kefil_imzasi` ·
  K4 `kervan_ortak`, `spekulasyon`, `orta_dukkan`, `yetiskin_ortaklik`, `orta_borc`, `orta_tefeci`, `kumar`, `yetiskin_kumar`, `orta_vergi` ·
  K5 `orta_goc`, `yetiskin_gurbetci` ·
  K6 `eski_rakip`, `son_soz`, `dost_rakip`, `cocuk_kavga`, `kavga`, `lekeli_ad` ·
  K7 `beylik_sadakat`, `vali_dilek`, `vali_vergi`, `yol_asker`, `son_sefer`, `son_iltizam` ·
  K8 `hac_daveti`, `yasli_hac`, `yasli_vakif`, `son_vakif`, `son_vasiyet`.
- **Olduğu gibi kalır** (zaten gerçek sonuç doğuran veraset grubu): `son_olmeden`, `son_kardes`, `son_kahya`, `son_meclis`, `son_gelin`, `son_rahat`, `orta_evlat`, `evlat_dert`, `evlat_dugun`, `orta_miras`.
- **Ortam satırına iner** (kronikte tek satır, seçim yok), 70'ten fazla kart: çocukluk (`cocuk_kus`, `cocuk_yalan`, `cocuk_kese`, `cocuk_oyun`, …), mahalle (`kuyudaki_oglak`, `gece_misafiri`, `yarim_ekmek`, `emanet_kese`, …), yaşlılık ve yardım (`yasli_ocakbasi`, `dilenci`, `dervis`, …) ve 21 şenlik çeşidi.
- **Silinir:** tekrar ya da baskın/ölü olanlar (`yasli_hekim` ile `orta_beden` aynı soru; eski düz alışveriş kartları); `olu-karar.cjs` ile doğrulanarak.
- **Sınıflandırılmamış kalanlar:** ilk adımda "ortam" sayılır; yalnız gerçek bir sistemi (mülk, işçi, pazar, lonca) değiştirenler kart olarak kalır. Her kart uygulamadan önce `olay-metin.cjs` ve `olu-karar.cjs` ile doğrulanır.
- **Sayısal hedef:** ayda kart oranı ~0,47'den ~0,2'ye; ömür başına ağır karar ~7.

### 5.6 Telafi ve adalet: "kuşakla dönüşüm"
- **İflas:** vâris borç değil "batık ocak" etiketi alır: başlangıç parası düşük, ama "yoksullukta yetişmiş" (+1 özellik puanı) ve ilk 5 yıl borç yok.
- **Suç ve zindan:** suç geçmişi vârise yarılanarak geçer; vâris için bir kerelik "temiz sayfa" fırsatı.
- **Kaybedilen yurt:** vâris göçmen doğar ama yeni bölgede yerel hasmı yoktur.
- **Hasım eliyle ölüm:** kan borcu vârise geçer; K6'nın "intikam ya da helallik" seçeneğine bağlanır.
- **İkinci şans kırılmaları:** iflastan 8–10 yıl sonra "yeniden başlangıç"; zindandan çıkışta "af" (lonca ya da meslekte yeniden kabul); sınav kaybında bekleme bitince lonca yine çağırır (bugün de var).
- **Ölü/baskın seçenek ölçümü:** her kırılma için 20 yıllık simülasyonda servet, ün, ocak, hayatta kalma ve vâris başlangıcı karşılaştırılır; hiçbir seçenek bütün eksenlerde öbürlerinden iyi olmamalı (`olu-karar.cjs` buna genişler).

## 6. Arayüz: az ekran, "tıkla, gör, hisset"

### 6.1 Hedef bilgi mimarisi

| Yer | İçerik |
|---|---|
| **Ana Sayfa = "Bu Ay"** | Kimlik şeridi, ay özeti, **tek** zorunlu karar (kırılma ya da ayın kararı) "Bu ay zorunlu" etiketiyle, **en çok 1** uyarı ya da öneri, son gelişmeden 2 satır. Gündem şeridi, Hayatın Derdi ve Yaşam Defteri satırı ana sayfadan çıkar ya da tek satıra iner. |
| **"Bu ay sana açık" sayfası** | Bugünkü Gündem + Karakter'in aylık düğmeleri (uğraş, hekim, hamam, eş, ebeveyn, çocuk, hayvan) + bekleyen kişi teklifleri tek sayfada, en üstte "Yapmasan da olur" notu. |
| **Karakter** | Özellikler, Eşya, Soy (4 alt sekme → 3). |
| **İlişkiler** | Yakın çevre; kişi sayfasında **en çok 3 görünür eylem** + "daha fazlası". |
| **Menü** | 4 grup → 3: **Yer** (Çarşı, Meslek, Mülk, Mahalle), **Güç** (Örgüt, Hanedan, Savaş, Suç), **Defter** (Tarih, Hikâye, Başarım). |
| **Duruma göre görünen** | Kervan, Sarraf, Diplomasi, Diyar yönetimi yalnız ilgili durum varken. |
| **Kalkar** | Divan (ölü ekran), Emeği Geçenler ve SSS Ayarlar'ın altına, Haberler Tarih'e filtre olarak. |

Hedef: oyuncunun gördüğü gezinme noktası 35 → ~20.

### 6.2 Her seçimde geri bildirim (küçük ve orta sonuç)
- Karar seçilince panel yerinde **sonuç kartına** döner: seçilen yol + işaretli çipler (+/− rakam, ikon, renk).
- Önizleme çiplerine yön ve büyüklük (↑↑, ↓) eklenir; yalnız renge dayanılmaz.
- "Neden" satırı (Hissiyat 3'te başladı): "26 yaşındaki kararın: …".
- Ses ve titreşim sonucun yönüne göre: iyi sonuçta hafif çan, kötüde yenilgi sesi.

### 6.3 Büyük sonuç: "kırılma anı" şablonu
Tam ekran karartma → tek cümle → **değişen dünya özeti** ("Yurdun: Konya. Mesleğin: tüccar. Kapanan: lonca.") → ses → ana sayfa **farklı görünür** (kahraman görseli, başlık, satırlar).

| Olay | Bugün | Olacak |
|---|---|---|
| Zindan | Altın renk, parçacık patlaması, genel "dönüm noktası" etiketi | Kasvetli ton, "Demir Kapı" etiketi, çan sesi, kahraman görseli zindan sahnesi, "N ay kaldı" sayacı, kapanan kapıların tek satırı |
| İflas | Ayrı olay yok | "Haciz" etiketi, kaybedilen mülklerin listesi, ana sayfada mülk satırlarının silinmiş görünmesi |
| Göç | Yalnız kronik satırı | 2–3 çekimlik geçiş (yol → varış), yeni yurdun görseli ve adı, "eski dostlar uzakta" özeti |
| Kan davası | Çoğu olay pencere açmıyor | Kırmızı tören kartı (kim, kime), savaş davulu, ilişkilerde hasım rozeti |
| Evlilik | Kutlama kartı + düğün müziği (iyi örnek) | Kalır; çiftin kısa kartı, ocak görseli değişir |
| Ölüm | Mersiye (zirve) | Dokunulmaz |

Kural: kutlama bayrağı olayın **tonuna** bağlanır (iyi / kötü / ağır), bugünkü gibi yalnız iki türe değil. `GameEvent`'e opsiyonel `ton` alanı.

## 7. Motor tasarımı
*(Analist raporu geldiğinde: kayıt alanları, değişecek fonksiyonlar, istismar riskleri ve çözümleri.)*

## 8. Uygulama aşamaları
*(Üç rolün sıralaması birleştirildiğinde doldurulacak.)*

## 9. Riskler
*(Birleştirildiğinde doldurulacak.)*
