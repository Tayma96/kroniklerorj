# Klip harmanlama: hareketleri art arda dizer (geçişte yumuşak harman), eşyaya göre katman ve hız uygular.
# Kullanım: blender -b in.blend --python k11_harman.py -- <cikti.blend> '<json>'
# json: {"ad": "harman_kalkan",
#        "dizi": [["mx_bekleme", 1, 30], ["tk_kombo", 1, 45, 1.0], ["mx_bekleme", 30, 76]],   # [klip, ilk, son, hız]
#        "gecis": 8,                                                                         # kare
#        "katman": {"klip": "mx_kalkan_gard", "kemikler": "sol_kol", "agirlik": 1.0},        # ör. kalkan kolu
#        "kalkan": true}                                                                     # basit yuvarlak kalkan
# Eşyaya göre kullanım: kalkan takılıysa sol kol kalkan gardından gelir (gövdeyle birlikte döner); ağır silahta (gürz,
# balta) hız < 1 (kaldırış ağır), hançerde hız > 1. Kök: her parça bir öncekinin bittiği yerden başlar (geri kayma yok).
import bpy, sys, json, math
from mathutils import Quaternion, Vector, Matrix
argv = sys.argv[sys.argv.index('--') + 1:]
cikti = argv[0]; cfg = json.loads(argv[1])
rig = bpy.data.objects["Iskelet"]; sc = bpy.context.scene
for tr in list(rig.animation_data.nla_tracks): rig.animation_data.nla_tracks.remove(tr)
kemikler = [b.name for b in rig.data.bones]
SOL_KOL = {"clavicle_l", "upperarm_l", "lowerarm_l", "hand_l"} | {f"{p}_0{i}_l" for p in ("thumb", "index", "middle", "ring", "pinky") for i in (1, 2, 3)}

def ornek(act, f):  # klibin f karesindeki yerel duruş
    fc = {(c.data_path, c.array_index): c for c in act.fcurves}
    out = {}
    for b in kemikler:
        dp = f'pose.bones["{b}"].rotation_quaternion'
        q = Quaternion([fc[(dp, i)].evaluate(f) if (dp, i) in fc else (1.0 if i == 0 else 0.0) for i in range(4)]).normalized()
        out[b] = q
    dl = 'pose.bones["pelvis"].location'
    out["_loc"] = Vector([fc[(dl, i)].evaluate(f) if (dl, i) in fc else 0.0 for i in range(3)])
    return out

def slerp(a, b, w):
    if a.dot(b) < 0: b = -b
    return a.slerp(b, w)

pr = rig.data.bones["pelvis"].matrix_local.to_3x3()
ust = (pr.inverted() @ Vector((0, 0, 1))).normalized()          # dünya yukarısı, kalça kemiği uzayında
def yatay(v): return v - ust * v.dot(ust)

gecis = cfg.get("gecis", 8)
parcalar = []; T = 1; ofs = Vector((0, 0, 0))
for i, p in enumerate(cfg["dizi"]):
    klip, s, e = p[0], p[1], p[2]; h = p[3] if len(p) > 3 else 1.0
    act = bpy.data.actions[klip]; L = int(round((e - s) / h)) + 1
    if parcalar:
        onc = parcalar[-1]
        son = ornek(onc["act"], onc["e"])["_loc"] + onc["ofs"]
        ofs = yatay(son - ornek(act, s)["_loc"])
        T = onc["T"] + onc["L"] - gecis
    parcalar.append({"act": act, "s": s, "e": e, "h": h, "L": L, "T": T, "ofs": ofs.copy()})
toplam = parcalar[-1]["T"] + parcalar[-1]["L"] - 1

def parca_poz(pc, t):
    f = pc["s"] + (t - pc["T"]) * pc["h"]
    f = max(pc["s"], min(pc["e"], f))
    d = ornek(pc["act"], f); d["_loc"] = d["_loc"] + pc["ofs"]; return d

kat = cfg.get("katman"); kat_act = bpy.data.actions[kat["klip"]] if kat else None
if kat_act: kL = int(kat_act.frame_range[1] - kat_act.frame_range[0]) + 1
yeni = bpy.data.actions.new(cfg["ad"]); yeni.use_fake_user = True
rig.animation_data.action = yeni
for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'
onceki = {}
for t in range(1, toplam + 1):
    etkin = [pc for pc in parcalar if pc["T"] <= t <= pc["T"] + pc["L"] - 1]
    if len(etkin) == 1: poz = parca_poz(etkin[0], t)
    else:
        a, b = etkin[0], etkin[1]
        w = (t - b["T"] + 1) / (gecis + 1); w = w * w * (3 - 2 * w)
        pa, pb2 = parca_poz(a, t), parca_poz(b, t)
        poz = {k: slerp(pa[k], pb2[k], w) for k in kemikler}; poz["_loc"] = pa["_loc"].lerp(pb2["_loc"], w)
    if kat_act:
        kp = ornek(kat_act, kat_act.frame_range[0] + ((t - 1) % kL))
        maske = SOL_KOL if kat.get("kemikler") == "sol_kol" else set(kat.get("kemikler", []))
        for k in maske: poz[k] = slerp(poz[k], kp[k], kat.get("agirlik", 1.0))
    for k in kemikler:
        q = poz[k]
        if k in onceki and onceki[k].dot(q) < 0: q = -q
        onceki[k] = q
        pbn = rig.pose.bones[k]; pbn.rotation_quaternion = q; pbn.keyframe_insert("rotation_quaternion", frame=t, group=k)
    pp = rig.pose.bones["pelvis"]; pp.location = poz["_loc"]; pp.keyframe_insert("location", frame=t, group="pelvis")

if cfg.get("kalkan") and "Kalkan" not in bpy.data.objects:
    # Basit yuvarlak kalkan (ağaç gövde + demir kabara); sol ön kola bağlı, yüzü vücuttan dışarı bakar.
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.30, depth=0.025)
    gv = bpy.context.active_object; gv.name = "Kalkan"
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.065)
    kb = bpy.context.active_object; kb.scale.z = 0.5; kb.location.z = 0.012
    bpy.ops.object.select_all(action='DESELECT'); kb.select_set(True); gv.select_set(True); bpy.context.view_layer.objects.active = gv
    bpy.ops.object.join()
    sc.frame_set(1); bpy.context.view_layer.update()
    kol = rig.matrix_world @ rig.pose.bones["lowerarm_l"].matrix
    sag = (rig.matrix_world @ rig.pose.bones["thigh_r"].matrix).translation - (rig.matrix_world @ rig.pose.bones["thigh_l"].matrix).translation
    disari = -sag.normalized()                                  # karakterin solu
    eks = [kol.to_3x3() @ Vector(v) for v in ((1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1))]
    n = max(eks, key=lambda v: v.dot(disari)).normalized()
    orta = (kol.translation + (rig.matrix_world @ rig.pose.bones["hand_l"].matrix).translation) / 2 + n * 0.07
    yon = (kol.to_3x3() @ Vector((0, 1, 0))).normalized()
    x = yon.cross(n).normalized(); y = n.cross(x)
    M = Matrix((x, y, n)).transposed().to_4x4(); M.translation = orta
    gv.parent = rig; gv.parent_type = 'BONE'; gv.parent_bone = "lowerarm_l"
    gv.matrix_world = M
rig.animation_data.action = None
print("HARMANLANDI", cfg["ad"], "kare", toplam, "parça", len(parcalar), "katman", bool(kat_act))
bpy.ops.wm.save_as_mainfile(filepath=cikti)
