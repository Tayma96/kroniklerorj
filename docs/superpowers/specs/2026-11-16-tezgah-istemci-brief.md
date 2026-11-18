# Tezgâh modeli Dilim 1 — istemci brief'i ve sunucu protokolü (16 Kasım 2026)

Durum: sunucu bitti (`85f9c23`, `901a9a9`, `7c6fd3b`; 652 test). İstemci **yarım**, ara kayıt olarak commit'li:
`mobile/lib/online/tezgah-veri.ts`, `tezgah-ui.tsx`, `sahte-tezgah.ts`, `app/online/carsi.tsx`, `isletme/[id].tsx`
(tsc temiz; metinler yalnız Türkçe olabilir, çeviri yapılmadı; inceleme yapılmadı). Kalanı bu belgeyle tamamlanır.
Tasarım: `2026-11-16-tezgah-modeli-design.md` §4–§5.

## Sunucu protokolü (kesin)
- `GET /v1/dukkanlar` → `{dukkanlar:[{isletme,no,ad,sahip:{id,ad},seviye,itibar,kepenk,satir,mallar[],benim,devralinabilir}], yuva:{dukkan:{toplam,dolu},atolye:{toplam,dolu}}, devralmaKepenkAy}` (60 döner; sabit yazma).
- `GET /v1/isletme/:id/tezgah` → herkese `{isletme,tur,ad,sahip,seviye,itibar,kepenk,kepenkAy,gecenAyKepenk?,raf[],rafSiniri:{satir,adet},npcTavanSeviye,devralinabilir,izin:{depoKoy,depoAl,raf,fiyat,satinAl}}`; yetkiliye ek `depo:[{mal,kalite,adet}],depoKapasite,depoDolu,gunSonu,ozet,depoDefteri?:[{ay,kim,mal,kalite,adet}]`.
  - Raf satırı `{satir,mal,kalite,kaliteAdi,adet,fiyat,bant:{alt,ust},npcTavan,adil,yapan?,cekicilik:{F,Q,R,H,a}}`.
  - `gunSonu` `{ay,kepenk,hasilat,vergi:{oran,tutar},net,tavan:{seviye,kullanilan},satirlar:[{satir,mal,kalite,fiyat,satilan,kalan,hasilat,payYuzde,carpanlar:{F,Q,R,H},cekicilik,bMal,npcTavan,neden}]}`; `neden`: `butce|stok|tavan|rakip|seviyeTavani`; `ozet.meslekler[].neden`: `kimseSatmadi|satildi`.
- `GET /v1/isletme/:id/onizle?mal&kalite&fiyat&adet?` → `{onizleme:{mal,kalite,fiyat,adet,bant,npcTavan,butce:{meslek,B,kitlik,malSayisi,bMal},payYuzde,carpanlar,cekicilik,rakipSatir,tahminiAdet,tahminiHasilat,neden,yontem}}`.
- `POST /v1/isletme/:id/depo {yon:"koy"|"al",mal,kalite?,adet≤60,istekNo}`.
- `POST /v1/isletme/:id/raf` — `{islem:"koy",mal,kalite?,adet,fiyat?}` · `{islem:"al",satir,adet}` · `{islem:"fiyat",satir,fiyat}` (hepsi `istekNo`).
- `POST /v1/isletme/:id/satinal {satir,adet,fiyat,istekNo}` (fiyat HER ZAMAN gönderilir; değiştiyse `fiyat_degisti`).
- `POST /v1/isletme/:id/devral {istekNo}` → `{devralma:{isletme,fiyat,eskiSahip,iade:{bedel,mal,kasa},ts}}`.
- Han: `GET /v1/han` `hanlar[]` ve han panelinde sahip/çalışana `yolcu:{ay,payYuzde,tutar,tavan,carpan:{F,K,R,H}}`.
- Hata kodları: `tezgah_yok, kepenk_kendiliginden, depo_dolu, raf_dolu, raf_satir_dolu, satir_yok, fiyat_bant_disi, fiyat_degisti, stok_yok, devralma_kosulu, kalite_gecersiz, adet_gecersiz, fiyat_gecersiz, depo_cekim_tavani, vekil_han_sahibi, pompa_siniri, kendine` + eski `mal_yok, mal_gecersiz, yetki_yok, para_yok, transfer_bekliyor, mulk_siniri, edinim_sarti, yas_kapisi, kisi_yok`.
- Olaylar: `olay.tezgah.gunSonu {isletme,ad,adet,hasilat,mal}`, `olay.tezgah.kepenkIndi {isletme,ad}`, `olay.tezgah.devralindi {isletme,ad,bedel,mal,kepenkAy}`, `olay.tezgah.devralmaKasasi {isletme,tutar}`, `olay.han.yolcuPayi {isletme,ad,tutar,payYuzde}`.

