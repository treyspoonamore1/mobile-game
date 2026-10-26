/** Seeded PRNG (mulberry32). The only source of randomness in the sim. */
export interface Rng {
  s: number;
}

export function makeRng(seed: number): Rng {
  return { s: seed >>> 0 || 0x9e3779b9 };
}

export function next(r: Rng): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function chance(r: Rng, p: number): boolean {
  return next(r) < p;
}

export function int(r: Rng, n: number): number {
  return Math.floor(next(r) * n);
}

export function pick<T>(r: Rng, arr: readonly T[]): T {
  return arr[int(r, arr.length)]!;
}

/** Hash two integers into a seed, for per-floor deterministic content. */
export function hash2(a: number, b: number): number {
  let h = Math.imul(a ^ 0x85ebca6b, 0xc2b2ae35) ^ Math.imul(b + 0x27d4eb2f, 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}
