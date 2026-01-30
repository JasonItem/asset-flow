
export interface SpriteRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnimationFrame {
  id: string; // 帧的唯一标识（用于排序）
  spriteId: string; // 关联的素材 ID
}

export interface Animation {
  id: string;
  name: string;
  fps: number;
  frames: AnimationFrame[];
}

export interface ImageInfo {
  url: string;
  naturalWidth: number;
  naturalHeight: number;
}

export interface Point {
  x: number;
  y: number;
}
