
import React, { useState, useEffect } from 'react';
import { SpriteRegion, Animation, ImageInfo } from '../types';
import { Trash2, Code, Search, X, Film, Plus, Play, Pause, Copy, Package, LayoutGrid, Download, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import JSZip from 'jszip';

interface Props {
  image: ImageInfo;
  regions: SpriteRegion[];
  animations: Animation[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<SpriteRegion>) => void;
  onDelete: (id: string) => void;
  onAddAnimation: () => void;
  onUpdateAnimation: (id: string, updates: Partial<Animation>) => void;
  onDeleteAnimation: (id: string) => void;
  onAddFrame: (animId: string, spriteId: string) => void;
  onDeleteFrame: (animId: string, frameId: string) => void;
  onMoveFrame: (animId: string, frameId: string, direction: 'up' | 'down') => void;
  onClear: () => void;
  onClose: () => void;
}

const Sidebar: React.FC<Props> = ({ 
  image, regions, animations, selectedId, onSelect, onUpdate, onDelete, 
  onAddAnimation, onUpdateAnimation, onDeleteAnimation, onAddFrame, onDeleteFrame, onMoveFrame
}) => {
  const [tab, setTab] = useState<'design' | 'animation' | 'export'>('design');
  const [search, setSearch] = useState('');

  const getSpritesJson = () => {
    const sprites: Record<string, any> = {};
    regions.forEach(r => sprites[r.name || r.id] = { x: r.x, y: r.y, w: r.width, h: r.height });
    return JSON.stringify(sprites, null, 2);
  };

  const getAnimsJson = () => {
    const anims: Record<string, any> = {};
    animations.forEach(a => anims[a.name] = a.frames.map((f, i) => {
      const s = regions.find(r => r.id === f.spriteId);
      return { frame: i, name: s?.name, x: s?.x, y: s?.y, w: s?.width, h: s?.height };
    }));
    return JSON.stringify(anims, null, 2);
  };

  return (
    <aside className="w-[340px] h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl shadow-slate-200 z-50">
      <div className="flex p-2 bg-slate-50 border-b border-slate-200">
        <TabBtn active={tab === 'design'} icon={<LayoutGrid size={14}/>} label="标注清单" onClick={() => setTab('design')} />
        <TabBtn active={tab === 'animation'} icon={<Film size={14}/>} label="动作预览" onClick={() => setTab('animation')} />
        <TabBtn active={tab === 'export'} icon={<Code size={14}/>} label="JSON 导出" onClick={() => setTab('export')} />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'design' && (
          <DesignTab regions={regions.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))} selectedId={selectedId} search={search} setSearch={setSearch} onSelect={onSelect} onUpdate={onUpdate} onDelete={onDelete} />
        )}
        {tab === 'animation' && (
          <AnimationTab 
            image={image} 
            regions={regions} 
            animations={animations} 
            selectedSpriteId={selectedId} 
            onAdd={onAddAnimation} 
            onUpdate={onUpdateAnimation} 
            onDelete={onDeleteAnimation} 
            onAddFrame={onAddFrame} 
            onDeleteFrame={onDeleteFrame}
            onMoveFrame={onMoveFrame}
          />
        )}
        {tab === 'export' && (
          <ExportTab spritesJson={getSpritesJson()} animsJson={getAnimsJson()} />
        )}
      </div>
    </aside>
  );
};

