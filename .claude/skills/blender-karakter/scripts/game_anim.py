# CMU -> MPFB game_engine aktarımı + oyun klibi işleme (Aşama 1):
# kök normalleştirme (muhafız çerçevesi) + kısmi yön sabitleme, zaman bükme (1.2-1.5x), hazırlanma ve
# temas sonrası taşma/geri tepme katmanları, değişken σ'lı Gauss yumuşatma, baş/namlu 1 kare gecikme,
# ayak kilidi (IK, diz dışa), iki el kabzada (sağ balçakta, sol altta), nefesli dikişsiz bekleme,
# her tek seferlik klip muhafızda başlar ve taşma-oturma ile muhafızda biter. Her klip ayrı NLA izi.
# Kullanım: blender -b equip.blend --python game_anim.py -- out.blend game_clips.json diag.json
import bpy, sys, math, json
from mathutils import Vector, Matrix, Quaternion
argv = sys.argv[sys.argv.index('--') + 1:]
OUT, SPEC, DIAG = argv[0], json.load(open(argv[1])), argv[2]
bpy.context.preferences.filepaths.save_version = 0
sc = bpy.context.scene
rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
D2R = math.pi / 180
MAP = {"lfemur": "thigh_l", "ltibia": "calf_l", "lfoot": "foot_l", "ltoes": "ball_l",
       "rfemur": "thigh_r", "rtibia": "calf_r", "rfoot": "foot_r", "rtoes": "ball_r",
       "lowerback": "spine_01", "upperback": "spine_02", "thorax": "spine_03", "upperneck": "neck_01", "head": "head",
       "lclavicle": "clavicle_l", "lhumerus": "upperarm_l", "lradius": "lowerarm_l", "lwrist": "hand_l",
       "rclavicle": "clavicle_r", "rhumerus": "upperarm_r", "rradius": "lowerarm_r", "rwrist": "hand_r"}
PB = rig.pose.bones; BN = rig.data.bones
for pb in PB: pb.rotation_mode = 'QUATERNION'
muted = []
for o in bpy.data.objects:
    if o.type == 'MESH':
        for m in o.modifiers:
            if m.type == 'ARMATURE' and m.show_viewport: m.show_viewport = False; muted.append(m)
def upd(): bpy.context.view_layer.update()
def reset_pose():
    for pb in PB: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.scale = (1, 1, 1)
def get_local(): return {pb.name: (pb.location.copy(), pb.rotation_quaternion.copy()) for pb in PB}
def set_local(v):
    for n, (l, q) in v.items(): PB[n].location = l; PB[n].rotation_quaternion = q
def smooth(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)
def qalign(q, ref): return q if q.dot(ref) >= 0 else -q
def qslerp(a, b, w):
    # w > 1 dışa taşmaya izin verir (oturma taşması)
    b = qalign(b, a); ax, ang = (a.inverted() @ b).to_axis_angle()
    return (a @ Quaternion(ax, ang * w)).normalized()
def mix_pose(a, b, w):
    return {n: (a[n][0] + (b[n][0] - a[n][0]) * w, qslerp(a[n][1], b[n][1], w)) for n in a}
def vslerp(a, b, w):
    q = a.rotation_difference(b); ax, ang = q.to_axis_angle()
    return (Quaternion(ax, ang * w) @ a).normalized()

FINGER = {n: Quaternion(q) for n, q in json.loads(rig["parmak"]).items()}
GRIP = {s: {k: Vector(v) for k, v in d.items()} for s, d in json.loads(rig["kavrama"]).items()}
SEP = float(rig.get("sep", 0.088))
sw = bpy.data.objects["Kilic"]
HM_R = BN["hand_r"].matrix_local.inverted()
# kavrama pozundaki el matrisiyle yerel kılıç köşeleri (kılıç kavrama pozunda modellendi)
reset_pose(); set_local({n: (Vector(), q) for n, q in FINGER.items()}); upd()
SWL = [PB["hand_r"].matrix.inverted() @ v.co for v in sw.data.vertices]
CR, AR = GRIP["r"]["c"], GRIP["r"]["a"]
TIP = max(SWL, key=lambda p: (p - CR).dot(AR))
BLADE = [p for p in SWL if (p - CR).dot(AR) > 0.07]
reset_pose(); upd()

