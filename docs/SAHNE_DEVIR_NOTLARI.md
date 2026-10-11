# Sahne sürümü — yedekten kurtarılan devir notları

Bu notlar uygulamanın mevcut davranışı veya bu oturumda koşulmuş test sonuçları değildir.
Kaynak dosyaları erişilebilir yedekte görünmediği için yeni sahne sürümü henüz entegre edilmedi.
Aşağıdaki eski sonuçlar yalnız yedeğin iddialarıdır; tekrar doğrulanmalıdır.

## 21. SAHNE SAHNE YAŞANAN HAYAT (görünür oynanışın yeniden kurulması)

Motor aynı; görünen yüz değişti. Ayın tek büyük anı artık tam ekran bir **sahne**: arka plan (bağlama göre hero/mülk/mektep),
konuşanın portresi (NPC tonu/çevirmesi), adı ve yakınlığı, satır satır daktilo metni (dokun: tamamla/sonraki, » atla),
2–4 seçim, ardından **sonuç vuruşu** (olay satırları + konuşanın tepkisi + yaylanarak gelen çipler: akçe, itibar, şeref,
sağlık, ün, gönül ±, "Yankı: bu hatırlanacak", kin/minnet, barış, açık hasım).
- `lib/sahne.ts` (saf): `ikilemSahnesi` (ikilem/yay/orta/son/şenlik kartı → sahne; ikilemin insanı kart açılırken seçilir
  `ikilemKisisiSec`, aynı kişi `applyDilemma(..., kisiId)` ile hatırlar), `kapiSahnesi` (eski kapı penceresinin hesabı birebir),
  `donusBeat/donusSahnesi/onsozEkle/ayinDonusleri` (Yankı ve Kan Hafızası dönüşleri — geçmişi **adıyla ve o günkü yaşla** anar),
  `sonucBeat` (önce/sonra farkı → çipler), `sahneKilitsiz`, `satirMetni` (.f oyuncu, .k konuşan kadın).
- `lib/sahne-amiral.ts`: 12 elle yazılmış 3 vuruşlu, ortada dallanan amiral sahne — karta bağlı 7 (cocuk_cirak, orta_ana,
  orta_miras, son_olmeden, son_vasiyet, son_kardes, son_dost: son seçimler kartın kendi seçimleri) + olaya bağlı 4
  (evj.pestamal, ilk evlat, ana/baba ölümü, hatir.hasim — küçük iki yönlü delta, iz `dil:amiral_<id>`) + dünür kapısı (kabul/ret).
- Motor: `GameEvent.sh` sahne ipucu (yankiTick/hatirTick dönüşlerine `{t, iz|kay, yon, id, ata}`), `IKILEM_ROL` dışa açık,
  `GameState.sahneler` (Hayat Şeridi kaydı ≤120) + `bolum` (son gösterilen bölüm kartı); migrate ikisini ayıklar, eski kayıtta
  şimdiki bölümü işaretler (perde yeniden açılmaz).
- `lib/sahne-ui.tsx`: `SahneOynatici`, `BolumKarti` (Çocukluk/Gençlik/Çıraklık/Ustalık/Olgunluk/Yaşlılık, hero görseli).
- `app/oyun/index.tsx`: `ayinSahnesiniKur` (önce amiral an, yoksa motorun kartı; dönüşler önsöz, kart yoksa kendi sahnesi;
  ayda tek sahne — kapı istisnası motordaki gibi), `sahneSec` (motor aynen + Şerit kaydı + sonuç), kapıdaki insan sahne olarak,
  "Sakin ayları geç" (≤6 ay; dönüm/kapı/hesap/sahne/dönüş/açlık<40/sağlık<40/bölüm geçişinde durur; MP'de kapalı).
- `app/oyun/serit.tsx` Hayat Şeridi (menü "Kayıt & Anı", ilk sahneden sonra açılır).
- i18n parçası `n` (275 anahtar × 6 dil + .f/.k varyantları): `python3 /tmp/kr/gen_cigir.py a y s r k w g d c l p h n`.
- Denetçi `scripts/_smoke/scene-check.cjs` (all.sh listesinde): her kart/kapı/amiral/dönüş türü 6 dil × cins × konuşan cinsi,
  ham anahtar yok, kilit yok, her son seçim sonuç vuruşu üretir, dönüşler başlık/yaş/ata adını anar, hayatlar sahne sahne oynanır.
- Divan: "Duruşmayı sahne olarak dinle" (hüküm verilmemiş davada) → `divanSahnesi(id,no)`: kâtip arzuhali okur, davacı ya da
  kasaba dinlenir (dal), üç hüküm yolu; sonuç satırları Divan'ın kendi metinleri (hükmün, kasabanın aynı yoldaki payı, lakap
  yalnız addır). Hüküm yine yalnızca `kronik_divan` kaydına yazılır; oyun durumuna dokunmaz. scene-check her davayı çizer.
