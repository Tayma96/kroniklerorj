#!/usr/bin/env python3
"""mobile/assets/ses/anlar/*.m4a → mobile/lib/sinematik/anlar-ses.ts (require + süre ms). Ses dosyaları değişince çalıştır."""
import json, os, subprocess
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(KOK, "mobile", "assets", "ses", "anlar")
A = json.load(open(os.path.join(KOK, "mobile", "lib", "sinematik", "anlar.json"), encoding="utf-8"))["anlar"]
satir = []
for a in A:
    for L in ["tr", "en", "es", "pt", "ar", "ru"]:
        f = os.path.join(D, f"{a['id']}_{L}.m4a")
        if not os.path.exists(f): raise SystemExit("eksik: " + f)
        ms = int(round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout) * 1000))
        satir.append(f'  "an.{a["id"]}.{L}": {{ kaynak: require("../../assets/ses/anlar/{a["id"]}_{L}.m4a"), ms: {ms} }},')
open(os.path.join(KOK, "mobile", "lib", "sinematik", "anlar-ses.ts"), "w", encoding="utf-8").write(
    "// Üretildi: scripts/ses/anlar_katalog.py — elle düzenleme. Kilit an anlatıları (Kronks, 6 dil).\n"
    "export const AN_SES: Record<string, { kaynak: number; ms: number }> = {\n" + "\n".join(satir) + "\n};\n")
print(len(satir), "kayıt")
