import { rasterGrid, pad, type Grid } from './raster.ts';

// 12x12 UI icons with a 1px dark outline. '#' pixels are auto-shaded with a 3-colour ramp
// (light top-left edge, mid fill, dark bottom-right edge); other chars are literal palette chars.

export const ICON_IDS = [
  'mend', 'ward', 'chain', 'revive', 'sanctuary', 'gold', 'devotion', 'mana', 'skull', 'heart',
  'sword', 'shield', 'acolyte', 'relic', 'pilgrim', 'star', 'clock', 'note', 'lock', 'check', 'up',
  'floor', 'gear', 'gem', 'ring', 'amulet', 'tome', 'chalice', 'feather', 'hourglass', 'candle',
  'bell', 'crown', 'orb', 'rune',
] as const;
export type IconId = (typeof ICON_IDS)[number];

type Ramp = readonly [string, string, string];
const GREEN: Ramp = ['e', 'E', 'f'];
const BLUE: Ramp = ['c', 'u', 'U'];
const GOLD: Ramp = ['Y', 'y', 'O'];
const RED: Ramp = ['v', 'r', 'R'];
const STEEL: Ramp = ['l', 'g', 'G'];
const BONE: Ramp = ['w', 'l', 'g'];
const VIOLET: Ramp = ['j', 'V', 'N'];

function shade(rows: Grid, ramp: Ramp, glint = true): Grid {
  const g = pad(['', ...rows], 12);
  const filled = (x: number, y: number): boolean => {
    const ch = g[y]?.[x];
    return ch !== undefined && ch !== '.';
  };
  let glinted = !glint;
  return g.map((row, y) => row.split('').map((ch, x) => {
    if (ch !== '#') return ch;
    const top = !filled(x, y - 1), left = !filled(x - 1, y);
    if (top || left) {
      if (!glinted && top && filled(x + 1, y) && filled(x, y + 1)) { glinted = true; return 'w'; }
      return ramp[0];
    }
    if (!filled(x, y + 1) || !filled(x + 1, y)) return ramp[2];
    return ramp[1];
  }).join(''));
}

/** A '#' disk mask of radius r centred at (cx, cy), rows 1..10 of a 12x12 icon. */
function disk(cx: number, cy: number, r: number, hole = 0): string[] {
  const rows: string[] = [];
  for (let y = 1; y <= 10; y++) {
    let s = '';
    for (let x = 0; x < 12; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      s += d <= r && d >= hole ? '#' : '.';
    }
    rows.push(s);
  }
  return rows;
}

function over(base: Grid, rows: Record<number, string>): Grid {
  return base.map((r, i) => {
    const o = rows[i];
    if (!o) return r;
    return r.split('').map((ch, x) => (o[x] && o[x] !== ' ' && o[x] !== '.' ? o[x]! : ch)).join('');
  });
}

const PLUS = ['....####', '....####', '....####', '.##########', '.##########', '.##########', '.##########', '....####', '....####', '....####'];
const HEART = ['', '..###..###', '.##########', '.##########', '.##########', '..########', '...######', '....####', '.....##'];

function sunRays(): Grid {
  const base = shade(disk(6, 6, 2.9), GOLD);
  const rays: Record<number, string> = {
    1: '.....YY.....',
    2: '.Y........Y.',
    3: '..y......y..',
    5: 'Yy........yY',
    6: 'Yy........yY',
    8: '..y......y..',
    9: '.Y........Y.',
    10: '.....YY.....',
  };
  return over(base, rays);
}

function gear(): Grid {
  const rows = disk(6, 6, 3.6, 1.4);
  const teeth: [number, number][] = [[5, 1], [6, 1], [5, 10], [6, 10], [1, 5], [1, 6], [10, 5], [10, 6], [2, 2], [9, 2], [2, 9], [9, 9]];
  const g = rows.map((r) => r.split(''));
  for (const [x, y] of teeth) g[y - 1]![x] = '#';
  return shade(g.map((r) => r.join('')), STEEL, false);
}

