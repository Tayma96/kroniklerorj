# Devir kaydı — 1 Kasım 2026

Yeni oturum önce `OTURUM_HAFIZASI.md`, sonra bunu okur. Kurallar: `AGENTS.md`, `mobile/AGENTS.md`. Dal `apk`;
commit Türkçe tek satır; anahtar sohbete yazılmaz, commit'lenmez.

## Çalışma biçimi (Berkay'ın kararları)
- Önce plan, onaydan sonra kod. Aynı anda **en çok 1 alt ajan** (paralel ajanlar limiti bitirdi).
- Skill'ler yalnız gerektiğinde çağrılır; büyük dosyalar (özellikle i18n) gerekmedikçe okunmaz.
- Commit'lenmemiş dosya bırakma: her tur sonunda git uyarısı ek tur ve limit harcar.
- Yarım işler `apk`'ye değil ayrı dala gider.

## Durum
- **Tek oyunculu:**
  - giriş, 3 adımlı yeni oyun ve 10 sayfa yenilendi;
  - açılış sinematiği `lib/sinematik/` (FLUX görselleri `assets/sinematik/`, Chatterbox anlatıcı
    `assets/ses/vo/`);
  - test APK: `https://github.com/Tayma96/kroniklerorj/releases/download/apk-test/Kronikler.apk`
    (iş akışı `android-apk-local.yml`, kanal `test`).
- **3D:** aşama 1 telefonda başarısız: "Çizim 0 FPS" (Filament çizim döngüsü dönmüyor), telefon donuyor,
  görünüm amatör. Kod oturum dalında (`claude/happy-maxwell-fadqof`), Blender hattı
  `.claude/skills/blender-karakter/`. Berkay ayrıntılı bir yazı gönderecek; adım adım ilerlenecek.
  Önerilen yol: canlı 3D yerine Blender'da işlenmiş klipler (telefonu yormaz, gerçekçi).
- **Çevrimiçi:** belgeler `docs/online/` (OYNANIS_TASARIMI, FAZ1/2/3_PLAN, FAZ0_DENETIM).
  - Faz 1 (sunucu `online-server/`, ekranlar `mobile/app/online`, `mobile/lib/online`) ✓.
  - Faz 2 sunucu ✓ (67 test). Faz 2c istemci yarım: dal `faz2-istemci-yarim` (ec11fac).
  - Kapı bayrakları `mobile/lib/mp/config.ts`: `ONLINE_ACIK=false`, `ONLINE_GELISTIRME=false`.
  - Berkay'dan beklenen: Google Cloud OAuth istemcileri (Android `com.kronikler.app` + SHA-1, Web) ve
    Cloudflare'e elle dağıtım (`online-server/README.md`).

## Sıradaki işler (öncelik sırası)
1. **ElevenLabs:** `.mcp.json` hazır; Berkay `ELEVENLABS_API_KEY`'i ortam gizlisi olarak ekleyince yeni
   oturumda `/mcp` ile doğrula. Berkay yeni giriş hikâyesini ve örnek sesini (voice ID) gönderecek.
2. **Telefonda bulunan hatalar** (ekran görüntüleri Berkay'da). Önce kök neden (systematic-debugging),
   sonra düzeltme ve telefon testi:
   1. Alt menü sola kaymış, seçenekler tıklanmıyor (`app/oyun/_layout.tsx` sekme çubuğu).
   2. Yeni oyunda ad alanı: klavye açılıp hemen kapanıyor (`app/yeni-oyun.tsx`).
   3. "Kim olacaksın?" başlığı adım etiketlerinin üstüne biniyor; başlık ile ad alanı arası çok boş;
      sayfayı yeniden düzenle.
   4. Doğduğun ocak kartları bozuk: köylü kartı soluk/ölü, hekim resmi yazının üstünde; tek tutarlı kart.
   5. Ana sayfa göstergeler şeridi (sağlık, güç, zekâ, akçe) yarı saydam, okunmuyor; ad büyük harfle
      başlamalı ("Cinkılıç").
   6. Karar bekliyor: **Dost Haneler** (`lib/dost.ts`, `lib/dost-ui.tsx`; yalnız elle girilen kozmetik
      kod) ve **Divan** (`app/oyun/divan.tsx`; oyundan kopuk günlük dava, ödülü yalnız lakap, 7 yaşında
      açık). Öneri: tek oyunculudan kaldır; Divan'ı ileride makama bağlı gerçek mekanik yap.
3. **İki ajan (plan onaylandıktan sonra, sırayla):**
   - ses tasarımcısı ve yönetmeni: ElevenLabs ile 6 dilde anlatıcı, efekt, ortam; lisans notu;
   - görüntü ve 3D yönetmeni: 3D'nin yeni yolu, görseller.
   Tanımlar `.claude/agents/` altına yazılacak.
4. Çevrimiçi Faz 2c'yi `faz2-istemci-yarim`'den bitir, sonra Faz 3.

## Araçlar
- Önizleme ve ekran görüntüsü: `mobile/scripts/onizleme/README.md`.
- Denetimler (`mobile/`):
  - `npx tsc --noEmit`;
  - `node scripts/_smoke/i18n-icon-check.cjs`;
  - `node scripts/_smoke/dil-karisma.cjs`;
  - `node scripts/check-screen-design.cjs`;
  - `node scripts/_smoke/ses-check.cjs`.
- Sunucu (`online-server/`): `node --test "test/*.test.ts"`, `../mobile/node_modules/.bin/tsc --noEmit -p .`.