# ── 1. ham aktarım ──
def bake_raw(fname, f0, f1):
    rig.animation_data_clear(); reset_pose(); upd()
    bpy.ops.import_anim.bvh(filepath=SPEC["mocap"] + "/" + fname.split("@")[0] + ".bvh", global_scale=1.0, rotate_mode='NATIVE', axis_forward='-Z',
                            axis_up='Y', update_scene_fps=False, update_scene_duration=False)
    src = bpy.context.object; src.name = "KAYNAK"
    lh = src.matrix_world @ src.data.bones["lfemur"].head_local
    if lh.x < 0: src.rotation_euler[2] = math.pi
    upd()
    src_leg = src.data.bones["lfemur"].length + src.data.bones["ltibia"].length
    tgt_leg = (BN["thigh_l"].length + BN["calf_l"].length) * rig.scale.z
    k = tgt_leg / max(src_leg, 1e-4); src.scale = (k, k, k); upd()
    for s, t in MAP.items():
        c = PB[t].constraints.new('DAMPED_TRACK'); c.target = src; c.subtarget = s; c.head_tail = 1.0
    hips = PB["pelvis"]
    S_r = (src.matrix_world @ src.data.bones["root"].matrix_local).to_quaternion()
    T_r = (rig.matrix_world @ BN["pelvis"].matrix_local)
    data = {}
    W = lambda b, tail=False: src.matrix_world @ (src.pose.bones[b].tail if tail else src.pose.bones[b].head)
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        S_t = src.matrix_world @ src.pose.bones["root"].matrix
        rotq = S_t.to_quaternion() @ S_r.inverted() @ T_r.to_quaternion()
        hips.matrix = rig.matrix_world.inverted() @ (Matrix.Translation(S_t.translation) @ rotq.to_matrix().to_4x4())
        upd()
        hips.keyframe_insert("location", frame=f); hips.keyframe_insert("rotation_quaternion", frame=f)
        rax = (W("rhand", True) - W("rhand")).normalized()
        th = W("rthumb", True) - W("rthumb"); rth = (th - rax * th.dot(rax)).normalized()
        data[f] = ((0.81 * rax + 0.36 * rth + 0.42 * rax.cross(rth)).normalized(),     # namlu yönü (fit.py bağlanımı)
                   (W("head") - W("upperneck")).normalized())                      # boyun YÖNÜ (mutlak hedef değil)
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

RAW = {fname: bake_raw(fname, a, b) for fname, (a, b) in SPEC["bake"].items()}
def sample_raw(fname, t):
    act, data = RAW[fname]
    rig.animation_data.action = act
    fi = int(math.floor(t)); sc.frame_set(fi, subframe=t - fi)
    v = get_local(); rig.animation_data.action = None
    f0 = max(min(fi, max(data)), min(data)); f1 = min(f0 + 1, max(data)); u = min(max(t - f0, 0), 1)
    return v, data[f0][0].lerp(data[f1][0], u).normalized(), data[f0][1].lerp(data[f1][1], u).normalized()
def fix_neck(v, vn):
    # boyun kaynak boyun yönüne; baş dünya yönelimini korur
    set_local(v); upd()
    hm = PB["head"].matrix.to_3x3().copy()
    aim(PB["neck_01"], PB["neck_01"].head + vn); upd()
    PB["head"].matrix = Matrix.Translation(PB["head"].head) @ hm.to_4x4(); upd()
    v = dict(v); v["neck_01"] = (PB["neck_01"].location.copy(), PB["neck_01"].rotation_quaternion.copy())
    v["head"] = (PB["head"].location.copy(), PB["head"].rotation_quaternion.copy()); return v

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

# ── kök: muhafız çerçevesi (ön = -Y, ayak ortası orijinde) + kısmi yön sabitleme ──
def yaw_of_pose():
    lat = PB["thigh_l"].head - PB["thigh_r"].head; lat.z = 0; lat.normalize()
    fwd = lat.cross(Vector((0, 0, 1)))
    return math.atan2(fwd.y, fwd.x)
