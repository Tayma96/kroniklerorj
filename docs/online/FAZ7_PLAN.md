> Not: Bu plan ajan kotası bittiği için yarıda kesilmiş olabilir; kullanmadan önce sonunu kontrol et.

# Faz 7 — Hanedan ve zaman: uygulama planı

Kaynak: `docs/online/OYNANIS_TASARIMI.md` §3 (zaman, yaş tablosu, ay dönümü), §8 (hanedan, vasiyet, ölüm),
§11 (Faz 7 satırı). Faz 1–3'ün `online-server/` + `mobile/lib/online/` + `mobile/app/online/` yapısı
üzerine kurulur.

## Amaç
Oyuncu karakteri ortak takvimle yaşlanır. 16 yaşından sonra evlenir. Çocukları kasabada NPC olarak doğup
büyür. 60'tan sonra yaşlılık başlar, karakter ölür ve hesap bir vârisle sürer. Mal, nam, borç ve husumet
vârise geçer. Vasiyet dağılımı belirler ve yerleşimin kroniğine satır yazılır. Vâris yoksa uzak bir akraba
gelir, hanedan sönmez.

**Kabul:** bir hanedan 3 kuşak simüle edilir ve devir kusursuz olur:
- para korunur;
- sarkan kimlik kalmaz;
- devir tek kez yapılır;
- önizleme ile devir aynı sonucu verir.

## Mimari
Hanedan durumu `YerlesimDO`'da durur. Kurallar `online-server/src/yerlesim/` altında saf ve tohumlu
fonksiyonlardır (`Math.random` yok). Yaşlanma ve ölüm `donum.ts`'in "oyuncular" adımında işlenir. Devir tek
bir saf `devirHesapla()` ile planlanır. Önizleme ucu da devir ucu da yalnız bu planı kullanır. Devir ucu,
önizlemenin plan karması tutmazsa reddeder. `HesapDO` yalnız profilin etkin karakter işaretçisini günceller.

## Genel kısıtlar
- **Tek oyunculuya dokunulmaz.** `mobile/lib/game.ts`, `app/oyun/nesil.tsx` ve `lib/store.tsx` değişmez.
  - `heirPreview(prev, heirRef, willId, soyYetenek, lastWordsId)` ile
    `continueAsHeir(prev, willId, heirName, lastWordsId, soyYetenek)` yalnız kural kaynağı olarak okunur
    (vasiyet tarzı, soy yeteneği, son söz). İçe aktarılmaz.
  - Gereken içerik `online-server/src/icerik/` altına veri olarak kopyalanır (Faz 2 ilkesi).
- **Eski çok oyunculu protokol:** `mobile/lib/mp/protocol.ts` ↔ `server/src/protocol.ts` bayt bayt eş
  kalır. Faz 7 bu iki dosyaya ve `server/**`'e dokunmaz. Zorunlu bir değişiklik olursa ikisi aynı commit'te
  değişir. Denetim: `cmp server/src/protocol.ts mobile/lib/mp/protocol.ts` çıktı vermez ve 0 ile çıkar.
- **Çevrimiçi protokol:** `mobile/lib/online/protokol.ts`, `online-server/src/tipler.ts` biçimlerinin
  aynasıdır. İkisi aynı commit'te güncellenir.
- **Yeni alanlar opsiyonel.** Faz 2/3 kaydı göçsüz yüklenir; eksik alan varsayılan sayılır. Eski istemci
  yeni alanı yok sayar.
- **Oyuncu metni 6 dilde:** tr/en/es/pt/ar/ru, `i18n-sayfa/online.ts` dizi biçiminde.
  - AR ve RU cinsiyet nötr yazılır: ad cümlesi ya da "Ölüm: {kisi}" kalıbı kullanılır, cinsiyetli geçmiş
    zaman fiili kullanılmaz.
  - Vâris kadın da erkek de olabilir.
- **Ücret yok.** Veraset vergisi oyun içi akçedir. Gerçek para, satın alma ve ücretli servis yok.
  Cloudflare ücretsiz katmanı yeter.
