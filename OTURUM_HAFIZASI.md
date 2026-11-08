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

## Çevrimiçi (8 Kasım, Berkay tam yetki)
- Esas belge: `docs/superpowers/specs/2026-11-08-cevrimici-ana-tasarim-design.md` (GDD v0.4 + Ek A/B `docs/online/gdd/` ile uzlaştırma, 14 meslek + 4 kademeli ağaç, temel iş herkese açık, yönetici paneli, tek faz sırası §8). Eski `FAZn_PLAN.md`ler yalnız içerik kaynağı.
- Ajanlar: `online-sunucu`, `online-istemci`, `denge-denetcisi` (`.claude/agents/`).
- Bitti: sıra 2 meslek çekirdeği (plan `docs/superpowers/plans/2026-11-08-meslek-cekirdegi.md`): `/v1/meslek`, `/v1/temel-is`, `/v1/taban-al`, `/v1/lonca`; 97 sunucu testi temiz. Pir için çırak sayacı (`cy`) E3'te bağlanacak.
- Sıradaki: sıra 1 kapanış (`FAZ_DURUM.md` ilk 3 iş: yarım istemci dalı), sonra sıra 3 dikey dilim (Faz 3 + E1 Hal + E2 istemci).

## Açık işler
- `docs/DEVIR.md` (1 Kasım devri). ElevenLabs Berkay'ın aboneliğiyle onaylı (`.mcp.json`).
- Alt ajan sayısını Berkay belirler (3 Kasım: 3 rol ajanı istedi). Ses planı `docs/SES_PLANI.md`.
- Ün kazancı tek yerden (`unEkle`, kademe oranları); mülk her alımda %15 pahalı. Math.random göçü sürüyor.
- 3D'de bakış, ayak teması, cilt dokusu.
