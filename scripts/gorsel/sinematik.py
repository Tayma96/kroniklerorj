"""Kronikler açılış sinematiği: durağan sahnelerden 2.5D paralaks film üretir (yalnız CPU).

Her çekim: Z-Image görseli + Depth Anything V2 derinliği. Kare başına derinlik güdümlü geri eşleme
(dolly/kaydırma/yay), derinliğe duyarlı sis ve duman, 3B parçacıklar (kar, köz, toz, kül, çisenti),
ateş titremesi, ısı dalgası, ışık huzmesi, odak (DOF), renk derecelendirme, hale/ışıma, gren.
Çekim planı `cekim_plani.py` içindedir.

Kullanım:
  python sinematik.py <sahne_klasoru> <cikti_klasoru> [--kare N] [--onizleme ms,ms,...] [--is 4]
"""
from __future__ import annotations

import math
import os
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cekim_plani import CEKIMLER, FPS, H, TOPLAM_MS, W  # noqa: E402

cv2.setNumThreads(1)
HW, HH = W // 2, H // 2  # yarım çözünürlük (haritalar, sis)


# ----------------------------------------------------------------------------- yardımcılar
def kenet(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def yumusak(u):  # sinüs yumuşatma
    u = kenet(u)
    return 0.5 - 0.5 * math.cos(math.pi * u)


def egri(u, tip="io"):
    u = kenet(u)
    if tip == "lin":
        return u
    if tip == "o":  # yavaşlayarak dur
        return 1 - (1 - u) ** 2
    if tip == "i":
        return u * u
    if tip == "yumusak":  # uçlar hafif, orta doğrusal
        return 0.55 * u + 0.45 * yumusak(u)
    return yumusak(u)


def ara(deger, u, tip):
    """deger: sabit, (a, b) ya da [(u0, v0), (u1, v1), ...]"""
    if isinstance(deger, (int, float)):
        return float(deger)
    if isinstance(deger, tuple) and len(deger) == 2 and not isinstance(deger[0], (tuple, list)):
        a, b = deger
        return a + (b - a) * egri(u, tip)
    noktalar = list(deger)
    if u <= noktalar[0][0]:
        return float(noktalar[0][1])
    for (u0, v0), (u1, v1) in zip(noktalar, noktalar[1:]):
        if u <= u1:
            return v0 + (v1 - v0) * yumusak((u - u0) / max(u1 - u0, 1e-6))
    return float(noktalar[-1][1])


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def gurultu_dokusu(n=512, beta=2.4, tohum=0):
    """Döşenebilir fraktal gürültü (0..1)."""
    rng = np.random.default_rng(tohum)
    f = np.fft.fftfreq(n)
    fx, fy = np.meshgrid(f, f)
    r = np.sqrt(fx * fx + fy * fy)
    r[0, 0] = 1.0
    spek = np.fft.fft2(rng.normal(size=(n, n))) / (r ** (beta / 2))
    spek[0, 0] = 0
    t = np.real(np.fft.ifft2(spek))
    lo, hi = np.percentile(t, 1), np.percentile(t, 99)
    return np.clip((t - lo) / (hi - lo), 0, 1).astype(np.float32)


def renk(rgb):  # RGB (0..1) -> BGR dizisi
    r, g, b = rgb
    return np.array([b, g, r], np.float32)


def titresim(t, tohum, hizlar=(1.3, 2.9, 5.7, 9.1)):
    """-1..1 arası düzgün gürültü (ateş, el kamerası)."""
    s = 0.0
    w = 0.0
    for i, f in enumerate(hizlar):
        a = 1.0 / (i + 1)
        s += a * math.sin(t * f * 2 * math.pi + tohum * 7.13 + i * 1.7) * math.sin(t * f * 1.37 + tohum * 3.1 + i)
        w += a
    return s / w


# ----------------------------------------------------------------------------- sahne yükleme
class Sahne:
    def __init__(self, c, klasor):
        self.c = c
        img = cv2.imread(os.path.join(klasor, c["gorsel"]), cv2.IMREAD_COLOR)
        if img is None:
            raise FileNotFoundError(c["gorsel"])
        # 640 px üretimi ~1.3x Lanczos ile büyüt, hafif keskinleştir (ESRGAN bu işlemcide çok yavaş)
        hedef_w = int(c.get("kaynak_w", 832))
        if img.shape[1] < hedef_w:
            f = hedef_w / img.shape[1]
            img = cv2.resize(img, (hedef_w, int(round(img.shape[0] * f))), interpolation=cv2.INTER_LANCZOS4)
            bul = cv2.GaussianBlur(img, (0, 0), 1.4)
            img = cv2.addWeighted(img, 1.4, bul, -0.4, 0)
        self.img = img.astype(np.float32) / 255.0
        self.sh, self.sw = img.shape[:2]
        self.k = self.sw / 720.0  # parçacık/sis hızları ~çıkış pikseli cinsinden
        d = np.load(os.path.join(klasor, c["gorsel"].rsplit(".", 1)[0] + "_d.npy")).astype(np.float32)
        if d.shape != (self.sh, self.sw):
            d = cv2.resize(d, (self.sw, self.sh), interpolation=cv2.INTER_LINEAR)
        self.d_ham = cv2.GaussianBlur(d, (0, 0), 1.2)
        # paralaks için: ön planı hafif genişlet (kenar ön planla birlikte kayar), sonra yumuşat
        r = int(c.get("genislet", 9) * self.sw / 640)
        dil = cv2.dilate(d, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
        self.d_par = cv2.GaussianBlur(dil, (0, 0), c.get("yumusat", 14) * self.sw / 640)
        # yarım çözünürlüklü paralaks derinliği (haritalar için)
        self.olc = 0.5
        self.d_par_k = cv2.resize(self.d_par, (self.sw // 2, self.sh // 2), interpolation=cv2.INTER_AREA)
        # ateş / köz maskesi (sıcak ve parlak bölgeler)
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        hue, sat, val = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
        sicak = ((hue < 45) | (hue > 345)).astype(np.float32)
        self.ates = cv2.GaussianBlur(sicak * smoothstep(0.35, 0.8, sat) * smoothstep(0.45, 0.95, val), (0, 0), 3)
        self.koz = cv2.GaussianBlur(sicak * smoothstep(0.5, 0.9, sat) * smoothstep(0.55, 1.0, val), (0, 0), 1.5)
        self.parlak = smoothstep(0.62, 0.95, cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255)
        # odak düzeyleri için bulanık kopyalar sonradan (çıkış uzayında) yapılır
        tohum = int(c.get("tohum", 1))
        self.doku = [gurultu_dokusu(512, 2.6, tohum * 11 + 1), gurultu_dokusu(512, 2.0, tohum * 11 + 2)]
        self.parcaciklar = [Parcacik(p, self, tohum * 101 + i) for i, p in enumerate(c.get("parcacik", []))]
        # sabit ızgara
        ys, xs = np.mgrid[0:HH, 0:HW].astype(np.float32)
        self.gx = (xs + 0.5) * 2 - W / 2
        self.gy = (ys + 0.5) * 2 - H / 2

    # kamera durumu (u: 0..1 çekim süresi boyunca)
    def kamera(self, u, ts):
        k = self.c["kamera"]
        tip = k.get("egri", "yumusak")
        fit = max(W / self.sw, H / self.sh)
        z = ara(k.get("zoom", 1.08), u, tip)
        S = fit * z
        cx = ara(k.get("x", 0.5), u, tip) * self.sw
        cy = ara(k.get("y", 0.5), u, tip) * self.sh
        dolly = ara(k.get("dolly", 0.0), u, tip)
        tx = ara(k.get("tx", 0.0), u, tip)
        ty = ara(k.get("ty", 0.0), u, tip)
        rol = ara(k.get("rol", 0.0), u, tip)
        el = k.get("el", 0.6)  # el kamerası genliği (çıkış pikseli)
        if el:
            cx += el * titresim(ts * 0.35, 1.0, (0.21, 0.47, 0.93)) / S
            cy += el * titresim(ts * 0.35, 2.0, (0.17, 0.39, 0.81)) / S
            rol += el * 0.06 * titresim(ts * 0.3, 3.0, (0.13, 0.31))
        sars = k.get("sarsinti", 0.0)
        if sars:
            cx += sars * titresim(ts, 4.0, (2.1, 3.7, 6.3)) / S
            cy += sars * titresim(ts, 5.0, (1.9, 4.3, 7.1)) / S
        return dict(S=S, cx=cx, cy=cy, dolly=dolly, tx=tx, ty=ty, rol=math.radians(rol),
                    p0=k.get("pivot", 0.5), pk=k.get("dolly_pivot", 0.0))

    def yansit(self, kam, px, py, dz):
        """Kaynak noktası (px,py) derinlik dz -> çıkış pikseli (dizi)."""
        m = kam["S"] * (1 + kam["dolly"] * (dz - kam["pk"]))
        qx = (px - kam["cx"]) * m + kam["tx"] * (dz - kam["p0"])
        qy = (py - kam["cy"]) * m + kam["ty"] * (dz - kam["p0"])
        c, s = math.cos(kam["rol"]), math.sin(kam["rol"])
        return c * qx - s * qy + W / 2, s * qx + c * qy + H / 2, m

    def haritala(self, kam):
        """Çıkış -> kaynak eşleme haritası (sabit nokta yinelemesi, yarım çözünürlük)."""
        c, s = math.cos(-kam["rol"]), math.sin(-kam["rol"])
        qx = c * self.gx - s * self.gy
        qy = s * self.gx + c * self.gy
        S, cx, cy = kam["S"], kam["cx"], kam["cy"]
        px = cx + qx / S
        py = cy + qy / S
        for _ in range(4):
            dz = cv2.remap(self.d_par_k, px * self.olc, py * self.olc, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
            m = S * (1 + kam["dolly"] * (dz - kam["pk"]))
            px = cx + (qx - kam["tx"] * (dz - kam["p0"])) / m
            py = cy + (qy - kam["ty"] * (dz - kam["p0"])) / m
        return px, py

    def kare(self, ts, u):
        c = self.c
        kam = self.kamera(u, ts)
        px, py = self.haritala(kam)
        # ısı dalgası: haritayı gürültüyle oynat
        if c.get("isi"):
            isi = c["isi"]
            gx = cv2.remap(self.doku[1], (px * 0.9) % 512, (py * 0.9 + ts * 60) % 512, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
            gy = cv2.remap(self.doku[1], (px * 0.9 + 211) % 512, (py * 0.9 + ts * 60 + 97) % 512, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
            bolge = smoothstep(isi.get("y0", 0.5), isi.get("y1", 0.9), py / self.sh)
            px = px + (gx - 0.5) * isi.get("genlik", 3.0) * self.k * bolge
            py = py + (gy - 0.5) * isi.get("genlik", 3.0) * self.k * bolge
        PX = cv2.resize(px, (W, H), interpolation=cv2.INTER_LINEAR)
        PY = cv2.resize(py, (W, H), interpolation=cv2.INTER_LINEAR)
        img = cv2.remap(self.img, PX, PY, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT101)
        dz = cv2.remap(self.d_ham, PX, PY, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

        # ateş titremesi ve köz nefesi
        at = c.get("ates")
        if at:
            mask = cv2.remap(self.ates, PX, PY, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
            yer = cv2.remap(self.doku[0], (PX * 0.5 + ts * 18) % 512, (PY * 0.5 - ts * 40) % 512, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
            f = titresim(ts, 7.0, (1.1, 2.3, 4.7, 8.9))
            kaz = 1 + at.get("genlik", 0.18) * (0.6 * f + 0.8 * (yer - 0.5))
            img = img * (1 + (kaz[..., None] - 1) * mask[..., None])
            # sahneye vuran ateş ışığı (tüm kare, hafif)
            img = img * (1 + at.get("isik", 0.05) * f)
        kz = c.get("koz")
        if kz:
            mask = cv2.remap(self.koz, PX, PY, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
            n1 = cv2.remap(self.doku[0], (PX * 0.8 + ts * 6) % 512, (PY * 0.8 - ts * 9) % 512, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
            n2 = cv2.remap(self.doku[1], (PX * 0.6 - ts * 7) % 512, (PY * 0.6 + ts * 5) % 512, cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
            nefes = (n1 * 0.6 + n2 * 0.4 - 0.5) * 2
            sicak = renk((1.0, 0.45, 0.12))
            img = img + (mask * kz.get("genlik", 0.35) * np.clip(nefes, -0.6, 1))[..., None] * sicak
            img = np.maximum(img, 0)

        # derinliğe bağlı pus (uzak = daha soluk)
        pus = c.get("pus")
        if pus:
            a = pus["guc"] * np.clip(1 - dz, 0, 1) ** pus.get("us", 2.0)
            img = img * (1 - a[..., None]) + a[..., None] * renk(pus["renk"])

        # sis / duman katmanları
        for katman in c.get("sis", []):
            img = self.sis(img, dz, kam, ts, katman)

        # ışık huzmesi
        if c.get("huzme"):
            img = self.huzme(img, c["huzme"], kam, ts)

        # anamorfik parlama: parlak kaynaklardan yatay ince çizgi
        if c.get("parlama"):
            pr = c["parlama"]
            kucuk = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
            lum = cv2.cvtColor(np.clip(kucuk, 0, 4), cv2.COLOR_BGR2GRAY)
            kay = np.clip(lum - pr.get("esik", 0.8), 0, None)
            cizgi = cv2.blur(cv2.blur(kay, (61, 1)), (61, 1))
            cizgi = cv2.GaussianBlur(cizgi, (0, 0), 0.8)
            cizgi = cv2.resize(cizgi, (W, H), interpolation=cv2.INTER_LINEAR)
            img = img + (cizgi * pr.get("guc", 1.5))[..., None] * renk(pr.get("renk", (1.0, 0.62, 0.35)))

        # alan derinliği
        odak = c.get("odak")
        if odak:
            img = self.dof(img, dz, ara(odak["d"], u, "io"), odak.get("acik", 1.0))

        # parçacıklar
        for p in self.parcaciklar:
            img = p.ciz(img, kam, ts, self)

        img = derecelendir(img, c["renk"], dz)
        return img

    def sis(self, img, dz, kam, ts, k):
        derin = k.get("d", 0.3)
        m = kam["S"] * (1 + kam["dolly"] * (derin - kam["pk"]))
        olcek = k.get("olcek", 1.0) * self.k  # doku pikseli başına kaynak pikseli
        vx, vy = k.get("hiz", (12.0, 0.0))
        vx, vy = vx * self.k, vy * self.k
        c, s = math.cos(-kam["rol"]), math.sin(-kam["rol"])
        # çıkış (yarım) -> doku: p = C + R(-rol)(o*2 - merkez - T)/m ; doku = p/olcek + kayma
        a = 2.0 / (m * olcek)
        ox = kam["cx"] / olcek + vx * ts / olcek - (kam["tx"] * (derin - kam["p0"])) / (m * olcek)
        oy = kam["cy"] / olcek + vy * ts / olcek - (kam["ty"] * (derin - kam["p0"])) / (m * olcek)
        M = np.array([[a * c, -a * s, ox - (W / 2) / (m * olcek) * c + (H / 2) / (m * olcek) * s],
                      [a * s, a * c, oy - (W / 2) / (m * olcek) * s - (H / 2) / (m * olcek) * c]], np.float32)
        t1 = cv2.warpAffine(self.doku[0], M, (HW, HH), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
        M2 = M.copy()
        M2[:, :2] *= 0.57
        M2[0, 2] = M2[0, 2] * 0.57 + 131 + ts * vx * 0.6 / olcek
        M2[1, 2] = M2[1, 2] * 0.57 + 77 + ts * vy * 0.6 / olcek
        t2 = cv2.warpAffine(self.doku[1], M2, (HW, HH), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
        yog = np.clip((t1 * 0.65 + t2 * 0.35 - k.get("esik", 0.35)) / (1 - k.get("esik", 0.35)), 0, 1)
        yog = cv2.resize(yog, (W, H), interpolation=cv2.INTER_LINEAR)
        # dikey bant
        if "bant" in k:
            y0, y1, y2, y3 = k["bant"]
            yy = (np.arange(H, dtype=np.float32) / H)[:, None]
            bant = smoothstep(y0, y1, yy) * (1 - smoothstep(y2, y3, yy))
            yog = yog * bant
        # yalnız katmanın arkasında kalan sahneye sis
        arka = 1 - smoothstep(derin - 0.12, derin + 0.06, dz)
        a = np.clip(yog * k.get("guc", 0.5) * arka, 0, 1)[..., None]
        if k.get("katki"):
            return img + a * renk(k["renk"])
        return img * (1 - a) + a * renk(k["renk"])

    def huzme(self, img, hz, kam, ts):
        kucuk = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        lum = cv2.cvtColor(kucuk, cv2.COLOR_BGR2GRAY)
        kaynak = np.clip((lum - hz.get("esik", 0.7)) / (1 - hz.get("esik", 0.7)), 0, 1)
        sx, sy, _ = self.yansit(kam, hz["x"] * self.sw, hz["y"] * self.sh, 0.0)
        sx, sy = sx / 4, sy / 4
        acc = np.zeros_like(kaynak)
        n = 14
        for i in range(n):
            sc = 1 - i * hz.get("boy", 0.035)
            M = np.array([[sc, 0, sx * (1 - sc)], [0, sc, sy * (1 - sc)]], np.float32)
            acc += cv2.warpAffine(kaynak, M, (W // 4, H // 4), flags=cv2.INTER_LINEAR) * (1 - i / n)
        acc /= n / 2
        acc = cv2.GaussianBlur(acc, (0, 0), 2)
        nefes = 1 + 0.12 * titresim(ts * 0.4, 9.0, (0.3, 0.7))
        acc = cv2.resize(acc, (W, H), interpolation=cv2.INTER_LINEAR)
        return img + (acc * hz.get("guc", 0.25) * nefes)[..., None] * renk(hz.get("renk", (1.0, 0.8, 0.5)))

    def dof(self, img, dz, d_odak, acik):
        coc = np.clip(np.abs(dz - d_odak) * acik * 2.2, 0, 1)
        if coc.max() < 0.05:
            return img
        b1 = cv2.GaussianBlur(img, (0, 0), 1.6)
        b2 = cv2.GaussianBlur(cv2.resize(img, (W // 2, H // 2), interpolation=cv2.INTER_AREA), (0, 0), 2.6)
        b2 = cv2.resize(b2, (W, H), interpolation=cv2.INTER_LINEAR)
        w1 = np.clip(coc * 2, 0, 1)[..., None]
        w2 = np.clip(coc * 2 - 1, 0, 1)[..., None]
        out = img * (1 - w1) + b1 * w1
        return out * (1 - w2) + b2 * w2


# ----------------------------------------------------------------------------- parçacıklar
class Parcacik:
    TIP = {
        # renk, boy (px, yakında), hız (kaynak px/sn: x, y), salınım, saydamlık, toplama
        "kar": dict(renk=(0.93, 0.95, 1.0), boy=2.6, hiz=(8, 70), salin=18, opak=0.85, katki=False, iz=0.0),
        "cisenti": dict(renk=(0.75, 0.8, 0.88), boy=0.9, hiz=(-30, 520), salin=2, opak=0.35, katki=False, iz=0.045),
        "koz": dict(renk=(1.0, 0.55, 0.16), boy=1.7, hiz=(6, -60), salin=22, opak=1.0, katki=True, iz=0.06),
        "kul": dict(renk=(0.62, 0.6, 0.58), boy=1.9, hiz=(12, 28), salin=26, opak=0.6, katki=False, iz=0.0),
        "toz": dict(renk=(1.0, 0.86, 0.6), boy=1.3, hiz=(14, -4), salin=14, opak=0.55, katki=True, iz=0.0),
        "kum": dict(renk=(0.78, 0.68, 0.55), boy=1.4, hiz=(160, -10), salin=10, opak=0.45, katki=False, iz=0.03),
    }

    def __init__(self, p, sahne, tohum):
        t = dict(self.TIP[p["tip"]])
        t.update(p)
        self.p = t
        rng = np.random.default_rng(tohum)
        n = int(t.get("sayi", 300))
        self.n = n
        self.x0 = rng.uniform(-0.15, 1.15, n) * sahne.sw
        self.y0 = rng.uniform(-0.15, 1.15, n) * sahne.sh
        d0, d1 = t.get("derinlik", (0.2, 1.0))
        self.dz = rng.uniform(d0, d1, n) ** 0.8
        self.hiz_c = rng.uniform(0.6, 1.4, n)
        self.faz = rng.uniform(0, 2 * math.pi, n)
        self.frek = rng.uniform(0.15, 0.6, n)
        self.parlak = rng.uniform(0.45, 1.0, n)
        self.omur = rng.uniform(2.0, 6.0, n)
        self.aralik = (sahne.sw * 1.3, sahne.sh * 1.3)

    def konum(self, ts, sahne):
        p = self.p
        vx, vy = p["hiz"]
        k = sahne.k
        hiz = self.hiz_c * (0.35 + 0.65 * self.dz) * k  # yakın parçacık ekranda daha hızlı
        x = self.x0 + vx * hiz * ts + p["salin"] * k * np.sin(self.frek * ts * 2 * math.pi + self.faz)
        y = self.y0 + vy * hiz * ts + p["salin"] * k * 0.5 * np.cos(self.frek * 0.7 * ts * 2 * math.pi + self.faz)
        x = (x + 0.15 * sahne.sw) % self.aralik[0] - 0.15 * sahne.sw
        y = (y + 0.15 * sahne.sh) % self.aralik[1] - 0.15 * sahne.sh
        return x, y

    def ciz(self, img, kam, ts, sahne):
        p = self.p
        x, y = self.konum(ts, sahne)
        ox, oy, m = sahne.yansit(kam, x, y, self.dz)
        iz = p.get("iz", 0.0)
        if iz:
            xb, yb = self.konum(ts - iz, sahne)
            bx, by, _ = sahne.yansit(kam, xb, yb, self.dz)
        else:
            bx, by = ox, oy
        boy = p["boy"] * (0.35 + 1.4 * self.dz ** 1.6) * (m / kam["S"])
        parl = self.parlak.copy()
        if p["tip"] == "koz":  # köz: yanıp söner, ömrü dolunca söner
            faz = (ts / self.omur + self.faz) % 1.0
            parl *= np.clip(np.sin(faz * math.pi) * 1.6, 0, 1) * (0.7 + 0.3 * np.sin(ts * 9 * self.frek + self.faz))
        gor = (ox > -20) & (ox < W + 20) & (oy > -20) & (oy < H + 20) & (parl > 0.02)
        # derinlik kümeleri: uzak (bulanık), orta, yakın (bulanık, iri)
        odak = p.get("odak", 0.55)
        kumeler = [(0.0, 0.45), (0.45, 0.8), (0.8, 1.01)]
        sonuc = img
        for d0, d1 in kumeler:
            sec = gor & (self.dz >= d0) & (self.dz < d1)
            if not sec.any():
                continue
            tuval = np.zeros((H, W), np.float32)
            idx = np.nonzero(sec)[0]
            for i in idx:
                r = max(boy[i], 0.6)
                a = float(parl[i])
                if iz and (abs(ox[i] - bx[i]) + abs(oy[i] - by[i])) > 1.0:
                    cv2.line(tuval, (int(bx[i] * 4), int(by[i] * 4)), (int(ox[i] * 4), int(oy[i] * 4)), a,
                             max(1, int(r * 2)), cv2.LINE_AA, shift=2)
                else:
                    cv2.circle(tuval, (int(ox[i] * 4), int(oy[i] * 4)), int(r * 4), a, -1, cv2.LINE_AA, shift=2)
            bul = 0.5 + abs((d0 + d1) / 2 - odak) * p.get("bulanik", 5.0)
            tuval = cv2.GaussianBlur(tuval, (0, 0), bul)
            if p["katki"]:
                parilti = cv2.GaussianBlur(tuval, (0, 0), 6 + bul * 2)
                a = (tuval * 1.6 + parilti * p.get("hale", 1.4)) * p["opak"]
                sonuc = sonuc + a[..., None] * renk(p["renk"])
            else:
                a = np.clip(tuval * p["opak"] * 1.4, 0, 1)[..., None]
                sonuc = sonuc * (1 - a) + a * renk(p["renk"])
        return sonuc


# ----------------------------------------------------------------------------- renk
def derecelendir(img, g, dz):
    img = img * g.get("pozlama", 1.0)
    if "beyaz" in g:
        img = img * renk(g["beyaz"])
    lum = img[..., 0] * 0.114 + img[..., 1] * 0.587 + img[..., 2] * 0.299
    doy = g.get("doygunluk", 1.0)
    img = lum[..., None] + (img - lum[..., None]) * doy
    # bölünmüş tonlama
    if "golge" in g:
        w = np.clip(1 - lum / 0.45, 0, 1)[..., None] ** 1.5
        img = img + w * (renk(g["golge"]) - 0.5) * g.get("golge_guc", 0.15)
    if "isik" in g:
        w = np.clip((lum - 0.45) / 0.55, 0, 1)[..., None] ** 1.5
        img = img + w * (renk(g["isik"]) - 0.5) * g.get("isik_guc", 0.15)
    # kontrast (S eğrisi)
    k = g.get("kontrast", 1.1)
    piv = g.get("pivot", 0.42)
    img = np.clip(img, 0, None)
    alt = piv * (np.minimum(img, piv) / piv) ** k
    ust = 1 - (1 - piv) * (np.clip(1 - img, 0, 1) / (1 - piv)) ** k
    img = np.where(img < piv, alt, np.where(img <= 1, ust, 1 + (img - 1) * 0.5))
    # siyah seviyesi
    sb = g.get("siyah", 0.012)
    img = sb + img * (1 - sb)
    return img


# ----------------------------------------------------------------------------- son işlem
class Film:
    def __init__(self):
        rng = np.random.default_rng(1243)
        self.gren = []
        for _ in range(12):
            g = rng.normal(size=(H, W)).astype(np.float32)
            g = cv2.GaussianBlur(g, (0, 0), 0.75)
            g /= g.std()
            self.gren.append(g)
        ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
        r = np.sqrt(((xs - W / 2) / (W * 0.62)) ** 2 + ((ys - H * 0.46) / (H * 0.62)) ** 2)
        self.vinyet = np.clip(1 - 0.55 * smoothstep(0.55, 1.35, r), 0, 1)[..., None]

    def uygula(self, img, kare_no, gren=0.017, hale=0.10):
        # hale (halation) ve ışıma: parlak bölgelerden kırmızımsı yayılma
        kucuk = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
        lum = cv2.cvtColor(np.clip(kucuk, 0, 4), cv2.COLOR_BGR2GRAY)
        parl = np.clip(lum - 0.62, 0, None)
        g1 = cv2.GaussianBlur(parl, (0, 0), 3)
        g2 = cv2.GaussianBlur(parl, (0, 0), 12)
        isima = cv2.resize(g1 * 0.6 + g2 * 1.2, (W, H), interpolation=cv2.INTER_LINEAR)
        img = img + isima[..., None] * renk((1.0, 0.55, 0.32)) * hale
        img = img * self.vinyet
        # yumuşak omuz (vurgu sıkıştırma)
        img = np.where(img > 0.82, 0.82 + (1 - np.exp(-(img - 0.82) * 5.5)) * 0.18, img)
        # gren (orta tonlarda en güçlü)
        lum = img[..., 0] * 0.114 + img[..., 1] * 0.587 + img[..., 2] * 0.299
        w = gren * (0.35 + 0.65 * np.clip(1 - np.abs(lum * 2 - 0.9), 0, 1))
        g = self.gren[(kare_no * 7) % len(self.gren)]
        img = img + (g * w)[..., None]
        return np.clip(img, 0, 1)


# ----------------------------------------------------------------------------- zaman çizelgesi
def etkinler(ms):
    """Belirli anda görünen çekimler ve ağırlıkları."""
    sonuc = []
    for i, c in enumerate(CEKIMLER):
        a, b = c["bas"], c["son"]
        gir = c.get("gir", ("kes", 0))
        cik = CEKIMLER[i + 1].get("gir", ("kes", 0)) if i + 1 < len(CEKIMLER) else ("kes", 0)
        gt, gs = gir
        ct, cs = cik
        bas_ek = a - (gs / 2 if gt == "erit" else 0)
        son_ek = b + (cs / 2 if ct == "erit" else 0)
        if not (bas_ek <= ms < son_ek):
            continue
        w = 1.0
        if gt == "erit" and ms < a + gs / 2:
            w *= yumusak((ms - (a - gs / 2)) / gs)
        if gt == "kara" and ms < a + gs:
            taban = c.get("taban", 0.0)
            w *= taban + (1 - taban) * yumusak((ms - a) / gs) ** 1.2
        if ct == "kara":
            onceki = c.get("kararma", cs)
            if ms > b - onceki:
                w *= 1 - yumusak((ms - (b - onceki)) / onceki)
        if ct == "erit" and ms > b - cs / 2:
            w *= 1 - yumusak((ms - (b - cs / 2)) / cs)
        sure = son_ek - bas_ek
        sonuc.append((i, w, (ms - bas_ek) / 1000.0, (ms - bas_ek) / sure, gt, ct))
    return sonuc


_SAHNELER = {}


def sahne_al(i, klasor):
    if i not in _SAHNELER:
        _SAHNELER[i] = Sahne(CEKIMLER[i], klasor)
    return _SAHNELER[i]


def kare_uret(kare_no, klasor, film):
    ms = kare_no * 1000.0 / FPS
    akt = etkinler(ms)
    out = np.zeros((H, W, 3), np.float32)
    erit = [a for a in akt if a[1] > 0.0005]
    if len(erit) == 2 and erit[0][5] == "erit":
        (i1, w1, ts1, u1, _, _), (i2, w2, ts2, u2, _, _) = erit
        a = sahne_al(i1, klasor).kare(ts1, u1)
        b = sahne_al(i2, klasor).kare(ts2, u2)
        k = w2 / max(w1 + w2, 1e-6)
        out = a * (1 - k) + b * k
    else:
        for i, w, ts, u, _, _ in erit:
            out = out + sahne_al(i, klasor).kare(ts, u) * w
    return film.uygula(out, kare_no)


def parca_isle(args):
    bas, son, klasor, cikti = args
    film = Film()
    proc = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS),
         "-i", "-", "-c:v", "ffv1", "-level", "3", "-pix_fmt", "yuv420p", cikti], stdin=subprocess.PIPE)
    for n in range(bas, son):
        img = kare_uret(n, klasor, film)
        proc.stdin.write((img * 255 + 0.5).astype(np.uint8).tobytes())
    proc.stdin.close()
    proc.wait()
    return cikti


def main():
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("klasor")
    ap.add_argument("cikti")
    ap.add_argument("--onizleme", default="")
    ap.add_argument("--is", type=int, default=4)
    ap.add_argument("--aralik", default="")
    ap.add_argument("--durgun", default="", help="sira:u:yol,... gren olmadan tek çekim karesi")
    a = ap.parse_args()
    os.makedirs(a.cikti, exist_ok=True)
    toplam = round(TOPLAM_MS * FPS / 1000)
    if a.onizleme:
        film = Film()
        for ms in [float(x) for x in a.onizleme.split(",")]:
            n = int(round(ms * FPS / 1000))
            img = kare_uret(n, a.klasor, film)
            cv2.imwrite(os.path.join(a.cikti, f"kare_{int(ms):05d}.jpg"), (img * 255 + 0.5).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
        return
    if a.durgun:
        film = Film()
        for parca in a.durgun.split(","):
            i, u, yol = parca.split(":")
            c = CEKIMLER[int(i)]
            sure = (c["son"] - c["bas"]) / 1000.0
            img = sahne_al(int(i), a.klasor).kare(float(u) * sure, float(u))
            img = film.uygula(img, 0, gren=0.0)
            cv2.imwrite(yol, (img * 255 + 0.5).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 86, cv2.IMWRITE_JPEG_OPTIMIZE, 1])
        return
    bas, son = 0, toplam
    if a.aralik:
        bas, son = [int(round(float(x) * FPS / 1000)) for x in a.aralik.split(",")]
    n_is = a.is_ if hasattr(a, "is_") else getattr(a, "is")
    sinirlar = np.linspace(bas, son, n_is + 1).astype(int)
    isler = [(int(sinirlar[i]), int(sinirlar[i + 1]), a.klasor, os.path.join(a.cikti, f"parca_{i}.mkv")) for i in range(n_is)]
    with ProcessPoolExecutor(n_is) as ex:
        parcalar = list(ex.map(parca_isle, isler))
    with open(os.path.join(a.cikti, "liste.txt"), "w") as f:
        for p in parcalar:
            f.write(f"file '{os.path.abspath(p)}'\n")
    print("kare", son - bas, "parca", len(parcalar))


if __name__ == "__main__":
    main()
