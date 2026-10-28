---
name: kronikler-skill-rehberi
description: Kronikler deposunda kurulu dış skill'lerin (Superpowers, ECC seçkisi, ElevenLabs, claude-code-setup, Figma, blender-karakter) hangi işte kullanılacağı ve depo kurallarıyla öncelik sırası. Plan, hata ayıklama, arayüz cilası, erişilebilirlik, ses üretimi, Blender/3D veya iş bitirme doğrulaması gerektiğinde önce bunu oku.
---

# Kronikler skill rehberi

## Öncelik

Kullanıcının o anki sözü > `AGENTS.md` ve `mobile/AGENTS.md` > bu rehber > dış skill.
Dış skill bir adımı depo kuralıyla çelişecek biçimde isterse depo kuralı uygulanır:

- Dal `apk` (oturum dalına aynı commit). Commit Türkçe, tek satır, Conventional Commits değil.
- Alt ajan, worktree ve paralel ajan yalnız kullanıcı açıkça isterse.
- Smoke ve geniş test yalnız kullanıcı isterse ya da APK öncesi; aksi hâlde hedefli statik kontrol.
- Oyuncuya görünen her metin 6 dilde; emoji yerine `GameIcon`.
- Yalnız ücretsiz araç. Ücret ihtimali olan API çağrısından önce kullanıcıya sor; anahtar okuma, yazdırma ve commit etme.

## Görev → skill

| İş | Skill |
|---|---|
| Büyük özellik fikri, sayfa yeniden düzeni | `brainstorming` (kısa tut), `writing-plans`, `executing-plans` |
| Hata, beklenmeyen davranış | `systematic-debugging`, ardından `verification-before-completion` |
| Motor (`lib/game.ts`) davranışı | `test-driven-development` mantığıyla hedefli sim betiği (Jest yok) |
| Kod incelemesi | `requesting-code-review`, `receiving-code-review`; yerleşik `/code-review` |
| Expo / React Native | `react-native-patterns`, `react-performance` (Next.js bölümlerini atla) |
| Arayüz cilası | `make-interfaces-feel-better`, `accessibility` (44 pt dokunma, 320/390 px), `click-path-audit` |
| Tarayıcı önizlemesiyle doğrulama | `browser-qa` + `mobile/scripts/design-preview.cjs` |
| Bağlam bütçesi | `context-budget` |
| Çok yollu tasarım kararı | `council` |
| Yazmadan önce hazır çözüm arama | `search-first` (yalnız ücretsiz) |
| Hata yönetimi deseni | `error-handling` |
| Blender, gerçekçi 3D insan, hareket | `blender-karakter`, `blender-motion-state-inspection` |
| Ses, müzik, efekt | `text-to-speech`, `sound-effects`, `music`, `voice-changer`, `setup-api-key` |
| Otomasyon önerisi (salt okuma) | `claude-automation-recommender` |
| Yeni skill yazma veya düzenleme | `writing-skills`, `agent-sort` |
| Figma | `figma:*` (zaten kurulu); MCP için kullanıcı Figma bağlayıcısını yetkilendirmeli |

## ElevenLabs notu

ElevenLabs çağrıları kullanıcının hesabından kredi harcar. Kullanıcı anahtarı ortam
değişkeni olarak vermeden ve o işe onay vermeden çağrı yapma. Üretilen sesler
`mobile/assets/ses/` ya da `sfx/` altına; kaynak ve lisans `docs/SES_SAHNE.md` ile
`mobile/UCUNCU-TARAF.md`'ye. Skill'lerdeki CLI kurulum komutunu (`curl … | sh`)
kullanıcıya sormadan çalıştırma.

## Kaynak

Sürümler ve lisanslar: `.claude/skills/KAYNAKLAR.md`.
