# Kronikler — güncel çalışma özeti (16 Kasım 2026, gece)

## Kurallar
- Repo Tayma96/kroniklerorj, ana dal `apk` (oturum dalına aynı commit). Türkçe tek satır commit, ek satır yok.
- Tek sert kural: **her şey ücretsiz**. Sır değeri okunmaz/yazdırılmaz. Cloudflare'e kart eklenmez.
- Berkay: "Talimat ve onay bekleme, en iyisi nasılsa yap." İstisna: üretim dağıtımı, silme, gerçek para.
- **Token disiplini:** oturum uzayınca her mesaj limitin %30'unu yiyor → her büyük iş YENİ oturumda; aynı anda TEK Opus ajanı (+bir Sonnet); her ajana `model` açıkça yaz; düzeltmeyi dar kapsamlı yeni ajanla yap; ara durum mesajı yok.
- **Kayıp önlemi:** konteyner yenilenince commit'siz iş siliniyor. Uzun işte ajan her adımda ara kaydı oturum dalına push eder; `apk`ye inceleme sonrası yönetici gönderir.
- **Başka bir Claude oturumu** (Berkay'ın diğer hesabı) yönetici paneli ve etkinlikler üzerinde çalışıyor: her push'tan önce `git fetch origin apk`, onun commit'lerini koru, ezme. Etkinlik işini ikinci kez yapma.
- Kod Opus (`online-sunucu`, `online-istemci`), test ve **çeviri Sonnet** (`tester`; istemci ajanı metni yalnız Türkçe yazar). Ajanlara `git stash` yasak.
- Çıta "AAA metin oyunu": hareket yalnız `lib/online/ui.tsx` `HAREKET`/`belir`/`giris`/`BASMA_OLCEK`; her arayüz işi `react-reviewer`, her ekonomi işi `denge-denetcisi` (model yaz). Hiçbir meslek/beceri kancası boşta kalmaz.

## Çevrimiçi durum (`apk` = `a59c82b` + bu dosya)
- Belgeler: `docs/online/ONLINE_DURUM.md`; tasarım `docs/superpowers/specs/2026-11-16-tezgah-modeli-design.md` (§6.1 Dilim 2 kararları); istemci protokolü `…-tezgah-istemci-brief.md`.
- Sunucu 652 test. Test Worker'ı `05d2e17` ile dağıtıldı; ses açık (Realtime + sır kurulu). Test dağıtımını yönetici yapar: GitHub `deploy-online-server.yml`, hedef `test`.
- Bitti: sahne/atışma; han masası; çoklu han + seçici; 5 sekme + "Şimdi" rehberi; tezgâh Dilim 1 sunucu + denge düzeltmeleri; dükkân ekranları (Dükkânım, Çarşı, satın alma, devralma, yolcu payı; 6 dil).
- Ekranlar cihazda görülmedi; `design-preview.cjs` burada çalışmıyor.

## Sıradaki işler (bu sırayla)
1. Dükkân ekranları `react-reviewer` incelemesi (commit `0c54c4d`, `a59c82b`; yarıda kesildi) → düzeltme → push.
2. Tezgâh Dilim 2 atölye sunucusu (tasarım §6 + §6.1; hiç kod yok) → `denge-denetcisi` → istemci → çeviri.
3. Dilim 3: meslek kancaları ilk parti ≈70 (§7) + "boşta kanca listesi yalnız kısalır" testi (199 hak'tan 196'sı boşta).
4. Oyuncu numarası (8 hane, rastgele, hesaba bağlı), arama, oyuncu sayfası.
5. Han masa oyunları çatısı + iki oyun; canlı masalar vitrini; hızlı tepkiler.
6. Sonra: test Worker'ını yeniden dağıt; Berkay test APK'sı çıkarır.

## Berkay'da
- `GOOGLE_CLIENT_ID`, FCM, Play ürünleri/ödeme; test APK'sı ve 5–10 kişilik cihaz denemesi (ses dahil).
- Karar: Debdebe armağanının teveccühe girmesi; süre kısaltma satışı (`ONLINE_DURUM.md` §5).
