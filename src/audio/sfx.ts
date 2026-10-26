import type { Engine } from './context';
import * as cue from './sfx_cues';
import { bell, keyFreq, noise, pick, rand, tone, type Out } from './synth';
import type { Cue } from './sfx_cues';

export type SfxName =
  | 'heal' | 'heal_big' | 'chain' | 'shield' | 'perfect' | 'save' | 'revive' | 'sanctuary' | 'cleanse'
  | 'hit_hero' | 'hit_hero_big' | 'hit_enemy' | 'crit' | 'dodge' | 'enemy_die' | 'hero_down'
  | 'telegraph' | 'boss_appear' | 'floor_clear' | 'boss_clear' | 'wipe' | 'gold' | 'poison'
  | 'buy' | 'relic' | 'ui_tap' | 'ui_error' | 'oom' | 'levelup' | 'pilgrimage';

export const SFX_NAMES: readonly SfxName[] = [
  'heal', 'heal_big', 'chain', 'shield', 'perfect', 'save', 'revive', 'sanctuary', 'cleanse',
  'hit_hero', 'hit_hero_big', 'hit_enemy', 'crit', 'dodge', 'enemy_die', 'hero_down',
  'telegraph', 'boss_appear', 'floor_clear', 'boss_clear', 'wipe', 'gold', 'poison',
  'buy', 'relic', 'ui_tap', 'ui_error', 'oom', 'levelup', 'pilgrimage',
];

const wet = (e: Engine, send: number): Out => ({ dest: e.sfxBus, send });

// Pentatonic-ish degrees for the random heal pluck, so heals always sit in the music's key.
const HEAL_DEGREES = [1, 2, 3, 5, 6, 8] as const;

const heal: Cue = (e, t, v, p) => {
  let deg: number;
  do deg = pick(HEAL_DEGREES);
  while (deg === e.sfx.lastHeal && HEAL_DEGREES.length > 1);
  e.sfx.lastHeal = deg;
  const f = keyFreq(e, deg, 66) * p * rand(0.995, 1.005);
  const out = wet(e, 0.28);
  tone(e, { t, f: f * 0.985, f2: f, vol: 0.2 * v, a: 0.005, r: 0.24, out });
  tone(e, { t, f: f * 2, vol: 0.055 * v, a: 0.003, r: 0.12, out });
  tone(e, { t: t + 0.028, f: f * 3.01, vol: 0.03 * v, a: 0.003, r: 0.1, out });
};

const chain: Cue = (e, t, v, p) => {
  [1, 2, 3, 5].forEach((deg, i) => {
    const f = keyFreq(e, deg + 7, 66) * p;
    tone(e, { t: t + i * 0.042, f, vol: 0.12 * v, a: 0.003, r: 0.14, out: wet(e, 0.3) });
    tone(e, { t: t + i * 0.042, f: f * 2.01, vol: 0.03 * v, a: 0.002, r: 0.08 });
  });
};

const shield: Cue = (e, t, v, p) => {
  const out = wet(e, 0.25);
  noise(e, { t, vol: 0.1 * v, a: 0.05, hold: 0.06, r: 0.14, filter: 'bandpass', f: 450, f2: 1900, q: 3, out });
  tone(e, { t, f: 392 * p, f2: 784 * p, type: 'triangle', vol: 0.11 * v, a: 0.02, hold: 0.1, r: 0.14, lp: 2200, out });
  bell(e, t + 0.19, 1568 * p, 0.07 * v, 0.5, 0.4);
};

const hitHero: Cue = (e, t, v, p) => {
  tone(e, { t, f: 175 * p * rand(0.95, 1.05), f2: 62, vol: 0.34 * v, r: 0.13 });
  noise(e, { t, vol: 0.16 * v, r: 0.06, filter: 'lowpass', f: 1600, f2: 300 });
};

const hitHeroBig: Cue = (e, t, v, p) => {
  tone(e, { t, f: 125 * p, f2: 38, vol: 0.5 * v, r: 0.32 });
  tone(e, { t, f: 240 * p, f2: 90, type: 'triangle', vol: 0.15 * v, r: 0.15 });
  noise(e, { t, vol: 0.28 * v, r: 0.2, filter: 'lowpass', f: 1100, f2: 150 });
};

const hitEnemy: Cue = (e, t, v, p) => {
  tone(e, { t, f: 320 * p * rand(0.92, 1.08), f2: 140, type: 'triangle', vol: 0.2 * v, r: 0.07 });
  noise(e, { t, vol: 0.1 * v, r: 0.035, filter: 'bandpass', f: 2200, q: 1 });
};

