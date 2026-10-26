// Dev preview of the overlay UI over a fake fight scene. Open /ui.html?sheet=party&gold=1e6&floor=34 etc.
import '../app/base.css';
import { render } from 'preact';
import { drawBackground, getFrames } from '../render/art/index.ts';
import { HEROES } from '../sim/data/heroes.ts';
import { depthOf, regionOf } from '../sim/data/regions.ts';
import { App } from './App.tsx';
import { makeMockGame, saveFromParams } from './mockGame.ts';

const q = new URLSearchParams(location.search);
const save = saveFromParams(q);
const game = makeMockGame(save, q);
(window as unknown as { game: unknown }).game = game;

/** Paint a stand-in for the canvas: backdrop + heroes in the scene, four party frames and a mana bar below. */
function paintStage(): void {
  const c = document.getElementById('stage') as HTMLCanvasElement;
  const w = c.clientWidth;
  const h = c.clientHeight;
  const dpr = devicePixelRatio;
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const x = c.getContext('2d')!;
  x.scale(dpr, dpr);
  x.imageSmoothingEnabled = false;
  const sh = game.sceneHeight.value;
  try {
    drawBackground(x, regionOf(save.floor).id, depthOf(save.floor), w, sh, 0);
  } catch {
    x.fillStyle = '#262b44';
    x.fillRect(0, 0, w, sh);
  }
  HEROES.forEach((hd, i) => {
    const f = getFrames(hd.id, 'idle')[0];
    if (f) x.drawImage(f, 30 + i * 22, sh * 0.62 - i * 8, 48, 48);
  });
  x.fillStyle = '#1d2340';
  x.fillRect(0, sh, w, h - sh);
  HEROES.forEach((hd, i) => {
    const y = sh + 10 + i * 66;
    x.fillStyle = '#262b4d';
    x.fillRect(10, y, w - 20, 58);
    x.fillStyle = '#0e1124';
    x.fillRect(80, y + 22, w - 110, 16);
    x.fillStyle = hd.color;
    x.fillRect(80, y + 22, (w - 110) * (0.9 - i * 0.18), 16);
    x.fillStyle = '#f4ecd6';
    x.font = '16px "Pixelify Sans"';
    x.fillText(hd.name, 20, y + 35);
  });
  x.fillStyle = '#5bb4ff';
  x.fillRect(10, sh + 10 + 4 * 66 + 8, (w - 20) * 0.6, 12);
}
document.fonts.ready.then(paintStage);
addEventListener('resize', paintStage);

render(<App game={game} />, document.getElementById('root')!);
