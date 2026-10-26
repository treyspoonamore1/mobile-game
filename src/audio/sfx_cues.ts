import type { Engine } from './context';
import { bell, keyFreq, noise, tone, type Out } from './synth';

/** Longer, rarer sounds: the Perfect chime and the stingers. All take a start time, volume and pitch ratio. */
export type Cue = (e: Engine, t: number, v: number, pitch: number) => void;

const wetOut = (e: Engine, send: number): Out => ({ dest: e.sfxBus, send });

/**
 * The Perfect Ward. A soft low thunk (the haptic's sound), then a bright bell on the current
 * key's scale degree `streak`, a shimmering tail of high partials with a tremolo, and a glint.
 */
export function perfectChime(e: Engine, t: number, v: number, streak: number, pitch = 1): void {
  const s = Math.max(1, Math.floor(streak));
  const deg = Math.min(s, 8);
  const f = keyFreq(e, deg, 70) * pitch;
  const out = wetOut(e, 0.5);

  // thunk
  tone(e, { t, f: 130, f2: 48, vol: 0.22 * v, r: 0.16 });
  noise(e, { t, vol: 0.1 * v, r: 0.03, filter: 'lowpass', f: 1400 });

  // bell + glint
  bell(e, t + 0.012, f, 0.3 * v, 1.25, 0.4);
  tone(e, { t: t + 0.04, f: f * 4, vol: 0.07 * v, a: 0.002, r: 0.45, out });

  // shimmer tail: harmonic partials with a ~6.5 Hz tremolo under a decaying envelope
  const ctx = e.ctx;
  const end = t + 2.6;
  const env = ctx.createGain();
  env.gain.value = 0;
  env.gain.setValueAtTime(0, t + 0.03);
  env.gain.linearRampToValueAtTime(0.15 * v, t + 0.09);
  env.gain.setTargetAtTime(0, t + 0.12, 0.34);
  const trem = ctx.createGain();
  trem.gain.value = 0.7;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 6.5;
  const depth = ctx.createGain();
  depth.gain.value = 0.3;
  lfo.connect(depth).connect(trem.gain);
  lfo.start(t + 0.03);
  lfo.stop(end);
  for (const [r, lvl] of [[3, 1], [4, 0.8], [5, 0.5], [6.02, 0.3]] as const) {
    const o = ctx.createOscillator();
    o.frequency.value = f * r;
    const og = ctx.createGain();
    og.gain.value = lvl * 0.5;
    o.connect(og).connect(trem);
    o.start(t + 0.03);
    o.stop(end);
  }
  trem.connect(env);
  env.connect(e.sfxBus);
  const send = ctx.createGain();
  send.gain.value = 0.6;
  env.connect(send).connect(e.wet);

  // long streaks add a warm fifth below and an upper octave sparkle
  if (s >= 3) tone(e, { t: t + 0.02, f: f * 0.5, type: 'triangle', vol: 0.12 * v, a: 0.005, r: 0.5, lp: 1800, out });
  if (s >= 5) bell(e, t + 0.07, f * 2, 0.12 * v, 0.7, 0.5);
  if (s >= 8) for (let i = 0; i < 4; i++) tone(e, { t: t + 0.1 + i * 0.045, f: f * 2 * [1, 1.25, 1.5, 2][i]!, vol: 0.05 * v, a: 0.002, r: 0.3, out });
}

export const perfect: Cue = (e, t, v, pitch) => perfectChime(e, t, v, 1, pitch);

