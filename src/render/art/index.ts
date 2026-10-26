// Lifeline pixel art: all sprites are code (string grids), rasterized lazily into cached 1x canvases.
import './heroes.ts';
import './healers.ts';
import './enemies1.ts';
import './enemies2.ts';
import './bosses1.ts';
import './bosses2.ts';
import './fx.ts';
import { frames, spriteDef, type Anim } from './raster.ts';

export type { Anim } from './raster.ts';
export { drawBackground, GROUND_Y_FRAC } from './backgrounds.ts';
export { getIcon, ICON_IDS, type IconId } from './icons.ts';

/** 1x canvases. Falls back to 'idle' if the anim is missing. depth>0 returns a recoloured variant (cached). */
export function getFrames(id: string, anim: Anim, depth = 0): HTMLCanvasElement[] {
  return frames(id, anim, depth);
}

export function spriteSize(id: string): { w: number; h: number } {
  const d = spriteDef(id);
  return d ? { w: d.w, h: d.h } : { w: 16, h: 16 };
}