- Oyun ekranı kayıt yüklenmeden açılırsa (web/derin bağlantı) ilk gelen durum zar atmadan eşitlenir (`rollHazir`): eskiden
  `rs=0` ile tüm geçmiş "bu ay" sayılıp açılışta amiral/dönüş sahnesi kurulabiliyordu.
- Hayat Şeridi: seçim metni çözülemezse "Seçimin:" boş kalmaz, "dinledin" satırına düşer.
- Ekran görüntüsü yolu (araç kurulumu repo dışında): /tmp/kronikler-web (çalışma ağacı kopyası + `npm i --no-save react-dom@19.2.3
  react-native-web@~0.21`) → `npx expo export --platform web` → /tmp/kr/shot/serve.cjs (SPA sunucu :8765) + puppeteer-core ile
  /usr/bin/google-chrome; kayıt /tmp/kr/shot/gen.cjs ile üretilip localStorage'a yazılır. Çıktı /workspace/kr-sahne/.
- Smoke sahneyi de sürer: `run.cjs` her ay arayüzün kuracağı sahneyi kurar (amiral → kart+önsöz → dönüş; kapı ayrıca), rastgele
  bir yoldan oynar, motorda uygular, Şerit'e yazar, sonuç vuruşunu üretir; hata "SAHNE AKIŞI HATASI" sayılır. Paket
  `SMOKE_SAHNE` (run-parallel anlık görüntüsü) ya da run.cjs kendi kurar; `SMOKE_SAHNE=0` kapatır. Çıktıda "N sahne oynandı".
- Sahne adımı kapanış doğrulaması (175ded8 üstünde): 12 çekirdek denetim + 10 denetçi (scene-check: 24 hayat, 11403 sahne,
  4745 dönüş vuruşunun hepsi geçmişi anıyor) + oynanış TEMİZ; ekonomi 80 rc=0; 300 hayat smoke 131224 sahne, HATA 0, ölüm
  medyanı 64. APK yeniden kuruldu (debug imzalı, 1.0.0/100, arm64-v8a). Web ekran görüntüleri /workspace/kr-sahne/ (46 adet).

### 21.1 Sahne oynatıcısı cilası (v2)
- Arka plan: kare görsel üstte tam genişlikte (`h = min(1.12·en, 0.6·boy)`; uzun telefonda dükkân/kervan kırpılmaz), alt kenarı
  `expo-linear-gradient` (yeni bağımlılık, SDK 56) ile düz koyu zemine (rgb 8,5,2) erir — eski iki katmanlı bant kenarları yok.
  Ken Burns çok hafif (≤%5, ±7px). Bölüm kartı da aynı arka planı kullanır.