const TabBtn = ({ active, icon, label, onClick }: any) => (
  <button onClick={onClick} className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all ${active ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
    {icon} {label}
  </button>
);

const DesignTab = ({ regions, selectedId, search, setSearch, onSelect, onUpdate, onDelete }: any) => (
  <div className="flex-1 flex flex-col overflow-hidden">
    <div className="p-4 border-b border-slate-50">
      <div className="relative flex items-center bg-slate-100 rounded-2xl px-3 py-2 border border-slate-200 focus-within:border-indigo-400 transition-all">
        <Search className="text-slate-400 mr-2" size={14} />
        <input type="text" placeholder="搜索已标注素材..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-xs w-full focus:outline-none" />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
      {regions.length === 0 && <div className="text-center py-12 text-slate-300 text-xs">单击图片选取像素或拖拽框选</div>}
      {regions.map((r: any) => (
        <div key={r.id} onClick={() => onSelect(r.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedId === r.id ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-50/50' : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm hover:shadow'}`}>
          <div className="flex items-center justify-between mb-2">
            <input type="text" value={r.name} onClick={e => e.stopPropagation()} onChange={e => onUpdate(r.id, { name: e.target.value })} className="bg-transparent font-bold text-xs focus:outline-none flex-1" />
            <button title="删除" onClick={e => { e.stopPropagation(); onDelete(r.id); }} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={12}/></button>
          </div>
          <div className="flex gap-4 text-[10px] font-medium text-slate-400 mono uppercase tracking-wider">
            <span>X:{r.x} Y:{r.y}</span>
            <span>{r.width}x{r.height}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AnimationTab = ({ image, regions, animations, onAdd, onUpdate, onDelete, onAddFrame, onDeleteFrame, onMoveFrame, selectedSpriteId }: any) => {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadZip = async (anim: Animation) => {
    if (anim.frames.length === 0) return;
    setDownloading(anim.id);
    const zip = new JSZip();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image.url;

    await new Promise((resolve) => { img.onload = resolve; });

    for (let i = 0; i < anim.frames.length; i++) {
      const f = anim.frames[i];
      const s = regions.find(r => r.id === f.spriteId);
      if (!s || !ctx) continue;

      canvas.width = s.width;
      canvas.height = s.height;
      ctx.clearRect(0, 0, s.width, s.height);
      ctx.drawImage(img, s.x, s.y, s.width, s.height, 0, 0, s.width, s.height);

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        zip.file(`${anim.name}_${i.toString().padStart(3, '0')}.png`, blob);
      }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `${anim.name}_sequence.zip`;
    link.click();
    setDownloading(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">动作编辑器</h3>
        <button onClick={onAdd} className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg">
          <Plus size={16}/>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 custom-scrollbar">
        {animations.map((anim: Animation) => (
          <div key={anim.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <input type="text" value={anim.name} onChange={e => onUpdate(anim.id, { name: e.target.value })} className="bg-transparent font-bold text-xs focus:outline-none flex-1 mr-2" />
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => downloadZip(anim)} 
                  disabled={!!downloading || anim.frames.length === 0}
                  className={`p-1.5 rounded-lg transition-colors ${downloading === anim.id ? 'bg-indigo-100 text-indigo-400' : 'bg-white shadow-sm text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                  title="下载 PNG 序列"
                >
                  <Download size={14} className={downloading === anim.id ? 'animate-bounce' : ''} />
                </button>
                <button title="删除动作" onClick={() => onDelete(anim.id)} className="p-1.5 bg-white shadow-sm text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-3 bg-white/50 p-2 rounded-xl border border-slate-100">
               <div className="flex items-center gap-2">
                 <Zap size={12} className="text-orange-400" />
                 <span className="text-[10px] font-bold text-slate-500">预览帧率:</span>
               </div>
               <div className="flex items-center gap-2">
                 <input 
                   type="number" 
                   min="1" max="60"
                   value={anim.fps} 
                   onChange={e => onUpdate(anim.id, { fps: Math.max(1, parseInt(e.target.value) || 12) })}
                   className="w-10 bg-transparent text-[11px] font-bold text-center border-b border-indigo-200 focus:border-indigo-500 focus:outline-none"
                 />
                 <span className="text-[10px] text-slate-400 font-bold">FPS</span>
               </div>
            </div>

            <div className="aspect-square bg-white rounded-2xl border border-slate-200 overflow-hidden relative mb-4 shadow-inner">
              <AnimationPreview image={image} regions={regions} animation={anim} />
            </div>

            {/* 帧序列管理列表 */}
            {anim.frames.length > 0 && (
              <div className="mb-4 space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">帧序列管理</div>
                {anim.frames.map((frame, index) => {
                  const sprite = regions.find(r => r.id === frame.spriteId);
                  return (
                    <div key={frame.id} className="flex items-center gap-2 p-1.5 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {sprite && (
                          <div style={{ 
                            width: sprite.width, height: sprite.height, 
                            backgroundImage: `url(${image.url})`, 
                            backgroundPosition: `-${sprite.x}px -${sprite.y}px`, 
                            imageRendering: 'pixelated',
                            transform: `scale(${Math.min(1, 28/Math.max(sprite.width, sprite.height))})` 
                          }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-slate-600 truncate">{sprite?.name || '未知资源'}</div>
                        <div className="text-[8px] text-slate-400">INDEX: {index}</div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onMoveFrame(anim.id, frame.id, 'up')} 
                          disabled={index === 0}
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                        >
                          <ChevronUp size={12} />
                        </button>
                        <button 
                          onClick={() => onMoveFrame(anim.id, frame.id, 'down')} 
                          disabled={index === anim.frames.length - 1}
                          className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                        >
                          <ChevronDown size={12} />
                        </button>
                        <button 
                          onClick={() => onDeleteFrame(anim.id, frame.id)} 
                          className="p-1 text-slate-300 hover:text-rose-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => onAddFrame(anim.id, selectedSpriteId!)} 
                disabled={!selectedSpriteId} 
                className="flex-1 py-2.5 bg-indigo-600 text-white text-[10px] font-bold rounded-xl disabled:opacity-30 disabled:bg-slate-400 transition-all shadow-md shadow-indigo-100"
              >
                追加选中的格
              </button>
              <div className="px-3 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center text-[10px] font-bold">
                {anim.frames.length} 帧
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AnimationPreview = ({ image, regions, animation }: any) => {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (!playing || animation.frames.length === 0) return;
    const it = setInterval(() => setFrame(p => (p + 1) % animation.frames.length), 1000 / animation.fps);
    return () => clearInterval(it);
  }, [playing, animation.fps, animation.frames.length]);
  
  // 修正帧索引，防止删除帧后越界
  useEffect(() => {
    if (frame >= animation.frames.length && animation.frames.length > 0) {
      setFrame(0);
    }
  }, [animation.frames.length, frame]);

  if (animation.frames.length === 0) return <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] text-slate-300 font-bold"><span>暂无内容</span><span className="mt-1 opacity-50">请在画布选中素材后点追加</span></div>;
  
  const currentFrame = animation.frames[frame % animation.frames.length];
  const s = regions.find((r: any) => r.id === currentFrame?.spriteId);
  
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 relative p-4 group">
      {s && <div style={{ width: s.width, height: s.height, backgroundImage: `url(${image.url})`, backgroundPosition: `-${s.x}px -${s.y}px`, imageRendering: 'pixelated', transform: `scale(${Math.min(1.5, 180/Math.max(s.width, s.height))})` }} />}
      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="text-[8px] text-slate-400 font-bold text-center">第 {frame + 1} 帧 / 共 {animation.frames.length} 帧</div>
      </div>
      <button onClick={() => setPlaying(!playing)} className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md text-slate-600 hover:scale-110 transition-transform">{playing ? <Pause size={12}/> : <Play size={12}/>}</button>
    </div>
  );
};

const ExportTab = ({ spritesJson, animsJson }: any) => {
  const [subTab, setSubTab] = useState<'sprites' | 'anims'>('sprites');
  const content = subTab === 'sprites' ? spritesJson : animsJson;
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 border border-slate-200">
        <button onClick={() => setSubTab('sprites')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all ${subTab === 'sprites' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>素材坐标 (JSON)</button>
        <button onClick={() => setSubTab('anims')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all ${subTab === 'anims' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>动画配置 (JSON)</button>
      </div>
      <div className="flex-1 bg-slate-900 rounded-3xl flex flex-col overflow-hidden border border-slate-800 shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
          <div className="flex items-center gap-2">
            <Code size={12} className="text-indigo-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">数据输出</span>
          </div>
          <button 
            onClick={() => { navigator.clipboard.writeText(content); alert('已复制'); }} 
            className="text-[10px] text-slate-400 hover:text-white font-bold transition-colors flex items-center gap-1"
          >
            <Copy size={12}/> 复制内容
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5 custom-scrollbar">
          <pre className="text-indigo-300 text-[11px] mono leading-relaxed select-all">{content}</pre>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
