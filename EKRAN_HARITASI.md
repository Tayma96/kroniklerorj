# EKRAN HARİTASI

> 13 Kasım 2026. Kaynak: `mobile/app/` altındaki 65 ekran dosyası ve koddaki bütün `router.push/replace/back`
> çağrıları ile `lib/` içindeki rota metinleri. Kod değişmedi; bu yalnız envanterdir.
> "Doğrulanmadı" yazan yerler koddan kesin okunamayan noktalardır.

## 0. Büyük resim (karışıklığın kaynağı)

Uygulamada iki değil **üç** ayrı alan var:

| Alan | Klasör | Ekran | Durum |
|---|---|---|---|
| Tek oyunculu | `app/oyun/` | 35 | Çalışıyor, oyunun kendisi. |
| Eski çok oyunculu ("Diyar") | `app/cok-oyunculu/` | 5 | Kapalı (`ONLINE_ACIK = false`). Girişteki "Çok Oyuncu" düğmesi buraya gelir ve "Yakında" gösterir. Açıkken tek oyunculu ekranları `mpMode` ile yeniden kullanır. |
| Yeni çevrimiçi | `app/online/` | 22 | Kapalı (`ONLINE_GELISTIRME = false`). **Uygulamanın hiçbir yerinden `/online`'a giden düğme yok.** |
| Kök | `app/` | 3 | Giriş, yeni oyun, sinematik. |

Yani oyuncu bugün yalnız tek oyunculuyu görür. 27 çok oyunculu ekran yazılmış ama oyuncuya kapalı.

## 1. Ekran envanteri

### Kök

| Ekran | Ne işe yarar | Nereden gelinir |
|---|---|---|
| `/` `index.tsx` | Giriş: Devam, Yeni Oyun, Çok Oyuncu. | Uygulama açılışı; yeni oyundan geri. |
| `/yeni-oyun` | Ad, cinsiyet, tabiat, ocak seçip hayatı kurar. | Giriş; Menü, Ayarlar ve ölüm ekranındaki "yeni hayat". |
| `/sinematik` | Açılış sinematiğini yeniden oynatır. | Yalnız Ayarlar. |

### Tek oyunculu — alt çubuk (her yerden tek dokunuş)

| Ekran | Ne işe yarar | Nereden gelinir |
|---|---|---|
| `/oyun` `oyun/index.tsx` | Ana sayfa: ayın olayı, kararlar, gündem, ölüm ve ağıt. | Alt çubuk; Ayı İlerlet düğmesi; giriş, yeni oyun, sinematik, vâris/ocak sonrası. |
| `/oyun/karakter` | Kimlik, göstergeler, emek/uğraş ve 4 sekme (Özellikler, Kuşam, Ocak, Serüven). | Alt çubuk; ana sayfa, Açık İşler, Mektep, NPC, gündem bağlantıları. |
| `/oyun/iliskiler` | Aile, yakın çevre, hasımlar, tanışlar listesi. | Alt çubuk; Şehir, Açık İşler, gündem. |
| `/oyun/menu` | Dört gruplu kapı: Şehir, Güç & Mevki, Aile & Soy, Defter. | Alt çubuk. |
| Ayı İlerlet | Ekran değil; ayı geçirip `/oyun`'a döner (uzun bas: 6 ay). | Alt çubuğun ortası. |

### Tek oyunculu — Menü ve Şehir üzerinden

