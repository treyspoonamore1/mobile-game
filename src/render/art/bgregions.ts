import type { RegionId } from '../../sim/data/regions.ts';
import { Pix, bricks, cells, flags, type Light } from './bgkit.ts';
import { ember as emberPainter, abyss as abyssPainter } from './bgregions2.ts';

// Region painters for the static backdrop layer. Each paints flat colours into a Pix and
// describes its lights and animated details. Everything is anchored to the ground line gy
// (or the top edge) so any height from ~130 to ~220 px works.

export interface Particles {
  n: number;
  colors: readonly string[];
  vx: number;
  vy: number;
  sway: number;
  /** Fraction of each particle's cycle it is visible (twinkle). 1 = always. */
  duty: number;
  big?: number; // fraction drawn 2px wide
  /** Restrict to y range as fractions of h. */
  y0?: number;
  y1?: number;
}

export interface Glow {
  x: number;
  y: number;
  r: number;
  color: string;
  base: number;
  amp: number;
  speed: number;
}

export interface Scene {
  lights: Light[];
  ambTop: number;
  ambFloor: number;
  torches: { x: number; y: number; small?: boolean }[];
  glows: Glow[];
  particles: Particles[];
}

type Painter = (px: Pix, w: number, h: number, gy: number, r: () => number) => Scene;

function sconce(px: Pix, x: number, y: number): void {
  px.grid(x - 2, y, ['kgggk', '.kgk.', '..g..', '.kgk.'], { k: '#262b44', g: '#5a6988' });
}

function bone(px: Pix, x: number, y: number, r: () => number): void {
  const c = '#8b9bb4', e = '#c0cbdc';
  if (r() < 0.5) px.grid(x, y, ['e.e', '.c.', '..cc', '..ece'.slice(0, 4)], { e, c });
  else px.grid(x, y, ['e....e', 'ecccce'], { e, c });
}

function skull(px: Pix, x: number, y: number): void {
  px.grid(x, y, ['.lll.', 'lllll', 'lklkl', '.lll.', '.g.g.'], { l: '#8b9bb4', k: '#181425', g: '#5a6988' });
}

