# Faz 4 — Üçgen: uygulama planı

Kaynak: `docs/online/OYNANIS_TASARIMI.md` §6 (6.0–6.3) ve §11 (Faz 4 satırı). Faz 2'nin `YerlesimDO`'su ve
`online-server/src/yerlesim/` motoru, Faz 3'ün teklif/ilişki/söylenti katmanı üzerine kurulur.

## Amaç
Oyuncular birbirine NPC'ler üzerinden dokunur: kışkırtma, arabuluculuk, şahitlik, casus. Kural tek:
**NPC'nin bakışı, duyduklarından ve dostlarının bakışından da etkilenir.** Yeni puan yok; her etki görüş
dökümünde kalem, şans da kalem kalem görünür.

## Mimari
Üçgen eylemleri `YerlesimDO` içinde sırayla işlenen saf fonksiyonlardır (`kasaba`, `ay`, tohum → sonuç +
`OlayTaslagi[]`). Rastgelelik `tohumlu(yerlesim, ay, fail, npc, tür)` iledir, aynı istek aynı sonucu verir.
Kalıcı durum: `Iliski`'ye opsiyonel alanlar ve depoda yeni `soz` anahtarı. Ay dönümü (`donum.ts`) söz
bitişini, casus raporunu ve duyum sönmesini işler.

## Genel kısıtlar
- Tek oyunculuya dokunulmaz (`mobile/lib/game*`, `app/oyun/**`, kayıt biçimi).
- Eski çok oyunculu katman değişmez. `mobile/lib/mp/protocol.ts` ↔ `server/src/protocol.ts` bayt eşliği
  korunur (`cmp` temiz). Oradaki `turnNpc`/`mediateNpc`/`spy` kullanılmaz ve değiştirilmez.
- Yeni protokol biçimleri `online-server/src/tipler.ts` ve `mobile/lib/online/protokol.ts`'e **aynı
  committe** eklenir. Yeni alanların hepsi opsiyonel olur, eski kayıt ve eski istemci bozulmaz.
- Oyuncu metni 6 dilde yazılır: tr/en/es/pt/ar/ru (`mobile/lib/i18n-sayfa/online.ts`). AR ve RU metinleri
  cinsiyet nötr olur (fiil/sıfat cinsi kişiye göre çekilmez, "kişi/taraf" yapısı kullanılır).
- Gerçek para yoktur. Bedeller oyun içi akçe (`Karakter.pa`), nam, takat ya da söz olarak ödenir.
- Farm ve P2W yoktur. Aynı (fail, NPC, eylem türü) için `AZALAN_PENCERE` içinde azalan getiri işler. Kalem
  tavanları sabittir. Akçe şansı en çok +15 artırır, sonucu satın almaz.
- Yaş kapısı 12+ geçerlidir, ittifak sözü ve casus 16+ ister. Hedef çevrimdışıysa yalnız olay ve kalem
  doğar; oyuncu beklenmez ve kimse ceza almaz.

## Dosya yapısı
```
online-server/src/yerlesim/
  ucgen/tipler.ts      UcgenGirdisi, Soz, Duyum, Baris, UcgenSonucu
  ucgen/kiskirt.ts     §6.1 şans dökümü ve sonuç
  ucgen/arabulucu.ts   §6.2 şans dökümü, 4 sonuç, ikili oyun
  ucgen/soz.ts         ittifak sözü: kur, katılım, bitiş, bozma
  ucgen/haber.ts       haber verme, kaynaklı bilgi
  ucgen/sahit.ts       tanıklık ağırlığı (Faz 6 kadısı da kullanır)
  ucgen/casus.ts       izletme ve ay dönümü raporu
  gorus.ts             (değişir) yeni kalemler
online-server/test/ucgen-*.test.ts, test/senaryo-6-1.test.ts, test/senaryo-6-2.test.ts
mobile/lib/online/protokol.ts, istemci.ts, sahte.ts   (değişir)
mobile/app/online/ — kişi profili eylem paneli, Dönüş Kartı maddeleri (değişir)
```

## Görevler

