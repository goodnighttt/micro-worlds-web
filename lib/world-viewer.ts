import * as T from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
export type ViewSettings={night:boolean;close:boolean;playing:boolean};
type Meta={target:number[];size:number;lights:{name:string;position:number[];color:number[];power:number;type:string}[]};
export class WorldViewer{
 private renderer:T.WebGLRenderer;private scene=new T.Scene();private camera=new T.OrthographicCamera(-15,15,15,-15,.1,250);private controls:OrbitControls;
 private composer:EffectComposer;private bloom:UnrealBloomPass;private observer:ResizeObserver;private frame=0;private disposed=false;private generation=0;private model:T.Group|null=null;private id='shrine';private meta:Meta|null=null;
 private settings:ViewSettings={night:false,close:false,playing:true};private lightMix=0;private time=12;private last=0;private moving=false;private endPosition=new T.Vector3();private endTarget=new T.Vector3();private endZoom=1;
 private sun=new T.DirectionalLight(0xffe9cb,3.1);private moon=new T.DirectionalLight(0x8baeff,.5);private sky=new T.HemisphereLight(0xe9f0df,0x6d7460,2);
 private lamps=new T.Group();private emissive=new Map<T.MeshStandardMaterial,{color:T.Color;strength:number}>();private signals:T.MeshStandardMaterial[]=[];private tram:T.Object3D|null=null;private mixer:T.AnimationMixer|null=null;
 private ground:T.Mesh;private abort:AbortController|null=null;
 private waterTime={value:0};
 constructor(private host:HTMLElement,private status:(text:string,error?:boolean)=>void){
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.setClearColor(0,0);host.appendChild(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.minPolarAngle=.2;this.controls.maxPolarAngle=Math.PI*.47;this.controls.enablePan=false;this.controls.minZoom=.65;this.controls.maxZoom=3;
  this.controls.addEventListener('start',()=>{this.moving=false});this.sun.position.set(-12,25,15);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-30,right:30,top:30,bottom:-30,far:100});this.sun.shadow.bias=-.00015;this.sun.shadow.normalBias=.035;
  this.moon.position.set(10,20,-12);this.scene.add(this.sun,this.moon,this.sky,this.lamps);
  this.ground=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshStandardMaterial({color:0xe8ecdf,roughness:1}));this.ground.rotation.x=-Math.PI/2;this.ground.position.y=-1.2;this.ground.receiveShadow=true;this.scene.add(this.ground);
  this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new T.Vector2(800,800),.22,.45,1.2);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();this.frame=requestAnimationFrame(this.tick);
 }
 async load(id:string){
  const token=++this.generation;this.id=id;this.abort?.abort();this.abort=new AbortController();this.status('正在走进小世界…');
  try{
   const [meta,buffer]=await Promise.all([fetch(`/worlds/${id}.json`,{signal:this.abort.signal}).then(r=>{if(!r.ok)throw Error('metadata');return r.json() as Promise<Meta>}),fetch(`/worlds/${id}-v02.glb`,{signal:this.abort.signal}).then(r=>{if(!r.ok)throw Error('model');return r.arrayBuffer()})]);
   if(this.disposed||token!==this.generation)return;this.status('正在铺开这片风景…');
   const decoder=new DRACOLoader().setDecoderPath('/draco/');
   let gltf;try{gltf=await new GLTFLoader().setDRACOLoader(decoder).parseAsync(buffer,'/worlds/')}finally{decoder.dispose()}
   if(this.disposed||token!==this.generation){this.release(gltf.scene);return}
   if(this.model){this.scene.remove(this.model);this.release(this.model)}this.model=gltf.scene;this.meta=meta;this.scene.add(this.model);this.mixer=gltf.animations?.length?new T.AnimationMixer(this.model):null;gltf.animations?.forEach((clip:T.AnimationClip)=>this.mixer?.clipAction(clip).play());this.emissive.clear();this.signals=[];this.tram=null;
   this.model.traverse(o=>{if(o.name==='tram')this.tram=o;if(!(o instanceof T.Mesh))return;o.castShadow=true;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(!(m instanceof T.MeshStandardMaterial))continue;
    if(m.name.toLowerCase().includes('water')||m.name.toLowerCase().includes('ocean')){m.color.set(0x327c8c);m.roughness=.32;m.metalness=.15;m.transparent=true;m.opacity=.92;m.onBeforeCompile=shader=>{shader.uniforms.uWorldTime=this.waterTime;shader.vertexShader='uniform float uWorldTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y += 0.035*sin(position.x*1.8+uWorldTime)*cos(position.z*1.3+uWorldTime*0.7);')};m.needsUpdate=true}
    if(m.name.includes('Signal')){if(!this.signals.includes(m))this.signals.push(m)}
    else if(m.emissiveIntensity>0&&m.emissive.getHex()>0){this.emissive.set(m,{color:m.emissive.clone(),strength:Math.max(m.emissiveIntensity,2)})}
   }});
   this.lamps.clear();meta.lights.slice(0,24).forEach(l=>{const lamp=l.type==='SPOT'?new T.SpotLight():new T.PointLight();lamp.color.fromArray(l.color);lamp.intensity=0;lamp.distance=id==='water'?12:8;lamp.decay=2;lamp.position.fromArray(l.position);lamp.userData={base:Math.min(l.power*.14,20),origin:lamp.position.clone(),head:l.name.includes('headlight')};if(lamp instanceof T.SpotLight){lamp.angle=.5;lamp.penumbra=.65;lamp.target.position.copy(lamp.position).add(new T.Vector3(lamp.position.x<0?-8:8,-1,0));this.lamps.add(lamp.target);lamp.userData.target=lamp.target.position.clone()}this.lamps.add(lamp)});
   this.time=12;this.reset();this.status('');
  }catch(e){if(this.disposed||token!==this.generation||e instanceof DOMException&&e.name==='AbortError')return;this.status('场景暂时未能加载，请重试。',true)}
 }
 configure(settings:ViewSettings){const cameraChanged=settings.close!==this.settings.close;this.settings=settings;if(cameraChanged)this.preset();}
 reset(){this.preset(true)}
 private preset(immediate=false){
  if(!this.meta)return;const t=new T.Vector3().fromArray(this.meta.target);const size=this.meta.size;const detail=this.settings.close;
  if(detail){if(this.id==='shrine')t.set(-.4,2.3,3);else if(this.id==='station')t.set(-1.8,2.5,.25);else t.set(-1,3.2,1.4)}
  this.endTarget.copy(t);this.endPosition.copy(t).add(new T.Vector3(.62,.75,1.12).multiplyScalar(size));this.endZoom=detail?1.7:1;this.moving=true;
  if(immediate){this.camera.position.copy(this.endPosition);this.controls.target.copy(t);this.camera.zoom=this.endZoom;this.moving=false;this.resize();this.controls.update()}
 }
 zoom(factor:number){this.moving=false;this.camera.zoom=T.MathUtils.clamp(this.camera.zoom/factor,.65,3);this.camera.updateProjectionMatrix()}
 rotate(angle:number){this.moving=false;const d=this.camera.position.clone().sub(this.controls.target);d.applyAxisAngle(new T.Vector3(0,1,0),angle);this.camera.position.copy(this.controls.target).add(d);this.controls.update()}
 private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;const size=(this.meta?.size||23)*(w<680?1.7:1.08);this.camera.left=-size*w/h/2;this.camera.right=size*w/h/2;this.camera.top=size/2;this.camera.bottom=-size/2;this.camera.setViewOffset(w,h,w<680?0:-w*.085,w<680?h*.045:0,w,h);this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.composer.setSize(w,h)}
 private tick=(stamp:number)=>{
  if(this.disposed)return;const dt=Math.min((stamp-this.last)/1000,.05);this.last=stamp;
  if(!document.hidden){
   const a=1-Math.exp(-dt*4);this.lightMix=T.MathUtils.lerp(this.lightMix,this.settings.night?1:0,a);const n=this.lightMix;
   this.sun.intensity=T.MathUtils.lerp(2.2,.06,n);this.sky.intensity=T.MathUtils.lerp(1.1,.22,n);this.sky.color.copy(new T.Color(0xe9f0df)).lerp(new T.Color(0x657fa9),n);this.moon.intensity=T.MathUtils.lerp(.08,.42,n);this.bloom.strength=T.MathUtils.lerp(.015,.10,n);(this.ground.material as T.MeshStandardMaterial).color.copy(new T.Color(0xe8ecdf)).lerp(new T.Color(0x162333),n);
   this.emissive.forEach((v,m)=>{m.emissive.copy(v.color);m.emissiveIntensity=T.MathUtils.lerp(0,v.strength*.18,n)});
   if(this.settings.playing){this.time+=dt;this.mixer?.update(dt)}this.waterTime.value=this.time;
   let tramOffset=0;
   if(this.tram){const t=this.time%30;tramOffset=t<10?28*(1-T.MathUtils.smoothstep(t,1.5,10)):t<17?0:-32*T.MathUtils.smoothstep(t,17,26);this.tram.position.x=tramOffset;this.tram.visible=t<27;
    const aspect=t>=1.5&&t<10?'Amber':t>=16.5&&t<26?'Green':'Red';this.signals.forEach(m=>{const name=m.name.toLowerCase();const active=name.includes(aspect.toLowerCase())||(aspect==='Amber'&&name.includes('yellow'));m.emissive.set(name.includes('red')?0xff240b:name.includes('green')?0x18ff45:0xffa600);m.emissiveIntensity=active?5:.02})
   }
   this.lamps.children.forEach(o=>{if(!(o instanceof T.Light))return;o.intensity=o.userData.base*T.MathUtils.lerp(.04,1,n);if(o.userData.head){o.position.copy(o.userData.origin);o.position.x+=tramOffset;if(o instanceof T.SpotLight){o.target.position.copy(o.userData.target);o.target.position.x+=tramOffset}}});
   if(this.moving){this.camera.position.lerp(this.endPosition,a);this.controls.target.lerp(this.endTarget,a);this.camera.zoom=T.MathUtils.lerp(this.camera.zoom,this.endZoom,a);this.camera.updateProjectionMatrix();if(this.camera.position.distanceTo(this.endPosition)<.005)this.moving=false}
   this.controls.update();this.composer.render();
  }this.frame=requestAnimationFrame(this.tick);
 }
 private release(root:T.Object3D){const mats=new Set<T.Material>(),textures=new Set<T.Texture>();root.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>mats.add(m))}});mats.forEach(m=>{Object.values(m).forEach(v=>{if(v instanceof T.Texture)textures.add(v)});m.dispose()});textures.forEach(t=>t.dispose())}
 dispose(){this.disposed=true;this.abort?.abort();cancelAnimationFrame(this.frame);this.observer.disconnect();this.controls.dispose();if(this.model)this.release(this.model);this.release(this.ground);this.composer.dispose();this.bloom.dispose();this.renderer.dispose();this.renderer.domElement.remove()}
}

