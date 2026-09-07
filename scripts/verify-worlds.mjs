import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import fs from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.decoder':await draco3d.createDecoderModule()});
const results=[];
for(const id of ['shrine','station','water']){
 const path=`public/worlds/${id}.glb`,doc=await io.read(path),root=doc.getRoot();let vertices=0,triangles=0;
 for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
  const pos=p.getAttribute('POSITION');if(!pos)throw Error(`${id}: missing position`);vertices+=pos.getCount();
  for(const value of pos.getArray())if(!Number.isFinite(value))throw Error(`${id}: nonfinite vertex`);
  const indices=p.getIndices();if(indices){triangles+=indices.getCount()/3;for(const i of indices.getArray())if(i>=pos.getCount())throw Error(`${id}: index out of bounds`)}
 }
 const meta=JSON.parse(await fs.readFile(`public/worlds/${id}.json`,'utf8'));if(!meta.lights.length||!meta.target.every(Number.isFinite))throw Error(`${id}: missing lights or camera`);
 if(id==='station'&&!root.listNodes().some(n=>n.getName()==='tram'))throw Error('Missing moving tram');
 const r={id,bytes:(await fs.stat(path)).size,vertices,triangles,materials:root.listMaterials().length,lights:meta.lights.length,nodes:root.listNodes().map(n=>n.getName()),validated:true};results.push(r);console.log(JSON.stringify(r));
}
await fs.mkdir('intermediate',{recursive:true});await fs.writeFile('intermediate/geometry-verification.json',JSON.stringify({date:'2026-09-07',results},null,2));
