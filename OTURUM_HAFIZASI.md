# Oturum Hafızası — Kronikler geliştirme penceresi

> Konuşma bağlamı sıkıştırıldığında ya da konteyner eski bir anlık görüntüye döndüğünde kaybolmasın diye tutulan
> devir notu. Yeni bir oturum önce bunu, sonra `mobile/AGENTS.md` ve `TASARIM_PUSULASI.md`'yi okur.
> Son güncelleme: 12 Ekim 2026 · dal **`apk`** (geliştirme ve yayın) · 7 Ekim penceresinin son commit'i `0c6f566`.

## 1. Kullanıcının kararları (kronolojik)

- "Tam yetki veriyorum sana, oyun senin." Ardından tekrar tekrar "Devam" ve "Durma devam, incele neler
  yapılabilir bakalım": oyunu kendi başına incele, iyileştirilecek ya da düzeltilecek ne varsa yap.
- Bekleme şikâyeti ("15 dakikadır bir iş koşuyor, arka planda devam et"): smoke **her 3–4 dalgada bir**,
  **arka planda** koşulur; sonucunu beklerken oturulmaz, iş sürer.
- Yayına hazırlık incelemesi istendi; cevaptan sonra: "PEGI 12 önemli değil, 16 yaş üstü de olabilir. Biz oyunu
  geliştirmeye devam edelim." → yaş sınıfı PEGI 16 / Teen (MAGAZA.md'ye işlendi), yayın işi zorlanmaz.
- 7 Ekim: "Bu sohbet penceresindeki tüm konuşmalarımızı anımsa, hafızanı geri getir, aksilik yaşanmasın."
  → bu dosya yazıldı.

## 2. Kalıcı kurallar (kullanıcı koydu, tartışılmaz)

- **Geliştirme ve yayın `apk` dalında** (`mobile/AGENTS.md` ile aynı; workflow'lar da `apk`'yı varsayar).
  7 Ekim penceresi geçici olarak `claude/son-durum-apk-bkyzxp` dalında çalıştı; o iş `apk`'ya alındı ve o dal
  artık kullanılmıyor. Kullanıcı bir pencerede açıkça başka dal verirse yalnız o pencere için geçerlidir.
- Commit mesajı **Türkçe, tek satır**, hikâye anlatan tonda. Hiçbir yerde (commit, kod, PR) imza, footer, model
  ya da araç adı yok.
- **ScheduleWakeup, cron, trigger yasak** (kalıcı). Yalnız arka plan bash zincirleri.
- Cloudflare API token'ı asla saklanmaz, yazdırılmaz, commit'lenmez.
- **APK yalnız kullanıcı açıkça isteyince.** PR yalnız istenince.
- Arayüzde emoji yok (GameIcon; ❧ ⚜ ♂ ♀ istisna). Renk ve font yalnız tema jetonlarından.
- Farm yok: para/itibar/XP veren her eylemde tur kilidi, tek seferlik iz ya da azalan getiri.
- Her yeni metin 6 dilde (tr en es pt ar ru). Oyuncuya hitapta AR/RU için `.f` (dişil oyuncu) ya da cinsiyetsiz
  kuruluş; NPC cinsine bağlı satırda `.k` (6 dilde de bulunmalı, denetçi tam anahtar sayar).
- Player/GameState'e eklenen alan opsiyonel; vâris devri `continueAsHeir` içinde açıkça taşınır,
  `heirPreview` ile paritesi korunur.
- MP paritesi: `mobile/lib/mp/protocol.ts` ↔ `server/src/protocol.ts` aynı kalır.
- Başlatılan web sunucusu kapatılır (`pkill -f sunucu.cjs`; çıkış kodu 144 normaldir).

## 3. Çalışma hattı

- Her dalgadan önce senkron bekçisi: `git fetch origin apk && git status -sb`.
  Konteyner bir kez eski anlık görüntüye döndü (mobile/ klasörü yoktu, commit'lenmemiş iş kayboldu); çözüm
  `git checkout -B apk origin/apk` + `npm ci`. Bu yüzden
  **iş bitince hemen commit + push**.
- Hızlı denetimler (mobile/ içinden): `npx tsc --noEmit` · `node scripts/_smoke/i18n-icon-check.cjs` (TEMİZ) ·
  `dil-karisma.cjs` (TEMİZ) · `olay-metin.cjs 30` (TEMİZ) · `migrate-check.cjs` · `olu-karar.cjs` (TEMİZ) ·
  `OYN_LIVES=60 node scripts/_smoke/oynanis.cjs` (ölçütler).
- Smoke: `node scripts/_smoke/run-parallel.cjs` (~15 dk). Çalışma kopyası değişirken doğru commit'i sınamak için
  scratchpad'de ayrı bir git worktree'de (`git worktree add <yol> --detach <commit>`, node_modules sembolik bağı)
  arka planda koşulur.
- i18n anahtar ekleme: her dilin `  <dil>: {` satırındaki `"kart.swipe":` çapasının önüne; değerlerde `"` ve `\`
  yasak. Rusçada kişi adı hâli için `%1:р|в|д|т|п` işareti; hane adı "дом/домом/дома %N" ile çekilir.
  Yüzde her zaman `yuzdeL(n, lang)` ile.
- Web görsel denetim: `npm install --no-save react-dom@19.2.3 react-native-web@^0.21.2` (git ağacı temiz kalır),
  `npx expo export --platform web --output-dir <dizin>`, statik sunucu + Playwright
  (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`). CanvasKit/autoplay uyarıları zararsız.

