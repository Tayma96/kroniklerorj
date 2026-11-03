# Faz 5 — Ekonomi ve meslek: uygulama planı

Kaynak: `docs/online/OYNANIS_TASARIMI.md` §3 (Yokken ne olur), §5, §11 (Faz 5), §13 (7, 8, 10, 11), §14.1–14.4.
Faz 2'nin `YerlesimMotoru`su ve `ayDonumu`, Faz 3'ün `teklif.ts` ve `duzen.ts` modülleri üzerine kurulur.

## Amaç
Oyuncu bir meslek edinir, çalışır, pazarda alır ve satar, lonca tahtasından ya da başka bir oyuncudan sipariş
alır. Her yerleşimde bir pazar ve bir **lonca tablosu** vardır. Bu tablo dolu ve boş meslekleri, kıt malları
ve hazır siparişleri gösterir. NPC zanaatkârlar zayıf ama kesintisiz bir taban tedarik sağlar: çırak ve kalfa
kalitesinde, sınırlı ve pahalı (§14.4.3). Boş bir meslek herkesin hissettiği bir kıtlık yaratır. Kıtlık da o
mesleğe giren için kazanç fırsatıdır (§14.4.5).

**Kabul:** yerleşimde hiç oyuncu yokken kasaba aç kalmaz.

## Mimari
Ekonomi, kasaba başına toplu tutulur: mal başına bir stok, bir talep ve bir baskı sayısı bulunur. NPC başına
envanter ya da kese tutulmaz. Hepsi Faz 2'deki gibi `YerlesimDO` içinde sırayla işlenir (§13.8). Fiyat, üretim,
tüketim ve ambar güvencesi `ayDonumu` içinde tek bir `ekonomiDonumu` çağrısıyla toplu çözülür. Al-sat ve
sipariş işlemleri `istekNo` ile anında ve idempotent işlenir.

İçerik ortak, motor ayrıdır. Mal tablosu ve fiyat biçimi tek oyunculudan **veri ve formül olarak kopyalanır**.
Kopyalanan parçalar `supplyDemandMult` (çarpan 0,65–1,6, +0,3 dış sızıntı), `cityGoodDemand` ve
`workshopOrderOffers`tur ("en kıt üç mal için sipariş"). `mobile/lib/game.ts` içe aktarılmaz.

## Genel kısıtlar
- **Tek oyunculuya dokunulmaz:** `mobile/lib/game.ts`, tek oyunculu kayıt ve çevrimdışı akış değişmez.
- **Eski protokol:** `server/**` ve `mobile/lib/mp/protocol.ts` değişmez. `server/src/protocol.ts` ile bu
  dosyanın bayt eşliği her committe `cmp` ile doğrulanır.
- **Yeni biçimler:** `online-server/src/tipler.ts` ile `mobile/lib/online/protokol.ts` aynı committe güncellenir.
  Yeni alanların hepsi opsiyoneldir. Alanı olmayan eski kasaba ve karakter kaydı yüklenir; ekonomi ilk ay
  dönümünde kasaba tohumundan kurulur.
