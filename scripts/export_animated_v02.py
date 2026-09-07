"""Blender 5.1; read-only source conversion, glTF animation at 24fps sampled every 2 frames.
No rendering or blend mutation. GLB public/worlds/*-v02.glb; report intermediate/.
"""
import bpy,json,sys
from pathlib import Path
from mathutils import Matrix
W=Path(__file__).resolve().parents[1];R=W.parent
key=sys.argv[sys.argv.index('--')+1]
folder,stem={'shrine':('01_神社_木漏日','Komorebi_Shrine_Animated'),'station':('02_樱花车站','Sakura_Station_Animated'),'water':('03_水世界漂浮堡垒','Water_Fortress_AssetWorld')}[key]
bpy.ops.wm.open_mainfile(filepath=str(R/folder/(stem+'.blend')))
s=bpy.context.scene;s.frame_set(1);s.render.fps=24
original=list(s.objects)
keep=set()
for o in original:
 if o.animation_data or o.type=='ARMATURE' or (o.type=='MESH' and (o.data.shape_keys or any(m.type=='ARMATURE' for m in o.modifiers))):
  p=o
  while p:keep.add(p);p=p.parent
deps=bpy.context.evaluated_depsgraph_get();groups={};remove=[]
for o in original:
 o['source_name']=o.name
 if o.type in {'LIGHT','CAMERA'}:remove.append(o);continue
 if o.hide_render or any(x in o.name.lower() for x in ['backdrop','background','ground plane','studio floor','seamless','presentation ground']):
  if o not in keep:remove.append(o)
  continue
 if o in keep:continue
 if o.type not in {'MESH','CURVE','FONT','SURFACE'}:remove.append(o);continue
 parent=o.parent
 while parent and parent not in keep:parent=parent.parent
 local=o.matrix_local.copy() if o.parent else o.matrix_world.copy();p=o.parent
 while p and p!=parent:local=p.matrix_local@local;p=p.parent
 mesh=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps)
 if len(mesh.vertices):
  mesh.transform(local);n=bpy.data.objects.new('web_static',mesh);s.collection.objects.link(n);groups.setdefault(parent,[]).append(n)
 remove.append(o)
print('CONSOLIDATE',key,len(keep),len(remove),flush=True)
for o in remove:bpy.data.objects.remove(o,do_unlink=True)
for parent,obs in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();n=bpy.context.object;n.name='Static • '+(parent.name if parent else 'environment')
 if parent:n.parent=parent;n.matrix_parent_inverse=Matrix.Identity(4);n.matrix_basis=Matrix.Identity(4)
 n.data.validate(verbose=False)
for o in s.objects:
 if o.type=='MESH':o.hide_render=False
for m in bpy.data.materials:
 if not m.use_nodes:continue
 bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if not bs:continue
 for socket in ['Base Color','Roughness','Normal','Alpha']:
  inp=bs.inputs.get(socket)
  if inp and inp.is_linked and inp.links[0].from_node.type not in {'TEX_IMAGE','NORMAL_MAP'}:
   for l in list(inp.links):m.node_tree.links.remove(l)
 if 'water' in m.name.lower() or 'ocean' in m.name.lower():
  bs.inputs['Base Color'].default_value=(.04,.20,.26,1);bs.inputs['Alpha'].default_value=.94;bs.inputs['Roughness'].default_value=.4
 # Only the intended emitting surfaces; avoid minimum-strength promotion of all materials.
 strength=bs.inputs.get('Emission Strength')
 if strength and strength.default_value>0:strength.default_value=min(strength.default_value,.65)
for im in bpy.data.images:
 if max(im.size)>1024:ratio=1024/max(im.size);im.scale(int(im.size[0]*ratio),int(im.size[1]*ratio))
s.frame_end+=1
print('ANIMATION_EXPORT',len(s.objects),s.frame_end,flush=True)
bpy.ops.export_scene.gltf(filepath=str(W/'public/worlds'/(key+'-v02.glb')),export_format='GLB',export_animations=True,export_animation_mode='SCENE',export_frame_range=True,export_frame_step=2,export_force_sampling=True,export_bake_animation=True,export_optimize_animation_size=True,export_morph=True,export_morph_normal=False,export_skins=True,export_cameras=False,export_lights=False,export_extras=True,export_apply=False)
print('ANIMATED_EXPORT_COMPLETE',key,flush=True)
