# Kronikler — güncel çalışma özeti (14 Kasım 2026)

## Kurallar
- Repo Tayma96/kroniklerorj, ana dal `apk`. Türkçe tek satır commit, ek satır yok. Berkay tam yetki verdi (birleştirme, silme, `apk`'ye push).
- Tek sert kural: **her şey ücretsiz**. Ücret çıkarabilecek adım önce kontrol edilir. Anahtar okuma/yazdırma yok.
- Yeni oyuncu metni 6 dilde. Eski kayıt ve çevrimdışı akış korunur. İşbölümü `AGENTS.md`'de (esnek).
- Kota: ajanlar 5 saatlik sınırı doldurabiliyor; birer birer çalıştır, kesilirse SendMessage ile sürdür.
- Bulut oturumunda developers.cloudflare.com kapalı; Cloudflare API biçimi npm `partytracks` kitaplığından okunur.

## Ürün yapısı
- Tek Oyunculu (`mobile/app/oyun/`) ve Çok Oyunculu (`mobile/app/online/`, sunucu `online-server/`). Kayıtlar ayrı.
- Eski Diyar MP söküldü. Giriş "Çok Oyuncu" → `/online`; kapı kapalı, "Yakında".

## Çevrimiçi durum
- **Tek güncel durum belgesi: `docs/online/ONLINE_DURUM.md`** (sağlam alanlar, açık işler H/D/S/G, ilk sürüm tasarım kararları, Berkay'a kalan gerilimler). `FAZ_DURUM.md` geçersiz.
- 14 Kasım: darbe akçe ganimeti kalıcı kuyrukla bağlandı; ateşkes ön talimatı; Kül Yemini mührü (ky=2); han sesi ayrı hız kovası, Realtime biçimi doğrulandı; belirteç `expo-secure-store`'da; han soketi oturum reddinde girişe döner.
- Sunucu 502 test, hepsi geçiyor. Sunucu hiç dağıtılmadı (`docs/online/DENEME_SUNUCUSU.md`).
- Tasarım kararı: düello rızalı, sonucu yalnız nam (§4.1); suikast ve kan davası ilk sürümde yok (GDD §11).

## Sıradaki işler
1. Han H1–H5 (keşif sırası, masa ayarı, sohbet filtresi, şikâyette masa, eylem etkileri) → istemci ekranları → H6 düello.
2. D3 ölümde mülk/makam/borç devri; S1 darbede mülk kaybı.
3. D1 seyahat/göç, D2 kervan; H8 ozan sahnesi; E4 kalan etkiler; 14 meslek denge.
4. Deneme sunucusu açılınca ilk dilim: giriş → profil → yerleşim → yaşam → meslek → işler.

## Berkay'da
- `DENEME_SUNUCUSU.md` adımları; Realtime uygulaması (`REALTIME_APP_ID/TOKEN`); `GOOGLE_CLIENT_ID`; mağaza ayarları.
- Karar bekleyen: gerçek parayla beceri süre kısaltma satışı ve Debdebe armağanının teveccühe girmesi (`ONLINE_DURUM.md` §5).
