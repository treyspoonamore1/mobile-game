import { Pix, bricks, flags, type Light } from './bgkit.ts';
import type { Scene, Glow } from './bgregions.ts';

// Ember Forge and The Abyss backdrop painters.

function chain(px: Pix, x: number, len: number): void {
  for (let y = 0; y < len; y += 3) {
    if ((y / 3) % 2 === 0) px.grid(x - 1, y, ['.g.', 'g.g', '.g.'], { g: '#5a6988' });
    else px.grid(x, y, ['n', 'n', 'n'], { n: '#3a4466' });
  }
  px.grid(x - 1, len, ['.g.', 'g..', 'gg.'], { g: '#5a6988' });
}

export function ember(px: Pix, w: number, h: number, gy: number, r: () => number): Scene {
  const ax = Math.round(w / 2);
  const bs = bricks(px, 0, w, 0, gy, 16, 8, r, ['#3e2731', '#45283a', '#3a2230'], '#181425', '#5a3440', '#2a1a24');
  // bricks near the furnace glow hot
  for (const b of bs) {
    const d = Math.hypot(b.x + b.w / 2 - ax, b.y + b.h / 2 - (gy - 18));
    if (d < 34 && r() < 0.7) for (let j = 1; j < b.h; j++) for (let i = 1; i < b.w; i++) px.tint(b.x + i, b.y + j, '#be4a2f', 0.35 * (1 - d / 34));
  }
  // furnace mouth
  const half = 13, top = gy - 32;
  for (let y = top - 3; y < gy; y++) {
    for (let x = ax - half - 3; x <= ax + half + 3; x++) {
      const cy = top + half;
      const d = y < cy ? Math.hypot(x - ax, y - cy) : Math.abs(x - ax);
      if (d <= half) {
        const t = Math.min(1, (gy - y) / (gy - top));
        const c = t < 0.25 ? '#fee761' : t < 0.5 ? '#feae34' : t < 0.75 ? '#f77622' : '#be4a2f';
        px.set(x, y, (x - ax) % 5 === 0 ? '#262b44' : c);
      } else if (d <= half + 3) px.set(x, y, d <= half + 1 ? '#5a6988' : '#3a4466');
    }
  }
  px.rect(ax - half - 4, gy - 4, half * 2 + 9, 4, '#3a4466');
  px.rect(ax - half - 4, gy - 4, half * 2 + 9, 1, '#5a6988');
  // hanging chains
  [14, 52, 128, 166].forEach((x) => { if (x < w) chain(px, x, 14 + Math.floor(r() * 30)); });
  px.rect(0, gy - 1, w, 1, '#181425');
  flags(px, w, gy, h, r, ['#2b2230', '#262b44', '#30232f'], '#181425', '#3e2731');
  // lava cracks
  const lights: Light[] = [{ x: ax, y: gy - 14, r: 80, color: '#f77622', i: 0.9 }];
  for (let k = 0; k < 5; k++) {
    let x = Math.floor(r() * w), y = gy + 3 + Math.floor(r() * Math.max(1, h - gy - 6));
    const len = 10 + Math.floor(r() * 18);
    for (let i = 0; i < len; i++) {
      px.set(x, y, i % 4 === 0 ? '#feae34' : '#f77622');
      px.set(x, y + 1, '#be4a2f');
      x += 1;
      if (r() < 0.35) y += r() < 0.5 ? -1 : 1;
      y = Math.max(gy + 2, Math.min(h - 2, y));
    }
    lights.push({ x: x - len / 2, y, r: 22, color: '#f77622', i: 0.4 });
  }
  const glows: Glow[] = [{ x: ax, y: gy - 14, r: 40, color: '#f77622', base: 0.14, amp: 0.06, speed: 3 }];
  return {
    lights, ambTop: 0.4, ambFloor: 0.7, torches: [], glows,
    particles: [{ n: 30, colors: ['#feae34', '#f77622', '#fee761'], vx: 2, vy: -13, sway: 3, duty: 0.8 }],
  };
}

