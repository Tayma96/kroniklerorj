# Kronikler Online sunucusu (`online-server/`)

Faz 1 (kimlik ve varış) ve Faz 2a-2b (yaşayan yerleşim çekirdeği, öğrenme dönemi) sunucusu: Cloudflare Worker +
üç SQLite tabanlı Durable Object (ücretsiz planda çalışır).
Tek oyunculu oyundan ve `server/`'dan tamamen ayrıdır; ayrı ad `kronikler-online` ile dağıtılır.

- **Google girişi:** Google kimlik belirteci (ID token) WebCrypto ile doğrulanır (JWKS önbellekli, RS256, `iss`, `aud`,
  `exp`/`iat` 60 sn payla). Kimlik = Google `sub`; oyuncu girişinde e-posta okunmaz (yalnız yönetim girişi
  doğrulanmış e-postayı kullanır).
- **Oturum:** 30 günlük, HMAC-SHA256 imzalı sunucu belirteci (`OTURUM_ANAHTARI` sırrıyla).
- **Dünya saati:** 12 gerçek saat = 1 oyun ayı; dönümler TR 00:00 ve 12:00. Başlangıç 1250 Ocak (`src/saat.ts`).
- **Dünya:** 7 beylik, her birinde 1 şehir, 2-3 kasaba, 4-6 köy (`src/dunya-veri.ts`).
- **Profil:** hesap başına bir profil (ad, cinsiyet, beylik, yerleşim, 12 yaşında doğum). Ad Türkçe büyük/küçük harf
  duyarsız eşsizdir. Yerleşim doluysa yalnız davetle girilir; davetle gelen davet edenin yerleşimine yerleşir.
- **Tekrar güvenliği:** aynı `istekNo` ile gelen profil isteği aynı sonucu döndürür; nüfus iki kez sayılmaz.
- **Hız sınırı:** hesap başına dakikada 30 istek; yönetici başına dakikada 60.

Dosyalar: iş kuralları `src/mantik.ts` (Workers'a bağlı değil, testlenir); `src/hesap-do.ts` (`HesapDO`, Google `sub`
başına) ve `src/dunya-do.ts` (`DunyaDO`, tek örnek) bunları depolamaya bağlayan ince sarmalayıcılardır.
Faz 2: kurallar `src/yerlesim/*.ts` (saf), içerik `src/icerik/*.ts` (tek oyunculudan kopya veri), sarmalayıcı
`src/yerlesim-do.ts` (`YerlesimDO`, yerleşim başına bir örnek).

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

| `GET /v1/yerlesim?dil=` | — | `{saat, yerlesim, ben, harita, donusKarti, oneriler, imlec}` |
| `GET /v1/olaylar?imlec=&dil=` | — | `{olaylar: [olay], imlec, dahaVar, eksik}` (en çok 50; `imlec` taranan son sıra) |
| `GET /v1/kisi/:id?dil=` | — | NPC: `{id, ad, cinsiyet, yas, meslek, huy, tuhaflik, hayal, gundem, mekan, aile, sanaBakis, bakislari, eylemler, tanidik}` · oyuncu: `{id, ad, oyuncu, ben, cinsiyet, yas, mekan, tanidik}` |
| `POST /v1/eylem` | `{tur, hedef?, secim?, ozellik?, istekNo, dil?}` | `{tur, hedef, hedefAd, sans, zar, basari, getiri, sonuc, degisim, takat, ogrenme, olay?}` |
| `POST /v1/tanidik` | `{hedef, isaret: "tanidik"\|"dost"\|"dusman"\|null, dil?}` | `{tanidiklar, ogrenme}` |

`istekNo`: istemcinin ürettiği 8-64 karakter (`A-Z a-z 0-9 _ -`, ör. UUID); ağ koparsa aynı numarayla yeniden gönderilir.
`davet` verilirse `yerlesim` yok sayılır. `dil`: `tr en es pt ar ru` (öntanımlı `tr`); yalnız NPC adlarını o dilde yazar.

## Faz 2: yaşayan yerleşim

- **Sahiplik:** `YerlesimDO` (`idFromName("yerlesim:<id>")`) NPC nüfusunu, sakin oyuncuların karakterini, görüş ve
  anıları, olay defterini tutar; bütün eylemleri sırayla işler. `HesapDO` kimlik, profil ve yerleşim işaretçisini
  tutar; yerleşim uçları oradan (hız sınırından geçerek) iletilir. Profil oluşunca oyuncu yerleşiminin sakini olur;
  Faz 1'de oluşmuş profil ilk yerleşim çağrısında kendiliğinden yazılır.
