# Kronikler — kısa oturum özeti

## Çalışma sınırları
- Depo `Tayma96/kroniklerorj`, dal `apk`. Türkçe tek satır commit; force push yok.
- Kullanıcı hazır kodların pushunu, APK ve savaş/asker/ordu bağlantısının geliştirilmesini istedi.
- Uzun smoke/300 hayat yok. Tip + en küçük hedefli kontrol; arşiv/GDD okuma izni yok.
- Mobil kurallar `mobile/AGENTS.md`; ürün kararları `TASARIM_PUSULASI.md`.
- Sunucu dağıtımı yok; MP protokolünü değiştirme. Yeni metinler altı dilde, kayıt alanları eklemeli.

## GitHub ve hazır APK
- Üç hazır commit kimlikleri korunarak pushlandı: d9e6391, 5f4f7d6, 9a695c2.
- 22906ce: APK iş akışına kisa_kontrol seçeneği; varsayılan geniş kapı korunur.
- Terminal Tayma96 girişi telefonla GitHub cihaz onayından tamamlandı. Görev komutlarında
  `env -u GH_TOKEN -u GITHUB_TOKEN GH_CONFIG_DIR=/workspace/.gh-tayma96 gh ...` kullan;
  miras GH_TOKEN Tayma67'dir. Anahtar/kimlik bilgisi dosyası içeriğini okuma/yazdırma.
- Actions 39125665457 başarılı: kalite, derle, yayımla. apk-latest etiketi 22906ce.
- APK indirildi/doğrulandı: com.kronikler.app, 1.0.0 (100), arm64-v8a, gömülü JS/23 kitaplık,
  sağlam ZIP ve geçerli Android Debug v2 imzası. Gerçek telefon testi yapılmadı.
- https://github.com/Tayma96/kroniklerorj/releases/download/apk-latest/Kronikler.apk
- Bu APK aşağıdaki yeni ordu geliştirmesini içermez; sonraki APK derlemesi gerekir.

## Yeni ordu dalgası
- Beylik hükümdarlarının bağımsız sınır seferleri; asker mesleğiyle yurtta gönüllü katılım.
- Ayda üç manga teması: safı koru/ilerle/yaralı taşı; sağlık, kayıp, moral ve kayıtlı RNG.
- Ordu sayısı/moral/ikmal/yaralı-güvene taşıma havuzu. Kişisel başarı otomatik ordu zaferi değil.
- Hükümdar seferinin finali ortak ordu modelini kullanır; tek zafer zarı kaldırıldı.
- Savaşan bölgede kervan riski, savaş enflasyonu; vârise cephe sürer, kişisel görev geçmez.
- Çevrimdışı ilk model; haritada birlik komutası, isimli hükümdar diplomasi AI'sı ve MP yok.
- Detay `docs/SAVAS_VE_HUKUMDARLIK.md`; yeni test `mobile/scripts/check-army.cjs`.
- Kısa kontroller: tsc, motor bundle, check-army/check-war, kayıt göçü, altı dil/ikon.
- Vâris devri/önizleme, altı dil/ikon ve kısa kontroller temiz; uzun smoke çalıştırılmadı.
- Yeni ordu kodu apk dalına pushlandı. Görsel 320/390/CPU ve gerçek cihaz testi yapılmadı.
