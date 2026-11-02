# Kalite kanıtı 2/5 — 13. yy Anadolu Selçuklu kılıcı (hafif eğri, tek ağızlı, uçta yalman) + sağ el kavrayışı.
# Kullanım: blender -b in.blend --python k02_kilic.py -- out.blend <kaynak_klasoru>
# Ölçüler (dönem buluntularına yakın): namlu 78 cm, kök eni 3.6 cm, sırt kalınlığı 6 mm, sapma 3 cm;
# kabza 10.5 cm (deri sicim sargılı), düz balçak 14 cm (topuzlu uçlar, iki yanda dil), şapka biçimli topuz.
# Kavrayış: avuç yüzeyine oturan kabza; parmaklar eklem eklem kabzaya değene dek bükülür (içinden geçmez).
import bpy, bmesh, sys, os, math, json
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:]
out, KAY = argv[0], argv[1]
rig = bpy.data.objects["Iskelet"]; body = bpy.data.objects["Piyade"]
B = rig.data.bones
TEX = os.path.join(KAY, "tex")


# ------------------------------------------------------------------ malzemeler
def img(p, renk=False):
    im = bpy.data.images.load(p, check_existing=True)
    if not renk: im.colorspace_settings.name = 'Non-Color'
    return im


def malz_metal(ad, renk_yol, rough_yol, nor_yol, taban, rough_carp=1.0, olcek=4.0, kir=0.25, parlak_kenar=False):
    m = bpy.data.materials.new(ad); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links
    bs = N["Principled BSDF"]; bs.inputs['Metallic'].default_value = 1.0
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (olcek,) * 3
    L.new(tc.outputs['UV'] if not parlak_kenar else tc.outputs['Object'], mp.inputs['Vector'])
    trc = N.new('ShaderNodeTexImage'); trc.image = img(rough_yol); L.new(mp.outputs[0], trc.inputs[0])
    tcol = N.new('ShaderNodeTexImage'); tcol.image = img(renk_yol, True); L.new(mp.outputs[0], tcol.inputs[0])
    tno = N.new('ShaderNodeTexImage'); tno.image = img(nor_yol); L.new(mp.outputs[0], tno.inputs[0])
    if parlak_kenar:
        for t in (trc, tcol, tno): t.projection = 'BOX'; t.projection_blend = 0.3
    nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.6
    L.new(tno.outputs[0], nm.inputs['Color']); L.new(nm.outputs[0], bs.inputs['Normal'])
    # renk: dokunun ışıklılığı x taban rengi, kir/patina gürültüsü
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    L.new(tcol.outputs[0], mul.inputs[6]); mul.inputs[7].default_value = taban
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 35; nz.inputs['Detail'].default_value = 8
    L.new(tc.outputs['Object'], nz.inputs['Vector'])
    kr = N.new('ShaderNodeMapRange'); kr.inputs['From Min'].default_value = 0.5; kr.inputs['From Max'].default_value = 0.75
    kr.inputs['To Max'].default_value = kir
    L.new(nz.outputs['Fac'], kr.inputs['Value'])
    kirm = N.new('ShaderNodeMix'); kirm.data_type = 'RGBA'; kirm.inputs[7].default_value = (0.06, 0.045, 0.035, 1)
    L.new(kr.outputs[0], kirm.inputs['Factor']); L.new(mul.outputs[2], kirm.inputs[6])
    L.new(kirm.outputs[2], bs.inputs['Base Color'])
    rr = N.new('ShaderNodeMath'); rr.operation = 'MULTIPLY_ADD'; rr.inputs[1].default_value = rough_carp
    L.new(trc.outputs[0], rr.inputs[0]); L.new(kr.outputs[0], rr.inputs[2]); L.new(rr.outputs[0], bs.inputs['Roughness'])
    return m, bs, N, L


