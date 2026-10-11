# Kronikler: Küllerin Mirası — Çığır Tasarımı

> **Amaç:** Küçük rötuşlardan çıkıp oyuncunun *kendiliğinden geri döndüğü* bir oyuna geçmek. Bunu merak, anlam, kimlik ve insan bağıyla yaparız; zamanlayıcı, kayıp cezası ya da parayla atlatma kullanmayız.
> **Bağlayıcı çerçeve:** `TASARIM_PUSULASI.md`. Her öneri pusulanın 7 soruluk süzgecinden (Bölüm 7) ve 10 ilkesinden geçer. Hedef kitle 30–49 yaş Türk yetişkin, 3–3,5 dakikalık oturum, günde ~4 oturum.
> **Kaynak tabanı:** `apk` dalı (son commit `8d25097`), GDD v8, `OTURUM_HAFIZASI.md`, `docs/MULTIPLAYER.md`, `mobile/lib/{game,events,arcs,npc-mind,nufus}.ts`, `mobile/lib/mp/`, `mobile/app/oyun/index.tsx`.

---

## 1. Teşhis: oyuncuyu bugün ne tutuyor, ne kaçırıyor?

**Tutan şeyler (korunacak):** Hatırlayan insanlar var (`npc-mind.ts`: anılar, `effectiveRel`, nam). Gecikmeli sonuçlar sebebini söylüyor (geri çağırma oranı %100). Nesil devri gerçek bir miras taşıyor (`continueAsHeir`: kan defteri, ata hatırası `ata_hatira`, soy namı `soy_nam`, yadigâr kılıç, eserler, tohumlar). Ahilik merdiveni ve peştamal sınavı yeterlik hissi veriyor. Mersiye ve "ömrün en büyük anları" doruk–son kuralına uyuyor. Ölü karar 0, tekrar oranı %5,7.

**Kaçıranlar (koddan kanıtlı):**

