"""Açılış sinematiği çekim planı. Zaman çizelgesi mobile/assets/ses/giris/zaman.json ile birebir.

bas/son: kesme noktaları (ms). gir: bu çekime geçiş ("erit", ms) çapraz geçiş kesme noktasında ortalanır;
("kara", ms) kararmadan açılır (önceki çekim `kararma` ms içinde kararır).
kamera: zoom/x/y/dolly/tx/ty/rol değerleri sabit, (bas, son) ya da [(u, v), ...]; pivot = sabit kalan derinlik.
renk: çekime özgü derecelendirme (RGB). Bölüm 1-3 soğuk, 4 altın saat, 5 köz ışığı.
"""

W, H, FPS = 720, 1280, 25
TOPLAM_MS = 56360

SOGUK = dict(pozlama=1.0, beyaz=(0.94, 0.99, 1.06), doygunluk=0.62, golge=(0.36, 0.48, 0.58), golge_guc=0.16,
             isik=(0.62, 0.6, 0.56), isik_guc=0.06, kontrast=1.18, pivot=0.40, siyah=0.014)
YANGIN = dict(pozlama=1.0, beyaz=(1.0, 0.98, 0.98), doygunluk=0.82, golge=(0.33, 0.44, 0.58), golge_guc=0.2,
              isik=(0.72, 0.52, 0.32), isik_guc=0.12, kontrast=1.16, pivot=0.40, siyah=0.012)
ALTIN = dict(pozlama=1.02, beyaz=(1.05, 1.0, 0.9), doygunluk=0.9, golge=(0.42, 0.42, 0.5), golge_guc=0.1,
             isik=(0.72, 0.58, 0.38), isik_guc=0.12, kontrast=1.12, pivot=0.42, siyah=0.016)
KOZ = dict(pozlama=1.0, beyaz=(1.04, 0.98, 0.94), doygunluk=0.9, golge=(0.42, 0.4, 0.44), golge_guc=0.08,
           isik=(0.7, 0.52, 0.34), isik_guc=0.1, kontrast=1.14, pivot=0.36, siyah=0.008)

