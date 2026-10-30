# Oyun dokuları (sistem python3 + PIL + numpy; Blender gerekmez). Yapay zekâ yok: yeniden boyama + yordamsal.
# Kullanım: python3 doku.py <mpfb_veri> <eldiven_uv.json> <cikis_klasoru> [ayar.json]
# Çıktı (≤1024 px): ten.jpg (eldivenli), gomlek.jpg, salvar.jpg, cizme.jpg, cizme_n.jpg, pul.jpg, pul_n.jpg,
#                  zincir.jpg, zincir_n.jpg, demir_n.jpg, kabza.jpg, kabza_n.jpg
import sys, os, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
D, UVJ, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
C = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else {}
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

def load(p, n=1024):
    return np.asarray(Image.open(p).convert('RGB').resize((n, n), Image.LANCZOS), dtype=np.float32) / 255
def save(a, name, q=88):
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, name), quality=q)
def blur(a, r):
    # kayan noktalı ayrık Gauss (döşenebilir: kenarlar sarar)
    k = np.exp(-0.5 * (np.arange(-int(3 * r) - 1, int(3 * r) + 2) / max(r, 1e-3)) ** 2); k /= k.sum()
    out = a.astype(np.float32)
    for ax in (0, 1):
        acc = np.zeros_like(out)
        for i, w in enumerate(k):
            acc += w * np.roll(out, i - len(k) // 2, axis=ax)
        out = acc
    return out
def luma(a): return a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11
def srgb(c): return np.array(c, dtype=np.float32) / 255
def noise(n, scale, oct=4, seed=0):
    r = np.random.default_rng(seed); acc = np.zeros((n, n), np.float32); amp = 1.0; tot = 0
    for o in range(oct):
        s = max(2, int(n / scale * 2 ** o))
        g = r.random((s, s)).astype(np.float32)
        acc += amp * np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC), dtype=np.float32) / 255
        tot += amp; amp *= 0.5
    return acc / tot
def detail(L, r, lo=0.55, hi=1.5):
    return np.clip((L + 0.02) / (blur(L, r) + 0.02), lo, hi)
def recolor(src, col, r=18, k=0.85, keep=0.0):
    L = luma(src); d = detail(L, r) ** k
    out = srgb(col)[None, None, :] * d[..., None]
    return out * (1 - keep) + src * keep
def height_to_normal(h, strength):
    gy, gx = np.gradient(h)
    n = np.stack([-gx * strength, gy * strength, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5

# ── 1. ten + deri eldiven ──
sk = load(os.path.join(D, "skins/jartur69_middleage_slavic_male_with_genitals_and_beard/Jartur_mid_old_Slavic_Male_with_Genitals_and_Beard_lsdif_lighter.png"))
N = sk.shape[0]
# biraz güneş yanığı, daha az pembe: yetişkin savaşçı teni
tan = np.array(C.get("ten_carp", [0.93, 0.86, 0.78]), np.float32)
sk = np.clip(sk * tan[None, None, :], 0, 1)
mask = Image.new('L', (N, N), 0); dr = ImageDraw.Draw(mask)
for poly in json.load(open(UVJ))["polys"]:
    dr.polygon([(u * N, (1 - v) * N) for u, v in poly], fill=255)
m = np.asarray(mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2.0)), np.float32)[..., None] / 255
# sakal: kısa, gür, koyu kahve (bıyık dahil); kıl yönü için yatay+dikey çizgili gürültü
UVD = json.load(open(UVJ))
bm_ = Image.new('L', (N, N), 0); dr2 = ImageDraw.Draw(bm_)
for w, poly in UVD.get("sakal", []):
    dr2.polygon([(u * N, (1 - v) * N) for u, v in poly], fill=int(255 * min(w, 1)))