- **Önizleme = devir:** istemci hiçbir devir sayısını kendisi hesaplamaz. Yalnız sunucunun planını gösterir.

## Dosya yapısı
```
online-server/src/yerlesim/
  hanedan.ts    soy, hanedan kimliği, akrabalık, vâris adayları
  evlilik.ts    evlilik kapısı/kaydı, oyuncu hanesinde doğum
  yaslilik.ts   ölüm ayı, son günler, yaşlılık etkisi
  vasiyet.ts    vasiyet doğrulama, eşit bölüşüm
  devir.ts      devirHesapla, planKarmasi, devirUygula, uzak akraba
  kronik.ts     kalıcı yerleşim kroniği (sayfalı)
  tipler.ts     (+opsiyonel alanlar)   donum.ts (+oyuncu adımları)   motor.ts (+uçlar)
online-server/src/{tipler.ts,index.ts,hesap-do.ts}   (+ileti, uç, profil işaretçisi)
online-server/test/{hanedan,evlilik,yaslilik,devir,kronik,hanedan-sim}.test.ts
mobile/lib/online/{protokol.ts,istemci.ts,sahte.ts}  mobile/lib/online/hanedan.ts
mobile/app/online/{hanedan.tsx,devir.tsx}            mobile/lib/i18n-sayfa/online.ts (+anahtarlar)
```

## Görevler

### 7a. Veri modeli ve hanedan çekirdeği
- **Dosyalar:** `yerlesim/tipler.ts`, `tipler.ts`, `yerlesim/hanedan.ts`.
- **Arayüz:**
  - `Karakter`'e opsiyonel alanlar eklenir:
    - `hn?` hanedan kimliği, `ns?` nesil (yoksa 1);
    - `es?` eş kimliği (`n12`/`o3`), `ea?` evlilik ayı, `co?: number[]` çocuk NPC'ler;
    - `oa?` ölüm ayı, `sg?` son günler ayı, `vs?: Vasiyet`.
  - `Npc.oe?: string[]`: oyuncu ebeveyn kimlikleri.
  - `Kasaba.hz?`: hazine akçesi.
  - `Kasaba.tereke?: Tereke[]`: devri bekleyen ölüler.
  - `Profil.nesil?`.
  - `hanedanKimligi(kar): string` ilk atadan sabittir.
  - `akrabalar(kasaba, kar)` ve `varisAdaylari(kasaba, oluO, ay): Aday[]` yazılır. Adaylar yaş, sıra ve
    uygunlukla gelir. Uygun aday 12+ yaşta ve canlıdır. 12 yaş altı çocuk listede görünür ama seçilemez.
- **Test:** `node --test test/hanedan.test.ts`. Beklenen çıktı `# fail 0`:
  - Faz 2 karakteri alansız yüklenir ve `ns` 1 sayılır;
  - aday sırası aynı tohumla aynıdır: önce çocuklar (büyükten küçüğe), sonra 16+ kardeş ve yeğen.

### 7b. Evlilik ve doğum
- **Dosyalar:** `yerlesim/evlilik.ts`, `uret.ts`, `donum.ts`, Faz 3 `teklif.ts` (yeni tür `evlilik`).
- **Arayüz:**
  - `evlilikKapisi(kasaba, a, b, ay): HataKodu | undefined`. Koşullar: 16+, ikisi de bekâr, ikisi de
    canlı, akraba değil. Diğer koşullar tek oyunculudaki kurallar gibidir.
  - `evlilikKaydet(kasaba, a, b, ay)`.
  - `oyuncuCocuguDogur(kasaba, ebeveynler, ay, r): Npc`. Ebeveynlerden biri ya da ikisi oyuncu olabilir.
  - Oyuncu–oyuncu evliliği Faz 3 teklifi ile kurulur ve iki tarafın kabulünü ister. NPC ile evlilik Faz 3
    dünürcü teklifinin kabulüyle kurulur.
  - Eş ölünce dul kalınır ve yeniden evlenmek serbesttir. Boşanma kapsam dışıdır (açık karar).
