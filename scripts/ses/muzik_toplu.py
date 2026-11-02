#!/usr/bin/env python3
"""Oyun içi müzikleri toplu üretir ve oyuna hazırlar (kredi kontrollü).
  python3 -I scripts/ses/muzik_toplu.py <iş_dizini> <tavan> id1 id2 ...
Her parça: plan/<id>.json → ham/<id>.mp3 (uret.py, kayıtlı) → 3 sn eşit güçlü çapraz geçişle dikişsiz döngü →
50 Hz çizgi bastırma, −18 LUFS, gerçek tepe ≤ −1 dBTP → son/<id>.m4a (AAC 128k stereo) → denetim satırı.
Ham dosya varsa yeniden üretilmez (kredi harcanmaz).
"""
import os, subprocess, sys
import numpy as np
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SES = os.path.join(KOK, "scripts", "ses")
SR = 44100

def oku(f):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()

def yaz(x, f):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", f], input=x.astype(np.float32).tobytes(), check=True)

def dongu(x, c_sn=3.0):
    # Kuyruk başa eşit güçle karışır: y[son] → y[0] geçişi kesintisizdir.
    c = int(c_sn * SR); L = len(x)
    # sondaki sessizliği at (model bazen kısa kuyruk bırakır)
    # 50 ms pencerelerde −45 dBFS altına inen sönüm kuyruğu atılır (döngüde susma olmasın)
    n = int(0.05 * SR); son = L
    while son > 10 * SR and np.sqrt(np.mean(x[son - n:son] ** 2)) < 10 ** (-45 / 20): son -= n
    x = x[:son]; L = len(x)
    # Son %30'da iç sessizlik (model parçayı söndürüp yeniden başlatmış) varsa sönüşün başladığı yerden kes.
    rms = np.array([np.sqrt(np.mean(x[i:i + n] ** 2)) for i in range(0, L - n, n)]); db = 20 * np.log10(rms + 1e-9)
    for k in range(int(len(db) * 0.7), len(db)):
        if db[k] < -45:
            j = k
            while j > 0 and db[j] < -22: j -= 1
            x = x[: (j + 1) * n]; L = len(x); break
    t = np.linspace(0, np.pi / 2, c, dtype=np.float32)[:, None]
    y = x[: L - c].copy()
    y[:c] = x[:c] * np.sin(t) + x[L - c:] * np.cos(t)
    return y

def main():
    is_, tavan, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
    for d in ("ham", "son", "ara"): os.makedirs(os.path.join(is_, d), exist_ok=True)
    for i in ids:
        ham = os.path.join(is_, "ham", i + ".mp3"); son = os.path.join(is_, "son", i + ".m4a")
        if not os.path.exists(ham):
            r = subprocess.run(["python3", "-I", os.path.join(SES, "uret.py"), "muzik", "--cikti", ham, "--plan", os.path.join(is_, "plan", i + ".json"), "--tavan", tavan, "--not", "oyun içi müzik: " + i], capture_output=True, text=True)
            print(i, "üretim:", (r.stdout.strip() or r.stderr.strip())[-160:], flush=True)
            if not os.path.exists(ham): continue
        ara = os.path.join(is_, "ara", i + "_dongu.wav"); yaz(dongu(oku(ham)), ara)
        ara2 = os.path.join(is_, "ara", i + "_isle.wav")
        subprocess.run(["python3", "-I", os.path.join(SES, "isle.py"), ara, ara2, "--dongu", "--cizgi", "50", "--lufs", "-18"], check=True, capture_output=True)
        # AAC kodlayıcı sona birkaç ms dolgu bırakır; döngü dönüşünde tık olmasın diye uçlara 15 ms yumuşak geçiş.
        sure = len(oku(ara2)) / SR
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ara2, "-af", f"afade=t=in:d=0.015,afade=t=out:st={sure - 0.015:.3f}:d=0.015", "-c:a", "aac", "-b:a", "128k", "-ar", str(SR), son], check=True)
        d = subprocess.run(["python3", "-I", os.path.join(SES, "denetle.py"), son], capture_output=True, text=True).stdout.strip().split("\n")[-1]
        print("DENETİM", d[:120], flush=True)

if __name__ == "__main__":
    main()
