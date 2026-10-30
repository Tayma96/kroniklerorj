# Kuşam (yalnız Blender modelleme, yapay zekâ yok) — game_engine iskeleti:
# glTF dostu malzemeler, el kavrama pozu (3 eklemli parmaklar kabzayı sarar), Selçuklu/Türk kılıcı,
# konik miğfer + burun siperi + zincir boyunluk, tuniğin üstüne pul (lamel) zırh, kemer, eldiven yakası.
# Ağırlıklar: sert eşyalar kemiğe %100, giyilenler gövde/tunikten aktarılır. Kabza çerçeveleri iskelete yazılır.
# Kullanım: blender -b base.blend --python equip.py -- out.blend '{"tex": "<doku klasörü>"}'
import bpy, bmesh, sys, os, math, json
import numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
cfg = json.loads(argv[1]) if len(argv) > 1 else {}
TEX = cfg["tex"]
bpy.context.preferences.filepaths.save_version = 0
rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
body = bpy.data.objects[rig.name.replace('.rig', '')]
BN, PB = rig.data.bones, rig.pose.bones
D2R = math.pi / 180

def activate(o):
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
def find(key): return [o for o in bpy.data.objects if o.type == 'MESH' and key in o.name][0]
def upd(): bpy.context.view_layer.update()

# ───────────────────────── malzemeler ─────────────────────────
def img(name, cs='sRGB'):
    im = bpy.data.images.load(os.path.join(TEX, name), check_existing=True); im.colorspace_settings.name = cs; return im
