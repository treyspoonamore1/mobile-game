import { PAL, OUTLINE, hexToRgba, depthHex, rgbToHex } from './palette.ts';

export type Anim = 'idle' | 'attack' | 'hurt' | 'down' | 'windup' | 'cast';
export type Grid = readonly string[];

/** A frame: a grid, optionally tinted toward a colour (e.g. the hurt flash). */
export interface Frame {
  g: Grid;
  mix?: readonly [string, number];
}
export type FrameSpec = Grid | Frame;

export interface SpriteDef {
  w: number;
  h: number;
  anims: Partial<Record<Anim, readonly FrameSpec[]>>;
  /** Local palette overrides / extensions. */
  pal?: Record<string, string>;
  /** Auto 1px outline around filled pixels (default true). */
  outline?: boolean;
  /** Characters whose colour is kept unchanged by the depth recolour (glowing eyes etc). */
  keep?: string;
}

/** Problems found while rasterizing (bad row lengths, unknown chars). Shown by the preview. */
export const artWarnings: string[] = [];

const defs = new Map<string, SpriteDef>();
const cache = new Map<string, HTMLCanvasElement[]>();

export function define(id: string, def: SpriteDef): void {
  defs.set(id, def);
}

export function spriteIds(): string[] {
  return [...defs.keys()];
}

export function spriteDef(id: string): SpriteDef | undefined {
  return defs.get(id);
}

export function frames(id: string, anim: Anim, depth = 0): HTMLCanvasElement[] {
  const def = defs.get(id);
  if (!def) {
    artWarnings.push(`unknown sprite ${id}`);
    defs.set(id, { w: 8, h: 8, anims: { idle: [['wwwwwwww', 'wxxxxxxw', 'wxwxxwxw', 'wxxwwxxw', 'wxxwwxxw', 'wxwxxwxw', 'wxxxxxxw', 'wwwwwwww']] } });
    return frames(id, anim, depth);
  }
  const a: Anim = def.anims[anim] ? anim : 'idle';
  const d = Math.max(0, Math.floor(depth));
  const key = `${id}|${a}|${d}`;
  let out = cache.get(key);
  if (!out) {
    const specs = def.anims[a] ?? [];
    out = specs.map((f, i) => {
      const fr: Frame = isFrame(f) ? f : { g: f };
      return rasterGrid(fr.g, {
        w: def.w, h: def.h, pal: def.pal, outline: def.outline ?? true,
        depth: d, keep: def.keep, mix: fr.mix, label: `${id}.${a}[${i}]`,
      });
    });
    cache.set(key, out);
  }
  return out;
}

function isFrame(f: FrameSpec): f is Frame {
  return !Array.isArray(f);
}

export interface RasterOpts {
  w: number;
  h: number;
  pal?: Record<string, string>;
  outline?: boolean;
  outlineColor?: string;
  depth?: number;
  keep?: string;
  mix?: readonly [string, number];
  label?: string;
}

