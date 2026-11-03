# Kılıç çekme hizası: kın ve askıları, elin kabzayı kavradığı kareye göre kalçaya sabitler; kılıç o kareye kadar
# kında durur, o karede ele geçer (iki Child Of kısıtı, kavrama karesinde aynı yer: sıçrama yok).
# Kullanım: blender -b k09.blend --python k10_kin.py -- <klip> <cikti.blend> '{"kavrama": 19}'  (kavrama yoksa: elin kın
# ağzına en yakın olduğu kare). Kılıcın kılıf karşılığı, klibe özel nesne aksiyonu olarak kaydedilir: "kilic_<klip>".
import bpy, sys, json
import numpy as np
from mathutils import Matrix, Vector
argv = sys.argv[sys.argv.index('--') + 1:]
klip, cikti = argv[0], argv[1]
cfg = json.loads(argv[2]) if len(argv) > 2 else {}
sc = bpy.context.scene
rig = bpy.data.objects["Iskelet"]; kin = bpy.data.objects["Kin"]; kil = bpy.data.objects["Kilic"]
askilar = [o for o in bpy.data.objects if o.name.startswith("Aski") and o.type == 'MESH']
for tr in list(rig.animation_data.nla_tracks): rig.animation_data.nla_tracks.remove(tr)
act = bpy.data.actions[klip]; rig.animation_data.action = act
f1 = int(act.frame_range[1])

def noktalar(o):
    dg = bpy.context.evaluated_depsgraph_get(); e = o.evaluated_get(dg); mw = e.matrix_world
    return np.array([tuple(mw @ v.co) for v in e.data.vertices])

def eksen(P):  # en uzun doğrultu (PCA) ve uçlar
    m = P.mean(0); u, s, vt = np.linalg.svd(P - m, full_matrices=False); a = vt[0]
    t = (P - m) @ a
    return m, a, t

def kin_agzi():
    P = noktalar(kin); m, a, t = eksen(P)
    u1, u2 = m + a * t.min(), m + a * t.max()
    agiz, dip = (u1, u2) if u1[2] > u2[2] else (u2, u1)
    return Vector(agiz), Vector(dip)

def el(): return (rig.matrix_world @ rig.pose.bones["hand_r"].matrix).translation

G = cfg.get("kavrama")
if not G:
    en = None
    for f in range(1, f1 + 1):
        sc.frame_set(f); d = (el() - kin_agzi()[0]).length
        if en is None or d < en[1]: en = (f, d)
    G = en[0]
sc.frame_set(G)
# Kılıcın kabza tarafı ve siperi (kabza ucundan itibaren ilk %35'te en geniş kesit)
P = noktalar(kil); m, a, t = eksen(P)
uc_a, uc_b = m + a * t.min(), m + a * t.max()
hp = np.array(tuple(el()))
if np.linalg.norm(uc_a - hp) > np.linalg.norm(uc_b - hp): a = -a; t = -t
L = t.max() - t.min(); t0 = t.min()
yar = np.linalg.norm((P - m) - np.outer(t, a), axis=1)
kova = np.floor((t - t0) / L * 40).astype(int)
en_g, siper_t = -1, t0 + 0.2 * L
for k in range(0, 14):
    s = yar[kova == k]
    if s.size and s.max() > en_g: en_g, siper_t = s.max(), t0 + (k + 0.5) / 40 * L
siper = Vector(m + a * siper_t); namlu = Vector(a).normalized()      # siperden uca doğru
agiz, dip = kin_agzi(); kin_yon = (dip - agiz).normalized()
# Kının doğal sarkışı: kalça ekseninde geriye ve aşağı (varsayılan 35°), hafif dışa. Kavramada kılıç bu yönde durur;
# çekilirken birkaç karede eldeki açısına döner (bilek dönüşü).
sag = ((rig.matrix_world @ rig.pose.bones["thigh_r"].matrix).translation - (rig.matrix_world @ rig.pose.bones["thigh_l"].matrix).translation)
sag.z = 0; sag.normalize(); on = Vector((0, 0, 1)).cross(sag).normalized()          # karakterin önü
if (Vector(siper) - (rig.matrix_world @ rig.pose.bones["pelvis"].matrix).translation).dot(on) < -0.5: on = -on
import math
egim = math.radians(cfg.get("egim", 35)); dis = math.radians(cfg.get("dis", 10))
sarki = (-on * math.cos(egim) + Vector((0, 0, -math.sin(egim)))) ; sarki = (sarki + (-sag) * math.tan(dis) * sarki.length).normalized()
D = Matrix.Translation(siper) @ kin_yon.rotation_difference(sarki).to_matrix().to_4x4() @ Matrix.Translation(-agiz)
# Kılıcın kındaki duruşu: siper ağızda, namlu sarkı yönünde
Rk = namlu.rotation_difference(sarki).to_matrix().to_4x4()
Ms_kin = Matrix.Translation(siper) @ Rk @ Matrix.Translation(-siper)
# Kın ve askılar: G anındaki biçimleri D ile taşınır, kalça kemiğine katı bağlanır (deform kaldırılır)
pel = rig.matrix_world @ rig.pose.bones["pelvis"].matrix
for o in [kin] + askilar:
    W = [D @ Vector(p) for p in noktalar(o)]
    for md in [md for md in o.modifiers if md.type == 'ARMATURE']: o.modifiers.remove(md)
    o.vertex_groups.clear()
    o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = "pelvis"
    o.matrix_world = pel
    bpy.context.view_layer.update()
    inv = o.matrix_world.inverted()
    for v, w in zip(o.data.vertices, W): v.co = inv @ w
    o.data.update()
# Kılıç: ebeveynsiz, iki Child Of (el ve kın); ikisinin de tersi G anında kurulur
bpy.context.view_layer.update()
Ms = kil.matrix_world.copy()
kil.parent = None; kil.matrix_world = Ms
for c in list(kil.constraints): kil.constraints.remove(c)
ch = kil.constraints.new('CHILD_OF'); ch.name = "ElTutus"; ch.target = rig; ch.subtarget = "hand_r"
ch.inverse_matrix = (rig.matrix_world @ rig.pose.bones["hand_r"].matrix).inverted()
ck = kil.constraints.new('CHILD_OF'); ck.name = "KinTutus"; ck.target = kin
bpy.context.view_layer.update()
ck.inverse_matrix = kin.matrix_world.inverted() @ Ms_kin   # kın kısıtı tam etkideyken kılıç Ms_kin @ Ms duruşunda
ka = bpy.data.actions.new("kilic_" + klip); ka.use_fake_user = True
kil.animation_data_create(); kil.animation_data.action = ka
# Kısıtlar birbirini dışlar: G'den önce yalnız kın, G'den sonra yalnız el (ikisi birden açıkken dönüşümler üst üste biner)
for f, v in ((1, 1.0), (G, 1.0), (G + cfg.get("gecis", 4), 0.0)):
    ck.influence = v; kil.keyframe_insert('constraints["KinTutus"].influence', frame=f)
    ch.influence = 1.0 - v; kil.keyframe_insert('constraints["ElTutus"].influence', frame=f)
for fc in ka.fcurves:
    for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
kil.animation_data.action = None; ck.influence = 0.0; ch.influence = 1.0   # öbür kliplerde kılıç elde
sc.frame_set(G); bpy.context.view_layer.update()
print("HIZALANDI", klip, "kavrama", G, "siper-agiz once", round((siper - agiz).length, 3), "askı", len(askilar))
bpy.ops.wm.save_as_mainfile(filepath=cikti)
