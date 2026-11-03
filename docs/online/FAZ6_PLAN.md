# Faz 6 — Çatışma ve adalet: uygulama planı

Kaynak: `docs/online/OYNANIS_TASARIMI.md` §6.0 (açık/gizli husumet), §6.3 (şahitlik), §7 (merdiven, ölüm,
kanıt ve kadı), §11 (Faz 6), §13 (1, 2, 3, 5, 10, 12). Faz 2'nin `YerlesimDO`'su ve Faz 3'ün teklif, husumet,
söylenti ve olağan düzen modülleri üzerine kurulur. Sunucu otomatik dağıtılmaz; dağıtımı Berkay elle yapar.

## Amaç
Oyuncular birbirine laftan suikaste kadar zarar verebilir. Her basamak bir öncekinden pahalıdır, daha çok iz
bırakır ve daha ağır cezalıdır. Kimse habersiz ölmez: çevrimdışı hedef önce işaret alır, ev halkı onu
savunur. İşlenen ağır suç kadının önüne gelir. Kanıtlanırsa ceza ağırdır ve kurbanın yakınları kan davası açar.

## Oyuncu deneyimi (kabul)
- Ahmet, Berkay'a suikast hazırlar. Hazırlık en az 2 mevsim (6 ay, 72 saat) sürer. Berkay o sürede oyuna
  girmese de Dönüş Kartı'nda "evinin çevresinde yabancılar görüldü" işaretini görür. Ev halkı tetikte olur.
- Girişim başarılı olursa soruşturma açılır. İki bağımsız şahit ya da itiraf varsa kadı idama hükmeder.
  Altında kalan kanıtta ceza sürgün ya da diyettir. Ahmet'in hanedanına "kanlı" lekesi vurulur, Berkay'ın
  ailesi ve dost NPC'leri kan davası açar.
- Kanıt yetersizse dava düşer ama söylenti kalır. Sebep dökümü her iki tarafa da gerekçeli gösterilir.

## Mimari
Çatışma, yerleşimin tek sahibi `YerlesimDO` içinde yeni bir `catisma/` motor katmanıdır. Eylemler sırayla
ve anında çözülür (§13.8). Suikast hazırlığı, soruşturma ve kan davası ise ay dönümünde ilerler. Bütün
sonuçlar olay defterine (`Olay`) ve görüş dökümüne (`Kalem`) yazılır; yeni bir "puan" icat edilmez. Zarlar
`yerlesim/rastgele.ts` `tohumlu(...)` ile üretilir (`Math.random` yok), böylece testler tekrarlanabilir.

## Genel kısıtlar
- **Tek oyunculu ve eski MP dokunulmaz:** `mobile/lib/game.ts`, `server/**`, `mobile/lib/mp/**` değişmez.
  `server/src/protocol.ts` ile `mobile/lib/mp/protocol.ts` bayt bayt eş kalır (`cmp` çıktısı boş). Tek
  oyunculudaki kan davası kuralları veri olarak kopyalanır, kod içe aktarılmaz.
- **Yeni protokol eşliği:** `online-server/src/tipler.ts` ile `mobile/lib/online/protokol.ts` aynı commit'te
  güncellenir.
- **Yeni alanlar opsiyonel:** `Karakter`, `Kasaba` ve ileti biçimlerine eklenen her alan `?` ile tanımlanır.
  Eski kayıtta alan yoksa "boş" (çatışma yok, leke yok) sayılır; göç betiği gerekmez.
- **Oyuncu metni 6 dilde:** tr/en/es/pt/ar/ru, `mobile/lib/i18n-sayfa/online.ts`. AR ve RU metinleri
  cinsiyet nötr yazılır (fiil ve sıfat çekimi gerektirmeyen yapılar). Sunucu yalnız anahtar ve parametre
  gönderir.
- **Ücret yok:** ceza, diyet ve bedeller oyun içi akçe ve takattir. Gerçek para, reklam ya da ücretli servis yok.
- **Çevrimdışı oyuncu koruması:** ölüm ve ağır zarar, hedefe görünür bir işaret ile en az 48 gerçek saatlik
  bir bekleme olmadan uygulanamaz. NPC'nin çevrimdışı oyuncuya verdiği zarar 1-2. basamakla sınırlıdır (§13.10).

