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
