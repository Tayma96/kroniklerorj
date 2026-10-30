# Kronikler — güncel çalışma özeti (28 Ekim 2026)

## Yetki ve kalıcı kurallar
- Repo Tayma96/kroniklerorj; yalnız `apk`. Türkçe, tek satırlı commit; kullanıcı commit/push işine açıkça izin verdi. Diğer sohbetteki bota mesaj gönderme yetkisi yok.
- Yalnızca ücretsiz araçlar; ücret ihtimali olan görsel/API çağrısı yapma. Anahtarları okuma/yazdırma. APK, PR ve dağıtım istenmedikçe yapma.
- Kullanıcı tüm oyunu derinleştirmemi ve soru/izin istemeden sürdürmemi istedi. Yeni hikâyeden önce işlevsel döngü, karar, bedel ve uzun dönem sonucu.
- Yeni oyuncu metni tr/en/es/pt/ar/ru. Eski kayıt, çevrimdışı akış, MP protokol eşleşmesi korunmalı; yeni alanlar opsiyonel.
- Oyunun görsel dili canlı ve profesyonel olmalı. Her NPC'ye yaş/meslek/ruh hâline göre özgün portre; kıyafet atlası veya hero karesi profil resmi sayılmaz. Aybike yalnız örnek.

## Güncel öncelik (28 Ekim 2026)
- Kullanıcı: 2 haftada tek oyunculuyu oynanabilir ve güzel görünür hâle getir; online GDD sonra. Tam yetki verdi, onay beklenmez. Çalışma dalı `apk` (oturum dalına da aynı commit itilir).
- Tasarım hedefi `mobile/assets/tasarim/claude-paket/mockup_full.png`; birebir değil, mantıksızlık giderilerek ve içerik kaybetmeden.

## 1. tur
- tsc kırığı düzeldi; `smoke:full` 300 hayat temiz (`bd471c8`). Tema, `ornament-ui` bileşenleri, NPC kendi portresiyle sahne, ayrı mekân resimleri.

## 3. tur (nihai ana sayfa — kullanıcı kararı)
- Ana sayfa = mockup ekran 1, ×0.82, `lib/home-mockup-ui.tsx` (süs/renk `lib/mk-sus.tsx`).
- Alt menü seçenekleri ESKİ gibi kalır: Ana Sayfa · Karakter · [Ayı İlerlet] · İlişkiler · Menü; yalnız görünüm mockup'a göre. Başka sayfaların yapısını değiştirme.
- Emek ve yaş uğraşları Karakter ekranında (`lib/month-actions-ui.tsx`), çalışılmamış ayda Karakter rozeti. Semboller yazı tipinde (`scripts/yazitipi`). Smoke en sona.

## Açık işler
- Çevrimiçi: `docs/online/` (OYNANIS_TASARIMI, FAZ1/2_PLAN). Faz 1 sunucu+ekran ✓ (`online-server/`, `mobile/lib|app/online`, bayrak `ONLINE_GELISTIRME`); Faz 2 sürüyor. Eski beta kapalı (Yakında); `server/` ve eşliği dokunulmaz.
- Yöntem: Superpowers (tasarım → plan → uygulama → doğrulama). 10 sayfa + giriş/yeni oyun ✓; sinematik ✓ (lib/sinematik; kaynak assets/sinematik/KAYNAK.md). 3D aşama 1 test APK'da (oturum dalı), telefon onayı bekleniyor. KURAL: paralel ajan yok (limit bitiriyor); en çok 1 ajan, inceleme ucuz betikle. 3D: `docs/superpowers/specs/2026-10-28-canli-3d-kusam-design.md`.
- 3D: kullanıcı karikatür değil gerçekçi insan istiyor. Hat `.claude/skills/blender-karakter` (her oturumda setup.sh). Kullanıcı onayı olmadan tasarım/oyun entegrasyonuna geçme.
- Skill'ler `.claude/skills` (Superpowers, ECC seçkisi, ElevenLabs, claude-code-setup); öncelik `kronikler-skill-rehberi`.
- Denge: bot 40 yaşında nam 100. `game.ts` Math.random göçü sürüyor (`docs/AUDIT.md`).