## Dosya yapısı
```
online-server/src/catisma/
  tipler.ts     Iz, Isaret, Tertip, Dava, Kanit, KanDavasi, Ceza tipleri
  merdiven.ts   7 basamak tablosu, bedeller, korumalar, taciz sınırı
  iz.ts         tanık modeli, iz ve işaret üretimi, güven sönmesi
  savunma.ts    dikkat derecesi, olağan düzen savunması, şans dökümü
  tertip.ts     suikast hazırlığı, 48 saat kuralı, uygulama
  kadi.ts       soruşturma, kanıt eşikleri, hüküm
  ceza.ts       ceza uygulama, sicil, leke
  kan.ts        kan davası açılışı, sönmesi
online-server/src/yerlesim/motor.ts      çatışma çağrıları, ay dönümü adımı
online-server/src/yerlesim-do.ts, index.ts, tipler.ts   uçlar ve iletiler
online-server/test/catisma-*.test.ts
mobile/lib/online/protokol.ts, istemci.ts, i18n-sayfa/online.ts
```
Depo anahtarları ayrıdır (`c:tertip:*`, `c:dava:*`, `c:kan:*`, `c:iz:*`); yoksa boş sayılır.

## Görevler

### 6a. Merdiven ve korumalar (`catisma/tipler.ts`, `catisma/merdiven.ts`)
- `BASAMAKLAR: Readonly<Record<1|2|3|4|5|6|7, { takat: number; para: number; iz: IzTuru[]; ceza: CezaTuru[] }>>`
- `basamakKapisi(k: Kasaba, fail: Karakter, hedef: Karakter, b: Basamak, ay: number, simdi: number): HataKodu | undefined`
- Kapı sırası:
  - Kendine eylem yasak.
  - Engelleme (Faz 3) yalnız sohbeti ve teklifi kapatır; dava açmayı kapatmaz.
  - 5-7. basamaklar şu hedeflere kapalıdır: kasabadaki ilk 7 günü dolmamış, 16 yaş altı, 65 yaş üstü, inzivada.
    İnziva: 7 gündür girmedi ve hazırlık bundan önce başlamadı.
  - Taciz sınırı: iki kişi arasında mevsim başına en çok 2 düşmanca eylem. Aynı türün tekrarında
    `getiriCarpani`.
  - Barış yemini ve kadının men kararı yürürlükteyse eylem kapalıdır.
- Basamak 1 (laf) Faz 3 `soylenti.ts`'e kaynak kimliği ekler.
- Basamak 2 (boykot) ve 5 (baskın) ekonomik etkisini Faz 5 modülünden alır. Faz 5 bitene dek bu iki
  basamak `ACIK_BASAMAKLAR` bayrağıyla kapalı kalır.
- Opsiyonel `Karakter` alanları:
  - `sg?` son giriş (ms);
  - `yr?` yara `[agirlik, iyilesmeAyi]`;
  - `ol?` ölüm ayı;
  - `lk?` leke bitleri;
  - `sc?` sicil;
  - `hp?` hapis bitiş ayı.
- Test: `cd online-server && node --test test/catisma-merdiven.test.ts`. Beklenen `# fail 0`. Kapsam:
  - 15 yaş hedefe darp `HEDEF_KORUMALI` döner.
  - Aynı mevsimde 3. düşmanca eylem `TACIZ_TAVANI` döner.
  - 8 gündür girmeyen hedefe yeni tertip `INZIVA` döner.

### 6b. İz, tanık ve işaret (`catisma/iz.ts`)
- `tanikBul(k: Kasaba, mekan: string, ay: number): string[]`: aynı ay aynı mekândaki NPC'ler
  (`cizelge.ts npcMekani`) ve sakinler (`Sakin.mk/ma`).
- `izBirak(k, fail, hedef, tur: IzTuru, guven: number, ay): Iz`
- `isaretYaz(k, tertip, adim, ay): OlayTaslagi[]`: olay hedefe görünür (`g = hedef`) ve önemi en az 8'dir;
  Dönüş Kartı'nda öncelik alır. Dost ağından gelen işaretler "kaynaklı bilgi" kalemiyle yazılır.
- Güven her ay söner; yalanlanan söylenti biter. Aynı haneden (`e`) ya da aralarında ittifak sözü olan iki
  kaynak tek kaynak sayılır (`bagimsizAnahtar`).
