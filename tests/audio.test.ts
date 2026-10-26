import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SCALES, arpBars, bassBars, degreeToMidi, drumChars, holdBars, midiToFreq, parseToken, tokenizeBar,
  tonicAtOrAbove, validateTrack, STEPS_PER_BAR,
} from '../src/audio/patterns';
import { TRACKS, TRACK_IDS, compileTrack } from '../src/audio/tracks';
import { SFX, SFX_NAMES, playSfxOn, MAX_VOICES } from '../src/audio/sfx';
import { buildEngine } from '../src/audio/context';
import { HAPTIC_PATTERNS } from '../src/audio/haptics';

// ---------------------------------------------------------------------------------------------
// A recording stand-in for WebAudio so every code path can run in Node.

class FakeParam {
  value = 0;
  setValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
  setTargetAtTime() { return this; }
  cancelScheduledValues() { return this; }
}
const PARAMS = new Set(['gain', 'frequency', 'detune', 'Q', 'threshold', 'knee', 'ratio', 'attack', 'release', 'pan']);
const made = { nodes: 0, oscillators: 0, sources: 0, starts: 0 };

function fakeNode(kind: string): any {
  made.nodes++;
  if (kind === 'oscillator') made.oscillators++;
  if (kind === 'source') made.sources++;
  const target: Record<string, unknown> = {};
  return new Proxy(target, {
    get(t, p: string) {
      if (p in t) return t[p];
      if (p === 'connect') return (d: unknown) => d;
      if (p === 'start') return () => { made.starts++; };
      if (PARAMS.has(p)) return (t[p] = new FakeParam());
      return () => undefined;
    },
    set(t, p: string, v) {
      t[p] = v;
      return true;
    },
  });
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';
  destination = fakeNode('destination');
  constructor(public opts?: unknown) {
    FakeAudioContext.instances.push(this);
  }
  createGain() { return fakeNode('gain'); }
  createOscillator() { return fakeNode('oscillator'); }
  createBufferSource() { return fakeNode('source'); }
  createBiquadFilter() { return fakeNode('filter'); }
  createDynamicsCompressor() { return fakeNode('comp'); }
  createWaveShaper() { return fakeNode('shaper'); }
  createConvolver() { return fakeNode('convolver'); }
  createPeriodicWave() { return {}; }
  createBuffer(ch: number, len: number) {
    return { length: len, numberOfChannels: ch, getChannelData: () => new Float32Array(len) };
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}

const fakeCtx = () => new FakeAudioContext() as unknown as BaseAudioContext;

// ---------------------------------------------------------------------------------------------

describe('track data', () => {
  it('has all seven tracks', () => {
    expect([...TRACK_IDS].sort()).toEqual(['abyss', 'boss', 'crypt', 'ember', 'frost', 'fungal', 'menu']);
  });

  for (const id of TRACK_IDS) {
    describe(id, () => {
      const t = TRACKS[id];
      it('is well formed', () => {
        expect(validateTrack(t)).toEqual([]);
      });
      it('has 8-16 bars and every part has exactly that many 16-step bars', () => {
        expect(t.bars).toBeGreaterThanOrEqual(8);
        expect(t.bars).toBeLessThanOrEqual(16);
        for (const p of t.parts) {
          expect(p.bars).toHaveLength(t.bars);
          for (const bar of p.bars) {
            const n = p.kind === 'drums' ? drumChars(bar).length : tokenizeBar(bar).length;
            expect(n).toBe(STEPS_PER_BAR);
          }
        }
      });
      it('compiles to one event slot per step, with notes in a playable range', () => {
        const c = compileTrack(id);
        expect(c.totalSteps).toBe(t.bars * STEPS_PER_BAR);
        let notes = 0;
        for (const cp of c.parts) {
          expect(cp.events).toHaveLength(c.totalSteps);
          for (const ev of cp.events) {
            if (ev && typeof ev === 'object') {
              notes++;
              expect(ev.steps).toBeGreaterThanOrEqual(1);
              for (const m of ev.midis) {
                expect(m).toBeGreaterThanOrEqual(28);
                expect(m).toBeLessThanOrEqual(100);
              }
            }
          }
        }
        expect(notes).toBeGreaterThan(20);
      });
      it('loops: the loop point is on a bar line and lasts 10-75 s', () => {
        const c = compileTrack(id);
        const sec = c.totalSteps * c.stepDur;
        expect(sec).toBeGreaterThan(10);
        expect(sec).toBeLessThan(75);
      });
    });
  }

  it('every track has a distinct feel (tempo or key or mode)', () => {
    const sig = TRACK_IDS.map((id) => `${TRACKS[id].bpm}/${TRACKS[id].root % 12}/${TRACKS[id].scale.join('')}`);
    expect(new Set(sig).size).toBe(TRACK_IDS.length);
    const bpms = TRACK_IDS.map((id) => TRACKS[id].bpm);
    expect(TRACKS.boss.bpm).toBeGreaterThan(Math.max(...bpms.filter((b) => b !== TRACKS.boss.bpm)) - 1);
    expect(TRACKS.frost.bpm).toBeLessThan(TRACKS.crypt.bpm);
  });

  it('validator catches broken data', () => {
    const bad = { ...TRACKS.menu, parts: TRACKS.menu.parts.map((p) => ({ ...p, bars: p.bars.slice(1) })) };
    expect(validateTrack(bad).length).toBeGreaterThan(0);
    const badTok = { ...TRACKS.menu, parts: [{ ...TRACKS.menu.parts[0]!, bars: TRACKS.menu.parts[0]!.bars.map(() => '1 x') }] };
    expect(validateTrack(badTok).length).toBeGreaterThan(0);
  });
});

describe('pattern helpers', () => {
  it('parses tokens', () => {
    expect(parseToken('-')).toEqual({ kind: 'rest' });
    expect(parseToken('_')).toEqual({ kind: 'tie' });
    expect(parseToken('5')).toEqual({ kind: 'note', degree: 5, acc: 0 });
    expect(parseToken('-2')).toEqual({ kind: 'note', degree: -2, acc: 0 });
    expect(parseToken('4#')).toEqual({ kind: 'note', degree: 4, acc: 1 });
    expect(parseToken('7b')).toEqual({ kind: 'note', degree: 7, acc: -1 });
    expect(parseToken('x')).toBeNull();
  });

  it('maps degrees to midi across octaves', () => {
    const r = 57;
    const s = SCALES.minor;
    expect(degreeToMidi(r, s, 1)).toBe(57);
    expect(degreeToMidi(r, s, 3)).toBe(60);
    expect(degreeToMidi(r, s, 8)).toBe(69);
    expect(degreeToMidi(r, s, 0)).toBe(55);
    expect(degreeToMidi(r, s, 15)).toBe(81);
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
    expect(tonicAtOrAbove(57, 70)).toBe(81);
    expect(tonicAtOrAbove(60, 60)).toBe(60);
  });

  it('builds bass/arp/hold bars with 16 steps', () => {
    for (const bar of [...bassBars([1, 4], 'x-----x-x---f---'), ...arpBars([1, 5], '0-2-4-2-3-2-4-2-'), ...holdBars([1, 4])]) {
      expect(tokenizeBar(bar)).toHaveLength(16);
    }
    expect(holdBars([1, 2, 3, 4], 2)).toHaveLength(2);
    expect(tokenizeBar(holdBars([1, 2], 2)[0]!)).toHaveLength(16);
  });
});

describe('sfx table', () => {
  it('covers every SfxName with sane limits', () => {
    expect(SFX_NAMES).toHaveLength(30);
    for (const n of SFX_NAMES) {
      const d = SFX[n];
      expect(d, n).toBeDefined();
      expect(d.gap).toBeGreaterThanOrEqual(0.03);
      expect(d.max).toBeGreaterThanOrEqual(1);
      expect(d.len).toBeGreaterThan(0.05);
    }
    expect(SFX.hit_enemy.gap).toBeGreaterThanOrEqual(0.06);
    expect(SFX.heal.gap).toBeGreaterThanOrEqual(0.04);
  });

  it('plays every sound on a fake engine without throwing', () => {
    for (const key of ['crypt', 'frost', 'boss'] as const) {
      const ctx = fakeCtx();
      const e = buildEngine(ctx);
      e.key = { root: TRACKS[key].root, scale: TRACKS[key].scale };
      let t = 0;
      for (const n of SFX_NAMES) {
        expect(playSfxOn(e, n, { pitch: 1.1, vol: 0.9 }, (t += 1))).toBe(true);
      }
    }
    expect(made.oscillators).toBeGreaterThan(100);
  });

  it('rate-limits: hit_enemy 60 ms, heal 40 ms', () => {
    const e = buildEngine(fakeCtx());
    expect(playSfxOn(e, 'hit_enemy', {}, 1)).toBe(true);
    expect(playSfxOn(e, 'hit_enemy', {}, 1.03)).toBe(false);
    expect(playSfxOn(e, 'hit_enemy', {}, 1.07)).toBe(true);
    expect(playSfxOn(e, 'heal', {}, 2)).toBe(true);
    expect(playSfxOn(e, 'heal', {}, 2.02)).toBe(false);
    expect(playSfxOn(e, 'heal', {}, 2.05)).toBe(true);
  });

  it('limits voices under a burst of taps', () => {
    const e = buildEngine(fakeCtx());
    let played = 0;
    for (let t = 0; t < 1; t += 0.002) {
      for (const n of ['heal', 'hit_enemy', 'hit_hero', 'gold', 'ui_tap', 'poison', 'dodge'] as const) {
        if (playSfxOn(e, n, {}, t)) played++;
        expect(e.sfx.voices.length).toBeLessThanOrEqual(MAX_VOICES + 2);
      }
    }
    // 1 s of 500 Hz tapping can only produce about 1/gap events per sound
    expect(played).toBeLessThan(1 / 0.04 + 1 / 0.06 + 1 / 0.07 + 1 / 0.06 + 1 / 0.03 + 1 / 0.15 + 1 / 0.1 + 7);
  });

  it('never drops high-priority cues because of crowding', () => {
    const e = buildEngine(fakeCtx());
    for (let i = 0; i < MAX_VOICES + 4; i++) e.sfx.voices.push({ name: `x${i}`, end: 99, prio: 0 });
    expect(playSfxOn(e, 'heal', {}, 1)).toBe(false);
    expect(playSfxOn(e, 'save', {}, 1)).toBe(true);
    expect(playSfxOn(e, 'perfect', {}, 1)).toBe(true);
  });
});

describe('public API in Node (no AudioContext)', () => {
  it('every export is callable without throwing before unlock', async () => {
    vi.resetModules();
    const a = await import('../src/audio/index');
    expect(() => {
      a.playSfx('heal');
      a.playSfx('perfect', { pitch: 1.2, vol: 0.5 });
      a.playPerfect(0);
      a.playPerfect(1);
      a.playPerfect(5);
      a.setMusic('boss');
      a.setMusic(null);
      a.setVolumes({ sfx: 0.5, music: 0.2 });
      a.setVolumes({ sfx: 7, music: -1 });
      a.setMuted(true);
      a.setMuted(false);
      a.unlockAudio();
      a.setHapticsEnabled(false);
      a.setHapticsEnabled(true);
      for (const k of Object.keys(HAPTIC_PATTERNS)) a.haptic(k as never);
    }).not.toThrow();
  });
});

describe('public API with a fake AudioContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    made.nodes = made.oscillators = made.sources = made.starts = 0;
    FakeAudioContext.instances = [];
    vi.stubGlobal('window', { AudioContext: FakeAudioContext });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('is a no-op until unlocked, then plays', async () => {
    const a = await import('../src/audio/index');
    a.playSfx('heal');
    expect(made.oscillators).toBe(0);
    a.unlockAudio();
    a.unlockAudio(); // idempotent
    a.playSfx('heal');
    expect(made.oscillators).toBeGreaterThan(0);
  });

  it('plays every sfx and the perfect streak', async () => {
    const a = await import('../src/audio/index');
    a.unlockAudio();
    for (const n of SFX_NAMES) a.playSfx(n);
    for (let s = 0; s <= 12; s++) a.playPerfect(s);
    expect(made.oscillators).toBeGreaterThan(50);
  });

  it('remembers the wanted track across unlock, schedules ahead on the clock, and loops', async () => {
    const a = await import('../src/audio/index');
    a.setMusic('fungal'); // before unlock: remembered
    expect(made.oscillators).toBe(0);
    a.unlockAudio();
    const afterStart = made.oscillators;
    expect(afterStart).toBeGreaterThan(0);
    // advance the audio clock past a full loop in 100 ms scheduler ticks
    const loop = compileTrack('fungal');
    const sec = loop.totalSteps * loop.stepDur;
    const ctx = FakeAudioContext.instances[0]!;
    for (let i = 0; i < Math.ceil((sec + 2) * 10); i++) {
      ctx.currentTime += 0.1;
      vi.advanceTimersByTime(100);
    }
    expect(made.oscillators).toBeGreaterThan(afterStart);
    a.setMusic('boss'); // crossfade
    vi.advanceTimersByTime(2000);
    a.setMusic('boss'); // same track no-op
    a.setMusic(null);
    vi.advanceTimersByTime(2000);
  });

  it('mutes and unmutes', async () => {
    const a = await import('../src/audio/index');
    a.unlockAudio();
    a.setMuted(true);
    const before = made.oscillators;
    a.playSfx('heal');
    expect(made.oscillators).toBe(before);
    a.setMuted(false);
    a.playSfx('heal');
    expect(made.oscillators).toBeGreaterThan(before);
    vi.advanceTimersByTime(500);
  });
});

