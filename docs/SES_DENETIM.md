# Ses denetimi — 1 Kasım 2026 (Aşama A)

Ölçüm: `python3 -I scripts/ses/denetle.py <dosyalar> [--tur ortam|ui|efekt|muzik|vo] [--json] [--spektrogram KLASÖR]`
(yalnız numpy + ffmpeg). LUFS/gerçek tepe ffmpeg `ebur128`; 0,4 sn'den kısa seste 0,5 sn'ye sessizlikle tamamlanarak.
**Islık:** 300 Hz–12 kHz yarım oktav bantlarda FFT güç tepe/medyan oranı (bant içi eğim çıkarılır, en güçlü banttan
30 dB aşağıdaki bantlar sayılmaz); en yüksek oran ve oranı > 60 olan pencere yüzdesi. **Bant:** 1/3 oktav çıkıntısı
(bant, 2/3 oktav aşağı ve yukarı komşularının ikisini de kaç dB aşıyor) — dar bantlı sürekli vınlama. **Dikiş:** son 20 ms →
ilk 20 ms örnek sıçramasının kenar farklarının %99'luğuna oranı (> 2 tık) ve RMS basamağı. Sessizlik: −55 dBFS altı.
Kalın = kapı sınırı dışında. Islık/bant değerleri çalgı, kuş, çan, cırcır gibi doğal tonlarda da yüksektir; kapı yalnız
ortam tabanında ve arayüzde uygulanır.

80 dosya ölçüldü (63 müzik/ortam/efekt + 17 anlatı). Ham JSON: denetle.py `--json` çıktısı yeniden üretilebilir.

### Ortam (döngü; hedef −30)

| Dosya | sn | LUFS | dBTP | Islık max@Hz · %pencere | Bant dB@Hz | Dikiş ×/dB | Sessizlik baş/son ms |
|---|---|---|---|---|---|---|---|
| avlu | 18.0 | -26.9 | -9.1 | 39@350 · %0 | +2@3175 | 0.0/-0.2 | 0/0 |
| bahar_kus | 47.0 | -27.0 | -6.1 | 1000@4172 · %15 | +4@500 | **3.5/-0.6** | 0/0 |
| bozkir | 52.0 | -26.7 | -10.0 | 174@1093 · %1 | +1@397 | 0.5/+0.3 | 0/0 |
| carsi | 52.0 | -26.8 | -3.8 | 15k@3542 · %45 | +1@1587 | 1.3/-2.4 | 0/0 |
| degirmen | 47.0 | -27.0 | -3.0 | 43@1039 · %0 | +1@630 | 0.0/-0.3 | 0/0 |
| dere | 47.0 | -27.0 | -10.3 | 25@3650 · %0 | +1@630 | 0.4/+0.8 | 0/0 |
| dokuma | 47.0 | -27.4 | **+1.0** | 2643@6874 · %11 | +3@794 | **2.3/-0.2** | **190/100** |
| guz_ruzgar | 38.0 | -27.1 | -5.5 | 41@603 · %0 | +3@8000 | **3.0/+1.5** | 0/0 |
| kervan | 67.0 | -27.0 | -9.9 | 230k@3451 · %60 | **+6@4000** | **5.7/-3.1** | 0/0 |
| kis_ruzgar | 47.0 | -26.9 | -13.1 | 10k@904 · %66 | **+11@794** | **9.2/-0.6** | **120/1460** |
| ocak | 43.0 | -26.9 | -3.6 | 60@7111 · %0 | +1@794 | 1.6/-1.3 | 0/0 |
| ors | 47.0 | -26.9 | **+4.7** | ≥10⁶@8608 · %57 | **+7@8000** | 1.2/-0.7 | 0/0 |
| suru | 57.0 | -27.0 | -7.5 | 15k@3391 · %98 | **+14@1260** | 1.2/-1.7 | 0/0 |
| yaz_cayir | 47.0 | -27.0 | -12.8 | 34k@3429 · %54 | **+7@2520** | 0.9/-0.4 | 0/0 |
| yaz_gece | 47.0 | -27.0 | -6.9 | 468@4151 · %57 | **+16@4000** | **2.4/+0.4** | 0/0 |

### Müzik (döngü; hedef −23)

