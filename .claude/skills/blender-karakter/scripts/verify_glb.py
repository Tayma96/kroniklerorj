# GLB'yi temiz sahneye geri al, ölç, her klipten orta kare Cycles kontrol görseli üret.
import bpy, sys, os, json, struct, math
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
glb, outdir = argv[0], argv[1]
# ham GLB JSON
with open(glb, 'rb') as f:
    f.read(12); ln, typ = struct.unpack('<II', f.read(8)); G = json.loads(f.read(ln))
acc = G["accessors"]
print("DOSYA", glb, os.path.getsize(glb), "bayt", round(os.path.getsize(glb) / 1048576, 2), "MB")
print("GLTF animasyonlar:")
for a in G.get("animations", []):
    ins = {s["input"] for s in a["samplers"]}
    cnt = max(acc[i]["count"] for i in ins); tmax = max(acc[i]["max"][0] for i in ins)
    print("  ANIM", a["name"], "kanal", len(a["channels"]), "kare", cnt, "sure %.3f s" % tmax)
for s in G.get("skins", []): print("  SKIN eklem", len(s["joints"]))
tri = 0
for m in G["meshes"]:
    t = sum(acc[p["indices"]]["count"] // 3 for p in m["primitives"]); tri += t
    attrs = sorted(m["primitives"][0]["attributes"].keys())
    print("  MESH", m["name"], "ucgen", t, "prim", len(m["primitives"]), attrs)
print("  TOPLAM ucgen", tri, "mesh", len(G["meshes"]), "malzeme", len(G.get("materials", [])), "doku", len(G.get("images", [])))
for im in G.get("images", []): print("  IMG", im.get("name"), im.get("mimeType"))
for m in G.get("materials", []): print("  MAT", m["name"], m.get("alphaMode", "OPAQUE"))
# Blender'a geri al
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = 30
bpy.ops.import_scene.gltf(filepath=glb)
arm = [o for o in sc.objects if o.type == 'ARMATURE'][0]
# Bütçe kapısı (tasarım §7.2): gövde+giysi+eşya ≤ 32k üçgen, ≤ 60 kemik, doku ≤ 1024 px, GLB ≤ 6 MB.
BUTCE = {"ucgen": int(os.environ.get("BUTCE_UCGEN", 32000)), "kemik": 60, "doku": 1024, "mb": 6.0}
hatalar = []
if tri > BUTCE["ucgen"]: hatalar.append(f"ucgen {tri} > {BUTCE['ucgen']}")
if len(arm.data.bones) > BUTCE["kemik"]: hatalar.append(f"kemik {len(arm.data.bones)} > {BUTCE['kemik']}")
for im in bpy.data.images:
    if im.size[0] > BUTCE["doku"] or im.size[1] > BUTCE["doku"]: hatalar.append(f"doku {im.name} {tuple(im.size)}")
if os.path.getsize(glb) / 1048576 > BUTCE["mb"]: hatalar.append(f"boyut {os.path.getsize(glb) / 1048576:.2f} MB")
print("BUTCE", "GECTI" if not hatalar else "KALDI: " + "; ".join(hatalar))
print("BLENDER kemik", len(arm.data.bones), "nesne", len([o for o in sc.objects if o.type == 'MESH']),
      "ucgen", sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in sc.objects if o.type == 'MESH'))
acts = {}
for a in bpy.data.actions:
    print("  ACTION", a.name, "aralik", tuple(a.frame_range), "kare", int(a.frame_range[1] - a.frame_range[0]) + 1, "fcurve", len(a.fcurves))
    for c in ("bekle", "saldir", "savustur"):
        if a.name.startswith(c) and any('pose.bones' in fc.data_path for fc in a.fcurves): acts[c] = a
# render kurulumu
if arm.animation_data:
    for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
else: arm.animation_data_create()
cam = bpy.data.objects.new("kam", bpy.data.cameras.new("kam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.lens = 40
sun = bpy.data.objects.new("gunes", bpy.data.lights.new("gunes", 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
w = bpy.data.worlds.new("d"); w.use_nodes = True; bg = w.node_tree.nodes['Background']
bg.inputs[0].default_value = (0.42, 0.45, 0.5, 1); bg.inputs[1].default_value = 0.7; sc.world = w
bpy.ops.mesh.primitive_plane_add(size=30); fl = bpy.context.object
fm = bpy.data.materials.new("zemin"); fm.use_nodes = True; fm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.3, 0.28, 0.25, 1); fl.data.materials.append(fm)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 16; sc.cycles.use_denoising = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 480, 640, 100
sc.view_settings.view_transform = 'AgX'
# glTF +Z ön -> Blender'da -Y'ye bakar; kamera önden 3/4
target = Vector((0, 0, 1.1)); d = Vector((0.45, -1, 0.12)).normalized()
cam.location = target + d * 3.6; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
PBn = arm.pose.bones
for c in ("bekle", "saldir", "savustur"):
    a = acts[c]; arm.animation_data.action = a
    f0, f1 = int(a.frame_range[0]), int(a.frame_range[1])
    feet0 = None; slide = 0.0; hx = []; hz = []; tipz = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f)
        ft = [arm.matrix_world @ PBn[n].head for n in ("LeftFoot", "RightFoot", "LeftToeBase", "RightToeBase")]
        if feet0 is None: feet0 = ft
        slide = max(slide, max((x - y).length for x, y in zip(ft, feet0)))
        h = arm.matrix_world @ PBn["Hips"].head; hx.append(h.xy.length); hz.append(h.z)
    sc.frame_set(f0); p0 = [pb.matrix.copy() for pb in PBn]; sc.frame_set(f1); p1 = [pb.matrix.copy() for pb in PBn]
    loopd = max((x.translation - y.translation).length for x, y in zip(p0, p1))
    print("OLCUM", c, "ayak kayma max %.4f m" % slide, "kalca yatay max %.3f m" % max(hx), "kalca z %.3f-%.3f" % (min(hz), max(hz)), "ilk-son kare kemik farki %.4f m" % loopd)
for c in ("bekle", "saldir", "savustur"):
    a = acts[c]; arm.animation_data.action = a
    mid = int(round((a.frame_range[0] + a.frame_range[1]) / 2)); sc.frame_set(mid)
    sc.render.filepath = os.path.join(outdir, "check_%s.png" % c)
    bpy.ops.render.render(write_still=True)
    print("RENDER", c, "kare", mid, sc.render.filepath)