def malz_deri(ad, renk, olcek=6.0, rough=0.62):
    m = bpy.data.materials.new(ad); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; L = nt.links; bs = N["Principled BSDF"]
    d = os.path.join(TEX, "brown_leather")
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (olcek,) * 3
    L.new(tc.outputs['Object'], mp.inputs['Vector'])
    ts = []
    for f, renkli in (("Diffuse.jpg", True), ("Rough.jpg", False), ("nor_gl.jpg", False)):
        t = N.new('ShaderNodeTexImage'); t.image = img(os.path.join(d, f), renkli); t.projection = 'BOX'; t.projection_blend = 0.25
        L.new(mp.outputs[0], t.inputs[0]); ts.append(t)
    mul = N.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 0.85
    L.new(ts[0].outputs[0], mul.inputs[6]); mul.inputs[7].default_value = renk; L.new(mul.outputs[2], bs.inputs['Base Color'])
    rr = N.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = rough - 0.15; rr.inputs['To Max'].default_value = rough + 0.15
    L.new(ts[1].outputs[0], rr.inputs['Value']); L.new(rr.outputs[0], bs.inputs['Roughness'])
    nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.8
    L.new(ts[2].outputs[0], nm.inputs['Color']); L.new(nm.outputs[0], bs.inputs['Normal'])
    bs.inputs['Specular IOR Level'].default_value = 0.4
    return m


M9 = os.path.join(TEX, "Metal009"); M46 = os.path.join(TEX, "Metal046A")
celik, celik_bs, cN, cL = malz_metal("NamluCelik", os.path.join(M9, "Metal009_2K-JPG_Color.jpg"),
                                     os.path.join(M9, "Metal009_2K-JPG_Roughness.jpg"),
                                     os.path.join(M9, "Metal009_2K-JPG_NormalGL.jpg"), (0.78, 0.78, 0.80, 1),
                                     rough_carp=0.55, olcek=1.0, kir=0.18)
# namlu: uzunluk boyunca fırça izi (UV: u=uzunluk), ağızda bilenmiş parlak şerit (kenar özniteliği)
at = cN.new('ShaderNodeAttribute'); at.attribute_name = "agiz"
kmix = cN.new('ShaderNodeMath'); kmix.operation = 'MULTIPLY_ADD'; kmix.inputs[1].default_value = -0.12
kmix.inputs[2].default_value = 0.0
rnode = celik_bs.inputs['Roughness'].links[0].from_node
cL.new(at.outputs['Fac'], kmix.inputs[0])
add = cN.new('ShaderNodeMath'); add.operation = 'ADD'; add.use_clamp = True
cL.new(rnode.outputs[0], add.inputs[0]); cL.new(kmix.outputs[0], add.inputs[1]); cL.new(add.outputs[0], celik_bs.inputs['Roughness'])
demir, _, _, _ = malz_metal("DovmeDemir", os.path.join(M46, "Metal046A_2K-JPG_Color.jpg"),
                            os.path.join(M46, "Metal046A_2K-JPG_Roughness.jpg"),
                            os.path.join(M46, "Metal046A_2K-JPG_NormalGL.jpg"), (0.55, 0.53, 0.52, 1),
                            rough_carp=0.9, olcek=6.0, kir=0.3, parlak_kenar=True)
sicim = malz_deri("SapSicim", (0.30, 0.17, 0.09, 1), olcek=14.0, rough=0.55)

# ------------------------------------------------------------------ kılıç geometrisi (yerel: +Z namlu ucu, +Y ağız, X yassı yüz)
L_NAM = 0.78; Z0 = 0.068; SAG = 0.030; GRIP_A, GRIP_B = 0.0135, 0.0105


