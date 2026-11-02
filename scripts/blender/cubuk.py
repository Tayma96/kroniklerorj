# Çubuk çizim şeridi (hareket incelemesi): blender -b [x.blend] --python cubuk.py -- '<json>'
# json: {"glb"|"bvh": yol, "eylem": ad, "iskelet": ad, "kareler": [..] | "adim": n, "out": png, "gorus": "yan|on|ust"}
# Kemik baş-kuyruk çizgilerini PIL ile yansıtır (Workbench gerekmez). Zemin çizgisi z=0.
import bpy, sys, json, subprocess, os, math, tempfile
cfg = json.loads(sys.argv[sys.argv.index('--') + 1])
if cfg.get("glb"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=cfg["glb"])
elif cfg.get("bvh"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_anim.bvh(filepath=cfg["bvh"], global_scale=cfg.get("olcek", 0.056), axis_forward='-Z', axis_up='Y',
                            update_scene_fps=True, update_scene_duration=True)
sc = bpy.context.scene
arm = bpy.data.objects[cfg["iskelet"]] if cfg.get("iskelet") else next(o for o in bpy.data.objects if o.type == 'ARMATURE')
if cfg.get("eylem"):
    arm.animation_data.action = bpy.data.actions[cfg["eylem"]]
act = arm.animation_data.action
f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
kareler = cfg.get("kareler") or list(range(f0, f1 + 1, cfg.get("adim", 6)))
gorus = cfg.get("gorus", "yan")
data = []
for f in kareler:
    sc.frame_set(f)
    segs = []
    for pb in arm.pose.bones:
        if 'leaf' in pb.name or pb.name in ('root', 'Root'):
            continue
        h = arm.matrix_world @ pb.head; t = arm.matrix_world @ pb.tail
        side = 'l' if (pb.name.endswith('_l') or pb.name.lower().startswith('l') and not pb.name.lower().startswith('lower')) else \
               ('r' if (pb.name.endswith('_r') or pb.name.lower().startswith('r')) else 'm')
        segs.append((tuple(h), tuple(t), side, pb.name))
    data.append((f, segs))
tmp = os.path.join(tempfile.gettempdir(), 'cubuk.json')
json.dump({"data": data, "gorus": gorus, "out": cfg["out"], "isaret": cfg.get("isaret", [])}, open(tmp, 'w'))
kod = r'''
import json,sys
from PIL import Image, ImageDraw
d=json.load(open(sys.argv[1])); g=d["gorus"]
def P(p):
    x,y,z=p
    if g=="yan": return (x, z)
    if g=="on": return (-y, z) if False else (x, z)
    return (x, y)
def Q(p):
    x,y,z=p
    return {"yan":(y,z),"on":(x,z),"ust":(x,-y)}[g]
pts=[Q(s[0]) for f,segs in d["data"] for s in segs]+[Q(s[1]) for f,segs in d["data"] for s in segs]
mnx=min(p[0] for p in pts); mxx=max(p[0] for p in pts); mnz=min(min(p[1] for p in pts),0); mxz=max(p[1] for p in pts)
n=len(d["data"]); W=220; H=360; sc=min((W-20)/max(mxx-mnx,1e-3), (H-30)/max(mxz-mnz,1e-3))
im=Image.new("RGB",(W*min(n,8), H*((n+7)//8)),"white"); dr=ImageDraw.Draw(im)
col={"l":(30,90,220),"r":(220,40,40),"m":(30,30,30)}
for i,(f,segs) in enumerate(d["data"]):
    ox=(i%8)*W; oy=(i//8)*H
    T=lambda p:(ox+10+(Q(p)[0]-mnx)*sc, oy+H-15-(Q(p)[1]-mnz)*sc)
    gy=oy+H-15-(0-mnz)*sc; dr.line([(ox,gy),(ox+W,gy)],fill=(160,160,160))
    for h,t,s,nm in segs:
        w=3 if s!="m" else 4
        if "sword" in nm.lower() or "kilic" in nm.lower(): dr.line([T(h),T(t)],fill=(0,160,0),width=3); continue
        dr.line([T(h),T(t)],fill=col[s],width=w)
    dr.text((ox+4,oy+4),str(f),fill="black")
im.save(d["out"])
'''
subprocess.run(["python3", "-c", kod, tmp], check=True)
print("CUBUK", cfg["out"], f0, f1, len(kareler))
