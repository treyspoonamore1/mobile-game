import { hexToRgba, depthShift } from './palette.ts';

// Pixel buffer + helpers used to paint the static backdrop layers once per (region, depth, size).

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Light {
  x: number;
  y: number;
  r: number;
  color: string;
  i: number;
}

export class Pix {
  readonly buf: Float32Array; // rgb per pixel
  constructor(readonly w: number, readonly h: number) {
    this.buf = new Float32Array(w * h * 3);
  }
  set(x: number, y: number, hex: string): void {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const c = hexToRgba(hex);
    const i = (y * this.w + x) * 3;
    this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2];
  }
  /** Blend toward a colour by t (0..1). */
  tint(x: number, y: number, hex: string, t: number): void {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const c = hexToRgba(hex);
    const i = (y * this.w + x) * 3;
    for (let k = 0; k < 3; k++) this.buf[i + k] = this.buf[i + k]! + (c[k]! - this.buf[i + k]!) * t;
  }
  rect(x: number, y: number, w: number, h: number, hex: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, hex);
  }
  /** Draw a sprite-like grid of palette chars at (x, y). */
  grid(x: number, y: number, rows: readonly string[], pal: Record<string, string>): void {
    rows.forEach((r, j) => {
      for (let i = 0; i < r.length; i++) {
        const hex = pal[r[i]!];
        if (hex) this.set(x + i, y + j, hex);
      }
    });
  }
  line(x0: number, y0: number, x1: number, y1: number, hex: string): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) this.set(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), hex);
  }
  /** Filled triangle-ish spike from a base (x0..x1 at y) to a tip (tx, ty). */
  spike(x0: number, x1: number, y: number, tx: number, ty: number, fill: string, edge?: string): void {
    const n = Math.abs(ty - y);
    const dir = ty < y ? -1 : 1;
    for (let k = 0; k <= n; k++) {
      const t = k / Math.max(n, 1);
      const a = Math.round(x0 + (tx - x0) * t), b = Math.round(x1 + (tx - x1) * t);
      for (let x = a; x <= b; x++) this.set(x, y + k * dir, x === a && edge ? edge : fill);
    }
  }
  /** Copy into ImageData, applying depth recolour. */
  toImage(ctx: CanvasRenderingContext2D, depth: number): ImageData {
    const img = ctx.createImageData(this.w, this.h);
    const d = img.data;
    for (let p = 0, q = 0; p < this.w * this.h; p++, q += 3) {
      let r = this.buf[q]!, g = this.buf[q + 1]!, b = this.buf[q + 2]!;
      if (depth > 0) [r, g, b] = depthShift(r, g, b, depth);
      d[p * 4] = r; d[p * 4 + 1] = g; d[p * 4 + 2] = b; d[p * 4 + 3] = 255;
    }
    return img;
  }
}

/** Voronoi rock / ice: cells of palette colours, dark seams, light top-left edges. */
export function cells(px: Pix, x0: number, y0: number, x1: number, y1: number, n: number, r: () => number,
  cols: readonly string[], seam: string, hi: string, squash = 1): void {
  const seeds: [number, number, string][] = [];
  for (let k = 0; k < n; k++) seeds.push([x0 + r() * (x1 - x0), y0 + r() * (y1 - y0), cols[Math.floor(r() * cols.length)]!]);
  const owner = new Int32Array((x1 - x0) * (y1 - y0));
  const W = x1 - x0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      let best = 1e9, second = 1e9, bi = 0;
      for (let k = 0; k < n; k++) {
        const dx = x - seeds[k]![0], dy = (y - seeds[k]![1]) * squash;
        const d = dx * dx + dy * dy;
        if (d < best) { second = best; best = d; bi = k; } else if (d < second) second = d;
      }
      owner[(y - y0) * W + (x - x0)] = bi;
      const edge = Math.sqrt(second) - Math.sqrt(best);
      px.set(x, y, edge < 1.1 ? seam : seeds[bi]![2]);
    }
  }
  // light edge just inside the top-left of each cell
  for (let y = y0 + 1; y < y1; y++) {
    for (let x = x0 + 1; x < x1; x++) {
      const o = owner[(y - y0) * W + (x - x0)]!;
      const up = owner[(y - 1 - y0) * W + (x - x0)]!, left = owner[(y - y0) * W + (x - 1 - x0)]!;
      const upup = y - 2 >= y0 ? owner[(y - 2 - y0) * W + (x - x0)]! : o;
      if ((up !== o || left !== o) && upup !== o && up !== o) px.set(x, y, hi);
      else if (up !== o && left === o && upup !== o) px.set(x, y, hi);
    }
  }
}

