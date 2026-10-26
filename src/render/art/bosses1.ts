import { define, bob, shift, put, pad, line, type Grid } from './raster.ts';

// Bosses part 1: 32x32, facing LEFT, feet on row 30 (outline on row 31).

export function boss(id: string, idle: Grid, attack: Grid, windup: Grid, split: number, keep = ''): void {
  define(id, { w: 32, h: 32, keep, anims: { idle: [idle, bob(idle, split)], attack: [attack], windup: [windup] } });
}

// ---------------------------------------------------------------- The Bone Knight
const BK_BODY = pad([
  '',
  '',
  '............G..G..G',
  '............GG.GG.GG',
  '...........GllgggggGn',
  '...........GyGGyGGyGn',
  '...........wppppppppPn',
  '..........wpkkppppkkpP',
  '..........ppkxppppkxpPP',
  '..........pppppkpppppPP',
  '...........pkpkpkpkpPP',
  '............pppppppPdRRR',
  '.........llgggGnnGGgggGRRqR',
  '........lggggGGnGGggggGnRqqRR',
  '........lgggGnpppPpnGGGnRqqqRR',
  '.........gGGnpPpPpPnGnnRRqqqqR',
  '.........pnGlgggggggGnnRqqqqqRR',
  '.......ppp.GlgggggggGn.RqqqqqqR',
  '...........GggggggggGn.RRqqqqqR',
  '...........GGgggggGGGn.RRqqqqqR',
  '..........BBByBBBBBBBn.RRRqqqqR',
  '..........nGGgGnGGgGGn..RRqqqqR',
  '..........nGgGn.nGgGn...RRqqqR',
  '...........ppP...ppP.....RRqqR',
  '...........pPP...pPP.....RqRqR',
  '..........nGGn..nGGn......R.R',
  '..........ngGn..ngGn',
  '...........pP....pP',
  '...........pP....pP',
  '..........nGGn..nGGn',
  '.........nGGGn.nGGGn',
], 32);
const BK_SWORD_DOWN: Grid = [
  '  y  ',
  ' pBp ',
  '  B  ',
  'yyyyy',
  ' wlg ',
  ' wlg ',
  ' wlg ',
  ' wlg ',
  ' wlg ',
  ' wlg ',
  ' wlg ',
  '  lg ',
  '  l  ',
];
const BK_IDLE = put(BK_BODY, 3, 16, BK_SWORD_DOWN);
const BK_ARMLESS = put(BK_BODY, 7, 16, ['  .', '...']);
const BK_WIND = put(line(line(put(BK_ARMLESS, 3, 0, [
  '  w  ',
  ' wlg ',
  ' wlg ',
  ' wlg ',
  ' wlg ',
  ' wlg ',
  ' wlg ',
  ' wlg ',
  'yyyyy',
  '  B  ',
  ' pBp ',
  '  y  ',
]), 7, 11, 9, 13, 'p'), 8, 11, 9, 12, 'p'), 12, 8, ['xx    xx']);
const BK_HIT = put(BK_ARMLESS, 0, 15, [
  '         p',
  '       y p',
  'wllllllypp',
  ' ggggggy  ',
]);
boss('bone_knight', BK_IDLE, BK_HIT, BK_WIND, 20, 'x');

