#!/usr/bin/env bash
# Kalite kanıtı — kareleri telefona uygun MP4'e çevir (H.264, yuv420p, 720x1280, 24 fps).
# Hafif film greni ve vinyet: CG yüzeylerini birleştirir, gürültü giderici izlerini örter.
# Kullanım: bash k07_kurgu.sh <kareler_kökü> <teslim_klasörü>
#   <kök>/bekleme/####.png (96)  <kök>/saldiri/####.png (121, 48 kare/sn hesaplı)  <kök>/yakin/####.png
set -euo pipefail
K="$1"; T="$2"; mkdir -p "$T"
VF="vignette=angle=PI/5.5,noise=alls=5:allf=t+u,format=yuv420p"
ENC=(-c:v libx264 -preset slow -crf 18 -profile:v high -movflags +faststart -an)
# bekleme: 4 sn döngü
ffmpeg -y -loglevel error -framerate 24 -i "$K/bekleme/%04d.png" -vf "$VF" "${ENC[@]}" "$T/bekleme.mp4"
# saldırı: 48 kare/sn hesaplanan kareler -> gerçek hız (her ikinci kare, 24 kare/sn) ve %50 yavaş (tüm kareler, 24 kare/sn)
ffmpeg -y -loglevel error -framerate 48 -i "$K/saldiri/%04d.png" -vf "fps=24,$VF" "${ENC[@]}" "$T/saldiri.mp4"
ffmpeg -y -loglevel error -framerate 24 -i "$K/saldiri/%04d.png" -vf "$VF" "${ENC[@]}" "$T/saldiri_yavas.mp4"
# yakın plan
ffmpeg -y -loglevel error -framerate 24 -i "$K/yakin/%04d.png" -vf "$VF" "${ENC[@]}" "$T/yakin_plan.mp4"
for f in "$T"/*.mp4; do
  printf '%s ' "$(basename "$f")"; ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames -show_entries format=duration,size -of csv=p=0 "$f" | tr '\n' ' '; echo
done
