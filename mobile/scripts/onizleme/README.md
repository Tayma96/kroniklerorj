# Tarayıcı önizlemesi ve ekran görüntüsü araçları

Bağımlılıklar (bir kez, oturum başına): `mkdir -p $SP/webview && cd $SP/webview && npm i react@19.2.3 react-dom@19.2.3 react-native-web@0.21.2`
(`$SP` = oturumun scratchpad klasörü). Playwright ve Chromium bulut makinesinde hazırdır.

1. Paket: `cd mobile && KRONIKLER_PREVIEW_DEPS=$SP/webview node scripts/design-preview.cjs $SP/webview/<ad>`
2. Ekran görüntüsü: `cd $SP && S=$SP DIR=$SP/webview/<ad> node <depo>/mobile/scripts/onizleme/snapdir.cjs sayfa/<onek> 390 "screen=/oyun/karakter" "screen=/online/yasam&lang=ar"`
   (`full=1` tam sayfa; genişlik 320/390).
3. Sinematik kareleri: `S=$SP/cine DIR=$SP/webview/<ad> node <depo>/mobile/scripts/onizleme/sinematik-kareleri.cjs tr390 390`
4. Çevrimiçi ayrım taraması (mobile/ içinde): `python3 scripts/onizleme/ictarama.py app/online/*.tsx lib/online/*.ts lib/online/*.tsx`
   — "ULASIYOR" satırı çıkmamalı (çevrimiçi kod tek oyunculu store/game/nufus'a ulaşmaz).

Önizleme reanimated'i durağan taklit eder: zamanlanmış animasyonlar ilk karede görünür; cihazdaki davranışın yerine geçmez.
