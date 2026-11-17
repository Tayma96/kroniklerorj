# Oyuncu numarası, arama, oyuncu sayfası — istemci brief'i (17 Kasım)

Sunucu: `online-server/src/kunye/` (numara.ts, hesap.ts, gorunum.ts). Bütün uçlar oturum ister ve GET'tir.

## Uçlar

| Uç | Yanıt |
|---|---|
| `GET /v1/numara` | `{numara}`: 8 haneli, başında 0 yok. Hesaba bağlıdır; ölüm ya da vâris sonrası değişmez. Profilden önce de vardır. |
| `GET /v1/oyuncu-ara?no=12345678` | `{sonuclar: [Kart] (0 ya da 1), imlec: null}`. Boşluk/tire kabul edilir (`1234 5678`). Bulunamazsa boş liste (hata değil). |
| `GET /v1/oyuncu-ara?ad=Ker&imlec=` | `{sonuclar: [Kart] (en çok 10), imlec: string\|null}`. Türkçe büyük/küçük harf duyarsız önek. Devam için dönen `imlec`i aynı `ad` ile gönder. |
| `GET /v1/kunye/:numara?dil=` | Oyuncu sayfası (aşağıda). |

`Kart = {numara, ad, yerlesim: {id, ad}, beylik: {id, ad}}`

Sayfa alanları (birebir bu liste): `numara, ad, ben, ayniYerlesim, yerlesim {id, ad}, beylik {id, ad}, meslek {ana, anaUnvan, yan, yanUnvan}`
(unvan: `cirak|kalfa|usta|pir|null`), `hanedan {soyad, nesil}, nam {comertlik, dindarlik, mertlik, caliskanlik}, teveccuh` (kademe sayısı),
`isletmeler [{tur, no, ad}]` (ad boşsa türün adıyla göster), `durum: "simdi"|"bugun"|"uzak"` (kaba; an verilmez), `olu`,
`kisi {yerlesim, id}` (yerel oyuncu kimliği `o12`).

## Sosyal eylemlere bağlama
- `ayniYerlesim && !ben` ise `kisi.id` ile mevcut uçlar: `GET /v1/oyuncu/:id` (eylem listesi: dostluk, teklif/mektup, husumet, engelle, şikâyet).
  Düğmelerin açık/kapalı durumunu oradan al. Farklı yerleşimdeyse şimdilik yalnız bilgi göster (yerleşimler arası eylem yok).
- `ben` ise sayfa "Künyem" olarak açılır; eylem yok.

## Hata kodları
- `400 arama_kisa`: ad öneki en az 3 harf (boşluk ve kesme sayılmaz). İstemci 3 harften önce istek atmasın.
- `400 numara_gecersiz`: 8 hane değil ya da 0 ile başlıyor.
- `404 kisi_yok`: numara yok ya da aranız engelli (ikisi ayırt edilmez).
- `404 profil_yok`: arayanın profili yok.
- `429 hiz_siniri`: arama + sayfa dakikada 10 (genel 30/dk ayrıca geçerli). Kısa "biraz bekle" iletisi; otomatik yeniden deneme yok.
- `429 arama_siniri`: günlük tavan (200 sorgu) ya da günlük 20 boşa düşen numara sorgusu doldu; UTC gün dönümünde açılır.

## Önerilen ekranlar
1. **Arama kutusu** (topluluk/tanıdıklar sekmesinin üstü): yalnız rakam girildiyse numara araması (8 hane tamamlanınca), harf girildiyse
   ad araması (3 harften sonra, ~400 ms gecikmeyle; yazarken her tuşta istek atma). Sonuç kartı: ad, yerleşim · beylik, numara.
   Listenin sonunda `imlec` varsa "Daha fazla".
2. **Oyuncu sayfası**: başlıkta ad + hanedan soyadı ve nesil, numara (dokununca kopyalanır), durum noktası (simdi/bugün/uzak);
   meslek ve unvan, nam çubukları, teveccüh kademesi, işletmeler listesi; altta eylemler (yukarıdaki kurala göre). `olu` ise sade yas çerçevesi.
3. **Kendi numaran** (profil/ayarlar): numara `1234 5678` biçiminde, "Kopyala" ve "Paylaş" (sistem paylaşım sayfası; metin: numara + kısa çağrı).

Metinler 6 dil; istemci ajanı yalnız Türkçe yazar, çeviri `tester`da.

## Denetim sonrası protokol ekleri (17 Kasım)
- **`durum` koşullu:** oyuncu sayfasında `durum` yalnız kişinin kendisine (`ben`) ve aynı yerleşimde o kişinin
  tanıdık/dost işaretlediği izleyene döner; diğerlerinde alan **hiç yoktur** (null değil). Arayüz: alan yoksa durum
  noktasını gösterme.
- **Engel hesap düzeyinde:** engelle ucu engeli hesaba da yazar; künye ve arama yerleşimden bağımsız (göçten sonra da)
  iki yönde süzer. Yanıt yine `404 kisi_yok` / boş liste (engelin varlığı sızmaz). Engel kaldırılınca ikisi birlikte kalkar.
- **Ad araması sayfa tavanı:** hesap başına günde 30 ad araması sayfası (devam imleçleri dahil); dolunca `429
  arama_siniri` (numara araması ve sayfa sürer). "Daha fazla" düğmesi bu hatada gizlenir.
- **`GET /v1/oyuncu/:id` yanıtına isteğe bağlı `numara`** (8 hane): varsa kişi kartından künyeye doğrudan geç
  (`/v1/kunye/:numara`). Alan yoksa düğmeyi gösterme.
- Künye isteği hedef yerleşimde salt okumadır (ay yetiştirmez); davranış değişmedi, yalnız hızlandı.