const crit: Cue = (e, t, v, p) => {
  hitEnemy(e, t, v, p);
  tone(e, { t, f: 1568 * p, f2: 2093 * p, vol: 0.1 * v, a: 0.002, r: 0.25, out: wet(e, 0.3) });
  noise(e, { t, vol: 0.07 * v, r: 0.1, filter: 'highpass', f: 5000 });
};

const dodge: Cue = (e, t, v, p) => {
  noise(e, { t, vol: 0.1 * v, a: 0.03, r: 0.12, filter: 'bandpass', f: 3000, f2: 900, q: 2 });
  tone(e, { t, f: 600 * p, f2: 900 * p, vol: 0.04 * v, a: 0.01, r: 0.08 });
};

const enemyDie: Cue = (e, t, v, p) => {
  tone(e, { t, f: 520 * p * rand(0.9, 1.1), f2: 110, vol: 0.22 * v, a: 0.004, r: 0.2 });
  noise(e, { t, vol: 0.12 * v, r: 0.13, filter: 'lowpass', f: 2600, f2: 400 });
  tone(e, { t: t + 0.03, f: 260 * p, f2: 80, type: 'triangle', vol: 0.1 * v, r: 0.14 });
};

const telegraph: Cue = (e, t, v, p) => {
  for (let i = 0; i < 2; i++) {
    tone(e, { t: t + i * 0.12, f: 740 * p, type: 'triangle', vol: 0.17 * v, a: 0.006, hold: 0.04, r: 0.06, lp: 2400 });
    tone(e, { t: t + i * 0.12, f: 1480 * p, vol: 0.05 * v, a: 0.005, hold: 0.03, r: 0.05 });
  }
};

const gold: Cue = (e, t, v, p) => {
  const s = e.sfx;
  s.goldStreak = t - s.lastGold < 0.45 ? Math.min(s.goldStreak + 1, 5) : 0;
  s.lastGold = t;
  const k = p * Math.pow(2, (s.goldStreak * 2) / 12);
  tone(e, { t, f: 988 * k, type: 'triangle', vol: 0.12 * v, a: 0.002, r: 0.07 });
  tone(e, { t: t + 0.055, f: 1319 * k, type: 'triangle', vol: 0.13 * v, a: 0.002, r: 0.2, out: wet(e, 0.2) });
  tone(e, { t: t + 0.055, f: 2637 * k, vol: 0.03 * v, a: 0.002, r: 0.12 });
};

const poison: Cue = (e, t, v, p) => {
  tone(e, { t, f: 230 * p * rand(0.9, 1.1), f2: 480 * p, vol: 0.11 * v, a: 0.006, r: 0.08, lp: 1200 });
  tone(e, { t: t + 0.055, f: 300 * p, f2: 620 * p, vol: 0.08 * v, a: 0.006, r: 0.07, lp: 1200 });
  noise(e, { t, vol: 0.03 * v, r: 0.1, filter: 'bandpass', f: 600, q: 2 });
};

const buy: Cue = (e, t, v, p) => {
  noise(e, { t, vol: 0.06 * v, r: 0.02, filter: 'highpass', f: 3000 });
  tone(e, { t, f: 1319 * p, type: 'triangle', vol: 0.11 * v, a: 0.002, r: 0.05 });
  tone(e, { t: t + 0.06, f: 1760 * p, vol: 0.12 * v, a: 0.002, r: 0.3, out: wet(e, 0.25) });
  tone(e, { t: t + 0.06, f: 2637 * p, vol: 0.04 * v, a: 0.002, r: 0.2 });
};

const uiTap: Cue = (e, t, v, p) => {
  tone(e, { t, f: 820 * p, f2: 600 * p, vol: 0.11 * v, a: 0.002, r: 0.045 });
  noise(e, { t, vol: 0.03 * v, r: 0.012, filter: 'highpass', f: 4000 });
};

const uiError: Cue = (e, t, v, p) => {
  for (let i = 0; i < 2; i++) {
    tone(e, { t: t + i * 0.1, f: 210 * p, f2: 150 * p, type: 'triangle', vol: 0.16 * v, a: 0.004, hold: 0.03, r: 0.07, lp: 900 });
  }
};

const oom: Cue = (e, t, v, p) => {
  noise(e, { t, vol: 0.14 * v, r: 0.22, filter: 'lowpass', f: 1400, f2: 180 });
  tone(e, { t, f: 140 * p, f2: 70 * p, vol: 0.2 * v, r: 0.2 });
};