bmask = np.asarray(bm_.filter(ImageFilter.GaussianBlur(3.0)), np.float32)[..., None] / 255
r2 = np.random.default_rng(3)
st1 = np.asarray(Image.fromarray((r2.random((N, N // 6)) * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC), np.float32) / 255
st2 = np.asarray(Image.fromarray((r2.random((N // 6, N)) * 255).astype(np.uint8)).resize((N, N), Image.BICUBIC), np.float32) / 255
hair = np.clip(0.55 * st1 + 0.45 * st2 + 0.25 * (r2.random((N, N)).astype(np.float32) - 0.5), 0, 1)
hcol = srgb(C.get("sakal", [40, 30, 24]))[None, None, :] * (0.55 + 0.9 * hair[..., None])
dens = C.get("sakal_yogun", 0.86)
sk = sk * (1 - bmask * dens) + hcol * bmask * dens
L = luma(sk); grain = noise(N, 6, 3, 11)
leather = srgb(C.get("eldiven", [72, 52, 38]))[None, None, :] * (detail(L, 6, 0.6, 1.5) ** 1.0)[..., None] * (0.85 + 0.3 * grain)[..., None]
save(sk * (1 - m) + leather * m, "ten.jpg", 90)

# ── 2. giysiler: dönem renkleri (çivit gömlek, boyasız yün şalvar, koyu deri çizme) ──
tu = load(os.path.join(D, "clothes/rehmanpolanski_viking_tunic/TUNIC_Viking.png"))
save(recolor(tu, C.get("gomlek", [46, 54, 76]), 14, 0.9), "gomlek.jpg")
pa = np.asarray(Image.open(os.path.join(D, "clothes/toigo_wool_pants/Pants_wool.png")).convert('RGB').resize((1024, 1024), Image.LANCZOS), np.float32) / 255
save(recolor(pa, C.get("salvar", [84, 72, 58]), 14, 1.2), "salvar.jpg")
bo = load(os.path.join(D, "clothes/punkduck_medieval_boots/medievalboots.png"))
Lb = luma(bo)
bcol = srgb(C.get("cizme", [62, 44, 32]))[None, None, :] * (np.clip(Lb / max(np.median(Lb[Lb > 0.15]), 0.05), 0.3, 1.6) ** 0.9)[..., None]
save(bcol, "cizme.jpg")
Image.open(os.path.join(D, "clothes/punkduck_medieval_boots/medievalboots_norm.png")).convert('RGB').resize((512, 512), Image.LANCZOS).save(os.path.join(OUT, "cizme_n.jpg"), quality=92)

# ── 3. pul zırh (lamel): 10 lamel × 4 sıra döşeme; her sıra alttakinin üstüne biner ──
T = 1024; NP, NR = 10, 4; PW, RH = T / NP, T / NR
yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
h = np.zeros((T, T), np.float32); col = np.zeros((T, T, 3), np.float32) + srgb([34, 26, 20])[None, None, :]
iron = srgb(C.get("demir", [78, 80, 84])); lace = srgb(C.get("bag", [82, 44, 34]))
for row in range(NR):
    y0 = row * RH; off = (PW / 2) * (row % 2)
    for k in range(-1, NP + 1):
        x0 = k * PW + off
        u = (xx - x0) / PW; v = (yy - y0) / (RH * 1.22)            # lamel alttaki sıraya biraz taşar
        inside = (u > 0.035) & (u < 0.965) & (v >= 0.0) & (v < 1.0)
        cu = np.clip(np.minimum(u - 0.035, 0.965 - u) / 0.16, 0, 1)
        cv = np.clip((1.0 - v) / 0.14, 0, 1) * np.clip(1 - ((np.abs(u - 0.5) / 0.44) ** 6) * (v > 0.86), 0, 1)
        dome = np.sqrt(cu) * np.sqrt(cv)
        hv = 0.25 + 0.55 * dome + 0.2 * (1 - v)                      # üst kenar bir öncekinin altına girer
        upd = inside & (dome > 0) & (hv > h)
        h = np.where(upd, hv, h)
        tint = iron * (0.85 + 0.25 * rng.random())
        col = np.where(upd[..., None], tint[None, None, :] * (0.8 + 0.35 * dome)[..., None], col)
for row in range(NR):
    yb = row * RH + RH * 0.10
    band = (yy >= yb) & (yy < yb + 9)
    h = np.where(band, 0.98 + 0.04 * np.sin(xx / 5.0), h)
    col = np.where(band[..., None], lace[None, None, :] * (0.8 + 0.25 * np.sin(xx / 5.0))[..., None], col)
    for k in range(NP):
        for dx in (0.3, 0.7):
            cx = (k + dx) * PW + (PW / 2) * (row % 2); cy = row * RH + RH * 0.55
            hole = ((xx - cx) % T) ** 2 + (yy - cy) ** 2 < 12
            h = np.where(hole, 0.3, h); col = np.where(hole[..., None], lace[None, None, :] * 0.6, col)
gr_ = noise(T, 40, 4, 3); pit = noise(T, 4, 2, 5)
rust = srgb([88, 62, 46]); rw = np.clip((gr_ - 0.6) / 0.15, 0, 1)[..., None] * 0.25
col = col * (0.9 + 0.2 * pit[..., None]); col = col * (1 - rw) + rust[None, None, :] * rw
h = blur(h, 1.0) + 0.02 * pit
save(col, "pul.jpg"); save(height_to_normal(h, 7.0), "pul_n.jpg", 92)

# ── 4. zincir örgü (yaka/boyunluk): 512 döşeme, halka deseni ──
T = 512; R = 16; NRW = 40; PY = T / NRW
yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
hm = np.zeros((T, T), np.float32)
for j in range(-1, NRW + 2):
    for i in range(-1, T // R + 2):
        cx = i * R + (R / 2) * (j % 2); cy = j * PY
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        ring = np.clip(1 - np.abs(d - R * 0.42) / (R * 0.16), 0, 1)
        hm = np.maximum(hm, ring * (0.8 + 0.2 * ((i + j) % 2)))
save(srgb([104, 106, 110])[None, None, :] * (0.4 + 0.7 * hm)[..., None] * (0.9 + 0.2 * noise(T, 30, 3, 9))[..., None], "zincir.jpg")
save(height_to_normal(blur(hm, 0.8), 4.0), "zincir_n.jpg", 92)

# ── 5. dövme demir (miğfer): çekiç izi normal haritası ──
T = 512
ham = noise(T, 18, 3, 21) * 0.7 + noise(T, 60, 2, 22) * 0.3
save(height_to_normal(blur(ham, 1.5), 3.0), "demir_n.jpg", 92)

# ── 6. kabza sargısı: çapraz deri şerit ──
T = 256
yy, xx = np.mgrid[0:T, 0:T].astype(np.float32)
s = np.sin((xx + yy * 1.0) / T * 2 * np.pi * 6)
hk = np.clip(np.abs(s) ** 0.4, 0, 1)
save(srgb([44, 30, 22])[None, None, :] * (0.55 + 0.6 * hk)[..., None] * (0.9 + 0.2 * noise(T, 8, 2, 4))[..., None], "kabza.jpg")
save(height_to_normal(hk, 3.0), "kabza_n.jpg", 92)
# ── 7. göz / kaş / kirpik (MPFB, küçültülmüş) ──
Image.open(os.path.join(D, "eyes/materials/brown_eye.png")).convert('RGB').resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, "goz.jpg"), quality=90)
for src, dst in (("eyebrows/eyebrow001/eyebrow001.png", "kas.png"), ("eyelashes/eyelashes01/eyelashes01.png", "kirpik.png")):
    Image.open(os.path.join(D, src)).convert('RGBA').resize((256, 256), Image.LANCZOS).save(os.path.join(OUT, dst), optimize=True)
print("DOKU", sorted(os.listdir(OUT)))