## Kurallar (metinler buna göre)
- Kepenk = **o ay hiç satış olmadı**: bakım, borç, iflas, itibar kaybı ve maaş işlemez. Oyuncu elle açıp kapatmaz.
- Devralma: bütün yuvalar dolu VE 60 aydır ne satış ne sahibin raf/depo/fiyat eylemi. İade = beyliğe ödenen bedel + depo + kasa. Kendi dükkânımda sayaç ilerlediyse sakin bilgi satırı; korkutma.
- NPC birim fiyat tavanı `1,5 × taban × kalite çarpanı` (satırda `npcTavan`); üstü "yalnız oyunculara satılır".
- Çalışan kendi dükkânından satın alamaz; çalışanın depodan alışı günlük 20 akçe adil değerle sınırlı.
- Raf satışında adil üstü fark aylık armağan tavanına sayılır; aynı kümeye adil üstü satış reddedilir.
- Atölye bu dilimde yalnız depo + "üretim yakında".

## Ekranlar
1. **Dükkânım** (`isletme/[id]`, sahip/çalışan): sahne görseli, ad, seviye, itibar, kepenk durumu nedeniyle; raf ızgarası (boş yuvalar "raf ekle"); satır çekmecesi: fiyat adımlayıcı (adil / NPC tavanı / ±%10), 300 ms gecikmeli yarış korumalı **önizleme** (pay %, tahmini adet/hasılat, F/Q/R/H dökümü, neden sözle); depo çekmecesi (heybe ↔ depo); gün sonu dökümü; kasa/personel/devir korunur, "kapı" kalkar.
2. **Çarşı** (`carsi.tsx`): dükkân kartları, yuva durumu, "Dükkân aç" kısayolu, mal süzgeci, koşullu "Devral" (iki adımlı onay, iade yazılı). **Sokak'a Çarşı karosu.**
3. **Dükkâna gir** (müşteri): raf → adet → "Satın al" (akçe yetmezse kapalı + neden; `fiyat_degisti`de yeniden onay); `yapan` damgası; sahibin sayfasına bağlantı.
4. Han sahibine "Yolcu payı" dökümü (han kartı ve panel).
5. İşim'de dükkân kartına canlı özet; "Şimdi" rehberine "rafına mal koy" önerisi ve "dükkân açabilirsin"in Yaşam'da da çalışması.
6. Beş olay anahtarının metni ve ikonu.

Kalite: hareket yalnız `HAREKET`/`belir`/`giris`/`BASMA_OLCEK`; reduce motion; her yazma `istekNo` + senkron kilit; çekmece açıkken satır değişirse kilit + neden; ≥44 pt; 320/390 px; RTL; `GameIcon`; iç içe erişilebilir Pressable yok; boş/iskelet/hata durumları. Bitince: çeviri (Sonnet), `react-reviewer` (Sonnet), düzeltme, push.

---

# Dilim 2 — atölye: sunucu protokolü (17 Kasım; sunucu `206493b`, 683 test; denge denetimi yapıldı; istemci YOK)

