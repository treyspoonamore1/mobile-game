import {
  SCALES, arpBars, bassBars, drums, holdBars, loop, mel, rep, withBars, REST_BAR, DRUM_REST,
  type TrackDef,
} from './patterns';

// ---------------------------------------------------------------------------------------------
// CRYPT: A minor, 88 bpm, 16 bars. Mysterious but warm: i-VI-III-VII, then iv-v to turn around.
const cryptRoots = [1, 1, 6, 6, 3, 3, 7, 7, 1, 1, 6, 6, 4, 4, 5, 5];

const cryptLead = [
  REST_BAR,
  REST_BAR,
  REST_BAR,
  REST_BAR,
  '5 - - - | 7 - - - | 8 - - - | 7 - 5 -',
  '3 - - - | - - - - | 5 - 3 - | 2 - - -',
  '2 - - - | 4 - - - | 7 - - - | 4 - 2 -',
  '7 - - - | - - - - | - - - - | - - - -',
  '5 - - 6 | 8 - - - | 7 - - - | 5 - 3 -',
  '3 - - - | 5 - - - | 1 - - - | - - - -',
  '6 - - - | 8 - - - | 6 - 5 - | 3 - 1 -',
  '3 - - - | - - - - | - - - - | - - - -',
  '4 - - - | 6 - - - | 8 - - - | 6 - 4 -',
  '6 - - - | 4 - - - | 1 - - - | - - - -',
  '5 - - - | 7 - - - | 9 - - - | 7 - 5 -',
  '7 - - - | - - 6 - | 5 - - - | - - - -',
];

export const crypt: TrackDef = {
  id: 'crypt',
  bpm: 88,
  swing: 0,
  root: 57,
  scale: SCALES.minor,
  bars: 16,
  gain: 0.92,
  parts: [
    mel('pad', 'triangle', holdBars(cryptRoots), {
      vol: 0.075, chord: [0, 2, 4], a: 0.5, r: 0.9, lp: 1300, det: 9, gate: 1,
    }),
    mel('bass', 'triangle', bassBars(cryptRoots, 'x-----x-x---f---'), {
      vol: 0.17, oct: -1, a: 0.012, d: 0.3, s: 0.6, r: 0.25, gate: 0.9, lp: 700,
    }),
    mel('arp', 'pulse', [
      ...arpBars(cryptRoots.slice(0, 4), '0---2---4---2---'),
      ...arpBars(cryptRoots.slice(4, 16), '0-2-4-2-3-2-4-2-'),
    ], { vol: 0.045, oct: 1, a: 0.004, d: 0.16, s: 0, r: 0.2, lp: 2000, lpEnv: 2.5 }),
    mel('lead', 'square', cryptLead, {
      vol: 0.055, oct: 1, a: 0.03, d: 0.25, s: 0.65, r: 0.35, lp: 1700, det: 6, gate: 0.95,
    }),
    drums('kick', withBars(rep('k-------k-------', 16), { 0: 'k---------------', 15: 'k-------k---k---' }), 0.14),
    drums('rim', loop(['----------------', '------------c---'], 8), 0.05),
    drums('hat', rep('--h---h---h---h-', 16).map((b, i) => (i < 4 ? DRUM_REST : b)), 0.025),
  ],
};

// ---------------------------------------------------------------------------------------------
// FUNGAL: G major, 124 bpm, 16 bars, swung. Bouncy staccato with sparkly plinks.
const fungalRoots = [1, 4, 1, 5, 1, 4, 5, 1, 6, 4, 1, 5, 6, 4, 5, 1];

const fungalLead = [
  '1 - 3 - | 5 - 3 - | 5 - 8 - | 5 - 3 -',
  '4 - 6 - | 8 - 6 - | 4 - 6 - | 8 - - -',
  '3 - 5 - | 8 - 5 - | 3 - 5 - | 3 - 1 -',
  '2 - 4 - | 5 - 7 - | 9 - 7 - | 5 - - -',
  '1 - 3 - | 5 - 3 - | 5 - 8 - | 10 - 8 -',
  '8 - 6 - | 4 - 6 - | 8 - 6 - | 4 - - -',
  '7 - 5 - | 7 - 9 - | 7 - 5 - | 2 - 5 -',
  '8 - - - | 5 - 3 - | 1 - 3 - | 5 - - -',
  '6 - 8 - | 10 - 8 - | 6 - 8 - | 10 - - -',
  '4 - 6 - | 8 - 6 - | 8 - 6 - | 4 - - -',
  '5 - 3 - | 5 - 8 - | 10 - 8 - | 5 - 3 -',
  '7 - 5 - | 2 - 5 - | 7 - 9 - | 7 - - -',
  '10 - 8 - | 6 - 8 - | 10 - 12 - | 10 - 8 -',
  '8 - 6 - | 4 - 6 - | 8 - 10 - | 8 - - -',
  '9 - 7 - | 5 - 7 - | 9 - 7 - | 5 - 2 -',
  '1 - 3 - | 5 - 8 - | 5 - 3 - | 1 - - -',
];

