import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dedup,prune,draco,textureCompress} from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
import fs from 'node:fs/promises';
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'draco3d.encoder':await draco3d.createEncoderModule(),'draco3d.decoder':await draco3d.createDecoderModule()});
await fs.mkdir('intermediate/raw-glb',{recursive:true});
await fs.mkdir('public/draco',{recursive:true});
for(const f of ['draco_decoder.js','draco_wasm_wrapper.js','draco_decoder.wasm'])await fs.copyFile('node_modules/three/examples/jsm/libs/draco/gltf/'+f,'public/draco/'+f);
for(const id of process.argv.slice(2)){
 const file=`public/worlds/${id}.glb`,backup=`intermediate/raw-glb/${id}.glb`;
 try{await fs.access(backup)}catch{await fs.copyFile(file,backup)}
 const doc=await io.read(backup);
 await doc.transform(dedup(),prune(),textureCompress({encoder:sharp,targetFormat:'webp',resize:[1024,1024]}),draco({method:'edgebreaker',encodeSpeed:5,decodeSpeed:5}));
 await io.write(file,doc);
 const verify=await io.read(file);console.log(JSON.stringify({id,bytes:(await fs.stat(file)).size,meshes:verify.getRoot().listMeshes().length,materials:verify.getRoot().listMaterials().length}));
}
