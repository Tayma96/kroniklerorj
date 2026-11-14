# Kronikler — güncel çalışma özeti (14 Kasım 2026)

## Kurallar
- Repo Tayma96/kroniklerorj, ana dal `apk`. Türkçe tek satır commit, ek satır yok. Berkay tam yetki verdi (birleştirme, silme, `apk`'ye push).
- Tek sert kural: **her şey ücretsiz**. Ücret çıkarabilecek adım önce kontrol edilir. Anahtar okuma/yazdırma yok.
- Yeni oyuncu metni 6 dilde. Eski kayıt ve çevrimdışı akış korunur. İşbölümü `AGENTS.md`'de (esnek).
- Kota: opus ajanları 5 saatlik sınırı iki kez doldurdu; ajanları birer birer çalıştır.

## Ürün yapısı
- İki seçenek: Tek Oyunculu (`mobile/app/oyun/`, çevrimdışı) ve Çok Oyunculu (`mobile/app/online/`, sunucu `online-server/`). Kayıtlar ayrı.
- Eski Diyar MP söküldü (`cok-oyunculu/`, `lib/mp/`, `server/`). Motordaki `mpRealm`/diyar fonksiyonlarını test betikleri kullanıyor, duruyor.
- Giriş "Çok Oyuncu" → `/online`; kapı kapalı, "Yakında". Envanter: `EKRAN_HARITASI.md` (70 ekran).

## Çevrimiçi durum
- ChatGPT'nin `feature/online-p5-darbe-zinciri` dalı `apk`'de (P5–P6, Y2–Y3, ekonomi/mülk/siyaset/topluluk/Debdebe ekranları, test girişi). Eksik 178 metin eklendi (`online5.ts`).
- Sunucu 489 test, hepsi geçiyor; ücretli bağlama yok.
- Güvenlik: kritik/yüksek bulgu yok; 9 orta/düşük bulgu kapandı (sabit Wrangler, üretim yalnız `apk`'den, hız sınırı, han yarışı, 24 saatlik `istekNo`, oturum sürümü + `/v1/oturumlar/kapat`, telafi tavanı); istemci karşılığı `online13.ts`.
- Gelir dengesi oranı 2,22 → 1,19; sim yalnız 6 mesleği ölçüyor, kırılgan.
- Darbe ganimeti yalnız saf hesap (`siyaset/ganimet.ts`); oyuncu parasına bağlı değil.
- Sunucu hiç dağıtılmadı. Kurulum: `docs/online/DENEME_SUNUCUSU.md`.

## Sıradaki işler
1. Deneme sunucusu açılınca ilk dilim: giriş → profil → yerleşim → yaşam → meslek → işler.
2. Ganimeti bağla: BolgeDO → YerlesimDO kalıcı kuyruk (diplomasi outbox deseni).
3. E4 kalan etkiler (34 hizmet, 203 hak, 4 sinerji): `docs/online/gdd/E4_KANCA_ENVANTER_NOTU.md`.
4. 14 meslek denge denetimi; siyaset/vasiyet/devir yetki incelemesi.
5. Önce tasarım önerisi isteyenler: Kül Yemini mührü, düello/suikast/kan davası, han odası özellikleri, ek anlaşma türleri.
6. Tek oyunculu sadeleştirme (`EKRAN_HARITASI.md` §7); çevrimiçi Yaşam gezinmesi.
7. Küçükler: han/hanedan/pazar'da `istek_tekrar` sessiz değil; `han-soket.ts` belirteç reddi; belirteç `expo-secure-store`'a.

## Berkay'da
- `DENEME_SUNUCUSU.md` adımları; eski `kronikler-mp` Worker'ını silmek; `GOOGLE_CLIENT_ID`; mağaza ayarları.
