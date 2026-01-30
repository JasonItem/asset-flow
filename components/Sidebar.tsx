
import React, { useState, useEffect } from 'react';
import { SpriteRegion, Animation, ImageInfo } from '../types';
import { Trash2, Code, Search, X, Film, Plus, Play, Pause, Copy, Package, LayoutGrid } from 'lucide-react';
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
  onClear: () => void;
  onClose: () => void;
}

const Sidebar: React.FC<Props> = ({ 
  image, regions, animations, selectedId, onSelect, onUpdate, onDelete, 
  onAddAnimation, onUpdateAnimation, onDeleteAnimation, onAddFrame 
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
        <TabBtn active={tab === 'design'} icon={<LayoutGrid size={14}/>} label="素材清单" onClick={() => setTab('design')} />
        <TabBtn active={tab === 'animation'} icon={<Film size={14}/>} label="动作预览" onClick={() => setTab('animation')} />
        <TabBtn active={tab === 'export'} icon={<Code size={14}/>} label="数据面板" onClick={() => setTab('export')} />
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === 'design' && (
          <DesignTab regions={regions.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))} selectedId={selectedId} search={search} setSearch={setSearch} onSelect={onSelect} onUpdate={onUpdate} onDelete={onDelete} />
        )}
        {tab === 'animation' && (
          <AnimationTab image={image} regions={regions} animations={animations} selectedSpriteId={selectedId} onAdd={onAddAnimation} onUpdate={onUpdateAnimation} onDelete={onDeleteAnimation} onAddFrame={onAddFrame} />
        )}
        {tab === 'export' && (
          <ExportTab spritesJson={getSpritesJson()} animsJson={getAnimsJson()} />
        )}
      </div>
    </aside>
  );
};

