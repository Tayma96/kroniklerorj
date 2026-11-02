"""sahneler.json'daki sahneleri Z-Image-Turbo ile (stable-diffusion.cpp, CPU) sırayla üretir.

Kullanım: python sahne_uret.py <sd-cli> <model_klasoru> <cikti_klasoru> [id ...] [--tohum id=tohum ...]
Var olan çıktıyı atlar. Her sahnenin süresi ve komutu cikti_klasoru/uretim.log'a yazılır.
"""
import json
import os
import subprocess
import sys
import time

KOK = os.path.dirname(os.path.abspath(__file__))


def main():
    sd, modeller, cikti = sys.argv[1:4]
    secim = [a for a in sys.argv[4:] if "=" not in a]
    tohum_degis = dict(a.split("=") for a in sys.argv[4:] if "=" in a)
    with open(os.path.join(KOK, "sahneler.json"), encoding="utf-8") as f:
        plan = json.load(f)
    os.makedirs(cikti, exist_ok=True)
    w, h = int(os.environ.get("SAHNE_W", 640)), int(os.environ.get("SAHNE_H", 1136))
    for s in plan["sahneler"]:
        if secim and s["id"] not in secim:
            continue
        tohum = int(tohum_degis.get(s["id"], s["tohum"]))
        hedef = os.path.join(cikti, f"{s['id']}_{tohum}.png")
        if os.path.exists(hedef):
            continue
        komut = [sd, "--diffusion-model", os.path.join(modeller, "z_image_turbo-Q8_0.gguf"),
                 "--llm", os.path.join(modeller, "Qwen3-4B-Instruct-2507-Q8_0.gguf"),
                 "--vae", os.path.join(modeller, "ae.safetensors"),
                 "-p", s["istem"] + plan["ek"], "--cfg-scale", "1.0", "--steps", "8",
                 "--sampling-method", "euler", "-W", str(w), "-H", str(h), "-s", str(tohum),
                 "-t", "4", "--flash-attn", "on", "--params-backend", "te=disk",
                 "--vae-tiling", "--vae-relative-tile-size", "1x2", "--vae-tile-overlap", "0.125", "-o", hedef]
        t0 = time.time()
        r = subprocess.run(komut, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True)
        with open(os.path.join(cikti, "uretim.log"), "a", encoding="utf-8") as f:
            f.write(f"{s['id']} tohum={tohum} sure={time.time() - t0:.0f}s kod={r.returncode}\n")
            if r.returncode:
                f.write(r.stderr[-2000:] + "\n")
    print("BITTI")


if __name__ == "__main__":
    main()
