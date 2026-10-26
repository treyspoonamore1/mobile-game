import type { Engine } from './context';
import { STEPS_PER_BAR, type MusicTrack } from './patterns';
import { compileTrack, keyOf, type CompiledTrack, type NoteEvent } from './tracks';
import { playDrum, playNote } from './voices';

/** How far ahead of the audio clock notes are scheduled, and how often the scheduler wakes. */
export const LOOKAHEAD = 0.5;
export const TICK_MS = 100;
export const CROSSFADE = 1.0;

/**
 * Lookahead step sequencer. Step times are computed from an absolute start time and a running step
 * counter (no drift), and the pattern index wraps, so the loop is seamless: notes that ring across
 * the loop point are just nodes already scheduled on the audio clock.
 */
export class Sequencer {
  readonly out: GainNode;
  private n = 0;

  constructor(
    private readonly e: Engine,
    readonly track: CompiledTrack,
    private readonly t0: number,
  ) {
    this.out = e.ctx.createGain();
    this.out.connect(e.musicBus);
  }

  timeOf(n: number): number {
    const { def, stepDur } = this.track;
    const pos = n % 4;
    const swing = pos === 2 || pos === 3 ? def.swing : 0;
    return this.t0 + (n + swing) * stepDur;
  }

  /** Schedule every step that starts before `until`. Steps already in the past (> 30 ms) are skipped. */
  pump(until: number, audible: boolean, now: number): void {
    const total = this.track.totalSteps;
    for (;;) {
      const t = this.timeOf(this.n);
      if (t >= until) return;
      if (audible && t >= now - 0.03) this.fire(this.n % total, Math.max(t, now));
      this.n++;
    }
  }

  private fire(i: number, t: number): void {
    const { def, stepDur } = this.track;
    const beat = i % STEPS_PER_BAR;
    for (const cp of this.track.parts) {
      const ev = cp.events[i];
      if (!ev) continue;
      const p = cp.part;
      if (p.kind === 'drums') {
        playDrum(this.e, this.out, ev as string, t, p.vol * def.gain);
        continue;
      }
      const note = ev as NoteEvent;
      const acc = p.accent ?? 0;
      const vel = 1 - acc * (beat % 8 === 0 ? 0 : beat % 4 === 0 ? 0.25 : beat % 2 === 0 ? 0.5 : 0.7);
      playNote(this.e, this.out, { ...p, vol: p.vol * def.gain }, t, note.midis, note.steps * stepDur, vel);
    }
  }

  fadeIn(now: number, seconds: number): void {
    this.out.gain.setValueAtTime(0, now);
    this.out.gain.linearRampToValueAtTime(1, now + seconds);
  }

  fadeOut(now: number, seconds: number): void {
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + seconds);
  }

  dispose(): void {
    try {
      this.out.disconnect();
    } catch {
      /* already disconnected */
    }
  }
}

/** Owns the current track, the scheduler timer and crossfades for one engine. */
export class MusicPlayer {
  private cur: { id: MusicTrack; seq: Sequencer } | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private fading = new Set<Sequencer>();
  /** Scheduling is skipped (but the clock keeps advancing) while this returns false. */
  audible: () => boolean = () => true;

  constructor(private readonly e: Engine) {}

  get id(): MusicTrack | null {
    return this.cur?.id ?? null;
  }

  set(id: MusicTrack | null): void {
    if (id === this.id) return;
    const now = this.e.ctx.currentTime;
    if (this.cur) {
      const old = this.cur.seq;
      old.fadeOut(now, CROSSFADE);
      this.fading.add(old);
      setTimeout(() => {
        this.fading.delete(old);
        old.dispose();
      }, (CROSSFADE + 0.4) * 1000);
      this.cur = null;
    }
    this.e.key = keyOf(id);
    if (id) {
      const seq = new Sequencer(this.e, compileTrack(id), now + 0.06);
      seq.fadeIn(now, this.fading.size > 0 ? CROSSFADE : 0.4);
      this.cur = { id, seq };
      this.tick();
      this.start();
    } else {
      this.stop();
    }
  }

  private start(): void {
    if (this.timer === null) this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  tick(): void {
    if (!this.cur) return this.stop();
    const now = this.e.ctx.currentTime;
    this.cur.seq.pump(now + LOOKAHEAD, this.audible(), now);
  }
}
