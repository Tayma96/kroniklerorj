# İnceleme paftaları: kontak sayfaları + ön/yan + baş + ayak kayması çubuk şeritleri
import json, sys, os, glob, math
from PIL import Image, ImageDraw
R, OUT, DIAG = sys.argv[1], sys.argv[2], sys.argv[3]
def lab(im, t):
    d = ImageDraw.Draw(im); d.rectangle([0, 0, 8 * len(t) + 6, 14], fill=(0, 0, 0)); d.text((3, 1), t, fill=(255, 255, 255)); return im
D = json.load(open(DIAG))
for c in ("bekle", "saldir", "savustur"):
    fs = sorted(glob.glob(os.path.join(R, "_kare_%s_*.png" % c)))
    ims = [Image.open(f).convert('RGB') for f in fs]; w, h = ims[0].size; cols = 8 if len(ims) > 9 else len(ims)
    rows = math.ceil(len(ims) / cols); sheet = Image.new('RGB', (cols * w, rows * h + 22), (30, 30, 30))
    con = D[c].get("contact")
    for i, (f, im) in enumerate(zip(fs, ims)):
        fr = int(f.split('_')[-1][:3]); t = "%s k%d %.2fs" % (c, fr, fr / 30) + (" TEMAS" if con is not None and abs(fr - con) <= 2 else "")
        sheet.paste(lab(im, t), ((i % cols) * w, (i // cols) * h + 22))
    ImageDraw.Draw(sheet).text((6, 5), "%s: %d kare, %.2f s, her 4. kare%s" % (c, D[c]["N"], D[c]["sure"], ("; temas k%d (%.2f s)" % (con, con / 30)) if con is not None else "; dongu"), fill=(255, 255, 255))
    sheet.save(os.path.join(OUT, "kontak_%s.png" % c))
a, b = Image.open(os.path.join(R, "muhafiz_on.png")).convert('RGB'), Image.open(os.path.join(R, "muhafiz_yan.png")).convert('RGB')
im = Image.new('RGB', (a.width + b.width, a.height)); im.paste(lab(a, "muhafiz - on"), (0, 0)); im.paste(lab(b, "muhafiz - yan"), (a.width, 0)); im.save(os.path.join(OUT, "muhafiz_on_yan.png"))
a, b = Image.open(os.path.join(R, "bas_34.png")).convert('RGB'), Image.open(os.path.join(R, "bas_yan.png")).convert('RGB')
im = Image.new('RGB', (a.width + b.width, a.height)); im.paste(a, (0, 0)); im.paste(b, (a.width, 0)); im.save(os.path.join(OUT, "bas_migfer_yakin.png"))
# ayak kayması: yan görünüm çubuk şeritleri, önce (FK, kilitsiz) / sonra (IK kilit); ayak izleri ve kayma (cm)
BONES = [("pelvis", 'k'), ("spine_01", 'k'), ("spine_02", 'k'), ("spine_03", 'k'), ("neck_01", 'k'), ("head", 'k'),
         ("thigh_l", 'r'), ("calf_l", 'r'), ("foot_l", 'r'), ("ball_l", 'r'), ("thigh_r", 'b'), ("calf_r", 'b'), ("foot_r", 'b'), ("ball_r", 'b'),
         ("clavicle_l", 'r'), ("upperarm_l", 'r'), ("lowerarm_l", 'r'), ("clavicle_r", 'b'), ("upperarm_r", 'b'), ("lowerarm_r", 'b')]
COL = {'k': (20, 20, 20), 'r': (200, 40, 40), 'b': (40, 70, 200)}
rows_out = []
for c in ("saldir", "savustur"):
    fr = D[c]["frames"]; idx = list(range(0, len(fr), 4)); W, H, S_ = 120, 210, 105
    for key, ttl in (("raw_j", "ONCE (kilitsiz FK)"), ("j", "SONRA (IK ayak kilidi)")):
        strip = Image.new('RGB', (W * len(idx) + 170, H), (250, 250, 248)); d = ImageDraw.Draw(strip)
        ref = {s: fr[0][key]["foot_" + s][0] for s in "lr"}; mx = 0.0
        for i, f in enumerate(fr):
            for s in "lr":
                p = f[key]["foot_" + s][0]; mx = max(mx, math.dist(p[:2] + [p[2]], ref[s]))
        for n, i in enumerate(idx):
            J = fr[i][key]; ox = 170 + n * W + W // 2
            P = lambda p: (ox + p[1] * -S_ * 0 + p[1] * S_ * -1 * -1 if False else ox - p[1] * S_, H - 12 - p[2] * S_)
            d.line([(ox - 50, H - 12), (ox + 50, H - 12)], fill=(160, 160, 160))
            for bn, cc in BONES:
                if bn in J: d.line([P(J[bn][0]), P(J[bn][1])], fill=COL[cc], width=2)
            for s in "lr":
                p0 = ref[s]; p = J["foot_" + s][0]
                d.ellipse([P(p0)[0] - 3, P(p0)[1] - 3, P(p0)[0] + 3, P(p0)[1] + 3], outline=(0, 160, 0))
                d.line([P(p0), P(p)], fill=(0, 160, 0), width=2)
            d.text((ox - 40, 3), "k%d" % i, fill=(0, 0, 0))
        d.text((6, 20), c, fill=(0, 0, 0)); d.text((6, 40), ttl, fill=(0, 0, 0)); d.text((6, 60), "ayak kaymasi maks", fill=(0, 0, 0)); d.text((6, 78), "%.1f cm" % (mx * 100), fill=(180, 0, 0) if mx > 0.01 else (0, 120, 0))
        rows_out.append(strip); print("KAYMA", c, key, "%.2f cm" % (mx * 100))
Wm = max(r.width for r in rows_out); im = Image.new('RGB', (Wm, sum(r.height for r in rows_out)), (255, 255, 255)); y = 0
for r in rows_out: im.paste(r, (0, y)); y += r.height
im.save(os.path.join(OUT, "ayak_kayma_once_sonra.png"))
print("PAFTA", sorted(os.listdir(OUT)))