function crystalCluster(px: Pix, x: number, y: number, s: number, flip: number): void {
  const shards: [number, number, number, number][] = [
    [-5 * flip, Math.round(s * 0.55), -4 * flip, 2], [5 * flip, Math.round(s * 0.65), 3 * flip, 2],
    [0, s, 0, 3], [9 * flip, Math.round(s * 0.3), 4 * flip, 2],
  ];
  for (const [dx, hgt, lean, bw] of shards) {
    const cx = x + dx, tx = cx + lean, ty = y - hgt;
    px.spike(cx - bw, cx + bw, y, tx, ty, '#4f2f86');
    px.spike(cx - bw, cx, y, tx, ty, '#8a5ad0', '#c8a8f0');
    px.line(cx, y, tx, ty, '#b55088');
    px.set(tx, ty, '#ffffff');
  }
}

function island(px: Pix, x0: number, y0: number, iw: number, r: () => number): void {
  px.rect(x0, y0, iw, 1, '#4a4068');
  px.rect(x0, y0 + 1, iw, 2, '#2e2848');
  const depthPx = Math.round(iw * 0.5);
  for (let i = 0; i < iw; i++) {
    const t = Math.abs(i - iw * 0.45) / (iw * 0.55);
    const d = Math.max(1, Math.round(depthPx * (1 - t * t) + (r() - 0.5) * 3));
    for (let j = 0; j < d; j++) px.set(x0 + i, y0 + 3 + j, j > d - 2 ? '#1a1628' : i < iw * 0.4 ? '#2a2440' : '#221d36');
  }
  const cx = x0 + Math.round(iw * 0.6);
  px.spike(cx - 1, cx + 1, y0 - 1, cx, y0 - 5, '#8a5ad0', '#c8a8f0');
}

export function abyss(px: Pix, w: number, h: number, gy: number, r: () => number): Scene {
  // void gradient with dithered bands
  const bands = ['#0d0b14', '#120f1c', '#181425', '#1e1a30', '#232038'];
  for (let y = 0; y < gy; y++) {
    const t = (y / gy) * (bands.length - 1);
    for (let x = 0; x < w; x++) {
      const bayer = ((x & 1) ^ (y & 1)) * 0.5 + 0.25;
      px.set(x, y, bands[Math.min(bands.length - 1, Math.floor(t + bayer))]!);
    }
  }
  for (let k = 0; k < 70; k++) {
    const c = r() < 0.15 ? '#c8a8f0' : r() < 0.5 ? '#5a6988' : '#3a4466';
    px.set(Math.floor(r() * w), Math.floor(r() * gy * 0.8), c);
  }
  // distant floating islands
  for (const [ix, iy, iw] of [[30, gy * 0.32, 22], [w - 50, gy * 0.22, 30], [w / 2 + 6, gy * 0.5, 14]] as const) {
    island(px, Math.round(ix), Math.round(iy), iw, r);
  }
  // floor
  px.rect(0, gy - 1, w, 1, '#0d0b14');
  flags(px, w, gy, h, r, ['#1e1a30', '#232038', '#262b44'], '#0d0b14', '#3a3456');
  for (let k = 0; k < 4; k++) {
    let x = Math.floor(r() * w), y = gy + 4 + Math.floor(r() * Math.max(1, h - gy - 8));
    for (let i = 0; i < 14; i++) { px.set(x, y, '#68386c'); x++; if (r() < 0.4) y += r() < 0.5 ? -1 : 1; }
  }
  crystalCluster(px, 9, gy + 4, 30, 1);
  crystalCluster(px, w - 10, gy + 3, 38, -1);
  crystalCluster(px, Math.round(w / 2), gy - 1, 10, 1);
  return {
    lights: [
      { x: 9, y: gy - 12, r: 40, color: '#b55088', i: 0.55 },
      { x: w - 10, y: gy - 16, r: 44, color: '#8a5ad0', i: 0.6 },
      { x: w / 2, y: gy - 4, r: 22, color: '#b55088', i: 0.4 },
    ],
    ambTop: 0.75, ambFloor: 0.7, torches: [],
    glows: [
      { x: 9, y: gy - 14, r: 20, color: '#b55088', base: 0.1, amp: 0.06, speed: 1.1 },
      { x: w - 10, y: gy - 18, r: 24, color: '#8a5ad0', base: 0.1, amp: 0.06, speed: 0.9 },
    ],
    particles: [
      { n: 22, colors: ['#c8a8f0', '#8a5ad0', '#b55088'], vx: 1.5, vy: -3, sway: 6, duty: 0.7 },
      { n: 12, colors: ['#ffffff', '#c8a8f0'], vx: 0, vy: 0, sway: 0, duty: 0.35, y0: 0, y1: 0.55 },
    ],
  };
}