| Dosya | sn | LUFS | dBTP | Islık max@Hz · %pencere | Bant dB@Hz | Dikiş ×/dB | Sessizlik baş/son ms |
|---|---|---|---|---|---|---|---|
| akin | 57.5 | -18.3 | **+1.3** | 1130@786 · %31 | +2@397 | 1.5/+0.8 | 0/0 |
| ana_tema | 71.5 | -18.0 | -1.7 | 19k@3618 · %98 | **+3@794** | **9.8/-1.1** | 0/0 |
| carsi | 32.0 | -18.0 | -1.0 | ≥10⁶@6277 · %99 | **+4@8000** | **13.9/+0.0** | 0/0 |
| cenaze | 37.5 | -18.0 | -5.4 | ≥10⁶@1378 · %96 | **+2@1000** | **3.8/-0.3** | 0/0 |
| ciraklik | 35.5 | -18.2 | **-0.9** | 20k@1055 · %94 | **+4@397** | 0.8/+0.1 | 0/0 |
| cocukluk | 27.5 | -18.0 | **-0.6** | ≥10⁶@4484 · %94 | **+11@1587** | **3.9/-2.0** | 0/0 |
| divan | 57.5 | -18.0 | **-0.5** | ≥10⁶@5329 · %100 | **+5@1000** | **0.1/+8.1** | 0/0 |
| dogum | 34.5 | -18.0 | **+0.2** | 13k@1055 · %94 | **+8@500** | **3.3/+0.9** | 0/0 |
| dugun | 67.5 | -18.0 | -8.2 | 36k@2525 · %94 | **+12@2520** | 1.2/+0.3 | 0/0 |
| genclik | 67.5 | -18.0 | **-0.0** | 38k@6638 · %98 | +1@3175 | **2.8/+0.4** | 0/0 |
| gerilim | 61.5 | -18.0 | -1.0 | 430k@2186 · %100 | **+6@630** | **3.6/-0.6** | 0/0 |
| gunluk | 67.5 | -18.0 | -4.1 | 271k@1082 · %97 | **+16@794** | **6.0/-0.7** | 0/0 |
| kitlik | 48.5 | -18.0 | **-0.9** | 12k@657 · %90 | +1@500 | **2.8/-0.7** | 0/0 |
| miras | 17.5 | -18.0 | -3.7 | 118k@974 · %100 | **+14@1000** | **6.1/+0.5** | 0/0 |
| olgunluk | 44.5 | -18.0 | **-0.7** | ≥10⁶@4495 · %100 | **+2@794** | 2.0/-0.4 | 0/0 |
| senlik | 72.5 | -17.9 | -2.3 | 72k@4199 · %93 | -0@4000 | **5.2/-0.6** | 0/0 |
| tekke | 23.0 | -18.0 | -2.8 | 53k@533 · %94 | **+16@500** | **8.0/-0.4** | 0/0 |
| ustalik | 67.5 | -18.0 | **-0.6** | 15k@528 · %87 | **+5@397** | **3.4/+2.3** | 0/0 |
| yaslilik | 23.5 | -17.9 | -3.1 | 128k@1087 · %91 | **+6@1000** | 1.9/-0.1 | 0/0 |
| yolculuk | 29.5 | -18.0 | **-0.6** | ≥10⁶@5399 · %96 | **+10@1587** | **5.4/+0.1** | 0/0 |
| zafer | 57.5 | -18.0 | -7.3 | 28k@2805 · %89 | **+12@2520** | 0.3/-0.7 | 0/0 |

### Efekt ve arayüz (hedef olay −20, arayüz −28)

