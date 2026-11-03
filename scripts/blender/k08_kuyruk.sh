#!/usr/bin/env bash
# Kalite kanıtı — sürdürülebilir işleme kuyruğu (kesintide yeniden çalıştırılınca hazır kareleri atlar).
# Kullanım: bash k08_kuyruk.sh <blender> <kaynak_klasoru> <calisma_klasoru> <teslim_klasoru> [kur]
# "kur": k01..k05 baştan (yaklaşık 2 dk). İlerleme: <calisma>/kare/*/durum_*.json ve <calisma>/DURUM.txt
set -uo pipefail
B="$1"; KAY="$2"; IS="$3"; TES="$4"; D="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$IS/kare" "$TES/kareler"
if [ "${5:-}" = "kur" ]; then
  "$B" -b --python "$D/k01_karakter.py" -- "$IS/k01.blend" &&
  "$B" -b "$IS/k01.blend" --python "$D/k02_kilic.py" -- "$IS/k02.blend" "$KAY" &&
  "$B" -b "$IS/k02.blend" --python "$D/k03_hareket.py" -- "$IS/k03.blend" &&
  "$B" -b "$IS/k03.blend" --python "$D/k04_kiyafet.py" -- "$IS/k04.blend" "$KAY" &&
  "$B" -b "$IS/k04.blend" --python "$D/k05_sahne.py" -- "$IS/k05.blend" "$KAY" || exit 1
fi
SAH="$IS/k05.blend"
adim() { echo "$(date '+%F %T') $1" >> "$IS/DURUM.txt"; shift; "$B" -b "$SAH" --python "$D/k06_isle.py" -- "$@"; }
adim "saldiri"  saldiri "$IS/kare/saldiri" '{"ornek":64,"bulanik":true}'
adim "bekleme"  bekleme "$IS/kare/bekleme" '{"ornek":32,"bulanik":false}'
adim "yuz"      kare "$TES/kareler" '{"ornek":64,"bulanik":false,"dosya":"yuz","kam_ozel":{"kemik":"head","oran":0.33,"yon":[-0.40,-0.66,0.02],"lens":85,"f":2.8}}'
adim "el"       kare "$TES/kareler" '{"ornek":64,"bulanik":false,"dosya":"el_kabza","kam_ozel":{"kemik":"hand_r","oran":0.9,"yon":[-0.30,-0.38,0.10],"lens":85,"f":3.5}}'
adim "zirh"     kare "$TES/kareler" '{"ornek":64,"bulanik":false,"dosya":"zirh","kam_ozel":{"kemik":"spine_02","oran":0.5,"yon":[-0.52,-0.78,0.12],"lens":60,"f":3.2}}'
adim "agirlik"  agirlik "$TES/kareler" '{"ornek":40,"bulanik":false,"dosya":"agirlik"}'
adim "yakin"    yakin "$IS/kare/yakin" '{"ornek":32,"bulanik":false}'
echo "$(date '+%F %T') kurgu" >> "$IS/DURUM.txt"
bash "$D/k07_kurgu.sh" "$IS/kare" "$TES" && echo "$(date '+%F %T') KUYRUK BITTI" >> "$IS/DURUM.txt"
echo "KUYRUK BITTI"