def mat(name, tex=None, color=None, rough=0.6, metal=0.0, normal=None, nstr=1.0, alpha=False, spec=0.4, double=False):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); b = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(b.outputs['BSDF'], o.inputs['Surface'])
    b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    b.inputs['Specular IOR Level'].default_value = spec
    if color: b.inputs['Base Color'].default_value = (*color, 1)
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = img(tex)
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if alpha: nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
    if normal:
        n = nt.nodes.new('ShaderNodeTexImage'); n.image = img(normal, 'Non-Color')
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nstr
        nt.links.new(n.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    m.blend_method = 'BLEND' if alpha else 'OPAQUE'
    if hasattr(m, 'surface_render_method'): m.surface_render_method = 'BLENDED' if alpha else 'DITHERED'
    m.use_backface_culling = not (alpha or double); m.show_transparent_back = False
    return m
def setmat(o, m):
    o.data.materials.clear(); o.data.materials.append(m)
    for p in o.data.polygons: p.material_index = 0
def lin(c): return tuple((x / 255) ** 2.2 for x in c)

setmat(body, mat("Ten", "ten.jpg", rough=0.58, spec=0.35))
for o in list(bpy.data.objects):
    if o.type != 'MESH' or o == body: continue
    n = o.name
    if 'eyebrow' in n: setmat(o, mat("Kas", "kas.png", rough=0.8, alpha=True))
    elif 'eyelash' in n: setmat(o, mat("Kirpik", "kirpik.png", rough=0.8, alpha=True))
    elif 'high-poly' in n or 'low-poly' in n: setmat(o, mat("Goz", "goz.jpg", rough=0.12, spec=0.6))
    elif 'tunic' in n: setmat(o, mat("Gomlek", "gomlek.jpg", rough=0.92, spec=0.2))
    elif 'pants' in n: setmat(o, mat("Salvar", "salvar.jpg", rough=0.92, spec=0.2))
    elif 'boots' in n: setmat(o, mat("Cizme", "cizme.jpg", rough=0.62, normal="cizme_n.jpg", spec=0.35))
TUNIC = find('tunic')

# ───────────────────────── el kavrama pozu ─────────────────────────
FING = ("index", "middle", "ring", "pinky")
CURL = cfg.get("curl", {"index": [44, 62, 38], "middle": [50, 66, 38], "ring": [54, 66, 38], "pinky": [60, 64, 36]})
def palm(s):
    H = BN['hand_' + s].head_local
    K = BN['index_01_' + s].head_local - BN['pinky_01_' + s].head_local
    F = BN['middle_01_' + s].head_local - H
    N = (K.cross(F) if s == 'r' else F.cross(K)).normalized()
    return H, F.normalized(), K.normalized(), N
def rot_world(pb, axis_w, ang):
    M = pb.matrix.to_3x3(); la = (M.inverted() @ axis_w).normalized()
    pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion(la, ang); upd()
def circle_fit(P, nrm):
    # düzlemde en küçük kareler çemberi
    c0 = sum(P, Vector()) / len(P); u = (P[0] - c0); u = (u - nrm * u.dot(nrm)).normalized(); v = nrm.cross(u)
    A = np.array([[2 * (p - c0).dot(u), 2 * (p - c0).dot(v), 1.0] for p in P]); b = np.array([(p - c0).dot(u) ** 2 + (p - c0).dot(v) ** 2 for p in P])
    x, *_ = np.linalg.lstsq(A, b, rcond=None)
    c = c0 + u * x[0] + v * x[1]; r = math.sqrt(max(x[2] + x[0] ** 2 + x[1] ** 2, 0)); return c, r
GRIP = {}
for pb in PB: pb.rotation_mode = 'QUATERNION'
for s in ('r', 'l'):
    H, F, K, N = palm(s)
    centers = []; rads = []
    RHO = cfg.get("kavrama_r", 0.0265)                       # parmak ekseni ile kabza ekseni arası hedef
    for f in FING:
        names = ['%s_%02d_%s' % (f, j + 1, s) for j in range(3)]
        def curl_with(k):
            for nm_ in names: PB[nm_].rotation_quaternion = (1, 0, 0, 0)
            upd()
            for nm_, a in zip(names, CURL[f]):
                pb = PB[nm_]; d = (pb.tail - pb.head).normalized()
                rot_world(pb, d.cross(N).normalized(), a * k * D2R)
            P = [PB[names[0]].head.copy(), PB[names[1]].head.copy(), PB[names[2]].head.copy(), PB[names[2]].tail.copy()]
            ax = (P[1] - P[0]).cross(P[2] - P[1]).normalized()
            return circle_fit(P, ax)
        lo, hi = 0.5, 2.2
        for _ in range(14):
            k = (lo + hi) / 2; c, r = curl_with(k)
            if r > RHO: lo = k
            else: hi = k
        c, r = curl_with((lo + hi) / 2); centers.append(c); rads.append(r)
        print("PARMAK", s, f, "kat %.2f" % ((lo + hi) / 2), "acilar", [round(a * (lo + hi) / 2) for a in CURL[f]], "r %.4f" % r)
    C = np.array([list(c) for c in centers]); cm = C.mean(0)
    _, _, vt = np.linalg.svd(C - cm); A = Vector(vt[0]).normalized()
    if A.dot(centers[0] - centers[-1]) < 0: A = -A          # serçeden işaret parmağına: başparmak/namlu yönü
    cmv = Vector(cm)
    # kabza merkezi: orta parmak çemberinin ekseni üstündeki izdüşümü
    G = cmv + A * A.dot((centers[1] + centers[2]) / 2 - cmv)
    dist = [((p - G) - A * A.dot(p - G)).length for f in FING for p in (PB['%s_02_%s' % (f, s)].head, PB['%s_03_%s' % (f, s)].head)]
    # başparmak: işaret parmağının orta boğumunun üstüne kapanır
    t1, t3 = PB['thumb_01_' + s], PB['thumb_03_' + s]
    tgt = PB['index_02_' + s].head + PB['index_02_' + s].matrix.to_3x3() @ Vector((0, 0, 0)) + (PB['index_02_' + s].head - G - A * A.dot(PB['index_02_' + s].head - G)).normalized() * 0.012 + A * 0.006
    for it in range(3):
        vnow = t3.tail - t1.head; vt_ = tgt - t1.head
        q = vnow.rotation_difference(vt_)
        t1.matrix = Matrix.Translation(t1.head) @ (q.to_matrix() @ t1.matrix.to_3x3()).to_4x4(); upd()
        for nm_, a in (('thumb_02_', 12), ('thumb_03_', 18)):
            pb = PB[nm_ + s]; d = (pb.tail - pb.head).normalized()
            ax = d.cross((G - pb.head) - A * A.dot(G - pb.head)).normalized()
            if it == 0: rot_world(pb, ax, a * D2R)
    hm = PB['hand_' + s].matrix; inv = hm.inverted()
    E = (F - A * F.dot(A)).normalized()                      # ağız: parmak eklemlerine doğru
    GRIP[s] = {"c": list(inv @ G), "a": list((inv.to_3x3() @ A).normalized()), "e": list((inv.to_3x3() @ E).normalized()),
               "r_in": round(float(min(dist)), 4), "r_mean": round(float(np.mean(dist)), 4), "fit_r": [round(x, 4) for x in rads]}
    print("KAVRAMA", s, "eksen", tuple(round(x, 3) for x in A), "parmak-eksen mesafe min %.4f ort %.4f" % (min(dist), np.mean(dist)), "cember", GRIP[s]["fit_r"])
FINGER_Q = {pb.name: list(pb.rotation_quaternion) for pb in PB if pb.name.startswith(("thumb_", "index_", "middle_", "ring_", "pinky_"))}
rig["parmak"] = json.dumps(FINGER_Q); rig["kavrama"] = json.dumps(GRIP)

# kemik dünyası (kavrama pozunda) — kılıç sağ ele bağlanır
def skin_to(obj, groups):
    obj.parent = rig; obj.matrix_parent_inverse = rig.matrix_world.inverted()
    for g, idx_w in groups.items():
        vg = obj.vertex_groups.get(g) or obj.vertex_groups.new(name=g)
        for i, w in idx_w: vg.add([i], w, 'REPLACE')
    md = obj.modifiers.new("Armature", 'ARMATURE'); md.object = rig
def skin_all(obj, bone):
    skin_to(obj, {bone: [(i, 1.0) for i in range(len(obj.data.vertices))]})
def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); return o
def join(objs, name):
    activate(objs[0])
    for o in objs: o.select_set(True)
    bpy.ops.object.join(); o = bpy.context.object; o.name = name; o.data.name = name; return o

