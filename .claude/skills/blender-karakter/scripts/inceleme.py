# İnceleme görselleri (GLB'den, oyunun göreceği varlık): Cycles CPU, ≤32 örnek, ≤640 px.
# Kullanım: blender -b --python inceleme.py -- karakter.glb cikis_klasoru '<json>'
# json: {"hdri": yol, "shots": [{"name","clip","frame","at":[x,y,z] | "bone","dir","dist","lens","res":[w,h],"samples"}],
#        "sheets": [{"clip","step":4,"res":[w,h],"samples":8,"dir","dist","at"}]}
import bpy, sys, os, json, math
from mathutils import Vector
argv = sys.argv[sys.argv.index('--') + 1:]
glb, outdir, cfg = argv[0], argv[1], json.loads(argv[2])
os.makedirs(outdir, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = 30
bpy.ops.import_scene.gltf(filepath=glb)
arm = [o for o in sc.objects if o.type == 'ARMATURE'][0]
for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
cam = bpy.data.objects.new("kam", bpy.data.cameras.new("kam")); sc.collection.objects.link(cam); sc.camera = cam
sun = bpy.data.objects.new("gunes", bpy.data.lights.new("gunes", 'SUN')); sc.collection.objects.link(sun)
sun.data.energy = cfg.get("sun", 2.6); sun.data.angle = math.radians(3); sun.rotation_euler = (math.radians(52), 0, math.radians(-38))
w = bpy.data.worlds.new("d"); w.use_nodes = True; nt = w.node_tree; bg = nt.nodes['Background']
if cfg.get("hdri") and os.path.isfile(cfg["hdri"]):
    env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(cfg["hdri"])
    nt.links.new(env.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = cfg.get("hdri_g", 0.6)
else:
    bg.inputs[0].default_value = (0.42, 0.45, 0.5, 1); bg.inputs[1].default_value = 0.7
sc.world = w
bpy.ops.mesh.primitive_plane_add(size=40); fl = bpy.context.object
fm = bpy.data.materials.new("zemin"); fm.use_nodes = True
fb = fm.node_tree.nodes['Principled BSDF']; fb.inputs['Base Color'].default_value = (0.20, 0.18, 0.15, 1); fb.inputs['Roughness'].default_value = 0.9
fl.data.materials.append(fm)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = True
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
acts = {a.name.split('_')[0] if False else a.name: a for a in bpy.data.actions}
def act(clip): return [a for n, a in acts.items() if n.startswith(clip) and any('pose.bones' in fc.data_path for fc in a.fcurves)][0]
def shoot(s, path):
    arm.animation_data.action = act(s.get("clip", "bekle")); sc.frame_set(int(s.get("frame", 0)))
    if "bone" in s: P = arm.matrix_world @ arm.pose.bones[s["bone"]].head + Vector(s.get("off", (0, 0, 0)))
    else: P = Vector(s.get("at", (0, 0, 1.0)))
    d = Vector(s["dir"]).normalized(); cam.location = P + d * s["dist"]
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = s.get("lens", 50)
    sc.render.resolution_x, sc.render.resolution_y = s.get("res", (480, 640)); sc.render.resolution_percentage = 100
    sc.cycles.samples = min(s.get("samples", 24), 32); sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
for s in cfg.get("shots", []):
    shoot(s, os.path.join(outdir, s["name"] + ".png")); print("CEKIM", s["name"])
for sh in cfg.get("sheets", []):
    a = act(sh["clip"]); f0, f1 = int(a.frame_range[0]), int(a.frame_range[1])
    frames = list(range(f0, f1 + 1, sh.get("step", 4)))
    if frames[-1] != f1: frames.append(f1)
    for f in frames:
        s = dict(sh); s["frame"] = f; shoot(s, os.path.join(outdir, "_kare_%s_%03d.png" % (sh["clip"], f)))
    print("SAYFA", sh["clip"], frames)
