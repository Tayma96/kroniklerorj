# CMU -> cmu_mb aktarımı (retarget.py mantığı) + oyun klibi işleme:
# kök kayması/yön düzeltme, zaman bükme, kılıç eli yönü, sol eli kabzaya IK, ayak sabitleme,
# muhafız pozuna yumuşak giriş/çıkış, döngü eşleme. Her klip kendi NLA izine.
# Kullanım: blender -b base.blend --python anim.py -- out.blend clips.json diag.json
import bpy, sys, math, json
from mathutils import Vector, Matrix, Quaternion
argv = sys.argv[sys.argv.index('--') + 1:]
OUT, SPEC, DIAG = argv[0], json.load(open(argv[1])), argv[2]
sc = bpy.context.scene
rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
D2R = math.pi / 180
MAP = {"lfemur": "LeftUpLeg", "ltibia": "LeftLeg", "lfoot": "LeftFoot", "ltoes": "LeftToeBase",
       "rfemur": "RightUpLeg", "rtibia": "RightLeg", "rfoot": "RightFoot", "rtoes": "RightToeBase",
       "lowerback": "LowerBack", "upperback": "Spine", "thorax": "Spine1", "lowerneck": "Neck", "upperneck": "Neck1", "head": "Head",
       "lclavicle": "LeftShoulder", "lhumerus": "LeftArm", "lradius": "LeftForeArm", "lwrist": "LeftHand",
       "rclavicle": "RightShoulder", "rhumerus": "RightArm", "rradius": "RightForeArm", "rwrist": "RightHand"}
for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'
muted = []
for o in bpy.data.objects:
    if o.type == 'MESH':
        for m in o.modifiers:
            if m.type == 'ARMATURE' and m.show_viewport: m.show_viewport = False; muted.append(m)
PB = rig.pose.bones
def upd(): bpy.context.view_layer.update()
def reset_pose():
    for pb in PB: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.scale = (1, 1, 1)
def get_local(): return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in PB}
def set_local(v):
    for n, (l, q) in v.items(): PB[n].location = l; PB[n].rotation_quaternion = q
def smooth(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)
def mix_pose(a, b, w):
    return {n: (a[n][0].lerp(b[n][0], w), a[n][1].slerp(b[n][1] if a[n][1].dot(b[n][1]) >= 0 else -b[n][1], w)) for n in a}
def vslerp(a, b, w):
    q = a.rotation_difference(b); ax, ang = q.to_axis_angle()
    return (Quaternion(ax, ang * w) @ a).normalized()

# ── dinlenme el çerçeveleri (prep.py ile aynı tanım) ──
def hand_rest(side):
    hb = rig.data.bones[side + "Hand"]
    Y = (hb.matrix_local.to_3x3() @ Vector((0, 1, 0))).normalized()
    th = rig.data.bones[("R" if side == "Right" else "L") + "Thumb"].tail_local - hb.head_local
    T = (th - Y * th.dot(Y)).normalized()
    P = (T.cross(Y) if side == "Right" else Y.cross(T)).normalized()
    inv = hb.matrix_local.inverted()
    Tl = (inv.to_3x3() @ T).normalized()
    return {"Tl": Tl, "Yl": Vector((0, 1, 0)), "head": hb.head_local.copy(), "Y": Y, "T": T, "P": P, "inv": inv}
HR = {s: hand_rest(s) for s in ("Right", "Left")}
GY, GP = SPEC.get("gy", 0.09), SPEC.get("gp", 0.025)
for s in ("Right", "Left"):
    h = HR[s]; G = h["head"] + h["Y"] * GY + h["P"] * GP
    h["grip"] = h["inv"] @ G                      # el kemiği yerel koordinatında yumruk merkezi
BETA = rig.get("beta", 90.0) * D2R
# kılıç köşeleri el yerelinde (gövde çakışma denetimi için)
sw = bpy.data.objects["Kilic"]
SWL = [HR["Right"]["inv"] @ v.co for v in sw.data.vertices]
GRIPR = HR["Right"]["grip"]
BLADE = [p for p in SWL if (p - GRIPR).dot(HR["Right"]["Tl"]) > 0.225]
TIP = max(SWL, key=lambda p: (p - GRIPR).dot(HR["Right"]["Tl"]))