- Konuşan: 104px portre, altın halka + parıltı, nefes; sahnenin kuruluş satırlarında da görünür (anlatıcı satırında soluk),
  sonuçta da. `Portre` yeni `nefes` prop'u: büyük boyda NPC varyantı (ton/çevirme) korunur. Anlatıcı satırında tüy kalem
  ikonu (`quill`, game-icons quill-ink, CC BY 3.0, icon-paths'e eklendi).
- Çipler: 12.5pt, 15px ikon, kalın kenar; 170ms aralıkla sırayla yaylanarak gelir.

### 21.2 Kalan eski pencereler sahneye taşındı (oyun yüzeyi tek dilde)
- Fırsat (eski 3D kart + hüner mini oyunu) → `firsatSahnesi`: iş sahibi (rol `sahne.rol.isveren`, portreli) teklif eder; "Üstlen —
  %stat sınaması" seçilince sahnenin içinde **hüner anı** (`HunerAni`, bölge genişliği eski kartla birebir: 16+stat·4−risk·12,
  %12–64) → `resolveOpportunity(basari)`; "Bu sefer geç" etkisiz kapanır (Şerit'e yazılmaz). Önsöz dönüşleri eklenebilir.
- Tezgâh (mesleğin kararı, eski DilemmaModal) → `tezgahSahnesi`: kart metni + iç ses, riskli yolda şans %, hüner yolu kilitliyse
  kapalı seçim gereğini söyler (`tz.lock`); `resolveTezgah(i)`. İş yapınca effect açar (başka sahne/hesap açıkken bekler).
- Ay içi küçük an (panodaki iki düğmeli kutu) → panoda tek satır "Bir an seni bekliyor ▸"; dokununca `mikroSahnesi` (iki yol +
  "Geç"); eskisi gibi atlanabilir, açılır pencere değil (ayın sahnesi sayılmaz). `resolveMicro(c)`.
- Dönüm noktası (MilestoneModal) → `donumSahnesi`: başlık `ms.<tür>` (yoksa `ms.genel`), metin olayın kendisi, tek "Hayat sürüyor".
- Sonuç çiplerine `gelisim` (beceri/özellik xp arttı) ve `nam` (nam değişti) eklendi — küçük anlar da iz gösterir.
- Kaldırılan yollar: index'te `opp` durumu, `OpportunityModal`, `MilestoneModal`, tezgâh `DilemmaModal` dalı (bileşenler ui/kart3d'de
  duruyor; başka ekranlar kullanabilir). SinavKarti (lonca yarışı/peştamal) ve HesapModal değişmedi.
- i18n: n6.py (15 anahtar × 6 dil, AR dişil oyuncu varyantları). scene-check: 26 fırsat (başarı/başarısız), 60 tezgâh kartı ×
  (kilitli/hünerli), 47 küçük an, hayatlarda dönüm sahneleri; oyuncunun açtığı tezgâh/küçük an "ayda tek sahne" sayımına girmez.
  run.cjs: fırsat sahnesi + hüner sonucu, tezgâh sahnesi, küçük an sahnesi de oynanır.
- v2 kapanış doğrulaması (1a0648b): 12 çekirdek + 10 denetçi + oynanış TEMİZ (40 hayat: 19070 sahne, 0 hata; scene-check 24 hayat
  14717 sahne, 4967 dönüşün hepsi geçmişi anıyor); ekonomi 80 rc=0; 300 hayat 150431 sahne, HATA 0, ölüm medyanı 64.
  APK yeniden kuruldu (expo-linear-gradient otomatik bağlandı), md5 e94fb17c…2863. v2 ekran görüntüleri /workspace/kr-sahne/v2/.

### 21.3 v3 — NPC portre havuzu (BEKLİYOR) ve 6 yeni amiral sahne
- **Bölüm A (NPC portre havuzu) yapılmadı:** bu oturumda görsel üretim aracı (GenerateImage) erişilebilir değildi; kural gereği
  havuz/eşleme/npc-portre denetimi ertelendi. NPC'ler hâlâ oyuncu portre setini (ton/çevirme varyantıyla) kullanıyor.
