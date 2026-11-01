# Ses planı — 1 Kasım 2026

Tek kural: Berkay'a ek ücret çıkmaz. Starter planda aşım yok; kota bitince üretim durur. Kalan kotayı da
boşa harcamamak için her çağrı ölçülür ve kayda geçer.

## 1. Teşhis
- **Ana sayfadaki çınlama:** `ortam/kis_ruzgar.m4a` (kış ayları ana sayfa ortamı ve sinematik 2. perde).
  İçinde 340→820 Hz arası kayan ıslık gibi bir uğultu var; tepe, bant medyanının ~10.000 katı ve 2–5 sn'de bir
  yineleniyor. Diğer ortamlarda bu güçte ton yok. İlk iş bu dosyayı değiştirmek.
- **Efektler:** Freesound önizlemelerinden (kayıplı OGG) kesilmiş; ses seviyeleri, renkleri ve dönemleri
  birbirini tutmuyor. `ui_dokun` 90 ms tık; her dokunuşta aynı ses makineli tüfek gibi tekrarlıyor.
- **Ortam döngüleri:** 18–67 sn tek kayıt; aynı kuş/ateş çıtırtısı her turda aynı yerde geliyor.
- **Müzik:** 21 gerçek icra (CC). Bazıları çok kısa döngü (ör. `cocukluk` 27,5 sn). Ses kimliği dağınık.

## 2. Ses kimliği
1243 Anadolu'su; ağırbaşlı, sıcak, topraksı. Çalgılar: ney, kanun, tanbur, kopuz/bağlama, kemençe, rebab,
bendir, kös/davul–zurna (yalnız cenk). Arayüz sesleri: kağıt, deri, ahşap, mühür, tek sikke; zil, çan,
sentez "bip" yok. Ortam: düşük, tonsuz, nefes alan; sabit periyotla yinelenen hiçbir öğe yok.

## 3. Seviye hiyerarşisi (EBU R128, gerçek tepe ≤ −1 dBTP)
Anlatıcı −16 LUFS · olay efekti −20 · müzik −23 (anlatıcı/efekt altında ~10 dB kısılır) · arayüz −28 ·
ortam −30. Mikserdeki oynatıcı ses düzeyleri bu dosya seviyelerine göre yeniden ayarlanır.

## 4. Teknik yapı
- **Ortam = taban + serpiştirme:** 20–30 sn dikişsiz taban döngü (ElevenLabs `loop`) + sahneye göre 3–6 kısa
  serpiştirme sesi (kuş, köz çıtırtısı, uzak köpek, rüzgâr savruğu). Serpiştirme 8–25 sn arası rastgele aralık,
  ±3 dB rastgele düzey, aynı ses arka arkaya gelmez. Mikserde ayrı kanal; efekt sınırına (4) sayılmaz.
- **Varyant havuzu:** sık çalan seslerin (dokunma, ay ilerletme, sikke, sayfa) 3'er varyantı; sırayla değil,
  bir öncekini tekrar etmeyen rastgele seçim.
- **Kalite kapısı (otomatik, `scripts/ses/denetle.py`):** LUFS hedefi ±1, gerçek tepe, tonal ıslık taraması
  (bu teşhisteki yöntem), döngü dikişinde tık, baş/son sessizlik, süre. Spektrogram PNG'si gözle incelenir.
- Biçim: AAC .m4a 44,1 kHz; efekt/arayüz mono 96 kbps, ortam/müzik stereo 128 kbps.

## 5. Üretim listesi ve kredi tahmini (ölçülen: efekt 10 kredi/sn, müzik ≈ 400 kredi/dk)
| Grup | İçerik | Tahmin |
|---|---|---|
| Arayüz | dokun ×3, ilerle ×3, sayfa ×2, kalem, kapı | ~150 |
| Olay efektleri | mevcut 23 efektin yenisi (+1 deneme payı) | ~1.200 |
| Ortam tabanı | 15 döngü × 25 sn (+%30 pay) | ~4.900 |
| Serpiştirme | ~30 kısa ses | ~600 |
| Giriş sinematiği | ~40 sn özgün müzik + ~10 efekt noktası | ~900 |
| **Toplam (1. dalga)** | | **~7.750** |
| Oyun içi müzik (2. dalga, ayrı onay) | 21 parça × ~90 sn | ~12.600 |

Tavanlar: 1. dalga en çok 10.000 kredi. Kalan kota 5.000'in altına inerse her şey durur.

## 6. Aşamalar ve onay kapıları
- **A. Denetim (ücretsiz):** 63 dosyanın ölçüm tablosu ve her çağrı noktasının sahne/sıklık dökümü.
- **B. Dinleme turu 1 (≤ 1.500 kredi):** yeni kış ortamı, arayüz seti, 3 örnek ortam (taban + serpiştirme
  önizlemesi), giriş müziği taslağı, anlatıcının iki okuması (v4 / v4_exp). Berkay telefondan bir dinleme
  sayfasında dinler ve onaylar. **Onaysız toplu üretim yok.**
- **C. Toplu üretim:** onaylanan üslupla geri kalanlar; her sesin istemi, tohumu ve maliyeti
  `mobile/assets/ses/uretim.json`'a yazılır.
- **D. Oyuna yerleşim:** katalog, mikser (serpiştirme kanalı, varyant, seviye), `ses-check`, `tsc`.
- **E. Giriş sinematiği:** anlatıcı hizalamasından zaman çizelgesi; müzik bölümleri ve efektler cümlelere
  oturtulur. Görüntü işi ses bittikten sonra `goruntu-yonetmeni`ne geçer.
- **F. Telefon testi:** Berkay isterse test APK'sı.

## 7. Kredi kuralları
- Yalnız `sound-generation`, `music` ve onaylı TTS çağrıları. Ses klonlama, dublaj, plan değişikliği yok.
- Her çağrıdan sonra `Character-Cost` başlığı ve abonelik sayacı okunur, `uretim.json`'a yazılır.
- Bir ses kalite kapısını iki denemede geçemezse üretim durur ve istem gözden geçirilir; körlemesine yeniden
  üretim yok.
- Anahtar hiçbir dosyaya yazılmaz; istekler proxy'nin eklediği `xi-api-key` başlığıyla gider.

## 8. Lisans
ElevenLabs ücretli plan çıktıları ticari kullanıma açık. `LISANS.md`deki "yapay zekâ üretimi yok" ifadesi
güncellenir; kalan gerçek kayıtların atıfları korunur.
