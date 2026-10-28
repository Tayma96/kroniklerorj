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

## Lisans

MPFB GPL-3.0 (yalnız araç, çıktı serbest). MakeHuman CC0 paketleri; shoes03/shirts03
CC-BY → yazar adı `mobile/UCUNCU-TARAF.md` ve Emeği Geçenler'e. CMU verisi serbest
kullanım: "The data used in this project was obtained from mocap.cs.cmu.edu. The
database was created with funding from NSF EIA-0196217." Poly Haven HDRI CC0.
