import { DEFAULT_KEY, type KeyInfo } from './tracks';

/** Everything a sound needs to be scheduled: the context plus the shared buses. */
export interface Engine {
  ctx: BaseAudioContext;
  /** Final level, used for mute. */
  master: GainNode;
  sfxBus: GainNode;
  musicBus: GainNode;
  /** Reverb send bus (feeds the convolver). */
  wet: GainNode;
  noise: AudioBuffer;
  /** Key of the current music track, so heals/chimes stay in tune. */
  key: KeyInfo;
  /** Rate limiter / voice accounting (see sfx.ts). */
  sfx: {
    last: Map<string, number>;
    voices: { name: string; end: number; prio: number }[];
    lastHeal: number;
    goldStreak: number;
    lastGold: number;
  };
  pulse: Map<number, PeriodicWave>;
}

/** Per-bus loudness trims. Slider value v (0..1) maps to v*v*trim. */
export const SFX_TRIM = 1;
export const MUSIC_TRIM = 0.8;
export const DEFAULT_VOLUMES = { sfx: 0.8, music: 0.5 };
const MASTER_LEVEL = 0.9;
const CEILING = 0.97;

export const busGain = (v: number, trim: number): number => Math.max(0, Math.min(1, v)) ** 2 * trim;

function makeImpulse(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // noise that gets darker and quieter as it decays
      const damp = 0.15 + 0.8 * t;
      lp += (Math.random() * 2 - 1 - lp) * (1 - damp);
      d[i] = lp * Math.pow(1 - t, 2.4) * (t < 0.004 ? t / 0.004 : 1);
    }
  }
  return buf;
}

function makeNoise(ctx: BaseAudioContext): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * 1.5);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Soft ceiling: unity gain up to KNEE, then a tanh shoulder that never exceeds +-CEILING. */
function makeCeilingCurve(): Float32Array<ArrayBuffer> {
  const n = 4096;
  const c = new Float32Array(n);
  const knee = 0.7;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a <= knee ? a : knee + (CEILING - knee) * Math.tanh((a - knee) / (CEILING - knee));
    c[i] = Math.sign(x) * y;
  }
  return c;
}

/**
 * Build the mixing graph on any context (real or offline):
 * sfx/music buses -> master -> compressor -> limiter -> soft ceiling -> out,
 * with a shared convolution reverb send.
 */
export function buildEngine(ctx: BaseAudioContext, out: AudioNode = ctx.destination, raw = false): Engine {
  const master = ctx.createGain();
  master.gain.value = MASTER_LEVEL;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.knee.value = 14;
  comp.ratio.value = 5;
  comp.attack.value = 0.004;
  comp.release.value = 0.14;

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 2;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.06;

  const ceiling = ctx.createWaveShaper();
  ceiling.curve = makeCeilingCurve();

  // `raw` skips the dynamics (diagnostics: measure the mix before compression)
  if (raw) master.connect(out);
  else master.connect(comp).connect(limiter).connect(ceiling).connect(out);

  const sfxBus = ctx.createGain();
  const musicBus = ctx.createGain();
  sfxBus.gain.value = busGain(DEFAULT_VOLUMES.sfx, SFX_TRIM);
  musicBus.gain.value = busGain(DEFAULT_VOLUMES.music, MUSIC_TRIM);
  sfxBus.connect(master);
  musicBus.connect(master);

  const wet = ctx.createGain();
  const verb = ctx.createConvolver();
  verb.buffer = makeImpulse(ctx, 1.3);
  const verbOut = ctx.createGain();
  verbOut.gain.value = 0.55;
  wet.connect(verb).connect(verbOut).connect(master);
  // music gets a whisper of the same room
  const musicSend = ctx.createGain();
  musicSend.gain.value = 0.12;
  musicBus.connect(musicSend).connect(wet);

  return {
    ctx,
    master,
    sfxBus,
    musicBus,
    wet,
    noise: makeNoise(ctx),
    key: DEFAULT_KEY,
    sfx: { last: new Map(), voices: [], lastHeal: -1, goldStreak: 0, lastGold: -10 },
    pulse: new Map(),
  };
}

export function setBusLevels(e: Engine, sfx: number, music: number): void {
  const t = e.ctx.currentTime;
  e.sfxBus.gain.setTargetAtTime(busGain(sfx, SFX_TRIM), t, 0.02);
  e.musicBus.gain.setTargetAtTime(busGain(music, MUSIC_TRIM), t, 0.02);
}

// ---------------------------------------------------------------------------------------------
// Runtime (browser) singleton

export const runtime = {
  engine: null as Engine | null,
  sfx: DEFAULT_VOLUMES.sfx,
  music: DEFAULT_VOLUMES.music,
  muted: false,
};

type AudioCtxCtor = new (opts?: AudioContextOptions) => AudioContext;

function ctor(): AudioCtxCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { AudioContext?: AudioCtxCtor; webkitAudioContext?: AudioCtxCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Create the engine on first call (must be inside a user gesture), resume it on later calls. */
export function ensureEngine(): Engine | null {
  if (runtime.engine) return runtime.engine;
  const C = ctor();
  if (!C) return null;
  try {
    const ctx = new C({ latencyHint: 'interactive' });
    runtime.engine = buildEngine(ctx);
    setBusLevels(runtime.engine, runtime.sfx, runtime.music);
    if (runtime.muted) runtime.engine.master.gain.value = 0;
    return runtime.engine;
  } catch {
    return null;
  }
}

export function resumeContext(): void {
  const e = runtime.engine;
  if (!e || runtime.muted) return;
  const ctx = e.ctx as AudioContext;
  if (typeof ctx.resume === 'function' && ctx.state !== 'running') void ctx.resume().catch(() => undefined);
}

export { MASTER_LEVEL };