## 4. Bu pencerede yapılanlar (özet; ayrıntı `git log`)

**3–5 Ekim (önceki bağlamlar):** tasarım pusulası ve oynanış ölçütleri; açık hesaplar paneli; ilk dakikanın
sadeleşmesi; kapıdaki insan kartları (düğün, cenaze, kefalet, hakemlik, imece, can borcu, helalleşme, diyet aracısı);
dört sermaye ve yakın çember; aile ihmalinin kademeleri; borcun sebebi; tekrar ölçütü (%19,8 → %6,6); mersiye;
kadın oyuncu, kadın NPC ve dişil meslek/unvanlar için 6 dilde onlarca düzeltme; Rusça ad çekimi; tekil/çoğul;
hayatın sonu ve doğurganlık dengesi; kiler hatası; arayüzde uzun dillerde taşan yazılar.

**7 Ekim:**
- `1124928` `c59abe5` `40457e1` — Zayıf bağlar (pusula 3.8): eski tanıdık kapıya iş haberi, uzak kasabanın pazar
  haberi (kıt mal, medyan 1,6–1,7 kat fiyat) ya da bekâr oyuncuya tanıştırma getiriyor.
- `b004885` — Kan davası yerin asayişine bağlı (pusula 3.5, `asayisOf`): düşük asayişte dava ~9,6 ayda, yüksekte
  ~22,9 ayda tutuşuyor; asayiş ≥55 yerde "kadının daveti" kartı (hükme razı ol: nam +3 şeref −3, dava kapanır /
  reddet: şeref +2, ateş +6). Rusça dava satırlarında hane adları çekimli.
- `d0269e6` `2471ae4` — Rusçada 133, İspanyolca/Portekizcede 19 satıra kadın oyuncu için dişil karşılık.
- `f068c68` `df59c69` — Ölü karar denetimi (`scripts/_smoke/olu-karar.cjs`): 143 kart + 67 yay sahnesinde 34 baskın
  seçenek düzeldi. Kumar, yatırım, kervan ortaklığı, pazar söylentisi, kefil imzası artık gerçek risk
  (`risk: { taban, ticaret?, zeka?, kayip, metin }`, zar kart açılırken `riskiCoz` ile, kayıp metni
  `dil.<id>.r<i>x`). "Dile Düşen Aşk"ta nikâh isteyen bekâr oyuncu gerçekten evleniyor. Hastalık satırları sebebini
  söylüyor (mevsim, meslek, açlık); tekrar %7 → %5,7.
- `11e8dda` — Arayüzdeki sabit "%" önekleri `yuzdeL`'e bağlandı; enflasyon satırları her dilde doğru düzende.
- 31 oyun ekranı 6 dilde tarandı: çökme yok.

**10 Ekim (temizlik + denge + lisans):**
- Hijyen: APK'lar git'ten çıktı (`dist/` yok sayılır), imza secret'tan, AAB'ye kalite kapısı, versionCode tek kaynak
  `mobile/app.json` (`scripts/surum-artir.cjs`), esbuild yerel bağımlılık, repo adı Tayma96/kroniklerorj, eski Python/web
  `legacy/`, kök belgeler `docs/` ve `docs/arsiv/`.
- Ekonomi: `lifestyleUpkeep`'e 1500–5000 servet dilimi (%10/yıl) + yetişkin hane gideri (+0.15/yıl, en çok +6/ay);
  pazarda "Hane geçimi" satırı. Ölçüm `scripts/_smoke/ekonomi.cjs`: pasif 60 yaş medyanı 9.173 → ~3.400.
- Arapça: 88 satıra `.f`, 7 satır cinsiyetsiz; `callbackLine` ve pazarlık satırı cinsiyeti tanır.
- Diyalog: `derinlikKatmani` (takip, ısrar, oyuncuyu fark etme, kişilik, can dostu/hasım, mevsim) + `diyalog.cjs`.
- Lisans: kökte özel `LICENSE`, `mobile/UCUNCU-TARAF.md`, Ayarlar → Emeği Geçenler; soluk metin kontrastı 4.78:1.

## 5. Son ölçümler (oynanis.cjs, 60 hayat)

Ayda pencere ~0,9 · bunalma ~%0 · açık gerilim en çok 2–3 · geri çağırma %100 · tekrar %5,7 · ölüm yaşı medyan 65 ·
15 meslek, entropi ~3,65 bit · ölü karar 0. Smoke: `40457e1` ve `f068c68` 300 hayatta HATA 0.

## 6. Açık işler ve sıradaki adaylar

