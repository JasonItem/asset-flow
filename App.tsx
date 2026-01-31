
import React, { useState, useCallback, useRef } from 'react';
import { Upload, Download, Layers, Grid3X3, FolderOpen, Target, Zap, Box, Layout, MousePointerClick } from 'lucide-react';
import { SpriteRegion, ImageInfo, Animation } from './types';
import CanvasArea from './components/CanvasArea';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  const [image, setImage] = useState<ImageInfo | null>(null);
  const [regions, setRegions] = useState<SpriteRegion[]>([]);
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState({ w: 16, h: 16 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setImage({
          url,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight
        });
        setRegions([]);
        setAnimations([]);
        setSelectedId(null);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const addRegion = useCallback((region: Omit<SpriteRegion, 'id' | 'name'>) => {
    const newRegion: SpriteRegion = {
      ...region,
      id: crypto.randomUUID(),
      name: `资源_${regions.length + 1}`
    };
    setRegions(prev => [...prev, newRegion]);
    setSelectedId(newRegion.id);
  }, [regions.length]);

  const updateRegion = useCallback((id: string, updates: Partial<SpriteRegion>) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRegion = useCallback((id: string) => {
    setRegions(prev => prev.filter(r => r.id !== id));
    setAnimations(prev => prev.map(anim => ({
      ...anim,
      frames: anim.frames.filter(f => f.spriteId !== id)
    })));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const addAnimation = () => {
    const newAnim: Animation = {
      id: crypto.randomUUID(),
      name: `新动作_${animations.length + 1}`,
      fps: 12,
      frames: []
    };
    setAnimations(prev => [...prev, newAnim]);
  };

  const updateAnimation = (id: string, updates: Partial<Animation>) => {
    setAnimations(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const deleteAnimation = (id: string) => {
    setAnimations(prev => prev.filter(a => a.id !== id));
  };

  const addFrameToAnimation = (animId: string, spriteId: string) => {
    setAnimations(prev => prev.map(anim => {
      if (anim.id === animId) {
        return {
          ...anim,
          frames: [...anim.frames, { id: crypto.randomUUID(), spriteId }]
        };
      }
      return anim;
    }));
  };

  const deleteFrameFromAnimation = (animId: string, frameId: string) => {
    setAnimations(prev => prev.map(anim => {
      if (anim.id === animId) {
        return { ...anim, frames: anim.frames.filter(f => f.id !== frameId) };
      }
      return anim;
    }));
  };

  const moveFrameInAnimation = (animId: string, frameId: string, direction: 'up' | 'down') => {
    setAnimations(prev => prev.map(anim => {
      if (anim.id === animId) {
        const index = anim.frames.findIndex(f => f.id === frameId);
        if (index === -1) return anim;
        const newFrames = [...anim.frames];
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex >= 0 && newIndex < newFrames.length) {
          [newFrames[index], newFrames[newIndex]] = [newFrames[newIndex], newFrames[index]];
          return { ...anim, frames: newFrames };
        }
      }
      return anim;
    }));
  };

  const handleOpenFiles = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] text-slate-900 overflow-hidden">
      {/* 顶部页眉 */}
      <header className="h-16 px-6 bg-white border-b border-slate-200 flex items-center justify-between z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Layers size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">灵动资产助手</h1>
            <p className="text-[10px] text-slate-400 font-medium">点亮式网格切片工具</p>
          </div>
        </div>

        {/* 中间工具栏：网格设置 */}
        {image && (
          <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-full gap-1 border border-slate-200">
             <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm border border-slate-100">
                <Grid3X3 size={14} className="text-indigo-500" />
                <span className="text-[11px] font-bold text-slate-600">全局网格:</span>
                <input 
                  type="number" value={gridSize.w} 
                  onChange={e => setGridSize(prev => ({ ...prev, w: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="w-12 bg-transparent text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-100 rounded text-center"
                />
                <span className="text-[11px] text-slate-300">×</span>
                <input 
                  type="number" value={gridSize.h} 
                  onChange={e => setGridSize(prev => ({ ...prev, h: Math.max(1, parseInt(e.target.value) || 1) }))}
                  className="w-12 bg-transparent text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-100 rounded text-center"
                />
             </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenFiles} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-xs font-semibold transition-all"
          >
            <FolderOpen size={14} /> 导入新素材
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
          
          {image && (
            <div className="flex items-center bg-green-50 px-1 py-1 rounded-full border border-green-100">
               <span className="px-3 text-[10px] font-bold text-green-600 uppercase tracking-tighter">编辑器就绪</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {image ? (
          <>
            <div className="flex-1 relative bg-slate-50 canvas-container overflow-hidden">
              <CanvasArea 
                image={image} 
                regions={regions} 
                onAddRegion={addRegion} 
                selectedId={selectedId}
                onSelect={setSelectedId}
                onUpdate={updateRegion}
                gridSize={gridSize}
              />
            </div>
            
            <Sidebar 
              image={image}
              regions={regions} 
              animations={animations}
              selectedId={selectedId} 
              onSelect={setSelectedId}
              onUpdate={updateRegion}
              onDelete={deleteRegion}
              onAddAnimation={addAnimation}
              onUpdateAnimation={updateAnimation}
              onDeleteAnimation={deleteAnimation}
              onAddFrame={addFrameToAnimation}
              onDeleteFrame={deleteFrameFromAnimation}
              onMoveFrame={moveFrameInAnimation}
              onClear={() => { if(confirm('确定要放弃当前所有切片和动画吗？')) { setRegions([]); setAnimations([]); } }}
              onClose={() => {}}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white overflow-y-auto">
            <div className="max-w-4xl w-full">
              <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] shadow-inner flex items-center justify-center mx-auto mb-10">
                <MousePointerClick className="text-indigo-400" size={40} />
              </div>
              
              <h2 className="text-3xl font-bold mb-3 text-slate-900 tracking-tight">点亮网格，精准切片</h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-12 text-sm leading-relaxed">
                无需痛苦地画框。像使用画笔一样，点击或拖拽来“点亮”网格单元，系统会自动识别并提取坐标。
              </p>

              <button 
                onClick={handleOpenFiles}
                className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-2xl shadow-indigo-200 hover:-translate-y-1 hover:bg-indigo-700 transition-all mb-16"
              >
                导入项目素材
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4">
                <FeatureBox 
                  icon={<Target className="text-indigo-500" size={20}/>}
                  title="点亮式选择"
                  desc="单击选择单个网格，拖拽选择一片区域。"
                />
                <FeatureBox 
                  icon={<Zap className="text-orange-500" size={20}/>}
                  title="自动合并区域"
                  desc="拖拽时经过的网格将自动合并为整块素材。"
                />
                <FeatureBox 
                  icon={<Layout className="text-blue-500" size={20}/>}
                  title="Tilemap 友好"
                  desc="专为 16x16 或 32x32 的游戏地块装饰设计。"
                />
                <FeatureBox 
                  icon={<Box className="text-purple-500" size={20}/>}
                  title="无缝导出"
                  desc="快速获取 x, y, w, h，直接粘贴进项目代码。"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const FeatureBox = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-left hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
    <div className="mb-4 bg-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xs font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-[11px] text-slate-400 leading-normal">{desc}</p>
  </div>
);

export default App;
