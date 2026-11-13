# Kronikler — güncel çalışma özeti (13 Kasım 2026)

## Yetki ve kalıcı kurallar
- Repo Tayma96/kroniklerorj; ana dal `apk`. Türkçe, tek satırlı commit, ek satır yok. Berkay 13 Kasım'da tam yetki verdi (birleştirme, silme, `apk`'ye push dahil).
- Tek sert kural: **her şey ücretsiz**. Ek ücret çıkarabilecek her adım (Cloudflare, mağaza, ses) önce kontrol edilir. Anahtarları okuma/yazdırma.
- Yeni oyuncu metni tr/en/es/pt/ar/ru. Eski kayıt ve çevrimdışı akış korunur; yeni kayıt alanları opsiyonel.
- Model işbölümü `AGENTS.md`'de (yönetici karar ve inceleme, `coder` opus, `tester` sonnet); esnek, verime göre.

## Ürün yapısı (13 Kasım kararı)
- İki seçenek: **Tek Oyunculu** (`mobile/app/oyun/`, çevrimdışı) ve **Çok Oyunculu** (`mobile/app/online/`, sunucu `online-server/`). Kayıtlar ayrı.
- Eski Diyar MP tamamen söküldü (`cok-oyunculu/`, `lib/mp/`, `server/`, dağıtım iş akışı, `mpMode`, `mp.*` metinleri). Motorda `mpRealm` ve diyar fonksiyonları test betikleri kullandığı için duruyor.
- Girişteki "Çok Oyuncu" düğmesi `/online`'a gider; kapı kapalı (`EXPO_PUBLIC_ONLINE_GELISTIRME`), "Yakında" gösterir.
- Ekran envanteri ve sade yapı önerisi: `EKRAN_HARITASI.md` (70 ekran).

## Çevrimiçi durum
- ChatGPT'nin `feature/online-p5-darbe-zinciri` dalı incelenip `apk`'ye birleştirildi: P5–P6 darbe/bağımsız devlet, Y2–Y3 yönetim, ekonomi/mülk/siyaset/topluluk/Debdebe ekranları, test girişi (varsayılan kapalı), elle tetiklenen dağıtım iş akışı.
- Sunucu: 466 test, 465 geçti, 1 atlandı. Yapılandırmada ücretli bağlama yok (yalnız SQLite Durable Object).
- Birleştirmede bulunan eksik: Mülk ve İşletme ekranlarının 178 metni hiç yazılmamıştı; 6 dilde eklendi (`i18n-sayfa/online5.ts`).
- Ayrıntılı devir: `docs/online/DEVIR_2026-11-12.md` (54 KB; yalnız ilgili bölümü oku).
- Sunucu hiç dağıtılmadı; hiçbir çevrimiçi ekran gerçek sunucuyla denenmedi.

## Sıradaki işler
1. Deneme (staging) sunucusu: Cloudflare ücretsiz plan sınırlarını doğrula, sonra `deploy-online-server.yml` ile test Worker'ı. İlk dilim: giriş → profil → yerleşim → yaşam → meslek → işler.
2. Çevrimiçi kodun güvenlik ve denge incelemesi (`security-reviewer`, `denge-denetcisi`) dağıtımdan önce.
3. Tek oyunculu sadeleştirme (`EKRAN_HARITASI.md` §7): Divan'ı bağla, iki "Kronik" adını ayır, Menü ile Şehir'i birleştir, Açık İşler'i kaldır.
4. Çevrimiçi Yaşam ekranının gezinmesini topla (20'ye yakın çıkış).
5. E4 kalan beceri etkileri (34 hizmet, 203 hak); meslek gelir dengesi.

## Berkay'ın yapacakları
- Cloudflare panelinden eski `kronikler-mp` Worker'ını sil (boşta ücret çıkarmaz, yalnız temizlik).
- Deneme sunucusu için GitHub'a `CLOUDFLARE_API_TOKEN` sırrı ve Worker sırları (`OTURUM_ANAHTARI`, `TEST_GIRIS_KODU`).
