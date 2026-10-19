# Kronikler — güncel çalışma özeti (19 Ekim 2026)

## Yetki ve kalıcı kurallar
- Repo Tayma96/kroniklerorj; yalnız `apk`. Türkçe, tek satırlı commit; kullanıcı commit/push işine açıkça izin verdi. Diğer sohbetteki bota mesaj gönderme yetkisi yok.
- Yalnızca ücretsiz araçlar; ücret ihtimali olan görsel/API çağrısı yapma. Anahtarları okuma/yazdırma. APK, PR ve dağıtım istenmedikçe yapma.
- Kullanıcı tüm oyunu derinleştirmemi ve soru/izin istemeden sürdürmemi istedi. Yeni hikâyeden önce işlevsel döngü, karar, bedel ve uzun dönem sonucu.
- Yeni oyuncu metni tr/en/es/pt/ar/ru. Eski kayıt, çevrimdışı akış, MP protokol eşleşmesi korunmalı; yeni alanlar opsiyonel.
- Oyunun görsel dili canlı ve profesyonel olmalı. Her NPC'ye yaş/meslek/ruh hâline göre özgün portre; kıyafet atlası veya hero karesi profil resmi sayılmaz. Aybike yalnız örnek.

## Oynanış ilerlemesi
- Ayrıntılı alan sırası ve açık işler: `docs/OYNANIS_DERINLIGI.md`; mevcut sistem denetimi: `docs/AUDIT.md`.
- `apk` dalında: kervan yük/rota seçimi; kasaba talebine bağlı atölye siparişi; kayıtta süren pazar pazarlığı; girdisi gerçek olan değirmen; beceri dalı seçilen çıraklık; işçi/bekçi/bakım/enflasyonu içeren 12 aylık mülk defteri.
- Aktif dilim: miras ekranı huy, çocuk yatırımı, eğitim, seçili soy yeteneği, son söz ve ata eserlerinden gelen başlangıç stat/beceri farklarını gösteriyor; gerçek devirle ortak hesap kullanıyor. Kod tamamlandı; yalnız `git diff --check` koştu, test/smoke/cihaz önizlemesi çalıştırılmadı.
- Aile dilimi sürüyor: ebeveyn bağları NPC kimliğine göre ayrıldı; hedefli ziyaret, ortak sofra, yıllık ihmal, NPC görüşü ve ölüm/yas/miras yalnız ilgili kişinin bağını kullanıyor. Eski kayıtların ortak değeri başlangıç olarak korunuyor. Bu dilim için test/smoke çalıştırılmadı.
- Sıradaki: aile kararlarını beceri, kaynak ve sonraki kuşağın tepkisine bağla; ardından mahalle/kurum/güç döngüleri. Denge ve gerçek cihaz/oyuncu kabulü ayrıca gerekli.

## Önceki oturum notu
- Görsel tasarım commitleri `70fc1c3`; hikâye içeriği `a131cbf`. Bunlar nihai oyuncu onayı değildir.
