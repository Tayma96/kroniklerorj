# Mixamo hareket yakalamasını Selçuklu piyadesinin iskeletine (MPFB game_engine, "Iskelet") aktarır.
# Kullanım: blender -b k05.blend --python k09_mixamo.py -- <fbx_klasoru> <cikti.blend> '<json>'
# json: {"klipler": {"mx_bekleme": "sword and shield idle.fbx", ...}, "yerinde": ["mx_bekleme"]}
# Yöntem: her eşli kemikte dünya yönelimi aktarılır. Hedefin dinlenme kemiği kaynak kemiğin yönüne en kısa dönüşle
# hizalanır (T/A duruş farkı kapanır), sonra kaynağın her karedeki dünya dönüşü bu sabit ofsetle hedefe geçer.
# Kalça konumu bacak boyu oranıyla ölçeklenir; yön farkı (kaynak hangi yana bakıyorsa) kalça ekseninden düzeltilir.
# Lisans notu: Mixamo animasyonları oyun/video içinde telifsiz kullanılabilir; ham FBX dosyaları depoya konmaz.
import bpy, sys, os, json, math
from mathutils import Matrix, Quaternion, Vector
argv = sys.argv[sys.argv.index('--') + 1:]
kaynak_dir, cikti = argv[0], argv[1]
cfg = json.loads(argv[2]) if len(argv) > 2 else {}
ESLE = {"Hips": "pelvis", "Spine": "spine_01", "Spine1": "spine_02", "Spine2": "spine_03", "Neck": "neck_01", "Head": "head"}
for yan, y in (("Left", "l"), ("Right", "r")):
    ESLE.update({f"{yan}Shoulder": f"clavicle_{y}", f"{yan}Arm": f"upperarm_{y}", f"{yan}ForeArm": f"lowerarm_{y}", f"{yan}Hand": f"hand_{y}",
                 f"{yan}UpLeg": f"thigh_{y}", f"{yan}Leg": f"calf_{y}", f"{yan}Foot": f"foot_{y}", f"{yan}ToeBase": f"ball_{y}"})
    for p, q in (("Thumb", "thumb"), ("Index", "index"), ("Middle", "middle"), ("Ring", "ring"), ("Pinky", "pinky")):
        for i in (1, 2, 3): ESLE[f"{yan}Hand{p}{i}"] = f"{q}_0{i}_{y}"
sc = bpy.context.scene
tgt = bpy.data.objects["Iskelet"]
for pb in tgt.pose.bones: pb.rotation_mode = 'QUATERNION'
tw = tgt.matrix_world.copy(); twq = tw.to_quaternion()

def sira(arm):  # ebeveyn önce
    out = []
    def gez(b):
        out.append(b)
        for c in b.children: gez(c)
    for b in arm.data.bones:
        if b.parent is None: gez(b)
    return out

def yatay(v): return Vector((v.x, v.y, 0)).normalized()