| Ekran | Ne işe yarar | Nereden gelinir |
|---|---|---|
| `/oyun/sehir` | Şehrin durumu, mekân kartları, bölge ambarı. | Menü başlığı. |
| `/oyun/pazar` | Alım-satım ve pazarlık. | Menü, Şehir, ana sayfa, Açık İşler, Haberler, gündem (borç). |
| `/oyun/atolye` | Üretim ve sipariş. | Menü (reşitse), Şehir. |
| `/oyun/meslek` | Meslek, lonca sınavı, çırak, ustalık. | Menü (reşitse), Çatışma, gündem. |
| `/oyun/mulkler` | Mülk alma ve işletme. | Menü (yaş kapılı), Şehir. |
| `/oyun/mahalle` | Bu ay kim hangi mekânda; uğrama ve akşam sofrası. | Menü, Şehir, İlişkiler. |
| `/oyun/mektep` | Dersler, sınav, hoca. | Menü, Şehir. |
| `/oyun/haberler` | Diyardan haberler; ilgili ekrana götürür. | Menü, Şehir. |
| `/oyun/gorevler` | "Açık İşler": yapılabilecekleri ilgili ekrana bağlayan liste. | Yalnız Menü. |
| `/oyun/harita` | Beylikler ve yerleşimler haritası. | Menü, Şehir, gündem. |
| `/oyun/diyar/[name]` | Seçilen yerleşimin yönetim, vergi, yol bilgisi. | Harita, Haberler. |
| `/oyun/orgutler` | Örgütler ve loncalar, üyelik. | Menü (reşitse), Şehir, ana sayfa, Açık İşler, Haberler. |
| `/oyun/sosyal` | "Mevki & İtibar": mevki basamağı ve nam. | Menü (reşitse), ana sayfa (söylenti). |
| `/oyun/beceriler` | Beceri ağacı. | Menü, Karakter (Özellikler), Mektep, Açık İşler. |
| `/oyun/savas` | "Çatışma": hasım, düello, savaş. | Menü (reşit ya da hasım varsa), Açık İşler, gündem, diyar bildirimi. |
| `/oyun/suc` | "Gölge İşleri": keşif, plan, suç. | Menü (reşitse), Açık İşler. |
| `/oyun/hanedan` | Soy, taht, servet sekmeleri; karar defteri. | Menü, Şehir, ana sayfa, Karakter (Ocak), Açık İşler, Haberler. |
| `/oyun/diplomasi` | Hanedanlar arası teklifler. | Hanedan, diyar bildirimi. |
| `/oyun/nesil` | "Nesil & Vâris": vâris seçimi ve devir önizlemesi. | Menü (kapılı), Hanedan, Açık İşler, ölüm ekranı. |
| `/oyun/ocak` | "Küllerden Yeni Ocak": vârissiz ölümden sonra aynı soyadla yeni hayat. | Yalnız ölüm ekranı (vâris yoksa). |
| `/oyun/kronik` | Hanedan Defteri: ölümden sağ çıkan soy kaydı. | Yalnız Menü. |
| `/oyun/tarih` | Başlığı da "Kronik": bu hayatın günlüğü (önemli, günlük, dünya) ve film şeridi. | Menü, ana sayfa, ağıt ekranı. |
| `/oyun/roman` | "Hayatın Romanı": hayatın anlatı özeti, paylaşım kartı. | Menü, ana sayfa, ağıt ekranı. |
| `/oyun/hikayeler` | "Hikâyelerim": hikâye yaylarının ilerleyişi. | Menü, ana sayfa, Açık İşler. |
| `/oyun/basarimlar` | Başarımlar ve ilerleme oranı. | Yalnız Menü. |
| `/oyun/npc/[id]` | Kişi sayfası: sohbet, anılar, eylemler. | İlişkiler, Mahalle, Hanedan, Diplomasi, Mevki, Karakter (Ocak), Meslek (lonca), ana sayfa, başka bir NPC. |
| `/oyun/copcatan` | Çöpçatan: eş adayı süzme. | Yalnız İlişkiler. |
| `/oyun/ayarlar` | Dil, ses, yeni hayat, yardım bağlantıları. | Ana sayfa, Karakter, Menü. |
| `/oyun/sss` | Nasıl Oynanır. | Yalnız Ayarlar. |
| `/oyun/emek` | "Emeği Geçenler": lisans ve atıflar. | Yalnız Ayarlar. |
| `/oyun/divan` | Günün davası; hüküm ver, lakap kazan, paylaş. | **Hiçbir yerden.** |

### Eski çok oyunculu (`cok-oyunculu/`)