/** A hero survived: short heroic sting (stacked fifth/octave, brass-ish swell, cymbal wash, bell). */
export const save: Cue = (e, t, v, p) => {
  const out = wetOut(e, 0.25);
  const notes: [number, number][] = [[1, 0], [5, 0.085], [8, 0.17]];
  for (const [deg, dt] of notes) {
    const f = keyFreq(e, deg, 60) * p;
    const hold = deg === 8 ? 0.28 : 0.05;
    const r = deg === 8 ? 0.4 : 0.1;
    tone(e, { t: t + dt, f, type: 'saw', vol: 0.11 * v, a: 0.012, hold, r, lp: 700, lpEnd: 2600, det: 9, out });
    tone(e, { t: t + dt, f, type: 'square', vol: 0.03 * v, a: 0.012, hold, r, lp: 1500, out });
  }
  const top = keyFreq(e, 8, 60) * p;
  tone(e, { t: t + 0.17, f: top * 1.5, vol: 0.06 * v, a: 0.005, r: 0.5, out });
  bell(e, t + 0.17, top * 2, 0.1 * v, 0.9, 0.4);
  tone(e, { t, f: 120, f2: 52, vol: 0.38 * v, r: 0.2 });
  noise(e, { t: t + 0.17, vol: 0.05 * v, a: 0.02, r: 0.5, filter: 'highpass', f: 5500, out });
};

export const revive: Cue = (e, t, v, p) => {
  const out = wetOut(e, 0.4);
  tone(e, { t, f: 260 * p, f2: 780 * p, type: 'triangle', vol: 0.12 * v, a: 0.03, hold: 0.25, r: 0.3, lp: 2500, out });
  [1, 3, 5, 8, 10].forEach((deg, i) => bell(e, t + 0.18 + i * 0.075, keyFreq(e, deg, 66) * p, 0.14 * v, 0.9, 0.5));
  noise(e, { t, vol: 0.04 * v, a: 0.2, hold: 0.2, r: 0.4, filter: 'bandpass', f: 800, f2: 4000, q: 1.5, out });
};

export const sanctuary: Cue = (e, t, v, p) => {
  const out = wetOut(e, 0.5);
  for (const deg of [1, 3, 5, 8]) {
    const f = keyFreq(e, deg, 55) * p;
    tone(e, { t, f, type: 'triangle', vol: 0.09 * v, a: 0.25, hold: 0.5, r: 1.1, lp: 2200, det: 7, out });
    tone(e, { t, f: f * 2, vol: 0.03 * v, a: 0.3, hold: 0.4, r: 1.0, out });
  }
  [1, 3, 5, 8, 10, 12].forEach((deg, i) => bell(e, t + 0.15 + i * 0.09, keyFreq(e, deg, 72) * p, 0.1 * v, 1, 0.55));
  noise(e, { t, vol: 0.06 * v, a: 0.4, hold: 0.2, r: 0.8, filter: 'bandpass', f: 300, f2: 2500, q: 0.8, out });
  tone(e, { t, f: 90, f2: 55, vol: 0.3 * v, r: 0.5 });
};

export const cleanse: Cue = (e, t, v, p) => {
  const out = wetOut(e, 0.4);
  tone(e, { t, f: 700 * p, f2: 1500 * p, vol: 0.1 * v, a: 0.01, hold: 0.08, r: 0.15, out });
  tone(e, { t: t + 0.06, f: 1000 * p, f2: 2200 * p, vol: 0.06 * v, a: 0.01, hold: 0.06, r: 0.15, out });
  noise(e, { t, vol: 0.03 * v, a: 0.02, r: 0.2, filter: 'highpass', f: 6000, out });
  bell(e, t + 0.14, keyFreq(e, 8, 72) * p, 0.1 * v, 0.6, 0.5);
};

export const healBig: Cue = (e, t, v, p) => {
  const out = wetOut(e, 0.4);
  [1, 3, 5, 8].forEach((deg, i) => {
    const f = keyFreq(e, deg, 66) * p;
    const last = i === 3;
    tone(e, { t: t + i * 0.055, f, vol: 0.17 * v, a: 0.004, r: last ? 0.55 : 0.2, out });
    tone(e, { t: t + i * 0.055, f: f * 2, type: 'triangle', vol: 0.05 * v, a: 0.003, r: last ? 0.35 : 0.12, out });
  });
  tone(e, { t: t + 0.17, f: keyFreq(e, 8, 66) * 3 * p, vol: 0.03 * v, a: 0.003, r: 0.3, out });
};