def norm_matrix(fname, frames):
    ys = []; mid = Vector()
    for t in frames:
        v, _, _ = sample_raw(fname, t); set_local(v); upd()
        ys.append(yaw_of_pose()); mid += (PB["foot_l"].head + PB["foot_r"].head) / 2
    mid /= len(frames); yaw = math.atan2(sum(math.sin(y) for y in ys), sum(math.cos(y) for y in ys))
    R = Matrix.Rotation(-math.pi / 2 - yaw, 4, 'Z'); c = R @ mid
    return Matrix.Translation((-c.x, -c.y, 0)) @ R
def apply_root(v, Mn, yaw_k=0.0, yaw_ref=-math.pi / 2):
    set_local(v); upd()
    h = PB["pelvis"]; h.matrix = Mn @ h.matrix; upd()
    R = Matrix.Identity(4)
    if yaw_k:
        d = yaw_of_pose() - yaw_ref; d = (d + math.pi) % (2 * math.pi) - math.pi
        R = Matrix.Rotation(-d * yaw_k, 4, 'Z'); h.matrix = R @ h.matrix; upd()
    v = dict(v); v["pelvis"] = (h.location.copy(), h.rotation_quaternion.copy()); return v, R

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
def grip_frame(s):
    g = GRIP[s]; e = g["e"] - g["a"] * g["e"].dot(g["a"])
    return Matrix((e.normalized(), g["a"].cross(e).normalized(), g["a"])).transposed()
GF = {s: grip_frame(s) for s in ("r", "l")}
def hand_rot(s, b):
    # el: kabza ekseni = b; ağız (parmak eklemleri) önkol yönüne en yakın → bilek en az bükülür
    f = (PB["lowerarm_" + s].tail - PB["lowerarm_" + s].head).normalized()
    e = f - b * f.dot(b)
    e = e.normalized() if e.length > 1e-4 else b.orthogonal().normalized()
    T = Matrix((e, b.cross(e), b)).transposed()
    R = T @ GF[s].inverted()
    bend = (R @ Vector((0, 1, 0))).angle(f)
    return R, bend
def set_hand(s, R, twist=0.5):
    fa = PB["lowerarm_" + s]; hd = PB["hand_" + s]
    hd.matrix = Matrix.Translation(fa.tail) @ R.to_4x4(); upd()
    q = hd.rotation_quaternion; phi = 2 * math.atan2(q.y, q.w)
    phi = (phi + math.pi) % (2 * math.pi) - math.pi
    fa.rotation_quaternion = fa.rotation_quaternion @ Quaternion((0, 1, 0), phi * twist); upd()
    hd.matrix = Matrix.Translation(fa.tail) @ R.to_4x4(); upd()

def lift_axis(bn):
    # kemiğin ucunu yukarı kaldıran yerel eksen (omuz silkme)
    pb = PB[bn]; best = None
    for ax in (Vector((1, 0, 0)), Vector((0, 0, 1))):
        for sg in (1, -1):
            q0 = pb.rotation_quaternion.copy(); pb.rotation_quaternion = q0 @ Quaternion(ax * sg, 0.05); upd()
            z = pb.tail.z; pb.rotation_quaternion = q0; upd()
            if best is None or z > best[0]: best = (z, ax * sg)
    return best[1]

