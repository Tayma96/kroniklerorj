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

## Çevrimiçi (8–9 Kasım, Berkay tam yetki; "talimat bekleme, hepsini bitir")
- Esas: `docs/superpowers/specs/2026-11-08-cevrimici-ana-tasarim-design.md` (§6.1 hediye, §6.2 teveccüh tutarla, §6.3 aile evi, §8 sıra) + `2026-11-09-beceri-agaci-v2-design.md` (RPG ağacı, öğrenme süresi, Tam Özgürlük). GDD'ler yön gösterici.
- `apk`de: meslek çekirdeği, dikey dilim, Y1 yönetici, Faz 3, han masası, hanedan, profil, beceri ağacı v2 sunucusu, Faz 4 üçgen, Faz 14 barınma (sunucu 280 test).
- Sürüyor: 14 ağaç istemcisi, Faz 6 ekonomi (ana çalışma alanı, yarım), Faz 4/14 ekranları, Faz 5 NPC gündemi (ayrı kopyalar). Birleşim kopyası: scratchpad `birlesim2` (dal `birlesim-2`).
- Sonra: Faz 12–13, E4, E5, Faz 7+P1–P4, Faz 8+P5–P6, E6–E7, Faz 11/15 (ödeme bağlantısı hariç), Y2–Y3, Faz 9. Paralel ≤4 ajan; limitte send_later ile kendiliğinden devam.

## Açık işler
- `docs/DEVIR.md` (1 Kasım devri). ElevenLabs Berkay'ın aboneliğiyle onaylı (`.mcp.json`).
- Alt ajan sayısını Berkay belirler (3 Kasım: 3 rol ajanı istedi). Ses planı `docs/SES_PLANI.md`.
- Ün kazancı tek yerden (`unEkle`, kademe oranları); mülk her alımda %15 pahalı. Math.random göçü sürüyor.
- 3D'de bakış, ayak teması, cilt dokusu.
