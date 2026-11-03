# Kalite kanıtı 1/5 — gerçekçi Selçuklu piyadesi gövdesi (MPFB/MakeHuman, CC0 çıktı).
# Kullanım: blender -b --python k01_karakter.py -- <cikti.blend>
# Yetişkin erkek ~35 yaş, game_engine iskeleti (UE adlı 53 kemik: parmaklar 3 eklem).
# Yüz: hafif kemerli burun, belirgin elmacık, kalın kaş kemeri, küçük asimetri.
import bpy, sys, os
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

out = sys.argv[sys.argv.index('--') + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)
D = LocationService.get_user_data()
SYS = LocationService.get_mpfb_data("targets")
P = lambda *a: os.path.join(D, *a)

# 35 yaş: MakeHuman yaş eğrisi 0.5=25, 1.0=90 -> 0.5 + 10/65*0.5 = 0.577
macro = {"gender": 1.0, "age": 0.577, "muscle": 0.66, "weight": 0.56, "proportions": 0.62,
         "height": 0.52, "cupsize": 0.5, "firmness": 0.5,
         "race": {"asian": 0.28, "caucasian": 0.68, "african": 0.04}}
body = HumanService.create_human(macro_detail_dict=macro)
body.name = "Piyade"

YUZ = {  # hedef: ağırlık (0..1). Dönem ve bölge: Orta Anadolu Türkmen/yerli karışımı yetişkin erkek.
    "nose/nose-hump-incr": 0.45, "nose/nose-curve-convex": 0.25, "nose/nose-scale-vert-incr": 0.2,
    "nose/nose-point-width-incr": 0.15, "nose/nose-flaring-incr": 0.2, "nose/nose-volume-incr": 0.15,
    "cheek/l-cheek-bones-incr": 0.45, "cheek/r-cheek-bones-incr": 0.40,
    "cheek/l-cheek-volume-decr": 0.35, "cheek/r-cheek-volume-decr": 0.35,
    "chin/chin-width-incr": 0.3, "chin/chin-jaw-drop-incr": 0.15, "chin/chin-prominent-incr": 0.2,
    "forehead/forehead-nubian-incr": 0.25, "forehead/forehead-temple-decr": 0.2,
    "eyebrows/eyebrows-trans-down": 0.35, "eyebrows/eyebrows-angle-down": 0.25,
    "eyes/l-eye-bag-incr": 0.25, "eyes/r-eye-bag-incr": 0.3,
    "eyes/l-eye-height2-decr": 0.15, "eyes/r-eye-height2-decr": 0.15,
    "eyes/l-eye-eyefold-down": 0.2, "eyes/r-eye-eyefold-down": 0.2,
    "mouth/mouth-lowerlip-volume-incr": 0.15, "mouth/mouth-upperlip-volume-decr": 0.15,
    "mouth/mouth-angles-down": 0.15, "mouth/mouth-laugh-lines-in": 0.2,
    "neck/neck-scale-horiz-incr": 0.35, "neck/neck-scale-depth-incr": 0.2,
    "head/head-square": 0.3, "head/head-fat-decr": 0.2,
    # küçük asimetri: kusursuz bakışımlı yüz bilgisayar işi görünür
    "asym/asym-nose-2-l": 0.35, "asym/asym-brown-1-r": 0.3, "asym/asym-jaw-1-l": 0.25,
    "asym/asym-mouth-1-r": 0.25, "asym/asym-eye-3-l": 0.2, "asym/asym-cheek-1-r": 0.2,
}
for t, w in YUZ.items():
    f = os.path.join(SYS, t + ".target.gz")
    if os.path.isfile(f):
        TargetService.load_target(body, f, weight=w)
    else:
        print("HEDEF YOK", t)

rig = HumanService.add_builtin_rig(body, "game_engine")
rig.name = "Iskelet"
skin = "jartur69_middleage_slavic_male_with_genitals_and_beard/jartur69_middleage_slavic_male_with_genitals_and_beard.mhmat"
HumanService.set_character_skin(P("skins", skin), body, skin_type="ENHANCED_SSS")


