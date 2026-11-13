# Deneme sunucusu kurulumu (Berkay için, terminal gerekmez)

Amaç: çok oyunculuyu yalnız senin görebileceğin ayrı bir deneme sunucusunda açmak. Oyunculara açık sürüm
değişmez; girişteki "Çok Oyuncu" düğmesi onlarda "Yakında" göstermeye devam eder.

Ücret: Cloudflare ücretsiz planı yeter (yalnız SQLite Durable Object kullanılıyor). Günlük sınırlar: 100.000
istek, 100.000 satır yazma, toplam 5 GB. Sınır aşılırsa ücret çıkmaz; o günün işlemleri hata verir.

## 1. GitHub'a Cloudflare anahtarını ekle (bir kez)

Eski sunucu için bu sır daha önce eklenmiş olabilir; varsa bu adımı atla.

1. Cloudflare paneli → sağ üst profil → **My Profile** → **API Tokens** → **Create Token** →
   "Edit Cloudflare Workers" şablonu → oluştur ve değeri kopyala.
2. GitHub deposu → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
   → ad: `CLOUDFLARE_API_TOKEN`, değer: kopyaladığın anahtar.

Anahtarı sohbete ya da depoya yapıştırma.

## 2. Deneme sunucusunu dağıt

GitHub deposu → **Actions** → **Deploy Online Server** → **Run workflow** → dal `apk`, hedef `test` → çalıştır.
Bitince Cloudflare panelinde **Workers & Pages** altında `kronikler-online-test` görünür. Adresini not et
(`https://kronikler-online-test.<hesap-adın>.workers.dev`).

## 3. İki sırrı Cloudflare panelinden ekle

Cloudflare → **Workers & Pages** → `kronikler-online-test` → **Settings** → **Variables and Secrets** → **Add**
→ tür **Secret**:

| Ad | Değer |
|---|---|
| `OTURUM_ANAHTARI` | En az 32 karakterlik rastgele bir metin. Kimseyle paylaşma. |
| `TEST_GIRIS_KODU` | En az 32 karakterlik rastgele bir metin. Uygulamada test girişi için bunu yazacaksın. |

Rastgele metin için bir parola yöneticisinin "parola üret" düğmesi yeterli (40 karakter). `TEST_GIRIS_KODU` için
yalnız BÜYÜK harf ve rakam kullan: uygulamadaki kod alanı klavyeyi büyük harfe açar, elle yazması kolay olur.
Bu iki sır eklenmeden test girişi çalışmaz (uç "bulunamadı" döner).

## 4. Deneme APK'sını derle

GitHub → **Actions** → **APK (yerel derleme - hesapsiz)** → **Run workflow**:
- `kanal`: `test` (kalıcı indirme linkine dokunmaz)
- `online_test_giris`: işaretli
- `online_sunucu_url`: 2. adımda not ettiğin adres

Bitince `apk-test` linkinden indirip telefona kur.

## 5. Dene

Uygulama → **Çok Oyuncu** → test kodu alanına `TEST_GIRIS_KODU` değerini yaz → ad ve yerleşim seç.
İlk denenecek yol: giriş → profil → yerleşim → varış → yaşam → meslek → işler.

Gördüğün her hatayı ekran görüntüsüyle ilet; sunucu günlükleri Cloudflare panelinde Worker'ın **Logs** sekmesinde.

## Kapatmak ya da sıfırlamak

- Test kodunu değiştirmek: 3. adımdaki `TEST_GIRIS_KODU` değerini yenile.
- Herkesi oturumdan atmak: `OTURUM_ANAHTARI` değerini yenile.
- Tamamen kaldırmak: Worker → **Settings** → **Delete**. Üretim sunucusu ayrıdır, etkilenmez.

Sesli sohbet, Google girişi ve Debdebe ödemesi bu kurulumda kapalıdır; ayrı ayar ister.
