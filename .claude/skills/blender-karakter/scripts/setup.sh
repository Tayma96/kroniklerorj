#!/usr/bin/env bash
# Blender 4.2 LTS + MPFB + MakeHuman CC0/CC-BY varlıkları + CMU hareketi + HDRI.
# Kullanım: bash setup.sh [hedef_klasör]   (varsayılan: $HOME/kronikler-blender)
# Ekransız çalışır; yalnız ücretsiz kaynaklar. Toplam indirme ~850 MB.
set -euo pipefail
S="$(cd "$(dirname "$0")" && pwd)"
K="${1:-$HOME/kronikler-blender}"; BV=4.2.23
mkdir -p "$K"/{packs,parts,mocap,hdri,doku}; cd "$K"
if [ ! -x "blender-$BV-linux-x64/blender" ]; then
  curl -sSL -o blender.tar.xz "https://download.blender.org/release/Blender4.2/blender-$BV-linux-x64.tar.xz"
  tar -xf blender.tar.xz && rm blender.tar.xz
fi
B="$K/blender-$BV-linux-x64/blender"
# MPFB (GPL-3.0) resmî eklenti platformundan
URL=$(curl -sS "https://extensions.blender.org/api/v1/extensions/?q=mpfb" | python3 -c "import json,sys; d=json.load(sys.stdin); print([e for e in d['data'] if e['id']=='mpfb'][0]['archive_url'])")
curl -sSL -o mpfb.zip "$URL"
"$B" -b --factory-startup -c extension install-file -r user_default -e mpfb.zip >/dev/null
UD=$("$B" -b --python-expr "from bl_ext.user_default.mpfb.services.locationservice import LocationService as L; print('UD='+L.get_user_data())" 2>/dev/null | sed -n 's/^UD=//p')
mkdir -p "$UD"
# Varlık sunucusu tek bağlantıda yavaş: her paketi parçalara bölüp iki aynadan paralel indir.
pget() {
  local p=$1 suf=$2 n=$3 url="asset_packs/$1/$1_$2.zip" size chunk i a b h
  [ -s "packs/$p.zip" ] && return 0
  size=$(curl -sSIL --max-time 30 "https://files.makehumancommunity.org/$url" | grep -i content-length | tail -1 | tr -dc 0-9)
  mkdir -p "parts/$p"; chunk=$(( (size + n - 1) / n ))
  for i in $(seq 0 $((n-1))); do
    a=$((i*chunk)); b=$((a+chunk-1)); [ $b -ge "$size" ] && b=$((size-1))
    h=$([ $((i%2)) -eq 0 ] && echo files2 || echo files)
    ( for t in 1 2 3 4 5; do curl -sSL --max-time 900 -r $a-$b -o "parts/$p/$i" "https://$h.makehumancommunity.org/$url" && [ "$(stat -c%s "parts/$p/$i")" -eq $((b-a+1)) ] && break; sleep 2; done ) &
  done; wait
  cat $(for i in $(seq 0 $((n-1))); do echo "parts/$p/$i"; done) > "packs/$p.zip"; rm -rf "parts/$p"
}
for spec in makehuman_system_assets:cc0:16 skins01:cc0:8 skins02:cc0:8 suits02:cc0:16 pants01:cc0:4 equipment01:cc0:4 shoes03:ccby:8 shirts03:ccby:8; do
  IFS=: read -r p suf n <<< "$spec"; pget "$p" "$suf" "$n" &
done; wait
for z in packs/*.zip; do python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$z" "$UD"; done
# CMU hareket yakalama (denek 2: yürüme, yumruk, kılıç oyunu) → BVH, 30 kare/sn
for f in 02.asf 02_01.amc 02_05.amc 02_07.amc 02_08.amc 02_09.amc; do [ -s "mocap/$f" ] || curl -sS -o "mocap/$f" "http://mocap.cs.cmu.edu/subjects/02/$f"; done
for m in 01 05 07 08 09; do python3 "$S/amc2bvh.py" mocap/02.asf "mocap/02_$m.amc" "mocap/02_$m.bvh" 4; done
[ -s hdri/kloof.hdr ] || curl -sS -o hdri/kloof.hdr https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloofendal_48d_partly_cloudy_puresky_2k.hdr
python3 "$S/doku_salvar.py" "$UD" doku/salvar_kizil.png
echo "HAZIR blender=$B veri=$UD klasör=$K"
