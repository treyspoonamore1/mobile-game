import { orderDef } from '../sim/data/orders.ts';
import { BEAT_PERIOD, BEAT_TOLERANCE, beatOffset } from '../sim/spells.ts';
import { incomingOn, type FightState } from '../sim/state.ts';
import { T } from '../sim/tuning.ts';
import { isMech } from '../sim/data/mechanics.ts';
import { getFrames, getIcon } from './art/index.ts';
import type { Layout } from './layout.ts';
import { drawText, short } from './text.ts';

/** What the input layer shows on the frames. */
export interface InputView {
  /** Hero index → hold progress 0..1 for fingers currently down on a frame. */
  pressed: Map<number, number>;
  /** Frames touched by an ongoing swipe, in order. */
  chain: number[];
  chainPoint: { x: number; y: number } | null;
  sanctuaryDown: boolean;
}

/** Smoothed values for juicy bars. */
export interface FrameAnim {
  shown: number[];
  ghost: number[];
  ghostHold: number[];
  flash: number[];
  acolyteAt: number[];
  oomAt: number;
}

export function newFrameAnim(): FrameAnim {
  return { shown: [1, 1, 1, 1], ghost: [1, 1, 1, 1], ghostHold: [0, 0, 0, 0], flash: [0, 0, 0, 0], acolyteAt: [-9, -9, -9, -9], oomAt: -9 };
}

export function updateFrameAnim(a: FrameAnim, s: FightState, dt: number): void {
  s.heroes.forEach((h, i) => {
    const f = h.alive ? h.hp / h.stats.maxHp : 0;
    a.shown[i] = f > a.shown[i]! ? Math.min(f, a.shown[i]! + dt * 2.5) : f;
    if (f < a.ghost[i]!) {
      a.ghostHold[i]! -= dt;
      if (a.ghostHold[i]! <= 0) a.ghost[i] = Math.max(f, a.ghost[i]! - dt * 0.8);
    } else {
      a.ghost[i] = f;
      a.ghostHold[i] = 0.35;
    }
    a.flash[i] = Math.max(0, a.flash[i]! - dt * 3);
  });
}

function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string): void {
  g.fillStyle = c;
  g.fillRect(x, y, w, h);
}

/** A chunky pixel panel: dark outline, body, top highlight. */
function panel(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, body: string, border: string, hi = 'rgba(255,255,255,0.07)'): void {
  rect(g, x + 2, y, w - 4, h, border);
  rect(g, x, y + 2, w, h - 4, border);
  rect(g, x + 2, y + 2, w - 4, h - 4, body);
  rect(g, x + 4, y + 3, w - 8, 2, hi);
}

function lifeColor(f: number): string {
  if (f > 0.5) return '#5fd35f';
  if (f > 0.25) return '#f2c94c';
  return '#ff5a5a';
}