# ───────────────────────── kılıç ─────────────────────────
SEP = cfg.get("sep", 0.088)                   # iki el merkezi arası (sol el kabzanın altında)
def make_sword():
    L, W0, W1, TH = cfg.get("blade", 0.78), cfg.get("w0", 0.041), cfg.get("w1", 0.034), cfg.get("th", 0.0065)
    ZG = 0.052                                # balçak (sağ el merkezinin 5 cm üstü)
    CURV = cfg.get("curv", 0.040)             # namlu sırtına doğru eğrilik (uçta)
    NS = 22; bm = bmesh.new(); uvs = []
    secs = []
    for i in range(NS + 1):
        t = i / NS; z = ZG + 0.012 + t * L
        if t < 0.82: w = W0 + (W1 - W0) * t / 0.82
        else: w = W1 * max(1 - ((t - 0.82) / 0.18) ** 1.25, 0.0)
        c = -CURV * t * t; th = TH * (1 - 0.55 * t)
        if i == NS:
            v = bm.verts.new((c - 0.004, 0, z)); secs.append([v] * 7); continue
        e = c + w * 0.5; sp = c - w * 0.5; bv = e - min(w * 0.42, 0.012)
        # ağız, ağız şevi, oluk, sırt (iki yüz)
        pts = [(e, 0), (bv, th * 0.42), (c - w * 0.12, th * 0.5), (sp, th * 0.5), (sp, -th * 0.5), (c - w * 0.12, -th * 0.5), (bv, -th * 0.42)]
        secs.append([bm.verts.new((x, y, z)) for x, y in pts])
    for i in range(NS):
        a, b = secs[i], secs[i + 1]
        for j in range(7):
            k = (j + 1) % 7; q = []
            for v in (a[j], a[k], b[k], b[j]):
                if v not in q: q.append(v)
            if len(q) >= 3:
                try: bm.faces.new(q)
                except ValueError: pass
    bm.faces.new(secs[0][::-1])
    blade = new_obj("Namlu", bm)
    # balçak: kılıç ağzı yönünde (±X) uzanan, uçları namluya doğru kıvrık, top uçlu
    bm = bmesh.new(); NQ = 9; ring = 8; rings = []
    for i in range(-NQ, NQ + 1):
        t = i / NQ; x = 0.078 * t; z = ZG + 0.010 * abs(t) ** 2.2
        r = 0.0075 * (1 - 0.35 * abs(t)) + 0.004 * max(abs(t) - 0.85, 0) / 0.15
        rr = [bm.verts.new((x, r * math.cos(2 * math.pi * k / ring) * 0.9, z + r * math.sin(2 * math.pi * k / ring))) for k in range(ring)]
        rings.append(rr)
    for i in range(len(rings) - 1):
        for k in range(ring):
            bm.faces.new([rings[i][k], rings[i][(k + 1) % ring], rings[i + 1][(k + 1) % ring], rings[i + 1][k]])
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    # balçak dilcikleri (namlu ve kabza üzerinde küçük dil)
    for zc, hgt in ((ZG + 0.022, 0.026), (ZG - 0.018, 0.022)):
        bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation((0.0, 0, zc)) @ Matrix.Diagonal((0.022, 0.012, hgt, 1)))
    guard = new_obj("Balcak", bm)
    # kabza: oval, sargı dokulu (UV: çevre × boy)
    bm = bmesh.new(); z0, z1 = -SEP - 0.047, ZG - 0.006; NSG = 12; NR = 7; rows = []
    uv = bm.loops.layers.uv.new("UVMap")
    for i in range(NR + 1):
        t = i / NR; z = z0 + (z1 - z0) * t
        sw = 1.0 + 0.06 * math.sin(math.pi * t)
        rows.append([bm.verts.new((0.0155 * sw * math.cos(2 * math.pi * k / NSG), 0.0125 * sw * math.sin(2 * math.pi * k / NSG), z)) for k in range(NSG)])
    for i in range(NR):
        for k in range(NSG):
            f = bm.faces.new([rows[i][k], rows[i][(k + 1) % NSG], rows[i + 1][(k + 1) % NSG], rows[i + 1][k]])
            for lp, (uu, vv) in zip(f.loops, ((k, i), (k + 1, i), (k + 1, i + 1), (k, i + 1))):
                lp[uv].uv = (uu / NSG * 2, vv / NR * 3)
    grip = new_obj("Kabza", bm)
    # topuz (kabza başlığı): kısa kesik koni + kubbe
    bm = bmesh.new(); prof = [(0.0172, z0 + 0.004), (0.0185, z0 - 0.004), (0.0165, z0 - 0.016), (0.011, z0 - 0.024), (0.0, z0 - 0.027)]
    rr = []
    for r, z in prof:
        rr.append([bm.verts.new((r * math.cos(2 * math.pi * k / 12) * 1.05, r * math.sin(2 * math.pi * k / 12) * 0.9, z)) for k in range(12)])
    for i in range(len(rr) - 1):
        for k in range(12):
            q = [rr[i][k], rr[i][(k + 1) % 12], rr[i + 1][(k + 1) % 12], rr[i + 1][k]]
            if prof[i + 1][0] == 0.0: q = [rr[i][k], rr[i][(k + 1) % 12], rr[i + 1][0]]
            try: bm.faces.new(q)
            except ValueError: pass
    bm.faces.new(rr[0][::-1])
    pom = new_obj("Topuz", bm)
    steel = mat("Celik", color=lin((168, 170, 172)), rough=0.28, metal=1.0, spec=0.5)
    iron = mat("KilicDemir", color=lin((78, 76, 72)), rough=0.45, metal=1.0, normal="demir_n.jpg", nstr=0.5)
    wrap = mat("Sargi", "kabza.jpg", rough=0.7, normal="kabza_n.jpg", nstr=0.8, spec=0.3)
    setmat(blade, steel); setmat(guard, iron); setmat(grip, wrap); setmat(pom, iron)
    for o in (blade, guard, pom):
        for p in o.data.polygons: p.use_smooth = True
    o = join([blade, guard, grip, pom], "Kilic")
    return o