- Test: `test/catisma-iz.test.ts`. Kapsam:
  - Keşif adımı hedefe görünür bir işaret yazar.
  - Aynı hanenin iki tanığı tek bağımsız kaynak sayılır.
  - 6 ay sonra güven düşer.

### 6c. Savunma ve olağan düzen (`catisma/savunma.ts`)
- `dikkat(kar: Karakter, duzen: Duzen, k: Kasaba, ay: number): { derece: "dikkatsiz" | "olagan" | "tetikte"; dokum: Dokum }`
- Dikkatsiz sayan işaretler:
  - aynı mekânda tekrar;
  - gece `han`;
  - muhafız yok;
  - görülen işaretin yok sayılması.
- Tetikte sayan işaretler:
  - muhafız;
  - kilit;
  - yemeği tattırmak;
  - yol değiştirmek;
  - dostlarla gezmek.
- Faz 3'ün `/v1/duzen` gövdesine opsiyonel `savunma` alanı eklenir; yeni uç açılmaz.
- `suikastSansi(...)`:
  - taban %30;
  - dikkatsiz ×1,5 (en çok %45);
  - tetikte ×1/3;
  - ilk işaretten beri girmemişse ev halkı tetikte olur (×0,5);
  - Sezgi ve "Göz" dalının etkisi döküme kalem olarak eklenir.
- Test: `test/catisma-savunma.test.ts`. Kapsam:
  - Döküm sırasıyla 30, 45 ve 10 verir.
  - Çevrimdışı hedefte toplam yarıya iner.
  - Kalemlerin toplamı eşittir.

### 6d. Suikast hazırlığı (`catisma/tertip.ts`)
- `tertipBaslat(fail, hedef, ay, simdi)`
- `tertipAdim(t: Tertip, adim: "kesif" | "ortak" | "arac", ...)`
- `tertipUygula(t, simdi): Sonuc<"olum" | "yara" | "basarisiz">`
- Kurallar:
  - En az 6 ay hazırlık gerekir.
  - İlk işaretten sonra en az 48 gerçek saat geçmelidir.
  - Aynı hedefe yılda (12 ay) bir girişim yapılabilir.
  - Hedef inzivaya geçse de önceden başlamış hazırlık sürer.
  - Başarısız girişim çoğunlukla fail için yara ve büyük iz bırakır.
  - Kendini öldürmek yoktur.
- Düello (basamak 6) Faz 3 teklifinin yeni türüdür (`duello`), cevapsız kalırsa cezasız düşer. Ölümüne
  düello için iki tarafın da kabulü, ikisinin de 20 yaşını geçmiş olması ve yılda en çok bir kez gerekir.
- Test: `test/catisma-tertip.test.ts`. Kapsam:
  - 5. ayda uygulama `HAZIRLIK_SURUYOR` döner.
  - İşaretten 47 saat sonra uygulama reddedilir.
  - Aynı yıl ikinci tertip `YILLIK_TAVAN` döner.
  - Ölümüne düello daveti 19 yaşa reddedilir.

### 6e. Kadı ve ceza (`catisma/kadi.ts`, `catisma/ceza.ts`)
- `davaAc(k, tur: "alacak" | "mulk" | "hakaret" | "iftira" | "darp" | "baskin" | "katl", davaci, sanik, ay): Dava`
- Ağır suçta soruşturma kendiliğinden açılır.
- `beyanEkle(dava, kaynak, kanit: Kanit)`: tanık, itiraf, iz, söylenti; her kanıtın bir güveni vardır.
- `hukum(dava): { karar: "beraat" | "dustu" | "mahkum"; ceza: Ceza[]; dokum: Dokum }`
- Hüküm kuralları:
  - Mahkûmiyet için güven eşiği ve en az 2 bağımsız kaynak gerekir.
  - İdam için itiraf ya da 2 bağımsız şahit aranır. Bu şart sağlanmazsa ceza sürgün ya da diyettir.
  - Yalancı şahitlik yakalanırsa şahit davadaki cezayı kendisi çeker.
  - Tekrarlanan davalarda men kararı verilir.
- Kadı bir NPC'dir. `Kasaba.kd?` alanı boşsa ilk ay dönümünde yetişkin bir NPC atanır. `MESLEKLER`'de kadı
  yoktur; bu bir görevdir.
