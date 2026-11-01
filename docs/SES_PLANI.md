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
| Çok dilli anlatıcı | ses seçimi + 5 dilde anlatı (bölüm 9) | ~5.000 |
| **Toplam (1. dalga)** | | **~12.750** |
| Oyun içi müzik (2. dalga, ayrı onay) | 21 parça × ~90 sn | ~12.600 |

Tavanlar: 1. dalga en çok 15.000 kredi. Kalan kota 5.000'in altına inerse her şey durur.

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

## 9. Çok dilli anlatıcı (Kronks)
Hedef: her dilde anadil telaffuzu, aynı duygu, Kronks'a yakın tını (derin, olgun, ağırbaşlı belgesel anlatıcısı).
Berkay'ın ElevenLabs seslerinden yalnız Kronks (`X1De6TudhbO6mizD7oKo`, tr) kullanılabilir.
- **Metin:** Türkçe asıl metin Berkay'ın. 5 dile edebî çeviri ana oturumda: en nötr, es nötr Latin Amerika,
  pt Brezilya, ar Fasih (MSA), ru standart. Duygu etiketleri aynı yerlerde; "Kül, közü saklar." her dilde kısa,
  atasözü tadında.
- **Her dil için 3 aday yolu:** (1) Kronks + `eleven_v4` doğrudan (aksan Türkçe kalabilir); (2) Kronks remix
  (`/v1/text-to-voice/{id}/remix`: aynı tını, yerel aksan; ses yuvası kullanır, 8 boş); (3) ses kütüphanesinden
  yerel anlatıcılar (ön dinleme ücretsiz), Kronks'a tını benzerliğine göre yerel konuşmacı gömmesiyle sıralanır.
- **Seçim:** yerel Whisper ile anlaşılırlık (kelime hata oranı) + Kronks'a tını benzerliği ölçülür; son karar
  Berkay'ın kulağı. Dinleme sayfasında her dilde aynı örnek cümle, adaylar yan yana.
- **Üretim:** 5 bölüm halinde `with-timestamps`, önceki/sonraki metin bağlamıyla. Hizalama altyazıyı ve müzik
  bölümlerini sürer. Müzik bölüm süreleri en uzun dile göre; kısa dillerde bölüm sonunda müzik nefesi.
- **Uygulama:** ilk açılışta (kayıtlı dil yoksa) dil seçme ekranı; sinematik seçilen dilin kaydını çalar,
  altyazı her dilde.
- ElevenLabs "agent" ürünü konuşan sohbet botları içindir; içerik üretiminde aynı modelleri doğrudan API ile
  kullanmak daha kaliteli ve denetimli. Bu yüzden o yol kullanılmaz.