sw = make_sword()
hm = PB['hand_r'].matrix
g = GRIP['r']; c = hm @ Vector(g["c"]); Az = (hm.to_3x3() @ Vector(g["a"])).normalized(); Ex = (hm.to_3x3() @ Vector(g["e"])).normalized()
Ex = (Ex - Az * Ex.dot(Az)).normalized(); Ey = Az.cross(Ex)
sw.data.transform(Matrix.Translation(c) @ Matrix((Ex, Ey, Az)).transposed().to_4x4()); sw.matrix_world = Matrix.Identity(4)
skin_all(sw, "hand_r")
rig["sep"] = SEP
print("KILIC ucgen", tris(sw))

# ───────────────────────── baş ölçüleri ─────────────────────────
gi = {g.index: g.name for g in body.vertex_groups}
def wof(v, name): return sum(g.weight for g in v.groups if gi.get(g.group) == name)
HEADV = [body.matrix_world @ v.co for v in body.data.vertices if wof(v, 'head') > 0.5]
brow = find('eyebrow'); BZ = max((brow.matrix_world @ v.co).z for v in brow.data.vertices)
eyes = find('high-poly'); EZ = sum((eyes.matrix_world @ v.co).z for v in eyes.data.vertices) / len(eyes.data.vertices)
hb = BN['head']; HUP = (hb.tail_local - hb.head_local).normalized()

# ───────────────────────── pul zırh (tunikten kabuk) ─────────────────────────
tg = {g.index: g.name for g in TUNIC.vertex_groups}
def tw(v, pre): return sum(g.weight for g in v.groups if tg.get(g.group, "").startswith(pre))
NECKZ = BN['neck_01'].head_local.z
ZLOW = cfg.get("zirh_alt", BN['thigh_l'].head_local.z - 0.27)
keep = set()
for v in TUNIC.data.vertices:
    p = TUNIC.matrix_world @ v.co
    arm = tw(v, ("upperarm", "lowerarm", "hand"))
    if arm < cfg.get("kol_esik", 0.22) and p.z > ZLOW and p.z < NECKZ - 0.035 and tw(v, "neck") < 0.1: keep.add(v.index)
bm = bmesh.new(); bm.from_mesh(TUNIC.data); bm.verts.ensure_lookup_table()
bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(v.index in keep for v in f.verts)], context='FACES')
bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
bm.normal_update()
OFF = cfg.get("zirh_aci", 0.013)
for v in bm.verts: v.co += v.normal * OFF
for it in range(4):  # kenar dışı yumuşatma
    new = {}
    for v in bm.verts:
        if v.is_boundary: continue
        nbv = [e.other_vert(v).co for e in v.link_edges]
        new[v] = v.co * 0.5 + sum(nbv, Vector()) / len(nbv) * 0.5
    for v, co in new.items(): v.co = co