// ---------------------------------------------------------------- The Myconid Queen
const MQ = pad([
  '',
  '.............y.y.y',
  '............yYyYyYy',
  '..........mmmmmmmmmmmm',
  '.......mmvvmmmmmmmmmmmmMM',
  '.....mmvvccmmmmmmccmmmmmMM',
  '....mvvcccwmmmmmcccwmmmmmMM',
  '...mvvmcccmmmmmmmccmmmmccmMM',
  '..mvmmmmmmmmccmmmmmmmmcccwmMM',
  '..mmmmmmmmmcccwmmmmmmmmccmmMM',
  '.mmmmmmmmmmmccmmmmmmmmmmmmmmMM',
  '.MMMMMMMMMMMMMMMMMMMMMMMMMMMMM',
  '..MdMdMdMdMdMdMdMdMdMdMdMdMdM',
  '.........ppppppppPP',
  '.........pcwpppcwpP',
  '.........ppppppppPP',
  '..........ppMMMMpP',
  '....c.....pppppppP',
  '...cec...vmmmmmmmmv',
  '....c...vmmvmmmmmmMv',
  '....b..smmvmmmmmmmMMs',
  '....bssmmvmmmmmmmmmMMS',
  '....b..mmvmmmmmmmmmMMM',
  '....b.mmvmmmmmmmmmmmMMM',
  '....b.mmvmmmmmmmmmmmMMMM',
  '....b.mvmmmmmmmmmmmmmMMM',
  '....bmmvmmmmmmmmmmmmmMMMM',
  '....bmvmmmmmmmmmmmmmmmMMMM',
  '...bmvmmmmmmmmmmmmmmmmMMMMM',
  '..ccMMMcMMMMcMMMMcMMMMcMMMc',
  '..c.c..c.c..c.c..c.c..c..c',
], 32);
const MQ_WIND = put(put(shift(MQ, 1, 0), 0, 15, [
  '...ccc',
  '..cwwwc',
  '..cwYwc',
  '..cwwwc',
  '...ccc',
  '....b',
]), 10, 14, ['YwpppYw']);
const MQ_HIT = put(shift(MQ, -1, 0), 1, 15, [' w ', 'wYw', 'YwY', 'wYw', ' w ']);
boss('myconid_queen', MQ, MQ_HIT, MQ_WIND, 16, 'cweY');

// ---------------------------------------------------------------- The Frost Wyrm
const WYRM = pad([
  '................w',
  '...............wl',
  '..............wl',
  '........ccccclw',
  '......ccuuuuuul',
  '....ccuuuuuuuuuc',
  '...cuuuYkuuuuuuuc',
  '..cuuuuuuuuuuuuuUc.......c',
  '.cuuuuuuuuuuuuuuUU......cU',
  '.kwkwkwkuuuuuuuUUU.....cuU',
  '..lwlwlluUUuuuuUUU....cuuUU',
  '...lllll.UUuuuuUUUc..cuuuUUc',
  '............luuuuUUU.cuuuUUUc',
  '............lluuuuUUcuuuUUUUUc',
  '.............lluuuuUUuuUUUUUUUc',
  '..............lluuuuUUuUUUUUUUU',
  '..............lluuuuuUUuUUUUUU',
  '.............llluuuuuuUUUUUU',
  '............lllluuuuuuuUUUUU',
  '...........lllluuuuuuuuuUUUUU',
  '...........llluuuuuuuuuuuUUUU',
  '..........ccllluuuuuuuuuuUUUUU',
  '.........cuuclluuuuuuuuuuuUUUU',
  '.........cuuUlluuuuuuuuuuUUUUU',
  '..........uuUllluuuuuuuuUUUUUU',
  '..........uUU.lluuuuuuuUUUcuUU',
  '.........uUU...lluuuuuUUUcuuUU',
  '........wuU.....lluuuUUUUcuuUU',
  '.......wlwl......UUUUUUUcuuuUUc',
  '.......w.w.....cuuuuuuuuuuuUUUc',
  '..............cuuuuuuuuuUUUUUU',
], 32);
const WYRM_WIND = put(shift(WYRM, 1, -1), 0, 7, [
  '  ',
  '                ',
  'c.........      ',
  '.ckkkkkkk       ',
  'cwcwcw.k        ',
  '.c..lwlwl       ',
]);
const WYRM_HIT = put(shift(WYRM, -1, 0), 0, 8, [
  '                 ',
  'kwkwkwk          ',
  'wlwlwll          ',
]);
boss('frost_wyrm', WYRM, WYRM_HIT, put(WYRM_WIND, 7, 5, ['x']), 20, 'xY');
