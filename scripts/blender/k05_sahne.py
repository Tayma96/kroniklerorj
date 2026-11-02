# Kalite kanıtı 5/6 — sahne: Poly Haven HDRI (güneş diski kırpılır) + tek anahtar güneş, kuru toprak zemin
# (CC0 doku + çakıl + seyrek kuru ot), kameralar, çarpışma vekilleri ve kumaş benzetimi ayarları.
# Kullanım: blender -b in.blend --python k05_sahne.py -- out.blend <kaynak_klasoru>
import bpy, bmesh, sys, os, math, random
from mathutils import Vector, Matrix, Euler
from mathutils.kdtree import KDTree

argv = sys.argv[sys.argv.index('--') + 1:]
out, KAY = argv[0], argv[1]
TEX = os.path.join(KAY, "tex")
sc = bpy.context.scene; rnd = random.Random(1243)
rig = bpy.data.objects["Iskelet"]; body = bpy.data.objects["Piyade"]
ZEMIN = -0.012

def img(p, renk=False):
    im = bpy.data.images.load(p, check_existing=True)
    if not renk: im.colorspace_settings.name = 'Non-Color'
    return im

# ------------------------------------------------------------------ dünya: HDRI, güneş diski kırpılmış
GUNES_AZ, GUNES_YUK = -80.0, 24.0      # güneşe doğru yön: azimut (atan2(y,x) derece), yükseklik
HDRI_DONUS = 218.0                      # HDRI güneşi (azimut 138°) güneş lambasıyla aynı yöne
w = bpy.data.worlds.new("Bozkir"); sc.world = w; w.use_nodes = True
N = w.node_tree.nodes; L = w.node_tree.links; N.clear()
tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value[2] = math.radians(HDRI_DONUS)
env = N.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(os.path.join(KAY, "hdri", "kiara.hdr"), check_existing=True)
L.new(tc.outputs['Generated'], mp.inputs['Vector']); L.new(mp.outputs[0], env.inputs['Vector'])
sep = N.new('ShaderNodeSeparateColor'); L.new(env.outputs[0], sep.inputs[0])
kom = N.new('ShaderNodeCombineColor')
for i, ch in enumerate(('Red', 'Green', 'Blue')):
    mn = N.new('ShaderNodeMath'); mn.operation = 'MINIMUM'; mn.inputs[1].default_value = 18.0
    L.new(sep.outputs[i], mn.inputs[0]); L.new(mn.outputs[0], kom.inputs[i])
bg = N.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = 0.9
L.new(kom.outputs[0], bg.inputs['Color'])
o = N.new('ShaderNodeOutputWorld'); L.new(bg.outputs[0], o.inputs['Surface'])

g = bpy.data.lights.new("Gunes", 'SUN'); g.energy = 4.2; g.color = (1.0, 0.80, 0.60); g.angle = math.radians(1.2)
go = bpy.data.objects.new("Gunes", g); sc.collection.objects.link(go)
d = Vector((math.cos(math.radians(GUNES_YUK)) * math.cos(math.radians(GUNES_AZ)),
            math.cos(math.radians(GUNES_YUK)) * math.sin(math.radians(GUNES_AZ)), math.sin(math.radians(GUNES_YUK))))
go.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
g.cycles.cast_shadow = True if hasattr(g, "cycles") else True

dl_ = bpy.data.lights.new("Yansitici", 'AREA'); dl_.energy = 55; dl_.size = 1.6; dl_.color = (1.0, 0.86, 0.72)
dlo = bpy.data.objects.new("Yansitici", dl_); sc.collection.objects.link(dlo); dlo.location = (-1.7, -1.6, 0.85)
dlo.rotation_euler = (Vector((0, -0.1, 1.45)) - dlo.location).to_track_quat('-Z', 'Y').to_euler()
dl_.cycles.cast_shadow = True
# ------------------------------------------------------------------ zemin: kuru toprak + çakıl + ot
zm = bpy.data.meshes.new("Zemin"); bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60.0); bm.to_mesh(zm); bm.free()
zemin = bpy.data.objects.new("Zemin", zm); sc.collection.objects.link(zemin); zemin.location.z = ZEMIN
m = bpy.data.materials.new("Toprak"); m.use_nodes = True
N = m.node_tree.nodes; L = m.node_tree.links; bs = N["Principled BSDF"]
tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.55, 0.55, 0.55)
L.new(tc.outputs['Object'], mp.inputs['Vector'])
D = os.path.join(TEX, "dry_ground_rocks")
def tx(f, renk=False):
    t = N.new('ShaderNodeTexImage'); t.image = img(os.path.join(D, f), renk); L.new(mp.outputs[0], t.inputs[0]); return t