- **Bölüm B:** `sahne-amiral.ts` 12 → 18 amiral sahne (hepsi 3 vuruş, ilk vuruşta dallanma, 3 son seçim; baskın seçim yok):
  `dugun` (ilk evlilik olayı: evj.marryNpc/betrothWed/houseMarryAccept; konuşan eş, eş yoksa kurulmaz), `goc` (ilk yolculuk,
  15+ yaş; konuşan ana, yoksa yaşlı akraba), `cirak_usta` (evj.cirak.pestamal[_k]; konuşan çırağın kendisi, cinsi anahtardan),
  `kitlik` (evj.scarcity, 14+; Kösedağ sonrası Moğol tahsildarı; konuşan yoksul kadın), `miras` (kardeşin miras payı kapısı —
  amiralKapi; kabul/ret motorun npcTeklifYanit'ı, kese yetmezse kabul kapalı), `ahi_yol` (tüccar/demirci loncasına katılış;
  Ahi Baba, yeni rol `sahne.rol.ahi`). Arka planlar mevcut görsellerden (mulk:ev/dukkan/degirmen/han, hero).
- **Anma:** v3 sahneleri `anma: "minnet"|"kin"` taşır → `anmaSatiri()` ilk vuruşa geçmiş satırı sokar: yaşayan hatır sahibi
  (tercih edilen yön önce; konuşanın kendisi hariç) adıyla + o günkü yaş + olayın adı (`sahne.kay.*`), yoksa ≥1 yıllık Yankı
  kararı (`izBaslik`) günü ve yaşıyla (`amr.anma.iz`); geçmiş yoksa satır yok.
- **Bir ömürde bir kez:** `Player.amiral_gor?: string[]` (applyDilemma "amiral_<id>:" tohumunda yazılır; hafıza 80 / şerit 120
  kırpılınca da kalır; vâris yeni oyuncu nesnesi olduğu için sıfırdan başlar; migrate bozuk değeri siler). `amiralGoruldu()`.