1. **Ayın kartını zar seçiyor, hikâye seçmiyor.** `app/oyun/index.tsx` içinde `Math.random()`: %28 ikilem, %22 fırsat, %25 kapıdaki insan, kalanı boş. `pickDilemma` 145 kartlık havuzdan ağırlıklı rastgele çekiyor. Seçim arayüz katmanında yapıldığı için motor simülasyonu (`oynanis.cjs`) gerçek oyuncunun gördüğü sırayı ölçemiyor. Ayın kartı, hayatın o anki dramatik ihtiyacından habersiz.
2. **Yönetmenin dorukları jenerik.** `directorTick` gerilim 80'i geçtiğinde olgun bir tohum yoksa "talih senden yana döndü" ya da "eski dengeler sarsıldı" diyor. Bu cümleler sebep söylemiyor; pusulanın 3. ilkesine aykırı. Durgunlukta gelen `sparkCard` (kese, serçe, fırın) renk katıyor ama soru bırakmıyor.
3. **Orta yaş birbirine benziyor.** Medyan hayat 708 ay ve 657 karar. 30–55 yaş arasında yeni bir *soru* doğmuyor: meslek zirvede, ev kurulmuş, gerilim tohumların insafına kalmış.
4. **Servet kartopu gerilimi siliyor.** Ölçümlere göre etkin oyuncunun 60 yaşındaki kese medyanı ~28,7 bin akçeydi (`f0e400a` ile kısmen frenlendi). Para bir kez yettiğinde kararların bedeli hissedilmiyor. Geç oyunda "kaybedecek bir şeyim var" duygusu yerine "her şey hallolmuş" duygusu kalıyor.
5. **Ölüm, soyun sonuysa her şeyi siliyor.** Evlatsız ölümde `resetGame()` çağrılıyor ve tek kayıt anahtarı siliniyor. Hanedan defteri, lakaplar, başarımlar hiçbir şey hayattan hayata geçmiyor. Roguelite'ların en güçlü geri dönüş motoru olan "her deneme bir şey bırakır" ilkesi burada yok.
6. **Paylaşılacak an yok.** `roman.tsx` yalnız düz metin paylaşıyor. GDD v8'deki "ölüm kartı / Chronicle viral motoru" hâlâ açık. BitLife'ı yayan şey, oyuncuların tuhaf hayatlarını kendiliğinden anlatmasıydı ([App Store](https://apps.apple.com/us/app/bitlife-life-simulator/id1374403536), [r/BitLifeApp örneği](https://www.reddit.com/r/BitLifeApp/comments/1uqgrno/turned_down_a_football_scholarship_for_a_1k/)). Kronikler'de bu anlar üretiliyor ama dışarı taşınamıyor.
7. **Takvim oyunun içinde kalıyor.** Şenlikler oyun içi ayın 2., 7. ve 11. aylarına sabit (`FESTIVALS`, `pickFestival`). Gerçek dünyadaki Ramazan, Nevruz ya da Hıdırellez oyunda yankı bulmuyor.
8. **Diyar'ın teknik altyapısı var, oyuncu topluluğu yok.** Ayrıca iki kuralı pusulayla çatışıyor: ay ya çoğunluğun "Hazır" demesiyle ya da **5 dakikalık geri sayımla** ilerliyor (`mp/countdown.tsx`). Seyahate çıkmadan kopan oyuncu ise **NPC-vekile düşüp yaşlanabiliyor ve ölebiliyor**. Bu, yokluğu cezalandırmak demek (pusula Bölüm 4).
9. **Geri dönüş sebebi yalnız hikâyenin kendisi.** Pusulaya göre bu doğru bir tercih. Ama oyunu açmadan önce aklında kalan bir soru (ay sonu notu, adı konmuş bir sır) henüz sistematik değil.

**Özet:** Motor güçlü bir *hikâye makinesi*. Eksik olan üç şey var: (a) hikâyeyi **kurgulayan bir yönetmen**, (b) hayattan hayata **biriken bir kimlik**, (c) hikâyeyi **başkalarıyla paylaşma** yolu.

---

## 2. Çığır sütunları

Her sütunda şu sırayı izliyoruz: **Mekanizma** → **Kronikler'de nasıl görünür** → **Dayandığı kod** → **Efor (S/M/L)** → **Beklenen etki**.

### Sütun 1 — Kader İpi: söz ver, sakla, öde
- **Mekanizma:** Zeigarnik etkisi. Yarım kalan iş akılda kalır ([Wikipedia](https://en.wikipedia.org/wiki/Zeigarnik_effect)). Buna Çehov'un tüfeği eşlik eder: anlatıda gösterilen her ipucu sonunda kullanılmalıdır. Önemli olan, verilen sözün **mutlaka tutulması**. Tutulmayan söz merakı değil, güvensizliği büyütür.
- **Kronikler'de:** Yönetmen bir *ip* açar. İp; bir ima, bir kişi ve bir vade aralığından oluşur. Aynı anda en çok 3 ip açık olabilir ve hepsi "Açık hesaplar"da tek satırla görünür.
  - Örnek ima: *"Değirmenci Yusuf'un ölürken söylediği yarım cümle: 'Kuyunun dibindeki mühür…' Bunu kimse duymadı. Sen hariç."*
  - **Ay sonu notu:** Oturumu kapatan cümle, pusula 2.4'ün önerdiği biçimde. Örnek: *"Gelecek bahar: Karaoğlu'nun oğlu 16'sına basıyor. Babasının kanını unutmadı."* Merak bırakır ama kesintisiz oynamayı ödüllendirmez.
  - **Ödeme:** İpin vadesi dolduğunda sebebini söyleyen bir sahne gelir. Jenerik doruklar ("talih döndü") kalkar; gerilim 80'i geçtiğinde doruğun yerini **en olgun ip** alır.
- **Dayandığı kod:** `seeds` ve `tohumSonucu` (gecikmeli sonuç zaten var; ipler bunun görünür hâli), `directorTick`, `acikHesaplar`, `arcs.ts` (30 yay ip kaynağı olur), `history.landmark`.
- **Efor:** M. **Etki:** Yüksek. Her oturumun sonuna geri dönüş sorusu koyar.

### Sütun 2 — Hanedan Defteri: ölüm bir son değil, bir sayfa
- **Mekanizma:** Kimlik ve miras; özerklik ve yeterlik ([Ryan, Rigby, Przybylski 2006](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf)). Hades'te ölüm ceza değildir; hikâyeyi ve ilişkileri ilerletir ([Game Developer — Kasavin](https://www.gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death)). Sahiplik ve emek etkisi de burada çalışır (pusula 2.6).
- **Kronikler'de:** Kayıttan bağımsız, silinmeyen bir **Hanedan Defteri** tutulur. Defterde şunlar yer alır:
  - **Soy yetenekleri (yatay, güç enflasyonu yok):** Her hayatın sonunda, o hayatın yaptıklarından türeyen 3 yetenekten biri seçilir. Her yeteneğin bir bedeli vardır. Örnekler: *"Ocak Eli: zanaat dersleri hızlı, ama ilk 5 yıl çarşıda 'kibirli usta' dedikodusu"*, *"Kan Yemini: kanlıya karşı +şans, ama barış kartlarında şeref bedeli artar"*.
  - **Aile mottosu:** 2. nesilde atanın amellerinden önerilir. Örnekler: *"Sözümüz senettir"*, *"Ekmeğimizi kılıçtan yeriz"*. Mottoya aykırı seçim yapılabilir, ama kartta kısa bir *"Ata sözünü çiğniyorsun"* uyarısı çıkar ve hane asabiyesi düşer (Sütun 5).
  - **Ata ruhları:** Kriz kartlarında bir atanın adıyla gelen bir seçenek açılır. Örnek: *"Deden Hasan Usta bu kapıda boyun eğmemişti."*
  - **Kronik Ansiklopedisi:** Kazanılan lakaplar (`lakapHesapla`), ölüm sıfatları (`deathEpithet`), tamamlanan yaylar, görülen ikilemler, kasabanın efsaneleri. Bunlar Quantic Foundry'nin "Tamamlama" motivasyonuna hitap eder (pusula 2.2).
  - **Soy tükenince yeni soy, eski defterle başlar.** *"Küllerden yeni bir ocak: Demiroğullarının uzak yeğeni, dedelerinin defteriyle Kayseri'ye geliyor."*
- **Dayandığı kod:** `continueAsHeir`, `heirPreview` (parite korunmalı), `DynastyRecord`, `soy_nam`, `ata_hatira`, `legacy`, `eulogy`, `ACHIEVEMENTS` (100 adet; şu an her vârisle sıfırlanıyor), `store.tsx` (ikinci bir AsyncStorage anahtarı: `kronik_defter`).
- **Efor:** M. **Etki:** Çok yüksek. Ölüm en büyük terk noktasıyken en güçlü "bir hayat daha" anına dönüşür.

### Sütun 3 — Yönetmen 2.0: gerilim eğrisi ve tekdüzelik nöbetçisi
- **Mekanizma:** Akış (zorluk ile ustalık dengesi) ve Crusader Kings'ten bilinen kural: simülasyon tek başına yetmez, elle yazılmış sahne çerçevesi gerekir ([Haahr vd.](https://www.researchgate.net/publication/300137968_What_Makes_a_Successful_Emergent_Narrative_The_Case_of_Crusader_Kings_II)). Reigns'in kart kısalığı da örnek alınır ([GamesRadar](https://www.gamesradar.com/how-reigns-convinced-two-million-people-to-swipe-right-to-rule-their-kingdom-and-captured-the-game-of-thrones-license/)).
- **Kronikler'de:**
  - **Ay kartını motor seçer.** `index.tsx` içindeki zar yerine motorda `ayinSahnesi(s)` adlı bir işlev çalışır. İşlev, hayat evresinin hedef eğrisine (çocukluk merak, gençlik sınav, orta yaş **soru**, yaşlılık miras), açık iplere ve son 12 ayın kart türlerine göre puan verir.
  - **Nöbetçi:** Aynı türden kart (fırsat, kapı, ikilem) art arda 3 kez gelemez. 30–55 yaş arasında her 18 ayda en az bir **"orta yaş sorusu"** gelir. Örnekler: *"Kalfan senden iyi oldu. Dükkânı ona mı bırakırsın, onunla mı yarışırsın?"*, *"Eşin: 'Bu kasabada yaşlanmak istemiyorum.'"*
  - Kart metni Reigns kısalığında kalır: en çok 2 cümle ve 2–3 seçenek.
- **Dayandığı kod:** `pickDilemma`, `pickFestival`, `opportunitiesFor`, `kapiyaGelen`, `directorTick`, `story.lull/tension/breath`, `recent_dilemmas`. Ölçüm için `oynanis.cjs`.
- **Efor:** M. **Etki:** Yüksek. Orta yaşın tekdüzeliğini kırar ve oyuncunun gördüğü sırayı simülasyonla ölçülebilir kılar.

### Sütun 4 — Kan Hafızası: nesiller boyu hatırlayan hasım haneler
- **Mekanizma:** Kişileşmiş rakip ve dolaylı karşılıklılık (Nowak–Sigmund, pusula 3.2). Shadow of Mordor'un Nemesis sistemi, oyuncuyu hatırlayan düşmanın gücünü göstermişti ([IGN](https://www.ign.com/articles/wb-games-nemesis-system-patent-was-approved-this-week-after-multiple-attempts)).
- **Kronikler'de:** Rakip hane soyut bir güç sayısı olmaktan çıkar ve **adı olan bir reisle** temsil edilir. Reisin vârisi hasmın kinini ya da minnetini miras alır.
  - Örnek: *"Karaoğlu Tuğrul, deden onu değirmen davasında mahcup etmişti. Torunu Alp bu yıl seninle aynı peştamal sınavında."*
  - Hasım yenilgiden bir **iz** taşır: bir lakap, bir yara, bir yemin. Haneler arası düğün kan davasını dönüştürebilir; mevcut `kadının daveti` ve diyet kartlarıyla barış yolu her zaman açıktır (pusula 9.5).
- **Dayandığı kod:** `RivalHouse` (`world.ts`: `power`, `pride`, `trait`, `tutum`), `ensureRivals`, `story.nemesis.nesil`, `reconcileNemesis`, `kanMiras`, `feud`, `bloodline`, `addMemory`/`topMemories`.
- **Hukuki not:** WB'nin [ABD patenti US10926179](https://patents.google.com/patent/US11660540B2) hiyerarşi, yenilgide terfi ve kale gibi *belirli bir birleşik sistemi* kapsıyor ([Patent Graveyard özeti](https://patentgraveyard.com/gaming/nemesis)). Bizim tasarım anı ve itibar tabanlı. Hiyerarşi ya da terfi döngüsü kopyalanmamalı. Yayın öncesi hukuki görüş alınmalı.
- **Efor:** M. **Etki:** Yüksek. "Düşmanım kim?" sorusuna nesiller boyu tek bir yüz verir (pusula teşhisi 5).

### Sütun 5 — Geç oyunun gerilimi: asabiye ve veraset krizi
- **Mekanizma:** İbn Haldun'un nesil döngüsü (pusula 3.6). Anlamlı risk kayıptan kaçınmayı **hikâye içinden** kullanır, ama oyundan uzak kalmayı cezalandırmaz.
- **Kronikler'de:** Servet büyüdükçe kararlar kolaylaşmaz, **soru değiştirir**: *kime, ne kadar, ne zaman?*
  - **Hane asabiyesi:** Ekranda sayı olarak değil, vâris ekranında **tek cümle** olarak görünür. Örnek: *"Hanenin ateşi küllenmekte: torunlar yokluğu bilmedi."* Zorluk ve birlik asabiyeyi yükseltir, rahatlık ve bölünme düşürür.
  - **Zenginlere özgü kartlar:** Kâhyanın hesabı tutmuyor. Mirasyedi evlat kumar borcuyla geliyor. Bey iltizam istiyor. Kardeşler ölümünden önce payını istiyor ("ölmeden miras").
  - **Veraset krizi:** Gözde evlat (`succession.favored`) ile ilk doğan arasında açık bir çatışma çıkar. Vasiyet bir ikilem olur.
  - Çıkış yolları her zaman vardır: vakıf, hayır, sefere hisse.
- **Dayandığı kod:** `WILL_STYLES`, `succession.favored`, `heirPreview`/`continueAsHeir`, `lifestyleUpkeep`, `vakifTier`, `buyIltizam`, `ekonomi.cjs`.
- **Efor:** M. **Etki:** Orta-yüksek. 50 yaş sonrasını "otomatik pilottan" çıkarır.

### Sütun 6 — Divan Davası: herkese aynı dava, her gün bir tane
- **Mekanizma:** Wordle'ın ortak günlük bulmacası ve spoilersız paylaşımı ([Slate — Wardle](https://slate.com/culture/2022/01/wordle-game-creator-wardle-twitter-scores-strategy-stats.html)). Wordle reklam koymadı, kayıt istemedi ve "yoğun bir ilişki istemedi" ([Seattle Times](https://www.seattletimes.com/nation-world/he-made-wordle-for-his-partner-then-the-internet-fell-in-love-with-the-game/)). Buna sosyal karşılaştırma ve ahlaki tartışma eklenir.
- **Kronikler'de:** Ana ekranda **"Bugünün Divanı"** adlı isteğe bağlı bir kart durur. Dava, gerçek tarihten türetilen bir tohumla seçilir; böylece o gün tüm oyuncular aynı davayı görür.
  - Örnek dava: *"Divan Davası No. 41 — Yetim kız, babasının borcu yüzünden alacaklının evinde hizmette. Alacaklı helal etmiyor. Kadı sensin."* Seçenekler: borcu kamudan öde / akdi bozdur / alacaklıyı ikna et.
  - **Çevrimdışı çalışır:** Oy sonucu yoksa kasabanın NPC'leri huylarına göre oy verir. Örnek: *"Kayseri ahalisinin çoğu (merhametliler) seninle."*
  - **Çevrimiçiyken** isteğe bağlı olarak Diyar oy toplamı görünür. Örnek: *"Diyarın %58'i akdi bozdurdu."* Gösterilen oran gerçek sayımdır.
  - **Ödül yalnız kimliktir.** Dava akçe ya da güç vermez (farm yok). Kararlar "Divan defterine" ve lakap yoluna yazılır; örneğin 20 merhamet hükmü *"Merhametli Kadı"* lakabını açar.
  - **Kaçırılan dava kaybolmaz.** Arşivde durur ve sonradan oynanabilir. Seri sayacı yoktur.
  - **Paylaşım:** Emojisiz ve spoilersız bir satır. Örnek: `Divan No. 41 ⚖ merhamet · diyarın %58'i aynı yolda`.
- **Dayandığı kod:** `events.ts` içindeki `Dilemma` yapısı ve `riskiCoz`, `huyOf` (`nufus.ts`, NPC oyu için), `mp/net.ts` ve `server/src` (küçük bir sayım uç noktası; protokol paritesi korunmalı).
- **Efor:** S (çevrimdışı) ve M (sunucu oyu). **Etki:** Yüksek. Günlük, hafif ve sosyal bir açılış sebebi verir ve 3 dakikalık oturuma tam oturur.

### Sütun 7 — Hayat Romanı Kartı ve mersiye anı
- **Mekanizma:** Doruk–son kuralı, anlatılmaya değer hikâyeler ve BitLife tarzı paylaşım. Dwarf Fortress'in "Boatmurdered" efsanesi, oyuncuların simülasyonun boşluklarını kendi anlatılarıyla doldurduğunu gösterir ([LP Archive](https://lparchive.org/Dwarf-Fortress-Boatmurdered/), [Game Developer — Adams](https://www.gamedeveloper.com/design/interview-the-making-of-dwarf-fortress)).
- **Kronikler'de:** Ölüm anında (ve istenirse herhangi bir anda) **görsel bir kart** üretilir. Kartta şunlar bulunur: arma, ad, doğum ve ölüm yılı (1247 ve sonrası), lakap, ömrün 3 büyük anı, *"… olarak anıldı"* satırı ve soyun nesil şeridi.
  - Örnek kart: *"Demirci Ayşe Hatun (1251–1309) — 'Peştamalını kanla bağlayan.' Kocasının katilini affetti; oğlu affetmedi."*
  - Hafif sürüm kartı ön tanımlı olarak spoilersız gelir.
- **Dayandığı kod:** `eulogy`, `hayatOzeti`, `lakapHesapla`, `deathEpithet`, `roman.tsx` içindeki `onShare` (şimdilik metin). Skia zaten bağımlılık; bir Skia yüzeyinden görüntü alınıp paylaşılabilir.
- **Efor:** S–M. **Etki:** Orta (organik tanıtım); 2. sütunla birlikte yüksek.

### Sütun 8 — Gerçek takvimin yumuşak ritimleri
- **Mekanizma:** Animal Crossing'in gerçek saat ve mevsim ritmi ([ACM — temporal design](https://dl.acm.org/doi/pdf/10.1145/3641237.3691689)). Kronikler bunu **kıtlık yaratmadan** uygular.
- **Kronikler'de:** Telefonun tarihi Ramazan, Kurban, Nevruz (21 Mart), Hıdırellez (6 Mayıs) ya da Aşure dönemine denk gelirse ana ekranın görseli değişir ve "o haftanın" kart havuzu öne çıkar.
  - Örnek: *"Hıdırellez gecesi: dileğini gül dalına as. Kasabanın gençleri ateş başında."*
  - **Hiçbir içerik yalnız o güne özel değildir.** Aynı kartlar oyun içi takvimde de gelir. Kaçıran bir şey kaybetmez.
  - Hicri bayramlar için 10 yıllık hazır bir tablo kullanılır (Hermes'in `Intl` desteğine güvenilmez).
- **Dayandığı kod:** `FESTIVALS`/`pickFestival` (`events.ts`), `calendar.ts`, tema jetonları.
- **Efor:** S. **Etki:** Orta. Yerel kültürle sıcak bir bağ kurar ve yıl boyunca tazelik verir.

### Sütun 9 — Dost Haneler: asenkron sosyal hanedan
- **Mekanizma:** İlişkililik, karşılıklılık ve Mauss'un hediye döngüsü (pusula 3.3). Boatmurdered'daki gibi elden ele geçen ortak hikâye.
- **Kronikler'de:**
  - **Hane Mührü:** Hanenin küçük bir anlık görüntüsü (ad, arma, motto, 3 ata, huylar) kısa bir kod ya da bağlantı olarak paylaşılır. Arkadaşın bu kodu kendi dünyasına aldığında hane, gerçek bir rakip ya da müttefik ev olarak onun kasabasında yaşar. Sunucu gerekmez.
  - Arkadaşın hanesiyle **dünürlük** kurulabilir. Mektuplar hazır şablonlarla gider (serbest metin yok, moderasyon yükü yok). Sonradan bir kan davası bile çıkabilir. *"Ali'nin Akhanlıları kızını senin oğluna istedi."*
  - **Emanet Nesil:** Bir nesil, kayıt dışa aktarılarak arkadaşa emanet edilir; geri geldiğinde defterde onun eli görünür.
  - **Diyar'a uyarlama:** Asenkron bir "mektup diyarı" modu eklenir. Ay herkes için kendi telefonunda ilerler. Çevrimdışı kalan oyuncunun vekili **ölmez, kış uykusuna yatar**. 5 dakikalık geri sayım yalnız isteğe bağlı "canlı meclis" odalarında kalır.
- **Dayandığı kod:** `RivalHouse`/`ensureRivals`, `acceptDynastyOffer`, `allied_houses`, `importSave` (`ayarlar.tsx`), MP evlilik ve dünürlük (`mp_itest7`), paylaşımlı NPC kütüğü.
- **Efor:** L. **Etki:** Çok yüksek ama gecikmeli. Oyuncu tabanı oluştukça büyür.

---

## 3. Yol haritası: önce bu üçü

Sıralama, efor başına etkiye göre yapıldı. Üçü de çevrimdışı çalışır ve mevcut smoke düzeniyle sınanabilir. **Önce, bir günlük hızlı kazanım olarak** Sütun 7'nin metin sürümü güçlendirilebilir (lakap ve 3 büyük an zaten var).

### Öncelik 1 — Kader İpi ve Yönetmen 2.0 (Sütun 1 + 3)
**İlk sürümün kapsamı:**
- Motorda `ayinSahnesi(s)` yazılır ve `index.tsx` içindeki zar kaldırılır. UI yalnız sonucu gösterir.
- `seeds` yapısına bir `ip?: { ima: string; kisi?: string; vade: [min, max] }` alanı eklenir (opsiyonel alan; göç güvenli).
- 30 yayın 12'si ve büyük tohumlar ip açabilir hâle gelir. Aynı anda en çok 3 ip açık olur.
- `directorTick` içindeki jenerik doruklar kaldırılır; yerine olgun ipin ödemesi gelir.
- Ay sonu notu, ana ekranın altında tek satır olarak gösterilir.
- Nöbetçi kuralı uygulanır: aynı tür kart art arda en çok 3 kez; 30–55 yaş arasında her 18 ayda bir orta yaş sorusu (ilk etapta 10 yeni kart, 6 dilde).

**Ölçüm (`oynanis.cjs`'ye eklenecekler):**

| Ölçüt | Hedef |
|---|---|
| İp ödeme oranı | %100; vadesinde kapanmayan ip = hata |
| Açık ip | En çok 3 |
| 30–55 yaş boş ay oranı | Mevcut değere göre düşüş (önce ölçülecek) |
| Art arda aynı tür kart | En çok 3 |
| Jenerik doruk satırı | 0 |
| Ay sonu notu kapsaması | Yetişkin ayların ≥%60'ı |
| Bunalma ayı | ~%0'da kalmalı |

### Öncelik 2 — Hanedan Defteri, çekirdek sürüm (Sütun 2)
**İlk sürümün kapsamı:**
- Ayrı bir `kronik_defter` anahtarı tutulur. `resetGame()` bu anahtarı silmez.
- Defter ilk etapta şunları kaydeder: soy listesi (`DynastyRecord`), lakaplar ve ölüm sıfatları, tamamlanan yaylar, görülen ikilemler.
- Her ölümde 3 soy yeteneğinden biri seçilir. İlk etapta 8 yetenek yazılır; hepsi yatay ve bedelli.
- Motto ilk sürüme girmez.
- Soy tükendiğinde "Küllerden yeni ocak" başlangıcı: defter ve bir yetenek yeni soya taşınır.
- Menüde tek ekran: Kronik.

**Ölçüm:**
- Yeteneklerin her biri `olu-karar.cjs` mantığıyla sınanır; hiçbiri her koşulda baskın olmamalı.
- `ekonomi.cjs` ile güç enflasyonu ölçülür: 5 soy boyunca ilk 20 yaşın kese medyanı %10'dan fazla kaymamalı.
- `migrate-check` ve `goc-fuzz` deftere de uygulanır.
- Cihazdaki oturum kaydına (`oturum.ts`) "ölümden sonra devam" ve "yeni soy başlatma" oranları eklenir.

### Öncelik 3 — Divan Davası, çevrimdışı sürüm (Sütun 6)
**İlk sürümün kapsamı:**
- 60 dava yazılır, 6 dilde. Dava `YYYYMMDD` tohumuyla deterministik seçilir.
- Kasabanın oyu NPC huylarından hesaplanır.
- Divan defteri ve 3 lakap yolu (merhamet, adalet, töre) eklenir.
- Kaçırılan davalar arşivden oynanabilir.
- Spoilersız paylaşım satırı eklenir.
- Sunucu oyu **ikinci iterasyona** kalır: tek bir sayım uç noktası, yalnız oy sayısı, kimlik yok, açık rızayla.

**Ölçüm:**
- Bir dava denetçisi yazılır. Aynı tarihte her cihazda aynı dava çıkmalı. NPC oy dağılımı 3 seçeneğin hiçbirinde %90'ı aşmamalı (ölü karar yasağı).
- Ödül denetimi: dava akçe ya da güç vermemeli.
- Sonra, rıza alınarak gerçek telemetri: gün başına açılış oturumu, Divan'a giren oturumların oranı, D1/D7/D30.

### Sonraki dalga
Sütun 4 (Kan Hafızası) → Sütun 5 (asabiye ve veraset) → Sütun 8 (takvim) → Sütun 7'nin görsel kartı → Sütun 9 (Dost Haneler; önce Hane Mührü, sonra asenkron Diyar).

### Telemetri ilkesi
- **Bugün:** Ölçüm yalnız cihazda kalır (`oturum.ts`).
- **Yarın:** Açık ve geri alınabilir rızayla, anonim ve toplu sayımlar toplanır (KVKK açık rıza ve aydınlatma). Ayarlardan kapatılabilir.
- **Kuzey yıldızı ölçütleri:** Haftada kaç farklı gün açılıyor, nesil devrine ulaşma oranı, ölümden sonra devam oranı, paylaşım dokunuşu. Toplam oynama süresi hedeflenmez.

---

## 4. Riskler ve etik korkuluklar

### Bilinçli olarak reddettiklerimiz ve nedenleri

| Karanlık kalıp | Neden hayır |
|---|---|
| FOMO zamanlayıcıları, "yalnız bugün" içeriği | Pusula Bölüm 4 ve ilke 10'a aykırı; Zagal vd.'nin sınıflandırdığı zamansal karanlık kalıp ([Semantic Scholar](https://www.semanticscholar.org/paper/Dark-patterns-in-the-design-of-games-Zagal-Bj%C3%B6rk/19a241378b06d868eb5f6b76027172c3aaca86f4)). 30–49 yaş oyuncusu iş ve aile arasında oynar; randevu dayatmak terk sebebidir. |
| Cezalı seriler, suçluluk bildirimleri | Oyun bildirim kullanmıyor ve kullanmamalı. Duolingo bile serilerin esnek olmasının (dondurma, onarım) elde tutmaya yaradığını raporluyor ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit/)). Bizde seri sayacı hiç yok, olursa da yalnız "kaç farklı gün" olarak ve sıfırlanmadan tutulur. |
| Kayıptan kaçınma cezaları (yoklukta ölüm ya da çürüme) | Pusula 9.5. Diyar'daki vekil ölümü bu yüzden kış uykusuna dönüşmeli (Sütun 9). |
| Loot box, şans kutusu | Belçika'da ücretli loot box'lar kumar sayıldı ([BBC](https://www.bbc.com/news/technology-43906306), [Belçika Oyun Komisyonu raporu](https://gamingcommission.be/sites/default/files/2021-08/onderzoeksrapport-loot-boxen-Engels-publicatie.pdf)). Google Play oranların açıklanmasını istiyor ([Play politikası](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en-GB)). Bizim değişken ödülümüz *içerikten* gelir ve olasılığı kartta yazar (`riskiCoz`). |
| Pay-to-win ya da parayla atlama | Kural zaten konmuş. AB'nin 2025 oyun içi para ilkeleri ve FTC'nin Epic'e verdiği 245 milyon dolarlık iade kararı karanlık satın alma kalıplarının bedelini gösteriyor ([AB CPC](https://commission.europa.eu/news-and-media/news/european-commission-hosts-stakeholders-talks-application-cpc-networks-key-principles-games-virtual-2025-06-03_en), [FTC](https://www.ftc.gov/news-events/news/press-releases/2023/03/ftc-finalizes-order-requiring-fortnite-maker-epic-games-pay-245-million-tricking-users-making)). |
| Arkadaş çekme piramitleri | Hane Mührü bir *hediyedir*: ödül vermez, davet sayısı tutulmaz. |

**"Toplum mühendisliği" bu belgede şu anlama gelir:** oyuncular ve NPC'ler arasındaki sosyal dinamikleri (karşılıklılık, itibar, dünürlük, kan ve barış) tasarlamak. Kullanıcıyı manipüle etmek değil.

### Tasarım riskleri
- **Karmaşıklık:** Yeni sütunlar ekran sayısını şişirebilir. Kural: her sütun en çok bir ekran ekler, ana ekrana en çok bir satır koyar. Açık hesaplar 5 ile sınırlı kalır.
- **Güç enflasyonu:** Soy yetenekleri dikey güce dönüşürse geç nesiller sıkıcılaşır. Önlem: yatay ve bedelli tasarım, `ekonomi.cjs` kapısı.
- **İp borcu:** Ödenmeyen sözler güveni yıkar. İp ödeme oranı %100 olmazsa sürüm çıkmaz.
- **Divan içeriği:** Dini ve hukuki hassasiyet taşır. Davalar dönemin örfüne dayanmalı, güncel siyasete değmemeli ve 6 dilde okunarak onaylanmalı.
- **Patent:** Sütun 4'te Nemesis'in birleşik mekanikleri kopyalanmamalı. Hukuki görüş alınmalı.
- **Sunucu maliyeti ve gizlilik:** Oy sayımı kimliksiz olmalı. Cloudflare ücretsiz katman sınırları izlenmeli.

### Etik korkuluk kontrol listesi (her dalgada)
- [ ] Oyuncuyu geri getiren şey merak, anlam ya da sevgi mi? Kayıp korkusu mu? (İlke 10)
- [ ] Oyundan uzak kalan hiçbir şey kaybetmiyor mu? Vekil yoklukta ölmüyor, ip yoklukta kopmuyor, dava arşivde bekliyor mu?
- [ ] Gerçek zamanlı geri sayım yalnız isteğe bağlı canlı odalarda mı?
- [ ] Hiçbir ödül satın alınamıyor ve hiçbir şans ödülü gizli olasılık taşımıyor mu?
- [ ] Günlük içerik ödülü yalnız kimlik ve koleksiyon mu? Farm edilebilir akçe ya da güç yok mu?
- [ ] Sosyal özellik sosyal baskı (davet kotası, utandırma) üretmiyor mu?
- [ ] Gösterilen her sayı (diyar oyu, kasaba oyu) gerçek mi?
- [ ] Telemetri isteğe bağlı, anonim ve silinebilir mi?
- [ ] Süzgecin 7 sorusu (pusula Bölüm 7) yanıtlandı mı? Ölçütler (Bölüm 9.10) koşuldu mu?

> **Tek cümle:** Kronikler'in bağımlılık değil *bağlılık* yaratacak gücü zaten motorunda var. Çığır, o gücü bir **yönetmene**, ölümü aşan bir **deftere** ve paylaşılabilir bir **divana** bağlamaktır.