arm_o = new_obj("Zirh", bm)
arm_o.matrix_world = TUNIC.matrix_world.copy()
# gövde/tunik dışına it (≥ 9 mm)
dg = bpy.context.evaluated_depsgraph_get()
def push_out(o, others, gap, iters=2):
    trees = [BVHTree.FromObject(x, dg) for x in others]
    moved = 0
    for _ in range(iters):
        for v in o.data.vertices:
            p = o.matrix_world @ v.co
            for t in trees:
                loc, nor, idx, d = t.find_nearest(p)
                if loc is None: continue
                s = (p - loc).dot(nor)
                if s < gap and d < 0.08:
                    p = loc + nor * gap; moved += 1
            v.co = o.matrix_world.inverted() @ p
    return moved
print("ZIRH itildi", push_out(arm_o, [TUNIC], 0.009))
# silindirik UV: lamel döşemesi (10 lamel/döşeme, ~2.3 cm lamel, 4 sıra/döşeme ~6 cm)
me = arm_o.data
while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
uvl = me.uv_layers[0] if me.uv_layers else me.uv_layers.new(name="UVMap")
uvl.name = "UVMap"; me.uv_layers.active = uvl
YC = sum((arm_o.matrix_world @ v.co).y for v in me.vertices) / len(me.vertices)
UREP = cfg.get("zirh_u", 4.0); VH = cfg.get("zirh_v", 0.24)
for p in me.polygons:
    us = []
    for li in p.loop_indices:
        co = arm_o.matrix_world @ me.vertices[me.loops[li].vertex_index].co
        u = (math.atan2(co.x, -(co.y - YC)) / (2 * math.pi) + 0.5) * UREP
        us.append([li, u, (co.z - ZLOW) / VH])
    if max(x[1] for x in us) - min(x[1] for x in us) > UREP / 2:
        for x in us:
            if x[1] < UREP / 2: x[1] += UREP
    for li, u, v in us: uvl.data[li].uv = (u, -v)
for p in me.polygons: p.use_smooth = True
# kenar kalınlığı (yalnız kenar şeridi) — çift yüzlü malzeme
activate(arm_o)
so = arm_o.modifiers.new("kal", 'SOLIDIFY'); so.thickness = 0.006; so.offset = -1.0; so.use_rim = True; so.use_rim_only = True
bpy.ops.object.modifier_apply(modifier="kal")
if tris(arm_o) > cfg.get("zirh_ucgen", 3900):
    md = arm_o.modifiers.new("s", 'DECIMATE'); md.ratio = cfg.get("zirh_ucgen", 3900) / tris(arm_o); bpy.ops.object.modifier_apply(modifier="s")
setmat(arm_o, mat("Pul", "pul.jpg", rough=0.5, metal=0.85, normal="pul_n.jpg", nstr=1.0, spec=0.5, double=True))
print("ZIRH ucgen", tris(arm_o))

def transfer_weights(dst, src):
    activate(dst)
    md = dst.modifiers.new("dt", 'DATA_TRANSFER'); md.object = src; md.use_vert_data = True
    md.data_types_verts = {'VGROUP_WEIGHTS'}; md.vert_mapping = 'POLYINTERP_NEAREST'
    md.layers_vgroup_select_src = 'ALL'; md.layers_vgroup_select_dst = 'NAME'
    bpy.ops.object.datalayout_transfer(modifier="dt")
    bpy.ops.object.modifier_apply(modifier="dt")
    dst.parent = rig; dst.matrix_parent_inverse = rig.matrix_world.inverted()
    a = dst.modifiers.new("Armature", 'ARMATURE'); a.object = rig
transfer_weights(arm_o, TUNIC)

# ───────────────────────── kemer ─────────────────────────
def ring_on(o_tree, zc, n, gap, center):
    pts = []
    for k in range(n):
        th = 2 * math.pi * k / n; d = Vector((math.sin(th), -math.cos(th), 0))
        org = Vector((center.x, center.y, zc)) + d * 0.6
        loc, nor, idx, dd = o_tree.ray_cast(org, -d, 0.6)
        pts.append((loc if loc is not None else org - d * 0.45) + d * gap)
    return pts
