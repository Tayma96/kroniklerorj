# Güncel kod denetimi — 11 Ekim 2026

Taban: `fb2da727`, `apk`. Kaynak: kullanıcının 25 sayfalık detaylı tasarım/devir PDF'i; mekanik için v7, sunum ve ay takvimi için v8, uygulama için çalışan kod ve tasarım pusulası. Kullanıcı tüm rutin geliştirmeleri onay beklemeden yürütme yetkisini yeniden verdi. Kalıcı reddedilmiş Hayat Hırsı sistemi kapsam dışıdır.

## Mimari farkların doğrulanması

| PDF varsayımı | Depodaki gerçek | Uygulama kararı |
|---|---|---|
| Python/FastAPI + MongoDB + CRA/Craco aktif | Bunlar `legacy/` altında. Aktif istemci `mobile/` Expo 56 / React Native; motor `mobile/lib/game.ts`; MP sunucusu Cloudflare Worker/DO. | Eski teknolojiye yönelik indeks, Vite veya Capacitor geçişi yapılmaz. |
| Haftalık döngü | `calendar.ts`: 1 tur = 1 ay, yıl 12 tur; başlangıç 1247. | Günlük/haftalık tasarım fikri aylık ritme uyarlanır, zaman birimi geriye alınmaz. |
| NPC hafızası düz liste / çağrılmıyor olabilir | `npc-mind.ts` yapısal anı ve sönme; `game.ts remember`, `gorus`, `gossipTick` ve sohbet aktif. | Mevcut davranış korunarak eksik boyutlar genişletilir. |
| R9 belirsiz | Master v7 §R9: Geri Bildirim Lezzeti. | R9 ortak sunum katmanı olarak ele alınır. |
| Çok oyunculu durdurulmuş | MP istemcisi, oturum köprüsü, Worker ve 12 entegrasyon betiği var. Ağ bağlantısı kullanıcı katılınca açılıyor. | Çalışan MP kaldırılmaz. Sunucu kodunun varlığı, canlı dağıtım veya doğrulanmış güvenlik demek değildir. |
| 4–5 dil, DE dahil | Aktif 6 dil: tr/en/es/pt/ar/ru, 8.972 anahtar. | Mevcut diller korunur; Almanca ayrı içerik işi olur. |
| Hayat hedefi seçimi | v7 ve PDF açıkça reddediyor. | Kalıcı kapalı. |

## Kod envanteri

Git'in izlediği dosyalar: uygulama 43 TS/TSX / 9.961 satır; istemci kitaplığı 49 / 26.528; aktif motor tek başına 10.886; denetim dizini 30 betik / 1.885 satır. Sunucu 4 TS / 1.437 satır, 12 test betiği. Arşiv Python 65 dosya / 35.658 satır; arşiv web 113 dosya / 27.419 satır. Bu sayılar yeni denetim dosyaları eklenmeden önce alınmıştır.

Tek oyunculu kayıt AsyncStorage `kronikler_save_v1`, önceki sağlam kayıt `_bak`; hanedan defteri `kronik_defter` ayrı. Düzenli kayıt yazımı 1.200 ms birleştirilir, arka planda bekleyen kayıt yazılır. `migrate` mevcut `schema:1` damgasını kullanır; yeni bir `schema_version` adı dayatılmaz. Gerçek kullanıcı kayıtları bu oturumda verilmedi; mevcut v1 fikstürü ve sentetik örnekler gerçek altın kayıtlar olarak sunulmaz.

