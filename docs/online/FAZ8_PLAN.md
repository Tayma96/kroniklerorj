# Faz 8 — Kurum ve siyaset: uygulama planı

Kaynak: `docs/online/OYNANIS_TASARIMI.md` §3 (16+ makam), §7 (lonca kınaması, kadı), §9 (Kurumlar: "makam
boşsa NPC tutar"), §10, §11 (Faz 8), §13.3 (bey divanına itiraz), §13.5–13.7. Faz 2'nin `YerlesimDO`'su ve
`ayDonumu` üzerine kurulur. Kurallar aynı: tek oyunculuya dokunulmaz, dağıtım elle.

## Amaç
Oyuncu makama seçimle ya da atamayla gelir, yazılı yetki listesiyle sınırlı karar verir, dönem sonunda
yeniden sınanır; yokken vekili ya da NPC naib işi sürdürür. Makamlar: köy kethüdası, kasabada lonca kethüdası
ve kadı, şehirde ağa. Subaşı, bey ve divan NPC kalır. Kabul: **makam boşken kasaba kilitlenmez.**

## Mimari
Makam durumu yerleşimin parçasıdır: `YerlesimDO` onu öteki eylemler gibi sırayla işler (§13.8). Seçim takvimi,
vekil devri ve boş makamın NPC'ye geçmesi yalnız `ayDonumu` içinde, ay sayacına bağlı ve idempotent çalışır.
Makamın "olağan işleri" sahibinin girişine hiç bağlı değildir. Oyuncu yalnız sınırları belli bir yetki
listesinden seçer; seçmezse önceki ayar sürer.

## Genel kısıtlar
- **Tek oyunculu** (`mobile/lib/game*`, `store`, kayıtlar) değişmez. Yeni kod `online-server/` ve
  `mobile/lib/online/`, `mobile/app/online/` altındadır; `../game`, `../store`, `../mp` içe aktarılmaz.
- **Eski diyar protokolü:** `mobile/lib/mp/protocol.ts` ↔ `server/src/protocol.ts` bayt bayt aynı kalır
  (`cmp` sessiz). Oradaki `GuildState`, `ThroneState`, `reisVotes` yalnız örnektir; tip alınmaz, dosyalara
  dokunulmaz. Değişmesi gerekirse iki kopya aynı commit'te değişir.
- **Yeni protokol:** `online-server/src/tipler.ts` ↔ `mobile/lib/online/protokol.ts` aynı biçimde kalır.
  Bütün yeni alanlar opsiyoneldir. `makamlar` yoksa istemci kartı gizler. `kurum` alanı olmayan eski kasaba
  kaydı ilk ay dönümünde NPC tutucularla kurulur.
- **Metin:** sunucu `{k, p}` anahtarı gönderir, istemci çevirir. 6 dil tr/en/es/pt/ar/ru. AR ve RU metinleri
  cinsiyet nötrdür (makam adı + ad; fiil çekimi oyuncu cinsiyetine dayanmaz).
- **Ücret yok:** makam ya da oy için ödeme yok; ek DO alarmı açılmaz, iş ay dönümüne biner.
- **Kötüye kullanıma sınır:** kapalı yetki listesi, oran bandı ve ayda en çok 1 kademe, kendine ve hanesine
  karar yok, kişi başı mevsimde 2 olumsuz karar (§13.5), ardışık en çok 2 dönem, %40 dilekçeyle azil, sicil.

## Dosya yapısı
```
online-server/src/kurum/
  makam.ts     makam ve yetki tanımları (saf veri + şart denetimi)
  kurum.ts     makam durumu, NPC tutucu, vekil zinciri, ay dönümü adımı
  secim.ts     aday, oy, NPC oyu, sayım, atama (kadı)
  yetki.ts     yetki kullanımı, sınırlar, sicil, itiraz, azil dilekçesi
online-server/src/yerlesim/donum.ts      kurumAyi() çağrısı (tek satır kanca)
online-server/src/yerlesim/tipler.ts     Kasaba.kurum? (yeni opsiyonel alan)
online-server/src/tipler.ts + mobile/lib/online/protokol.ts  MakamOzeti, yeni hata kodları
online-server/src/index.ts, yerlesim-do.ts  GET/POST /v1/makam
online-server/test/makam|secim|vekil|yetki|kurum-sim.test.ts
mobile/app/online/makam.tsx, mobile/lib/online/makam-metin.ts (6 dil)
```

## Görevler

### 8a. Makam ve yetki tanımları — `kurum/makam.ts`
- `type MakamTuru = "koyKethudasi" | "loncaKethudasi" | "kadi" | "aga"`;
  `type Yol = "secim" | "atama"`.
- `MAKAMLAR: Record<MakamTuru, { yerlesim: YerlesimTuru[]; yol: Yol; donemAy: number; enAzYas: number;
  yetkiler: Yetki[] }>`.
- `type Yetki` (kapalı liste):
  - köy kethüdası: `imece`, `sikayetIlet`;
  - lonca kethüdası: `ciraklikOnayi`, `kinama`, `narh`* , `aidat`*;
  - kadı: `davaKarari`*, `men`*;
  - ağa: `kamuIsiSirasi`, `vergi`*, `itirazIlet`;
  - ortak: `vekilAta`, `cekil`.
  - `*` işaretliler Faz 5/6 modülüne bağlıdır: modül yoksa yetki listede "henüz yok" diye görünür.
- `adayUygunMu(kar, tur, ay): HataKodu | null`: yaş, öğrenme dönemi, ardışık dönem ve men denetimi.
- Test: `cd online-server && node --test test/makam.test.ts`. Beklenen: her yerleşim türünde doğru makamlar;
  15 yaş ve öğrenme dönemindeki aday reddedilir; `# fail 0`.

### 8b. Makam durumu ve boş makam — `kurum/kurum.ts`
- `interface MakamKaydi { t: MakamTuru; s: string | null; v: string | null; ds: number; dn: number;
  as: "olagan" | "aday" | "oy"; ay: Record<string, number>; sc: SicilSatiri[] }`. Kimlikler "n12" (NPC) ya da
  sakin kimliğidir. `ay` = yetki ayarları.
- `kurumKur(kasaba): MakamKaydi[]`: eksik makamları deterministik NPC tutucuyla doldurur (tohumlu; meslek, nam,
  yaş). Eski kayıt göçü budur.
- `kurumAyi(kasaba, ay): OlayTaslagi[]`, `ayDonumu`nun sonunda çağrılır:
  - sahip öldüyse ya da yerleşimden gittiyse vekil devralır, vekil yoksa NPC tutar;
  - sahip 7 gün girmediyse vekil etkin olur; 30 gün girmediyse makam düşer, dönem sonuna kadar NPC tutar;
  - olağan işler sahibe bakmadan önceki ayarla işler;
  - seçim takvimi `secim.ts`ye iletilir.
- `etkinKisi(m): string` sahip, vekil ve NPC sırasıyla her zaman bir kişi döndürür; asla `null` dönmez.
- Test: `node --test test/kurum.test.ts`. Beklenen: `kurum` alanı olmayan kasaba kurulur; aynı ay iki kez
  işlenince sonuç değişmez; sahip ölünce, inzivaya çekilince ve yerleşimden gidince `etkinKisi` boş kalmaz.

### 8c. Seçim ve atama — `kurum/secim.ts`
- `adayOl(m, sakin, ay)`, `oyVer(m, secmen, aday, ay)` (son ana kadar değişir, karakter başına tek oy),
  `say(kasaba, m, ay): { kazanan: string; dokum: OyDokumu }`, `ata(kasaba, m, ay)` (kadı, liyakat sırası).
- Seçmen tabanı:
  - köy kethüdası: hane reisleri;
  - lonca kethüdası: 16+ zanaat ve ticaret çalışanları;
  - ağa: nam eşiğini geçen şehir ileri gelenleri.
- NPC oyu: her uygun NPC, `gorus.ts` görüşü en yüksek adaya (NPC adayda bağ puanına) oy verir. NPC oylarının
  toplamı oyların `[PARAMETRE] %50`sine ölçeklenir. Oyuncu oy vermese de sayım yapılır, eşik aranmaz.
- Eşitlikte önce nam toplamı, sonra tohumlu zar karar verir. Aday yoksa NPC aday çıkar.
- Oy veremeyenler:
  - 30 gün girmeyen oyuncu (§13.6);
  - öğrenme dönemindeki yeni karakter;
  - aday dönemindeki hediyenin alıcısı. Bu hediye oya etki etmez ve "seçim hediyesi" olarak sicile düşer.
- Test: `node --test test/secim.test.ts`. Beklenen: hiç oyuncu oyu yokken NPC kazanan çıkar; 3 oyuncu oyu aynı
  adaya gidince sayım ölçeklemeye uyar; çift oy tek sayılır; eşitlik iki çalıştırmada aynı sonuçlanır.

### 8d. Yetki kullanımı ve sınırlar — `kurum/yetki.ts`
- `yetkiKullan(kasaba, kisi, m, yetki, arg, ay): Sonuc<OlayTaslagi[]>`. Denetim sırası:
  1. etkin kişi mi;
  2. yetki listede mi (vekilse daraltılmış listede mi);
  3. bant ve kademe;
  4. kendi ve hanesi;
  5. kişi başı mevsim sayacı;
  6. sicil.
- `kinama`: hedefe görüş kalemi ve kamu olayı yazar (§7, basamak 2). Gerekçe olayı zorunludur.
- `davaKarari` (Faz 6 varsa): kanıt eşiği aşılmadan mahkûmiyet seçilemez. Kadı yalnız ceza bandının içinden
  seçer. Kadı 2 ay karar vermezse NPC naib varsayılan kararı verir.
- `itiraz(kisi, satir)`: karar başına bir kez, NPC bey divanına gider (§13.3).
  `azilDilekcesi(secmen, m)`: imzalar %40'ı geçerse NPC divanı azleder, ara dönemi NPC tutar.
- Test: `node --test test/yetki.test.ts`. Beklenen:
  - vergi tek ayda 2 kademe artırılamaz;
  - kethüda kendi hanesini kınayamaz;
  - aynı kişiye mevsimde 3. olumsuz karar `sinir_asildi` döner;
  - vekil `vergi` kullanamaz;
  - %40 dilekçe azille sonuçlanır.

### 8e. Protokol ve uçlar
- `tipler.ts` ve `protokol.ts`'e aynı biçimde eklenir:
  - `MakamOzeti { tur, sahip?: KisiRef, vekil?: KisiRef, npc: boolean, donemSonu, asama, yetkiler:
    { y: Yetki; acik: boolean; sinir: {k, p} }[], benim?: { aday: boolean; oy?: string } }`;
  - `GET /v1/yerlesim` yanıtına opsiyonel `makamlar?: MakamOzeti[]`;
  - yeni hata kodları `yetki_yok makam_yok secim_kapali sinir_asildi cekilme_gerekli` iki listeye birden.
- Uçlar (`istekNo` ile tekrar güvenli):
  - `GET /v1/makam`;
  - `POST /v1/makam {islem: "aday"|"oy"|"yetki"|"vekil"|"cekil"|"itiraz"|"dilekce", makam, ...}`.
  - `index.ts` yeni case ekler, `yerlesim-do.ts` yeni `YerlesimIleti` türünü işler.
- Test: `node --test test/yerlesim-uclar.test.ts` (genişletilir), `npm run typecheck`. Beklenen: `# fail 0`,
  tsc temiz. Ayrıca `cmp server/src/protocol.ts mobile/lib/mp/protocol.ts` sessiz ve
  `git diff --stat -- server mobile/lib/mp` boş.

### 8f. İstemci — `mobile/app/online/makam.tsx`
- Makam kartları, aday/oy düğmeleri, yetki paneli ("ne değişir, sınırı ne, kim görür", §10), vekil, sicil, itiraz.
- `makam-metin.ts`: bütün anahtarlar 6 dilde; AR/RU nötr. Eksik anahtar denetimi yapılır.
- Dönüş Kartı'na seçim ilanı, makam kararı ve vekil devri maddeleri eklenir.
- Test: `cd mobile && npx tsc --noEmit -p .`; 320/390 px sahte veriyle önizleme; `rg "lib/(game|store|mp)"
  mobile/app/online mobile/lib/online` boş. Beklenen: tip hatası yok, 6 dilde eksik anahtar 0.

### 8g. Simülasyon ve inceleme — `test/kurum-sim.test.ts`
- Senaryo A: hiçbir oyuncu girmeden 3 oyun yılı (36 ay). Her ay her makamın `etkinKisi`'si dolu, seçimler
  takvimde yapılır, olağan işler işler, dava kuyruğu (varsa) büyümez.
- Senaryo B: oyuncu kethüda seçilir, sonra 30 gün kaybolur. Vekil devralır, makam düşer, NPC dönemi bitirir.
  Hiçbir ay dönümü hata vermez.
- Senaryo C: 5 oyuncu çetesi aynı adaya oy verir ve tacizi dener. Sınırlar tutar, NPC ağırlığı tek başına
  sonucu kilitlemez.
- Güvenlik incelemesi: başkası adına oy, vekil olmadan yetki, `istekNo` tekrarı, kendine karar.
- Test: `node --test test/kurum-sim.test.ts` ve `npm test`. Beklenen: `# fail 0`.

## Kabul ölçütü
1. Senaryo A ve B'de 36 ay boyunca hiçbir makam "boş ve bekliyor" durumunda kalmaz. Kasaba ay dönümü,
   olağan işler ve seçim takvimi tek bir oyuncunun girişine bağlı değildir.
2. Oyuncu gerçek bir seçimi kazanıp yetki kullanabilir. Vekili 7 gün sonra devralır.
3. Yetkiler bant ve sayaç dışına çıkamaz; her karar sicilde görünür, itiraz edilebilir.
4. Eski diyar protokolü bayt bayt aynıdır, tek oyunculu değişmemiştir, `npm test` ve tsc temizdir.

## Bağımlılıklar
- **Faz 1 (kodda var):** hesap, oturum, profil, `istekNo` tekrar güvenliği, `HATA_DURUMU` listesi.
- **Faz 2 (kodda var):** `YerlesimDO`, `ayDonumu`, `gorus.ts` (NPC oyu), olay defteri, Dönüş Kartı. 7 ve 30
  günlük yokluk için son giriş `HesapKaydi.sonGiris`te; yerleşime aktarılması 8b'nin işidir.
- **Faz 3 (plan var, kod yok; `teklif.ts` ve `sohbet.ts` bulunmuyor):** gelen kutusu (aday daveti, vekillik
  teklifi), meydan ilanı, olağan düzen ("oy vermezsem çekimser kal"). Faz 3 bitmeden 8 başlarsa bildirimler
  yalnız Dönüş Kartı'na düşer; vekillik teklifi bekletilmez, vekil reddedebilir.
- **Faz 5/6/7 (bayraklı):** hazine ve fiyat (`vergi`, `narh`, `aidat`), dava ve kanıt (`davaKarari`, `men`),
  ölüm ve vâris (makam boşalması). Modül yoksa yetki kapalı görünür, makam yine işler.

## Riskler
- **Bağımlı modüller eksik:** Faz 3/5/6 kodu yoksa makamlar sığ kalır. Çekirdek (seçim, vekil, NPC tutucu,
  kınama, kamu işi sırası) yalnız Faz 2 üstünde çalışır; öteki yetkiler bayrakla açılır.
- **NPC oy dengesi:** NPC ağırsa seçim anlamsızlaşır, hafifse küçük bir çete kasabayı ele geçirir. Ölçek
  parametresi Senaryo C ve kapalı testle ayarlanır.
- **Makamın taciz aracına dönmesi:** sayaç §13.5 ile ortaktır, çekilme kuralı, itiraz ve azil vardır.
- **Protokol kayması:** `tipler.ts` ↔ `protokol.ts` elle eşlenir; hata kodu listelerini karşılaştıran test.
- **Ad karışması:** eski `server/` Meclis Reisi ve lonca liderliği yeni makamlarla karışabilir; yeni kod
  `../mp` ve `server/` içe aktarmaz (`rg` ile denetlenir).

## Açık parametreler
Dönem süreleri (öneri: kethüda ve ağa 12 ay, kadı 24 ay), NPC oy ölçeği, ağa nam eşiği, azil yüzdesi, vergi
bandı ve kademe sayısı `[PARAMETRE]`. Kapalı testte ayarlanır.