def process(v, b, feet, stat):
    set_local(v)
    for n, q in FINGER.items(): PB[n].rotation_quaternion = q
    upd()
    if feet:
        h = PB["pelvis"]
        for _ in range(2):
            drop = 0.0
            for s in ("l", "r"):
                up, lo = PB["thigh_" + s], PB["calf_" + s]
                ex = (feet[s][0] - up.head).length - (up.bone.length + lo.bone.length) * 0.998
                if ex > 0: drop = max(drop, ex / max((up.head - feet[s][0]).normalized().z, 0.5))
            if drop > 0: h.matrix = Matrix.Translation((0, 0, -drop)) @ h.matrix; upd()
        for s in ("l", "r"):
            up, lo, ft = PB["thigh_" + s], PB["calf_" + s], PB["foot_" + s]
            T, Rf, toe = feet[s]
            fwd = Rf.col[1].xyz.copy(); fwd.z = 0; fwd.normalize()
            out = up.head - PB["pelvis"].head; out.z = 0; out.normalize()
            pole = lo.head + (fwd * 0.75 + out * SPEC.get("diz_dis", 0.45)).normalized() * 0.4   # diz ayak ucu üstünde/dışında
            short = two_bone(up, lo, T, pole)
            ft.matrix = Matrix.Translation(lo.tail) @ Rf.to_4x4(); upd()
            PB["ball_" + s].rotation_quaternion = toe
            stat["foot_short"] = max(stat.get("foot_short", 0), short)
        upd()
    R, bend = hand_rot("r", b); set_hand("r", R)
    bend = (PB["hand_r"].matrix.to_3x3() @ Vector((0, 1, 0))).angle((PB["lowerarm_r"].tail - PB["lowerarm_r"].head).normalized())
    stat["bilek_r"] = max(stat.get("bilek_r", 0), math.degrees(bend))
    hd = PB["hand_r"]; G = hd.matrix @ GRIP["r"]["c"]; bl = (hd.matrix.to_3x3() @ GRIP["r"]["a"]).normalized()
    # sol el kabzada, sağ elin SEP altında
    up, lo, lh = PB["upperarm_l"], PB["lowerarm_l"], PB["hand_l"]
    # sol dirsek kutbu: sağ dirseğin omuz-bilek çizgisine göre kaymasının aynası (+ hafif aşağı)
    Sr, Wr, Er = PB["upperarm_r"].head, PB["hand_r"].head, PB["lowerarm_r"].head
    u_ = (Wr - Sr).normalized(); off = (Er - Sr) - u_ * u_.dot(Er - Sr)
    off = Vector((-off.x, off.y, off.z)) + Vector((0, 0, -SPEC.get("dirsek_asagi", 0.04)))
    C = G - bl * SEP
    for it in range(3):
        RL, bendl = hand_rot("l", bl)
        Wt = C - RL @ GRIP["l"]["c"]
        short = two_bone(up, lo, Wt, (up.head + Wt) / 2 + off * 2.0)
        set_hand("l", RL)
    bendl = (lh.matrix.to_3x3() @ Vector((0, 1, 0))).angle((lo.tail - lo.head).normalized())
    lc = lh.matrix @ GRIP["l"]["c"]
    stat["l_off"] = max(stat.get("l_off", 0), (lc - C).length)
    stat["bilek_l"] = max(stat.get("bilek_l", 0), math.degrees(bendl))
    return get_local(), G, bl

CAPS = [("pelvis", "spine_03", 0.15), ("spine_03", "neck_01", 0.14), ("head", None, 0.11),
        ("thigh_l", None, 0.09), ("thigh_r", None, 0.09), ("calf_l", None, 0.065), ("calf_r", None, 0.065),
        ("upperarm_l", None, 0.055), ("upperarm_r", None, 0.055), ("lowerarm_l", None, 0.045)]
def seg_dist(p, a, b):
    ab = b - a; t = max(0, min(1, (p - a).dot(ab) / max(ab.length_squared, 1e-9))); return (p - (a + ab * t)).length
def blade_hits():
    hd = PB["hand_r"].matrix; worst = 0.0; who = ""
    for pl in BLADE[::2]:
        p = hd @ pl
        for a, bname, r in CAPS:
            A = PB[a].head; Bp = PB[bname].head if bname else PB[a].tail
            pen = r - seg_dist(p, A, Bp)
            if pen > worst: worst, who = pen, a
    return worst, who

def write_action(name, frames):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    for bn in frames[0].keys():
        prev = None; qs = []
        for fr in frames:
            q = fr[bn][1].copy()
            if prev is not None and q.dot(prev) < 0: q = -q
            qs.append(q); prev = q
        paths = [("rotation_quaternion", 4, [q[:] for q in qs])]
        if bn == "pelvis": paths.append(("location", 3, [fr[bn][0][:] for fr in frames]))
        for prop, nidx, vals in paths:
            for i in range(nidx):
                fc = act.fcurves.new('pose.bones["%s"].%s' % (bn, prop), index=i, action_group=bn)
                fc.keyframe_points.add(len(vals)); co = []
                for f, v in enumerate(vals): co += [float(f), float(v[i])]
                fc.keyframe_points.foreach_set("co", co)
                for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
                fc.update()
    return act