| Ekran | Ne işe yarar | Nereden gelinir |
|---|---|---|
| `/cok-oyunculu` | Lobi: diyar listesi, ad. Kapalıyken "Yakında". | Giriş; tek oyunculu düzeninden yönlendirme. |
| `/cok-oyunculu/diyar` | Diyar bekleme odası ve sohbet; başlayınca `/oyun`'a geçer. | Lobi. |
| `/cok-oyunculu/oyun` | Diyar panosu: oyuncular, sohbet, tek oyunculu 9 ekrana kısayol. | `/oyun` ana sayfası (yalnız `mpMode`). |
| `/cok-oyunculu/harita` | Diyar haritası. | Diyar panosu. |
| `/cok-oyunculu/diplomasi` | Oyuncular arası diplomasi. | Diyar panosu. |

### Yeni çevrimiçi (`online/`)

| Ekran | Ne işe yarar | Nereden gelinir |
|---|---|---|
| `/online` | Giriş: Google düğmesi (kapalı), geliştirici oturumu. | **Dışarıdan hiçbir yerden.** İçeride çoğu ekranın "girişe dön"ü. |
| `/online/profil` | Dünyada tek ad ve cinsiyet. | Giriş, Davet, Yerleşim. |
| `/online/yerlesim` | 7 beylikten yerleşim seçimi. | Profil. |
| `/online/davet` | Davet koduyla yerleşime katılma. | Yerleşim. |
| `/online/varis` | İlk varış: sinematik ve "12 yaşında indin" kartı. | Giriş (profil varsa), Yerleşim, Davet. |
| `/online/yasam` | Ana sayfa: dönüş kartı, gerilimler, takat, hızlı geçişler. | Varış, Dönüş, alt gezinme. |
| `/online/mahalle` | Bu ay kim nerede (tek oyunculunun harita bileşeniyle). | Yaşam, alt gezinme. |
| `/online/tanidiklar` | Tanıdık, dost, düşman listesi. | Yaşam, alt gezinme. |
| `/online/karakter` | 6 özellik, beceriler, nam, yol seçimi, hane. | Yaşam, alt gezinme, Mahalle, Kişi. |
| `/online/meslek` | 14 meslek seçimi ya da kademe kartı. | Yaşam, İşler, Lonca, beceri ağacı. |
| `/online/beceri-agaci` | Mesleğin beceri ağacı. | Meslek, Oyuncu profili. |
| `/online/isler` | Beş temel iş ve ambar. | Yaşam, Meslek, Siparişler. |
| `/online/lonca` | 14 mesleğin doluluk tablosu. | Yaşam, Meslek, Siparişler. |
| `/online/siparisler` | Lonca siparişleri ve teslim. | Yaşam, İşler, Lonca. |
| `/online/kisi/[id]` | NPC profili ve sana bakışı. | Mahalle, Tanıdıklar, Yaşam, Karakter, Gelen, Siparişler, başka kişi. |
| `/online/oyuncu/[id]` | Oyuncu profili, teveccüh, armağan vitrini. | Kişi yolu üzerinden; kendi profilin (toplum bileşeni). |
| `/online/gelen` | Gelen kutusu: teklifler, dostluk, söylentiler. | Toplum bileşeni (hangi ekranda durduğu doğrulanmadı). |
| `/online/han` | Yerleşimin hanı ve masalar. | Yaşamdaki han girişi. |
| `/online/han/[masa]` | Masa: koltuklar, sohbet, yemin/sözleşme. | Han. |
| `/online/hanedan` | Soy ağacı, vasiyet, devir. | Yaşamdaki han/hanedan girişi. |
| `/online/kronik` | Yerleşim kroniği. | Yalnız Hanedan. |
| `/online/donus` | 24 saatten uzun yokluktan dönüş ekranı. | Barınma bileşeni. |

## 2. Tekrar edenler

