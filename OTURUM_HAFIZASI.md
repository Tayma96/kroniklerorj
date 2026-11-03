# Kronikler — güncel çalışma özeti (28 Ekim 2026)

## Yetki ve kalıcı kurallar
- Repo Tayma96/kroniklerorj; yalnız `apk`. Türkçe, tek satırlı commit; kullanıcı commit/push işine açıkça izin verdi. Diğer sohbetteki bota mesaj gönderme yetkisi yok.
- Berkay'a asla ek ücret çıkarma. Görsel/video yalnız ücretsiz araçlarla. Ses: ElevenLabs Starter kotası içinde, `docs/SES_PLANI.md` kurallarıyla (ölçülü, kayıtlı, onay kapılı). Anahtarları okuma/yazdırma. APK, PR ve dağıtım istenmedikçe yapma.
- Kullanıcı tüm oyunu derinleştirmemi ve soru/izin istemeden sürdürmemi istedi. Yeni hikâyeden önce işlevsel döngü, karar, bedel ve uzun dönem sonucu.
- Yeni oyuncu metni tr/en/es/pt/ar/ru. Eski kayıt, çevrimdışı akış, MP protokol eşleşmesi korunmalı; yeni alanlar opsiyonel.
- Oyunun görsel dili canlı ve profesyonel olmalı. Her NPC'ye yaş/meslek/ruh hâline göre özgün portre; kıyafet atlası veya hero karesi profil resmi sayılmaz. Aybike yalnız örnek.

## Kalıcı tasarım kararları
- Tek oyunculu önce, çevrimiçi sonra. Ana sayfa = mockup ekran 1 (`lib/home-mockup-ui.tsx`, süs `lib/mk-sus.tsx`).
- Alt menü: Ana Sayfa · Karakter · [Ayı İlerlet] · İlişkiler · Menü. Emek Karakter ekranında, çalışılmamış ayda rozet.

## 1 Kasım turu (Berkay: tam yetki, onay bekleme; tek kural ücret yok)
- Bitti (`apk`): özel sekme çubuğu (`app/oyun/_layout.tsx` SekmeCubugu), yeni oyun klavye/başlık/ocak kartları,
  ana sayfa kimlik paneli + `lib/ad-bicim.ts`, Geri hapı, Divan/Dost girişleri kaldırıldı, ilk açılış dil ekranı
  (`lib/dil-secimi.tsx`), kış ortamı çınlaması (yeni ElevenLabs döngüsü).
- 2 Kasım: ses (21 müzik, 15 ortam, 23 efekt, 13 an anlatısı 6 dil, NPC sözleri 7 ses) ve 56 sn giriş videosu `apk`'de; test APK güncel.
- Hissiyat turu `docs/HISSIYAT_PLANI.md` (Berkay: "site gibi, sonuç hissedilmiyor"): 1–5 yapıldı (az pencere, ün kademeleri, geri dönüşün kökü, düzen, hayatın derdi); cihaz testi bekliyor.
- Dövüş: `docs/SAVAS_SINEMATIK_PLAN.md`; yüzleşme kuruldu, 3D kalite kanıtı (görüntü ajanı) sürüyor.
- apk'ye gönderim: scratchpad `araclar/gonder.sh` (ayrı çalışma ağacı); yarım ajan dosyası apk'ye girmez.

## Açık işler
- **Önce `docs/DEVIR.md`yi oku** (1 Kasım devri: ElevenLabs MCP, telefon hataları, 3D yeni yol, ajan planı). ElevenLabs Berkay'ın aboneliğiyle onaylı (`.mcp.json`).
- Çevrimiçi `docs/online/`; eski beta kapalı (Yakında); `server/` ve eşliği dokunulmaz.
- KURAL: en çok 1 alt ajan (`ses-yonetmeni`, `goruntu-yonetmeni`); önce plan, onaydan sonra kod. Ses planı: `docs/SES_PLANI.md`. 3D tasarım: `docs/superpowers/specs/2026-10-28-canli-3d-kusam-design.md`.
- 3D: gerçekçi insan; canlı 3D yok (telefon dondu). Hat `.claude/skills/blender-karakter`.
- Skill rehberi: `kronikler-skill-rehberi`.
- Denge: bot 40 yaşında nam 100. `game.ts` Math.random göçü sürüyor (`docs/AUDIT.md`).