# ── yumuşatma / katmanlar ──
def gauss_seq(seq, sig, loop=False, kind="q"):
    N = len(seq); out = []
    for i in range(N):
        s = max(sig[i], 1e-3); R = int(math.ceil(3 * s)); acc = None; wsum = 0.0
        for k in range(-R, R + 1):
            j = i + k
            if loop: j %= (N - 1)
            else: j = min(max(j, 0), N - 1)
            w = math.exp(-0.5 * (k / s) ** 2); x = seq[j]
            if kind == "q":
                x = qalign(x, seq[i]); x = Vector(x[:]) * w
            else: x = x * w
            acc = x if acc is None else acc + x; wsum += w
        if kind == "q": out.append(Quaternion((acc / wsum)[:]).normalized())
        elif kind == "u": out.append((acc / wsum).normalized())
        else: out.append(acc / wsum)
    if loop: out[-1] = out[0]
    return out
def smooth_clip(raws, bs, sig, loop):
    names = list(raws[0].keys()); N = len(raws)
    for bn in names:
        qs = gauss_seq([r[bn][1] for r in raws], sig, loop, "q")
        ls = gauss_seq([r[bn][0] for r in raws], sig, loop, "v") if bn == "pelvis" else [r[bn][0] for r in raws]
        for i in range(N): raws[i][bn] = (ls[i], qs[i])
    return raws, gauss_seq(bs, sig, loop, "u")
LAYER_BONES = ["spine_01", "spine_02", "spine_03", "neck_01", "clavicle_r", "clavicle_l", "upperarm_r", "upperarm_l", "lowerarm_r", "lowerarm_l"]
def add_layer(raws, bs, center, shape, ref0, ref1, gain, cap_deg=8.0):
    # ref0->ref1 hareket yönünde (gain>0) ya da tersinde (gain<0) şekil fonksiyonuyla ek dönüş
    for bn in LAYER_BONES:
        q0, q1 = raws[ref0][bn][1], qalign(raws[ref1][bn][1], raws[ref0][bn][1])
        ax, ang = (q0.inverted() @ q1).to_axis_angle()
        amp = max(min(ang * gain, cap_deg * D2R), -cap_deg * D2R)
        for i, w in shape.items():
            if 0 <= i < len(raws) and w:
                l, q = raws[i][bn]; raws[i][bn] = (l, (q @ Quaternion(ax, amp * w)).normalized())
    dq = bs[ref0].rotation_difference(bs[ref1]); ax, ang = dq.to_axis_angle()
    amp = max(min(ang * gain, cap_deg * 1.5 * D2R), -cap_deg * 1.5 * D2R)
    for i, w in shape.items():
        if 0 <= i < len(bs) and w: bs[i] = (Quaternion(ax, amp * w) @ bs[i]).normalized()
def settle_curve(u, over):
    # 0→1 yükselir, ~u=0.75'te 1+over'a taşar, u=1'de sıfır hızla 1'e oturur
    base = smooth(min(u / 0.7, 1.0))
    bump = math.sin(math.pi * (u - 0.5) / 0.5) ** 2 if u > 0.5 else 0.0
    return base + over * bump

# ── 2. muhafız ve klipler ──
sc.render.fps = 30; sc.render.fps_base = 1.0
rig.animation_data_create()
gs = SPEC["guard"]; GF0 = gs["frames"]
Mn = norm_matrix(gs["file"], list(range(GF0[0], GF0[1] + 1, 3)))
# muhafız: aralığın ortalaması (dörtey ortalaması)
acc = None; bacc = Vector(); n_ = 0
for t in range(GF0[0], GF0[1] + 1, 2):
    v, b, vn = sample_raw(gs["file"], t); v, R = apply_root(v, Mn); b = (Mn.to_3x3() @ b).normalized()
    v = fix_neck(v, (Mn.to_3x3() @ vn).normalized())
    if acc is None: acc = {k: [Vector(l), Vector(q[:])] for k, (l, q) in v.items()}; ref = v
    else:
        for k, (l, q) in v.items(): acc[k][0] += l; acc[k][1] += Vector(qalign(q, ref[k][1])[:])
    bacc += b; n_ += 1