export const levelup: Cue = (e, t, v, p) => {
  [1, 3, 5, 8, 10].forEach((deg, i) => {
    const f = keyFreq(e, deg, 60) * p;
    tone(e, { t: t + i * 0.06, f, type: 'triangle', vol: 0.13 * v, a: 0.004, hold: 0.02, r: 0.2, out: wetOut(e, 0.3) });
  });
  bell(e, t + 0.3, keyFreq(e, 12, 60) * p, 0.14 * v, 1, 0.5);
  noise(e, { t: t + 0.3, vol: 0.03 * v, a: 0.01, r: 0.3, filter: 'highpass', f: 6500 });
};

export const floorClear: Cue = (e, t, v, p) => {
  [1, 3, 5, 8].forEach((deg, i) => {
    const f = keyFreq(e, deg, 60) * p;
    const last = i === 3;
    tone(e, { t: t + i * 0.08, f, type: 'triangle', vol: 0.15 * v, a: 0.005, hold: last ? 0.1 : 0.02, r: last ? 0.35 : 0.1, out: wetOut(e, 0.25) });
    tone(e, { t: t + i * 0.08, f, type: 'square', vol: 0.025 * v, a: 0.005, hold: last ? 0.1 : 0.02, r: 0.1, lp: 1800 });
  });
  bell(e, t + 0.24, keyFreq(e, 8, 60) * 2 * p, 0.07 * v, 0.7, 0.4);
};

export const bossClear: Cue = (e, t, v, p) => {
  const out = wetOut(e, 0.35);
  const seq: [number, number, number][] = [[1, 0, 0.1], [3, 0.1, 0.1], [5, 0.2, 0.1], [8, 0.3, 0.2], [10, 0.5, 0.1], [12, 0.6, 0.9]];
  for (const [deg, dt, hold] of seq) {
    const f = keyFreq(e, deg, 55) * p;
    tone(e, { t: t + dt, f, type: 'saw', vol: 0.08 * v, a: 0.01, hold, r: 0.3, lp: 1400, lpEnd: 3000, det: 8, out });
    tone(e, { t: t + dt, f, type: 'triangle', vol: 0.1 * v, a: 0.006, hold, r: 0.3, out });
  }
  for (const deg of [5, 8, 10]) tone(e, { t: t + 0.6, f: keyFreq(e, deg, 55) * p, type: 'triangle', vol: 0.07 * v, a: 0.02, hold: 0.8, r: 0.9, out });
  bell(e, t + 0.6, keyFreq(e, 12, 66) * p, 0.14 * v, 1.4, 0.5);
  noise(e, { t: t + 0.6, vol: 0.06 * v, a: 0.01, r: 1.2, filter: 'highpass', f: 5000, out });
  tone(e, { t: t + 0.3, f: 110, f2: 55, vol: 0.3 * v, r: 0.3 });
  tone(e, { t: t + 0.6, f: 110, f2: 50, vol: 0.35 * v, r: 0.5 });
};

export const wipe: Cue = (e, t, v, p) => {
  const out = wetOut(e, 0.3);
  tone(e, { t, f: 220 * p, f2: 55 * p, type: 'saw', vol: 0.16 * v, a: 0.02, hold: 0.5, r: 0.7, lp: 1600, lpEnd: 160, det: 14, out });
  tone(e, { t, f: 110 * p, f2: 28, vol: 0.4 * v, a: 0.01, hold: 0.2, r: 0.8 });
  noise(e, { t, vol: 0.12 * v, a: 0.01, hold: 0.2, r: 0.8, filter: 'lowpass', f: 900, f2: 120, out });
  [330, 247, 196].forEach((f, i) => tone(e, { t: t + 0.05 + i * 0.22, f: f * p, type: 'triangle', vol: 0.09 * v, a: 0.01, r: 0.4, lp: 1200, out }));
};

