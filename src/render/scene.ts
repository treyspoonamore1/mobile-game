import { depthOf, regionOf } from '../sim/data/regions.ts';
import { incomingOn, type FightState } from '../sim/state.ts';
import { drawBackground, getFrames, GROUND_Y_FRAC, spriteSize, type Anim } from './art/index.ts';
import type { Fx } from './fx.ts';
import type { Layout } from './layout.ts';

const HERO_SLOTS = [
  { fx: 0.47, dy: 1 }, // Tomas
  { fx: 0.38, dy: 7 }, // Brann
  { fx: 0.21, dy: 4 }, // Ilse
  { fx: 0.3, dy: -5 }, // Wren
];
const ENEMY_SLOTS = [
  { fx: 0.64, dy: 3 }, { fx: 0.74, dy: -5 }, { fx: 0.84, dy: 6 }, { fx: 0.93, dy: -2 },
];

export interface SceneState {
  /** Real time of the current floor's start, for the enemies' entrance. */
  floorStartAt: number;
  now: number;
}

export function groundY(L: Layout): number {
  return Math.round(L.artH * GROUND_Y_FRAC);
}

export function heroPos(L: Layout, i: number): { x: number; y: number } {
  const s = HERO_SLOTS[i]!;
  return { x: Math.round(L.artW * s.fx), y: groundY(L) + s.dy };
}

export function enemyPos(L: Layout, s: FightState, i: number): { x: number; y: number } {
  const e = s.enemies[i];
  if (e?.def.boss) return { x: Math.round(L.artW * 0.76), y: groundY(L) + 4 };
  const hasBoss = s.enemies.some((x) => x.def.boss);
  const slot = ENEMY_SLOTS[hasBoss ? 3 : i] ?? ENEMY_SLOTS[3]!;
  return { x: Math.round(L.artW * slot.fx), y: groundY(L) + slot.dy };
}

export function healerPos(L: Layout): { x: number; y: number } {
  return { x: Math.round(L.artW * 0.11), y: groundY(L) + 2 };
}

const silhouettes = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
function silhouette(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = silhouettes.get(src);
  if (!c) {
    c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext('2d')!;
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
    silhouettes.set(src, c);
  }
  return c;
}

function flashOver(g: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, alpha = 1): void {
  const a = g.globalAlpha;
  g.globalAlpha = a * alpha;
  g.drawImage(silhouette(img), x, y);
  g.globalAlpha = a;
}

/** Draw a sprite anchored at its feet (bottom centre). */
export function drawSprite(
  g: CanvasRenderingContext2D, id: string, anim: Anim, frame: number, x: number, y: number,
  opts: { depth?: number; flash?: boolean; flashAlpha?: number; alpha?: number; flip?: boolean } = {},
): void {
  const frames = getFrames(id, anim, opts.depth ?? 0);
  if (frames.length === 0) return;
  const img = frames[((frame % frames.length) + frames.length) % frames.length]!;
  const dx = Math.round(x - img.width / 2);
  const dy = Math.round(y - img.height);
  g.save();
  if (opts.alpha !== undefined) g.globalAlpha = opts.alpha;
  if (opts.flip) {
    g.translate(dx + img.width, dy);
    g.scale(-1, 1);
    g.drawImage(img, 0, 0);
    if (opts.flash) flashOver(g, img, 0, 0, opts.flashAlpha);
  } else {
    g.drawImage(img, dx, dy);
    if (opts.flash) flashOver(g, img, dx, dy, opts.flashAlpha);
  }
  g.restore();
}

function px(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}

/** A pixel ellipse outline (shield bubble). */
function bubble(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string, alpha: number): void {
  g.save();
  g.globalAlpha = alpha * 0.22;
  g.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
    g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
  }
  g.globalAlpha = alpha;
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
    g.fillRect(Math.round(cx - w), Math.round(cy + y), 1, 1);
    g.fillRect(Math.round(cx + w - 1), Math.round(cy + y), 1, 1);
  }
  g.fillRect(Math.round(cx - rx * 0.5), Math.round(cy - ry), Math.round(rx), 1);
  g.fillRect(Math.round(cx - rx * 0.5), Math.round(cy + ry), Math.round(rx), 1);
  g.globalAlpha = alpha * 0.9;
  g.fillStyle = '#ffffff';
  g.fillRect(Math.round(cx - rx * 0.5), Math.round(cy - ry * 0.6), 2, 1);
  g.restore();
}

