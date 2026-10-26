import { define, bob, shift, put, hurt, downed, type Grid } from './raster.ts';

// Heroes: 16x16, facing right, feet on row 14 (outline on row 15).

// ---------------------------------------------------------------- Tomas (tank)
const TOMAS_BODY: Grid = [
  '................',
  '.....uuuu.......',
  '......wllll.....',
  '.....wllllll....',
  '.....llgkkkk....',
  '.....lgggggg....',
  '......ggggGG....',
  '.....uGGllyyyyy.',
  '...uuuuglgycluy.',
  '....uuuuUUyllly.',
  '....bbybbUyulUy.',
  '....uuuuUUyulUy.',
  '.....gG.gG.yUy..',
  '.....gG.gG..y...',
  '.....GG.GGG.....',
  '................',
];
const SWORD: Grid = [' w', ' l', ' l', ' l', ' l', 'yyy', ' s', ' y'];
const TOMAS = put(TOMAS_BODY, 1, 2, SWORD);
const TOMAS_WIND = put(shift(TOMAS_BODY, -1, 0), 0, 0, SWORD);
const TOMAS_STRIKE = shift(TOMAS, 1, 0);

const TOMAS_LYING = downed(put(TOMAS_BODY, 10, 7, ['.....', '.....', '.....', '.....', '.....', '.....', '.....']));
const TOMAS_DOWN = { ...TOMAS_LYING, g: put(TOMAS_LYING.g, 0, 13, ['yuuuuy', 'yyyyyy']) };

define('tomas', {
  w: 16, h: 16,
  anims: {
    idle: [TOMAS, bob(TOMAS, 10)],
    attack: [TOMAS_WIND, TOMAS_STRIKE],
    hurt: [hurt(TOMAS)],
    down: [TOMAS_DOWN],
  },
});

// ---------------------------------------------------------------- Brann (berserker)
const BRANN_BODY: Grid = [
  '................',
  '....p.....p.....',
  '....pgllggp.....',
  '.....GGGGGG.....',
  '.....qsssks.....',
  '.....qSsooo.....',
  '.....qooooo.....',
  '...ssBooooBs....',
  '...sSBBooBBss...',
  '..ss.BBBBBB.....',
  '.....bbybbb.....',
  '.....RRRRRR.....',
  '.....RR..RR.....',
  '.....BB..BB.....',
  '....BBB..BBB....',
  '................',
];
const AXE_UP: Grid = [
  'bl ',
  'bwl',
  'bwl',
  'bl ',
  'b  ',
  'b  ',
  '   ',
  '   ',
  'b  ',
  'b  ',
  'b  ',
  'b  ',
];
const BRANN = put(BRANN_BODY, 12, 1, AXE_UP);
const BRANN_WIND = put(shift(BRANN_BODY, -1, 0), 10, 0, [
  ' bl ',
  ' bwl',
  ' bwl',
  ' bl ',
  ' b  ',
  ' b  ',
  ' b  ',
  's   ',
]);
const BRANN_STRIKE = put(shift(BRANN_BODY, 1, 0), 11, 8, [
  ' sbbbl',
  '  .wwl',
  '    wl',
  '    w.',
]);

define('brann', {
  w: 16, h: 16,
  anims: {
    idle: [BRANN, bob(BRANN, 10)],
    attack: [BRANN_WIND, BRANN_STRIKE],
    hurt: [hurt(BRANN)],
    down: [downed(BRANN_BODY)],
  },
});

// ---------------------------------------------------------------- Ilse (mage)
const ILSE: Grid = [
  '................',
  '....V........j..',
  '....jV......jwj.',
  '.....jVV.....j..',
  '.....jVVN....b..',
  '...jVVVVVVNN.b..',
  '....ppsssks..b..',
  '....ppssSs...b..',
  '....VjVVVVVVss..',
  '....VjVVyVN..b..',
  '....VjVVVVN..b..',
  '...VjVVVVVNN.b..',
  '...VjVVVVVNN.b..',
  '..VjVVVVVVNNNb..',
  '..NNNNNNNNNN.b..',
  '................',
];
const ILSE_WIND = put(shift(ILSE, -1, 0), 10, 0, [
  '  wjw',
  '  jwj',
  '  wjw',
]);
const ILSE_STRIKE = put(shift(ILSE, 1, 0), 11, 0, [
  ' jwj ',
  'jwwwj',
  ' jwj ',
]);

define('ilse', {
  w: 16, h: 16,
  anims: {
    idle: [ILSE, bob(ILSE, 12)],
    attack: [ILSE_WIND, ILSE_STRIKE],
    hurt: [hurt(ILSE)],
    down: [downed(put(ILSE, 12, 1, ['...', '...', '...', '...', '...', '...', '...', '...', '...', '...', '...', '...', '...', '...']))],
  },
});

// ---------------------------------------------------------------- Wren (ranger)
const WREN_BODY: Grid = [
  '................',
  '................',
  '.....eeEE.......',
  '....eEEEEE......',
  '...wEEbssks.....',
  '...BEEbssss.....',
  '...BBfEEsS......',
  '...BfEEEEEs.....',
  '...BfEEEEEE.....',
  '...Bbbbybbb.....',
  '....fEEEEEE.....',
  '....BB..BB......',
  '....BB..BB......',
  '....BB..BB......',
  '....BBB.BBB.....',
  '................',
];
const BOW: Grid = [
  'b  ',
  'lb ',
  'l b',
  'l b',
  'lss',
  'l b',
  'l b',
  'l b',
  'lb ',
  'b  ',
];
const WREN = put(WREN_BODY, 11, 3, BOW);
const WREN_DRAW = put(shift(WREN_BODY, -1, 0), 9, 3, [
  '   b  ',
  '  l b ',
  ' l   b',
  ' l   b',
  'syyyyw',
  ' l   b',
  ' l   b',
  '  l b ',
  '   b  ',
]);
const WREN_LOOSE = shift(WREN, 1, 0);

define('wren', {
  w: 16, h: 16,
  anims: {
    idle: [WREN, bob(WREN, 10)],
    attack: [WREN_DRAW, WREN_LOOSE],
    hurt: [hurt(WREN)],
    down: [downed(WREN_BODY)],
  },
});
