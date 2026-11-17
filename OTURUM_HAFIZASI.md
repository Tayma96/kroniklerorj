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

## Çevrimiçi durum (17 Kasım)
- Belgeler: `docs/online/ONLINE_DURUM.md`; tasarım `docs/superpowers/specs/2026-11-16-tezgah-modeli-design.md`; **protokol ve ekran brief'i** `…-tezgah-istemci-brief.md` (Dilim 1 + Dilim 2 atölye).
- Sunucu 771 test, hepsi geçiyor. Test Worker'ı `377b8a3`te; 17 Kasım işleri dağıtılmadı. Dağıtım: GitHub `deploy-online-server.yml`, hedef `test`. Yeni sır adı `ZAR_SIRRI` (≥16 karakter; yoksa yedek tohum) — Berkay Cloudflare'de tanımlamalı.
- 17 Kasım bitti (hepsi 6 dil, react-reviewer + denge denetimi + düzeltmeler): atölye ekranı; Dilim 3 kancaları (87 bağlı, boşta 232) + ustalık etkileri ekranı; oyuncu numarası/arama/künye; han masa oyunları (Çanak Zarı, Dokuz Taş, vitrin; ödül yok, zamanlayıcı yok); eşya kademeleri (7 kademe, nadide/efsanevi/tılsımlı, hüner, yadigâr; efsanevi tavan %20, tılsım binde 15, zar HMAC'li; adlı eşya yalnız kimlikle harcanır). Brief'ler `docs/superpowers/specs/2026-11-17-*`.
- Worktree'li paralel ajanda dikkat: `node_modules` bağı commit'lenmesin (gitignore artık bağları da kapsar).
- Canlı etkinlikler (yönetici): 18 etkinlik, panel Etkinlikler sekmesi (başlat/durdur, süre sayacı, dünya/beylik/tür/tek yerleşim, oyuncu sayıları), Yaşam bandı; `docs/online/ETKINLIKLER.md`.
- Ekranlar cihazda görülmedi.

## Sıradaki işler (bu sırayla)
1. Test Worker'ını yeniden dağıt; Berkay APK çıkarır, cihazda ilk bakış (ekranlar hiç görülmedi).
2. Kanca partisi 2 (boşta 232): konsinye `komisyon`, bakım, `namYayma` (başka dükkânı övme hizmeti), `hileliTarti` (kısa kâr / yakalanırsa ün kaybı); 57 boşta `kalite(...)` etkisi; eşya aile etkileri (silah, zırh, yiyecek) yalnız alet bağlı.
3. Atölye emrinde alet verimi uygulanmıyor; eski engellerin hesap düzeyine geriye dönük doldurulması yok.
4. `eslint-plugin-react-hooks` mobilde yok; eklenip tester akışına konmalı.

## Berkay'da
- `GOOGLE_CLIENT_ID`, FCM, Play ürünleri/ödeme; test APK'sı ve 5–10 kişilik cihaz denemesi (ses dahil).
- Karar: Debdebe armağanının teveccühe girmesi; süre kısaltma satışı (`ONLINE_DURUM.md` §5).