dg = bpy.context.evaluated_depsgraph_get()
AT = BVHTree.FromObject(arm_o, dg)
ZB = cfg.get("kemer_z", BN['spine_01'].head_local.z - 0.005)
cen = Vector((0, YC, 0)); bm = bmesh.new(); NB = 32
rows = [[bm.verts.new(p) for p in ring_on(AT, z, NB, 0.006, cen)] for z in (ZB - 0.024, ZB + 0.024)]
for k in range(NB): bm.faces.new([rows[0][k], rows[0][(k + 1) % NB], rows[1][(k + 1) % NB], rows[1][k]])
belt = new_obj("Kemer", bm)
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(rows and (0, 0, 0)) @ Matrix.Diagonal((1, 1, 1, 1)))
buckle = new_obj("Toka", bm)
fp = min(belt.data.vertices, key=lambda v: v.co.y).co
buckle.data.transform(Matrix.Translation((0, fp.y - 0.004, ZB)) @ Matrix.Diagonal((0.05, 0.008, 0.056, 1)))
setmat(belt, mat("Kemer", color=lin((52, 36, 26)), rough=0.6, normal="kabza_n.jpg", nstr=0.3, spec=0.3, double=True))
setmat(buckle, mat("KilicDemir"))
belt = join([belt, buckle], "Kemer")
transfer_weights(belt, TUNIC)

# ───────────────────────── eldiven yakası ─────────────────────────
cuffs = []
dg = bpy.context.evaluated_depsgraph_get()
CT = [BVHTree.FromObject(TUNIC, dg), BVHTree.FromObject(body, dg)]
for s in ('l', 'r'):
    W = BN['hand_' + s].head_local.copy(); la = BN['lowerarm_' + s]
    d = (la.head_local - la.tail_local).normalized()          # dirseğe doğru
    u0 = d.orthogonal().normalized(); u1 = d.cross(u0)
    bm = bmesh.new(); NC = 14; rings = []
    for t, extra in ((-0.012, 0.004), (0.040, 0.010), (0.080, 0.018)):
        Pc = W + d * t; ring = []
        for k in range(NC):
            th = 2 * math.pi * k / NC; dirv = u0 * math.cos(th) + u1 * math.sin(th)
            best = 0.028
            for tr in CT:
                loc, nor, idx, dd = tr.ray_cast(Pc + dirv * 0.12, -dirv, 0.12)
                if loc is not None: best = max(best, (loc - Pc).dot(dirv))
            ring.append(bm.verts.new(Pc + dirv * (best + extra)))
        rings.append(ring)
    for i in range(2):
        for k in range(NC):
            bm.faces.new([rings[i][k], rings[i][(k + 1) % NC], rings[i + 1][(k + 1) % NC], rings[i + 1][k]])
    o = new_obj("Eldiven_" + s, bm)
    for p in o.data.polygons: p.use_smooth = True
    skin_to(o, {"hand_" + s: [(i, 0.5) for i in range(NC)], "lowerarm_" + s: [(i, 0.5) for i in range(NC)] + [(i, 1.0) for i in range(NC, 3 * NC)]})
    cuffs.append(o)
for o in cuffs:
    activate(o); so = o.modifiers.new("kal", 'SOLIDIFY'); so.thickness = 0.004; so.offset = -1; so.use_rim_only = True; so.use_rim = True
    while o.modifiers[0] != so: bpy.ops.object.modifier_move_up(modifier="kal")
    bpy.ops.object.modifier_apply(modifier="kal")
    setmat(o, mat("Eldiven", color=lin((60, 44, 32)), rough=0.62, normal="kabza_n.jpg", nstr=0.4, spec=0.3, double=True))
print("ELDIVEN ucgen", sum(tris(o) for o in cuffs))

# ───────────────────────── miğfer ─────────────────────────
# baş ekseni çerçevesi: Z = baş yukarı, -Y = ön
Zh = HUP; Yh = Vector((0, 1, 0)); Yh = (Yh - Zh * Yh.dot(Zh)).normalized(); Xh = Yh.cross(Zh)
TILT = cfg.get("migfer_egim", 11.0) * D2R                       # arka kenar aşağıda
Rt = Matrix.Rotation(-TILT, 3, Xh)
Zr = (Rt @ Zh).normalized(); Yr = (Rt @ Yh).normalized(); Xr = Yr.cross(Zr)
front = min(HEADV, key=lambda p: p.y)
RZ = BZ + cfg.get("migfer_kas", 0.016)                          # ön kenar kaşın 1.6 cm üstü
O = Vector((0, sum(p.y for p in HEADV) / len(HEADV) + cfg.get("migfer_y", 0.004), RZ))
Mh = Matrix((Xr, Yr, Zr)).transposed()                          # yerel->dünya
def to_loc(p): return Mh.transposed() @ (p - O)
loc = [to_loc(p) for p in HEADV]
band = [q for q in loc if abs(q.z) < 0.012]
ax_ = max(abs(q.x) for q in band) + 0.008; ay_ = max(abs(q.y) for q in band) + 0.009
PROF = [(1.0, 0.0), (0.995, 0.03), (0.965, 0.06), (0.90, 0.095), (0.80, 0.13), (0.66, 0.165), (0.50, 0.195), (0.34, 0.222), (0.21, 0.245), (0.12, 0.264), (0.075, 0.28), (0.062, 0.30), (0.09, 0.307), (0.06, 0.318), (0.0, 0.324)]
HS = cfg.get("migfer_boy", 1.0)
def prof_r(z):
    for i in range(len(PROF) - 1):
        if PROF[i][1] <= z <= PROF[i + 1][1]:
            u = (z - PROF[i][1]) / (PROF[i + 1][1] - PROF[i][1]); return PROF[i][0] * (1 - u) + PROF[i + 1][0] * u
    return 0.0
