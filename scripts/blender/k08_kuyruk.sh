#!/usr/bin/env bash
# Kalite kanıtı — tüm hattın sırayla kurulması ve son işleme kuyruğu (ekran kartı yok; 4 çekirdek CPU).
# Kullanım: bash k08_kuyruk.sh <blender> <kaynak_klasoru> <calisma_klasoru> <teslim_klasoru> [kur]
# "kur" verilirse k01..k05 baştan çalışır (yaklaşık 2 dk), yoksa <calisma>/k05.blend kullanılır.
set -euo pipefail
B="$1"; KAY="$2"; IS="$3"; TES="$4"; D="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$IS" "$TES/kareler" "$IS/kare"
if [ "${5:-}" = "kur" ]; then
  "$B" -b --python "$D/k01_karakter.py" -- "$IS/k01.blend"
  "$B" -b "$IS/k01.blend" --python "$D/k02_kilic.py" -- "$IS/k02.blend" "$KAY"
  "$B" -b "$IS/k02.blend" --python "$D/k03_hareket.py" -- "$IS/k03.blend"
  "$B" -b "$IS/k03.blend" --python "$D/k04_kiyafet.py" -- "$IS/k04.blend" "$KAY"
  "$B" -b "$IS/k04.blend" --python "$D/k05_sahne.py" -- "$IS/k05.blend" "$KAY"
fi
SAH="$IS/k05.blend"; R() { "$B" -b "$SAH" --python "$D/k06_isle.py" -- "$@"; }
R saldiri "$IS/kare/saldiri" '{"bulanik":true}'
R bekleme "$IS/kare/bekleme" '{"bulanik":false}'
R kare "$TES/kareler" '{"ornek":64,"bulanik":false,"dosya":"yuz","kam_ozel":{"kemik":"head","oran":0.33,"yon":[-0.40,-0.66,0.02],"lens":85,"f":2.8}}'
R kare "$TES/kareler" '{"ornek":64,"bulanik":false,"dosya":"el_kabza","kam_ozel":{"kemik":"hand_r","oran":0.9,"yon":[-0.30,-0.38,0.10],"lens":85,"f":3.5}}'
R kare "$TES/kareler" '{"ornek":64,"bulanik":false,"dosya":"zirh","kam_ozel":{"kemik":"spine_02","oran":0.5,"yon":[-0.52,-0.78,0.12],"lens":60,"f":3.2}}'
R agirlik "$TES/kareler" '{"ornek":40,"bulanik":false,"dosya":"agirlik"}'
R yakin "$IS/kare/yakin" '{"bulanik":false}'
bash "$D/k07_kurgu.sh" "$IS/kare" "$TES"
echo "KUYRUK BITTI"
