/**
 * Lifeline audio. Pure WebAudio synthesis (no asset files): SFX, a step-sequenced music engine and
 * haptics. Everything is safe to call before `unlockAudio()` and outside a browser (no-ops).
 * Audio is outside the deterministic sim, so it freely uses Math.random and the audio clock.
 */
import { MASTER_LEVEL, ensureEngine, resumeContext, runtime, setBusLevels } from './context';
import { MusicPlayer } from './music';
import { type MusicTrack } from './patterns';
import { perfectChime } from './sfx_cues';
import { SFX, playSfxOn, type SfxName, type SfxOpts } from './sfx';

export type { SfxName } from './sfx';
export type { MusicTrack } from './patterns';
export { haptic, setHapticsEnabled } from './haptics';
export type { HapticKind } from './haptics';

let player: MusicPlayer | null = null;
/** The track the game asked for; remembered so music starts once audio is unlocked. */
let wanted: MusicTrack | null = null;

const MUTE_FADE = 0.06;

function applyWanted(): void {
  const e = runtime.engine;
  if (!e) return;
  player ??= new MusicPlayer(e);
  player.audible = () => !runtime.muted && runtime.music > 0.001;
  player.set(wanted);
}

/** Call from the first pointerdown / touchend. Creates the AudioContext and resumes it. */
export function unlockAudio(): void {
  try {
    const e = ensureEngine();
    if (!e) return;
    resumeContext();
    applyWanted();
  } catch {
    /* audio is optional */
  }
}

export function playSfx(name: SfxName, opts?: SfxOpts): void {
  const e = runtime.engine;
  if (!e || runtime.muted) return;
  try {
    resumeContext();
    playSfxOn(e, name, opts);
  } catch {
    /* never let audio break the game */
  }
}

/** The Perfect Ward chime: climbs one scale degree of the current track's key per consecutive Perfect. */
export function playPerfect(streak: number): void {
  const e = runtime.engine;
  if (!e || runtime.muted) return;
  try {
    resumeContext();
    const t = e.ctx.currentTime;
    // same 50 ms rate limit as the 'perfect' SFX
    const st = e.sfx;
    const last = st.last.get('perfect');
    if (last !== undefined && t - last < 0.05) return;
    st.last.set('perfect', t);
    perfectChime(e, t, SFX.perfect.trim, streak <= 1 ? 1 : streak);
  } catch {
    /* ignore */
  }
}

/** Crossfade to a track (~1 s). Same track is a no-op; null fades the music out. */
export function setMusic(track: MusicTrack | null): void {
  wanted = track;
  const e = runtime.engine;
  if (!e) return;
  try {
    applyWanted();
  } catch {
    /* ignore */
  }
}

export function setVolumes(v: { sfx: number; music: number }): void {
  runtime.sfx = Math.max(0, Math.min(1, v.sfx));
  runtime.music = Math.max(0, Math.min(1, v.music));
  const e = runtime.engine;
  if (e) setBusLevels(e, runtime.sfx, runtime.music);
}

let suspendTimer: ReturnType<typeof setTimeout> | null = null;

/** Mute fades the master out and suspends the context (saves battery when the tab is hidden). */
export function setMuted(m: boolean): void {
  runtime.muted = m;
  const e = runtime.engine;
  if (!e) return;
  try {
    const ctx = e.ctx as AudioContext;
    const t = ctx.currentTime;
    if (suspendTimer !== null) clearTimeout(suspendTimer);
    suspendTimer = null;
    e.master.gain.cancelScheduledValues(t);
    if (m) {
      e.master.gain.setTargetAtTime(0, t, MUTE_FADE / 3);
      suspendTimer = setTimeout(() => {
        if (runtime.muted && typeof ctx.suspend === 'function') void ctx.suspend().catch(() => undefined);
      }, 250);
    } else {
      if (ctx.state !== 'running' && typeof ctx.resume === 'function') void ctx.resume().catch(() => undefined);
      e.master.gain.setTargetAtTime(MASTER_LEVEL, t, MUTE_FADE / 3);
    }
  } catch {
    /* ignore */
  }
}