def add(path, kind, mat="MAKESKIN", sub=1):
    if not os.path.isfile(path):
        print("YOK", path)
        return None
    return HumanService.add_mhclo_asset(path, body, asset_type=kind, subdiv_levels=sub, material_type=mat)


gozler = add(P("eyes", "high-poly", "high-poly.mhclo"), "eyes", "PROCEDURAL_EYES")
kas = add(P("eyebrows", "eyebrow007", "eyebrow007.mhclo"), "eyebrows")
kirpik = add(P("eyelashes", "eyelashes02", "eyelashes02.mhclo"), "eyelashes") or \
    add(P("eyelashes", "eyelashes01", "eyelashes01.mhclo"), "eyelashes")
add(P("teeth", "teeth_base", "teeth_base.mhclo"), "teeth")
add(P("tongue", "tongue01", "tongue01.mhclo"), "tongue")
import bmesh, math, mathutils
import numpy as np
# hedefleri (şekil anahtarları) gövdeye kalıcı işle: kıl kökleri ve dinlenme konumu tutarlı olsun
TargetService.bake_targets(body)
print("SEKIL ANAHTARI", body.data.shape_keys)

# --- yardımcı geometriyi kalıcı sil (maske yerine): parçacık sakal ve ağırlık aktarımı temiz çalışsın
body.modifiers.remove(body.modifiers["Hide helpers"])
gi = body.vertex_groups["body"].index
bm = bmesh.new(); bm.from_mesh(body.data); dl = bm.verts.layers.deform.verify()
sil = [v for v in bm.verts if gi not in v[dl] or v[dl][gi] < 0.5]
bmesh.ops.delete(bm, geom=sil, context='VERTS'); bm.to_mesh(body.data); bm.free()
for vg in list(body.vertex_groups):
    if vg.name.startswith(("helper-", "joint-")) or vg.name in ("HelperGeometry", "JointCubes"):
        body.vertex_groups.remove(vg)
print("GOVDE KOSE", len(body.data.vertices))

# --- cilt malzemesi: güneş görmüş ten, gözenek kabartısı, pürüzlülük çeşitliliği, rastgele yürüyüş SSS
diff_yol = P("skins", os.path.dirname(skin), "Jartur_mid_old_Slavic_Male_with_Genitals_and_Beard_lsdif_lighter.png")
img = bpy.data.images.load(diff_yol, check_existing=True)


