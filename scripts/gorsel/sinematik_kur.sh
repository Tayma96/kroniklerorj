#!/bin/bash
# Açılış sinematiği hattı: seçilen sahneler -> derinlik -> 2.5D kareler -> H.264 giris.mp4 + kapak + bölüm kareleri.
# Kullanım: sinematik_kur.sh <secilen_klasor> <is_klasoru> [hedef_kbps]
# secilen_klasor: cekim_plani.py'deki adlarla PNG'ler (rotus.py uygulanmış). Ortam: PY (venv python), DA2 (depth onnx).
set -euo pipefail
SEC=$1
IS=$2
KBPS=${3:-1150}
KOK=$(cd "$(dirname "$0")" && pwd)
DEPO=$(cd "$KOK/../.." && pwd)
HEDEF=$DEPO/mobile/assets/sinematik
PY=${PY:-python3}
mkdir -p "$IS" "$HEDEF/giris_sahneler"

for f in "$SEC"/*.png; do
  d="${f%.png}_d.npy"
  [ -f "$d" ] || "$PY" -I "$KOK/derinlik.py" "$DA2" "$f" "$d" > /dev/null
done

rm -rf "$IS/parca"
"$PY" -I "$KOK/sinematik.py" "$SEC" "$IS/parca" --is 4
ffmpeg -y -loglevel error -f concat -safe 0 -i "$IS/parca/liste.txt" -c copy "$IS/ham.mkv"

# iki geçişli H.264 (High, yuv420p, sessiz, faststart, her 5 sn'de bir anahtar kare)
cd "$IS"
ORTAK=(-c:v libx264 -preset veryslow -profile:v high -level 4.0 -pix_fmt yuv420p -b:v ${KBPS}k -maxrate 2600k -bufsize 5200k
       -x264-params "aq-mode=3:aq-strength=0.9:psy-rd=1.0,0.15:deblock=-1,-1:keyint=125:min-keyint=25" -r 25 -an
       -color_primaries bt709 -color_trc bt709 -colorspace bt709)
ffmpeg -y -loglevel error -i ham.mkv "${ORTAK[@]}" -pass 1 -f mp4 /dev/null
ffmpeg -y -loglevel error -i ham.mkv "${ORTAK[@]}" -pass 2 -movflags +faststart "$HEDEF/giris.mp4"

# kapak (ilk çekimin açılış kadrajı, tam pozlama) ve bölüm kareleri (gren yok): sira:u:yol
"$PY" -I "$KOK/sinematik.py" "$SEC" "$IS/durgun" --durgun \
"0:0.0:$HEDEF/giris_kapak.jpg,1:0.5:$HEDEF/giris_sahneler/bolum1.jpg,3:0.5:$HEDEF/giris_sahneler/bolum2.jpg,\
5:0.6:$HEDEF/giris_sahneler/bolum3.jpg,6:0.5:$HEDEF/giris_sahneler/bolum4.jpg,8:0.6:$HEDEF/giris_sahneler/bolum5.jpg"
ls -la "$HEDEF/giris.mp4" "$HEDEF/giris_kapak.jpg" "$HEDEF/giris_sahneler"
