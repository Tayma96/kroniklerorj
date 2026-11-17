# Tezgâh modeli — dükkân, atölye ve han için gerçek ticaret ve üretim (tasarım, 16 Kasım 2026)

Berkay'ın isteği (15 Kasım): "Dükkân, işletme almanın bir anlamı olsun; kabuk değil, kendi ticaret ve üretim
simülasyonları olsun." · "Mesleği seçip beceri ağacını açan, bir işe yaramadı demesin." · Her şey ücretsiz. · Onay
beklenmez; karar yöneticide. Bu belge üç dilimin tasarımıdır; her dilim ayrı teslim edilir.

## 1. Bugün (kod dökümü, 16 Kasım)
- Dükkân ve atölye hiçbir şey satmıyor/üretmiyor: ayda sabit NPC geliri (taban 4–5, seviye tavanı 10–46). Fiyat ayarı
  yalnız handa işliyor; kapı aç/kapa ölü karar; işletmeler arası rekabet yok. Atölye kalitesini tüccar belirliyor.
- Çalışan zincir: 59 mal, 48 tarif, kalite (sade/iyi/üstün/şaheser), takat 6/ay (1 ay = 12 gerçek saat), pazar ilanı
  (5 ilan, %5 bac, 0,5–3× adil bant), NPC'ye satış (kişi başı mal başı ayda 6, taban fiyat), lonca siparişi,
  ısmarlama, kervan. Yerleşimin mal talebi modellenmemiş.
- Kancalar: 199 `hak`tan 196'sı, 74 `kalite`den 57'si, 51 `hizmet`ten 30'u, 72 `tarif` kimliğinden 24'ü boşta.
  `mulk/` kodunu tetikleyen tek beceri kancası `ikram`.
- Çoklu handa her han NPC gelirini ayrı aldığı için şehirde akçe girişi 5 katına çıkabiliyor (açık gerilim).

## 2. Hedefler
1. Dükkân **satar**, atölye **üretir**, han **ağırlar**; üçü de oyuncunun verdiği kararlarla kazanır ya da kaybeder.
2. Rekabet gerçek: aynı yerleşimde aynı malı satanlar sınırlı NPC bütçesini paylaşır.
3. Zincir oyuncuları bağlar: üretici → dükkâncı → tüccar (kervan) → müşteri.
4. 14 mesleğin her biri bu sistemde görünür bir rol alır; boşta kanca sayısı her dilimde azalır, asla artmaz.
5. Sonuç her zaman nedenini söyler (pay dökümü). Gizli sayı yok.

**Yapılmayacak:** vardiya çizelgesi, onlarca yeni tarif, gerçek zaman sayaçları, parayla hızlandırma, stok çürümesi,
hırsızlık/yangın gibi kayıp olayları, gerçek paranın (Debdebe teveccühü) çekiciliğe girmesi.
**Başarısızlık sayılır:** dükkânı olan her zaman daha zengin (baskın strateji); girmeyen oyuncunun mülkünü kaybetmesi;
akçe basan bir döngü; oyuncunun "neden az sattım" sorusuna ekranda yanıt bulamaması.

## 3. Yaklaşımlar
- **A. Vitrin:** pasif gelir kalır, görsel eklenir. Reddedildi: kabuk.
- **B. Tezgâh modeli (seçildi):** mevcut mal/tarif/kalite/pazar sistemlerine raf, depo, üretim emri ve paylaşımlı NPC
  bütçesi eklenir. Yeni kavram az, mevcut sistem yeniden kullanılır.
- **C. Tam üretim zinciri simülasyonu:** reddedildi; kısa mobil oturumda yönetilemez, pusulanın sadelik ilkesine ters.

## 4. Ortak çekirdek
- **Depo:** her işletmenin kendi mal deposu (kalite partileriyle). Kapasite seviyeye göre: dükkân [40,60,90,130,180],
  atölye [60,90,130,180,240] adet. Sahip ve yetkili çalışan envanterinden depoya, depodan envanterine taşır (anında).