- **Test:** `node --test test/evlilik.test.ts` → `# fail 0`:
  - 15 yaşında evlilik `YAS` hatası verir;
  - evliye ikinci evlilik `EVLI` hatası verir;
  - aynı teklif kabulü iki kez işlenmez;
  - evli oyuncu hanesinde 120 ayda en az 1 doğum olur ve çocuk `co`'ya, `oe` NPC'ye yazılır.

### 7c. Yaşlılık ve ölüm
- **Dosyalar:** `yerlesim/yaslilik.ts`, `donum.ts`, `eylem.ts`, `tipler.ts` (`HATA_DURUMU.OLU`).
- **Arayüz:**
  - `olumAyiBelirle(kar, ay)`: 60. yaş dönümünde `tohumlu("olum", hn, o)` ile gizli ölüm ayı seçilir.
    Ortalama ~70, tavan 80 `[PARAMETRE]`.
  - `yaslilikEtkisi(yas)`: 60+ takat düşer (6→5, 70+ 4), beden özelliği yavaşça azalır.
  - Ölümden 6 ay önce `olay.sonGunler` yazılır. Dönüş Kartı vasiyet ve vâris hatırlatması verir.
  - Ölüm ayında `oa` yazılır, `Tereke` emanete alınır ve `olay.oyuncuOldu` üretilir.
  - Ölü karakterin her eylemi `OLU` hatası verir.
  - 60 yaşından önce doğal ölüm yoktur. Şiddetli ölüm Faz 6'nın kuralıdır.
- **Test:** `node --test test/yaslilik.test.ts` → `# fail 0`:
  - ölüm ayı aynı tohumla sabittir ve 60–80 arasındadır;
  - son günler olayı ölümden tam 6 ay öncedir;
  - ölüye `eylemYap` → `OLU`.

### 7d. Vasiyet ve saf devir hesabı (çekirdek)
- **Dosyalar:** `yerlesim/vasiyet.ts`, `yerlesim/devir.ts`.
- **Arayüz:**
  - `Vasiyet = { varis?: string; paylar?: { kime: string | "vakif"; oran: number }[] }`. Oranlar
    tamsayıdır ve toplamı 100 olur. Alıcı yalnız eş, akraba ya da vakıf olabilir.
  - `vasiyetDogrula(kasaba, kar, govde): Sonuc<Vasiyet>`.
  - `devirHesapla(kasaba, oluO, varisKimligi, ay): DevirPlani`. Planda şunlar vardır:
    - kalemler: para payları, %10 vergi, nam devri (`NAM_DEVIR_ORANI` `[PARAMETRE]`), borç ve husumet
      taşıma (Faz 3 kayıtları);
    - küsme anıları: payı ortalamanın altında kalan evlada eksi anı;
    - kronik satırı.
  - Vasiyet yoksa mal eşit bölünür: canlı eş ve çocuklar arasında, yoksa vârise.
  - Yuvarlama artığı vârise kalır.
  - `planKarmasi(plan): string` = `karma(JSON)`.
  - `devirUygula(kasaba, plan): void` planı aynen yazar. Kendi hesabı yoktur.
  - Mülk (Faz 5) ve kan davası (Faz 6) kalemleri `DevirKalemi` birliğine sonradan eklenecek biçimde açık
    bırakılır.
- **Test:** `node --test test/devir.test.ts` → `# fail 0`:
  - korunum geçer: Σ alınan + vergi = tereke;
  - eşit bölüşümde 101 akçe 3 kişiye 30/30/31 ve vergi 10 olarak dağılır;
  - borç ve husumet vârise geçer, ölüye bağlı kayıt kalmaz;
  - `devirUygula(devirHesapla(...))` sonrası durum, planın öngördüğüyle alan alan eşittir;
  - aynı plan ikinci kez uygulanmaz.

### 7e. Devir akışı, uzak akraba, kronik ve uçlar
- **Dosyalar:** `yerlesim/motor.ts`, `yerlesim/kronik.ts`, `yerlesim/devir.ts`, `index.ts`, `hesap-do.ts`,
  `tipler.ts` (`HesapIleti`/`YerlesimIleti`).