def namlu():
    bm = bmesh.new(); ag = bm.verts.layers.float.new("agiz") if False else None
    n = 72; halkalar = []
    kenar_degerleri = []
    for i in range(n + 1):
        s = i / n; z = Z0 + L_NAM * s
        en = 0.036 - 0.008 * s
        if s > 0.9: en *= max(0.0, (1 - s) / 0.1) ** 0.75
        en = max(en, 0.0006)
        kal = 0.0062 - 0.0030 * s
        yc = -SAG * s * s  # merkez çizgisi sırta doğru eğilir (ağız dış bükey)
        yalman = s > 0.72  # uçta sırt da bilenir
        yb = yc - en * 0.5; ya = yc + en * 0.5
        sirt = kal * (0.25 if yalman else 1.0) * (1 - 0.6 * max(0, (s - 0.72) / 0.28) if yalman else 1)
        kesit = [  # (y, x, ağız_mı)
            (ya, 0.0, 1.0),
            (ya - en * 0.16, kal * 0.30, 0.6),
            (yb + en * 0.62, kal * 0.48, 0.0),
            (yb + en * 0.40, kal * (0.30 if not yalman else 0.42), 0.0),   # oluk
            (yb + en * 0.18, kal * 0.46, 0.0),
            (yb + (0.0006 if not yalman else en * 0.10), sirt * 0.5, 0.0 if not yalman else 0.5),
        ]
        if yalman:
            kesit.append((yb, 0.0, 1.0))
        tam = kesit + [(y, -x, a) for (y, x, a) in reversed(kesit[1:-1] if yalman else kesit[1:])]
        if not yalman:
            tam = kesit + [(yb, 0.0, 0.0)] + [(y, -x, a) for (y, x, a) in reversed(kesit[1:])]
        halkalar.append([(Vector((x, y, z)), a) for (y, x, a) in tam])
    # yalman geçişinde nokta sayısı değişir: hepsini en büyük sayıya eşitle (son noktayı tekrarla)
    mx = max(len(h) for h in halkalar)
    halkalar = [h + [h[-1]] * (mx - len(h)) for h in halkalar]
    vs = [[bm.verts.new(p) for p, _ in h] for h in halkalar]
    bm.verts.ensure_lookup_table()
    for i in range(n):
        for j in range(mx):
            a, b, c, d = vs[i][j], vs[i][(j + 1) % mx], vs[i + 1][(j + 1) % mx], vs[i + 1][j]
            try: bm.faces.new((a, b, c, d))
            except ValueError: pass
    uc = bm.verts.new(Vector((0, -SAG, Z0 + L_NAM + 0.002)))
    for j in range(mx):
        try: bm.faces.new((vs[n][j], vs[n][(j + 1) % mx], uc))
        except ValueError: pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.00005)
    taban = bm.faces.new(vs[0][::-1]) if False else None
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("Namlu"); bm.to_mesh(me); bm.free()
    # ağız özniteliği: kesit içindeki konuma göre (x yakın 0 ve y uçta)
    at_ = me.attributes.new("agiz", 'FLOAT', 'POINT')
    for v in me.vertices:
        s = (v.co.z - Z0) / L_NAM; yc = -SAG * s * s; en = max(0.036 - 0.008 * s, 0.001)
        rel = (v.co.y - yc) / en
        val = max(0.0, min(1.0, (rel - 0.30) / 0.2))
        if s > 0.72: val = max(val, max(0.0, min(1.0, (-rel - 0.30) / 0.2)))
        at_.data[v.index].value = val
    # UV: u = uzunluk, v = kesit (fırça izi uzunlamasına)
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uvl.data[li].uv = ((co.z - Z0) * 2.0, co.y * 12 + co.x * 30)
    ob = bpy.data.objects.new("Namlu", me); bpy.context.scene.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    me.materials.append(celik)
    ws = ob.modifiers.new("Kenar", 'WEIGHTED_NORMAL'); ws.keep_sharp = True
    return ob


def tup(ad, profil, z0, z1, n=40, seg=24, malz=demir, yassi=1.0):
    """Döner gövde: profil(t)->yarıçap; yassı: X/Y oranı (oval kesit)."""
    bm = bmesh.new(); halk = []
    for i in range(n + 1):
        t = i / n; z = z0 + (z1 - z0) * t; r = profil(t)
        halk.append([bm.verts.new((r * math.cos(2 * math.pi * k / seg) * yassi, r * math.sin(2 * math.pi * k / seg), z)) for k in range(seg)])
    for i in range(n):
        for k in range(seg):
            bm.faces.new((halk[i][k], halk[i][(k + 1) % seg], halk[i + 1][(k + 1) % seg], halk[i + 1][k]))
    bm.faces.new(halk[0][::-1]); bm.faces.new(halk[-1])
    me = bpy.data.meshes.new(ad); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = True
    uv = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (math.atan2(co.y, co.x) / 6.283, co.z * 4)
    ob = bpy.data.objects.new(ad, me); bpy.context.scene.collection.objects.link(ob); me.materials.append(malz)
    return ob