/** Brick courses aligned to a bottom line so the base looks identical at any height. */
export function bricks(px: Pix, x0: number, x1: number, top: number, bottom: number, bw: number, bh: number,
  r: () => number, cols: readonly string[], mortar: string, hi: string, lo: string): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  let row = 0;
  for (let y = bottom - bh; y > top - bh; y -= bh, row++) {
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    for (let x = x0 - off; x < x1; x += bw) {
      const c = cols[Math.floor(r() * cols.length)]!;
      px.rect(x, y, bw, bh, mortar);
      px.rect(x + 1, y + 1, bw - 1, bh - 1, c);
      for (let i = 1; i < bw; i++) px.set(x + i, y + 1, hi);
      px.set(x + 1, y + 2, hi);
      for (let i = 2; i < bw; i++) px.set(x + i, y + bh - 1, lo);
      if (r() < 0.25) px.set(x + 2 + Math.floor(r() * (bw - 4)), y + 2 + Math.floor(r() * (bh - 3)), lo);
      out.push({ x, y, w: bw, h: bh });
    }
  }
  return out;
}

/** Floor flagstones: courses that grow taller toward the viewer. */
export function flags(px: Pix, w: number, gy: number, h: number, r: () => number, cols: readonly string[],
  seam: string, hi: string): void {
  px.rect(0, gy, w, h - gy, seam);
  let y = gy, bh = 4, row = 0;
  while (y < h) {
    const bw = 14 + bh * 2;
    const off = Math.floor(r() * bw);
    for (let x = -off; x < w; x += bw + Math.floor(r() * 6) - 2) {
      const c = cols[Math.floor(r() * cols.length)]!;
      px.rect(x, y, bw, bh, seam);
      px.rect(x + 1, y + 1, bw - 1, bh - 1, c);
      for (let i = 1; i < bw; i++) px.set(x + i, y + 1, hi);
    }
    y += bh;
    bh = Math.min(12, bh + 2);
    row++;
  }
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * Pixel-art lighting: ambient darkening toward the top and edges plus point lights,
 * quantised with a 4x4 Bayer dither so it stays crisp.
 */
export function light(px: Pix, gy: number, lights: readonly Light[], ambTop: number, ambFloor: number): void {
  const { w, h, buf } = px;
  const lc = lights.map((l) => ({ ...l, c: hexToRgba(l.color) }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let a: number;
      if (y < gy) {
        const t = Math.min(1, y / (gy * 0.85));
        a = ambTop + (1 - ambTop) * t * t * (3 - 2 * t) * 0.9;
      } else {
        a = 0.95 - (1 - ambFloor) * ((y - gy) / Math.max(1, h - gy));
      }
      const vx = (x - w / 2) / (w / 2);
      a *= 1 - 0.22 * vx * vx;
      let lr = 0, lg = 0, lb = 0, li = 0;
      for (const l of lc) {
        const dx = x - l.x, dy = (y - l.y) * 1.15;
        const d = Math.sqrt(dx * dx + dy * dy) / l.r;
        if (d >= 1) continue;
        const f = (1 - d) * (1 - d) * l.i;
        li += f; lr += l.c[0] * f; lg += l.c[1] * f; lb += l.c[2] * f;
      }
      const thr = (BAYER[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;
      const step = 0.1;
      const q = (v: number): number => Math.floor(v / step + thr) * step;
      const m = q(a + li * 0.6);
      const k = (y * w + x) * 3;
      const tintAmt = li > 0 ? q(Math.min(0.5, li * 0.35)) : 0;
      const tr = li > 0 ? lr / li : 0, tg = li > 0 ? lg / li : 0, tb = li > 0 ? lb / li : 0;
      buf[k] = buf[k]! * m * (1 - tintAmt) + (buf[k]! * m + tr * 0.5) * tintAmt;
      buf[k + 1] = buf[k + 1]! * m * (1 - tintAmt) + (buf[k + 1]! * m + tg * 0.5) * tintAmt;
      buf[k + 2] = buf[k + 2]! * m * (1 - tintAmt) + (buf[k + 2]! * m + tb * 0.5) * tintAmt;
    }
  }
}
