#!/usr/bin/env python3
"""NPC sözlerini 7 sesle üretir (eleven_v4, Türkçe), işler: mono, −17 LUFS, baş/son 80 ms.
  python3 -I scripts/ses/npc_uret.py <iş_dizini> <tavan>     → mobile/assets/ses/npc/<rol>_<n>.m4a
Ham dosya varsa yeniden üretilmez. Kayıt: uretim.json (uret.py yardımcıları; kilitli yazım).
"""
import importlib.util, json, os, subprocess, sys
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
spec = importlib.util.spec_from_file_location("uret", os.path.join(KOK, "scripts", "ses", "uret.py")); U = importlib.util.module_from_spec(spec); spec.loader.exec_module(U)
VERI = json.load(open(os.path.join(KOK, "mobile", "lib", "npc-sozler.json"), encoding="utf-8"))
CIKTI = os.path.join(KOK, "mobile", "assets", "ses", "npc")

def main():
    is_, tavan = sys.argv[1], int(sys.argv[2])
    os.makedirs(os.path.join(is_, "ham"), exist_ok=True); os.makedirs(CIKTI, exist_ok=True)
    for rol, ses in VERI["sesler"].items():
        for s in VERI["sozler"]:
            ad = f"{rol}_{s['n']}"; ham = os.path.join(is_, "ham", ad + ".mp3"); son = os.path.join(CIKTI, ad + ".m4a")
            if not os.path.exists(ham):
                metin = (s["etiket"] + " " + s["soz"]).strip()
                govde = {"text": metin, "model_id": "eleven_v4", "voice_settings": {"stability": 0.5, "similarity_boost": 0.8}, "seed": 1247, "language_code": "tr"}
                once = U._on_kontrol(len(metin) + 10, tavan)
                mal = U._post(f"/v1/text-to-speech/{ses}?output_format=mp3_44100_128", govde, ham)
                U._kaydet({"dosya": ad + ".mp3", "tur": "vo-npc", "istem": metin, "model": "eleven_v4", "ses": ses, "rol": rol,
                           "ayarlar": {k: v for k, v in govde.items() if k != "text"}, "tohum": 1247, "maliyet": mal, "sayac_once": once, "not": "NPC sözü " + s["k"]})
                print(ad, "üretildi:", mal, flush=True)
            ara = os.path.join(is_, ad + ".wav")
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ham, "-af", "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,adelay=80,apad=pad_dur=0.08", "-ac", "1", "-ar", "44100", ara], check=True)
            subprocess.run(["python3", "-I", os.path.join(KOK, "scripts", "ses", "isle.py"), ara, son, "--mono", "--lufs", "-17"], check=True, capture_output=True)

if __name__ == "__main__":
    main()
