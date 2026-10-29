# Gerçek zamanlı (glTF/Filament) için karakter hazırlığı:
# malzemeleri sadeleştir, küçük dokuları bağla, yardımcı geometriyi uygula,
# kılıç + miğferi RightHand / Head'e %100 derili ağ yap (kemiğe ebeveynli nesne değil).
# Kullanım: blender -b char.blend --python prep.py -- out.blend '{json}'
import bpy, bmesh, sys, os, math, json
from mathutils import Vector, Matrix
argv = sys.argv[sys.argv.index('--') + 1:]
out = argv[0]
cfg = json.loads(argv[1]) if len(argv) > 1 else {}
W = os.path.dirname(os.path.abspath(out))
TEX = cfg.get("tex", "/tmp/claude-0/-home-user-kroniklerorj/c519a9f5-cfce-5229-98c4-72e1209e4be2/scratchpad/spike3d/tex")
rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
body = bpy.data.objects[rig.name.replace('.rig', '')]

def activate(o):
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o

# ── ağız içi ağlar: bütçe için çıkar ──
for o in list(bpy.data.objects):
    if o.type == 'MESH' and any(k in o.name for k in ('teeth', 'tongue')):
        bpy.data.objects.remove(o, do_unlink=True)

# ── gövde: şekil anahtarlarını karışımla göm, maskeleri uygula ──
activate(body)
if body.data.shape_keys:
    body.shape_key_add(name="mix", from_mix=True)
    for k in list(body.data.shape_keys.key_blocks)[:-1]:
        body.shape_key_remove(k)
    body.shape_key_remove(body.data.shape_keys.key_blocks[0])
for m in list(body.modifiers):
    if m.type == 'MASK':
        bpy.ops.object.modifier_apply(modifier=m.name)

# ── malzemeler: glTF dostu tek Principled + doğrudan doku ──
def img(name, colorspace='sRGB'):
    im = bpy.data.images.load(os.path.join(TEX, name), check_existing=True)
    im.colorspace_settings.name = colorspace
    return im

def simple_mat(name, tex=None, rough=0.6, metal=0.0, alpha=False, normal=None, color=None, spec=0.4):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); o.location = (400, 0)
    b = nt.nodes.new('ShaderNodeBsdfPrincipled'); b.location = (100, 0)
    nt.links.new(b.outputs['BSDF'], o.inputs['Surface'])
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = spec
    if color: b.inputs['Base Color'].default_value = (*color, 1)
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.location = (-300, 100); t.image = img(tex)
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if alpha:
            nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    if normal:
        n = nt.nodes.new('ShaderNodeTexImage'); n.location = (-300, -250); n.image = img(normal, 'Non-Color')
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.location = (-50, -250)
        nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    m.blend_method = 'BLEND' if alpha else 'OPAQUE'
    if hasattr(m, 'surface_render_method'): m.surface_render_method = 'BLENDED' if alpha else 'DITHERED'
    m.use_backface_culling = not alpha
    m.show_transparent_back = False
    return m

skin = simple_mat("Ten", "skin.jpg", rough=0.55, spec=0.35)
body.data.materials.clear(); body.data.materials.append(skin)
for p in body.data.polygons: p.material_index = 0

for o in bpy.data.objects:
    if o.type != 'MESH' or o == body: continue
    n = o.name
    if 'eyebrow' in n: m = simple_mat("Kas", "eyebrow.png", rough=0.8, alpha=True)
    elif 'eyelash' in n: m = simple_mat("Kirpik", "eyelash.png", rough=0.8, alpha=True)
    elif 'high-poly' in n or 'eye' in n: m = simple_mat("Goz", "eye.jpg", rough=0.15, spec=0.6)
    elif 'harem' in n: m = simple_mat("Salvar", "salvar.jpg", rough=0.85, spec=0.2)
    elif 'tunic' in n: m = simple_mat("Gomlek", "tunic.jpg", rough=0.85, spec=0.2)
    elif 'boots' in n: m = simple_mat("Cizme", "boots.jpg", rough=0.7, normal="boots_norm.png", spec=0.3)
    else: continue
    o.data.materials.clear(); o.data.materials.append(m)
    for p in o.data.polygons: p.material_index = 0

# ── kemik çerçeveleri (dinlenme) ──
Hw = rig.matrix_world
def hand_frame(side):
    hb = rig.data.bones[side + "Hand"]
    Y = (Hw.to_3x3() @ hb.matrix_local.to_3x3() @ Vector((0, 1, 0))).normalized()
    th = Hw @ rig.data.bones[("R" if side == "Right" else "L") + "Thumb"].tail_local - Hw @ hb.head_local
    T = (th - Y * th.dot(Y)).normalized()
    P = (T.cross(Y) if side == "Right" else Y.cross(T)).normalized()   # avuç yönü (parmakların kıvrıldığı taraf)
    return Hw @ hb.head_local, Y, T, P

def skin_to(obj, bone):
    obj.parent = rig; obj.matrix_parent_inverse = rig.matrix_world.inverted()
    vg = obj.vertex_groups.new(name=bone)
    vg.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')
    md = obj.modifiers.new("Armature", 'ARMATURE'); md.object = rig

