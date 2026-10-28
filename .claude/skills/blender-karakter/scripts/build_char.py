# Gerçekçi karakter kur (MPFB) ve .blend olarak kaydet. Kullanım:
# blender -b --python build_char.py -- out.blend [yapı json]
import bpy, sys, os, json
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
argv = sys.argv[sys.argv.index('--')+1:]
out = argv[0]
cfg = json.loads(argv[1]) if len(argv) > 1 else {}
bpy.ops.wm.read_factory_settings(use_empty=True)
D = LocationService.get_user_data()
def P(*a): return os.path.join(D, *a)
macro = {"gender": 1.0, "age": 0.62, "muscle": 0.72, "weight": 0.55, "proportions": 0.6, "height": 0.62,
         "cupsize": 0.5, "firmness": 0.5, "race": {"asian": 0.18, "caucasian": 0.74, "african": 0.08}}
macro.update({k: v for k, v in cfg.get("macro", {}).items() if k != "race"})
if "race" in cfg.get("macro", {}): macro["race"] = cfg["macro"]["race"]
body = HumanService.create_human(macro_detail_dict=macro)
body.name = cfg.get("name", "Savasci")
rig = HumanService.add_builtin_rig(body, cfg.get("rig", "cmu_mb"))
skin = cfg.get("skin", "middleage_caucasian_male/middleage_caucasian_male.mhmat")
HumanService.set_character_skin(P("skins", skin), body, skin_type="ENHANCED_SSS")
sub = cfg.get("subdiv", 1)
def add(path, kind, mat="MAKESKIN"):
    if not os.path.isfile(path): print("YOK", path); return None
    return HumanService.add_mhclo_asset(path, body, asset_type=kind, subdiv_levels=sub, material_type=mat)
add(P("eyes", "high-poly", "high-poly.mhclo"), "eyes", cfg.get("eyes_mat", "PROCEDURAL_EYES"))
add(P("eyebrows", cfg.get("eyebrows", "eyebrow002"), cfg.get("eyebrows", "eyebrow002") + ".mhclo"), "eyebrows")
add(P("eyelashes", "eyelashes01", "eyelashes01.mhclo"), "eyelashes")
add(P("teeth", "teeth_base", "teeth_base.mhclo"), "teeth")
add(P("tongue", "tongue01", "tongue01.mhclo"), "tongue")
if cfg.get("hair", "short02"): add(P("hair", cfg.get("hair", "short02"), cfg.get("hair", "short02") + ".mhclo"), "hair")
for c in cfg.get("clothes", []):
    add(P("clothes", c, c + ".mhclo"), "Clothes")
bpy.ops.wm.save_as_mainfile(filepath=out)
print("KAYDEDILDI", out, [o.name for o in bpy.data.objects])