export function drawFrames(g: CanvasRenderingContext2D, L: Layout, s: FightState, a: FrameAnim, input: InputView, now: number): void {
  const bard = s.loadout.order === 'bard';
  const onBeat = bard && beatOffset(s.t) <= BEAT_TOLERANCE;
  s.heroes.forEach((h, i) => {
    const r = L.frames[i]!;
    const down = input.pressed.get(i);
    const inChain = input.chain.includes(i);
    const inset = down !== undefined || inChain ? 2 : 0;
    const x = r.x + inset;
    const y = r.y + inset;
    const w = r.w - inset * 2;
    const hh = r.h - inset * 2;
    const inc = h.alive ? incomingOn(s, i) : null;
    const perfectNow = !!inc && inc.left <= s.loadout.perfectWindow;
    const low = h.alive && h.hp / h.stats.maxHp < 0.3;
    let border = '#0b0d1a';
    if (inc) border = perfectNow ? '#ffe14a' : Math.floor(now * 8) % 2 ? '#ff4a4a' : '#7a1a1a';
    else if (inChain) border = '#7ee07e';
    else if (onBeat) border = '#c48cff';
    let body = !h.alive ? '#1a1d33' : h.plagueT > 0 ? '#23402a' : h.frostT > 0 ? '#1f3550' : '#262b4d';
    if (low) body = Math.floor(now * 4) % 2 ? '#4a2333' : '#3a2140';
    if (down !== undefined || inChain) body = h.alive ? '#323a66' : '#262840';
    panel(g, x, y, w, hh, body, border);
    if (inc) {
      // Thick warning border.
      g.strokeStyle = border;
      g.lineWidth = 3;
      g.strokeRect(x + 1.5, y + 1.5, w - 3, hh - 3);
    }

    // Portrait.
    const pSize = hh - 12;
    const px0 = x + 6;
    const py0 = y + 6;
    rect(g, px0, py0, pSize, pSize, h.alive ? '#1a1e38' : '#141628');
    const img = getFrames(h.id, h.alive ? 'idle' : 'down')[0];
    if (img) {
      const sc = Math.floor(pSize / 16) || 1;
      g.save();
      g.imageSmoothingEnabled = false;
      if (!h.alive) g.globalAlpha = 0.5;
      g.drawImage(img, px0 + (pSize - 16 * sc) / 2, py0 + (pSize - 16 * sc) / 2, 16 * sc, 16 * sc);
      g.restore();
    }

    const bx = px0 + pSize + 8;
    const warnW = inc ? 54 : 0;
    const bw = x + w - 8 - bx - warnW;
    // Name row.
    const nameY = y + hh * 0.27;
    drawText(g, h.stats.def.name, bx, nameY, { size: Math.round(hh * 0.25), color: h.alive ? '#f4ecd6' : '#7d7f99', outline: '#0b0d1a', outlineW: 3 });
    const status = h.alive ? statusOf(s, i, now) : null;
    if (status) drawText(g, status.text, bx + bw, nameY, { size: Math.round(hh * 0.19), color: status.color, align: 'right', outline: '#0b0d1a', outlineW: 3 });

    // Life bar.
    const barY = y + hh * 0.48;
    const barH = Math.round(hh * 0.36);
    rect(g, bx - 2, barY - 2, bw + 4, barH + 4, '#0b0d1a');
    rect(g, bx, barY, bw, barH, '#3a1f2e');
    if (h.alive) {
      const ghostW = Math.round(bw * a.ghost[i]!);
      rect(g, bx, barY, ghostW, barH, '#ffd1d1');
      const shownW = Math.round(bw * a.shown[i]!);
      const f = h.hp / h.stats.maxHp;
      rect(g, bx, barY, shownW, barH, h.frostT > 0 ? '#7fc8ff' : h.plagueT > 0 || h.poisonT > 0 ? '#7cc24a' : lifeColor(f));
      rect(g, bx, barY, shownW, 3, 'rgba(255,255,255,0.3)');
      rect(g, bx, barY + barH - 3, shownW, 3, 'rgba(0,0,0,0.2)');
      if (h.shield > 0) {
        const sw = Math.min(bw, Math.round((bw * h.shield) / h.stats.maxHp));
        const sx = Math.min(bx + shownW, bx + bw - sw);
        g.save();
        g.globalAlpha = 0.85;
        rect(g, sx, barY, sw, barH, '#8fd3ff');
        g.globalAlpha = 0.5;
        for (let k = 0; k < sw; k += 6) rect(g, sx + k, barY, 2, barH, '#ffffff');
        g.restore();
      }
      if (a.flash[i]! > 0) {
        g.save();
        g.globalAlpha = a.flash[i]!;
        rect(g, bx, barY, bw, barH, '#c8ffc8');
        g.restore();
      }
      if (judgedSoon(s, i)) {
        // Judgement: the line they must be above when the mark ends.
        const lx = bx + Math.round(bw * T.judgementLine);
        rect(g, lx - 1, barY - 4, 3, barH + 8, Math.floor(now * 8) % 2 ? '#ffe14a' : '#fff6c0');
      }
      const label = h.shield > 0 ? `${short(h.hp)} +${short(h.shield)}` : `${short(h.hp)} / ${short(h.stats.maxHp)}`;
      drawText(g, label, bx + bw / 2, barY + barH / 2 + 1, { size: Math.round(barH * 0.62), color: '#ffffff', align: 'center', outline: '#0b0d1a', outlineW: 3 });
    } else {
      drawText(g, `Fallen · tap to Revive (${T.reviveCost})`, bx + bw / 2, barY + barH / 2 + 1, { size: Math.round(barH * 0.55), color: '#c9c9e0', align: 'center', outline: '#0b0d1a', outlineW: 3 });
    }

    // Incoming heavy blow: a timer that fills toward the gold Perfect zone.
    if (inc) {
      const wx = x + w - 8 - warnW + 6;
      const wy = y + 8;
      const ww = warnW - 6;
      const wh = hh - 16;
      rect(g, wx, wy, ww, wh, '#0b0d1a');
      const k = 1 - inc.left / inc.total;
      const zone = Math.min(1, s.loadout.perfectWindow / inc.total);
      rect(g, wx + 2, wy + 2, ww - 4, wh - 4, '#2a1020');
      rect(g, wx + 2, wy + 2, Math.round((ww - 4) * k), wh - 4, perfectNow ? '#ffe14a' : '#ff5a5a');
      rect(g, wx + 2 + Math.round((ww - 4) * (1 - zone)), wy + 2, 2, wh - 4, '#ffe14a');
      drawText(g, perfectNow ? orderDef(s.loadout.order).hold.toUpperCase() : '!', wx + ww / 2, wy + wh / 2 + 1, {
        size: perfectNow ? Math.round(wh * 0.36) : Math.round(wh * 0.7), color: '#ffffff', align: 'center', outline: '#0b0d1a', outlineW: 3,
      });
    }

    // Hold progress along the bottom edge.
    if (down !== undefined && h.alive) {
      rect(g, x + 4, y + hh - 6, (w - 8) * down, 3, down >= 1 ? '#8fd3ff' : '#f4ecd6');
    }
    // An Acolyte just cast on this hero.
    if (now - a.acolyteAt[i]! < 0.5) {
      const ic = getIcon('acolyte');
      g.save();
      g.globalAlpha = 1 - (now - a.acolyteAt[i]!) / 0.5;
      g.imageSmoothingEnabled = false;
      g.drawImage(ic, px0 + pSize - 14, py0 - 2 - (now - a.acolyteAt[i]!) * 20, 24, 24);
      g.restore();
    }
  });

  // Swipe trail.
  if (input.chain.length > 0) {
    g.save();
    g.strokeStyle = 'rgba(126,224,126,0.8)';
    g.lineWidth = 4;
    g.setLineDash([8, 6]);
    g.beginPath();
    input.chain.forEach((i, k) => {
      const r = L.frames[i]!;
      const cx = r.x + 40;
      const cy = r.y + r.h / 2;
      if (k === 0) g.moveTo(cx, cy);
      else g.lineTo(cx, cy);
    });
    if (input.chainPoint) g.lineTo(input.chainPoint.x, input.chainPoint.y);
    g.stroke();
    g.restore();
  }

  drawSiphon(g, L, s, now);
  drawMana(g, L, s, a, now);
  drawSanctuary(g, L, s, input, now);
  if (bard) drawBeat(g, L, s);
}

