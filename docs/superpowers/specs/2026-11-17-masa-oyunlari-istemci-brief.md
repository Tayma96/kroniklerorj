# Han masa oyunları — istemci brief'i (17 Kasım 2026)

Sunucu: `online-server/src/han/oyun/` (çatı `cati.ts`, oyunlar `canak.ts` ve `dokuztas.ts`, vitrin `vitrin.ts`).
Oyunlar eğlence ve sohbet içindir: **bahis yok, ödül yok, kayıp yok, hamle zamanlayıcısı yok.** Kazanan yalnız masada
sonuç satırıyla anılır (akçe, nam, XP, teveccüh yok).

## 1. Uçlar

- Mevcut masa soketi (`GET /v1/han/masa/:no/baglan?han=N`) üzerinden yürür; yeni HTTP ucu yalnız vitrin:
- `GET /v1/han/masalar` → `{ masalar: [{ han, masa, oyun, asama, oyuncu, enCok, bos, seyirci, katilabilir }] }`
  Oyuncunun yerleşimindeki bütün hanlarda oyuncu bekleyen (`asama:"bekleme"`) ve süren (`"oyun"`) masalar; önce
  katılınabilir olanlar. Katılmak/izlemek için `han` + `masa` ile mevcut bağlan ucuna gidilir. Gizli veri yoktur.

## 2. Soket iletileri

İstemci → sunucu (hepsi masaya bağlıyken):

| ileti | kim | not |
|---|---|---|
| `{t:"oyunAc", oyun:"canak"\|"dokuztas"}` | oturan | açan kurucu ve ilk oyuncu olur |
| `{t:"oyunKatil"}` | oturan | yalnız beklemede; tekrar etkisiz |
| `{t:"oyunAyril"}` | oyuncu | beklemede listeden çıkar; oyunda çekilir (cezasız) |
| `{t:"oyunBaslat"}` | kurucu | en az `enAz` oyuncuyla |
| `{t:"hamle", n, hamle}` | sırası gelen | `n` = son görülen `oyun.n` |
| `{t:"oyunPas", n}` | başka oyuncu | yalnız `oyun.pasAcik` iken (sıradaki uzun süredir yok) |
| `{t:"oyunDagit"}` | oyuncu | oyunda dağıtma oyu; beklemede kurucu oyunu kaldırır |
| `{t:"oyunKapat"}` | oturan | biten oyunun sonucunu masadan kaldırır |

Sunucu → istemci: `{t:"oyun", oyun: OyunGorunumu | null}` (her değişimde, **kişiye özel**); `hosgeldin.oyun` da aynı
görünümü taşır (yeniden bağlanınca durum ve kendi zarın yeniden gelir). Hata: mevcut `{t:"hata", hata, istek}`.

`OyunGorunumu`: `id, tur, asama ("bekleme"|"oyun"|"bitti"), kurucu, enAz, enCok, oyuncular[{hesap, ad, yok?, cekildi?}],
n, sira (hesap|null), taahhut?, durum? (açık oyun durumu), ben? (yalnız sana: gizli bilgin), dagit[] (oy verenler),
pasAcik, sabir (ms), sonuc? {tur:"kazandi"|"berabere"|"dagildi", kazanan[]}`, bitince ayrıca `tohum, kayit, kesik?`.

- **Tekrar güvenliği:** hamleyi aynı `n` ile yeniden göndermek güvenlidir; ikinci gönderim uygulanmaz, sana güncel
  görünüm gelir. Düğmeyi yanıt gelene dek kilitle; bağlantı koptuysa yeniden bağlanıp `hosgeldin.oyun.n`'ye bak.
- **Kopma:** `oyuncular[].yok` = ayrılış anı. `sabir` (3 dk) dolunca diğerlerine "Sırasını geç" (`pasAcik`) ve
  "Oyunu dağıt" düğmeleri anlamlı olur. Bu bir hamle süresi değildir; masada olan istediği kadar düşünür.
- **Denetim:** başta `taahhut` = SHA-256(tohum) gösterilir; bitince `tohum` ve `kayit` açılır. İsteğe bağlı "Zarlar
  hileli mi? Doğrula" bağlantısı: SHA-256(tohum) === taahhut.

Hata kodları: `oturmuyor, masa_mesgul (sahne/atışma varken ya da tersi), oyun_turu_gecersiz, oyun_var, oyun_yok,
oyun_dolu, oyun_basladi, oyuncu_az, oyuncu_degil, yetki_yok, sira_degil, hamle_gecersiz, hamle_no (eski görünüm:
yenile), pas_yok, gecersiz_istek, hiz_siniri`.

## 3. Çanak Zarı (2–4 kişi) — oyuncuya anlatım

