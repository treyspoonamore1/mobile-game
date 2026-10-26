import { define, bob, put, recolor, type Grid } from './raster.ts';

// Healers (player character): 16x16 facing right. Staff in the front hand at column 12;
// the ornament centre (cast glow origin) is at (12, 2) idle and (12, 1) while casting.

// Robe template: 1 light, 2 main, 3 shade, 4 trim, H hair.
const ROBE: Grid = [
  '................',
  '................',
  '.....112........',
  '....11222.......',
  '....12Hssks.....',
  '....12Hssss.....',
  '....122sS2......',
  '....11224222....',
  '...11224222ss...',
  '...12224223.....',
  '...12224223.....',
  '..122224223.....',
  '..122224223.....',
  '..1222242233....',
  '..333344333.....',
  '................',
];
// Casting: front hand raised one row.
const ROBE_CAST = put(ROBE, 3, 7, [
  '11224222ss',
  '11224222. ',
]);

function staff(body: Grid, top: Grid, y0: number, glow: Grid | null): Grid {
  let g = body;
  for (let y = y0 + top.length; y < 15; y++) {
    if (g[y]![12] === '.') g = put(g, 12, y, ['b']);
  }
  g = put(g, 10, y0, top);
  if (glow) g = put(g, 9, y0 - 1, glow);
  return g;
}

function healer(id: string, colors: Record<string, string>, top: Grid, glowA: Grid, glowB: Grid): void {
  const body = recolor(ROBE, colors);
  const cast = recolor(ROBE_CAST, colors);
  const idle = staff(body, top, 1, null);
  define(id, {
    w: 16, h: 16,
    anims: {
      idle: [idle, bob(idle, 9)],
      cast: [staff(cast, top, 0, glowA), staff(cast, top, 0, glowB)],
    },
  });
}

// Cleric: white and gold, sun staff.
healer('healer_cleric', { 1: 'w', 2: 'l', 3: 'g', 4: 'y', H: 'b' }, [
  ' y.y ',
  'yYYYy',
  '.YwY.',
  'yYYYy',
  ' yby ',
], [
  '   Y   ',
  ' Y   Y ',
  '       ',
  'Y     Y',
  '       ',
  ' Y   Y ',
  '   Y   ',
], [
  'Y  Y  Y',
  ' w   w ',
  '       ',
  'Yw   wY',
  '       ',
  ' w   w ',
  'Y  Y  Y',
]);

// Chronomancer: blue and teal, hourglass staff.
healer('healer_chrono', { 1: 'c', 2: 'u', 3: 'U', 4: 'y', H: 'l' }, [
  'yyyyy',
  ' pYp ',
  '  y  ',
  ' cpc ',
  'yyyyy',
], [
  '   c   ',
  ' c   c ',
  '       ',
  'c     c',
  '       ',
  ' c   c ',
  '   c   ',
], [
  'c  c  c',
  ' w   w ',
  '       ',
  'cw   wc',
  '       ',
  ' w   w ',
  'c  c  c',
]);

// Bard: warm colours, feathered cap, lute.
const BARD: Grid = [
  '................',
  '..Y.............',
  '...yyrrr........',
  '....rrrrrr......',
  '...BBBssks......',
  '....BBssss......',
  '.....oSS......B.',
  '....oOooo....B..',
  '...ooOoobPb.s...',
  '...oOoobPdPB....',
  '...oOoobPPPb....',
  '...ooOoosbb.....',
  '....RR..RR......',
  '....RR..RR......',
  '...BBB..BBB.....',
  '................',
];
const BARD_STRUM = put(BARD, 7, 10, [
  ' PsP',
  ' bbb',
]);
define('healer_bard', {
  w: 16, h: 16,
  anims: {
    idle: [BARD, bob(BARD, 11)],
    cast: [put(BARD_STRUM, 10, 2, ['  Y', '   ', 'Y  ']), put(BARD, 10, 1, [' Y  Y', '     ', '   Y '])],
  },
});

// Acolyte: 12x12 small hooded helper with glowing eyes.
const ACO: Grid = [
  '............',
  '....ppP.....',
  '...ppPPP....',
  '..ppPdddd...',
  '..pPdYdYd...',
  '..pPPdddP...',
  '..pPPPPPb...',
  '.ppPPPPbss..',
  '.pPPPPPbb...',
  '.pPPPPPPb...',
  '.bbbbbbbb...',
  '............',
];
define('acolyte', {
  w: 12, h: 12,
  keep: 'Y',
  anims: {
    idle: [ACO, bob(ACO, 8)],
    cast: [put(ACO, 7, 1, ['  Y ', ' YwY', '  Y ', '    ', ' ss ', ' bb '])],
  },
});