dif, ro, no, ds = tx("Diffuse.jpg", True), tx("Rough.jpg"), tx("nor_gl.jpg"), tx("Displacement.jpg")
# büyük ölçekli renk dalgalanması (tekrar izi kırılsın)
nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.35; nz.inputs['Detail'].default_value = 3
L.new(tc.outputs['Object'], nz.inputs['Vector'])
mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'
mr = N.new('ShaderNodeMapRange'); mr.inputs['To Min'].default_value = 0.0; mr.inputs['To Max'].default_value = 0.45
L.new(nz.outputs['Fac'], mr.inputs['Value']); L.new(mr.outputs[0], mx.inputs['Factor'])
L.new(dif.outputs[0], mx.inputs[6]); mx.inputs[7].default_value = (0.72, 0.62, 0.50, 1)
L.new(mx.outputs[2], bs.inputs['Base Color'])
L.new(ro.outputs[0], bs.inputs['Roughness'])
nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0; L.new(no.outputs[0], nm.inputs['Color'])
bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35; bp.inputs['Distance'].default_value = 0.01
L.new(ds.outputs[0], bp.inputs['Height']); L.new(nm.outputs[0], bp.inputs['Normal']); L.new(bp.outputs[0], bs.inputs['Normal'])
bs.inputs['Specular IOR Level'].default_value = 0.3
zemin.data.materials.append(m)

# çakıllar: 3.5 m yarıçapta, yarı gömülü, gürültüyle bozulmuş küreler (karakterin ayak izinden uzak)
tas_m = bpy.data.materials.new("Tas"); tas_m.use_nodes = True
tN = tas_m.node_tree.nodes; tL = tas_m.node_tree.links; tbs = tN["Principled BSDF"]
oi = tN.new('ShaderNodeObjectInfo'); cr = tN.new('ShaderNodeValToRGB')
cr.color_ramp.elements[0].color = (0.30, 0.26, 0.21, 1); cr.color_ramp.elements[1].color = (0.62, 0.55, 0.46, 1)
tL.new(oi.outputs['Random'], cr.inputs[0]); tL.new(cr.outputs[0], tbs.inputs['Base Color'])
tbs.inputs['Roughness'].default_value = 0.8
tnz = tN.new('ShaderNodeTexNoise'); tnz.inputs['Scale'].default_value = 60; tbump = tN.new('ShaderNodeBump'); tbump.inputs['Strength'].default_value = 0.4
tL.new(tnz.outputs['Fac'], tbump.inputs['Height']); tL.new(tbump.outputs[0], tbs.inputs['Normal'])
cakil = []
for i in range(6):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
    for v in bm.verts:
        n_ = v.co.normalized(); v.co = n_ * (1 + 0.22 * math.sin(3.1 * n_.x + i) * math.cos(2.3 * n_.y - i) + 0.1 * math.sin(7 * n_.z + 2 * i))
        v.co.z *= 0.55
    tm = bpy.data.meshes.new(f"Tas{i}"); bm.to_mesh(tm); bm.free()
    for p in tm.polygons: p.use_smooth = True
    tm.materials.append(tas_m); cakil.append(tm)
koll = bpy.data.collections.new("Cakil"); sc.collection.children.link(koll)
ayak_bolge = [Vector((0.14, -0.40)), Vector((-0.17, 0.11))]
for i in range(260):
    r = 0.35 + 3.4 * rnd.random() ** 0.7; a = rnd.random() * 2 * math.pi
    p = Vector((r * math.cos(a), r * math.sin(a)))
    if any((p - q).length < 0.35 for q in ayak_bolge): continue
    s = 0.006 + 0.035 * rnd.random() ** 2.5
    ob = bpy.data.objects.new(f"Cakil{i}", cakil[i % 6]); koll.objects.link(ob)
    ob.location = (p.x, p.y, ZEMIN - s * 0.25); ob.scale = (s * rnd.uniform(0.8, 1.3), s * rnd.uniform(0.8, 1.3), s)
    ob.rotation_euler = (0, 0, rnd.random() * 6.28)

