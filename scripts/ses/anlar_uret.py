#!/usr/bin/env python3
"""Kilit an anlatılarını üretir (Kronks, eleven_v4), işler ve faster-whisper ile denetler.
  python3 -I scripts/ses/anlar_uret.py <iş_dizini> <tavan> [an_id ...]
Metin: mobile/lib/sinematik/anlar.json · Çıktı: mobile/assets/ses/anlar/<an>_<dil>.m4a (mono 96k, −16 LUFS).
Ham dosya varsa yeniden üretilmez. Denetim satırı: dil, an, süre, WER. WER > %10 → yeniden üret listesine yazılır.
Denetim ayrı adımdır (whisper ortamı ayrı): --denetle <venv_python>
"""
import importlib.util, json, os, subprocess, sys
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
spec = importlib.util.spec_from_file_location("uret", os.path.join(KOK, "scripts", "ses", "uret.py")); U = importlib.util.module_from_spec(spec); spec.loader.exec_module(U)
SES = {"ar": "PA4QGZDhUkvuOKb6ZEkd"}; KRONKS = "X1De6TudhbO6mizD7oKo"
DILLER = ["tr", "en", "es", "pt", "ar", "ru"]
CIKTI = os.path.join(KOK, "mobile", "assets", "ses", "anlar")

def uret(is_, tavan, ids):
    anlar = json.load(open(os.path.join(KOK, "mobile", "lib", "sinematik", "anlar.json"), encoding="utf-8"))["anlar"]
    os.makedirs(os.path.join(is_, "ham"), exist_ok=True); os.makedirs(CIKTI, exist_ok=True)
    for a in anlar:
        if ids and a["id"] not in ids: continue
        for L in DILLER:
            ad = f"{a['id']}_{L}"; ham = os.path.join(is_, "ham", ad + ".mp3"); son = os.path.join(CIKTI, ad + ".m4a")
            if not os.path.exists(ham):
                metin = f"{a['etiket']} {a[L]}"
                govde = {"text": metin, "model_id": "eleven_v4", "voice_settings": {"stability": 0.67, "similarity_boost": 0.75}, "seed": 1243, "language_code": L}
                once = U._on_kontrol(len(metin) + 10, tavan)
                mal = U._post(f"/v1/text-to-speech/{SES.get(L, KRONKS)}?output_format=mp3_44100_128", govde, ham)
                U._kaydet({"dosya": ad + ".mp3", "tur": "vo-an", "istem": metin, "model": "eleven_v4", "ses": SES.get(L, KRONKS),
                           "ayarlar": {k: v for k, v in govde.items() if k != "text"}, "tohum": 1243, "maliyet": mal, "sayac_once": once, "not": "kilit an anlatısı"})
                print(ad, "üretildi:", mal, "kredi", flush=True)
            # baş/son sessizlik 120 ms'e indirilir, −16 LUFS, mono
            ara = os.path.join(is_, ad + ".wav")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ham, "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=120,apad=pad_dur=0.12", "-ac", "1", "-ar", "44100", ara], check=True)
            subprocess.run(["python3", "-I", os.path.join(KOK, "scripts", "ses", "isle.py"), ara, son, "--mono", "--lufs", "-16"], check=True, capture_output=True)

if __name__ == "__main__":
    uret(sys.argv[1], int(sys.argv[2]), set(sys.argv[3:]))