- POST `/v1/isletme/:id/…` (hepsi `istekNo`): `zanaat {meslek}` (yalnız sahip) · `uret {tarif}` (sahip ya da "musteri" yetkisi) · `mesai {emek}` (sahip ya da her oyuncu çalışan) · `emir {islem:"ac",tarif,kez}` / `{islem:"iptal",emir}` (sahip ya da vekil) · `toplu {siparis}` (sahip ya da "musteri") · `genislet {}` (sahip ya da vekil; dükkânda da çalışır).
- GET `/v1/atolyeler` → `{atolyeler:[{isletme,no,ad,sahip,seviye,itibar,zanaat,kepenk,benim,devralinabilir}], topluSiparis[], yuva, bedel, devralmaKepenkAy}`. GET `/v1/dukkanlar` artık `bedel:{dukkan,atolye}` da döner.
- GET `/v1/isletme/:id/tezgah` ekleri: yetkiliye `genisletme:{kademe,seviye,sonraki:{hedef,malzeme:[{mal,adet,depoda,taban}]}}`, `depoDefteri[].kimAd`; atölyede `atolye:{zanaat,zanaatOneri,zanaatlar,zanaatDegisim:{yapilan,ucretsizKalan,bedel},tezgah:{sayi,acikEmir},kaliteBonus,emek:{havuz,tavan,npcCalisan,npcAylik,npcKaliteCeza,npcMaasEnAz},emirler:[{no,tarif,kez,yapilan,kalan,acilis,acan}],emirKezEnCok,sonUretimAyi,topluSiparis[],benimTakat}`; `izin`e `genislet,uret,mesai,emir,toplu,zanaat`.
- Atölyede `gunSonu`: `{ay,kepenk,anlik,yapim,emek:{oyuncuOnce,oyuncuSonra,npcVerilen,npcKullanilan},emirler:[{emir,tarif,kez,yapilan,buAy,cikti,kalite[4],usta,emek,neden}]}`.
- Hata kodları: `zanaat_yok, zanaat_disi, emir_acik, tezgah_dolu, emir_yok, kez_gecersiz, usta_yok, havuz_dolu, emek_gecersiz, genisletme_yok, malzeme_yok, ust_uste, maas_npc_taban`.
- Olaylar: `olay.tezgah.uretim {isletme,ad,yapim,mal,adet}`, `olay.tezgah.topluSiparis {siparis,meslek,mal,adet,odul}`, `olay.tezgah.topluTeslim {isletme,ad,mal,adet,odul}`; `olay.levha` artık `atolye, atolyeAd`; `olay.tezgah.devralmaKasasi` artık `ad`.
- Parametreler: tezgâh [1,2,3,4,5]; kalite bonusu 5×seviye; zanaat ilk değişim ücretsiz, sonra 30 akçe; emek havuzu tezgâh×6, tek mesai ≤18; NPC emeği 2/ay (birikmez), kalite cezası 30, NPC atölye maaşı ≥38; emir en çok 24 kez; toplu sipariş değer ≤60, ödül ×1,4 (≤84/ay), süre 2 ay; genişletme malzemesi kereste, çivi, doğrama, kesme taş, kiriş.
- Kurallar: zanaat tarifi olan 7 meslekten herhangi biri (sahibin mesleği şart değil); emirle üretimde kişisel verim becerisi yok (çıktı tarifin taban adedi), XP/nam yok; emek sırası önce oyuncu havuzu sonra NPC; atölye kepengi = o ay üretim ya da toplu teslim yok.
- **Denetim sonrası protokol ekleri (17 Kasım, `206493b`):** atölyede NPC işe alımı `emanet_yetersiz` dönebilir; iflas eden atölyede bütün atölye uçları ve `genislet` `isletme_kapali` döner; `atolye.emek.npc:{sozlesme,emekVeren,maassiz,neden}` ve `gunSonu.npc` (aynı biçim; `neden` boş ya da `"emanet_maas_yetmez"`); `gunSonu.emirler[].kaliteDokum:{kalemler:[{k,enAz,enCok}],toplam:{enAz,enCok}}|null`; `npcCalisan`/`npcAylik` artık yalnız emek veren (maaşı karşılanan) NPC'yi sayar. Ekran maaşsız NPC'yi ve nedenini göstermeli.
- **Denge denetimi (17 Kasım):** açık riskler kapandı (ayrıntı tasarım §6.1); kervan testi ay ortasına sabitlendi.
- **Yapılmadı:** ısmarlamanın atölyeye verilmesi; alt istek bütçesi için ayrı atölye testi.

## Atölye ekranı (istemci, yapılacak)
"Atölyem" (`isletme/[id]`, tür atölye): zanaat seçimi/değişimi; tezgâhlar ve açık üretim emirleri (aç/iptal, ilerleme); "atölyede üret" (tarif listesi, girdi depoda var/yok dökümü); mesai bağlama (takatten emek; geri alınmaz uyarısı); emek havuzu ve NPC emeği dökümü; depo (Dilim 1 bileşeni); ay sonu üretim dökümü (neden sözle); toplu sipariş listesi ve teslim; genişletme (malzeme listesi, depoda var/yok). Çarşı'ya "Atölyeler" sekmesi ya da ayrı liste (`/v1/atolyeler`); dükkânda da "Genişlet". Kalite kuralları Dilim 1 ile aynı; `AdetSecici`, `useTekIstek`, çekmece kalıpları `tezgah-ui.tsx`ten yeniden kullanılır.

