# 3D kalite kanıtı — Selçuklu piyadesi (yeniden üretilebilir hat)

Yapay zekâ ile model, doku ya da hareket üretimi yok. Her şey Blender 4.2 LTS betikleriyle ve aşağıdaki
açık lisanslı kaynaklarla kurulur. Rastgelelik tohumu her betikte `1243`.

## Sıra

| Adım | Betik | Ne yapar |
|---|---|---|
| 0 | `.claude/skills/blender-karakter/scripts/setup.sh`, `kaynak_indir.sh` | Blender + MPFB + MakeHuman varlıkları; Poly Haven/ambientCG dokuları, HDRI, Quaternius UAL |
| 1 | `k01_karakter.py` | MPFB yetişkin erkek (~35 yaş), yüz hedefleri + hafif asimetri, `game_engine` iskeleti, SSS cilt, kahve göz, eğri (Curves) sakal/kaş |
| 2 | `k02_kilic.py` | Hafif eğri tek ağızlı kılıç (78 cm namlu, sicim sargılı kabza); yumruk kurulup kabza yumruğun kanalına oturtulur |
| 3 | `k03_hareket.py` | Gardda bekleme (4 sn döngü), çapraz iniş kesiği (2.5 sn, 48 kare/sn hesap), ağırlık testi pozları; analitik IK |
| 4 | `k04_kiyafet.py` | Entari + yırtmaçlı etek, kumaşla oturtulmuş şalvar, voksel çizme, GN lamel zırh + deri bağ, kemer, kın, konik miğfer, zincir boyunluk |
| 5 | `k05_sahne.py` | HDRI (güneş diski kırpılır) + tek güneş + yansıtıcı, toprak/çakıl/kuru ot, kameralar, kumaş benzetimi ayarları |
| 6 | `k06_isle.py` | Klip işleme (NLA ön-koşu, kumaş sırayla), kare yazma |
| 7 | `k07_kurgu.sh`, `dongu_dikis.py` | ffmpeg: H.264 720x1280 24 fps, hafif gren + vinyet; bekleme döngüsünün son 8 karesi önceki döngüyle çapraz geçer |
| — | `k08_kuyruk.sh` | Hepsini sırayla çalıştırır |
| denetim | `denetim.py`, `cubuk.py`, `pafta_wb.py`, `onizle.py` | Ölçüyle denetim (ayak kayması, taban, kılıç/gövde aralığı), çubuk ve Workbench paftaları |

## Kaynaklar ve lisanslar

- MakeHuman / MPFB 2 (GPL-3.0 araç; çıktı CC0): gövde, `jartur69_middleage_slavic_male...` derisi, göz, kirpik, diş.
- Poly Haven (CC0): `kiara_7_late-afternoon` HDRI; `dry_ground_rocks`, `rough_linen`, `denim_fabric`, `brown_leather`, `fabric_leather_02` dokuları.
- ambientCG (CC0): `Chainmail004`, `Metal046A`, `Metal009`.
- Quaternius Universal Animation Library Standard (CC0): `Sword_Attack`/`Sword_Idle` evre zamanlaması için incelendi.
- CMU Graphics Lab Motion Capture (ticari kullanım serbest): `02_07–02_09` incelendi. "The data used in this project was obtained from mocap.cs.cmu.edu. The database was created with funding from NSF EIA-0196217."

Not: UAL ve CMU kayıtları doğrudan aktarılmadı (UAL oyun tarzı kambur gard ve aşırı hamle; CMU deneği acemi
ve el yönelimi gürültülü). Hareket elle anahtarlandı; zamanlama UAL kesiğinin evrelerinden alındı.
