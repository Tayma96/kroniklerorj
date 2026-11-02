#!/usr/bin/env python3
"""Kilit an anlatılarını yerel faster-whisper (medium, CPU) ile dinler: kelime hata oranı ve dil tespiti.
  <venv>/bin/python scripts/ses/anlar_denetle.py   (HF_HOME ortam değişkeniyle model önbelleği)
Çıktı: her dosya için 'an dil süre WER% dil(olasılık)'; WER > %10 ya da yanlış dil → KALDI.
"""
import json, os, re, subprocess, unicodedata
import numpy as np
from faster_whisper import WhisperModel
import jiwer
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = json.load(open(os.path.join(KOK, "mobile", "lib", "sinematik", "anlar.json"), encoding="utf-8"))["anlar"]
D = os.path.join(KOK, "mobile", "assets", "ses", "anlar")

def norm(t, dil):
    t = t.lower().replace("ё", "е").replace("-", " ").replace("’", "'").replace("—", " ")
    if dil == "ar":
        t = re.sub(r"[ً-ْٰـ]", "", t); t = re.sub("[أإآ]", "ا", t).replace("ى", "ي").replace("ة", "ه")
    else:
        t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
    t = "".join(c if not unicodedata.category(c).startswith(("P", "S")) else " " for c in t)
    return " ".join(t.split())

def pcm(f):
    return np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout, np.float32)

m = WhisperModel("medium", device="cpu", compute_type="int8")
kalan = 0
for a in A:
    for L in ["tr", "en", "es", "pt", "ar", "ru"]:
        f = os.path.join(D, f"{a['id']}_{L}.m4a")
        if not os.path.exists(f): print(a["id"], L, "YOK"); kalan += 1; continue
        x = pcm(f)
        seg, _ = m.transcribe(x, language=L, beam_size=5)
        hyp = " ".join(s.text for s in seg)
        _, info = m.transcribe(x, beam_size=1)
        wer = jiwer.wer(norm(a[L], L), norm(hyp, L)) * 100
        ok = wer <= 10 and info.language == L
        kalan += 0 if ok else 1
        print(f"{a['id']:<14}{L}  {len(x)/16000:5.1f} sn  WER {wer:5.1f}%  dil {info.language}({info.language_probability:.2f})  {'' if ok else 'KALDI → ' + hyp.strip()[:90]}", flush=True)
print("KALAN:", kalan)
