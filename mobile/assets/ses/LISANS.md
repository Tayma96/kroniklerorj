# Kronikler — ses dosyaları: kaynak ve lisans

Müzik, ortam ve efekt dosyalarının çoğu **gerçek bir kayıttır** (canlı icra ya da saha kaydı). ElevenLabs ile Kronikler için üretilenler (ücretli plan, ticari kullanım) tabloda ayrıca belirtilir; üretim ayrıntıları `uretim.json`'dadır. Açılış sinematiğinin anlatıcısı `giris/` bölümündedir (eski Chatterbox kayıtları kaldırıldı).
Yalnız şu lisanslar kullanıldı: **CC0 1.0**, **Kamu malı (PD)** ve **CC BY 3.0/4.0** (atıf aşağıda). NC (ticari olmayan) ya da belirsiz lisanslı hiçbir kayıt yok.

Kaynak kaydı `assets/ses/kaynak.json`; bu tablo onunla birlikte güncellenir.

**Ortak işlemler (tüm dosyalar):** Freesound kayıtlarında sitenin yüksek nitelikli önizlemesi (OGG) ham kaynak olarak alındı. Kesit alındı, 35 Hz (78'liklerde 60 Hz) yüksek geçiren süzgeç uygulandı;
döngülerde 2,5–3 sn eşit güçlü çapraz geçişle dikişsiz döngü kuruldu, ses yüksekliği (EBU R128) eşitlendi, yumuşak tepe sınırlayıcı (-1 dBFS) uygulandı; 44,1 kHz AAC (.m4a) olarak kodlandı.
1930 tarihli 78'lik kayıtta ayrıca 9 kHz alçak geçiren süzgeç ve hafif hışırtı azaltma uygulandı. Kesit saniyeleri özgün kayda göredir. Tekrarlanabilir işlem: `scripts/ses/isle.py`.



## Müzik (döngü, -18 LUFS) — 2 Kasım 2026'da hepsi özgün bestelerle yenilendi

| Dosya | İçerik | Kaynak kayıt | Yazar / icracı | Lisans | Kesit (sn) | Boyut |
|---|---|---|---|---|---|---|
| `muzik/ana_tema.m4a` | main title theme of the game, menus and chronicle; Huseyni makam, majestic yet warm, heroic longing; ney lead melody, kanun arpeggios, yayli tanbur bowed drone, bendir, distant kos | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 567 KB |
| `muzik/cocukluk.m4a` | childhood years, village life of a small child; Ussak makam, playful, innocent, gentle wonder; plucked baglama and kopuz, light def frame drum, soft kaval | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 798 KB |
| `muzik/genclik.m4a` | youth years 13-17, ambition and first adventures; Rast makam, hopeful, energetic, adventurous; baglama lead, kaval, def and darbuka, kopuz rhythm | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 814 KB |
| `muzik/ciraklik.m4a` | apprenticeship, learning a craft in a workshop; Nihavend makam, diligent, focused, steady; tanbur, ud, soft bendir in duyek usul, subtle wooden percussion like work rhythm | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 691 KB |
| `muzik/ustalik.m4a` | mastery, adulthood at the peak of craft and family; Rast makam, confident, proud, rich; kanun, ud, ney, bendir, kudum | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 815 KB |
| `muzik/olgunluk.m4a` | middle age 40-59, responsibility and dignity; Huzzam makam, reflective, warm melancholy, dignified; kemence, kanun, soft bendir, low drone | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 608 KB |
| `muzik/yaslilik.m4a` | old age 60+, memories and legacy; Saba makam, wistful, tender, slow; solo ney, tanbur, very soft bendir | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 672 KB |
| `muzik/gunluk.m4a` | everyday life, fields, harvest, river, property; Ussak makam, pastoral, peaceful village morning; kaval, baglama, soft def, light tambourine-like zil sparingly | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 711 KB |
| `muzik/carsi.m4a` | bazaar and city streets, trade and haggling; Hicaz makam, lively, bustling, colorful; darbuka, def, kanun, ud, clapping-free | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 755 KB |
| `muzik/dugun.m4a` | village wedding celebration; Hicaz makam, festive, joyful, outdoor; davul and zurna wedding ensemble, def | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 726 KB |
| `muzik/senlik.m4a` | folk festival, harvest celebration; Rast makam, joyous, communal; baglama ensemble, def, kaval, kasik spoons | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 718 KB |
| `muzik/dogum.m4a` | birth of a child, tender family moment; Ussak makam, tender, lullaby-like, hopeful; rebab, soft kanun, very soft bendir heartbeat | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 669 KB |
| `muzik/cenaze.m4a` | death and mourning, funeral; Saba makam, mournful, grief, solemn; duduk-like double reed mey, ney, low drone, single slow bendir strokes | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 715 KB |
| `muzik/gerilim.m4a` | tension, danger, battle preparation, crime; Hicaz makam, tense, suspenseful, dark; yayli tanbur tremolo, low kos drum pulses, kemence harmonics, low drone | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 787 KB |
| `muzik/divan.m4a` | court of justice, the kadi's divan, formal hearing; Segah makam, stately, formal, grave; kanun, tanbur, kudum in a slow ceremonial usul | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 794 KB |
| `muzik/akin.m4a` | Mongol raid, war, battle; Kurdi makam, urgent, violent, epic; large kos war drums, zurna, nakkare, low horn-free drones | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 705 KB |
| `muzik/kitlik.m4a` | famine, hard winter, scarcity; Saba makam, bleak, cold, sorrowful; bass kemence, sparse ney, cold wind-like drone | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 774 KB |
| `muzik/yolculuk.m4a` | travel on the roads, caravans, the map; Rast makam, adventurous, wide horizon, steady journey; ud, kaval, camel-gait bendir and def rhythm | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 828 KB |
| `muzik/zafer.m4a` | victory and triumph; Rast makam, triumphant, proud, celebratory; davul, zurna, nakkare, kos | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 609 KB |
| `muzik/miras.m4a` | legacy, dynasty, generations, the chronicle book; Huseyni makam, nostalgic, timeless, reverent; ud, ney, kanun, soft bendir | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 613 KB |
| `muzik/tekke.m4a` | sufi lodge, mosque courtyard, prayer and contemplation; Huseyni makam, meditative, spiritual, serene; ney taksim, bendir zikr pulse, soft kudum | ElevenLabs müzik üretimi (`uretim.json`) | ElevenLabs, Kronikler için bestelendi | ElevenLabs ücretli plan, ticari kullanım | — | 750 KB |

## Ortam (döngü, -27 LUFS) — 2 Kasım 2026'da hepsi yenilendi

| Dosya | İçerik | Kaynak kayıt | Yazar / icracı | Lisans | Kesit (sn) | Boyut |
|---|---|---|---|---|---|---|
| `ortam/bahar_kus.m4a` | early spring morning in a medieval Anatolian village, gentle songbirds at a distance, ligh | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 476 KB |
| `ortam/yaz_cayir.m4a` | hot summer afternoon meadow in central Anatolia, soft crickets and grasshoppers, a few dis | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 475 KB |
| `ortam/yaz_gece.m4a` | warm summer night outside a village, soft crickets, a distant owl now and then, calm, no m | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 477 KB |
| `ortam/guz_ruzgar.m4a` | autumn wind rustling dry leaves and poplar trees, soft gusts, no whistling, no tonal howl, | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 475 KB |
| `ortam/kis_ruzgar.m4a` | Kış rüzgârı (içeriden), tonsuz dikişsiz döngü | ElevenLabs ses efekti üretimi (`uretim.json`: kis_taban_1) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 412 KB |
| `ortam/ocak.m4a` | a wood fire crackling in a stone hearth inside a mud-brick house at night, soft pops and e | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 492 KB |
| `ortam/carsi.m4a` | a busy 13th-century Anatolian bazaar, murmuring crowd, merchants calling in the distance,  | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 477 KB |
| `ortam/ors.m4a` | a blacksmith workshop, rhythmic hammer strikes on an anvil, bellows breathing, fire roarin | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 483 KB |
| `ortam/dokuma.m4a` | a wooden hand loom weaving a carpet in a quiet room, rhythmic shuttle and beater sounds, n | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 474 KB |
| `ortam/degirmen.m4a` | an old wooden water mill, water rushing over the wheel, wooden gears creaking and turning  | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 483 KB |
| `ortam/dere.m4a` | a small mountain stream flowing over stones, gentle continuous water, a few distant birds, | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 484 KB |
| `ortam/suru.m4a` | a flock of sheep grazing at dusk on a hillside, occasional soft bleats, soft wind, no whis | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 476 KB |
| `ortam/avlu.m4a` | a quiet stone courtyard of a medrese with a small fountain trickling, distant pigeons cooi | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 489 KB |
| `ortam/bozkir.m4a` | the open Anatolian steppe, wide low wind over dry grass, vast and empty, no whistling, no  | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 476 KB |
| `ortam/kervan.m4a` | a caravanserai courtyard, camels grunting and shifting, harness creaking, travelers murmur | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 475 KB |

## Efektler (tek atımlık)

| Dosya | İçerik | Kaynak kayıt | Yazar / icracı | Lisans | Kesit (sn) | Boyut |
|---|---|---|---|---|---|---|
| `efekt/ui_dokun.m4a` | Yumuşak deri/kağıt dokunuşu | ElevenLabs ses efekti üretimi (`uretim.json`: ui_dokun_1) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 3 KB |
| `efekt/ui_ilerle.m4a` | Ay ilerletme: kalın kağıt + ahşap | ElevenLabs ses efekti üretimi (`uretim.json`: ui_ilerle_1) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 11 KB |
| `efekt/ui_dokun_2.m4a` | Yumuşak dokunuş, ikinci varyant | ElevenLabs ses efekti üretimi (`uretim.json`: ui_dokun_2) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 4 KB |
| `efekt/ui_ilerle_2.m4a` | Ay ilerletme, ikinci varyant | ElevenLabs ses efekti üretimi (`uretim.json`: ui_ilerle_2) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 11 KB |
| `efekt/ui_ilerle_3.m4a` | Ay ilerletme, üçüncü varyant | ElevenLabs ses efekti üretimi (`uretim.json`: ui_ilerle_3) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 11 KB |
| `efekt/sayfa.m4a` | Kalın kağıt sayfa çevirme | ElevenLabs ses efekti üretimi (`uretim.json`: sayfa_1) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 8 KB |
| `efekt/kalem.m4a` | Kamış kalem parşömende | [Quill and Parchment.WAV](https://freesound.org/s/507864/) (Freesound) | Nickh69 | CC0 1.0 | 0–54 | 10 KB |
| `efekt/kapi.m4a` | an old heavy wooden door of a mud-brick village house creaks open slowly and closes with a | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 22 KB |
| `efekt/akce_tek.m4a` | a single small silver coin dropped onto a wooden table, one short metallic clink and a lit | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 12 KB |
| `efekt/akce_kese.m4a` | a leather coin purse with silver coins is shaken and set down on a wooden table, soft jing | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 16 KB |
| `efekt/cip_kazanc.m4a` | two soft ascending plucked kanun zither notes, warm and pleasant reward sound, short, gent | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 14 KB |
| `efekt/cip_kayip.m4a` | two soft descending low oud plucks, muted and somber loss sound, short, no bell | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 11 KB |
| `efekt/cip_kin.m4a` | a low muted frame drum thud followed by a tense scraping bowed string note, ominous grudge | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 9 KB |
| `efekt/cip_minnet.m4a` | a single warm soft breathy ney flute note, gratitude, gentle and kind, short | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 19 KB |
| `efekt/cip_yanki.m4a` | a single soft frame drum tap that echoes far away across stone walls, reputation spreading | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 12 KB |
| `efekt/bolum_davul.m4a` | two deep ceremonial davul drum strikes in a large stone courtyard, chapter beginning, sole | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 16 KB |
| `efekt/zafer.m4a` | short triumphant zurna and davul victory flourish, medieval Anatolian, proud, outdoor, no  | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 18 KB |
| `efekt/matem.m4a` | one low deep kos war drum boom with a long dark decay, mourning toll, no bell | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 31 KB |
| `efekt/zil.m4a` | a bright short kanun zither glissando sparkle, festive good news, no bell, no chime | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 16 KB |
| `efekt/davul_cenk.m4a` | large kos war drums roll and pound in a steady rising rhythm, a medieval army preparing fo | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 40 KB |
| `efekt/kilic.m4a` | a steel sword drawn from a leather scabbard with a sharp ring, close | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 4 KB |
| `efekt/yenilgi.m4a` | a dull heavy drum thud followed by a sighing low ney phrase, defeat, sorrow, short | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 29 KB |
| `efekt/dogum.m4a` | a newborn baby's first soft cries in a quiet village house room, intimate, gentle | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 45 KB |
| `efekt/saz_vurgu.m4a` | one strong strummed baglama saz chord accent ringing out, Anatolian folk, close, natural | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 19 KB |
| `efekt/nal.m4a` | a single horse gallops past on a dirt road, hooves approach and fade away, outdoor | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 27 KB |
| `efekt/dugun.m4a` | a burst of festive village wedding davul and zurna music heard from a short distance, outd | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 14 KB |
| `efekt/ney_nefes.m4a` | a long breathy ney flute note rising softly, contemplative, sufi, natural reverb | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 30 KB |
| `efekt/su.m4a` | water poured from a clay jug into a copper bowl, close, gentle | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 32 KB |
| `efekt/mirilti.m4a` | a contented cat purring close up, soft and warm | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 36 KB |
| `efekt/hav.m4a` | a single dog bark in a village at a medium distance, outdoor | ElevenLabs ses efekti üretimi (`uretim.json`) | ElevenLabs, Kronikler için üretildi | ElevenLabs ücretli plan, ticari kullanım | — | 8 KB |

## Atıf

2 Kasım 2026'dan beri CC BY ya da kamu malı kayıt kullanılmıyor; tüm müzik, ortam ve efektler (kalem hariç) ElevenLabs ile Kronikler için üretildi. Kalem efekti CC0'dır, atıf gerektirmez. Oyun içi Emek ekranındaki liste `lib/ses-atif.ts`.

## Seslendirme

`vo/` dizini boştur. Açılış anlatıcısı Berkay'ın ElevenLabs sesi Kronks'tur (aşağıda, `giris/`).

## Giriş sinematiği (`giris/`)

Altı dilde tam miks (`giris_<dil>.m4a`, 56,36 sn, ortak çizelge `zaman.json`). Anlatı metni Berkay'ın (`docs/ANLATI_GIRIS.md`); anlatıcı sesi Berkay'ın ElevenLabs sesi **Kronks** (Arapçada aynı sesin Arapça aksanlı remix'i). Anlatı (`eleven_v4`), özgün müzik (`music_v1`) ve efektler ElevenLabs ile Kronikler için üretildi; ücretli plan, ticari kullanım. İstem, model ve maliyetler `uretim.json`'da.