function crypt(px: Pix, w: number, h: number, gy: number, r: () => number): Scene {
  const bs = bricks(px, 0, w, 0, gy, 12, 6, r, ['#343c5c', '#3a4466', '#30375a'], '#1e2236', '#46527a', '#2a3050');
  for (const b of bs) {
    if (r() > 0.16) continue;
    const mx = b.x + 1 + Math.floor(r() * (b.w - 4));
    for (let i = 0; i < 4; i++) px.set(mx + i, b.y + 1, i % 2 ? '#3e8948' : '#265c42');
    for (let i = 0; i < 3; i++) if (r() < 0.6) px.set(mx + i, b.y + 2, '#265c42');
    if (r() < 0.5) px.set(mx + 1, b.y + 3, '#265c42');
  }
  // arched alcove between the party and the enemies
  const ax = Math.round(w / 2), half = 11, top = gy - 34;
  for (let y = top - 2; y < gy; y++) {
    for (let x = ax - half - 2; x <= ax + half + 2; x++) {
      const cy = top + half;
      const d = y < cy ? Math.hypot(x - ax, y - cy) : Math.abs(x - ax);
      if (d <= half) px.set(x, y, (x + y) % 2 && y > gy - 12 ? '#1e2236' : '#15131f');
      else if (d <= half + 2) px.set(x, y, d <= half + 1 ? '#4a5677' : '#262b44');
    }
  }
  px.rect(ax - half, gy - 6, half * 2 + 1, 2, '#3a4466');
  skull(px, ax - 2, gy - 11);
  px.grid(ax - 8, gy - 10, ['p', 'p', 'P', 'P'], { p: '#ead4aa', P: '#c28569' });
  px.grid(ax + 7, gy - 9, ['p', 'P', 'P'], { p: '#ead4aa', P: '#c28569' });
  // cobwebs in the top corners
  for (const [cx, dir] of [[0, 1], [w - 1, -1]] as const) {
    for (let k = 0; k < 14; k++) { px.set(cx + dir * k, k, '#5a6988'); }
    for (let k = 0; k < 18; k++) { px.set(cx + dir * k, Math.floor(k * 0.4), '#5a6988'); px.set(cx + dir * Math.floor(k * 0.4), k, '#5a6988'); }
    for (const s of [5, 9, 13]) for (let k = 0; k <= s; k++) px.set(cx + dir * (s - k + Math.floor(k * 0.4)), Math.floor((s - k) * 0.4) + k, '#4a5677');
  }
  px.rect(0, gy - 1, w, 1, '#1e2236');
  flags(px, w, gy, h, r, ['#2f3654', '#343c5c', '#2b3150'], '#1a1d30', '#3f4a6c');
  const bonesAt = [[8, gy + 18], [w - 30, gy + 24], [w - 12, gy + 10], [70, h - 8], [140, h - 6]] as const;
  bonesAt.forEach(([x, y]) => { if (y < h - 3) bone(px, x, y, r); });
  if (gy + 22 < h) skull(px, 22, h - 9);
  const tl = 30, tr = w - 30, ty = gy - 42;
  sconce(px, tl, ty);
  sconce(px, tr, ty);
  return {
    lights: [
      { x: tl, y: ty - 3, r: 52, color: '#f77622', i: 0.75 },
      { x: tr, y: ty - 3, r: 52, color: '#f77622', i: 0.75 },
      { x: ax, y: gy - 9, r: 16, color: '#feae34', i: 0.5 },
    ],
    ambTop: 0.45, ambFloor: 0.7,
    torches: [{ x: tl, y: ty }, { x: tr, y: ty }, { x: ax - 8, y: gy - 10, small: true }, { x: ax + 7, y: gy - 9, small: true }],
    glows: [
      { x: tl, y: ty - 4, r: 26, color: '#f77622', base: 0.16, amp: 0.05, speed: 9 },
      { x: tr, y: ty - 4, r: 26, color: '#f77622', base: 0.16, amp: 0.05, speed: 11 },
    ],
    particles: [{ n: 14, colors: ['#8b9bb4', '#5a6988'], vx: 1.5, vy: 1.2, sway: 3, duty: 0.6, y0: 0, y1: 0.75 }],
  };
}

function mushroom(px: Pix, x: number, y: number, s: number, cap: string, hi: string, under: string): void {
  // y is the ground the stem stands on
  const sh = Math.max(2, Math.round(s * 0.7));
  for (let j = 1; j <= sh; j++) px.set(x, y - j, '#ead4aa');
  if (s > 4) for (let j = 1; j <= sh; j++) px.set(x + 1, y - j, '#c28569');
  const cw = s, cy = y - sh - 1;
  for (let i = -cw; i <= cw + (s > 4 ? 1 : 0); i++) px.set(x + i, cy, under);
  for (let j = 1; j <= Math.ceil(s / 2); j++) {
    const half = Math.round(cw * Math.sqrt(1 - (j / (s / 2 + 1)) ** 2));
    for (let i = -half; i <= half + (s > 4 ? 1 : 0); i++) px.set(x + i, cy - j, i < 0 && j > 1 ? hi : cap);
  }
}