export const fungal: TrackDef = {
  id: 'fungal',
  bpm: 124,
  swing: 0.35,
  root: 55,
  scale: SCALES.major,
  bars: 16,
  gain: 1.1,
  parts: [
    mel('bed', 'triangle', holdBars(fungalRoots), {
      vol: 0.04, chord: [0, 2, 4], oct: 0, a: 0.15, r: 0.4, lp: 1400, det: 8, gate: 1,
    }),
    mel('bass', 'triangle', bassBars(fungalRoots, 'x--o--x-x--o--f-'), {
      vol: 0.2, oct: -1, a: 0.006, d: 0.12, s: 0.3, r: 0.08, gate: 0.5, lp: 900,
    }),
    mel('stab', 'square', bassBars(fungalRoots, '--x---x---x---x-'), {
      vol: 0.04, chord: [0, 2, 4], a: 0.004, d: 0.08, s: 0.2, r: 0.06, gate: 0.4, lp: 1800,
    }),
    mel('lead', 'pulse', fungalLead, {
      vol: 0.07, oct: 1, a: 0.006, d: 0.12, s: 0.45, r: 0.1, gate: 0.55, lp: 3200, accent: 0.3,
    }),
    mel('plink', 'sine', arpBars(fungalRoots, '--0---2---4---2-'), {
      vol: 0.045, oct: 1, a: 0.003, d: 0.2, s: 0, r: 0.3,
    }),
    drums('kick', rep('k-----k-k-------', 16), 0.12),
    drums('rim', rep('----c-------c---', 16), 0.07),
    drums('hat', rep('h-h-h-h-h-h-h-h-', 16), 0.035),
  ],
};

// ---------------------------------------------------------------------------------------------
// FROST: E lydian, 72 bpm, 16 bars. Sparse, glassy, long tails.
const frostRoots = [1, 1, 2, 2, 6, 6, 5, 5, 1, 1, 2, 2, 6, 6, 5, 5];

const frostLead = [
  '8 - - - | - - - - | 7 - - - | - - - -',
  '5 - - - | - - - - | - - - - | - - - -',
  '6 - - - | - - - - | 4 - - - | - - - -',
  '2 - - - | - - - - | - - - - | - - - -',
  '3 - - - | - - - - | 6 - - - | - - 8 -',
  '10 - - - | - - - - | - - - - | - - - -',
  '9 - - - | - - 7 - | 5 - - - | - - - -',
  '7 - - - | - - - - | 5 - - - | - - - -',
  '5 - - 7 | 8 - - - | 10 - - - | - - - -',
  '12 - - - | - - 10 - | 8 - - - | - - - -',
  '11 - - - | - - - - | 9 - - - | 6 - - -',
  '4 - - - | - - - - | 2 - - - | - - - -',
  '6 - - - | - - 8 - | 10 - - - | 8 - 6 -',
  '3 - - - | - - - - | 1 - - - | - - - -',
  '5 - - - | 7 - - - | 9 - - - | 7 - - -',
  '5 - - - | - - - - | - - - - | - - - -',
];

export const frost: TrackDef = {
  id: 'frost',
  bpm: 72,
  swing: 0,
  root: 52,
  scale: SCALES.lydian,
  bars: 16,
  gain: 0.63,
  parts: [
    mel('pad', 'sine', holdBars(frostRoots), {
      vol: 0.085, chord: [0, 2, 4, 7], a: 1.0, r: 1.6, det: 7, gate: 1,
    }),
    mel('bass', 'sine', bassBars(frostRoots, 'x_______________'), {
      vol: 0.16, oct: -1, a: 0.05, d: 0.6, s: 0.7, r: 0.7, gate: 1,
    }),
    mel('bells', 'sine', [
      ...arpBars(frostRoots.slice(0, 8), '0---2---4---3---'),
      ...arpBars(frostRoots.slice(8, 16), '0-----2---4---2-'),
    ], { vol: 0.05, oct: 2, a: 0.003, d: 0.9, s: 0, r: 1.2 }),
    mel('lead', 'triangle', frostLead, {
      vol: 0.07, oct: 1, a: 0.02, d: 0.6, s: 0.3, r: 1.0, lp: 2400, det: 4, gate: 0.9,
    }),
    drums('hat', rep('h---------------', 16).map((b, i) => (i % 2 ? DRUM_REST : b)), 0.03),
    drums('rim', rep('--------------c-', 16).map((b, i) => (i % 4 === 3 ? b : DRUM_REST)), 0.04),
  ],
};
