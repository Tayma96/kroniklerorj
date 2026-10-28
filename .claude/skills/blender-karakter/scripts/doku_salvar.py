# Şalvar dokusu: MakeHuman harem pants dokusundaki çiçek desenini kök boyası kırmızısı yüne çevirir.
# Kullanım: python3 doku_salvar.py <mpfb_kullanıcı_verisi> <çıktı.png>
import sys
import numpy as np
from PIL import Image, ImageFilter
src = sys.argv[1] + "/clothes/toigo_harem_pants/HaremPants.png"
im = Image.open(src).convert("RGBA"); a = np.asarray(im).astype(float)
rgb = a[..., :3]; lum = rgb.mean(-1); sat = rgb.max(-1) - rgb.min(-1)
gray = (sat < 18) & (lum > 60)
mu, sd = lum[gray].mean(), lum[gray].std()
noise = np.random.default_rng(3).normal(0, 1, lum.shape)
n = Image.fromarray((noise * 40 + 128).clip(0, 255).astype("uint8")).filter(ImageFilter.GaussianBlur(1.2))
n = np.asarray(n).astype(float); n = (n - n.mean()) / n.std()
tone = np.where(gray, (lum - mu) / max(sd, 1e-3), n)
out = np.array([112, 34, 26], float)[None, None, :] * (1 + 0.10 * tone[..., None])
dark = (lum < 45) & (sat < 25)
out[dark] = np.array([38, 26, 18]) * (1 + 0.1 * tone[dark][:, None])
Image.fromarray(np.dstack([out.clip(0, 255), a[..., 3]]).astype("uint8"), "RGBA").save(sys.argv[2])
print("doku", sys.argv[2])
