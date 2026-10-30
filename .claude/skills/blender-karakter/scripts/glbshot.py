import bpy, sys, json, math
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:]; glb=argv[0]; shots=json.loads(argv[1])
bpy.ops.wm.read_factory_settings(use_empty=True); sc=bpy.context.scene; sc.render.fps=30
bpy.ops.import_scene.gltf(filepath=glb)
arm=[o for o in sc.objects if o.type=='ARMATURE'][0]
for t in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(t)
cam=bpy.data.objects.new("k",bpy.data.cameras.new("k")); sc.collection.objects.link(cam); sc.camera=cam
sun=bpy.data.objects.new("g",bpy.data.lights.new("g",'SUN')); sc.collection.objects.link(sun); sun.data.energy=3.5; sun.rotation_euler=(math.radians(50),0,math.radians(-35))
w=bpy.data.worlds.new("d"); w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(0.42,0.45,0.5,1); w.node_tree.nodes['Background'].inputs[1].default_value=0.7; sc.world=w
bpy.ops.mesh.primitive_plane_add(size=30)
sc.render.engine='CYCLES'; sc.cycles.samples=12; sc.cycles.use_denoising=True; sc.view_settings.view_transform='AgX'
for s in shots:
    arm.animation_data.action=[a for a in bpy.data.actions if a.name.startswith(s["clip"])][0]; sc.frame_set(s["frame"])
    pb=arm.pose.bones[s.get("bone","Hips")]; P=arm.matrix_world@pb.head+Vector(s.get("off",(0,0,0)))
    d=Vector(s["dir"]).normalized(); cam.location=P+d*s["dist"]; cam.rotation_euler=(-d).to_track_quat('-Z','Y').to_euler(); cam.data.lens=s.get("lens",50)
    sc.render.resolution_x, sc.render.resolution_y = s.get("res",(320,320)); sc.render.filepath=s["out"]
    bpy.ops.render.render(write_still=True)
