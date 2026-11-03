# Kalite kanıtı 4/5 — giysi ve zırh (dinlenme duruşunda kurulur, aynı iskelete ağırlıklanır).
# Kullanım: blender -b in.blend --python k04_kiyafet.py -- out.blend <kaynak_klasoru>
# Katmanlar (içten dışa): keten/yün entari (yırtmaçlı etek, bol yen) + yün şalvar, deri çizme,
# lamel zırh (Geometry Nodes ile tek tek plaka, sıra başına deri bağ şeridi), deri kemer + kılıç askısı + kın,
# konik miğfer (burun siperli, pirinç alın bandı) + kapitone başlık kenarı + zincir boyunluk (zincir doku/opaklık).
# Kumaş parçaları (etek, yen, boyunluk) render sahnesinde kumaş benzetimiyle (k05) hareket eder; burada
# şalvar ve gövde bölümü dinlenmede kumaş benzetimiyle oturtulup kırışıkları sabitlenir.
import bpy, bmesh, sys, os, math, json, random
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

argv = sys.argv[sys.argv.index('--') + 1:]
out, KAY = argv[0], argv[1]
TEX = os.path.join(KAY, "tex")
rnd = random.Random(1243)
sc = bpy.context.scene
rig = bpy.data.objects["Iskelet"]; body = bpy.data.objects["Piyade"]
rig.animation_data.action = None
for pb in rig.pose.bones:
    pb.location = (0, 0, 0); pb.rotation_quaternion = (1, 0, 0, 0); pb.rotation_euler = (0, 0, 0)
bpy.context.view_layer.update()
BN = rig.data.bones
me = body.data
GR = {vg.index: vg.name for vg in body.vertex_groups}
KEMIK = set(BN.keys())

def kemik_agirlik(v):
    ws = [(GR[g.group], g.weight) for g in v.groups if GR[g.group] in KEMIK]
    t = sum(w for _, w in ws) or 1.0
    return {n: w / t for n, w in ws}
KA = [kemik_agirlik(v) for v in me.vertices]
def kol_mu(i): return sum(w for n, w in KA[i].items() if n.startswith(("upperarm", "lowerarm", "hand", "index", "middle", "ring", "pinky", "thumb"))) > 0.5
def bacak_alt(i): return sum(w for n, w in KA[i].items() if n.startswith(("calf", "foot", "ball"))) > 0.5
BV = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [p.vertices[:] for p in me.polygons])
GOVDE_KEMIK = ("pelvis", "spine_01", "spine_02", "spine_03", "clavicle_l", "clavicle_r", "neck_01")
kd_g = KDTree(len(me.vertices))
for v in me.vertices:
    if not kol_mu(v.index): kd_g.insert(v.co, v.index)
kd_g.balance()
def govde_ag(ob, bacak=0.35):
    def f(i, v):
        _, gi, _ = kd_g.find(ob.matrix_world @ v.co)
        w = {n: x for n, x in KA[gi].items() if n in GOVDE_KEMIK or n.startswith("thigh")}
        for b_ in ("thigh_l", "thigh_r"):
            if b_ in w: w[b_] *= bacak
        t = sum(w.values()) or 1
        return {n: x / t for n, x in w.items()}
    return f

def nesne(ad, mesh):
    ob = bpy.data.objects.new(ad, mesh); sc.collection.objects.link(ob); return ob

def iskelete_bagla(ob, agirlik_f=None):
    """Armature değiştiricisi; ağırlıklar: verilmişse fonksiyondan, yoksa gövdeden en yakın yüz enterpolasyonu."""
    ob.parent = rig
    if agirlik_f is None:
        dt = ob.modifiers.new("AgirlikAktar", 'DATA_TRANSFER'); dt.object = body
        dt.use_vert_data = True; dt.data_types_verts = {'VGROUP_WEIGHTS'}; dt.vert_mapping = 'POLYINTERP_NEAREST'
        dt.layers_vgroup_select_src = 'ALL'; dt.layers_vgroup_select_dst = 'NAME'
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.datalayout_transfer(modifier=dt.name)
        bpy.ops.object.modifier_apply(modifier=dt.name)
        for vg in list(ob.vertex_groups):
            if vg.name not in KEMIK: ob.vertex_groups.remove(vg)
    else:
        for i, v in enumerate(ob.data.vertices):
            for n, w in agirlik_f(i, v).items():
                if w <= 0.001: continue
                vg = ob.vertex_groups.get(n) or ob.vertex_groups.new(name=n)
                vg.add([i], w, 'REPLACE')
    md = ob.modifiers.new("Iskelet", 'ARMATURE'); md.object = rig
    # armature en başta
    while ob.modifiers.find("Iskelet") > 0:
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_move_up(modifier="Iskelet")
    return ob

def gövde_kabugu(ad, sec, kalin_f, yumusat=0, kopru=None):
    """Gövde yüzlerinden kabuk: sec(poly)->bool, kalin_f(koordinat, normal, indeks)->öteleme. Köşe grupları korunur."""
    bm = bmesh.new(); bm.from_mesh(me)
    gl = bm.verts.layers.int.new("govde_i")
    for v in bm.verts: v[gl] = v.index
    sil = [f for f in bm.faces if not sec(f)]
    bmesh.ops.delete(bm, geom=sil, context='FACES')
    bm.normal_update()
    nm = bpy.data.meshes.new(ad); bm.to_mesh(nm); bm.free()
    ob = nesne(ad, nm)
    # köşe grupları: bmesh gövdenin ağırlık katmanını (grup sırasıyla) taşır -> aynı sırada grup aç
    for vg in body.vertex_groups:
        ob.vertex_groups.new(name=vg.name)
    for vg in list(ob.vertex_groups):
        if vg.name not in KEMIK: ob.vertex_groups.remove(vg)
    gi_ = [0] * len(nm.vertices); nm.attributes["govde_i"].data.foreach_get("value", gi_)
    for v in nm.vertices:
        v.co = v.co + v.normal * kalin_f(v.co, v.normal, gi_[v.index])
    if yumusat:
        sm = ob.modifiers.new("Yumusat", 'SMOOTH'); sm.factor = 0.5; sm.iterations = yumusat
        bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier=sm.name)
    ob.parent = rig
    md = ob.modifiers.new("Iskelet", 'ARMATURE'); md.object = rig
    return ob

def dinlenme_konumu(ob):
    """Doku eşlemesi için dinlenme konumu özniteliği (deformasyonla kaymayan kutu izdüşümü)."""
    a = ob.data.attributes.get("dinlenme") or ob.data.attributes.new("dinlenme", 'FLOAT_VECTOR', 'POINT')
    a.data.foreach_set("vector", [c for v in ob.data.vertices for c in v.co])

# =================================================================== malzemeler
def img(p, renk=False):
    im = bpy.data.images.load(p, check_existing=True)
    if not renk: im.colorspace_settings.name = 'Non-Color'
    return im

def doku_dugum(N, L, klasor, harita, vec, renkli=False, kutu=True):
    t = N.new('ShaderNodeTexImage'); t.image = img(os.path.join(TEX, klasor, harita), renkli)
    if kutu: t.projection = 'BOX'; t.projection_blend = 0.3
    L.new(vec, t.inputs[0]); return t

