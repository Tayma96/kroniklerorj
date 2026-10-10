# Kronikler: Küllerin Mirası

> 1247 Anadolu'sunda doğ, yaşa, öl — ve vârisinle devam et.

Kronikler, Kösedağ sonrası Moğol vesayeti altındaki Anadolu'da geçen, **nesiller boyu süren bir hanedan yaşam
simülasyonu ve anlatı RPG'si**. Yedi yaşında bir köy çocuğu olarak başlarsın; meslek seçer, ekmeğini kazanır,
evlenir, lonca basamaklarını çıkar, kan davasına tutuşur ya da taht kurarsın. Öldüğünde hikâye bitmez: servetin,
yeminlerin, düşmanlıkların ve yarım kalan destanın vârisine geçer.

**Ürün bugün:** `mobile/` altındaki Expo/React Native Android uygulaması. Tek oyunculu mod **tamamen çevrimdışı**,
reklamsız ve satın alımsızdır. İsteğe bağlı çok oyunculu "Diyar" modu (BETA) `server/` altındaki Cloudflare
Worker'da koşar.

*English:* Kronikler is a fully offline dynasty life-sim / narrative RPG set in 1247 Anatolia (Android, Expo/React
Native, 6 languages). Live a life month by month, make one meaningful decision at a time, die, and continue as your
heir. No ads, no purchases, no timers.

## Öne çıkanlar

- **Ay ay bir hayat:** 1 tur = 1 ay (tam ömür ~750 tur); her ay ana akışta tek büyük karar kartı (ikilem, fırsat,
  kapıya gelen insan, şenlik). Kısa oturuma göre tasarlandı.
- **Yaşayan dünya:** kalıcı nüfus kaydı (`s.pop`) — NPC'ler gerçekten evlenir, doğar, ölür, göç eder; meslek kadrosu
  arzı, arz fiyatı belirler. Rakip hanedanlar, valilik, taht, sefer.
- **Görünür sonuçlar:** NPC hafızası ve görüş sebepleri, dedikodu, nesil aşan "sonuç tohumları", ölü karar denetimi
  (hiçbir seçenek öbürünü her değerde yenmez).
- **Ana destan "Kül Yemini"** (16 sahne, 3 perde) + 30 hikâye yayı + "Kan Defteri".
- **15 meslek**, Ahilik usulü lonca sınavları, çıraklık, tezgâh kararları; mülk, kervan, iltizam, pazarlık.
- **6 dil:** Türkçe, İngilizce, İspanyolca, Portekizce, Arapça (RTL), Rusça — kadın oyuncu (`.f`) ve kadın NPC
  (`.k`) için ayrı biçimler, Rusça ad çekimi, dile göre çoğul ve yüzde.
- **Etik çizgi** (`TASARIM_PUSULASI.md`): zamanlayıcı yok, kayıp cezası yok, parayla atlatma yok, farm yok.
- Zayıf cihazlarda otomatik **sade mod**; kayıt cihazda (AsyncStorage) + yedek kopya + dışa/içe aktarma.

## Teknoloji

| Parça | Yığın |
|---|---|
| `mobile/` | Expo SDK 56, React Native 0.85, React 19, expo-router, Reanimated 4, Skia, react-native-svg, TypeScript 6 |
| Motor | `mobile/lib/game.ts` — saf TypeScript, her eylem `clone(prev) → mutasyon → return`; headless test edilebilir |
| i18n | `mobile/lib/i18n.tsx` (~8.200 anahtar × 6 dil) |
| `server/` | Cloudflare Worker + Durable Objects (`RealmDO`, `DirectoryDO`), wrangler 3 |
| CI | GitHub Actions: APK (hesapsız yerel derleme), AAB (Play), EAS, MP sunucu dağıtımı |

## Çalıştırma

Gereken: Node 20.19.4+ (ya da 22), npm.

```bash
cd mobile
npm ci
npx expo start            # Expo Go / geliştirme istemcisi ile
npx expo start --web      # tarayıcıda hızlı bakış (react-dom/react-native-web --no-save kurulmalı)
```

## Test ve denetimler (mobile/ içinden)

