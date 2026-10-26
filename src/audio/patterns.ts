/**
 * Track data model and a tiny pattern DSL for the step sequencer.
 *
 * Melodic bars are 16 whitespace-separated tokens (one per 16th note):
 *   `-`      rest
 *   `_`      tie (hold the previous note)
 *   `N`      scale degree: 1..7 = first octave, 8..14 = next octave up, 0..-6 = below.
 *            Optional `#` or `b` suffix shifts one semitone (e.g. `5#`).
 * `|` is cosmetic and ignored, so bars can be grouped by beat.
 *
 * Drum bars are 16 characters:  k kick, s snare, c rim click, h closed hat, o open hat,
 * t tom, b deep boom, `-` rest.
 */

export type WaveName = 'sine' | 'triangle' | 'square' | 'saw' | 'pulse' | 'pulse12';
export type MusicTrack = 'crypt' | 'fungal' | 'frost' | 'ember' | 'abyss' | 'boss' | 'menu';

export const STEPS_PER_BAR = 16;

export const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
} as const satisfies Record<string, readonly number[]>;

export interface MelodicPart {
  kind: 'melodic';
  id: string;
  wave: WaveName;
  /** Peak gain of one note (before the track trim). */
  vol: number;
  /** Octave shift applied to every degree. */
  oct: number;
  /** Envelope in seconds: attack, decay (to sustain level), sustain level 0..1, release. */
  a: number;
  d: number;
  s: number;
  r: number;
  /** Fraction of the written note length that is held before release. */
  gate: number;
  /** Lowpass cutoff in Hz; `lpEnv` multiplies it at note start and decays back (pluck/brightness). */
  lp?: number;
  lpEnv?: number;
  /** Detune (cents) of a second, chorus oscillator. */
  det?: number;
  /** Degree offsets stacked on every note (e.g. [0, 2, 4] = triad). */
  chord?: readonly number[];
  /** Extra emphasis on strong beats (0..1). */
  accent?: number;
  bars: string[];
}

export interface DrumPart {
  kind: 'drums';
  id: string;
  vol: number;
  bars: string[];
}

export type Part = MelodicPart | DrumPart;

export interface TrackDef {
  id: MusicTrack;
  bpm: number;
  /** Delay (in 16th steps, 0..0.67) of the off-beat 8th and the 16th after it. */
  swing: number;
  /** MIDI note of scale degree 1 (before part octave shifts). */
  root: number;
  scale: readonly number[];
  /** Number of bars in the loop (8..16). */
  bars: number;
  /** Per-track trim multiplied into every part volume. */
  gain: number;
  parts: Part[];
}

// ---------------------------------------------------------------------------------------------
// Degree / pitch maths

export function degreeToMidi(root: number, scale: readonly number[], degree: number, acc = 0): number {
  const idx = degree - 1;
  const oct = Math.floor(idx / 7);
  const i = ((idx % 7) + 7) % 7;
  return root + scale[i]! + 12 * oct + acc;
}

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Smallest MIDI note >= minMidi that has the same pitch class as `root`. */
export function tonicAtOrAbove(root: number, minMidi: number): number {
  return root + 12 * Math.ceil((minMidi - root) / 12);
}

// ---------------------------------------------------------------------------------------------
// Parsing

export type StepToken = { kind: 'rest' } | { kind: 'tie' } | { kind: 'note'; degree: number; acc: number };

export function tokenizeBar(bar: string): string[] {
  return bar.replace(/\|/g, ' ').trim().split(/\s+/).filter((s) => s.length > 0);
}

