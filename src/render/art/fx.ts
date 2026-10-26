import { define, type Grid } from './raster.ts';

// Effects. Hero-side effects point RIGHT (slash, arrow, bolt); mirror them for enemy attacks.

class Canvas {
  px: string[][];
  constructor(public w: number, public h: number) {
    this.px = Array.from({ length: h }, () => Array<string>(w).fill('.'));
  }
  set(x: number, y: number, ch: string): void {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y]![x] = ch;
  }
  /** Small 4-point sparkle of radius r (0 = single pixel). */
  sparkle(x: number, y: number, r: number, core: string, arm: string): void {
    for (let i = 1; i <= r; i++) {
      const c = i === r ? arm : core;
      this.set(x + i, y, c); this.set(x - i, y, c); this.set(x, y + i, c); this.set(x, y - i, c);
    }
    this.set(x, y, core);
  }
  grid(): Grid {
    return this.px.map((r) => r.join(''));
  }
}

// ---------------------------------------------------------------- slash (16x16, 3 frames)
function slash(a0: number, a1: number, inner: number, outer: number): Grid {
  const c = new Canvas(16, 16);
  const cx = 3, cy = 8;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.hypot(dx, dy);
      const a = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (a < a0 || a > a1 || d < inner || d > outer) continue;
      // Thicker in the middle of the sweep, tapering to the ends.
      const t = (a - a0) / (a1 - a0);
      const thick = (outer - inner) * Math.sin(Math.PI * t);
      if (d < outer - thick - 0.3) continue;
      c.set(x, y, d > outer - 1.2 ? 'w' : d > outer - 2.2 ? 'l' : 'c');
    }
  }
  return c.grid();
}
define('fx_slash', {
  w: 16, h: 16, outline: false,
  anims: { idle: [slash(-80, -10, 8, 11.5), slash(-75, 75, 7, 12), slash(10, 80, 9, 11.5)] },
});

// ---------------------------------------------------------------- bolt (8x8, 2 frames)
define('fx_bolt', {
  w: 8, h: 8, outline: false,
  anims: {
    idle: [[
      '........',
      '....jj..',
      '.N.jwwj.',
      'NVVjwwwj',
      '.NVjwwwj',
      '...Vjwj.',
      '....VV..',
      '........',
    ], [
      '.....j..',
      '..N.jjj.',
      '.NVjwwwj',
      'NVjwwwwj',
      '.NVjwwwj',
      '..N.jjj.',
      '.....j..',
      '........',
    ]],
  },
});

// ---------------------------------------------------------------- arrow (8x3)
define('fx_arrow', {
  w: 8, h: 3,
  anims: { idle: [['ww....l.', '.rbbbbll', 'ww....l.']] },
});

// ---------------------------------------------------------------- heal burst (16x16, 4 frames)
function heal(stage: number): Grid {
  const c = new Canvas(16, 16);
  const cx = 8, cy = 9;
  if (stage === 0) {
    c.sparkle(cx, cy, 2, 'w', 'e');
  } else if (stage === 1) {
    c.sparkle(cx, cy - 1, 3, 'w', 'e');
    c.set(cx - 1, cy - 2, 'Y'); c.set(cx + 1, cy - 2, 'Y'); c.set(cx - 1, cy, 'Y'); c.set(cx + 1, cy, 'Y');
    [[-5, 2], [5, 1], [-4, -4], [4, -5]].forEach(([dx, dy]) => c.sparkle(cx + dx!, cy + dy!, 1, 'Y', 'y'));
  } else if (stage === 2) {
    c.sparkle(cx, cy - 3, 2, 'w', 'e');
    [[-6, 0], [6, -1], [-5, -6], [5, -7], [-2, 3], [3, 4]].forEach(([dx, dy], i) =>
      c.sparkle(cx + dx!, cy + dy!, i < 4 ? 1 : 0, i % 2 ? 'e' : 'Y', i % 2 ? 'E' : 'y'));
  } else {
    [[-6, -4], [6, -5], [-3, -8], [4, -10], [0, -6]].forEach(([dx, dy], i) =>
      c.sparkle(cx + dx!, cy + dy!, 0, i % 2 ? 'e' : 'y', 'y'));
  }
  return c.grid();
}
define('fx_heal', { w: 16, h: 16, outline: false, anims: { idle: [heal(0), heal(1), heal(2), heal(3)] } });

// ---------------------------------------------------------------- hit (12x12, 3 frames)
define('fx_hit', {
  w: 12, h: 12,
  anims: {
    idle: [[
      '............',
      '............',
      '............',
      '.....y......',
      '....yYy.....',
      '...yYwYy....',
      '....yYy.....',
      '.....y......',
      '............',
      '............',
      '............',
      '............',
    ], [
      '.....Y......',
      '.y...Y...y..',
      '..y..Y..y...',
      '...yYwYy....',
      '...YwwwY....',
      'YYYwwwwwYYY.',
      '...YwwwY....',
      '...yYwYy....',
      '..y..Y..y...',
      '.y...Y...y..',
      '.....Y......',
      '............',
    ], [
      '.....o......',
      'o..........o',
      '............',
      '...y...y....',
      '............',
      'o....w.....o',
      '............',
      '...y...y....',
      '............',
      'o..........o',
      '.....o......',
      '............',
    ]],
  },
});

// ---------------------------------------------------------------- poison bubble (8x8, 2 frames)
define('fx_poison', {
  w: 8, h: 8,
  anims: {
    idle: [[
      '........',
      '........',
      '...ee...',
      '..ewEe..',
      '..eEEe..',
      '...ee...',
      '......e.',
      '.e......',
    ], [
      '..e..e..',
      '.e....e.',
      '........',
      '.e....e.',
      '..e..e..',
      '........',
      '.....e..',
      '........',
    ]],
  },
});

// ---------------------------------------------------------------- skull (8x8)
define('fx_skull', {
  w: 8, h: 8,
  anims: {
    idle: [[
      '........',
      '..wwww..',
      '.wllllw.',
      '.lkllkl.',
      '.lkllkl.',
      '..llll..',
      '..lglg..',
      '........',
    ]],
  },
});