| Sistem | Kod / ekran | Durum ve önemli açık | Mevcut denetim |
|---|---|---|---|
| Aylık yaşam ve tempo | `game.ts advance`; `calendar.ts`; `events.ts ayinSahnesi`; `app/oyun/index.tsx` | Çalışıyor. Çocuk/yetişkin uğraşları ve ay notu var; PDF'deki ortak dilim planı birebir yok. | oynanis, yanki, migrate |
| NPC hafızası ve nüfus | `npc-mind.ts`, `nufus.ts`, `game.ts remember/gorus`; `iliski.tsx`, `dialogue.ts` | Yapısal, kişi kimliği kalıcı, 24 anı tavanı. Altı boyutlu görüş vektörü, kesinlik ve çok sıçramalı kaynak zinciri aynı kapsamda yok. | karakter-ayna, diyalog |
| Sonuç tohumu / Yankı | `game.ts seedTick/yankiTick`; `events.ts`; `arcs.ts` | Çalışıyor; ip tavanı 3, hafıza tavanı 80; geçmiş kararlar karşılık buluyor. Ortak olay kimliği + tüm yollar için idempotency sözleşmesi henüz eksiksiz değil. | yanki, kan, gec |
| Yönetmen | `game.ts directorTick`; `events.ts ayinSahnesi`; ana pano | Tür serisi ve orta yaş boşluk bekçisi var. PDF'nin her kriz için iki karşı hamle kabulü ayrıca taranmalı. | oynanis, olu-karar |
| Rakip haneler / fraksiyon | `world.ts`, `game.ts`; `hanedan.tsx`, `orgut.tsx` | Üretim/tavır/entrika/sefer yüzeyleri var. PDF'deki son üç hane hamlesi ve 20 yıllık bağımsız davranış raporu ayrıca kanıtlanmalı. | smoke, karakter-ayna |
| İş / ustalık | `game.ts work/tezgah*`; `meslek.tsx`, `atolye.tsx` | 4 tarz, ay kilidi, XP, sınav/çırak/rakip; ücret katsayıları hâlâ motorda. Bazı mini olaylar otomatik çözülüyor. | merdiven, ekonomi |
| Ticaret / pazar / kervan | `game.ts negotiatedBuy/negotiatedSell/travelBy`; `pazar.tsx` | Arz-talep ve fiyat hafızası, pazarlık, kalite, rota var. Ortak neden dökümü ve baskın rota/mal raporu eksik. | ekonomi, smoke |
| Okul | `game.ts studySubject`; `mektep.tsx` | Enerji, ders, sınav, hoca bağı ve kulüp var. Hoca kişilikleri/silsile PDF kabulü karşılanmış sayılmaz. | kopya, merdiven |
| Suç | `game.ts doCrime/resolveCrimeScene`; `suc.tsx` | Keşif, kilitler, kaçış seçenekleri, sıcak mal ve tanık etkileri var. Soruşturmacı + delil modeli ve ortak kırılım tam değil. | smoke, gdd-baseline |
| Yol | `game.ts travelBy`; `harita.tsx` | Üç rota ve olaylar var. Mesafe/konaklama/seyahat başına iki karar kabulü ayrı geliştirme. | smoke, gdd-baseline |
| Kronik / vâris | `defter.ts`, `roman.ts`, `game.ts continueAsHeir`; `nesil.tsx`, `ocak.tsx`, `kronik.tsx` | Kalıcı soy defteri, anı, borç/miras ve ata izi var. Çok sesli kronik ayrı öneri; mevcut fonksiyonlar yeniden yazılmaz. | defter, roman, kan |
| Sunum / varlık / ses | `ui.tsx`, `kart3d.tsx`, `feel.tsx`, `sound.ts`; `assets/` | Seçilen oyuncu serisi 14 PNG, NPC 48 JPEG, 63 AAC, 15 arka plan kurtarıldı. Sesin ilk çağrısı 17 efekt oynatıcısını açıyor; tek müzik, efekt temizliği ve bağlam eksik. Arka planlar henüz sahnelere bağlı değil. | kurtarma, paylas, i18n |
| MP | `lib/mp/`, `server/src/`, `app/diyar/` | WS mesaj sözleşmesi mevcut; istemci SP motorunu kullanıyor, sunucu ortak dünyayı işliyor. Tüm yerel simülasyon sunucu otoriteli değil. Kimlik/jeton/girdi ve hile sınırı denetimi açık. | protokol paritesi, server/test (bu oturumda canlı çalıştırılmadı) |

Aktif HTTP yüzey: `/`, `/health`, `/realms`, `/realm/:id` (WebSocket). Aktif OpenAPI belgesi yok; 101 Python uç noktasına ait bir belge güncel sözleşme diye oluşturulmaz. Aktif WS tabanı `denetim/mp-sozlesme-baseline.json` ve bayt eş protokol dosyalarıdır. Canlı Vercel/Atlas ortamları bu oturumda okunmadı veya değiştirilmedi.

## His puanlaması ve ilk 10