def cilt_malzeme(ad, dudak=False, tirnak=False):
    m = bpy.data.materials.new(ad); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links; N.clear()
    out = N.new('ShaderNodeOutputMaterial'); bs = N.new('ShaderNodeBsdfPrincipled')
    L.new(bs.outputs[0], out.inputs[0])
    uv = N.new('ShaderNodeUVMap'); uv.uv_map = "UVMap"
    tx = N.new('ShaderNodeTexImage'); tx.image = img; tx.interpolation = 'Cubic'
    L.new(uv.outputs[0], tx.inputs[0])
    hs = N.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 1.18
    hs.inputs['Value'].default_value = 0.9; hs.inputs['Hue'].default_value = 0.505
    L.new(tx.outputs[0], hs.inputs['Color'])
    ten = N.new('ShaderNodeMix'); ten.data_type = 'RGBA'; ten.blend_type = 'MULTIPLY'
    ten.inputs['Factor'].default_value = 0.62; ten.inputs[7].default_value = (0.80, 0.60, 0.45, 1)
    L.new(hs.outputs[0], ten.inputs[6])
    # lekelenme / kızarıklık: düşük frekanslı gürültü
    tc = N.new('ShaderNodeTexCoord')
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 18; nz.inputs['Detail'].default_value = 4
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    kz = N.new('ShaderNodeMix'); kz.data_type = 'RGBA'; kz.blend_type = 'MULTIPLY'
    kz.inputs[7].default_value = (0.93, 0.80, 0.76, 1)
    rmp = N.new('ShaderNodeMapRange'); rmp.inputs['From Min'].default_value = 0.45; rmp.inputs['From Max'].default_value = 0.75
    rmp.inputs['To Max'].default_value = 0.35
    L.new(nz.outputs['Fac'], rmp.inputs['Value']); L.new(rmp.outputs[0], kz.inputs['Factor'])
    L.new(ten.outputs[2], kz.inputs[6])
    L.new(kz.outputs[2], bs.inputs['Base Color'])
    bs.inputs['Subsurface Weight'].default_value = 1.0
    bs.inputs['Subsurface Radius'].default_value = (1.0, 0.38, 0.2)
    bs.inputs['Subsurface Scale'].default_value = 0.0045
    m.node_tree.nodes[bs.name].subsurface_method = 'RANDOM_WALK_SKIN'
    bs.inputs['Specular IOR Level'].default_value = 0.42
    bs.inputs['IOR'].default_value = 1.4
    # pürüzlülük: 0.42-0.62 arası, gözenek ölçeğinde değişim
    vor = N.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 900
    vor.feature = 'F1'; L.new(tc.outputs['Object'], vor.inputs['Vector'])
    nz2 = N.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 260; nz2.inputs['Detail'].default_value = 6
    L.new(tc.outputs['Object'], nz2.inputs['Vector'])
    rr = N.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = 0.40 if not dudak else 0.32
    rr.inputs['To Max'].default_value = 0.62 if not dudak else 0.45
    L.new(nz2.outputs['Fac'], rr.inputs['Value']); L.new(rr.outputs[0], bs.inputs['Roughness'])
    # gözenek + ince kırışık kabartısı
    bp1 = N.new('ShaderNodeBump'); bp1.inputs['Strength'].default_value = 0.22; bp1.inputs['Distance'].default_value = 0.00025
    L.new(vor.outputs['Distance'], bp1.inputs['Height'])
    bp2 = N.new('ShaderNodeBump'); bp2.inputs['Strength'].default_value = 0.12; bp2.inputs['Distance'].default_value = 0.0004
    L.new(nz2.outputs['Fac'], bp2.inputs['Height']); L.new(bp1.outputs[0], bp2.inputs['Normal'])
    L.new(bp2.outputs[0], bs.inputs['Normal'])
    bs.inputs['Sheen Weight'].default_value = 0.06; bs.inputs['Sheen Roughness'].default_value = 0.35
    if tirnak:
        bs.inputs['Subsurface Weight'].default_value = 0.3; rr.inputs['To Min'].default_value = 0.25; rr.inputs['To Max'].default_value = 0.35
    return m


cilt = cilt_malzeme("Cilt"); dudak = cilt_malzeme("Dudak", dudak=True); tirnak = cilt_malzeme("Tirnak", tirnak=True)
for i, slot in enumerate(body.material_slots):
    ad = slot.material.name if slot.material else ""
    slot.material = dudak if "lips" in ad else (tirnak if "nails" in ad else cilt)

# --- gözler: koyu kahve iris, ıslak kornea
em = bpy.data.materials.get("Piyade.high-poly")
if em:
    g = em.node_tree.nodes.get("EnhancedEye")
    if g:
        g.inputs['IrisMajorColor'].default_value = (0.11, 0.055, 0.022, 1)
        g.inputs['IrisMinorColor'].default_value = (0.035, 0.018, 0.008, 1)
        g.inputs['IrisSection4Color'].default_value = (0.02, 0.012, 0.006, 1)
        g.inputs['EyeWhiteColor'].default_value = (0.86, 0.80, 0.74, 1)
        g.inputs['PupilSize'].default_value = 0.34
        g.inputs['Clearcoat'].default_value = 0.8

# --- sakal yoğunluğu: boyalı sakal dokusunun koyuluğu + baş bölgesi + gözün altı
pix = np.array(img.pixels[:], dtype=np.float32).reshape(img.size[1], img.size[0], 4)
lum_v = np.zeros(len(body.data.vertices)); say = np.zeros(len(body.data.vertices))
uvl = body.data.uv_layers["UVMap"].data
for poly in body.data.polygons:
    for li in poly.loop_indices:
        u, v = uvl[li].uv; vi = body.data.loops[li].vertex_index
        x = min(int(u * img.size[0]), img.size[0] - 1); y = min(int(v * img.size[1]), img.size[1] - 1)
        c = pix[y, x]; lum_v[vi] += 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; say[vi] += 1
