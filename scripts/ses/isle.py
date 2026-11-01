#!/usr/bin/env python3
"""Üretilmiş sesi oyuna hazırlar — yalnız numpy + ffmpeg.

  python3 -I scripts/ses/isle.py girdi cikti [--lufs -30] [--dongu] [--cizgi 50] [--alcak 0] [--yuksek 0]
                                 [--kes] [--sol 0] [--sag 0] [--mono]

--cizgi F0  : üretim modelinin F0 katlarındaki (ElevenLabs çıktılarında 50 Hz) sabit spektral çizgileri,
              900 Hz–12 kHz arasında komşu medyanının 2,5 katını aşan kutularda bastırır (STFT, döngüde dairesel).
--dongu     : işlemler dairesel yapılır; dikiş korunur.
--kes       : baştaki -55 dBFS altı sessizliği atar (arayüz/efekt).
--sol/--sag : ms cinsinden giriş/çıkış yumuşatması (dongu değilse).
--lufs      : entegre hedef (EBU R128); gerçek tepe -1 dBTP üstüne çıkarsa ffmpeg alimiter.
Çıktı uzantısı .wav/.mp3/.m4a (m4a: AAC 44,1 kHz; mono 96k, stereo 128k).
"""
import argparse
import os
import re
import subprocess
import tempfile

import numpy as np

SR = 44100


def oku(yol):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", yol, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                       capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32).reshape(-1, 2).astype(np.float64)


def yaz(x, yol):
    mono = x.shape[1] == 1
    with tempfile.TemporaryDirectory() as td:
        ham = os.path.join(td, "a.f32")
        x.astype(np.float32).tofile(ham)
        ch = str(x.shape[1])
        ext = os.path.splitext(yol)[1].lower()
        kod = {".wav": ["-c:a", "pcm_s16le"], ".mp3": ["-c:a", "libmp3lame", "-b:a", "128k"],
               ".m4a": ["-c:a", "aac", "-b:a", "96k" if mono else "128k"]}[ext]
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", ch, "-i", ham]
                       + kod + [yol], check=True)


def cizgi_bastir(x, f0, dongu, fmin=900.0, fmax=12000.0):
    n, hop = 8192, 2048
    win = np.hanning(n)
    L = len(x)
    if dongu:
        xp = np.concatenate([x[-n:], x, x[:n]], axis=0)
    else:
        xp = np.pad(x, ((n, n), (0, 0)), mode="reflect")
    y = np.zeros_like(xp)
    ws = np.zeros(len(xp))
    df = SR / n
    cizgi, komsu = [], []
    k = int(np.ceil(fmin / f0))
    while k * f0 <= fmax:
        c = int(round(k * f0 / df))
        cizgi.append(np.arange(c - 1, c + 2))
        komsu.append(np.r_[c - 20:c - 3, c + 4:c + 21])
        k += 1
    cizgi, komsu = np.array(cizgi), np.array(komsu)
    for i in range(0, len(xp) - n + 1, hop):
        for ch in range(x.shape[1]):
            S = np.fft.rfft(xp[i:i + n, ch] * win)
            M = np.abs(S)
            ref = np.median(M[komsu], axis=1)[:, None]  # komşu çizgilere dayanıklı
            m = M[cizgi]
            S[cizgi] *= np.where(m > 2.5 * ref, 1.06 * ref / np.maximum(m, 1e-12), 1.0)
            y[i:i + n, ch] += np.fft.irfft(S, n) * win
        ws[i:i + n] += win ** 2
    ws[ws < 1e-8] = 1.0
    y /= ws[:, None]
    return y[n:n + L]


