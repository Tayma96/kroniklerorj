# Kalite kanıtı 6/6 — klip işleme: NLA ile ön-koşu (kumaş yerleşir), kumaş benzetimi sırayla, kareleri yaz.
# Kullanım: blender -b sahne.blend --python k06_isle.py -- <klip> <cikti_klasoru> '<json>'
# klip: bekleme | saldiri | yakin | agirlik | kare
# json: {"ornek":64, "yuzde":100, "kareler":[...] (klip içi sıra, 1 tabanlı; yoksa hepsi), "kumas":true, "kam":"KamBoy"}
import bpy, sys, os, json, time, math
argv = sys.argv[sys.argv.index('--') + 1:]
klip, cik = argv[0], argv[1]
cfg = json.loads(argv[2]) if len(argv) > 2 else {}
os.makedirs(cik, exist_ok=True)
sc = bpy.context.scene; rig = bpy.data.objects["Iskelet"]
sc.cycles.samples = cfg.get("ornek", 64); sc.render.resolution_percentage = cfg.get("yuzde", 100)
if "esik" in cfg: sc.cycles.adaptive_threshold = cfg["esik"]
ad = rig.animation_data; ad.action = None
for tr in list(ad.nla_tracks): ad.nla_tracks.remove(tr)
tr = ad.nla_tracks.new()
ON = 30
if klip in ("bekleme", "yakin"):
    sc.render.fps = 24
    st = tr.strips.new("b", ON + 1, bpy.data.actions["bekleme"])
    st.action_frame_start, st.action_frame_end = 1, 97; st.repeat = 3; st.extrapolation = 'HOLD'
    if klip == "bekleme":
        kareler = list(range(ON + 1 + 96, ON + 1 + 192))            # ikinci döngü: kumaş dönemsel duruma oturmuş
        sc.camera = bpy.data.objects[cfg.get("kam", "KamBoy")]
    else:
        kareler = list(range(ON + 1, ON + 1 + 120))
        sc.camera = bpy.data.objects["KamYakin"]
        piv = bpy.data.objects["YakinPivot"]
        for fc in piv.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.co.x += ON; kp.handle_left.x += ON; kp.handle_right.x += ON
elif klip == "saldiri":
    sc.render.fps = 48
    st = tr.strips.new("s", 49, bpy.data.actions["saldiri"])
    st.extrapolation = 'HOLD'
    kareler = list(range(49, 49 + 121))
    sc.camera = bpy.data.objects[cfg.get("kam", "KamBoy")]
elif klip == "agirlik":
    sc.render.fps = 24
    st = tr.strips.new("a", ON + 1, bpy.data.actions["agirlik"]); st.extrapolation = 'HOLD'
    kk = json.loads(rig["agirlik_kareleri"])
    kareler = [ON + v for v in kk.values()]
    sc.camera = bpy.data.objects[cfg.get("kam", "KamTest")]
else:  # tek kare (gard)
    sc.render.fps = 24
    st = tr.strips.new("b", ON + 1, bpy.data.actions["bekleme"]); st.extrapolation = 'HOLD'
    kareler = [ON + 1]
    sc.camera = bpy.data.objects[cfg.get("kam", "KamBoy")]
if cfg.get("kareler"):
    kareler = [kareler[i - 1] for i in cfg["kareler"] if 0 < i <= len(kareler)]
if "bulanik" in cfg: sc.render.use_motion_blur = bool(cfg["bulanik"])
if "dosya" in cfg: pass
if not cfg.get("kumas", True):
    for o in bpy.data.objects:
        for m in o.modifiers:
            if m.type == 'CLOTH': m.show_render = m.show_viewport = False
son = max(kareler)
sc.frame_start, sc.frame_end = 1, son
for o in bpy.data.objects:
    for m in o.modifiers:
        if m.type == 'CLOTH': m.point_cache.frame_start = 1; m.point_cache.frame_end = son
def ozel_kamera(c):
    """Kemiğe göre yakın plan kamerası (poz karesinde kurulur)."""
    from mathutils import Vector
    pb = rig.pose.bones[c["kemik"]]
    t = rig.matrix_world @ pb.head.lerp(pb.tail, c.get("oran", 0.5)) + Vector(c.get("kaydir", (0, 0, 0)))
    if c.get("nesne"):
        t = bpy.data.objects[c["nesne"]].matrix_world @ Vector(c.get("yerel", (0, 0, 0)))
    cd = bpy.data.cameras.new("Ozel"); cam = bpy.data.objects.new("Ozel", cd); sc.collection.objects.link(cam)
    cd.lens = c.get("lens", 85); cam.location = t + Vector(c["yon"])
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cd.dof.use_dof = True; cd.dof.aperture_fstop = c.get("f", 2.8); cd.dof.focus_distance = (t - cam.location).length
    sc.camera = cam
t0 = time.time()
# kumaş: kareleri sırayla değerlendir (önbellek bellekte), sonra işle
hedef = set(kareler); say = 0
for f in range(1, son + 1):
    sc.frame_set(f)
    if f in hedef:
        if cfg.get("kam_ozel"): ozel_kamera(cfg["kam_ozel"])
        say += 1
        yol = os.path.join(cik, cfg.get("dosya", f"{say:04d}") + ("" if "dosya" not in cfg else ("" if len(kareler) == 1 else f"_{say}")) + ".png")
        if cfg.get("atla", True) and os.path.exists(yol) and os.path.getsize(yol) > 1000:
            continue   # kesintiden sonra sürdürme: kare hazır, kumaş yine de sırayla ilerledi
        sc.render.filepath = os.path.join(cik, cfg.get("dosya", f"{say:04d}") + ("" if "dosya" not in cfg else ("" if len(kareler) == 1 else f"_{say}")) + ".png")
        t1 = time.time()
        bpy.ops.render.render(write_still=True)
        print(f"KARE {say}/{len(kareler)} (sahne {f}) {time.time() - t1:.1f} sn", flush=True)
        with open(os.path.join(cik, f"durum_{klip}.json"), "w") as fh:
            json.dump({"klip": klip, "kare": say, "toplam": len(kareler), "son_kare_sn": round(time.time() - t1, 1)}, fh)
print("BITTI", klip, len(kareler), "kare", round(time.time() - t0, 1), "sn")