function fungal(px: Pix, w: number, h: number, gy: number, r: () => number): Scene {
  cells(px, 0, 0, w, gy, Math.round((w * gy) / 110), r, ['#3e2731', '#39242f', '#33222e', '#2c2833'], '#221825', '#4a3240', 1.1);
  // hanging roots
  for (let k = 0; k < 16; k++) {
    let x = Math.floor(r() * w);
    const len = 8 + Math.floor(r() * 30);
    const c = r() < 0.5 ? '#265c42' : '#3e2731';
    for (let y = 0; y < len; y++) {
      if (r() < 0.25) x += r() < 0.5 ? -1 : 1;
      px.set(x, y, c);
      if (y < len / 3) px.set(x + 1, y, c);
    }
    if (c === '#265c42') px.set(x, len, '#3e8948');
  }
  // giant background mushrooms (dim silhouettes)
  for (const [mx, mh, mw] of [[26, 46, 15], [w - 30, 56, 18], [w / 2 + 2, 30, 9]] as const) {
    const top = gy - mh;
    px.rect(mx - 2, top, 5, mh, '#4a3a46');
    px.rect(mx - 2, top, 1, mh, '#5a4652');
    px.rect(mx + 2, top, 1, mh, '#352833');
    for (let j = 0; j < Math.ceil(mw / 2.2); j++) {
      const half = Math.round(mw * Math.sqrt(1 - (j / (mw / 2.2 + 0.5)) ** 2));
      for (let i = -half; i <= half; i++) px.set(mx + i, top - j, j === 0 ? '#2e1f2c' : i < -half / 2 ? '#6b3a5c' : '#55304c');
    }
    for (let k = 0; k < 5; k++) px.set(mx - mw / 2 + Math.floor(r() * mw), top - 1 - Math.floor(r() * (mw / 3)), '#8a5a7a');
  }
  px.rect(0, gy - 1, w, 1, '#181425');
  // floor: earthy with a mossy lip
  for (let y = gy; y < h; y++) for (let x = 0; x < w; x++) px.set(x, y, (x * 7 + y * 13) % 11 === 0 ? '#3e2731' : '#2e2230');
  for (let x = 0; x < w; x++) {
    const m = 1 + ((x * 5) % 7 === 0 ? 1 : 0) + (Math.sin(x * 0.3) > 0.6 ? 1 : 0);
    for (let j = 0; j < m; j++) px.set(x, gy + j, j === 0 ? '#3e8948' : '#265c42');
  }
  for (let k = 0; k < 60; k++) px.set(Math.floor(r() * w), gy + 4 + Math.floor(r() * (h - gy - 4)), r() < 0.5 ? '#4f3540' : '#1d3438');
  for (let k = 0; k < 9; k++) {
    const x = Math.floor(r() * w), y = gy + 6 + Math.floor(r() * Math.max(1, h - gy - 8));
    for (let i = -3; i <= 3; i++) if (r() < 0.8) px.set(x + i, y, '#265c42');
    for (let i = -2; i <= 2; i++) if (r() < 0.6) px.set(x + i, y - 1, '#3e8948');
    if (r() < 0.5) { px.set(x, y - 1, '#ead4aa'); px.set(x, y - 2, r() < 0.5 ? '#2ce8f5' : '#b55088'); }
  }
  // glowing mushroom clusters
  const lights: Light[] = [];
  const glows: Glow[] = [];
  const clusters: [number, number, boolean][] = [[10, gy, true], [w - 14, gy, false], [w / 2 - 4, gy - 30, true], [58, gy - 50, false], [w - 46, gy - 44, true]];
  for (const [cx, cy, cyan] of clusters) {
    const cap = cyan ? '#2ce8f5' : '#b55088', hi = cyan ? '#ffffff' : '#f6757a', under = cyan ? '#0099db' : '#68386c';
    if (cy < gy) {
      // bracket fungi growing out of a crack in the wall
      px.line(cx - 1, cy - 12, cx + 1, cy + 4, '#181425');
      [[0, 0, 7], [1, -5, 5], [-1, -9, 4]].forEach(([dx, dy, sw]) => {
        const x0 = cx + dx!, y0 = cy + dy!;
        px.rect(x0, y0, sw! - 2, 1, hi);
        px.rect(x0, y0 + 1, sw!, 1, cap);
        px.rect(x0, y0 + 2, sw! - 1, 1, under);
        px.set(x0 + sw! - 1, y0 + 1, under);
      });
      lights.push({ x: cx + 3, y: cy - 3, r: 24, color: cap, i: 0.5 });
      glows.push({ x: cx + 3, y: cy - 3, r: 12, color: cap, base: 0.1, amp: 0.06, speed: 1.6 + (cx % 5) * 0.2 });
      continue;
    }
    mushroom(px, cx, cy, cy === gy ? 5 : 3, cap, hi, under);
    mushroom(px, cx + 5, cy, 2, cap, hi, under);
    mushroom(px, cx - 4, cy, 2, cap, hi, under);
    lights.push({ x: cx, y: cy - 5, r: cy === gy ? 34 : 24, color: cap, i: 0.55 });
    glows.push({ x: cx, y: cy - 5, r: 14, color: cap, base: 0.12, amp: 0.06, speed: 1.6 + (cx % 5) * 0.2 });
  }
  return {
    lights, ambTop: 0.5, ambFloor: 0.7, torches: [], glows,
    particles: [{ n: 26, colors: ['#63c74d', '#2ce8f5', '#feae34'], vx: 1, vy: -4, sway: 5, duty: 0.75 }],
  };
}

