import { define, bob, shift, put, recolor, type Grid } from './raster.ts';

// Enemies part 1 (crypt, fungal, frost): 16x16, facing LEFT, feet on row 14.
// Light still comes from the top-left.

function enemy(id: string, idle: Grid, attack: Grid, windup: Grid, split: number, keep = ''): void {
  define(id, { w: 16, h: 16, keep, anims: { idle: [idle, bob(idle, split)], attack: [attack], windup: [windup] } });
}

// ---------------------------------------------------------------- Crypt Rat
const RAT: Grid = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..............v.',
  '....vG........v.',
  '...gGGG..ggg.v..',
  '..grGGGgggggGv..',
  '.vGGGGGGGGGGGn..',
  '..lGGnGGGGGGnn..',
  '...nn.GnnGnnn...',
  '....v...v..v....',
  '................',
];
enemy('rat',
  RAT,
  put(shift(RAT, -1, 0), 0, 10, ['.w', 'k ', '.w']),
  put(shift(RAT, 1, 1), 3, 10, ['x']),
  12, 'rx');

// ---------------------------------------------------------------- Skeleton
const SKEL_BODY: Grid = [
  '................',
  '................',
  '.....wppp.......',
  '....wppppP......',
  '....pkrpkP......',
  '....ppppppP.....',
  '.....kpkpP......',
  '......pP........',
  '....pppppPp.....',
  '...p.KpKpK.p....',
  '...p.pKpKp..p...',
  '..p...pPp.......',
  '.....pPKPp......',
  '.....p...p......',
  '....pp...pp.....',
  '................',
];
const BONE_CLUB: Grid = [
  'wp',
  'pP',
  ' p',
  ' p',
  ' p',
  'pp',
];
const SKEL = put(SKEL_BODY, 1, 5, BONE_CLUB);
const SKEL_WIND = put(put(shift(SKEL_BODY, 1, 0), 3, 0, ['wp', 'pP', ' p', ' p', ' p', ' pp', '  .p']), 6, 4, [' x']);
const SKEL_HIT = put(shift(SKEL_BODY, -1, 0), 0, 9, ['pppppp', 'wP    ']);
enemy('skeleton', SKEL, SKEL_HIT, SKEL_WIND, 10, 'rx');

// ---------------------------------------------------------------- Bog Slime
const SLIME: Grid = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.......eee......',
  '.....eeeeeeE....',
  '....eweeeeeEE...',
  '...eewkeekEEEE..',
  '..eeekkeekEEEEf.',
  '..eEEEEEEEEEEEf.',
  '.eEEEkkkkEEEEff.',
  '.eEEEEEEEEEEfff.',
  '..ffEfffffEfff..',
  '................',
];
const SLIME_TALL = put(SLIME, 0, 4, [
  '................',
  '......eee.......',
  '.....eeeeeE.....',
  '....eweeeeEE....',
  '...eewkeekEEE...',
  '...eekkeekEEEf..',
  '...eEEEEEEEEEf..',
]);
const SLIME_WIND = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '......eeee......',
  '....eeeeeeEE....',
  '...eweeeeeeEE...',
  '..eewkkeekkEEE..',
  '..eekwkeekwEEEf.',
  '.eeEEEEEEEEEEEf.',
  '.eEEEkkkkkEEEff.',
  'eEEEEkxxxkEEEfff',
  '.eEEEEkkkEEEfff.',
  '..ffEfffffEfff..',
  '................',
];
const SLIME_SPIT = put(shift(SLIME, -1, 0), 0, 11, ['eE', ' e']);
define('slime', {
  w: 16, h: 16, keep: 'x',
  anims: { idle: [SLIME, SLIME_TALL], attack: [SLIME_SPIT], windup: [SLIME_WIND] },
});

// ---------------------------------------------------------------- Sporeling
const SPORELING: Grid = [
  '................',
  '................',
  '................',
  '................',
  '......mmmm......',
  '....mmvmmmmM....',
  '...mvvmmmvmMM...',
  '..mmmmmmmmmmMM..',
  '..MMMMMMMMMMMM..',
  '....pkppkpP.....',
  '....ppppppP.....',
  '....ppkkppP.....',
  '.....pppPP......',
  '.....P...P......',
  '....PP..PP......',
  '................',
];
const SPORE_WIND = put(shift(SPORELING, 0, 1), 0, 0, [
  '..e...e....e....',
  '....e....e......',
  '.e..............',
]);
const SPORE_HIT = shift(SPORELING, -1, 0);
enemy('sporeling', SPORELING, SPORE_HIT, SPORE_WIND, 9);

// ---------------------------------------------------------------- Goblin Archer
const GOBLIN_BODY: Grid = [
  '................',
  '................',
  '................',
  '.......bbb......',
  '......bbbbbB....',
  '....eeeeeebBE...',
  '...eYeeeeeeEE...',
  '..eeekeeeEE.....',
  '....ewweE.......',
  '....BBBBBB......',
  '...eBBBBBBe.....',
  '....BbybBB......',
  '....BB..BB......',
  '....ee..ee......',
  '...eee..eee.....',
  '................',
];
const GOB_BOW: Grid = [
  '  b',
  ' b ',
  'b l',
  'b l',
  'bsl',
  'b l',
  'b l',
  ' b ',
  '  b',
];
const GOBLIN = put(GOBLIN_BODY, 1, 5, GOB_BOW);
const GOBLIN_DRAW = put(GOBLIN_BODY, 0, 5, [
  '  b   ',
  ' b l  ',
  'b   l ',
  'b   l ',
  'wyyyys',
  'b   l ',
  'b   l ',
  ' b l  ',
  '  b   ',
]);
enemy('goblin_archer', GOBLIN, shift(GOBLIN, 1, 0), GOBLIN_DRAW, 9, 'Y');