# seyrek kuru ot öbekleri (Curves): 1.2–14 m arası; samandan solmuş yeşile
ot_m = bpy.data.materials.new("KuruOt"); ot_m.use_nodes = True
oN = ot_m.node_tree.nodes; oL = ot_m.node_tree.links; obs = oN["Principled BSDF"]
ci = oN.new('ShaderNodeHairInfo'); ocr = oN.new('ShaderNodeValToRGB')
ocr.color_ramp.elements[0].color = (0.36, 0.30, 0.17, 1); ocr.color_ramp.elements[1].color = (0.68, 0.58, 0.38, 1)
oL.new(ci.outputs['Random'], ocr.inputs[0]); oL.new(ocr.outputs[0], obs.inputs['Base Color'])
obs.inputs['Roughness'].default_value = 0.65
obs.inputs['Subsurface Weight'].default_value = 0.0
cv = bpy.data.hair_curves.new("Ot")
teller = []
for i in range(900):
    r = 1.2 + 13 * rnd.random() ** 1.4; a = rnd.random() * 2 * math.pi
    c = Vector((r * math.cos(a), r * math.sin(a), ZEMIN))
    for k in range(rnd.randint(8, 22)):
        b = c + Vector((rnd.gauss(0, 0.025), rnd.gauss(0, 0.025), 0))
        h = rnd.uniform(0.06, 0.26) * (0.6 + 0.4 * rnd.random())
        yon = Vector((rnd.gauss(0, 0.35), rnd.gauss(0, 0.35), 1)).normalized()
        egil = Vector((rnd.gauss(0, 1), rnd.gauss(0, 1), 0)) * 0.15
        teller.append([b + yon * h * t + egil * h * t * t + Vector((0, 0, -0.01 * t * t)) for t in (0, 0.33, 0.66, 1.0)])
cv.add_curves([4] * len(teller))
cv.position_data.foreach_set("vector", [c for t in teller for p in t for c in p])
ra = cv.attributes.new("radius", 'FLOAT', 'POINT'); ra.data.foreach_set("value", [0.0011 * (1 - 0.8 * k / 3) for _ in teller for k in range(4)])
cv.materials.append(ot_m)
ot = bpy.data.objects.new("KuruOt", cv); sc.collection.objects.link(ot)

# ------------------------------------------------------------------ çarpışma vekilleri
bpy.ops.object.select_all(action='DESELECT')
carp = bpy.data.objects.new("GovdeCarp", body.data.copy()); sc.collection.objects.link(carp)
carp.parent = rig; carp.matrix_world = body.matrix_world.copy()
for vg in body.vertex_groups:
    carp.vertex_groups.new(name=vg.name)
for v in body.data.vertices:
    for gg in v.groups:
        carp.vertex_groups[gg.group].add([v.index], gg.weight, 'REPLACE')
am = carp.modifiers.new("Iskelet", 'ARMATURE'); am.object = rig
cm = carp.modifiers.new("Carpisma", 'COLLISION')
carp.collision.thickness_outer = 0.006; carp.collision.thickness_inner = 0.01; carp.collision.cloth_friction = 6.0
carp.hide_render = True; carp.visible_camera = False
# zırh taşıyıcı vekili (boyunluk omuza/zırha, etek üstü zırh altına çarpsın): lamel kabuğunun dış bükey kopyası
zc = bpy.data.objects["ZirhCarp"]
zc.modifiers.new("Carpisma", 'COLLISION'); zc.collision.thickness_outer = 0.004; zc.collision.cloth_friction = 4.0
zc.hide_render = True; zc.visible_camera = False
sal = bpy.data.objects["Salvar"]; sal.modifiers.new("Carpisma", 'COLLISION'); sal.collision.thickness_outer = 0.004

# ------------------------------------------------------------------ kumaş ayarları
def kumas(ob, igne, kutle, gerilme, egilme, kalite=8, sonum=5.0, kendi=False):
    # kumaş: armature'dan sonra, katılaştırmadan önce
    cl = ob.modifiers.new("Kumas", 'CLOTH')
    bpy.context.view_layer.objects.active = ob
    while ob.modifiers.find("Kumas") > 1:
        bpy.ops.object.modifier_move_up(modifier="Kumas")
    s = cl.settings
    s.quality = kalite; s.mass = kutle; s.air_damping = 1.0
    s.tension_stiffness = gerilme; s.compression_stiffness = gerilme; s.shear_stiffness = gerilme * 0.4
    s.bending_stiffness = egilme; s.tension_damping = sonum; s.compression_damping = sonum; s.bending_damping = 0.5
    s.vertex_group_mass = igne; s.pin_stiffness = 1.0
    c = cl.collision_settings; c.use_collision = True; c.distance_min = 0.004; c.collision_quality = 3
    c.use_self_collision = kendi
    if kendi: c.self_distance_min = 0.003
    cl.point_cache.frame_start = 1; cl.point_cache.frame_end = 400
    return cl