/** Name -> sound plus its limits. gap = min seconds between plays; max = simultaneous voices; prio 2 never dropped by the global cap. */
interface Def {
  fn: Cue;
  gap: number;
  max: number;
  prio: 0 | 1 | 2;
  /** Approximate length in seconds, for voice accounting. */
  len: number;
  /** Level trim, tuned by measurement so peaks at default volume follow the loudness plan (see LEVELS). */
  trim: number;
}

const D = (fn: Cue, gap: number, max: number, prio: 0 | 1 | 2, len: number, trim = 1): Def => ({ fn, gap, max, prio, len, trim });

export const SFX: Readonly<Record<SfxName, Def>> = {
  heal: D(heal, 0.04, 4, 0, 0.35, 1.24),
  heal_big: D(cue.healBig, 0.08, 3, 1, 0.8, 1.33),
  chain: D(chain, 0.06, 3, 1, 0.3, 1.55),
  shield: D(shield, 0.08, 3, 1, 0.4, 1.8),
  perfect: D(cue.perfect, 0.05, 3, 2, 2.0, 0.94),
  save: D(cue.save, 0.1, 2, 2, 0.9, 0.83),
  revive: D(cue.revive, 0.1, 2, 2, 1.0, 0.91),
  sanctuary: D(cue.sanctuary, 0.3, 1, 2, 2.2, 0.76),
  cleanse: D(cue.cleanse, 0.08, 2, 1, 0.5, 1.2),
  hit_hero: D(hitHero, 0.07, 3, 0, 0.2, 1.42),
  hit_hero_big: D(hitHeroBig, 0.1, 2, 1, 0.45, 1.2),
  hit_enemy: D(hitEnemy, 0.06, 3, 0, 0.12, 1.79),
  crit: D(crit, 0.08, 2, 1, 0.4, 1.5),
  dodge: D(dodge, 0.1, 2, 0, 0.2, 3.69),
  enemy_die: D(enemyDie, 0.05, 3, 0, 0.3, 1.46),
  hero_down: D(cue.heroDown, 0.2, 2, 2, 0.7, 0.95),
  telegraph: D(telegraph, 0.25, 2, 2, 0.3, 1.7),
  boss_appear: D(cue.bossAppear, 0.5, 1, 2, 2.0, 0.96),
  floor_clear: D(cue.floorClear, 0.3, 1, 2, 0.8, 1.39),
  boss_clear: D(cue.bossClear, 0.5, 1, 2, 2.2, 0.73),
  wipe: D(cue.wipe, 0.5, 1, 2, 1.6, 0.68),
  gold: D(gold, 0.06, 3, 0, 0.3, 1.62),
  poison: D(poison, 0.15, 2, 0, 0.2, 1.91),
  buy: D(buy, 0.08, 2, 1, 0.4, 1.74),
  relic: D(cue.relic, 0.3, 1, 2, 1.4, 0.82),
  ui_tap: D(uiTap, 0.03, 2, 1, 0.1, 1.89),
  ui_error: D(uiError, 0.12, 1, 1, 0.3, 1.68),
  oom: D(oom, 0.3, 1, 1, 0.3, 1.6),
  levelup: D(cue.levelup, 0.3, 1, 2, 0.9, 1.35),
  pilgrimage: D(cue.pilgrimage, 0.5, 1, 2, 3.0, 0.55),
};

/** Total simultaneous SFX instances; low-priority sounds are dropped above this. */
export const MAX_VOICES = 10;

export interface SfxOpts {
  pitch?: number;
  vol?: number;
}

/**
 * Play a sound on an engine at audio time `when`, applying rate limits and voice limiting.
 * Returns false when the sound was dropped.
 */
export function playSfxOn(e: Engine, name: SfxName, opts: SfxOpts = {}, when = e.ctx.currentTime): boolean {
  const def = SFX[name];
  if (!def) return false;
  const st = e.sfx;
  const last = st.last.get(name);
  if (last !== undefined && when - last < def.gap) return false;
  st.voices = st.voices.filter((v) => v.end > when);
  let same = 0;
  for (const v of st.voices) if (v.name === name) same++;
  const others = st.voices.length - same;
  if (same >= def.max) return false;
  if (st.voices.length >= MAX_VOICES && def.prio < 2) return false;
  st.last.set(name, when);
  st.voices.push({ name, end: when + def.len, prio: def.prio });
  // crowding: every simultaneous copy of the same sound, and every other sound already playing, makes
  // the new one a little quieter, so bursts of taps stay clean instead of piling up into noise
  const crowd = 1 / ((1 + 0.25 * same) * (1 + 0.05 * others));
  def.fn(e, Math.max(when, e.ctx.currentTime), (opts.vol ?? 1) * crowd * def.trim, opts.pitch ?? 1);
  return true;
}