GUARD_RAW = {k: (l / n_, Quaternion((q / n_)[:]).normalized()) for k, (l, q) in acc.items()}
GUARD_B = (bacc / n_).normalized()
# baş: muhafızda yüz rakibe baksın (eğim hedefi); düzeltme tüm karelere yerel olarak eklenir
set_local(GUARD_RAW); upd()
def face_dir():
    Rh = PB["head"].matrix.to_3x3() @ BN["head"].matrix_local.to_3x3().inverted()
    return (Rh @ Vector((0, -1, 0))).normalized()
fd = face_dir(); pitch = math.asin(max(min(fd.z, 1), -1))
dp = SPEC.get("bas_egim", -6.0) * D2R - pitch
axw = fd.cross(Vector((0, 0, 1))).normalized()
HEADFIX = {}
for bn, part in (("neck_01", 0.45), ("head", 0.55)):
    pb = PB[bn]; la = (pb.matrix.to_3x3().inverted() @ axw).normalized()
    HEADFIX[bn] = Quaternion(la, dp * part)
    pb.rotation_quaternion = pb.rotation_quaternion @ HEADFIX[bn]; upd()
print("BAS egim %.1f -> %.1f derece" % (math.degrees(pitch), math.degrees(math.asin(face_dir().z))))
for bn, q in HEADFIX.items(): GUARD_RAW[bn] = (GUARD_RAW[bn][0], (GUARD_RAW[bn][1] @ q).normalized())
# muhafız kalça yüksekliği: dizler hafif bükük
set_local(GUARD_RAW); upd(); dz = 0.0
for s in ("l", "r"):
    up, lo = PB["thigh_" + s], PB["calf_" + s]; T_ = PB["foot_" + s].head.copy(); T_.z = BN["foot_" + s].head_local.z
    Lr = (up.bone.length + lo.bone.length) * SPEC.get("knee", 0.975)
    hz = (T_ - up.head).xy.length; dz = max(dz, (up.head.z - T_.z) - math.sqrt(max(Lr * Lr - hz * hz, 0)))
Mn = Matrix.Translation((0, 0, -dz)) @ Mn
l, q = GUARD_RAW["pelvis"]; set_local(GUARD_RAW); upd(); PB["pelvis"].matrix = Matrix.Translation((0, 0, -dz)) @ PB["pelvis"].matrix; upd()
GUARD_RAW["pelvis"] = (PB["pelvis"].location.copy(), PB["pelvis"].rotation_quaternion.copy())
# ayaklar: muhafız konumu, taban yere paralel, yön korunur; ayak genişliği isteğe bağlı açılır
feet = {}
for s in ("l", "r"):
    fb = BN["foot_" + s]; T_ = PB["foot_" + s].head.copy(); T_.z = fb.head_local.z
    T_.x += (1 if s == "l" else -1) * SPEC.get("ayak_ac", 0.0)
    Rr = fb.matrix_local.to_3x3()
    dr = Rr.col[1].xyz.copy(); dr.z = 0; dp = PB["foot_" + s].matrix.col[1].xyz.copy(); dp.z = 0
    yaw = math.atan2(dr.x * dp.y - dr.y * dp.x, dr.dot(dp))
    feet[s] = (T_, Matrix.Rotation(yaw, 3, 'Z') @ Rr, Quaternion())
print("MUHAFIZ dz %.3f ayak" % dz, {s: tuple(round(x, 3) for x in feet[s][0]) for s in feet})

def joints_snapshot():
    return {pb.name: [list(pb.head), list(pb.tail)] for pb in PB if not pb.name.startswith(("index", "middle", "ring", "pinky", "thumb"))}
