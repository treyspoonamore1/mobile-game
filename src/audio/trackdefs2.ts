import {
  SCALES, arpBars, bassBars, drums, holdBars, loop, mel, rep, withBars, REST_BAR, DRUM_REST,
  type TrackDef,
} from './patterns';

// ---------------------------------------------------------------------------------------------
// EMBER: E phrygian, 138 bpm, 16 bars. Driving 8th-note bass, four-on-the-floor, forge hits.
const emberRoots = [1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 7, 7, 6, 6];

const emberLead = [
  '8 - 8 - | 10 - 8 - | 12 - 10 - | 8 - - -',
  '8 - 8 - | 10 - 8 - | 12 - 10 - | 8 - 10 -',
  '12 - 12 - | 10 - 8 - | 12 - 10 - | 8 - - -',
  '8 - 10 - | 12 - 10 - | 8 - 5 - | 8 - - -',
  '9 - 9 - | 11 - 9 - | 13 - 11 - | 9 - - -',
  '9 - 11 - | 13 - 11 - | 9 - 11 - | 13 - - -',
  '12 - 12 - | 10 - 8 - | 10 - 12 - | 8 - - -',
  '8 - 8 - | 10 - 12 - | 15 - 12 - | 10 - 8 -',
  '8 8 - 8 | 10 - 8 - | 12 - 10 8 | 10 - - -',
  '8 8 - 8 | 10 - 8 - | 12 - 10 12 | 15 - - -',
  '12 12 - 12 | 10 - 8 - | 12 - 10 8 | 10 - 8 -',
  '8 - 10 - | 12 - 15 - | 12 - 10 - | 8 - - -',
  '7 - 7 - | 9 - 7 - | 11 - 9 - | 7 - - -',
  '7 - 9 - | 11 - 14 - | 11 - 9 - | 7 - - -',
  '6 - 6 - | 8 - 6 - | 10 - 8 - | 6 - - -',
  '8 - 10 - | 13 - 10 - | 8 - 6 - | 5 - - -',
];

export const ember: TrackDef = {
  id: 'ember',
  bpm: 138,
  swing: 0,
  root: 52,
  scale: SCALES.phrygian,
  bars: 16,
  gain: 1.1,
  parts: [
    mel('bass', 'saw', withBars(bassBars(emberRoots, 'x-x-x-x-x-x-x-x-'), {
      3: bassBars([1], 'x-x-x-x-x-x-xox-')[0]!,
      7: bassBars([1], 'x-x-x-x-x-x-xox-')[0]!,
      15: bassBars([6], 'x-x-x-x-x-x-xox-')[0]!,
    }), { vol: 0.11, oct: -1, a: 0.004, d: 0.1, s: 0.5, r: 0.05, gate: 0.55, lp: 520, lpEnv: 2.2, accent: 0.4 }),
    mel('drone', 'saw', holdBars(emberRoots), {
      vol: 0.04, chord: [0, 4], oct: -1, a: 0.1, r: 0.3, lp: 450, det: 10, gate: 1,
    }),
    mel('stab', 'square', bassBars(emberRoots, '--x---x---x---x-'), {
      vol: 0.035, chord: [0, 2, 4], a: 0.004, d: 0.08, s: 0.3, r: 0.05, gate: 0.45, lp: 1500,
    }),
    mel('lead', 'saw', emberLead, {
      vol: 0.04, oct: 1, a: 0.008, d: 0.15, s: 0.55, r: 0.08, gate: 0.6, lp: 2300, lpEnv: 1.6, det: 7, accent: 0.3,
    }),
    drums('kick', rep('k---k---k---k---', 16), 0.18),
    drums('snare', withBars(rep('----s-------s---', 16), { 7: '----s-------ssss', 15: '----s-----s-ssss' }), 0.1),
    drums('hat', rep('h-h-h-h-h-h-h-ho', 16), 0.04),
    drums('forge', loop(['t---------------', '----------t-----'], 8), 0.1),
  ],
};

// ---------------------------------------------------------------------------------------------
// ABYSS: C locrian, 58 bpm, 16 bars. Low tritone drone, slow pads, lonely bells.
const abyssRoots = [1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 4, 4, 2, 2];