> Her elde çanağına üç zar atılır; zarlarını yalnız sen görürsün. Sıran gelince ya çanağı **tut**, ya da istediğin
> zarları (1–3) **yenile**. Kimin kaç zar yenilediğini herkes görür, ne geldiğini görmez. Herkes karar verince
> çanaklar açılır: en iyi el o eli alır; en iyi eller eşitse el kimseye yazılmaz. **Önce 3 el alan kazanır.** 9 el
> oynanırsa en çok el alan kazanır; eşitse berabere.
> El sırası: **üçlü** (üç zar aynı) > **sıralı** (ardışık üç zar, ör. 3-4-5) > **çift** > **tek**. Aynı türde büyük
> zar üstündür.

- Hamle: `{tut:true}` ya da `{yenile:[0,2]}` (zar dizinleri 0..2, tekrarsız).
- `durum`: `el, elEnCok, hedef, acan, kazanc[], cikti[], yeniledi[] (null: karar vermedi, 0: tuttu, k: k zar),
  gecmis[{el, zarlar[][]|null, turler[], alan|null}]`. `ben`: `{zarlarim:[a,b,c], elim:"uclu"|...}`.
- Ekran önerisi: ortada oyuncu başına kapalı çanak (yenilenen sayı rozeti); altta kendi üç zarın, dokununca seçilir,
  "Tut" / "Seçilenleri yenile"; el açılınca çanakların kalkma anı ve el sonuç şeridi; üstte el sayacı ve skor.
  Çekilen 2+ kişilik oyunda oyun sürer; bir kişi kalırsa sonuçsuz dağılır.

## 4. Dokuz Taş (2 kişi) — oyuncuya anlatım

> İç içe üç kare, 24 nokta. Ak başlar. Önce sırayla elindeki 9 taşı boş noktalara koyarsın; sonra taşını çizgi
> boyunca komşu boş noktaya sürersin. Üç taşını bir çizgide dizersen (**üçleme**) rakibin bir taşını alırsın;
> üçlemedeki taş, rakibin bütün taşları üçlemedeyse alınabilir. Tahtada 3 taşın kalınca taşını istediğin boş noktaya
> **uçurabilirsin**. Taşı 3'ün altına düşen ya da oynayacak hamlesi kalmayan kaybeder. Taş alınmadan 50 hamle geçerse
> berabere.

- Nokta numarası: `kare*8 + k`; kare 0 dış, 1 orta, 2 iç; k sol üst köşeden saat yönünde (0 köşe, 1 üst orta,
  2 sağ üst, 3 sağ orta, 4 sağ alt, 5 alt orta, 6 sol alt, 7 sol orta). Kenar ortaları (tek k) bir içteki/dıştakine bağlı.
- Hamle: koyma `{koy:p}`, sürme/uçma `{kaynak:a, hedef:b}`; üçleme kuruluyorsa aynı iletiye `al:q` eklenir (alma
  zorunlu; istemci önce hedefi seçtirir, üçleme olacaksa alınacak taşı sorar, sonra tek ileti yollar).
- `durum`: `tahta[24] (-1 boş, 0 ak, 1 kara), el[2], taslar[2], ucma[2], sessiz, sessizEnCok, son{kim, kaynak?, hedef, al?}`.
  Gizli bilgi yok (`ben` gelmez). Oyuncu dizini `oyuncular` sırasıdır (0 ak).
- Pas yoktur: kopan rakip beklenir; `sabir` dolunca kalan oyuncu oyunu dağıtabilir. Çekilme oyunu sonuçsuz dağıtır.

## 5. Önerilen ekranlar

1. **Han → "Canlı masalar"** sekmesi/kartı: vitrin listesi; satırda han adı (han kartlarından), masa no, oyun adı,
   `oyuncu/enCok`, seyirci; "Katıl" (bekleme + boş yer: bağlan → otur → `oyunKatil`) ve "İzle" (bağlan, ayakta).
2. **Masa ekranında oyun paneli**: masa sohbeti sürerken üstte açılır. Bekleme: oyuncu listesi, "Katıl/Ayrıl",
   kurucuya "Başlat". Oyun: tahta/çanaklar, sıra göstergesi ("Sıra sende" / "X düşünüyor" — süre sayacı YOK), kopan
   oyuncuda "masadan ayrıldı" ve sabır dolunca "Sırasını geç"/"Oyunu dağıt". Bitti: sonuç satırı, "Yeni oyun", "Kaldır".
3. Oyun açma menüsü: masa eylem çubuğunda "Masa oyunu" → iki oyunun kısa kuralıyla seçim.

Metinler önce Türkçe; 6 dil çevirisi tester'da.
