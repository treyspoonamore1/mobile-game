import type { InputView } from '../render/frames.ts';
import { frameAt, inRect, type Layout } from '../render/layout.ts';
import type { Action } from '../sim/state.ts';
import { T } from '../sim/tuning.ts';

interface Touch {
  start: number;
  frames: number[];
  held: boolean;
  sanctuary: boolean;
  x: number;
  y: number;
}

/**
 * Turns touches on the party frames into spells:
 * tap = Mend, hold = Ward (fires as soon as the hold time passes), swipe across frames = Chain Mend.
 * Several fingers work at once.
 */
export class Gestures {
  private touches = new Map<number, Touch>();
  private queue: Action[] = [];
  enabled = () => true;
  onPress: (kind: 'tap' | 'hold' | 'chain' | 'sanctuary') => void = () => {};

  constructor(private canvas: HTMLCanvasElement, private layout: () => Layout) {
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e, false));
    canvas.addEventListener('pointercancel', (e) => this.up(e, true));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private pos(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down(e: PointerEvent): void {
    if (!this.enabled()) return;
    const { x, y } = this.pos(e);
    const L = this.layout();
    if (inRect(L.sanctuary, x, y)) {
      this.touches.set(e.pointerId, { start: performance.now(), frames: [], held: false, sanctuary: true, x, y });
    } else {
      const f = frameAt(L, x, y);
      if (f === null) return;
      this.touches.set(e.pointerId, { start: performance.now(), frames: [f], held: false, sanctuary: false, x, y });
    }
    this.canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  private move(e: PointerEvent): void {
    const t = this.touches.get(e.pointerId);
    if (!t || t.sanctuary) return;
    const { x, y } = this.pos(e);
    t.x = x;
    t.y = y;
    const f = frameAt(this.layout(), x, y);
    if (f !== null && !t.frames.includes(f)) t.frames.push(f);
  }

  private up(e: PointerEvent, cancel: boolean): void {
    const t = this.touches.get(e.pointerId);
    if (!t) return;
    this.touches.delete(e.pointerId);
    if (cancel || !this.enabled()) return;
    const { x, y } = this.pos(e);
    if (t.sanctuary) {
      if (inRect(this.layout().sanctuary, x, y)) {
        this.queue.push({ kind: 'sanctuary' });
        this.onPress('sanctuary');
      }
      return;
    }
    if (t.frames.length >= 2) {
      this.queue.push({ kind: 'chain', heroes: [...t.frames] });
      this.onPress('chain');
    } else if (!t.held) {
      this.queue.push({ kind: 'mend', hero: t.frames[0]! });
      this.onPress('tap');
    }
  }

  /** Fire holds whose time has come. Call every frame. */
  update(): void {
    const now = performance.now();
    for (const t of this.touches.values()) {
      if (t.sanctuary || t.held || t.frames.length !== 1) continue;
      if (now - t.start >= T.holdTime * 1000) {
        t.held = true;
        this.queue.push({ kind: 'hold', hero: t.frames[0]! });
        this.onPress('hold');
      }
    }
  }

  take(): Action[] {
    const q = this.queue;
    this.queue = [];
    return q;
  }

  clear(): void {
    this.touches.clear();
    this.queue = [];
  }

  view(): InputView {
    const now = performance.now();
    const pressed = new Map<number, number>();
    const chain: number[] = [];
    let chainPoint: { x: number; y: number } | null = null;
    let sanctuaryDown = false;
    for (const t of this.touches.values()) {
      if (t.sanctuary) {
        sanctuaryDown = true;
      } else if (t.frames.length >= 2) {
        for (const f of t.frames) if (!chain.includes(f)) chain.push(f);
        chainPoint = { x: t.x, y: t.y };
      } else {
        pressed.set(t.frames[0]!, Math.min(1, (now - t.start) / (T.holdTime * 1000)));
      }
    }
    return { pressed, chain, chainPoint, sanctuaryDown };
  }
}
