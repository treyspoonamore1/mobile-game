import type { FightState } from './state.ts';

/** A cheap hash of the parts of the fight state that matter, for determinism checks. */
export function hashFight(s: FightState): number {
  let h = 2166136261;
  const mix = (v: number) => {
    h ^= Math.round(v * 1000) | 0;
    h = Math.imul(h, 16777619);
  };
  mix(s.tick);
  mix(s.floor);
  mix(s.mana);
  mix(s.resonance);
  mix(s.rng.s);
  for (const x of s.heroes) {
    mix(x.hp);
    mix(x.shield);
  }
  for (const e of s.enemies) {
    mix(e.hp);
    mix(e.uid);
  }
  return h >>> 0;
}