function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgba(a);
  const [r2, g2, b2] = hexToRgba(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function rasterGrid(grid: Grid, o: RasterOpts): HTMLCanvasElement {
  const { w, h } = o;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const px = img.data;
  const filled = new Uint8Array(w * h);
  const colors = new Map<string, readonly number[]>();
  const colorOf = (ch: string): readonly number[] | null => {
    let c = colors.get(ch);
    if (c) return c;
    let hex = o.pal?.[ch] ?? PAL[ch];
    if (!hex) {
      artWarnings.push(`${o.label ?? '?'}: unknown char '${ch}'`);
      hex = '#ff00ff';
    }
    if (o.mix) hex = mixHex(hex, o.mix[0], o.mix[1]);
    if (o.depth && !(o.keep && o.keep.includes(ch))) hex = depthHex(hex, o.depth);
    c = hexToRgba(hex);
    colors.set(ch, c);
    return c;
  };
  if (grid.length !== h) artWarnings.push(`${o.label ?? '?'}: ${grid.length} rows, expected ${h}`);
  for (let y = 0; y < h; y++) {
    const row = grid[y] ?? '';
    if (row.length !== w) artWarnings.push(`${o.label ?? '?'}: row ${y} has ${row.length} cols, expected ${w}`);
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? '.';
      if (ch === '.' || ch === ' ') continue;
      const c = colorOf(ch);
      if (!c) continue;
      const i = (y * w + x) * 4;
      px[i] = c[0]!; px[i + 1] = c[1]!; px[i + 2] = c[2]!; px[i + 3] = c[3]!;
      filled[y * w + x] = 1;
    }
  }
  if (o.outline !== false) {
    const oc = hexToRgba(o.outlineColor ?? OUTLINE);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (filled[y * w + x]) continue;
        const n = (x > 0 && filled[y * w + x - 1]) || (x < w - 1 && filled[y * w + x + 1])
          || (y > 0 && filled[(y - 1) * w + x]) || (y < h - 1 && filled[(y + 1) * w + x]);
        if (!n) continue;
        const i = (y * w + x) * 4;
        px[i] = oc[0]; px[i + 1] = oc[1]; px[i + 2] = oc[2]; px[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

// ---------------------------------------------------------------- grid helpers

const blank = (w: number): string => '.'.repeat(w);

/** Breathing bob: rows above `split` sink by one pixel (row `split` is overwritten). */
export function bob(g: Grid, split: number): Grid {
  const w = g[0]!.length;
  return g.map((row, i) => (i === 0 ? blank(w) : i <= split ? g[i - 1]! : row));
}

export function shift(g: Grid, dx: number, dy: number): Grid {
  const h = g.length, w = g[0]!.length;
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    const sy = y - dy;
    const src = sy >= 0 && sy < h ? g[sy]! : blank(w);
    let row = '';
    for (let x = 0; x < w; x++) {
      const sx = x - dx;
      row += sx >= 0 && sx < w ? src[sx] ?? '.' : '.';
    }
    out.push(row);
  }
  return out;
}

/** Overlay rows at (x, y). In the overlay ' ' keeps the base pixel and '.' clears it. */
export function put(g: Grid, x: number, y: number, rows: Grid): Grid {
  const out = g.map((r) => r.split(''));
  rows.forEach((r, j) => {
    const row = out[y + j];
    if (!row) return;
    for (let i = 0; i < r.length; i++) {
      const ch = r[i]!;
      if (ch === ' ' || x + i < 0 || x + i >= row.length) continue;
      row[x + i] = ch;
    }
  });
  return out.map((r) => r.join(''));
}

/** Replace characters (e.g. swap palette chars for a variant). */
export function recolor(g: Grid, map: Record<string, string>): Grid {
  return g.map((r) => r.replace(/./g, (c) => map[c] ?? c));
}

/** Rotate 90 degrees counter-clockwise (top edge becomes the left edge). */
export function rotCCW(g: Grid): Grid {
  const h = g.length, w = g[0]!.length;
  const out: string[] = [];
  for (let y = 0; y < w; y++) {
    let row = '';
    for (let x = 0; x < h; x++) row += g[x]![w - 1 - y] ?? '.';
    out.push(row);
  }
  return out;
}

/** Move content so its lowest filled row sits at `row` (default h-2, leaving room for the outline). */
export function ground(g: Grid, row = g.length - 2): Grid {
  let last = -1;
  g.forEach((r, i) => { if (/[^. ]/.test(r)) last = i; });
  return last < 0 ? g : shift(g, 0, row - last);
}

/** Content bounding box. */
export function bounds(g: Grid): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity, x1 = -1, y0 = Infinity, y1 = -1;
  g.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (r[x] !== '.' && r[x] !== ' ') { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = y; }
    }
  });
  return { x0, x1, y0, y1 };
}

/** Lying-down pose: rotate so the figure lies on its back, centred, on the ground row. */
export function lieDown(g: Grid): Grid {
  const r = ground(rotCCW(g));
  const b = bounds(r);
  const w = g[0]!.length;
  return shift(r, Math.round((w - 1 - b.x1 - b.x0) / 2), 0);
}

/** Hurt pose: knocked back one pixel with a pale red flash. */
export function hurt(g: Grid, dx = -1): Frame {
  return { g: shift(g, dx, 0), mix: ['#ffb0b0', 0.4] };
}

/** Downed pose: lying, desaturated. */
export function downed(g: Grid): Frame {
  return { g: lieDown(g), mix: ['#5a6988', 0.35] };
}

/** Draw a 1px line (Bresenham) of `ch` from (x0,y0) to (x1,y1). */
export function line(g: Grid, x0: number, y0: number, x1: number, y1: number, ch: string): Grid {
  const out = g.map((r) => r.split(''));
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    const row = out[y];
    if (row && x >= 0 && x < row.length) row[x] = ch;
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return out.map((r) => r.join(''));
}

/** Right-pad rows with '.' to width w and add blank rows up to h (lets big sprites skip trailing dots). */
export function pad(rows: Grid, w: number, h = w): Grid {
  const out = rows.map((r) => (r.length < w ? r + '.'.repeat(w - r.length) : r));
  while (out.length < h) out.push('.'.repeat(w));
  return out;
}
