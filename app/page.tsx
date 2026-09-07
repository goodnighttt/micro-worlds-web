'use client';
import {useEffect,useRef,useState} from 'react';
import {Sun,Moon,Plus,Minus,RotateCcw,Maximize,ArrowUpRight,Flower2,Pause,Play,ChevronLeft,ChevronRight} from 'lucide-react';
import {WorldViewer} from '../lib/world-viewer';
const worlds=[
 {id:'shrine',title:'木漏れ日',en:'KOMOREBI SHRINE',line:['把日子，','交给山风。'],tag:'山间 · 一路灯火',name:'山间神社',detail:'沿着石阶，穿过三座鸟居。树影轻轻落下，山间自有它的时间。',night:'灯笼亮起，月色沿着石阶慢慢铺开。'},
 {id:'station',title:'桜の小駅',en:'SAKURA STATION',line:['等一班车，','也等一场花落。'],tag:'春日 · 樱的季节',name:'樱花车站',detail:'粉色电车停靠在小站。长椅、花影和一盏暖灯，留住春天的片刻。',night:'路灯映亮夜樱，车灯划过轨道，信号在夜色中闪亮。'},
 {id:'water',title:'海上人家',en:'WATER WORLD',line:['漂在海上，','也有归处。'],tag:'远海 · 浮岛日常',name:'水世界',detail:'木板搭起街巷，浮桶托住家。钓鱼、守望与炉火，是海上的日常。',night:'月光落在海面，窗灯和炉火守着这座漂浮聚落。'}];
export default function Home(){
 const [index,setIndex]=useState(0),[night,setNight]=useState(false),[close,setClose]=useState(false),[playing,setPlaying]=useState(true),[status,setStatus]=useState('正在打开山间神社…'),[error,setError]=useState(false);
 const mount=useRef<HTMLDivElement>(null),viewer=useRef<WorldViewer|null>(null);const w=worlds[index];
 useEffect(()=>{if(!mount.current)return;try{viewer.current=new WorldViewer(mount.current,(s,e=false)=>{setStatus(s);setError(e)});}catch{setStatus('无法启动三维画面，请使用支持 WebGL 2 的浏览器。');setError(true)}return()=>viewer.current?.dispose()},[]);
 useEffect(()=>{void viewer.current?.load(w.id)},[w.id]);
 useEffect(()=>{viewer.current?.configure({night,close,playing})},[night,close,playing]);
 useEffect(()=>{
  type Context={registerTool:(tool:object,options:{signal:AbortSignal})=>void|Promise<void>};
  const context=(document as Document&{modelContext?:Context}).modelContext;if(!context)return;const life=new AbortController();
  void Promise.resolve(context.registerTool({name:'configure_world',description:'切换微观世界、昼夜与近远景。',inputSchema:{type:'object',properties:{scene:{type:'string',enum:['shrine','station','water']},night:{type:'boolean'},close:{type:'boolean'}},required:['scene','night','close'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async(input:unknown)=>{const v=input as {scene:string;night:boolean;close:boolean};const i=worlds.findIndex(w=>w.id===v?.scene);if(i<0||typeof v.night!=='boolean'||typeof v.close!=='boolean')throw Error('Invalid world settings');setIndex(i);setNight(v.night);setClose(v.close);await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));return {scene:v.scene,night:v.night,close:v.close,status:'selected'};}},{signal:life.signal})).catch(()=>{});return()=>life.abort();
 },[]);
 return <main className={night?'world-page night':'world-page'}>
 <div className="scene" ref={mount} aria-label={`${w.name}交互式三维场景`}/>
 <header><a className="brand" href="/" aria-label="微观世界首页"><span className="brand-mark"><Flower2 size={26}/></span><span>微观世界<small>A LITTLE WORLD, A QUIETER MIND</small></span></a><span className="header-note"><i/>山间无事 · 适合发呆</span><span className="edition">三处风景 / 一段慢时光</span></header>
 <section className="intro"><div className="eyebrow">◆ 世界的一隅 / 00{index+1}</div><h1>{w.title}</h1><p className="roman">{w.en}</p><span className="dash"/><p className="poem">{w.line[0]}<br/>{w.line[1]}</p><p className="season"><Flower2 size={17}/>{w.tag}</p></section>
 <aside className="time-panel"><p className="eyebrow">此 刻 光 景</p><div className="segmented"><button aria-pressed={!night} onClick={()=>setNight(false)}><Sun size={22}/><span>昼</span></button><button aria-pressed={night} onClick={()=>setNight(true)}><Moon size={22}/><span>夜</span></button></div><p className="time-caption">{night?'21:30 · 月色正好':'14:20 · 日光缓缓'}</p><div className="camera-switch"><button aria-pressed={!close} onClick={()=>setClose(false)}>远景</button><button aria-pressed={close} onClick={()=>setClose(true)}>近景<ArrowUpRight size={14}/></button></div></aside>
 <section className="story-card"><span className="story-number">0{index+1}<small>/ 03</small></span><div><span className="eyebrow">{night?'夜色里的小世界':'一盏茶的光阴'}</span><h2>{w.name}</h2><p>{night?w.night:w.detail}</p><nav aria-label="切换场景"><button aria-label="上一个场景" onClick={()=>setIndex((index+2)%3)}><ChevronLeft size={19}/></button>{worlds.map((a,i)=><button key={a.id} className={i===index?'world-dot active':'world-dot'} aria-label={a.name} aria-pressed={index===i} onClick={()=>{setIndex(i);setClose(false)}}/>)}<button aria-label="下一个场景" onClick={()=>setIndex((index+1)%3)}><ChevronRight size={19}/></button></nav></div></section>
 <div className="tools" aria-label="场景操作"><button aria-label="放大" onClick={()=>viewer.current?.zoom(.8)}><Plus/></button><button aria-label="缩小" onClick={()=>viewer.current?.zoom(1.25)}><Minus/></button><span/><button aria-label="向左旋转" onClick={()=>viewer.current?.rotate(-.3)}><ChevronLeft/></button><button aria-label="向右旋转" onClick={()=>viewer.current?.rotate(.3)}><ChevronRight/></button><span/><button aria-label="重置视角" onClick={()=>{setClose(false);viewer.current?.reset()}}><RotateCcw size={21}/></button><button aria-label={playing?'暂停动画':'播放动画'} aria-pressed={playing} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={20}/>:<Play size={20}/>}</button><button aria-label="全屏" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen?.().catch(()=>{});}}><Maximize size={20}/></button></div>
 {status&&<div className={error?'load-status error':'load-status'} role="status">{!error&&<span className="spinner"/>}{status}{error&&<button onClick={()=>void viewer.current?.load(w.id)}>重新加载</button>}</div>}
 <p className="gesture">拖动环顾 · 滚轮缩放 · 双指捏合</p><footer><span>MICRO WORLD <b>·</b> 00{index+1} / 003</span><span>此处没有任务，只有风景。</span><span>慢慢走，慢慢看 <Flower2 size={14}/></span></footer>
 </main>
}
