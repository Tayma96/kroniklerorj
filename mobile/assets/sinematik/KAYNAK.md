# Açılış sinematiği — kaynak

## giris.mp4 (oyunda oynatılan)

- 720×1280, 25 fps, 1409 kare = **56,36 sn**, H.264 High (yuv420p, BT.709), **ses izi yok**, faststart, ~1,15 Mbps, ~8,1 MB.
- Kesmeler `mobile/assets/ses/giris/zaman.json` bölüm sınırlarıyla aynı: Kösedağ 0–15,79 · Moğol akınları 15,79–28,04 ·
  Halkın çilesi 28,04–36,64 · Kervanlar ve umut 36,64–44,43 · Kül, közü saklar 44,43–56,36 (52,4 sn'den sonra üst bölüm
  kararır; başlık bu karanlık alana biner, aydınlık kalan tek şey avuçtaki mühürdür).
- `giris_kapak.jpg`: ilk çekimin açılış kadrajı, tam pozlama (video %30 parlaklıktan açılır). `giris_sahneler/bolum1..5.jpg`:
  her bölümden temsilî kare, gren yok, 720×1280.
- Yapım (tamamı yerel, GPU'suz): durağan sahne → **Depth Anything V2 Small** (Apache 2.0, ONNX) göreli derinlik →
  `scripts/gorsel/sinematik.py` ile 2.5D paralaks (derinlik güdümlü itme/kaydırma, derinliğe bağlı pus ve sis/duman,
  kar/köz/toz/kum/çisenti parçacıkları, ateş ve fener titremesi, ısı dalgası, ışık huzmesi, renk derecelendirme, hale,
  vinyet, film greni) → ffmpeg/x264 iki geçiş. Çekim planı `scripts/gorsel/cekim_plani.py`, hat `scripts/gorsel/sinematik_kur.sh`.
- Rötuş: `b1_kosedag_asker` çizme tabanlarındaki modern tırtıklı desen düzleştirildi (`scripts/gorsel/rotus.py`).
- 3–5. bölümler aşağıdaki **eski FLUX karelerinden** (yolcu, cocukluk_e, cocukluk_k, muhur) yapıldı; planlanan yeni sahneler
  yavaş disk ve paylaşılan bellek sınırı yüzünden üretilmedi.

### Yeni sahne görselleri (Z-Image-Turbo)

Model: **Z-Image-Turbo** (Tongyi-MAI, Apache 2.0) GGUF Q8_0 (leejet/Z-Image-Turbo-GGUF); metin kodlayıcı **Qwen3-4B-Instruct-2507**
Q8_0 (Apache 2.0); VAE FLUX.1 `ae.safetensors` (Apache 2.0). Çalıştırıcı stable-diffusion.cpp (MIT), CPU + OpenBLAS.
640×1136, 8 adım, euler, cfg 1.0. Ham PNG'ler depoya konmadı; yalnız video ve kareler var.

| Çekim | Sahne | Tohum | İstem |
|---|---|---|---|
| 0.00–8.60 sn | b1_kosedag_sis | 101 | Epic wide cinematic film still of a misty mountain pass in eastern Anatolia at cold grey dawn, the morning after a lost medieval battle in the year 1243. In the foreground a torn, faded crimson cloth war banner hangs from a broken wooden lance planted in the muddy grass; dented round wooden shields, broken spears and scattered arrows lie in the wet grass. Below, a deep valley filled with low drifting fog, layers of dark mountain ridges fading into the mist, a pale overcast sky. Cold desaturated blue-grey light, somber, silent, vast. |
| 8.60–15.79 sn | b1_kosedag_asker | 112 | A defeated Seljuk Turkish warrior of the 13th century seen from behind, kneeling alone on a muddy hillside with his head bowed, wearing a dented conical steel helmet with a chainmail aventail and a lamellar armor coat over a torn dark red quilted kaftan, a broken curved sabre lying in the mud beside him. Beyond him a wide valley where the camp of a defeated army is burning, tall columns of grey smoke rising into a heavy overcast sky, abandoned tents and fallen horses far away. Light drizzle, cold muted blue-grey tones, somber atmosphere. |
| 15.79–20.50 sn | b2_mogol_atlilar | 203 | A large band of 13th century Mongol horse archers galloping across a dry Anatolian steppe straight toward the camera, riders wearing fur-trimmed caps and leather lamellar armor, holding composite recurved bows, quivers at their hips, small sturdy steppe horses with flying manes, enormous clouds of dust kicked up behind them, dark brooding storm clouds above, low angle telephoto shot, dramatic and menacing. Muted cold earthy tones. |
| 20.50–24.70 sn | b2_yagma | 217 | Night in the 13th century: an ancient walled Seljuk city in Anatolia is burning in the distance after a Mongol raid, seen from far away across a dark open plain. Huge fires and towering columns of black smoke rise above massive crenellated stone city walls, a tall cylindrical brick minaret and a conical stone dome are silhouetted against the flames, glowing embers drift through the air. In the foreground, on a muddy dirt track through dry grass, a small group of medieval refugees in long hooded dark wool cloaks walk away from the camera in silhouette, one leads an ox pulling a simple wooden cart loaded with bundles of cloth. Everything is handmade from stone, mud brick, wood and wool. Deep blue night sky, orange firelight. |
| 24.70–28.04 sn | b2_bos_koy | 223 | An abandoned 13th century medieval Anatolian village of simple flat-roofed mud-brick houses with tiny dark window holes and earthen roofs, on a bleak hillside in late autumn, empty and silent, a weathered wooden plank door hanging open on a broken hinge, an overturned wooden ox cart with a broken spoked wheel in the foreground, scattered straw, cold wind blowing dust, a bare leafless tree, grey overcast sky, desaturated cold tones, melancholic, no people. Everything is handmade from mud brick, stone, wood and straw. |

Her isteme eklenen ortak son ek: `Shot on 35mm film with an anamorphic lens, photorealistic, natural light, rich texture, highly detailed, cinematic color grading, vertical portrait composition.`

Planlanıp üretilmeyen (istemleri sahneler.json'da duruyor): b3_vergi, b3_cile, b4_kervan, b4_umut, b5_ocak, b5_koz.

Reddedilen üretimler: b2_yagma tohum 211 (modern binalar, camli pencereler, sirt cantasi, spor ayakkabi, sokak lambasi).

## Eski durağan görseller (FLUX schnell)

Model: **FLUX.1 [schnell]** (Black Forest Labs, Apache 2.0), GGUF Q4_K_S nicemleme (city96), metin kodlayıcılar
CLIP-L ve T5-XXL Q4_K_M, VAE ae.safetensors. Çalıştırıcı: **stable-diffusion.cpp** (leejet, MIT), bu projede
GPU'suz yerel makinede. 4 adım, euler, cfg 1.0, 720×1280; uygulama için JPEG'e çevrildi. Çıktılar üzerinde kısıt yoktur.

Ortak üslup eki: `cinematic film still, photorealistic, 13th century Seljuk Anatolia, natural dramatic lighting, muted earthy palette, rich textures, shallow depth of field, 35mm anamorphic, highly detailed, no text, no watermark`

| Dosya | Tohum | İstem |
|---|---|---|
| kosedag.jpg | 11 | aftermath of the battle of Kose Dag at dusk, broken Seljuk banners and shattered round shields on a muddy hillside, smoke drifting over the valley, a lone wounded Seljuk soldier in lamellar armor kneeling beside a fallen horse, distant Mongol horsemen silhouetted on a ridge |
| yangin.jpg | 23 | night, a walled medieval Anatolian town burning on the horizon, orange flames and black smoke under a dark sky, refugees with bundles and an ox cart fleeing along a road in the foreground, embers in the air, Mongol horse archers silhouetted against the fire |
| yolcu.jpg | 37 | snowy winter night, a wounded traveler in a torn fur-lined cloak leaning against the wooden door of a mud-brick village house, his bloodied hand clutching an ash-grey stone seal, warm lantern light spilling from the half-open door onto the snow, falling snow |
| muhur.jpg | 41 | close-up, an old village elder with a long white beard wearing a white wrapped turban and a dark wool robe, sitting by a hearth fire at night, holding an ash-grey carved stone seal with an engraved ember motif in his weathered open palm, firelight on his face, solemn expression, dark mud-brick interior |
| cocukluk_e.jpg | 53 | a child of about ten in simple medieval Anatolian clothes standing on a grassy hill at golden hour, seen from behind, looking toward a vast valley with a distant caravan and mountains on the horizon, wind in the grass |
| cocukluk_k.jpg | 59 | (kız çocuk sürümü) a girl of about ten in a simple medieval Anatolian dress with a light headscarf, standing on a grassy hill at golden hour, seen from behind |

Bu karelerden `yolcu.jpg` (28,04–36,64 sn), `cocukluk_e.jpg` (36,64–40,70), `cocukluk_k.jpg` (40,70–44,43) ve `muhur.jpg`
(44,43–56,36) giris.mp4'te de kullanıldı.