function drawMana(g: CanvasRenderingContext2D, L: Layout, s: FightState, a: FrameAnim, now: number): void {
  const r = L.mana;
  const oom = now - a.oomAt < 0.6 && Math.floor(now * 12) % 2 === 0;
  panel(g, r.x, r.y, r.w, r.h, '#1d2340', oom ? '#5bb4ff' : '#0b0d1a');
  const ic = getIcon('mana');
  g.save();
  g.imageSmoothingEnabled = false;
  g.drawImage(ic, r.x + 8, r.y + (r.h - 24) / 2, 24, 24);
  g.restore();
  const bx = r.x + 40;
  const bw = r.w - 50;
  const bh = Math.round(r.h * 0.42);
  const by = r.y + (r.h - bh) / 2;
  rect(g, bx - 2, by - 2, bw + 4, bh + 4, '#0b0d1a');
  rect(g, bx, by, bw, bh, '#14244a');
  const f = s.mana / s.loadout.manaMax;
  rect(g, bx, by, Math.round(bw * f), bh, '#3f8fe8');
  rect(g, bx, by, Math.round(bw * f), 3, 'rgba(255,255,255,0.35)');
  // Ticks at each Mend's cost.
  const step = s.loadout.mendCost / s.loadout.manaMax;
  if (step > 0.04) {
    for (let k = step; k < 1; k += step) rect(g, bx + Math.round(bw * k), by + bh - 4, 1, 4, 'rgba(11,13,26,0.6)');
  }
  drawText(g, oom ? 'OUT OF MANA' : `${Math.floor(s.mana)} / ${Math.round(s.loadout.manaMax)}`, bx + bw / 2, by + bh / 2 + 1, {
    size: Math.round(bh * 0.7), color: '#ffffff', align: 'center', outline: '#0b0d1a', outlineW: 3,
  });
}

