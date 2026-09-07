"""Read-only Blender 5.1 reopen checks; no render or source mutation.
800x800 night validation settings, 24fps. Report: web/intermediate/night-verification.json.
"""
import bpy,json
from pathlib import Path
web=Path(__file__).resolve().parents[1];root=web.parent;report=[]
for folder,stem in [('01_神社_木漏日','Komorebi_Shrine_Animated'),('02_樱花车站','Sakura_Station_Animated'),('03_水世界漂浮堡垒','Water_Fortress_AssetWorld')]:
 path=root/folder/(stem+'_WebNight_v01.blend');bpy.ops.wm.open_mainfile(filepath=str(path));s=bpy.context.scene
 missing=[im.name for im in bpy.data.images if im.source=='FILE' and not im.packed_file and not im.has_data and not Path(bpy.path.abspath(im.filepath)).is_file()]
 assert not missing,(path,missing)
 assert s.camera and any(o.type=='LIGHT' and 'moonlight' in o.name for o in s.objects)
 report.append({'file':str(path),'objects':len(s.objects),'camera':s.camera.name,'missingImages':missing,'engine':s.render.engine,'resolution':[s.render.resolution_x,s.render.resolution_y],'fps':s.render.fps,'opened':True})
(web/'intermediate/night-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print('NIGHT_REOPEN_PASS',len(report))