parcalar = [namlu()]
# kabza çekirdeği (ahşap, sargı altında) — hafif bel verilmiş oval
kabza = tup("Kabza", lambda t: 1.0 - 0.06 * math.sin(math.pi * t), -0.055, Z0 - 0.012, n=16, seg=20, malz=sicim)
kabza.scale = (GRIP_B * 0.92, GRIP_A * 0.92, 1.0)
parcalar.append(kabza)
# deri sicim sargısı: sarmal boru
cv = bpy.data.curves.new("Sargi", 'CURVE'); cv.dimensions = '3D'; cv.bevel_depth = 0.0016; cv.bevel_resolution = 2
sp = cv.splines.new('POLY'); tur = 24; adim = 360
sp.points.add(adim - 1)
for i in range(adim):
    t = i / (adim - 1); a = 2 * math.pi * tur * t; z = -0.053 + (Z0 - 0.016 + 0.053) * t
    bel = 1.0 - 0.06 * math.sin(math.pi * t)
    sp.points[i].co = (math.cos(a) * GRIP_B * 0.92 * bel, math.sin(a) * GRIP_A * 0.92 * bel, z, 1)
sargi = bpy.data.objects.new("Sargi", cv); bpy.context.scene.collection.objects.link(sargi); cv.materials.append(sicim)
parcalar.append(sargi)
# topuz (şapka biçimli, perçinli)
parcalar.append(tup("Topuz", lambda t: (0.0165 - 0.006 * t ** 2) if t < 0.85 else 0.0165 * max(0.0, 1 - (t - 0.85) / 0.15) ** 0.5 + 0.004,
                    -0.074, -0.054, n=18, seg=28, yassi=0.85))
parcalar[-1].scale = (1.0, 1.0, 1.0)
# balçak: yassı çubuk, uçları topuzlu, iki yüzde namluya inen dil
bm = bmesh.new()
bmesh.ops.create_cube(bm, size=1.0)
for v in bm.verts: v.co = Vector((v.co.x * 0.016, v.co.y * 0.118, v.co.z * 0.013 + Z0 - 0.006))
me = bpy.data.meshes.new("Balcak"); bm.to_mesh(me); bm.free()
balcak = bpy.data.objects.new("Balcak", me); bpy.context.scene.collection.objects.link(balcak); me.materials.append(demir)
bv = balcak.modifiers.new("Pah", 'BEVEL'); bv.width = 0.0035; bv.segments = 3
sub = balcak.modifiers.new("Yumusak", 'SUBSURF'); sub.levels = 2; sub.render_levels = 2
parcalar.append(balcak)
for sy in (-1, 1):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.0095, location=(0, sy * 0.066, Z0 - 0.006), segments=20, ring_count=12)
    o = bpy.context.object; o.scale = (0.85, 1.0, 0.9); o.data.materials.append(demir)
    for p in o.data.polygons: p.use_smooth = True
    parcalar.append(o)