// ---------------------------------------------------------------- Mushroom Brute
const BRUTE: Grid = [
  '................',
  '......PPbb......',
  '....PPpPbbbB....',
  '...PpPPbbpbbB...',
  '..PPbbbbbbbbbB..',
  '.PpbbpbbbbbpbbB.',
  '.BBBBBBBBBBBBBB.',
  '...dpdpdpdpd....',
  '...pkppkpppP....',
  '.ss.ppppppP.SS..',
  'ssS.pkkkkpP.SSS.',
  'sSS.ppppppP.SS..',
  '....pppPPPP.....',
  '....pP...PP.....',
  '...PPP..PPP.....',
  '................',
];
const BRUTE_WIND = put(put(put(shift(BRUTE, 1, 0), 0, 9, ['....', '....', '....']), 0, 0, [
  '.ss',
  'ssS',
  'sSS',
  ' s ',
  ' s ',
  ' s ',
  ' s ',
  ' s ',
  ' ss',
]), 5, 8, ['x  x']);
const BRUTE_SMASH = put(shift(BRUTE, -1, 0), 0, 11, ['ss.', 'sSS', 'SSS']);
enemy('mushroom_brute', BRUTE, BRUTE_SMASH, BRUTE_WIND, 9, 'x');

// ---------------------------------------------------------------- Ice Wraith
const WRAITH: Grid = [
  '................',
  '................',
  '......wll.......',
  '.....wllllg.....',
  '....wlcKcKlg....',
  '....llllllg.....',
  '...wlKKKKlgg....',
  '..cllllllllg....',
  '.c.llllllllgc...',
  'c..gllllllgg.c..',
  '...gglllllg.....',
  '....gclggclg....',
  '.....c.gc.c.....',
  '......c...c.....',
  '................',
  '................',
];
const WRAITH_WIND = put(shift(WRAITH, 1, -1), 0, 0, [
  '..c.............',
  '.cwc............',
  '..c.............',
]);
const WRAITH_HIT = put(shift(WRAITH, -1, 0), 0, 7, ['cc', 'c.']);
define('ice_wraith', {
  w: 16, h: 16, keep: 'c',
  anims: { idle: [WRAITH, shift(WRAITH, 0, 1)], attack: [WRAITH_HIT], windup: [WRAITH_WIND] },
});

// ---------------------------------------------------------------- Yeti
const YETI: Grid = [
  '................',
  '................',
  '.....wwll.......',
  '....wwlllll.....',
  '...wluuuull.....',
  '...wucuculll....',
  '...luwwwulllg...',
  '..wlluuulllllg..',
  '.wlllllllllllg..',
  '.lllllllllllllg.',
  '.uulllllllllgg..',
  '.uu.llllllllg...',
  '....lllggllg....',
  '....llg..llg....',
  '...uuu...uuu....',
  '................',
];
const YETI_WIND = put(put(put(shift(YETI, 1, 0), 1, 10, ['...', '...']), 0, 1, [
  '.uu',
  '.uu',
  '.wl',
  '.wl',
  '.ll',
  '.ll',
  '..ll',
]), 6, 5, ['x x']);
const YETI_MAUL = put(shift(YETI, -1, 0), 0, 9, ['uu', 'uu']);
enemy('yeti', YETI, YETI_MAUL, YETI_WIND, 10, 'x');

// ---------------------------------------------------------------- Frost Mage (robed template, see enemies2)
export const ROBED: Grid = [
  '................',
  '................',
  '.......11.......',
  '......1122......',
  '.....112223.....',
  '.....1ssss3.....',
  '.....skssS3.....',
  '.....wwwwS3.....',
  '....12wwww23....',
  '...1122ww2233...',
  '...1222222223...',
  '...12224222.3...',
  '..1222242223....',
  '..12222422233...',
  '..333334433333..',
  '................',
];
const FROST_MAGE = put(recolor(ROBED, { 1: 'c', 2: 'u', 3: 'U', 4: 'l' }), 1, 1, [
  ' c ',
  'cwc',
  ' c ',
  ' b ',
  ' b ',
  ' b ',
  ' b ',
  ' b ',
  ' s ',
  ' b ',
  ' b ',
  ' b ',
  ' b ',
]);
const FROST_WIND = put(shift(FROST_MAGE, 1, 0), 0, 0, [
  '.c.c.',
  'c.c.c',
  '.ccc.',
  'cc.cc',
  '.ccc.',
  'c.c.c',
]);
enemy('frost_mage', FROST_MAGE, put(shift(FROST_MAGE, -1, 0), 0, 1, ['cwc', 'wcw', 'cwc']), FROST_WIND, 9, 'c');
