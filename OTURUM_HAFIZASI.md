# Oturum Hafızası — Kronikler geliştirme penceresi

> Konuşma bağlamı sıkıştırıldığında ya da konteyner eski bir anlık görüntüye döndüğünde kaybolmasın diye tutulan
> devir notu. Yeni bir oturum önce bunu, sonra `mobile/AGENTS.md` ve `TASARIM_PUSULASI.md`'yi okur.
> Son güncelleme: 10 Ekim 2026 · dal **`apk`** (geliştirme ve yayın) · 7 Ekim penceresinin son commit'i `0c6f566`.

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
