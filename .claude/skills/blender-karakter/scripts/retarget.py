# CMU BVH hareketini MPFB cmu_mb iskeletine aktar ve pişir.
# Kullanım: blender -b --python retarget.py -- char.blend motion.bvh out.blend [başla] [bitir]
import bpy, sys, math, mathutils
argv = sys.argv[sys.argv.index('--')+1:]
blend, bvh, out = argv[0], argv[1], argv[2]
f0 = int(argv[3]) if len(argv) > 3 else 1
f1 = int(argv[4]) if len(argv) > 4 else None
bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
tgt = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
bpy.ops.import_anim.bvh(filepath=bvh, global_scale=1.0, rotate_mode='NATIVE', axis_forward='-Z', axis_up='Y', update_scene_fps=True, update_scene_duration=True)
src = bpy.context.object; src.name = "KAYNAK"
MAP = {"lhipjoint": "LHipJoint", "lfemur": "LeftUpLeg", "ltibia": "LeftLeg", "lfoot": "LeftFoot", "ltoes": "LeftToeBase",
       "rhipjoint": "RHipJoint", "rfemur": "RightUpLeg", "rtibia": "RightLeg", "rfoot": "RightFoot", "rtoes": "RightToeBase",
       "lowerback": "LowerBack", "upperback": "Spine", "thorax": "Spine1", "lowerneck": "Neck", "upperneck": "Neck1", "head": "Head",
       "lclavicle": "LeftShoulder", "lhumerus": "LeftArm", "lradius": "LeftForeArm", "lwrist": "LeftHand", "lhand": "LeftFingerBase", "lfingers": "LeftHandFinger1", "lthumb": "LThumb",
       "rclavicle": "RightShoulder", "rhumerus": "RightArm", "rradius": "RightForeArm", "rwrist": "RightHand", "rhand": "RightFingerBase", "rfingers": "RightHandFinger1", "rthumb": "RThumb"}
# yön: kaynağın sol kalçası +X'te değilse 180° çevir (MakeHuman -Y'ye bakar, solu +X)
sc.frame_set(0)
lh = src.matrix_world @ src.data.bones["lfemur"].head_local
if lh.x < 0: src.rotation_euler[2] = math.pi
bpy.context.view_layer.update()
# boy ölçeği: kalça yüksekliği
src_leg = src.data.bones["lfemur"].length + src.data.bones["ltibia"].length
tgt_leg = (tgt.data.bones["LeftUpLeg"].length + tgt.data.bones["LeftLeg"].length) * tgt.scale.z
k = tgt_leg / max(src_leg, 1e-4); src.scale = (k, k, k); bpy.context.view_layer.update()
print("OLCEK", k, "yön", lh.x)
for s, t in MAP.items():
    pb = tgt.pose.bones.get(t)
    if not pb or s not in src.pose.bones: continue
    c = pb.constraints.new('DAMPED_TRACK'); c.target = src; c.subtarget = s; c.head_tail = 1.0
act = src.animation_data.action
fs, fe = int(act.frame_range[0]), int(act.frame_range[1])
f1 = min(f1 or fe, fe); f0 = max(f0, fs)
# kalça: konum + dönüş (dinlenme farkı korunarak)
hips = tgt.pose.bones["Hips"]; hips.rotation_mode = 'QUATERNION'
S_r = (src.matrix_world @ src.data.bones["root"].matrix_local).to_quaternion()
T_r = (tgt.matrix_world @ tgt.data.bones["Hips"].matrix_local)
for f in range(f0, f1 + 1):
    sc.frame_set(f)
    S_t = src.matrix_world @ src.pose.bones["root"].matrix
    rotq = S_t.to_quaternion() @ S_r.inverted() @ T_r.to_quaternion()
    M = mathutils.Matrix.Translation(S_t.translation) @ rotq.to_matrix().to_4x4()
    hips.matrix = tgt.matrix_world.inverted() @ M
    bpy.context.view_layer.update()
    hips.keyframe_insert("location", frame=f); hips.keyframe_insert("rotation_quaternion", frame=f)
# pişir
for o in bpy.context.selected_objects: o.select_set(False)
tgt.select_set(True); bpy.context.view_layer.objects.active = tgt
bpy.ops.object.mode_set(mode='POSE'); bpy.ops.pose.select_all(action='SELECT')
bpy.ops.nla.bake(frame_start=f0, frame_end=f1, only_selected=True, visual_keying=True, clear_constraints=True, use_current_action=True, bake_types={'POSE'})
bpy.ops.object.mode_set(mode='OBJECT')
bpy.data.objects.remove(src, do_unlink=True)
sc.frame_start, sc.frame_end = f0, f1
bpy.ops.wm.save_as_mainfile(filepath=out)
print("PISTI", out, f0, f1)
