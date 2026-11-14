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
- 14 Kasım: darbe akçe ganimeti (yalnız akçe, mülk alınmaz); ateşkes ön talimatı; Kül Yemini mührü (ky=2); miras (işletme vârise); han H1–H5 (keşif sırası, masa ayarı, küfür maskesi, şikâyette masa, eylem etkileri; yemin namı mühürlüye); düello (rızalı, kaybeden bir şey kaybetmez); barınma yerel hatırlatması; belirteç `expo-secure-store`'da.
- Sunucu 532 test, hepsi geçiyor. Sunucu hiç dağıtılmadı (`docs/online/DENEME_SUNUCUSU.md`). Yeni APK gerekir (secure-store, notifications).
- Suikast ve kan davası ilk sürümde yok (GDD §11).

## Sıradaki işler
1. Göç (D1): sunucu ajanda, sonra istemci ekranı (`ONLINE_DURUM.md` §4.5).
2. Han: H7 akçeyle ziyafet, H8 ozan sahnesi, H9 masa türleri, H10 NPC/pano, H11 Debdebe süsleri, H12 oda getirileri.
3. D2 kervan; E4 203 hak kancası; 14 meslek denge; sözleşme/ittifak teklifinin düşme kuralı.
4. Deneme sunucusu açılınca ilk dilim: giriş → profil → yerleşim → yaşam → meslek → işler.

## Berkay'da
- `DENEME_SUNUCUSU.md` adımları; Realtime uygulaması (`REALTIME_APP_ID/TOKEN`); `GOOGLE_CLIENT_ID`; mağaza ayarları.
- Karar bekleyen: gerçek parayla beceri süre kısaltma satışı ve Debdebe armağanının teveccühe girmesi (`ONLINE_DURUM.md` §5).
