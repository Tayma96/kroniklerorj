"""Üretilen sahnelerde küçük, belgelenmiş rötuşlar (anakronizm/bozukluk giderme).

Kullanım: python rotus.py <girdi.png> <cikti.png> <sahne_id>
Rötuş yoksa dosya olduğu gibi kopyalanır. Her işlem KAYNAK.md'de listelenir.
"""
import sys

import cv2
import numpy as np

# sahne_id -> [(işlem, parametreler)]; koordinatlar 640x1136 üretim pikseli
ROTUS = {
    # çizme tabanlarındaki modern tırtıklı desen: düzleştir, çamurlu deri taban gibi koyulaştır
    "b1_kosedag_asker": [("duzlestir", dict(elips=[(362, 1020, 34, 64), (429, 1020, 33, 64)], k=17, koyu=0.82))],
}


def duzlestir(img, elips, k, koyu):
    maske = np.zeros(img.shape[:2], np.float32)
    for cx, cy, rx, ry in elips:
        cv2.ellipse(maske, (cx, cy), (rx, ry), 0, 0, 360, 1.0, -1)
    maske = cv2.GaussianBlur(maske, (0, 0), 5)[..., None]
    duz = cv2.medianBlur(img, k)
    duz = cv2.bilateralFilter(duz, 9, 30, 9).astype(np.float32) * koyu
    rng = np.random.default_rng(7)
    duz += rng.normal(0, 3.0, duz.shape).astype(np.float32)
    return np.clip(img.astype(np.float32) * (1 - maske) + duz * maske, 0, 255).astype(np.uint8)


def main():
    girdi, cikti, sid = sys.argv[1:4]
    img = cv2.imread(girdi, cv2.IMREAD_COLOR)
    for islem, p in ROTUS.get(sid, []):
        if islem == "duzlestir":
            img = duzlestir(img, **p)
    cv2.imwrite(cikti, img)


if __name__ == "__main__":
    main()