| Konu | Ekranlar | Sorun |
|---|---|---|
| "Kronik" adı | `/oyun/tarih` ve `/oyun/kronik` | İkisinin başlığı da "Kronik". Biri bu hayatın günlüğü, öbürü hanedan defteri. |
| Hayat kaydı | `tarih`, `roman`, `hikayeler`, `kronik`, `basarimlar` | Beş ayrı "geçmişim" ekranı; oyuncu hangisine bakacağını bilemez. |
| Yönlendirme merkezi | `menu`, `sehir`, `gorevler`, ana sayfa gündemi | Dördü de "şuraya git" listesi. Şehir, Menü'nün Şehir grubunun 9 kartını yeniden gösterir. |
| Aile ve soy | Karakter (Ocak sekmesi), `iliskiler`, `hanedan` (Soy sekmesi), `nesil` | Aynı insanlar dört yerde. |
| İtibar/nam | `sosyal`, Karakter göstergeleri, `orgutler` | Mevki ve nam üç yere dağılmış. |
| "Emek" adı | `/oyun/emek` (lisanslar) ve Karakter'deki Emek paneli (çalışma) | Aynı kelime iki ayrı şey. |
| Mahalle | `/oyun/mahalle`, `/online/mahalle` | Aynı bileşen, iki ayrı ekran. |
| Karakter | `/oyun/karakter`, `/online/karakter` | Aynı iş, ayrı kod. |
| Meslek | `/oyun/meslek` + `beceriler`, `/online/meslek` + `beceri-agaci` | İki ayrı meslek ve beceri sistemi. |
| Hanedan | `/oyun/hanedan`, `/online/hanedan` | Aynı kavram, ayrı ekran. |
| Kişi sayfası | `/oyun/npc/[id]`, `/online/kisi/[id]`, `/online/oyuncu/[id]` | Üç profil ekranı. |
| Harita | `/oyun/harita`, `/cok-oyunculu/harita`, `/online/yerlesim` | Üç harita/yerleşim ekranı. |
| Diplomasi | `/oyun/diplomasi`, `/cok-oyunculu/diplomasi` | İki ayrı ekran. |
| Çok oyunculu | `cok-oyunculu/*` ve `online/*` | Aynı vaadin iki nesli; eskisi tek oyunculu ekranları ödünç alır, yenisi hepsini baştan yazar. |

## 3. Sorunlu ekranlar

**Ulaşılamayan**
- `/oyun/divan`: koda bağlı tek bir düğme yok. Çalışan, bitmiş bir ekran ama oyuncu göremez.
- `/online` ve altındaki 22 ekranın tamamı: dışarıdan giriş yok, ayrıca kapı kapalı.
- `/cok-oyunculu/diyar`, `oyun`, `harita`, `diplomasi`: lobi "Yakında" gösterdiği için ulaşılamaz.

**Tek kapılı (bulması zor)**
- `kronik`, `basarimlar`, `gorevler`: yalnız Menü. `copcatan`: yalnız İlişkiler. `sss`, `emek`, `sinematik`: yalnız Ayarlar.
- `ayarlar`: alt çubukta yok; ana sayfa, Karakter ya da Menü'deki küçük düğmeden.
- `ocak`: yalnız vârissiz ölümde; bu doğru, sorun değil.

**Çıkmaz sokak**
- Gerçek çıkmaz yok; her ekranda geri var.
- Çevrimiçi ekranlarda "geri" çoğu yerde `/online` girişine `replace` eder (oturum/yerleşim yoksa). Oturum varken geri davranışı doğrulanmadı.
- Çocuklukta Menü'nün kapalı kartları (atölye, meslek, örgütler, mevki, gölge, mülk) oyuncuya yarım oyun hissi verebilir; kartın gizli mi kilitli mi göründüğü doğrulanmadı.

**Tutarsızlık**
- Girişte "Çok Oyuncu" eski lobiye gider; yeni çevrimiçine giden yol yok. İkisi de açılırsa oyuncu iki ayrı çok oyunculu görür.

## 4. Yeni oyuncunun yolu