export function drawScene(g: CanvasRenderingContext2D, L: Layout, s: FightState, fx: Fx, sc: SceneState): void {
  const now = sc.now;
  const region = regionOf(s.floor);
  const depth = depthOf(s.floor);
  drawBackground(g, region.id, depth, L.artW, L.artH, now);
  const walking = s.phase === 'walk';

  // Acolytes and the healer behind the party.
  const hp = healerPos(L);
  // Acolytes stand in a row behind the party, a second row in front if there are many.
  s.acolytes.forEach((a, i) => {
    const back = i < 4;
    const ax = 5 + (back ? i : i - 4) * 8 + (back ? 0 : 4);
    const ay = groundY(L) + (back ? -12 : 12);
    const casting = s.t - a.castAt < 0.25;
    drawSprite(g, 'acolyte', casting ? 'cast' : 'idle', Math.floor(now * 2 + i * 0.5), ax, ay);
    if (casting) px(g, ax - 1, ay - 14, 2, 2, '#fff2a8');
  });
  const lastCast = Math.max(...s.heroes.map((h) => h.healAt));
  const healerCasting = s.t - lastCast < 0.25;
  drawSprite(g, `healer_${s.loadout.order}`, healerCasting ? 'cast' : 'idle', Math.floor(now * (walking ? 6 : 2)), hp.x, hp.y + (walking ? Math.round(Math.abs(Math.sin(now * 10))) * -1 : 0));
  if (healerCasting) {
    // A flare at the staff tip (or above the lute) while casting.
    const k = 1 - (s.t - lastCast) / 0.25;
    const tx = hp.x - 8 + (s.loadout.order === 'bard' ? 10 : 12);
    const ty = hp.y - 16 + (s.loadout.order === 'bard' ? 3 : 1);
    const c = s.loadout.order === 'chrono' ? '#9ff0ff' : s.loadout.order === 'bard' ? '#ffc2f0' : '#fff2a8';
    g.save();
    g.globalAlpha = k;
    px(g, tx - 1, ty - 3, 2, 7, c);
    px(g, tx - 3, ty - 1, 6, 2, c);
    g.globalAlpha = k * 0.35;
    px(g, tx - 3, ty - 3, 6, 6, c);
    g.restore();
  }

  // Draw back to front by y.
  const order = s.heroes.map((_, i) => i).sort((a, b) => heroPos(L, a).y - heroPos(L, b).y);
  for (const i of order) drawHero(g, L, s, i, now, walking);

  const enemies = s.enemies.map((_, i) => i).sort((a, b) => enemyPos(L, s, a).y - enemyPos(L, s, b).y);
  const enter = Math.max(0, 1 - (now - sc.floorStartAt) / 0.5);
  for (const i of enemies) drawEnemy(g, L, s, i, now, enter, depth);

  drawFx(g, fx, now);
}

function drawHero(g: CanvasRenderingContext2D, L: Layout, s: FightState, i: number, now: number, walking: boolean): void {
  const h = s.heroes[i]!;
  const p = heroPos(L, i);
  let x = p.x;
  let y = p.y;
  let anim: Anim = 'idle';
  let frame = Math.floor(now * (walking ? 6 : 2) + i * 0.37);
  const melee = h.id === 'tomas' || h.id === 'brann';
  if (!h.alive) {
    anim = 'down';
    frame = 0;
  } else if (s.t - h.hitAt < 0.15) {
    anim = 'hurt';
    x -= 1;
  } else if (s.t - h.attackAt < 0.2) {
    anim = 'attack';
    frame = s.t - h.attackAt < 0.08 ? 0 : 1;
    if (melee && frame === 1) x += 4;
  } else if (walking) {
    y -= Math.round(Math.abs(Math.sin(now * 10 + i)));
  }
  // Shadow.
  g.save();
  g.globalAlpha = 0.35;
  px(g, p.x - 6, p.y - 1, 12, 2, '#000000');
  g.restore();
  drawSprite(g, h.id, anim, frame, x, y, { flash: s.t - h.hitAt < 0.06 && h.alive });
  if (h.alive && h.shield > 0) {
    const a = Math.min(1, h.shieldT / 0.8) * (0.75 + 0.25 * Math.sin(now * 6));
    bubble(g, x, y - 8, 11, 11, '#8fd3ff', a);
  }
  if (h.alive && h.plagueT > 0) {
    // Plague: a pulsing green skull over the head.
    const sy = y - 26 - Math.round(Math.sin(now * 6));
    const c = Math.floor(now * 6) % 2 ? '#8be04e' : '#c8ff9a';
    px(g, x - 3, sy, 6, 4, c);
    px(g, x - 2, sy + 4, 4, 2, c);
    px(g, x - 2, sy + 1, 1, 1, '#0b0d1a');
    px(g, x + 1, sy + 1, 1, 1, '#0b0d1a');
  }
  if (h.alive && h.frostT > 0) {
    // Frostbite: ice creeping up from the feet.
    for (let k = 0; k < 5; k++) {
      const fx = x - 7 + k * 3;
      const fh = 2 + ((k * 7 + Math.floor(now * 3)) % 4);
      px(g, fx, y - fh, 2, fh, k % 2 ? '#bfe8ff' : '#7fc8ff');
    }
  }
  if (h.alive && h.bloomT > 0) {
    // Lifebloom: green petals rising around the hero.
    for (let k = 0; k < 3; k++) {
      const t = (now * 0.8 + k / 3 + i * 0.13) % 1;
      px(g, x - 6 + ((k * 5 + i * 3) % 12), y - 2 - t * 18, 2, 2, t < 0.5 ? '#9cff7a' : '#d8ffc0');
    }
  }
  if (h.alive && h.poisonT > 0 && Math.floor(now * 3 + i) % 2 === 0) {
    px(g, x - 4 + ((now * 7 + i * 3) % 8), y - 16 - ((now * 9) % 6), 2, 2, '#8be04e');
  }
  // Telegraph marker above the target.
  const inc = h.alive ? incomingOn(s, i) : null;
  if (inc) {
    const perfect = inc.left <= s.loadout.perfectWindow;
    const blink = perfect || Math.floor(now * (inc.left < 0.8 ? 12 : 6)) % 2 === 0;
    if (blink) {
      const c = perfect ? '#ffe14a' : '#ff4a4a';
      const my = y - 24 - Math.round(Math.sin(now * 12));
      px(g, x - 1, my - 6, 3, 5, c);
      px(g, x - 1, my + 1, 3, 2, c);
      px(g, x - 2, my - 7, 5, 1, '#0b0d1a');
    }
  }
}

