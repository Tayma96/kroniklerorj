# Kronikler — güncel çalışma özeti (19 Ekim 2026)

## Kalıcı kurallar ve tercihler
- Tayma96/kroniklerorj; yalnız `apk`. Commit Türkçe ve tek satır; push sonrası uzak başı doğrula.
- APK/PR/dağıtım/Cloudflare yalnız açıkça istenirse. Kullanıcı sormadıysa test/smoke çalıştırma. Anahtarları okuma/yazdırma.
- Yeni görünen metin tr/en/es/pt/ar/ru. Eski kayıt, çevrimdışı akış ve MP protokolünü koru.
- Yalnız ücretsiz araç; ücret riski varsa çağrı yapma.
- Oyun: 1247 Anadolu'sunda çevrimdışı hanedan simülasyonu. Kullanıcı yeni hikâyeler yerine sistem işlevi, oynanış derinliği ve alanlar arası bağlantı istiyor. Bu öncelik değişene kadar yalnız hikâye yayı ekleme.
- Görsel yön açık: canlı, profesyonel oyun hissi. NPC portresi yaş/meslek/ruh hâline özel olmalı; hero görseli veya başsız kıyafet atlası portre diye kullanılmamalı. Aybike yalnız örnekti. Bu portre seti henüz tamamlanmadı.
- Tasarım turu `70fc1c3`; önceki içerik hikâyeleri `a131cbf`. Bunları nihai oyuncu onayı sayma. Diğer sohbet/task'a kullanıcı açıkça yetki vermeden mesaj gönderme.

## Aktif oynanış planı
- Ayrıntılı, alan alan sıra: `docs/OYNANIS_DERINLIGI.md`. YOL_HARITASI.md bu önceliğe göre güncellendi.
- Tamamlanan ilk dilim: pazar en iyi üç kervan yükü/şehir rotasını ve fiyat farkını gösteriyor; seçilen rota kervanın gerçek varış/yük verisine uygulanıyor. Altı dil eklendi; diff biçim kontrolü temiz. Smoke, test ve cihaz önizlemesi çalıştırılmadı.
- Yeni tamamlanan kod dilimi: atölye üç yerel talep sunuyor; birini kabul edip ilgili şehirde oyuncunun ürettiği ürünü teslim etmek sabit ücret + halk/lonca itibarı sağlar. Açık siparişin vadesi yok, iptal edilebilir; teslim ayda bir ve yerel arzı artırır. Altı dil, yeni opsiyonel kayıt alanları, eski kayıt uyumu korunuyor. Yalnız `git diff --check` koştu; test/smoke ve cihaz önizlemesi çalıştırılmadı.
- Yeni tamamlanan dilim: pazar pazarlığı fiyatı/sabrı/son sözünü aynı ay/şehir/mal için opsiyonel kayıtta sürdürür; alım/satım hakkı kullanıldıysa tekrar açılmaz. Altı dilli genel son-fiyat repliği satışta yanlış “taban fiyat” metnini düzeltiyor. Eski kayıt uyumlu; henüz test/smoke/cihaz önizlemesi yok.
- Mülk: değirmen zinciri commit `e6cf2ca`/uzak `d66e610`; yıllık defter bu dilimde 12 aylık neti işçi/bekçi/bakım/enflasyonla topluyor, tam yılları grafiğe alıyor. Defter henüz commit edilmedi.
- Çıraklık: oyuncu dört beceriden birini seçip 24 ay ders başına XP kazanıyor; ekran dalı gösteriyor, eski kayıt güvenli; yenisini seçerken ilerleme kaybı önceden açıklanıyor. Yerelde henüz commit yok.
- Sonraki işler: çıraklık emeğini/kârlılığı dengele; sonra NPC-aile ve mahalle-güç döngülerini geliştir. Hikâye yazımını öne alma.
