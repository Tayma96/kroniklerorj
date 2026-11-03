# Bekleme döngüsünün dikişini kapatır: 2. döngünün son 8 karesi, aynı evredeki 1. döngü kareleriyle çapraz geçer.
# Son kare 1. döngünün 96. karesi olur; o da kumaş benzetiminde 2. döngünün 1. karesinden hemen önce gelir -> dikişsiz.
# Kullanım: python3 dongu_dikis.py <bekleme_klasoru(96)> <d1_klasoru(8)> <cikti_klasoru>
import sys, os
from PIL import Image
a, d1, out = sys.argv[1:4]; os.makedirs(out, exist_ok=True)
for k in range(1, 97):
    im = Image.open(os.path.join(a, f"{k:04d}.png")).convert("RGB")
    if k > 88:
        w = (k - 88) / 8.0
        w = w * w * (3 - 2 * w)
        im = Image.blend(im, Image.open(os.path.join(d1, f"{k - 88:04d}.png")).convert("RGB"), w)
    im.save(os.path.join(out, f"{k:04d}.png"))
print("DONGU", out)