export function parseToken(tok: string): StepToken | null {
  if (tok === '-') return { kind: 'rest' };
  if (tok === '_') return { kind: 'tie' };
  const m = /^(-?\d+)([#b]?)$/.exec(tok);
  if (!m) return null;
  return { kind: 'note', degree: parseInt(m[1]!, 10), acc: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0 };
}

export function drumChars(bar: string): string[] {
  return bar.replace(/[|\s]/g, '').split('');
}

export const DRUM_CHARS = 'kscotbh-';

// ---------------------------------------------------------------------------------------------
// Pattern builders (all return one string per bar)

const toks = (a: (string | number)[]): string => a.join(' ');

/** Bass / stab line from chord roots. rhythm chars: x root, o octave, f fifth, t third, - rest, _ tie. */
export function bassBars(roots: readonly number[], rhythm: string): string[] {
  const offs: Record<string, number> = { x: 0, o: 7, f: 4, t: 2 };
  return roots.map((r) =>
    toks(
      rhythm
        .replace(/[|\s]/g, '')
        .split('')
        .map((c) => (c === '-' || c === '_' ? c : String(r + (offs[c] ?? 0)))),
    ),
  );
}

/** Arpeggio from chord roots. shape chars: 0 root, 1 third, 2 fifth, 3 octave, 4 tenth, - rest, _ tie. */
export function arpBars(roots: readonly number[], shape: string): string[] {
  const offs = [0, 2, 4, 7, 9];
  return roots.map((r) =>
    toks(
      shape
        .replace(/[|\s]/g, '')
        .split('')
        .map((c) => (c === '-' || c === '_' ? c : String(r + (offs[Number(c)] ?? 0)))),
    ),
  );
}

/** Sustained chord root: one note per bar (or per half bar when `perBar` is 2), tied to the end. */
export function holdBars(roots: readonly number[], perBar: 1 | 2 = 1): string[] {
  const len = STEPS_PER_BAR / perBar;
  const seg = (r: number) => [String(r), ...Array<string>(len - 1).fill('_')];
  const out: string[] = [];
  for (let i = 0; i < roots.length; i += perBar) {
    const parts: string[] = [];
    for (let k = 0; k < perBar; k++) parts.push(...seg(roots[i + k]!));
    out.push(toks(parts));
  }
  return out;
}

/** Repeat one bar string n times. */
export const rep = (bar: string, n: number): string[] => Array<string>(n).fill(bar);

/** Repeat a phrase (array of bar strings) n times. */
export const loop = (bars: readonly string[], n: number): string[] => Array.from({ length: n }, () => bars).flat();

/** Replace specific bars (index -> bar string) of a pattern. */
export function withBars(base: readonly string[], over: Record<number, string>): string[] {
  return base.map((b, i) => over[i] ?? b);
}

export const REST_BAR = '- - - - | - - - - | - - - - | - - - -';
export const DRUM_REST = '----------------';

// ---------------------------------------------------------------------------------------------
// Validation (used by tests)

export function validateTrack(t: TrackDef): string[] {
  const errs: string[] = [];
  const err = (m: string) => errs.push(`${t.id}: ${m}`);
  if (t.bars < 8 || t.bars > 16) err(`bars ${t.bars} outside 8..16`);
  if (t.bpm < 50 || t.bpm > 180) err(`bpm ${t.bpm} outside 50..180`);
  if (t.scale.length !== 7) err('scale must have 7 notes');
  if (t.swing < 0 || t.swing > 0.67) err('swing outside 0..0.67');
  if (t.root < 36 || t.root > 72) err('root outside 36..72');
  if (t.gain <= 0 || t.gain > 1.5) err('gain outside 0..1.5');
  if (t.parts.length === 0) err('no parts');
  for (const p of t.parts) {
    const who = `${t.id}/${p.id}`;
    if (p.bars.length !== t.bars) err(`${who} has ${p.bars.length} bars, expected ${t.bars}`);
    if (p.vol <= 0 || p.vol > 1) err(`${who} vol outside (0,1]`);
    p.bars.forEach((bar, bi) => {
      if (p.kind === 'drums') {
        const cs = drumChars(bar);
        if (cs.length !== STEPS_PER_BAR) err(`${who} bar ${bi} has ${cs.length} steps`);
        for (const c of cs) if (!DRUM_CHARS.includes(c)) err(`${who} bar ${bi} bad drum char '${c}'`);
        return;
      }
      const ts = tokenizeBar(bar);
      if (ts.length !== STEPS_PER_BAR) err(`${who} bar ${bi} has ${ts.length} steps`);
      ts.forEach((tok, si) => {
        const parsed = parseToken(tok);
        if (!parsed) return err(`${who} bar ${bi} step ${si} bad token '${tok}'`);
        if (parsed.kind !== 'note') return;
        const offsets = p.chord ?? [0];
        for (const o of offsets) {
          const m = degreeToMidi(t.root, t.scale, parsed.degree + o, parsed.acc) + 12 * p.oct;
          if (m < 28 || m > 100) err(`${who} bar ${bi} step ${si} midi ${m} out of range 28..100`);
        }
      });
    });
    if (p.kind === 'melodic') {
      if (p.a < 0 || p.d < 0 || p.r <= 0 || p.s < 0 || p.s > 1) err(`${who} bad envelope`);
      // a tie must follow a note (wrapping around the loop)
      const flat = p.bars.flatMap(tokenizeBar);
      flat.forEach((tok, i) => {
        if (tok !== '_') return;
        for (let k = 1; k < flat.length; k++) {
          const prev = flat[(i - k + flat.length * 2) % flat.length]!;
          if (prev === '-') return err(`${who} step ${i} tie follows a rest`);
          if (prev !== '_') break;
        }
      });
    }
  }
  return errs;
}

// ---------------------------------------------------------------------------------------------
// Part constructors with sensible defaults

type MelOpts = Partial<Omit<MelodicPart, 'kind' | 'id' | 'wave' | 'bars'>>;

export function mel(id: string, wave: WaveName, bars: string[], o: MelOpts = {}): MelodicPart {
  return { kind: 'melodic', id, wave, bars, vol: 0.1, oct: 0, a: 0.01, d: 0.1, s: 1, r: 0.15, gate: 0.9, ...o };
}

export function drums(id: string, bars: string[], vol = 0.1): DrumPart {
  return { kind: 'drums', id, bars, vol };
}
