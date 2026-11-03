# Hareket iyileştirme: kalkan görüş kuralı. Gardda kalkanın üst kenarı göz hizasının altında durur (rakip görülür);
# "kalk" pencerelerinde (darbe gelirken, savuşturmada) kalkan yükselir ve başı örter. Düzeltme omuzdan yapılır: üst kol,
# gövdenin yanal ekseni etrafında indirilir; ön kol ve el ona bağlı gelir. Kalkan yüzü dikliğini korur (ön kol telafisi).
# Kullanım: blender -b in.blend --python k12_kalkan.py -- <aksiyon> <cikti.blend> '{"pay": 0.05, "kalk": [[31, 48]]}'
#   pay: gardda üst kenarın göz hizasının ne kadar altında duracağı (m). kalk: çıkış karelerinde yükselme pencereleri.
import bpy, sys, json, math
from mathutils import Matrix, Vector
argv = sys.argv[sys.argv.index('--') + 1:]
adi, cikti = argv[0], argv[1]
cfg = json.loads(argv[2]) if len(argv) > 2 else {}
sc = bpy.context.scene; rig = bpy.data.objects["Iskelet"]; kal = bpy.data.objects["Kalkan"]
for tr in list(rig.animation_data.nla_tracks): rig.animation_data.nla_tracks.remove(tr)
act = bpy.data.actions[adi]; rig.animation_data.action = act
f1 = int(act.frame_range[1]); R = cfg.get("yaricap", 0.30); PAY = cfg.get("pay", 0.05)
W = lambda b: rig.matrix_world @ rig.pose.bones[b].matrix

def goz():
    h = rig.pose.bones["head"]; m = rig.matrix_world
    return (m @ h.head).lerp(m @ h.tail, 0.35)

def ust_kenar():
    M = kal.matrix_world; n = (M.to_3x3() @ Vector((0, 0, 1))).normalized()
    u = Vector((0, 0, 1)) - n * n.z
    return M.translation + (u.normalized() * R if u.length > 1e-4 else Vector((0, 0, 0)))

def kalk_agirlik(t):
    w = 0.0
    for a0, a1 in cfg.get("kalk", []):
        if a0 - 5 <= t <= a1 + 5:
            u = 1.0 if a0 <= t <= a1 else (1 - (a0 - t) / 5 if t < a0 else 1 - (t - a1) / 5)
            w = max(w, u * u * (3 - 2 * u))
    return w

def dondur(bone, eksen, aci, pivot_world):  # kemiği dünya ekseni etrafında, pivot noktasından döndür (armatür uzayında)
    pb = rig.pose.bones[bone]; mi = rig.matrix_world.inverted()
    p = mi @ pivot_world; e = (mi.to_3x3() @ eksen).normalized()
    Rm = Matrix.Translation(p) @ Matrix.Rotation(aci, 4, e) @ Matrix.Translation(-p)
    pb.matrix = Rm @ pb.matrix
    bpy.context.view_layer.update()

olcum = []
for t in range(1, f1 + 1):
    sc.frame_set(t)
    hedef = goz().z - PAY
    fark = ust_kenar().z - hedef
    w = 1 - kalk_agirlik(t)
    ilk = round(fark, 3)
    if fark > 0 and w > 0:
        sag = (W("thigh_r").translation - W("thigh_l").translation); sag.z = 0; sag.normalize()
        omuz = W("upperarm_l").translation
        for tur in range(2):
            for _ in range(6):  # birkaç adımda hedefe
                d = max(0.2, (ust_kenar() - omuz).length)
                aci = math.asin(min(0.9, (ust_kenar().z - hedef) / d)) * w
                if abs(aci) < 0.003: break
                z0 = ust_kenar().z
                dondur("upperarm_l", sag, aci, omuz)
                if ust_kenar().z > z0: dondur("upperarm_l", sag, -2 * aci, omuz)   # yanlış yön: ters çevir
                if ust_kenar().z <= hedef + 0.005: break
            # Kalkan yüzünü dik tut: indirme yüzü öne/arkaya yatırdıysa ön kolu telafi et
            n = (kal.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized()
            egim = math.asin(max(-1, min(1, n.z)))
            if abs(egim) > math.radians(12):
                dirsek = W("lowerarm_l").translation
                z0 = n.z; dondur("lowerarm_l", sag, -egim * 0.6 * w, dirsek)
                n2 = (kal.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized()
                if abs(n2.z) > abs(z0): dondur("lowerarm_l", sag, 2 * egim * 0.6 * w, dirsek)
    for b in ("upperarm_l", "lowerarm_l"):
        rig.pose.bones[b].keyframe_insert("rotation_quaternion", frame=t, group=b)
    olcum.append((t, ilk, round(ust_kenar().z - hedef, 3)))
rig.animation_data.action = None
gard = [o for o in olcum if kalk_agirlik(o[0]) == 0]
uzak = [o for o in olcum if all(not (a0 - 6 <= o[0] <= a1 + 6) for a0, a1 in cfg.get("kalk", []))]
print("KALKAN", adi, "gardda göz üstü kalan (önce→sonra, en kötü):", max(o[1] for o in gard), "→", max(o[2] for o in gard),
      "| geçişler hariç:", max(o[1] for o in uzak), "→", max(o[2] for o in uzak), "| en kötü kareler:", sorted(olcum, key=lambda o: -o[2])[:4])
bpy.ops.wm.save_as_mainfile(filepath=cikti)