- `df59c69` ve `11e8dda` için smoke sonucu (7 Ekim akşamı başlatıldı).
- Pusula 3.6 hane asabiyesi: nesiller boyunca zorlukla yükselip rahatla eriyen dayanışma; yeni gösterge eklemeden
  vâris ekranında tek cümle, vârisin başlangıcına küçük etki (süzgeç 3–4'e dikkat).
- Pusula 3.3 Mauss borç defteri (minnet/mahcubiyet) — kısmen var.
- Arapça `.f` taraması 10 Ekim'de 88 satırla yapıldı; kuşkulu kalanlar (f.aile.bekar, mp.gov.appointed, divan.su_kavgasi.r1,
  child.adv.bully, seed.velinimetUnuttu/Olu, dil.tz_demirci_d.r0) anadil okuması bekliyor.
- Çocukluk "babanın işi" satırı en çok yinelenenlerde; mesleğe özgü varyantlar düşünülebilir.
- Ekonomi: pasif kayma düzeldi (10 Ekim); kervan/arbitraj simülasyonu ve gerçek oyuncu verisi bekleniyor.
- 27 simgenin game-icons yazarı ve SD-Turbo ticari kaydı (insan işi) — `mobile/UCUNCU-TARAF.md`.
- APK ve PR yok — kullanıcı isterse.

## 7. Teşhis (10 Ekim akşamı, çekirdek yeniden kuruluşundan önce) — oynanabilirliğin en büyük sorunu

**Tek cümle:** Oyuncunun kararları hayatına iz bırakmıyor; ay ay önüne gelen kart, geçmişinden habersiz bir zar
atışı. Oyun "seçimlerin hikâyesi" vaat ediyor, ama motor seçimi verildiği an unutuyor — bu yüzden döngü tekrar
gibi hissettiriyor ("her ay yeni ve kopuk bir kart, sayılar biraz oynuyor").

Kanıt (`8d25097` üzerinde):
- **Seçimlerin %95'i unutuluyor.** 124 ikilemin 247 seçeneğinden yalnız 13'ü (%5,3) `DILEMMA_SEEDS` ile ileriye bir
  şey ekiyor; geri kalanı anlık `delta` (para/itibar ±) ve bir günlük satırı. 30 hikâye yayının 135 seçeneğinin
  **hiçbiri** sonraki bir olayca okunmuyor (`story.completed` yalnız yayı listeden düşürür, `arcs.ts:549`).
- **Ay sahnesi kör zar.** `app/oyun/index.tsx` (eski 178–186. satırlar): `Math.random()` < 0,28 ikilem, < 0,50 fırsat,
  < 0,75 kapı; seçim oyuncunun geçmişini, açık sözlerini, son ayların türünü okumuyor. Aynı tür kart art arda
  gelebiliyor; orta yaşta 30–55 aylarının %16,2'si boş (oynanis 60 hayat).
- **Doruk jenerik.** `directorTick` gerilim 80'i aşınca sebepsiz "talih senden yana döndü / eski dengeler sarsıldı"
  yazıyordu (`dir.climaxWin/Turn`): 60 hayatta 502 "doruk" dönüm noktası (hayat başına ~8), hiçbiri bir seçime bağlı değil.
- **Geri dönen sonuç oranı.** 60 hayatta 39.300 karar, 2.123 gecikmeli sonuç: kararların ~%5'i bir gün geri dönüyor.

**Karar:** Çekirdek, "Yankı" adlı bir sonuç motoruyla yeniden kuruldu (aşağıda §8): her büyük seçim kalıcı bir hafıza
kaydı (iz) olur, iz bir eğilim etiketi taşır, sonraki olaylar ve yaylar bu hafızayı okur, ay sahnesini motor seçer.

## 8. Yankı — yeni sonuç motoru (çekirdek)

- **Hafıza (`GameState.hafiza: Iz[]`, `lib/game.ts` "YANKI" bölümü):** her ikilem, orta yaş sorusu, yay sahnesi ve kapıya gelen
  insana verilen cevap bir iz olur: `{ n, k: "dil:<id>:<i>" | "arc:<yay>:<sahne>:<i>" | "kapi:<tür>:<1|0>", t, et, kisi?, ref? }`.
  `et` seçimin eğilimi (`deltaEtiketi`: cömert/hırslı, dürüst/hileci, cesur/temkinli). Tavan 80; önce karşılık bulmuş eski izler düşer.
- **Okuyanlar:** `yankiTick` (her ay, karşılıksız ≥8 aylık en eski iz eğilimine göre geri döner — 6 eğilim × 3 satır, kişi
  yaşıyorsa kişiyle, öldüyse ailesinin anısıyla); `tutarlilik` (yeni seçim eski izlerle aynı yöndeyse "seni bu yoldan tanırlar",
  tersiyse şaşkınlık; **yaylarda sonucun kendisi değişir**: tutarlı +3 itibar, çelişki +2 ün −1 itibar); tohum/ip ödemesi izi
  "karşılık buldu" sayar (`Seed.iz`); dallanan yay sahnesi izi hemen karşılar.
- **Kader ipi** (`Ip`, en çok 3 açık, vadesinde mutlaka ödenir) ve **ay sahnesi** (`events.ts ayinSahnesi`: evre eğrisi, açık ipler,
  son 12 kartın türü, aynı tür en çok 3, orta yaşta 18 ayda bir soru) motorda; `index.tsx` yalnız gösterir. Jenerik doruk yok.
