---
name: blender-karakter
description: Kronikler için ekransız Blender hattı — Blender 4.2 LTS + MPFB (MakeHuman) kurulumu, gerçekçi insan karakteri kurma, CMU hareket yakalamasını (kılıç, yumruk, yürüme) iskelete aktarma, dönem giysisi/kılıç/miğfer giydirme ve Cycles render. Gerçekçi 3D insan, dövüş animasyonu, karakter görseli ya da Blender işi istendiğinde kullan.
---

# Blender karakter hattı

Bulut makinesi oturum bitince silinir; Blender her yeni oturumda `scripts/setup.sh` ile
yeniden kurulur (yaklaşık 10 dk, ~850 MB). Kullanıcı karikatür değil, gerçek insana yakın
görünüm istiyor (Karagöz perdesi reddedildi).

## Kurulum

```bash
bash .claude/skills/blender-karakter/scripts/setup.sh "$HOME/kronikler-blender"
# çıktı: HAZIR blender=<yol> veri=<MPFB kullanıcı verisi> klasör=<yol>
```

Kurulanlar: Blender 4.2.23 LTS, MPFB 2 (extensions.blender.org), MakeHuman varlık paketleri
(system_assets, skins01-02, suits02, pants01, equipment01 CC0; shoes03, shirts03 CC-BY),
CMU denek 2 hareketleri (BVH'ye çevrilir), Poly Haven HDRI, kızıl şalvar dokusu.

## Hat (B = blender yolu, K = kurulum klasörü)

1. **Karakter:** `B -b --python scripts/build_char.py -- out.blend '<json>'`
   JSON: `skin` (ör. `jartur69_middleage_slavic_male_with_genitals_and_beard/...mhmat`),
   `macro` (gender, age, muscle, weight, race), `hair`, `eyebrows`, `clothes` (ör.
   `rehmanpolanski_viking_tunic`, `toigo_harem_pants`, `punkduck_medieval_boots`), `rig` (varsayılan `cmu_mb`).
2. **Hareket:** `B -b --python scripts/retarget.py -- char.blend K/mocap/02_07.bvh out.blend`
   CMU kemikleri MPFB `cmu_mb` iskeletine birebir eşlenir: uzuvlar Damped Track, kalça
   konum + dinlenme farkı korunarak dönüş, sonra NLA bake. Ölçek bacak boyundan.
   Kılıç oyunu: 02_07, 02_08, 02_09; yumruk: 02_05; yürüme: 02_01.
3. **Giydirme:** `B -b --python scripts/dress.py -- in.blend out.blend '{"doku":"K/doku"}'`
   Modelle kurulan eğri kılıç sağ ele, sivri tepeli miğfer ile sarık başa bağlanır.
   Saç silinir, şalvar kızıla boyanır, parmaklar yumruk yapılır. Ayarlar: `grip_t`,
   `palm_off`, `palm_sign`, `curl`, `curl_sign`, `helmet_drop`, `helmet`.
4. **Render:** `B -b --python scripts/render_shot.py -- in.blend out.png K/hdri/kloof.hdr boy|portre [örnek] [hdri_açı] [kare]`
   Cycles CPU + OIDN. 4 çekirdekte 40-64 örnekle kare başı ~50-60 sn.

## Doğrulama

Görüntüye bakmadan önce yapıyı ölç (`blender-motion-state-inspection` skill'i):
`bvhcheck.py` kemik baş/kuyruk konumlarını JSON'a döker, `stick.py` yan ve ön çubuk çizimi
üretir. Kaynak ve hedef çubuk çizimleri aynı duruşu göstermeli. Ardından render.

## Bilinen durum (28 Ekim 2026)

- MakeHuman yüzü orta mesafede inandırıcı, yakın çekimde "oyun karakteri" düzeyinde.
  Sakallı Slav derisi 2K dokulu; sistem derileri soluk.
- Hareket aktarımı doğrulandı: kılıç kaldırma ve muhafız duruşları doğal. Kılıç
  tutuşunun açısı ve miğfer oturuşu render ile henüz doğrulanmadı.
- Oyuna aktarım önerisi: saydam arka planlı (gölge yakalayıcılı) kare dizileri →
  WebP; mevcut arena arka planlarının üstüne oynatma. Uygulama kararını kullanıcı verir.

## Gerçekçi videoya dönüştürme (Higgsfield yerine ücretsiz)

Bu makinede GPU yok; 14-19B video modelleri burada çalışmaz.

- **Wan 2.2 Animate** (Alibaba, açık ağırlık; lisansı resmî depodan doğrula): bir karakter
  görseli + sürücü video → aynı hareketi yapan gerçekçi karakter. Blender çıktısı sürücü
  video olur. Ücretsiz yol: resmî Hugging Face Space (kuyruklu, günlük GPU kotası). Kullanıcı
  ücretsiz HF hesabı açıp okuma anahtarını ortam gizlisi (`HF_TOKEN`) olarak verirse
  `gradio_client` ile buradan çağrılır; anahtar yazdırılmaz, commit edilmez.
- **LTX-2 / LTX-2.5 + Pose IC-LoRA** (Lightricks, açık ağırlık): poz kontrollü video.
  LTX-2 Topluluk Lisansı: yıllık geliri 10 milyon doların altındaki kurumlara ticari kullanım
  dahil ücretsiz; Kronikler için ücretsiz sayılır. Wan'a eşdeğer seçenek; yine GPU ister
  (ücretsiz yol: Hugging Face Space'leri, kotalı).
- **Remotion**: yapay zekâ değil, React ile programatik video (fragman, arayüz animasyonu).
  Gerçekçileştirme yapmaz.
- **muapi.ai**: modelleri ücretli kredilerle sunan aracı; kullanılmaz.

Neden burada çalışmaz: makine 4 çekirdek, 15 GB bellek, 24 GB boş disk, GPU yok. LTX-2.x
19B parametre; ağırlıklar bile belleğe sığmaz. Kod ve ağırlık kurulabilir, çalıştırılamaz.

Ücretsiz GPU yolları (ikisi de buradan otomatik sürülebilir):
- **Kaggle not defteri** (önerilen): ücretsiz hesapta haftada ~30 saat T4×2/P100 GPU.
  Kullanıcı Kaggle API anahtarını (`KAGGLE_USERNAME`, `KAGGLE_KEY`) ortam gizlisi olarak
  verir; not defteri `kaggle kernels push` ile gönderilir, çıktı `kaggle kernels output`
  ile alınır. İnternet erişimi için Kaggle hesabı telefonla doğrulanmış olmalı. T4'te
  19B model için nicemlenmiş (fp8/GGUF) sürüm ve bellek boşaltma gerekir; ilk denemede ölç.
- **Hugging Face Space**: `HF_TOKEN` ile `gradio_client`; kuyruk ve günlük kota.

Hat: Blender'da hareket (manken yeterli) → MP4 sürücü video; tek gerçekçi karakter görseli →
Wan 2.2 Animate → 3-5 sn klip → kare dizisi/WebP. Kota yetmezse Cycles render'ı esas alınır.

## Lisans

MPFB GPL-3.0 (yalnız araç, çıktı serbest). MakeHuman CC0 paketleri; shoes03/shirts03
CC-BY → yazar adı `mobile/UCUNCU-TARAF.md` ve Emeği Geçenler'e. CMU verisi serbest
kullanım: "The data used in this project was obtained from mocap.cs.cmu.edu. The
database was created with funding from NSF EIA-0196217." Poly Haven HDRI CC0.
