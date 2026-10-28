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
- Oynanış hatası: 13+ yaşta yemek düğmesi yoktu; "Sofra" eklendi. Tarayıcı botu (scratchpad) 400 ay hatasız oynadı. Cihaz/APK denemesi yok.

## 3. tur (kullanıcının seçtiği nihai ana sayfa)
- Ana sayfa = `claude-paket` mockup ekran 1: sahne, kimlik+4 gösterge, Bu Ayın Kararı (satır içi), tek uyarı afişi (savaş/açlık/gündem → alttan panel), Son Gelişmeler, Yaşam Defteri.
- Alt menü: Karakter · Şehir · [İlerle pusulası → ana sayfa] · Kişiler · Defter. Emek ve yaş uğraşları Karakter'de (`lib/month-actions-ui.tsx`); eski Menü içeriği `lib/place-grid.tsx` ile Karakter/Kişiler/Defter'e dağıldı. Çalışılmamış ayda Karakter sekmesinde rozet.
- Semboller yazı tipine gömülü (`scripts/yazitipi/sembol-gom.py`); alt sayfalar sahne fotoğrafı üstünde. Araştırma: `docs/SAVAS_3D_VE_SAYFA_PLANI.md`. Smoke en sona bırakıldı.

## Açık işler
- Sıradaki: ibre mini oyununu kaldır; dövüşe niyet+nefes; Skia meydan muharebesi; Menü rotası artık bağlantısız (silinebilir).
- Denge: rastgele bot 40 yaşında nam 100; eğri gözden geçirilmeli.
- Ana ekrandaki eski stil şeritler (zindan, destan, kervan, açık hesaplar) ve diğer alt sayfa iç kartları ortak bileşene taşınabilir.
- Aile/valilik dilimleri (19 Ekim) ve `game.ts`teki 254 `Math.random()` göçü sürüyor; ayrıntı `docs/OYNANIS_DERINLIGI.md`, `docs/AUDIT.md`.
