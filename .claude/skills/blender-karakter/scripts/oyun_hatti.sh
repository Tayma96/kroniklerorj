#!/bin/bash
# Oyun karakteri hattı (GLB): build_char → game_prep → doku → equip → game_anim → clip_check → export_glb → verify_glb
# Kullanım: B=<blender> D=<MPFB veri> bash oyun_hatti.sh <çalışma_klasörü> <çıktı.glb>
# Kural: tek Blender, nice -n10 -t 3; Python hatası zinciri durdurur.
set -eo pipefail
K=$(cd "$(dirname "$0")" && pwd); W=$1; OUT=$2; cd "$W"
R="nice -n10 $B -b -t 3 --python-exit-code 1"
D=${D:-/root/.config/blender/4.2/extensions/.user/user_default/mpfb/data}
[ -f char.blend ] || $R --python $K/build_char.py -- $W/char.blend '{"rig":"game_engine","skin":"jartur69_middleage_slavic_male_with_genitals_and_beard/jartur69_middleage_slavic_male_with_genitals_and_beard.mhmat","macro":{"age":0.64,"muscle":0.8,"weight":0.6,"height":0.62,"proportions":0.65,"race":{"asian":0.3,"caucasian":0.65,"african":0.05}},"hair":"","eyebrows":"eyebrow001","clothes":["rehmanpolanski_viking_tunic","toigo_wool_pants","punkduck_medieval_boots"],"subdiv":0}' | grep -E '^KAYDEDILDI'
$R char.blend --python $K/game_prep.py -- $W/base.blend "{\"uv\":\"$W/eldiven_uv.json\"}" | grep -E '^(GOVDE|SAKAL|TOPLAM)'
python3 $K/doku.py "$D" $W/eldiven_uv.json $W/tex | tail -1
$R base.blend --python $K/equip.py -- $W/equip.blend "{\"tex\":\"$W/tex\",\"zirh_pay\":0.014,\"boyunluk_pay\":0.018}" | grep -E '^(KAVRAMA|MIGFER|GIZLI|TOPLAM)' | cut -c1-160
$R equip.blend --python $K/game_anim.py -- $W/anim.blend $K/game_clips.json $W/diag.json | grep -E '^(BAS|MUHAFIZ|KLIP)' | cut -c1-200
$R anim.blend --python $K/clip_check.py | grep -E '^(POZ|KONTROL)' | cut -c1-200
$R anim.blend --python $K/export_glb.py -- "$OUT" | grep -E '^GLB'
$R --python $K/verify_glb.py -- "$OUT" $W/chk | grep -E '^(DOSYA|  TOPLAM|BUTCE|OLCUM)'