| Dosya | sn | LUFS | dBTP | Islık max@Hz · %pencere | Bant dB@Hz | Sessizlik baş/son ms |
|---|---|---|---|---|---|---|
| akce_kese | 2.1 | -22.8 | -2.2 | 252@8958 · %43 | +3@397 | 0/30 |
| akce_tek | 1.2 | -23.5 | -2.1 | 4130@8958 · %92 | +6@397 | 0/80 |
| bolum_davul | 3.7 | -25.2 | -5.0 | 87@689 · %19 | -3@500 | **0/450** |
| cip_kayip | 1.6 | -29.4 | -7.9 | 1511@301 · %62 | +5@397 | 0/40 |
| cip_kazanc | 2.0 | -26.1 | -5.8 | 209k@8102 · %100 | **+15@2520** | 0/70 |
| cip_kin | 1.6 | -24.0 | -5.1 | 60@495 · %6 | -3@500 | 0/10 |
| cip_minnet | 2.6 | -21.3 | -10.8 | 80k@743 · %92 | **+20@794** | 0/10 |
| cip_yanki | 1.2 | -20.2 | -2.1 | 303@9076 · %50 | +1@8000 | 0/20 |
| davul_cenk | 5.9 | -27.5 | -2.8 | 92@350 · %3 | +2@630 | 0/150 |
| dogum | 7.0 | -22.0 | -6.7 | 170k@716 · %100 | **+6@794** | 0/40 |
| dugun | 2.4 | -27.1 | -2.8 | 393@8080 · %48 | +1@6350 | 0/50 |
| hav | 1.4 | -24.5 | -9.4 | 52@851 · %0 | **+10@397** | 0/290 |
| kalem | 1.1 | -31.2 | -11.6 | 25@845 · %0 | +1@630 | **850/80** |
| kapi | 1.8 | -25.7 | -4.7 | 27@2078 · %0 | +4@500 | 0/30 |
| kilic | 0.7 | -22.4 | -8.0 | 5129@4829 · %100 | +10@3175 | 0/220 |
| matem | 2.2 | -25.9 | -4.6 | 51@1007 · %0 | +2@630 | 0/50 |
| mirilti | 4.0 | -24.2 | -10.2 | 16@700 · %0 | -1@6350 | 0/30 |
| nal | 2.6 | -24.8 | -5.4 | 30@8129 · %0 | +4@500 | 0/30 |
| ney_nefes | 3.5 | -20.3 | -12.1 | 154k@974 · %100 | **+38@1000** | 50/30 |
| sayfa | 0.7 | -25.1 | -1.8 | 17@7316 · %0 | +3@397 | 0/40 |
| saz_vurgu | 3.2 | -23.6 | -3.7 | ≥10⁶@4484 · %100 | **+12@1587** | 0/10 |
| su | 4.5 | -28.3 | -1.3 | 106@3381 · %11 | **+13@794** | **0/890** |
| ui_dokun | 0.1 | -29.3 | -5.7 | 14@3967 · %0 | +3@397 | 0/20 |
| ui_ilerle | 0.1 | -31.8 | -10.2 | 28@8839 · %0 | +9@1587 | 0/30 |
| yenilgi | 3.0 | -23.5 | -4.2 | 67@420 · %3 | -2@397 | 0/30 |
| zafer | 1.9 | -20.5 | -8.4 | ≥10⁶@4452 · %100 | **+17@397** | **0/530** |
| zil | 2.0 | -18.8 | -2.6 | ≥10⁶@3887 · %100 | **+52@4000** | 0/40 |

### Anlatı (hedef −16)

| Dosya | sn | LUFS | dBTP | Islık max@Hz · %pencere | Bant dB@Hz | Sessizlik baş/son ms |
|---|---|---|---|---|---|---|
| sin_1 | 5.7 | -16.6 | -1.0 | 1025@845 · %10 | +2@5040 | 40/20 |
| sin_2 | 6.1 | -16.6 | -1.7 | 2321@851 · %16 | +4@5040 | 40/0 |
| sin_3 | 4.1 | -16.7 | -1.4 | 512@345 · %5 | +3@5040 | 30/20 |
| sin_4 | 2.4 | -19.3 | -1.6 | 129@711 · %9 | +2@397 | 20/240 |
| sin_5e | 2.4 | -15.9 | -2.0 | 847@641 · %25 | +2@500 | 40/260 |
| sin_5k | 3.2 | -13.8 | -1.3 | 50@544 · %0 | +0@1587 | 30/0 |
| sin_6 | 5.0 | -15.4 | **+1.1** | 501@425 · %17 | **+1@1260** | 30/10 |
| sin_7 | 7.2 | -16.5 | -1.5 | 250@754 · %17 | **+3@5040** | 40/50 |
| sin_9 | 4.6 | -16.3 | -1.7 | 196@1701 · %13 | **+4@500** | 40/270 |
| sin_ocak_esnaf | 5.0 | -16.4 | -2.2 | 902@420 · %14 | +3@1260 | 40/30 |
| sin_ocak_hekim | 4.3 | -16.3 | -1.6 | 200@4075 · %8 | +3@3175 | 40/40 |
| sin_ocak_koylu | 3.8 | -15.6 | -1.6 | 1339@598 · %3 | +0@1260 | 40/10 |
| sin_ocak_sipahi | 4.7 | -16.3 | -1.8 | 796@425 · %15 | +5@2520 | 30/240 |
| sin_tab_hirsli | 4.9 | -16.2 | -1.5 | 3920@425 · %24 | -0@5040 | 40/0 |
| sin_tab_kurnaz | 4.5 | -16.2 | -1.4 | 329@958 · %20 | +1@5040 | 40/30 |
| sin_tab_merhametli | 3.5 | -16.2 | -2.0 | 457@495 · %28 | +1@500 | 40/260 |
| sin_tab_yigit | 4.3 | -16.3 | -1.5 | 959@598 · %24 | **+5@397** | 30/40 |