def malz_kumas(ad, renk, klasor, olcek, sheen=0.35, kir_alt=0.35, desen_kontrast=0.6, rough=(0.75, 0.95)):
    """Kumaş: dokunun ışıklılığı boya rengiyle çarpılır; tüy parlaklığı (sheen); etekte toz/kir; renk dalgalanması."""
    m = bpy.data.materials.new(ad); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; bs = N["Principled BSDF"]
    at = N.new('ShaderNodeAttribute'); at.attribute_name = "dinlenme"
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (olcek,) * 3
    L.new(at.outputs['Vector'], mp.inputs['Vector'])
    dif = doku_dugum(N, L, klasor, "Diffuse.jpg", mp.outputs[0], True)
    ro = doku_dugum(N, L, klasor, "Rough.jpg", mp.outputs[0])
    no = doku_dugum(N, L, klasor, "nor_gl.jpg", mp.outputs[0])
    bw = N.new('ShaderNodeRGBToBW'); L.new(dif.outputs[0], bw.inputs[0])
    kon = N.new('ShaderNodeMapRange'); kon.inputs['From Min'].default_value = 0.1; kon.inputs['From Max'].default_value = 0.9
    kon.inputs['To Min'].default_value = 1 - desen_kontrast; kon.inputs['To Max'].default_value = 1.0
    L.new(bw.outputs[0], kon.inputs['Value'])
    # boya dalgalanması (elle boyanmış kumaş eşit değildir)
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 6; nz.inputs['Detail'].default_value = 3
    L.new(at.outputs['Vector'], nz.inputs['Vector'])
    dal = N.new('ShaderNodeMix'); dal.data_type = 'RGBA'; dal.inputs['Factor'].default_value = 0.0
    dr = N.new('ShaderNodeMapRange'); dr.inputs['To Min'].default_value = 0.0; dr.inputs['To Max'].default_value = 0.22
    L.new(nz.outputs['Fac'], dr.inputs['Value']); L.new(dr.outputs[0], dal.inputs['Factor'])
    dal.inputs[6].default_value = renk; dal.inputs[7].default_value = tuple(c * 0.72 for c in renk[:3]) + (1,)
    car = N.new('ShaderNodeMix'); car.data_type = 'RGBA'; car.blend_type = 'MULTIPLY'; car.inputs['Factor'].default_value = 1.0
    L.new(dal.outputs[2], car.inputs[6])
    gri = N.new('ShaderNodeCombineColor'); L.new(kon.outputs[0], gri.inputs[0]); L.new(kon.outputs[0], gri.inputs[1]); L.new(kon.outputs[0], gri.inputs[2])
    L.new(gri.outputs[0], car.inputs[7])
    # alttan toz: z dinlenme yüksekliği
    sz = N.new('ShaderNodeSeparateXYZ'); L.new(at.outputs['Vector'], sz.inputs[0])
    tz = N.new('ShaderNodeMapRange'); tz.inputs['From Min'].default_value = 0.75; tz.inputs['From Max'].default_value = 0.35
    tz.inputs['To Max'].default_value = kir_alt; L.new(sz.outputs['Z'], tz.inputs['Value'])
    nz2 = N.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 25; nz2.inputs['Detail'].default_value = 6
    L.new(at.outputs['Vector'], nz2.inputs['Vector'])
    tzc = N.new('ShaderNodeMath'); tzc.operation = 'MULTIPLY'; L.new(tz.outputs[0], tzc.inputs[0]); L.new(nz2.outputs['Fac'], tzc.inputs[1])
    toz = N.new('ShaderNodeMix'); toz.data_type = 'RGBA'; toz.inputs[7].default_value = (0.42, 0.34, 0.25, 1)
    L.new(tzc.outputs[0], toz.inputs['Factor']); L.new(car.outputs[2], toz.inputs[6])
    L.new(toz.outputs[2], bs.inputs['Base Color'])
    rr = N.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = rough[0]; rr.inputs['To Max'].default_value = rough[1]
    L.new(ro.outputs[0], rr.inputs['Value']); L.new(rr.outputs[0], bs.inputs['Roughness'])
    nmp = N.new('ShaderNodeNormalMap'); nmp.inputs['Strength'].default_value = 1.6
    L.new(no.outputs[0], nmp.inputs['Color']); L.new(nmp.outputs[0], bs.inputs['Normal'])
    bs.inputs['Sheen Weight'].default_value = sheen; bs.inputs['Sheen Roughness'].default_value = 0.5
    bs.inputs['Sheen Tint'].default_value = tuple(min(1.0, c * 2.2) for c in renk[:3]) + (1,)
    bs.inputs['Specular IOR Level'].default_value = 0.25
    return m