- Final seçimleri artık `prm` alır (miras "−%2"); `FinalSecim.kapali`, `AmiralTanim.ilk` (kapının ilk satırı), `sahipli`.
- i18n: /tmp/kr/sahne/n7.py (89 anahtar × 6 dil + 51 dişil oyuncu varyantı: AR emir/2. şahıs, ES/PT "maestra/mestra",
  RU "мастерица"); build.py n7'yi alır; üretim `python3 /tmp/kr/sahne/build.py && python3 /tmp/kr/gen_cigir.py a y s r k w g d c l p h n`
  (parça listesi şart — argümansız çalıştırma i18n-cigir.ts'i boşaltır).
- scene-check: 6 yeni olay fikstürü, amiral ≥18; her anma sahnesi için (a) geçmiş yok → satır yok, (b) hatır → ad/yaş/olay,
  (c) Yankı izi → kararın adı, (d) aynı ömürde ikinci kez oynamaz; hayat simülasyonunda amiral dağılımı yazılır.
- Sinematik geçiş için not: pakette Reanimated 4.3.1 (+ worklets 0.8.3), @shopify/react-native-skia 2.6.2 (şimdilik yalnız
  lib/skia.tsx ve kart-paylas), expo-linear-gradient ve gesture-handler var; cihaz eğimi için expo-sensors yok (eklenmeli).
  Bu turda yeni arka plan üretilmedi (görsel aracı yok); katmanlı üretim için istemler scripts/gorsel/prompts.py'de tutulmalı.

### 21.4 v3 — NPC portre havuzu bağlandı + arka plan etiketleri / tekrar önleme
- **Havuz:** `assets/npc/{e|k}{01..08}_{genc|olgun|yasli}.jpg` (48 dosya, 512×512; kullanıcı üretti) = 16 kimlik, her biri aynı
  insanın ~22/~47/~71 hâli. Kontak sayfası /workspace/kr-npc/npc-havuz.jpg. Arketipler `lib/npc-portre.ts NPC_KIMLIKLER`.
- **Eşleme (saf, lib/npc-portre.ts):** `npcKimlik(tohum, cins, rol?, haric?)` — FNV-1a+karıştırıcı hash; rolsüz havuz e05 HARİÇ
  (sarıklı âlim yalnız imam/kadı/kâtip/müderris/hoca rolüne). Rol tercihleri `ROL_KIMLIK` (imam→e05, yoksul/dilenci→e06/k05,
  ahi→e01, usta→e01/k01, esnaf→e02,e01/k06,k02, işveren/tüccar→e02/k02, ırgat→e06/k08, ulak/asker→e03, çoban/yolcu→e04/k04,
  ebe→k03, ozan→e07, bey→e08/k07…). **Nüfustaki gerçek kişi (kisiId) rol almaz** — meslek değişse de yüz ömür boyu aynı kalsın;
  rol yalnız isimsiz figürlerde (amiral imamı, Ahi Baba, kıtlıktaki yoksul kadın…). Evre `npcEvre`: <16 havuz dışı (eski portre
  seti + ton/çevirme), <35 genc, <60 olgun, 60+ yasli. `sahneKimlikleri()` bir sahnenin konuşanlarına (sahne geneli + vuruş
  konuşanları, `sahneKonusanlari`) sırayla dağıtır: iki farklı NPC havuz yettikçe aynı yüzü almaz (yalnız o sahnede kaydırılır).
- `Portre` (lib/ui.tsx): seed verilen ve 16+ NPC'de havuz görseli (ton/çevirme yok), `rol`/`kimlik` isteğe bağlı; oyuncu
  (seed yok) assets/portre'de kalır. Sahne başlığı kimliği sahne haritasından alır. Kalıcı alan yok → göç gerekmedi.
- **npc-portre-check.cjs:** 48 dosya/512²/require; belirlenimcilik (25.600 sorgu); 72 yıllık hayatta 1340 kişi × her yıl —
  yüz hiç değişmez, evre ilerler (1058 geçiş), cins tutar, gerçek kişi e05 almaz; e05 yalnız âlim rolünde; rol arketipleri;
  500 çok-NPC sahnede çakışma yok; aynı hash yüzlü iki kişi / iki imam figürü sahnede ayrılır; çocuk havuza girmez.
- **Arka plan (lib/arka.ts):** `ARKA_TABLO` (28 görsel: 16 hero + 7 mülk + 5 mektep) durum etiketli, mevsimli; `arkaSec`:
  sahne etiketleri (Sahne.etiket, öncelikli) + eski anahtarın katmanları (`arkaEtiketleri`; "hero" → manzara_<yaş kuşağı>,
  manzara) → mevsim süzgeci (kar görseli yalnız kışın) → son 3 sahnenin arkası (Şerit kaydı `SahneKaydi.a`) katmanda başka aday
  varsa atlanır → sahne+tur tohumuyla seçim. index.tsx sahne açılırken bir kez seçer (useMemo), kayda `a` düşer; migrate bozuk
  `a`yı siler. Yeni görsel: assets/arka/<ad>.jpg + ARKA_TABLO satırı + assets.ts ARKA_DOSYA satırı (iki tablo; arka-check sınar).
  Sahneler bazı etiketleri şimdiden istiyor (dogum, cenaze, vedalasma, imece, savas, yayla, coban) — görsel gelince devreye girer.
- **arka-check.cjs:** tablo↔dosya↔require; istenen etiketler her mevsimde doğru etikete çözülür; 16 hayat (~8200 sahne):
  alternatif varken tekrar 0, kış dışı kar görseli 0, belirlenimci; eski/yeni çözüm kullanım tablosu (/tmp/kr-arka-sayim.json).
- Önerilen 16 yeni arka plan (üretilmedi): `scripts/gorsel/arka_v3.py` (ad, etiket, ön/orta/arka katman, ışık; `istem()`).
- goc-fuzz ara sıra "null p.name" ile düşüyordu (rastgele bozma) → migrate adı/soyadı onarır.
- Ekran görüntüleri: /workspace/kr-sahne/v3/ (geçici `app/devsahne.tsx` yalnız /tmp/kronikler-web kopyasında; depoya girmez).
