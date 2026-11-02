# Ölçüyle denetim: ayak kayması, ayak-zemin teması, kılıç/gövde ve zırh/gövde içinden geçme.
# Kullanım: blender -b sahne.blend --python denetim.py -- <eylem> [adım]
import bpy, sys, json, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
a = sys.argv[sys.argv.index('--') + 1:]
eylem = a[0]; adim = int(a[1]) if len(a) > 1 else 1
sc = bpy.context.scene; rig = bpy.data.objects["Iskelet"]
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type in ('CLOTH', 'COLLISION'): m.show_viewport = False
ad = rig.animation_data
for tr in list(ad.nla_tracks): ad.nla_tracks.remove(tr)
ad.action = bpy.data.actions[eylem]
f0, f1 = map(int, ad.action.frame_range)
body = bpy.data.objects["Piyade"]; kilic = bpy.data.objects["Kilic"]; cizme = bpy.data.objects["Cizme"]
ZEMIN = -0.012
def bvh_of(ob, dg, haric_kemik=None):
    ev = ob.evaluated_get(dg); m = ev.to_mesh()
    t = BVHTree.FromPolygons([ob.matrix_world @ v.co for v in m.vertices], [p.vertices[:] for p in m.polygons])
    ev.to_mesh_clear(); return t
# gövde gizleme maskesi olmadan ölç (içten geçme gerçek gövdeye göre)
mk = body.modifiers.get("GiysiAlti"); mk.show_viewport = False
sonuc = {"ayak_kayma_mm": {}, "taban_min_mm": None, "taban_max_temas_mm": None, "kilic_govde_min_mm": 1e9, "kilic_yakin_kareler": []}
onceki = {}; kayma = {"l": 0.0, "r": 0.0}; taban_min = 1e9
for f in range(f0, f1 + 1, adim):
    sc.frame_set(f); dg = bpy.context.evaluated_depsgraph_get()
    for s in ("l", "r"):
        pb = rig.pose.bones["ball_" + s]; p = rig.matrix_world @ pb.head
        temas = p.z < 0.012
        if temas and s in onceki and onceki[s][1]:
            kayma[s] = max(kayma[s], (Vector((p.x, p.y)) - Vector((onceki[s][0].x, onceki[s][0].y))).length)
        onceki[s] = (p.copy(), temas)
    # kılıç namlusu boyunca 24 nokta: gövdeye uzaklık
    bt = bvh_of(body, dg)
    bt2 = [bvh_of(bpy.data.objects[n], dg) for n in ("Migfer", "Boyunluk", "ZirhCarp", "EntariEtek")]
    M = kilic.matrix_world
    for i in range(24):
        q = M @ Vector((0, 0, 0.10 + 0.74 * i / 23))
        loc, n, _, d = bt.find_nearest(q)
        if d is not None:
            ic = (q - loc).dot(n) < 0
            dd = -d if ic else d
            if dd < sonuc["kilic_govde_min_mm"] / 1000:
                sonuc["kilic_govde_min_mm"] = dd * 1000
            if dd < 0.015: sonuc["kilic_yakin_kareler"].append((f, round(dd * 1000, 1)))
        for j, t2 in enumerate(bt2):
            loc, n, _, d = t2.find_nearest(q)
            if d is not None and d < 0.012:
                sonuc.setdefault("kilic_esya_yakin", []).append((f, ("migfer", "boyunluk", "zirh", "etek")[j], round(d * 1000, 1)))
    # çizme tabanı en alt noktası (zemin -12 mm)
    ev = cizme.evaluated_get(dg); m = ev.to_mesh()
    zs = sorted(v.co.z for v in m.vertices)
    taban_min = min(taban_min, zs[0]); ev.to_mesh_clear()
sonuc["ayak_kayma_mm"] = {k: round(v * 1000, 2) for k, v in kayma.items()}
sonuc["taban_min_mm_zemin_ustu"] = round((taban_min - ZEMIN) * 1000, 1)
sonuc["kilic_yakin_kareler"] = sonuc["kilic_yakin_kareler"][:40]
sonuc["kilic_esya_yakin"] = sonuc.get("kilic_esya_yakin", [])[:30]
print("DENETIM", json.dumps(sonuc, ensure_ascii=False))
