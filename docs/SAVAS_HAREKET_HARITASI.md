# Dövüş hareket haritası: eşyaya göre hareket (3 Kasım 2026)

Berkay: "İtem seçeneklerine göre hareketler farklı olacak (okçu gibi); Mixamo'dan hareket eklerim, sen hizalayıp diz."
Kaynak: `lib/world.ts` `ITEMS` (`wclass`, `twoHanded`, kalkan), `lib/combat.ts` (hamle, savuştur, özel, toparlan;
okçunun açılış atışı), `lib/yuzlesme.ts`. Hat: `scripts/blender/k09_mixamo.py` (aktarım), sonra işleme.

## 1. Sınıf → hareket seti

| Hareket seti | Oyundaki eşya | El düzeni | Mixamo kaynağı |
|---|---|---|---|
| **kılıç-kalkan** | kılıç, çelik kılıç, yatağan + kalkan/büyük kalkan | sağ silah, sol kolda kalkan | Sword And Shield Pack (tam) |
| **tek kılıç** | aynı kılıçlar, kalkansız | sağ silah, sol el serbest | Sword And Shield Pack (sol el gardı yumuşatılır) |
| **hançer** | bıçak, hançer (hızlı) | sağ elde kısa ağız | "stabbing", "knife" aramaları |
| **gürz-kalkan** | gürz (ezici, tek el) | kılıç-kalkan gibi; vuruş ağır | Sword And Shield Pack (vuruşlar yavaşlatılır) |
| **iki elli** | savaş baltası (ezici, iki el) | iki el sapta | Great Sword Pack |
| **mızrak** | mızrak (delici, iki el) | iki el sapta, uzun erim | "spear", "thrust" aramaları; yoksa Great Sword Pack'in dürtme vuruşları |
| **okçu** | av yayı (menzilli, iki el) | sol elde yay, sağ elde ok | adında "Longbow" geçen paket |
| **silahsız** | silah yok | yumruk | "punching", "body block", "fist fight" |

Kalkan yalnız tek elli silahla takılır (oyun kuralı); iki elli setlerde kalkan sırtta görünür.

## 2. Her setin klip kalıbı (motorun iç sonucu; oyuncu bunları buton olarak görmez)

**Kural (SAVAS_SINEMATIK_PLAN):** dövüş hikâyelidir. Oyuncu "saldır, vur, geri git, blok" gibi düğmeler görmez; durumu anlatan
hikâyeli seçeneklerden birini seçer (yüzleşmede konuş, saldır, gard al ya da kaç; turlarda rakibin hikâyeli niyetine karşı üç
hikâyeli yol). Motor sonucu hesaplar; sinematik 2–4 saniyede gösterir; altında tek anlatı satırı olur. Aşağıdaki adlar
motorun iç sonuçlarıdır ve klip seçimine yarar. Metin klibe birebir uyar.

**Hikâye anları (haydut pususu örneği):** pusuyu fark etme (dönüş: "turn"), kılıcı çekme ("Withdrawing Sword"), rakibi
kollayıp çember çizme (yan adım: "strafe"), üstüne yürüyüp ilk kesik (kombo, 1. vuruş), kalkanla karşılayıp sendeleme
(blok + darbe), ağır iniş (kombo, son vuruş), yaralanıp diz çökme (darbe), kaçış (koşu: "run"), düşüş (ölüm). Bu yüzden
koşu, yan adım ve dönüş klipleri de kullanılacak.


| Klip | Oyundaki karşılığı | Not |
|---|---|---|
| `gard` | bekleme (döngü) | bütün kliplerin başladığı ve bittiği duruş kapısı |
| `hamle` | Hamle | orta güçte vuruş |
| `ozel` | Özel | ağır, geniş vuruş (savuşturmayı kırar) |
| `savustur` | Savuştur | kalkanla karşılama ya da silahla savuşturma; okçuda geri sekme |
| `darbe_hafif`, `darbe_agir` | turu kaybetmek | denk turda hafif, net kayıpta ağır |
| `toparlan` | Toparlan | nefes toplama, duruş düzeltme |
| `olum` | dövüşte ölüm | yere düşüş |
| `zafer` | kazanmak | silahı indirme ya da kınlama |
| `acilis` (yalnız okçu) | açılış atışı | ok çekme, nişan, bırakma |

Başarı, kısmi ve başarısız sonuç, oyuncunun klibiyle rakibin tepki klibinin birleşmesinden kurulur. Her sette en
az 9 klip (okçuda 10) olur.

## 3. Hizalama kuralları (benim tarafım, `k09_mixamo.py` genişletmesi)

- **Duruş kapısı:** her setin `gard` klibinin ilk karesi o setin kapısıdır. Her klip kapıdan başlar ve kapıya döner
  (6–8 karelik geçiş). Böylece klipler kesintisiz art arda dizilir.
- **Yer:** kök (kalça) her klipte aynı işaretten başlar. İleri atılan vuruşlar en çok yarım adım kayar ve geri döner.
  Sıçramalı ve dönen vuruşlar ağır zırhlı piyade için alınmaz.
- **Yön ve boy:** kaynak kalça ekseni hedefe çevrilir. Kalça yüksekliği bacak boyu oranıyla ölçeklenir.
- **Ayak teması:** `denetim.py` ile ayak kayması ve yere gömülme ölçülür. Eşik aşılırsa ayak hedefi (IK) sabitlenir.
- **Tutuş:** kılıç, gürz ve hançer `hand_r`; kalkan `lowerarm_l`; yay `hand_l` ve ok `hand_r`. İki elli silahta sağ
  el tutar, sol el sapa IK ile oturtulur.