# ── 1. ham aktarım (retarget.py mantığı) ──
def bake_raw(fname, f0, f1):
    rig.animation_data_clear(); reset_pose(); upd()
    bpy.ops.import_anim.bvh(filepath=SPEC["mocap"] + "/" + fname + ".bvh", global_scale=1.0, rotate_mode='NATIVE', axis_forward='-Z',
                            axis_up='Y', update_scene_fps=True, update_scene_duration=True)
    src = bpy.context.object; src.name = "KAYNAK"
    lh = src.matrix_world @ src.data.bones["lfemur"].head_local
    if lh.x < 0: src.rotation_euler[2] = math.pi
    upd()
    src_leg = src.data.bones["lfemur"].length + src.data.bones["ltibia"].length
    tgt_leg = (rig.data.bones["LeftUpLeg"].length + rig.data.bones["LeftLeg"].length) * rig.scale.z
    k = tgt_leg / max(src_leg, 1e-4); src.scale = (k, k, k); upd()
    for s, t in MAP.items():
        c = PB[t].constraints.new('DAMPED_TRACK'); c.target = src; c.subtarget = s; c.head_tail = 1.0
    hips = PB["Hips"]
    S_r = (src.matrix_world @ src.data.bones["root"].matrix_local).to_quaternion()
    T_r = (rig.matrix_world @ rig.data.bones["Hips"].matrix_local)
    data = {}
    W = lambda b, tail=False: src.matrix_world @ (src.pose.bones[b].tail if tail else src.pose.bones[b].head)
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        S_t = src.matrix_world @ src.pose.bones["root"].matrix
        rotq = S_t.to_quaternion() @ S_r.inverted() @ T_r.to_quaternion()
        M = Matrix.Translation(S_t.translation) @ rotq.to_matrix().to_4x4()
        hips.matrix = rig.matrix_world.inverted() @ M
        upd()
        hips.keyframe_insert("location", frame=f); hips.keyframe_insert("rotation_quaternion", frame=f)
        rax = (W("rhand", True) - W("rhand")).normalized()
        th = W("rthumb", True) - W("rthumb"); rth = (th - rax * th.dot(rax)).normalized()
        b = (0.81 * rax + 0.36 * rth + 0.42 * rax.cross(rth)).normalized()
        data[f] = (b, (W("lhand") - W("rhand")).length / tgt_leg)
    for o in bpy.context.selected_objects: o.select_set(False)
    rig.select_set(True); bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT')
    bpy.ops.nla.bake(frame_start=f0, frame_end=f1, only_selected=True, visual_keying=True, clear_constraints=True,
                     use_current_action=True, bake_types={'POSE'})
    bpy.ops.object.mode_set(mode='OBJECT')
    sa = src.animation_data.action if src.animation_data else None
    bpy.data.objects.remove(src, do_unlink=True)
    if sa: bpy.data.actions.remove(sa)
    act = rig.animation_data.action; act.name = "ham_" + fname; act.use_fake_user = True
    rig.animation_data.action = None
    for pb in PB:
        for c in list(pb.constraints): pb.constraints.remove(c)
    print("HAM", fname, f0, f1, "olcek", round(k, 3))
    return act, data

RAW = {}
for fname, (a, b) in SPEC["bake"].items():
    RAW[fname] = bake_raw(fname, a, b)

def sample_raw(fname, t):
    act, data = RAW[fname]
    rig.animation_data.action = act
    fi = int(math.floor(t)); sc.frame_set(fi, subframe=t - fi)
    v = get_local(); rig.animation_data.action = None
    f0 = max(min(fi, max(data)), min(data)); f1 = min(f0 + 1, max(data)); u = min(max(t - f0, 0), 1)
    b = data[f0][0].lerp(data[f1][0], u).normalized(); d = data[f0][1] * (1 - u) + data[f1][1] * u
    return v, b, d

