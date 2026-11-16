# Kronikler — güncel çalışma özeti (16 Kasım 2026, akşam)

## Kurallar
- Repo Tayma96/kroniklerorj, ana dal `apk` (oturum dalına aynı commit). Türkçe tek satır commit, ek satır yok.
- Tek sert kural: **her şey ücretsiz**. Anahtar okuma/yazdırma yok.
- Berkay: "Talimat ve onay bekleme, en iyisi nasılsa yap." İstisna: üretim dağıtımı, silme, gerçek para/ödeme.
- **Token disiplini (Berkay, 16 Kasım):** aynı anda TEK Opus ajanı (+en çok bir Sonnet); her ajana `model` açıkça yaz (yazılmazsa en pahalı modelde koşar); düzeltme turu büyümüş ajanı sürdürerek değil dar kapsamlı yeni ajanla; ajan çalışırken ara durum mesajı yazma; her büyük iş yeni oturumda.
- Yönetici plan/tasarım/inceleme; kod Opus (`online-sunucu`, `online-istemci`), test ve **çeviri Sonnet** (`tester`; istemci ajanı metni yalnız Türkçe yazar). Ajanlara "commit/push yok, `git stash` yok" de; commit'i yönetici atar.
- Çıta "AAA metin oyunu": her ekran sahne; hareket yalnız `lib/online/ui.tsx` `HAREKET`/`belir`/`giris`/`BASMA_OLCEK`; ölü karar yok; her arayüz işi `react-reviewer`dan, her ekonomi işi `denge-denetcisi`nden geçer. Hiçbir meslek/beceri kancası boşta kalmaz.

## Çevrimiçi durum
- Durum belgesi `docs/online/ONLINE_DURUM.md`; tasarım `docs/superpowers/specs/2026-11-16-tezgah-modeli-design.md`.
- Sunucu 652 test. Test Worker'ı 16 Kasım'da `05d2e17` ile dağıtıldı; ses açık (Realtime + `REALTIME_APP_TOKEN`). Test dağıtımını yönetici yapar (GitHub `deploy-online-server.yml`, hedef `test`); sır değeri okunmaz. Üretim ve ücretli her şey Berkay'a sorulur.
- Bitti (15–16 Kasım): ozan sahnesi/atışma; han masası koltuk, kişi kartı, ikram/armağan; çoklu han (şehir 5, kasaba 2) + han seçici; 5 sekmeli gezinme (Yaşam, Sokak, İşim, Çevrem, Ben) + "Şimdi" rehberi; tezgâh modeli Dilim 1 sunucusu (raf, depo, hane bütçesi, kepenk = satışsız ay, devralma 60 ay, han yolcu havuzu) ve denge denetimi düzeltmeleri.
- **Yarım:** tezgâh Dilim 1 istemcisi (ara kayıt commit'li). Brief ve protokol: `docs/superpowers/specs/2026-11-16-tezgah-istemci-brief.md`.
- İstemci ekranları cihazda görülmedi; `design-preview.cjs` burada çalışmıyor.

## Sıradaki işler (bu sırayla)
1. Dükkân ekranını bitir (brief'e göre) → çeviri → `react-reviewer` → düzeltme → push.
2. Tezgâh Dilim 2: atölye (zanaat, üretim emri, emek havuzu, toplu sipariş; tasarım §6), sunucu sonra istemci.
3. Dilim 3: meslek kancaları ilk parti ≈70 (tasarım §7) + "boşta kanca listesi yalnız kısalır" testi. Bugün 199 hak'tan 196'sı boşta.
4. Oyuncu numarası (8 hane, rastgele, hesaba bağlı), arama, oyuncu sayfası (armağan duvarı, anlar, söz).
5. Han masa oyunları çatısı + iki oyun; canlı masalar vitrini; hızlı tepkiler.

## Berkay'da
- `GOOGLE_CLIENT_ID`, FCM, Play ürünleri/ödeme sırları; yeni test APK'sı ve 5–10 kişilik cihaz denemesi (ses dahil). Cloudflare'e kart eklenmez.
- Karar: Debdebe armağanının teveccühe girmesi; süre kısaltma satışı (`ONLINE_DURUM.md` §5).
