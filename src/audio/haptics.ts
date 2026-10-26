export type HapticKind = 'tap' | 'shield' | 'perfect' | 'save' | 'hit' | 'wipe' | 'boss' | 'buy';

interface Pattern {
  /** Vibrate / pause alternating, in ms. */
  p: number[];
  /** Minimum ms between two of this kind. */
  gap: number;
  /** Higher priority interrupts lower-priority patterns that are still playing. */
  prio: number;
}

export const HAPTIC_PATTERNS: Readonly<Record<HapticKind, Pattern>> = {
  tap: { p: [8], gap: 70, prio: 0 },
  buy: { p: [10, 35, 12], gap: 120, prio: 1 },
  hit: { p: [18], gap: 140, prio: 0 },
  shield: { p: [24], gap: 90, prio: 1 },
  perfect: { p: [16, 45, 30], gap: 60, prio: 3 },
  save: { p: [70, 40, 110], gap: 150, prio: 3 },
  boss: { p: [90, 70, 90, 70, 220], gap: 800, prio: 3 },
  wipe: { p: [140, 40, 110, 60, 80, 90, 50, 120, 30], gap: 1000, prio: 4 },
};

let enabled = true;
let busyUntil = 0;
let busyPrio = -1;
const lastByKind = new Map<HapticKind, number>();

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function vibrate(p: number | number[]): boolean {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
    return navigator.vibrate(p);
  } catch {
    return false;
  }
}

export function haptic(kind: HapticKind): void {
  if (!enabled) return;
  const def = HAPTIC_PATTERNS[kind];
  if (!def) return;
  const t = now();
  const last = lastByKind.get(kind);
  if (last !== undefined && t - last < def.gap) return;
  // don't let a light buzz cut off a heavier pattern that is still playing
  if (t < busyUntil && def.prio < busyPrio) return;
  lastByKind.set(kind, t);
  if (!vibrate(def.p)) return;
  busyUntil = t + def.p.reduce((a, b) => a + b, 0);
  busyPrio = def.prio;
}

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
  if (!on) {
    vibrate(0);
    busyUntil = 0;
    busyPrio = -1;
  }
}
