# Google Play yayın hazırlığı (çevrimiçi)

Bu belge çevrimiçi bölüm Google Play'e çıkmadan önce gerekenleri ve mağaza formlarının taslak yanıtlarını tutar.
Yanıtlar 14 Kasım 2026'daki koddan çıkarıldı (`online-server/src/google.ts`, `hesap-do.ts`, `yonetim/sikayet.ts`,
`han/`, `debdebe/`). Kod değişirse burası da güncellenir.

## 1. Yayın kapısı (sıra)
| # | Adım | Kimde | Not |
|---|---|---|---|
| 1 | Google Play geliştirici hesabı | Berkay | Tek seferlik 25 $. Hesap varsa atlanır. |
| 2 | Kapalı test: en az 12 test kullanıcısı, 14 gün | Berkay | 2023 sonrası açılan kişisel hesaplarda üretimden önce zorunlu. |
| 3 | Gizlilik politikası sayfası (herkese açık adres) | Claude metni, Berkay yayınlar | Taslak §3. Ücretsiz barındırma: GitHub Pages ya da Cloudflare Pages. |
| 4 | Hesap silme: uygulama içi + web adresi | Claude | Play zorunluluğu. Kodda yok → yapılacaklarda (ONLINE_DURUM). |
| 5 | Veri güvenliği formu | Berkay doldurur | Yanıtlar §2. |
| 6 | İçerik derecelendirme anketi | Berkay doldurur | Oyuncular arası metin ve ses sohbeti var; şikâyet, engelleme, sessize alma var. |
| 7 | `GOOGLE_CLIENT_ID` (Google Cloud OAuth, ücretsiz) | Birlikte | Google girişi bunsuz kapalı. |
| 8 | Üretim Worker'ı | Claude dağıtır | Ücretsiz plan; test girişi kapalı; ayrı veri. |
| 9 | Sesli sohbet: Realtime uygulaması + aylık kota sınırı | Claude | Kota sınırı kodlanmadan açılmaz (ücretsiz kalmak için). |
| 10 | Debdebe satışları | Sonra | Mağaza ürünleri ve iade bildirimleri yapılandırılana kadar kapalı; oyun ödemesiz tam çalışır. |

## 2. Veri güvenliği formu (taslak yanıtlar)
**Toplanan veriler**
- **Kimlik (hesap):** Google hesabının değişmeyen kimliği (`sub`). E-posta oyuncu hesabında kullanılmaz ve saklanmaz;
  yalnız yönetici girişinde, Google doğruladıysa, rol eşleştirmek için okunur.
- **Uygulama içi içerik:** karakter adı ve oyun verisi (beceri, envanter, akçe, ilişkiler, olay geçmişi), ilan panosuna
  asılan ilanlar (7 gün sonra silinir), şikâyet kayıtları (şikâyet nedeni, açıklama, şikâyet edilen ilanın metni).
- **Cihaz kimliği:** yalnız test sürümünde, test girişi için uygulamanın ürettiği rastgele kimlik.
- **Satın alma geçmişi:** Debdebe açılırsa mağaza makbuzu (satın alma doğrulama ve iade için).

**Toplanmayanlar:** konum, kişiler, fotoğraf, dosya, sağlık, finans bilgisi, reklam kimliği. Reklam yok.
**Sohbet ve ses:** han sohbeti saklanmaz (yalnız o an masadakilere iletilir); sesli sohbet kaydedilmez, Cloudflare
Realtime üzerinden gerçek zamanlı aktarılır.
**Paylaşım:** üçüncü taraflarla paylaşılmaz. Altyapı sağlayıcısı Cloudflare (sunucu ve ses aktarımı), giriş için Google.
**Şifreleme:** bütün trafik HTTPS/WSS; oturum belirteci cihazda güvenli depoda (Android Keystore).
**Silme:** kullanıcı hesabını ve verisini uygulama içinden silebilir (yapılacak, §1 madde 4); web adresinden de talep.

## 3. Gizlilik politikası (taslak metin, TR)
**Kronikler — Çevrimiçi Gizlilik Politikası**

Kronikler'in çevrimiçi bölümünü kullandığında yalnız oyunun çalışması için gereken verileri tutarız.

1. **Hesap:** Google ile giriş yaptığında Google hesabının değişmeyen kimliğini alırız. E-posta adresini oyuncu
   hesabında kullanmayız.
2. **Oyun verisi:** karakter adın, karakterinin gelişimi, envanterin ve oyun içi geçmişin sunucumuzda tutulur.
3. **Sohbet ve ses:** handaki yazılı sohbet saklanmaz. Sesli sohbet kaydedilmez; yalnız o anda masadakilere iletilir.
4. **İlan ve şikâyet:** panoya astığın ilan 7 gün sonra silinir. Bir oyuncuyu şikâyet edersen şikâyet nedenin ve
   açıklaman moderasyon için saklanır.
5. **Paylaşım:** verilerini satmayız ve üçüncü taraflarla paylaşmayız. Sunucu ve ses aktarımı Cloudflare altyapısında,
   giriş Google üzerinden yapılır.
6. **Silme:** hesabını ve verilerini uygulamadaki Karakter → Hesap → "Hesabımı sil" ile ya da [web adresi] üzerinden
   silebilirsin. Moderasyon kararları kötüye kullanımı önlemek için kimliksiz olarak tutulabilir.
7. **Çocuklar:** oyun 13 yaş altına yönelik değildir. [Yaş derecelendirmesi anket sonucuna göre güncellenecek.]
8. **İletişim:** [e-posta adresi]

(İngilizce ve diğer diller yayın öncesi bu metinden çevrilir.)