- `cezaUygula(k, kar, ceza)`:
  - para cezası, tazminat;
  - sicil;
  - hapis (eylemler kapalı);
  - sürgün (yerleşimden çıkış, Faz 1 varış akışına dönüş);
  - diyet;
  - idam (`ol`);
  - "kanlı" lekesi (`lk`).
- Faz 7 gelene dek idam edilen oyuncu varış akışıyla yeni bir karakter açar. Vâris devri, katilin mirasçı
  olamaması ve %10 veraset vergisi Faz 7'de bağlanır; Faz 6 yalnız `ol` ve `lk` bayraklarını yazar.
- Uçlar:
  - `POST /v1/catisma` (basamak 1, 2, 4, 5);
  - `POST /v1/tertip`;
  - `POST /v1/dava`;
  - `POST /v1/dava/:id/beyan`;
  - `GET /v1/dava/:id`.
  Hepsi `istekNo` ile idempotenttir.
- Test: `test/catisma-kadi.test.ts`. Kapsam:
  - Tek tanıkta karar `dustu` olur.
  - Farklı hanelerden 2 tanıkta karar `mahkum` ve ceza idamdır.
  - Yalnız iz ve söylenti varsa ceza sürgün ya da diyettir.
  - Yalancı şahit cezayı üstlenir.
  - Aynı `istekNo` ikinci kez aynı yanıtı döner.

### 6f. Kan davası (`catisma/kan.ts`)
- `kanAc(k, kurban, katil, ay)`: kurbanın ailesi (`an`, `ba`, `es`, kardeşler) ve dost bağlı NPC'leri görüşe
  "kan" anısı ve kayıt alır. Oyuncu dostlarına ise yalnız öneri gider.
- Sönme yolları:
  - Faz 3 teklifinin `diyet` türü kabul edilir;
  - helallik;
  - 24 ay (2 oyun yılı) olaysız geçer.
- 16 yaş altı hiçbir zaman hedef olamaz. Kan davası içindeki ölüm de soruşturulur.
- Test: `test/catisma-kan.test.ts`. Kapsam:
  - Kurbanın annesinin görüşüne "kan" kalemi düşer.
  - Diyet kabulünde kayıt kapanır.
  - Olaysız 24 aydan sonra kayıt kapanır.

### 6g. İstemci ve dil (`mobile/lib/online/`)
- `protokol.ts` aynalanır. `istemci.ts` şu çağrıları alır:
  - `catisma`;
  - `tertip`;
  - `dava`;
  - `beyan`;
  - `davaGetir`.
- Profil ve Dönüş Kartı ekranlarına basamak menüsü eklenir. Menü kapalı basamağı gerekçesiyle gösterir.
- Dava dosyası, kanıt dökümüyle birlikte gösterilir.
- Yeni anahtarlar `online.catisma.*` ve `olay.catisma.*` 6 dilde yazılır.
- Test: `mobile/scripts/_smoke/catisma-i18n-check.cjs` 6 dilde anahtar eşliğini, boş metni ve AR/RU'da
  cinsiyetli kalıp listesini denetler. Beklenen `OK`. Ek kontrol: `cd mobile && npx tsc --noEmit`.

### 6h. Simülasyon ve inceleme
`test/catisma-sim.test.ts` 1000 tohumla bir kasaba çalıştırır. Bir kesimde hedefler hiç girmez, bir kesimde
düzenli girer. Beklenen ihlal sayıları:
- işaretsiz ya da 48 saatten kısa sürede ölüm: 0;
- mahkûm katil için ceza ya da lekenin eksik olması: 0;
- NPC'nin çevrimdışı oyuncuya 2. basamağın üstünde zarar vermesi: 0.

Ayrıca başarılı suikast oranı %15'i geçmemelidir. Güvenlik incelemesi şu noktaları sınar:
- sahte `hedef`;
- başkasının davasına beyan;
- engellenenin dava spamı.

## Kabul ölçütü
1. **Çevrimdışı hedef işaret almadan ölmez.** Simülasyonda her ölümden en az 48 saat önce hedefe görünür bir
   işaret yazılmıştır. Hedef o arada girmediyse dökümde "ev halkı tetikte ×0,5" kalemi vardır.