### 4.1 Görüş kalemleri: dostunun dostu ve duydukları
- Dosyalar: `yerlesim/gorus.ts`, `yerlesim/tipler.ts`, `ucgen/tipler.ts`, `test/gorus.test.ts`.
- Mevcut `dostunDostu()` yalnız NPC dostlarını sayıyor (`Bag` tür 1, `BAG_ESKI_AY`). Ekler:
  - **Düşmanının dostu:** husumet bağlı (tür 2) NPC'lerin sana olumlu bakışının %10'u eksi olarak sayılır.
    Kalem `gorus.dusmaninDostu`.
  - **Oyuncu dostları:** NPC'nin `DOST_ESIGI` üstünde baktığı oyuncunun sana beyanı (Faz 3 `iliski.ts`:
    dost +50, açık husumet −50 `[PARAMETRE]`) %10 ile katılır.
  - Toplam ±10 tavanı (`DOST_DOSTU_TAVANI`) iki kalemin toplamına uygulanır.
  - **Duydukları:** `Iliski.du?: Duyum[]`, `Duyum = [kaynak, yuk, guven 0-100, ay, yalanlandi?]`. Kalem
    `gorus.duyulan` = Σ yuk × guven/100, `ANI_YARI_OMRU` ile söner, ±15 `[PARAMETRE]`. Yalanlanınca sıfır.
- İmza: `gorus(kasaba, npc, kar, ili, ay): Dokum` değişmez. `gorusDegeri` aynı yolu kullanmaya devam eder.
- Test: `npm test`. Beklenen: döküm toplamı = `gorusDegeri`; bağ kalemleri ±10'da kırpılır; yalanlanan
  duyum 0; `du`'suz eski ilişki aynı sonucu verir.

### 4.2 Haber verme ve şahitlik yardımcıları
- Dosyalar: `ucgen/haber.ts`, `ucgen/sahit.ts`, `test/ucgen-haber.test.ts`.
- İmzalar:
  - `haberVer(kasaba, {kaynak, alici, konu, guven, ay}): OlayTaslagi[]`: alıcıya `g`'li olay yazar. Alıcı
    oyuncu değil NPC ise ona bir `Duyum` ekler.
  - `fark(kasaba, mekan, ay, hedef): {kim, guven}[]`: aynı mekândaki (`cizelge.ts`, `Karakter.mk`) hedef
    dostlarını verir. Bunlar NPC (dost bağı) ya da Faz 3 dostu oyuncu olabilir.
  - `tanikAgirligi(kasaba, taraf, ay): Kalem[]`: lehte ve aleyhte tanıkları kalemli verir.
- Test: dost aynı mekândaysa `ucgen.fark` olayı güvenle yazılır, değilse doğmaz; aynı `istekNo` iki kez
  işlenmez.

### 4.3 İttifak sözü
- Dosyalar: `ucgen/soz.ts`, `yerlesim-do.ts` (depo anahtarı `soz`), `donum.ts`, `test/ucgen-soz.test.ts`.
- `Soz = {i, a, b, hedef, bitis, kaynak: "kiskirt"|"teklif"}`. Süre 2 mevsim (6 ay `[PARAMETRE]`).
- Görüş kalemi `gorus.ittifak`: sözlü NPC, ortağının hedefine −15 bakar.
- `katil(kasaba, soz, hamle: "laf"|"boykot", ay)`: NPC failin hamlesine katılır.
  - `laf`: Faz 3 söylenti katmanına yük katar.
  - `boykot`: hedefin o NPC'yle eylem şansı −20 olur.
  - Yalancı tanıklık ve baskına adam verme Faz 6 kancası olarak bırakılır. Fonksiyon imzası hazırdır,
    çağrısı yoktur.
  - Her katılımda NPC için yakalanma zarı atılır. Yakalanırsa NPC'nin namı düşer ve olay hedefe gider.
- `bitir`: süre dolunca söz sessizce düşer. Oyuncu sözü bozarsa nam düşer ve NPC'de `ihanet` anısı kalır.
- Test: söz 6 ay sonra düşer, kalem kaybolur; aynı çiftte ikinci söz süreyi uzatır; ayda tek katılım.

### 4.4 Kışkırtma (§6.1)
- Dosyalar: `ucgen/kiskirt.ts`, `ucgen/tipler.ts`, `yerlesim-do.ts` (ileti `ucgen`), `index.ts`
  (`POST /v1/ucgen`), `test/ucgen-kiskirt.test.ts`.