const exportZip = async (anim: Animation, image: ImageInfo, regions: SpriteRegion[]) => {
  const zip = new JSZip();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = new Image();
  img.src = image.url;
  await new Promise(r => img.onload = r);

  for (let i = 0; i < anim.frames.length; i++) {
    const frame = anim.frames[i];
    const s = regions.find(r => r.id === frame.spriteId);
    if (!s) continue;
    canvas.width = s.width;
    canvas.height = s.height;
    ctx.clearRect(0, 0, s.width, s.height);
    ctx.drawImage(img, s.x, s.y, s.width, s.height, 0, 0, s.width, s.height);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
    if (blob) zip.file(`${anim.name}_帧${String(i).padStart(3, '0')}.png`, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `${anim.name}_切片序列.zip`;
  link.click();
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
      {regions.length === 0 && <div className="text-center py-12 text-slate-300 text-xs">暂无素材，请在左侧画布拖拽标注</div>}
      {regions.map((r: any) => (
        <div key={r.id} onClick={() => onSelect(r.id)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedId === r.id ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-50/50' : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm hover:shadow'}`}>
          <div className="flex items-center justify-between mb-2">
            <input type="text" value={r.name} onClick={e => e.stopPropagation()} onChange={e => onUpdate(r.id, { name: e.target.value })} className="bg-transparent font-bold text-xs focus:outline-none flex-1" />
            <button title="删除素材" onClick={e => { e.stopPropagation(); onDelete(r.id); }} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={12}/></button>
          </div>
          <div className="flex gap-4 text-[10px] font-medium text-slate-400 mono uppercase tracking-wider">
            <span>坐标: {r.x},{r.y}</span>
            <span>规格: {r.width}x{r.height}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AnimationTab = ({ image, regions, animations, onAdd, onUpdate, onDelete, onAddFrame, selectedSpriteId }: any) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">动作编辑器</h3>
        <button onClick={onAdd} className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors">
          <Plus size={16}/>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 custom-scrollbar">
        {animations.map((anim: Animation) => (
          <div key={anim.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <input type="text" value={anim.name} onChange={e => onUpdate(anim.id, { name: e.target.value })} className="bg-transparent font-bold text-xs focus:outline-none flex-1" />
              <div className="flex items-center gap-1.5">
                <button title="导出图片序列 (ZIP)" onClick={() => exportZip(anim, image, regions)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                  <Package size={14}/>
                </button>
                <button title="删除动作" onClick={() => onDelete(anim.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
            
            <div className="aspect-square bg-white rounded-2xl border border-slate-200 overflow-hidden relative mb-4 shadow-inner">
              <AnimationPreview image={image} regions={regions} animation={anim} />
            </div>

            <div className="flex items-center justify-between gap-3 mb-4">
               <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">帧率</span>
                  <input type="number" value={anim.fps} onChange={e => onUpdate(anim.id, { fps: Math.max(1, parseInt(e.target.value) || 1) })} className="w-12 bg-white border border-slate-200 rounded-lg py-1 px-2 text-[11px] font-bold text-center" />
               </div>
               <button 
                 onClick={() => onAddFrame(anim.id, selectedSpriteId)} 
                 disabled={!selectedSpriteId} 
                 className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg disabled:opacity-30 disabled:bg-slate-400 transition-all shadow-lg shadow-indigo-100"
               >
                 追加当前帧
               </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {anim.frames.map((f, i) => {
                const s = regions.find(reg => reg.id === f.spriteId);
                const thumbSize = 40;
                let bgSize = 'auto';
                let bgPos = '0 0';
                if (s) {
                  const scale = thumbSize / Math.max(s.width, s.height);
                  bgSize = `${image.naturalWidth * scale}px ${image.naturalHeight * scale}px`;
                  bgPos = `-${s.x * scale}px -${s.y * scale}px`;
                }
                return (
                  <div key={f.id} className="w-10 h-10 bg-white border border-slate-200 rounded-lg relative group overflow-hidden shadow-sm">
                    {s && <div className="w-full h-full" style={{ backgroundImage: `url(${image.url})`, backgroundSize: bgSize, backgroundPosition: bgPos, imageRendering: 'pixelated' }} />}
                    <button onClick={() => { const nf = [...anim.frames]; nf.splice(i,1); onUpdate(anim.id, { frames: nf }); }} className="absolute inset-0 bg-rose-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X size={14}/></button>
                  </div>
                )
              })}
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
  if (animation.frames.length === 0) return <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase tracking-widest px-8">请点击“追加当前帧”来开始制作动作</div>;
  const s = regions.find(r => r.id === animation.frames[frame]?.spriteId);
  return (
    <div className="w-full h-full flex items-center justify-center bg-slate-50 relative p-4">
      {s && <div style={{ width: s.width, height: s.height, backgroundImage: `url(${image.url})`, backgroundPosition: `-${s.x}px -${s.y}px`, imageRendering: 'pixelated', transform: `scale(${Math.min(1, 180/Math.max(s.width, s.height))})` }} />}
      <div className="absolute bottom-3 right-3 text-[10px] font-bold text-slate-400 bg-white/50 backdrop-blur-sm px-2 py-0.5 rounded-full">{frame + 1} / {animation.frames.length}</div>
      <button onClick={() => setPlaying(!playing)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-all">{playing ? <Pause size={14}/> : <Play size={14}/>}</button>
    </div>
  );
};

const ExportTab = ({ spritesJson, animsJson }: any) => {
  const [subTab, setSubTab] = useState<'sprites' | 'anims'>('sprites');
  const content = subTab === 'sprites' ? spritesJson : animsJson;
  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 border border-slate-200">
        <button onClick={() => setSubTab('sprites')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all ${subTab === 'sprites' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>切片坐标 (JSON)</button>
        <button onClick={() => setSubTab('anims')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-xl transition-all ${subTab === 'anims' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400'}`}>动作配置 (JSON)</button>
      </div>
      <div className="flex-1 bg-slate-900 rounded-3xl flex flex-col overflow-hidden border border-slate-800 shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">实时数据输出</span>
          <button 
            onClick={() => { navigator.clipboard.writeText(content); alert('已复制到剪贴板'); }} 
            className="flex items-center gap-1.5 text-[10px] text-slate-400 hover:text-white font-bold transition-colors"
          >
            <Copy size={12}/> 复制到剪贴板
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
