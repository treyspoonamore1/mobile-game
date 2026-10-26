import type { Engine } from './context';
import { degreeToMidi, midiToFreq, tonicAtOrAbove, type WaveName } from './patterns';

/** Where a sound goes and how wet it is. */
export interface Out {
  dest: AudioNode;
  send?: number;
}

const pulseWave = (e: Engine, duty: number): PeriodicWave => {
  const hit = e.pulse.get(duty);
  if (hit) return hit;
  const n = 48;
  const re = new Float32Array(n + 1);
  const im = new Float32Array(n + 1);
  for (let k = 1; k <= n; k++) {
    re[k] = (2 / (k * Math.PI)) * Math.sin(2 * Math.PI * k * duty);
    im[k] = (2 / (k * Math.PI)) * (1 - Math.cos(2 * Math.PI * k * duty));
  }
  const w = e.ctx.createPeriodicWave(re, im);
  e.pulse.set(duty, w);
  return w;
};

export function setWave(e: Engine, osc: OscillatorNode, wave: WaveName): void {
  switch (wave) {
    case 'saw':
      osc.type = 'sawtooth';
      break;
    case 'pulse':
      osc.setPeriodicWave(pulseWave(e, 0.25));
      break;
    case 'pulse12':
      osc.setPeriodicWave(pulseWave(e, 0.125));
      break;
    default:
      osc.type = wave;
  }
}

/** Gain envelope: linear attack, hold, exponential-ish release. Returns the time the sound is silent. */
export function envelope(g: AudioParam, t: number, peak: number, a: number, hold: number, r: number): number {
  const atk = Math.max(a, 0.002);
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + atk);
  const rel = t + atk + hold;
  g.setTargetAtTime(0, rel, r / 5);
  return rel + r * 1.4 + 0.02;
}

function route(e: Engine, node: AudioNode, out: Out | undefined): void {
  node.connect(out?.dest ?? e.sfxBus);
  if (out?.send) {
    const s = e.ctx.createGain();
    s.gain.value = out.send;
    node.connect(s).connect(e.wet);
  }
}

export interface ToneOpts {
  t: number;
  f: number;
  /** Glide target (reached over the attack + hold + a bit). */
  f2?: number;
  type?: WaveName;
  vol: number;
  a?: number;
  hold?: number;
  r: number;
  /** Lowpass: start cutoff, optional end cutoff over the sound. */
  lp?: number;
  lpEnd?: number;
  /** Detuned twin (cents) for width / shimmer. */
  det?: number;
  out?: Out;
}

/** One enveloped oscillator (plus an optional detuned twin). */
export function tone(e: Engine, o: ToneOpts): void {
  const ctx = e.ctx;
  const a = o.a ?? 0.004;
  const hold = o.hold ?? 0;
  const g = ctx.createGain();
  const end = envelope(g.gain, o.t, o.vol, a, hold, o.r);
  let head: AudioNode = g;
  if (o.lp) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(o.lp, o.t);
    if (o.lpEnd) lp.frequency.exponentialRampToValueAtTime(o.lpEnd, o.t + a + hold + o.r * 0.6);
    lp.connect(g);
    head = lp;
  }
  const n = o.det ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const osc = ctx.createOscillator();
    setWave(e, osc, o.type ?? 'sine');
    osc.frequency.setValueAtTime(o.f, o.t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, o.t + a + hold + o.r * 0.5);
    if (i === 1) osc.detune.value = o.det!;
    osc.connect(head);
    osc.start(o.t);
    osc.stop(end);
  }
  route(e, g, o.out);
}

export interface NoiseOpts {
  t: number;
  vol: number;
  a?: number;
  hold?: number;
  r: number;
  filter: BiquadFilterType;
  f: number;
  /** Filter sweep target. */
  f2?: number;
  q?: number;
  out?: Out;
}

export function noise(e: Engine, o: NoiseOpts): void {
  const ctx = e.ctx;
  const a = o.a ?? 0.002;
  const hold = o.hold ?? 0;
  const src = ctx.createBufferSource();
  src.buffer = e.noise;
  src.loop = true;
  const flt = ctx.createBiquadFilter();
  flt.type = o.filter;
  flt.Q.value = o.q ?? 0.8;
  flt.frequency.setValueAtTime(o.f, o.t);
  if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, o.t + a + hold + o.r * 0.7);
  const g = ctx.createGain();
  const end = envelope(g.gain, o.t, o.vol, a, hold, o.r);
  src.connect(flt).connect(g);
  src.start(o.t, Math.random() * 0.5);
  src.stop(end);
  route(e, g, o.out);
}

/** Bell: inharmonic additive partials, each decaying faster than the last, plus a shimmering twin. */
export function bell(e: Engine, t: number, f: number, vol: number, ring = 1, send = 0.35, out?: AudioNode): void {
  const o: Out = { dest: out ?? e.sfxBus, send };
  const partials: [number, number, number][] = [
    // ratio, level, decay seconds
    [1, 1, 0.9],
    [2.0, 0.42, 0.6],
    [2.76, 0.28, 0.4],
    [4.1, 0.14, 0.25],
    [5.43, 0.08, 0.16],
  ];
  for (const [ratio, lvl, dec] of partials) {
    tone(e, { t, f: f * ratio, vol: vol * lvl, a: 0.002, r: dec * ring, out: o });
  }
  // detuned fundamental beats against the main one for a living shimmer
  tone(e, { t, f: f * 1.003, vol: vol * 0.5, a: 0.002, r: 1.1 * ring, out: o });
}

// ---------------------------------------------------------------------------------------------
// Key-aware pitch helpers

/** Frequency of scale degree `deg` in the engine's key, with the tonic at or above `minTonic` (MIDI). */
export function keyFreq(e: Engine, deg: number, minTonic: number, acc = 0): number {
  const tonic = tonicAtOrAbove(e.key.root, minTonic);
  return midiToFreq(degreeToMidi(tonic, e.key.scale, deg, acc));
}

export const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
export const pick = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]!;
