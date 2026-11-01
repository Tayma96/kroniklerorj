#!/usr/bin/env python3
"""Kronikler ses kalite kapısı — yalnız numpy + ffmpeg.

Kullanım:
  python3 -I scripts/ses/denetle.py dosya... [--json] [--spektrogram KLASOR]
                                    [--tur ortam|efekt|ui|muzik|vo] [--hedef LUFS]

Ölçümler (dosya başına):
  lufs   : entegre ses yüksekliği (EBU R128, ffmpeg ebur128)
  tp     : gerçek tepe dBTP (ebur128 peak=true)
  islik  : 300 Hz–12 kHz yarım oktav bantlarda FFT güç tepe/medyan oranı;
           oran > 60 olan pencere yüzdesi (islik%) ve en yüksek oran (islik_max) + frekansı
  dikis  : döngü dikişi — son 20 ms ile ilk 20 ms arasındaki örnek sıçraması,
           kenar pencerelerdeki tipik örnekler arası farka oranı (dikis_x) ve düzey basamağı (dB)
  bas/son: baş ve son sessizlik (ms, -55 dBFS altı 10 ms pencereler)
  sure   : saniye

Kapı (--tur verilirse uygulanır, plan: docs/SES_PLANI.md §3–4):
  tp <= -1 dBTP; lufs hedef ±1 (--hedef ya da türün varsayılanı);
  ortam/ui/efekt için islik% <= 2 ve islik_max <= 300; döngülerde dikis_x <= 4 ve |basamak| <= 6 dB;
  baş sessizlik <= 50 ms (ui/efekt), son sessizlik <= 400 ms (döngüde <= 30 ms).
"""
import json
import os
import re
import subprocess
import sys

import numpy as np

SR = 44100
HEDEF = {"vo": -16.0, "efekt": -20.0, "muzik": -23.0, "ui": -28.0, "ortam": -30.0}
ISLIK_ESIK = 60.0


def _ffmpeg_pcm(yol):
    r = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", yol, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
        capture_output=True, check=True)
    x = np.frombuffer(r.stdout, np.float32).reshape(-1, 2).astype(np.float64)
    return x


