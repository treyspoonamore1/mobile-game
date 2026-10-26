import { define, bob, shift, put, recolor, type Grid } from './raster.ts';
import { ROBED } from './enemies1.ts';

// Enemies part 2 (ember, abyss): 16x16, facing LEFT, feet on row 14.

function enemy(id: string, idle: Grid, attack: Grid, windup: Grid, split: number, keep = ''): void {
  define(id, { w: 16, h: 16, keep, anims: { idle: [idle, bob(idle, split)], attack: [attack], windup: [windup] } });
}

// ---------------------------------------------------------------- Ember Imp
const IMP: Grid = [
  '................',
  '................',
  '................',
  '................',
  '....p...p.......',
  '....vrrrr..m....',
  '...rYrrYrR.mM...',
  '...rrkkrrRmMM...',
  '....rrrrRmMMM...',
  '...rRrrrrRMM....',
  '..r.rrrrR.M.....',
  '....rRrrR.......',
  '....r..r..R.....',
  '....r..r...R....',
  '...rr.rr...RR...',
  '................',
];
const IMP_WIND = put(shift(IMP, 1, -1), 0, 2, [
  '..y.',
  '.yoy',
  '.yry',
  '..y.',
]);
enemy('imp', IMP, put(shift(IMP, -2, 0), 0, 9, ['ww']), IMP_WIND, 9, 'Yy');

// ---------------------------------------------------------------- Magma Golem
const GOLEM: Grid = [
  '................',
  '................',
  '.....Gnnnn......',
  '....GGnnnnK.....',
  '....GynnynK.....',
  '...GnnnnnnKK....',
  '..GnnKoyoKnnK...',
  '.GnnnnnonnnnnK..',
  '.GnnKnnnynnnKnK.',
  '.nnnKKnnonnKKnK.',
  '.noonnnnnnnKoooK',
  '.nyyn.nnnnK.KyyK',
  '..nn.nnKnnK..KK.',
  '.....nnK.nnK....',
  '....GnnK.GnnK...',
  '................',
];
const GOLEM_WIND = put(put(put(shift(GOLEM, 1, 0), 0, 10, ['......', '......', '......']), 0, 0, [
  '.noon',
  '.nyyn',
  '..nn ',
  '..n  ',
  '..n  ',
  '..n  ',
  '..nn ',
  '...n ',
]), 6, 4, ['Y  Y']);
const GOLEM_SLAM = put(shift(GOLEM, -1, 0), 0, 11, ['noon', 'nyyn', 'nnnn']);
enemy('magma_golem', GOLEM, GOLEM_SLAM, GOLEM_WIND, 9, 'oyY');

// ---------------------------------------------------------------- Fire Cultist
const CULT_BASE = put(recolor(ROBED, { 1: 'r', 2: 'R', 3: 'd', 4: 'y' }), 5, 5, [
  'Rdddd',
  'dyddd',
  'ddddd',
  'RRRRR',
]);
const CULTIST = put(CULT_BASE, 1, 6, [
  ' y ',
  'yoy',
  'oro',
  ' s ',
]);
const CULT_WIND = put(shift(CULT_BASE, 1, 0), 0, 3, [
  ' Y  ',
  'yYy ',
  'yoYy',
  'oroy',
  'oRro',
  ' s  ',
]);
enemy('fire_cultist', CULTIST, put(shift(CULTIST, -1, 0), 0, 7, ['oy', 'yo']), CULT_WIND, 9, 'yYo');

// ---------------------------------------------------------------- Shade
const SHADE: Grid = [
  '................',
  '................',
  '......VNN.......',
  '.....VNNNK......',
  '....VNwNwNK.....',
  '....NNNNNNK.....',
  '...VNNNNNNNK....',
  '..VNNKNNNNNNK...',
  '.V.VNNNNNNNKK.K.',
  'V..VNNNNNNKK..K.',
  '...NNNNNNNK.....',
  '....NNKNNKNK....',
  '.....N.KN..K....',
  '......K....K....',
  '................',
  '................',
];
const SHADE_WIND = put(shift(SHADE, 1, -1), 4, 3, ['w.w', '...', '.j.']);
define('shade', {
  w: 16, h: 16, keep: 'wj',
  anims: {
    idle: [SHADE, shift(SHADE, 0, 1)],
    attack: [put(shift(SHADE, -2, 0), 0, 7, ['jj', 'j.'])],
    windup: [SHADE_WIND],
  },
});

// ---------------------------------------------------------------- Void Eye
const EYE: Grid = [
  '................',
  '................',
  '......MMMM......',
  '....MmmmmmMM....',
  '...MmwwwwwmMN...',
  '..MmwwwllwwmMN..',
  '..MwwyyylwwwMN..',
  '..MwykkylwwwMN..',
  '..MwykkylwwgMN..',
  '..MwwyyylwwgMN..',
  '...MmwwwwgmMN...',
  '....MmmmmMMN....',
  '....M.M.M.N.....',
  '...M..M..M......',
  '................',
  '................',
];
const EYE_WIND = put(EYE, 3, 5, [
  'xxxxl',
  'xykkyx',
  'ykkkkx',
  'ykkkkx',
  'xykkyx',
  'xxxxg',
]);
define('void_eye', {
  w: 16, h: 16, keep: 'ykx',
  anims: {
    idle: [EYE, shift(EYE, 0, 1)],
    attack: [shift(put(EYE, 3, 6, ['www', 'wkkw', 'wkkw', 'www']), -1, 0)],
    windup: [EYE_WIND],
  },
});

// ---------------------------------------------------------------- Abyss Knight
const AKNIGHT_BODY: Grid = [
  '................',
  '...g.....g......',
  '...gG...Gg......',
  '....GnGGnG......',
  '....nGGGGn......',
  '....jjkGGnN.....',
  '....nGGGGnNN....',
  '...GGnnnnGGNN...',
  '..GgGKKVKGgGNN..',
  '..GGnKKKKnGGNNN.',
  '...GnKKKKnnnNNN.',
  '....KnnnnK.NNNN.',
  '....Kn..nK..NNN.',
  '....nn..nn...NN.',
  '...nnn..nnn.....',
  '................',
];
const GREATSWORD: Grid = [' j', ' l', ' l', ' l', ' l', ' l', ' l', ' l', 'yVy', ' G', ' V'];
const AKNIGHT = put(AKNIGHT_BODY, 0, 0, GREATSWORD);
const AKNIGHT_WIND = put(put(shift(AKNIGHT_BODY, 1, 0), 0, 0, ['j    ', ' l   ', '  l  ', '   l ', '    yG']), 5, 5, ['jj']);
const AKNIGHT_HIT = put(shift(AKNIGHT_BODY, -1, 0), 0, 9, ['jllllyG', '     V ']);
enemy('abyss_knight', AKNIGHT, AKNIGHT_HIT, AKNIGHT_WIND, 10, 'mjV');
