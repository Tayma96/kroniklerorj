# Açılış sinematiği — "Küllerin Mirası" — tasarım

Tarih: 29 Ekim 2026 · Durum: kullanıcı yönü verdi (4 soru yanıtlandı); uygulanıyor.

## Neden
Ad yazıldıktan sonra gelen prolog 4 düz cümle ve tek karartılmış arka plan. Kullanıcı: "Hikâye
oluşturmak lazım… sinematik gerçekten sinematik olmalı." Çok oyunculu mod gelirin ana kaynağı
olacak; bu hikâye iki modun ortak efsanesi olur.

## Kararlar (kullanıcı)
- Omurga: ortak destan + ocağa ve tabiata özel orta bölüm; final Kül Yemini'ne bağlanır.
- Görsel: şimdi boyalı tablolarla gerçek sinema dili; 3D hattı olgunlaşınca kilit çekimler Blender.
- Eksik resimler: ücretsiz, açık lisanslı model (FLUX.1 schnell, Apache 2.0) bu makinede üretir.
- Anlatıcı: yapay zekâ sesi (Chatterbox, yerel, ücretsiz). Önce Türkçe; diğer diller altyazılı.
  `assets/ses/LISANS.md`deki "yapay ses yok" kuralı anlatıcı için güncellenir.

## Senaryo (Türkçe esas; 6 dile çevrilir)
Süre ~90 sn, 10 çekim. Her çekim: görsel, kamera hareketi, katmanlar, ses, anlatı.

**I. Perde — Dünya (herkese aynı)**
1. Kösedağ, alacakaranlık, kırık sancaklar, duman. Üst yazı "Kösedağ · 1243".
   "Kösedağ'da Selçuklu'nun kalkanı kırıldı. Moğol atlıları Anadolu'ya sel gibi yayıldı."
2. Gece, ufukta yanan şehir. "Şehirler yandı, vergiler ağırlaştı. Beyler birbirine düştü;
   kervanlar korkuyla yürüdü."
3. Gün batımında tozlu yolda kervan. "Ama Anadolu'nun bir sözü vardır: kül, közü saklar."

**II. Perde — Ocak (seçilen ocağa göre)**
4. Karlı kış gecesi, köy. Üst yazı "1247 · Kış". "Dört yıl sonra, karlı bir kış gecesi…"
5. Ocağın içi (köylü `hasat`/`ev_yoksul`, esnaf `atolye_demirci`, hekim `medrese`, sipahi
   `ev_varlikli`). "…{ocak} {bir oğlan/kız çocuğu} dünyaya geldi. Adını {Ad} koydular."
   - köylü: "bir köylü ocağında, buğdayın ve sabrın ortasında"
   - esnaf: "bir demirci ocağında, örsün sesine karışan bir çığlıkla"
   - hekim: "bir hekim ocağında, kuru otların ve kitapların kokusu arasında"
   - sipahi: "bir sipahi ocağında, duvardaki kılıcın gölgesinde"
6. Kapı, kar, yaralı yolcu; kanlı elinde kül rengi mühür. "Aynı gece kapınızı yaralı bir yolcu
   çaldı. Elinde kül rengi bir mühür vardı."
7. Ocak başında köyün yaşlısı, avucunda mühür. "Yolcu mührü köyün en yaşlısına bıraktı: 'Bu
   çocuk on üçüne bastığında, mühür sahibini bulacak.' Şafak sökmeden kayboldu."

**III. Perde — Tabiat ve kader (seçilen tabiata göre)**
8. Çocukluk (mevsimli `hero/cocuk_*`).
   - yiğit: "Büyüdün. Korkuyu tanımadın; köyün çocukları ardından yürüdü."
   - kurnaz: "Büyüdün. Kimsenin söylemediğini duydun; sırlar sana kendiliğinden geldi."
   - merhametli: "Büyüdün. Yaralı kuşu, aç komşuyu, yolda kalanı hep sen gördün."
   - hırslı: "Büyüdün. Köy sana dar geldi; gözün hep ufuktaydı."
9. Şafakta Anadolu, uzakta küçük bir siluet. "Bu senin kroniğin. Ardında kül mü kalacak, köz mü?
   Onu sen yazacaksın."
10. Başlık kartı: KRONİKLER · KÜLLERİN MİRASI → "Hayata Başla".

Tutarlılık: Kül Yemini görevi (13 yaşında köyün en yaşlısı mührü emanet eder) aynen bu
efsaneye bağlanır; görev metni değişmez. Çok oyunculu kanca (şimdi uygulanmaz): mührün
parçaları farklı oyuncuların ocaklarına düşmüştür; ortak bir dünya gizemi olur.

## Sinema dili (kod)
- Veri güdümlü çekim listesi (`lib/sinematik/`): görsel, kamera (başlangıç/bitiş ölçek ve konum,
  süre, eğri), katmanlar, renk tonu, ses ipuçları, anlatı anahtarı ve ses dosyası.
- Kamera: her çekimde yavaş dolly/pan; hareket yönleri çekimden çekime ritimli. Sade modda sabit.
- Katmanlar: ateş ışığı titreşimi, duman/sis bantları farklı hızlarda (sahte derinlik), kar,
  köz, toz; film greni; vinyet; 2.39:1 sinema bantları.
- Geçişler: siyaha kararma, ateş parlaması, eşleşen kesme; perde aralarında kısa siyah.
- Altyazı: sinema altyazısı biçiminde, alt bantta; üst yazı (yer · yıl) daktilo gibi.
- Ses: müzik `ana_tema`/`dogum`, ortam `kis_ruzgar`/`ocak`, efekt `davul_cenk`; anlatıcı varsa
  çekim süresi anlatıya göre uzar. Atla, dokun-hızlandır, ekran okuyucu etiketleri korunur.

## Fazlar
1. Senaryo + 6 dil + çekim oynatıcı; mevcut 16 tablo, müzik ve efektle. Eksik çekimler geçici
   olarak eldeki tablolardan ışık/renk efektiyle.
2. Eksik görseller FLUX ile: Kösedağ, yanan şehir, karlı köy, mühürlü yolcu, yaşlı ve mühür,
   şafak. Mevcut tablolarla aynı boyalı üslup; lisans kaydı `assets/arka/TAGS.txt` yanında.
3. Türkçe anlatıcı (Chatterbox): 10 satır + 4 ocak + 4 tabiat varyantı.
4. (İsteğe bağlı) Derinlik haritasıyla 2.5D paralaks (Skia shader).
5. Sonra: kilit çekimler Blender 3D.

## Kabul
320 ve 390 px'de taşma yok; 6 dilde altyazı; atla her an çalışır; sade modda hareket yok;
oyun başlangıç mantığı (kayıt, ocak, tabiat) değişmez; tsc ve i18n denetimleri temiz.
