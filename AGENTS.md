# Kronikler — düşük bağlam çalışma kuralı

Bu dosya depo genelindeki ajanlar için bağlayıcıdır. Amaç işi eksiksiz yaparken gereksiz
okuma, çıktı ve testlerle kullanıcı limitini tüketmemektir.

## Başlangıç

- İlk olarak yalnız `OTURUM_HAFIZASI.md`yi oku. Mobil kod değişecekse `mobile/AGENTS.md`,
  ürün/oynanış kararı verilecekse `TASARIM_PUSULASI.md` de okunur.
- `docs/arsiv/`, GDD/PDF, eski devir notları ve tam raporlar kullanıcı o oturumda açıkça
  izin vermedikçe açılmaz. “Gerekebilir” veya “yararlı olabilir” izin sayılmaz.
- Kullanıcı istemedikçe alt ajan/delegasyon kullanma. Aynı işi birden çok ajana okutma.

## Arama ve okuma bütçesi

- Önce hedefli `rg`/`rg --files` kullan; bütün depoyu veya büyük dosyaları körlemesine dökme.
- Bir dosya 20 KB'den büyükse önce boyutunu ve başlıklarını gör, yalnız ilgili bölümü oku.
- `node_modules`, `.expo`, derleme çıktıları, medya, log, arşiv ve taslakları genel aramaya katma.
- Tam diff/log yerine önce özet ve hata satırlarını al. Aynı dosyayı aynı oturumda yeniden okuma.
- Web'i yalnız görev güncel dış bilgi gerektiriyorsa veya kullanıcı açıkça isterse kullan.
- Yeni günlük biriktirme. Oturum özeti güncellenecekse eski metni büyütmek yerine değiştir ve
  `OTURUM_HAFIZASI.md`yi 3 KB altında tut.

## Uygulama bütçesi

- Değişiklikle ilişkili en küçük test kümesini çalıştır. Tam 300 hayat testi yalnız
  `mobile/AGENTS.md` kadansında veya APK öncesinde çalışır.
- Önce dosya/özellik bazlı kontrol, sonra yalnız hata veya risk varsa daha geniş denetim yap.
- Bir tamamlanmış işi tek commit'te doğrula ve `apk` dalına push et; uzak commit'i karşılaştır.
- Kullanıcıya kısa sonuç, doğrulama ve commit ver; uzun çalışma günlüğü aktarma.

## İhtiyaca göre belge yolu

- Nüfus/NPC: `mobile/NUFUS.md`; yaş görselleri: `docs/GORSEL_YAS.md`
- Ses: `docs/SES_SAHNE.md`; güncel kapsam: `docs/AUDIT.md`, `YOL_HARITASI.md`
- Yayın/APK: `mobile/YAYIN.md` (yalnız kullanıcı yayın istediğinde)

Bu kurallar kalite denetimini atlatmaz; yalnız ilgisiz bağlamı ve tekrarlı işi önler.
