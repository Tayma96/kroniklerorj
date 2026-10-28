# Kullanım: blender -b --python render_shot.py -- in.blend out.png hdri mod(portre|boy) [örnek] [hdri_açı]
import bpy, sys, math, mathutils
argv = sys.argv[sys.argv.index('--')+1:]
blend, out, hdri, mode = argv[0], argv[1], argv[2], argv[3]
samples = int(argv[4]) if len(argv) > 4 else 96
rot = float(argv[5]) if len(argv) > 5 else 200
frame = int(argv[6]) if len(argv) > 6 else None
bpy.ops.wm.open_mainfile(filepath=blend)
sc = bpy.context.scene
if frame is not None: sc.frame_set(frame)
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPENIMAGEDENOISE'
sc.render.resolution_x = 720; sc.render.resolution_y = 900 if mode == 'portre' else 1080
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Punchy'
sc.view_settings.exposure = -0.3
w = bpy.data.worlds.new("W"); sc.world = w; w.use_nodes = True
nt = w.node_tree; nt.nodes.clear()
env = nt.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(hdri)
mp = nt.nodes.new('ShaderNodeMapping'); tc = nt.nodes.new('ShaderNodeTexCoord'); mp.inputs['Rotation'].default_value[2] = math.radians(rot)
bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = 0.7
o = nt.nodes.new('ShaderNodeOutputWorld')
nt.links.new(tc.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
nt.links.new(env.outputs['Color'], bg.inputs['Color']); nt.links.new(bg.outputs['Background'], o.inputs['Surface'])
rig = [ob for ob in bpy.data.objects if ob.type == 'ARMATURE'][0]
hb = rig.pose.bones.get('Head') or rig.pose.bones.get('head')
head = rig.matrix_world @ ((hb.head + hb.tail) / 2)
hip = rig.matrix_world @ rig.pose.bones['Hips'].head
# zemin
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, 0)); g = bpy.context.object
gm = bpy.data.materials.new("Zemin"); gm.use_nodes = True; bs = gm.node_tree.nodes['Principled BSDF']
bs.inputs['Base Color'].default_value = (0.32, 0.24, 0.16, 1); bs.inputs['Roughness'].default_value = 0.95; g.data.materials.append(gm)
cam_d = bpy.data.cameras.new("C"); cam = bpy.data.objects.new("C", cam_d); sc.collection.objects.link(cam); sc.camera = cam
if mode == 'portre':
    cam_d.lens = 85; target = head + mathutils.Vector((0, 0, -0.06)); cam.location = target + mathutils.Vector((0.55, -1.25, 0.05))
    cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = 2.2
else:
    cam_d.lens = 50; target = mathutils.Vector((hip.x, hip.y, 0.95)); cam.location = target + mathutils.Vector((1.6, -4.1, 0.2))
    cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = 4
d = target - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam_d.dof.focus_distance = d.length
sun = bpy.data.lights.new("Gunes", 'SUN'); sun.energy = 3.2; sun.color = (1.0, 0.82, 0.62); sun.angle = math.radians(2)
so = bpy.data.objects.new("Gunes", sun); sc.collection.objects.link(so); so.rotation_euler = (math.radians(62), 0, math.radians(-50))
fill = bpy.data.lights.new("Dolgu", 'AREA'); fill.energy = 40; fill.size = 2; fill.color = (0.75, 0.85, 1.0)
fo = bpy.data.objects.new("Dolgu", fill); sc.collection.objects.link(fo); fo.location = head + mathutils.Vector((2.0, -1.5, 0.4)); fo.rotation_euler = (head - fo.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.filepath = out
bpy.ops.render.render(write_still=True)
print("RENDER", out)