- **Vâris:** `ataIzleri` atanın en çok anılan üç izini atanın adıyla geçirir (`yanki.ata.<et>.<v>`).
- **Denetçiler:** `yanki-check.cjs` (statik ayrışma, ikiz hayat ayrışması, kontrol=0, ata izi), `oynanis.cjs OYN_ESIK=1`
  (karşılık %, ip ödeme %, açık ip ≤3, jenerik doruk 0, seri ≤3, orta yaş arası ≤18, ay notu ≥%60, bunalma).
- Metinler: `lib/i18n-cigir.ts` (6 dil, `.f` oyuncu dişil, `.k` NPC dişil); üretim tablosu oturum dışında, dosya elle de düzenlenebilir.

## 9. Hanedan Defteri (Yankı üstünde, ölümden sağ çıkan kayıt)

- **Ayrı anahtar `kronik_defter`** (`lib/defter.ts`, `lib/store.tsx`): `resetGame` dokunmaz. Soy kaydı (ad, nesil, ölüm yaşı, meslek,
  ölüm sıfatı `ep.*`, lakaplar, baskın eğilim, en çok anılan 3 iz, tamamlanan yaylar, görülen ikilemler, soy yeteneği). En çok 60 soy.
  `defterGoc` her alanı korur (bozuk girdi atılmaz, onarılır); `defterIsle` aynı ölümü iki kez yazmaz (anahtar: ad|soyad|nesil|tur|yaş).
- **Motoru besler:** vâris (`continueAsHeir`) ya da vârissiz ölümde **Küllerden yeni ocak** (`kulDenYeniOcak`, `app/oyun/ocak.tsx`)
  atanın izlerini `ata` alanıyla hafızaya koyar; `yankiTick` ata izini torun 12 yaşına gelince önce açar (`yanki.ata.<et>.<v>`).
- **Soy yetenekleri** (`SOY_YETENEKLERI`, 8 adet): her birinin bir artısı bir bedeli var; ölümde 3 aday (`yetenekAdaylari`,
  deterministik: en çok çalışılan dal, baskın eğilim, en güçlü özellik) + "yetenek yok". Para/mülk/itibar geçmez (pusula).
- Ekranlar: `app/oyun/kronik.tsx` (Menü → Kayıt & Anı), `app/oyun/ocak.tsx`, vâris ekranında `lib/soy-ui.tsx YetenekSecici`.
- Denetçi: `scripts/_smoke/defter-check.cjs` (artı+bedel, 6 dil, göç fuzz/idempotent, resetGame defteri silmez,
  5 nesil zinciri: başlangıç gücü birikmez, ilk 20 yıl medyan para kayması ≤%10, torunda ata yankısı).

## 10. Hayat Romanı (paylaşım)

- `lib/roman.ts hayatRomani(s)`: Yankı hafızasından {k,p} satırları — açılış (yaş), soy/kuşak (ata izi), hayatın ipliği (baskın eğilim),
  en çok anılan üç dönüm (yaş + kart/yay BAŞLIĞI + eğilim; sonuç yazılmaz), "bildik yoldan dönüş" (baskın eğilimin ≥2 izinden sonra
  gelen ilk ters iz), büyük karar / geri dönen sayısı, kapı cevapları, tamamlanan yaylar, ölüm sıfatı ya da "defter açık".
- `app/oyun/roman.tsx`: ekranda paylaşım kartı + RN `Share` ile aynı satırlar (görüntü yakalama kütüphanesi yok → metin paylaşımı). Ağ yok.
- Denetçi `scripts/_smoke/roman-check.cjs`: ikiz tohumlu hayatlar, 6 dil × kadın/erkek temiz basım, dönüm satırı gerçek ize dayanır,
  spoiler sızmaz, ≤900 karakter, ikiz romanların ≥%80'i farklı.