const abyssBells = [
  REST_BAR,
  '- - - - | - - - - | 5 - - - | - - - -',
  REST_BAR,
  '2 - - - | - - - - | - - - - | - - - -',
  '- - - - | - - - - | 3 - - - | - - - -',
  '- - - - | 6 - - - | - - - - | - - - -',
  REST_BAR,
  '5 - - - | - - - - | 2 - - - | - - - -',
  '- - - - | - - - - | 3 - - - | - - 2 -',
  '1 - - - | - - - - | - - - - | - - - -',
  '- - - - | - - 5 - | - - - - | - - - -',
  '- - - - | - - - - | 7 - - - | - - - -',
  '4 - - - | - - - - | - - - - | 6 - - -',
  '- - - - | - - - - | 8 - - - | - - - -',
  '- - - - | 2 - - - | - - - - | 5 - - -',
  '1 - - - | - - - - | - - - - | - - - -',
];

export const abyss: TrackDef = {
  id: 'abyss',
  bpm: 58,
  swing: 0,
  root: 48,
  scale: SCALES.locrian,
  bars: 16,
  gain: 1.12,
  parts: [
    mel('drone', 'saw', holdBars(abyssRoots), {
      vol: 0.08, chord: [0, 4], oct: -1, a: 1.5, r: 2.5, lp: 380, det: 12, gate: 1,
    }),
    mel('pad', 'triangle', holdBars(abyssRoots), {
      vol: 0.06, chord: [0, 2, 4], a: 1.8, r: 2.5, lp: 900, det: 16, gate: 1,
    }),
    mel('bells', 'sine', abyssBells, { vol: 0.07, oct: 2, a: 0.004, d: 1.4, s: 0, r: 2.0 }),
    mel('ghost', 'triangle', [
      ...rep(REST_BAR, 8),
      ...loop(['- - - - | - - - - | - - - - | - - 4 -', REST_BAR], 4),
    ], { vol: 0.04, oct: 1, a: 0.15, d: 0.6, s: 0.2, r: 1.2, lp: 1200, det: 25 }),
    drums('boom', withBars(rep(DRUM_REST, 16), { 0: 'b---------------', 4: 'b---------------', 8: 'b---------------', 12: 'b-------------t-' }), 0.2),
    drums('whisper', rep('--------------h-', 16).map((b, i) => (i % 2 ? b : DRUM_REST)), 0.02),
  ],
};

// ---------------------------------------------------------------------------------------------
// BOSS: F# minor, 156 bpm, 16 bars. Relentless 16ths, stabbing brass, snare fills.
const bossRoots = [1, 1, 6, 7, 1, 1, 6, 7, 4, 4, 6, 7, 1, 6, 7, 7];

const bossD = '13 - - 13 | - 10 - 8 | 6 - - 8 | - 10 - -';
const bossE = '14 - - 14 | - 9 - 11 | 14 - 11 - | 9 - - -';
const bossLead = [
  '8 - - 8 | - 10 - 8 | 12 - - 10 | - 8 - -',
  '8 - - 8 | - 10 - 12 | 15 - 12 - | 10 - 8 -',
  bossD,
  bossE,
  '8 - - 8 | - 10 - 8 | 12 - - 10 | - 8 - -',
  '8 - 10 - | 12 - 15 - | 12 - 10 - | 8 - 10 -',
  bossD,
  '14 - - 14 | - 11 - 9 | 7 - - 9 | - 11 - 14',
  '11 - - 11 | - 13 - 15 | 13 - 11 - | 13 - - -',
  '11 - 13 - | 15 - 13 - | 11 - 13 - | 15 - - -',
  bossD,
  bossE,
  '8 8 - 8 | 10 - 12 - | 15 - 12 - | 10 - 8 -',
  '13 - 10 - | 8 - 10 - | 13 - 10 - | 8 - 6 -',
  '14 - 11 - | 9 - 11 - | 14 - 11 - | 9 - 7 -',
  '14 - - 14 | - 11 - 9 | 7 - 9 - | 11 - 14 -',
];