- **Dizin kararlılığı:** `MESLEKLER` (`icerik/kisilik.ts`) dizinleri değişmez, `ISSIZ` yerinde kalır. Yeni
  meslekler (§14.2'deki kalın olanlar) yalnız sona eklenir. Faz 5 mevcut 10 meslekle tamamlanır.
- **Metinler:** oyuncunun gördüğü her metin 6 dilde yazılır: tr, en, es, pt, ar, ru
  (`mobile/lib/i18n-sayfa/online.ts`, hata kodları `mobile/lib/online/hata.ts`). AR ve RU metinleri cinsiyet
  nötrdür: ad ya da isim fiil kullanılır ("Sipariş teslim edildi").
- **Ücret ve P2W yok:** hiçbir mal, fiyat, sipariş, hız ya da stok gerçek parayla alınmaz. Mağaza ve reklam
  ödülü yoktur.
- **Farm yok:** kazanç takate, aylık tavana ve kasabanın sınırlı NPC alım bütçesine bağlıdır (G7).
- **Dağıtım elle yapılır:** yeni sunucu kendiliğinden dağıtılmaz (Faz 1 kuralı).

## Dosya yapısı
```
online-server/src/icerik/mal.ts            mal tablosu (veri): üretici meslek, taban fiyat, tüketim, bozulma, girdi
online-server/src/yerlesim/fiyat.ts        arz-talep çarpanı, yerel fiyat, al-sat makası, baskı sönmesi
online-server/src/yerlesim/tedarik.ts      NPC taban üretimi, tüketim, ambar güvencesi, ekonomiDonumu
online-server/src/yerlesim/pazar.ts        al/sat işlemi ve pazar görünümü
online-server/src/yerlesim/meslek.ts       meslek edinme, rütbe, çalışma (eylem türü "calis")
online-server/src/yerlesim/siparis.ts      lonca tahtası (NPC siparişi) + oyuncu sözleşmesi (Faz 3 teklif türü)
online-server/src/yerlesim/lonca.ts        lonca tablosu, doluluk, refah, kıtlık primi
online-server/src/yerlesim/koruma.ts       tavanlar ve işlem izinleri (farm koruması)
online-server/test/{fiyat,tedarik,pazar,meslek,siparis,lonca,ekonomi-sim}.test.ts
mobile/lib/online/ekonomi.ts               istemci çağrıları; sahte veri sahte.ts'e eklenir
mobile/app/online/{pazar,meslek,lonca}.tsx ekranlar
```

## Görevler

### G1. Veri ve tipler
- **Dosyalar:** `icerik/mal.ts`, `yerlesim/tipler.ts`, `src/tipler.ts`, `mobile/lib/online/protokol.ts`.
- **Arayüz:**
  - `type MalKodu = "bugday"|"ekmek"|"et"|"balik"|"yun"|"deri"|"demir"|"alet"|"silah"|"ilac"`
  - `interface MalTanimi { kod; uretici: number /*MESLEKLER*/; taban: number; tuketim: number /*kişi/ay*/;`
    `bozulma: number /*ay, 0=bozulmaz*/; gida?: 1; girdi?: Partial<Record<MalKodu, number>> }`
  - `interface Ekonomi { st; bs; tl: Record<MalKodu, number>; hz: number /*hazine*/; vb: number /*vakıf borcu*/;`
    `rf: number /*refah 0–100*/; sp: Siparis[]; ay: number }`
  - Opsiyonel `Kasaba.ek?: Ekonomi`.
  - Opsiyonel karakter alanları: `Karakter.ms?` (meslek), `mr?: 0|1|2|3` (çırak, kalfa, usta, pir), `md?`
    (son meslek değişimi ayı), `ca?` (çanta) ve `pk?: [ay, akce]` (pazar kazanç sayacı).
  - Bu adlar mevcut alanlarla çakışmaz: `en` ve `mk` zaten kullanılıyor.
- **Hizmet meslekleri** (müzisyen, asker; şifacının bir kısmı) mal üretmez. Sipariş ve ücretle kazanırlar.
- **Test:** `cd online-server && npx tsc --noEmit && node --test test/tedarik.test.ts`. Alanı olmayan eski
  kasaba yüklenir, `ek` ilk dönümde kurulur ve aynı tohumla iki kez kurulunca aynı çıkar.

### G2. Fiyat ve pazar
- **Dosyalar:** `fiyat.ts`, `pazar.ts`, `koruma.ts`; `motor.ts`e `pazar()` ve `pazarIslem()` yöntemleri eklenir.
- **Arayüz:**
  - `arzTalepCarpani(arz, talep): number` tek oyunculudaki biçimin kopyasıdır.
  - `yerelFiyat(k: Kasaba, mal, yon: "al"|"sat"): number`: alışta taban × çarpan × (1+makas), satışta
    × (1−makas).
  - `pazarIslem(k, kar, {tur, mal, adet, istekNo}, ay): Sonuc<{ akce, adet, fiyat }>`
- **Uçlar:**
  - `GET /v1/pazar`: fiyatlar, kaba stok aralığı ("bol / az / yok"), tahta ve lonca tablosu;
  - `POST /v1/pazar`.
- **Yeni hata kodları:** `stok_yok`, `tavan`, `fiyat_bandi`, `meslek_bekleme`. `HATA_DURUMU` ile 6 dildeki
  çevirileri birlikte eklenir.
- **Test:** `node --test test/fiyat.test.ts test/pazar.test.ts`. Beklenen sonuçlar:
  - çarpan [0,65; 1,6] aralığında kalır;
  - aynı ay içinde al-sat döngüsü zarar ettirir;
  - aynı `istekNo` iki kez işlenmez;
  - para yetmezse `para_yok`, stok yoksa `stok_yok` döner;
  - baskı ay dönümünde söner.

### G3. NPC taban tedariki ve açlık güvencesi (kabulün çekirdeği)
- **Dosyalar:** `tedarik.ts`; `donum.ts` içindeki `ayDonumu` sonunda bir satırlık `ekonomiDonumu` çağrısı.
- **Arayüz:**
  - `npcUretimi(k, ay, r: Zar)`: NPC meslek sahibi başına çırak/kalfa verimiyle sınırlı üretim. Usta ve pir
    malı üretilmez.
  - `tuketim(k, ay): { eksik }`: ağız sayısına göre gıda tüketimi, malların yıpranması ve bozulma.
  - `ambarGuvencesi(k, eksik): { alinan, maliyet }`:
    - temel gıda eksiği dışarıdan, kervan fiyatıyla (taban × 2–3) hazineden alınır;
    - hazine yetmezse vakıf borcu yazılır; borç kayıtlıdır, tavanı vardır ve sonraki vergilerle kapanır;
    - asgari tayın her koşulda karşılanır.
  - `ekonomiDonumu(k, ay, r): OlayTaslagi[]`: tüketimden sonra NPC alımı, vergi, baskı sönmesi, refah ve
    tahta yenilemesi.
- **Kural:** açlık ölüm üretmez (GDD §1). Kıtlığın etkileri refah, doğum, göç ve fiyattır. `olumOrani`
  değişmez.
- **Test:** `node --test test/tedarik.test.ts`. Hiç oyuncu olmayan bir kasaba 24 ay çalıştırılır. Beklenen:
  - her ay gıda karşılama ≥ %100 asgari tayın;
  - açlıktan ölüm 0;
  - vakıf borcu tavanı aşılmaz.

### G4. Meslek, rütbe ve çalışma
- **Dosyalar:** `meslek.ts`; `eylem.ts` tablosuna `calis` türü eklenir; uç `POST /v1/meslek {meslek, istekNo}`.
- **Arayüz:**
  - `meslekEdin(kar, meslek, ay): Sonuc<void>`: mevsimde bir kez meslek değiştirilebilir (`md`). Yeni
    meslekte rütbe bir basamak düşer. Ad `uret.ts`teki `meslekSec` ile çakışmasın diye farklıdır.
  - `rutbe(kar): 0|1|2|3`: ilgili beceriden (Zanaat, Ticaret, İlim) ve teslim edilen iş sayısından hesaplanır.
  - `calis(k, kar, ay, r): EylemSonucu`:
    - takat harcar ve rütbeye göre mal ya da hizmet üretir;
    - beceri kazancı mevcut `beceriEkle` aylık tavanından geçer;
    - zar dökümü Faz 2 eylemleriyle aynı biçimde döner.
- **Yokken:** Faz 3 `duzen.ts`teki "çalışma biçimi" ayarıyla oyuncu mesleğinde çalışmaya devam eder
  (§3 olağan düzen). Verim çevrimiçi çalışmanın altındadır.
- **Yaş kapısı:** meslek 13 yaşından sonra edinilir (§3). 12 yaşında yalnız çıraklık yapılır (`Karakter.us`).
- **Test:** `node --test test/meslek.test.ts`. Beklenen:
  - aynı mevsimde ikinci değişiklik `meslek_bekleme` döner;
  - takat bitince `takat_yok` döner;
  - rütbe beceriyle artar;
  - olağan düzen yokken üretir ama çevrimiçiden azını üretir.

### G5. Sipariş ve sözleşme
- **Dosyalar:** `siparis.ts`; `POST /v1/siparis {tur: "al"|"teslim", id, istekNo}` ucu; Faz 3 `teklif.ts`e
  `tur: "siparis"` eklenir.
- **Arayüz:**
  ```
  interface Siparis {
    id; veren: string /* "n12" ya da oyuncu */; alan?; mal; adet; ucret; emanet;
    sonAy; durum: "acik"|"alindi"|"teslim"|"dustu"
  }
  loncaTahtasi(k, ay): Siparis[]
  ```
  - **Lonca tahtası:** en kıt üç mal ve boş meslekler için NPC siparişi açılır ("Bu kasabada demirci yok").
    Ücret yerel fiyattan ve kıtlık priminden çıkar.
  - **Oyuncu sözleşmesi:**
    - ödeme Faz 3 emanetiyle peşin kilitlenir;
    - vade dolup teslim yapılmazsa emanet iade edilir;
    - teslim etmeyenin lonca güveni düşer ve tahtadan bir mevsim daha az iş alır;
    - para cezası yoktur.
- **Yasak:** kendine sipariş verilemez. Aynı cihazdaki hesaplar birbirine sipariş veremez (§13.7).
- **Test:** `node --test test/siparis.test.ts`. Beklenen:
  - teslimde ücret bir kez ödenir;
  - süre dolunca emanet iade edilir ve durum `dustu` olur;
  - bir başkasının siparişi teslim edilemez;
  - tahta aynı ay içinde değişmez.

### G6. Lonca tablosu, refah ve kıtlık primi
- **Dosyalar:** `lonca.ts`; `donus.ts`e ekonomi maddeleri eklenir (kıtlık, teslim edilen sipariş, fiyat sıçraması).
- **Arayüz:**
  - `loncaTablosu(k): { meslek, npc, oyuncu, dolu, prim }[]`
  - `refahHesapla(k): number`: boş meslekler refahı, nüfus artışını ve vergiyi düşürür (§14.4.4).
  - `kitlikPrimi(k, meslek): number`: boş ya da az dolu meslekte ücret ve fiyat yükselir.
- **Test:** `node --test test/lonca.test.ts`. Beklenen:
  - demircisiz kasabada alet fiyatı ve refah ölçülebilir biçimde düşer, prim > 1 olur;
  - o mesleğe giren bot oyuncunun aylık kazancı ortalamanın üstündedir (§14.4 kabulü).

### G7. Farm koruması ve ekonomi simülasyonu
- **Dosyalar:** `koruma.ts`, `test/ekonomi-sim.test.ts`. Mevcut `sim.test.ts`, `kasaba-yardimci.ts` kalıbıyla.
- **Kurallar `[PARAMETRE]`:**
  - NPC alım bütçesi kasaba başına aylık sabittir ve oyuncular arasında paylaşılır. Oyuncu sayısı arttıkça
    para musluğu büyümez.
  - Al-sat makası vardır ve oyuncu baskısı fiyatı iter.
  - Gıda bozulur; çanta tavanlıdır. İstifçilik kâr getirmez.
  - Oyuncular arası satış yerel fiyatın ±%30 bandında yapılır. Bandın dışındaki işlem `fiyat_bandi` döner ya
    da hediye sayılıp Faz 3 hediye tavanına girer.
  - Aylık pazar kazancı tavanlıdır (`pk`). Yeni hesabın ilk günlerinde satış tavanı düşüktür.
- **Para çevrimi (§13.11):**
  - giriş: NPC talebi, ücret ve hasat;
  - çıkış: vergi, bakım, tüketim ve ambar alımı;
  - vergi hazineye gider.
- **Test:** `node --test test/ekonomi-sim.test.ts`. Köy, kasaba ve şehir için 24 ay çalıştırılır. Beklenen:
  - al-sat botu, iki hesaplı pompa, istifçi ve meslek zıplayıcı, düz oynayan oyuncunun en çok %110'unu
    kazanır;
  - para arzındaki kayma aylık ±%5 içinde kalır;
  - ay dönümü süresi Faz 2 bütçesini aşmaz;
  - aynı tohum aynı sonucu verir.

### G8. İstemci
- **Dosyalar:** `mobile/lib/online/ekonomi.ts`, `sahte.ts`, `onizleme.ts`, `mobile/app/online/{pazar,meslek,lonca}.tsx`,
  `mobile/lib/i18n-sayfa/online.ts`. Dönüş Kartı'na ekonomi maddeleri eklenir.
- **Kapsam:**
  - pazar: fiyat ve stok aralığı, al/sat, sebebi yazılı fiyat ("demirci yok: alet pahalı");
  - meslek: seçim, rütbe ve bekleme süresi;
  - lonca: tablo ve tahta;
  - sipariş: ayrıntı ve teslim.
  - Kurallar ve varsayılanlar ekranda açıkça yazılı.
- **Test:**
  - `cd mobile && npx tsc --noEmit`;
  - `node scripts/_smoke/i18n-icon-check.cjs && node scripts/_smoke/dil-karisma.cjs`: eksik anahtar 0;
  - sahte veriyle 320 ve 390 px önizleme;
  - `git diff --stat -- lib/game.ts lib/mp/` boş.

## Kabul ölçütü
1. **Oyuncusuz kasaba:** köy, kasaba ve şehir, 0 oyuncuyla 24 ay (2 oyun yılı, 12 gerçek gün) işlenir.
   Beklenen:
   - açlıktan ölüm 0;
   - her ay asgari tayın karşılanır;
   - hazine ve vakıf borcu tavanı aşmaz;
   - fiyatlar sınır içinde kalır.
2. **Çiftçisiz varyant:** NPC çiftçiler işsiz yapılır. Kasaba yine aç kalmaz, ama:
   - ekmek fiyatı en az 1,5 kat artar;
   - refah düşer;
   - tahtada çiftçi siparişi açılır.
3. **§14.4 testi:** hiçbir meslek "fark edilmedi" sonucuyla geçmez. Boş mesleğe giren oyuncu ortalamanın
   üstünde kazanır.
4. **Farm koruması:** G7'deki botlar düz oyunun en çok %110'unu kazanır. Aynı `istekNo` iki kez işlenmez.
5. **Kayıt ve protokol:**
   - eski kayıt yüklenir;
   - `cmp server/src/protocol.ts mobile/lib/mp/protocol.ts` eşittir;
   - `online-server/src/tipler.ts` ile `mobile/lib/online/protokol.ts` aynı committedir;
   - `cd online-server && npm test` tamamen geçer.
6. **Kapalı test:** iki gerçek oyuncu birbirini beklemeden sipariş verir ve teslim eder. Cevapsız sözleşme
   cezasız düşer.

## Faz 1–3'e bağımlılık
- **Faz 1:**
  - hesap ve oturum (`hesap-do.ts`, `oturum.ts`);
  - profil ve yerleşim işaretçisi.
- **Faz 2 (kodda mevcut):**
  - `YerlesimMotoru` (`eylem`, `durum`, `yetistir`, `kaydet`), `ayDonumu`, olay defteri ve `donus.ts`;
  - `Karakter.pa/be/tk/ka/kb`, `takatHarca` ve `beceriEkle` (aylık tavan);
  - `MESLEKLER` / `MESLEK_AGIRLIGI`, `ayakIsi` ücreti ve `sim.test.ts` kalıbı.
- **Faz 3 (henüz kodda yok):** `teklif.ts` (emanet, son ay, varsayılan, idempotency), `duzen.ts` (çalışma
  biçimi), gelen kutusu, hediye tavanı ve çoklu hesap kuralı.
  - G1–G3, G6 ve G7'nin NPC kısmı yalnız Faz 2 üzerinde başlayabilir.
  - G4'ün olağan düzeni ve G5'in oyuncu sözleşmesi Faz 3 bitince yapılır.
- **Faz 4'e bağımlılık yok.** Faz 6'daki boykot (2. basamak) G5 tahtasının "satış ve sipariş düşer" kancasını
  kullanacak. Kanca burada yalnız arayüz olarak bırakılır.

## Riskler
- **Para dengesi:** musluk ve lavabo dengesizliği enflasyon ya da kuraklık yaratabilir. G7'de para arzı
  izlenir. NPC alım bütçesi sabit havuzdur.
- **Taban ayarı:**
  - taban fazla güçlüyse oyuncu mesleği anlamsızlaşır;
  - fazla zayıfsa kasaba aç kalır.
  - Ambar güvencesi açlığı keser ama kıtlığı fiyata yansıtır. Oranlar `[PARAMETRE]`dir ve kapalı testte
    ayarlanır.
- **Faz 3 gecikmesi:** sözleşme ve olağan düzen Faz 3'e bağlıdır. Plan bu yüzden iki dalgada ilerler.
- **İçerik ayrışması:** kopyalanan fiyat formülü tek oyunculudan zamanla kayabilir. Testte aynı girdiye aynı
  çarpan verildiği sabitlenir.
- **Ay dönümü maliyeti ve kayıt boyutu:** ekonomi mal başına toplu tutulur, NPC başına envanter yoktur. Süre
  `sim.test.ts` bütçesiyle ölçülür.
- **Dizin kayması:** `MESLEKLER` sırası değişirse kayıtlı NPC meslekleri bozulur. Yalnız sona ekleme yapılır
  ve bunun için bir test eklenir.