- **Nüfus** (`uret.ts`): yerleşim kimliği + ay tohumundan deterministik; haneler (çift, çocuk, kimi zaman yaşlı ya da
  dul baş), türe göre meslek dağılımı, huy/tuhaflık/hayal, 4 mevsimden eski dostluk/rekabet bağları.
- **Ay dönümü** (`donum.ts`): DO alarmı UTC 09:00 ve 21:00'de. Sıra: ölüm → gündem (geçim, evlilik, dostluk) →
  gündem çözümü → doğum (nüfus dengesi) → göç → oyuncular (13 yaşında Kül Yemini kancası, öğrenme günü olayı, çırak
  harçlığı, dost NPC'nin çorbası / hasım NPC'nin lafı) → anı sönmesi. Tohum: yerleşim + ay. Kaçan dönümler sırayla
  yetiştirilir: çağrı başına en çok 12 ay; kalırsa alarm 1 sn sonraya kurulur. İstekler de önce yetiştirir.
- **Görüş** (`gorus.ts`): kalemlerin toplamı (aranızda geçenler, türüne göre sönen anılar, akrabalık, usta/meslektaş,
  huy ↔ nam, dostunun dostu yalnız ≥ 12 aylık bağlarla ±10). Gösterilen toplam = motorun değeri; ±100 kırpması
  `gorus.sinir` kalemiyle görünür. NPC'nin üçüncü kişilere bakışı yalnız ona yakınsan (+30 üstü) görünür (§13.9).
- **Eylemler** (`eylem.ts`): `sohbet yardim hediye ayakIsi cirak mektep` (1 takat) ve `puan` (özellik puanı),
  `karar` (ilk gerçek karar) (0 takat). Şans dökümü 5..95 (`sans.sinir`), zar 1-100, başarı ⇔ zar ≤ şans.
  Azalan getiri: aynı (oyuncu, NPC, tür) 6 ay içinde n kez → çarpan 1/(1+n); NPC başına aylık görüş kazancı 10.
  Beceri ayda 4, nam ayda 3 ile tavanlı. Yaş kapısı 12+.
- **Takat** (`karakter.ts`): her ay 6; kullanılmayan en çok 2 ay taşınır (tavan 18).
- **Öğrenme dönemi** (`ogrenme.ts`, 12 → 13 yaş = 6 gerçek gün): gün 1 mahalle/tanışma (sohbet, yardım, tanıdık),
  2 çıraklık, 3 mektep ve özellik puanı, 4 ayak işi, 5 dostluk (hediye, dost/düşman işareti), 6 ilk karar. Her günün
  hedefi ve bir kez verilen ödülü var; kaçırılan günün hedefi sonra da yapılabilir.
- **Dönüş Kartı** (`donus.ts`): imleçten beri en çok 5 olay; önce kendine, sonra dost/düşman işaretlilere, sonra
  tanıdıklara dokunanlar, sonra önem. 30 dakikadan kısa aradaki yenilemelerde kart korunur.
