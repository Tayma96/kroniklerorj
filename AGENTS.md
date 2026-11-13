# Kronikler — düşük bağlam çalışma kuralı

Bu dosya depo genelindeki ajanlar için bağlayıcıdır. Amaç işi eksiksiz yaparken gereksiz
okuma, çıktı ve testlerle kullanıcı limitini tüketmemektir.

## Başlangıç

- İlk olarak yalnız `OTURUM_HAFIZASI.md`yi oku. Mobil kod değişecekse `mobile/AGENTS.md`,
  ürün/oynanış kararı verilecekse `TASARIM_PUSULASI.md` de okunur.
- `docs/arsiv/`, GDD/PDF, eski devir notları ve tam raporlar kullanıcı o oturumda açıkça
  izin vermedikçe açılmaz. “Gerekebilir” veya “yararlı olabilir” izin sayılmaz.
- Alt ajanları (`.claude/agents/`) gerektiğinde kendi kararınla kullan; geniş okumayı `code-explorer`'a
  devret, ana bağlamı koru. Her ajana tek iş, dosya yolları ve bitiş ölçütü ver; aynı işi birden çok ajana okutma.

## Kota kuralı (Berkay, 8 Kasım)

- Her büyük iş yeni oturumda başlar; uzun oturum her mesajda bütün geçmişi yeniden okur ve kotayı hızla tüketir.
- Paralel alt ajan yalnız kullanıcı açıkça isterse ve en çok 1–2 tane; her ajan ~100 bin token harcar.
- Görsel/3D işlemede ara kareleri tek tek gösterme; yalnız son paftayı gönder.

## Arama ve okuma bütçesi

- Önce hedefli `rg`/`rg --files` kullan; bütün depoyu veya büyük dosyaları körlemesine dökme.
- Bir dosya 20 KB'den büyükse önce boyutunu ve başlıklarını gör, yalnız ilgili bölümü oku.
- `node_modules`, `.expo`, derleme çıktıları, medya, log, arşiv ve taslakları genel aramaya katma.
- Tam diff/log yerine önce özet ve hata satırlarını al. Aynı dosyayı aynı oturumda yeniden okuma.
- Web'i yalnız görev güncel dış bilgi gerektiriyorsa veya kullanıcı açıkça isterse kullan.
- Yeni günlük biriktirme. Oturum özeti güncellenecekse eski metni büyütmek yerine değiştir ve
  `OTURUM_HAFIZASI.md`yi 3 KB altında tut.

## Uygulama bütçesi

- Değişiklikle ilişkili en küçük kontrolü seç. Kullanıcı smoke istemiyorsa başlatma;
  yalnız sözdizimi/diff gibi statik kontrolleri yap, çalıştırılmamış testi geçti sayma.
- Tam 300 hayat testi yalnız açık kullanıcı isteğinde veya APK/AAB öncesinde çalışır.
  Günlük komutlar ve aynı kaynak için başarılı sonuç önbelleği `mobile/AGENTS.md`de.
- Önce dosya/özellik bazlı kontrol, sonra yalnız hata veya risk varsa daha geniş denetim yap.
- Bir tamamlanmış işi tek commit'te doğrula ve `apk` dalına push et; uzak commit'i karşılaştır.
- Kullanıcıya kısa sonuç, doğrulama ve commit ver; uzun çalışma günlüğü aktarma.

## İhtiyaca göre belge yolu

- Nüfus/NPC: `mobile/NUFUS.md`; yaş görselleri: `docs/GORSEL_YAS.md`
- Ses: `docs/SES_SAHNE.md`; güncel kapsam: `docs/AUDIT.md`, `YOL_HARITASI.md`
- Yayın/APK: `mobile/YAYIN.md` (yalnız kullanıcı yayın istediğinde)

Bu kurallar kalite denetimini atlatmaz; yalnız ilgisiz bağlamı ve tekrarlı işi önler.

## Model işbölümü

Bu bir tercihtir, katı kural değil. Ajan çağrılamıyor, model uygun değil ya da iş çok küçükse en
mantıklısı yapılır ve nedeni tek cümleyle söylenir. Rol modele değil göreve bağlıdır; model
değişse (limit, fallback) işbölümü geçerlidir.

- **Yönetici** (oturumdaki en güçlü model; Fable, limit dolarsa Opus): planlama, görev bölme,
  tasarım kararları (mekanik, denge, hikâye yönü, oyuncuya hissettirilecek şey), gözden geçirme.
  Büyük/çok dosyalı kodu `coder`a devreder; tek dosyalık küçük düzeltmeyi kendisi yapar.
- **`coder`** (opus): kod (motor, ekranlar, Diyar sunucusu) ve yaratıcı içerik (hikâye yayları, sahne metinleri).
  Sunucu ve güvenlik işlerinde mümkünse `coder`; `tester`a bırakılmaz.
- **`tester`** (sonnet): smoke, i18n tamlığı, çeviri, tsc, rutin düzeltme.
- Ajan model alanını `CLAUDE_CODE_SUBAGENT_MODEL` ezer; ayarlıysa işbölümü bozulur.

Akış:
1. Yönetici `coder`a kısa brief verir: amaç, kısıtlar, ilgili TASARIM_PUSULASI noktaları, bitiş ölçütü.
2. `coder` bitirince `tester` koşar: `npx tsc --noEmit`, `i18n-icon-check`, `dil-karisma`, `olu-karar`,
   `run-parallel` (300 hayat). Başarısızsa yönetici incelemeden `coder`a geri gider.
3. Yönetici yalnız kontrolden geçen işin diff'ini okur: brief'e uyum, TASARIM_PUSULASI süzgeci
   (zamanlayıcı yok, kayıp cezası yok, parayla atlatma yok, farm yok), sistem tutarlılığı,
   oyuncu deneyimi, uç durumlar.
4. Sonuç: kabul; kısa net düzeltme isteğiyle `coder`a geri; ya da küçükse yönetici düzeltir.
   En fazla 2 düzeltme turu, sonra sorun kullanıcıya özetlenir.
5. Kritik işte (yeni ana mekanik, denge, ana destan sahneleri) `coder`dan iki farklı yaklaşım
   istenir; yönetici seçer veya birleştirir. Rutin işte tek yaklaşım.

Çok oyunculu (çevrimiçi, `online-server/` + `mobile/app/online/`): istemci eylemleri sunucuda doğrulanır
(sunucu yetkili). Testler yerelde koşar; canlıya karşı test koşturma, önce deneme (staging) Worker'ı kullan.
Eski Diyar MP (`server/`, `mobile/lib/mp/`, `app/cok-oyunculu/`) 13 Kasım'da kaldırıldı.

Geri alınması zor işlerden (silme, canlı sunucu, yayın) önce kullanıcıya sorulur; diğerlerinde sorulmaz.
Commit Türkçe, tek satır, dal `apk`. Oturum sonunda kalıcı kararlar `OTURUM_HAFIZASI.md`ye kısa yazılır.