- **Düzeltilen hata (adım 1'den):** TR'de ikilem başlıkları sözlükte değil `events.ts`'teydi; `{sfx:"dil.<id>.t"}` yankı satırları
  TR'de ham anahtar basıyordu. Üretici artık tüm ikilem başlıklarını TR sözlüğüne (i18n-cigir) yazar; `olay-metin` ham anahtar
  süzgecine `dil|arc|yanki|soy|roman|ip` eklendi.

## 11. Kalanlar (çığır)

- Divan Davası (Sütun C) bu turda bırakıldı (commitlenmemişti).
- Fısıltı (`fis.*`) satırları Yankı'ya bağlanmadı; `seed.*` satırı olmayan divan tohumları BUYUK_IP dışında.
- Şenlik ayları ayların ~%24'ü (önceden de böyleydi); yönetmen ileride şenlik sıklığını eğriye bağlayabilir.
- Tek yönlü ikilemler (gec_kutuk, cocuk_cirak, sifa_otu, yasli_sandik, orta_ana) ikinci eğilim kazanabilir.
- Paylaşım kartı görüntü olarak (view-shot) değil metin olarak paylaşılır; bağımlılık eklenirse kart `View` hazır.
- Yeni oyun ekranı (`/yeni-oyun`) defterdeki soyu henüz önermiyor; şimdilik yalnız ölüm akışı ve "Küllerden yeni ocak".

## 12. Dalga 2 — Kan Hafızası (çığır Sütun 4)

- `lib/game.ts` "KAN HAFIZASI": `GameState.hatir: Hatir[]` (en çok 6) — `{ id (NPC), yon: kin|minnet, guc 1–5, t, son, don, nesil, ata?, kay }`.
  Kaynak: `remember()` içinde |yük| ≥ 15 olan anılar (yardım, borçtan/candan kurtarma, düğün, savunma ↔ hakaret, tehdit,
  dolandırıcılık, saldırı…) ve kapıdan eli boş çevrilen borç/kefil/kardeş/miras isteklerinin yarısı (kişiye bağlı, deterministik).
- `hatirTick` (her ay): yıllık kin büyür (%20); güç 5'e varıp en az bir kez dönmüş kin %15 ihtimalle **kanlı hasma** (`story.nemesis`)
  döner; kişi ölürse hesap yetişkin evladına geçer (en çok 3 kuşak, her devirde bir kademe söner). Dönüş: iki yılda bir, kin →
  kese (≤ kesenin %5'i) ya da ad kaybı; **yoksul/aç/hasta iken kin geri çekilir**; iyi ilişki ya da cömert/dürüst eğilim barışı
  açar. Minnet → darda kese, değilse ad; ödenince kapanır.
- `hatirMiras`: vâris atanın yaşayan hesaplarını `ata` imiyle devralır (kin bir kademe söner). Defter ölümde kin/minnet sayısını yazar (Kronik).
- Denetçi `scripts/_smoke/kan-check.cjs`: ≥5 yıl yaşamış kayıtların ≥%70'i döner, vâris devralır ve ata imli dönüş görülür,
  yoksula vuruş 0, %5 tavan aşımı 0, kin zararı ≤ çalışma gelirinin %3'ü.

## 13. Dalga 2 — Geç oyun: asabiye ve veraset (çığır Sütun 5)

- `GameState.asabiye` (0–100, yoksa 50; ekranda sayı yok). `asabiyeTick` (40+ yaş, yılda bir): rahatlık −1, darlık +1, kardeş
  kırgınlığı ≥40 −1, iki+ evlat bir sofradaysa +1. Vâris ekranında tek cümle `asabiye.<0-4>` (`app/oyun/nesil.tsx`);
  vârise ±3 itibar (`asabiyeRep`, heirPreview paritesi) ve yarı yarıya söner.
- `events.ts SON_YAS` (12 kart): kâhya hesabı, gece gelen kumar borcu, beyin iltizamı, ölmeden miras, vasiyetin satırı
  (`Delta.veraset`: ilk/gözde/eşit → `succession.favored`), vakıf taşı, yokluğu bilmeyenler, kardeş küslüğü, sefer hissesi,
  eski dostun döşeği, hane meclisi, yeni düzen. Orta yaş nöbetçisi artık 30+ yaşı kapsar; 50+ yaşta deste SON_YAS'a kayar.
- Ölçüm (oynanis 30 hayat): 50+ boş ay %15,8 → %11,9; 50+ tekrar %2,5 → %3,0. Eşik: 50+ boş ≤%13, tekrar ≤%5.
- Denetçi `scripts/_smoke/gec-check.cjs`: her 56+ hayat geç soru görür, asabiye ≥3 banda yayılır, vasiyet kararı yazılır, parite.
- Doğrulama (commit öncesi tam takım): 12 çekirdek denetim rc=0; YANKI/DEFTER/ROMAN/KAN/GEÇ OYUN TEMİZ; oynanış 30 hayat ÇIĞIR EŞİKLERİ TEMİZ
  (50+ boş %11,9, 50+ tekrar %2,9). Sıradaki: Divan Davası (adım 3).

## 14. Dalga 2 — Divan Davası (çevrimdışı günlük dava, çığır Sütun 6)

- `lib/divan.ts`: 32 dava (`DIVAN_DAVALAR`), yollar sabit sıra c0 merhamet · c1 adalet · c2 töre. `divanNo(tarih)`: 1 Ekim 2026 = No. 1,
  yerel takvim günü; `divanDavasi(no)` = (no−1)·7 mod 32 (her 32 günde her dava bir kez). Herkes aynı gün aynı davayı görür.
- Kasaba oyu `kasabaOyu(no)`: numarayla tohumlanan 120 kişilik sentetik kasaba; mizaç (TRAITS) → yol eğilimi (%60/%20/%20 + dava
  ağırlığı). Oyuncunun oyu dahil yüzde (`oyYuzde`); tek yol en çok %55 çıktı (sınır %90). Oyun durumuna dokunmaz.
- Kayıt ayrı anahtar `kronik_divan` `{v:1,k:{no:yol}}`, `divanGoc` korumalı; `hukumVer` aynı numarayı ikinci kez yazmaz (çiftlik yok).
  Kaçan dava yok: arşiv son 14 numarayı gösterir, bekleyenler hükmedilebilir. Seri/zamanlayıcı yok.
- Lakap (yalnız kimlik): bir yolda 20 hüküm → Merhametli Kadı / Adil Kadı / Töre Bekçisi (es/pt/ar/ru kadın biçimli).
- Ekran `app/oyun/divan.tsx` (menü: Kayıt & Anı, Tabs href:null): dava, üç yol, hükümden sonra oy çubukları, spoiler'sız paylaşım
  satırı `divan.paylas` ("Divan No. 10 ⚖ Taşınan Sınır Taşı · kasaba: %37 aynı hükümde"), lakap ilerlemesi, arşiv.
- i18n parçası `d` (`/tmp/kr/i18n/d_*.json`): 32×5 + 20 arayüz satırı, 6 dil.
- Denetçi `scripts/_smoke/divan-check.cjs`: aynı tarih → aynı dava (400 gün), döngü kapsaması, 3000 numarada oy ≤%90 ve toplam 100,
  divan.ts oyun modülü/para alanı içermez, ekran eylem/zamanlayıcı çağırmaz, tek hüküm, göç, lakap ardışıklıktan bağımsız, 6 dil.
- Doğrulama: 12 çekirdek rc=0; YANKI/DEFTER/ROMAN/KAN/GEÇ/DİVAN TEMİZ; oynanış ÇIĞIR EŞİKLERİ TEMİZ. Sıradaki: adım 4 (gerçek takvim).

## 15. Dalga 2 — Gerçek takvimin yumuşak ritmi (adım 4)

- `lib/ritim.ts` `gercekRitim(tarih)`: ana ekranda (`app/oyun/index.tsx`, tarih hapının altında) tek satır — "dışarıda" ne var:
  yılbaşı, Nevruz, Hıdrellez, gün dönümü, gece-gündüz eşitliği, Yalda gecesi, Ramazan/Kurban bayramı (2026–2031 yaklaşık tablo,
  ±1 gün pencere), yoksa mevsim satırı (iki çeşit). Yalnızca söz: ödül, bonus, süre, seri, kaçırılacak bir şey yok; oyun durumunu okumaz/yazmaz.
- i18n parçası `c` (15 satır × 6 dil). Güney yarımküre ayrımı yok (kuzey mevsimleri).
- Denetçi `scripts/_smoke/ritim-check.cjs`: 2026–2031 her gün 6 dilde satır, özel gün yılda ≤30, ritim.ts içe aktarmaz/saat okumaz,
  oyun mantığı (game/events/arcs/npc-mind/nufus/world/defter/roman/dialogue/divan/calendar) saat okumaz → hiçbir ödül zamana kilitli değil.
- Doğrulama: 12 çekirdek rc=0; YANKI/DEFTER/ROMAN/KAN/GEÇ/DİVAN/RİTİM TEMİZ; ÇIĞIR EŞİKLERİ TEMİZ. Sıradaki: adım 5 (artıklar).

## 16. Dalga 2 — Artıklar (adım 5)

- Fısıltı → Yankı (`lib/game.ts` ay sonu fısıltısı + `yankiTick`): dönmeyi bekleyen eski bir karar varsa fısıltı onu adıyla haber
  verir (`fis.yanki.0/1/ata`, `Iz.fis`), gelecek ay yankı zar atmadan o izi öder. yanki-check: 56 fısıltı, 3 ayda dönen %100 (eşik %90).
- İkinci eğilim (`lib/events.ts`): gec_kutuk (odun −10 → cömert), cocuk_cirak (çocukluk → sağlık, temkin), sifa_otu (yeni seçenek:
  handaki hasta yolcuya götür, −5 → cömert; 6 dil + RU kadın biçimi), yasli_sandik (ateşe ver → sağlık), orta_ana (evine al → sağlık −2),
  son_vasiyet (eşit pay → temkin). Statik ayrışma %99,3 → %100; tek yönlü kart kalmadı; ölü karar 0.
- `/yeni-oyun` (`app/yeni-oyun.tsx`): defterde soy varsa "Soyu sürdür / Yeni bir soy başlat" seçimi; soydan devam `yeniOcak` ile
  (defterdeki soyadı, son atanın izleri, bıraktığı tek soy yeteneği; para/mülk/itibar geçmez). i18n parçası `l`.
- Doğrulama: 12 çekirdek rc=0; YANKI/DEFTER/ROMAN/KAN/GEÇ/DİVAN/RİTİM TEMİZ; ÇIĞIR EŞİKLERİ TEMİZ (50+ boş %11,9, tekrar %2,2).
- Adım 7 (Dost Haneler) taslağı commit dışı: `/tmp/kr/w7/` (dost.ts, dost-ui.tsx, dost-check.cjs, i18n `h`) — kullanıcı şimdilik atlattı.

## 17. Dalga 2 — Görsel paylaşım kartı (adım 6): ATLANDI

- Projede `react-native-view-shot`, `expo-sharing`, `expo-file-system` yok; yalnız `@shopify/react-native-skia` var. Skia kartı PNG'ye
  çizebilir (`makeImageSnapshot`/`encodeToBase64`), ama RN'nin yerleşik `Share`'i Android'de yalnız metin taşır (url alanı iOS'a özgü).
  Android APK'da görsel paylaşmak için `expo-sharing` + `expo-file-system` (yerel modül → yeni APK derlemesi ve bağımlılık kurulumu) gerekir;
  doğrulanamayan yerel bağımlılık eklemek "temiz" değil. Metin paylaşımı (Roman, Divan) yerinde kalır; kart `View`'ları hazır.
- Yapılacak: iki paketi ekle, Skia ile kartı offscreen çiz → cache'e PNG yaz → `Sharing.shareAsync`; paket yoksa metne düş; yeni APK.
- Adım 7 (Dost Haneler) kullanıcı isteğiyle ertelendi; taslak `/tmp/kr/w7/` (commit dışı, kalıcı değil).

## 18. Dalga 3 — Görsel paylaşım kartı (adım 6 tamamlandı)

- Bağımlılık: `npx expo install expo-sharing expo-file-system` → `expo-sharing ~56.0.26`, `expo-file-system ~56.0.11` (SDK 56).
  expo-sharing'in yapılandırma eklentisi (yalnız "uygulamaya paylaşım alma" içindir, manifest'e intent-filter ekler) app.json'dan
  bilerek çıkarıldı; dışa paylaşım (`shareAsync`) eklentisiz çalışır. **Yeni yerel modül → yeni APK gerekir.**