```mermaid
flowchart TD
  A["Uygulama açılır"] --> B["Giriş /"]
  B -->|"Yeni Oyun"| C["/yeni-oyun: ad, cinsiyet, tabiat, ocak"]
  C --> D["/oyun: Ana sayfa"]
  D --> E["Ayın olayı ve karar"]
  E --> F["Karakter: Emek / Uğraş"]
  F --> G["Ayı İlerlet (alt çubuk ortası)"]
  G --> H["/oyun: ay özeti, yeni olay"]
  H -->|"çok oyunculu için çıkış yok; uygulamayı baştan aç"| B
  B -->|"Çok Oyuncu"| I["/cok-oyunculu"]
  I --> J["'Yakında' ekranı (kapalı)"]
  K["/online (yeni çevrimiçi)"] -.->|"hiçbir düğme bağlı değil"| J
```

Bugünkü gerçek: yeni oyuncu çok oyunculuya **ulaşamaz**. Oyun içinden girişe dönen açık bir düğme de bulunamadı (doğrulanmadı; Android geri tuşu çalışır).

## 5. Tek oyunculuda olup çok oyunculuda olmayanlar

"Eski MP" tek oyunculu ekranı ödünç alıyorsa "ödünç" yazar.

| Özellik | Tek oyunculu | Eski MP (Diyar) | Yeni çevrimiçi |
|---|---|---|---|
| Ay ilerletme | Var (düğme) | Var (hazır oyu, sayaçlı tur) | Yok; dünya saati sunucuda |
| Aylık olay ve ikilem | Var | Var | Yok (gerilimler, dönüş kartı var) |
| Karakter | Var | Ödünç | Var (ayrı) |
| İlişkiler / kişi sayfası | Var | Ödünç | Var (tanıdıklar, kişi) |
| Mahalle | Var | Yok | Var |
| Meslek | Var | Ödünç | Var (14 meslek, ayrı sistem) |
| Beceri ağacı | Var | Ödünç | Var (v2) |
| Mektep | Var | Ödünç | Yok (öğrenme dönemi şeridi var) |
| Pazar | Var | Ödünç | Yok (işler, ambar, sipariş var) |
| Atölye | Var | Yok | Yok |
| Mülkler | Var | Ödünç | Ekranı yok (sunucuda var) |
| Örgütler | Var | Ödünç | Lonca tablosu |
| Çatışma / savaş | Var | Ödünç | Yok |
| Gölge İşleri (suç) | Var | Yok | Yok |
| Mevki & İtibar | Var | Yok | Nam, karakterin içinde |
| Hanedan | Var | Yok | Var |
| Nesil & vâris | Var | Yok (ölünce yeni oyun) | Hanedan içinde devir |
| Küllerden Yeni Ocak | Var | Yok | Yok |
| Çöpçatan / evlilik | Var | Yok | Ekranı yok |
| Harita / yerleşim detayı | Var | Var (ayrı) | Yalnız yerleşim seçimi |
| Diplomasi | Var | Var (ayrı) | Ekranı yok (sunucuda siyaset var) |
| Haberler | Var | Yok | Yerleşim defteri, kronik |
| Hayat kaydı (günlük, roman, hikâyeler) | Var | Yok | Yalnız yerleşim kroniği |
| Başarımlar, Divan | Var | Yok | Yok |
| Ayarlar, SSS | Var | Yok | Yok |
| Sohbet | Yok | Var | Var (han masası) |
| Gelen kutusu, davet, oyuncu profili | Yok | Yok | Var |

## 6. Ek şemalar

### (a) Bütün geçişler

