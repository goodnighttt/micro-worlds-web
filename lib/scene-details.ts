import * as T from 'three';

const readable=(o:T.Object3D)=>o.name.replaceAll('_',' ');
export function courtyardRoute(seconds:number){
 const angle=seconds/12*Math.PI*2;
 // The open forecourt: east of the stair footprint and in front of the hearth.
 return {x:.4+Math.cos(angle),y:3.4,z:2.3+.35*Math.sin(angle),yaw:Math.atan2(-Math.sin(angle),.35*Math.cos(angle))};
}

export class SceneDetails {
 clips:T.AnimationClip[]=[];
 private fades:{root:T.Object3D;sample:T.Interpolant;materials:T.Material[];meshes:T.Mesh[]}[]=[];
 private walker:T.Object3D|undefined;
 private fire:T.Texture|undefined;
 private duration=1;
 constructor(root:T.Group,clips:T.AnimationClip[],id:string,fireTexture?:T.Texture){
  const tracks=clips.flatMap(clip=>clip.tracks);
  this.duration=Math.max(...clips.map(clip=>clip.duration),1);
  const removed=new Set<T.KeyframeTrack>();
  const gait:T.KeyframeTrack[]=[];
  if(id==='shrine')for(const track of tracks){
   const binding=T.PropertyBinding.parseTrackName(track.name);
   const node=T.PropertyBinding.findNode(root,binding.nodeName) as T.Object3D|undefined;
   if(binding.propertyName!=='scale'||!node||!readable(node).endsWith('WALK CONTROL')||readable(node).startsWith('Static')||node instanceof T.Mesh)continue;
   const materials:T.Material[]=[],meshes:T.Mesh[]=[];
   const clones=new Map<T.Material,T.Material>();
   node.traverse(o=>{if(!(o instanceof T.Mesh))return;meshes.push(o);const clone=(m:T.Material)=>{if(!clones.has(m)){const c=m.clone();c.transparent=true;c.depthWrite=false;clones.set(m,c);materials.push(c)}return clones.get(m)!};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material)});
   // Preserve the original appearance timings, but animate alpha at full physical size.
   const alpha=new T.NumberKeyframeTrack('fade',Array.from(track.times),Array.from(track.values).filter((_,i)=>i%3===0));
   this.fades.push({root:node,sample:new T.LinearInterpolant(alpha.times,alpha.values,1),materials,meshes});
   node.scale.setScalar(1);removed.add(track);
  }
  if(id==='water'){
   root.traverse(o=>{if(readable(o)==='Resident 03 • Adventurer')this.walker=o});
   const descendants=new Set<T.Object3D>();this.walker?.traverse(o=>descendants.add(o));
   for(const track of tracks){
    const binding=T.PropertyBinding.parseTrackName(track.name);
    const node=T.PropertyBinding.findNode(root,binding.nodeName) as T.Object3D|undefined;
    if(node===this.walker){removed.add(track);continue}
    if(node&&descendants.has(node)){gait.push(track);removed.add(track)}
   }
   // DetailFilm holds the character after the last camera cut. Repeat its complete
   // original two-second walk cycle instead of inheriting that film-only hold.
   if(gait.length){
    const loop=gait.map(track=>{
     const size=track.getValueSize(),sample=track instanceof T.QuaternionKeyframeTrack?new T.QuaternionLinearInterpolant(track.times,track.values,size):new T.LinearInterpolant(track.times,track.values,size);
     // Resampling may remove the key exactly at 2s. Insert both endpoints and
     // match their values explicitly so the gait cannot snap on each loop.
     const times=[0,...Array.from(track.times).filter(t=>t>0&&t<2),2];const first=Array.from(sample.evaluate(0));const values=times.flatMap(t=>t===2?first:Array.from(sample.evaluate(t)));
     const result=track.clone();result.times=new Float32Array(times);result.values=new Float32Array(values);return result;
    });
    this.clips.push(new T.AnimationClip('Courtyard walk',2,loop));
   }
   this.fire=fireTexture||new T.TextureLoader().load('/worlds/fire-5x5.png');
   this.fire.colorSpace=T.SRGBColorSpace;this.fire.repeat.set(.2,.2);this.fire.generateMipmaps=false;this.fire.minFilter=T.LinearFilter;
   const fireMaterial=new T.MeshBasicMaterial({map:this.fire,color:0xffffff,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,toneMapped:false});
   const replaced=new Set<T.Material>();
   root.traverse(o=>{if(!(o instanceof T.Mesh))return;const replace=(m:T.Material)=>{if(!m.name.includes('animated fire'))return m;replaced.add(m);return fireMaterial};const old=Array.isArray(o.material)?o.material:[o.material];if(old.some(m=>m.name.includes('animated fire'))){o.material=Array.isArray(o.material)?old.map(replace):replace(o.material);o.castShadow=false;o.receiveShadow=false}});
   const textures=new Set<T.Texture>();replaced.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof T.Texture)textures.add(v)});m.dispose()});textures.forEach(t=>t.dispose());
  }
  this.clips.unshift(new T.AnimationClip('World loop',this.duration,tracks.filter(track=>!removed.has(track))));
 }
 update(seconds:number){
  for(const fade of this.fades){const alpha=T.MathUtils.clamp(fade.sample.evaluate(seconds%this.duration)[0],0,1);fade.root.visible=alpha>.001;fade.root.scale.setScalar(1);fade.materials.forEach(m=>m.opacity=alpha);fade.meshes.forEach(m=>m.castShadow=alpha>.98)}
  if(this.walker){const p=courtyardRoute(seconds);this.walker.position.set(p.x,p.y,p.z);this.walker.quaternion.setFromAxisAngle(new T.Vector3(0,1,0),p.yaw)}
  if(this.fire){const frame=Math.floor(seconds*24)%25;this.fire.offset.set((frame%5)*.2,(4-Math.floor(frame/5))*.2)}
 }
 get diagnostics(){return {fades:this.fades.map(f=>({alpha:f.materials[0]?.opacity,scale:f.root.scale.x})),walker:this.walker?.position.toArray(),fireFrame:this.fire?Math.round(this.fire.offset.x*5)+(4-Math.round(this.fire.offset.y*5))*5:null}}
}
