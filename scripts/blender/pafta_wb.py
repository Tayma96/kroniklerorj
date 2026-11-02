# Hareket paftası (Workbench, hızlı): blender -b x.blend --python pafta_wb.py -- '<json>'
# json: {"eylem":"saldiri","kareler":[...],"out":"x.jpg","kam":[[x,y,z],...], "hedef":[x,y,z], "en":200,"boy":330,"lens":35}
import bpy, sys, json, mathutils, os, subprocess
cfg = json.loads(sys.argv[sys.argv.index('--') + 1])
sc = bpy.context.scene; rig = bpy.data.objects["Iskelet"]
rig.animation_data.action = bpy.data.actions[cfg["eylem"]]
sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = cfg.get("en", 200); sc.render.resolution_y = cfg.get("boy", 330)
sh = sc.display.shading; sh.light = 'STUDIO'; sh.show_shadows = True; sh.show_cavity = True; sh.color_type = 'MATERIAL'
for o in bpy.data.objects:
    if o.type == 'CURVES': o.hide_render = True
if "Zemin_wb" not in bpy.data.objects:
    bpy.ops.mesh.primitive_plane_add(size=8); bpy.context.object.name = "Zemin_wb"
t = mathutils.Vector(cfg.get("hedef", (0, -0.1, 0.95)))
kams = []
for i, p in enumerate(cfg["kam"]):
    cd = bpy.data.cameras.new(f"k{i}"); cam = bpy.data.objects.new(f"k{i}", cd); sc.collection.objects.link(cam)
    cd.lens = cfg.get("lens", 35); cam.location = mathutils.Vector(p); cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    kams.append(cam)
tmp = cfg["out"] + "_d"; os.makedirs(tmp, exist_ok=True)
fs = []
for f in cfg["kareler"]:
    sc.frame_set(f)
    for i, cam in enumerate(kams):
        sc.camera = cam; p = f"{tmp}/{i}_{f:04d}.png"; sc.render.filepath = p; bpy.ops.render.render(write_still=True); fs.append((i, f, p))
kod = r'''
import sys, json
from PIL import Image, ImageDraw
d = json.loads(sys.argv[1]); fs = d["fs"]; nk = d["nk"]; kar = d["kar"]
W, H = Image.open(fs[0][2]).size
im = Image.new("RGB", (W * len(kar), H * nk), "white"); dr = ImageDraw.Draw(im)
for i, f, p in fs:
    x = kar.index(f) * W; y = i * H; im.paste(Image.open(p).convert("RGB"), (x, y)); dr.text((x + 3, y + 3), str(f), fill="black")
im.save(d["out"], quality=88)
'''
subprocess.run(["python3", "-c", kod, json.dumps({"fs": fs, "nk": len(kams), "kar": cfg["kareler"], "out": cfg["out"]})], check=True)
print("PAFTA", cfg["out"])
