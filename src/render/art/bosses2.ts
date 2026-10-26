import { shift, put, pad, type Grid } from './raster.ts';
import { boss } from './bosses1.ts';

// Bosses part 2: 32x32, facing LEFT, feet on row 30.

// ---------------------------------------------------------------- The Forge Tyrant
const FT_BODY = pad([
  '',
  '',
  '..........qG.......Gq',
  '...........Gn.....nGq',
  '...........GGnnnnnnGn',
  '..........GnnnnnnnnnnK',
  '..........nYoYnnnnnnnK',
  '..........nnnnnnnnnnnK',
  '...........nkokokonnK',
  '.......GGGGnnnnnnnnnnGGGK',
  '......GGnnnGGnnnnnnGGnnnnK',
  '.....GnnnnnnGoooooGGnnnnnnK',
  '.....GnnnnnnoyYYYyonnnnnnnK',
  '.....nnnnnnnoYwwwYonnnnnnnK',
  '.....GnnnnnnoyYYYyonnnnnnKK',
  '....Gnnn.nnnGoooooGnnnnn.nK',
  '....Gnn..nnnnGGGGGnnnnnn.nnK',
  '....Gn...KnnnnnnnnnnnnnK..nnK',
  '...ss....KBBBBBByBBBBBBK..nyK',
  '...sS....KnnnnnnnnnnnnnK..KyK',
  '.........KnnnnK...KnnnnK...K',
  '.........KGnnnK...KGnnnK',
  '.........KGnonK...KGnonK',
  '.........KGnnnK...KGnnnK',
  '..........KnnK.....KnnK',
  '..........GnnK.....GnnK',
  '..........GnnK.....GnnK',
  '.........GnnnK....GnnnK',
  '........GnnnnK...GnnnnK',
  '........KKKKKK...KKKKKK',
], 32);
const HAMMER_DOWN: Grid = [
  '    B    ',
  '    B    ',
  '    B    ',
  '    B    ',
  '    B    ',
  'GGGGGGGGG',
  'GnnnnnnnK',
  'GnooooonK',
  'GnnnnnnnK',
  'KKKKKKKKK',
];
const FT_IDLE = put(FT_BODY, 0, 20, HAMMER_DOWN);
const FT_WIND = put(put(put(shift(FT_BODY, 1, 0), 3, 18, ['..', '..']), 0, 0, [
  'GGGGGGGGG',
  'GnnnnnnnK',
  'GnoYYYonK',
  'GnnnnnnnK',
  'KKKKKKKKK',
  '    B    ',
  '    B    ',
  '    B    ',
  '    B    ',
  '    B    ',
  '    B    ',
  '    sS   ',
  '    sS   ',
  '     n   ',
  '     n   ',
]), 11, 6, ['wYw']);
const FT_HIT = put(shift(FT_BODY, -1, 0), 0, 22, [
  'GnnnnnnnK',
  'GnYYYYYnK',
  'GnnnnnnnK',
  'KKKKKKKKK',
  'o.y.o.y.o',
]);
boss('forge_tyrant', FT_IDLE, FT_HIT, FT_WIND, 16, 'oyYw');

// ---------------------------------------------------------------- The Hollow King
const HK_FLAT = pad([
  '',
  '...........y..y..y..y',
  '...........yy.yy.yy.yy',
  '...........yYyyYyyYyyy',
  '...........yyyyyyyyyyy',
  '.....j.....yxyyyxyyyxy',
  '....jVj...KKKKKKKKKKKK',
  '...jVwVj..KkkkkkkkkkkKN',
  '...VwwwV..KkwkkkwkkkkKNN',
  '...jVwVj..KkkkkkkkkkkKNN',
  '....jVj...KkkkkjkkkkKNNN',
  '.....y...wlwlwlwlwlwlwNNN',
  '.....b..wlkllkllkllkllwNNN',
  '.....b..NwlllllllllllwMNNN',
  '.....bpNNMMMMMMyMMMMMMNNNNN',
  '.....ppNMMMMMMMyMMMMMMMNNNNN',
  '.....bNNMMMMMMMyMMMMMMMMNNNN',
  '.....bNMMMMMMMMyMMMMMMMMNNNNN',
  '.....bNMMMMMMMMyMMMMMMMMMNNNN',
  '.....NMMMMMMMMMyMMMMMMMMMNNNNN',
  '.....NMMMMMMMMMyMMMMMMMMMMNNNN',
  '....bNMMMMMMMMMyMMMMMMMMMMNNNNN',
  '....bNMMMMMMMMyyyMMMMMMMMMNNNNN',
  '....NMMMMMMMMMMMMMMMMMMMMMMNNNNN',
  '....NMMMMMMMMMMMMMMMMMMMMMMNNNNN',
  '...NMMMMMMMMMMMMMMMMMMMMMMMMNNNN',
  '...NMMMMMMMMMMMMMMMMMMMMMMMMNNNN',
  '...yNNNMNNNNMNNNNMNNNNMNNNNMNNNy',
  '...yyNyyyNyyyNyyyNyyyNyyyNyyyNy',
  '....N...N...N...N...N...N...N',
], 32);
function folds(g: Grid): Grid {
  return g.map((row, y) => (y < 15 || y > 26 ? row : row.replace(/M/g, (m, x: number) => (x % 6 === 3 ? 'N' : x % 6 === 2 && x < 16 ? 'V' : m))));
}
const HK = folds(HK_FLAT);
const HK_WIND = put(put(shift(HK, 1, 0), 12, 7, ['jwj jwj', 'www www', 'jwj jwj']), 2, 4, [
  '  w   ',
  ' wjw  ',
  'wjwjw ',
  'jwwwj ',
  'wjwjw ',
  ' wjw  ',
  '  w   ',
]);
const HK_HIT = put(shift(HK, -1, 0), 0, 6, ['jwj', 'wVw', 'jwj']);
boss('hollow_king', HK, HK_HIT, HK_WIND, 18, 'wjVxk');
