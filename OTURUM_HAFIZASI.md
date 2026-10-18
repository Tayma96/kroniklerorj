# Kronikler — kısa oturum özeti

## Kurallar/erişim
- Tayma96/kroniklerorj, yalnız apk; Türkçe tek satır commit, force yok.
- HER tamamlanan küçük iş hemen commit/push. Uzun smoke/300 hayat yok.
- mobile/AGENTS.md + TASARIM_PUSULASI.md; arşiv/GDD izni yok. Alt ajan kullanma.
- Yeni metinler tr/en/es/pt/ar/ru; yeni mekanikler çevrimdışı. MP/sunucu dağıtımı yok.
- Tayma96: env -u GH_TOKEN -u GITHUB_TOKEN GH_CONFIG_DIR=/workspace/.gh-tayma96 gh ...
  Miras GH_TOKEN Tayma67; kimlik dosyalarını okuma/yazdırma.

## APK
- Eski 3 commit d9e6391/5f4f7d6/9a695c2 pushlandı. 22906ce kısa APK kontrol seçeneği.
- Actions 39125665457 başarılı. apk-latest hâlâ 22906ce; sonraki kodu İÇERMEZ.
- https://github.com/Tayma96/kroniklerorj/releases/download/apk-latest/Kronikler.apk
- ZIP/Debug v2 imza doğrulandı: com.kronikler.app 1.0.0(100), ARM64, gömülü JS/23 lib.

## Oyun motoru
- 496bc2a: devlet ordusu/asker katılımı; üç manga teması, sayı/moral/ikmal/yaralı.
- f44fb88..a0019e7: kalıcı savaş hasarı/darlık/göç/işgücü, gerçek ekonomi/gelir;
  NPC hane göçü/dönüşü, sivil yardım, sınır savunması, ateşkes/işgal ve taht mirası.
- 3f17491: tüm canlı isimli NPC tüketimi/mesleği/yaşı; tüccar/şifacı/asker/müzisyen
  hizmeti, gerçek nüfus kimliği+sürümle üretim önbelleği. Bağımsız NPC cüzdanı yok.
- a159581/f7c0295: diplomacy.ts, gerçek kişi hükümdar/veraset/hazine, güven/kin,
  elçilik/kabul/ret/karşı teklif; saldırmazlık/ticaret/savunma/yardım/müzakereli barış.
- 0bc4905: Hanedan→Diplomasi, gerçek profil/şartlar/teklifler; şehir işgücü kartı.
- 9990df5: bölgesel ambar 8 gerçek buğday, kapasite40, darlıkta ayda4 dağıtım,
  yılda1 bozulma; sivil yardımla ortak aylık hak. Taşınma/vâris/kayıt korunur.
- 02b5e6b: NPC bağımsız barış/ahit kararları, savaş seçimine mizaç/güven/kin.
- f03d017: yardım darlık−3/göç−1. 4fa355e: haraç karşı hazineden; ilişki bozar.
- 47180df: yeni kısa NPC/diplomasi kontrolleri APK/AAB kalite kapısında.

## Doğrulama/sınırlar
- tsc, motor/UI bundle, check-war-world/war-impact/army/war/npc-economy/diplomacy/
  diplomacy-game; kayıt göçü, vâris, 6 dil/ikon temiz. Protokol değişmedi.
- Geniş karakter-ayna yanlışlıkla başlatılıp durduruldu; başarılı test sayılmadı.
- Gerçek telefon, 320/390 görsel ve CPU testi yapılmadı. Yeni APK derlenmedi.
- Ayrıntı: docs/SAVAS_VE_HUKUMDARLIK.md. Esir/harita birlik/kuşatma/özel NPC maliyesi yok.