- Girdi: `{tur:"kiskirt", istekNo, npc, hedef, teklif:{t:"para"|"ortaklik"|"intikamPayi"|"soz", miktar?}}`.
- Şans dökümü (`Dokum`, `SANS_ALT`–`SANS_UST` ile kırpılır):
  - kızgınlık = −min(0, görüş(NPC→hedef))/2;
  - NPC'nin faile görüşü /3;
  - huy: kurnaz, hırslı ve aceleci +15; mert, dindar ve sabırlı −15. `HUYLAR`'da "kinci" yoktur, yeni huy
    eklenmez;
  - failin söz becerisi (`be[1]`) /5;
  - teklif: para (akçe, en çok +15), ortaklık +8, intikam payı +5, söz +3.
- Sonuçlar:
  - `basari`: `soz.ts` ile ittifak sözü kurulur.
  - `ret`: bir şey olmaz.
  - `retHaber`: NPC mert/dindar ise ya da görüşü −30'un üstündeyse (kızgınlık sınırlı) `haberVer` hedefe yazar ("X seni
    kötüledi, teklif verdi"). Failin namı düşer ve plan açığa çıkar.
- Sonuçtan bağımsız olarak `fark()` çalışır: görüşme görüldüyse hedefe kaynaklı bilgi gider.
- Test: aynı tohum aynı sonuç; kızgınlık artınca başarı oranı artar (200 tohum); kendine, oyuncu olmayana
  ve 12 yaş altı kışkırtma `HataKodu` döner.

### 4.5 Arabuluculuk (§6.2)
- Dosyalar: `ucgen/arabulucu.ts`, Faz 3 `teklif.ts`'e `tur:"arabulucu"`, `test/ucgen-arabulucu.test.ts`.
- Akış asenkrondur:
  1. Taraf (Berkay) dost oyuncuya teklif gönderir: `{npc, bedel:{t:"ozur"|"tazminat"|"helallik"|"ortakIs",
     miktar?}}`.
  2. Arabulucu (Hasan) kabul eder ve kendi zamanında `{tur:"arabulucu", istekNo, teklifId}` yapar.
  3. Tazminatın akçesi Faz 3 emanetinde bekler. Ret ya da süre dolumunda iade edilir.
- Kapı: arabulucu ile taraf karşılıklı dosttur. NPC'nin arabulucuya görüşü en az +20'dir `[PARAMETRE]`.
- Şans dökümü:
  - NPC'nin arabulucuya güveni /2;
  - kırgınlığın büyüklüğü;
  - sebep ağırlığı: anı türüne göre; ağır anılar `[PARAMETRE]`, laf hafif;
  - bedel: özür +5, helallik +10, ortak iş +10, tazminat (akçe, en çok +15);
  - `tanikAgirligi`.
- Sonuçlar `Iliski.ab?: Baris` olarak kalır ve `gorus.baris` kalemiyle görünür:
  - `baris`: o anki kırgınlığın yarısı kadar artı. Kalem sabittir, sönmez. Anılar silinmez.
  - `sartli`: şart (Faz 3 borç ya da tazminat) yerine gelince kırgınlık kadar artı.
  - `ateskes`: 4 ay boyunca NPC hasmane katılım yapmaz, kalem 0 olur.
  - `ret`: arabulucunun o NPC'deki ilişkisi −8 olur (`basarisizArabulucu` anısı).
- İkili oyun: arabulucu aynı NPC'yi aynı taraf için 6 ay içinde kışkırtmışsa yakalanma zarı atılır.
  Yakalanırsa iki tarafa da `haberVer` gider.
- Test: dört sonuç da tohumla üretilir; şartlı barış şarta dek 0; barış kalemi 3 yıl sonra aynı; kapı dışı
  istek `HataKodu`.

### 4.6 Casus
- Dosyalar: `ucgen/casus.ts`, `donum.ts`, `test/ucgen-casus.test.ts`.
- Girdi: `{tur:"casus", istekNo, npc, izlenen, ay: 1-3}`. Bedel akçedir (`[PARAMETRE]`, gerçek para yok).
  Aynı anda tek casus tutulur.
- Her ay dönümünde casus, izlenenin o ayki olay defterinden en çok 2 olayı rapor eder.
  - Güvenilirlik = NPC'nin gizlilik becerisi + izlenenle mekân çakışması.
  - Güven 40'ın altındaysa rapor `[PARAMETRE]` olasılıkla çarpık olur (yanlış kişi ya da yanlış mekân) ve
    "güven: düşük" etiketiyle gelir.