for sx in (-1, 1):  # dil (langet): namlunun yüzüne binen üçgen
    bm = bmesh.new()
    a = bm.verts.new((sx * 0.0045, -0.011, Z0)); b = bm.verts.new((sx * 0.0045, 0.011, Z0))
    c = bm.verts.new((sx * 0.0036, 0.0, Z0 + 0.034))
    a2 = bm.verts.new((sx * 0.0068, -0.011, Z0)); b2 = bm.verts.new((sx * 0.0068, 0.011, Z0)); c2 = bm.verts.new((sx * 0.0048, 0.0, Z0 + 0.034))
    bm.faces.new((a, b, c)); bm.faces.new((a2, c2, b2)); bm.faces.new((a, a2, b2, b)); bm.faces.new((b, b2, c2, c)); bm.faces.new((c, c2, a2, a))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new("Dil"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("Dil", me); bpy.context.scene.collection.objects.link(o); me.materials.append(demir)
    bv = o.modifiers.new("Pah", 'BEVEL'); bv.width = 0.0008; bv.segments = 2
    parcalar.append(o)

# hepsini tek nesnede birleştir
for o in parcalar:
    for md in list(o.modifiers):
        pass
bpy.ops.object.select_all(action='DESELECT')
for o in parcalar:
    if o.type == 'CURVE':
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.convert(target='MESH'); o.select_set(False)
for o in parcalar:
    o.select_set(True)
    bpy.context.view_layer.objects.active = o
    for md in list(o.modifiers):
        if md.type != 'WEIGHTED_NORMAL':
            bpy.ops.object.modifier_apply(modifier=md.name)
    o.select_set(False)
bpy.ops.object.select_all(action='DESELECT')
for o in parcalar:
    o.select_set(True)
bpy.context.view_layer.objects.active = parcalar[0]
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bpy.ops.object.join()
kilic = bpy.context.object; kilic.name = "Kilic"
print("KILIC UCGEN", sum(len(p.vertices) - 2 for p in kilic.data.polygons))

# ------------------------------------------------------------------ kavrayış (dinlenme duruşunda)
H = {n: B[n] for n in B.keys()}
hd = H["hand_r"].head_local; mid = H["middle_01_r"].head_local
idx, pnk = H["index_01_r"].head_local, H["pinky_01_r"].head_local
f = (mid - hd).normalized()
k = (idx - pnk).normalized()
k = (k - f * k.dot(f)).normalized()
# avuç yönü: parmakların büküldüğü taraf
curl = (H["index_03_r"].tail_local - H["index_01_r"].head_local)
npalm = (curl - f * curl.dot(f) - k * curl.dot(k)).normalized()
# avuç derisi: kemik çizgisinden avuç yönüne ışın
me = body.data
bvh = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [p.vertices[:] for p in me.polygons])
def avuc_deri(p0):
    h_, _, _, _ = bvh.ray_cast(p0 - npalm * 0.005, npalm, 0.06)
    return h_ if h_ is not None else p0 + npalm * 0.012
# kabza avuçta çapraz durur: işaret parmağı kökünden (MCP'nin hemen altı) serçe tarafı avuç topuğuna
# deri köşelerini en baskın KEMİK grubuna ata
gruplar = {vg.index: vg.name for vg in body.vertex_groups}
baskin = {}
for v in me.vertices:
    best = max((gg for gg in v.groups if gruplar[gg.group] in B), key=lambda gg: gg.weight, default=None)
    if best is not None and best.weight > 0.45:
        baskin.setdefault(gruplar[best.group], []).append(v.co.copy())
dunya = {n: Matrix.Identity(4) for n in B.keys()}
def aktarim(bad):
    m = Matrix.Identity(4); b = B[bad]; zincir = []
    while b is not None and b.name != "hand_r":
        zincir.append(b.name); b = b.parent
    for n in reversed(zincir):
        m = m @ dunya[n]
    return m
def dondur(bad, aci, eksen):
    piv = B[bad].head_local
    dunya[bad] = Matrix.Translation(piv) @ Matrix.Rotation(aci, 4, eksen) @ Matrix.Translation(-piv)
def nokta(bad, p):
    return aktarim(bad) @ p
# zincir köşeleri: (dinlenme konumu, [(kemik, ağırlık)]) — eklem kıvrımındaki köşeler (kemik başına <9 mm) temas testine girmez
zincir_kose = {}
for v in me.vertices:
    ws = [(gruplar[gg.group], gg.weight) for gg in v.groups if gruplar[gg.group] in B and gg.weight > 0.01]
    tw = sum(w for _, w in ws)
    if tw <= 0: continue
    ws = [(n, w / tw) for n, w in ws]
    for ad in ("index", "middle", "ring", "pinky", "thumb"):
        zw = sum(w for n, w in ws if n.startswith(ad) and n.endswith("_r"))
        if zw > 0.25:
            zincir_kose.setdefault(ad, []).append((v.co.copy(), ws))
