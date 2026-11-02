"""Depth Anything V2 Small (ONNX, CPU) ile göreli yakınlık haritası üretir.

Kullanım: python derinlik.py model.onnx girdi.png cikti.npy [onizleme.png]
Çıktı: float16 dizisi, görüntü boyutunda, 0 = en uzak, 1 = en yakın (göreli ters derinlik).
"""
import sys

import cv2
import numpy as np
import onnxruntime as ort


def derinlik(model_yolu: str, img_bgr: np.ndarray, kisa_kenar: int = 616) -> np.ndarray:
    h, w = img_bgr.shape[:2]
    oran = kisa_kenar / min(h, w)
    th = int(round(h * oran / 14)) * 14
    tw = int(round(w * oran / 14)) * 14
    rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    x = cv2.resize(rgb, (tw, th), interpolation=cv2.INTER_CUBIC)
    x = (x - np.array([0.485, 0.456, 0.406], np.float32)) / np.array([0.229, 0.224, 0.225], np.float32)
    x = x.transpose(2, 0, 1)[None].astype(np.float32)
    so = ort.SessionOptions()
    so.intra_op_num_threads = 4
    ses = ort.InferenceSession(model_yolu, so, providers=["CPUExecutionProvider"])
    out = ses.run(None, {ses.get_inputs()[0].name: x})[0]
    d = np.squeeze(out).astype(np.float32)
    d = cv2.resize(d, (w, h), interpolation=cv2.INTER_CUBIC)
    lo, hi = np.percentile(d, 0.5), np.percentile(d, 99.5)
    d = np.clip((d - lo) / max(hi - lo, 1e-6), 0, 1)
    return d


if __name__ == "__main__":
    model, girdi, cikti = sys.argv[1:4]
    img = cv2.imread(girdi, cv2.IMREAD_COLOR)
    d = derinlik(model, img)
    np.save(cikti, d.astype(np.float16))
    if len(sys.argv) > 4:
        cv2.imwrite(sys.argv[4], (d * 255).astype(np.uint8))
    print(cikti, d.shape, float(d.mean()))