def pchip(xs, ys, x):
    n = len(xs); h = [xs[i + 1] - xs[i] for i in range(n - 1)]; dl = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n; m[0], m[-1] = dl[0], dl[-1]
    for i in range(1, n - 1):
        m[i] = 0.0 if dl[i - 1] * dl[i] <= 0 else 3 * (h[i - 1] + h[i]) / ((2 * h[i] + h[i - 1]) / dl[i - 1] + (h[i] + 2 * h[i - 1]) / dl[i])
    for i in range(n - 1):
        if xs[i] <= x <= xs[i + 1]:
            t = (x - xs[i]) / h[i]
            h00, h10, h01, h11 = 2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2
            return h00 * ys[i] + h10 * h[i] * m[i] + h01 * ys[i + 1] + h11 * h[i] * m[i + 1]
    return ys[-1] if x > xs[-1] else ys[0]

# ── yardımcı: kök normalleştirme ──
def norm_matrix(fname, frames, dz=0.0):
    lat = Vector(); mid = Vector()
    for t in frames:
        v, _, _ = sample_raw(fname, t); set_local(v); upd()
        lat += PB["LeftUpLeg"].head - PB["RightUpLeg"].head
        mid += (PB["LeftFoot"].head + PB["RightFoot"].head) / 2
    lat.z = 0; lat.normalize(); mid /= len(frames)
    fwd = lat.cross(Vector((0, 0, 1)))
    th = -math.pi / 2 - math.atan2(fwd.y, fwd.x)
    R = Matrix.Rotation(th, 4, 'Z'); c = R @ mid
    return Matrix.Translation((-c.x, -c.y, -dz)) @ R

def apply_root(v, Mn):
    set_local(v); upd()
    h = PB["Hips"]; h.matrix = Mn @ h.matrix; upd()
    v = dict(v); v["Hips"] = (h.location.copy(), h.rotation_quaternion.copy()); return v

# ── IK araçları ──
def aim(pb, target):
    cur = (pb.tail - pb.head).normalized(); v = (target - pb.head)
    if v.length < 1e-6: return
    q = cur.rotation_difference(v.normalized())
    pb.matrix = Matrix.Translation(pb.head) @ (q.to_matrix() @ pb.matrix.to_3x3()).to_4x4()

def two_bone(up, lo, target, pole):
    S = up.head.copy(); l1, l2 = up.bone.length, lo.bone.length
    d = target - S; dist = d.length; u = d.normalized()
    dc = min(max(dist, abs(l1 - l2) + 1e-4), (l1 + l2) * 0.9995)
    a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc); hh = math.sqrt(max(l1 * l1 - a * a, 0))
    p = pole - S; p = p - u * p.dot(u)
    p = p.normalized() if p.length > 1e-6 else Vector((0, -1, 0))
    E = S + u * a + p * hh; Wt = S + u * dc
    aim(up, E); upd(); aim(lo, Wt); upd()
    return dist - dc

def hand_rot(side, b, nprev):
    fa = PB[side + "ForeArm"]; f = (fa.tail - fa.head).normalized()
    n = f.cross(b)
    n = n.normalized() if n.length > 1e-3 else nprev
    alpha = f.angle(b); dev = min(max(alpha - BETA, -45 * D2R), 25 * D2R)
    y = (Quaternion(n, dev) @ f).normalized()
    t = b - y * y.dot(b)
    t = t.normalized() if t.length > 1e-4 else n.cross(y).normalized()
    h = HR[side]
    A = Matrix((y, t, y.cross(t))).transposed(); Bm = Matrix((h["Yl"], h["Tl"], h["Yl"].cross(h["Tl"]))).transposed()
    return A @ Bm.inverted(), n, abs(alpha - BETA - dev)

def set_hand(side, R, twist=0.5):
    fa = PB[side + "ForeArm"]; hd = PB[side + "Hand"]
    hd.matrix = Matrix.Translation(fa.tail) @ R.to_4x4(); upd()
    q = hd.rotation_quaternion; phi = 2 * math.atan2(q.y, q.w)
    phi = (phi + math.pi) % (2 * math.pi) - math.pi
    fa.rotation_quaternion = fa.rotation_quaternion @ Quaternion((0, 1, 0), phi * twist); upd()
    hd.matrix = Matrix.Translation(fa.tail) @ R.to_4x4(); upd()

