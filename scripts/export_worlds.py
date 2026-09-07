"""Blender 5.1, Eevee, 800x800, 24fps. Web export + night preview.
Run blender -b --python this_file -- shrine|station|water.
Sources are read-only; night versions live in each source project first level.
Generated GLB and metadata: web/public/worlds; diagnostics: web/intermediate.
"""
import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
WEB=Path(__file__).resolve().parents[1]
key=sys.argv[sys.argv.index('--')+1]
config={
 'shrine':('01_神社_木漏日','Komorebi_Shrine_Animated.blend',1,(0,.4,4.5),23),
 'station':('02_樱花车站','Sakura_Station_Animated.blend',280,(0,0,3),22),
 'water':('03_水世界漂浮堡垒','Water_Fortress_DetailFilm.blend',1,(0,0,3.6),42),
}
folder,filename,frame,target,size=config[key]
P=ROOT/folder
out=WEB/'public/worlds';out.mkdir(parents=True,exist_ok=True)
log=WEB/'intermediate';log.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(P/filename))
s=bpy.context.scene;s.frame_set(frame)
print('WEB_EXPORT',key,bpy.app.version_string,flush=True)
def point(name,loc,power=75,color=(1,.48,.16)):
 d=bpy.data.lights.new(name,'POINT');d.energy=power;d.color=color;d.shadow_soft_size=.35
 o=bpy.data.objects.new(name,d);s.collection.objects.link(o);o.location=loc;return o
if key=='shrine':
 for o in list(s.objects):
  if 'warm paper chamber' in o.name:point('WEB • path lantern '+o.name,o.matrix_world.translation,85)
if key=='station':
 for o in list(s.objects):
  if 'warm headlamp lens' in o.name:
   d=bpy.data.lights.new('WEB • headlight','SPOT');d.energy=110;d.color=(1,.76,.42);d.spot_size=.85;d.spot_blend=.6
   a=bpy.data.objects.new('WEB • headlight',d);s.collection.objects.link(a);a.parent=o.parent;a.location=o.location
   a.rotation_euler=Vector((-1 if o.location.x<0 else 1,0,-.15)).to_track_quat('-Z','Y').to_euler()
 for loc in [(-5,2.5,2),(4,3,2)]:point('WEB • night sakura',loc,150,(1,.32,.58))
moon=bpy.data.lights.new('WEB • moonlight','SUN');moon.energy=.65;moon.color=(.43,.58,1);moon.angle=.12
mo=bpy.data.objects.new('WEB • moonlight',moon);s.collection.objects.link(mo);mo.rotation_euler=(.45,-.5,-.6)
for o in s.objects:
 if o.type=='LIGHT' and o!=mo:
  if o.data.type in {'AREA','SUN'}:o.data.energy*=.025
  else:o.data.energy=max(o.data.energy,35)
for m in bpy.data.materials:
 if not m.use_nodes:continue
 bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if bs and any(t in m.name.lower() for t in ['paper','warm lights','lantern glass','window glow']):
  bs.inputs['Emission Color'].default_value=(1,.48,.16,1);bs.inputs['Emission Strength'].default_value=3
s.world.use_nodes=True
bg=s.world.node_tree.nodes.get('Background')
if bg:bg.inputs[0].default_value=(.025,.04,.10,1);bg.inputs[1].default_value=.22
s.render.engine='CYCLES';s.cycles.samples=12;s.cycles.use_denoising=True
s.render.resolution_x=800;s.render.resolution_y=800;s.render.resolution_percentage=100
s.render.fps=24
if key=='water':s.camera=bpy.data.objects.get('Camera • whole settlement',s.camera)
s.render.filepath=str(P/'intermediate'/('Web_Night_v01.png'))
s['Web_version']='v01 • 2026-09-07 • night lighting; browser lighting separately adapted'
bpy.ops.wm.save_as_mainfile(filepath=str(P/(Path(filename).stem+'_WebNight_v01.blend')))
# Render low-cost static validation before any export conversion.
bpy.ops.render.render(write_still=True)
lights=[]
for o in s.objects:
 if o.type=='LIGHT' and o.data.type in {'POINT','SPOT'}:
  v=o.matrix_world.translation
  lights.append({'name':o.name,'position':[v.x,v.z,-v.y],'color':list(o.data.color),'power':o.data.energy,'type':o.data.type})
# Evaluate modifiers and skin at the chosen pose; consolidate geometry per motion group.
# The authored animation remains intact in the versioned blend above.
deps=bpy.context.evaluated_depsgraph_get();groups={};original=list(s.objects)
for o in original:
 if o.type not in {'MESH','CURVE','FONT','SURFACE'} or o.hide_render:continue
 if any(t in o.name.lower() for t in ['backdrop','background','ground plane','studio floor','seamless']):continue
 group='environment'
 p=o
 while p:
  if p.name.startswith('TRAM') and 'master' in p.name:group='tram';break
  if p.name.startswith('Resident ') and p.type=='EMPTY':group=p.name;break
  p=p.parent
 try:
  mesh=bpy.data.meshes.new_from_object(o.evaluated_get(deps),depsgraph=deps)
  if not len(mesh.vertices):bpy.data.meshes.remove(mesh);continue
  n=bpy.data.objects.new('webpart',mesh);s.collection.objects.link(n);n.matrix_world=o.matrix_world
  groups.setdefault(group,[]).append(n)
 except Exception as e:print('SKIP',o.name,str(e),flush=True)
for o in original:bpy.data.objects.remove(o,do_unlink=True)
for group,obs in groups.items():
 bpy.ops.object.select_all(action='DESELECT')
 for o in obs:o.select_set(True)
 bpy.context.view_layer.objects.active=obs[0];bpy.ops.object.join();o=bpy.context.object;o.name=group
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
# Flatten procedural colors to their authored base; retain direct image textures.
for m in bpy.data.materials:
 if not m.use_nodes:continue
 bs=next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
 if not bs:continue
 for socket in ['Base Color','Roughness','Normal','Alpha']:
  inp=bs.inputs.get(socket)
  if inp and inp.is_linked and inp.links[0].from_node.type not in {'TEX_IMAGE','NORMAL_MAP'}:
   for link in list(inp.links):m.node_tree.links.remove(link)
 if 'water' in m.name.lower() or 'ocean' in m.name.lower():
  bs.inputs['Base Color'].default_value=(.055,.32,.40,1);bs.inputs['Alpha'].default_value=.88
  bs.inputs['Roughness'].default_value=.28
 if 'Signal' in m.name:m.node_tree.animation_data_clear()
for im in bpy.data.images:
 if im.size[0]>1024 or im.size[1]>1024:
  ratio=1024/max(im.size);im.scale(int(im.size[0]*ratio),int(im.size[1]*ratio))
bpy.ops.export_scene.gltf(filepath=str(out/(key+'.glb')),export_format='GLB',export_animations=False,export_cameras=False,export_lights=False,export_extras=True,export_image_format='AUTO')
meta={'id':key,'source':folder+'/'+filename,'nightVersion':Path(filename).stem+'_WebNight_v01.blend','blender':bpy.app.version_string,'frame':frame,'target':[target[0],target[2],-target[1]],'size':size,'lights':lights,'groups':list(groups),'animation':'evaluated pose; browser animates tram and environmental motion'}
(out/(key+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
print('WEB_EXPORT_COMPLETE',key,(out/(key+'.glb')).stat().st_size,flush=True)