lum_v /= np.maximum(say, 1)
hb = rig.data.bones["head"]; nb = rig.data.bones["neck_01"]
goz_z = 1.585  # yaklaşık; aşağıda göz nesnesinden düzeltilir
if gozler:
    goz_z = min(v.co.z for v in gozler.data.vertices) + 0.004
hgi = body.vertex_groups["head"].index; ngi = body.vertex_groups["neck_01"].index
sak = body.vertex_groups.new(name="sakal"); boy = body.vertex_groups.new(name="sakal_boy")
lip_idx = [i for i, s in enumerate(body.material_slots) if s.material and s.material.name == "Dudak"]
dudak_v = set()
for poly in body.data.polygons:
    if poly.material_index in lip_idx:
        dudak_v.update(poly.vertices)
# Geometrik sakal maskesi (dinlenme konumu, yüz -Y'ye bakar). Ölçüler gövdeden: dudak/kulak kutuları.
kulak_v = set()
for poly in body.data.polygons:
    if poly.material_index == 5:
        kulak_v.update(poly.vertices)
lz0 = min(body.data.vertices[i].co.z for i in dudak_v); lz1 = max(body.data.vertices[i].co.z for i in dudak_v)
lx = max(abs(body.data.vertices[i].co.x) for i in dudak_v)
burun_alt = lz1 + 0.014
def yumusak(t):
    t = min(max(t, 0.0), 1.0); return t * t * (3 - 2 * t)
for v in body.data.vertices:
    co = v.co; ax = abs(co.x)
    if v.index in dudak_v or v.index in kulak_v or co.z < 1.44 or co.z > 1.61:
        continue
    # dudak çevresi boşluğu (2.5 mm)
    if lz0 - 0.0035 < co.z < lz1 + 0.0025 and ax < lx + 0.004 and co.y < -0.12:
        continue
    if co.y > -0.025:
        continue
    ust = burun_alt + 0.32 * max(0.0, ax - 0.026)
    if ax > 0.068 and co.y > -0.075:
        ust = 1.603  # favori: kulak önü
    w = yumusak((ust - co.z) / 0.006)
    if co.z < 1.50:  # çene altı ve boyun önü: aşağıda yumuşak biter
        w *= yumusak((co.z - 1.455) / 0.018) * yumusak((-0.03 - co.y) / 0.012)
    w *= yumusak((-0.025 - co.y) / 0.012)
    if w <= 0.02:
        continue
    if co.z > burun_alt - 0.004 and ax < 0.03:
        w *= 0.0 if co.z > burun_alt + 0.002 else 1.0
    sak.add([v.index], w, 'REPLACE')
    if co.z < 1.51: uz = 1.0
    elif co.z < lz1: uz = 0.75
    elif co.z < ust - 0.006 and ax > 0.03: uz = 0.45
    else: uz = 0.3
    boy.add([v.index], uz, 'REPLACE')
print("SAKAL KOSE", sum(1 for v in body.data.vertices for g in v.groups if g.group == sak.index))

# --- kıl üretimi: Blender "Curves" kılları (Cycles eğri ilkeli), kökler yüzey UV'sine bağlı,
# "Deform Curves on Surface" ile kemik hareketini izler. Kökler yoğunluk haritasına göre rastgele (tohum sabit).
from mathutils.bvhtree import BVHTree
import random
rnd = random.Random(1243)
me = body.data; me.calc_loop_triangles()
bvh = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [p.vertices[:] for p in me.polygons])
wd = {}
for v in me.vertices:
    for g in v.groups:
        if g.group == sak.index: wd[v.index] = g.weight
wl = {}
for v in me.vertices:
    for g in v.groups:
        if g.group == boy.index: wl[v.index] = g.weight
uvd = me.uv_layers["UVMap"].data