def malz_deri(ad, renk, olcek=5.0, rough=0.6, asinma=0.4, klasor="brown_leather"):
    m = bpy.data.materials.new(ad); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; bs = N["Principled BSDF"]
    at = N.new('ShaderNodeAttribute'); at.attribute_name = "dinlenme"
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (olcek,) * 3
    L.new(at.outputs['Vector'], mp.inputs['Vector'])
    dif = doku_dugum(N, L, klasor, "Diffuse.jpg", mp.outputs[0], True)
    ro = doku_dugum(N, L, klasor, "Rough.jpg", mp.outputs[0])
    no = doku_dugum(N, L, klasor, "nor_gl.jpg", mp.outputs[0])
    car = N.new('ShaderNodeMix'); car.data_type = 'RGBA'; car.blend_type = 'MULTIPLY'; car.inputs['Factor'].default_value = 0.9
    L.new(dif.outputs[0], car.inputs[6]); car.inputs[7].default_value = renk
    # aşınma: girinti/çıkıntıda açık renk ve mat (pointiness Cycles'ta var)
    gi = N.new('ShaderNodeNewGeometry')
    pr = N.new('ShaderNodeMapRange'); pr.inputs['From Min'].default_value = 0.52; pr.inputs['From Max'].default_value = 0.6
    pr.inputs['To Max'].default_value = asinma; L.new(gi.outputs['Pointiness'], pr.inputs['Value'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 40; L.new(at.outputs['Vector'], nz.inputs['Vector'])
    pm = N.new('ShaderNodeMath'); pm.operation = 'MULTIPLY'; L.new(pr.outputs[0], pm.inputs[0]); L.new(nz.outputs['Fac'], pm.inputs[1])
    asn = N.new('ShaderNodeMix'); asn.data_type = 'RGBA'; asn.inputs[7].default_value = (0.42, 0.30, 0.20, 1)
    L.new(pm.outputs[0], asn.inputs['Factor']); L.new(car.outputs[2], asn.inputs[6]); L.new(asn.outputs[2], bs.inputs['Base Color'])
    rr = N.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = rough - 0.18; rr.inputs['To Max'].default_value = rough + 0.15
    L.new(ro.outputs[0], rr.inputs['Value']); L.new(rr.outputs[0], bs.inputs['Roughness'])
    nmp = N.new('ShaderNodeNormalMap'); nmp.inputs['Strength'].default_value = 0.9
    L.new(no.outputs[0], nmp.inputs['Color']); L.new(nmp.outputs[0], bs.inputs['Normal'])
    bs.inputs['Specular IOR Level'].default_value = 0.45; bs.inputs['Coat Weight'].default_value = 0.08
    return m

def malz_demir(ad, taban=(0.50, 0.49, 0.47, 1), olcek=3.0, rough=(0.32, 0.62), pas=0.25, klasor="Metal046A", on="Metal046A_2K-JPG", kenar=True):
    m = bpy.data.materials.new(ad); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; bs = N["Principled BSDF"]; bs.inputs['Metallic'].default_value = 1.0
    at = N.new('ShaderNodeAttribute'); at.attribute_name = "dinlenme"
    tc = N.new('ShaderNodeTexCoord')
    sec = N.new('ShaderNodeMix'); sec.data_type = 'VECTOR'; sec.inputs['Factor'].default_value = 0.0
    L.new(at.outputs['Vector'], sec.inputs[4]); L.new(tc.outputs['Object'], sec.inputs[5])
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (olcek,) * 3; L.new(at.outputs['Vector'], mp.inputs['Vector'])
    col = doku_dugum(N, L, klasor, on + "_Color.jpg", mp.outputs[0], True)
    ro = doku_dugum(N, L, klasor, on + "_Roughness.jpg", mp.outputs[0])
    no = doku_dugum(N, L, klasor, on + "_NormalGL.jpg", mp.outputs[0])
    car = N.new('ShaderNodeMix'); car.data_type = 'RGBA'; car.blend_type = 'MULTIPLY'; car.inputs['Factor'].default_value = 1.0
    L.new(col.outputs[0], car.inputs[6]); car.inputs[7].default_value = taban
    # kenar parlaması (pointiness) + oyuklarda kir/pas
    gi = N.new('ShaderNodeNewGeometry')
    kn = N.new('ShaderNodeMapRange'); kn.inputs['From Min'].default_value = 0.53; kn.inputs['From Max'].default_value = 0.62
    if kenar:
        L.new(gi.outputs['Pointiness'], kn.inputs['Value'])
    else:  # ince plakalarda eğrilik yanıltır: aşınma gürültüyle (kabaran kenar yerine rastgele parlak sürtünme lekeleri)
        nk = N.new('ShaderNodeTexNoise'); nk.inputs['Scale'].default_value = 140; nk.inputs['Detail'].default_value = 4
        L.new(at.outputs['Vector'], nk.inputs['Vector']); kn.inputs['From Min'].default_value = 0.6; kn.inputs['From Max'].default_value = 0.75
        L.new(nk.outputs['Fac'], kn.inputs['Value'])
    oy = N.new('ShaderNodeMapRange'); oy.inputs['From Min'].default_value = 0.49; oy.inputs['From Max'].default_value = 0.42
    oy.inputs['To Max'].default_value = pas
    if kenar: L.new(gi.outputs['Pointiness'], oy.inputs['Value'])
    else: oy.inputs['Value'].default_value = 0.5
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 30; nz.inputs['Detail'].default_value = 8
    L.new(at.outputs['Vector'], nz.inputs['Vector'])
    pr = N.new('ShaderNodeMapRange'); pr.inputs['From Min'].default_value = 0.55; pr.inputs['From Max'].default_value = 0.8
    pr.inputs['To Max'].default_value = pas * 0.8; L.new(nz.outputs['Fac'], pr.inputs['Value'])
    ps = N.new('ShaderNodeMath'); ps.operation = 'ADD'; ps.use_clamp = True; L.new(oy.outputs[0], ps.inputs[0]); L.new(pr.outputs[0], ps.inputs[1])
    kirli = N.new('ShaderNodeMix'); kirli.data_type = 'RGBA'; kirli.inputs[7].default_value = (0.09, 0.06, 0.04, 1)
    L.new(ps.outputs[0], kirli.inputs['Factor']); L.new(car.outputs[2], kirli.inputs[6])
    parl = N.new('ShaderNodeMix'); parl.data_type = 'RGBA'; parl.inputs[7].default_value = (0.78, 0.77, 0.74, 1)
    kn2 = N.new('ShaderNodeMath'); kn2.operation = 'MULTIPLY'; kn2.inputs[1].default_value = 0.55; L.new(kn.outputs[0], kn2.inputs[0])
    L.new(kn2.outputs[0], parl.inputs['Factor']); L.new(kirli.outputs[2], parl.inputs[6]); L.new(parl.outputs[2], bs.inputs['Base Color'])
    rr = N.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = rough[0]; rr.inputs['To Max'].default_value = rough[1]
    L.new(ro.outputs[0], rr.inputs['Value'])
    rk = N.new('ShaderNodeMath'); rk.operation = 'MULTIPLY_ADD'; rk.inputs[1].default_value = 0.5; L.new(ps.outputs[0], rk.inputs[0]); L.new(rr.outputs[0], rk.inputs[2])
    rk2 = N.new('ShaderNodeMath'); rk2.operation = 'MULTIPLY_ADD'; rk2.inputs[1].default_value = -0.18; rk2.use_clamp = True
    L.new(kn.outputs[0], rk2.inputs[0]); L.new(rk.outputs[0], rk2.inputs[2]); L.new(rk2.outputs[0], bs.inputs['Roughness'])
    # metal olmayan kir: pas/kirde metalik azalır
    mt = N.new('ShaderNodeMath'); mt.operation = 'SUBTRACT'; mt.inputs[0].default_value = 1.0; L.new(ps.outputs[0], mt.inputs[1])
    L.new(mt.outputs[0], bs.inputs['Metallic'])
    nmp = N.new('ShaderNodeNormalMap'); nmp.inputs['Strength'].default_value = 0.5
    L.new(no.outputs[0], nmp.inputs['Color']); L.new(nmp.outputs[0], bs.inputs['Normal'])
    return m

ENTARI_M = malz_kumas("EntariKeten", (0.115, 0.030, 0.022, 1), "rough_linen", 6.0, sheen=0.22, kir_alt=0.5, desen_kontrast=0.75, rough=(0.82, 1.0))
SALVAR_M = malz_kumas("SalvarYun", (0.17, 0.145, 0.11, 1), "denim_fabric", 5.0, sheen=0.6, kir_alt=0.6, desen_kontrast=0.45, rough=(0.85, 1.0))
BASLIK_M = malz_kumas("BaslikKeten", (0.62, 0.55, 0.42, 1), "rough_linen", 14.0, sheen=0.3, kir_alt=0.0)
CIZME_M = malz_deri("CizmeDeri", (0.55, 0.36, 0.22, 1), olcek=4.0, rough=0.55, asinma=0.55)
KEMER_M = malz_deri("KemerDeri", (0.24, 0.14, 0.085, 1), olcek=6.0, rough=0.5, asinma=0.35)
KIN_M = malz_deri("KinDeri", (0.33, 0.20, 0.11, 1), olcek=5.0, rough=0.5, asinma=0.45, klasor="fabric_leather_02")
BAG_M = malz_deri("LamelBag", (0.17, 0.065, 0.04, 1), olcek=10.0, rough=0.6, asinma=0.3)
LAMEL_M = malz_demir("LamelDemir", (0.30, 0.29, 0.28, 1), olcek=4.0, rough=(0.45, 0.75), pas=0.45, kenar=False)
MIGFER_M = malz_demir("MigferDemir", (0.52, 0.51, 0.49, 1), olcek=2.5, rough=(0.22, 0.48), pas=0.22)
PIRINC_M = malz_demir("Pirinc", (0.75, 0.55, 0.30, 1), olcek=3.0, rough=(0.25, 0.45), pas=0.3)

# =================================================================== ölçüler
def kol_payi(i): return sum(w for n, w in KA[i].items() if n.startswith(("upperarm", "lowerarm", "hand", "index", "middle", "ring", "pinky", "thumb")))
def kesit_yaricap(z, aci_n=72, kol_haric=True, pay=0.0):
    """z yüksekliğinde gövde kesitinin dış bükey zarfı -> açıya göre yarıçap (merkez etrafında)."""
    pts = [(v.co.x, v.co.y) for v in me.vertices if abs(v.co.z - z) < 0.012 and not (kol_haric and kol_payi(v.index) > 0.12)]
    if len(pts) < 3: return None
    cx = sum(p[0] for p in pts) / len(pts); cy = sum(p[1] for p in pts) / len(pts)
    cx = 0.0  # bakışım ekseni
    rs = []
    for i in range(aci_n):
        a = 2 * math.pi * i / aci_n; dx, dy = math.cos(a), math.sin(a)
        # zarf: yönde en uzak izdüşüm (destek fonksiyonu) — dış bükey zarf yarıçapı
        r = max((p[0] - cx) * dx + (p[1] - cy) * dy for p in pts)
        rs.append(r + pay)
    return (cx, cy), rs

# =================================================================== 1) entari üst gövde + yenler (gövde kabuğu)
EL_SINIR = None
def entari_sec(f):
    c = f.calc_center_median()
    if c.z < 0.86 or c.z > 1.465: return False
    idx = [v.index for v in f.verts]
    # eller hariç (bilekte bitir), boyun üstü hariç
    if any(sum(w for n, w in KA[i].items() if n.startswith(("hand", "index", "middle", "ring", "pinky", "thumb"))) > 0.35 for i in idx): return False
    if any(KA[i].get("head", 0) + KA[i].get("neck_01", 0) > 0.5 for i in idx) and c.z > 1.43: return False
    return True
def entari_kalin(co, n, i):
    k = 0.011
    if kol_mu(i):
        # yen: bileğe doğru bollaşır (1.8 -> 3.2 cm); kumaş benzetiminde sarkıp kırışır
        w = sum(w_ for n_, w_ in KA[i].items() if n_.startswith("lowerarm"))
        k = 0.020 + 0.022 * w
    return k
entari = gövde_kabugu("Entari", entari_sec, entari_kalin, yumusat=3)
entari.data.materials.append(ENTARI_M)
for p in entari.data.polygons: p.use_smooth = True
print("ENTARI ust", len(entari.data.vertices))

# yaka ve yen ağzı kenarları: sınır kenarlarını içe kıvır (kalınlık) — katılaştırma değiştiricisi
so = entari.modifiers.new("Kalinlik", 'SOLIDIFY'); so.thickness = 0.0025; so.offset = 1.0; so.use_rim = True

# =================================================================== 2) entari eteği (yırtmaçlı), şalvar, çizme
def etek_mesh():
    """Bel (z=1.02) -> diz altı (z=0.50) koni; iki yanda diz hizasından aşağı yırtmaç; önde hafif bindirme."""
    ust = kesit_yaricap(0.99, 96, pay=0.012); orta = kesit_yaricap(0.86, 96, pay=0.03)
    (cx, cy), r_ust = ust; _, r_orta = orta
    satir = 40; sutun = 96; z0, z1 = 1.02, 0.45
    bm = bmesh.new(); grid = []
    for i in range(satir + 1):
        t = i / satir; z = z0 + (z1 - z0) * t
        row = []
        for j in range(sutun):
            a = 2 * math.pi * j / sutun
            if t < 0.25:
                r = r_ust[j] + (r_orta[j] - r_ust[j]) * (t / 0.25)
            else:
                r = r_orta[j] + 0.12 * ((t - 0.25) / 0.75) ** 1.1
            row.append(bm.verts.new((cx + r * math.cos(a), cy + r * math.sin(a), z)))
        grid.append(row)
    # yırtmaç: yanlarda (a≈0 ve a≈π), t>0.42
    yirtmac = {0, sutun // 2}
    for i in range(satir):
        for j in range(sutun):
            jn = (j + 1) % sutun
            if (i / satir) > 0.42 and (jn in yirtmac):
                continue
            bm.faces.new((grid[i][j], grid[i][jn], grid[i + 1][jn], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if (f.calc_center_median() - Vector((cx, cy, f.calc_center_median().z))).dot(f.normal) < 0: f.normal_flip()
    m = bpy.data.meshes.new("EntariEtek"); bm.to_mesh(m); bm.free()
    return m
etek = nesne("EntariEtek", etek_mesh())
def etek_agirlik(i, v):
    t = max(0.0, min(1.0, (1.02 - v.co.z) / 0.55))
    s = 1 / (1 + math.exp(-v.co.x / 0.03))   # x>0 sol bacak
    up = 1.0 - t
    return {"pelvis": up + t * 0.35, "thigh_l": t * 0.65 * s, "thigh_r": t * 0.65 * (1 - s)}
iskelete_bagla(etek, etek_agirlik)
etek.data.materials.append(ENTARI_M)
for p in etek.data.polygons: p.use_smooth = True
# kumaş iğne grubu (k05'te benzetim): bel bandı sabit, aşağı doğru serbest
ig = etek.vertex_groups.new(name="igne")
for v in etek.data.vertices:
    ig.add([v.index], max(0.0, min(1.0, (v.co.z - 0.86) / 0.12)) ** 1.5, 'REPLACE')
# etek ucu kıvrımı (baskı dikişi) için katılaştır
so = etek.modifiers.new("Kalinlik", 'SOLIDIFY'); so.thickness = 0.003; so.offset = 1.0; so.use_rim = True

def salvar_sec(f):
    c = f.calc_center_median()
    if c.z < 0.30 or c.z > 1.06: return False
    idx = [v.index for v in f.verts]
    if any(kol_mu(i) for i in idx): return False
    return True
def salvar_kalin(co, n, i):
    # bol paça: diz çevresinde en bol (4 cm), bele ve çizme ağzına doğru daralır
    z = co.z
    if z > 0.95: return 0.012
    if z < 0.40: return 0.010
    return 0.014 + 0.050 * math.sin(math.pi * (z - 0.40) / 0.55) ** 0.7
salvar = gövde_kabugu("Salvar", salvar_sec, salvar_kalin, yumusat=4)
salvar.data.materials.append(SALVAR_M)
for p in salvar.data.polygons: p.use_smooth = True
def kumasla_oturt(ob, igne_f, kare=45, egilme=0.8, kutle=0.3, carp_ob=None, buzulme=0.0):
    """Dinlenme duruşunda kumaş benzetimi: yerçekimiyle çöker, iğneli kenarlar tutulur; son kare uygulanır."""
    ig_ = ob.vertex_groups.new(name="oturt")
    for v in ob.data.vertices:
        ig_.add([v.index], igne_f(v), 'REPLACE')
    cl = ob.modifiers.new("Oturt", 'CLOTH'); s_ = cl.settings
    s_.quality = 8; s_.mass = kutle; s_.bending_stiffness = egilme; s_.tension_stiffness = 12; s_.compression_stiffness = 12
    s_.shear_stiffness = 5; s_.vertex_group_mass = "oturt"; s_.shrink_min = buzulme
    cl.collision_settings.distance_min = 0.003; cl.collision_settings.use_self_collision = True
    cl.collision_settings.self_distance_min = 0.003
    cl.point_cache.frame_start = 1; cl.point_cache.frame_end = kare
    bpy.context.view_layer.objects.active = ob
    while ob.modifiers.find("Oturt") > 0: bpy.ops.object.modifier_move_up(modifier="Oturt")
    am_ = ob.modifiers.get("Iskelet");
    if am_: am_.show_viewport = False
    for f_ in range(1, kare + 1): sc.frame_set(f_)
    bpy.ops.object.modifier_apply(modifier="Oturt")
    if am_: am_.show_viewport = True
    if ob.vertex_groups.get("oturt"): ob.vertex_groups.remove(ob.vertex_groups["oturt"])
    sc.frame_set(1)
gc_ = body.modifiers.new("GeciciCarp", 'COLLISION'); body.collision.thickness_outer = 0.004
kumasla_oturt(salvar, lambda v: 1.0 if (v.co.z > 0.97 or v.co.z < 0.415) else 0.0, kare=50, egilme=0.6, buzulme=0.04)
body.modifiers.remove(gc_)

def cizme_sec(f):
    c = f.calc_center_median()
    return c.z < 0.48
cizme = gövde_kabugu("Cizme", cizme_sec, lambda co, n, i: 0.006, yumusat=0)
for md_ in list(cizme.modifiers): cizme.modifiers.remove(md_)
for vg_ in list(cizme.vertex_groups): cizme.vertex_groups.remove(vg_)
cizme.parent = None
bpy.context.view_layer.objects.active = cizme
s_ = cizme.modifiers.new("K", 'SOLIDIFY'); s_.thickness = 0.006; s_.offset = 1.0; bpy.ops.object.modifier_apply(modifier="K")
rm = cizme.modifiers.new("Voksel", 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.0045; rm.adaptivity = 0.0
bpy.ops.object.modifier_apply(modifier="Voksel")
sm = cizme.modifiers.new("Yumusat", 'CORRECTIVE_SMOOTH'); sm.factor = 0.9; sm.iterations = 25; sm.smooth_type = 'SIMPLE'; sm.rest_source = 'ORCO'
sm2 = cizme.modifiers.new("Y2", 'SMOOTH'); sm2.factor = 0.6; sm2.iterations = 6
bpy.ops.object.modifier_apply(modifier="Yumusat"); bpy.ops.object.modifier_apply(modifier="Y2")
sw = cizme.modifiers.new("Disari", 'SHRINKWRAP'); sw.target = body; sw.wrap_method = 'NEAREST_SURFACEPOINT'
sw.wrap_mode = 'OUTSIDE'; sw.offset = 0.004
bpy.ops.object.modifier_apply(modifier="Disari")
# taban: alttaki köşeler düz zemine iner (düz basan kalın taban)
for v in cizme.data.vertices:
    if v.co.z < 0.022:
        v.co.z = -0.012 if v.co.z < 0.004 else -0.012 + (v.co.z - 0.004) * (0.034 / 0.018)
cizme.data.materials.append(CIZME_M)
for p in cizme.data.polygons: p.use_smooth = True
def cizme_ag(i, v):
    if v.co.y < -0.128 and v.co.z < 0.06:   # top kemiğinin önü: parmak bölgesi düz kalır (taban bükülme çizgisi)
        return {"ball_l" if v.co.x > 0 else "ball_r": 1.0}
    _, gi, _ = kd_bacak.find(v.co)
    w = {n: x for n, x in KA[gi].items() if n.startswith(("calf", "foot", "ball", "thigh"))}
    t = sum(w.values()) or 1
    w = {n: x / t for n, x in w.items()}
    # sert taban ve topuk: alt 6 cm yalnız ayak kemiğine; 6–14 cm arası baldıra yumuşak geçiş
    s_ = "l" if v.co.x > 0 else "r"
    k = max(0.0, min(1.0, (v.co.z - 0.06) / 0.08))
    if k < 1.0:
        w = {n: x * k for n, x in w.items()}
        w["foot_" + s_] = w.get("foot_" + s_, 0.0) + (1 - k)
    return w
kd_bacak = KDTree(len(me.vertices))
for v in me.vertices:
    if v.co.z < 0.55: kd_bacak.insert(v.co, v.index)
kd_bacak.balance()
iskelete_bagla(cizme, cizme_ag)
print("CIZME kose", len(cizme.data.vertices))
print("ZEMIN_Z", -0.012)

# =================================================================== 3) lamel zırh (Geometry Nodes ile plaka örnekleme)
LZ_UST, LZ_ALT = 1.385, 0.905
SIRA_ADIM = 0.048; PLAKA_Y = 0.074; PLAKA_EN = 0.022; PLAKA_ADIM = 0.0165
siralar = []
z = LZ_UST
while z > LZ_ALT - 0.001:
    siralar.append(z); z -= SIRA_ADIM
# taşıyıcı: kesit zarfları, dikeyde kayan en büyük (sert zırh içbükeyleri köprüler) + entari payı
zler = [LZ_ALT - 0.06 + 0.01 * i for i in range(int((LZ_UST + 0.04 - LZ_ALT + 0.06) / 0.01) + 1)]
KES = {}
for zz in zler:
    k = kesit_yaricap(zz, 96, pay=0.0)
    if k: KES[round(zz, 3)] = k
def tasiyici(a_i, zz):
    """96 açı dilimi için taşıyıcı yarıçap: ±5 cm içinde en büyük + 2.4 cm pay."""
    ks = [v for kz, v in KES.items() if abs(kz - zz) <= (0.05 if zz < 1.2 else 0.02)]
    r = max(v[1][a_i] for v in ks)
    cy = sum(v[0][1] for v in ks) / len(ks)
    return r + 0.024, cy
plaka_noktalar = []   # (konum, normal, yukarı, sıra, id)
pid = 0
for si, zs in enumerate(siralar):
    # sıra çevresi: 96 dilim -> kapalı çokgen; plaka adımıyla yeniden örnekle
    pol = []
    for a_i in range(96):
        a = 2 * math.pi * a_i / 96; r, cy = tasiyici(a_i, zs - PLAKA_Y * 0.5)
        pol.append(Vector((r * math.cos(a), cy + r * math.sin(a), zs)))
    # yumuşat (koltuk altı sıralarında daha çok)
    for _ in range(3 if zs < 1.2 else 12):
        pol = [(pol[i - 1] + pol[i] * 2 + pol[(i + 1) % 96]) / 4 for i in range(96)]
    cevre = sum((pol[(i + 1) % 96] - pol[i]).length for i in range(96))
    n = int(cevre / PLAKA_ADIM)
    adim = cevre / n
    # yay uzunluğuna göre örnekle
    seg = [(pol[(i + 1) % 96] - pol[i]).length for i in range(96)]
    s_hedef = 0.0; i = 0; s_acc = 0.0
    for k_ in range(n):
        s_hedef = k_ * adim + (0.5 * adim if si % 2 else 0.0)   # sıralar yarım plaka kaydırılır
        while s_acc + seg[i % 96] < s_hedef: s_acc += seg[i % 96]; i += 1
        tt = (s_hedef - s_acc) / seg[i % 96]
        p = pol[i % 96].lerp(pol[(i + 1) % 96], tt)
        tan = (pol[(i + 1) % 96] - pol[i % 96]).normalized()
        nrm = Vector((tan.y, -tan.x, 0)).normalized()
        if nrm.dot(Vector((p.x, p.y - 0.0, 0))) < 0: nrm = -nrm
        aci = math.degrees(math.atan2(p.y + 0.02, p.x))
        # koltuk altı oyuğu: üst iki sıra yanlarda yok (kol hareketi)
        if zs > 1.25 and (abs(aci) < 34 or abs(aci) > 146):
            continue
        if zs > 1.33 and (abs(aci) < 55 or abs(aci) > 125):
            continue
        plaka_noktalar.append((p, nrm, si, pid)); pid += 1
print("LAMEL plaka", len(plaka_noktalar), "sira", len(siralar))
# nokta bulutu nesnesi (öznitelikler: normal, sıra, kimlik) -> GN: Instance on Points + hizalama + Realize
pm = bpy.data.meshes.new("LamelNokta"); pm.from_pydata([p for p, _, _, _ in plaka_noktalar], [], [])
an = pm.attributes.new("yon", 'FLOAT_VECTOR', 'POINT'); an.data.foreach_set("vector", [c for _, n_, _, _ in plaka_noktalar for c in n_])
ai = pm.attributes.new("plaka", 'INT', 'POINT'); ai.data.foreach_set("value", [i for _, _, _, i in plaka_noktalar])
asr = pm.attributes.new("sira", 'INT', 'POINT'); asr.data.foreach_set("value", [s for _, _, s, _ in plaka_noktalar])
lamel = nesne("Lamel", pm)
# tek plaka: yuvarlatılmış köşeli, dışa hafif bombeli, alt kenarı hafif kalkık, iki delik sırası (bump ile)
bm = bmesh.new()
W, Hh, T = PLAKA_EN, PLAKA_Y, 0.0012
prof = []
for k_ in range(20):
    a = 2 * math.pi * k_ / 20
    x = math.copysign(abs(math.cos(a)) ** 0.25, math.cos(a)) * W / 2
    y = math.copysign(abs(math.sin(a)) ** 0.25, math.sin(a)) * Hh / 2
    prof.append((x, y))
def bomb(x, y): return 0.0018 * (1 - (2 * x / W) ** 2) + 0.0012 * max(0, -(y / (Hh / 2)) - 0.3)
on_ = [bm.verts.new((x, -bomb(x, y), y)) for x, y in prof]
arka = [bm.verts.new((x, -bomb(x, y) + T, y)) for x, y in prof]
mrk_on = bm.verts.new((0, -bomb(0, 0), 0)); mrk_ar = bm.verts.new((0, -bomb(0, 0) + T, 0))
for k_ in range(20):
    a, b_ = on_[k_], on_[(k_ + 1) % 20]; bm.faces.new((mrk_on, b_, a))
    a2, b2 = arka[k_], arka[(k_ + 1) % 20]; bm.faces.new((mrk_ar, a2, b2))
    bm.faces.new((a, b_, b2, a2))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
plm = bpy.data.meshes.new("Plaka"); bm.to_mesh(plm); bm.free()
for p in plm.polygons: p.use_smooth = True
plaka_ob = nesne("Plaka", plm); plaka_ob.hide_render = True; plaka_ob.hide_viewport = True
# GN ağacı
gn = bpy.data.node_groups.new("LamelGN", 'GeometryNodeTree')
gn.interface.new_socket("Geometry", in_out='INPUT', socket_type='NodeSocketGeometry')
gn.interface.new_socket("Geometry", in_out='OUTPUT', socket_type='NodeSocketGeometry')
Nn = gn.nodes; Ln = gn.links
gi_ = Nn.new('NodeGroupInput'); go_ = Nn.new('NodeGroupOutput')
oi = Nn.new('GeometryNodeObjectInfo'); oi.inputs['Object'].default_value = plaka_ob
yon = Nn.new('GeometryNodeInputNamedAttribute'); yon.data_type = 'FLOAT_VECTOR'; yon.inputs['Name'].default_value = "yon"
al1 = Nn.new('FunctionNodeAlignEulerToVector'); al1.axis = 'Y'; al1.inputs['Vector'] if False else None
# plaka yerel -Y dışarı bakar: hizalama ekseni -Y için vektörü ters çevir
neg = Nn.new('ShaderNodeVectorMath'); neg.operation = 'SCALE'; neg.inputs['Scale'].default_value = -1.0
Ln.new(yon.outputs['Attribute'], neg.inputs[0]); Ln.new(neg.outputs[0], al1.inputs['Vector'])
al2 = Nn.new('FunctionNodeAlignEulerToVector'); al2.axis = 'Z'; al2.pivot_axis = 'Y'
al2.inputs['Vector'].default_value = (0, 0, 1); Ln.new(al1.outputs[0], al2.inputs['Rotation'])
# hafif rastgele sapma (elle yapılmış zırh): ±1.5°
rv = Nn.new('FunctionNodeRandomValue'); rv.data_type = 'FLOAT_VECTOR'
rv.inputs['Min'].default_value = (-0.026, -0.026, -0.02); rv.inputs['Max'].default_value = (0.026, 0.026, 0.02)
rt = Nn.new('FunctionNodeRotateEuler') if hasattr(bpy.types, 'FunctionNodeRotateEuler') else None
ip = Nn.new('GeometryNodeInstanceOnPoints')
Ln.new(gi_.outputs[0], ip.inputs['Points']); Ln.new(oi.outputs['Geometry'], ip.inputs['Instance'])
if rt is not None:
    rt.space = 'LOCAL'
    Ln.new(al2.outputs[0], rt.inputs['Rotation']); Ln.new(rv.outputs['Value'], rt.inputs['Rotate By'])
    Ln.new(rt.outputs[0], ip.inputs['Rotation'])
else:
    Ln.new(al2.outputs[0], ip.inputs['Rotation'])
# plaka eğimi: alt kenar dışa (bir alt sıranın üstüne biner)
tr = Nn.new('GeometryNodeTranslateInstances'); tr.inputs['Local Space'].default_value = True
tr.inputs['Translation'].default_value = (0, 0, -PLAKA_Y * 0.5)
Ln.new(ip.outputs[0], tr.inputs['Instances'])
ri = Nn.new('GeometryNodeRealizeInstances'); Ln.new(tr.outputs[0], ri.inputs[0])
Ln.new(ri.outputs[0], go_.inputs[0])
md = lamel.modifiers.new("LamelGN", 'NODES'); md.node_group = gn
bpy.context.view_layer.objects.active = lamel
bpy.ops.object.modifier_apply(modifier=md.name)
print("LAMEL koseler", len(lamel.data.vertices))
# sıra eğimi: her plakanın alt ucu, sıra numarasıyla orantılı dışarıda -> alt sıra üst sıranın içinde kalır
pl_attr = lamel.data.attributes.get("plaka"); sr_attr = lamel.data.attributes.get("sira")
pids = [0] * len(lamel.data.vertices); srs = [0] * len(lamel.data.vertices)
if pl_attr: pl_attr.data.foreach_get("value", pids)
if sr_attr: sr_attr.data.foreach_get("value", srs)
merkez_p = {i: p for p, _, _, i in plaka_noktalar}; nrm_p = {i: n_ for _, n_, _, i in plaka_noktalar}
for v in lamel.data.vertices:
    i = pids[v.index]; p = merkez_p.get(i); n_ = nrm_p.get(i)
    if p is None: continue
    yuk = (p.z - v.co.z) / PLAKA_Y      # 0 üst, 1 alt
    v.co += n_ * (0.0025 * yuk)
    # plakalar sıra içinde pul gibi biner: sağ kenar dışarıda
    yan = (v.co - p).dot(Vector((-n_.y, n_.x, 0)))
    v.co += n_ * (yan / (PLAKA_EN / 2)) * 0.0011
# sıra yüksekliğine göre dışa kademe: üst sıra dışta (yağmur/darbe aşağı kayar)
for v in lamel.data.vertices:
    n_ = nrm_p.get(pids[v.index])
    if n_ is not None: v.co += n_ * (len(siralar) - srs[v.index]) * 0.0007
for p in lamel.data.polygons: p.use_smooth = True; p.material_index = 0
lamel.data.materials.clear(); lamel.data.materials.append(LAMEL_M)
# rijit plaka ağırlıkları: plaka merkezine en yakın gövde köşesinin ağırlıkları tüm plakaya
kd = KDTree(len(me.vertices))
for v in me.vertices:
    if not kol_mu(v.index): kd.insert(v.co, v.index)
kd.balance()
def plaka_ag(i, v):
    p = merkez_p.get(pids[i]);
    co, gi, _ = kd.find(p)
    w = {n: x for n, x in KA[gi].items() if n in ("pelvis", "spine_01", "spine_02", "spine_03", "thigh_l", "thigh_r")}
    # bacak ağırlığını azalt (zırh kalçaya biner)
    for b_ in ("thigh_l", "thigh_r"):
        if b_ in w: w[b_] *= 0.35
    t = sum(w.values()) or 1
    return {n: x / t for n, x in w.items()}
iskelete_bagla(lamel, plaka_ag)

# bağ şeritleri: her sıranın görünen alt kısmında deri şerit (plakalar arası bağ izi) + üst kenarda düğüm sırası
def serit(ad, zs, kalin=0.006, yuk=0.007, ofs=0.0):
    pol = []
    for a_i in range(96):
        a = 2 * math.pi * a_i / 96; r, cy = tasiyici(a_i, zs)
        pol.append(Vector((r * math.cos(a), cy + r * math.sin(a), zs)))
    for _ in range(3):
        pol = [(pol[i - 1] + pol[i] * 2 + pol[(i + 1) % 96]) / 4 for i in range(96)]
    bm = bmesh.new(); ust = []; alt = []
    for p in pol:
        n_ = Vector((p.x, p.y, 0)).normalized()
        ust.append(bm.verts.new(p + n_ * ofs + Vector((0, 0, yuk / 2))))
        alt.append(bm.verts.new(p + n_ * ofs - Vector((0, 0, yuk / 2))))
    for i in range(96):
        bm.faces.new((ust[i], ust[(i + 1) % 96], alt[(i + 1) % 96], alt[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new(ad); bm.to_mesh(m); bm.free()
    ob = nesne(ad, m)
    s_ = ob.modifiers.new("K", 'SOLIDIFY'); s_.thickness = kalin * 0.25; s_.offset = 0
    return ob
bag_parcalari = []
for si, zs in enumerate(siralar):
    kat = (len(siralar) - si) * 0.0007
    o = serit(f"Bag{si}", zs - PLAKA_Y * 0.80, yuk=0.006, ofs=0.0042 + kat)
    bag_parcalari.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in bag_parcalari:
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="K"); o.select_set(False)
for o in bag_parcalari: o.select_set(True)
bpy.context.view_layer.objects.active = bag_parcalari[0]; bpy.ops.object.join()
bag = bpy.context.object; bag.name = "LamelBag"; bag.data.materials.append(BAG_M)
# koltuk altında kalan bağ kısımlarını sil (plakasız bölgeler)
bm = bmesh.new(); bm.from_mesh(bag.data)
sil = []
for v in bm.verts:
    aci = math.degrees(math.atan2(v.co.y + 0.02, v.co.x))
    if (v.co.z > 1.25 - PLAKA_Y * 0.8 and (abs(aci) < 34 or abs(aci) > 146)) or (v.co.z > 1.33 - PLAKA_Y * 0.8 and (abs(aci) < 55 or abs(aci) > 125)):
        sil.append(v)
bmesh.ops.delete(bm, geom=sil, context='VERTS'); bm.to_mesh(bag.data); bm.free()
iskelete_bagla(bag, govde_ag(bag))

# çarpışma vekili (k05): lamelin dış yüzünü kaplayan temiz tüp
bm = bmesh.new(); tz = []; zz = LZ_UST + 0.01
zl = []
while zz > LZ_ALT - PLAKA_Y - 0.005:
    zl.append(zz); zz -= 0.03
for zz in zl:
    row = []
    for a_i in range(0, 96, 2):
        a = 2 * math.pi * a_i / 96; r, cy = tasiyici(a_i, zz)
        r += 0.006 + len(siralar) * 0.0007
        row.append(bm.verts.new((r * math.cos(a), cy + r * math.sin(a), zz)))
    tz.append(row)
for i in range(len(tz) - 1):
    for j in range(48):
        bm.faces.new((tz[i][j], tz[i][(j + 1) % 48], tz[i + 1][(j + 1) % 48], tz[i + 1][j]))
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
zm_ = bpy.data.meshes.new("ZirhCarp"); bm.to_mesh(zm_); bm.free()
zirh_carp = nesne("ZirhCarp", zm_); zirh_carp.hide_render = True
iskelete_bagla(zirh_carp, govde_ag(zirh_carp))
# omuz kayışları (deri): önden arkaya omuz üstünden
def kayis(ad, pts, en=0.04, kal=0.004, malz=KEMER_M, normal_f=None, n=32):
    """Deri kayış: yol noktalarından Catmull-Rom; genişlik yüzeye teğet (yüzey normaliyle dik)."""
    def cr(p0, p1, p2, p3, t):
        return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t)
    P_ = [pts[0] * 2 - pts[1]] + list(pts) + [pts[-1] * 2 - pts[-2]]
    yol = []
    for i in range(1, len(P_) - 2):
        for k_ in range(n // (len(pts) - 1)):
            yol.append(cr(P_[i - 1], P_[i], P_[i + 1], P_[i + 2], k_ / (n // (len(pts) - 1))))
    yol.append(pts[-1])
    bm = bmesh.new(); sol = []; sag = []
    for i, p in enumerate(yol):
        t = (yol[min(i + 1, len(yol) - 1)] - yol[max(i - 1, 0)]).normalized()
        if normal_f: nn = normal_f(p)
        else:
            loc, nn, _, _ = BV.find_nearest(p)
        w = t.cross(nn).normalized()
        sol.append(bm.verts.new(p + w * en / 2)); sag.append(bm.verts.new(p - w * en / 2))
    for i in range(len(yol) - 1):
        bm.faces.new((sol[i], sol[i + 1], sag[i + 1], sag[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new(ad); bm.to_mesh(m); bm.free()
    ob = nesne(ad, m); ob.data.materials.append(malz)
    s_ = ob.modifiers.new("K", 'SOLIDIFY'); s_.thickness = kal; s_.offset = 0
    bv = ob.modifiers.new("P", 'BEVEL'); bv.width = 0.0008; bv.segments = 2
    for md_ in list(ob.modifiers):
        bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier=md_.name)
    for p in ob.data.polygons: p.use_smooth = True
    return ob
omuz = []
for sx in (-1, 1):
    pts = [Vector((sx * 0.105, -0.118, 1.36)), Vector((sx * 0.135, -0.075, 1.425)), Vector((sx * 0.150, -0.005, 1.452)),
           Vector((sx * 0.140, 0.065, 1.420)), Vector((sx * 0.115, 0.105, 1.36))]
    # omuz yüzeyine oturt: gövde üstünden + 2.6 cm
    pp = []
    for p in pts:
        loc, nn, _, _ = BV.find_nearest(p)
        pp.append(loc + nn * 0.026)
    o = kayis(f"Omuz{sx}", pp, en=0.045); omuz.append(o)
for o in omuz:
    iskelete_bagla(o, govde_ag(o))

# =================================================================== 4) kemer, kılıç askısı, kın
def halka(ad, z, yuk, ofs, malz, nseg=96, egim=0.0):
    pol = []
    for a_i in range(nseg):
        a = 2 * math.pi * a_i / nseg; r, cy = tasiyici(int(a_i * 96 / nseg), z)
        zz = z + egim * math.sin(a)
        pol.append(Vector((r * math.cos(a), cy + r * math.sin(a), zz)))
    for _ in range(3):
        pol = [(pol[i - 1] + pol[i] * 2 + pol[(i + 1) % nseg]) / 4 for i in range(nseg)]
    bm = bmesh.new(); u = []; d = []
    for p in pol:
        n_ = Vector((p.x, p.y, 0)).normalized()
        u.append(bm.verts.new(p + n_ * ofs + Vector((0, 0, yuk / 2)))); d.append(bm.verts.new(p + n_ * ofs - Vector((0, 0, yuk / 2))))
    for i in range(nseg):
        bm.faces.new((u[i], u[(i + 1) % nseg], d[(i + 1) % nseg], d[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new(ad); bm.to_mesh(m); bm.free()
    ob = nesne(ad, m); ob.data.materials.append(malz)
    s_ = ob.modifiers.new("K", 'SOLIDIFY'); s_.thickness = 0.005; s_.offset = 1.0
    bv = ob.modifiers.new("P", 'BEVEL'); bv.width = 0.0012; bv.segments = 2
    for md_ in list(ob.modifiers):
        bpy.context.view_layer.objects.active = ob; bpy.ops.object.modifier_apply(modifier=md_.name)
    for p in ob.data.polygons: p.use_smooth = True
    return ob
KEMER_Z = 1.035
kemer = halka("Kemer", KEMER_Z, 0.045, 0.030 + (len(siralar) * 0.0007), KEMER_M)
# kemer süsleri: demir/pirinç çivi başları ve toka
susler = []
for a_i in range(0, 96, 6):
    a = 2 * math.pi * a_i / 96; r, cy = tasiyici(a_i, KEMER_Z)
    n_ = Vector((math.cos(a), math.sin(a), 0))
    p = Vector((r * math.cos(a), cy + r * math.sin(a), KEMER_Z)) + n_ * (0.030 + len(siralar) * 0.0007 + 0.005)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0055, location=p, segments=12, ring_count=8)
    o = bpy.context.object; o.scale = (1, 1, 1); o.data.materials.append(PIRINC_M)
    o.rotation_euler = n_.to_track_quat('Z', 'Y').to_euler(); o.scale = (1.0, 1.0, 0.45)
    susler.append(o)
# toka (önde)
r0, cy0 = tasiyici(72, KEMER_Z)   # a=270° (-Y, ön)
bpy.ops.mesh.primitive_torus_add(major_radius=0.022, minor_radius=0.0035, location=(0, cy0 - r0 - 0.030 - len(siralar) * 0.0007 - 0.006, KEMER_Z))
tk = bpy.context.object; tk.rotation_euler = (math.radians(90), 0, 0); tk.scale = (1.0, 0.9, 1.0); tk.data.materials.append(PIRINC_M)
susler.append(tk)
for o in susler:
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); o.select_set(False)
bpy.ops.object.select_all(action='DESELECT')
for o in susler: o.select_set(True)
bpy.context.view_layer.objects.active = susler[0]; bpy.ops.object.join(); sus = bpy.context.object; sus.name = "KemerSus"
for o_ in (kemer, sus):
    iskelete_bagla(o_, lambda i, v: {"pelvis": 0.55, "spine_01": 0.45})

# kın: sol kalçada, kemere iki askıyla; namluyla aynı eğri (kılıç elde, kın boş)
kin_kok = Vector((0.205, -0.02, 0.985))
eg = (Vector((0.10, 0.55, -0.83))).normalized()     # arkaya ve aşağı eğik
yan = Vector((1, 0, 0)).cross(eg).normalized()
def kin_mesh():
    bm = bmesh.new(); n = 40; seg = 16; halk = []
    L_ = 0.86
    for i in range(n + 1):
        s = i / n; ag = 0.022 - 0.006 * s; kal = 0.0085 - 0.002 * s
        if s > 0.95: ag *= (1 - s) / 0.05 * 0.6 + 0.4; kal *= 0.8
        merk = kin_kok + eg * (L_ * s) + yan * (-0.030 * s * s)
        row = []
        for k_ in range(seg):
            a = 2 * math.pi * k_ / seg
            row.append(bm.verts.new(merk + Vector((1, 0, 0)) * (math.cos(a) * kal) + yan * (math.sin(a) * ag)))
        halk.append(row)
    for i in range(n):
        for k_ in range(seg):
            bm.faces.new((halk[i][k_], halk[i][(k_ + 1) % seg], halk[i + 1][(k_ + 1) % seg], halk[i + 1][k_]))
    bm.faces.new(halk[-1]); bm.faces.new(halk[0][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new("Kin"); bm.to_mesh(m); bm.free(); return m
kin = nesne("Kin", kin_mesh()); kin.data.materials.append(KIN_M)
for p in kin.data.polygons: p.use_smooth = True
# kın ağzı ve uç demirleri
parca = []
for s0, s1 in ((0.0, 0.06), (0.93, 1.0), (0.30, 0.33)):
    bpy.ops.mesh.primitive_cylinder_add(radius=1.0, depth=1.0, vertices=20)
    o = bpy.context.object
    L_ = 0.86; p0 = kin_kok + eg * (L_ * s0); p1 = kin_kok + eg * (L_ * s1)
    o.location = (p0 + p1) / 2; o.rotation_euler = eg.to_track_quat('Z', 'Y').to_euler()
    o.scale = (0.0098, 0.0245 * (1 - 0.25 * s0), (p1 - p0).length)
    o.data.materials.append(MIGFER_M); parca.append(o)
for o in parca:
    bpy.context.view_layer.objects.active = o; o.select_set(True); bpy.ops.object.transform_apply(location=False, rotation=True, scale=True); o.select_set(False)
    bv = o.modifiers.new("P", 'BEVEL'); bv.width = 0.0015; bv.segments = 2
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="P")
# askılar: kemerden kına iki ince kayış
ask = []
for s_, dz in ((0.03, 0.0), (0.30, 0.0)):
    p_kin = kin_kok + eg * (0.86 * s_)
    a = math.atan2(p_kin.y - 0.0, p_kin.x)
    a_i = int(((a % (2 * math.pi)) / (2 * math.pi)) * 96) % 96
    r, cy = tasiyici(a_i, KEMER_Z)
    p_kem = Vector((r * math.cos(a), cy + r * math.sin(a), KEMER_Z - 0.01)) + Vector((math.cos(a), math.sin(a), 0)) * 0.045
    o = kayis(f"Aski{s_}", [p_kem, p_kem.lerp(p_kin, 0.5) + Vector((0.012, 0, -0.01)), p_kin + Vector((0.010, 0, 0.0))], en=0.018, kal=0.003)
    ask.append(o)
for o in [kin] + parca + ask:
    o.parent = rig
    iskelete_bagla(o, lambda i, v: {"pelvis": 0.8, "thigh_l": 0.2})
kin_g = parca + ask

# =================================================================== 5) miğfer, başlık kenarı, burun siperi, zincir boyunluk
hb = BN["head"]
bas_ust = max(v.co.z for v in me.vertices if KA[v.index].get("head", 0) > 0.8)
bas_kesit = kesit_yaricap(1.645, 72, kol_haric=False, pay=0.0)
(hcx, hcy), hr = bas_kesit
KENAR_Z = 1.625     # alın hizası (kaşların ~2 cm üstü)
def migfer_mesh():
    """Konik gövde: kenarda baş kesitine 9 mm pay, tepeye doğru sivrilen hafif dış bükey koni + tepe sapı."""
    bm = bmesh.new(); n = 26; seg = 72; halk = []
    tepe_z = bas_ust + 0.115
    for i in range(n + 1):
        t = i / n; z = KENAR_Z + (tepe_z - KENAR_Z) * t
        row = []
        for j in range(seg):
            a = 2 * math.pi * j / seg
            r0 = hr[j] + 0.010
            prof = (1 - t) ** 0.82 * (1 + 0.12 * math.sin(math.pi * t))
            r = max(r0 * prof, 0.0015)
            # arkada hafif uzun (ense)
            zz = z - (0.012 if math.sin(a) > 0 else 0) * (1 - t) * max(0, math.sin(a)) * 1.0
            row.append(bm.verts.new((hcx + r * math.cos(a), hcy + r * math.sin(a), zz)))
        halk.append(row)
    for i in range(n):
        for j in range(seg):
            bm.faces.new((halk[i][j], halk[i][(j + 1) % seg], halk[i + 1][(j + 1) % seg], halk[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new("Migfer"); bm.to_mesh(m); bm.free(); return m
migfer = nesne("Migfer", migfer_mesh()); migfer.data.materials.append(MIGFER_M)
s_ = migfer.modifiers.new("K", 'SOLIDIFY'); s_.thickness = 0.0022; s_.offset = 1.0
sd = migfer.modifiers.new("A", 'SUBSURF'); sd.levels = 1; sd.render_levels = 2
for p in migfer.data.polygons: p.use_smooth = True
# tepe sapı (topuz + kısa sivri)
bpy.ops.mesh.primitive_cone_add(radius1=0.010, radius2=0.0015, depth=0.05, vertices=16, location=(hcx, hcy, bas_ust + 0.115 + 0.018))
tepe = bpy.context.object; tepe.data.materials.append(PIRINC_M)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.012, location=(hcx, hcy, bas_ust + 0.112), segments=16, ring_count=10)
tepe2 = bpy.context.object; tepe2.scale = (1, 1, 0.7); tepe2.data.materials.append(PIRINC_M)
# alın bandı (pirinç, perçinli) — kenar boyunca 2.2 cm
def kenar_halka(ad, z0, yuk, pay, malz, seg=72, kal=0.0018):
    bm = bmesh.new(); u = []; d = []
    for j in range(seg):
        a = 2 * math.pi * j / seg; r = hr[j] + 0.010 + pay
        geri = 0.012 * max(0, math.sin(a))
        u.append(bm.verts.new((hcx + r * 0.985 * math.cos(a), hcy + r * 0.985 * math.sin(a), z0 + yuk - geri)))
        d.append(bm.verts.new((hcx + r * math.cos(a), hcy + r * math.sin(a), z0 - geri)))
    for j in range(seg):
        bm.faces.new((u[j], u[(j + 1) % seg], d[(j + 1) % seg], d[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new(ad); bm.to_mesh(m); bm.free(); ob = nesne(ad, m); ob.data.materials.append(malz)
    s2 = ob.modifiers.new("K", 'SOLIDIFY'); s2.thickness = kal; s2.offset = 1.0
    bv = ob.modifiers.new("P", 'BEVEL'); bv.width = 0.0008; bv.segments = 2
    for p in ob.data.polygons: p.use_smooth = True
    return ob
band = kenar_halka("AlinBandi", KENAR_Z - 0.002, 0.024, 0.0022, PIRINC_M)
liner = kenar_halka("BaslikKenari", KENAR_Z - 0.010, 0.012, -0.004, BASLIK_M, kal=0.006)
# perçinler
perc = []
for j in range(0, 72, 4):
    a = 2 * math.pi * j / 72; r = hr[j] + 0.010 + 0.0045
    geri = 0.012 * max(0, math.sin(a))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0026, location=(hcx + r * math.cos(a), hcy + r * math.sin(a), KENAR_Z + 0.010 - geri), segments=10, ring_count=6)
    o = bpy.context.object; o.data.materials.append(MIGFER_M); perc.append(o)
# burun siperi: alın bandından burun ucuna (yüze 1 cm pay), üstte genişleyen
burun_on = min(v.co.y for v in me.vertices if abs(v.co.x) < 0.006 and 1.55 < v.co.z < 1.60)
def burun_mesh():
    bm = bmesh.new(); n = 14; rows = []
    for i in range(n + 1):
        t = i / n; z = KENAR_Z + 0.012 - t * 0.085
        loc, nn, _, _ = BV.find_nearest(Vector((0, -0.2, z)))
        # yüzden dışa
        yy = min(loc.y - 0.011, -0.1)
        if t > 0.0:
            ray = BV.ray_cast(Vector((0, -0.4, z)), Vector((0, 1, 0)))
            if ray[0] is not None: yy = ray[0].y - 0.012
        w = 0.013 - 0.004 * t
        rows.append([bm.verts.new((-w, yy + 0.002, z)), bm.verts.new((0, yy - 0.0015, z)), bm.verts.new((w, yy + 0.002, z))])
    for i in range(n):
        for k_ in range(2):
            bm.faces.new((rows[i][k_], rows[i][k_ + 1], rows[i + 1][k_ + 1], rows[i + 1][k_]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    m = bpy.data.meshes.new("BurunSiperi"); bm.to_mesh(m); bm.free(); return m
burun = nesne("BurunSiperi", burun_mesh()); burun.data.materials.append(MIGFER_M)
s3 = burun.modifiers.new("K", 'SOLIDIFY'); s3.thickness = 0.003; s3.offset = 0
bv3 = burun.modifiers.new("P", 'BEVEL'); bv3.width = 0.0012; bv3.segments = 2
sd3 = burun.modifiers.new("A", 'SUBSURF'); sd3.levels = 1; sd3.render_levels = 2
for p in burun.data.polygons: p.use_smooth = True
migfer_parca = [migfer, tepe, tepe2, band, liner, burun] + perc
for o in migfer_parca:
    iskelete_bagla(o, lambda i, v: {"head": 1.0})

# zincir boyunluk (aventail): miğfer kenarından (yanlar+ense) omuza sarkan perde; önde yüz açık
def boyunluk_mesh():
    bm = bmesh.new(); seg = 56; n = 18; rows = []
    a0, a1 = math.radians(-35), math.radians(215)   # önde yüz açıklığı (−90° ± 55°)
    for i in range(n + 1):
        t = i / n; row = []
        for j in range(seg + 1):
            a = a0 + (a1 - a0) * j / seg
            # açı: 0=+X (sol), 90=+Y (ense), 180=-X (sağ). ön açıklık -90 civarı.
            jj = int(((a % (2 * math.pi)) / (2 * math.pi)) * 72) % 72
            r = hr[jj] + 0.010 + 0.004 + 0.07 * t ** 1.2
            geri = 0.012 * max(0, math.sin(a))
            z = KENAR_Z - geri - 0.20 * t
            row.append(bm.verts.new((hcx + r * math.cos(a), hcy + r * math.sin(a), z)))
        rows.append(row)
    for i in range(n):
        for j in range(seg):
            bm.faces.new((rows[i][j], rows[i][j + 1], rows[i + 1][j + 1], rows[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        c = f.calc_center_median()
        if (c - Vector((hcx, hcy, c.z))).dot(f.normal) < 0: f.normal_flip()
    m = bpy.data.meshes.new("Boyunluk"); bm.to_mesh(m); bm.free(); return m
boyunluk = nesne("Boyunluk", boyunluk_mesh())
ZM = os.path.join(TEX, "Chainmail004")
def malz_zincir():
    m = bpy.data.materials.new("Zincir"); m.use_nodes = True
    N = m.node_tree.nodes; L = m.node_tree.links; bs = N["Principled BSDF"]
    uv = N.new('ShaderNodeUVMap'); uv.uv_map = "UVMap"
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (9, 6, 1); L.new(uv.outputs[0], mp.inputs['Vector'])
    pre = "Chainmail004_2K-JPG_"
    col = N.new('ShaderNodeTexImage'); col.image = img(os.path.join(ZM, pre + "Color.jpg"), True); L.new(mp.outputs[0], col.inputs[0])
    op = N.new('ShaderNodeTexImage'); op.image = img(os.path.join(ZM, pre + "Opacity.jpg")); L.new(mp.outputs[0], op.inputs[0])
    ro = N.new('ShaderNodeTexImage'); ro.image = img(os.path.join(ZM, pre + "Roughness.jpg")); L.new(mp.outputs[0], ro.inputs[0])
    no = N.new('ShaderNodeTexImage'); no.image = img(os.path.join(ZM, pre + "NormalGL.jpg")); L.new(mp.outputs[0], no.inputs[0])
    car = N.new('ShaderNodeMix'); car.data_type = 'RGBA'; car.blend_type = 'MULTIPLY'; car.inputs['Factor'].default_value = 1.0
    car.inputs[7].default_value = (1.0, 0.97, 0.92, 1); L.new(col.outputs[0], car.inputs[6]); L.new(car.outputs[2], bs.inputs['Base Color'])
    bs.inputs['Metallic'].default_value = 1.0
    rr = N.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = 0.22; rr.inputs['To Max'].default_value = 0.45
    L.new(ro.outputs[0], rr.inputs['Value']); L.new(rr.outputs[0], bs.inputs['Roughness'])
    nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0; L.new(no.outputs[0], nm.inputs['Color']); L.new(nm.outputs[0], bs.inputs['Normal'])
    L.new(op.outputs[0], bs.inputs['Alpha'])
    return m
boyunluk.data.materials.append(malz_zincir())
# UV: u=çevre, v=yükseklik (halka sıraları yatay)
uvl = boyunluk.data.uv_layers.new(name="UVMap")
bm = bmesh.new(); bm.from_mesh(boyunluk.data); uvb = bm.loops.layers.uv.verify()
for f in bm.faces:
    for lo in f.loops:
        co = lo.vert.co; a = math.atan2(co.y - hcy, co.x - hcx)
        lo[uvb].uv = (((a + math.pi / 2) % (2 * math.pi)) * 0.115, (KENAR_Z - co.z) * 1.0)
bm.to_mesh(boyunluk.data); bm.free()
for p in boyunluk.data.polygons: p.use_smooth = True
def boy_ag(i, v):
    t = max(0.0, min(1.0, (KENAR_Z - v.co.z) / 0.20))
    return {"head": 1 - t * 0.85, "neck_01": t * 0.45, "spine_03": t * 0.40}
iskelete_bagla(boyunluk, boy_ag)
igb = boyunluk.vertex_groups.new(name="igne")
for v in boyunluk.data.vertices:
    t = max(0.0, min(1.0, (KENAR_Z - v.co.z) / 0.20))
    igb.add([v.index], max(0.0, 1 - t / 0.12), 'REPLACE')

# =================================================================== 6) gövdede giysi altında kalan yüzleri gizle (maske)
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()
ortu = [entari, etek, salvar, cizme, lamel]
ortu_bvh = []
for o in ortu:
    ev = o.evaluated_get(dg); m_ = ev.to_mesh()
    ortu_bvh.append(BVHTree.FromPolygons([o.matrix_world @ v.co for v in m_.vertices], [p.vertices[:] for p in m_.polygons]))
    ev.to_mesh_clear()
gor = body.vertex_groups.get("gorunur") or body.vertex_groups.new(name="gorunur")
gizli = 0
for v in me.vertices:
    ortulu = False
    if v.co.z < 1.46 and not (KA[v.index].get("head", 0) > 0.3):
        for bt in ortu_bvh:
            h = bt.ray_cast(v.co + v.normal * 0.0005, v.normal, 0.06)
            if h[0] is not None:
                ortulu = True; break
    if v.co.z < 0.47: ortulu = True
    # eller ve yüz/boyun her zaman görünür
    if any(KA[v.index].get(n, 0) > 0.3 for n in ("hand_l", "hand_r")) or v.co.z > 1.46:
        ortulu = False
    if not ortulu: gor.add([v.index], 1.0, 'REPLACE')
    else: gizli += 1
mk = body.modifiers.new("GiysiAlti", 'MASK'); mk.vertex_group = "gorunur"
while body.modifiers.find("GiysiAlti") > 1:
    bpy.context.view_layer.objects.active = body; bpy.ops.object.modifier_move_up(modifier="GiysiAlti")
print("GOVDE gizlenen kose", gizli)

# =================================================================== dinlenme konumu öznitelikleri + toplu bilgi
for o in bpy.data.objects:
    if o.type == 'MESH' and o.name not in ("Piyade", "Plaka", "LamelNokta") and not o.name.startswith("Piyade."):
        if o.data.users > 1: o.data = o.data.copy()
        dinlenme_konumu(o)
tri = 0
for o in bpy.data.objects:
    if o.type == 'MESH' and not o.hide_render:
        tri += sum(len(p.vertices) - 2 for p in o.data.polygons)
print("TOPLAM UCGEN (taban)", tri)
rig.animation_data.action = bpy.data.actions.get("bekleme")
bpy.ops.wm.save_as_mainfile(filepath=out)
print("KAYDEDILDI", out)
