# Kronikler — güncel çalışma özeti (16 Kasım 2026)

## Kurallar
- Repo Tayma96/kroniklerorj, ana dal `apk` (oturum dalına aynı commit). Türkçe tek satır commit, ek satır yok.
- Tek sert kural: **her şey ücretsiz**. Anahtar okuma/yazdırma yok.
- Berkay (15 Kasım): "Benden talimat ve onay bekleme, en iyisi nasılsa yap." İstisna: canlı/test Worker dağıtımı, silme, gerçek para/ödeme.
- Yönetici en güçlü model; kod Opus alt ajan, test ve **çeviri Sonnet** (istemci ajanı metni yalnız Türkçe yazar). En çok 2 ajan, çakışmayan klasörlerde. Limit kesilirse SendMessage ile sürdür.
- Kalite çıtası "AAA metin oyunu": her ekran sahne; hareket tek ortak katmandan (150–300 ms, UI iş parçacığı, reduce motion); ölü karar yok; her arayüz işi `react-reviewer`dan geçer. **Hiçbir meslek ve beceri kancası boşta kalmaz.**
- Yeni oyuncu metni 6 dilde. Bulut oturumunda developers.cloudflare.com kapalı.

## Çevrimiçi durum
- Tek durum belgesi: `docs/online/ONLINE_DURUM.md`. Sunucu 622+ test, canlı test Worker'ı var (yeni commit'ler dağıtılmadı).
- 15–16 Kasım: H8 ozan sahnesi ve atışma sunucusu (`7b09ee4`); han masası koltuk düzeni, kişi kartı, ikram/Debdebe armağan çekmecesi (`026740a`); çoklu han sunucusu — şehir 5, kasaba 2, köy yalnız NPC, plakada `kisi`/`nam` (`860d0ad`).
- Sürüyor: han ekranı inceleme düzeltmeleri + sahne/atışma arayüzü (istemci); han listesi alt istek sayısını ≤12'ye indirme (sunucu).

## Sıradaki işler (bu sırayla)
1. İstemci: han seçici (yerleşimde han listesi, `?han=N`, hata `han_gecersiz|han_yok|han_siniri`), mülk ekranında arsa/yuva.
2. Dükkân/atölye **tezgâh modeli**: atölye zanaata göre üretir, dükkân raf+fiyatla satar, yerleşimin sınırlı NPC talebi fiyat/kalite/itibara göre paylaşılır (hanlar dahil), boş rafta kepenk (bakım/iflas durur). Önce kanca dökümü, tasarım `docs/superpowers/specs/`, coder'dan iki yaklaşım.
3. Oyuncu numarası (8 hane, rastgele, hesaba bağlı), arama, oyuncu sayfası (armağan duvarı, anlar, söz).
4. Sokak sahnesi: Yaşam'daki ~25 giriş yerine dokunulabilir yerleşim; ilk adımlar rehberi; "Debdebe" girişi "Mağaza" adıyla.
5. Han masa oyunları çatısı + iki oyun; canlı masalar vitrini; hızlı tepkiler.

## Tasarım kararları (15 Kasım)
- Armağan: akçeyle ikram (akçe yanar, alıcıya geçmez) + Debdebe. Şans/ödül havuzu mekaniği yok. Gerçek fotoğraf yükleme yok.
- Masa açmak herkese ücretsiz; han kıt mülk. Bir kişi aynı yerleşimde en çok 1 han.

## Berkay'da
- Realtime uygulaması (`REALTIME_APP_ID/TOKEN`), `GOOGLE_CLIENT_ID`, FCM, Play ürünleri ve ödeme sırları; yeni test APK'sı ve 5–10 kişilik gerçek cihaz denemesi.
- Karar: Debdebe armağanının teveccühe (gelir, seçim) girmesi; süre kısaltma satışı (`ONLINE_DURUM.md` §5).