def pbr(name, color, metal, rough):
    return simple_mat(name, None, rough=rough, metal=metal, color=color, spec=0.5)

def join(objs, name):
    activate(objs[0])
    for o in objs: o.select_set(True)
    bpy.ops.object.join(); o = bpy.context.object; o.name = name; o.data.name = name
    return o

# ── kılıç: iki elle tutulabilir uzun kabzalı eğri kılıç; yerel +Z namlu, +X ağız, kabza merkezi 0 ──
def make_sword():
    GRIP0, GRIP1 = cfg.get("grip0", -0.055), cfg.get("grip1", 0.20)     # kabza alt/üst
    L, W0, N = cfg.get("blade", 0.76), 0.034, 24
    bm = bmesh.new(); secs = []
    zb = GRIP1 + 0.022
    for i in range(N + 1):
        t = i / N
        w = W0 * (1 - 0.3 * t) if t < 0.86 else W0 * 0.74 * (1 - (t - 0.86) / 0.14) ** 0.8
        c = -0.07 * t * t
        z = zb + t * L
        th = 0.0036 * (1 - 0.5 * t)
        if i == N:
            v = bm.verts.new((c + 0.002, 0, z)); secs.append([v] * 5); continue
        secs.append([bm.verts.new((c, th, z)), bm.verts.new((c + 0.55 * w, th * 0.55, z)), bm.verts.new((c + w, 0, z)),
                     bm.verts.new((c + 0.55 * w, -th * 0.55, z)), bm.verts.new((c, -th, z))])
    for i in range(N):
        a, b = secs[i], secs[i + 1]
        for j in range(5):
            k = (j + 1) % 5
            uniq = []
            for v in (a[j], a[k], b[k], b[j]):
                if v not in uniq: uniq.append(v)
            if len(uniq) >= 3:
                try: bm.faces.new(uniq)
                except ValueError: pass
    bm.faces.new(secs[0][::-1])
    me = bpy.data.meshes.new("Namlu"); bm.to_mesh(me); bm.free()
    blade = bpy.data.objects.new("Namlu", me); bpy.context.scene.collection.objects.link(blade)
    me.materials.append(pbr("Celik", (0.80, 0.81, 0.83), 1.0, 0.22))
    brass = pbr("Pirinc", (0.80, 0.58, 0.28), 1.0, 0.35)
    leather = pbr("Kabza", (0.13, 0.065, 0.035), 0.0, 0.6)
    gl = GRIP1 - GRIP0
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.014, 0, GRIP1 + 0.011)); g = bpy.context.object
    g.scale = (0.11, 0.024, 0.018); g.data.materials.append(brass); bpy.ops.object.transform_apply(scale=True)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0135, depth=gl, location=(0.010, 0, (GRIP0 + GRIP1) / 2), vertices=12)
    gr = bpy.context.object; gr.scale = (1.15, 0.85, 1); gr.data.materials.append(leather); bpy.ops.object.transform_apply(scale=True)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.019, location=(0.010, 0, GRIP0 - 0.012), segments=12, ring_count=8)
    pm = bpy.context.object; pm.data.materials.append(brass)
    o = join([blade, g, gr, pm], "Kilic")
    for p in o.data.polygons: p.use_smooth = True
    return o

def make_helmet():
    prof = [(0.118, -0.005), (0.121, 0.03), (0.116, 0.07), (0.100, 0.115), (0.075, 0.155), (0.045, 0.19), (0.020, 0.215), (0.009, 0.235), (0.007, 0.27), (0.0, 0.295)]
    sx, sy = cfg.get("hsx", 0.74), cfg.get("hsy", 0.97)
    bm = bmesh.new(); seg = 32; rings = []
    for r, z in prof:
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * k / seg) * sx, r * math.sin(2 * math.pi * k / seg) * sy, z)) for k in range(seg)])
    for i in range(len(rings) - 1):
        for k in range(seg):
            a, b = rings[i], rings[i + 1]
            bm.faces.new([a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]])
    me = bpy.data.meshes.new("Migfer"); bm.to_mesh(me); bm.free()
    h = bpy.data.objects.new("Migfer", me); bpy.context.scene.collection.objects.link(h)
    sm = h.modifiers.new("kal", 'SOLIDIFY'); sm.thickness = 0.004; sm.offset = 1.0
    activate(h); bpy.ops.object.modifier_apply(modifier="kal")
    me.materials.append(pbr("Demir", (0.50, 0.50, 0.52), 1.0, 0.38))
    cloth = pbr("Sarik", (0.86, 0.82, 0.72), 0.0, 0.9)
    parts = [h]
    pz = [q[1] for q in prof]; pr = [q[0] for q in prof]
    def rad(h):
        for j in range(len(pz) - 1):
            if pz[j] <= h <= pz[j + 1]:
                u = (h - pz[j]) / (pz[j + 1] - pz[j]); return pr[j] * (1 - u) + pr[j + 1] * u
        return pr[0]
    for i, (dz, tilt) in enumerate([(0.008, 3), (0.030, -4), (0.052, 2)]):
        rt, rz = 0.016, 0.013
        ax, ay = rad(dz) * sx + rt + 0.002, rad(dz) * sy + rt + 0.002
        tb = bmesh.new(); NS, NC = 40, 8; ring = []
        for a in range(NS):
            th = 2 * math.pi * a / NS
            cx, cy = ax * math.cos(th), ay * math.sin(th)
            nx, ny = cx / ax ** 2, cy / ay ** 2; nl = math.hypot(nx, ny); nx, ny = nx / nl, ny / nl
            zc = dz + math.tan(math.radians(tilt)) * cy
            ring.append([tb.verts.new((cx + nx * rt * math.cos(2 * math.pi * k / NC), cy + ny * rt * math.cos(2 * math.pi * k / NC),
                                       zc + rz * math.sin(2 * math.pi * k / NC))) for k in range(NC)])
        for a in range(NS):
            A, Bv = ring[a], ring[(a + 1) % NS]
            for k in range(NC):
                tb.faces.new([A[k], A[(k + 1) % NC], Bv[(k + 1) % NC], Bv[k]])
        tm = bpy.data.meshes.new("Sarik%d" % i); tb.to_mesh(tm); tb.free()
        t = bpy.data.objects.new("Sarik%d" % i, tm); bpy.context.scene.collection.objects.link(t)
        tm.materials.append(cloth); parts.append(t)
    o = join(parts, "Migfer")
    for p in o.data.polygons: p.use_smooth = True
    return o

