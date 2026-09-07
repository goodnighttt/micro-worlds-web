'use client';
import {useEffect, useRef, useState} from 'react';
import {
  Sun, Moon, Plus, Minus, RotateCcw, Maximize, Boxes, Pause, Play,
  ChevronLeft, ChevronRight, Scan, Focus, Trees, TrainFront, Waves, Move,
} from 'lucide-react';
import {WorldViewer} from '../lib/world-viewer';

const worlds = [
  {id: 'shrine', name: '山间神社', en: 'FOREST SANCTUARY', Icon: Trees, detail: '沿着石阶，听树叶与脚步的声音。', night: '灯火照见来路，月色留在林间。'},
  {id: 'station', name: '樱花车站', en: 'SAKURA PLATFORM', Icon: TrainFront, detail: '花瓣落下，电车正驶向春天。', night: '末班电车与路灯，一起照亮夜樱。'},
  {id: 'water', name: '海上聚落', en: 'FLOATING SETTLEMENT', Icon: Waves, detail: '海面起伏，甲板上的生活照常。', night: '远海的夜晚，仍有几盏灯等着。'},
];

export default function Home() {
  const [index, setIndex] = useState(0);
  const [night, setNight] = useState(false);
  const [close, setClose] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [status, setStatus] = useState('正在打开山间神社…');
  const [error, setError] = useState(false);
  const mount = useRef<HTMLDivElement>(null);
  const viewer = useRef<WorldViewer | null>(null);
  const w = worlds[index];

  useEffect(() => {
    if (!mount.current) return;
    try {
      viewer.current = new WorldViewer(mount.current, (s, e = false) => {
        setStatus(s);
        setError(e);
      });
    } catch {
      setStatus('无法启动三维画面，请使用支持 WebGL 2 的浏览器。');
      setError(true);
    }
    return () => viewer.current?.dispose();
  }, []);

  useEffect(() => {
    void viewer.current?.load(w.id);
  }, [w.id]);

  useEffect(() => {
    viewer.current?.configure({night, close, playing});
  }, [night, close, playing]);

  useEffect(() => {
    type Context = {registerTool: (tool: object, options: {signal: AbortSignal}) => void | Promise<void>};
    const context = (document as Document & {modelContext?: Context}).modelContext;
    if (!context) return;
    const life = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'configure_world',
      description: '切换微观世界、昼夜与近远景。',
      inputSchema: {
        type: 'object',
        properties: {
          scene: {type: 'string', enum: ['shrine', 'station', 'water']},
          night: {type: 'boolean'},
          close: {type: 'boolean'},
        },
        required: ['scene', 'night', 'close'],
        additionalProperties: false,
      },
      annotations: {readOnlyHint: false, untrustedContentHint: false},
      execute: async (input: unknown) => {
        const v = input as {scene: string; night: boolean; close: boolean};
        const i = worlds.findIndex(world => world.id === v?.scene);
        if (i < 0 || typeof v.night !== 'boolean' || typeof v.close !== 'boolean') throw Error('Invalid world settings');
        setIndex(i);
        setNight(v.night);
        setClose(v.close);
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        return {scene: v.scene, night: v.night, close: v.close, status: 'selected'};
      },
    }, {signal: life.signal})).catch(() => {});
    return () => life.abort();
  }, []);

  return (
    <main className={`world-page ${night ? 'night' : ''} ${playing ? '' : 'paused'}`}>
      <div className="scene" ref={mount} aria-label={`${w.name}交互式三维场景`} />
      <header className="topbar">
        <div className="brand">
          <Boxes size={28} strokeWidth={1.2} />
          <div>
            <strong>栖境</strong>
            <small>MICRO WORLDS</small>
          </div>
        </div>
        <nav className="world-tabs glass" aria-label="选择场景">
          {worlds.map((a, i) => (
            <button key={a.id} aria-label={a.name} aria-pressed={i === index} onClick={() => { setIndex(i); setClose(false); }}>
              <span>0{i + 1}</span>
              <a.Icon size={16} />
              {a.name}
            </button>
          ))}
        </nav>
        <div className="top-note glass">
          <i className="live-dot" />
          {playing ? '小世界，正在发生' : '时间停在这一刻'}
        </div>
      </header>
      <section className="scene-caption">
        <div className="eyebrow"><w.Icon size={13} />{w.en}</div>
        <h1>{w.name}</h1>
        <p>{night ? w.night : w.detail}</p>
      </section>
      <div className="scene-index">
        <strong>0{index + 1}</strong>
        <span>/ 03</span>
      </div>
      <div className="orbit-mark">
        <Move size={14} />
        拖动环顾 · 滚轮 / 双指缩放
      </div>
      <footer className="control-deck">
        <div className="deck-title glass">
          <small>此刻的风景</small>
          <div>
            <i className="day-indicator" />
            {night ? '月下 · 灯火渐暖' : '日间 · 光落其间'}
          </div>
        </div>
        <div className="camera-controls glass">
          <div className="control-group view-controls">
            <button aria-pressed={!close} onClick={() => setClose(false)}><Scan size={16} />远景</button>
            <button aria-pressed={close} onClick={() => setClose(true)}><Focus size={16} />近景</button>
          </div>
          <span className="separator" />
          <div className="control-group">
            <button aria-label="向左旋转" onClick={() => viewer.current?.rotate(-0.3)}><ChevronLeft size={18} /></button>
            <button aria-label="向右旋转" onClick={() => viewer.current?.rotate(0.3)}><ChevronRight size={18} /></button>
            <button aria-label="缩小" onClick={() => viewer.current?.zoom(1.2)}><Minus size={18} /></button>
            <button aria-label="放大" onClick={() => viewer.current?.zoom(0.83)}><Plus size={18} /></button>
            <button aria-label="重置视角" onClick={() => { setClose(false); viewer.current?.reset(); }}><RotateCcw size={16} /></button>
            <button aria-label="全屏" onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen?.().catch(() => {});
            }}><Maximize size={16} /></button>
          </div>
        </div>
        <div className="light-controls">
          <div className="control-group glass">
            <button aria-label="白天" aria-pressed={!night} onClick={() => setNight(false)}><Sun size={17} />昼</button>
            <button aria-label="夜晚" aria-pressed={night} onClick={() => setNight(true)}><Moon size={17} />夜</button>
          </div>
          <button className="play-button glass" aria-label={playing ? '暂停动画' : '播放动画'} aria-pressed={playing} onClick={() => setPlaying(!playing)}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
        </div>
      </footer>
      {status && (
        <div className={error ? 'load-status error glass' : 'load-status glass'} role="status">
          {!error && <span className="spinner" />}
          {status}
          {error && <button onClick={() => void viewer.current?.load(w.id)}>重新加载</button>}
        </div>
      )}
    </main>
  );
}
