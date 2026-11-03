# Kalite kanıtı 3/5 — hareket: gardda bekleme (4 sn döngü), çapraz iniş kesiği (2.5 sn), ağırlık testi pozları.
# Kullanım: blender -b in.blend --python k03_hareket.py -- out.blend
#
# Yöntem (yapay zekâ yok): kaynak kayıtlar (CMU 02_07-09, Quaternius UAL Sword_Attack/Sword_Idle) incelendi;
# UAL oyun tarzı kambur ve aşırı hamleli, CMU deneği acemi ve el yönelimi gürültülü çıktı (bkz. rapor).
# Hareket bu yüzden elle anahtarlandı; zamanlama UAL kesiğinin evrelerinden (hazırlık/vuruş/takip/toparlanma)
# alındı ve gerçek kılıç mekaniğine göre düzenlendi: vuruş kalçadan başlar, gövde ~2 kare, omuz/kol ~3-4 kare,
# kılıç ~5 kare gecikir. Ayaklar analitik IK ile zemine kilitlidir (top noktası sabit; topuk kalkınca top üstünde
# döner, kayma yok). Eğriler Catmull-Rom; dönemsel bekleme katmanları (nefes, ağırlık, kılıç ucu) 4 sn'ye tam bölünür.
import bpy, sys, math, json
from mathutils import Vector, Matrix, Quaternion, Euler

out = sys.argv[sys.argv.index('--') + 1]
rig = bpy.data.objects["Iskelet"]; A = rig.data; BN = A.bones
REST = {b.name: b.matrix_local.copy() for b in BN}
KAV_R = {k: Quaternion(v) for k, v in json.loads(rig["kavrama_r"]).items()}
KILIC_EL = Matrix(json.loads(rig["kilic_el"]))       # kılıcın el kemiği yerelindeki matrisi
EL_KILIC = KILIC_EL.inverted()

def V(*a): return Vector(a)
def RZ(d): return Matrix.Rotation(math.radians(d), 4, 'Z')
def RX(d): return Matrix.Rotation(math.radians(d), 4, 'X')
def RY(d): return Matrix.Rotation(math.radians(d), 4, 'Y')
def ROT(yaw, pitch, roll): return RZ(yaw) @ RX(pitch) @ RY(roll)

# ---------------------------------------------------------------- eğri: Catmull-Rom (uçlarda sıfır hız)
class Monoton:
    """Taşmasız kübik (Fritsch-Carlson, bileşen bazında): ayak teması gibi zemine inen kanallar için."""
    def __init__(self, keys):
        self.k = sorted(keys, key=lambda x: x[0]); self.t = [a for a, _ in self.k]
        self.p = [Egri._v(b) for _, b in self.k]; n = len(self.k); dim = len(self.p[0])
        self.m = [[0.0] * dim for _ in range(n)]
        for c in range(dim):
            d = [(self.p[i + 1][c] - self.p[i][c]) / (self.t[i + 1] - self.t[i]) for i in range(n - 1)]
            for i in range(1, n - 1):
                if d[i - 1] * d[i] <= 0: self.m[i][c] = 0.0
                else:
                    h0, h1 = self.t[i] - self.t[i - 1], self.t[i + 1] - self.t[i]
                    w1, w2 = 2 * h1 + h0, h1 + 2 * h0
                    self.m[i][c] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    def __call__(self, t):
        T = self.t
        if t <= T[0]: return self.p[0].copy()
        if t >= T[-1]: return self.p[-1].copy()
        i = max(j for j in range(len(T) - 1) if T[j] <= t)
        h = T[i + 1] - T[i]; s = (t - T[i]) / h; s2, s3 = s * s, s * s * s
        P0, P1 = self.p[i], self.p[i + 1]; M0, M1 = Vector(self.m[i]), Vector(self.m[i + 1])
        return P0 * (2 * s3 - 3 * s2 + 1) + M0 * h * (s3 - 2 * s2 + s) + P1 * (-2 * s3 + 3 * s2) + M1 * h * (s3 - s2)

class Egri:
    def __init__(self, keys): self.k = sorted(keys, key=lambda x: x[0])
    def __call__(self, t):
        k = self.k
        if t <= k[0][0]: return self._v(k[0][1])
        if t >= k[-1][0]: return self._v(k[-1][1])
        i = max(j for j in range(len(k) - 1) if k[j][0] <= t)
        t0, p0 = k[i]; t1, p1 = k[i + 1]
        pm = k[i - 1][1] if i > 0 else p0; tm = k[i - 1][0] if i > 0 else t0 - (t1 - t0)
        pp = k[i + 2][1] if i + 2 < len(k) else p1; tp = k[i + 2][0] if i + 2 < len(k) else t1 + (t1 - t0)
        P0, P1, PM, PP = map(self._v, (p0, p1, pm, pp))
        h = t1 - t0; s = (t - t0) / h
        m0 = (P1 - PM) * (h / (t1 - tm)) if i > 0 else P0 * 0
        m1 = (PP - P0) * (h / (tp - t0)) if i + 2 < len(k) else P0 * 0
        s2, s3 = s * s, s * s * s
        return P0 * (2 * s3 - 3 * s2 + 1) + m0 * (s3 - 2 * s2 + s) + P1 * (-2 * s3 + 3 * s2) + m1 * (s3 - s2)
    @staticmethod
    def _v(p): return Vector(p) if not isinstance(p, (int, float)) else Vector((p,))