def lufs_tp(x):
    with tempfile.TemporaryDirectory() as td:
        ham = os.path.join(td, "a.f32")
        x.astype(np.float32).tofile(ham)
        af = ("apad=whole_dur=0.5," if len(x) < 0.5 * SR else "") + "ebur128=peak=true"
        r = subprocess.run(["ffmpeg", "-nostats", "-hide_banner", "-f", "f32le", "-ar", str(SR), "-ac", str(x.shape[1]),
                            "-i", ham, "-af", af, "-f", "null", "-"], capture_output=True, text=True)
    t = r.stderr[r.stderr.rfind("Summary:"):]
    i = float(re.search(r"I:\s+(-?[\d.]+)\s+LUFS", t).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+|-inf)\s+dBFS", t).group(1))
    return i, tp


def sinirla(x, tavan_db=-1.5):
    with tempfile.TemporaryDirectory() as td:
        g, c = os.path.join(td, "g.f32"), os.path.join(td, "c.f32")
        x.astype(np.float32).tofile(g)
        lim = 10 ** (tavan_db / 20)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", str(x.shape[1]), "-i", g,
                        "-af", f"alimiter=limit={lim}:attack=2:release=60:level=disabled:asc=1",
                        "-f", "f32le", c], check=True)
        y = np.fromfile(c, np.float32).reshape(-1, x.shape[1]).astype(np.float64)
    return y[:len(x)]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("girdi")
    p.add_argument("cikti")
    p.add_argument("--lufs", type=float)
    p.add_argument("--dongu", action="store_true")
    p.add_argument("--cizgi", type=float, default=0)
    p.add_argument("--alcak", type=float, default=0, help="yüksek geçiren süzgeç Hz")
    p.add_argument("--yuksek", type=float, default=0, help="alçak geçiren süzgeç Hz")
    p.add_argument("--kes", action="store_true")
    p.add_argument("--sol", type=float, default=0)
    p.add_argument("--sag", type=float, default=0)
    p.add_argument("--mono", action="store_true")
    a = p.parse_args()
    x = oku(a.girdi)
    if a.mono:
        x = x.mean(axis=1, keepdims=True)
    if a.alcak or a.yuksek:
        X = np.fft.rfft(x, axis=0)  # dairesel FFT süzgeci: döngü dikişini bozmaz
        f = np.fft.rfftfreq(len(x), 1 / SR)
        h = np.ones_like(f)
        if a.alcak:
            h *= 1 / np.sqrt(1 + (a.alcak / np.maximum(f, 1e-3)) ** 4)
        if a.yuksek:
            h *= 1 / np.sqrt(1 + (f / a.yuksek) ** 4)
        x = np.fft.irfft(X * h[:, None], len(x), axis=0)
    if a.cizgi:
        x = cizgi_bastir(x, a.cizgi, a.dongu)
    if a.kes:  # baş: tepeden 40 dB aşağısına kadar; son: -60 dBFS altı
        w = int(0.005 * SR)
        r = 20 * np.log10(np.sqrt(np.mean(x[: len(x) // w * w].mean(axis=1).reshape(-1, w) ** 2, axis=1)) + 1e-12)
        bas = np.where(r > max(-55, r.max() - 40))[0]
        son = np.where(r > -60)[0]
        if len(bas):
            x = x[max(0, bas[0] - 1) * w:(son[-1] + 2) * w]
    if not a.dongu and (a.sol or a.sag):
        if a.sol:
            k = int(a.sol / 1000 * SR)
            x[:k] *= np.linspace(0, 1, k)[:, None] ** 2
        if a.sag:
            k = int(a.sag / 1000 * SR)
            x[-k:] *= np.linspace(1, 0, k)[:, None] ** 2
    if a.lufs is not None:
        for _ in range(3):  # sınırlayıcı düzeyi düşürürse kazancı yeniden kur
            i, tp = lufs_tp(x)
            if abs(i - a.lufs) <= 0.3 and tp <= -1.0:
                break
            x = x * 10 ** ((a.lufs - i) / 20)
            if lufs_tp(x)[1] > -1.0:
                x = sinirla(x)
    yaz(x, a.cikti)


if __name__ == "__main__":
    main()