def aktar(ad, dosya, yerinde):
    once = set(bpy.data.objects); once_a = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=os.path.join(kaynak_dir, dosya), automatic_bone_orientation=False)
    yeni = [o for o in bpy.data.objects if o not in once]
    src = next(o for o in yeni if o.type == 'ARMATURE')
    act = src.animation_data.action
    sw = src.matrix_world
    sb = {n.split(":")[-1]: b for n, b in src.data.bones.items()}
    spb = {n.split(":")[-1]: b for n, b in src.pose.bones.items()}
    esle = {s: t for s, t in ESLE.items() if s in sb and t in tgt.data.bones}
    # Yön: kaynak ve hedef kalçalarının sağ→sol ekseni aynı yöne baksın.
    s_sag = yatay((sw @ sb["LeftUpLeg"].head_local) - (sw @ sb["RightUpLeg"].head_local))
    t_sag = yatay((tw @ tgt.data.bones["thigh_l"].head_local) - (tw @ tgt.data.bones["thigh_r"].head_local))
    aci = math.atan2(s_sag.cross(t_sag).z, s_sag.dot(t_sag))
    Y = Quaternion((0, 0, 1), aci); Ym = Y.to_matrix().to_4x4()
    # Boy oranı: kalça yüksekliği (yere göre)
    s_kalca0 = Ym @ (sw @ sb["Hips"].head_local); t_kalca0 = tw @ tgt.data.bones["pelvis"].head_local
    s_ayak = min((Ym @ (sw @ sb[k].head_local)).z for k in ("LeftFoot", "RightFoot"))
    t_ayak = min((tw @ tgt.data.bones[k].head_local).z for k in ("foot_l", "foot_r"))
    oran = (t_kalca0.z - t_ayak) / max(1e-4, (s_kalca0.z - s_ayak))
    # Sabit ofsetler: C = S0⁻¹ · Q · T0 (Q hedef kemiği kaynak dinlenme yönüne çevirir)
    C = {}
    for s, t in esle.items():
        S0 = Y @ (sw @ sb[s].matrix_local).to_quaternion()
        T0 = (tw @ tgt.data.bones[t].matrix_local).to_quaternion()
        Q = (T0 @ Vector((0, 1, 0))).rotation_difference(S0 @ Vector((0, 1, 0)))
        C[t] = S0.inverted() @ Q @ T0
    t2s = {t: s for s, t in esle.items()}
    hedef_act = bpy.data.actions.new(ad); hedef_act.use_fake_user = True
    if not tgt.animation_data: tgt.animation_data_create()
    tgt.animation_data.action = hedef_act
    f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
    sira_t = sira(tgt); onceki = {}
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        poz = {}
        for b in sira_t:
            pb = tgt.pose.bones[b.name]
            rest_l = (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local
            ana = poz[b.parent.name] if b.parent else Matrix.Identity(4)
            fk = ana @ rest_l
            if b.name in t2s:
                s = t2s[b.name]
                Sw = Y @ (sw @ spb[s].matrix).to_quaternion()
                Ta = twq.inverted() @ (Sw @ C[b.name])
                if b.name == "pelvis":
                    d = (Ym @ (sw @ spb["Hips"].matrix).translation) - s_kalca0
                    d = d * oran
                    if yerinde: d.x = d.y = 0
                    yer = tw.inverted() @ (t_kalca0 + d)
                else:
                    yer = fk.translation
                M = Matrix.Translation(yer) @ Ta.to_matrix().to_4x4()
            else:
                M = fk
            poz[b.name] = M
            basis = rest_l.inverted() @ ana.inverted() @ M
            q = basis.to_quaternion()
            if b.name in onceki and onceki[b.name].dot(q) < 0: q.negate()
            onceki[b.name] = q
            pb.rotation_quaternion = q
            pb.keyframe_insert("rotation_quaternion", frame=f - f0 + 1, group=b.name)
            if b.name == "pelvis":
                pb.location = basis.translation
                pb.keyframe_insert("location", frame=f - f0 + 1, group=b.name)
    # Kaynak iskeleti ve aksiyonunu at (ham veri .blend'e girmesin)
    for o in yeni: bpy.data.objects.remove(o, do_unlink=True)
    for a in set(bpy.data.actions) - once_a - {hedef_act}: bpy.data.actions.remove(a)
    print("AKTARILDI", ad, dosya, "kare", f1 - f0 + 1, "kemik", len(esle), "oran", round(oran, 3), "yön", round(math.degrees(aci), 1))

klipler = cfg.get("klipler", {"mx_bekleme": "sword and shield idle.fbx", "mx_saldiri": "sword and shield attack.fbx"})
for ad, dosya in klipler.items():
    aktar(ad, dosya, ad in cfg.get("yerinde", []))
tgt.animation_data.action = None
bpy.ops.wm.save_as_mainfile(filepath=cikti)
print("KAYDEDILDI", cikti)