---

# Dilim 3 protokol ekleri — meslek/beceri kancaları (17 Kasım; sunucu, istemci YOK)

Kanca = beceri düğümündeki etki. 87 kanca tezgâh/atölye/hana bağlandı (kayıt `online-server/src/icerik/kanca-kayit.ts`); 232'si boşta (`bosta-kancalar.ts`, yalnız kısalır). Değerler gizli değil: her etki aşağıdaki dökümlerle gelir. Ortak döküm biçimi `KancaDokumu = {deger, tavan, kisiAd, kalemler?:[{kanca, d}]}` (`kisiAd` katkı verenin görünen adı ya da null; kimlik dönmez. `kalemler` yalnız işletme sahibine ve katkı verenin kendisine gelir; öbür yetkililer ve gün sonu dökümü yalnız toplamı görür) (`kanca` = `"hak:pazarGunu"`, `"kalite:satis"` gibi; metin anahtarı `onl.kanca.<kanca>` önerilir, düğüm adı `onl.ba.*` ile birlikte). Değer, sahip ve oyuncu çalışanlar arasından en yüksek kişinin katkısıdır (toplanmaz), kanal tavanıyla kırpılır. Çalışan yalnız sözleşmesi bu aydan önce başladıysa ve en eski sözleşmesi bu işletmedeyse sayılır (ekran "gelecek ay etkin" diyebilir).

- **Beceri ağacı** (`GET /v1/beceri`): `seviyeler[].etkiler[].kanca` artık bu kayda göre: `false` = "etkin", `true` = "yakında". Düğüm kartı rozeti buna bakar.
- **`GET /v1/isletme/:id/tezgah`** (yetkiliye):
  - `kanca: Record<kanal, KancaDokumu>` — yalnız etkisi olanlar. Kanallar: `depo` (+% kapasite), dükkânda `rafSatir` (+satır), `rafAdet` (+adet/satır), `dukkanH.<meslek>` (rafta o mesleğin malına H yüzdesi); atölyede `atolyeKalite` (+kalite puanı), `npcCeza` (NPC emeği kalite cezasından −puan), `topluIndirim` (toplu teslim adedinden −%). Ekran: Dükkânım/Atölyem başında "Ustalık etkileri" kartı (kanal adı, değer/tavan, kimden, kalemler).
  - `rafSiniri.satir/adet` ve `depoKapasite` kancalı değeri gösterir (istemci sabit kullanmasın). Raftan alma (`raf al`, `satinal`) ve önizleme `adet` sınırı da `rafSiniri.adet`tir.
  - `genisletme.sonraki.malzeme[].adet` indirimli adettir.
  - `fiyatTablosu?: [{isletme, ad, mal, kalite, fiyat, adet}]` — yalnız bakan oyuncu `hak:fiyatTablosu` (Tüccar › Pazarlık 1) bildiğinde ve dükkânda; en çok 40 satır. Ekran: raf çekmecesinde fiyat ayarının yanında "Çarşı fiyatları".
  - `atolye.emek.tekEnCok` — tek mesai üst sınırı (18); istemcideki yedek sabit yerine bu okunur.
  - `gunSonu.hKanca?: Record<meslek, KancaDokumu>` (dükkân) — gün sonu dökümünde H çarpanının nedeni; satırların `carpanlar.H`'si zaten kancalıdır.
  - Atölye `gunSonu.emirler[].kaliteDokum.kalemler`de yeni kalem `kalite.kanca`; `kalite.npcEmegi` kancayla azalmış gelir.
