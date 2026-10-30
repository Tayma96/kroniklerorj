import bpy, sys, os
out = sys.argv[sys.argv.index('--') + 1]
rig = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
rig.animation_data.action = None
for t in rig.animation_data.nla_tracks:
    t.mute = False; t.is_solo = False
print("IZLER", [(t.name, [(s.action.name, tuple(s.action.frame_range)) for s in t.strips]) for t in rig.animation_data.nla_tracks])
for o in bpy.data.objects:
    o.select_set(False)
    print("NESNE", o.name, o.type, "gizli" if o.hide_get() or o.hide_render else "")
bpy.context.scene.frame_set(0)
bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', export_yup=True, use_visible=True,
    export_apply=True, export_texcoords=True, export_normals=True, export_tangents=False,
    export_image_format='AUTO', export_materials='EXPORT',
    export_skins=True, export_influence_nb=4, export_all_influences=False, export_def_bones=False,
    export_morph=False, export_animations=True, export_animation_mode='NLA_TRACKS',
    export_force_sampling=True, export_optimize_animation_size=True, export_anim_slide_to_zero=True,
    export_frame_range=False, export_reset_pose_bones=True, export_rest_position_armature=True,
    export_leaf_bone=False, export_extras=False, export_cameras=False, export_lights=False)
print("GLB", out, os.path.getsize(out))
