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
- **Kepenk (yokluk cezası yok):** raf ya da üretim emri boşsa ay dönümünde kepenk kendiliğinden iner: o ay bakım
  yazılmaz, iflas sayacı ilerlemez, itibar düşmez, faaliyet ayı sayılmaz. Mal konunca ya da emir verilince açılır.
  Elle "kapı" ayarı kalkar (ölü karar).
- **Yuva kıtlığı:** dükkân/atölye yuvaları artar — şehir 12/9, kasaba 6/4, köy 2/2 (talep paylaşıldığı için yuva
  sayısı akçe basmaz). Bütün yuvalar doluyken 12 aydır kepengi kapalı bir işletme için başka oyuncu **devralma**
  isteyebilir: eski sahibine edinim bedelinin tamamı, depo ve kasa iade edilir (kayıp yok), itibar ve seviye sıfırlanır.
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
  için aylık NPC bütçesi `B`: köy 12, kasaba 30, şehir 70 akçe [PARAMETRE]. O meslekte yerleşimde hiç oyuncu yoksa ×1,5
  (bugünkü kıtlık sinyali). Bütçe o ay rafta bulunan o meslek malları arasında eşit bölünür: `b_mal`.
- NPC, birim fiyatı `1,6 × taban × kalite çarpanı`nı aşan satırı almaz (NPC tavanı).
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
- Hanların pasif NPC geliri de paylaşılır: yerleşimin aylık **yolcu bütçesi** `Y` — kasaba 30, şehir 80 akçe; köyde
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
sayıları raporlar; yönetici seçer. Parametreler tek dosyada.

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