def two_hand_w(d): return 1.0 - smooth((d - 0.30) / 0.15)

FIST = {"FingerBase": SPEC.get("fb", 45) * D2R, "HandFinger1": SPEC.get("f1", 95) * D2R}
SEP = SPEC.get("sep", 0.11)

def process(v, b, w2, feet, breathe=None, stat=None):
    set_local(v)
    for s in ("Left", "Right"):
        for k, a in FIST.items(): PB[s + k].rotation_quaternion = Quaternion((1, 0, 0), a)
        PB[("L" if s == "Left" else "R") + "Thumb"].rotation_quaternion = Quaternion()
    if breathe is not None:
        for n, amp in (("Spine", 0.7), ("Spine1", 1.1), ("Neck", -0.9)):
            PB[n].rotation_quaternion = PB[n].rotation_quaternion @ Quaternion((1, 0, 0), amp * D2R * math.sin(breathe))
        for n, sgn in (("LeftShoulder", 1), ("RightShoulder", -1)):
            PB[n].rotation_quaternion = PB[n].rotation_quaternion @ Quaternion((0, 0, 1), sgn * 0.6 * D2R * math.sin(breathe))
    upd()
    # ayaklar: muhafız duruşuna sabitle
    if feet:
        h = PB["Hips"]
        for _ in range(2):
            drop = 0.0
            for s in ("Left", "Right"):
                up, lo = PB[s + "UpLeg"], PB[s + "Leg"]
                S = up.head; T = feet[s][0]; reach = (up.bone.length + lo.bone.length) * 0.998
                ex = (T - S).length - reach
                if ex > 0:
                    cz = max((S - T).normalized().z, 0.5); drop = max(drop, ex / cz)
            if drop > 0: h.matrix = Matrix.Translation((0, 0, -drop)) @ h.matrix; upd()
        for s in ("Left", "Right"):
            up, lo, ft = PB[s + "UpLeg"], PB[s + "Leg"], PB[s + "Foot"]
            T, Rf, toe = feet[s]
            fwd = Rf.col[1].xyz.copy(); fwd.z = 0; fwd.normalize()
            pole = lo.head + fwd * 0.3
            short = two_bone(up, lo, T, pole)
            ft.matrix = Matrix.Translation(lo.tail) @ Rf.to_4x4(); upd()
            PB[s + "ToeBase"].rotation_quaternion = toe
            if stat is not None: stat["foot_short"] = max(stat.get("foot_short", 0), short)
        upd()
    # sağ el: kılıç yönü
    R, n, err = hand_rot("Right", b, stat.get("n", Vector((1, 0, 0))) if stat else Vector((1, 0, 0)))
    if stat is not None: stat["n"] = n; stat["blade_err"] = max(stat.get("blade_err", 0), err)
    set_hand("Right", R)
    hd = PB["RightHand"]
    G = hd.matrix @ HR["Right"]["grip"]; bl = (hd.matrix.to_3x3() @ HR["Right"]["Tl"]).normalized()
    # sol el: kabzaya
    if w2 > 1e-3:
        up, lo, lh = PB["LeftArm"], PB["LeftForeArm"], PB["LeftHand"]
        E0 = lo.head.copy(); W0 = lh.head.copy(); R0 = lh.matrix.to_3x3().copy()
        C = G + bl * SEP; nl = stat.get("nl", Vector((1, 0, 0))) if stat else Vector((1, 0, 0))
        for it in range(2):
            RL, nl, _ = hand_rot("Left", bl, nl)
            Wt = C - RL @ HR["Left"]["grip"]
            Wb = W0.lerp(Wt, w2)
            short = two_bone(up, lo, Wb, E0)
        if stat is not None: stat["it"] = max(stat.get("it", 0), it)
        Rb = R0.to_quaternion().slerp(RL.to_quaternion(), w2).to_matrix()
        set_hand("Left", Rb)
        if stat is not None:
            stat["nl"] = nl
            stat["l_move"] = max(stat.get("l_move", 0), (Wt - W0).length * w2)
            stat["l_short"] = max(stat.get("l_short", 0), short)
            lc = lh.matrix @ HR["Left"]["grip"]
            stat["l_off"] = max(stat.get("l_off", 0), (lc - C).length * w2)
    out = get_local()
    return out, G, bl

