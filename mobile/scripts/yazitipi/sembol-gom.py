"""Oyun yazı tiplerine eksik sembolleri (⚜ ✓ ★ …) tek renkli glif olarak gömer.

Android bu sembolleri Cinzel/Crimson'da bulamayınca renkli emoji yazı tipine düşer;
glif yazı tipinin içinde olunca metin rengiyle (altın/parşömen) çizilir.
Kaynak glifler: DejaVu Sans (Bitstream Vera/DejaVu lisansı). Çıktı adları yeniden
adlandırılır (OFL Reserved Font Name kuralı). Kullanım:
  pip install fonttools && python3 scripts/yazitipi/sembol-gom.py
"""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEJAVU = os.environ.get("DEJAVU", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
SYMBOLS = "⚜✓✔✗✕★☆✦✧♔♕♚♛♀♂❧☙⚖⚔⌄→←↑↓↔↗•◆◇♦☼☾"
FONTS = [
    ("@expo-google-fonts/cinzel/400Regular/Cinzel_400Regular.ttf", "Cinzel_400Regular.ttf", "Kronikler Cinzel"),
    ("@expo-google-fonts/cinzel/700Bold/Cinzel_700Bold.ttf", "Cinzel_700Bold.ttf", "Kronikler Cinzel"),
    ("@expo-google-fonts/crimson-text/400Regular/CrimsonText_400Regular.ttf", "CrimsonText_400Regular.ttf", "Kronikler Crimson"),
    ("@expo-google-fonts/crimson-text/400Regular_Italic/CrimsonText_400Regular_Italic.ttf", "CrimsonText_400Regular_Italic.ttf", "Kronikler Crimson"),
]

def main():
    src = TTFont(DEJAVU)
    scmap, sglyphs = src.getBestCmap(), src.getGlyphSet()
    for rel, out, family in FONTS:
        f = TTFont(os.path.join(ROOT, "node_modules", rel))
        cmap = f.getBestCmap()
        scale = f["head"].unitsPerEm / src["head"].unitsPerEm * 0.92  # metinle aynı göz boyu
        order = list(f.getGlyphOrder())
        added = 0
        for ch in SYMBOLS:
            cp = ord(ch)
            if cp in cmap or cp not in scmap:
                continue
            name = "kr_uni%04X" % cp
            pen = TTGlyphPen(None)
            sglyphs[scmap[cp]].draw(TransformPen(pen, (scale, 0, 0, scale, 0, 0)))
            f["glyf"].glyphs[name] = pen.glyph()
            f["hmtx"][name] = (round(src["hmtx"][scmap[cp]][0] * scale), 0)
            order.append(name)
            for table in f["cmap"].tables:
                if table.isUnicode():
                    table.cmap[cp] = name
            added += 1
        f.setGlyphOrder(order)
        f["glyf"].glyphOrder = order
        f["maxp"].numGlyphs = len(order)
        for rec in f["name"].names:
            if rec.nameID in (1, 4, 16):
                old = rec.toUnicode()
                rec.string = old.replace("Crimson Text", family).replace("Cinzel", family) if family not in old else old
        f.save(os.path.join(ROOT, "assets", "fonts", out))
        print(out, "+%d sembol" % added)

if __name__ == "__main__":
    main()