def E(keys): return Egri(keys)

# ---------------------------------------------------------------- iskelet çözücü
def bas(n): return REST[n].translation.copy()
def uzun(a, b): return (bas(b) - bas(a)).length
L_UST, L_ALT = uzun("thigh_l", "calf_l"), uzun("calf_l", "foot_l")
L_KOL, L_ON = uzun("upperarm_r", "lowerarm_r"), uzun("lowerarm_r", "hand_r")

def ik2(a_bas, a_orta, a_uc, kok, hedef, kutup, l1, l2):
    """İki kemikli analitik IK. Döner: (üst delta dönüş, alt delta dönüş, gerçek uç). Menteşe ekseni dinlenmeden."""
    y1r = (bas(a_orta) - bas(a_bas)).normalized(); y2r = (bas(a_uc) - bas(a_orta)).normalized()
    hr = y1r.cross(y2r)
    if hr.length < 1e-4: hr = V(1, 0, 0)
    hr.normalize()
    d = hedef - kok; L = d.length
    L = min(max(L, abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4); u = d.normalized()
    kp = kutup - u * kutup.dot(u); kp.normalize()
    a = (l1 * l1 - l2 * l2 + L * L) / (2 * L); h = math.sqrt(max(l1 * l1 - a * a, 0.0))
    orta = kok + u * a + kp * h; uc = kok + u * L
    y1 = (orta - kok).normalized(); y2 = (uc - orta).normalized()
    hn = y1.cross(y2)
    if hn.length < 1e-5: hn = u.cross(kp)
    hn.normalize()
    if hn.dot(hr) * 0 != 0: pass
    def cerceve(y, hh):
        z = y.cross(hh).normalized(); hh2 = z.cross(y).normalized()
        return Matrix((y, hh2, z)).transposed()
    R1 = cerceve(y1, hn) @ cerceve(y1r, hr).transposed()
    R2 = cerceve(y2, hn) @ cerceve(y2r, hr).transposed()
    return R1.to_4x4(), R2.to_4x4(), uc

def bukulme_ekseni(taraf):
    """Parmak bükülme ekseni (boğum çizgisi), dinlenmede; işaret: uç avuca."""
    s = "_" + taraf
    k = (bas("index_01" + s) - bas("pinky_01" + s)).normalized()
    f = (bas("middle_01" + s) - bas("hand" + s)).normalized()
    k = (k - f * k.dot(f)).normalized()
    curl = REST["index_03" + s].translation + (REST["index_03" + s].to_3x3() @ V(0, BN["index_03" + s].length, 0)) - bas("index_01" + s)
    npalm = (curl - f * curl.dot(f) - k * curl.dot(k)).normalized()
    uc = bas("middle_03" + s); piv = bas("middle_01" + s)
    if ((Matrix.Rotation(0.2, 3, k) @ (uc - piv)) + piv - uc).dot(npalm) < 0: k = -k
    return k
K_SOL = bukulme_ekseni("l")
def sol_parmak(acilar):
    """Sol el parmakları: (01, 02, 03) dereceleri -> yerel dörtlükler."""
    q = {}
    for ad, (a1, a2, a3) in acilar.items():
        for j, a in enumerate((a1, a2, a3)):
            n = f"{ad}_0{j + 1}_l"; Rr = REST[n].to_3x3()
            q[n] = (Rr.inverted() @ Matrix.Rotation(math.radians(a), 3, K_SOL) @ Rr).to_quaternion()
    q["thumb_02_l"] = (REST["thumb_02_l"].to_3x3().inverted() @ Matrix.Rotation(math.radians(acilar["index"][1] * 0.3), 3, K_SOL) @ REST["thumb_02_l"].to_3x3()).to_quaternion()
    return q
SOL_GEVSEK = sol_parmak({"index": (18, 28, 18), "middle": (24, 34, 20), "ring": (28, 38, 22), "pinky": (32, 42, 24)})
# sol el yumruk (iki elle tutuş testi için): sağ kavrayışın aynası
def ayna_q(q):  # YZ düzlemine göre aynalama: (w,x,y,z)->(w,x,-y,-z) armature uzayında; kemik yerelinde de aynı simetri
    return Quaternion((q.w, q.x, -q.y, -q.z))
SOL_KAVRA = {n.replace("_r", "_l"): ayna_q(q) for n, q in KAV_R.items()}

def poz(c):
    """c: denetim sözlüğü -> {kemik: matrix_basis}. Ayrıca kontrol için bazı dünya noktaları döner."""
    D = {}
    # kök
    D["Root"] = Matrix.Identity(4)
    Rp = ROT(*c["kalca_rot"]); pp = V(*c["kalca"])
    D["pelvis"] = Matrix.Translation(pp) @ Rp @ Matrix.Translation(-bas("pelvis"))
    q = ROT(*c["gogus"]).to_quaternion(); qi = Quaternion()
    onceki = D["pelvis"]
    for n, fr in (("spine_01", 0.28), ("spine_02", 0.58), ("spine_03", 1.0)):
        h = onceki @ bas(n)
        Rn = Rp @ qi.slerp(q, fr).to_matrix().to_4x4()
        D[n] = Matrix.Translation(h) @ Rn @ Matrix.Translation(-bas(n)); onceki = D[n]
    Rg = Rp @ q.to_matrix().to_4x4()
    # nefes: göğüs biraz daha açılır (ayrı küçük eğim)
    # boyun / baş
    qb = ROT(*c["bas"]).to_quaternion()
    h = D["spine_03"] @ bas("neck_01"); Rn = Rg @ qi.slerp(qb, 0.4).to_matrix().to_4x4()
    D["neck_01"] = Matrix.Translation(h) @ Rn @ Matrix.Translation(-bas("neck_01"))
    h = D["neck_01"] @ bas("head"); Rh = Rg @ qb.to_matrix().to_4x4()
    D["head"] = Matrix.Translation(h) @ Rh @ Matrix.Translation(-bas("head"))
    # bacaklar
    for s in ("l", "r"):
        top, yaw, topuk = V(*c["ayak_" + s][0]), c["ayak_" + s][1], c["ayak_" + s][2]
        Rf = RZ(yaw) @ RX(topuk)
        # topuk kalkınca ayak, top kemiğinin 2 cm altındaki zemin temas noktası üstünde döner (taban zemine gömülmez)
        piv = top - V(0, 0, 0.02); top_n = piv + Rf.to_3x3() @ V(0, 0, 0.02)
        bilek = top_n + Rf.to_3x3() @ (bas("foot_" + s) - bas("ball_" + s))
        kalca_n = D["pelvis"] @ bas("thigh_" + s)
        dis = 1 if s == "l" else -1
        kutup = (RZ(yaw).to_3x3() @ V(0, -1, 0)) + V(dis * c.get("diz_dis", 0.25), 0, 0)
        R1, R2, uc = ik2("thigh_" + s, "calf_" + s, "foot_" + s, kalca_n, bilek, kutup, L_UST, L_ALT)
        D["thigh_" + s] = Matrix.Translation(kalca_n) @ R1 @ Matrix.Translation(-bas("thigh_" + s))
        diz = kalca_n + R1.to_3x3() @ (bas("calf_" + s) - bas("thigh_" + s))
        D["calf_" + s] = Matrix.Translation(diz) @ R2 @ Matrix.Translation(-bas("calf_" + s))
        D["foot_" + s] = Matrix.Translation(uc) @ Rf @ Matrix.Translation(-bas("foot_" + s))
        tp = D["foot_" + s] @ bas("ball_" + s)
        D["ball_" + s] = Matrix.Translation(tp) @ RZ(yaw) @ Matrix.Translation(-bas("ball_" + s))
        c.setdefault("_gergin", {})[s] = ((bilek - kalca_n).length - (L_UST + L_ALT))
    # kollar
    for s in ("r", "l"):
        dis = -1 if s == "r" else 1
        if s == "r":
            G = c["kilic"]
            Mh = G @ EL_KILIC                          # el kemiği poz matrisi (armature uzayı)
        else:
            Mh = c["sol_el"]
        bilek_h = Mh.translation
        # köprücük: kol kalkınca omuz yükselir, öne uzanınca öne kayar
        omuz0 = D["spine_03"] @ bas("upperarm_" + s)
        yon = (bilek_h - omuz0); yuk = math.degrees(math.asin(max(-1, min(1, yon.normalized().z))))
        kal = max(0.0, min(22.0, 0.32 * (yuk + 25))) + c.get("omuz_" + s, 0.0)
        one = max(-8.0, min(14.0, 0.18 * math.degrees(math.atan2(-(Rg.inverted().to_3x3() @ yon).y, 0.3))))
        Rk = Rg @ RY(-dis * kal * 0.8) @ RZ(-dis * one * 0.6)
        hk = D["spine_03"] @ bas("clavicle_" + s)
        D["clavicle_" + s] = Matrix.Translation(hk) @ Rk @ Matrix.Translation(-bas("clavicle_" + s))
        omuz = D["clavicle_" + s] @ bas("upperarm_" + s)
        kutup = Vector(c["dirsek_" + s]).normalized()
        R1, R2, uc = ik2("upperarm_" + s, "lowerarm_" + s, "hand_" + s, omuz, bilek_h, kutup, L_KOL, L_ON)
        D["upperarm_" + s] = Matrix.Translation(omuz) @ R1 @ Matrix.Translation(-bas("upperarm_" + s))
        dirsek = omuz + R1.to_3x3() @ (bas("lowerarm_" + s) - bas("upperarm_" + s))
        # önkol burgusu: elin önkola göre dönüşünün %55'i önkola (bilekte "şeker kâğıdı" ezilmesi olmasın)
        Rel = Mh.to_3x3() @ REST["hand_" + s].to_3x3().inverted()
        Ron = R2.to_3x3()
        eks = (uc - dirsek).normalized()
        fark = (Ron.inverted() @ Rel).to_quaternion()
        # burgu bileşeni (önkol ekseni etrafında)
        ek_l = Ron.inverted() @ eks
        tw = Quaternion((fark.w, *(ek_l * Vector(fark[1:]).dot(ek_l))))
        tw.normalize()
        burgu = Quaternion().slerp(tw, 0.55)
        R2b = (Ron @ burgu.to_matrix()).to_4x4()
        D["lowerarm_" + s] = Matrix.Translation(dirsek) @ R2b @ Matrix.Translation(-bas("lowerarm_" + s))
        D["hand_" + s] = Matrix.Translation(uc) @ Rel.to_4x4() @ Matrix.Translation(-bas("hand_" + s))
        c.setdefault("_kol_gergin", {})[s] = ((bilek_h - omuz).length - (L_KOL + L_ON))
    # D -> matrix_basis (ebeveyne göre)
    basis = {}
    for n, Dn in D.items():
        b = BN[n]; p = b.parent
        Dp = D[p.name] if p else Matrix.Identity(4)
        basis[n] = REST[n].inverted() @ Dp.inverted() @ Dn @ REST[n]
    return basis

# ---------------------------------------------------------------- kılıç çerçevesi
def kilic_M(kabza, namlu, agiz_ipucu):
    b = Vector(namlu).normalized(); e = Vector(agiz_ipucu); e = (e - b * e.dot(b)).normalized()
    x = b.cross(e).normalized()
    return Matrix.Translation(Vector(kabza)) @ Matrix((x, e, b)).transposed().to_4x4()

def sol_el_M(konum, avuc_yon, parmak_yon):
    """Sol el: kemik Y ekseni = parmak yönü; avuç normali yaklaşık."""
    Rr = REST["hand_l"].to_3x3()
    y = Vector(parmak_yon).normalized(); n = Vector(avuc_yon); n = (n - y * n.dot(y)).normalized()
    # dinlenmedeki el çerçevesi: y_r, n_r
    y_r = Rr @ V(0, 1, 0); fl = bas("middle_01_l") - bas("hand_l")
    n_r = REST["index_03_l"].translation - bas("index_01_l"); n_r = (n_r - y_r * n_r.dot(y_r)).normalized()
    F1 = Matrix((y, n, y.cross(n))).transposed(); F0 = Matrix((y_r, n_r, y_r.cross(n_r))).transposed()
    Rd = F1 @ F0.transposed()
    return Matrix.Translation(Vector(konum)) @ (Rd @ Rr).to_4x4()

# ---------------------------------------------------------------- ortak gard duruşu
GARD = dict(
    kalca=(-0.012, -0.075, 0.872), kalca_rot=(-28.0, 4.0, 0.0), gogus=(8.0, 5.0, 0.0), bas=(16.0, -4.0, 0.0),
    ayak_l=((0.135, -0.315, 0.008), 12.0, 0.0), ayak_r=((-0.165, 0.115, 0.008), -38.0, 0.0),
    kabza=(-0.205, -0.330, 1.035), namlu=(0.07, -0.84, 0.54), agiz=(0.0, -0.45, -1.0),
    sol=(0.205, -0.265, 1.140), sol_avuc=(-0.6, 0.0, -0.8), sol_parmak=(-0.25, -0.85, 0.2),
    dirsek_r=(-0.55, 0.45, -1.0), dirsek_l=(0.65, 0.35, -1.0),
)

def gard_ekle(c, t, faz=0.0, w=1.0):
    """Dönemsel bekleme katmanı (periyot 4 sn): nefes, ağırlık aktarımı, kılıç ucu ve baş canlılığı."""
    T = 4.0; w2 = 2 * math.pi / T
    nefes = 0.5 - 0.5 * math.cos(w2 * t + faz)            # 0..1 (2 sn soluk al, 2 sn ver)
    nefes = nefes ** 0.85
    sw = math.sin(w2 * t + 0.6 + faz); sw2 = math.sin(2 * w2 * t + 1.3 + faz)
    k = list(c["kalca"]); k[0] += w * 0.011 * sw; k[1] += w * 0.004 * sw2; k[2] += w * (0.0025 * nefes - 0.002 * abs(sw))
    c["kalca"] = tuple(k)
    kr = list(c["kalca_rot"]); kr[2] += w * (-1.4 * sw); kr[0] += w * 0.8 * sw2; c["kalca_rot"] = tuple(kr)
    g = list(c["gogus"]); g[1] += w * (-1.8 * nefes); g[2] += w * 1.1 * sw; g[0] += w * 0.6 * math.sin(w2 * t + 2.0 + faz)
    c["gogus"] = tuple(g)
    b = list(c["bas"]); b[0] += w * 2.2 * math.sin(w2 * t + 1.1 + faz) + w * 0.6 * math.sin(3 * w2 * t + faz)
    b[1] += w * (0.9 * math.sin(2 * w2 * t + 0.4 + faz) + 0.8 * nefes); b[2] += w * -0.7 * sw
    c["bas"] = tuple(b)
    c["omuz_r"] = c.get("omuz_r", 0) + w * 2.2 * nefes; c["omuz_l"] = c.get("omuz_l", 0) + w * 2.2 * nefes
    kb = list(c["kabza"]); kb[0] += w * 0.006 * math.sin(w2 * t + 0.3 + faz); kb[1] += w * 0.005 * sw2
    kb[2] += w * (0.007 * math.sin(w2 * t + 2.2 + faz) + 0.006 * nefes); c["kabza"] = tuple(kb)
    nm = list(c["namlu"]); nm[0] += w * 0.025 * math.sin(w2 * t + 1.7 + faz); nm[2] += w * 0.03 * math.sin(2 * w2 * t + 0.9 + faz)
    c["namlu"] = tuple(nm)
    sl = list(c["sol"]); sl[2] += w * (0.008 * nefes + 0.004 * sw2); sl[0] += w * 0.005 * sw; c["sol"] = tuple(sl)
    return c

def denetim(c):
    """Anahtar sözlüğünü poz() girdisine çevir."""
    d = dict(c)
    d["kilic"] = kilic_M(c["kabza"], c["namlu"], c["agiz"])
    d["sol_el"] = sol_el_M(c["sol"], c["sol_avuc"], c["sol_parmak"])
    return d

# ---------------------------------------------------------------- saldırı anahtarları (saniye)
def S(keys): return E(keys)
SALDIRI = {
    "kalca": S([(0.0, GARD["kalca"]), (0.12, GARD["kalca"]), (0.40, (-0.030, -0.020, 0.866)), (0.56, (-0.042, 0.005, 0.862)),
                (0.66, (-0.030, -0.060, 0.858)), (0.80, (-0.004, -0.175, 0.846)), (0.95, (0.012, -0.205, 0.840)),
                (1.20, (0.014, -0.200, 0.843)), (1.50, (0.004, -0.165, 0.852)), (1.80, (-0.008, -0.100, 0.866)),
                (1.98, (-0.014, -0.070, 0.874)), (2.18, (-0.013, -0.078, 0.870)), (2.50, GARD["kalca"])]),
    "kalca_rot": S([(0.0, GARD["kalca_rot"]), (0.12, GARD["kalca_rot"]), (0.42, (-38.0, 1.0, -2.0)), (0.58, (-44.0, -1.0, -3.0)),
                    (0.70, (-34.0, 3.0, -1.0)), (0.82, (-14.0, 9.0, 2.0)), (0.96, (2.0, 13.0, 3.0)), (1.20, (6.0, 13.0, 3.0)),
                    (1.50, (-4.0, 10.0, 1.5)), (1.85, (-22.0, 6.0, 0.0)), (2.05, (-30.0, 3.5, -0.4)), (2.25, (-27.5, 4.4, 0.2)),
                    (2.50, GARD["kalca_rot"])]),
    "gogus": S([(0.0, GARD["gogus"]), (0.14, GARD["gogus"]), (0.45, (-10.0, -2.0, -2.0)), (0.62, (-22.0, -6.0, -3.0)),
                (0.74, (-12.0, 0.0, 0.0)), (0.86, (12.0, 9.0, 5.0)), (1.00, (26.0, 13.0, 7.0)), (1.25, (24.0, 12.0, 5.0)),
                (1.55, (14.0, 8.0, 2.0)), (1.90, (6.0, 4.0, -0.5)), (2.12, (9.0, 5.5, 0.4)), (2.50, GARD["gogus"])]),
    "bas": S([(0.0, GARD["bas"]), (0.4, (22.0, -2.0, 1.0)), (0.62, (30.0, -1.0, 2.0)), (0.86, (6.0, -6.0, -2.0)),
              (1.05, (-20.0, -9.0, -4.0)), (1.30, (-18.0, -8.0, -3.0)), (1.70, (6.0, -5.0, -1.0)), (2.10, (17.0, -4.0, 0.0)),
              (2.50, GARD["bas"])]),
    # ön (sol) ayak: 0.60'ta topuk kalkar, havada öne, 0.78'de basar; 1.62'de geri adım, 1.90'da gard yerinde
    "ayak_l_p": Monoton([(0.0, GARD["ayak_l"][0]), (0.58, GARD["ayak_l"][0]), (0.66, (0.136, -0.345, 0.040)), (0.72, (0.138, -0.430, 0.042)),
                   (0.78, (0.140, -0.490, 0.008)), (1.62, (0.140, -0.490, 0.008)), (1.70, (0.139, -0.450, 0.034)),
                   (1.80, (0.137, -0.360, 0.030)), (1.88, (0.135, -0.315, 0.008)), (2.50, GARD["ayak_l"][0])]),
    "ayak_l_a": Monoton([(0.0, (12.0, 0.0)), (0.56, (12.0, 0.0)), (0.62, (12.0, 14.0)), (0.70, (11.0, 6.0)), (0.78, (14.0, 0.0)),
                   (1.60, (14.0, 0.0)), (1.66, (14.0, 10.0)), (1.78, (13.0, 4.0)), (1.88, (12.0, 0.0)), (2.50, (12.0, 0.0))]),
    # arka (sağ) ayak: top yerinde kalır, vuruşta topuk kalkar ve top üstünde içe döner (kalça dönüşüyle)
    "ayak_r_a": Monoton([(0.0, (-38.0, 0.0)), (0.74, (-38.0, 0.0)), (0.88, (-30.0, 14.0)), (1.00, (-24.0, 24.0)), (1.25, (-24.0, 22.0)),
                   (1.55, (-30.0, 10.0)), (1.85, (-37.0, 1.0)), (1.95, (-38.0, 0.0)), (2.50, (-38.0, 0.0))]),
    # kılıç: kabza konumu, namlu yönü, ağız ipucu (vuruş penceresinde ağız hareket yönüne kendiliğinden döner)
    "kabza": S([(0.0, GARD["kabza"]), (0.12, GARD["kabza"]), (0.32, (-0.245, -0.250, 1.190)), (0.50, (-0.265, -0.050, 1.450)),
                (0.60, (-0.270, 0.010, 1.530)), (0.70, (-0.280, -0.140, 1.530)), (0.78, (-0.200, -0.385, 1.390)),
                (0.86, (0.010, -0.480, 1.170)), (0.94, (0.130, -0.480, 1.000)), (1.06, (0.250, -0.400, 0.900)),
                (1.30, (0.240, -0.390, 0.920)), (1.62, (0.000, -0.400, 1.110)), (1.90, (-0.160, -0.360, 1.060)),
                (2.10, (-0.215, -0.325, 1.025)), (2.50, GARD["kabza"])]),
    "namlu": S([(0.0, GARD["namlu"]), (0.12, GARD["namlu"]), (0.32, (0.02, -0.45, 0.89)), (0.50, (0.10, 0.25, 0.96)),
                (0.60, (0.12, 0.55, 0.83)), (0.70, (0.10, 0.10, 0.99)), (0.78, (0.30, -0.65, 0.70)), (0.86, (0.62, -0.74, 0.05)),
                (0.94, (0.60, -0.42, -0.68)), (1.06, (0.56, 0.05, -0.83)), (1.30, (0.55, 0.10, -0.83)),
                (1.62, (0.18, -0.72, 0.67)), (1.90, (0.10, -0.85, 0.52)), (2.10, (0.065, -0.845, 0.535)), (2.50, GARD["namlu"])]),
    "agiz": S([(0.0, GARD["agiz"]), (0.20, GARD["agiz"]), (0.45, (0.3, -0.9, 0.2)), (0.60, (0.2, -0.6, 0.8)),
               (1.30, (-0.2, -0.9, -0.3)), (1.62, (0.0, -0.6, -0.9)), (2.50, GARD["agiz"])]),
    "sol": S([(0.0, GARD["sol"]), (0.20, GARD["sol"]), (0.50, (0.170, -0.360, 1.260)), (0.62, (0.160, -0.390, 1.290)),
              (0.80, (0.230, -0.200, 1.120)), (0.96, (0.290, -0.020, 0.990)), (1.25, (0.290, 0.000, 1.000)),
              (1.65, (0.240, -0.180, 1.100)), (2.05, (0.208, -0.262, 1.138)), (2.50, GARD["sol"])]),
    "dirsek_r": S([(0.0, GARD["dirsek_r"]), (0.30, (-0.8, 0.3, -0.5)), (0.55, (-1.0, -0.2, 0.25)), (0.70, (-1.0, -0.3, 0.1)),
                   (0.86, (-0.6, 0.2, -1.0)), (1.06, (-0.3, 0.7, -1.0)), (1.40, (-0.3, 0.7, -1.0)), (1.80, (-0.55, 0.45, -1.0)),
                   (2.50, GARD["dirsek_r"])]),
    "dirsek_l": S([(0.0, GARD["dirsek_l"]), (0.6, (0.7, 0.1, -1.0)), (1.0, (0.6, 0.6, -1.0)), (1.6, (0.65, 0.4, -1.0)), (2.5, GARD["dirsek_l"])]),
}
VURUS = (0.66, 1.08)   # ağzın hareket yönüne kilitlendiği pencere

def saldiri_denetim(t, onceki_uc=None, sonraki_uc=None):
    c = dict(GARD)
    for k_, e_ in SALDIRI.items():
        v = e_(t)
        if k_ == "ayak_l_p": continue
        c[k_] = tuple(v)
    c["ayak_l"] = (tuple(SALDIRI["ayak_l_p"](t)), SALDIRI["ayak_l_a"](t)[0], SALDIRI["ayak_l_a"](t)[1])
    c["ayak_r"] = (GARD["ayak_r"][0], SALDIRI["ayak_r_a"](t)[0], SALDIRI["ayak_r_a"](t)[1])
    # ağız: vuruş penceresinde namlu ucunun hızına dönük
    if onceki_uc is not None and VURUS[0] - 0.08 < t < VURUS[1] + 0.12:
        b = Vector(c["namlu"]).normalized(); hz = (sonraki_uc - onceki_uc); hz = hz - b * hz.dot(b)
        if hz.length > 1e-4:
            w = min(1.0, (t - (VURUS[0] - 0.08)) / 0.08, ((VURUS[1] + 0.12) - t) / 0.12)
            ei = Vector(c["agiz"]).normalized().lerp(hz.normalized(), max(0.0, min(1.0, w)))
            c["agiz"] = tuple(ei)
    # bekleme katmanı uçlarda (döngüye dikişsiz bağlanır)
    w = max(0.0, 1.0 - t / 0.35) + max(0.0, (t - 2.05) / 0.45)
    gard_ekle(c, t if t < 1.25 else t - 2.5, w=min(1.0, w))
    return c

# ---------------------------------------------------------------- pişirme
def kemik_hazirla():
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'
def pisir(ad, fps, kareler, denetim_f, sol_parmak=SOL_GEVSEK, kav_sol=False):
    act = bpy.data.actions.new(ad); act.use_fake_user = True
    rig.animation_data_create(); rig.animation_data.action = act
    kemik_hazirla()
    en_gergin = 0.0; kol_g = 0.0; onceki_q = {}
    for fr in kareler:
        c = denetim(denetim_f(fr))
        basis = poz(c)
        en_gergin = max(en_gergin, max(c["_gergin"].values())); kol_g = max(kol_g, max(c["_kol_gergin"].values()))
        for n, Mb in basis.items():
            pb = rig.pose.bones[n]
            loc, rot, _ = Mb.decompose()
            if n in onceki_q and onceki_q[n].dot(rot) < 0: rot.negate()
            onceki_q[n] = rot.copy()
            pb.rotation_quaternion = rot
            pb.keyframe_insert("rotation_quaternion", frame=fr)
            if n in ("pelvis", "Root"):
                pb.location = loc; pb.keyframe_insert("location", frame=fr)
        for n, q in KAV_R.items():
            pb = rig.pose.bones[n]; pb.rotation_quaternion = q; pb.keyframe_insert("rotation_quaternion", frame=fr)
        for n, q in (SOL_KAVRA if kav_sol else sol_parmak).items():
            pb = rig.pose.bones[n]; pb.rotation_quaternion = q; pb.keyframe_insert("rotation_quaternion", frame=fr)
    # dörtlük sürekliliği (işaret dönmesi olmasın) ve doğrusal ara değer (zaten her kare anahtar)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
    print("PISTI", ad, len(kareler), "kare; bacak gerginliği (m, >0 ise ayak havada):", round(en_gergin, 4), "kol:", round(kol_g, 4))
    return act

# bekleme: 24 fps, 96 kare = 4 sn, kare 1..96 (97 = 1 ile aynı)
def bekleme_f(fr):
    t = (fr - 1) / 24.0
    return gard_ekle(dict(GARD), t)
pisir("bekleme", 24, range(1, 98), bekleme_f)

# saldırı: 48 kare/sn hesap (yavaş çekim için ara kareler gerçek), 2.5 sn = 121 kare
_uc = {}
def uc_konum(t):
    c = denetim(saldiri_denetim(t))
    return (c["kilic"] @ V(0, 0, 0.70))
def saldiri_f(fr):
    t = (fr - 1) / 48.0
    return saldiri_denetim(t, uc_konum(t - 1 / 96), uc_konum(t + 1 / 96))
pisir("saldiri", 48, range(1, 122), saldiri_f)

# ağırlık testi: 6 poz, her biri 16 karede kurulur + 8 kare tutulur (24 fps), kumaş yerleşsin
def P(**kw):
    d = dict(GARD); d.update(kw); return d
POZLAR = [
    ("kollar_one", P(kalca=(0, -0.02, 0.905), kalca_rot=(0, 2, 0), gogus=(0, 2, 0), bas=(0, -2, 0),
                     ayak_l=((0.16, -0.14, 0.008), 8, 0), ayak_r=((-0.16, -0.14, 0.008), -8, 0),
                     kabza=(-0.17, -0.60, 1.36), namlu=(0.0, -0.75, 0.66), agiz=(0, 0, -1),
                     sol=(0.17, -0.60, 1.36), sol_avuc=(-1, 0, 0), sol_parmak=(0, -1, 0),
                     dirsek_r=(-0.5, 0.2, -1), dirsek_l=(0.5, 0.2, -1))),
    ("kollar_yana", P(kalca=(0, -0.02, 0.905), kalca_rot=(0, 2, 0), gogus=(0, 0, 0), bas=(0, -2, 0),
                      ayak_l=((0.16, -0.14, 0.008), 8, 0), ayak_r=((-0.16, -0.14, 0.008), -8, 0),
                      kabza=(-0.76, -0.06, 1.40), namlu=(-0.3, -0.6, 0.75), agiz=(0, -1, 0),
                      sol=(0.76, -0.06, 1.40), sol_avuc=(0, 0, -1), sol_parmak=(1, 0, 0),
                      dirsek_r=(0, 0.6, -1), dirsek_l=(0, 0.6, -1))),
    ("iki_el", P(kabza=(-0.06, -0.30, 1.50), namlu=(0.05, 0.25, 0.97), agiz=(0, -1, 0.2),
                 sol=(-0.035, -0.255, 1.385), sol_avuc=(-1, 0, 0), sol_parmak=(0, -1, 0.1),
                 dirsek_r=(-1, 0, -0.4), dirsek_l=(1, 0, -0.4))),
    ("govde_donus", P(kalca_rot=(-10, 4, 0), gogus=(-50, 6, -3), bas=(30, -3, 0))),
    ("derin_comelme", P(kalca=(0.0, 0.02, 0.50), kalca_rot=(0, 28, 0), gogus=(0, 12, 0), bas=(0, -30, 0),
                        ayak_l=((0.22, -0.16, 0.008), 25, 0), ayak_r=((-0.22, -0.16, 0.008), -25, 0), diz_dis=0.7,
                        kabza=(-0.20, -0.55, 0.95), namlu=(0.1, -0.9, 0.4), sol=(0.20, -0.52, 0.95),
                        sol_avuc=(-1, 0, 0), sol_parmak=(0, -1, 0), dirsek_l=(0.6, 0.3, -1))),
    ("genis_adim", P(kalca=(0.0, -0.30, 0.74), kalca_rot=(-15, 6, 0), gogus=(10, 8, 0), bas=(5, -6, 0),
                     ayak_l=((0.15, -0.78, 0.008), 10, 0), ayak_r=((-0.17, 0.22, 0.008), -35, 25),
                     kabza=(-0.12, -0.80, 1.20), namlu=(0.05, -0.97, 0.22), agiz=(0, 0, -1),
                     sol=(0.30, -0.10, 1.05))),
]
def agirlik_f(fr):
    i = min((fr - 1) // 24, len(POZLAR) - 1); t = ((fr - 1) % 24) / 16.0
    onceki = GARD if i == 0 else POZLAR[i - 1][1]; simdi = POZLAR[i][1]
    s = min(1.0, t); s = s * s * (3 - 2 * s)
    c = {}
    for k_ in GARD:
        a_, b_ = onceki.get(k_, GARD[k_]), simdi.get(k_, GARD[k_])
        if k_.startswith("ayak"):
            c[k_] = (tuple(Vector(a_[0]).lerp(Vector(b_[0]), s)), a_[1] + (b_[1] - a_[1]) * s, a_[2] + (b_[2] - a_[2]) * s)
        else:
            c[k_] = tuple(Vector(a_).lerp(Vector(b_), s))
    c["diz_dis"] = onceki.get("diz_dis", 0.25) + (simdi.get("diz_dis", 0.25) - onceki.get("diz_dis", 0.25)) * s
    return c
act = pisir("agirlik", 24, range(1, 24 * len(POZLAR) + 1), agirlik_f)
# iki elle tutuş pozunda sol el yumruk: o karelerde sol parmakları kavrama aynasına çevir
for fr in range(2 * 24 + 1, 3 * 24 + 1):
    for n, q in SOL_KAVRA.items():
        pb = rig.pose.bones[n]; pb.rotation_quaternion = q; pb.keyframe_insert("rotation_quaternion", frame=fr)
rig["agirlik_kareleri"] = json.dumps({ad: 24 * i + 22 for i, (ad, _) in enumerate(POZLAR)})
rig.animation_data.action = bpy.data.actions["bekleme"]
bpy.ops.wm.save_as_mainfile(filepath=out)
print("KAYDEDILDI", out)