- `lib/kart-paylas.ts`: `kartPaylas(ref, metin, dosyaAdı, başlık)` — Skia `makeImageFromView` ile kart View'u → PNG bayt →
  `File(Paths.cache)` → `Sharing.shareAsync(image/png)`. Yerel modüller dinamik yüklenir; herhangi bir hata (eski APK, paylaşım yok,
  çekim boş) `Share.share` metnine düşer. Android görsele altyazı ekletmediği için metin kartın içinde; "ya da metin olarak paylaş"
  düğmesi (`paylas.metin`, 6 dil) metni ayrıca paylaşır.
- Ekranlar: `app/oyun/roman.tsx` (Hayat Romanı kartı), `app/oyun/divan.tsx` (dava paneli + oy çubukları).
- Denetçi `scripts/_smoke/paylas-check.cjs` (statik): SDK eşleşmesi, yerel modül kurulu, metne düşüş yolu, ağ yok, iki ekran.
- Doğrulama: 12 çekirdek rc=0; YANKI/DEFTER/ROMAN/KAN/GEÇ/DİVAN/RİTİM/PAYLAŞ TEMİZ; ÇIĞIR EŞİKLERİ TEMİZ. Cihazda elle denenmedi.

## 19. Dalga 3 — Dost Haneler (sunucusuz, adım 7)