2. **Kanıtlı katil ağır bedel öder.** Her mahkûmiyette şunlar uygulanır:
   - idam, sürgün ya da diyetten biri;
   - "kanlı" lekesi;
   - açık bir kan davası.
3. Komutların hepsi temiz biter:
   - `cd online-server && npm run typecheck && npm test` → `# fail 0`;
   - `cmp server/src/protocol.ts mobile/lib/mp/protocol.ts` → çıktı yok;
   - `git diff --stat -- mobile/lib/game.ts server mobile/lib/mp` → boş.

## Bağımlılık
- **Faz 1:** hesap ve `HesapDO` yerleşim işaretçisi (sürgün ve idam sonrası varış).
- **Faz 2:** `YerlesimDO` ve `YerlesimMotoru`, olay defteri ve Dönüş Kartı, görüş ve `Dokum`, `takatHarca`,
  mekân çizelgesi (tanık), `tohumlu` zar, ay dönümü. Hepsi kodda mevcuttur.
- **Faz 3 (kodda henüz yok, önce bitmeli):**
  - `teklif.ts` (düello ve diyet teklif türleri);
  - `iliski.ts` (açık ya da gizli husumet);
  - `soylenti.ts` (laf, kaynak, yalanlama);
  - `duzen.ts` (olağan düzen);
  - engelleme ve şikâyet.
- **Yumuşak bağımlılıklar:**
  - Faz 4: ittifak sözü (suç ortağı, bağımsızlık), şahitlik, barış yemini. Yoksa bu kalemler boş kalır.
  - Faz 5: boykot ve baskının ekonomik etkisi. Gelene dek bayrakla kapalı.
  - Faz 7: vâris ve veraset.

## Riskler (taciz ve kötüye kullanım)
- **Yeni ya da zayıf oyuncu avı.** İlk 7 gün ve yaş korumaları, mevsim başına 2 eylem sınırı ve azalan getiri
  bunu sınırlar. Ayrıca açık husumete düşen nam bedeli hafiftir, gizli hamlenin bedeli ağırdır.
- **Çevrimdışı oyuncuyu öldürme.** 48 saat kuralı, ev halkının tetikte olması, inziva ve yılda bir girişim
  sınırı bunu önler. Simülasyon ihlal sayısı 0 olmalıdır.
- **Sahte tanık ve yalancı şahit çiftliği** (çoklu hesap ya da anlaşmalı oyuncular):
  - Aynı haneden ya da ittifak sözü olan kaynaklar tek kaynak sayılır.
  - "Dostunun dostu" kalemi ancak 4 mevsimlik bağda sayılır.
  - Yalancı şahit cezayı kendisi çeker.
- **Anlaşmalı darp** (birine kendini dövdürüp tazminat almak). Tazminat, hedefin gerçek kaybıyla
  sınırlıdır ve iki tarafa da sicil yazılır.
- **Dava ve işaret spamı.** Men kararı ve takat bedeli bunu sınırlar. İşaretler yalnız gerçek bir hazırlık
  adımından doğar; korkutma amaçlı sahte işaret üretilemez.
- **Düelloyla cezasız öldürme.** Ölümüne düello iki tarafın rızasını, 20 yaş sınırını ve yılda bir sınırını
  ister. Kabul en erken bir sonraki ay dönümünde uygulanır.
- **Sonsuz kan davası zinciri.** Diyet, helallik ve 24 ay sönmesi zinciri kırar; kan davası içindeki ölüm de
  soruşturulur.
- **Sürgünle oyundan atma.** Sürgün süreli olur `[PARAMETRE]`. Oyuncu başka yerleşimde devam eder; hesap
  silinmez.
- **NPC'yi vekil olarak kullanma.** NPC'nin verebileceği zarar 1-2. basamakla sınırlı ve tavanlıdır. Mülke
  zarar için önce görünür bir tehdit ve bir mevsim bekleme gerekir.

## Açık parametreler (Berkay)
Kapalı testte ayarlanacak değerler:
- basamak bedelleri;
- kanıt güven eşiği;
- ceza ve diyet tutarları;
- hapis ve sürgün süreleri;
- yara iyileşmesi.

İdamın Faz 7'den önce "yeni karakter" ile kapanması onay ister.
