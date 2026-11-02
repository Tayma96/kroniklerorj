#!/usr/bin/env bash
# Kalite kanıtı sahnesi için CC0 kaynakları indirir (Poly Haven, ambientCG, Quaternius UAL).
# Kullanım: bash kaynak_indir.sh <hedef_klasör>
# Lisanslar: Poly Haven CC0, ambientCG CC0, Quaternius Universal Animation Library CC0.
set -euo pipefail
K="${1:?hedef klasör}"; mkdir -p "$K"/{tex,hdri,ual}
ph() { # Poly Haven doku: id çözünürlük
  local id=$1 r=$2
  [ -s "$K/tex/$id/.tamam" ] && return 0
  mkdir -p "$K/tex/$id"
  curl -sS "https://api.polyhaven.com/files/$id" | python3 -c "
import json,sys
d=json.load(sys.stdin); r='$r'
for m in ['Diffuse','nor_gl','Rough','AO','Displacement','arm']:
    if m in d and r in d[m]:
        f=d[m][r].get('jpg') or d[m][r].get('png'); print(m, f['url'])
" | while read -r m u; do curl -sS -o "$K/tex/$id/${m}.${u##*.}" "$u"; done
  touch "$K/tex/$id/.tamam"
}
acg() { # ambientCG malzeme: id çözünürlük (1K/2K)
  local id=$1 r=$2
  [ -d "$K/tex/$id" ] && return 0
  mkdir -p "$K/tex/$id"
  curl -sSL -o "$K/tex/$id.zip" "https://ambientcg.com/get?file=${id}_${r}-JPG.zip"
  python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$K/tex/$id.zip" "$K/tex/$id"
  rm -f "$K/tex/$id.zip"
}
for t in dry_ground_rocks rough_linen denim_fabric brown_leather fabric_leather_02; do ph $t 2k & done
for t in Chainmail004 Metal046A Metal009; do acg $t 2K & done
wait
[ -s "$K/hdri/kiara.hdr" ] || curl -sS -o "$K/hdri/kiara.hdr" \
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/kiara_7_late-afternoon_4k.hdr"
# Quaternius UAL Standard (CC0, "name your own price" = 0): itch.io ücretsiz indirme akışı
if [ ! -s "$K/ual/UAL1_Standard.glb" ]; then
  P=https://quaternius.itch.io/universal-animation-library; J="$K/ual/cj"
  T=$(curl -sS -c "$J" "$P" | grep -o 'csrf_token" value="[^"]*"' | head -1 | sed 's/.*value="//;s/"$//')
  DP=$(curl -sS -b "$J" -c "$J" -X POST --data-urlencode "csrf_token=$T" "$P/download_url" | python3 -c "import json,sys; print(json.load(sys.stdin)['url'])")
  UP=$(curl -sS -b "$J" -c "$J" "$DP" | grep -o 'data-upload_id="[0-9]*"' | head -1 | tr -dc 0-9)
  U=$(curl -sS -b "$J" -c "$J" -X POST --data-urlencode "csrf_token=$T" \
      "$P/file/$UP?source=view_game&as_props=1&after_download_lightbox=true" | python3 -c "import json,sys; print(json.load(sys.stdin)['url'])")
  curl -sSL -o "$K/ual/ual.zip" "$U"
  python3 -c "
import zipfile,sys
z=zipfile.ZipFile(sys.argv[1])
open(sys.argv[2],'wb').write(z.read('Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb'))
open(sys.argv[3],'wb').write(z.read('Universal Animation Library[Standard]/License.txt'))
" "$K/ual/ual.zip" "$K/ual/UAL1_Standard.glb" "$K/ual/LISANS.txt"
  rm -f "$K/ual/ual.zip" "$J"
fi
echo "KAYNAK HAZIR $K"; du -sh "$K"