- **Kepenk (yokluk cezası yok; düzeltme 2):** kepenk = o ay hiç satış yok (NPC'ye ya da oyuncuya). Kepenkli ayda
  bakım yazılmaz, borç/iflas sayacı ilerlemez, itibar düşmez, faaliyet ayı sayılmaz, **maaş işlemez** (sözleşme
  askıda; ödenemedi diye bozulma ve −8 itibar yok). Satış olan ayda bakım o ayın hasılatından/kasadan düşer. Rafı
  satılamayan malla dolu dükkân bu yüzden iflas etmez. Elle "kapı" ayarı dükkân/atölyede kalkar (ölü karar).
- **Yuva kıtlığı:** dükkân/atölye yuvaları artar — şehir 12/9, kasaba 6/4, köy 2/2 (talep paylaşıldığı için yuva
  sayısı akçe basmaz). Bütün yuvalar doluyken **60 ay (30 gerçek gün) etkinliksiz** dükkân için başka oyuncu
  **devralma** isteyebilir. Etkinliksiz ay = satış yok VE sahibin/vekilin hiçbir raf-depo-fiyat eylemi yok; satış ya da
  sahip eylemi sayacı anında sıfırlar, devirde ve mirasta da sıfırlanır. Eski sahibine **beyliğe ödediği edinim
  bedeli** (oyuncular arası devir fiyatı değil; devir ve mirasta aynen taşınır), depo ve kasa iade edilir (kayıp yok;
  sahibe yazılamayan iade bekler, vârise geçer, sahibi yerleşimde yoksa hazineye), itibar ve seviye sıfırlanır.
  Atölye Dilim 2'ye kadar devralınamaz.
- **Seviye** bugünkü puanla (itibar + faaliyet ayı + gelir) kalır; açtığı şey değişir (raf, depo, tezgâh).
- **Pasif NPC geliri kalkar** (dükkân ve atölye). Eski kayıt: ilk açılışta depo boş, kepenk kapalı, borç silinir.
- **Vergi:** işletme satış gelirinden bölgenin vergi oranı (%0–4) hazineye; pazar bacı (%5) dükkânda alınmaz.
- **Farm süzgeçleri:** aynı hesap/hane kümesinden gelen satış kasaya girer ama gelir, itibar ve seviye puanına
  sayılmaz (bugünkü kural); raf fiyatı pazarın adil bandında (0,5–3× taban×kalite çarpanı) kalır; çekim tavanları sürer.

## 5. Dilim 1 — Dükkân ve han: raf, fiyat, paylaşımlı talep
### 5.1 Raf
- Raf satırı = bir mal + bir kalite kademesi + adet + birim fiyat. Satır sayısı seviyeye göre [3,4,6,8,10]; satır başına
  en çok 24 adet. Mal depodan rafa konur; fiyat her an değişir (yeni fiyat bir sonraki satıştan geçerli).
- **Oyuncu müşteri:** dükkâna girer, raftan anında alır (tekrar güvenli). İlan sınırı ve süre yok.
- **NPC müşteri:** ay dönümünde, çevrimdışıyken de.

### 5.2 Hane bütçesi (rekabetin kaynağı)
- Her yerleşimde, malı olan her üretici meslek (oduncu, çiftçi, demirci, marangoz, dokumacı, aşçı, şifacı, tüccar)
  için aylık NPC bütçesi `B`: köy 10, kasaba 24, şehir 56 akçe [PARAMETRE; 16 Kasım: NPC girişi eski pasif gelirin 3 katını aşmasın diye %20 düşürüldü]. O meslekte yerleşimde hiç oyuncu yoksa ×1,5
  (bugünkü kıtlık sinyali). Bütçe o ay rafta bulunan o meslek malları arasında eşit bölünür: `b_mal`.
- NPC, birim fiyatı `1,5 × taban × kalite çarpanı`nı aşan satırı almaz (NPC tavanı; 1,6 iken stoktan alıp rafta satmak kâr bırakıyordu). Dükkânın aylık NPC hasılatı seviye tavanıyla sınırlıdır: [30,60,100,160,240] akçe.
- Satırın **çekiciliği** `a = F × Q × R × H`:
  - `F` fiyat: `clamp(taban×kç / fiyat, 0,6 … 1,6)²` — ucuz olan çeker.
  - `Q` kalite: [1 · 1,1 · 1,25 · 1,5].
  - `R` itibar: `0,5 + itibar/100`.
  - `H` beceri ve hizmet etkileri: `1 + toplam%` (tavan +%30; Dilim 3'te dolar, Dilim 1'de 1).
- **Pay** = `a / Σa` (o malı satan bütün dükkânlar). Dükkânın o maldan hasılatı en çok `b_mal × pay`; satılan adet
  `min(raf adedi, ⌊b_mal × pay / fiyat⌋)`. Stok yetmeyenin harcanmayan payı bir kez kalanlara dağıtılır; artan bütçe yanar.
  Bölme deterministik (tohumlu), sunucuda, tekrar güvenli.
- Sonuç değişmezi: yerleşimde NPC'nin dükkânlara harcadığı toplam ≤ ΣB. Dükkân sayısı akçe basmaz.
- **Ödünleşim:** düşük fiyat pay ve adet kazandırır, kâr marjını düşürür; yüksek fiyat stoğu korur, payı düşürür;
  kaliteli mal daha yüksek tavanla ve Q ile satar; itibar uzun vadeli yatırımdır.
- **Gün sonu dökümü** (ay dönümü olayı, ekranda): satır başına satılan adet, hasılat, pay yüzdesi ve payın F/Q/R/H
  çarpanları; "bütçe yetmedi / stok bitti / fiyat tavanı aştı / rakip daha ucuzdu" nedeni.
- İtibar aylık değişimi bugünkü formülle; "müşteri sayısı" girdisi artık gerçek satış yapılan satır sayısı (en çok 4).

### 5.3 Han yolcu havuzu
- Hanların pasif NPC geliri de paylaşılır: yerleşimin aylık **yolcu bütçesi** `Y` — kasaba 30, şehir 80 akçe (köy 12);  köyde
  yalnız NPC hanı. Açık hanlar (1. han NPC'deyken o da, sabit çekicilikle) `a = (100/fc)^1,5 × (1+kalite%) × R × H`
  ile paylaşır; han başına bugünkü seviye tavanı sürer (şehirde ×1,5). Böylece çoklu han akçe basmaz ve fiyat
  çarpanı NPC tarafında da gerçek karar olur.

### 5.4 Denge sınırları (sim testiyle kilitlenir)
1. Şehirde tam stoklu, en iyi paylı, 5. seviye dükkânın aylık **net** NPC kazancı ≤ 3 × usta emeği (≈90 akçe).
2. 1. seviye, ortalama paylı, stoklu dükkân bakımını çıkarır (zarar etmez); stoksuz dükkân sıfırda kalır.
3. NPC stoğundan alıp (1,5–2,5× taban) rafa koyup NPC'ye satmak zarar ettirir ya da başa baş kalır.
4. İki hesap arası alışveriş döngüsü gelir/itibar/seviye üretmez (bant + küme kuralı).
5. Toplam akçe girişi (NPC→oyuncu) yerleşim başına bugünkü pasif gelir toplamının 3 katını aşmaz.
Sunucu ajanı, pay formülünün iki biçimini (yukarıdaki bütçe payı ve adet-talebi payı) aynı sim testinde karşılaştırıp
sayıları raporlar; yönetici seçer. Parametreler tek dosyada (`mulk/tezgah-kurallar.ts`).
**Karar (16 Kasım, sim sonucu):** bütçe payı (a) seçildi — fiyat kararı gerçek ödünleşim, baskın strateji yok (en iyi
strateji sayımı: taban 6, pahalı 4, ucuzcu 0), harcama kendiliğinden ΣB altında. Ölçülen: şehirde en iyi 5. seviye
dükkân kârı 77 akçe/ay; 1. seviye dolu çarşıda bakımını çıkarıyor; NPC→oyuncu girişi şehir 608, kasaba 232, köy 87.

### 5.5 Ekran (istemci)
- **Dükkânım:** raf ızgarası (mal ikonu, kalite rozeti, adet, fiyat), depo çekmecesi, fiyat ayarı (adil bant ve NPC
  tavanı işaretli kaydırıcı, "bu fiyatla tahmini pay" önizlemesi sunucudan), gün sonu dökümü, kasa.
- **Dükkâna gir (müşteri):** yerleşimdeki dükkânlar listesi/sokak sahnesi → raf → al. Sahibin adı, itibar, damga.
- **Han:** han kartında "yolcu payı" dökümü.
- Mülk ekranının adı oyuncuya "Dükkân, atölye, han aç" olarak görünür; şartlar bugünkü gibi dökümlü.

## 6. Dilim 2 — Atölye: zanaat, üretim emri, emek
- **Zanaat:** atölye kurulurken sahibin tarifi olan mesleklerinden biri seçilir (oduncu hızarı/ocağı, çiftçi ambarı,
  demirhane, doğramacı, dokuma tezgâhı, fırın/aşevi, attar imalathanesi, yazıhane). Kalite rolü artık **o meslek**
  (tüccar değil). İlk değişiklik ücretsiz.
- **Tezgâh:** sayı seviyeye göre [1,2,3,4,5]; aynı anda açık üretim emri ve çalışan çifti sınırı.
- **Atölyede üretim:** sahibi ya da çalışanı atölyede tarif yaparsa girdi ve alet atölye deposundan düşer, ürün depoya
  girer, kaliteye `+5 × seviye` puan eklenir (adet artmaz; akçe musluğu açılmaz) ve ürüne **atölye damgası** yazılır.
- **Emek havuzu:** oyuncu çalışan takatinden atölyeye mesai bağlar (anında, ay başına en çok kendi takati); NPC çalışan
  ayda 2 emek verir (kalitesi sade). **Üretim emri** (tarif + adet) ay dönümünde havuzdaki emek ve depodaki girdiyle
  işlenir; eksikse bekler, hiçbir şey yanmaz. Çevrimdışı üretim bununla gelir, sınırı maaş ve hammaddedir.
- **Toplu sipariş:** yerleşimde ayda bir, zanaat ailesi başına, yalnız atölyelerin teslim edebildiği büyük sipariş
  (lonca siparişinin atölye boyu); ödül ⌈değer × 1,4⌉, ilk teslim eden alır, aynı atölye üst üste alamaz.
- **Ismarlama** ustaya olduğu gibi atölyeye de verilebilir; atölyeden çıkan mal levhaya damgasıyla yazılır.
- **Genişletme malzeme ister:** raf/tezgâh/depo artışı (seviye atlayınca) kereste, çivi, doğrama gibi mallarla
  tamamlanır → oduncu, demirci, marangoz için kalıcı talep.

### 6.1 Dilim 2 uygulama kararları (yönetici, 16 Kasım; sunucu kodu 17 Kasım'da bitti, denetimden geçti)
- Zanaat: tarifi olan meslekler (oduncu, çiftçi, demirci, marangoz, dokumacı, aşçı, kâtip). Kuruluşta sahibin ana/yan
  mesleği uygunsa atanır; ilk değişiklik ücretsiz, sonrası akçe ve açık emir yokken.
- Emirle üretimin kalitesi: emrin ustası (tarifi yapabilen en yüksek kademeli sahip/çalışan) + seviye bonusu; NPC emeği
  payı arttıkça düşer (dökümlü). Emirle üretim XP, hizmet puanı, nam vermez.
- Toplu sipariş: yerleşim başına ayda EN ÇOK 1 (atölyesi olan aileler arasında dönüşümlü); taban değer ≤ 60, ödül ≤ 84.
- Genişletme: dükkân ve atölyede seviye atlayınca yeni raf/tezgâh/depo, depodan malzeme düşülerek açılır; malzemeler
  NPC'den alınabilir mallardan seçilir (kilitlenme olmaz); eski kayıtta bugünkü kapasite verilmiş sayılır.
- Atölye kepengi: o ay üretim ya da toplu sipariş teslimi yoksa kepenkli (bakım/borç/iflas/maaş yok); devralma 60 ay.
- Denge sınırları (testle): NPC emeğiyle üretip taban fiyattan satmak kâr ettirmez (NPC maaş tabanı buna göre); girdi/çıktı
  korunumu; bonus adet artırmaz; toplu sipariş girişi ≤ 84/ay; alt istek ≤ 12; takat → emek 1:1.
- Dilim 1 küçük ekleri: `olay.tezgah.devralmaKasasi`ya `ad`; `depoDefteri` satırına `kimAd`; `GET /v1/dukkanlar`a
  `bedel:{dukkan,atolye}`.
- **Denetim sonrası kesinleşenler (17 Kasım):**
  - Zanaat, tarifi olan 7 meslekten herhangi biri olabilir (sahibin mesleği şart değil); ilk değişim ücretsiz, sonrası 30 akçe.
  - Emek havuzu tezgâh × 6, tek mesai ≤ 18; NPC emeği 2/ay (birikmez), kalite cezası 30, NPC atölye maaşı ≥ 38.
  - **NPC emeği yalnız maaşı emanetten karşılanan NPC'den gelir**; atölyede NPC işe alımı `emanet ≥ maaş yükü + yeni maaş`
    ister (`emanet_yetersiz`). Dökümde sözleşmeli, emek veren ve maaşsız NPC sayısı nedeniyle görünür.
  - İflas eden atölyede zanaat, üretim, mesai, emir, toplu teslim ve genişletme `isletme_kapali` ile reddedilir.
  - Reddedilen toplu teslimde mal partileriyle (kalitesiyle) depoya, sipariş açık duruma, "son alan" eski değerine döner.
  - Edilgen atölye (yalnız NPC emeği + emir + raf): şehir + kıtlıkta en iyi durumda net ≤ 35 akçe/ay (girdi 1,5× alınırsa
    31, kıtlık yoksa 10; bakım düşülmeden). Bağlayan sınır meslek bütçesi; sim testinde kilitli.
  - Emir dökümünde emir başına kalite kalemleri (usta kademesi, beceri, araç, zar, seviye bonusu, NPC cezası) aralıkla verilir.
  - Yapılmadı: ısmarlamanın atölyeye verilmesi; alt istek bütçesi için ayrı atölye testi.
- **Dilim 3 kanca denetimi (17 Kasım):**
  - Toplu indirim (`topluIndirim` tavanı %10) yalnız atölyenin kendi damgalı partileriyle teslimde geçerli; damgasız mal
    karışırsa tam adet istenir (NPC stoğundan al-teslim et kârı yok). Raf + toplu aynı ay bileşik edilgen atölye ≤ 35 (testle).
  - Ödünç usta yok: çalışanın kancası sözleşmesi içinde bulunulan aydan önce başladıysa sayılır (ay dönümü biten ayın
    gözüyle: önizleme = uygulanan); çalışan olarak yalnız en eski sözleşmesinin işletmesine katkı verir, sahip kendi
    işletmelerinin hepsine. Kural `mulk/kanca.ts kancaKisileri`; kanca okuyan uçlar bu kişileri belleğe yükler.
- Sunucu ajanı uzun işte her adımda ara kaydı oturum dalına push eder (konteyner yenilenince commit'siz iş kayboluyor).

## 7. Dilim 3 — Meslek ve beceri kancaları
Kural: bir düğüm açıldığında oyuncu ne kazandığını ekranda dökümle görür. Aşağıdakiler bu sisteme bağlanır
(ilk parti ≈70 kanca); siyaset ve toplum kancaları kendi sistemlerinde ayrı programla kapanır.

| Meslek | Rol | Bağlanacak kancalar (örnek) |
|---|---|---|
| Tüccar | Dükkân ustası, kervan | `tezgahKotasi` (+raf), `satis` (H), `fiyatTablosu` (rakip fiyatları), `komisyon` (konsinye: başkasının malını rafa alıp payla satma), `vadeliAlim`, `pazarGunu`, `navlun`, `uzakMallar`, `bezistan` |
| Demirci | Demirhane | `ustaDamgasi`, `topluAletSiparisi`, `orduSiparisi`, `silahSiparisOnceligi`, `onarimHizmeti` (atölyede hizmet tezgâhı) |
| Marangoz | Doğramacı, yapı | `yapiOnarimi` (bakımı ayni öder), `hanProjesi`/`evProjesi` (genişletme işi), `vakifSiparisi`, `bakimDefteri` |
| Dokumacı | Dokuma tezgâhı | `evTezgahlari` (+NPC emeği), `debbaghane`, `tabaklamaIlani`, boşta tarifler `hali`, `sancak` (han tezyini malı) |
| Aşçı | Fırın, han mutfağı | `topluEkmek`, `topluCorba`, `ekmekNarhi`, `asevi`, kalite `ziyafet` (han H) |
| Çiftçi | Ambar, değirmen | `tahilSaklama` (+depo), `topluHasat`, `kitlikAmbari`, `kitlikSatisi` |
| Oduncu | Hızar, taş ocağı | `projeKerestesi`, `temelTasi` (genişletme malzemesi), `kasabaOcagi` |
| Şifacı | Attar dükkânı | `attarDukkani` (dükkânda şifa hizmeti tezgâhı), `baharatSiparisi`, boşta tarifler `merhem`, `sifaSerbeti` |
| Hancı | Han | `hanBerati`, `mudavimRozeti`, `kervansaray` (kervan konaklama payı), kalite `yatak`/`oda`/`haber` (han H) |
| Ozan | Sahne, tellallık | kalite `sahne`/`atisma` (han H), `namYayma` (bir dükkânı övme hizmeti: o ay H), `ustalarLevhasi` |
| Kâtip | Yazıhane | `defter` (vergi indirimi yerine döküm ayrıntısı ve sipariş kaydı), `ortaklikDefteri` (ortak işletme), `senet` |
| Arabulucu | Ticari hakem | `senetliIhtilaf`, `hakemlik` (ısmarlama/konsinye anlaşmazlığı) |
| Asker | Asayiş | `nobet`/`devriye` asayişi → yerleşim bütçesi `B` çarpanı; `yolDevriyesi` (kervan) |
| Divan | Çarşı düzeni | `guvenilirTezgah`/`ayarDamgasi` (denetim damgası: H), `lekeliSatici`, `zahireAlimi` (hazine alımı = talep) |

**Kilit testi:** boşta kanca listesi depoda sabit bir izin listesidir; test, listede olmayan her kancanın bir
tüketicisi olduğunu ve listenin yalnız kısaldığını doğrular. İstemcide düğüm kartı "etkin" / "yakında" ayrımını gösterir.

## 8. Uygulayıcıya bırakılanlar
Depo/raf kayıt biçimi; ay dönümü işleme sırası (üretim emri → raf satışı → bakım → itibar); uç adları; eski kayıt
göçü; parametrelerin sim ile ince ayarı (§5.4 sınırları içinde). Sunucu yetkili, her eylem tekrar güvenli,
DO alt istek bütçesi istek başına ≤ 12.

## 9. Dilim 4 — Eşya kademeleri ve özellikleri (Berkay, 17 Kasım; tasarım taslağı, kod yok)
İstek: "Yeni başlayan demirciyle pir aynı ürünü üretmesin; pir efsanevi silah üretsin, gücü ve etkileri farklı olsun."
Bugün: kalite 4 kademe (sade, iyi, üstün, şaheser); puan = meslek kademesi + zanaat + beceri + alet + zar. Kalite yalnız
pazar değerini (×1–2,5) ve aletin ek çıktı/ömrünü etkiliyor; silah, zırh, giysi, yiyecek kalitesinin kullanımda etkisi yok.
Yön (yönetici önerisi; uygulamadan önce kod dökümü ve denge denetimi gerekir):
- **Altı kademe:** sade · iyi · üstün · şaheser · nadide · efsanevi. Tavan mesleğe bağlı: çırak en çok iyi, kalfa üstün,
  usta şaheser (ender nadide), **efsanevi yalnız pir** ve yalnız atölyesinde; ayda sınırlı sayıda.
- **Özellik (her eşya ailesine):** silah → düello/muhafızlık/savaş gücü; zırh-kalkan → dayanım; alet → verim ve ömür
  (bugünkü); giysi-çizme → görünüş (nam) ve yol; yiyecek → takat/kondisyon; araba-koşum → kervan yükü. Kademe arttıkça artar,
  tavanlıdır, dökümle görünür.
- **Hüner (nadide ve efsanevide):** kademe sayısından ayrı tek bir özel etki (ör. "ikinci hamle", "yolda yıpranmaz").
- **Efsanevi eşya adlıdır:** ustasının ve atölyesinin damgasını taşır, kroniğe ve levhaya geçer, mirasla hanedan
  yadigârı olur; satılabilir ama kopyalanamaz.
- Süzgeç: gerçek parayla alınamaz; güç tavanlı (kaybeden bir şey kaybetmez kuralı sürer); farm yok (aylık sınır).

### 9.1 Berkay'ın netleştirmesi (17 Kasım): fark "bayağı hissedilsin", bütün mesleklerde
- Yalnız demirci değil **14 mesleğin hepsi**, mal da **hizmet** de (şifacının ilacı ve tedavisi, aşçının ekmeği, ozanın
  türküsü, kâtibin belgesi…). Dilim 3 kancalarındaki boşta `kalite(...)` etkileri (57 adet) buraya bağlanır.
- Fark dik olmalı, gözle görülmeli: etki çarpanı kademeye göre yaklaşık sade ×1 · iyi ×1,5 · üstün ×2 · şaheser ×3 ·
  nadide ×4 · efsanevi ×5 (öneri; sim ile ayarlanır, tavanlı).
- **Alt kademe kusurludur ama zarar vermez:** çırağın ekmeği doyurur, keyif vermez ("bayat"); çırak şifacının ilacı az
  iyileştirir. Yan etki/ceza yok — yalnız eksik etki.
- **Üst kademe ikinci, üçüncü etki ekler:** ustanın ekmeği tokluk + keyif; pirin ekmeği tokluğu doldurur, keyif verir,
  az da sağlık. Efsanevi ilaç tam iyileştirir + kısa süreli dayanıklılık gibi hüner.
- Her üründe ve hizmette oyuncu "kim yaptı, kaçıncı kademe, ne veriyor" dökümünü görür; alıcı ustayı arar hâle gelmeli.

### 9.2 Yedinci kademe: tılsımlı (Berkay, 17 Kasım)
- Efsanevinin üstünde, **binde bir** ihtimalle çıkan kademe (çalışma adı "tılsımlı"; mistik/kerametli his). Yalnız pirin
  efsanevi denemesinde, o deneme başarılıysa ayrıca binde bir. Etki çarpanı efsanevinin üstünde (öneri ×7) + iki hüner.
- Farm süzgeci: şans yalnız aylık sınırlı efsanevi denemesine bağlıdır; deneme sayısı parayla, takatla ya da tekrar
  üretimle artırılamaz; zar sunucuda tohumlu ve tekrar güvenlidir. Gerçek parayla şans artırılamaz, satın alınamaz.
- Her tılsımlı eşya tektir ve adlıdır; çıktığında beylik genelinde kroniğe ve söylentiye düşer, hanedan yadigârı olur.
- Sunucuda kaç tane çıktığı yönetici panelinde sayılır (beklenen: 1000 pirde ayda birkaç tane).
- **Oranlar (denge denetimi sonrası, 17 Kasım; `esya.ts` [PARAMETRE], sim testiyle kilitli):** efsanevi şansı =
  taban %10 + nadide eşiğinin üstündeki her puan için %0,5 (aşağı yuvarlanır), tavan **%20**; başarılı denemede
  tılsımlı **binde 15**. Ayda bir deneme ve deneme yalnız nadide çıkan işte harcandığından en iyi şansla 1000 pirde
  ayda ≈200 efsanevi, ≈3 tılsımlı ("birkaç"). Usta (pir değil) nadideye puanı yetse de %20 ikinci zarla ulaşır.
  Yüzde ve kalemleri oyuncuya dökümle döner (`sansDokumu`); zayıf/makul/güçlü bandı yalnız etikettir. Zar tohumu
  `ZAR_SIRRI` ortam sırrıyla HMAC'lidir (istemci önceden hesaplayamaz); hak sayacı göçle sıfırlanmaz.
