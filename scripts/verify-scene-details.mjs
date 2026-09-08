import assert from 'node:assert/strict';
import * as T from 'three';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import {SceneDetails,courtyardRoute} from '../lib/scene-details.ts';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
const reports=[];
for(const id of ['shrine','water']){
 const doc=await io.read(`public/worlds/${id}-${id==='water'?'v04':'v02'}.glb`),root=new T.Group(),nodes=new Map();
 for(const n of doc.getRoot().listNodes()){
  const makeMesh=()=>new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshStandardMaterial());
  const object=n.getMesh()?(n.getMesh().listPrimitives().length>1?new T.Group():makeMesh()):new T.Object3D();
  if(object instanceof T.Group)n.getMesh().listPrimitives().forEach(()=>object.add(makeMesh()));
  object.name=T.PropertyBinding.sanitizeNodeName(n.getName());object.position.fromArray(n.getTranslation());object.quaternion.fromArray(n.getRotation());object.scale.fromArray(n.getScale());nodes.set(n,object);
 }
 for(const[n,o]of nodes){for(const child of n.listChildren())o.add(nodes.get(child));if(!n.getParentNode())root.add(o)}
 const clips=doc.getRoot().listAnimations().map(a=>new T.AnimationClip(a.getName(),-1,a.listChannels().filter(c=>c.getTargetPath()!=='weights').map(c=>{
  const sampler=c.getSampler(),path=c.getTargetPath(),name=nodes.get(c.getTargetNode()).uuid+'.'+({translation:'position',rotation:'quaternion',scale:'scale'}[path]);
  return new (path==='rotation'?T.QuaternionKeyframeTrack:T.VectorKeyframeTrack)(name,sampler.getInput().getArray(),sampler.getOutput().getArray());
 })));
 const details=new SceneDetails(root,clips,id,new T.Texture()),mixer=new T.AnimationMixer(root);details.clips.forEach(c=>mixer.clipAction(c).play());
 let partialFades=0;const poses=[];
 for(let frame=0;frame<=24*24;frame++){
  const time=frame/24;mixer.setTime(time);details.update(time);
  for(const fade of details.diagnostics.fades){assert.equal(fade.scale,1);assert(fade.alpha>=0&&fade.alpha<=1);if(fade.alpha>.01&&fade.alpha<.99)partialFades++}
  if(id==='water'){
   const p=courtyardRoute(time),radius=.3;
   assert(p.x-radius>-1.9+1.06/2,'Walker intersects upper stair envelope');assert(p.z+radius<3.22,'Walker intersects front railing');assert(p.z-radius>1.1,'Walker intersects hearth');assert.equal(p.y,3.4);
   const next=courtyardRoute(time+.001),dx=next.x-p.x,dz=next.z-p.z;assert((Math.sin(p.yaw)*dx+Math.cos(p.yaw)*dz)/Math.hypot(dx,dz)>.999,'Walker faces away from travel direction');
   if(frame===24||frame===24*9)poses.push(Array.from(nodes.values()).filter(o=>o.name==='Resident_03_•_Adventurer')[0]?.position.toArray());
  }
 }
 if(id==='shrine'){assert.equal(details.diagnostics.fades.length,3);assert(partialFades>0)}
 else{const start=courtyardRoute(0),end=courtyardRoute(12);assert(Math.hypot(start.x-end.x,start.z-end.z)<1e-6);const gait=details.clips.find(c=>c.name==='Courtyard walk');assert(gait?.tracks.length>0);assert.equal(gait.duration,2);for(const track of gait.tracks){const size=track.getValueSize();assert.deepEqual(Array.from(track.values.slice(0,size)),Array.from(track.values.slice(-size)))}assert.notDeepEqual(poses[0],poses[1]);assert(details.diagnostics.fireFrame!==null)}
 reports.push({id,partialFades,clips:details.clips.map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.length})),passed:true});
}
console.log(JSON.stringify(reports,null,2));
