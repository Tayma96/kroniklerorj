# Kronikler — güncel çalışma özeti (3 Kasım 2026)

## Yetki ve kalıcı kurallar
- Repo Tayma96/kroniklerorj; yalnız `apk`. Türkçe, tek satırlı commit; kullanıcı commit/push işine açıkça izin verdi. Diğer sohbetteki bota mesaj gönderme yetkisi yok.
- Berkay'a asla ek ücret çıkarma. Görsel/video yalnız ücretsiz araçlarla. Ses: ElevenLabs Starter kotası içinde, `docs/SES_PLANI.md` kurallarıyla (ölçülü, kayıtlı, onay kapılı). Anahtarları okuma/yazdırma. APK, PR ve dağıtım istenmedikçe yapma.
- 3 Kasım: Berkay yarım yeni sistemlerden rahatsız; Superpowers zorunlu: önce konuşma ve tasarım belgesi, onaydan sonra kod.
- Yeni oyuncu metni tr/en/es/pt/ar/ru. Eski kayıt, çevrimdışı akış, MP protokol eşleşmesi korunmalı; yeni alanlar opsiyonel.
- Görsel dil canlı ve profesyonel; her NPC'ye yaş/meslek/ruh hâline göre özgün portre.

## Kalıcı tasarım kararları
- Tek oyunculu önce, çevrimiçi sonra. Ana sayfa = mockup ekran 1 (`lib/home-mockup-ui.tsx`, süs `lib/mk-sus.tsx`).
- Alt menü: Ana Sayfa · Karakter · [Ayı İlerlet] · İlişkiler · Menü. Emek Karakter ekranında, çalışılmamış ayda rozet.

## 1 Kasım turu (Berkay: tam yetki, onay bekleme; tek kural ücret yok)
- Bitti (`apk`): özel sekme çubuğu (`app/oyun/_layout.tsx` SekmeCubugu), yeni oyun klavye/başlık/ocak kartları,
  ana sayfa kimlik paneli + `lib/ad-bicim.ts`, Geri hapı, Divan/Dost girişleri kaldırıldı, ilk açılış dil ekranı
  (`lib/dil-secimi.tsx`), kış ortamı çınlaması (yeni ElevenLabs döngüsü).
- 2 Kasım: ses (21 müzik, 15 ortam, 23 efekt, 13 an anlatısı 6 dil, NPC sözleri 7 ses) ve 56 sn giriş videosu `apk`'de; test APK güncel.
- Hissiyat 1–4 `docs/HISSIYAT_PLANI.md` `apk`'de; 5 (hayatın derdi) beğenilmedi, kaldırılacak.
- Radikal sonuçlar: plan `docs/superpowers/specs/2026-11-03-radikal-sonuclar-design.md`; aşama 0–2 uygulandı (`docs/superpowers/plans/2026-11-03-asama-0-2.md`, ölçüm `npm run olc:ayrisma`). Sıradaki aşama 3+ (kırılmalar): Berkay "kayıp tek tuşla değil; kaybın arkasında yeni yol/içerik olsun" dedi.
- Dövüş: `docs/SAVAS_SINEMATIK_PLAN.md`; yüzleşme kuruldu, 3D kalite kanıtı (görüntü ajanı) sürüyor.
- apk'ye gönderim: scratchpad `araclar/gonder.sh` (ayrı çalışma ağacı); yarım ajan dosyası apk'ye girmez.

## Açık işler
- `docs/DEVIR.md` (1 Kasım devri). ElevenLabs Berkay'ın aboneliğiyle onaylı (`.mcp.json`).
- Çevrimiçi `docs/online/` kapalı; `server/` ve eşliği dokunulmaz.
- Alt ajan sayısını Berkay belirler (3 Kasım: 3 rol ajanı istedi). Ses planı `docs/SES_PLANI.md`.
- 3D: canlı 3D yok (telefon dondu); önceden işlenmiş video, hat `.claude/skills/blender-karakter`.
- Ün kazancı tek yerden (`unEkle`, kademe oranları); mülk her alımda %15 pahalı. Math.random göçü sürüyor.
- 3D kalite kanıtı bitti (`scripts/blender/`, videolar scratchpad'de); Berkay'ın kararı bekleniyor.
