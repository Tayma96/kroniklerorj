# Hızlı önizleme: blender -b <in.blend> --python onizle.py -- out.png '<json>'
# json: {"hedef":"head|hand_r|boy|pelvis", "kare":1, "ornek":16, "motor":"CYCLES|WB", "en":360, "boy":640,
#        "yon":[x,y,z] (hedeften kameraya), "lens":50, "hdri":"<yol>", "sahne":false}
# sahne=true ise dosyadaki kamera/ışık kullanılır (k04 sahnesi kurulmuşsa).
import bpy, sys, json, math, mathutils
argv = sys.argv[sys.argv.index('--') + 1:]
out = argv[0]
cfg = json.loads(argv[1]) if len(argv) > 1 else {}
sc = bpy.context.scene
sc.frame_set(cfg.get("kare", sc.frame_current))
rig = next((o for o in bpy.data.objects if o.type == 'ARMATURE' and o.name.startswith('Iskelet')), None)
motor = cfg.get("motor", "CYCLES")
sc.render.resolution_x, sc.render.resolution_y = cfg.get("en", 360), cfg.get("boy", 640)
sc.render.resolution_percentage = 100
if motor == "WB":
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading
    sh.light = 'STUDIO'; sh.color_type = cfg.get("renk", 'MATERIAL'); sh.show_shadows = True; sh.show_cavity = True
    sc.display.render_aa = '8'
else:
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
    sc.cycles.samples = cfg.get("ornek", 16); sc.cycles.use_denoising = True
    sc.cycles.denoiser = 'OPENIMAGEDENOISE'; sc.cycles.use_adaptive_sampling = True
    sc.render.threads_mode = 'AUTO'
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = cfg.get("look", 'AgX - Medium High Contrast')
if not cfg.get("sahne"):
    if cfg.get("hdri") and motor != "WB":
        w = bpy.data.worlds.new("W_onizle"); sc.world = w; w.use_nodes = True
        nt = w.node_tree; nt.nodes.clear()
        env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(cfg["hdri"], check_existing=True)
        mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord')
        mp.inputs['Rotation'].default_value[2] = math.radians(cfg.get("hdri_aci", 0))
        bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = cfg.get("hdri_guc", 1.0)
        o = nt.nodes.new('ShaderNodeOutputWorld')
        nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
        nt.links.new(env.outputs['Color'], bg.inputs['Color']); nt.links.new(bg.outputs['Background'], o.inputs['Surface'])
    hedef = cfg.get("hedef", "boy")
    if hedef == "boy" or rig is None:
        t = mathutils.Vector(cfg.get("nokta", (0, 0, 0.95)))
    else:
        pb = rig.pose.bones[hedef]
        t = rig.matrix_world @ (pb.head.lerp(pb.tail, cfg.get("oran", 0.5)))
        t += mathutils.Vector(cfg.get("kaydir", (0, 0, 0)))
    yon = mathutils.Vector(cfg.get("yon", (0.6, -2.0, 0.15) if hedef != "boy" else (1.2, -4.2, 0.1)))
    cd = bpy.data.cameras.new("OnCam"); cam = bpy.data.objects.new("OnCam", cd); sc.collection.objects.link(cam)
    cd.lens = cfg.get("lens", 50 if hedef == "boy" else 85); cd.sensor_fit = 'AUTO'
    cam.location = t + yon
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    if motor != "WB" and not cfg.get("hdri"):
        for n, e, loc in (("Anahtar", 300, (2.0, -2.5, 2.5)), ("Dolgu", 120, (-2.5, -1.5, 1.2)), ("Arka", 200, (0.5, 2.5, 2.2))):
            l = bpy.data.lights.new(n, 'AREA'); l.energy = e; l.size = 1.5
            lo = bpy.data.objects.new(n, l); sc.collection.objects.link(lo); lo.location = t + mathutils.Vector(loc)
            lo.rotation_euler = (t - lo.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = out
sc.render.image_settings.file_format = 'JPEG' if out.endswith('.jpg') else 'PNG'
bpy.ops.render.render(write_still=True)
print("ONIZLEME", out)
