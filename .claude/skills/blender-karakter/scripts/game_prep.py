# Gerçek zamanlı (glTF) için gövde hazırlığı — game_engine iskeleti.
# Ağız içi ağları siler, şekil anahtarlarını/maskeleri uygular, giysi altında kalan gövde
# yüzlerini siler (ışın testi + 1 halka pay), giysileri seyreltir, eldiven bölgesinin UV
# çokgenlerini doku betiğine (doku.py) JSON olarak yazar.
# Kullanım: blender -b char.blend --python game_prep.py -- out.blend '{"uv":"eldiven_uv.json"}'
import bpy, sys, json, math
from mathutils.bvhtree import BVHTree
argv = sys.argv[sys.argv.index('--') + 1:]
OUT = argv[0]
cfg = json.loads(argv[1]) if len(argv) > 1 else {}
bpy.context.preferences.filepaths.save_version = 0
rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
body = bpy.data.objects[rig.name.replace('.rig', '')]

def activate(o):
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o

def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)

for o in list(bpy.data.objects):
    if o.type == 'MESH' and any(k in o.name for k in ('teeth', 'tongue')):
        bpy.data.objects.remove(o, do_unlink=True)

# gövde: şekil anahtarlarını karışımla göm, maskeleri uygula
activate(body)
if body.data.shape_keys:
    body.shape_key_add(name="mix", from_mix=True)
    for k in list(body.data.shape_keys.key_blocks)[:-1]:
        body.shape_key_remove(k)
    body.shape_key_remove(body.data.shape_keys.key_blocks[0])
for m in list(body.modifiers):
    if m.type == 'MASK':
        bpy.ops.object.modifier_apply(modifier=m.name)
print("GOVDE maskeden sonra", tris(body))

# giysi altında kalan gövde: köşe normali boyunca 6 cm içinde giysiye çarpıyorsa örtülü
cloth = [o for o in bpy.data.objects if o.type == 'MESH' and any(k in o.name for k in cfg.get("giysi", ("tunic", "pants", "boots")))]
dg = bpy.context.evaluated_depsgraph_get()
trees = [BVHTree.FromObject(o, dg) for o in cloth]
me = body.data; Mw = body.matrix_world; N3 = Mw.to_3x3()
cov = []
for v in me.vertices:
    co = Mw @ v.co; n = (N3 @ v.normal).normalized()
    hit = False
    for t in trees:
        loc, nor, idx, d = t.ray_cast(co + n * 0.0005, n, cfg.get("ray", 0.06))
        if loc is not None: hit = True; break
    cov.append(hit)
# 1 halka pay: komşularının hepsi örtülü olan köşe "derin"
nb = [set() for _ in me.vertices]
for e in me.edges:
    a, b = e.vertices; nb[a].add(b); nb[b].add(a)
deep = [cov[i] and all(cov[j] for j in nb[i]) for i in range(len(me.vertices))]
import bmesh
bm = bmesh.new(); bm.from_mesh(me)
bm.verts.ensure_lookup_table()
kill = [f for f in bm.faces if all(deep[v.index] for v in f.verts)]
bmesh.ops.delete(bm, geom=kill, context='FACES')
bm.to_mesh(me); bm.free(); me.update()
print("GOVDE ortulu silindi", len(kill), "yuz ->", tris(body))

# seyreltme (giysiler; isteğe bağlı gövde): modifier yığının başına koyup uygula
def decimate(o, ratio):
    if ratio >= 0.999: return
    activate(o)
    md = o.modifiers.new("seyrelt", 'DECIMATE'); md.ratio = ratio; md.use_collapse_triangulate = False
    while o.modifiers[0] != md:
        bpy.ops.object.modifier_move_up(modifier=md.name)
    t0 = tris(o)
    bpy.ops.object.modifier_apply(modifier=md.name)
    print("SEYRELT", o.name, t0, "->", tris(o))
for key, r in cfg.get("seyrelt", {"tunic": 0.55, "boots": 0.32, "pants": 0.8}).items():
    for o in bpy.data.objects:
        if o.type == 'MESH' and key in o.name: decimate(o, r)
# gövde: yüz korunur (ağırlık 0), kafatası/ense (miğfer altı) ve eller seyreltilir
gr = cfg.get("govde_hedef", 8600)
if tris(body) > gr:
    eyes = [o for o in bpy.data.objects if o.type == 'MESH' and ('high-poly' in o.name or 'low-poly' in o.name)]
    ev = [o.matrix_world @ v.co for o in eyes for v in o.data.vertices]
    ez = sum(p.z for p in ev) / len(ev); ey = min(p.y for p in ev)
    gi = {g.index: g.name for g in body.vertex_groups}
    vg = body.vertex_groups.new(name="seyrek")
    def smooth01(x): x = min(max(x, 0.0), 1.0); return x * x * (3 - 2 * x)
    for v in body.data.vertices:
        p = v.co; hand = sum(g.weight for g in v.groups if gi.get(g.group, "").startswith(("hand_", "thumb_", "index_", "middle_", "ring_", "pinky_")))
        # yüz maskesi: gözlerin önü, kaş üstü 4.5 cm ile çene arası, kulak dışı
        fz = smooth01((p.z - (ez - 0.15)) / 0.02) * smooth01(((ez + 0.05) - p.z) / 0.015)
        fy = smooth01(((ey + 0.045) - p.y) / 0.015)
        fx = smooth01((0.078 - abs(p.x)) / 0.012)
        face = fz * fy * fx
        w = 0.8 * min(hand, 1.0) + (1 - min(hand, 1.0)) * (1.0 - face)
        vg.add([v.index], w, 'REPLACE')
    activate(body)
    md = body.modifiers.new("seyrelt", 'DECIMATE'); md.vertex_group = "seyrek"; md.vertex_group_factor = cfg.get("yuz_koru", 20.0)
    md.ratio = gr / tris(body)
    while body.modifiers[0] != md: bpy.ops.object.modifier_move_up(modifier=md.name)
    t0 = tris(body); bpy.ops.object.modifier_apply(modifier=md.name)
    body.vertex_groups.remove(body.vertex_groups["seyrek"])
    print("SEYRELT govde", t0, "->", tris(body), "goz z %.3f y %.3f" % (ez, ey))

# eldiven bölgesi: el + parmak kemiklerine ağırlığı > 0.35 olan yüzlerin UV çokgenleri
HANDB = {b.name for b in rig.data.bones if b.name.startswith(("hand_", "thumb_", "index_", "middle_", "ring_", "pinky_"))}
gi = {g.index: g.name for g in body.vertex_groups}
def handw(v): return sum(g.weight for g in v.groups if gi.get(g.group) in HANDB)
hw = [handw(v) for v in me.vertices]
uvl = me.uv_layers.active.data
polys = []
for p in me.polygons:
    w = sum(hw[i] for i in p.vertices) / len(p.vertices)
    if w > cfg.get("eldiven_esik", 0.35):
        polys.append([[round(uvl[li].uv[0], 5), round(uvl[li].uv[1], 5)] for li in p.loop_indices])
json.dump({"polys": polys}, open(cfg.get("uv", OUT.replace(".blend", "_eldiven_uv.json")), "w"))
print("ELDIVEN UV yuz", len(polys))

for o in bpy.data.objects:
    if o.type == 'MESH': print("UCGEN", o.name, tris(o))
print("TOPLAM", sum(tris(o) for o in bpy.data.objects if o.type == 'MESH'))
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT)
print("HAZIR", OUT)