## En kötü 10 sorun

1. **`ortam/kis_ruzgar` — çınlamanın kaynağı doğrulandı.** ~310–910 Hz arasında kayan sürekli ıslık (0,5 sn
   adımlarla izlendi: 339→576→855→909→… Hz; tepe/medyan 1.000–60.000×, pencerelerin %66'sı; 1/3 oktav
   çıkıntısı +11 dB@794 Hz). Ek olarak dosyanın sonunda 1,46 sn, başında 0,12 sn sessizlik var: her döngüde
   ~1,6 sn boşluk ve dikiş tıkı (9,2×). Kış ayları ana sayfası, kıtlık olayı ve sinematik 2. perdede çalar.
2. **`efekt/kalem` 850 ms baş sessizliği:** karar kartında seçim yapılınca (`kart3d.tsx`) ses 0,85 sn gecikiyor.
3. **`efekt/ui_dokun` 90 ms tık, 55 çağrı noktası (27 dosya):** her dokunuşta aynı ses; `ui_ilerle` de 0,1 sn ve
   −31,8 LUFS (ayın en önemli hareketi en zayıf ses).
4. **Efekt düzeyleri 13 dB'lik aralığa dağılmış** (zil −18,8 … ui_ilerle −31,8; cip_kayip −29,4 vs cip_minnet −21,3):
   olay ve karşılığı farklı yükseklikte duyulur.
5. **Gerçek tepe aşımı:** `ortam/ors` +4,7 dBTP, `ortam/dokuma` +1,0, `muzik/akin` +1,3, `muzik/dogum` +0,2,
   `vo/sin_6` +1,1; ayrıca 8 müzik −1 ile 0 arasında. Kod çözümü ve mikste kırpılma riski.
6. **Müzik döngü dikişleri:** `carsi` 13,9×, `ana_tema` 9,8×, `tekke` 8,0×, `miras` 6,1×, `gunluk` 6,0×,
   `yolculuk` 5,4×, `senlik` 5,2× (tık riski); `divan` dikişte +8,1 dB düzey basamağı.
7. **Ortamda sabit periyotlu tonal öğeler:** `yaz_gece` (cırcır, +16 dB@4 kHz, tüm pencereler), `suru`
   (çan, +14 dB@1,26 kHz, %95), `kervan` (çan/eşek, %43; dikiş 5,7×), `yaz_cayir` (%36). Doğal ama 47–67 sn
   döngüde aynı yerde yineleniyor; plan §4'e göre serpiştirmeye taşınmalı.
8. **`ortam/dokuma`:** döngüde 190/100 ms sessizlik + dikiş 2,3× + tepe aşımı → her turda kesinti.
9. **Seviye hiyerarşisi planın dışında:** ortamlar −27 (hedef −30), müzikler −18 (hedef −23); efekt
   kuyrukları `su` 890 ms, `zafer` 530 ms, `bolum_davul` 450 ms sessizlik taşıyarak 4 efekt yuvasından birini boşa tutuyor.
10. **Kısa döngüler:** `miras` 17,5 sn, `avlu` 18 sn, `tekke` 23 sn, `yaslilik` 23,5 sn, `cocukluk` 27,5 sn —
    tekrar hissi; anlatıda `sin_5k` −13,8 ve `sin_4` −19,3 LUFS (hedef −16 ±1).

## Çağrı dökümü (`mobile/app`, `mobile/lib`)

