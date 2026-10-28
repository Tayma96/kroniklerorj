---
name: sayfa-gelistirme
description: Kronikler'de bir sayfayı (giriş, yeni oyun, ana sayfa ve diğerleri) baştan sona en iyi hâle getirme akışı — görsel, tasarım, ses, diyalog, animasyon, 6 dil. Kullanıcı bir sayfayı geliştirmeyi, "sıradaki sayfa"yı ya da sayfa sırasıyla ilerlemeyi istediğinde kullan.
---

# Sayfa geliştirme akışı

Kullanıcı kararı (28 Ekim 2026): oyun sayfa sayfa geliştirilir. Sıra:
1. Giriş (`mobile/app/index.tsx`: yeni oyun, tek oyunculu, çok oyunculu)
2. Yeni oyun (`mobile/app/yeni-oyun.tsx`: ad, cinsiyet, tabiat, ocak)
3. Ana sayfa (`mobile/app/oyun/index.tsx`)
4. Diğerleri, `docs/SAYFA_DENETIMI.md` sırasıyla

Her sayfada görsel, tasarım, ses, diyalog ve animasyon en iyi hâline getirilir.
Bitmeden sonraki sayfaya geçilmez. Durum `docs/SAYFA_DENETIMI.md` tablosunda tutulur.

## Akış (Superpowers)

1. **Envanter (alt ajan):** `code-explorer` sayfanın bileşenlerini, motor çağrılarını,
   metin anahtarlarını, görsellerini ve seslerini 30 satırlık özetle döndürür.
   Ana bağlam dosyayı okumaz. Ekran görüntüsü 320 ve 390 px'de alınır.
2. **Kısa beyin fırtınası (`brainstorming`):** Kullanıcıya bulguları ve tek soru.
   Görünüm sorularında görsel önizleme sun. Her soruda tek konu.
3. **Tasarım belgesi:** `docs/superpowers/specs/YYYY-AA-GG-<sayfa>-design.md`, kullanıcı onayı.
4. **Plan (`writing-plans`):** `docs/superpowers/plans/…`, görevler dosya bazında ayrık.
5. **Uygulama (`subagent-driven-development`):** Görev başına bir uygulayıcı alt ajan;
   ardından `react-reviewer` ya da `typescript-reviewer`, gerekirse `a11y-architect`.
   Bağımsız görevler paralel (`dispatching-parallel-agents`).
6. **Doğrulama (`verification-before-completion`):** `npx tsc --noEmit`,
   `node scripts/_smoke/i18n-icon-check.cjs`, `node scripts/_smoke/dil-karisma.cjs`,
   `node scripts/check-screen-design.cjs`, önizleme ekran görüntüleri 320/390.
   `game.ts` değiştiyse `mobile/AGENTS.md`deki sıra. Smoke yalnız istenirse.
7. **Commit:** `apk` ve oturum dalı, Türkçe tek satır. Sonra kullanıcıya ekran görüntüsü.

## Her sayfanın kontrol listesi

- **Görsel:** Tam ekran sahne (`ScreenFresk`), karanlık boşluk yok. Eksik görseller
  `docs/GORSEL_LISTESI.md`ye ölçüsüyle eklenir.
- **Tasarım:** `claude-paket/mockup_full.png` dili ve ölçüleri; dokunma alanı ≥ 44 pt;
  320 px'de taşma yok; emoji yerine `GameIcon`.
- **Ses:** Ortam sesi ya da müzik ve dokunma efektleri (`docs/SES_SAHNE.md`). Üretim için
  `ses-uretimi` skill'i.
- **Diyalog:** Oyuncuya görünen her metin 6 dilde, karakterin sesine uygun; AR/RU cinsiyet doğru.
- **Animasyon:** Reanimated ile giriş ve dokunma geri bildirimi; `useSadeMod` saygısı.
- **3D ve görüntü:** Gerektiğinde `blender-karakter` (önceden işlenmiş kareler).

## Araçlar

- **Figma:** Kullanıcı claude.ai'de Figma bağlayıcısını yetkilendirdiyse `figma-generate-design`
  ile tasarım taslağı kurulur, kullanıcı telefondan onaylar. Yoksa tarayıcı önizlemesi
  (`mobile/scripts/design-preview.cjs`) ve ekran görüntüsü kullanılır.
- **Önizleme bağımlılıkları:** `KRONIKLER_PREVIEW_DEPS` yoksa önce kurulur. Playwright hazır.
- **Kullanıcının bilgisayarı yok:** Her şey bulut makinesinde yapılır, kullanıcı telefondan bakar.
