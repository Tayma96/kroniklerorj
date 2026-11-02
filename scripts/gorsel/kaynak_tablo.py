"""KAYNAK.md için sahne tablosunu sahneler.json + cekim_plani.py'den üretir (istem, tohum, çekim aralığı).

Kullanım: python kaynak_tablo.py  -> Markdown'ı stdout'a yazar.
"""
import json
import os
import sys

KOK = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, KOK)
from cekim_plani import CEKIMLER  # noqa: E402


def main():
    with open(os.path.join(KOK, "sahneler.json"), encoding="utf-8") as f:
        plan = json.load(f)
    araliklar = {c["gorsel"].rsplit(".", 1)[0]: (c["bas"], c["son"]) for c in CEKIMLER}
    print("| Çekim | Sahne | Tohum | İstem |")
    print("|---|---|---|---|")
    for s in plan["sahneler"]:
        if s.get("durum") == "uretilmedi":
            continue
        a, b = araliklar.get(s["id"], (None, None))
        zaman = f"{a / 1000:.2f}–{b / 1000:.2f} sn" if a is not None else "—"
        print(f"| {zaman} | {s['id']} | {s['tohum']} | {s['istem']} |")
    print()
    print(f"Her isteme eklenen ortak son ek: `{plan['ek'].strip()}`")
    yok = [s["id"] for s in plan["sahneler"] if s.get("durum") == "uretilmedi"]
    if yok:
        print()
        print("Planlanıp üretilmeyen (istemleri sahneler.json'da duruyor): " + ", ".join(yok) + ".")
    red = [(s["id"], r) for s in plan["sahneler"] for r in s.get("reddedilen", [])]
    if red:
        print()
        print("Reddedilen üretimler: " + "; ".join(f"{i} tohum {r['tohum']} ({r['neden']})" for i, r in red) + ".")


if __name__ == "__main__":
    main()