| Çağrı → dosya | Nerede | Sıklık |
|---|---|---|
| `playTap` → `ui_dokun` | 27 dosyada 55 nokta: ana sayfa (`home-mockup-ui` 6), oyun ana ekranı 4, atölye, mülkler, pazar, ilişkiler, menü, meslek/lonca, mahalle, mektep, yeni oyun, ayarlar, kart3d, sinematik atla | **her dokunuş** |
| `playAdvance` → `ui_ilerle` | `app/oyun/_layout.tsx` alt menü [Ayı İlerlet] (tek basış, uzun basış = 6 ay, bekleyen ay) | ay ilerletme başına |
| `playEffect('sayfa')` | ana sayfa kitap satırı (`MkBookRow`); `ses-yonetmen` roman/kronik/tarih sayfasına geçiş | dokunuş / sayfa geçişi |
| `playEffect('kalem')` | `kart3d` karar seçimi; atölye | karar başına (ayda ≤ 1) |
| `cip_kazanc` / `cip_kayip` | `kart3d` zar ve seçim sonucu | karar başına |
| `olayEfekti` → `cip_kin`, `cip_minnet`, `cip_yanki`, `akce_tek` | `ses-yonetmen` yeni kronik olayında | ay başına en çok 1 |
| `playEffect('kapi')` | `ses-yonetmen` NPC teklifi gelince; mahalle kapı | olay başına |
| `playEffect('bolum_davul')` | `ses-yonetmen` yaş evresi değişince | hayat başına ~5 |
| `playCoin` → `akce_kese` | pazar, sarraf, tezgâh, hizmetler, mülk kartı, tapu pazarı, atölye (9 nokta) | alım/satım dokunuşu |
| `playChime` → `zil` | oyun ana ekranı (şenlik kararı, divan seçimi), hanedan elçi, ambar, atölye (6) | olay/dokunuş başına |
| `playSaz` → `saz_vurgu` | oyun ana ekranı: ay sahnesi kararı açılınca | ay başına ≤ 1 |
| `playVictory`/`playFanfare` → `zafer` + zafer müziği | `feel` (taç, ustalık zirvesi, kademe), hanedan haraç, savaş | olay başına (nadir) |
| `playToll` → `matem` + cenaze müziği | `feel` ölüm, soy bağı | olay başına (nadir) |
| `playWedding` / `playLullaby` → `dugun` / `dogum` | `feel` evlilik / çocuk | olay başına |
| `playWarDrum`, `playClash`, `playDefeat` | savaş ekranı (`davul_cenk` + akın müziği 12 sn, `kilic`, `yenilgi`); atölyede `kilic` | savaş eylemi başına |
| `playNey` → `ney_nefes` + tekke müziği | `month-actions-ui` (2) | uğraş başına |
| `playHooves`, `playWater`, `playBark`, `playPurr` | diyar ekranı; karakter başlığı ve ocak (`nal`, `su`, `hav`, `mirilti`) | dokunuş başına |
| `MEKAN_SES` | mahalle: çarşı→`akce_kese`, cami→`ney_nefes`, kahve→`su`, meydan→`saz_vurgu`, han→`nal` | mekân dokunuşu |
| `playNarration`, `playEffect(c.efekt)` | sinematik oynatıcı: anlatı + `davul_cenk`, `dogum`, `kapi`, `nal`, `ney_nefes`, `saz_vurgu` | sinematik başına |

Not: `game.ts`teki `playEnergy`/`playDice` ses değil, oyun işlevi. Sık çalanlar (varyant havuzu önceliği):
`ui_dokun` ≫ `akce_kese` > `ui_ilerle` ≈ `sayfa` > `zil`. `zil` (çan) plan §2'deki arayüz kimliğine aykırı.

## Üretim hattında öğrenilenler (Aşama B)

- ElevenLabs ses efekti çıktılarında 50 Hz katlarında (en güçlüsü 200 Hz katları, 1–2 kHz) sabit spektral çizgiler
  var; sessiz/koyu seste duyulabilir düzeye çıkıyor. `scripts/ses/isle.py --cizgi 50` bu çizgileri bastırır
  (STFT, döngüde dairesel; dikişi bozmaz).
- Çok sessiz üretilen çıktı (ör. ocak tabanı ham −60,8 LUFS) +30 dB kazanç ister; düşük bit hızında kodlama
  kusurlarını büyütebilir — dinlemede dikkat.
- Müzik birimi yeniden ölçüldü: `music_v1` 40 sn = **500 kredi (≈ 750/dk)**, 400/dk değil. Plan §5 müzik
  satırları buna göre ~1,9 katına çıkar.
- ffmpeg 6.1 `showspectrumpic` `fscale=log` + `start/stop` ile frekans eksenini yanlış etiketliyor; denetimde
  doğrusal ölçek kullanılır.