# kılıcı dinlenme duruşundaki sağ yumruğa yerleştir
w, Y, T, P = hand_frame("Right")
beta = math.radians(cfg.get("beta", 90))          # el ekseni ile namlu arası açı
Zs = (Y * math.cos(beta) + T * math.sin(beta)).normalized()
Xs = (Y - Zs * Y.dot(Zs)).normalized()             # ağız parmak eklemlerine bakar
Ys = Zs.cross(Xs)
G = w + Y * cfg.get("gy", 0.044) + P * cfg.get("gp", 0.056) + T * cfg.get("gt", 0.0)
Msw = Matrix.Translation(G) @ Matrix((Xs, Ys, Zs)).transposed().to_4x4()
sw = make_sword(); sw.data.transform(Msw); sw.matrix_world = Matrix.Identity(4)
skin_to(sw, "RightHand")

# miğfer: kafa kemiğine göre
hd = rig.data.bones["Head"]
top = Hw @ hd.tail_local; base = Hw @ hd.head_local
up = (top - base).normalized()
pos = top - up * cfg.get("helmet_drop", 0.095) + Vector((0, cfg.get("helmet_y", -0.011), 0))
hm = make_helmet()
hm.data.transform(Matrix.Translation(pos) @ up.to_track_quat('Z', 'Y').to_matrix().to_4x4() @ Matrix.Rotation(math.radians(cfg.get('htilt', 8.0)), 4, 'X') @ Matrix.Diagonal([cfg.get("hscale", 1.0)] * 3).to_4x4())
hm.matrix_world = Matrix.Identity(4)
skin_to(hm, "Head")

# ── ağırlıksız köşeler (ör. meme ucu yardımcıları): en yakın ağırlıklı köşeden kopyala ──
from mathutils.kdtree import KDTree
BONES = {b.name for b in rig.data.bones}
for o in bpy.data.objects:
    if o.type != 'MESH' or o.parent != rig: continue
    gi = {g.index: g.name for g in o.vertex_groups}
    wt = lambda v: [(gi[g.group], g.weight) for g in v.groups if gi.get(g.group) in BONES and g.weight > 0]
    good = [v for v in o.data.vertices if wt(v)]; bad = [v for v in o.data.vertices if not wt(v)]
    if not bad or not good: continue
    kd = KDTree(len(good))
    for i, v in enumerate(good): kd.insert(v.co, i)
    kd.balance()
    for v in bad:
        _, i, _ = kd.find(v.co)
        for gname, w in wt(good[i]): o.vertex_groups[gname].add([v.index], w, 'REPLACE')
    print("AGIRLIK", o.name, len(bad), "köşe düzeltildi")

# ── ağırlıklar: en çok 4 etki, normalize ──
for o in bpy.data.objects:
    if o.type == 'MESH' and o.parent == rig and len(o.vertex_groups) > 1:
        for g in list(o.vertex_groups):
            if g.name not in BONES: o.vertex_groups.remove(g)
        activate(o)
        bpy.ops.object.vertex_group_limit_total(group_select_mode='BONE_DEFORM', limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)

# tutuş bilgisini iskelete yaz (animasyon betiği kullanır)
inv = (Hw @ rig.data.bones["RightHand"].matrix_local).inverted()
rig["grip_local"] = list((inv @ G)[:])
rig["blade_local"] = list(((inv.to_3x3()) @ Zs).normalized()[:])
rig["beta"] = math.degrees(beta)
for b in list(bpy.data.images):
    if b.users == 0: bpy.data.images.remove(b)
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("HAZIR", out, [o.name for o in bpy.data.objects])