const DEFS: Record<IconId, () => Grid> = {
  mend: () => over(shade(PLUS, GREEN), { 5: '.....ee', 6: '.....ee' }),
  ward: () => over(shade(['.##########', '.##########', '.##########', '.##########', '.##########', '..########', '..########', '...######', '....####', '.....##'], BLUE), {
    3: '.....cc', 4: '....cccc', 5: '.....cc', 6: '.....cc',
  }),
  chain: () => {
    const back = shade(['.##.##', '#######', '#######', '.#####', '..###', '...#'], ['e', 'E', 'f'], false);
    const front = shade(['', '', '', '.....##.##', '....#######', '....#######', '.....#####', '......###', '.......#'], ['w', 'e', 'E']);
    const isF = (x: number, y: number): boolean => (front[y]?.[x] ?? '.') !== '.';
    return back.map((r, y) => r.split('').map((ch, x) => {
      if (isF(x, y)) return front[y]![x]!;
      if (ch !== '.' && (isF(x + 1, y) || isF(x - 1, y) || isF(x, y + 1) || isF(x, y - 1))) return 'k';
      return ch;
    }).join(''));
  },
  revive: () => shade(['....####', '...##..##', '...##..##', '....####', '.##########', '.##########', '.....##', '.....##', '.....##', '.....##'], GOLD),
  sanctuary: sunRays,
  gold: () => over(shade(disk(6, 6, 4.6), GOLD), { 3: '.....O', 4: '....OOO', 5: '.....O', 6: '.....O', 7: '....OOO', 8: '.....O' }),
  devotion: () => over(shade(['.....#', '.....##', '....###', '....####', '...#####.#', '..########', '..########', '..########', '...######', '....####'], VIOLET, false), {
    7: '.....j', 8: '....jwj', 9: '....jwj', 10: '.....j',
  }),
  mana: () => shade(['.....##', '.....##', '....####', '....####', '...######', '..########', '..########', '..########', '...######', '....####'], BLUE),
  skull: () => over(shade(['...######', '..########', '.##########', '.##########', '.##########', '.##########', '..########', '...######', '...######', '....####'], BONE), {
    4: '...kk..kk', 5: '...kk..kk', 6: '.....kk', 9: '....k.k.k',
  }),
  heart: () => shade(HEART, RED),
  sword: () => pad(['', '........www', '.......wllw', '......wllg', '.....wllg', '..y.wllg', '...yllg', '...Byy', '..BB.y', '.BB', '.y'], 12),
  shield: () => over(shade(['.##########', '.##########', '.##########', '.##########', '..########', '..########', '...######', '....####', '.....##'], STEEL), {
    3: '.....yy', 4: '...yyyyyy', 5: '.....yy', 6: '.....yy', 7: '.....yy',
  }),
  acolyte: () => pad(['', '....ppP', '...ppPPP', '..ppPPPPP', '..pPdddPP', '..pdYdYdP', '..pPdddPP', '.ppPPPPPPP', '.pPPPPPPPP', '.pPPPPPPPb', '.bbbbbbbbb'], 12),
  relic: () => pad(['', '..bbbbbbbb', '.bPPPPPPPPb', '.bPbbbbbbPb', '.yyyyyyyyyy', '.yBByYYyBBy', '.bBBByyBBBb', '.bBBBBBBBBb', '.bBBBBBBBBb', '.yyyyyyyyyy', '.dddddddddd'], 12),
  pilgrim: () => pad(['', '......bbb', '.....b...b', '.........b', '........b', '...e....b', '..eEe..b', '...E..b', '.....b', '....b', '...b'], 12),
  star: () => shade(['.....##', '....####', '....####', '.##########', '..########', '...######', '...######', '..###..###', '..##....##'], GOLD),
  clock: () => over(shade(disk(6, 6, 4.6), BONE), {
    3: '......k', 4: '......k', 5: '......kkk',
  }),
  note: () => pad(['', '......yyyy', '......yOOyy', '......y...y', '......y', '......y', '......y', '...yyyy', '..yYyyO', '..yyyO', '...OO'], 12),
  lock: () => over(shade(['', '', '', '', '.##########', '.##########', '.##########', '.##########', '.##########', '.##########'], GOLD), {
    1: '....gggg', 2: '...g....g', 3: '...g....g', 4: '...g....g', 6: '.....kk', 7: '.....kk', 8: '......k',
  }),
  check: () => shade(['', '', '.........##', '........###', '.##....###', '.###..###', '..######', '...####', '....##'], GREEN, false),
  up: () => shade(['.....##', '....####', '...######', '..########', '.##########', '....####', '....####', '....####', '....####', '....####'], GREEN),
  floor: () => shade(['', '.......####', '.......####', '....#######', '....#######', '.##########', '.##########', '.##########', '.##########'], STEEL),
  gear,
  gem: () => over(shade(['', '...######', '..########', '.##########', '.##########', '..########', '...######', '....####', '.....##'], RED), {
    2: '...w', 3: '..w..v..v', 4: '.v..v..v..',
  }),
  ring: () => pad(['', '.....cc', '....cwcc', '.....cc', '...yyyyyy', '..yy....yy', '.yy......yy', '.yy......yO', '..yy....yO', '...yOOOOO'], 12),
  amulet: () => pad(['', '.g........g', '..g......g', '...g....g', '....g..g', '....yyyy', '...yjjjVy', '...yjwVVy', '...yVVVNy', '....yNNy', '.....yy'], 12),
  tome: () => pad(['', '.rrrrrrrrp', '.rRRRRRRRpw', '.rRRyyRRRpw', '.rRyRRyRRpw', '.rRRyyRRRpw', '.rRRRRRRRpw', '.rRRRRRRRpw', '.rRRRRRRRpw', '.RRRRRRRRpw', '..pppppppp'], 12),
  chalice: () => over(shade(['.##########', '.##########', '..########', '...######', '....####', '.....##', '.....##', '.....##', '...######', '..########'], GOLD), {
    1: '..RRRRRRRR',
  }),
  feather: () => pad(['', '.........ww', '........wwl', '.......wwll', '......wwll', '.....wwll', '....wwll', '...wwll', '...wll', '..g', '.g'], 12),
  hourglass: () => pad(['', '..yyyyyyyy', '...wpppPl', '...lpppPl', '....lpPl', '.....pl', '.....lK', '....lKpl', '...lKpppl', '...lppppPl', '..yyyyyyyy'], 12),
  candle: () => pad(['', '.....y', '.....Yy', '....yYo', '.....o', '....wpP', '....ppP', '....ppP', '....ppP', '..bbbbbbb', '...BBBBB'], 12),
  bell: () => over(shade(['.....##', '....####', '...######', '...######', '...######', '..########', '..########', '.##########', '', ''], GOLD), {
    9: '.....OO', 10: '.....OO',
  }),
  crown: () => over(shade(['', '.#...##...#', '.##..##..##', '.###.##.###', '.##########', '.##########', '.##########', '.##########'], GOLD), {
    6: '...r..c..r',
  }),
  orb: () => over(shade(disk(6, 5.3, 4), VIOLET), { 9: '...yyyyyy', 10: '..yOOOOOOy' }),
  rune: () => over(shade(['...######', '..########', '.##########', '.##########', '.##########', '.##########', '.##########', '.##########', '.##########', '.##########'], STEEL, false), {
    3: '.....c', 4: '....c.c', 5: '...c.c.c', 6: '.....c', 7: '.....c', 8: '....c.c',
  }),
};

const cache = new Map<IconId, HTMLCanvasElement>();

export function getIcon(id: IconId): HTMLCanvasElement {
  let c = cache.get(id);
  if (!c) {
    const def = DEFS[id];
    const g = def ? pad(def(), 12) : pad([], 12);
    c = rasterGrid(g.slice(0, 12), { w: 12, h: 12, label: `icon.${id}` });
    cache.set(id, c);
  }
  return c;
}
