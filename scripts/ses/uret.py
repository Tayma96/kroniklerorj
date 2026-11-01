#!/usr/bin/env python3
"""ElevenLabs ses üretimi — kredi kontrollü, her çağrı mobile/assets/ses/uretim.json'a yazılır.

Anahtar yok: istek curl ile api.elevenlabs.io'ya gider, `xi-api-key`'i ajan vekili ekler.

  python3 -I scripts/ses/uret.py efekt --cikti a.mp3 --metin "..." --sure 25 [--dongu] [--etki 0.5] --tavan 4857
  python3 -I scripts/ses/uret.py muzik --cikti m.mp3 --plan plan.json --tavan 4857
  python3 -I scripts/ses/uret.py sayac

--tavan: abonelik sayacının (character_count) aşılmayacak değeri. Tahmini maliyet sayaçla
birlikte tavanı aşacaksa ya da kalan kota 5.000'in altındaysa çağrı yapılmaz.
"""
import argparse
import datetime
import json
import os
import subprocess
import sys
import tempfile
import time

API = "https://api.elevenlabs.io"
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
KAYIT = os.path.join(KOK, "mobile", "assets", "ses", "uretim.json")


def _curl(args):
    r = subprocess.run(["curl", "-sS"] + args, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit("curl hatası: " + r.stderr.strip())
    return r.stdout


def sayac():
    d = json.loads(_curl([API + "/v1/user/subscription"]))
    return int(d["character_count"]), int(d["character_limit"])


def _kaydet(girdi):
    veri = []
    if os.path.exists(KAYIT):
        with open(KAYIT, encoding="utf-8") as f:
            veri = json.load(f)
    veri.append(girdi)
    with open(KAYIT, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=1)
        f.write("\n")


def _on_kontrol(tahmin, tavan):
    s, lim = sayac()
    if lim - s < 5000:
        sys.exit(f"DUR: kalan kota {lim - s} < 5000")
    if tavan is not None and s + tahmin > tavan:
        sys.exit(f"DUR: sayaç {s} + tahmin {tahmin} > tavan {tavan}")
    return s


def _post(yol, govde, cikti):
    with tempfile.TemporaryDirectory() as td:
        hdr, body = os.path.join(td, "h"), os.path.join(td, "b.json")
        with open(body, "w", encoding="utf-8") as f:
            json.dump(govde, f, ensure_ascii=False)
        kod = _curl(["-X", "POST", API + yol, "-H", "Content-Type: application/json",
                     "--data-binary", "@" + body, "-D", hdr, "-o", cikti, "-w", "%{http_code}",
                     "--max-time", "300"])
        with open(hdr, encoding="utf-8", errors="replace") as f:
            basliklar = f.read()
    if kod.strip() != "200":
        hata = open(cikti, encoding="utf-8", errors="replace").read()[:600]
        os.remove(cikti)
        sys.exit(f"HTTP {kod}: {hata}")
    maliyet = None
    for satir in basliklar.splitlines():
        if satir.lower().startswith("character-cost:"):
            maliyet = int(satir.split(":", 1)[1].strip())
    return maliyet


def efekt(a):
    tahmin = int(round(a.sure * 10))
    once = _on_kontrol(tahmin, a.tavan)
    govde = {"text": a.metin, "duration_seconds": a.sure, "loop": a.dongu,
             "prompt_influence": a.etki, "model_id": "eleven_text_to_sound_v2"}
    maliyet = _post("/v1/sound-generation?output_format=mp3_44100_128", govde, a.cikti)
    _kaydet({"dosya": os.path.relpath(a.cikti, KOK) if a.cikti.startswith(KOK) else os.path.basename(a.cikti),
             "tur": "efekt", "istem": a.metin, "model": "eleven_text_to_sound_v2", "sure_sn": a.sure,
             "dongu": a.dongu, "prompt_influence": a.etki, "tohum": None, "maliyet": maliyet,
             "maliyet_kaynak": "Character-Cost", "sayac_once": once, "not": a.not_,
             "tarih": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")})
    print(f"{a.cikti}: {maliyet} kredi (sayaç önce {once})")


def muzik(a):
    with open(a.plan, encoding="utf-8") as f:
        plan = json.load(f)
    toplam_ms = sum(b["duration_ms"] for b in plan["sections"])
    tahmin = int(round(toplam_ms / 60000 * 400)) + 20
    once = _on_kontrol(tahmin, a.tavan)
    govde = {"composition_plan": plan, "model_id": "music_v1", "respect_sections_durations": True}
    _post("/v1/music?output_format=mp3_44100_128", govde, a.cikti)
    sonra = once
    for _ in range(12):  # sayaç birkaç saniye gecikir
        time.sleep(5)
        sonra, _ = sayac()
        if sonra > once:
            time.sleep(5)
            sonra, _ = sayac()
            break
    _kaydet({"dosya": os.path.basename(a.cikti), "tur": "muzik", "istem": plan, "model": "music_v1",
             "sure_sn": toplam_ms / 1000, "tohum": None, "maliyet": sonra - once,
             "maliyet_kaynak": "abonelik sayacı farkı", "sayac_once": once, "not": a.not_,
             "tarih": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")})
    print(f"{a.cikti}: {sonra - once} kredi (sayaç {once}→{sonra})")


def main():
    p = argparse.ArgumentParser()
    alt = p.add_subparsers(dest="komut", required=True)
    e = alt.add_parser("efekt")
    e.add_argument("--cikti", required=True)
    e.add_argument("--metin", required=True)
    e.add_argument("--sure", type=float, required=True)
    e.add_argument("--dongu", action="store_true")
    e.add_argument("--etki", type=float, default=0.5)
    e.add_argument("--tavan", type=int)
    e.add_argument("--not", dest="not_", default="")
    m = alt.add_parser("muzik")
    m.add_argument("--cikti", required=True)
    m.add_argument("--plan", required=True)
    m.add_argument("--tavan", type=int)
    m.add_argument("--not", dest="not_", default="")
    alt.add_parser("sayac")
    a = p.parse_args()
    if a.komut == "efekt":
        efekt(a)
    elif a.komut == "muzik":
        muzik(a)
    else:
        s, lim = sayac()
        print(f"sayaç {s}/{lim}, kalan {lim - s}")


if __name__ == "__main__":
    main()
