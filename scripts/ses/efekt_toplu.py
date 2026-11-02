#!/usr/bin/env python3
"""Oyun içi efekt ve ortam seslerini toplu üretir ve oyuna hazırlar (kredi kontrollü, uret.py kaydıyla).
  python3 -I scripts/ses/efekt_toplu.py <iş_dizini> <tavan> [efekt|ortam] [id ...]
Efekt: baş sessizliği kırpılır, mono, hedef LUFS, sondaki sessizlik atılır → AAC 96k.
Ortam: ElevenLabs döngü kipi; dairesel işlem, hedef LUFS, uçlara 15 ms yumuşak geçiş (AAC dolgusu tık yapmasın) → AAC 128k stereo.
Ham dosya varsa yeniden üretilmez.
"""
import json, os, subprocess, sys
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SES = os.path.join(KOK, "scripts", "ses")

def sure(f): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout)

def main():
    is_, tavan, tur = sys.argv[1], sys.argv[2], sys.argv[3]
    plan = json.load(open(os.path.join(SES, "efekt_plan.json"), encoding="utf-8"))[tur]
    secili = set(sys.argv[4:])
    for d in ("ham", "son", "ara"): os.makedirs(os.path.join(is_, d), exist_ok=True)
    for e in plan:
        i = e["id"]
        if secili and i not in secili: continue
        ham = os.path.join(is_, "ham", i + ".mp3"); son = os.path.join(is_, "son", i + ".m4a"); ara = os.path.join(is_, "ara", i + ".wav")
        if not os.path.exists(ham):
            k = ["python3", "-I", os.path.join(SES, "uret.py"), "efekt", "--cikti", ham, "--metin", e["metin"], "--sure", str(e["sure"]), "--etki", "0.6" if tur == "efekt" else "0.45", "--tavan", tavan, "--not", f"oyun içi {tur}: {i}"]
            if tur == "ortam": k.append("--dongu")
            r = subprocess.run(k, capture_output=True, text=True)
            print(i, "üretim:", (r.stdout.strip() or r.stderr.strip())[-120:], flush=True)
            if not os.path.exists(ham): continue
        if tur == "efekt":
            subprocess.run(["python3", "-I", os.path.join(SES, "isle.py"), ham, ara, "--kes", "--mono", "--cizgi", "50", "--lufs", str(e["lufs"])], check=True, capture_output=True)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ara, "-af", "areverse,silenceremove=start_periods=1:start_threshold=-60dB,areverse,anull", "-ac", "1", "-c:a", "aac", "-b:a", "96k", "-ar", "44100", son], check=True)
        else:
            subprocess.run(["python3", "-I", os.path.join(SES, "isle.py"), ham, ara, "--dongu", "--cizgi", "50", "--lufs", str(e["lufs"])], check=True, capture_output=True)
            t = sure(ara)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ara, "-af", f"afade=t=in:d=0.015,afade=t=out:st={t - 0.015:.3f}:d=0.015", "-c:a", "aac", "-b:a", "128k", "-ar", "44100", son], check=True)
        d = subprocess.run(["python3", "-I", os.path.join(SES, "denetle.py"), son], capture_output=True, text=True).stdout.strip().split("\n")[-1]
        print("DENETİM", d[:120], flush=True)

if __name__ == "__main__":
    main()
