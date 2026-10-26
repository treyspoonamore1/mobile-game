import type { RegionId } from '../../sim/data/regions.ts';
import { Pix, rng, light } from './bgkit.ts';
import { PAINTERS, type Scene } from './bgregions.ts';
import { depthHex } from './palette.ts';
import { rasterGrid, type Grid } from './raster.ts';

/** Fraction of the backdrop height where feet stand. */
export const GROUND_Y_FRAC = 0.75;

interface Part {
  bx: number; by: number; ph: number; f: number; color: string; big: boolean;
  vx: number; vy: number; sway: number; duty: number; y0: number; span: number;
}

interface Built {
  canvas: HTMLCanvasElement;
  scene: Scene;
  glows: HTMLCanvasElement[];
  parts: Part[];
  flames: HTMLCanvasElement[];
  candles: HTMLCanvasElement[];
}

const FLAMES: Grid[] = [
  ['..Y..', '.yYy.', '.yYy.', 'yYwYy', 'oYwYo', '.oyo.'],
  ['.Y...', '.yY..', 'yYYy.', 'yYwYy', 'oYwYo', '.oyo.'],
  ['...Y.', '..Yy.', '.yYYy', 'yYwYy', 'oywYo', '.oyo.'],
];
const CANDLES: Grid[] = [['.Y.', '.y.'], ['.Y.', '.Y.'], ['Y..', '.y.']];

const cache = new Map<string, Built>();
const MAX_CACHE = 8;

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function glowCanvas(r: number, color: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, r * 2, r * 2);
  return c;
}

function build(region: RegionId, depth: number, w: number, h: number): Built {
  const gy = Math.round(h * GROUND_Y_FRAC);
  const px = new Pix(w, h);
  const r = rng(hashStr(region) ^ 0x5eed);
  const scene = PAINTERS[region](px, w, h, gy, r);
  light(px, gy, scene.lights, scene.ambTop, scene.ambFloor);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(px.toImage(ctx, depth), 0, 0);

  const glows = scene.glows.map((g) => glowCanvas(g.r, depthHex(g.color, depth)));
  const pr = rng(hashStr(region) ^ 0xa11ce);
  const parts: Part[] = [];
  for (const p of scene.particles) {
    const y0 = (p.y0 ?? 0) * h, span = ((p.y1 ?? 1) - (p.y0 ?? 0)) * h;
    for (let i = 0; i < p.n; i++) {
      parts.push({
        bx: pr() * w, by: pr() * span, ph: pr() * Math.PI * 2, f: 0.4 + pr() * 0.9,
        color: depthHex(p.colors[Math.floor(pr() * p.colors.length)]!, depth),
        big: pr() < (p.big ?? 0), vx: p.vx * (0.7 + pr() * 0.6), vy: p.vy * (0.7 + pr() * 0.6),
        sway: p.sway, duty: p.duty, y0, span,
      });
    }
  }
  const opts = { outline: false, depth };
  const flames = FLAMES.map((g, i) => rasterGrid(g, { w: 5, h: 6, ...opts, label: `flame${i}` }));
  const candles = CANDLES.map((g, i) => rasterGrid(g, { w: 3, h: 2, ...opts, label: `candle${i}` }));
  return { canvas, scene, glows, parts, flames, candles };
}

function get(region: RegionId, depth: number, w: number, h: number): Built {
  const key = `${region}|${depth}|${w}|${h}`;
  let b = cache.get(key);
  if (b) {
    cache.delete(key);
    cache.set(key, b); // refresh LRU order
    return b;
  }
  b = build(region, depth, w, h);
  cache.set(key, b);
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
  return b;
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/**
 * Draws the fight backdrop at 1 logical px per art px (caller has already scaled the context,
 * imageSmoothing off). The static layer is cached per (region, depth, w, h); per frame this is
 * one drawImage plus a few glows, flames and ~30 particle rects.
 */
export function drawBackground(ctx: CanvasRenderingContext2D, region: RegionId, depth: number, w: number, h: number, timeSec: number): void {
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  const d = Math.max(0, Math.floor(depth));
  const b = get(region, d, w, h);
  const t = timeSec;
  ctx.drawImage(b.canvas, 0, 0);

  const { scene } = b;
  if (scene.glows.length) {
    const prevOp = ctx.globalCompositeOperation, prevA = ctx.globalAlpha;
    ctx.globalCompositeOperation = 'lighter';
    scene.glows.forEach((g, i) => {
      const flick = Math.sin(t * g.speed + i * 1.7) * 0.6 + Math.sin(t * g.speed * 2.3 + i) * 0.4;
      ctx.globalAlpha = Math.max(0, Math.min(1, g.base + g.amp * flick));
      ctx.drawImage(b.glows[i]!, Math.round(g.x - g.r), Math.round(g.y - g.r));
    });
    ctx.globalCompositeOperation = prevOp;
    ctx.globalAlpha = prevA;
  }

  scene.torches.forEach((tc, i) => {
    const f = Math.floor(t * 9 + i * 1.37 + Math.sin(t * 3 + i) * 0.8);
    if (tc.small) ctx.drawImage(b.candles[mod(f, 3)]!, tc.x - 1, tc.y - 2);
    else ctx.drawImage(b.flames[mod(f, 3)]!, tc.x - 2, tc.y - 6);
  });

  for (const p of b.parts) {
    if (p.duty < 1 && mod(t * 0.35 * p.f + p.ph / 6.283, 1) > p.duty) continue;
    const x = Math.floor(mod(p.bx + p.vx * t + Math.sin(t * p.f + p.ph) * p.sway, w));
    const y = Math.floor(p.y0 + mod(p.by + p.vy * t, p.span));
    ctx.fillStyle = p.color;
    ctx.fillRect(x, y, p.big ? 2 : 1, 1);
  }
}
