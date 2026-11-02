"""Göz denetimi için videodan zaman damgalı kareler çekip yan yana birleştirir.

Kullanım: python denetim.py video.mp4 cikti.jpg ms1,ms2,... [genislik=240]
"""
import subprocess
import sys

import cv2
import numpy as np


def kare(video, ms, w=720, h=1280):
    r = subprocess.run(["ffmpeg", "-loglevel", "error", "-ss", f"{ms / 1000:.3f}", "-i", video, "-frames:v", "1",
                        "-f", "rawvideo", "-pix_fmt", "bgr24", "-"], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.uint8)[: w * h * 3].reshape(h, w, 3)


def main():
    video, cikti, zamanlar = sys.argv[1:4]
    gen = int(sys.argv[4]) if len(sys.argv) > 4 else 240
    ims = []
    for ms in [float(x) for x in zamanlar.split(",")]:
        im = cv2.resize(kare(video, ms), (gen, int(gen * 16 / 9)), interpolation=cv2.INTER_AREA)
        cv2.putText(im, f"{ms / 1000:.1f}s", (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA)
        ims.append(im)
    while len(ims) % 4:
        ims.append(np.zeros_like(ims[0]))
    satirlar = [np.hstack(ims[i:i + 4]) for i in range(0, len(ims), 4)]
    cv2.imwrite(cikti, np.vstack(satirlar), [cv2.IMWRITE_JPEG_QUALITY, 88])


if __name__ == "__main__":
    main()
