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

# Dilim 2 — atölye: sunucu protokolü (17 Kasım; sunucu `19ebc10`, 668 test; istemci ve denge denetimi YOK)

- POST `/v1/isletme/:id/…` (hepsi `istekNo`): `zanaat {meslek}` (yalnız sahip) · `uret {tarif}` (sahip ya da "musteri" yetkisi) · `mesai {emek}` (sahip ya da her oyuncu çalışan) · `emir {islem:"ac",tarif,kez}` / `{islem:"iptal",emir}` (sahip ya da vekil) · `toplu {siparis}` (sahip ya da "musteri") · `genislet {}` (sahip ya da vekil; dükkânda da çalışır).
- GET `/v1/atolyeler` → `{atolyeler:[{isletme,no,ad,sahip,seviye,itibar,zanaat,kepenk,benim,devralinabilir}], topluSiparis[], yuva, bedel, devralmaKepenkAy}`. GET `/v1/dukkanlar` artık `bedel:{dukkan,atolye}` da döner.
- GET `/v1/isletme/:id/tezgah` ekleri: yetkiliye `genisletme:{kademe,seviye,sonraki:{hedef,malzeme:[{mal,adet,depoda,taban}]}}`, `depoDefteri[].kimAd`; atölyede `atolye:{zanaat,zanaatOneri,zanaatlar,zanaatDegisim:{yapilan,ucretsizKalan,bedel},tezgah:{sayi,acikEmir},kaliteBonus,emek:{havuz,tavan,npcCalisan,npcAylik,npcKaliteCeza,npcMaasEnAz},emirler:[{no,tarif,kez,yapilan,kalan,acilis,acan}],emirKezEnCok,sonUretimAyi,topluSiparis[],benimTakat}`; `izin`e `genislet,uret,mesai,emir,toplu,zanaat`.
- Atölyede `gunSonu`: `{ay,kepenk,anlik,yapim,emek:{oyuncuOnce,oyuncuSonra,npcVerilen,npcKullanilan},emirler:[{emir,tarif,kez,yapilan,buAy,cikti,kalite[4],usta,emek,neden}]}`.
- Hata kodları: `zanaat_yok, zanaat_disi, emir_acik, tezgah_dolu, emir_yok, kez_gecersiz, usta_yok, havuz_dolu, emek_gecersiz, genisletme_yok, malzeme_yok, ust_uste, maas_npc_taban`.
- Olaylar: `olay.tezgah.uretim {isletme,ad,yapim,mal,adet}`, `olay.tezgah.topluSiparis {siparis,meslek,mal,adet,odul}`, `olay.tezgah.topluTeslim {isletme,ad,mal,adet,odul}`; `olay.levha` artık `atolye, atolyeAd`; `olay.tezgah.devralmaKasasi` artık `ad`.
- Parametreler: tezgâh [1,2,3,4,5]; kalite bonusu 5×seviye; zanaat ilk değişim ücretsiz, sonra 30 akçe; emek havuzu tezgâh×6, tek mesai ≤18; NPC emeği 2/ay (birikmez), kalite cezası 30, NPC atölye maaşı ≥38; emir en çok 24 kez; toplu sipariş değer ≤60, ödül ×1,4 (≤84/ay), süre 2 ay; genişletme malzemesi kereste, çivi, doğrama, kesme taş, kiriş.
- Kurallar: zanaat tarifi olan 7 meslekten herhangi biri (sahibin mesleği şart değil); emirle üretimde kişisel verim becerisi yok (çıktı tarifin taban adedi), XP/nam yok; emek sırası önce oyuncu havuzu sonra NPC; atölye kepengi = o ay üretim ya da toplu teslim yok.
- **Açık riskler (denge denetçisine):** NPC emeğiyle üretilen kaliteli mal rafta 1,5× tavandan satılınca §6.1 (a) sınırı yalnız taban fiyat için kilitli; iflas eden atölyenin reddedilen toplu sipariş tesliminde mal geri gelmiyor; `test/kervan-akis.test.ts` duvar saatine bağlı, ara sıra düşüyor (eskiden beri).
- **Yapılmadı:** ısmarlamanın atölyeye verilmesi; tasarım §6'nın gerçek kurallarla güncellenmesi; `ONLINE_DURUM.md` satırı; alt istek bütçesi için ayrı atölye testi.

## Atölye ekranı (istemci, yapılacak)
"Atölyem" (`isletme/[id]`, tür atölye): zanaat seçimi/değişimi; tezgâhlar ve açık üretim emirleri (aç/iptal, ilerleme); "atölyede üret" (tarif listesi, girdi depoda var/yok dökümü); mesai bağlama (takatten emek; geri alınmaz uyarısı); emek havuzu ve NPC emeği dökümü; depo (Dilim 1 bileşeni); ay sonu üretim dökümü (neden sözle); toplu sipariş listesi ve teslim; genişletme (malzeme listesi, depoda var/yok). Çarşı'ya "Atölyeler" sekmesi ya da ayrı liste (`/v1/atolyeler`); dükkânda da "Genişlet". Kalite kuralları Dilim 1 ile aynı; `AdetSecici`, `useTekIstek`, çekmece kalıpları `tezgah-ui.tsx`ten yeniden kullanılır.
