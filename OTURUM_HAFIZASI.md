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

## Önceki turlar (özet)
- 1–3 Kasım `apk`'de: sekme çubuğu, yeni oyun, ana sayfa, dil ekranı, ses paketi, 56 sn giriş videosu, hissiyat 1–4.
- Radikal sonuçlar spec `docs/superpowers/specs/2026-11-03-radikal-sonuclar-design.md`; aşama 0–3 bitti, sıradaki aşama 4 (göç, suç, lekeli).
- Dövüş 3D: `scripts/blender/` k09–k12, `docs/SAVAS_HAREKET_HARITASI.md`; ham FBX depoda yok.

## Çevrimiçi (10 Kasım durumu)
- Esas: `docs/superpowers/specs/2026-11-08-cevrimici-ana-tasarim-design.md` (§6.1 hediye, §6.2 teveccüh tutarla, §6.3 aile evi, §8 sıra) + `2026-11-09-beceri-agaci-v2-design.md`. GDD'ler yön gösterici.
- `apk`de sunucu (334 test): meslek + 14 RPG ağacı, dikey dilim, Y1 yönetici, Faz 3–6, han masası, hanedan, Faz 12–13 mülk/işletme/çalışan, Faz 14 barınma, E5–E7 topluluk, Faz 7 + Ek B P1–P4 siyaset, Debdebe (ödeme kapalı, `DEBDEBE_ACIK`). İstemci: profil, gelen, han, hanedan, ağaçlar, üçgen, barınma; ekonomi/mülk ekranları son ajanda.
- Kalan: Faz 8 + P5–P6 darbe/bağımsızlık; Ayan/sezon tamamlama, Y2 ekonomi sağlığı + parametre okuma, Y3 telafi; E4 11 meslekte `kanca` etkileri; siyaset/topluluk/Debdebe/Meşrep ekranları; meslek gelir dengesi (sim todo, oran ~2,6); Faz 9 yayın kapısı; sonra test sürümü (test girişi + çevrimiçi APK; Berkay sunucuyu `wrangler deploy` eder).
- Kural: test/denetim yalnız iş sonunda; ≤4 ajan; çakışma çözücü scratchpad `coz.py` (geçici).

## Açık işler
- `docs/DEVIR.md` (1 Kasım devri). ElevenLabs Berkay'ın aboneliğiyle onaylı (`.mcp.json`).
- Alt ajan sayısını Berkay belirler (3 Kasım: 3 rol ajanı istedi). Ses planı `docs/SES_PLANI.md`.
- Ün kazancı tek yerden (`unEkle`, kademe oranları); mülk her alımda %15 pahalı. Math.random göçü sürüyor.
- 3D'de bakış, ayak teması, cilt dokusu.