```mermaid
flowchart LR
  G["/ Giriş"] --> YO["yeni-oyun"] --> ANA["oyun (Ana)"]
  G --> ANA
  G --> MPL["cok-oyunculu (kapalı)"]

  subgraph ALT["Alt çubuk"]
    ANA; KAR["karakter"]; ILI["iliskiler"]; MENU["menu"]
  end
  ANA --- KAR --- ILI --- MENU

  ANA --> tarih; ANA --> roman; ANA --> hikayeler; ANA --> hanedan; ANA --> orgutler
  ANA --> pazar; ANA --> sosyal; ANA --> NPC["npc/id"]; ANA --> AYAR["ayarlar"]
  ANA -->|"ölüm, vâris var"| nesil
  ANA -->|"ölüm, vâris yok"| ocak
  nesil --> ANA; ocak --> ANA

  KAR --> AYAR; KAR --> beceriler; KAR --> hanedan; KAR --> NPC
  ILI --> NPC; ILI --> copcatan; ILI --> mahalle
  NPC --> NPC; NPC --> KAR; mahalle --> NPC

  MENU --> sehir; MENU --> AYAR; MENU --> YO
  MENU --> pazar; MENU --> atolye; MENU --> meslek; MENU --> mulkler; MENU --> mahalle
  MENU --> mektep; MENU --> haberler; MENU --> gorevler; MENU --> harita
  MENU --> orgutler; MENU --> sosyal; MENU --> beceriler; MENU --> savas; MENU --> suc
  MENU --> hanedan; MENU --> nesil; MENU --> kronik
  MENU --> hikayeler; MENU --> tarih; MENU --> roman; MENU --> basarimlar

  sehir --> pazar; sehir --> mahalle; sehir --> mulkler; sehir --> hanedan; sehir --> atolye
  sehir --> mektep; sehir --> orgutler; sehir --> ILI; sehir --> haberler; sehir --> harita
  harita --> DY["diyar/name"]; haberler --> DY; haberler --> orgutler; haberler --> pazar; haberler --> hanedan
  gorevler --> nesil; gorevler --> KAR; gorevler --> beceriler; gorevler --> hikayeler
  gorevler --> orgutler; gorevler --> savas; gorevler --> suc; gorevler --> hanedan; gorevler --> pazar; gorevler --> ILI
  hanedan --> nesil; hanedan --> diplomasi; hanedan --> NPC; diplomasi --> NPC; sosyal --> NPC
  mektep --> beceriler; mektep --> KAR; savas --> meslek
  AYAR --> sss; AYAR --> emek; AYAR --> sinematik; AYAR --> YO; sinematik --> ANA
  divan["divan (bağlantısız)"]

  MPL --> MPD["cok-oyunculu/diyar"] --> ANA
  ANA -->|"mpMode"| MPO["cok-oyunculu/oyun"]
  MPO --> MPH["cok-oyunculu/harita"]; MPO --> MPDP["cok-oyunculu/diplomasi"]
  MPO -->|"9 kısayol"| KAR
```

```mermaid
flowchart LR
  X["(dışarıdan giriş yok)"] -.-> OG["online (giriş)"]
  OG --> OP["profil"] --> OY["yerlesim"] --> OV["varis"] --> YS["yasam"]
  OY --> OD["davet"] --> OV
  OG -->|"profil varsa"| OV
  DON["donus"] --> YS

  subgraph ONAV["Alt gezinme"]
    YS; OM["mahalle"]; OT["tanidiklar"]; OK["karakter"]
  end
  YS --- OM --- OT --- OK

  YS --> MS["meslek"]; YS --> IS["isler"]; YS --> LN["lonca"]; YS --> SP["siparisler"]
  YS --> HAN["han"]; YS --> HND["hanedan"]; YS --> KI["kisi/id"]
  MS --> BA["beceri-agaci"]; MS --> IS; MS --> LN
  IS --> SP; IS --> MS; LN --> SP; LN --> MS; SP --> IS; SP --> LN; SP --> KI
  HAN --> MASA["han/masa"]; HND --> KRO["kronik"]
  OM --> KI; OT --> KI; OK --> KI; KI --> KI; KI --> OYU["oyuncu/id"]; OYU --> BA
  GEL["gelen"] --> KI
```

### (b) Bir hayat döngüsü (tek oyunculu)

```mermaid
flowchart TD
  D["Doğum: /yeni-oyun"] --> C["Çocukluk: /oyun + mektep + mahalle"]
  C --> M["Meslek: meslek, atolye, pazar, beceriler; emek Karakter'de"]
  M --> E["Evlilik: iliskiler → copcatan ya da npc/id"]
  E --> A["Aile ve soy: Karakter (Ocak), hanedan, nesil"]
  A --> G["Güç: orgutler, sosyal, savas, suc, mulkler, diplomasi"]
  G --> O["Ölüm: /oyun üzerinde ağıt penceresi"]
  O -->|"film / roman"| R["tarih, roman"]
  O -->|"vâris var"| N["nesil: vâris seç"] --> C2["/oyun: vâris olarak devam"]
  O -->|"vâris yok"| K["ocak: küllerden yeni ocak"] --> C2
  O -->|"istersen"| D
  C2 --> M
```