def lbs(p, ws):
    q = Vector((0, 0, 0))
    for n, w in ws:
        q += (aktarim(n) @ p) * w if n in dunya and n not in ("hand_r",) else p * w
    return q
def zincir_carpar(ad, bas_kemik=None):
    for p, ws in zincir_kose[ad]:
        if bas_kemik is not None and sum(w for n, w in ws if n == bas_kemik or n > bas_kemik and n.startswith(ad)) < 0.3:
            continue
        if iceride(lbs(p, ws), 0.0008):
            return True
    return False
# anatomik bükülme ekseni: boğum çizgisi (k); işaret: uç avuca gitmeli
eksen_bukum = k.copy()
uc = H["middle_03_r"].tail_local; piv = H["middle_01_r"].head_local
if ((Matrix.Rotation(0.2, 3, eksen_bukum) @ (uc - piv)) + piv - uc).dot(npalm) < 0:
    eksen_bukum = -eksen_bukum
SINIR = {"01": 88, "02": 100, "03": 75}

def kur_kabza(df, dn, aci):
    """Kabzayı avuçta yerleştir: df proksimal kayma, dn avuçtan uzaklık, aci: k'dan f'ye eğim (derece)."""
    global K_rest, Minv, g, e, x
    g = (k * math.cos(math.radians(aci)) + f * math.sin(math.radians(aci))).normalized()
    e = (f - g * f.dot(g)).normalized(); x = g.cross(e).normalized()
    R = Matrix((x, e, g)).transposed()
    nl = R.transposed() @ npalm
    r_av = 1.0 / math.sqrt((nl.x / (GRIP_B * 0.92)) ** 2 + (nl.y / (GRIP_A * 0.92)) ** 2 + 1e-9)
    taban = avuc_deri(hd.lerp(mid, 0.80) - f * df + k * 0.006)
    merkez = taban + npalm * (r_av + dn)
    K_rest = Matrix.Translation(merkez) @ R.to_4x4(); Minv = K_rest.inverted()

def iceride(p_arm, pay):
    q = Minv @ p_arm
    if q.z < -0.060 or q.z > 0.064: return False
    return (q.x / (GRIP_B * 0.92 + pay)) ** 2 + (q.y / (GRIP_A * 0.92 + pay)) ** 2 < 1.0

def parmaklari_kapat():
    """Birlikte bükülme (01:02:03 = 0.85:1.0:0.7), ilk temasta dur; sonra temas etmeyen uç boğumları ayrı ayrı kapat."""
    kv = {}; acik = 0.0
    for ad in ("index", "middle", "ring", "pinky"):
        zin = [f"{ad}_01_r", f"{ad}_02_r", f"{ad}_03_r"]
        oran = (0.85, 1.0, 0.7)
        def kur(t):
            for bad, o in zip(zin, oran):
                dondur(bad, min(t * o, math.radians(SINIR[bad[-4:-2]])), eksen_bukum)
        def carpar(bas=0):
            return zincir_carpar(ad, zin[bas] if bas else None)
        t_ok = 0.0
        for adim_ in range(1, 61):
            t = math.radians(2.0 * adim_); kur(t)
            if carpar(): break
            t_ok = t
        kur(t_ok)
        acilar = [min(t_ok * o, math.radians(SINIR[bd[-4:-2]])) for bd, o in zip(zin, oran)]
        for j in (1, 2):  # uç boğumlar: temas edene dek
            bad = zin[j]
            while acilar[j] + math.radians(2) <= math.radians(SINIR[bad[-4:-2]]):
                dondur(bad, acilar[j] + math.radians(2), eksen_bukum)
                if carpar(j): dondur(bad, acilar[j], eksen_bukum); break
                acilar[j] += math.radians(2)
        for bd, a_ in zip(zin, acilar): kv[bd] = a_
        ucn = nokta(zin[2], B[zin[2]].tail_local); q = Minv @ ucn
        r = math.sqrt((q.x / (GRIP_B * 0.92)) ** 2 + (q.y / (GRIP_A * 0.92)) ** 2)
        acik += max(0.0, r - 1.15)
    return kv, acik