function frost(px: Pix, w: number, h: number, gy: number, r: () => number): Scene {
  cells(px, 0, 0, w, gy, Math.round((w * gy) / 170), r, ['#124e89', '#15467c', '#173f6e', '#1a4a80'], '#0d2a48', '#2a6aa5', 0.45);
  // diagonal reflections on the ice
  for (let k = 0; k < Math.round((w * gy) / 500); k++) {
    const x = Math.floor(r() * w), y = Math.floor(r() * gy), len = 3 + Math.floor(r() * 6);
    px.line(x, y, x + len, y - len, '#2f7cc0');
    if (len > 5) px.line(x + 2, y, x + 2 + Math.floor(len / 2), y - Math.floor(len / 2), '#2f7cc0');
  }
  // big background stalactites
  for (let k = 0; k < 5; k++) {
    const x = Math.floor(((k + 0.5) / 5) * w + (r() - 0.5) * 20), bw = 6 + Math.floor(r() * 6);
    const len = 18 + Math.floor(r() * gy * 0.3);
    px.spike(x - bw / 2, x + bw / 2, 0, x, len, '#1d5c9a', '#2f7cc0');
  }
  // icicles along the top edge
  for (let x = 0; x < w;) {
    const bw = 2 + Math.floor(r() * 3);
    const len = 4 + Math.floor(r() * (r() < 0.2 ? 20 : 10));
    px.spike(x, x + bw - 1, 0, x + Math.floor(bw / 2), len, r() < 0.3 ? '#2ce8f5' : '#c0cbdc', '#ffffff');
    x += bw + Math.floor(r() * 4);
  }
  // snow drift along the wall base
  for (let x = 0; x < w; x++) {
    const m = 2 + Math.round(1.5 + Math.sin(x * 0.11) * 1.5 + Math.sin(x * 0.37));
    for (let j = 0; j < m; j++) px.set(x, gy - 1 - j, j === m - 1 ? '#c0cbdc' : '#8b9bb4');
  }
  // floor: packed snow and ice
  for (let y = gy; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = Math.sin(x * 0.05 + y * 0.21) + Math.sin(x * 0.13 - y * 0.17) * 0.8;
      px.set(x, y, n > 1.1 ? '#56658a' : n < -0.9 ? '#404a6c' : '#4a5677');
    }
  }
  for (let k = 0; k < 30; k++) px.set(Math.floor(r() * w), gy + 2 + Math.floor(r() * (h - gy - 2)), '#c0cbdc');
  // ice crystals at the sides
  const crystal = (x: number, y: number, s: number): void => {
    px.spike(x - 1, x + 1, y, x, y - s, '#0099db', '#2ce8f5');
    px.spike(x + 2, x + 3, y, x + 4, y - Math.round(s * 0.6), '#124e89', '#0099db');
    px.spike(x - 3, x - 2, y, x - 4, y - Math.round(s * 0.5), '#0099db', '#2ce8f5');
  };
  crystal(8, gy + 3, 16);
  crystal(w - 9, gy + 2, 20);
  return {
    lights: [
      { x: w / 2, y: -20, r: 120, color: '#2ce8f5', i: 0.22 },
      { x: 8, y: gy - 6, r: 26, color: '#2ce8f5', i: 0.45 },
      { x: w - 9, y: gy - 8, r: 28, color: '#2ce8f5', i: 0.45 },
    ],
    ambTop: 0.55, ambFloor: 0.75, torches: [],
    glows: [{ x: w / 2, y: 0, r: 60, color: '#2ce8f5', base: 0.05, amp: 0.02, speed: 0.7 }],
    particles: [
      { n: 34, colors: ['#ffffff', '#c0cbdc'], vx: -4, vy: 11, sway: 4, duty: 1, big: 0.25 },
    ],
  };
}

export const PAINTERS: Record<RegionId, Painter> = { crypt, fungal, frost, ember: emberPainter, abyss: abyssPainter };