function drawSanctuary(g: CanvasRenderingContext2D, L: Layout, s: FightState, input: InputView, now: number): void {
  const r = L.sanctuary;
  const f = s.resonance / T.resonanceMax;
  const ready = f >= 1;
  const active = s.sanctuaryT > 0;
  const inset = input.sanctuaryDown && ready ? 2 : 0;
  const glow = ready ? 0.5 + 0.5 * Math.sin(now * 6) : 0;
  panel(g, r.x + inset, r.y + inset, r.w - inset * 2, r.h - inset * 2, ready ? '#5a4a1a' : '#1d2340', ready ? `rgba(255,225,74,${0.6 + glow * 0.4})` : '#0b0d1a');
  const ix = r.x + inset + 4;
  const iw = r.w - inset * 2 - 8;
  rect(g, ix, r.y + r.h - 9, iw, 4, '#0b0d1a');
  rect(g, ix, r.y + r.h - 9, Math.round(iw * (active ? s.sanctuaryT / T.sanctuaryDur : f)), 4, active ? '#ffffff' : '#ffcf4a');
  const ic = getIcon('sanctuary');
  g.save();
  g.imageSmoothingEnabled = false;
  if (!ready && !active) g.globalAlpha = 0.45;
  g.drawImage(ic, r.x + 8, r.y + (r.h - 24) / 2 - 3, 24, 24);
  g.restore();
  const label = active ? 'SANCTUARY!' : ready ? 'SANCTUARY' : `${Math.floor(f * 100)}%`;
  drawText(g, label, r.x + 36 + (r.w - 40) / 2, r.y + r.h / 2 - 2, {
    size: ready ? Math.round(r.h * 0.3) : Math.round(r.h * 0.34), color: ready || active ? '#ffe9a8' : '#9aa0c3', align: 'center', outline: '#0b0d1a', outlineW: 3,
  });
}

function drawBeat(g: CanvasRenderingContext2D, L: Layout, s: FightState): void {
  // A metronome pip that pulses on every beat, above the mana bar.
  const r = L.mana;
  const k = (s.t % BEAT_PERIOD) / BEAT_PERIOD;
  const pulse = Math.max(0, 1 - Math.min(k, 1 - k) * 6);
  g.save();
  g.globalAlpha = 0.4 + pulse * 0.6;
  rect(g, r.x + r.w / 2 - 20 - pulse * 10, r.y - 5, 40 + pulse * 20, 3, '#c48cff');
  g.restore();
}

