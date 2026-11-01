# Giriş ve yeni oyun — tasarım (kısa)

Tarih: 29 Ekim 2026 · Durum: kullanıcı yönü verdi, uygulanıyor; sonuç ekran görüntüsüyle onaya sunulacak.

## Neden
Codex'in 18 Ekim değişikliğinden sonra iki ekran karanlık, düz ve "web sitesi gibi". Kullanıcı:
"profesyonel bir tasarımcı gibi" ve "düz metin gibi olmasın".

## Kararlar (kullanıcı)
- Yalnız bu iki ekran ele alınır.
- Giriş: mockup dili (aydınlık resimli sahne, altın çerçeveli panel, madalyon ikon) ile yeniden.
- Yeni oyun üç adım: 1) ad soyad + cinsiyet → İleri 2) çocukluk tabiatı → İleri 3) doğduğun
  ocak → Dünyayı Yarat → mevcut prolog. Her adımın kendi tasarımı.

## Giriş (`mobile/app/index.tsx`)
- Tam ekran aydınlık kasaba resmi (`assets/tasarim/v4/town-*.jpg`, mevsime göre) yavaş
  yakınlaşmayla; üstte ve altta okunurluk için koyu geçiş.
- Ortada logo: küçük "KRONİKLER", büyük altın "KÜLLERİN MİRASI", süs ayracı, yeni slogan
  ("Kül & Köz · çevrimdışı" kalkar).
- Altta altın çerçeveli menü paneli. "Devam Et" altın ana düğme (kayıt varsa), "Yeni Oyun",
  "Çok Oyunculu". Her düğmede madalyon ikon ve ok, en az 56 pt yükseklik. BETA etiketi altın;
  mavi yok.
- Sağ üstte ayarlar madalyonu; mevcut dil, ses ve titreşim ayarları korunur. Altta sürüm.
- Animasyon: başlık süzülerek gelir, düğmeler sırayla belirir, hafif kor parçacıkları
  (`useSadeMod` açıksa kapalı). Dokunmada küçülme ve ses.

## Yeni oyun (`mobile/app/yeni-oyun.tsx`)
- Ortak çerçeve: adım başına tam ekran sahne. Üstte geri düğmesi ve 3 madalyonlu adım
  göstergesi (Kimlik · Tabiat · Ocak), adım başlığı ve tek satır alt yazı. Altta "Geri" ve
  altın "İleri" ya da "Dünyayı Yarat"; adım geçerli olmadan İleri pasif. Adımlar arası
  kayarak ya da solarak geçiş.
- **Adım 1 — Kim olacaksın:** çerçeveli ad soyad alanı. Cinsiyet iki büyük portre kartı
  (`assets/portre/e_genc.png`, `k_genc.png`), seçili kartta altın parıltı. ♂/♀ işaretleri
  kalkar; etiketler "Erkek" / "Kadın". Soy sürdürme seçeneği (varsa) burada kalır.
- **Adım 2 — Çocukluğunda tabiatın:** 4 kart (2×2), her birinde madalyon ikon, ad ve açıklama.
- **Adım 3 — Doğduğun ocak:** 4 kart, her birinde sahne küçük resmi (köylü `hasat`, esnaf
  `atolye_demirci`, hekim `medrese`, sipahi `ev_varlikli`), ad ve kazanımlar. Arka plan
  seçilen ocağın resmine yumuşakça geçer.
- Başlatma mantığı, üzerine yazma uyarısı ve prolog aynen kalır. Ocak bloğundaki JSX iç içe
  geçme hatası düzeltilir.

## Kurallar
Yeni her metin 6 dilde; `GameIcon`; `lib/theme.ts`; 320 ve 390 px'de taşma yok; dokunma
alanı ≥ 44 pt; erişilebilirlik etiketleri.
