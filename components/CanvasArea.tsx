
import React, { useState, useRef, useEffect } from 'react';
import { ImageInfo, SpriteRegion, Point } from '../types';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface Props {
  image: ImageInfo;
  regions: SpriteRegion[];
  onAddRegion: (region: Omit<SpriteRegion, 'id' | 'name'>) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string, updates: Partial<SpriteRegion>) => void;
  gridSize: { w: number, h: number };
}

type HandleType = 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';

const CanvasArea: React.FC<Props> = ({ image, regions, onAddRegion, selectedId, onSelect, onUpdate, gridSize }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [resizing, setResizing] = useState<{ id: string, handle: HandleType, startX: number, startY: number, originalRegion: SpriteRegion } | null>(null);
  const [moving, setMoving] = useState<{ id: string, startX: number, startY: number, originalRegion: SpriteRegion } | null>(null);
  const [panning, setPanning] = useState<{ startX: number, startY: number, initialOffsetX: number, initialOffsetY: number } | null>(null);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const [currentPos, setCurrentPos] = useState<Point | null>(null);
  const [hoverGridPos, setHoverGridPos] = useState<Point | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  useEffect(() => {
    const handleWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(0.05, prev * factor), 50));
      }
    };
    containerRef.current?.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => containerRef.current?.removeEventListener('wheel', handleWheelNative);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(true);
        if (e.target === document.body) e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const getRelativeCoords = (e: MouseEvent | React.MouseEvent): Point => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const getCurrentScale = () => {
    if (!imgRef.current) return 1;
    return image.naturalWidth / imgRef.current.getBoundingClientRect().width;
  };

  const snapToGrid = (pixelVal: number, size: number) => Math.round(pixelVal / size) * size;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    
    // 关键：防止浏览器默认的选择行为
    e.preventDefault();

    if (isSpacePressed || e.button === 1) {
      setPanning({ startX: e.clientX, startY: e.clientY, initialOffsetX: offset.x, initialOffsetY: offset.y });
      return;
    }

    const coords = getRelativeCoords(e);
    const scale = getCurrentScale();
    const pixelX = coords.x * scale;
    const pixelY = coords.y * scale;
    
    const clickedRegion = [...regions].reverse().find(r => 
      pixelX >= r.x && pixelX <= r.x + r.width && pixelY >= r.y && pixelY <= r.y + r.height
    );

    if (clickedRegion) {
      onSelect(clickedRegion.id);
      setMoving({ id: clickedRegion.id, startX: e.clientX, startY: e.clientY, originalRegion: { ...clickedRegion } });
    } else {
      setIsDrawing(true);
      const sX = snapToGrid(pixelX, gridSize.w);
      const sY = snapToGrid(pixelY, gridSize.h);
      setStartPos({ x: sX / scale, y: sY / scale });
      setCurrentPos({ x: sX / scale, y: sY / scale });
      onSelect(null);
    }
  };

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      const scale = getCurrentScale();
      const coords = getRelativeCoords(e);
      
      // 更新网格悬停位置
      const hX = Math.floor((coords.x * scale) / gridSize.w) * gridSize.w;
      const hY = Math.floor((coords.y * scale) / gridSize.h) * gridSize.h;
      setHoverGridPos({ x: hX, y: hY });

      if (panning) {
        setOffset({ x: panning.initialOffsetX + (e.clientX - panning.startX), y: panning.initialOffsetY + (e.clientY - panning.startY) });
      } else if (resizing) {
        const dx = (e.clientX - resizing.startX) * scale;
        const dy = (e.clientY - resizing.startY) * scale;
        const { originalRegion, handle, id } = resizing;
        let { x, y, width, height } = originalRegion;
        if (handle.includes('t')) { y = snapToGrid(originalRegion.y + dy, gridSize.h); height = originalRegion.height + (originalRegion.y - y); }
        if (handle.includes('b')) { height = snapToGrid(originalRegion.height + dy, gridSize.h); }
        if (handle.includes('l')) { x = snapToGrid(originalRegion.x + dx, gridSize.w); width = originalRegion.width + (originalRegion.x - x); }
        if (handle.includes('r')) { width = snapToGrid(originalRegion.width + dx, gridSize.w); }
        onUpdate(id, { x, y, width: Math.max(gridSize.w, width), height: Math.max(gridSize.h, height) });
      } else if (moving) {
        const dx = (e.clientX - moving.startX) * scale;
        const dy = (e.clientY - moving.startY) * scale;
        onUpdate(moving.id, { x: snapToGrid(moving.originalRegion.x + dx, gridSize.w), y: snapToGrid(moving.originalRegion.y + dy, gridSize.h) });
      } else if (isDrawing && startPos) {
        const pixelX = snapToGrid(coords.x * scale, gridSize.w);
        const pixelY = snapToGrid(coords.y * scale, gridSize.h);
        setCurrentPos({ x: pixelX / scale, y: pixelY / scale });
      }
    };
    const handleMouseUpGlobal = () => {
      if (isDrawing && startPos && currentPos) {
        const scale = getCurrentScale();
        const x = Math.round(Math.min(startPos.x, currentPos.x) * scale);
        const y = Math.round(Math.min(startPos.y, currentPos.y) * scale);
        const w = Math.round(Math.abs(startPos.x - currentPos.x) * scale);
        const h = Math.round(Math.abs(startPos.y - currentPos.y) * scale);
        if (w >= gridSize.w && h >= gridSize.h) onAddRegion({ x, y, width: w, height: h });
      }
      setPanning(null); setResizing(null); setMoving(null); setIsDrawing(false); setStartPos(null); setCurrentPos(null);
    };
    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => { window.removeEventListener('mousemove', handleMouseMoveGlobal); window.removeEventListener('mouseup', handleMouseUpGlobal); };
  }, [panning, resizing, moving, isDrawing, startPos, currentPos, gridSize, onUpdate]);

  const imgScale = (imgRef.current?.clientWidth || image.naturalWidth) / image.naturalWidth;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-50 ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseLeave={() => setHoverGridPos(null)}
    >
      {/* 缩放控制浮窗 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-xl border border-white/50 z-50">
        <button onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} className="p-2 hover:bg-indigo-50 rounded-xl text-slate-500 transition-colors"><ZoomOut size={16}/></button>
        <div className="px-3 text-[11px] font-bold text-slate-600 min-w-[60px] text-center">{Math.round(zoom * 100)}%</div>
        <button onClick={() => setZoom(z => Math.min(50, z * 1.2))} className="p-2 hover:bg-indigo-50 rounded-xl text-slate-500 transition-colors"><ZoomIn size={16}/></button>
        <div className="w-[1px] h-4 bg-slate-200 mx-2"></div>
        <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-2 hover:bg-indigo-50 rounded-xl text-slate-500 transition-colors"><Maximize size={16}/></button>
      </div>

      <div className="relative will-change-transform" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
        <img ref={imgRef} src={image.url} alt="Sprite" className="max-w-none shadow-2xl rounded-sm border border-slate-200 pointer-events-none" />
        
        {/* 网格参考线覆盖层 */}
        <div className="grid-overlay" style={{ '--grid-w': `${gridSize.w * imgScale}px`, '--grid-h': `${gridSize.h * imgScale}px` } as any} />

        {/* 网格悬停遮罩 */}
        {!isDrawing && !moving && !resizing && !panning && hoverGridPos && (
          <div 
            className="absolute bg-indigo-500/10 border border-indigo-500/30 pointer-events-none transition-all duration-75"
            style={{ 
              left: hoverGridPos.x * imgScale, 
              top: hoverGridPos.y * imgScale, 
              width: gridSize.w * imgScale, 
              height: gridSize.h * imgScale 
            }}
          />
        )}

        {/* 已保存的素材区域 */}
        {regions.map(region => {
          const isSelected = selectedId === region.id;
          return (
            <div 
              key={region.id}
              className={`absolute transition-all ${isSelected ? 'border-2 border-indigo-600 bg-indigo-600/15 z-20 shadow-lg' : 'border border-indigo-300 bg-indigo-200/5 hover:border-indigo-500 z-10'}`}
              style={{ left: region.x * imgScale, top: region.y * imgScale, width: region.width * imgScale, height: region.height * imgScale }}
            >
              {isSelected && (
                <>
                  <div className="absolute -top-10 left-0 bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-md font-bold shadow-md whitespace-nowrap pointer-events-none" style={{ transform: `scale(${1/zoom})`, transformOrigin: 'bottom left' }}>
                    {region.name} · {region.width}x{region.height}
                  </div>
                  {['tl', 'tr', 'bl', 'br'].map(h => (
                    <div key={h} className="absolute w-2.5 h-2.5 bg-white border-2 border-indigo-600 rounded-full z-30 shadow-md" style={{ 
                      top: h.includes('t') ? -5 : 'auto', bottom: h.includes('b') ? -5 : 'auto', 
                      left: h.includes('l') ? -5 : 'auto', right: h.includes('r') ? -5 : 'auto',
                      transform: `scale(${Math.max(0.5, 1/zoom)})`, cursor: `${h}-resize`
                    }} onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setResizing({ id: region.id, handle: h as HandleType, startX: e.clientX, startY: e.clientY, originalRegion: region }); }} />
                  ))}
                </>
              )}
            </div>
          );
        })}

        {/* 正在绘制的区域预览 */}
        {isDrawing && startPos && currentPos && (
          <div 
            className="absolute border-2 border-indigo-500 bg-indigo-500/10 z-30 shadow-sm" 
            style={{ 
              left: Math.min(startPos.x, currentPos.x) * imgScale, 
              top: Math.min(startPos.y, currentPos.y) * imgScale, 
              width: Math.abs(startPos.x - currentPos.x) * imgScale, 
              height: Math.abs(startPos.y - currentPos.y) * imgScale 
            }} 
          />
        )}
      </div>
    </div>
  );
};

export default CanvasArea;