def _ebur128(yol):
    r = subprocess.run(
        ["ffmpeg", "-nostats", "-hide_banner", "-i", yol, "-af", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True, text=True)
    t = r.stderr
    ozet = t[t.rfind("Summary:"):] if "Summary:" in t else t
    m_i = re.search(r"I:\s+(-?[\d.]+|-inf)\s+LUFS", ozet)
    m_lra = re.search(r"LRA:\s+(-?[\d.]+)\s+LU", ozet)
    m_tp = re.search(r"True peak:\s+Peak:\s+(-?[\d.]+|-inf)\s+dBFS", ozet)
    f = lambda m: (float(m.group(1)) if m and m.group(1) != "-inf" else None)
    return f(m_i), f(m_lra), f(m_tp)


def _islik(mono):
    n, hop = 8192, 4096
    if len(mono) < n:
        mono = np.pad(mono, (0, n - len(mono)))
    win = np.hanning(n)
    frek = np.fft.rfftfreq(n, 1.0 / SR)
    kenarlar = []
    lo = 300.0
    while lo * 2 ** 0.5 <= 12000:  # AAC/MP3 kesimi (13–16 kHz) üstü sıfır bant oranı şişirir
        hi = lo * 2 ** 0.5
        idx = np.where((frek >= lo) & (frek < hi))[0]
        if len(idx) >= 8:
            kenarlar.append(idx)
        lo = hi
    oranlar, frekler = [], []
    esik_ses = 10 ** (-60 / 10)  # sessiz pencereyi sayma
    for i in range(0, len(mono) - n + 1, hop):
        seg = mono[i:i + n]
        if np.mean(seg ** 2) < esik_ses:
            continue
        p = np.abs(np.fft.rfft(seg * win)) ** 2
        taban = 1e-6 * np.mean(p) + 1e-20  # neredeyse boş bant medyanını tabana sabitle
        en, enf = 0.0, 0.0
        for idx in kenarlar:
            b = p[idx]
            med = max(np.median(b), taban)
            k = int(np.argmax(b))
            o = b[k] / med
            if o > en:
                en, enf = o, frek[idx[k]]
        oranlar.append(en)
        frekler.append(enf)
    if not oranlar:
        return 0.0, 0.0, 0.0
    o = np.array(oranlar)
    k = int(np.argmax(o))
    return float(np.mean(o > ISLIK_ESIK) * 100), float(o[k]), float(frekler[k])


def _dikis(x):
    w = int(0.020 * SR)
    if len(x) < 4 * w:
        return None, None
    son, ilk = x[-w:], x[:w]
    tip = []
    for seg in (son, ilk):
        d = np.abs(np.diff(seg, axis=0))
        tip.append(np.percentile(d, 95))
    tipik = max(np.mean(tip), 1e-6)
    sicrama = float(np.max(np.abs(x[0] - x[-1])))
    rms = lambda s: np.sqrt(np.mean(s ** 2)) + 1e-9
    basamak = 20 * np.log10(rms(ilk) / rms(son))
    return sicrama / tipik, float(basamak)


def _sessizlik(mono):
    w = int(0.010 * SR)
    k = len(mono) // w
    if k == 0:
        return 0, 0
    r = np.sqrt(np.mean(mono[:k * w].reshape(k, w) ** 2, axis=1))
    sesli = np.where(20 * np.log10(r + 1e-12) > -55)[0]
    if len(sesli) == 0:
        return k * 10, k * 10
    return int(sesli[0] * 10), int((k - 1 - sesli[-1]) * 10)


def olc(yol):
    x = _ffmpeg_pcm(yol)
    mono = x.mean(axis=1)
    lufs, lra, tp = _ebur128(yol)
    isl_yuzde, isl_max, isl_f = _islik(mono)
    dx, basamak = _dikis(x)
    bas, son = _sessizlik(mono)
    return {
        "dosya": yol, "sure": round(len(x) / SR, 2), "lufs": lufs, "lra": lra, "tp": tp,
        "islik_yuzde": round(isl_yuzde, 1), "islik_max": round(isl_max, 1), "islik_hz": round(isl_f),
        "dikis_x": None if dx is None else round(dx, 1),
        "dikis_db": None if basamak is None else round(basamak, 1),
        "bas_ms": bas, "son_ms": son,
    }


def kapi(o, tur, hedef=None, dongu=None):
    sorun = []
    if dongu is None:
        dongu = tur in ("ortam", "muzik")
    if o["tp"] is not None and o["tp"] > -1.0:
        sorun.append(f"tepe {o['tp']:+.1f} dBTP")
    h = hedef if hedef is not None else HEDEF.get(tur)
    if h is not None and o["lufs"] is not None and abs(o["lufs"] - h) > 1.0:
        sorun.append(f"LUFS {o['lufs']:.1f} (hedef {h:.0f})")
    if tur in ("ortam", "ui", "efekt"):
        if o["islik_yuzde"] > 2.0 or o["islik_max"] > 300:
            sorun.append(f"ıslık %{o['islik_yuzde']:.0f} max {o['islik_max']:.0f}x@{o['islik_hz']}Hz")
    if dongu and o["dikis_x"] is not None:
        if o["dikis_x"] > 4 or abs(o["dikis_db"]) > 6:
            sorun.append(f"dikiş {o['dikis_x']}x/{o['dikis_db']:+.1f}dB")
    if tur in ("ui", "efekt") and o["bas_ms"] > 50:
        sorun.append(f"baş sessizlik {o['bas_ms']} ms")
    if dongu and (o["bas_ms"] > 30 or o["son_ms"] > 30):
        sorun.append(f"döngü sessizliği {o['bas_ms']}/{o['son_ms']} ms")
    elif not dongu and o["son_ms"] > 400:
        sorun.append(f"son sessizlik {o['son_ms']} ms")
    return sorun


def spektrogram(yol, klasor):
    os.makedirs(klasor, exist_ok=True)
    cikti = os.path.join(klasor, os.path.splitext(os.path.basename(yol))[0] + ".png")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", yol, "-lavfi",
         "showspectrumpic=s=1024x512:mode=combined:scale=log:fscale=lin:legend=1", cikti],
        check=True)
    return cikti


def main(argv):
    dosyalar, js, spk, tur, hedef, dongu = [], False, None, None, None, None
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--json":
            js = True
        elif a == "--spektrogram":
            i += 1; spk = argv[i]
        elif a == "--tur":
            i += 1; tur = argv[i]
        elif a == "--hedef":
            i += 1; hedef = float(argv[i])
        elif a == "--dongu":
            dongu = True
        elif a == "--tek":
            dongu = False
        else:
            dosyalar.append(a)
        i += 1
    sonuc = []
    for d in dosyalar:
        o = olc(d)
        if tur:
            o["kapi"] = kapi(o, tur, hedef, dongu)
        if spk:
            o["png"] = spektrogram(d, spk)
        sonuc.append(o)
    if js:
        print(json.dumps(sonuc, ensure_ascii=False, indent=1))
        return
    print(f"{'dosya':34} {'sn':>6} {'LUFS':>6} {'dBTP':>5} {'ısl%':>5} {'ıslMax':>8} {'Hz':>5} "
          f"{'dikX':>5} {'dikdB':>6} {'baş':>4} {'son':>4}  kapı")
    for o in sonuc:
        f = lambda v, s: ("—" if v is None else format(v, s))
        k = o.get("kapi")
        ks = "" if k is None else ("GEÇTİ" if not k else "KALDI: " + "; ".join(k))
        ad = os.path.relpath(o["dosya"])[-34:]
        print(f"{ad:34} {o['sure']:6.1f} {f(o['lufs'], '6.1f')} {f(o['tp'], '5.1f')} "
              f"{o['islik_yuzde']:5.1f} {o['islik_max']:8.0f} {o['islik_hz']:5d} "
              f"{f(o['dikis_x'], '5.1f')} {f(o['dikis_db'], '6.1f')} {o['bas_ms']:4d} {o['son_ms']:4d}  {ks}")


if __name__ == "__main__":
    main(sys.argv[1:])
