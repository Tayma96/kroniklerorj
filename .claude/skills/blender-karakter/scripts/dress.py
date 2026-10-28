# Karakteri dönem eşyalarıyla giydir: kılıç, sivri miğfer + sarık, kumaş rengi, yumruk.
# Kullanım: blender -b --python dress.py -- in.blend out.blend '{json}'
import bpy, bmesh, sys, math, json, mathutils
from mathutils import Vector, Matrix
argv = sys.argv[sys.argv.index('--')+1:]
src, out = argv[0], argv[1]
cfg = json.loads(argv[2]) if len(argv) > 2 else {}
bpy.ops.wm.open_mainfile(filepath=src)
rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
DOKU = cfg.get("doku", "")

def mat(name, color, metal=0.0, rough=0.5, sheen=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if sheen: b.inputs['Sheen Weight'].default_value = sheen
    return m

def scratch(m, scale=180, amount=0.18):
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tc = nt.nodes.new('ShaderNodeTexCoord'); nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = scale
    nz.inputs['Detail'].default_value = 8
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = b.inputs['Roughness'].default_value - amount
    mr.inputs['To Max'].default_value = b.inputs['Roughness'].default_value + amount
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], mr.inputs['Value']); nt.links.new(mr.outputs['Result'], b.inputs['Roughness'])

# ── kumaş dokuları ──
for m in bpy.data.materials:
    if 'harem' in m.name and DOKU:
        for n in m.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.name == 'diffuseTexture': n.image = bpy.data.images.load(DOKU + "/salvar_kizil.png")
    if m.node_tree and any(k in m.name for k in ['harem', 'tunic']):
        b = m.node_tree.nodes.get('Principled BSDF')
        if b: b.inputs['Sheen Weight'].default_value = 0.4; b.inputs['Roughness'].default_value = 0.85

def link(o):
    bpy.context.scene.collection.objects.link(o)

def bone_world_rest(name):
    return rig.matrix_world @ rig.data.bones[name].matrix_local

def attach(obj, bone, M_world_rest):
    b = rig.data.bones[bone]
    P = rig.matrix_world @ b.matrix_local @ Matrix.Translation((0, b.length, 0))
    obj.parent = rig; obj.parent_type = 'BONE'; obj.parent_bone = bone
    obj.matrix_parent_inverse = P.inverted()
    obj.matrix_basis = M_world_rest

# ── kılıç ──
def make_sword():
    bm = bmesh.new()
    L, W0, N = 0.80, 0.036, 48
    secs = []
    for i in range(N + 1):
        t = i / N
        w = W0 * (1 - 0.3 * t) if t < 0.86 else W0 * 0.74 * (1 - (t - 0.86) / 0.14) ** 0.8
        c = -0.075 * t * t
        z = 0.07 + t * L
        th = 0.0034 * (1 - 0.5 * t)
        if i == N:
            v = bm.verts.new((c + 0.002, 0, z)); secs.append([v] * 5); continue
        secs.append([bm.verts.new((c, th, z)), bm.verts.new((c + 0.55 * w, th * 0.55, z)), bm.verts.new((c + w, 0, z)),
                     bm.verts.new((c + 0.55 * w, -th * 0.55, z)), bm.verts.new((c, -th, z))])
    for i in range(N):
        a, b = secs[i], secs[i + 1]
        for j in range(5):
            k = (j + 1) % 5
            vs = [a[j], a[k], b[k], b[j]]
            uniq = []
            for v in vs:
                if v not in uniq: uniq.append(v)
            if len(uniq) >= 3:
                try: bm.faces.new(uniq)
                except ValueError: pass
    bm.faces.new(secs[0][::-1])
    me = bpy.data.meshes.new("Kilic_namlu"); bm.to_mesh(me); bm.free()
    blade = bpy.data.objects.new("Kilic_namlu", me); link(blade)
    for p in me.polygons: p.use_smooth = True
    steel = mat("Celik", (0.78, 0.79, 0.81), 1.0, 0.2); scratch(steel, 400, 0.12); me.materials.append(steel)
    brass = mat("Pirinc", (0.80, 0.58, 0.28), 1.0, 0.32); scratch(brass)
    leather = mat("Kabza_deri", (0.12, 0.06, 0.03), 0.0, 0.62)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.016, 0, 0.062)); g = bpy.context.object; g.scale = (0.12, 0.022, 0.016); g.data.materials.append(brass)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0145, depth=0.115, location=(0.012, 0, 0.0), vertices=20); gr = bpy.context.object; gr.data.materials.append(leather)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.019, location=(0.012, 0, -0.066), segments=20, ring_count=12); pm = bpy.context.object; pm.data.materials.append(brass)
    for o in (g, gr, pm): o.select_set(True)
    blade.select_set(True); bpy.context.view_layer.objects.active = blade
    bpy.ops.object.join(); bpy.ops.object.shade_smooth()
    blade.name = "Kilic"
    return blade

