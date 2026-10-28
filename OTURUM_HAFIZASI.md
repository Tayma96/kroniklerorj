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

## Bu oturumda yapılanlar
- `4c20917` tsc kırığı (ebeveyn ihmali) düzeltildi. `smoke:full` 300 hayat temiz.
- Tema koyulaştı; `ornament-ui`: işlenmiş panel, kenardan kenara sahne başlığı, `ListRow`, `AlertBanner`, `StatStrip` (dar ekranda 2×2). Ana ekran, şehir, NPC, aylık karar (sahne görselli), savaş afişi, bölge ambarı, alt sayfa başlıkları ve pusula düğmesi yenilendi.
- NPC sahnesi artık kişinin kendi sinematik portresi (başka kişinin meslek resmi kimliği bozuyordu); çocuklarda meslek ortamı + yuvarlak portre.
- Şehir mekân kartları ayrı sahneler kullanıyor (`lib/assets.ts`).
- Oynanış hatası: 13+ yaşta yemek düğmesi yoktu, oyuncu sessizce açlıktan ölüyordu. Ana ekrana tokluk <40'ta bedelli "Sofra" kartı eklendi.
- Ana ekranda eylemler (çalış/yaş uğraşları) geçmiş kaydının önüne alındı.
- Tarayıcı botu (scratchpad, depoda yok) 400 ay hatasız oynadı. Gerçek cihaz/APK denemesi yapılmadı.

## Açık işler
- Denge: rastgele oynayan bot 40 yaşında nam 100'e ulaşıyor; nam/para eğrisi gözden geçirilmeli. Sofra kartı sık çıkıyorsa aylık otomatik ev sofrası düşünülebilir.
- Ana ekrandaki eski stil şeritler (zindan, destan, kervan, açık hesaplar) ve diğer alt sayfa iç kartları ortak bileşene taşınabilir.
- Aile/valilik dilimleri (19 Ekim) ve `game.ts`teki 254 `Math.random()` göçü sürüyor; ayrıntı `docs/OYNANIS_DERINLIGI.md`, `docs/AUDIT.md`.