- `lib/dost.ts`: `haneKodu(defter)` → `KR1-<base64url(soyad|son ata|kuşak|eğilim|yay sayısı)>-<4 haneli FNV sağlaması>`; `koduCoz`
  bozuk/kesik/yanlış önekli kodu reddeder. Kayıt ayrı anahtar `kronik_dost` `{v:1,h:[…]}`, `dostGoc` korumalı, en çok 20 hane,
  aynı hane çiftlenmez. Yalnız kimlik: para/güç/eşya yok, ağ yok, seri/hatırlatma/baskı yok.
- `lib/dost-ui.tsx` → Kronik ekranında (`app/oyun/kronik.tsx`) "Dost Haneler" paneli: kendi kodun + paylaş, kod girişi, liste, çıkar.
- i18n parçası `h` (12 satır × 6 dil). Denetçi `scripts/_smoke/dost-check.cjs` (gidiş-dönüş TR/AR/RU/ES adlar, bozulma reddi,
  göç, sınır, ağ/para yok, 6 dil).
- Doğrulama: 12 çekirdek rc=0; YANKI/DEFTER/ROMAN/KAN/GEÇ/DİVAN/RİTİM/PAYLAŞ/DOST TEMİZ; ÇIĞIR EŞİKLERİ TEMİZ.

## 20. Yerel APK (11 Ekim 2026, commit 1e8ad5c)

- Yöntem (öncekiyle aynı): `git archive HEAD` → `/tmp/kronikler-build2`, node_modules kopyası, `source ~/android-tools/env.sh`
  (OpenJDK 17, SDK 36, NDK 27.1), `CI=1 npx expo prebuild --platform android --clean`,
  `./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon` (6 dk 13 sn, BUILD SUCCESSFUL).
