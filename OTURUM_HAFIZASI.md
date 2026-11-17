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
- Sunucu 703 test, hepsi geçiyor. Test Worker'ı `377b8a3`te (atölye + Dilim 3 henüz dağıtılmadı). Dağıtım: GitHub `deploy-online-server.yml`, hedef `test`.
- Bitti: sahne/atışma; han masası; çoklu han; 5 sekme + rehber; tezgâh Dilim 1; Dilim 2 atölye (sunucu + **ekran**, 6 dil, incelendi; `1f79c89`); **Dilim 3 sunucu** (`514db1b`): 87 kanca 10 kanala bağlı, tek kayıt `src/icerik/kanca-kayit.ts`, yığılma kuralı `src/mulk/kanca.ts`, boşta 232 (`bosta-kancalar.ts`, yalnız kısalır testi), denge denetimi yapıldı (toplu indirim tavanı 10 ve yalnız damgalı mal; çalışan kancası geçen aydan beri çalışıyorsa ve tek işletmeye).
- Canlı etkinlikler (yönetici): 18 etkinlik, panel Etkinlikler sekmesi (başlat/durdur, süre sayacı, dünya/beylik/tür/tek yerleşim, oyuncu sayıları), Yaşam bandı; `docs/online/ETKINLIKLER.md`.
- Ekranlar cihazda görülmedi.

## Sıradaki işler (bu sırayla)
1. Dilim 3 istemcisi: brief sonundaki "Dilim 3 protokol ekleri" (kanca dökümü, rafSiniri, depoKapasite, fiyatTablosu, indirimYuzde, tekEnCok) → çeviri → `react-reviewer`.
2. Atölye ekranı anlık yenileme: defter yalnız yaşam ekranında çekiliyor; açık atölyede yeni olay kendiliğinden gelmiyor. Geliştirici modunda sahte atölye verisi yok.
3. Kanca partisi 2 (boşta 232): konsinye `komisyon`, bakım (`yapiOnarimi`/`bakimDefteri`), `namYayma` (başka dükkânı övme hizmeti), `hileliTarti` yeni mekanik ister.
4. Oyuncu numarası (8 hane, rastgele, hesaba bağlı), arama, oyuncu sayfası.
5. Han masa oyunları çatısı + iki oyun; canlı masalar vitrini.
6. Eşya kademeleri ve özellikleri (tasarım §9: 6 kademe, efsanevi yalnız pir, hüner, yadigâr).
7. Test Worker'ını yeniden dağıt; Berkay APK çıkarır.

## Berkay'da
- `GOOGLE_CLIENT_ID`, FCM, Play ürünleri/ödeme; test APK'sı ve 5–10 kişilik cihaz denemesi (ses dahil).
- Karar: Debdebe armağanının teveccühe girmesi; süre kısaltma satışı (`ONLINE_DURUM.md` §5).
