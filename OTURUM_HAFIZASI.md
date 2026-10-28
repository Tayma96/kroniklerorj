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

## 3. tur (nihai ana sayfa — kullanıcı kararı)
- Ana sayfa = `claude-paket/mockup_full.png` ekran 1, ölçüler ×0.82 ile `lib/home-mockup-ui.tsx`ta (sahne 201, portre 84, metin ~12.5 pt). Sahne `heroImage(yaş, mevsim)` (eski mantık). Yan yana karşılaştırarak ayarlandı.
- Alt menü seçenekleri ESKİ gibi kalır: Ana Sayfa · Karakter · [Ayı İlerlet] · İlişkiler · Menü; yalnız görünüm mockup'a göre. Başka sayfaların yapısını değiştirme.
- Emek ve yaş uğraşları Karakter ekranında (`lib/month-actions-ui.tsx`), çalışılmamış ayda Karakter rozeti. Semboller yazı tipinde (`scripts/yazitipi`). Smoke en sona.

## Açık işler
- MP ertelendi; yalnız protokol eşliğini koru.
- Denetim `docs/SAYFA_DENETIMI.md`: ibre, hanedan sekmeleri, dövüş arenası, doğduğun ocak, NPC sohbet sahnesi, TR başlık fontu bitti. Sıradaki: mahalle haritası, meydan muharebesi.
- 3D: kullanıcı karikatür değil gerçekçi insan istiyor. Hat `.claude/skills/blender-karakter` (her oturumda setup.sh). Kullanıcı onayı olmadan tasarım/oyun entegrasyonuna geçme.
- Skill'ler `.claude/skills` (Superpowers, ECC seçkisi, ElevenLabs, claude-code-setup); öncelik `kronikler-skill-rehberi`.
- Denge: bot 40 yaşında nam 100. `game.ts` Math.random göçü sürüyor (`docs/AUDIT.md`).
