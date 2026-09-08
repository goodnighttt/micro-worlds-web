import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco from 'draco3dgltf';
import * as T from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {SceneDetails,tramRoute,isTramRoot} from '../lib/scene-details.ts';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco.createDecoderModule()});
const before=(await io.read('public/worlds/water-v03.glb')).getRoot();
const doc=await io.read('public/worlds/water-v04.glb'),root=doc.getRoot();
const mirrors=JSON.parse(await fs.readFile('intermediate/water-mirror-export.json','utf8'));
const triangles=n=>n.getMesh().listPrimitives().reduce((s,p)=>s+p.getIndices().getCount()/3,0);
for(const m of mirrors){
 const a=before.listNodes().find(n=>n.getName()===m.object),b=root.listNodes().find(n=>n.getName()===m.object);
 assert(a&&b,m.object);assert(triangles(b)>triangles(a)*1.75,'Mirrored half missing: '+m.object);
}
assert.equal(root.listSkins().length,9);
for(const n of root.listNodes())if(n.getSkin())for(const p of n.getMesh().listPrimitives()){
 const count=p.getAttribute('POSITION').getCount(),j=p.getAttribute('JOINTS_0'),w=p.getAttribute('WEIGHTS_0');
 assert.equal(j.getCount(),count);assert.equal(w.getCount(),count);
 for(let i=0;i<count;i++){const weights=w.getElement(i,[]);assert(Math.abs(weights.reduce((s,v)=>s+v,0)-1)<.002);}
}
// Decode actual skin geometry and sample deformed vertices, not placeholder boxes.
for(const texture of root.listTextures())texture.dispose();
for(const ext of root.listExtensionsUsed())if(ext.extensionName==='KHR_draco_mesh_compression')ext.dispose();
const bytes=await io.writeBinary(doc);
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const details=new SceneDetails(gltf.scene,gltf.animations,'water',new T.Texture());
const mixer=new T.AnimationMixer(gltf.scene);details.clips.forEach(c=>mixer.clipAction(c).play());
const residents=[];gltf.scene.traverse(o=>{if(/^Resident_\d\d_•_/.test(o.name)&&o.children.some(c=>/CharacterArmature/.test(c.name)))residents.push(o)});
const ranges={};
for(let frame=0;frame<=288;frame+=6){
 const t=frame/24;mixer.setTime(t);details.update(t);gltf.scene.updateMatrixWorld(true);
 for(const resident of residents){
  const box=new T.Box3();resident.traverse(o=>{if(!o.isSkinnedMesh)return;o.skeleton.update();for(let i=0;i<o.geometry.attributes.position.count;i++){const v=o.getVertexPosition(i,new T.Vector3()).applyMatrix4(o.matrixWorld);assert(v.toArray().every(Number.isFinite));box.expandByPoint(v)}});
  const feet=box.min.y-resident.getWorldPosition(new T.Vector3()).y;
  const r=ranges[resident.name]??={minFoot:Infinity,maxFoot:-Infinity,maxHeight:0};r.minFoot=Math.min(r.minFoot,feet);r.maxFoot=Math.max(r.maxFoot,feet);r.maxHeight=Math.max(r.maxHeight,box.max.y-box.min.y);
  assert(box.max.y-box.min.y>.8&&box.max.y-box.min.y<2.5,'Broken body bounds: '+resident.name);
 }
}
const station=(await io.read('public/worlds/station-v02.glb')).getRoot();
assert(station.listNodes().some(n=>isTramRoot({name:T.PropertyBinding.sanitizeNodeName(n.getName())})));
for(let i=0;i<30*120;i++){
 const a=tramRoute(i/120),b=tramRoute((i+1)/120);
 if(a.visible&&b.visible)assert(Math.abs(b.x-a.x)<.1,'Visible train reset jump');
}
assert(!tramRoute(29.99).visible&&!tramRoute(0).visible);
const report={mirroredParts:mirrors.length,skins:9,framesSampled:49,ranges,trainLoopPassed:true};
await fs.writeFile('intermediate/character-export-verification.json',JSON.stringify(report,null,2));console.log(report);