- İzlenenin dostu casusu fark ederse `haberVer` izlenene gider ve casusluk biter.
- Test: gizli (`g`'li) olay rapora girmez; yanlış rapor oranı güvenle azalır; ayda tek rapor.

### 4.7 İstemci
- Dosyalar: `mobile/lib/online/protokol.ts`, `istemci.ts` (`ucgen(girdi)`), `sahte.ts`; kişi profili
  ekranı (Faz 2'nin kişi paneli hangi ekrandaysa); Dönüş Kartı; `i18n-sayfa/online.ts`.
- Kişi profili: "Kışkırt", "Arabulucu ol", "İzlet" (kapalıysa gerekçeli), şans dökümü, teklif seçimi, yeni
  kalem etiketleri. Dönüş Kartı: haber verme, fark etme, casus raporu (güvenli), barış sonucu.
- Test: online `npm test` ve `tsc --noEmit` temiz; `cmp` (mp protokolü) temiz; 320/390 px önizlemede 6 dilde
  taşma yok; yeni anahtarlar 6 dilde eksiksiz.

## Kabul ölçütü
- `test/senaryo-6-1.test.ts`: Ahmet, Berkay ve Murat (Murat→Berkay −42) `kasaba-yardimci.ts` ile kurulur.
  - 200 tohumda en az iki farklı sonuç çıkar (`basari`, `ret`/`retHaber`). Murat mert ise `retHaber` oranı
    artar.
  - Başarıda Murat'ın Berkay'a görüşü `gorus.ittifak` ile en az 15 düşer.
  - `retHaber`'de Berkay'ın olay defterinde kaynaklı bilgi bulunur.
- `test/senaryo-6-2.test.ts`: Hasan (Murat→Hasan +35) Berkay'ın dostudur.
  - En az iki farklı sonuç çıkar (`baris`, `sartli`, `ateskes`, `ret`).
  - Barışta Murat'ın Berkay'a görüşü kırgınlığın yarısı kadar iyileşir. Retten sonra Murat→Hasan düşer.
- Elle: `sahte.ts` ile iki senaryo da en az iki sonuçla oynanır.

## Faz 1–3'e bağımlılık
- Faz 1 (mevcut): `istekNo` defteri, oturum, `/v1/*` uçları (`index.ts`, `ic.ts`).
- Faz 2 (mevcut): `gorus.ts` (`dostunDostu`, `Dokum`), `eylem.ts` (şans kırpması, azalan getiri),
  `cizelge.ts`, `donum.ts`, olay defteri, `tohumlu`.
- Faz 3 (**ön koşul, kodda yok**): `iliski.ts` (dost/husumet beyanı), `teklif.ts` (emanet, süre),
  `soylenti.ts` (tanık, yalanlama). 4.1'in oyuncu ayağı, 4.3 `laf` ve 4.5 bunlarsız başlamaz; 4.1 NPC
  kalemleri, 4.2, 4.4 ve 4.6 önce yazılabilir.

## Riskler
- **Taciz aracı:** kışkırtma/casus aynı hedefe yığılabilir. Önlem: hedef başına ayda bir, azalan getiri,
  engellenen hedef alınamaz (Faz 3), hedefe kaynaklı bilgi.
- **Görüş patlaması:** üç yeni kalem üst üste biner. Önlem: kalem tavanları ve `GORUS_SINIRI`; simülasyon
  bir NPC'nin 6 ayda 40'tan fazla oynamadığını gösterir.
- **Asenkron çelişki:** arabuluculuk beklerken görüş değişir. Şans eylem anındaki görüşle hesaplanır.
- **Protokol kayması:** `tipler.ts` ↔ `protokol.ts` elle eşlenir; aynı commit kuralı.
- **Faz 3 gecikmesi (en büyük risk):** §6.2 kabulü Faz 3 bitmeden geçemez; NPC ayaklı görevler önce.

## Açık parametreler `[PARAMETRE]`
Beyan değeri, duyum tavanı, söz süresi, yakalanma oranları, şans katsayıları, ağır anı ağırlığı, casus
bedeli ve yanlış rapor oranı. Kapalı testte ayarlanır.
