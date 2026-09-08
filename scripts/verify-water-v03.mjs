import assert from 'node:assert/strict';
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const before=(await io.read('public/worlds/water-v02.glb')).getRoot();
const after=(await io.read('public/worlds/water-v03.glb')).getRoot();
assert.equal(after.listAnimations().length,before.listAnimations().length);
assert.deepEqual(after.listAnimations().map(a=>a.getName()),before.listAnimations().map(a=>a.getName()));
for(const accessor of after.listAccessors())for(const value of accessor.getArray())assert(Number.isFinite(value),'Nonfinite animation or geometry value');
let morphTargets=0;
for(const mesh of after.listMeshes())for(const p of mesh.listPrimitives()){
 const count=p.getAttribute('POSITION').getCount();
 for(const index of p.getIndices()?.getArray()||[])assert(index<count,'Index exceeds vertex count');
 for(const target of p.listTargets()){morphTargets++;for(const attribute of target.listAttributes())assert.equal(attribute.getCount(),count);}
}
assert(morphTargets>=6,'Ocean morph targets missing');
console.log(JSON.stringify({valid:true,animationClips:after.listAnimations().length,morphTargets,skins:after.listSkins().length}));
