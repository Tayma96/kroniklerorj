"""sahneler.json sahnelerini çalışan bir sd-server'a (stable-diffusion.cpp) sırayla ürettirir.

Model bir kez yüklenip bellekte kalır; yavaş diskte sahne başına ~11 GB yeniden okuma olmaz.
Sunucu: sd-server --diffusion-model z_image_turbo-Q8_0.gguf --llm Qwen3-4B-Instruct-2507-Q8_0.gguf
        --vae ae.safetensors --cfg-scale 1.0 -t 4 --flash-attn on --listen-port 7861
Kullanım: python sahne_sunucu.py <cikti_klasoru> [id ...] [id=tohum ...]
"""
import base64
import json
import os
import sys
import time
import urllib.request

KOK = os.path.dirname(os.path.abspath(__file__))
ADRES = os.environ.get("SD_ADRES", "http://127.0.0.1:7861")
W, H = int(os.environ.get("SAHNE_W", 640)), int(os.environ.get("SAHNE_H", 1136))
# 384 px VAE parçaları: metin kodlayıcı bellekte dururken 14.3 GB sınırının altında kalmak için (640x632 parça OOM verdi)
EK = {"vae_tiling_params": {"enabled": True, "tile_size_w": 384, "tile_size_h": 384, "target_overlap": 0.125}}


def main():
    cikti = sys.argv[1]
    secim = [a for a in sys.argv[2:] if "=" not in a]
    tohum_degis = dict(a.split("=") for a in sys.argv[2:] if "=" in a)
    with open(os.path.join(KOK, "sahneler.json"), encoding="utf-8") as f:
        plan = json.load(f)
    os.makedirs(cikti, exist_ok=True)
    for s in plan["sahneler"]:
        if secim and s["id"] not in secim:
            continue
        tohum = int(tohum_degis.get(s["id"], s["tohum"]))
        hedef = os.path.join(cikti, f"{s['id']}_{tohum}.png")
        if os.path.exists(hedef):
            continue
        govde = {"prompt": s["istem"] + plan["ek"] + f"<sd_cpp_extra_args>{json.dumps(EK)}</sd_cpp_extra_args>",
                 "width": W, "height": H, "steps": 8, "cfg_scale": 1.0, "seed": tohum, "sampler_name": "euler",
                 "batch_size": 1}
        t0 = time.time()
        istek = urllib.request.Request(ADRES + "/sdapi/v1/txt2img", data=json.dumps(govde).encode(),
                                       headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(istek, timeout=7200) as r:
                yanit = json.load(r)
            with open(hedef, "wb") as f:
                f.write(base64.b64decode(yanit["images"][0]))
            durum = "kod=0"
        except Exception as e:  # noqa: BLE001
            durum = f"hata={e!r}"
        with open(os.path.join(cikti, "uretim.log"), "a", encoding="utf-8") as f:
            f.write(f"{s['id']} tohum={tohum} sure={time.time() - t0:.0f}s {durum} (sunucu)\n")
    print("BITTI")


if __name__ == "__main__":
    main()