```bash
npx tsc --noEmit                                  # tip denetimi
node scripts/_smoke/i18n-icon-check.cjs           # 6 dil anahtar tamlığı + ikonlar → "SONUÇ: TEMİZ"
node scripts/_smoke/dil-karisma.cjs               # dil karışması → "DİL KARIŞMASI: TEMİZ"
node scripts/_smoke/olu-karar.cjs                 # ölü karar → "ÖLÜ KARAR: TEMİZ"
node scripts/_smoke/migrate-check.cjs             # eski kayıt göçü
node scripts/_smoke/run-parallel.cjs              # 300 hayatlık smoke, çekirdeklere bölünmüş → "HATA: 0"
node scripts/_smoke/diyalog.cjs                   # sohbet katmanları, 6 dil × 2 cinsiyet → "DİYALOG: TEMİZ"
node scripts/_smoke/ekonomi.cjs 80                # pasif/etkin/usta oyuncunun 20/40/60 yaş kesesi (denge ölçümü)
```

Sunucu: `cd server && npm ci && npx tsc --noEmit`. (`server/test/` canlı sunucuya bağlanır; bilerek koşulur.)
Kurallar ve tam doğrulama hattı: [`mobile/AGENTS.md`](mobile/AGENTS.md).

## Derleme ve dağıtım

- **APK:** GitHub → Actions → "APK (yerel derleme - hesapsiz)" → dal `apk`, kanal `latest`/`test`. Kalite kapısı
  (tsc + 300 hayat smoke + göç) geçmeden yayımlanmaz; çıktı `apk-latest` / `apk-test` Release'ine düşer.
- **AAB (Play):** "AAB (Play Store - imzali derleme)" — aynı kalite kapısı, imza secret'ları zorunlu.
- Sürüm numarası tek kaynaktan: `mobile/app.json` (`node scripts/surum-artir.cjs`).
- APK/AAB **git'e commit'lenmez** (`dist/` yok sayılır).
- Ayrıntı, imza secret'ları ve Play kontrol listesi: [`mobile/YAYIN.md`](mobile/YAYIN.md).

## Depo yapısı

```
mobile/                 Android uygulaması (aktif ürün)
  app/                  ekranlar (expo-router): oyun/*, cok-oyunculu/*, yeni-oyun
  lib/                  motor (game.ts), i18n, diyalog, nüfus, olaylar, yaylar, tema, ikonlar, MP istemcisi
  scripts/_smoke/       headless denetimler (smoke, i18n, dil karışması, ölü karar, göç, ekonomi, diyalog…)
  store/                mağaza görselleri ve gizlilik metni
  AGENTS.md YAYIN.md MAGAZA.md BASIN-KITI.md CEVIRI_DURUMU.md NUFUS.md SURUM-NOTLARI.md
server/                 çok oyunculu Diyar sunucusu (Cloudflare Worker)
docs/                   araştırma notları, MULTIPLAYER.md, SUNUCU-KURULUM.md
docs/arsiv/             eskimiş Haziran belgeleri (tarih kaydı)
legacy/                 arşivlenmiş web dönemi (FastAPI backend, React frontend) — ürünün parçası değil
KRONIKLER GDD v8 SAHNE.md   sunum/his için aktif otorite
KRONIKLER GDD v7 MASTER.md  sistem anayasası
TASARIM_PUSULASI.md     tasarım ilkeleri, oynanış ölçütleri, yeni özellik süzgeci (bağlayıcı)
OTURUM_HAFIZASI.md      son kararlar, kalıcı kurallar, açık işler
YOL_HARITASI.md         yayın yol haritası
```

## Dal kuralı

Geliştirme ve yayın **`apk`** dalındadır (varsayılan dal). Commit mesajları Türkçe, tek satır.

## Lisans

Özel (proprietary) proje, tüm hakları saklıdır — bkz. [`LICENSE`](LICENSE); depo herkese açık değildir.
Üçüncü taraf yazı tipleri (OFL), simgeler (game-icons.net, CC BY 3.0), yapay zekâ görselleri ve MIT kütüphaneler
kendi lisanslarıyla kullanılır: [`mobile/UCUNCU-TARAF.md`](mobile/UCUNCU-TARAF.md) ve oyunda **Ayarlar → Emeği Geçenler**.