- **Toplu sipariş** (`atolye.topluSiparis[]`, `GET /v1/atolyeler`): teslim edebilecek atölye için `teslimAdet` ve `indirimYuzde` (indirim yalnız depodaki atölye damgalı mal indirimli adedi karşılıyorsa; değilse `indirimYuzde: 0`, `teslimAdet` = tam adet — ekran "indirim yalnız kendi ürettiğin malla" ipucu verebilir); `teslimEdebilir` artık `depoda ≥ teslimAdet`. `POST …/toplu` yanıtı `toplu:{adet (teslim edilen), siparisAdet, indirimYuzde, odul, …}`; `olay.tezgah.topluTeslim.adet` teslim edilen adettir. Ödül değişmez.
- **Han:** yolcu payı kartı (`yolcuKarti`) `kanca: KancaDokumu` döner; `carpan.H` kancalıdır.
- **Önizleme** (`GET /v1/isletme/:id/onizle`): `carpanlar.H` kancalı.
- Yeni hata kodu yok.

## Kanca partisi 2 protokol ekleri (18 Kasım; hepsi eklemeli, yeni hata kodu yok)

İstemci ajanı için: alanlar ve ekran yeri. Metinler 6 dilde eklenmeli.

- **Hizmet pazarı** (`GET /v1/hizmet`, hazırla/ilan/satın-al yanıtları):
  - Katalogda yeni hizmetler: `gucDogum`, `yaraDikisi`, `dertlesme`, `turkuYak`, `atisma`, `barisIlahisi`, `onarimHizmeti`,
    `yelekOnarimi`, `postTabaklama` (ad/açıklama metni `hizmet.<id>`). Katalog satırına `grup[]`, `arac` ({hedef, birim} | null),
    `kalite` ({yuzde, tavan, kalemler[{kanca, d}]}: oyuncunun bu hizmetteki kalitesi) eklendi.
  - Yeni etki türleri (katalog `etki[]`): `{tur:"onarim", alan:"alet"|"silah"|"zirh", deger}` (alıcının aşınmış aracını
    `deger` kullanım geri alır) ve `{tur:"isleme", alan:<çıktı mal>, deger, girdi, girdiAdet}` (alıcının malını işler).
  - Stok ve ilan satırına `kalite` (yüzde), `aracEki`, `etki[]` (alıcıya giden gerçek etki: `{tur, alan, deger, taban}`).
    Ekran: hizmet kartında "kalite +%X" rozeti ve "can +N (taban M)" satırı.
  - Hazırla yanıtı `hazirlama.kalite` (döküm) ve `hazirlama.arac` (aşınma | null). Satın-al yanıtı `islem.onarim` ({mal: geri
    alınan kullanım}) ve `islem.isleme` ({mal: çıkan adet}) taşıyabilir.
  - NPC talep satırına `oncelik` (bool): açılış ayında öncelikli bir hizmetçiye ayrılmış ("bu ay ebeye/yas evine ayrıldı").
  - Kalem anahtarları `kalite:<hedef>`, `hak:darussifa`, `hak:darussifaBasi` (yerel darüşşifa tabanı).
- **Kasaba görevleri:** görev türü `devriye` (gece devriyesi; yalnız `hak:devriye` sahibine açık). Görev teslim yanıtına
  `katki` ({gosterge, aracEk, kalite, kaliteEk}): "asayiş +2 (mızrak +1, kalite şansı +1)".
- **Tarifler** (`tarifListesi`): yeni tarifler `secmeBugday`, `yaylaGocu`, `otAyikla`, `damarAra`, `molozDuvar`, `saban`,
  `orak`, `suVerilmisKilic`, `komutanZirhi`, `hatliBelge`, `vasiyet` (metin `tarif.<id>`; mallar var olanlar). Satıra `kaliteEk`
  ve `aylik` ({tavan, kalan} | null; damar arama ayda bir) eklendi. Kalite dökümünde yeni kalem `kalite.tarif`. Şifacı artık
  zanaat listesinde (`otAyikla` tarifi; atölye zanaatı "attar imalathanesi").
- **Kervan:** önizleme `yuk` nesnesine `kagni`, `tasit` (araba|kagni|null), `tasitKalite`, `kalite`, `taban`. Kalkış yanıtına
  `asinma[]` (koşum her kervanda, taşıt toplu yükte bir kullanım aşınır). Ekran: yük çubuğunda "araba 30 + kalite 3 + %10".