Aşağıdaki puanlar kod ve ekran akışına dayanan **ön değerlendirme**; gerçek oyuncu veya kullanım sıklığı ölçümü değildir. Sıklık H/M/L tahminidir; telemetri verisi olmadığından `sıklık × açık` sayısal bir ölçüm diye verilmez. İki gerçekten farklı seçenek, pusulada geçerli olsa da PDF'nin katı K≥2 (en az üç seçenek) tanımında K=1 kalabilir; seçenek sayısı sırf puan için şişirilmez.

| Sıra / akış | K/A/G · His | Sıklık tahmini | Sonraki kanıt / geliştirme |
|---|---|---|---|
| 1 Aylık ilerleme/plan | 1/3/2 · 6 | H | Açık hesapların planla takası; mevcut ritim korunur. |
| 2 İş tarzı + sonuç | 2/2/1 · 4 | H | Kazanç/riskin gerçek faktör dökümü; otomatik olayların okunurluğu. |
| 3 Ders ve sınav | 2/2/1 · 4 | H | Hoca, enerji, beceri ve başarısızlık nedeni. |
| 4 Ticaret / pazarlık | 2/2/2 · 8 | H | Son üç fiyat faktörü; aynı rota/mal üstünlük deneyi. |
| 5 NPC konuşma | 2/3/2 · 12 | H | Tepkiyi anıya bağlayan açık neden ve 3 konuşma karakterizasyonu. |
| 6 Suç / iz yönetimi | 2/3/1 · 6 | M | Tanık + iz + yöntemin katkısı; yakalanma nedenini göster. |
| 7 Yol seçimi | 2/2/1 · 4 | M | Süre/risk/erzak dökümü, somut yol kararı. |
| 8 İkilem ve kapıdaki insan | 1/3/2 · 6 | H | Gerçek takas korunur; dönüşün kaynak olaya bağlantısı. |
| 9 Fraksiyon / hane tavrı | 2/3/1 · 6 | M | Ayrıcalık ve yükün tek kısa özetle okunması. |
| 10 Ölüm / vâris devri | 2/3/2 · 12 | L | Önizleme paritesi ve aile anılarının kalıcı sunumu. |

Ortak önkoşul: motorun rastgeleliği kayıtla saklanmıyor. `game.ts` içinde 363 `Math.random` kullanımı var. Testler kontrollü RNG enjekte edebiliyor; bu, üretimde aynı kaydı yükleyince aynı zarın verildiği anlamına gelmez. Ortak çözümleme/kırılım servisi, kayıtlı RNG ve davranış kilitleri genişletilmeden toplu refactor yapılmamalı. Beş sonuç kademesi tek sözleşmede bütün eylemleri kapsıyor sayılmaz.

## Bu oturumun ölçümleri

- Mobil tsc, i18n/ikon, dil karışması: temiz. Eski v1 kayıt 51 tur sorunsuz.
- 30 hayat / 20.136 ay: boş ay %11,4; bunalma %0,2; tekrar %4,1; ölüm yaşı medyan 66; en çok 2 açık gerilim.
- 1.656 gecikmeli sonuçta sebep görünürlüğü %100; 7.914 hafıza seçiminin yeterince zaman geçenlerinde karşılık %100; vadesi gelen iplerde ödeme %100; ip en çok 3.
- Aynı tür kart en çok 3, orta yaş soru arası en çok 18 ay, yetişkin ay notu %63,6. ÇIĞIR EŞİKLERİ temiz.
- `gdd-baseline.cjs`: 10 kritik akışın kontrollü test RNG ile tekrarında aynı hash; üç **sentetik** erken/orta/geç örnekte göç idempotent ve 30 ay tekrarı aynı. Tick p50 0,39 ms / p95 7,73 ms / en çok 16,15 ms (bu konteyner; telefon/API gecikmesi değildir).
- Gerçek 3–5 kullanıcı altın kaydı, düşük uç Android, 390 px / 4× CPU ile üç manuel akış, 30 dakika heap ölçümü, canlı API p95 ve dönem tarihçisinin teyidi henüz yapılmadı. Simülasyon sonuçları bu kabul maddelerinin yerine geçmez.

Faz 0'ın envanter ve ilk davranış tabanı oluşturuldu; bütün kabul koşulları tamamlandı diye raporlanmaz. İlk düşük riskli iş, aynı oyun davranışı üstünde ses kaynaklarının yaşam döngüsü ve sahne bağlamı. Ardından ortak neden dökümü, RNG ve gerçek cihaz/oyuncu doğrulaması. Sırf PDF'de geçtiği için çalışan sistem emekli edilmez.
