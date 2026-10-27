import { isBossFloor, regionOf } from '../sim/data/regions.ts';
import { enrageMult, floorThreat } from '../sim/fight.ts';
import { T } from '../sim/tuning.ts';
import type { FightState, SimEvent } from '../sim/state.ts';
import { getFrames } from './art/index.ts';
import { drawFrames, newFrameAnim, updateFrameAnim, type FrameAnim, type InputView } from './frames.ts';
import { Fx } from './fx.ts';
import { computeLayout, type Layout } from './layout.ts';
import { drawScene, enemyPos, heroPos, healerPos, type SceneState } from './scene.ts';
import { drawText, short } from './text.ts';

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private low: HTMLCanvasElement;
  private lg: CanvasRenderingContext2D;
  layout: Layout;
  fx = new Fx();
  anim: FrameAnim = newFrameAnim();
  scene: SceneState = { floorStartAt: 0, now: 0 };
  showNumbers = true;
  /** Frame the tutorial is pointing at. */
  hintHero: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d', { alpha: false })!;
    this.low = document.createElement('canvas');
    this.lg = this.low.getContext('2d')!;
    this.layout = computeLayout(360, 640, 1);
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.layout = computeLayout(w, h, dpr);
    this.low.width = this.layout.artW;
    this.low.height = this.layout.artH;
  }

  /** Turn sim events into effects. */
  onEvents(s: FightState, events: readonly SimEvent[]): void {
    const L = this.layout;
    const fx = this.fx;
    const now = this.scene.now;
    for (const e of events) {
      switch (e.type) {
        case 'heal': {
          const p = heroPos(L, e.hero);
          if (e.kind === 'bloom') {
            // Lifebloom pulses are small and frequent: keep them quiet.
            if (e.amount >= 1 && this.showNumbers) fx.text(`+${short(e.amount)}`, p.x - 6, p.y - 14, '#b9f5a0', 0.75);
            break;
          }
          const color = e.beat ? '#e2b8ff' : e.kind === 'splash' ? '#b9f5a0' : '#7ee07e';
          if (e.amount >= 1 && this.showNumbers) fx.text(`+${short(e.amount)}`, p.x, p.y - 18, color, e.kind === 'splash' ? 0.85 : 1);
          fx.sprite('fx_heal', 'idle', p.x, p.y - 2, 0.06, 4);
          this.anim.flash[e.hero] = 0.6;
          break;
        }
        case 'shield': {
          const p = heroPos(L, e.hero);
          fx.burst(p.x, p.y - 8, '#8fd3ff', 6, 25, 0.4);
          break;
        }
        case 'perfect': {
          const p = heroPos(L, e.hero);
          fx.text('PERFECT!', p.x, p.y - 26, '#ffe14a', 1.8, true);
          fx.burst(p.x, p.y - 8, '#ffe14a', 18, 70, 0.8);
          fx.burst(p.x, p.y - 8, '#8fd3ff', 12, 50, 0.7);
          fx.flash = 0.5;
          fx.flashColor = '#bfefff';
          fx.shake = Math.max(fx.shake, 1.2);
          break;
        }
        case 'save': {
          const p = heroPos(L, e.hero);
          fx.text('SAVED!', p.x, p.y - 30, '#ffcf4a', 1.5, true);
          fx.burst(p.x, p.y - 10, '#ffcf4a', 10, 45, 0.6);
          break;
        }
        case 'heroHit': {
          const p = heroPos(L, e.hero);
          if (e.amount >= 1 && this.showNumbers) fx.text(`-${short(e.amount)}`, p.x + 4, p.y - 14, e.poison ? '#8be04e' : '#ff6b6b', e.big ? 1.3 : 1);
          if (e.absorbed >= 1 && this.showNumbers) fx.text(`(${short(e.absorbed)})`, p.x - 6, p.y - 20, '#8fd3ff', 0.9);
          if (!e.poison) fx.sprite('fx_hit', 'idle', p.x, p.y - 4, 0.05, 3);
          if (e.big) fx.shake = Math.max(fx.shake, 1.5);
          break;
        }
        case 'dodge': {
          const p = heroPos(L, e.hero);
          fx.text('DODGE', p.x, p.y - 18, '#c9c9e0', 0.9);
          break;
        }
        case 'heroDown': {
          const p = heroPos(L, e.hero);
          fx.sprite('fx_skull', 'idle', p.x, p.y - 18, 0.8, 1);
          fx.burst(p.x, p.y - 6, '#9aa0c3', 10, 30, 0.6);
          break;
        }
        case 'revive': {
          const p = heroPos(L, e.hero);
          fx.text(e.by === 'phoenix' ? 'REBORN!' : 'REVIVED', p.x, p.y - 24, '#ffe9a8', 1.2, true);
          fx.burst(p.x, p.y - 8, '#ffe9a8', 14, 50, 0.8);
          break;
        }
        case 'heroAttack': {
          const h = s.heroes[e.hero]!;
          const p = heroPos(L, e.hero);
          for (const t of e.targets.slice(0, 4)) {
            const ep = enemyPos(L, s, t);
            if (h.id === 'ilse') fx.sprite('fx_bolt', 'idle', p.x + 6, p.y - 10, 0.15, 1, { tx: ep.x, ty: ep.y - 8, life: 0.15 });
            else if (h.id === 'wren') fx.sprite('fx_arrow', 'idle', p.x + 6, p.y - 9, 0.13, 1, { tx: ep.x, ty: ep.y - 8, life: 0.13 });
          }
          if (h.id === 'tomas' || h.id === 'brann') {
            const ep = enemyPos(L, s, e.targets[0] ?? 0);
            fx.sprite('fx_slash', 'idle', ep.x - 2, ep.y - 2, 0.05, 3);
          }
          break;
        }
        case 'enemyHit': {
          const p = enemyPos(L, s, e.enemy);
          if (this.showNumbers) fx.text(short(e.amount), p.x, p.y - 20, e.crit ? '#ffe14a' : '#ffffff', e.crit ? 1.3 : 0.85);
          break;
        }
        case 'enemyDie': {
          const p = enemyPos(L, s, e.enemy);
          fx.burst(p.x, p.y - 8, '#ffffff', 10, 40, 0.5);
          fx.coins(p.x, p.y - 8, s.enemies[e.enemy]?.def.boss ? 14 : 4, L.artW - 10, 2);
          break;
        }
        case 'telegraph': {
          const p = enemyPos(L, s, e.enemy);
          fx.text(e.name, p.x, p.y - 34, '#ffb36b', 0.95, true);
          break;
        }
        case 'sanctuary':
          fx.flash = 0.7;
          fx.flashColor = '#ffe9a8';
          fx.banner('SANCTUARY', '', '#ffe9a8', 1);
          break;
        case 'encore':
          fx.banner('ENCORE!', '', '#e2b8ff', 0.9);
          break;
        case 'anthem': {
          const p = healerPos(L);
          fx.burst(p.x, p.y - 10, '#e2b8ff', 16, 50, 0.7);
          break;
        }
        case 'stun': {
          const p = enemyPos(L, s, e.enemy);
          fx.text('STUNNED', p.x, p.y - 30, '#ffe14a', 0.95, true);
          break;
        }
        case 'cleanse': {
          const p = heroPos(L, e.hero);
          fx.burst(p.x, p.y - 8, '#c8ffb0', 8, 30, 0.5);
          break;
        }
        case 'acolyteCast':
          this.anim.acolyteAt[e.hero] = now;
          break;
        case 'oom':
          this.anim.oomAt = now;
          break;
        case 'floorStart':
          this.scene.floorStartAt = now;
          if (e.boss) fx.banner(s.enemies[0]?.def.name ?? 'Boss', `Floor ${e.floor}`, '#ff8a8a', 2);
          else if (e.floor % 10 === 1) fx.banner(regionOf(e.floor).name, `Floor ${e.floor}`, '#f4ecd6', 1.8);
          break;
        case 'floorClear':
          if (e.boss) fx.banner('VICTORY', `${s.enemies[0]?.def.name ?? 'Boss'} falls`, '#ffe14a', 1.8);
          break;
        case 'wipe':
          fx.banner('THE PARTY HAS FALLEN', `Back to floor ${e.checkpoint}`, '#ff6b6b', 2.4);
          break;
        case 'retreat':
          fx.banner('TOO TOUGH FOR NOW', `Farming floor ${e.farm}, then trying ${e.wall} again`, '#ffcf4a', 2.6);
          break;
        default:
          break;
      }
    }
  }

  render(s: FightState, input: InputView, dt: number): void {
    const L = this.layout;
    const g = this.g;
    this.scene.now += dt;
    this.fx.update(dt);
    updateFrameAnim(this.anim, s, dt);

    // Scene, at art resolution, then scaled up.
    drawScene(this.lg, L, s, this.fx, this.scene);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#14182e';
    g.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const shake = this.fx.shake > 0 ? Math.round((Math.random() - 0.5) * this.fx.shake * 2) * L.scale : 0;
    g.drawImage(this.low, shake, 0, L.artW * L.scale, L.artH * L.scale);

    // Overlays in CSS px.
    g.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    const k = L.scale / L.dpr;
    if (this.fx.flash > 0) {
      g.save();
      g.globalAlpha = Math.min(0.6, this.fx.flash);
      g.fillStyle = this.fx.flashColor;
      g.fillRect(0, 0, L.w, L.sceneH);
      g.restore();
    }
    if (s.sanctuaryT > 0) {
      g.save();
      g.globalAlpha = 0.12 + 0.06 * Math.sin(this.scene.now * 8);
      g.fillStyle = '#ffe9a8';
      g.fillRect(0, 0, L.w, L.sceneH);
      g.restore();
    }
    if (s.anthemT > 0) {
      g.save();
      g.globalAlpha = 0.08;
      g.fillStyle = '#c48cff';
      g.fillRect(0, 0, L.w, L.sceneH);
      g.restore();
    }
    this.drawTexts(g, k);
    this.drawBossBar(g, s, L);
    this.drawHud(g, s, L);
    if (s.phase === 'wipe') {
      g.save();
      g.globalAlpha = 0.45;
      g.fillStyle = '#000000';
      g.fillRect(0, 0, L.w, L.sceneH);
      g.restore();
    }
    this.drawBanner(g, L);

    // Bottom panel.
    g.fillStyle = '#14182e';
    g.fillRect(0, L.sceneH, L.w, L.h - L.sceneH);
    g.fillStyle = '#0b0d1a';
    g.fillRect(0, L.sceneH, L.w, 3);
    drawFrames(g, L, s, this.anim, input, this.scene.now);
    if (this.hintHero !== null) this.drawHintPointer(g, L);
  }

  private drawHintPointer(g: CanvasRenderingContext2D, L: Layout): void {
    const r = L.frames[this.hintHero!];
    if (!r) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.scene.now * 7);
    g.save();
    g.strokeStyle = `rgba(255,225,74,${0.5 + pulse * 0.5})`;
    g.lineWidth = 3;
    g.strokeRect(r.x - 1.5, r.y - 1.5, r.w + 3, r.h + 3);
    // A chunky pixel arrow bobbing toward the frame from the right.
    const ax = r.x + r.w - 26 - pulse * 8;
    const ay = r.y + r.h / 2;
    g.fillStyle = '#0b0d1a';
    g.fillRect(ax - 2, ay - 9, 22, 18);
    g.fillStyle = '#ffe14a';
    for (let k = 0; k < 7; k++) g.fillRect(ax + k * 2, ay - k, 2, k * 2 + 1);
    g.fillRect(ax + 14, ay - 3, 6, 7);
    g.restore();
  }

  private drawTexts(g: CanvasRenderingContext2D, k: number): void {
    for (const t of this.fx.texts) {
      const life = t.age / t.life;
      const popScale = t.pop ? 1 + Math.max(0, 0.6 - t.age * 4) : 1;
      const alpha = life > 0.7 ? 1 - (life - 0.7) / 0.3 : 1;
      drawText(g, t.text, t.x * k, t.y * k, {
        size: Math.round(13 * t.size * popScale), color: t.color, align: 'center', outline: t.outline, outlineW: 4, alpha, weight: 700,
      });
    }
  }

  private drawBossBar(g: CanvasRenderingContext2D, s: FightState, L: Layout): void {
    const boss = s.enemies.find((e) => e.def.boss);
    if (!boss || !boss.alive || s.phase !== 'fight') return;
    const x = 14;
    const w = L.w - 28;
    const y = 30;
    const h = 12;
    g.fillStyle = '#0b0d1a';
    g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle = '#4a1f2a';
    g.fillRect(x, y, w, h);
    g.fillStyle = '#e04a4a';
    g.fillRect(x, y, Math.round((w * boss.hp) / boss.maxHp), h);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(x, y, Math.round((w * boss.hp) / boss.maxHp), 3);
    drawText(g, boss.def.name, L.w / 2, y - 10, { size: 14, color: '#ffd1d1', align: 'center', outline: '#0b0d1a', outlineW: 4 });
  }

  private drawHud(g: CanvasRenderingContext2D, s: FightState, L: Layout): void {
    if (s.phase === 'fight') {
      // Danger: how hard this floor hits your frailest hero.
      const top = isBossFloor(s.floor) ? 58 : 18;
      const threat = floorThreat(s);
      const tColor = threat.level === 'easy' ? '#7ee07e' : threat.level === 'tough' ? '#ffcf4a' : '#ff5a5a';
      const tText = threat.level === 'easy' ? 'Easy' : threat.level === 'tough' ? 'Tough' : 'Deadly';
      drawText(g, `● ${tText}`, 12, top, { size: 12, color: tColor, outline: '#0b0d1a', outlineW: 4 });
      // Enrage: a countdown in the last 10 s, then the growing damage multiplier.
      const after = isBossFloor(s.floor) ? T.enrageAfterBoss : T.enrageAfter;
      const left = after - s.phaseT;
      const y = top + 18;
      const mult = enrageMult(s);
      if (mult > 1) {
        const pulse = 0.6 + 0.4 * Math.sin(this.scene.now * 10);
        drawText(g, `ENRAGED ×${mult.toFixed(1)}`, 12, y, { size: 14, color: '#ff5a5a', outline: '#0b0d1a', outlineW: 4, alpha: pulse, weight: 700 });
      } else if (left <= 10) {
        drawText(g, `Enrage in ${Math.ceil(left)}s`, 12, y, { size: 12, color: '#ffb36b', outline: '#0b0d1a', outlineW: 4 });
      }
    }
    const boss = isBossFloor(s.floor) && s.phase === 'fight';
    if (boss) return;
    const alive = s.enemies.filter((e) => e.alive).length;
    if (s.phase === 'walk') {
      const text = s.farmLeft > 0 && s.floor >= s.farmFloor
        ? `Farming floor ${s.floor} · ${s.farmLeft} more, then onward`
        : s.autoAdvance ? `Onward to floor ${s.floor}…` : `Again: floor ${s.floor}`;
      drawText(g, text, L.w / 2, 18, { size: 13, color: '#c9c9e0', align: 'center', outline: '#0b0d1a', outlineW: 4 });
    } else if (alive > 0) {
      drawText(g, `${alive} ${alive === 1 ? 'foe' : 'foes'}`, L.w - 12, 18, { size: 12, color: '#9aa0c3', align: 'right', outline: '#0b0d1a', outlineW: 4 });
    }
  }

  private drawBanner(g: CanvasRenderingContext2D, L: Layout): void {
    const f = this.fx;
    if (f.bannerAge >= f.bannerLife) return;
    const t = f.bannerAge / f.bannerLife;
    const alpha = t < 0.1 ? t / 0.1 : t > 0.8 ? (1 - t) / 0.2 : 1;
    const y = L.sceneH * 0.32;
    g.save();
    g.globalAlpha = alpha * 0.55;
    g.fillStyle = '#0b0d1a';
    g.fillRect(0, y - 26, L.w, f.bannerSub ? 62 : 46);
    g.restore();
    const scale = 1 + Math.max(0, 0.3 - f.bannerAge * 2);
    drawText(g, f.bannerText, L.w / 2, y - 2, { size: Math.round(26 * scale), color: f.bannerColor, align: 'center', outline: '#0b0d1a', outlineW: 5, alpha, weight: 700 });
    if (f.bannerSub) drawText(g, f.bannerSub, L.w / 2, y + 24, { size: 14, color: '#f4ecd6', align: 'center', outline: '#0b0d1a', outlineW: 4, alpha });
  }

  /** Make sure every sprite is rasterized before the first frame. */
  warm(ids: string[]): void {
    for (const id of ids) getFrames(id, 'idle');
  }
}
