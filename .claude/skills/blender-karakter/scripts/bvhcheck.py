import bpy, sys, json
argv=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_anim.bvh(filepath=argv[0], global_scale=1.0, rotate_mode='NATIVE', axis_forward='-Z', axis_up='Y')
arm=bpy.context.object; sc=bpy.context.scene
out={}
for f in [int(x) for x in argv[2].split(',')]:
    sc.frame_set(f)
    out[f]={b.name:[list(arm.matrix_world@b.head), list(arm.matrix_world@b.tail)] for b in arm.pose.bones}
json.dump(out, open(argv[1],'w'))
print('bones', len(arm.pose.bones), 'frames', sc.frame_end)
