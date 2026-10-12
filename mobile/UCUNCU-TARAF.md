# Üçüncü Taraf Bileşenler ve Lisanslar

Oyunun kendisi özeldir (bkz. kökteki `LICENSE`). Aşağıdakiler kendi lisanslarıyla kullanılır.
Oyun içinde aynı bilgi **Ayarlar → Emeği Geçenler** ekranında (`app/oyun/emek.tsx`) gösterilir.
Son denetim: 10 Ekim 2026.

## Yazı tipleri — SIL Open Font License 1.1
| Yazı tipi | Telif | Paket |
|---|---|---|
| Cinzel | © 2020 The Cinzel Project Authors (github.com/NDISCOVER/Cinzel) | `@expo-google-fonts/cinzel` |
| Crimson Text | © 2010 The Crimson Text Project Authors (github.com/googlefonts/Crimson) | `@expo-google-fonts/crimson-text` |

OFL tam metni paketlerin `LICENSE_FONT` dosyalarındadır (`node_modules/@expo-google-fonts/*/LICENSE_FONT`).
Yazı tipleri değiştirilmeden, uygulamaya gömülü olarak dağıtılır; ayrı satılmaz (OFL buna izin verir).

## Simgeler — game-icons.net, CC BY 3.0
54 simge `lib/icon-paths.ts` içinde SVG yol verisi olarak durur (kaynak: `legacy/frontend/public/images/game-icons/`).
**Değişiklik:** altın tona boyanır ve yeniden boyutlandırılır (CC BY değişikliğin belirtilmesini ister).
Lisans: https://creativecommons.org/licenses/by/3.0/

Adı game-icons deposunda tek yazara denk gelenler (github.com/game-icons/icons ağacıyla eşleştirildi):
- **Delapouite:** amphora, backpack, bread, camel, fishing, graduate-cap, healing, house, kite, prayer-beads, prisoner, ring, sheep, speaker, walk, wool
- **Lorc:** compass, crossed-swords, gems, hood, hourglass, lyre, medal, scales, trophy, wheat
- **Carl Olsen:** flame

Yazarı adla kesinleşmeyenler (yerel dosya adı değiştirilmiş ya da birden çok yazarda aynı ad var; olası yazarlar Lorc, Delapouite, Skoll, Sbed):
anvil, baby, banner, beer, book, boot, bow, bucket, castle, cog, coins, crown, family, fist, herbs, leaf, map, party,
potion, saw, scroll, scroll-open, shield, skull, star, sun, tombstone.
→ **Yapılacak (insan):** bu 27 simgenin game-icons.net'teki asıl sayfası bulunup yazarı bu listeye eklenmeli.
O zamana kadar atıf toplu yapılır: "game-icons.net — Lorc, Delapouite, Carl Olsen, Skoll, Sbed ve katkıcılar".

## Görseller — yapay zekâ ile üretildi
Portreler, hero sahneleri, armalar, mülk/mektep görselleri ve harita zemini (`assets/`) üretken modellerle yapıldı:
- **SD-Turbo** (Stability AI) — `legacy/frontend/tools/gorsel_uret_yerel.py`. Lisans: Stability AI Community License
  (5 Temmuz 2024). Çıktıların sahipliği kullanıcıdadır. Lisans, ürünle ilgili bir yerde **"Powered by Stability AI"**
  ibaresini ister — Emeği Geçenler ekranında var. **Ticari kullanımda** (Play'de ücretli/ reklamlı yayın vb.)
  https://stability.ai/community-license adresinden **ücretsiz kayıt** gerekir ve yıllık gelir 1 milyon USD'yi
  aşarsa kurumsal lisans gerekir. → **Yapılacak (insan):** yayından önce kayıt.
- **FLUX.1 [schnell]** (Black Forest Labs, Apache 2.0) — `scripts/gen_assets.py` (Cloudflare Workers AI);
  Haziran 2026'da portreler bununla yenilendi. Çıktılar üzerinde kısıt yoktur.
- Hangi dosyanın hangi modelden çıktığı git geçmişinden tam ayrıştırılamıyor; ikisi birlikte anılır.

12 Ekim 2026'da eklenen dört `npc/*yas-atlas-v1.png`, mevcut yetişkin yüzlerinden üretilen yeni çocuk/ergen serileridir;
yukarıdaki eski üretim atıflarına dahil değildir. Dosya özeti, referans kimlikleri, yerleşim ve tam üretim yönergeleri
`assets/npc/YAS_KAYNAK.json` içinde tutulur. Müze ve kazı yayınları dönem yönünü kontrol etmek için okunmuştur;
bu yayınların görselleri oyun varlığı olarak kopyalanmamıştır.

## Sesler ve müzik
`assets/ses/` — yedekten kurtarılan 63 gerçek kayıt: 21 müzik, 15 ortam ve 27 efekt.
21 ezgi, 15 ortam ve 27 efekt bağlamsal katalogdadır; yaş, mevsim, ekran ve olay geçişlerine bağlanmıştır.
Dosya bazında kaynak, yazar, lisans ve uygulanan işlemler: `assets/ses/LISANS.md` ve `assets/ses/kaynak.json`.
Paket CC0 1.0, CC BY 3.0/4.0 ve kaynak dökümünde kamu malı olarak belirtilen kayıtlar içerir.
Oyun içindeki Emeği Geçenler ekranı kaynak adını, yazarı, kaynak/lisans adreslerini ve değişiklik açıklamasını gösterir.
Eski `assets/sfx/` dosyaları korunur; mevcut ses oynatıcısı yeni kayıtları kullanır.

## Yazılım (uygulamaya giren doğrudan bağımlılıklar)
Tümü MIT: expo, expo-router, expo-audio, expo-constants, expo-font, expo-haptics, expo-linking, expo-navigation-bar,
expo-splash-screen, expo-status-bar, react, react-native, react-native-reanimated, react-native-worklets,
react-native-gesture-handler, react-native-screens, react-native-safe-area-context, react-native-svg,
@shopify/react-native-skia, @react-native-async-storage/async-storage.
Dolaylı bağımlılıkların tam dökümü gerektiğinde: `npx license-checker --production --summary` (mobile/ içinde).

## Expo proje şablonu
Proje iskeleti Expo şablonuyla başlatıldı; şablonun MIT bildirimi `mobile/LICENSE` içinde korunur.