# entari: gövde kısmı zırh altında sabit; yen omuzdan dirseğe gevşer, yen ağzı bileğe hafif iğneli
en = bpy.data.objects["Entari"]
ig = en.vertex_groups.get("igne") or en.vertex_groups.new(name="igne")
kol_g = [en.vertex_groups.get(n) for n in ("upperarm_l", "upperarm_r", "lowerarm_l", "lowerarm_r", "hand_l", "hand_r")]
idx = {vg.index: vg.name for vg in en.vertex_groups}
for v in en.data.vertices:
    w = {idx[gg.group]: gg.weight for gg in v.groups}
    ust = w.get("upperarm_l", 0) + w.get("upperarm_r", 0); alt = w.get("lowerarm_l", 0) + w.get("lowerarm_r", 0) + w.get("hand_l", 0) + w.get("hand_r", 0)
    kol = ust + alt
    pin = 1.0 - min(1.0, kol) * 0.92
    if alt > 0.3:
        # bilek halkası: el kemiğine yakınlık
        pin = max(pin, 0.55 * w.get("hand_l", 0) * 3 + 0.55 * w.get("hand_r", 0) * 3)
    ig.add([v.index], max(0.0, min(1.0, pin)), 'REPLACE')
kumas(en, "igne", 0.25, 15.0, 0.7, kalite=10)
et = bpy.data.objects["EntariEtek"]; kumas(et, "igne", 0.35, 18.0, 0.9, kalite=10)
bo = bpy.data.objects["Boyunluk"]; kumas(bo, "igne", 1.4, 60.0, 0.15, kalite=8, sonum=8.0)

# ------------------------------------------------------------------ kameralar
def kamera(ad, konum, hedef, lens, f_stop, odak=None):
    cd = bpy.data.cameras.new(ad); cam = bpy.data.objects.new(ad, cd); sc.collection.objects.link(cam)
    cd.lens = lens; cd.sensor_fit = 'AUTO'; cd.sensor_width = 36
    cam.location = konum; cam.rotation_euler = (Vector(hedef) - Vector(konum)).to_track_quat('-Z', 'Y').to_euler()
    cd.dof.use_dof = True; cd.dof.aperture_fstop = f_stop; cd.dof.aperture_blades = 7
    cd.dof.focus_distance = (Vector(odak or hedef) - Vector(konum)).length
    return cam
kamera("KamBoy", (-3.05, -2.75, 1.02), (0.04, -0.14, 0.97), 52, 3.2, odak=(0.0, -0.15, 1.1))
kamera("KamTest", (-1.6, -3.2, 1.0), (0.0, -0.05, 0.92), 45, 5.6)
# yakın plan: göğüs hizasında dönen kamera (boş nesneye bağlı), 6 sn'de ~38° yay + hafif yaklaşma
piv = bpy.data.objects.new("YakinPivot", None); sc.collection.objects.link(piv); piv.location = (-0.05, -0.18, 1.33)
yk = kamera("KamYakin", (-0.05 - 0.55, -0.18 - 1.05, 1.42), (-0.05, -0.18, 1.33), 70, 2.4)
yk.parent = piv; yk.location = (-0.55, -1.05, 0.09)
yk.rotation_euler = (Vector((0, 0, 0)) - Vector((-0.55, -1.05, 0.09))).to_track_quat('-Z', 'Y').to_euler()
piv.rotation_euler = (0, 0, math.radians(-12)); piv.keyframe_insert("rotation_euler", frame=1)
piv.rotation_euler = (0, 0, math.radians(26)); piv.keyframe_insert("rotation_euler", frame=144)
for fc in piv.animation_data.action.fcurves:
    for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'; kp.easing = 'EASE_IN_OUT'
sc.camera = bpy.data.objects["KamBoy"]

# ------------------------------------------------------------------ render ayarları
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'
sc.cycles.samples = 64; sc.cycles.use_adaptive_sampling = True; sc.cycles.adaptive_threshold = 0.025
sc.cycles.use_denoising = True; sc.cycles.denoiser = 'OPENIMAGEDENOISE'; sc.cycles.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
sc.cycles.max_bounces = 6; sc.cycles.diffuse_bounces = 3; sc.cycles.glossy_bounces = 3; sc.cycles.transmission_bounces = 4
sc.cycles.transparent_max_bounces = 16; sc.cycles.caustics_reflective = False; sc.cycles.caustics_refractive = False
sc.cycles.sample_clamp_indirect = 6.0; sc.cycles.blur_glossy = 1.0
sc.render.use_persistent_data = True
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 720, 1280, 100
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = 0.25
sc.render.film_transparent = False
sc.render.use_motion_blur = True; sc.render.motion_blur_shutter = 0.5
sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'
bpy.ops.wm.save_as_mainfile(filepath=out)
print("KAYDEDILDI", out)