sc = 1.0
for it in range(30):
    bad = 0
    for q in loc:
        if q.z <= 0: continue
        rr = math.sqrt((q.x / (ax_ * sc)) ** 2 + (q.y / (ay_ * sc)) ** 2)
        if rr > prof_r(q.z / HS) - 0.035: bad += 1
    if bad == 0: break
    HS *= 1.02; sc *= 1.01
print("MIGFER rim yaricap %.3f x %.3f, boy olcegi %.2f, genislik %.2f, tasma %d" % (ax_, ay_, HS, sc, bad))
bm = bmesh.new(); SEG = 32; rings = []
uvh = bm.loops.layers.uv.new("UVMap")
for r, z in PROF:
    rings.append([bm.verts.new(O + Mh @ Vector((r * ax_ * sc * math.sin(2 * math.pi * k / SEG), -r * ay_ * sc * math.cos(2 * math.pi * k / SEG), z * HS))) for k in range(SEG)])
for i in range(len(rings) - 1):
    for k in range(SEG):
        q = [rings[i][k], rings[i][(k + 1) % SEG], rings[i + 1][(k + 1) % SEG], rings[i + 1][k]]
        if PROF[i + 1][0] == 0.0: q = [rings[i][k], rings[i][(k + 1) % SEG], rings[i + 1][k]]
        try:
            f = bm.faces.new(q)
            for lp, (uu, vv) in zip(f.loops, ((k, i), (k + 1, i), (k + 1, i + 1), (k, i + 1))): lp[uvh].uv = (uu / SEG * 3, vv / len(PROF) * 2)
        except ValueError: pass
bowl = new_obj("Kubbe", bm)
activate(bowl); so = bowl.modifiers.new("kal", 'SOLIDIFY'); so.thickness = 0.004; so.offset = -1; so.use_rim = True; so.use_rim_only = True
bpy.ops.object.modifier_apply(modifier="kal")
# alın bandı (bronz): kubbe tabanında hafif dışa taşan şerit
bm = bmesh.new(); rr2 = []
for r, z in ((1.035, -0.002), (1.04, 0.012), (1.03, 0.026)):
    rr2.append([bm.verts.new(O + Mh @ Vector((r * ax_ * sc * math.sin(2 * math.pi * k / SEG), -r * ay_ * sc * math.cos(2 * math.pi * k / SEG), z * HS))) for k in range(SEG)])
for i in range(2):
    for k in range(SEG): bm.faces.new([rr2[i][k], rr2[i][(k + 1) % SEG], rr2[i + 1][(k + 1) % SEG], rr2[i + 1][k]])
bandobj = new_obj("Bant", bm)
# burun siperi: yüz profilini 1 cm önden izleyen sivrilen şerit
prof_face = sorted([p for p in HEADV if abs(p.x) < 0.012], key=lambda p: p.z)
def face_y(z):
    near = [p.y for p in prof_face if abs(p.z - z) < 0.006]
    return min(near) if near else front.y
bm = bmesh.new(); prow = []
NZ = 7; Lnas = cfg.get("burun_boy", 0.085)
for i in range(NZ + 1):
    t = i / NZ; z = RZ + 0.03 - t * (Lnas + 0.03); w = 0.013 * (1 - 0.35 * t) + (0.006 if t > 0.9 else 0)
    y = min(face_y(z), O.y - ay_ * sc + 0.004) - 0.011 - 0.002 * t
    prow.append([bm.verts.new((-w, y, z)), bm.verts.new((0, y - 0.003, z)), bm.verts.new((w, y, z))])
for i in range(NZ):
    for k in range(2): bm.faces.new([prow[i][k], prow[i][k + 1], prow[i + 1][k + 1], prow[i + 1][k]])
nas = new_obj("Burun", bm)
activate(nas); so = nas.modifiers.new("kal", 'SOLIDIFY'); so.thickness = 0.003; so.offset = 1; bpy.ops.object.modifier_apply(modifier="kal")
ironh = mat("Migfer", color=lin((96, 96, 98)), rough=0.38, metal=1.0, normal="demir_n.jpg", nstr=0.7, spec=0.5, double=True)
bronze = mat("Bronz", color=lin((120, 92, 58)), rough=0.42, metal=1.0, normal="demir_n.jpg", nstr=0.5, spec=0.5)
setmat(bowl, ironh); setmat(nas, ironh); setmat(bandobj, bronze)
for o in (bowl, bandobj, nas):
    for p in o.data.polygons: p.use_smooth = True
