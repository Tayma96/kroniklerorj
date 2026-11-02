#!/bin/bash
# Açılış sinematiği hattı: seçilen sahneler -> derinlik -> 2.5D kareler -> H.264 giris.mp4 + kapak + bölüm kareleri.
# Kullanım: sinematik_kur.sh <secilen_klasor> <is_klasoru> [hedef_kbps]
# secilen_klasor: b1_kosedag_sis.png ... (cekim_plani.py adları). Ortam: PY (venv python), DA2 (depth onnx).
set -euo pipefail
SEC=$1
IS=$2
KBPS=${3:-1550}
KOK=$(cd "$(dirname "$0")" && pwd)
DEPO=$(cd "$KOK/../.." && pwd)
HEDEF=$DEPO/mobile/assets/sinematik
PY=${PY:-python3}

for f in "$SEC"/*.png; do
  d="${f%.png}_d.npy"
  [ -f "$d" ] || "$PY" -I "$KOK/derinlik.py" "$DA2" "$f" "$d" > /dev/null
done

rm -rf "$IS/parca"
"$PY" -I "$KOK/sinematik.py" "$SEC" "$IS/parca" --is 4
ffmpeg -y -loglevel error -f concat -safe 0 -i "$IS/parca/liste.txt" -c copy "$IS/ham.mkv"

# iki geçişli H.264 (high, yuv420p, sessiz, faststart)
cd "$IS"
ORTAK=(-c:v libx264 -preset veryslow -profile:v high -level 4.0 -pix_fmt yuv420p -b:v ${KBPS}k -maxrate 3000k -bufsize 6000k
       -x264-params "aq-mode=3:aq-strength=0.9:psy-rd=1.0,0.15:deblock=-1,-1:keyint=125:min-keyint=25" -r 25 -an)
ffmpeg -y -loglevel error -i ham.mkv "${ORTAK[@]}" -pass 1 -f mp4 /dev/null
ffmpeg -y -loglevel error -i ham.mkv "${ORTAK[@]}" -pass 2 -movflags +faststart "$HEDEF/giris.mp4"

# kapak: ilk okunur kare (kararmadan açılış sürerken 2.6 sn'deki kare) yerine ilk tam kare
ffmpeg -y -loglevel error -ss 2.8 -i ham.mkv -frames:v 1 -q:v 3 "$HEDEF/giris_kapak.jpg"
ls -la "$HEDEF/giris.mp4" "$HEDEF/giris_kapak.jpg"