diag = {"fps": 30}; ACTS = []
for clip in SPEC["clips"]:
    name = clip["name"]; loop = clip.get("loop", False)
    if clip.get("type") == "idle":
        N = clip.get("N", 90)
        raws = [dict(GUARD_RAW) for _ in range(N + 1)]; bs = [GUARD_B.copy() for _ in range(N + 1)]
        AX = {bn: Vector((1, 0, 0)) for bn in ("spine_01", "spine_02", "spine_03", "neck_01", "head")}
        LIFT = {bn: lift_axis(bn) for bn in ("clavicle_l", "clavicle_r")}
        reset_pose(); upd()
        for i in range(N + 1):
            ph = 2 * math.pi * i / N; br = math.sin(ph)                       # 1 nefes / döngü
            sway = math.sin(ph + 0.7); sway2 = math.sin(2 * ph + 1.3)
            r = {k: (l.copy(), q.copy()) for k, (l, q) in raws[i].items()}
            for bn, amp in (("spine_01", 0.45), ("spine_02", 1.0), ("spine_03", 1.4), ("neck_01", -1.2), ("head", -0.8)):
                l, q = r[bn]; r[bn] = (l, q @ Quaternion(AX[bn], amp * D2R * br + (0.25 * D2R * sway2 if bn == "head" else 0)))
            for bn in ("clavicle_l", "clavicle_r"):
                l, q = r[bn]; r[bn] = (l, q @ Quaternion(LIFT[bn], 0.9 * D2R * (0.5 + 0.5 * br)))
            l, q = r["pelvis"]
            r["pelvis"] = (l + Vector((0.006 * sway, 0, 0.002 * br)), Quaternion((0, 0, 1), 0.8 * D2R * sway) @ q)
            raws[i] = r
            bs[i] = (Quaternion((0, 0, 1), 2.2 * D2R * sway) @ Quaternion((1, 0, 0), 1.4 * D2R * math.sin(ph + 2.0)) @ bs[i]).normalized()
        ts = [0.0] * (N + 1); contact = None; ant = None
    else:
        fname = clip["file"]
        xs = [k[0] for k in clip["warp"]]; ys = [k[1] for k in clip["warp"]]
        N = int(round(xs[-1])); ts = [pchip(xs, ys, i) for i in range(N + 1)]
        raws, bs = [], []
        for t in ts:
            v, b, vn = sample_raw(fname, t)
            v, R = apply_root(v, Mn, clip.get("yaw_k", 0.0))
            v = fix_neck(v, (R.to_3x3() @ Mn.to_3x3() @ vn).normalized())
            for bn, q in HEADFIX.items(): v[bn] = (v[bn][0], (v[bn][1] @ q).normalized())
            raws.append(v); bs.append((R.to_3x3() @ Mn.to_3x3() @ b).normalized())
        cs = clip.get("contact_src"); contact = min(range(N + 1), key=lambda i: abs(ts[i] - cs)) if cs else None
        asrc = clip.get("ant_src"); ant = min(range(N + 1), key=lambda i: abs(ts[i] - asrc)) if asrc else None
        # hazırlanma: vuruş başlamadan 3 kare geri çekilme (sonraki 4 karenin tersine)
        if ant is not None:
            A = clip.get("ant_gain", 0.3)
            add_layer(raws, bs, ant, {ant - 3: 0.35, ant - 2: 0.75, ant - 1: 1.0, ant: 0.8, ant + 1: 0.35}, ant, min(ant + 4, N), -A)
        # temas sonrası: taşma (saldırı) ya da geri tepme (savuşturma) — sönümlü salınım
        if contact is not None:
            G_ = clip.get("over_gain", 0.5); tau, om = 3.0, math.pi / 5
            shp = {contact + t_: math.exp(-t_ / tau) * math.sin(om * t_) / 0.62 for t_ in range(1, 11)}
            if clip.get("recoil"):
                add_layer(raws, bs, contact, shp, max(contact - 2, 0), contact, -clip["recoil"])
            else:
                add_layer(raws, bs, contact, shp, max(contact - 2, 0), contact, G_)
        # duruş katmanı: derin takipte gövdeyi kısmen dikleştir (omurga + kalça dönüşü muhafıza doğru)
        if clip.get("dik"):
            a0, a1, wd = clip["dik"]
            for i in range(N + 1):
                if a0 <= ts[i] <= a1:
                    u = (ts[i] - a0) / (a1 - a0); w_ = wd * math.sin(math.pi * u) ** 2 * 1.0
                    for bn in ("spine_01", "spine_02", "spine_03"):
                        raws[i][bn] = (raws[i][bn][0], qslerp(raws[i][bn][1], GUARD_RAW[bn][1], w_))
                    raws[i]["pelvis"] = (raws[i]["pelvis"][0], qslerp(raws[i]["pelvis"][1], GUARD_RAW["pelvis"][1], w_ * 0.6))
        # muhafıza giriş / taşma-oturma ile çıkış
        bi, bo = clip.get("blend_in", 5), clip.get("blend_out", 9); over = clip.get("settle", 0.06)
        for i in range(N + 1):
            g = None
            if i < bi: g = 1 - smooth(i / bi)
            elif i > N - bo: g = settle_curve((i - (N - bo)) / bo, over)
            if g is not None:
                raws[i] = mix_pose(raws[i], GUARD_RAW, g); bs[i] = vslerp(bs[i], GUARD_B, g)
    # Gauss yumuşatma: σ=1 kare, temasın ±3 karesinde 0.5
    sig = [clip.get("sigma", 1.0)] * (N + 1)
    if contact is not None:
        for i in range(max(contact - 3, 0), min(contact + 4, N + 1)): sig[i] = 0.5
    if clip.get("type") != "idle":
        raws, bs = smooth_clip(raws, bs, sig, loop)
        # baş ve namlu 1 kare geriden gelir (örtüşen hareket)
        hq = [r["head"][1] for r in raws]; nq = [r["neck_01"][1] for r in raws]; b0 = list(bs)
        for i in range(1, N + 1):
            raws[i]["head"] = (raws[i]["head"][0], hq[i - 1].slerp(qalign(hq[i], hq[i - 1]), 0.35))
            raws[i]["neck_01"] = (raws[i]["neck_01"][0], nq[i - 1].slerp(qalign(nq[i], nq[i - 1]), 0.5))
            bs[i] = vslerp(b0[i - 1], b0[i], 0.4)
        raws[0] = dict(GUARD_RAW); raws[N] = dict(GUARD_RAW); bs[0] = GUARD_B.copy(); bs[N] = GUARD_B.copy()
    # işlem: IK ayak, eller, parmaklar
    stat = {}; finals = []; dd = []; pen_max = (0, "", -1); raw_feet = []
    for i in range(N + 1):
        set_local(raws[i]); upd()
        raw_feet.append({s: list(PB["foot_" + s].head) + list(PB["ball_" + s].head) for s in ("l", "r")}); raw_j = joints_snapshot()
        fr, G, bl = process(raws[i], bs[i], feet, stat)
        finals.append(fr)
        pen, who = blade_hits()
        if pen > pen_max[0]: pen_max = (round(pen, 3), who, i)
        tip = PB["hand_r"].matrix @ TIP
        dd.append({"j": joints_snapshot(), "raw_j": raw_j, "grip": list(G), "tip": list(tip), "raw_feet": raw_feet[-1],
                   "feet": {s: list(PB["foot_" + s].head) + list(PB["ball_" + s].head) for s in ("l", "r")}})
    if loop: finals[N] = finals[0]
    act = write_action(name, finals); ACTS.append((name, act))
    tips = [Vector(d["tip"]) for d in dd]; spd = [0] + [(tips[i] - tips[i - 1]).length * 30 for i in range(1, N + 1)]
    diag[name] = {"frames": dd, "N": N + 1, "sure": N / 30.0, "contact": contact, "temas_s": round(contact / 30.0, 3) if contact is not None else None,
                  "ant": ant, "src": [round(ts[0], 1), round(ts[-1], 1)], "tip_speed_max": [round(max(spd), 2), spd.index(max(spd))],
                  "stat": {k: round(float(v), 3) for k, v in stat.items()}, "blade_body_pen": pen_max}
    print("KLIP", name, "kare", N + 1, "sure %.2f" % (N / 30), "temas", contact, "hazirlik", ant, "uc hiz maks", diag[name]["tip_speed_max"],
          diag[name]["stat"], "namlu-govde", pen_max)

rig.animation_data.action = None
for name, act in ACTS:
    tr = rig.animation_data.nla_tracks.new(); tr.name = name
    tr.strips.new(name, 0, act)
for m in muted: m.show_viewport = True
reset_pose()
sc.frame_start, sc.frame_end = 0, 90
json.dump(diag, open(DIAG, "w"))
for a in list(bpy.data.actions):
    if a.name.startswith("ham_"): bpy.data.actions.remove(a)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("BITTI", OUT)
