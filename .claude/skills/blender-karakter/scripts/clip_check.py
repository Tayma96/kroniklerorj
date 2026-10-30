# İçinden geçme denetimi (örnek pozlar): giyilen katmanların dinlenme durumuna göre dışarı taşması ve
# namlunun gövde/giysiye girmesi. Kullanım: blender -b anim.blend --python clip_check.py -- '[["saldir",30],...]'
import bpy, sys, json
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
POSES = json.loads(argv[0]) if argv else [["bekle", 0], ["bekle", 45], ["saldir", 10], ["saldir", 19], ["saldir", 30], ["saldir", 40], ["savustur", 7], ["savustur", 15]]
rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
def obj(k): return [o for o in bpy.data.objects if o.type == 'MESH' and k in o.name][0]
BODY, TUN, PAN, ARM, AV, SW, BOOT = obj('Savasci'), obj('tunic'), obj('pants'), obj('Zirh'), obj('Boyunluk'), obj('Kilic'), obj('boots')
for t in rig.animation_data.nla_tracks: t.mute = True
def state():
    dg = bpy.context.evaluated_depsgraph_get(); out = {}
    for o in (BODY, TUN, PAN, ARM, AV, SW, BOOT):
        e = o.evaluated_get(dg); me = e.to_mesh()
        vs = [o.matrix_world @ v.co for v in me.vertices]
        tris = [tuple(t.vertices) for t in me.loop_triangles] if me.loop_triangles else None
        if tris is None: me.calc_loop_triangles(); tris = [tuple(t.vertices) for t in me.loop_triangles]
        bnd = set()
        ec = {}
        for t in tris:
            for a_, b_ in ((t[0], t[1]), (t[1], t[2]), (t[2], t[0])):
                k = (min(a_, b_), max(a_, b_)); ec[k] = ec.get(k, 0) + 1
        for (a_, b_), c in ec.items():
            if c == 1: bnd.add(a_); bnd.add(b_)
        kd = KDTree(max(len(bnd), 1))
        for i in bnd: kd.insert(vs[i], i)
        kd.balance()
        out[o.name] = (vs, BVHTree.FromPolygons(vs, tris), kd, len(bnd))
        e.to_mesh_clear()
    return out
EDGE = 0.02
def signed(vs, tree, kd=None, nb=0):
    res = []
    for p in vs:
        loc, nor, idx, d = tree.find_nearest(p, 0.04)
        if loc is None or (kd is not None and nb and kd.find(loc)[2] < EDGE): res.append(None); continue
        res.append((p - loc).dot(nor))
    return res
PAIRS = [(TUN, ARM, "tunik>zirh"), (PAN, ARM, "salvar>zirh"), (BODY, AV, "ten>boyunluk"), (TUN, AV, "tunik>boyunluk"), (ARM, AV, "zirh>boyunluk")]
rig.animation_data.action = None
for pb in rig.pose.bones: pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0)
bpy.context.view_layer.update()
REST = state(); base = {}
for a, b, nm in PAIRS: base[nm] = signed(REST[a.name][0], REST[b.name][1])
mi = [i for i, m in enumerate(SW.data.materials) if m and m.name.startswith('Celik')]
blade = sorted({v for p in SW.data.polygons if p.material_index in mi for v in p.vertices})
worst = {}
for clip, f in POSES:
    rig.animation_data.action = bpy.data.actions[clip]; bpy.context.scene.frame_set(f)
    S = state(); line = []
    for a, b, nm in PAIRS:
        cur = signed(S[a.name][0], S[b.name][1], S[b.name][2], S[b.name][3]); n = 0; mx = 0.0
        where = []
        for vi, (s0, s1) in enumerate(zip(base[nm], cur)):
            if s0 is not None and s1 is not None and s0 < 0 and s1 > 0.002:
                n += 1; mx = max(mx, s1); p_ = REST[a.name][0][vi]; where.append("(%.2f,%.2f,%.2f)" % tuple(p_))
        if where and "-v" in sys.argv: print("   ", nm, clip, f, " ".join(where[:12]))
        line.append("%s %d (%.1f mm)" % (nm, n, mx * 1000)); worst[nm] = max(worst.get(nm, 0), n)
    # namlu: gövde/giysi içine (en yakın yüzün arkasında ≥3 mm)
    n = 0; mx = 0.0
    sv = [S[SW.name][0][i] for i in blade]
    for o in (BODY, TUN, PAN, ARM, BOOT):
        for s_ in signed(sv, S[o.name][1]):
            if s_ is not None and s_ < -0.003: n += 1; mx = max(mx, -s_)
    line.append("kilic-icinde %d (%.1f mm)" % (n, mx * 1000)); worst["kilic"] = max(worst.get("kilic", 0), n)
    print("POZ", clip, f, " | ".join(line))
print("KONTROL en kotu", worst)
