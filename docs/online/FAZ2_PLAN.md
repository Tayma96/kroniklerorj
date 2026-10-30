# Faz 2 — Yaşayan yerleşim çekirdeği: uygulama planı

Kaynak: `docs/online/OYNANIS_TASARIMI.md` §3 (zaman, öğrenme dönemi), §4 (oturum), §5 (NPC'ler), §6.0
(tanıdıklar), §13.8 (eylem çözümü), §14.1 (özellikler). Faz 1: `online-server/`, `mobile/lib/online/`,
`mobile/app/online/`. Kurallar Faz 1 ile aynı: tek oyunculuya, `server/**`'e dokunulmaz; dağıtım elle.

## Oyuncu deneyimi (kabul)
12 yaşındaki oyuncu yerleşimine iner ve:
1. **Dönüş Kartı:** son girişinden beri yerleşimde ve tanıdıklarında olanlar, en çok 5 madde.
2. **Mahalle haritası:** çarşı, cami, kahvehane, meydan, han ve yerleşim türüne göre değirmen ya da mektep.
   Bu ay kim nerede, NPC'ler ve oyuncular birlikte görünür.
3. **Kişi profili:** NPC'nin adı, yaşı, mesleği, huyu ve ailesi. Sana bakışı kalem kalem sebepleriyle
   görünür (tek oyunculudaki `gorus()` dökümünün çevrimiçi karşılığı). "Tanıdıklarıma ekle" ve
   dost/düşman işareti.
4. **Eylemler (takat harcar):** sohbet, yardım, hediye, ayak işi (küçük para), çıraklık başvurusu, mektebe
   gitme. Her birinde şans ve sebep görünür; sonuç anında gelir.
5. **Öğrenme dönemi şeridi:** 6 gün, her gün bir sistem açılır. NPC'ler ay dönümünde yaşar, oyuncu yokken
   olağan düzen işler.

Ölçüt: iki gün girmeyen oyuncu, döndüğünde gerekçeli bir özet görür. NPC'ler o yokken yaşlanmış, karar
vermiş, olay üretmiştir. Aynı istek iki kez işlenmez. Takat biriktirilip farm yapılamaz.

## Mimari
- **`YerlesimDO`** (yerleşim başına bir tane) yerleşimin tek sahibidir. Bütün eylemleri sırayla işler (§13.8)
  ve şunları tutar:
  - NPC nüfusu;
  - sakin oyuncuların karakter durumu;
  - görüşler ve anılar;
  - mekân ve vakit çizelgesi;
  - olay defteri.
- **`HesapDO`**: kimlik, profil, yerleşim işaretçisi (Faz 1); karakter verisi yerleşimde.
- **Ay dönümü:** DO alarmı UTC 09:00 ve 21:00'de (TR 12:00 ve 00:00). Kaçan dönümler sırayla yetiştirilir
  (sunucu uyuduysa).
- **Olay defteri:** `{sira, ay, tur, kim, hedef, gorunurluk, ozet{k,p}}`. İstemci `imlec`ten sonrasını
  çeker; tam geçmiş gönderilmez (GDD §5, §12).
- **İçerik ortak, motor ayrı:** NPC adları, meslek listesi ve sohbet satırı şablonları tek oyunculudan
  `online-server/src/icerik/` altına veri olarak kopyalanır. Kod içe aktarılmaz.

## Adımlar

### 2a. Sunucu: yerleşim çekirdeği (`online-server/src/yerlesim/`)
- `uret.ts`: yerleşim tohumundan deterministik nüfus üretir:
  - hane ve aileler (eş, çocuk, yaşlı);
  - meslek dağılımı (yerleşim türüne göre);
  - huy (tek oyunculudaki huy listesi);
  - NPC'ler arası bağlar.
  Sayılar `dunya-veri.ts` türlerinden (köy ~80, kasaba ~200, şehir ~400).
- `karakter.ts`: oyuncu karakteri:
  - yaş: doğum ayından;
  - 6 özellik (§14.1) ve 6 genel beceri;
  - takat: ayda 6, en çok 2 aylık taşınır;
  - hane;
  - tanıdıklar ve işaretler.
- `gorus.ts`: NPC→oyuncu görüşü = kalemler toplamı. Kalemler:
  - aranızda geçenler;
  - sönen anılar;
  - akrabalık;
  - meslektaşlık;
  - huy ↔ nam;
  - "dostunun dostu" (yalnız 4 mevsimlik bağlar, ±10).
  Gösterilen toplam ile hesapta kullanılan değer aynıdır.
- `cizelge.ts`: bu ay kim nerede. Yaş, meslek, mevsim ve gündem belirler, tohumlu rastgelelik ekler.
  Oyuncu, eylemle gittiği mekânda görünür.
- `eylem.ts`: sohbet, yardım, hediye, ayak işi, çıraklık başvurusu, mektep.
  - Her eylem şunları döndürür: şans dökümü, zar, sonuç, olay, takat.
  - Aynı (oyuncu, NPC, eylem türü) için azalan getiri uygulanır.
  - Yaş kapıları (§3): 12+ eylemleri.
- `donum.ts`: ay dönümü:
  - yaşlanma;
  - yıllık doğum, evlilik ve ölüm (NPC);
  - NPC gündemi (ihtiyaç → hedef; Faz 2'de geçim, evlilik ve dostluk);
  - ücret ve ayak işi parası;
  - anı sönmesi;
  - olay üretimi.
- `donus.ts`: oyuncuya Dönüş Kartı (imleçten beri en önemli 5 olay; tanıdıklar öncelikli).
- Uçlar:
  - `GET /v1/yerlesim`: durum + harita + benim karakterim + imleç;
  - `GET /v1/olaylar?imlec=`;
  - `GET /v1/kisi/:id`: profil + görüş dökümü (yalnız görmeye hakkın olan, §13.9);
  - `POST /v1/eylem {tur, hedef, istekNo}`;
  - `POST /v1/tanidik {hedef, isaret}`.
- Testler:
  - üretim determinizmi ve nüfus değişmezleri;
  - görüş toplamı = döküm;
  - takat tavanı ve taşınma;
  - azalan getiri;
  - aynı `istekNo` iki kez işlenmez;
  - ay dönümünde yaşlanma ve olay sırası;
  - kaçan dönümlerin yetiştirilmesi;
  - Dönüş Kartı seçimi.

### 2b. Sunucu: öğrenme dönemi
- 6 günlük açılış:

  | Gün | Açılan |
  |---|---|
  | 1 | mahalle ve tanışma |
  | 2 | çıraklık ve zanaat |
  | 3 | mektep ve özellik puanı |
  | 4 | ayak işi ve para |
  | 5 | dostluk ve teklif |
  | 6 | ilk gerçek karar |

  Her gün bir hedef ve küçük bir ödül var. 13 yaşına girişte Kül Yemini mührü kancası, Faz 4'e
  bağlanacak bir olay olarak yer alır.
- Testler: gün kapıları, ödüllerin bir kez verilmesi, girmeyen oyuncunun kaçırdığı günü sonra yapabilmesi.

### 2c. İstemci (`mobile/lib/online/`, `mobile/app/online/`)
- Veri katmanı: yerleşim durumu, olaylar (imleçli), eylem (istekNo), kişi, tanıdık.
- Ekranlar:
  - `yasam.tsx` (ana): Dönüş Kartı, gerilimler, takat, öğrenme şeridi;
  - `mahalle.tsx`: harita ve iğneler (tek oyunculudaki `lib/sayfa/mahalle/harita.tsx` görsel bileşeni
    yeniden kullanılır);
  - `kisi/[id].tsx`: profil, görüş dökümü, eylemler ve şans;
  - `tanidiklar.tsx`;
  - `karakter.tsx`: özellikler, beceriler, öğrenme dönemi.
- Sahte veriyle önizleme. 6 dil. 320 ve 390 px. Varış ekranının düğmesi `yasam`a bağlanır.
- Tek oyunculu veri okunmaz. `home-mockup-ui`'deki süs ve renk parçaları hafif bir modüle taşınır; böylece
  çevrimiçi ekranlar dolaylı olarak da `store`a bağlanmaz.

### 2d. Simülasyon ve inceleme
- Simülasyon: 1 kasaba, 20 sanal oyuncu, 2 oyun yılı (12 gün), saf fonksiyonlarla. Ölçülenler:
  - dönüm süresi;
  - olay hacmi;
  - takat ve para dağılımı;
  - görüş dağılımı;
  - farm denemesinin kazancı.
- Sunucu ve istemci için ayrı birer inceleme ajanı çalıştırılır; bulgular düzeltilir.

## Doğrulama
- Sunucu: `node --test`, `tsc`.
- İstemci: tsc, i18n ve ikon, dil karışması, sayfa tasarımı, önizleme görüntüleri.
- `rg` ile tek oyunculu içe aktarma taraması.
- Cihaz testi: Google girişi ve dağıtım sonrası.