- **Dükkân konsinye** (`hak:komisyon`): `POST .../raf` yeni işlemler: `{islem:"konsinye", mal, kalite?, adet, fiyat}`
  (emanetçi: başkasının dükkânı), `{islem:"konsinyeGeri", satir}` (emanetçi), `{islem:"komisyon", oran}` (yönetici, 0–20).
  Tezgâh görünümüne `komisyon` ({acik, oran, enCok, satir, benimSatir}); raf satırına `konsinye` ({ad, komisyon}) —
  konsinye satırı yalnız NPC'ye satılır (oyuncu "satın al" düğmesi gizlenmeli). Gün sonu `konsinye[]` ({ad, hasilat, pay,
  komisyon, emanetciye}); emanetçiye olay `olay.tezgah.konsinyeSatis` ({isletme, ad, tutar, komisyon}). Ekran: başkasının
  dükkânında "Malını emanet koy" düğmesi, kendi dükkânında komisyon kaydırıcısı.
- **Bakım indirimi:** kanca görünümünde yeni kanal `bakimIndirim` (yüzde; `hizmet:yapiOnarimi`, `hak:bakimDefteri`); gün sonu
  `bakimIndirimi` (yüzde). Ekran: dükkân/atölye kanca kartında "bakım −%25".
- **Casus:** yeni olay `olay.ucgen.casusKapi` ({casus, muhafiz, guven, kaynak}); `casusBitti.neden` yeni değer `kapida`.

## Kanca partisi 2 (hak l–r) protokol ekleri (18 Kasım; sunucu, istemci YOK)

Bağlanan: `hak:hileliTarti`, `hak:lekeliSatici`, `hak:namYayma`, `hak:ovguTaslama`, `hak:ortakDertCagrisi`, `hak:ozanbasi` (han H +3), `hak:menzilhane` (han H +3), `hak:ordugahHakki` (dokumacı toplu −%5), `hak:meraHakki` (çiftçi NPC cezası −5). Kod `online-server/src/mulk/carsi-hile.ts`. Yeni hata kodu yok.
- **Hileli tartı** (yönetici; dükkânın kanca kişilerinden birinde `hak:hileliTarti`): `POST .../raf {islem:"tarti", hile:boolean}` → `{tarti}`. Hatalar `dugum_kapali` (hak yok), `soguma` (leke sürerken), `yapilandirma_eksik` (zar sırrı yok). Tezgâh görünümüne yöneticiye `tarti:{hak, acik, yuzde:15, adetEnCok:2, yakalanma:{taban:25, denetciyle:50}, leke:{itibar:20, sure:3, nam:5}}`. Gün sonu `hileliTarti:{yakalanmaYuzde, yakalandi, kazanc, lekeBitis?, nam?}` (`kazanc` = raftan düşmeyen adet; hasılat değişmez). Yakalanınca sahibe olay `olay.tezgah.hileYakalandi {isletme, ad, bitis, nam}`. Ekran: dükkânım ayarlarında "Hileli tartı" anahtarı ve olasılık uyarısı ("yerleşimde çarşı denetçisi varsa %50").
- **Leke** (herkese): `GET /v1/dukkanlar` satırına ve tezgâh görünümüne `leke:{bitis, itibar}|null` (lekeli dükkân 3 dönüm −20 itibarla satar). Ekran: dükkân kartında "Lekeli (ay N'e dek)" rozeti.
- **Ozan övgüsü** (`hak:namYayma`): `POST .../raf {islem:"namYay"}` başkasının dükkânında → `{ovgu:{ad, deger, kalemler, ay}, takat}`. 1 takat; ozan ayda 1, dükkân ayda 1 övgü. Hatalar `dugum_kapali`, `kendine` (sahip/çalışan), `ayni_kume`, `teklif_var` (dükkân bu ay övüldü), `eylem_siniri`, `takat_yok`, `isletme_kapali`. Görünümlere `ovgu:{ad, deger}|null` (bu ay); bakan ozana `namYayma:{d, kalemler, kalan, takat}`. Etki: o ay dükkânın `dukkanH.*` kanalında ozan bir kişi sayılır (+5, `hak:ovguTaslama` ile +8; en yüksek kişi, toplanmaz); döküm `kisiAd` ozandır. Ozana akçe/nam/XP yok.
- **Ortak dert:** `dertGorunumu` yeni alan `halkCagri?` (hancı çağrısıyla gelen halk puanı); `ORTAK_DERT_KURALLARI.halkCagriEk` (4/ay).
