import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,weld,simplifyPrimitive,resample,draco,textureCompress} from '@gltf-transform/functions';
import sharp from 'sharp';
import {MeshoptSimplifier} from 'meshoptimizer';
import draco3d from 'draco3dgltf';
import fs from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule(),'draco3d.encoder':await draco3d.createEncoderModule()});
const input=process.argv[2]||'public/worlds/water-v02.glb',output=process.argv[3]||'public/worlds/water-v03.glb';
const doc=await io.read(input);
const count=()=>doc.getRoot().listMeshes().reduce((s,m)=>s+m.listPrimitives().reduce((s,p)=>s+(p.getIndices()?.getCount()||0)/3,0),0);
const before=count();await doc.transform(weld());await MeshoptSimplifier.ready;
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives()){
 if(p.getAttribute('JOINTS_0')||(p.getIndices()?.getCount()||0)<24000)continue;
 simplifyPrimitive(p,{simplifier:MeshoptSimplifier,ratio:mesh.getName().includes('ocean')?.2:.35,error:.002,lockBorder:false});
}
await doc.transform(resample());
let removed=0;
for(const anim of doc.getRoot().listAnimations())for(const channel of anim.listChannels()){
 const node=channel.getTargetNode(),path=channel.getTargetPath(),sampler=channel.getSampler();
 const rest=path==='translation'?node.getTranslation():path==='rotation'?node.getRotation():path==='scale'?node.getScale():node.getWeights();
 const values=sampler.getOutput().getArray();
 if(rest.length&&Array.from(values).every((v,i)=>Math.abs(v-rest[i%rest.length])<1e-6)){channel.dispose();removed++;}
}
await doc.transform(dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024]}),draco());
await io.write(output,doc);
const loaded=await io.read(output);
const stats={input,output,beforeTriangles:before,afterTriangles:count(),removedConstantChannels:removed,animations:loaded.getRoot().listAnimations().length,channels:loaded.getRoot().listAnimations().reduce((s,a)=>s+a.listChannels().length,0),bytes:(await fs.stat(output)).size};
await fs.writeFile('intermediate/water-optimization-latest.json',JSON.stringify(stats,null,2));console.log(stats);