CEKIMLER = [
    # 0–8.6 s · giriş + Kösedağ: sisli geçitte yavaş itme
    dict(gorsel="b1_kosedag_sis.png", bas=0, son=8600, gir=("kara", 2600), taban=0.3, tohum=1,
         kamera=dict(zoom=(1.03, 1.11), y=(0.49, 0.53), dolly=(0.0, 0.10), tx=(12, -12), pivot=0.3, el=0.8),
         pus=dict(guc=0.18, renk=(0.62, 0.67, 0.72), us=2.2),
         sis=[dict(d=0.25, renk=(0.72, 0.76, 0.8), guc=0.5, hiz=(26, -2), olcek=1.5, esik=0.38, bant=(0.25, 0.45, 0.7, 0.9)),
              dict(d=0.55, renk=(0.7, 0.74, 0.78), guc=0.22, hiz=(40, 0), olcek=1.0, esik=0.45)],
         parcacik=[dict(tip="cisenti", sayi=150, derinlik=(0.2, 1.0), opak=0.22)],
         renk=SOGUK),
    # 8.6–15.79 s · yenik asker: yay hareketi
    dict(gorsel="b1_kosedag_asker.png", bas=8600, son=15790, gir=("erit", 1400), tohum=2,
         kamera=dict(zoom=(1.05, 1.12), y=(0.47, 0.46), dolly=(0.0, 0.06), tx=(24, -24), pivot=0.8, el=0.9),
         pus=dict(guc=0.12, renk=(0.6, 0.64, 0.7), us=2.0),
         sis=[dict(d=0.15, renk=(0.36, 0.37, 0.39), guc=0.3, hiz=(14, -10), olcek=2.6, esik=0.3, bant=(0.0, 0.1, 0.45, 0.6)),
              dict(d=0.1, renk=(0.7, 0.72, 0.76), guc=0.3, hiz=(30, 0), olcek=1.0, esik=0.45, bant=(0.4, 0.5, 0.6, 0.72))],
         ates=dict(genlik=0.25, isik=0.0),
         parcacik=[dict(tip="cisenti", sayi=170, derinlik=(0.15, 1.0), opak=0.22), dict(tip="kul", sayi=50, derinlik=(0.3, 0.9))],
         renk=SOGUK),
    # 15.79–20.5 s · Moğol atlıları: sert itme, toz
    dict(gorsel="b2_mogol_atlilar.png", bas=15790, son=20500, gir=("kara", 500), kararma=700, tohum=3,
         kamera=dict(zoom=(1.08, 1.2), dolly=(0.02, 0.16), pivot=0.4, el=1.2, sarsinti=1.4, egri="lin"),
         pus=dict(guc=0.12, renk=(0.6, 0.56, 0.5), us=2.0),
         sis=[dict(d=0.5, renk=(0.62, 0.56, 0.48), guc=0.5, hiz=(-30, -6), olcek=1.0, esik=0.35, bant=(0.3, 0.5, 0.95, 1.0)),
              dict(d=0.95, renk=(0.6, 0.55, 0.48), guc=0.18, hiz=(60, -10), olcek=0.8, esik=0.5)],
         parcacik=[dict(tip="kum", sayi=150, derinlik=(0.3, 1.0), bolge=(0.68, 1.1), opak=0.35)],
         renk=SOGUK),
    # 20.5–24.7 s · yağma: yanan şehir, kozlar
    dict(gorsel="b2_yagma.png", bas=20500, son=24700, gir=("erit", 600), tohum=4,
         kamera=dict(zoom=(1.15, 1.08), y=(0.53, 0.49), dolly=(0.06, 0.0), pivot=0.4, el=0.8),
         ates=dict(genlik=0.22, isik=0.04), isi=dict(y0=0.2, y1=0.5, genlik=2.0),
         sis=[dict(d=0.45, renk=(0.12, 0.1, 0.1), guc=0.4, hiz=(10, -40), olcek=1.2, esik=0.38, bant=(0.0, 0.05, 0.45, 0.6))],
         parcacik=[dict(tip="koz", sayi=130, derinlik=(0.1, 0.85), bolge=(0.3, 1.0))],
         renk=YANGIN),
    # 24.7–28.04 s · boşalan köy: yanal kayış
    dict(gorsel="b2_bos_koy.png", bas=24700, son=28040, gir=("erit", 900), tohum=5,
         kamera=dict(zoom=(1.12, 1.12), dolly=(0.0, 0.05), tx=(24, -24), pivot=0.45, el=0.6),
         pus=dict(guc=0.14, renk=(0.62, 0.64, 0.66), us=2.0),
         sis=[dict(d=0.6, renk=(0.6, 0.6, 0.6), guc=0.3, hiz=(70, 0), olcek=1.0, esik=0.45, bant=(0.45, 0.6, 0.95, 1.0))],
         parcacik=[dict(tip="kum", sayi=120, derinlik=(0.2, 1.0), hiz=(120, -6))],
         renk=SOGUK),
    # 28.04–32.6 s · vergi: kar altında yük
    dict(gorsel="b3_vergi.png", bas=28040, son=32600, gir=("erit", 1200), tohum=6,
         kamera=dict(zoom=(1.08, 1.15), dolly=(0.0, 0.08), tx=(-12, 12), pivot=0.5, el=0.8),
         pus=dict(guc=0.16, renk=(0.66, 0.68, 0.72), us=2.0),
         parcacik=[dict(tip="kar", sayi=420, derinlik=(0.1, 1.0))],
         renk=SOGUK),
    # 32.6–36.64 s · çile: yüz, kar
    dict(gorsel="b3_cile.png", bas=32600, son=36640, gir=("erit", 1200), tohum=7,
         kamera=dict(zoom=(1.08, 1.14), dolly=(0.0, 0.05), pivot=0.7, el=0.7),
         parcacik=[dict(tip="kar", sayi=320, derinlik=(0.1, 1.0), odak=0.8)],
         renk=SOGUK),
    # 36.64–40.7 s · kervan: altın saat, huzme
    dict(gorsel="b4_kervan.png", bas=36640, son=40700, gir=("erit", 1600), tohum=8,
         kamera=dict(zoom=(1.12, 1.12), dolly=(0.0, 0.05), tx=(-26, 26), pivot=0.45, el=0.6),
         huzme=dict(x=0.5, y=0.4, guc=0.22, esik=0.72, renk=(1.0, 0.78, 0.45)),
         parcacik=[dict(tip="toz", sayi=200, derinlik=(0.2, 1.0))],
         renk=ALTIN),
    # 40.7–44.43 s · umut: profil, toz zerreleri
    dict(gorsel="b4_umut.png", bas=40700, son=44430, gir=("erit", 1200), tohum=9,
         kamera=dict(zoom=(1.08, 1.14), dolly=(0.0, 0.06), tx=(10, -10), pivot=0.7, el=0.7),
         parcacik=[dict(tip="toz", sayi=220, derinlik=(0.1, 1.0), odak=0.75)],
         renk=ALTIN),
    # 44.43–48.5 s · ocak başı
    dict(gorsel="b5_ocak.png", bas=44430, son=48500, gir=("kara", 1000), kararma=800, tohum=10,
         kamera=dict(zoom=(1.08, 1.16), dolly=(0.0, 0.07), pivot=0.6, el=0.5),
         ates=dict(genlik=0.25, isik=0.06), koz=dict(genlik=0.3),
         parcacik=[dict(tip="koz", sayi=70, derinlik=(0.4, 0.9), hiz=(4, -40))],
         renk=KOZ),
    # 48.5–56.36 s · kül ve köz; kuyrukta orta boş (başlık)
    dict(gorsel="b5_koz.png", bas=48500, son=56360, gir=("erit", 1600), tohum=11,
         kamera=dict(zoom=[(0.0, 1.3), (0.55, 1.14), (1.0, 1.06)], y=[(0.0, 0.66), (0.55, 0.56), (1.0, 0.52)],
                     dolly=(0.04, 0.0), pivot=0.6, el=0.4),
         ates=dict(genlik=0.2, isik=0.03), koz=dict(genlik=0.45), isi=dict(y0=0.3, y1=0.7, genlik=2.2),
         parcacik=[dict(tip="koz", sayi=90, derinlik=(0.3, 1.0), hiz=(4, -45))],
         renk=KOZ),
]