export const boss: TrackDef = {
  id: 'boss',
  bpm: 156,
  swing: 0,
  root: 54,
  scale: SCALES.minor,
  bars: 16,
  gain: 0.95,
  parts: [
    mel('bass', 'saw', bassBars(bossRoots, 'x-xxx-xxx-xxx-xo'), {
      vol: 0.1, oct: -1, a: 0.003, d: 0.08, s: 0.5, r: 0.04, gate: 0.5, lp: 600, lpEnv: 2, accent: 0.5,
    }),
    mel('arp', 'square', arpBars(bossRoots, '0123210101232101'), {
      vol: 0.022, oct: 1, a: 0.003, d: 0.06, s: 0.3, r: 0.04, gate: 0.5, lp: 2800,
    }),
    mel('brass', 'saw', holdBars(bossRoots), {
      vol: 0.045, chord: [0, 2, 4], a: 0.06, r: 0.2, lp: 1100, det: 9, gate: 1,
    }),
    mel('lead', 'saw', bossLead, {
      vol: 0.04, oct: 1, a: 0.008, d: 0.12, s: 0.6, r: 0.08, gate: 0.65, lp: 2600, lpEnv: 1.5, det: 8, accent: 0.3,
    }),
    drums('kick', rep('k---k---k---k--k', 16), 0.2),
    drums('snare', withBars(rep('----s-------s---', 16), {
      7: '----s---s-s-ssss', 15: '----s-s-s-ssssss',
    }), 0.1),
    drums('hat', rep('h-h-h-h-h-h-h-ho', 16), 0.04),
    drums('tom', withBars(rep(DRUM_REST, 16), { 3: '--------------t-', 11: '--------------t-' }), 0.1),
  ],
};

// ---------------------------------------------------------------------------------------------
// MENU: C major, 84 bpm, 16 bars. Calm: soft arpeggio, warm pad, simple melody, no drums.
const menuRoots = [1, 5, 6, 4, 1, 5, 4, 5, 1, 5, 6, 4, 1, 4, 5, 1];

const menuLead = [
  '5 - - - | - - 3 - | 5 - - - | 8 - - -',
  '7 - - - | - - 5 - | 2 - - - | - - - -',
  '6 - - - | - - 8 - | 10 - - - | 8 - - -',
  '6 - - - | - - 4 - | 6 - - - | - - - -',
  '5 - - - | 3 - - - | 5 - 8 - | 10 - - -',
  '9 - - - | - - 7 - | 5 - - - | - - - -',
  '8 - - - | 6 - - - | 4 - - - | 6 - - -',
  '5 - - - | 7 - - - | 9 - - - | - - - -',
  '10 - - - | - - 8 - | 5 - - - | 8 - - -',
  '7 - - - | 9 - - - | 11 - - - | - - 9 -',
  '10 - - - | 8 - - - | 6 - - - | 8 - - -',
  '6 - - - | 8 - - - | 9 - 8 - | 6 - - -',
  '5 - - - | - - 3 - | 5 - - - | 8 - - -',
  '6 - - - | - - 8 - | 6 - 4 - | 6 - - -',
  '7 - - - | 5 - - - | 2 - - - | 5 - - -',
  '1 - - - | - - - - | - - - - | - - - -',
];

export const menu: TrackDef = {
  id: 'menu',
  bpm: 84,
  swing: 0,
  root: 60,
  scale: SCALES.major,
  bars: 16,
  gain: 0.62,
  parts: [
    mel('pad', 'triangle', holdBars(menuRoots), {
      vol: 0.075, chord: [0, 2, 4], a: 0.6, r: 1.0, lp: 1500, det: 8, gate: 1,
    }),
    mel('bass', 'sine', bassBars(menuRoots, 'x_______x_______'), {
      vol: 0.17, oct: -1, a: 0.02, d: 0.5, s: 0.6, r: 0.4, gate: 0.95,
    }),
    mel('arp', 'triangle', arpBars(menuRoots, '0-2-4-2-0-2-4-2-'), {
      vol: 0.045, oct: 0, a: 0.004, d: 0.2, s: 0, r: 0.25, lp: 2500,
    }),
    mel('lead', 'sine', menuLead, {
      vol: 0.085, oct: 0, a: 0.04, d: 0.4, s: 0.6, r: 0.6, det: 5, gate: 0.95,
    }),
  ],
};