en_iyi_kur = None
for df in (0.006, 0.012, 0.018, 0.024, 0.030):
    for dn in (-0.005, -0.0025, 0.0008):
        for aci in (12, 22, 32):
            kur_kabza(df, dn, aci)
            kv, acik = parmaklari_kapat()
            toplam = sum(kv.values())
            puan = acik * 3.0 - toplam * 0.02
            if en_iyi_kur is None or puan < en_iyi_kur[0]:
                en_iyi_kur = (puan, df, dn, aci)
print("KABZA YERI", en_iyi_kur)
kur_kabza(*en_iyi_kur[1:])
kivrim, _ = parmaklari_kapat()
kilic.matrix_world = rig.matrix_world @ K_rest
# başparmak: kabzanın üstünden işaret parmağının orta boğumuna kapanır (ızgara arama + temas)
TZ = ("thumb_01_r", "thumb_02_r", "thumb_03_r")
def bas_carp():
    return any(iceride(nokta(alt, p), 0.0010) for alt in TZ for p in baskin.get(alt, [])[::2])
def bas_kur(a1, a2, a3):
    piv = B["thumb_01_r"].head_local
    Rm = Matrix.Rotation(a1, 4, g) @ Matrix.Rotation(a2, 4, f)
    dunya["thumb_01_r"] = Matrix.Translation(piv) @ Rm @ Matrix.Translation(-piv)
    dondur("thumb_02_r", a3, eksen_bukum); dondur("thumb_03_r", a3 * 1.1, eksen_bukum)
hedef_b = aktarim("index_02_r") @ B["index_02_r"].head_local
hedef_b = hedef_b - npalm * 0.012
en = (1e9, 0, 0, 0)
for i1 in range(-12, 13):
    for i2 in range(-8, 9):
        for i3 in (0, 10, 20, 30, 40, 50):
            a1, a2, a3 = math.radians(5 * i1), math.radians(5 * i2), math.radians(i3)
            bas_kur(a1, a2, a3)
            uc = aktarim("thumb_03_r") @ B["thumb_03_r"].tail_local
            d = (uc - hedef_b).length
            if d < en[0] and not bas_carp():
                en = (d, a1, a2, a3)
bas_kur(*en[1:])
print("BASPARMAK", round(en[0], 4), [round(math.degrees(a), 1) for a in en[1:]])
for bad in TZ: kivrim[bad] = 0.0
# yerel dönüş dörtlükleri: delta (armature uzayı) -> kemik yerel
kav = {}
for bad in kivrim:
    b = B[bad]
    Rl = b.matrix_local.to_3x3()
    D = dunya[bad].to_3x3()
    q = (Rl.inverted() @ D @ Rl).to_quaternion()
    kav[bad] = list(q)
    print("KAVRAMA", bad, round(math.degrees(kivrim[bad]), 1))
rig["kavrama_r"] = json.dumps(kav)
# kılıcı sağ ele bağla (kemik ucu ebeveyni)
hb = rig.pose.bones["hand_r"]
kilic.parent = rig; kilic.parent_type = 'BONE'; kilic.parent_bone = "hand_r"
P_bone = rig.matrix_world @ H["hand_r"].matrix_local @ Matrix.Translation((0, H["hand_r"].length, 0))
kilic.matrix_parent_inverse = P_bone.inverted()
kilic.matrix_basis = rig.matrix_world @ K_rest
rig["kilic_el"] = json.dumps([list(r) for r in (H["hand_r"].matrix_local.inverted() @ K_rest)])
for bad, q in kav.items():
    pb = rig.pose.bones[bad]; pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = Quaternion(q)
bpy.ops.wm.save_as_mainfile(filepath=out)
print("KAYDEDILDI", out)
