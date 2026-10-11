# Drive yedeği ile depo karşılaştırması — 11 Ekim 2026

Başlangıç: `Tayma96/kroniklerorj`, `apk`, `8258e3e`.
Bu çalışma tam sahne sürümünü kurtarmış değildir; kaynak eksikleri aşağıdadır.

## Sonuç

- İlgili Drive klasörlerinde 547 dosya envantere alındı; 289 dosya karşılaştırma için indirildi.
- Proje kopyalarından karşılaştırılan 214 dosyanın 167'si depodaki karşılığıyla birebir aynı.
- 23 farklı kayıt çoğunlukla eski ayarlar, farklı sürümlerin oturum notları ve ses dalının paket bilgileri.
- 24 karşılıksız kayıt çoğunlukla görsel karşılaştırma raporları ve bilerek çıkarılmış eski web artıklarından oluşuyor.
- Sayılar yalnız dosya bazında indirilen proje kopyaları içindir; bütün kaynak kodunun eşit olduğu anlamına gelmez.
- Dost Haneler taslağındaki `dost.ts`, mevcut depodaki dosyayla birebir aynı; işlev zaten entegre.

## Kurtarılan ve kullanılanlar

| Konum | Sonuç |
|---|---|
| `mobile/assets/npc/` | 48 özgün JPEG; 16 kimliğin genç/olgun/yaşlı sürümleri |
| `mobile/lib/npc-portre.ts` ve `ui.tsx` | 16+ NPC'lerde aynı kişi kimliğine bağlı, yaşla evre değiştiren portre seçimi; mevcut ekranların seed çağrılarına bağlandı |
| `mobile/assets/ses/` | ZIP'teki 63 kayıt, kaynak dökümü ve lisans belgesi kurtarıldı |
| `mobile/lib/sound.ts` | Mevcut 17 efekt çağrısı ve ana tema kurtarılan kayıtlara bağlandı; mevcut ayar anahtarları korundu |
| `mobile/lib/ses-atif.ts`, `app/oyun/emek.tsx`, `lib/i18n.tsx` | Kaynak/yazar/lisans adresleri ve altı dilde işlem açıklaması oyun içine eklendi |
| `mobile/scripts/_smoke/kurtarma-check.cjs` | Kişi kimliği, yaş/cinsiyet/fallback, dosya ve ses kaynağı bütünlüğü denetimi; APK/AAB kalite kapısına eklendi |
| `docs/taslak/` | Çığır tasarımı, satış planı ve mağaza sayfası taslağı korundu |

NPC kaynakları 1280×720; eski devir notundaki 512×512 iddiasından farklı. Görseller değiştirilmeden kurtarıldı.
Gerçek NPC'lerin yüzü meslek değişince değişmesin diye kimlikte meslek kullanılmadı. Sarıklı âlim yüzü (`e05`) gelecekteki isimsiz âlim rolleri için korunur; genel gerçek kişi havuzuna girmez.

Oyuncu portrelerinin dosyaları değiştirilmedi. NPC havuzu oyuncuya atanmaz; oyuncu görsellerinin yeniden tasarımı ayrı, henüz yapılmamış iştir.

## Kurtarılan fakat bağlantısı eksik kalanlar

- `mobile/assets/arka/`: 15 sahne arka planı ve özgün etiket listesi. Mevcut ekranlara rastgele atanmadı; sahne kodu gelince bağlanmalı.
- Ses paketinin diğer 45 kaydı: sahne, ortam ve bağlamsal müzik için depoda korundu. Mevcut oynatıcı yalnız 18 kaydı kullanır.
- `docs/SAHNE_DEVIR_NOTLARI.md`: yedeğin sahne v1–v3 notları. Eski test sonuçları yalnız kaynak belgenin iddialarıdır; mevcut sürümün doğrulaması değildir.
- `docs/VARLIK_KURTARMA.json`: 126 medya dosyasının bayt sayısı ve SHA-256 sağlaması.

## Tam entegrasyonu engelleyen kaynak eksikleri

Drive üzerinden görünür TypeScript kaynakları yalnız `kronikler-taslak-dost/dost.ts` ve `dost-ui.tsx`.
Proje kopyalarının `mobile/lib`, `mobile/app` ve `_smoke` klasörleri yeni sürümün kaynaklarını göstermiyor.
`.git/objects/pack` klasörü de boş görünüyor. Devir notunda geçen `1a0648b` commit'i bu GitHub deposunda bulunamadı.

Şunların özgün dosyaları gerekli:

- `mobile/lib/sahne.ts`, `sahne-amiral.ts`, `sahne-ui.tsx`, `arka.ts`
- Güncel `mobile/app/oyun/index.tsx`, `serit.tsx`, `_layout.tsx`, `divan.tsx`
- Güncel `mobile/lib/game.ts` ve altı dilin sahne metinleri (`i18n-cigir.ts` dahil)
- `scene-check.cjs`, `arka-check.cjs`, sahneleri oynatan güncel smoke betikleri
- Yeni ses katmanının kaynak kodu ve katalog/üretim betikleri

Bu dosyalar gelmeden Hayat Şeridi, 18 amiral sahne, sakin ayları geçme, sahne bazlı müzik/ortam geçişleri veya tam v3 sahne oynatıcısı için tamamlandı denemez.
En güvenilir teslim, özgün proje klasörünün ZIP arşividir; tek tek fotoğraf ve devir notları kaynak kodunu yerine koymaz.

## Diğer depo gözlemleri

Mobil ve sunucu protokol dosyaları bayt bayt aynı. APK/AAB workflow'ları kalite kapısı ve ortak imza secret adlarını zaten kullanıyor; eski inceleme raporunun aksi yöndeki maddeleri güncelliğini yitirmiş.
Eski web yığını `legacy/` altında. Drive'daki eski sürümü geri kopyalamak depoyu geriye götürürdü.
Bu değişiklik sunucu dağıtımı, APK üretimi veya mağaza yayını yapmaz; Android paketleme doğrulaması cihaz testi yerine geçmez.

## Bu oturumun doğrulaması

- Mobil ve sunucu TypeScript: 0 hata.
- `kurtarma-check.cjs`: 48 NPC, 63 ses ve 15 arka plan denetimi geçti.
- Altı dil/ikon ve dil karışması denetimleri: 0 sorun.
- Eski kayıt göçü: 51 tur başarıyla oynandı.
- Dost Haneler, görsel paylaşım ve ölü karar denetimleri geçti.
- 300 hayat simülasyonu: HATA 0; ölüm yaşı medyan 63, min 15, max 74; 3,8 dakika.
  Motor dosyası bu entegrasyonda değiştirilmedi; simülasyon başlangıç motorunu doğrular.
- Android/Hermes paketi başarıyla üretildi; yeni NPC havuzu ve kullanılan 18 ses dosyası paketlendi.
- 63 AAC kaydı tamamen çözümlendi: 0 hata. 63 JPEG dosyası doğrulandı.
- APK derlemesi ve fiziksel cihazda yüz kırpımı/ses dinleme testi yapılmadı.