- Çıktı `dist/Kronikler.apk` (gitignore'da): 73.811.566 bayt, com.kronikler.app, versionCode 100, versionName 1.0.0, minSdk 24,
  yalnız arm64-v8a. İmza: **debug anahtarı** (CN=Android Debug, SHA-256 fac61745…3b9c) — yayın anahtarı kutuda yok; mağazaya uygun değil.
- Manifest'e paylaşım alma intent-filter'ı girmedi; expo-sharing / expo-file-system yerel sınıfları dex'te var.
- Son takım: 12 çekirdek rc=0, 9 yeni denetçi TEMİZ, ÇIĞIR EŞİKLERİ TEMİZ, ekonomi 80 rc=0, 300 hayat smoke HATA 0.

## 21. Yedek karşılaştırması ve varlık kurtarma (11 Ekim 2026)

- Kullanıcı oyuncu portreleri hariç yedekteki çalışmaları korumayı ve `apk` dalına göndermeyi istedi.
- 48 NPC portresi kurtarıldı; kimlik sabit, yaş evresi değişir. Oyuncu portreleri ayrı tutuldu.
- 63 gerçek ses kaydı kaynak/lisans dökümüyle kurtarıldı; mevcut 17 efekt ve ana tema bağlandı.
- 15 arka plan ve etiketler korundu; yeni sahne kaynakları gelmeden oynanışa bağlanmadı.
- `docs/DRIVE_KARSILASTIRMA.md`: kapsam, eksik dosyalar ve bu oturumun doğrulama sonuçları.
- `docs/SAHNE_DEVIR_NOTLARI.md`: eski sahne notları; mevcut kodun veya güncel testlerin kanıtı değildir.
- Açık engel: yedekte sahne v3 kaynakları, güncel oyun ekranı/motor değişiklikleri ve bağlamsal ses katmanı görünmüyor.
  Tam kaynak proje ZIP'i gerekli; yalnız görsel ve devir notuyla özgün sahne sürümü geri getirilemez.
- Doğrulama: mobil/sunucu tsc; kurtarma, i18n/ikon, dil karışması, göç, Dost, Paylaş, ölü karar denetimleri;
  300 hayat HATA 0; Android paketleme; 63 AAC ve 63 JPEG doğrulaması. APK/cihaz testi yapılmadı.

## 22. Oyuncunun çoklu yaş serisi seçildi (11 Ekim 2026)

- Kullanıcı tekli oyuncu adaylarını değil çoklu görseldeki aynı kişinin yaş serisini istedi.
- Gösterilen iki setten birincisi seçildi: `40_portre_turk.png` (keçe başlıklı erkek, işlemeli başlıklı kadın).
- Her cinsiyetin 7 evresi, soldan sağa sıra korunarak 200×200 PNG kırpıldı; yeni resim üretimi veya büyütme yok.
- `assets.ts` mevcut yaş sınırları korunarak bu 14 PNG'ye bağlandı. NPC'nin kimliğe bağlı üçlüleri değişmedi.
- Kaynak görsel `scripts/gorsel/kaynak/oyuncu-yas-seridi.png`; hücre düzeni ve sınırlar `assets/portre/KAYNAK.json`.
- `kurtarma-check.cjs` artık her oyuncu yaş sınırında cinsiyet/seri dosyasını da doğrular.
- Çocuk NPC'ler için arşivde kimliğe özel çocuk resmi yok; mevcut yaşa uygun genel çocuk portresi yolu korunur.

## 23. Yeni tasarım belgesi ve bağımsız ilerleme (11 Ekim 2026)

- Kullanıcı 25 sayfalık detaylı tasarım/devir PDF'ini verdi; çalışan kodla eşleştirme `docs/AUDIT.md`.
- Kullanıcı “Benim onayımı bekleme, yaptığın her şeyi onaylıyorum” dedi; rutin geliştirme/öneriler için yeniden soru yok.
- PDF eski Python/web varsayımlarını taşır; aktif Expo/TypeScript, ay takvimi ve 6 dil korunur. Hayat Hırsı yine kapalı.
- `docs/HANDOFF.md`, `docs/DECISIONS.md` ve 10 akış/3 sentetik kayıt davranış tabanı eklendi.
- 30 hayat / 20.136 ay eşikler temiz; üretim RNG'nin kayıtta olmadığı ve gerçek cihaz/oyuncu kabulünün açık kaldığı dürüstçe kaydedildi.

## 24. Ses ve sahne dalgası (12 Ekim 2026)

- `sound.ts` mevcut efekt API'sini ve ayar anahtarlarını koruyarak tembel mikser kullanır; bağımsız ortam kanalı eklendi.
- 21 ezgi / 15 ortam / 27 efekt katalogda, yaş-ekran-mevsim ve gerçek olay bağlamına bağlı.
- İlk izole efekt oynatıcı sayısı 17 → 1; normalde 2 döngü, geçişte ≤4, efekt ≤4. 200 geçiş ve iptal/arka plan/kapatma testleri temiz.
- 15 sahne resmi kartlara bağlandı; bilinmeyen tema nötr. 3D kartlar kaydırılır, sade mod ve animasyon temizliği yenilendi.
- `expo-linear-gradient ~56.0.4` eklendi; yeni tam APK gerekir, APK isteği/tetiklemesi yok.
- tsc/i18n/dil/kurtarma temiz; 10 davranış hash'i aynı; Android/Hermes export başarılı.
- 390 px / 4× CPU'da iş kararı → seçim → sonuç → günlük → ay ilerletme oynandı; TR/AR ayarlar incelendi.
- Web deneyi: çizim WASM başlatması test sunucusunda; hızlı ses aç/kapat sırasında web ses kütüphanesi iptal hatası. Son görsel akış sessiz/hatasız; fiziksel ses testi yapılmadı.
- Ayrıntı: `docs/SES_SAHNE.md`; sıradaki motor işi ortak neden dökümü ve kayıtlı RNG, bu dalgada motor/MP değiştirilmedi.