describe('haptics', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('has short, distinct patterns', () => {
    const pats = Object.values(HAPTIC_PATTERNS).map((p) => p.p.join(','));
    expect(new Set(pats).size).toBe(pats.length);
    expect(HAPTIC_PATTERNS.tap.p).toEqual([8]);
    expect(HAPTIC_PATTERNS.perfect.p.length).toBeGreaterThanOrEqual(3); // double pulse
    const total = (k: keyof typeof HAPTIC_PATTERNS) => HAPTIC_PATTERNS[k].p.reduce((x, y) => x + y, 0);
    expect(total('save')).toBeGreaterThan(total('perfect'));
    expect(total('wipe')).toBeGreaterThan(total('save'));
  });

  it('throttles rapid taps and respects the enabled flag', async () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });
    const h = await import('../src/audio/haptics');
    h.haptic('tap');
    h.haptic('tap');
    h.haptic('tap');
    expect(vibrate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    h.haptic('tap');
    expect(vibrate).toHaveBeenCalledTimes(2);
    h.setHapticsEnabled(false);
    expect(vibrate).toHaveBeenLastCalledWith(0);
    const n = vibrate.mock.calls.length;
    h.haptic('perfect');
    expect(vibrate.mock.calls.length).toBe(n);
  });

  it('a light buzz does not cut off a heavy pattern', async () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal('navigator', { vibrate });
    const h = await import('../src/audio/haptics');
    h.haptic('wipe');
    vi.advanceTimersByTime(100);
    h.haptic('tap');
    expect(vibrate).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    h.haptic('tap');
    expect(vibrate).toHaveBeenCalledTimes(2);
  });

  it('is a no-op when vibration is unsupported', async () => {
    vi.stubGlobal('navigator', {});
    const h = await import('../src/audio/haptics');
    expect(() => h.haptic('perfect')).not.toThrow();
  });
});