# ── gövde-namlu çakışma denetimi (kapsül yaklaşık) ──
CAPS = [("Hips", "Spine1", 0.13), ("Spine1", "Neck", 0.12), ("Head", None, 0.11),
        ("LeftUpLeg", None, 0.085), ("RightUpLeg", None, 0.085), ("LeftLeg", None, 0.06), ("RightLeg", None, 0.06),
        ("LeftArm", None, 0.05), ("RightArm", None, 0.05), ("LeftForeArm", None, 0.04)]
def seg_dist(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / max(ab.length_squared, 1e-9))); return (p - (a + ab * t)).length
def blade_hits():
    hd = PB["RightHand"].matrix; worst = 0.0; who = ""
    for pl in BLADE[::3]:
        p = hd @ pl
        for a, bname, r in CAPS:
            A = PB[a].head; Bp = PB[bname].head if bname else PB[a].tail
            pen = r - seg_dist(p, A, Bp)
            if pen > worst: worst, who = pen, a
    return worst, who

def write_action(name, frames):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    names = list(frames[0].keys())
    for bn in names:
        prev = None
        qs = []
        for fr in frames:
            q = fr[bn][1].copy()
            if prev is not None and q.dot(prev) < 0: q = -q
            qs.append(q); prev = q
        paths = [("rotation_quaternion", 4, [q[:] for q in qs])]
        if bn == "Hips": paths.append(("location", 3, [fr[bn][0][:] for fr in frames]))
        for prop, nidx, vals in paths:
            for i in range(nidx):
                fc = act.fcurves.new('pose.bones["%s"].%s' % (bn, prop), index=i, action_group=bn)
                fc.keyframe_points.add(len(vals))
                co = []
                for f, v in enumerate(vals): co += [float(f), float(v[i])]
                fc.keyframe_points.foreach_set("co", co)
                for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
                fc.update()
    return act