def make_helmet():
    prof = [(0.118, -0.005), (0.121, 0.03), (0.116, 0.07), (0.100, 0.115), (0.075, 0.155), (0.045, 0.19), (0.020, 0.215), (0.009, 0.235), (0.007, 0.27), (0.0, 0.295)]
    bm = bmesh.new(); seg = 48; rings = []
    for r, z in prof:
        ring = [bm.verts.new((r * math.cos(2 * math.pi * k / seg) * 0.88, r * math.sin(2 * math.pi * k / seg) * 1.06, z)) for k in range(seg)]
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(seg):
            a, b = rings[i], rings[i + 1]
            bm.faces.new([a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]])
    me = bpy.data.meshes.new("Migfer"); bm.to_mesh(me); bm.free()
    h = bpy.data.objects.new("Migfer", me); link(h)
    for p in me.polygons: p.use_smooth = True
    sm = h.modifiers.new("kal", 'SOLIDIFY'); sm.thickness = 0.004
    iron = mat("Demir", (0.52, 0.52, 0.53), 1.0, 0.36); scratch(iron, 120, 0.2); me.materials.append(iron)
    # sarık: miğfer eteğine sarılı beyaz bez
    cloth = mat("Sarik", (0.86, 0.82, 0.72), 0.0, 0.9, 0.6)
    parts = [h]
    for i, (dz, tilt) in enumerate([(0.012, 4), (0.035, -5), (0.055, 3)]):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.122 - i * 0.004, minor_radius=0.019, major_segments=48, minor_segments=12, location=(0, 0, dz), rotation=(math.radians(tilt), math.radians(tilt * 0.6), 0))
        t = bpy.context.object; t.scale = (0.9, 1.06, 0.75); t.data.materials.append(cloth); parts.append(t)
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active = h; bpy.ops.object.join(); bpy.ops.object.shade_smooth()
    return h

hand = cfg.get("hand", "RightHand")
hb = rig.data.bones[hand]
Hw = rig.matrix_world
h0 = Hw @ hb.head_local; h1 = Hw @ hb.tail_local
yv = (h1 - h0).normalized()
th = Hw @ rig.data.bones["RThumb" if hand == "RightHand" else "LThumb"].tail_local
tv = (th - h0); tv = (tv - yv * tv.dot(yv)).normalized()
pal = yv.cross(tv).normalized() * cfg.get("palm_sign", 1)
sw = make_sword()
Z = tv; X = yv; Y = Z.cross(X).normalized(); X = Y.cross(Z).normalized()
R = Matrix((X, Y, Z)).transposed().to_4x4()
grip = h0 + (h1 - h0) * cfg.get("grip_t", 0.55) + pal * cfg.get("palm_off", 0.022)
attach(sw, hand, Matrix.Translation(grip) @ R)

if cfg.get("helmet", True):
    hd = rig.data.bones["Head"]
    top = Hw @ hd.tail_local; base = Hw @ hd.head_local
    hm = make_helmet()
    up = (top - base).normalized()
    pos = top - up * cfg.get("helmet_drop", 0.085) + Vector((0, cfg.get("helmet_y", 0.008), 0))
    attach(hm, "Head", Matrix.Translation(pos) @ up.to_track_quat('Z', 'Y').to_matrix().to_4x4())
    for o in list(bpy.data.objects):
        if o.type == 'MESH' and any(k in o.name for k in ['short0', 'long0', 'bob0', 'ponytail', 'braid', 'afro']):
            bpy.data.objects.remove(o, do_unlink=True)

# ── yumruk: parmak eğrilerini sil, sabit kıvrım ver ──
act = rig.animation_data.action if rig.animation_data else None
curl = math.radians(cfg.get("curl", 75))
for side in ("Left", "Right"):
    for bn, ang in ((side + "HandFinger1", curl), (side + "FingerBase", curl * 0.35)):
        pb = rig.pose.bones.get(bn)
        if not pb: continue
        if act:
            for fc in [fc for fc in act.fcurves if f'"{bn}"' in fc.data_path]: act.fcurves.remove(fc)
        pb.rotation_mode = 'XYZ'; pb.rotation_euler = (ang * cfg.get("curl_sign", 1), 0, 0)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("GIYDIRILDI", out)
