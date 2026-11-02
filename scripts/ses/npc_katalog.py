#!/usr/bin/env python3
"""mobile/assets/ses/npc/*.m4a → mobile/lib/sinematik/npc-ses.ts (require + süre ms). Ses dosyaları değişince çalıştır."""
import json, os, subprocess
KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(KOK, "mobile", "assets", "ses", "npc")
V = json.load(open(os.path.join(KOK, "mobile", "lib", "npc-sozler.json"), encoding="utf-8"))
satir = []
for rol in V["sesler"]:
    for s in V["sozler"]:
        f = os.path.join(D, f"{rol}_{s['n']}.m4a")
        if not os.path.exists(f): raise SystemExit("eksik: " + f)
        ms = int(round(float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout) * 1000))
        satir.append(f'  "npc.{rol}_{s["n"]}": {{ kaynak: require("../../assets/ses/npc/{rol}_{s["n"]}.m4a"), ms: {ms} }},')
open(os.path.join(KOK, "mobile", "lib", "sinematik", "npc-ses.ts"), "w", encoding="utf-8").write(
    "// Üretildi: scripts/ses/npc_katalog.py — elle düzenleme. NPC sözleri (Türkçe, 7 ses).\n"
    "export const NPC_SES: Record<string, { kaynak: number; ms: number }> = {\n" + "\n".join(satir) + "\n};\n")
print(len(satir), "kayıt")
