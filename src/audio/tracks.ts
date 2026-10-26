import type { MusicTrack, TrackDef, Part, MelodicPart } from './patterns';
import { STEPS_PER_BAR, degreeToMidi, drumChars, parseToken, tokenizeBar } from './patterns';
import { crypt, fungal, frost } from './trackdefs1';
import { ember, abyss, boss, menu } from './trackdefs2';

export const TRACKS: Readonly<Record<MusicTrack, TrackDef>> = { crypt, fungal, frost, ember, abyss, boss, menu };
export const TRACK_IDS = Object.keys(TRACKS) as MusicTrack[];

export interface NoteEvent {
  midis: number[];
  /** Length in 16th steps, including ties. */
  steps: number;
}

export interface CompiledPart {
  part: Part;
  /** One entry per step of the loop: a note, a drum hit char, or null. */
  events: (NoteEvent | string | null)[];
}

export interface CompiledTrack {
  def: TrackDef;
  stepDur: number;
  totalSteps: number;
  parts: CompiledPart[];
}

function compileMelodic(def: TrackDef, p: MelodicPart): (NoteEvent | null)[] {
  const flat = p.bars.flatMap(tokenizeBar).map((t) => parseToken(t)!);
  const n = flat.length;
  const offsets = p.chord ?? [0];
  const out: (NoteEvent | null)[] = Array<NoteEvent | null>(n).fill(null);
  for (let i = 0; i < n; i++) {
    const tok = flat[i]!;
    if (tok.kind !== 'note') continue;
    let steps = 1;
    while (steps < n && flat[(i + steps) % n]!.kind === 'tie') steps++;
    out[i] = {
      midis: offsets.map((o) => degreeToMidi(def.root, def.scale, tok.degree + o, tok.acc) + 12 * p.oct),
      steps,
    };
  }
  return out;
}

const cache = new Map<MusicTrack, CompiledTrack>();

export function compileTrack(id: MusicTrack): CompiledTrack {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = TRACKS[id];
  const parts: CompiledPart[] = def.parts.map((part) => ({
    part,
    events: part.kind === 'melodic' ? compileMelodic(def, part) : part.bars.flatMap(drumChars).map((c) => (c === '-' ? null : c)),
  }));
  const out: CompiledTrack = {
    def,
    stepDur: 60 / def.bpm / 4,
    totalSteps: def.bars * STEPS_PER_BAR,
    parts,
  };
  cache.set(id, out);
  return out;
}

export interface KeyInfo {
  root: number;
  scale: readonly number[];
}

export const DEFAULT_KEY: KeyInfo = { root: 60, scale: TRACKS.menu.scale };

export const keyOf = (id: MusicTrack | null): KeyInfo => (id ? { root: TRACKS[id].root, scale: TRACKS[id].scale } : DEFAULT_KEY);