- **Depolama** (kısa anahtarlar): `m` meta · `n0..` NPC parçaları (100'er) · `s` sakin dizini · `o:<id>` karakter ·
  `g:<id>` ilişki haritası · `e:<sayfa>` olay sayfaları (64'er, son 48 sayfa). Kişi kimlikleri: NPC `n<sayı>`,
  oyuncu `o<sayı>` (yerleşime yerel; hesap kimliği dışarı verilmez).
- **Simülasyon** (`test/sim.test.ts`): 1 kasaba, 20 oyuncu, 24 ay; dönüm süresi ve farm/çeşitli oyun kazancı.

### İstemci anahtarları

Olay özetleri, sonuçlar ve döküm kalemleri `{k, p}` biçimindedir; metni istemci çevirir. Parametredeki kişiler
`{id, ad}` olarak gelir (ad `dil`e göre yazılmış).

- Olay (`ozet.k`): `olay.olum {kisi, yas}` · `olay.ustaOldu {kisi}` · `olay.yakinOldu {kisi}` ·
  `olay.gundem {kisi, gundem}` · `olay.isBuldu {kisi, meslek}` · `olay.evlilik {a, b}` · `olay.dostluk {a, b}` ·
  `olay.dogum {anne, baba, cocuk}` · `olay.goc {kisi, sayi}` · `olay.kulYemini {kisi}` · `olay.ogrenme.gun {gun}` ·
  `olay.hamle.corba {kisi, sebep}` · `olay.hamle.laf {kisi, sebep}` (`sebep` bir görüş kalemi anahtarıdır) ·
  `olay.yeniSakin {kisi}` · `olay.eylem.sohbet` / `.yardim` / `.hediye` / `.ayakIsi` / `.cirakRed` `{kisi, hedef}` ·
  `olay.eylem.mektep {kisi}` · `olay.ciraklik {kisi, usta, meslek}` · `olay.karar {kisi, secim}`
- Sonuç (`sonuc.k`): `sonuc.<tur>.basari` ve `sonuc.<tur>.basarisiz` (`sohbet yardim hediye ayakIsi cirak`;
  `p`: `gorus?`, `para?`, `meslek?`) · `sonuc.mektep.basari` · `sonuc.puan {ozellik}` · `sonuc.karar {secim}`
- Görüş kalemi: `gorus.gecmis` · `gorus.ani.<tur>` (`sohbet yardim hediye ayakIsi cirak laf`) ·
  `gorus.akraba.<anne|baba|kardes|buyukEbeveyn|hane>` · `gorus.usta` · `gorus.meslektas` · `gorus.huyNam {huy, nam}` ·
  `gorus.kibir {huy}` · `gorus.dostunDostu` · `gorus.sinir`
- Şans kalemi: `sans.temel` · `sans.bakis {gorus}` · `sans.huy {huy}` · `sans.ozellik {ozellik}` ·
  `sans.beceri {beceri}` · `sans.tekrar {tekrar}` · `sans.sinir`
- Öğrenme: `ogrenme.hedef.<sistem> {sayi}`; `sistem`: `mahalle ciraklik mektep ayakIsi dostluk karar`
- Kimlik değerleri (çevrilecek sabitler): mekân `carsi cami kahvehane meydan han degirmen mektep` · aile/bakış rolü
  `anne baba kardes buyukEbeveyn hane es evlat dost rakip oyuncu` · gündem `gecim evlilik dostluk` · işaret
  `tanidik dost dusman` · özellik `guc ceviklik dayaniklilik zeka karizma sezgi` · beceri
  `dovus soz ticaret zanaat ilim gizlilik` · nam `comertlik dindarlik mertlik caliskanlik` · karar
  `zanaat ilim ticaret yol`. Meslek, huy, tuhaflık ve hayal Türkçe kanonik metindir (tek oyunculudaki
  `professionNameL`, `traitL`, `quirkL`, `goalL` tablolarıyla çevrilir); 7 yaş altı `çocuk`, 14 altı `çırak`.
- Yeni hata kodları: `sakin_yok kisi_yok eylem_gecersiz isaret_gecersiz imlec_gecersiz yas_kapisi ogrenme_kapali
  hedef_uygun_degil takat_yok para_yok zaten_cirak karar_verildi puan_yok` (`kisi.eylemler[].engel` de bunlardır).

### Ertelenenler (Faz 2 sonrası)

Oyuncular arası karşılıklı dostluk isteği ve teklifler (gelen kutusu), NPC'nin oyuncuya teklifleri (dünürcü, borç),
söylenti yayılımı ve "duydukları" kalemi, sohbet satırının gerçek hayattan yazımı, olağan düzen ayarları, 13+ eylemleri
ve Kül Yemini mührünün kendisi (Faz 4), istemci (2c) ve 2d inceleme ajanları.

## Ayarlar (Berkay)

Dağıtım **elle** yapılır; otomatik dağıtım ve CI yoktur. Anahtar sohbete yazılmaz, commit'lenmez.

1. Cloudflare'e giriş: `cd online-server && npx wrangler login`
2. **`GOOGLE_CLIENT_ID`** (gizli değil): `wrangler.toml` içindeki `[vars]` altında `GOOGLE_CLIENT_ID = ""` değerine
   Google Cloud'daki OAuth istemci kimliklerini virgülle ayırarak yazın (ör. Android ve Web istemcisi:
   `"123-abc.apps.googleusercontent.com,123-def.apps.googleusercontent.com"`). Boşken giriş `yapilandirma_eksik` döner.
3. Dağıtım: `npm run deploy` (= `npx wrangler deploy`). İlk dağıtım `v1` göçüyle iki DO sınıfını, `v2` göçü
   `YerlesimDO`'yu oluşturur. Yerleşim ilk istekte nüfusunu üretir ve ay dönümü alarmını kendisi kurar.
4. **`OTURUM_ANAHTARI`** (sır, en az 32 karakter): rastgele üretip doğrudan Worker sırrı olarak koyun:
   `openssl rand -base64 48 | npx wrangler secret put OTURUM_ANAHTARI`
   Anahtar değişirse bütün oturumlar geçersiz olur; oyuncular yeniden giriş yapar.
5. Deneme: `curl https://kronikler-online.<hesap>.workers.dev/v1/dunya`

Yerel çalışma için (isteğe bağlı) `online-server/.dev.vars` dosyasına `OTURUM_ANAHTARI=...` yazılabilir; bu dosya
`.gitignore`'dadır.

## Sesli sohbet (Faz 16, handa WePlay tarzı)

Masaya oturan mikrofonunu açıp konuşur, masadakiler (ayaktaki dinleyenler dahil) duyar. Altyapı **Cloudflare
Realtime SFU**'dur (ayda 1.000 GB ücretsiz; aşılmadıkça ek ücret yok). Ses SFU'dan geçer, **kaydedilmez ve
saklanmaz**; sunucu yalnız oturum/iz kimliklerini soket ekinde tutar. Yaş sınırı yoktur (spec §6.1).

- **Yetki kapısı MasaDO'dur** (`src/han/ses.ts`): yalnız oturan, Y1'de susturulmamış ve masa başının sesini
  kesmediği oyuncu yayın açar. Ayaktaki dinler; "söz iste" ile masa başı onaylarsa boş koltuğa geçer. Kalkma,
  susturma, atma, ayrılma ve masa başının ses kesmesi yayını SFU'da hemen kapatır. Engelli çiftler birbirini duymaz.
- Worker Realtime API'sine vekildir (`src/han/realtime.ts`); uygulama anahtarı istemciye hiçbir yanıtta gitmez.
  Uçlar: `POST /v1/han/masa/:no/ses/{oturum,yayin,dinle,anlas,kapat}`. Masa soketi `sesDurum` iletisi yollar
  (yayındakiler, konuşanlar, sesi kesilenler, söz isteyenler); komutlar `konus`, `sesKapat`/`sesAc`, `sozIste`/`sozGeri`, `sozVer`.
- `REALTIME_APP_ID` ya da `REALTIME_APP_TOKEN` boşsa ses kapalıdır: uçlar `503 ses_kapali` döner, istemci düğmeyi gizler.

Berkay'ın adımları:

1. Cloudflare panelinde **Realtime → SFU → Create application** ile bir uygulama oluşturun.
2. Uygulama kimliğini `wrangler.toml` `[vars]` altındaki `REALTIME_APP_ID = ""` değerine yazın (gizli değil).
3. Uygulama anahtarını sır olarak koyun: `cd online-server && npx wrangler secret put REALTIME_APP_TOKEN`
   (anahtar sohbete yazılmaz, commit'lenmez).
4. İsteğe bağlı (kısıtlı ağlarda bağlantı için): panelde bir **TURN anahtarı** oluşturup kimliğini `REALTIME_TURN_ID`
   olarak `[vars]`a, anahtarını `npx wrangler secret put REALTIME_TURN_TOKEN` ile koyun. Yoksa Cloudflare STUN'u kullanılır.
5. `npx wrangler deploy`.
6. **Yeni APK gerekir**: ses `react-native-webrtc` yerel modülüyle çalışır; Expo Go'da ve eski APK'da düğme görünmez
   (neden yazılır). Android mikrofon izni (`RECORD_AUDIO`) ilk açılışta sorulur.

## Yönetim (Y1 çekirdeği)

Ana tasarım §7. Tek örnek `YonetimDO` (`idFromName("yonetim")`, bağ `YONETIM`, göç `v3`): yönetici rolleri, **yalnız
eklenen** işlem kaydı (silme/düzenleme ucu yoktur), parametre katmanı, şikayet kuyruğu, yaptırımlar, duyurular.
Kurallar `src/yonetim/` (`yetki.ts` matris, `parametre.ts` kayıt defteri, `yaptirim.ts`, `sikayet.ts`, `islem.ts`,
`kimlik.ts` belirteç, `panel.ts` web paneli).

- **Kimlik:** `POST /yonetim/giris {idToken}` → `{oturum, rol}`. Google belirteci doğrulanır; e-posta yalnız
  `email_verified` doğruysa kabul edilir (`eposta_dogrulanmamis`). Kurucular `YONETICI_EPOSTALAR`dan, moderatörler
  YonetimDO'dan; rol istemciden alınmaz ve her istekte yeniden çözülür. Yönetici belirteci 12 saatliktir ve
  `OTURUM_ANAHTARI`ndan türetilmiş ayrı bir anahtarla imzalanır: oyuncu belirteci `/yonetim/*`de, yönetici belirteci
  `/v1/*`de geçmez.
- **Yetki:** moderatör = şikayet kuyruğu/karar, susturma (≤30 gün), geçici uzaklaştırma (≤7 gün, parametre), bunların
  kaldırılması, oyuncu görüntüleme. Yalnız kurucu = kalıcı uzaklaştırma ve kaldırması, parametre değiştir/geri al,
  rol, duyuru, işlem kaydı. Bilinmeyen işlem reddedilir. Ad değişikliği zorunluluğu ve iade/geri alma matriste var,
  uçları Y2'de.
- **Kayıt:** her yazan işlem, rolü olan (ya da rolü alınmış) yöneticinin her başarısız denemesi ve oyuncu görüntüleme
  kayda girer; kayıt girdi başına ayrı anahtardır, hiç silinmez. Rolsüz kişinin giriş denemesi kaydı şişirmesin diye
  kayda yazılmaz: günlük sayaçta tutulur (`ben.yetkisizGirisBugun`) ve dakikada toplam 20 ile sınırlıdır.
  Yazan uçlar `istekNo` ile tekrar güvenlidir (aynı istekNo başka uç ya da gövdeyle `istekno_gecersiz`) ve en az 10
  harf/rakam içeren `gerekce` ister; görünmez, yön değiştiren ve dolgu karakterleri metinlerden atılır.
- **HesapDO'ya yazılamazsa:** yaptırım kaydı tutulur, yanıt `hesabaYazildi: false` der ve kayda girer; aynı istekNo ile
  yeniden göndermek ya da aynı hedefte kaldırma denemesi (`yaptirim_yok` dahil) güncel özeti yeniden yazar.
- **Şikayet:** hedef başına tek açık kayıt; farklı şikayetçiler birleşir (`sayi`), aynı şikayetçi ikinci kez sayılmaz.
  Şikayetçi başına en çok 10 açık şikayet ve günlük sınır; kuyruk (2000 hedef) doluysa yalnız yeni hedef reddedilir.
  Moderatör, başka yöneticilerin e-postası yerine rolünü görür.
- **Kendine fayda yasağı:** yönetici, Google `sub`ının oyuncu hesabından yaptırım kaldıramaz, kendi hakkındaki
  şikayete karar veremez (`kendi_hedef`).
- **Yaptırım uygulanır:** uzaklaştırılmış hesabın `/v1/*` istekleri 403 `{hata: "uzaklastirildi", bitis}` döner
  (`bitis: null` = kalıcı). `/v1/giris` açıktır ve yanıta `uzaklastirma: {bitis}` ekler. Susturma Y1'de yalnız
  kayıtlı bayraktır (sohbet Faz 10'da okuyacak) ve `/v1/sikayet`i kapatır (`susturuldu`).
- **Parametreler:** izinli adlar, koddaki varsayılan, alt/üst sınır ve açıklama `src/yonetim/parametre.ts`'de.
  Her değişiklik sürümlüdür; geri al bir önceki sürüme (en sonunda varsayılana) döner. **Y1'de yalnız
  `SIKAYET_GUNLUK` ve `GECICI_UZAKLASTIRMA_EN_COK_GUN` çalışma anında okunur; `NPC_AYLIK_KOTA`, `NPC_CARPAN`,
  `KITLIK_PRIM`, `TEMEL_CIKTI`, `AZALAN_PENCERE_IS`, `HIZ_SINIRI` saklanır ama oyun modülleri onları henüz
  okumaz (koddaki değerle çalışır); okuma Y2'de bağlanacak.**

| Uç | Gövde / sorgu | Kim |
|---|---|---|
| `GET /yonetim` | — | panel (HTML; sıkı CSP, `x-frame-options: DENY`) |
| `GET /yonetim/ben` | — | `{eposta, rol, yetkiler, kendiHesap, ortamKurucusu}` |
| `GET /yonetim/oyuncu` | `?ad=` ya da `?hesap=` | `{profil, yerlesim, yaptirim: {etkin, liste}, kendi}` |
| `POST /yonetim/yaptirim` | `{hedef, tur: "susturma"\|"uzaklastirma"\|"kaliciUzaklastirma", gun?, gerekce, istekNo}` | mod / kalıcı: kurucu |
| `POST /yonetim/yaptirim-kaldir` | `{hedef, tur?, gerekce, istekNo}` | mod / kalıcı: kurucu |
| `GET /yonetim/sikayetler` | `?durum=acik\|reddedildi\|yaptirim` | mod |
| `POST /yonetim/sikayet-karar` | `{id, karar: "reddet"\|"yaptirim", tur?, gun?, gerekce, istekNo}` | mod |
| `GET /yonetim/parametreler` | — | kurucu |
| `POST /yonetim/parametre` | `{ad, deger, gerekce, istekNo}` | kurucu |
| `POST /yonetim/parametre-geri` | `{ad, gerekce, istekNo}` | kurucu |
| `POST /yonetim/rol` | `{eposta, rol: "moderator"\|null, gerekce, istekNo}` | kurucu (kurucu yalnız `YONETICI_EPOSTALAR`dan gelir; verilemez, düşürülemez) |
| `POST /yonetim/duyuru` | `{metin, gerekce, istekNo}` | kurucu |
| `GET /yonetim/kayit` | `?imlec=` (en çok 50, yeniden eskiye) | kurucu |
| `POST /v1/sikayet` | `{hedef, neden: kufur\|taciz\|uygunsuzAd\|hile\|dolandiricilik\|spam\|diger, aciklama?, istekNo}` | oyuncu (günde 5, kendini değil) |
| `GET /v1/duyurular` | — | oyuncu: son 5 `{id, metin, zaman}` |

Yeni hata kodları: `uzaklastirildi susturuldu yetki_yok eposta_dogrulanmamis kendi_hedef gerekce_gecersiz gun_gecersiz
yaptirim_gecersiz yaptirim_yok kendini_sikayet sikayet_gecersiz sikayet_yok sikayet_siniri kuyruk_dolu
parametre_gecersiz deger_sinir_disi geri_yok rol_gecersiz eposta_gecersiz kurucu_degismez duyuru_gecersiz hesap_yok`.

**Berkay'ın yapacağı:** kurucu e-postasını (Google hesabı) sır olarak koymak:
`npx wrangler secret put YONETICI_EPOSTALAR` (değer ör. `berkay@gmail.com`; birden çoksa virgülle). Boşken kimse
yönetici değildir. Panel: `https://kronikler-online.<hesap>.workers.dev/yonetim`; Google ID token'ı elle yapıştırılır
Yönetim girişi için **`YONETIM_GOOGLE_CLIENT_ID`** zorunludur (yönetim paneline ait Google istemci kimlikleri,
virgülle; gizli değil). Boşsa `/yonetim/giris` `yapilandirma_eksik` döner; oyuncu `GOOGLE_CLIENT_ID`sine geri
düşülmez (oyuncu uygulaması için verilmiş bir belirteç yönetim girişinde kullanılamasın). Google düğmesi sonraki adımda.

## Geliştirme

Bağımlılık kurulmaz: Node 22 `.ts` dosyalarını doğrudan çalıştırır, tip denetimi `mobile/` içindeki `tsc` ile yapılır.
Workers tipleri `src/cf.d.ts`'de elle yazılıdır.

```sh
npm run typecheck   # ../mobile/node_modules/.bin/tsc --noEmit -p .
npm test            # node --test "test/*.test.ts"
```

`[PARAMETRE]` değerleri: dünya başlangıç anı ve yılı (`src/saat.ts`), ev kapasitesi ve NPC sayısı
(`src/dunya-veri.ts`), hız sınırı (`src/mantik.ts`); Faz 2: meslek ağırlıkları (`uret.ts`), ölüm/doğum/gündem oranları
(`donum.ts`), görüş kalemleri (`gorus.ts`), eylem tanımları ve azalan getiri (`eylem.ts`), takat (`karakter.ts`),
yetiştirme sınırı ve olay sayfaları (`motor.ts`).
