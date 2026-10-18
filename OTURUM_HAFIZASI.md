# Kronikler — kısa oturum özeti

> Başlangıçta yalnız bu dosya. Mobil değişiklikte `mobile/AGENTS.md`, ürün kararında
> `TASARIM_PUSULASI.md`. Arşiv/GDD/PDF yalnız o oturumdaki açık kullanıcı izniyle.

## Kurallar

- Depo `Tayma96/kroniklerorj`, dal `apk`. Türkçe tek satır commit/push; uzak dalı doğrula.
  Model/araç imzası, cron ve anahtar okuma/yazdırma yok. MP protokol bayt eşliğini koru.
- Kullanıcı rutin geliştirmeyi yetkilendirdi; son istekte push ve güncel indirilebilir APK
  açıkça istendi. Sunucu dağıtımı istenmedi.
- Limit bütçesi önemli: uzun smoke istemiyor. Varsayılan kısa + başarılı kaynak önbelleği;
  geniş test yalnız açık istek/APK kadansında. Bu dalgada hayat simülasyonu yapılmadı.
- Mobil/çevrimdışı, 1200'ler Selçuklu Anadolu'su, aylık tur. Türk yüzleri; Araplaştırma,
  sarı ışık/sikke yağmuru yok. Yeni metin tr/en/es/pt/ar/ru; GameIcon ve tema jetonları.
  Farm/P2W yok; kayıt alanları opsiyonel, vâris önizleme paritesi korunur.

## Durum

- GitHub API/CLI bağlantısı Tayma67; Tayma96 deposuna push 403. Kullanıcı artık yalnız
  Tayma96 kullanıyor ve tam yetki verdi; OAuth bağlantısı hâlâ Tayma67 görünüyor.
  Hesap değiştiren araç yok; GitHub bağlantısının Tayma96 ile yeniden kurulması gerekli.
  Yerel commitler korunuyor; erişim gelince HEAD kaybedilmeden uzak dalla karşılaştırıp push et.
- Mevcut: meslek yolları/şaheser, NPC hafıza/söylenti/tavır, soruşturma/delil/mahkeme,
  aile/vâris (evlat→torun→yeğen→çırak), rakip haneler, kayıtlı suç/yol/ticaret/savaş RNG.
- Savaş dalgası: nefes/toparlanma/ivme/rakip uyumu; seferde erzak ve aylık ikmal/keşif/hücum;
  12 aylık ticaret ahdi/ateşkes; denge/refah/seferberlik siyaseti. Vali sınırı fethe bağlı;
  taht merkezi taşınmayla değişmez. Yeni alanlar opsiyonel/göçlü. MP protokolü değişmedi.
- Detay: `docs/SAVAS_VE_HUKUMDARLIK.md`. Hedefli `mobile/scripts/check-war.cjs`,
  tsc ve 6 dil/ikon temiz; geniş smoke koşulmadı. Android SDK/JDK17 yerelde hazır;
  Gradle ARM64 release APK derlemesi sürüyor. Telefon/oyuncu kabulü henüz yok.

## Sırada

1. Savaş dalgasını tamamla, APK'yı doğrula ve indirilebilir yap; yazma erişimi gelirse push.
2. Aylık ikilem/fırsat ekran belleğinde: kayda al, açılışta geri getir ve tek uygula.
   Kart, yaşam/NPC RNG geçişini ve ortak neden dökümünü sürdür.
3. Müzakere sabrı kapat/açta sıfırlanıyor; rota dengesi, çok turlu aile/NPC sohbeti,
   hoca/silsile, soy ağacı ve gerçek düşük uç Android testi.
