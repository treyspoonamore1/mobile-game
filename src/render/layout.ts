/** Screen layout in CSS px. The canvas covers the area between the top bar and the nav. */
export interface Layout {
  dpr: number;
  w: number;
  h: number;
  /** Art pixel scale in device px, and the art canvas size. */
  scale: number;
  artW: number;
  artH: number;
  sceneH: number;
  frames: { x: number; y: number; w: number; h: number }[];
  mana: { x: number; y: number; w: number; h: number };
  sanctuary: { x: number; y: number; w: number; h: number };
}

const PAD = 10;
const GAP = 6;
const ART_MIN_W = 180;

export function computeLayout(cssW: number, cssH: number, dpr: number): Layout {
  const frameH = Math.round(Math.max(54, Math.min(72, cssH * 0.085)));
  const manaH = Math.round(Math.max(44, Math.min(54, cssH * 0.062)));
  const bottomH = PAD + 4 * frameH + 3 * GAP + GAP + manaH + PAD;
  const sceneH = Math.max(120, cssH - bottomH);
  const devW = cssW * dpr;
  const scale = Math.max(2, Math.floor(devW / ART_MIN_W));
  const artW = Math.ceil(devW / scale);
  const artH = Math.ceil((sceneH * dpr) / scale);
  const frames = [0, 1, 2, 3].map((i) => ({
    x: PAD, y: sceneH + PAD + i * (frameH + GAP), w: cssW - 2 * PAD, h: frameH,
  }));
  const manaY = sceneH + PAD + 4 * frameH + 4 * GAP;
  const sancW = Math.round(Math.max(110, cssW * 0.32));
  return {
    dpr, w: cssW, h: cssH, scale, artW, artH, sceneH, frames,
    mana: { x: PAD, y: manaY, w: cssW - 3 * PAD - sancW, h: manaH },
    sanctuary: { x: cssW - PAD - sancW, y: manaY, w: sancW, h: manaH },
  };
}

export function inRect(r: { x: number; y: number; w: number; h: number }, x: number, y: number): boolean {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

/** The frame under a point, with a little vertical slop between frames. */
export function frameAt(L: Layout, x: number, y: number): number | null {
  for (let i = 0; i < L.frames.length; i++) {
    const f = L.frames[i]!;
    if (x >= f.x - 4 && x < f.x + f.w + 4 && y >= f.y - GAP / 2 && y < f.y + f.h + GAP / 2) return i;
  }
  return null;
}
