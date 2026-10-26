import type { Anim } from './art/index.ts';

/** Visual-only effects. Positions are in art pixels; time in real seconds. */
export interface FloatText {
  text: string;
  x: number;
  y: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  color: string;
  outline: string;
  pop: boolean;
}

export interface SpriteFx {
  id: string;
  anim: Anim;
  x: number;
  y: number;
  age: number;
  frameTime: number;
  /** Optional travel from (x, y) to (tx, ty) over `life`. */
  tx?: number;
  ty?: number;
  life: number;
  flip?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  age: number;
  life: number;
  color: string;
  size: number;
  /** Home in on a point (coins flying to the gold counter). */
  homeX?: number;
  homeY?: number;
}

export class Fx {
  texts: FloatText[] = [];
  sprites: SpriteFx[] = [];
  parts: Particle[] = [];
  shake = 0;
  flash = 0;
  flashColor = '#ffffff';
  bannerText = '';
  bannerSub = '';
  bannerAge = 99;
  bannerLife = 0;
  bannerColor = '#ffffff';

  text(text: string, x: number, y: number, color: string, size = 1, pop = false, outline = '#0b0d1a'): void {
    // Keep stacked numbers from overlapping: nudge up if something fresh is right there.
    let yy = y;
    for (const t of this.texts) {
      if (t.age < 0.25 && Math.abs(t.x - x) < 10 && Math.abs(t.y - yy) < 6) yy -= 6;
    }
    this.texts.push({ text, x: x + (Math.random() - 0.5) * 4, y: yy, vy: -14, age: 0, life: pop ? 1.3 : 0.9, size, color, outline, pop });
    if (this.texts.length > 60) this.texts.shift();
  }

  sprite(id: string, anim: Anim, x: number, y: number, frameTime: number, frames: number, extra: Partial<SpriteFx> = {}): void {
    this.sprites.push({ id, anim, x, y, age: 0, frameTime, life: frameTime * frames, ...extra });
    if (this.sprites.length > 80) this.sprites.shift();
  }

  burst(x: number, y: number, color: string, n: number, speed = 40, life = 0.6, size = 1): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, g: 60, age: 0, life: life * (0.6 + Math.random() * 0.4), color, size });
    }
    if (this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);
  }

  coins(x: number, y: number, n: number, homeX: number, homeY: number): void {
    for (let i = 0; i < n; i++) {
      this.parts.push({
        x, y, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 30, g: 0, age: -i * 0.04, life: 1.1,
        color: '#ffcf4a', size: 2, homeX, homeY,
      });
    }
  }

  banner(text: string, sub: string, color: string, life = 1.6): void {
    this.bannerText = text;
    this.bannerSub = sub;
    this.bannerColor = color;
    this.bannerAge = 0;
    this.bannerLife = life;
  }

  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 10);
    this.flash = Math.max(0, this.flash - dt * 4);
    this.bannerAge += dt;
    for (const t of this.texts) {
      t.age += dt;
      t.y += t.vy * dt;
      t.vy *= 1 - 2.5 * dt;
    }
    this.texts = this.texts.filter((t) => t.age < t.life);
    for (const s of this.sprites) s.age += dt;
    this.sprites = this.sprites.filter((s) => s.age < s.life);
    for (const p of this.parts) {
      p.age += dt;
      if (p.age < 0) continue;
      if (p.homeX !== undefined && p.homeY !== undefined && p.age > 0.35) {
        const k = Math.min(1, (p.age - 0.35) * 3);
        p.x += (p.homeX - p.x) * k * dt * 8;
        p.y += (p.homeY - p.y) * k * dt * 8;
        p.vx *= 0.9;
        p.vy *= 0.9;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.parts = this.parts.filter((p) => p.age < p.life);
  }
}