def ornekle(yogunluk_f, toplam):
    """Üçgen alanı x yoğunluk ile orantılı kök örnekleme. Döner: (konum, normal, uv, vidx-ağırlık)"""
    tri = []
    for lt in me.loop_triangles:
        d = yogunluk_f(lt)
        if d > 0: tri.append((lt, lt.area * d))
    tw = sum(w for _, w in tri) or 1
    kok = []
    for lt, w in tri:
        n_f = toplam * w / tw; n = int(n_f) + (1 if rnd.random() < n_f - int(n_f) else 0)
        for _ in range(n):
            a, b_ = rnd.random(), rnd.random()
            if a + b_ > 1: a, b_ = 1 - a, 1 - b_
            c = 1 - a - b_; bc = (c, a, b_)
            vs = lt.vertices; ls = lt.loops
            co = sum((me.vertices[vs[i]].co * bc[i] for i in range(3)), mathutils.Vector())
            nr = sum((me.vertices[vs[i]].normal * bc[i] for i in range(3)), mathutils.Vector()).normalized()
            uv = sum((mathutils.Vector(uvd[ls[i]].uv) * bc[i] for i in range(3)), mathutils.Vector((0, 0)))
            lf = sum(wl.get(vs[i], 0.5) * bc[i] for i in range(3))
            kok.append((co, nr, uv, lf))
    return kok


def tel(co, nr, yon, uzun, nokta, egim, sert):
    """Tek kıl: kökten yön boyunca, her parçada yerçekimine doğru eğilen, deriye girmeyen eğri."""
    pts = [co + nr * 0.0002]; d = yon.normalized(); seg = uzun / (nokta - 1)
    g = mathutils.Vector((0, 0, -1))
    for k in range(1, nokta):
        d = (d + g * egim + mathutils.Vector((rnd.gauss(0, sert), rnd.gauss(0, sert), rnd.gauss(0, sert)))).normalized()
        p = pts[-1] + d * seg
        loc, nn, _, dist = bvh.find_nearest(p)
        if loc is not None and (p - loc).dot(nn) < 0.0012:
            p = loc + nn * 0.0012
            d = (p - pts[-1]).normalized()
        pts.append(p)
    return pts


def egri_nesne(ad, teller, kokuv, r0, r1, malz):
    cv = bpy.data.hair_curves.new(ad)
    n = len(teller[0])
    cv.add_curves([n] * len(teller))
    flat = [c for t in teller for p in t for c in p]
    cv.position_data.foreach_set("vector", flat)
    rad = cv.attributes.new("radius", 'FLOAT', 'POINT') if "radius" not in cv.attributes else cv.attributes["radius"]
    rad.data.foreach_set("value", [r0 + (r1 - r0) * (k / (n - 1)) ** 0.8 for _ in teller for k in range(n)])
    su = cv.attributes.new("surface_uv_coordinate", 'FLOAT2', 'CURVE')
    su.data.foreach_set("vector", [c for uv in kokuv for c in uv])
    cv.surface = body; cv.surface_uv_map = "UVMap"
    cv.materials.append(malz)
    ob = bpy.data.objects.new(ad, cv); bpy.context.scene.collection.objects.link(ob)
    gn = bpy.data.node_groups.new(ad + "_yuzey", 'GeometryNodeTree')
    gn.interface.new_socket("Geometry", in_out='INPUT', socket_type='NodeSocketGeometry')
    gn.interface.new_socket("Geometry", in_out='OUTPUT', socket_type='NodeSocketGeometry')
    gi_ = gn.nodes.new('NodeGroupInput'); go_ = gn.nodes.new('NodeGroupOutput')
    dc = gn.nodes.new('GeometryNodeDeformCurvesOnSurface')
    gn.links.new(gi_.outputs[0], dc.inputs[0]); gn.links.new(dc.outputs[0], go_.inputs[0])
    md = ob.modifiers.new("YuzeyIzle", 'NODES'); md.node_group = gn
    return ob


def kil_malz(ad, melanin, kizil, rough, rnd_renk):
    hm = bpy.data.materials.new(ad); hm.use_nodes = True
    hn = hm.node_tree.nodes; hn.clear()
    ho = hn.new('ShaderNodeOutputMaterial'); hb_ = hn.new('ShaderNodeBsdfHairPrincipled')
    hb_.parametrization = 'MELANIN'
    hb_.inputs['Melanin'].default_value = melanin; hb_.inputs['Melanin Redness'].default_value = kizil
    hb_.inputs['Roughness'].default_value = rough; hb_.inputs['Radial Roughness'].default_value = 0.4
    hb_.inputs['Coat'].default_value = 0.1; hb_.inputs['Random Color'].default_value = rnd_renk
    hb_.inputs['Random Roughness'].default_value = 0.25
    hm.node_tree.links.new(hb_.outputs[0], ho.inputs[0])
    return hm


