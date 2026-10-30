# Faz 1 — Kimlik ve varış: uygulama planı

Kaynak: `docs/online/OYNANIS_TASARIMI.md` §3, §9, §11 (Faz 1), `docs/online/FAZ0_DENETIM.md`.
Kural: tek oyunculuya, `server/**`'e ve `mobile/lib/mp/protocol.ts`'e dokunulmaz. Yeni sunucu otomatik
dağıtılmaz; ilk dağıtımı Berkay kendi Cloudflare hesabıyla yapar. Anahtar sohbete yazılmaz, commit'lenmez.

## Oyuncu deneyimi (kabul)
Temiz telefonda: Google ile giriş → çevrimiçi ad ve cinsiyet → beylik ve yerleşim seçimi (ya da davet koduyla
davet edenin yerleşimi) → açılış sinematiği → 12 yaşında yerleşime iniş ve öğrenme döneminin 1. günü kartı.
Tek oyunculu ad, kayıt ya da profil hiçbir adımda görünmez. Ağ kopsa da aynı istek iki kez işlenmez.

## Adımlar

### 1a. Sunucu: `online-server/` (Cloudflare Worker + Durable Object, TypeScript)
- `src/saat.ts` — dünya saati: başlangıç anından beri geçen 12 saatlik dilimler = oyun ayı; ay dönümü TR 00:00
  ve 12:00 (UTC 21:00 ve 09:00). Başlangıç takvimi 1250 Ocak `[PARAMETRE]`. Saf fonksiyon.
- `src/dunya-veri.ts` — 7 beylik (tek oyunculudaki 5 + 2 yeni), her birinde 1 şehir, 2-3 kasaba, 4-6 köy;
  yerleşim türüne göre ev kapasitesi ve NPC sayısı `[PARAMETRE]`. Saf veri.
- `src/google.ts` — Google kimlik belirteci doğrulama: JWKS (önbellekli), RS256 imza, `iss`
  (`accounts.google.com` / `https://accounts.google.com`), `aud` = `GOOGLE_CLIENT_ID`'lerden biri, `exp`,
  `email_verified` gerekmez; kimlik = `sub`. WebCrypto ile; Node testlerinde aynı API.
- `src/oturum.ts` — sunucu oturum belirteci: HMAC-SHA256 imzalı `{hesap, son}`; anahtar Worker sırrı
  `OTURUM_ANAHTARI` (Berkay `wrangler secret put` ile koyar).
- `src/ad.ts` — görünen ad: 2-24 harf, Türkçe harfler + boşluk + kesme; yasaklı sözcük süzgeci; Türkçe
  büyük/küçük harf duyarsız benzersizlik anahtarı.
- `src/dunya-do.ts` — `DunyaDO` (tek): yerleşim nüfus sayaçları, ad kaydı (benzersizlik), davet kodları.
- `src/hesap-do.ts` — `HesapDO` (Google `sub` başına): hesap, profil, `requestId` defteri (idempotency).
- `src/index.ts` — HTTP JSON uçları (yalnız uygulama; CORS kapalı):
  - `POST /v1/giris {idToken}` → `{oturum, profilVar}`
  - `GET /v1/dunya` → saat + beylikler/yerleşimler (doluluk)
  - `GET /v1/profil` · `POST /v1/profil {ad, cinsiyet, yerlesim, davet?, istekNo}` → profil
    (doğum = şimdiki oyun yılı − 12; yerleşim davetle gelirse davet edenin yerleşimi, ev sınırı esnek)
  - `POST /v1/davet` → `{kod}` · `GET /v1/davet/:kod` → `{yerlesim, davetEden}`
  - Hız sınırı: hesap başına dakikada 30 istek; hata gövdesi `{hata: kod}` (i18n istemcide).
- `wrangler.toml` — ayrı ad `kronikler-online`, iki DO bağı, `GOOGLE_CLIENT_ID` boş `[vars]`, sır yok.
- `test/*.test.ts` — `node --test`: saat, ad, veri, oturum, Google doğrulama (sahte JWKS + üretilmiş RSA
  anahtarı), profil oluşturma ve tekrar güvenliği (DO mantığı saf fonksiyonlarla).
- Kabul: `tsc --noEmit` temiz, bütün testler geçer, `server/` değişmemiş.

### 1b. İstemci veri katmanı: `mobile/lib/online/`
- `protokol.ts` (sunucu tipleriyle aynı biçim), `istemci.ts` (fetch, zaman aşımı, yeniden deneme yalnız
  `istekNo` ile), `depo.ts` (anahtarlar `kronikler_online_*`; oturum belirteci güvenli depoda), `durum.tsx`.
- `../game`, `../store`, `../mp` içe aktarılmaz (`rg` ile denetlenir).

### 1c. Ekranlar: `mobile/app/online/`
- `index.tsx` giriş (Google düğmesi), `profil.tsx` ad + cinsiyet, `yerlesim.tsx` beylik ve yerleşim seçimi
  (harita + liste, doluluk), `davet.tsx` kod girişi, `varis.tsx` sinematik + 1. gün kartı.
- Erişim: `ONLINE_ACIK` kapalıyken yalnız geliştirici bayrağıyla; "Yakında" ekranı değişmez.
- 6 dil, `GameIcon`, tema; 320/390 px önizleme.

### 1d. Google girişi (Berkay'ın Google Cloud kimlikleri gelince)
- Expo v56 belgesine göre yöntem seçilir (yerel Google Sign-In modülü ya da tarayıcı tabanlı yetkilendirme);
  test APK'sında derleme doğrulanır. Kimlikler gizli değildir, uygulama yapılandırmasına yazılır.

## Doğrulama
Her adımda tip denetimi + ilgili testler; istemcide i18n/ikon, dil karışması, sayfa tasarımı; önizleme
ekran görüntüleri. Cihaz testi 1d ve sunucu dağıtımından sonra.