- **Uçlar:**
  - `GET /v1/hanedan`: soy ağacı, adaylar, vasiyet;
  - `POST /v1/vasiyet {vasiyet, istekNo}`;
  - `GET /v1/devir/onizle?varis=`: `{plan, pk}`;
  - `POST /v1/devir {varis, pk, istekNo}`. `pk` tutmazsa `DEVIR_DEGISTI` (409) ile yeni plan döner;
  - `GET /v1/kronik?imlec=`.
- **Davranış:**
  - Vâris yeni yerel kimlik (`o`) alır: NPC çocuk NPC listesinden çıkar ve `Karakter` olur. Ölünün anıları
    ve tanıdıkları ölüde kalır. NPC görüşüne sönümlü "ata namı" kalemi eklenir.
  - `HesapDO` profilin karakter işaretçisini ve `nesil` değerini günceller.
  - `DEVIR_SURE_AY = 4` `[PARAMETRE]` (2 gün) içinde seçim yapılmazsa varsayılan vâris kullanılır: önce
    vasiyetteki vâris, sonra en büyük uygun aday, sonra uzak akraba. Yokluk cezası yoktur.
  - `uzakAkrabaUret(kasaba, hn, ay)`: 16 yaşında gelir, hanedan adını taşır, tohumludur.
  - Kronik ayrı depo anahtarındadır (`kronik:<sayfa>`). Olay defteri sayfaları dönse de kalır. Ölüm,
    devir, oyuncu evliliği ve oyuncu hanesindeki doğum yazılır.
- **Test:** `node --test test/kronik.test.ts test/uclar.test.ts` → `# fail 0`:
  - önizle→devir aynı `pk` ile 200 döner, eski `pk` ile 409 döner;
  - aynı `istekNo` tek devir yapar;
  - başka hesabın devri `YETKI` hatası verir;
  - süre dolunca varsayılan vâris seçilir;
  - çocuksuz ölümde uzak akraba gelir;
  - kronik 49. sayfadan sonra da okunur.

### 7f. İstemci
- **Dosyalar:**
  - `mobile/lib/online/protokol.ts`: `tipler.ts` aynası;
  - `istemci.ts` ve `hanedan.ts`: çağrılar, `istekNo`;
  - `sahte.ts`: 3 kuşaklık sahte hanedan;
  - `mobile/app/online/hanedan.tsx`: soy ağacı, vasiyet yazımı, kronik;
  - `mobile/app/online/devir.tsx`: ölüm sahnesi, aday kartları, sunucu planının dökümü, onay;
  - `i18n-sayfa/online.ts`.
- **Kural:**
  - Onay düğmesi yalnız gösterilen planın `pk` değerini gönderir. 409 gelirse yeni plan gösterilir ve
    "koşullar değişti" denir.
  - Faz 2c istemcisi `faz2-istemci-yarim` dalındaysa önce o incelenir.
- **Test:**
  - `mobile/AGENTS.md` günlük `tsc` komutu hatasız geçer;
  - i18n taraması: yeni her `onl.h.*` ve `olay.*` anahtarında 6 dil dolu, AR/RU'da cinsiyetli kalıp yok;
  - sahte veriyle 320/390 px'te taşma yok;
  - içe aktarma taraması: `app/online` → `lib/game.ts` yok.

### 7g. Üç kuşak simülasyonu ve inceleme (kabul)
- **Dosya:** `online-server/test/hanedan-sim.test.ts`.
- **Kurulum:** 1 kasaba, 3 hanedan, ~1800 ay (≈3 kuşak), saf fonksiyonlarla:
  - H1 oyuncu–oyuncu evliliği kurar;
  - H2 NPC eşle evlenir;
  - H3 çocuksuz kalır ve uzak akrabayla sürer.
- **Değişmezler (her devirden sonra):**
  - para korunumu ve vergi = %10 (yuvarlama ±1);
  - canlı kayıtlarda ölü `o` yok (borç, husumet, teklif, eş, tanıdık işaretçisi);
  - her ölüme tam bir devir ve bir kronik satırı;
  - `ns` 1→2→3;
  - önizleme planı = uygulanan plan;
  - aynı tohumla iki koşu aynı kroniği üretir;
  - ay dönümü süresi Faz 2 bütçesinde kalır.
