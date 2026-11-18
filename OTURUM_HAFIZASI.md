# Kronikler — güncel çalışma özeti (17 Kasım 2026)

## Kurallar
- Repo Tayma96/kroniklerorj, ana dal `apk` (oturum dalına aynı commit). Türkçe tek satır commit, ek satır yok.
- Tek sert kural: **her şey ücretsiz**. Sır değeri okunmaz/yazdırılmaz. Cloudflare'e kart eklenmez.
- Berkay: "Talimat ve onay bekleme, en iyisi nasılsa yap." İstisna: üretim dağıtımı, silme, gerçek para.
- **Token disiplini:** oturum uzayınca her mesaj limitin %30'unu yiyor → her büyük iş YENİ oturumda; aynı anda TEK Opus ajanı (+bir Sonnet); her ajana `model` açıkça yaz; düzeltmeyi dar kapsamlı yeni ajanla yap; ara durum mesajı yok.
- **Kayıp önlemi:** konteyner yenilenince commit'siz iş siliniyor. Uzun işte ajan her adımda ara kaydı oturum dalına push eder; `apk`ye inceleme sonrası yönetici gönderir.
- **İki Claude hesabı sırayla** aynı işi sürdürür (biri limite girince öbürü): her push'tan önce `git fetch origin apk`, öbürünün commit'lerini koru. Etkinlik işi bitti (`docs/online/ETKINLIKLER.md`), ikinci kez yapma.
- Kod Opus (`online-sunucu`, `online-istemci`), test ve **çeviri Sonnet** (`tester`; istemci ajanı metni yalnız Türkçe yazar). Ajanlara `git stash` yasak.
- Çıta "AAA metin oyunu": hareket yalnız `lib/online/ui.tsx` `HAREKET`/`belir`/`giris`/`BASMA_OLCEK`; her arayüz işi `react-reviewer`, her ekonomi işi `denge-denetcisi` (model yaz). Hiçbir meslek/beceri kancası boşta kalmaz.

- **İş bölümü (Berkay, 17 Kasım):** tek oyunculu oyunu Berkay'ın ÖBÜR hesabındaki Claude geliştirir. Bu oturum yalnız çevrimiçi (`online-server/`, `mobile/app/online/`, `mobile/lib/online/`). Tek oyunculu dosyalara dokunma; gerekirse dar, açıklamalı değişiklik ve öbür hesabın `apk` commit'lerini birleştirirken onları koru.
- **Yönetici kuralı (Berkay, 17 Kasım):** kurucu (Berkay) hiçbir şeyle sınırlanmaz — kendine/herkese istediği kadar akçe/mal verir-alır, tavan ve kendine-fayda yasağı kurucuya uygulanmaz. Sınırlar oyuncular içindir; moderatör yetkilerini kurucu panelden tek tek belirler.

## Çevrimiçi durum (17 Kasım)
- Belgeler: `docs/online/ONLINE_DURUM.md`; tasarım `docs/superpowers/specs/2026-11-16-tezgah-modeli-design.md`; **protokol ve ekran brief'i** `…-tezgah-istemci-brief.md` (Dilim 1 + Dilim 2 atölye).
- Sunucu 771 test, hepsi geçiyor. Test Worker'ı `a25a20f`te (17 Kasım işleri dahil). Dağıtım: GitHub `deploy-online-server.yml`, hedef `test`. Yeni sır adı `ZAR_SIRRI` (≥16 karakter; yoksa yedek tohum) — Berkay Cloudflare'de tanımlamalı.
- 17 Kasım bitti (hepsi 6 dil, react-reviewer + denge denetimi + düzeltmeler): atölye ekranı; Dilim 3 kancaları (87 bağlı, boşta 232) + ustalık etkileri ekranı; oyuncu numarası/arama/künye; han masa oyunları (Çanak Zarı, Dokuz Taş, vitrin; ödül yok, zamanlayıcı yok); eşya kademeleri (7 kademe, nadide/efsanevi/tılsımlı, hüner, yadigâr; efsanevi tavan %20, tılsım binde 15, zar HMAC'li; adlı eşya yalnız kimlikle harcanır). Brief'ler `docs/superpowers/specs/2026-11-17-*`.
- Worktree'li paralel ajanda dikkat: `node_modules` bağı commit'lenmesin (gitignore artık bağları da kapsar).
- Canlı etkinlikler (yönetici): 18 etkinlik, panel Etkinlikler sekmesi (başlat/durdur, süre sayacı, dünya/beylik/tür/tek yerleşim, oyuncu sayıları), Yaşam bandı; `docs/online/ETKINLIKLER.md`.
- Ekranlar cihazda görülmedi.

## 17 Kasım akşamı: arkadaş denemesi
- Üretim Worker'ı `kronikler-online` açıldı (Berkay onayı; yayından önce veri sıfırlanır, `TEST_GIRIS_ACIK` "0" yapılır). Sırlar kurulu; Realtime uygulaması ayrı.
- Davet kodu Berkay'da. APK: `apk-test`, üretime bağlı. Herkese açık indirme: https://kronikler-indir.berkaycinkilic.workers.dev (iş akışı `apk-indir.yml`, Release'ten parçalayıp yayınlar ve doğrular).
- E-posta ile giriş/kayıt sonraya kaldı: yarım iş `eposta-giris-taslak` dalında.

## Tek oyunculu yeniden yapılanma (17 Kasım, bu hesap)
- Berkay tek oyunculuda tam yetki verdi; çevrimiçi öbür hesapta. Plan `docs/tek-oyunculu/TASARIM.md` (K1–K10, F0–F10), denetimler `docs/tek-oyunculu/denetim/`. Yeni hikâye yok. Bitti ve apk'de: F0 tek zar, F1 stat/niyet, F2 hüner ağacı, F3 mektep/medrese/icazet, F4 usta kapısı/meslek/lonca, F5 işletme/vakıf/ekonomi dengesi. Sırada F6 insanlar/kancalar. Commit footer'sız (mobile/AGENTS.md).

## Sıradaki işler
1. Arkadaş denemesi geri bildirimleri (APK `a842f8e`, sunucular `14bd056`; 826 test; `test/istemci-uyum.test.ts` istemci-sunucu uyumunu korur).
2. Panel: `/yonetim`, kurucu anahtarı sırrı `YONETIM_KURUCU_ANAHTARI` (Berkay'da). Dünya sıfırlama: `DUNYA_SURUMU` (README).
3. E-posta girişi (taslak dal) + doğrulama; Google girişi. Kanca partisi 2; APK boyutu (~170 MB).
4. Öbür hesap tek oyunculu değiştirince GDD tabanını güncellemiyor → APK kapısı düşer; gerekçeyle yenile (`gdd-baseline.cjs --kaydet`, `docs/denetim/gdd-baseline-degisimi.json`).

## Berkay'da
- `GOOGLE_CLIENT_ID`, FCM, Play ürünleri/ödeme; test APK'sı ve 5–10 kişilik cihaz denemesi (ses dahil).
- Karar: Debdebe armağanının teveccühe girmesi; süre kısaltma satışı (`ONLINE_DURUM.md` §5).
