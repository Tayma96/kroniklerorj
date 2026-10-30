# Kronikler Online sunucusu (`online-server/`)

Faz 1 (kimlik ve varış) sunucusu: Cloudflare Worker + iki SQLite tabanlı Durable Object (ücretsiz planda çalışır).
Tek oyunculu oyundan ve `server/`'dan tamamen ayrıdır; ayrı ad `kronikler-online` ile dağıtılır.

- **Google girişi:** Google kimlik belirteci (ID token) WebCrypto ile doğrulanır (JWKS önbellekli, RS256, `iss`, `aud`,
  `exp`/`iat` 60 sn payla). Kimlik = Google `sub`; e-posta okunmaz.
- **Oturum:** 30 günlük, HMAC-SHA256 imzalı sunucu belirteci (`OTURUM_ANAHTARI` sırrıyla).
- **Dünya saati:** 12 gerçek saat = 1 oyun ayı; dönümler TR 00:00 ve 12:00. Başlangıç 1250 Ocak (`src/saat.ts`).
- **Dünya:** 7 beylik, her birinde 1 şehir, 2-3 kasaba, 4-6 köy (`src/dunya-veri.ts`).
- **Profil:** hesap başına bir profil (ad, cinsiyet, beylik, yerleşim, 12 yaşında doğum). Ad Türkçe büyük/küçük harf
  duyarsız eşsizdir. Yerleşim doluysa yalnız davetle girilir; davetle gelen davet edenin yerleşimine yerleşir.
- **Tekrar güvenliği:** aynı `istekNo` ile gelen profil isteği aynı sonucu döndürür; nüfus iki kez sayılmaz.
- **Hız sınırı:** hesap başına dakikada 30 istek.

Dosyalar: iş kuralları `src/mantik.ts` (Workers'a bağlı değil, testlenir); `src/hesap-do.ts` (`HesapDO`, Google `sub`
başına) ve `src/dunya-do.ts` (`DunyaDO`, tek örnek) bunları depolamaya bağlayan ince sarmalayıcılardır.

## Uçlar

Hepsi JSON. Hata gövdesi `{"hata": "<kod>"}`; kodlar ve HTTP durumları `src/tipler.ts` → `HATA_DURUMU`.
Oturum gereken uçlar `Authorization: Bearer <oturum>` başlığı ister. CORS başlığı verilmez (yalnız uygulama).

| Uç | Gövde | Yanıt |
|---|---|---|
| `POST /v1/giris` | `{idToken}` | `{oturum, profilVar, adOnerisi?}` |
| `GET /v1/dunya` | — | `{saat: {simdi, oyunAyi, yil, ay, mevsim, sonrakiDonum}, beylikler: [{id, ad, yerlesimler: [{id, ad, tur, evKapasite, npc, nufus}]}]}` |
| `GET /v1/profil` | — | profil · yoksa 404 `profil_yok` |
| `POST /v1/profil` | `{ad, cinsiyet: "erkek"\|"kadın", yerlesim, davet?, istekNo}` | profil `{hesapId, ad, cinsiyet, beylik, yerlesim, dogumAyi, olusturma, davetEden?}` |
| `POST /v1/davet` | — | `{kod}` (oyuncunun 6 harfli kodu; hep aynısı) |
| `GET /v1/davet/:kod` | — | `{kod, yerlesim, beylik, davetEden}` |

`istekNo`: istemcinin ürettiği 8-64 karakter (`A-Z a-z 0-9 _ -`, ör. UUID); ağ koparsa aynı numarayla yeniden gönderilir.
`davet` verilirse `yerlesim` yok sayılır.

## Ayarlar (Berkay)

Dağıtım **elle** yapılır; otomatik dağıtım ve CI yoktur. Anahtar sohbete yazılmaz, commit'lenmez.

1. Cloudflare'e giriş: `cd online-server && npx wrangler login`
2. **`GOOGLE_CLIENT_ID`** (gizli değil): `wrangler.toml` içindeki `[vars]` altında `GOOGLE_CLIENT_ID = ""` değerine
   Google Cloud'daki OAuth istemci kimliklerini virgülle ayırarak yazın (ör. Android ve Web istemcisi:
   `"123-abc.apps.googleusercontent.com,123-def.apps.googleusercontent.com"`). Boşken giriş `yapilandirma_eksik` döner.
3. Dağıtım: `npm run deploy` (= `npx wrangler deploy`). İlk dağıtım `v1` göçüyle iki DO sınıfını oluşturur.
4. **`OTURUM_ANAHTARI`** (sır, en az 32 karakter): rastgele üretip doğrudan Worker sırrı olarak koyun:
   `openssl rand -base64 48 | npx wrangler secret put OTURUM_ANAHTARI`
   Anahtar değişirse bütün oturumlar geçersiz olur; oyuncular yeniden giriş yapar.
5. Deneme: `curl https://kronikler-online.<hesap>.workers.dev/v1/dunya`

Yerel çalışma için (isteğe bağlı) `online-server/.dev.vars` dosyasına `OTURUM_ANAHTARI=...` yazılabilir; bu dosya
`.gitignore`'dadır.

## Geliştirme

Bağımlılık kurulmaz: Node 22 `.ts` dosyalarını doğrudan çalıştırır, tip denetimi `mobile/` içindeki `tsc` ile yapılır.
Workers tipleri `src/cf.d.ts`'de elle yazılıdır.

```sh
npm run typecheck   # ../mobile/node_modules/.bin/tsc --noEmit -p .
npm test            # node --test "test/*.test.ts"
```

`[PARAMETRE]` değerleri: dünya başlangıç anı ve yılı (`src/saat.ts`), ev kapasitesi ve NPC sayısı
(`src/dunya-veri.ts`), hız sınırı (`src/mantik.ts`).
