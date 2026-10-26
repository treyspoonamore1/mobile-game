// Art preview page (art.html): every sprite, anim frame, icon and backdrop.
import { getFrames, spriteSize, drawBackground, GROUND_Y_FRAC, getIcon, ICON_IDS, type Anim } from './index.ts';
import { spriteDef, artWarnings } from './raster.ts';
import type { RegionId } from '../../sim/data/regions.ts';

const root = document.getElementById('root')!;
const ANIMS: Anim[] = ['idle', 'attack', 'windup', 'cast', 'hurt', 'down'];

const GROUPS: [string, string, string[]][] = [
  ['heroes', 'Heroes', ['tomas', 'brann', 'ilse', 'wren']],
  ['healers', 'Healers + acolyte', ['healer_cleric', 'healer_chrono', 'healer_bard', 'acolyte']],
  ['enemies', 'Enemies', ['rat', 'skeleton', 'slime', 'sporeling', 'goblin_archer', 'mushroom_brute', 'ice_wraith', 'yeti', 'frost_mage', 'imp', 'magma_golem', 'fire_cultist', 'shade', 'void_eye', 'abyss_knight']],
  ['bosses', 'Bosses', ['bone_knight', 'myconid_queen', 'frost_wyrm', 'forge_tyrant', 'hollow_king']],
  ['fx', 'Effects', ['fx_slash', 'fx_bolt', 'fx_arrow', 'fx_heal', 'fx_hit', 'fx_poison', 'fx_skull']],
];

function scaled(src: HTMLCanvasElement, s: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width * s;
  c.height = src.height * s;
  const x = c.getContext('2d')!;
  x.imageSmoothingEnabled = false;
  x.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function section(id: string, title: string): HTMLElement {
  const sec = document.createElement('section');
  sec.id = id;
  sec.style.padding = '4px';
  const h = document.createElement('h2');
  h.textContent = title;
  sec.appendChild(h);
  const g = document.createElement('div');
  g.className = 'grid';
  sec.appendChild(g);
  root.appendChild(sec);
  return g;
}

function cell(parent: HTMLElement, label: string, ...els: HTMLElement[]): HTMLElement {
  const c = document.createElement('div');
  c.className = 'cell';
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.gap = '4px';
  row.style.alignItems = 'flex-end';
  els.forEach((e) => row.appendChild(e));
  c.appendChild(row);
  const s = document.createElement('span');
  s.textContent = label;
  c.appendChild(s);
  parent.appendChild(c);
  return c;
}

const params = new URLSearchParams(location.search);
const depth = Number(params.get('depth') ?? 0);

for (const [id, title, ids] of GROUPS) {
  const g = section(id, title + (depth ? ` (depth ${depth})` : ''));
  for (const sid of ids) {
    const def = spriteDef(sid);
    const scale = (def?.w ?? 16) > 16 ? 3 : 4;
    for (const a of ANIMS) {
      if (!def?.anims[a]) continue;
      const fr = getFrames(sid, a, depth).map((f) => scaled(f, scale));
      cell(g, `${sid} ${a}`, ...fr);
    }
    if (id === 'enemies' || id === 'bosses') {
      cell(g, `${sid} d1`, scaled(getFrames(sid, 'idle', 1)[0]!, scale));
    }
  }
}

// Icons
{
  const g = section('icons', 'Icons (12x12 at 4x)');
  for (const ic of ICON_IDS) cell(g, ic, scaled(getIcon(ic), 4));
}

// Backdrops with characters on the ground line
{
  const g = section('bg', 'Backdrops (2x)');
  const regions: [RegionId, number, string[]][] = [
    ['crypt', 0, ['skeleton', 'rat', 'slime']],
    ['fungal', 0, ['sporeling', 'goblin_archer', 'mushroom_brute']],
    ['frost', 0, ['ice_wraith', 'yeti', 'frost_mage']],
    ['ember', 0, ['imp', 'magma_golem', 'fire_cultist']],
    ['abyss', 0, ['shade', 'void_eye', 'abyss_knight']],
    ['crypt', 1, ['skeleton', 'bone_knight']],
  ];
  const H = [180, 130, 220, 160, 200, 170];
  const canvases: [HTMLCanvasElement, RegionId, number, string[]][] = [];
  regions.forEach(([r, d, foes], i) => {
    const c = document.createElement('canvas');
    c.width = 180 * 2;
    c.height = H[i]! * 2;
    cell(g, `${r} d${d} h${H[i]}`, c);
    canvases.push([c, r, d, foes]);
  });
  const t0 = performance.now();
  const frame = (): void => {
    const t = (performance.now() - t0) / 1000;
    for (const [c, r, d, foes] of canvases) {
      const x = c.getContext('2d')!;
      x.setTransform(2, 0, 0, 2, 0, 0);
      x.imageSmoothingEnabled = false;
      const h = c.height / 2;
      drawBackground(x, r, d, 180, h, t);
      const gy = Math.round(h * GROUND_Y_FRAC);
      const blink = Math.floor(t * 2) % 2;
      // party
      const party = ['tomas', 'brann', 'ilse', 'wren'];
      party.forEach((p, k) => {
        const f = getFrames(p, 'idle')[blink]!;
        x.drawImage(f, 60 - k * 15 - (k % 2) * 2, gy - 16 + (k % 2) * 6);
      });
      x.drawImage(getFrames('healer_cleric', 'idle')[blink]!, 4, gy - 16 + 14);
      x.drawImage(getFrames('acolyte', 'idle')[blink]!, 22, gy - 12 + 20);
      foes.forEach((e, k) => {
        const s = spriteSize(e);
        const f = getFrames(e, 'idle', d)[blink]!;
        x.drawImage(f, 100 + k * 26 - (s.w > 16 ? 8 : 0), gy - s.h + (k % 2) * 6);
      });
    }
    requestAnimationFrame(frame);
  };
  frame();
  if (artWarnings.length) document.getElementById('warn')!.textContent = [...new Set(artWarnings)].join('\n');
}

if (artWarnings.length) document.getElementById('warn')!.textContent = [...new Set(artWarnings)].join('\n');