body.add_rest_position_attribute = True
burun_z = goz_z - 0.045
def sakal_yog(lt):
    return sum(wd.get(i, 0.0) for i in lt.vertices) / 3.0
koks = ornekle(sakal_yog, 42000)
teller, uvs = [], []
for co, nr, uv, lf in koks:
    asagi = mathutils.Vector((0, 0, -1)); t = asagi - nr * asagi.dot(nr)
    if t.length < 0.25:  # çene altı: boyna doğru
        geri = mathutils.Vector((0, 1, -0.4)); t = geri - nr * geri.dot(nr)
    t.normalize()
    biyik = lz1 - 0.002 < co.z < burun_alt + 0.002 and abs(co.x) < 0.034 and co.y < -0.12
    if biyik:  # bıyık: aşağı ve yana, dudağa değmeden
        yn = mathutils.Vector((0.9 if co.x > 0 else -0.9, -0.2, -1.0)); t = (yn - nr * yn.dot(nr)).normalized()
        uz = 0.016 * rnd.uniform(0.8, 1.15); yon = t * 0.85 + nr * 0.3
    else:
        uz = (0.008 + 0.034 * lf) * rnd.uniform(0.75, 1.12); yon = t * 0.72 + nr * 0.42
    teller.append(tel(co, nr, yon, uz, 6, 0.12, 0.10)); uvs.append(uv)
# topaklanma: komşu tellerin uçları ortak bir merkeze %30 çekilir (doğal sakal tutamları)
from mathutils.kdtree import KDTree
M = max(1, len(teller) // 14); merk = rnd.sample(range(len(teller)), M)
kd = KDTree(M)
for i, ti in enumerate(merk): kd.insert(teller[ti][0], i)
kd.balance()
for t in teller:
    _, j, _ = kd.find(t[0]); g = teller[merk[j]]
    for k in range(2, len(t)):
        w = 0.3 * (k / (len(t) - 1)) ** 1.5
        t[k] = t[k].lerp(t[0] + (g[k] - g[0]), w)
sakal_m = kil_malz("SakalKil", 0.9, 0.3, 0.4, 0.2)
egri_nesne("Sakal", teller, uvs, 0.000055, 0.000018, sakal_m)
print("SAKAL TEL", len(teller))

# kaşlar: kaş kartının altındaki deri üçgenlerinde kök; iç uçtan dışa, deriye yatık
if kas:
    kb = BVHTree.FromObject(kas, bpy.context.evaluated_depsgraph_get())
    def kas_yog(lt):
        c = lt.center; loc, nn, _, d = kb.find_nearest(c)
        return 1.0 if (d is not None and d < 0.0045) else 0.0
    kk = ornekle(kas_yog, 1500); kt, ku = [], []
    for co, nr, uv, lf in kk:
        dis = mathutils.Vector((1 if co.x > 0 else -1, 0, 0))
        ic = min(abs(co.x) / 0.05, 1.0)
        yn = dis + mathutils.Vector((0, 0, 0.55 * (1 - ic) - 0.25 * ic))
        t = (yn - nr * yn.dot(nr)).normalized()
        kt.append(tel(co, nr, t + nr * 0.25, rnd.uniform(0.007, 0.011), 4, 0.04, 0.12)); ku.append(uv)
    egri_nesne("Kas", kt, ku, 0.00004, 0.000015, kil_malz("KasKil", 0.92, 0.25, 0.38, 0.15))
    bpy.data.objects.remove(kas, do_unlink=True)
    print("KAS TEL", len(kt))
# değiştirici sırası: Armature -> Sakal (parçacık deforme yüzeyi izler) -> alt bölüm (yalnız render)
sd = body.modifiers.new("AltBolum", 'SUBSURF'); sd.levels = 0; sd.render_levels = 1
for o in bpy.data.objects:
    print("NESNE", o.name, o.type, len(o.data.vertices) if o.type == 'MESH' else '')
bpy.ops.wm.save_as_mainfile(filepath=out)
print("KAYDEDILDI", out)
