/**
 * Shared sprite palette. Mostly Endesga-32, plus a short violet ramp for magic.
 * One character per colour; sprites may override or extend it locally.
 * '.' is always transparent. Light comes from the top-left.
 */
export const PAL: Record<string, string> = {
  // outline + neutrals
  k: '#181425', // outline / darkest
  K: '#262b44', // deep navy
  n: '#3a4466', // navy grey
  G: '#5a6988', // dark grey
  g: '#8b9bb4', // grey
  l: '#c0cbdc', // light grey / steel
  w: '#ffffff',
  // skin + warm neutrals
  s: '#e8b796', // skin
  S: '#c28569', // skin shade
  p: '#ead4aa', // pale / bone / parchment
  P: '#e4a672', // tan
  b: '#b86f50', // brown
  B: '#733e39', // dark brown
  d: '#3e2731', // darkest brown
  // reds + oranges + yellows
  x: '#ff0044', // hot red
  r: '#e43b44', // red
  R: '#a22633', // dark red
  q: '#be4a2f', // rust
  O: '#d77643', // burnt orange
  o: '#f77622', // orange
  y: '#feae34', // gold
  Y: '#fee761', // yellow
  v: '#f6757a', // pink
  // greens
  e: '#63c74d', // green
  E: '#3e8948', // dark green
  f: '#265c42', // forest
  F: '#193c3e', // deep teal
  // blues
  c: '#2ce8f5', // cyan
  u: '#0099db', // blue
  U: '#124e89', // dark blue
  // purples
  m: '#b55088', // magenta
  M: '#68386c', // plum
  j: '#c8a8f0', // lavender
  V: '#8a5ad0', // violet
  N: '#4f2f86', // deep violet
};

export const OUTLINE = '#181425';

export type RGBA = [number, number, number, number];

const rgbCache = new Map<string, RGBA>();

export function hexToRgba(hex: string): RGBA {
  let c = rgbCache.get(hex);
  if (!c) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((ch) => ch + ch).join('') : h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255;
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
    rgbCache.set(hex, c);
  }
  return c;
}

export function rgbToHex(r: number, g: number, b: number): string {
  const v = (Math.max(0, Math.min(255, Math.round(r))) << 16)
    | (Math.max(0, Math.min(255, Math.round(g))) << 8)
    | Math.max(0, Math.min(255, Math.round(b)));
  return '#' + v.toString(16).padStart(6, '0');
}

/**
 * Depth recolour: deeper cycles are darker, more saturated and hue-shifted.
 * Near-black pixels (outlines) are left alone so silhouettes stay crisp.
 */
export function depthShift(r: number, g: number, b: number, depth: number): [number, number, number] {
  if (depth <= 0) return [r, g, b];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max < 40) return [r, g, b];
  let [h, s, l] = rgbToHsl(r, g, b);
  const k = Math.min(depth, 4);
  // Alternate hue direction per cycle so each depth reads differently.
  const shifts = [0, -28, 40, 110, -80];
  h = (h + shifts[((depth - 1) % 4) + 1]! / 360 + 1) % 1;
  s = Math.min(1, s * (1 + 0.05 * k));
  l = l * (1 - 0.08 * k);
  if (max - min < 12) s = Math.min(s, 0.25); // keep greys greyish
  return hslToRgb(h, s, l);
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** Recolour a hex string for a depth (used by backdrop details). */
export function depthHex(hex: string, depth: number): string {
  if (depth <= 0) return hex;
  const [r, g, b] = hexToRgba(hex);
  const [r2, g2, b2] = depthShift(r, g, b, depth);
  return rgbToHex(r2, g2, b2);
}
