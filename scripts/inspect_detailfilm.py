import bpy
s=bpy.context.scene
print('FRAME',s.frame_start,s.frame_end,'CAMERAS',[o.name for o in bpy.data.objects if o.type=='CAMERA'])
print('LIGHTS',[(o.name,o.data.type,o.data.energy) for o in bpy.data.objects if o.type=='LIGHT'][:30])
print('ANIMS',[(o.name,bool(o.animation_data),getattr(o.data,'shape_keys',None) is not None) for o in bpy.data.objects if o.animation_data or (o.type=='MESH' and getattr(o.data,'shape_keys',None))][:25])
