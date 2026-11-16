# Kronikler — güncel çalışma özeti (17 Kasım 2026)

## Kurallar
- Repo Tayma96/kroniklerorj, ana dal `apk` (oturum dalına aynı commit). Türkçe tek satır commit, ek satır yok.
- Tek sert kural: **her şey ücretsiz**. Sır değeri okunmaz/yazdırılmaz. Cloudflare'e kart eklenmez.
- Berkay: "Talimat ve onay bekleme, en iyisi nasılsa yap." İstisna: üretim dağıtımı, silme, gerçek para.
- **Token disiplini:** oturum uzayınca her mesaj limitin %30'unu yiyor → her büyük iş YENİ oturumda; aynı anda TEK Opus ajanı (+bir Sonnet); her ajana `model` açıkça yaz; düzeltmeyi dar kapsamlı yeni ajanla yap; ara durum mesajı yok.
- **Kayıp önlemi:** konteyner yenilenince commit'siz iş siliniyor. Uzun işte ajan her adımda ara kaydı oturum dalına push eder; `apk`ye inceleme sonrası yönetici gönderir.
- **Başka bir Claude oturumu** (Berkay'ın diğer hesabı) yönetici paneli ve etkinlikler üzerinde çalışıyor: her push'tan önce `git fetch origin apk`, onun commit'lerini koru, ezme. Etkinlik işini ikinci kez yapma.
- Kod Opus (`online-sunucu`, `online-istemci`), test ve **çeviri Sonnet** (`tester`; istemci ajanı metni yalnız Türkçe yazar). Ajanlara `git stash` yasak.
- Çıta "AAA metin oyunu": hareket yalnız `lib/online/ui.tsx` `HAREKET`/`belir`/`giris`/`BASMA_OLCEK`; her arayüz işi `react-reviewer`, her ekonomi işi `denge-denetcisi` (model yaz). Hiçbir meslek/beceri kancası boşta kalmaz.

## Çevrimiçi durum (17 Kasım)
- Belgeler: `docs/online/ONLINE_DURUM.md`; tasarım `docs/superpowers/specs/2026-11-16-tezgah-modeli-design.md`; **protokol ve ekran brief'i** `…-tezgah-istemci-brief.md` (Dilim 1 + Dilim 2 atölye).
- Sunucu 668 test, hepsi geçiyor (`kervan-akis` ara sıra düşer: duvar saati). Test Worker'ı `05d2e17`de (ses açık); sonraki commit'ler dağıtılmadı. Dağıtım: GitHub `deploy-online-server.yml`, hedef `test`.
- Bitti: sahne/atışma; han masası; çoklu han; 5 sekme + rehber; tezgâh Dilim 1 (sunucu, denge düzeltmeleri, dükkân ekranları + inceleme düzeltmeleri); **Dilim 2 atölye sunucusu** (zanaat, atölyede üretim, emek havuzu, üretim emri, toplu sipariş, genişletme).
- Ekranlar cihazda görülmedi.

## Sıradaki işler (bu sırayla)
1. Dilim 2 `denge-denetcisi` (brief'teki açık riskler) → düzeltme; tasarım §6 ve `ONLINE_DURUM.md` güncellemesi.
2. Atölye ekranı (brief sonundaki madde) → çeviri → `react-reviewer` → düzeltme.
3. Dilim 3: meslek kancaları ilk parti ≈70 (tasarım §7) + "boşta kanca listesi yalnız kısalır" testi (199 hak'tan 196'sı boşta).
4. Oyuncu numarası (8 hane, rastgele, hesaba bağlı), arama, oyuncu sayfası.
5. Han masa oyunları çatısı + iki oyun; canlı masalar vitrini; hızlı tepkiler.
6. Test Worker'ını yeniden dağıt; Berkay test APK'sı çıkarır.

## Berkay'da
- `GOOGLE_CLIENT_ID`, FCM, Play ürünleri/ödeme; test APK'sı ve 5–10 kişilik cihaz denemesi (ses dahil).
- Karar: Debdebe armağanının teveccühe girmesi; süre kısaltma satışı (`ONLINE_DURUM.md` §5).