- **Beklenen çıktı:** `# pass` sayısı > 0, `# fail 0`. Kronik özeti (3 hanedan × 3 nesil) test çıktısına
  yazılır.
- **İnceleme:**
  - güvenlik: sahte devir, ölüyle eylem, çift devir, vasiyetle iki hesap arasında servet pompalama
    (düz oyundan anlamlı kazanç sağlamamalı);
  - `npm run typecheck` temiz;
  - eski protokol `cmp` denetimi temiz.

## Kabul ölçütü
1. `cd online-server && npm test` tamamen geçer. `hanedan-sim` 3 hanedanı 3 nesil yürütür ve bütün
   değişmezler sağlanır.
2. Elle deneme (bellek deposu, hızlandırılmış ay): oyuncu evlenir, çocuğu olur, son günler uyarısını görür,
   vasiyet yazar ve ölür. Önizlemedeki sayılar devirden sonra profilde aynen görünür.
3. Tek oyunculu akış ve eski MP değişmez. `git diff --stat` tek oyunculu dosya ve `server/**` göstermez.

## Bağımlılık (Faz 1–3)
- **Faz 1:** `HesapDO` profili (karakter işaretçisi, `nesil`), `saat.ts` takvimi (`AY_MS`, `oyunAyi`), ad
  süzgeci (`ad.ts`, vâris adı için).
- **Faz 2:** `YerlesimMotoru`, `donum.ts` sırası (ölüm → … → oyuncular), `karakterYasi`/`yas`,
  `cocukDogur`/`npcEkle`, `akrabalik` (gorus.ts), olay defteri ve Dönüş Kartı, `istekNo` defteri.
- **Faz 3 (zorunlu, henüz yok):**
  - `teklif.ts`: evlilik türü, emanet, idempotency;
  - `iliski.ts`: açık husumet;
  - borç kaydı;
  - `npc-teklif.ts`: dünürcü.

  Faz 3 bitmeden 7b ve 7d'nin borç/husumet kalemleri tamamlanamaz. 7a ve 7c Faz 3'ü beklemeden başlar.
- **Faz 4–6:** Kül Yemini, mülk ve kan davası kalemleri hazırsa devre bağlanır. Değilse uç açık kalır.

## Riskler
- **Kimlik yeniden bağlama (en büyük risk):** vârisin yeni `o` kimliği borç, husumet, teklif ve tanıdık
  kayıtlarında sarkan işaretçi bırakabilir. Önlem: tek `kimlikTasi` listesi ve sim değişmezi.
- **Önizleme–devir sapması:** tek oyunculuda iki ayrı hesap "parite" yorumlarıyla eşit tutuluyor. Burada tek
  fonksiyon, `pk` karşılaştırması ve alan alan eşitlik testi kullanılır.
- **Servet pompalama:** iki hesap evlenir, biri ölür ve mal öbürüne geçer. Ölüm yalnız yaşlılıkla
  gelir; %10 vergi alınır ve alıcı akraba ya da vakıf olmak zorundadır. Simülasyonla ölçülür.
- **Ölçek:** ölü arşivi ve kronik büyür. Önlem: sayfalı depo, `DEPO_TOPLU_SINIR`, kronik satır tavanı.
- **Zaman:** bir kuşak ~1 gerçek yıl sürdüğü için gerçek oynanışla doğrulanamaz. Kabul simülasyona ve
  hızlandırılmış bellek saatine dayanır.

## Açık kararlar (Berkay)
- Görünen ad (benzersiz) vârise geçer mi, yoksa yalnız karakter adı mı değişir?
- 12 yaş altındaki tek çocuk: bu planda seçilemez ve payı emanette tutulur. Vasi modeli istenir mi?
- Boşanma, nam devir oranı, `DEVIR_SURE_AY`, son günler süresi ve ölüm ayı dağılımı `[PARAMETRE]`.