# ── 2. klipler ──
diag = {}
GUARD = None
sc.render.fps = 30; sc.render.fps_base = 1.0
rig.animation_data_create()
ACTS = []
for clip in SPEC["clips"]:
    name, fname = clip["name"], clip["file"]
    xs = [k[0] for k in clip["warp"]]; ys = [k[1] for k in clip["warp"]]
    N = int(round(xs[-1]))
    ts = [pchip(xs, ys, i) for i in range(N + 1)]
    if clip.get("norm") == "guard" and GUARD: Mn = GUARD["Mn"]
    else:
        nf = clip.get("norm_frames", [ys[0]])
        Mn = norm_matrix(fname, nf)
        if GUARD is not None: Mn = Matrix.Translation((0, 0, -GUARD["dz"])) @ Mn
        if GUARD is None:
            # kalça yüksekliği: muhafız pozunda ayak bilekleri dinlenme yüksekliğinde, dizler hafif bükük
            v, _, _ = sample_raw(fname, ts[0]); v = apply_root(v, Mn); set_local(v); upd()
            dz = 0.0
            for s_ in ("Left", "Right"):
                up, lo = PB[s_ + "UpLeg"], PB[s_ + "Leg"]; S_ = up.head; T_ = PB[s_ + "Foot"].head.copy()
                T_.z = rig.data.bones[s_ + "Foot"].head_local.z
                Lr = (up.bone.length + lo.bone.length) * SPEC.get("knee", 0.975)
                hz = (T_ - S_).xy.length; vz = math.sqrt(max(Lr * Lr - hz * hz, 0))
                dz = max(dz, (S_.z - T_.z) - vz)
            Mn = Matrix.Translation((0, 0, -dz)) @ Mn; DZ = dz
            print("ZEMIN dz", round(dz, 4))
    raws, bs, ds = [], [], []
    for t in ts:
        v, b, d = sample_raw(fname, t)
        raws.append(apply_root(v, Mn)); bs.append((Mn.to_3x3() @ b).normalized()); ds.append(d)
    if clip.get("loop"):
        # döngü: uç farkını tüm klibe yay
        for i in range(N + 1):
            w = i / N
            for bn, (l, q) in list(raws[i].items()):
                l0, q0 = raws[0][bn]; lN, qN = raws[N][bn]
                if qN.dot(q0) < 0: qN = -qN
                dq = qN @ q0.inverted()
                corr = Quaternion().slerp(dq, w).inverted()
                raws[i][bn] = (l - (lN - l0) * w, (corr @ q).normalized())
        db = bs[N].rotation_difference(bs[0])
        for i in range(N + 1):
            ax, ang = db.to_axis_angle(); bs[i] = (Quaternion(ax, ang * i / N) @ bs[i]).normalized()
    if GUARD is not None and clip.get("norm") != "self_guard":
        bi, bo = clip.get("blend_in", 5), clip.get("blend_out", 5)
        for i in range(N + 1):
            g = 0.0
            if i < bi: g = 1 - smooth(i / bi)
            if i > N - bo: g = smooth((i - (N - bo)) / bo)
            if g > 0:
                raws[i] = mix_pose(raws[i], GUARD["raw"], g); bs[i] = vslerp(bs[i], GUARD["b"], g); ds[i] = ds[i] * (1 - g) + GUARD["d"] * g
    if GUARD is None:
        set_local(raws[0]); upd(); feet = {}
        for s_ in ("Left", "Right"):
            fb = rig.data.bones[s_ + "Foot"]; T_ = PB[s_ + "Foot"].head.copy(); T_.z = fb.head_local.z
            Rr = fb.matrix_local.to_3x3()
            dr = Rr.col[1].xyz.copy(); dr.z = 0; dp = PB[s_ + "Foot"].matrix.col[1].xyz.copy(); dp.z = 0
            yaw = math.atan2(dr.x * dp.y - dr.y * dp.x, dr.dot(dp))
            feet[s_] = (T_, Matrix.Rotation(yaw, 3, 'Z') @ Rr, Quaternion())
    else:
        feet = GUARD["feet"]
    stat = {}; finals = []; dd = []; pen_max = (0, "", -1)
    for i in range(N + 1):
        br = 2 * math.pi * i / N if clip.get("breathe") else None
        w2 = two_hand_w(ds[i])
        stat["dbg"] = (name == "saldir" and i in (27, 28))
        fr, G, bl = process(raws[i], bs[i], w2, feet if clip.get("pin_feet", True) else None, br, stat)
        finals.append(fr)
        pen, who = blade_hits()
        if pen > pen_max[0]: pen_max = (round(pen, 3), who, i)
        tip = PB["RightHand"].matrix @ TIP
        dd.append({"j": {pb.name: [list(pb.head), list(pb.tail)] for pb in PB}, "grip": list(G), "tip": list(tip), "w2": w2})
    if clip.get("loop"): finals[N] = finals[0]
    act = write_action(name, finals)
    ACTS.append((name, act))
    if GUARD is None:
        GUARD = {"raw": raws[0], "b": bs[0], "d": ds[0], "feet": feet, "Mn": Mn, "dz": DZ}
    diag[name] = {"frames": dd, "src": [round(ts[0], 1), round(ts[-1], 1)], "N": N + 1,
                  "stat": {k: round(float(v), 3) for k, v in stat.items() if isinstance(v, (int, float))},
                  "blade_body_pen": pen_max}
    print("KLIP", name, "kare", N + 1, "kaynak", diag[name]["src"], diag[name]["stat"], "namlu-govde", pen_max)

rig.animation_data.action = None
for name, act in ACTS:
    tr = rig.animation_data.nla_tracks.new(); tr.name = name
    tr.strips.new(name, 0, act)
for m in muted: m.show_viewport = True
reset_pose()
sc.frame_start, sc.frame_end = 0, 60
json.dump(diag, open(DIAG, "w"))
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("BITTI", OUT)
