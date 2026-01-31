import React, { useState, useRef, useEffect, useMemo } from 'react';
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

const CanvasArea: React.FC<Props> = ({ image, regions, onAddRegion, selectedId, onSelect, onUpdate, gridSize }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const [isSelecting, setIsSelecting] = useState(false);
  const [panning, setPanning] = useState<{ startX: number, startY: number, initialOffsetX: number, initialOffsetY: number } | null>(null);
  const [moving, setMoving] = useState<{ id: string, startGridX: number, startGridY: number, originalRegion: SpriteRegion } | null>(null);
  
  const [startGrid, setStartGrid] = useState<{ x: number, y: number } | null>(null);
  const [currentGrid, setCurrentGrid] = useState<{ x: number, y: number } | null>(null);
  const [hoverGrid, setHoverGrid] = useState<{ x: number, y: number } | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // 缩放逻辑
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

  // 空格键抓手逻辑
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

  const getPixelCoords = (e: MouseEvent | React.MouseEvent): Point => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const scale = image.naturalWidth / rect.width;
    return { 
      x: (e.clientX - rect.left) * scale, 
      y: (e.clientY - rect.top) * scale 
    };
  };

  const getGridCoords = (pixel: Point) => ({
    x: Math.floor(pixel.x / gridSize.w),
    y: Math.floor(pixel.y / gridSize.h)
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 && e.button !== 1) return;
    e.preventDefault();

    if (isSpacePressed || e.button === 1) {
      // Corrected the duplicated key in the object literal below
      setPanning({ startX: e.clientX, startY: e.clientY, initialOffsetX: offset.x, initialOffsetY: offset.y });
      return;
    }

    const pixelPos = getPixelCoords(e);
    const gridPos = getGridCoords(pixelPos);

    // 检查是否点击在已有区域上
    const clickedRegion = [...regions].reverse().find(r => 
      pixelPos.x >= r.x && pixelPos.x <= r.x + r.width && pixelPos.y >= r.y && pixelPos.y <= r.y + r.height
    );

    if (clickedRegion) {
      onSelect(clickedRegion.id);
      setMoving({ 
        id: clickedRegion.id, 
        startGridX: gridPos.x, 
        startGridY: gridPos.y, 
        originalRegion: { ...clickedRegion } 
      });
    } else {
      setIsSelecting(true);
      setStartGrid(gridPos);
      setCurrentGrid(gridPos);
      onSelect(null);
    }
  };

  useEffect(() => {
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      const pixelPos = getPixelCoords(e);
      const gridPos = getGridCoords(pixelPos);
      setHoverGrid(gridPos);

      if (panning) {
        setOffset({ 
          x: panning.initialOffsetX + (e.clientX - panning.startX), 
          y: panning.initialOffsetY + (e.clientY - panning.startY) 
        });
      } else if (moving) {
        const dx = (gridPos.x - moving.startGridX) * gridSize.w;
        const dy = (gridPos.y - moving.startGridY) * gridSize.h;
        onUpdate(moving.id, { 
          x: moving.originalRegion.x + dx, 
          y: moving.originalRegion.y + dy 
        });
      } else if (isSelecting) {
        setCurrentGrid(gridPos);
      }
    };

    const handleMouseUpGlobal = () => {
      if (isSelecting && startGrid && currentGrid) {
        const minGX = Math.min(startGrid.x, currentGrid.x);
        const maxGX = Math.max(startGrid.x, currentGrid.x);
        const minGY = Math.min(startGrid.y, currentGrid.y);
        const maxGY = Math.max(startGrid.y, currentGrid.y);

        const x = minGX * gridSize.w;
        const y = minGY * gridSize.h;
        const w = (maxGX - minGX + 1) * gridSize.w;
        const h = (maxGY - minGY + 1) * gridSize.h;

        // 确保不会创建超出图片的区域
        if (x >= 0 && y >= 0) {
          onAddRegion({ x, y, width: w, height: h });
        }
      }
      setPanning(null);
      setMoving(null);
      setIsSelecting(false);
      setStartGrid(null);
      setCurrentGrid(null);
    };

    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [panning, moving, isSelecting, startGrid, currentGrid, gridSize, onUpdate, onAddRegion]);

  const imgScale = (imgRef.current?.clientWidth || image.naturalWidth) / image.naturalWidth;

  // 计算当前正在框选的视觉区域
  const selectionRect = useMemo(() => {
    if (!isSelecting || !startGrid || !currentGrid) return null;
    const minGX = Math.min(startGrid.x, currentGrid.x);
    const maxGX = Math.max(startGrid.x, currentGrid.x);
    const minGY = Math.min(startGrid.y, currentGrid.y);
    const maxGY = Math.max(startGrid.y, currentGrid.y);
    return {
      left: minGX * gridSize.w * imgScale,
      top: minGY * gridSize.h * imgScale,
      width: (maxGX - minGX + 1) * gridSize.w * imgScale,
      height: (maxGY - minGY + 1) * gridSize.h * imgScale
    };
  }, [isSelecting, startGrid, currentGrid, gridSize, imgScale]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden flex items-center justify-center bg-slate-50 ${isSpacePressed ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}`}
      onMouseDown={handleMouseDown}
    >
      {/* 辅助工具栏 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-xl border border-white/50 z-50">
        <button onClick={() => setZoom(z => Math.max(0.1, z * 0.8))} className="p-2 hover:bg-indigo-50 rounded-xl text-slate-500 transition-colors"><ZoomOut size={16}/></button>
        <div className="px-3 text-[11px] font-bold text-slate-600 min-w-[60px] text-center">{Math.round(zoom * 100)}%</div>
        <button onClick={() => setZoom(z => Math.min(50, z * 1.2))} className="p-2 hover:bg-indigo-50 rounded-xl text-slate-500 transition-colors"><ZoomIn size={16}/></button>
        <div className="w-[1px] h-4 bg-slate-200 mx-2"></div>
        <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} className="p-2 hover:bg-indigo-50 rounded-xl text-slate-500 transition-colors"><Maximize size={16}/></button>
      </div>

      <div className="relative will-change-transform" style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}>
        <img ref={imgRef} src={image.url} alt="Sprite" className="max-w-none shadow-2xl rounded-sm border border-slate-200 pointer-events-none" />
        
        {/* 网格参考线 */}
        <div className="grid-overlay" style={{ '--grid-w': `${gridSize.w * imgScale}px`, '--grid-h': `${gridSize.h * imgScale}px` } as any} />

        {/* 鼠标悬停网格高亮 */}
        {!isSelecting && hoverGrid && (
          <div 
            className="absolute pointer-events-none bg-indigo-500/10 border border-indigo-500/30 z-10"
            style={{ 
              left: hoverGrid.x * gridSize.w * imgScale, 
              top: hoverGrid.y * gridSize.h * imgScale, 
              width: gridSize.w * imgScale, 
              height: gridSize.h * imgScale 
            }}
          />
        )}

        {/* 已创建的区域 */}
        {regions.map(region => {
          const isSelected = selectedId === region.id;
          return (
            <div 
              key={region.id}
              className={`absolute transition-all ${isSelected ? 'border-2 border-indigo-600 bg-indigo-600/10 z-20 shadow-lg' : 'border border-indigo-300 bg-indigo-200/5 hover:border-indigo-500 z-10'}`}
              style={{ left: region.x * imgScale, top: region.y * imgScale, width: region.width * imgScale, height: region.height * imgScale }}
            >
              {isSelected && (
                <div className="absolute -top-10 left-0 bg-indigo-600 text-white text-[10px] px-2 py-1 rounded-md font-bold shadow-md whitespace-nowrap pointer-events-none" style={{ transform: `scale(${1/zoom})`, transformOrigin: 'bottom left' }}>
                  {region.name} ({region.width}x{region.height})
                </div>
              )}
            </div>
          );
        })}

        {/* 正在选择的区域 (点亮格子的视觉效果) */}
        {selectionRect && (
          <div 
            className="absolute border-2 border-indigo-500 bg-indigo-500/20 z-30 shadow-sm transition-none" 
            style={{ 
              left: selectionRect.left, 
              top: selectionRect.top, 
              width: selectionRect.width, 
              height: selectionRect.height 
            }} 
          />
        )}
      </div>
    </div>
  );
};

export default CanvasArea;