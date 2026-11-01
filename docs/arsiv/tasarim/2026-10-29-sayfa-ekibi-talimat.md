# Sayfa ekibi talimatı (10 paralel ajan)

Her ajan TEK sayfayı profesyonel mobil oyun kalitesine getirir. Kullanıcı: "düz metin gibi,
web sitesi gibi olmasın"; tasarım dili `mobile/assets/tasarim/claude-paket/mockup_full.png`
(aydınlık resimli sahne, altın çerçeveli yarı saydam paneller, madalyon ikonlar, Cinzel + Crimson).
Örnek alınacak yeni sayfalar: `mobile/app/index.tsx` (giriş), `mobile/app/yeni-oyun.tsx`
(3 adım), `mobile/app/oyun/npc/[id].tsx` (söz perdesi, madalyon eylemler), `mobile/lib/home-mockup-ui.tsx`.

## Kontrol listesi
- Görsel: tam ekran sahne (`ScreenFresk` ya da sayfaya uygun `assets/arka`, `hero`, `tasarim/v4`
  resmi); karanlık boş alan yok.
- Tasarım: bilgi hiyerarşisi net, uzun listeler gruplu/sekmeli, her eylem açıkça görülür; dokunma
  ≥ 44 pt; 320 px'de taşma yok; emoji ve ♂♀ gibi işaretler yerine `GameIcon`.
- Ses: mevcut yardımcılar (`playTap` vb.); yeni ses dosyası ekleme.
- Diyalog/metin: kısa, oyun dilinde; yeni her metin 6 dilde.
- Animasyon: reanimated giriş ve dokunma geri bildirimi; `useSadeMod` açıksa kapalı.
- Erişilebilirlik: `accessibilityRole/Label/State`; RTL (ar) bozulmasın.
- İşlev kaybı YOK: sayfadaki her eylem, bilgi ve yönlendirme korunur (yeri değişebilir).

## Dokunma sınırları (çakışmasın diye)
- Düzenlenebilir: yalnız kendi sayfa dosyan(lar)ın, yeni dosyalar için `mobile/lib/sayfa/<sayfa>/`,
  çeviriler için yalnız `mobile/lib/i18n-sayfa/<sayfa>.ts` (anahtar öneki `<sayfa>.`).
- Dokunma: ortak bileşenler (`lib/ui.tsx`, `lib/ornament-ui.tsx`, `lib/theme.ts`, `lib/icons.tsx`,
  `lib/home-*.tsx` — ana sayfa ajanı hariç), motor (`lib/game.ts`, `lib/*` mantık dosyaları),
  `lib/i18n.tsx`, `lib/i18n-flow.ts`, `package.json`, başka sayfalar, `docs/`. Ortak bir değişiklik
  gerekiyorsa raporda öner.

## Çalışma
1. Kurulum (worktree'de): `ln -s /home/user/kroniklerorj/mobile/node_modules mobile/node_modules`.
2. Sayfayı ve bağlı bileşenleri oku; önce/sonra ekran görüntüsü al.
3. Önizleme: `cd mobile && KRONIKLER_PREVIEW_DEPS=$SP/webview node scripts/design-preview.cjs $SP/webview/<sayfa>`
   sonra `cd $SP && S=$SP DIR=$SP/webview/<sayfa> node snapdir.cjs sayfa/<sayfa>-sonra 390 "screen=<rota>"`
   (ve 320). `$SP=/tmp/claude-0/-home-user-kroniklerorj/c519a9f5-cfce-5229-98c4-72e1209e4be2/scratchpad`.
   Rota örnekleri: `screen=home`, `screen=/oyun/karakter`. Önizleme tasarım kaydıyla açılır.
4. Doğrulama (mobile/ içinde): `npx tsc --noEmit`, `node scripts/_smoke/i18n-icon-check.cjs`,
   `node scripts/_smoke/dil-karisma.cjs`, `node scripts/check-screen-design.cjs`, `git diff --check`.
5. Ekran görüntülerini profesyonel tasarımcı gözüyle eleştir, en az bir tur düzelt.
6. Worktree dalında TEK commit (Türkçe, tek satır, araç adı yok). Push YOK.
7. Rapor (≤ 250 kelime): değişen dosyalar, yeni anahtarlar, kontrol sonuçları, ekran görüntüsü yolları,
   önemli tasarım kararları, ortak bileşen önerileri.