function drawEnemy(g: CanvasRenderingContext2D, L: Layout, s: FightState, i: number, now: number, enter: number, depth: number): void {
  const e = s.enemies[i]!;
  const p = enemyPos(L, s, i);
  const deadFor = e.alive ? 0 : s.t - e.diedAt;
  if (!e.alive && deadFor > 0.5) return;
  let x = p.x + Math.round(enter * enter * 60);
  const y = p.y;
  let anim: Anim = 'idle';
  const frame = Math.floor(now * 2 + i * 0.41);
  if (e.windup) {
    anim = 'windup';
    x += Math.round(Math.sin(now * 40));
  } else if (s.t - e.attackAt < 0.18) {
    anim = 'attack';
    x -= 4;
  }
  const size = spriteSize(e.def.id);
  g.save();
  g.globalAlpha = 0.35;
  px(g, p.x - size.w / 2 + 2, p.y - 1, size.w - 4, 2, '#000000');
  g.restore();
  if (e.windup) {
    // A pulsing red glow behind an enemy winding up.
    const k = e.windup.t / e.windup.total;
    g.save();
    g.globalAlpha = 0.25 + 0.35 * k;
    bubble(g, x, y - size.h / 2, size.w / 2 + 3 + Math.round(k * 2), size.h / 2 + 2, '#ff4a4a', 0.6);
    g.restore();
  }
  const blink = !e.alive && Math.floor(deadFor * 20) % 2 === 0;
  if (!blink) {
    drawSprite(g, e.def.id, anim, frame, x, y, {
      // Enemies are hit several times a second: a soft tint instead of a full white strobe.
      depth, flash: s.t - e.hitAt < 0.06 || !e.alive, flashAlpha: e.alive ? 0.45 : 1, alpha: e.alive ? 1 : 1 - deadFor / 0.5,
    });
  }
  if (e.alive && !e.def.boss) {
    const w = 14;
    const bx = x - w / 2;
    const by = y - size.h - 4;
    px(g, bx - 1, by - 1, w + 2, 4, '#0b0d1a');
    px(g, bx, by, w, 2, '#4a1f2a');
    px(g, bx, by, Math.max(1, Math.round((w * e.hp) / e.maxHp)), 2, '#ff5a5a');
  }
  if (e.windup) {
    const ey = y - size.h - 10 - Math.round(Math.abs(Math.sin(now * 8)) * 2);
    px(g, x - 1, ey, 3, 5, '#ffe14a');
    px(g, x - 1, ey + 6, 3, 2, '#ffe14a');
  }
  if (e.alive && e.stunT > 0) {
    // Riposte: little stars circling the head.
    const cy = y - size.h - 3;
    for (let k = 0; k < 3; k++) {
      const a = now * 6 + (k * Math.PI * 2) / 3;
      const sx = x + Math.cos(a) * 6;
      const sy = cy + Math.sin(a) * 2;
      px(g, sx - 1, sy, 3, 1, '#ffe14a');
      px(g, sx, sy - 1, 1, 3, '#ffe14a');
    }
  }
}

function drawFx(g: CanvasRenderingContext2D, fx: Fx, now: number): void {
  for (const sp of fx.sprites) {
    const frames = getFrames(sp.id, sp.anim);
    if (frames.length === 0) continue;
    const f = Math.min(frames.length - 1, Math.floor(sp.age / sp.frameTime));
    let x = sp.x;
    let y = sp.y;
    if (sp.tx !== undefined && sp.ty !== undefined) {
      const k = Math.min(1, sp.age / sp.life);
      x += (sp.tx - sp.x) * k;
      y += (sp.ty - sp.y) * k - Math.sin(k * Math.PI) * 6;
    }
    drawSprite(g, sp.id, sp.anim, sp.tx !== undefined ? Math.floor(now * 12) : f, x, y, { flip: sp.flip });
  }
  for (const p of fx.parts) {
    if (p.age < 0) continue;
    g.globalAlpha = Math.max(0, 1 - p.age / p.life);
    px(g, p.x, p.y, p.size, p.size, p.color);
  }
  g.globalAlpha = 1;
}