/** Is this hero marked by a Judgement that is winding up? */
function judgedSoon(s: FightState, hero: number): boolean {
  return s.enemies.some((e) => e.alive && e.windup && isMech(e.windup.attack) && e.windup.attack.mech === 'judgement' && e.windup.targets.includes(hero));
}

/** The most urgent status to print on a hero's frame. */
function statusOf(s: FightState, i: number, now: number): { text: string; color: string } | null {
  const h = s.heroes[i]!;
  if (h.plagueT > 0) return { text: `PLAGUE ${h.plagueT.toFixed(1)}s · MEND!`, color: Math.floor(now * 6) % 2 ? '#8be04e' : '#d8ffb0' };
  if (h.frostT > 0) return { text: 'FROSTBITE · HEAL TO FULL', color: '#9fdcff' };
  if (judgedSoon(s, i)) {
    const ok = h.hp / h.stats.maxHp >= T.judgementLine;
    return { text: ok ? 'JUDGEMENT · SAFE' : 'JUDGEMENT · ABOVE 90%!', color: ok ? '#7ee07e' : '#ffe14a' };
  }
  if (h.poisonT > 0) return { text: 'POISON', color: '#8be04e' };
  if (h.stats.rage > 0) {
    const bonus = Math.round(h.stats.rage * (1 - h.hp / h.stats.maxHp) * 100);
    if (bonus >= 10) return { text: `RAGE +${bonus}%`, color: '#ff8a5a' };
  }
  return null;
}

/** Siphon: a warning while it winds up, then a "don't cast" veil over the frames while it's open. */
function drawSiphon(g: CanvasRenderingContext2D, L: Layout, s: FightState, now: number): void {
  let windupLeft = -1;
  for (const e of s.enemies) {
    const w = e.windup;
    if (e.alive && w && isMech(w.attack) && w.attack.mech === 'siphon') windupLeft = w.total - w.t;
  }
  if (s.siphonT <= 0 && windupLeft < 0) return;
  const top = L.frames[0]!;
  const bottom = L.frames[L.frames.length - 1]!;
  const y0 = top.y - 4;
  const h = bottom.y + bottom.h - top.y + 8;
  g.save();
  if (s.siphonT > 0) {
    g.globalAlpha = 0.55 + 0.1 * Math.sin(now * 8);
    g.fillStyle = '#2a1640';
    g.fillRect(0, y0, L.w, h);
    g.globalAlpha = 1;
    drawText(g, "SIPHON · DON'T CAST", L.w / 2, y0 + h / 2 - 14, { size: 26, color: '#e2b8ff', align: 'center', outline: '#0b0d1a', outlineW: 6, weight: 700 });
    drawText(g, `${s.siphonT.toFixed(1)}s`, L.w / 2, y0 + h / 2 + 18, { size: 20, color: '#ffffff', align: 'center', outline: '#0b0d1a', outlineW: 5 });
  } else {
    g.globalAlpha = 0.18 + 0.12 * Math.sin(now * 12);
    g.fillStyle = '#c48cff';
    g.fillRect(0, y0, L.w, h);
    g.globalAlpha = 1;
    // A pill straddling the top edge of the frames, clear of the names.
    const text = `SIPHON IN ${windupLeft.toFixed(1)}s · CAST NOW, THEN WAIT`;
    const py = top.y - 10;
    g.fillStyle = '#0b0d1a';
    g.fillRect(16, py - 13, L.w - 32, 26);
    g.fillStyle = '#2a1640';
    g.fillRect(18, py - 11, L.w - 36, 22);
    drawText(g, text, L.w / 2, py + 1, { size: 13, color: '#e2b8ff', align: 'center', outline: '#0b0d1a', outlineW: 3, weight: 700 });
  }
  g.restore();
}