export const heroDown: Cue = (e, t, v, p) => {
  const out = wetOut(e, 0.2);
  tone(e, { t, f: 330 * p, f2: 300 * p, type: 'triangle', vol: 0.18 * v, a: 0.006, r: 0.22, lp: 1500, out });
  tone(e, { t: t + 0.14, f: 262 * p, f2: 185 * p, type: 'triangle', vol: 0.2 * v, a: 0.006, hold: 0.05, r: 0.4, lp: 1200, out });
  tone(e, { t: t + 0.14, f: 100, f2: 45, vol: 0.28 * v, r: 0.25 });
};

export const bossAppear: Cue = (e, t, v, p) => {
  const out = wetOut(e, 0.35);
  tone(e, { t, f: 72 * p, f2: 34, vol: 0.55 * v, a: 0.01, hold: 0.2, r: 1.2 });
  for (const f of [87.3, 87.3 * 1.5]) {
    tone(e, { t, f: f * p, type: 'saw', vol: 0.12 * v, a: 0.5, hold: 0.55, r: 0.6, lp: 180, lpEnd: 1400, det: 11, out });
  }
  noise(e, { t, vol: 0.25 * v, a: 0.25, hold: 0.6, r: 0.8, filter: 'lowpass', f: 160, f2: 700, q: 1, out });
  tone(e, { t: t + 0.9, f: 311 * p, type: 'saw', vol: 0.06 * v, a: 0.01, hold: 0.15, r: 0.6, lp: 1800, det: 20, out });
  tone(e, { t: t + 0.9, f: 90, f2: 40, vol: 0.4 * v, r: 0.5 });
  noise(e, { t: t + 0.9, vol: 0.1 * v, a: 0.01, r: 0.5, filter: 'bandpass', f: 1200, q: 0.8, out });
};

export const relic: Cue = (e, t, v, p) => {
  [1, 3, 5, 8, 10, 12].forEach((deg, i) => bell(e, t + i * 0.075, keyFreq(e, deg, 66) * p, 0.13 * v, 0.9, 0.55));
  for (const deg of [1, 5, 8]) tone(e, { t, f: keyFreq(e, deg, 55) * p, type: 'triangle', vol: 0.05 * v, a: 0.2, hold: 0.3, r: 0.8, out: wetOut(e, 0.5) });
  noise(e, { t: t + 0.3, vol: 0.04 * v, a: 0.1, r: 0.6, filter: 'highpass', f: 7000, out: wetOut(e, 0.5) });
};

export const pilgrimage: Cue = (e, t, v, p) => {
  const out = wetOut(e, 0.55);
  tone(e, { t, f: 150 * p, f2: 900 * p, type: 'triangle', vol: 0.14 * v, a: 0.3, hold: 1.0, r: 0.6, lp: 3000, det: 6, out });
  for (const deg of [1, 5, 8, 10]) {
    tone(e, { t: t + 0.5, f: keyFreq(e, deg, 55) * p, type: 'triangle', vol: 0.07 * v, a: 0.5, hold: 0.9, r: 1.2, det: 7, out });
  }
  noise(e, { t, vol: 0.07 * v, a: 0.8, hold: 0.6, r: 0.7, filter: 'bandpass', f: 400, f2: 6000, q: 0.9, out });
  for (let i = 0; i < 9; i++) bell(e, t + 0.5 + i * 0.1, keyFreq(e, 1 + i + (i > 4 ? 2 : 0), 66) * p, 0.1 * v, 0.9, 0.6);
  bell(e, t + 1.6, keyFreq(e, 8, 66) * p, 0.2 * v, 1.8, 0.6);
  bell(e, t + 1.6, keyFreq(e, 12, 66) * p, 0.12 * v, 1.8, 0.6);
  tone(e, { t: t + 1.6, f: 110, f2: 50, vol: 0.4 * v, r: 0.6 });
};
