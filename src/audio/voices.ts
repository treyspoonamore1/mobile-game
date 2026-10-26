import type { Engine } from './context';
import type { MelodicPart } from './patterns';
import { midiToFreq } from './patterns';
import { setWave } from './synth';

/** One music note (or chord): oscillator(s) -> optional lowpass -> envelope -> dest. */
export function playNote(e: Engine, dest: AudioNode, p: MelodicPart, t: number, midis: number[], dur: number, vel: number): void {
  const ctx = e.ctx;
  const g = ctx.createGain();
  const per = 1 / Math.sqrt(midis.length * (p.det ? 2 : 1));
  const peak = p.vol * vel * per * (p.det ? 1.3 : 1);
  const a = Math.max(p.a, 0.003);
  const gate = Math.max(dur * p.gate, a);
  // attack, decay toward the sustain level, release after the gate
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  if (p.s < 1) g.gain.setTargetAtTime(peak * p.s, t + a, Math.max(p.d, 0.01) / 3);
  g.gain.setTargetAtTime(0, t + gate, p.r / 5);
  const end = t + gate + p.r * 1.4 + 0.02;
  let head: AudioNode = g;
  if (p.lp) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.7;
    if (p.lpEnv && p.lpEnv !== 1) {
      f.frequency.setValueAtTime(p.lp * p.lpEnv, t);
      f.frequency.setTargetAtTime(p.lp, t, 0.08);
    } else {
      f.frequency.value = p.lp;
    }
    f.connect(g);
    head = f;
  }
  for (const m of midis) {
    const fr = midiToFreq(m);
    for (let i = 0; i < (p.det ? 2 : 1); i++) {
      const o = ctx.createOscillator();
      setWave(e, o, p.wave);
      o.frequency.value = fr;
      if (i === 1) o.detune.value = p.det!;
      o.connect(head);
      o.start(t);
      o.stop(end);
    }
  }
  g.connect(dest);
}

function noiseHit(e: Engine, dest: AudioNode, t: number, type: BiquadFilterType, f: number, q: number, vol: number, dec: number): void {
  const ctx = e.ctx;
  const src = ctx.createBufferSource();
  src.buffer = e.noise;
  src.loop = true;
  const flt = ctx.createBiquadFilter();
  flt.type = type;
  flt.frequency.value = f;
  flt.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.setTargetAtTime(0, t + 0.002, dec / 4);
  src.connect(flt).connect(g).connect(dest);
  src.start(t, Math.random());
  src.stop(t + dec * 1.8 + 0.02);
}

function thump(e: Engine, dest: AudioNode, t: number, f0: number, f1: number, vol: number, dec: number, sweep: number): void {
  const o = e.ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.setTargetAtTime(0, t + 0.004, dec / 4);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + dec * 1.8 + 0.02);
}

/** Drum voices; `v` is the part volume (peak level for the loudest element). */
export function playDrum(e: Engine, dest: AudioNode, ch: string, t: number, v: number): void {
  switch (ch) {
    case 'k':
      thump(e, dest, t, 150, 45, v * 1.6, 0.26, 0.11);
      noiseHit(e, dest, t, 'lowpass', 900, 0.7, v * 0.25, 0.02);
      break;
    case 's':
      noiseHit(e, dest, t, 'bandpass', 2000, 0.7, v * 1.4, 0.16);
      thump(e, dest, t, 230, 150, v * 0.8, 0.09, 0.05);
      break;
    case 'c':
      thump(e, dest, t, 1000, 700, v * 0.7, 0.04, 0.02);
      noiseHit(e, dest, t, 'highpass', 4500, 0.7, v * 0.5, 0.03);
      break;
    case 'h':
      noiseHit(e, dest, t, 'highpass', 7500, 0.7, v * 0.9, 0.045);
      break;
    case 'o':
      noiseHit(e, dest, t, 'highpass', 7000, 0.7, v * 0.7, 0.2);
      break;
    case 't':
      thump(e, dest, t, 210, 95, v * 1.5, 0.28, 0.14);
      break;
    case 'b':
      thump(e, dest, t, 100, 38, v * 2.2, 0.9, 0.35);
      noiseHit(e, dest, t, 'lowpass', 300, 0.7, v * 0.3, 0.5);
      break;
  }
}