- **Hız:** 30 kare/sn kaynak; işleme 24 (bekleme) ya da 48 (vuruş, yavaşlatma payı).
- **Adlandırma:** `<set>.<klip>` (ör. `okcu.acilis`, `kilic_kalkan.ozel`); oyunda silah sınıfı ve kalkan durumu bu
  adı seçer.

## 4. Berkay'ın indireceği hareketler

Ayarlar: Format **FBX Binary**, Skin **Without Skin**, Frames per Second **30**, Keyframe Reduction **none**. Seçenek
çıkarsa **In Place** işaretlenir. Adlar hatırladığım kadarıyla verildi; tutmazsa arama kelimesi yeter. Her dosya
gelince açılıp kontrol edilir; uygun olmayan elenir.

1. **Okçu:** adında "Longbow" geçen paket (ok çekme, nişan, bırakma, yaylı bekleme, darbe ve ölüm içerir).
2. **Kılıç-kalkan:** "Sword And Shield Pack" (Lite olmayan tam paket); en azından "sword and shield impact" ve
   "sword and shield slash" aramaları.
3. **İki elli (balta):** "Great Sword Pack".
4. **Mızrak:** "spear" ve "thrust" aramalarında çıkanlar.
5. **Hançer:** "stabbing" ve "knife" aramaları.
6. **Silahsız:** "punching", "body block", "head hit", "stomach hit".

## 4b. Gelenler (3 Kasım; tam tablo `scripts/blender/hareket_seti.json`)

| Set | Hazır | Kesilecek | Eksik |
|---|---|---|---|
| kılıç-kalkan | gard, kalkan gardı, 2 savuştur, ölüm, kılıç çekme (kına hizalı) | hamle, özel, kınlama | darbe hafif/ağır, toparlan, zafer |
| tek kılıç | gard (kılıç-kalkandan) | "One Hand Sword Combo"dan 2 hamle + 1 özel | savuştur, darbe, toparlan, zafer |
| okçu | ok çekme, tam atış, tepme, ölüm | — | gard (yaylı bekleme), yakın hamle, savuştur (sıçrama), darbe, toparlan, zafer; yay/ok/sadak modelleri |
| iki elli | ölüm | — | gard, hamle, özel, savuştur, darbe, toparlan, zafer |
| mızrak, hançer, silahsız | — | — | hepsi |

Elenenler: sıçramalı ve dönen kılıç-kalkan saldırıları, 16 karelik aceleci kılıç çekme, diz üstü kayan büyük kılıç saldırısı.
Okçu kliplerinin ikisi de oku omuz üstünden sırttaki sadaktan alıyor; sadak sırtta olacak (tarihte Türk okçusunun sadağı sağ
kalçadaydı; kalça sadağı için oradan çeken bir hareket gerekir).

## 4c. Her klibin geçtiği iyileştirmeler (Mixamo olduğu gibi kullanılmaz)

Hareket:
1. **Görüş:** gardda kalkanın üst kenarı göz hizasının en az 5 cm altında; darbe gelirken ve savuşturmada kalkar
   (`k12_kalkan.py`; ilk uygulamada kenar 22 cm yüksekti, gard karelerinde hedefe indi).
2. **Bakış:** baş ve gözler rakibe kilitli; Mixamo'da baş boşluğa bakıyor.
3. **Ayak teması:** basan ayak kaymaz, yere gömülmez ya da havada kalmaz (IK kilidi, `denetim.py` ölçüsü).
4. **Ağırlık ve zamanlama:** silah ağırlığına göre hazırlık, vuruş ve toparlanma oranı; vuruş anında 2–3 karelik
   darbe duraklaması; zırhlı piyadede sıçrama yok.
5. **Duruş:** oyun tarzı kambur ve aşırı açık bacak duruşu daraltılır; tarihî piyade daha dik durur, kalkan önde.
6. **Tutuş:** parmaklar bizim kabzayı sarar; iki elli sapta sol el sapa oturur; kılıç kında, yay ve ok elde doğru yerde.
7. **İkincil hareket:** entari ve etek kumaşı, lamel zırh, kın ve askıların sallanması, nefes.
8. **Tekrar kırma:** aynı klip her seferinde birebir aynı görünmesin (küçük zamanlama ve açı farkları).

Görüntü (asıl çekimde; dokular CC0, yapay zekâ yok):
1. **Cilt:** "plastik" görünüm biter: gözenek normal haritası, pürüz haritası, yüzey altı saçılma ayarı, güneş ve toz izi.
2. **Kumaş:** dokuma dokusu, yıpranma, toz, kök boya kırmızısı ve çivit gibi dönem renkleri.
3. **Deri ve metal:** çizik, pas, yağ izi; lamel zırhta deri bağların aşınması.
4. **Kalkan ve yay:** ahşap gövde, deri kaplama, demir kabara, boyalı motif; boynuz ve sinir katmanlı Türk yayı.
5. **Işık:** HDRI, gün batımı tonu, havada toz, alan derinliği ve hafif hareket bulanıklığı.

## 5. Sıra

1. Gelen dosyalar sete göre ayrılır ve 3. bölümdeki kalıba hizalanır. Her set için gri önizleme paftası çıkarılır.
2. Silah ve kalkan modelleri eklenir (yuvarlak kalkan, yay ve ok, mızrak, balta, gürz, hançer).
3. Asıl işleme: dokulu, kumaşlı çekim. Önce kılıç-kalkan ve okçu, sonra öbürleri.
4. Rakip tarafının tepki klipleri (haydut, asker, hayvan) ayrı bir aşamadır.