Çevrimiçi karşılığı: profil → yerleşim → varış (12 yaş) → yaşam → meslek → hanedan (vasiyet, devir). Evlilik ve ölümün ayrı ekranı yok.

### (c) En derin yollar

```mermaid
flowchart LR
  A1["Giriş"] --> A2["Ana"] --> A3["Menü"] --> A4["Şehir"] --> A5["Harita"] --> A6["Diyar/name"]
  B1["Ana"] --> B2["Menü"] --> B3["Açık İşler"] --> B4["Hanedan"] --> B5["Diplomasi"] --> B6["NPC"] --> B7["NPC → NPC → …"]
  C1["Ana"] --> C2["Karakter"] --> C3["Ayarlar"] --> C4["SSS / Emeği Geçenler / Sinematik"]
  D1["Yaşam"] --> D2["Meslek"] --> D3["Lonca"] --> D4["Siparişler"] --> D5["Kişi"] --> D6["Kişi → Kişi → …"]
```

- En derin sabit yol 5 dokunuş (Diyar detayı). NPC ve kişi sayfaları birbirine sınırsız zincirlenir.
- Menü → Şehir → mekân: aynı mekâna Menü'den 1, Şehir'den 2 dokunuşla gidilir.
- Açık İşler bir ara katmandır; kendi içeriği yok, başka ekrana atar.

## 7. Sade yapı önerisi (yalnız öneri)

Beş ana bölüm; alt çubuk bunları taşır, ortada Ayı İlerlet kalır.

| Bölüm | Altına girenler | Birleşen / kalkan |
|---|---|---|
| 1. Hayat (ana sayfa) | Olay, karar, gündem, ölüm ve vâris akışı (`nesil`, `ocak`) | `gorevler` kalkar; içeriği zaten gündemde. |
| 2. Ben | `karakter`, `beceriler`, `mektep`, `meslek` | `sosyal` Karakter'e sekme olur. Emek paneli "Çalış" adını alır; `/oyun/emek` "Lisanslar" olur. |
| 3. İnsanlar | `iliskiler`, `mahalle`, `npc`, `copcatan`, `hanedan`, `diplomasi` | Karakter'in Ocak sekmesi ve Hanedan'ın Soy sekmesi tek "Ocak & Soy" olur. |
| 4. Diyar | `sehir` (kapı), `pazar`, `atolye`, `mulkler`, `orgutler`, `savas`, `suc`, `harita`, `diyar/name`, `haberler` | `menu`nün Şehir ve Güç grupları `sehir` ile birleşir; tek mekân listesi kalır. |
| 5. Defter | `tarih`, `roman`, `hikayeler`, `kronik`, `basarimlar`, `divan`, `ayarlar`, `sss` | `tarih` "Günlük", `kronik` "Hanedan Defteri" adını alır; `roman` Günlük'ün sekmesi olur. `divan` buraya bağlanır. |

Çok oyunculu için:
- Tek giriş: girişteki "Çok Oyuncu" düğmesi yeni `/online`'a bağlanır.
- `cok-oyunculu/*` (5 ekran) kalkar; yeni çevrimiçi hazır olana dek düğme "Yakında" kalır.
- Çevrimiçi de aynı beş bölümü kullanır (Yaşam, Karakter+Meslek, Tanıdıklar+Mahalle+Hanedan, Yerleşim+İşler+Lonca+Han, Kronik+Gelen), böylece oyuncu iki ayrı oyun öğrenmez.

Sonuç: tek oyunculuda 35 ekrandan `gorevler`, `sosyal`, `menu` ve `roman` ayrı ekran olmaktan çıkar (31); çok oyunculuda 27 ekrandan 5'i kalkar (22).