helm = join([bowl, bandobj, nas], "Migfer")
skin_all(helm, "head")
print("MIGFER ucgen", tris(helm))

# zincir boyunluk: kenardan omuzlara; yüz açıklığı ±64°
dg = bpy.context.evaluated_depsgraph_get()
OB = [body, TUNIC, arm_o]
AV0 = cfg.get("boyunluk_aci", 64) * D2R; NA, NRW = 26, 7
bm = bmesh.new(); grid = []; uva = bm.loops.layers.uv.new("UVMap")
for i in range(NRW + 1):
    s_ = i / NRW; row = []
    for k in range(NA + 1):
        ph = AV0 + (2 * math.pi - 2 * AV0) * k / NA
        back = 0.5 - 0.5 * math.cos(ph)                      # 0 yanak, 1 ense
        drop = (0.10 + 0.11 * back) * s_
        flare = 1.0 + (0.20 + 0.30 * back) * s_ ** 1.3
        r0x, r0y = ax_ * sc * 1.0, ay_ * sc * 1.0
        q = Vector((r0x * flare * math.sin(ph), -r0y * flare * math.cos(ph), 0.006 - drop))
        row.append(bm.verts.new(O + Mh @ q))
    grid.append(row)
for i in range(NRW):
    for k in range(NA):
        f = bm.faces.new([grid[i][k], grid[i][k + 1], grid[i + 1][k + 1], grid[i + 1][k]])
        for lp, (uu, vv) in zip(f.loops, ((k, i), (k + 1, i), (k + 1, i + 1), (k, i + 1))): lp[uva].uv = (uu / NA * 7, -vv / NRW * 2)
av = new_obj("Boyunluk", bm)
for _ in range(2):
    push_out(av, OB, 0.012, 1)
    # dikey yumuşatma (üst sıra sabit)
    me = av.data; co = [v.co.copy() for v in me.vertices]; W_ = NA + 1
    for i in range(1, NRW + 1):
        for k in range(W_):
            j = i * W_ + k; nb_ = [co[(i - 1) * W_ + k]] + ([co[(i + 1) * W_ + k]] if i < NRW else []) + ([co[j - 1]] if k > 0 else []) + ([co[j + 1]] if k < NA else [])
            me.vertices[j].co = co[j] * 0.5 + sum(nb_, Vector()) / len(nb_) * 0.5
push_out(av, OB, 0.012, 2)
for p in av.data.polygons: p.use_smooth = True
setmat(av, mat("Zincir", "zincir.jpg", rough=0.45, metal=0.9, normal="zincir_n.jpg", nstr=1.0, spec=0.5, double=True))
# ağırlık: üst sıra baş, alt sıralar boyun → tunik ağırlıklarına geçer
transfer_weights(av, TUNIC)
vgs = {g.name: g for g in av.vertex_groups}
for g in ("head", "neck_01"):
    if g not in vgs: vgs[g] = av.vertex_groups.new(name=g)
W_ = NA + 1
for v in av.data.vertices:
    i = v.index // W_; s_ = i / NRW
    wh = (1 - s_) ** 2; wn = 2 * s_ * (1 - s_) * 0.8; wt = 1 - wh - wn
    for g in av.vertex_groups:
        if g.name in ("head", "neck_01"): continue
        try: w = g.weight(v.index)
        except RuntimeError: continue
        g.add([v.index], w * wt, 'REPLACE')
    vgs["head"].add([v.index], wh, 'REPLACE'); vgs["neck_01"].add([v.index], wn, 'REPLACE')
print("BOYUNLUK ucgen", tris(av))

# ── ağırlıklar: en çok 4 etki, normalize; kemik olmayan grupları sil ──
BONES = {b.name for b in BN}
for o in bpy.data.objects:
    if o.type == 'MESH' and o.parent == rig and len(o.vertex_groups) > 1:
        for g in list(o.vertex_groups):
            if g.name not in BONES: o.vertex_groups.remove(g)
        activate(o)
        bpy.ops.object.vertex_group_clean(group_select_mode='ALL', limit=0.01)
        bpy.ops.object.vertex_group_limit_total(group_select_mode='BONE_DEFORM', limit=4)
        bpy.ops.object.vertex_group_normalize_all(group_select_mode='BONE_DEFORM', lock_active=False)
# parmak pozunu sıfırla (canlandırma betiği kavramayı yeniden uygular)
for pb in PB: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
for o in bpy.data.objects:
    if o.type == 'MESH': print("UCGEN", o.name, tris(o))
print("TOPLAM", sum(tris(o) for o in bpy.data.objects if o.type == 'MESH'))
for b in list(bpy.data.images):
    if b.users == 0: bpy.data.images.remove(b)
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("HAZIR", OUT)
