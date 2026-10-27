import './base.css';
import { signal } from '@preact/signals';
import { h, render } from 'preact';
import { setHapticsEnabled, setMusic, setMuted, setVolumes, unlockAudio, playSfx, haptic, type MusicTrack } from '../audio/index.ts';
import { runOffline } from '../meta/offline.ts';
import { pilgrimage as doPilgrimage } from '../meta/pilgrimage.ts';
import { newSave, parseSave, type Save } from '../meta/save.ts';
import { applyEvents, newFight, pickRelic as metaPickRelic, refreshLoadout, type MetaNote } from '../meta/session.ts';
import { buyDevotionUpgrade, buyGoldUpgrade, buyHero } from '../meta/shop.ts';
import { claimDeed } from '../meta/deeds.ts';
import { learnTalent, resetTalents } from '../meta/healer.ts';
import { autoEquip, equip, merge, mergeAll, salvageItem, unequip } from '../meta/gear.ts';
import { itemName, RARITIES } from '../sim/data/gear.ts';
import { deedDef } from '../sim/data/deeds.ts';
import { Renderer } from '../render/renderer.ts';
import { isBossFloor, regionOf } from '../sim/data/regions.ts';
import { DT, step } from '../sim/fight.ts';
import type { FightState } from '../sim/state.ts';
import { T } from '../sim/tuning.ts';
import { App } from '../ui/App.tsx';
import type { Game, Modal, Toast } from './game.ts';
import { Gestures } from './input.ts';
import { soundEvents } from './sound.ts';
import { Coach } from './tutorial.ts';

const KEY = 'lifeline-save-v1';

function loadSave(): Save {
  let json: string | null = null;
  try {
    json = localStorage.getItem(KEY);
  } catch {
    json = null;
  }
  return parseSave(json, (Math.random() * 2 ** 31) >>> 0);
}

function store(save: Save): void {
  save.lastSeen = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage can be unavailable (private mode); the game still runs.
  }
}

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const renderer = new Renderer(canvas);
let save = loadSave();
let fight: FightState = newFight(save);
let toastId = 0;
let slowmo = 0;
let wasHidden = false;

const game: Game = {
  save,
  version: signal(0),
  sheet: signal(null),
  modal: signal(null),
  hint: signal(null),
  toasts: signal<Toast[]>([]),
  sceneHeight: signal(renderer.layout.sceneH),
  fight: () => fight,

  openSheet(id) {
    game.sheet.value = id;
    bump();
  },
  closeModal() {
    const m = game.modal.value;
    game.modal.value = null;
    if (m?.kind === 'welcome') save.tutorial.welcome = true;
    if (m?.kind === 'unlock' && m.id === 'relics') save.tutorial.relics = true;
    nextModal();
    bump();
  },
  openModal(m: Modal) {
    game.modal.value = m;
    bump();
  },
  toast(text, tone = 'info') {
    const t = { id: ++toastId, text, tone };
    game.toasts.value = [...game.toasts.value.slice(-3), t];
    setTimeout(() => (game.toasts.value = game.toasts.value.filter((x) => x.id !== t.id)), 3200);
  },
  buyHero(id, max) {
    const n = buyHero(save, id, max);
    afterBuy(n > 0);
    if (n > 0) {
      coach.boughtHero();
      playSfx('levelup');
    }
  },
  buyGold(id) {
    afterBuy(buyGoldUpgrade(save, id));
  },
  buyDevotion(id) {
    afterBuy(buyDevotionUpgrade(save, id));
  },
  learnTalent(id) {
    const ok = learnTalent(save, id);
    if (ok) {
      refreshLoadout(save, fight);
      playSfx('levelup');
      haptic('buy');
    } else game.uiTap(false);
    bump();
  },
  resetTalents() {
    resetTalents(save);
    refreshLoadout(save, fight);
    game.uiTap();
    bump();
  },
  claimDeed(id) {
    const gold = claimDeed(save, id);
    if (gold === null) {
      game.uiTap(false);
      return;
    }
    refreshLoadout(save, fight);
    playSfx('relic');
    haptic('save');
    game.toast(`${deedDef(id).name} claimed! +${shortGold(gold)} gold`, 'gold');
    bump();
  },
  equip(hero, uid) {
    afterGear(equip(save, hero, uid));
  },
  unequip(hero, slot) {
    afterGear(unequip(save, hero, slot));
  },
  salvage(uid) {
    const g = salvageItem(save, uid);
    if (g !== null) playSfx('gold');
    afterGear(g !== null);
  },
  merge(uids) {
    const out = merge(save, uids);
    if (out) game.toast(`Merged into ${itemName(out)}!`, 'gold');
    afterGear(!!out, 'relic');
  },
  mergeAll() {
    const made = mergeAll(save);
    if (made.length > 0) game.toast(`Merged ${made.length} item${made.length > 1 ? 's' : ''}!`, 'gold');
    afterGear(made.length > 0, 'relic');
  },
  autoEquip() {
    afterGear(autoEquip(save) > 0);
  },
  setAutoSalvage(below) {
    save.autoSalvageBelow = below;
    game.uiTap();
    bump();
  },
  setPrayer(slot, prayer) {
    save.progress.acolytes[slot] = prayer;
    refreshLoadout(save, fight);
    game.uiTap();
    bump();
  },
  pickRelic(id) {
    metaPickRelic(save, id);
    refreshLoadout(save, fight);
    playSfx('relic');
    haptic('buy');
    game.modal.value = null;
    nextModal();
    bump();
  },
  pilgrimage(order) {
    const gain = doPilgrimage(save, order);
    fight = newFight(save);
    renderer.fx.banner('A NEW PILGRIMAGE', `+${gain} Devotion`, '#c48cff', 2.4);
    playSfx('pilgrimage');
    haptic('save');
    game.modal.value = null;
    game.sheet.value = null;
    store(save);
    bump();
  },
  setAutoAdvance(on) {
    save.autoAdvance = on;
    fight.autoAdvance = on;
    bump();
  },
  setSettings(s) {
    Object.assign(save.settings, s);
    applySettings();
    bump();
  },
  resetSave() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
    replaceSave(newSave((Math.random() * 2 ** 31) >>> 0));
    game.modal.value = { kind: 'welcome' };
  },
  exportSave() {
    store(save);
    return btoa(unescape(encodeURIComponent(JSON.stringify(save))));
  },
  importSave(text) {
    try {
      const json = decodeURIComponent(escape(atob(text.trim())));
      const parsed = parseSave(json, save.seed);
      if (!parsed.progress?.heroLevels) return false;
      replaceSave(parsed);
      store(save);
      return true;
    } catch {
      return false;
    }
  },
  uiTap(ok = true) {
    playSfx(ok ? 'ui_tap' : 'ui_error');
    haptic('tap');
  },
};

const coach = new Coach(game);
const gestures = new Gestures(canvas, () => renderer.layout);
gestures.enabled = () => !paused() && game.sheet.value === null;
gestures.onPress = (kind) => {
  if (kind === 'tap') haptic('tap');
};

function shortGold(n: number): string {
  return n >= 1e6 ? n.toExponential(1) : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : Math.round(n).toString();
}

function afterGear(ok: boolean, sfx: 'buy' | 'relic' = 'buy'): void {
  if (ok) {
    refreshLoadout(save, fight);
    playSfx(sfx);
    haptic('buy');
  } else game.uiTap(false);
  bump();
}

function bump(): void {
  game.version.value++;
}

function afterBuy(ok: boolean): void {
  if (ok) {
    refreshLoadout(save, fight);
    playSfx('buy');
    haptic('buy');
  } else {
    game.uiTap(false);
  }
  bump();
}

function replaceSave(s: Save): void {
  save = s;
  game.save = s;
  fight = newFight(save);
  game.sheet.value = null;
  game.hint.value = null;
  applySettings();
  bump();
}

function applySettings(): void {
  setVolumes({ sfx: save.settings.sfx, music: save.settings.music });
  setHapticsEnabled(save.settings.haptics);
  renderer.showNumbers = save.settings.numbers;
}

function paused(): boolean {
  const m = game.modal.value;
  return m !== null;
}

/** Open whatever is waiting: unlock explanations, then relic choices. */
function nextModal(): void {
  if (game.modal.value) return;
  if (save.relicOffers.length > 0) {
    game.modal.value = save.tutorial.relics ? { kind: 'relic' } : { kind: 'unlock', id: 'relics' };
  }
}

function onNotes(notes: MetaNote[]): void {
  for (const n of notes) {
    switch (n.type) {
      case 'relicOffer':
        nextModal();
        break;
      case 'acolytesUnlocked':
        game.modal.value = { kind: 'unlock', id: 'acolytes' };
        break;
      case 'pilgrimageReady':
        if (save.pilgrimages === 0) game.modal.value = { kind: 'unlock', id: 'pilgrimage' };
        else game.toast('Pilgrimage is ready.', 'info');
        break;
      case 'newBest':
        if (n.floor % 5 === 0 && n.floor > 1) game.toast(`New record: floor ${n.floor}!`, 'gold');
        break;
      case 'prayerUnlocked':
        break;
      case 'healerLevel':
        renderer.fx.banner(`HEALER LEVEL ${n.level}`, '+1 talent point', '#7ee07e', 1.6);
        playSfx('levelup');
        haptic('save');
        if (!save.tutorial.talents) {
          save.tutorial.talents = true;
          game.modal.value = game.modal.value ?? { kind: 'unlock', id: 'talents' };
        }
        break;
      case 'itemDrop': {
        const r = RARITIES[n.item.rarity];
        if (!save.tutorial.gear) {
          save.tutorial.gear = true;
          game.modal.value = game.modal.value ?? { kind: 'unlock', id: 'gear' };
        } else if (n.item.rarity >= 2 || n.boss) game.toast(`${r.name} drop: ${itemName(n.item)}`, n.item.rarity >= 3 ? 'gold' : 'good');
        if (n.item.rarity >= 3) playSfx('relic');
        break;
      }
      case 'deedReady':
        if (!save.tutorial.deeds) {
          save.tutorial.deeds = true;
          game.modal.value = game.modal.value ?? { kind: 'unlock', id: 'deeds' };
        } else game.toast('Deed complete! Claim it in Deeds.', 'gold');
        break;
    }
  }
}

function musicFor(s: FightState): MusicTrack {
  return isBossFloor(s.floor) ? 'boss' : regionOf(s.floor).id;
}

// ---------------------------------------------------------------------------
// Main loop

let last = performance.now();
let acc = 0;
let uiTimer = 0;
let saveTimer = 0;

function frame(now: number): void {
  const realDt = Math.min(0.1, (now - last) / 1000);
  last = now;
  gestures.update();
  const isPaused = paused() || wasHidden;
  if (!isPaused) {
    let scale = coach.update(fight);
    if (slowmo > 0) {
      slowmo -= realDt;
      scale = Math.min(scale, T.perfectSlowmo);
    }
    acc += realDt * scale;
    let steps = 0;
    let actions = gestures.take();
    while (acc >= DT && steps < 8) {
      acc -= DT;
      steps++;
      const events = step(fight, actions, DT);
      actions = [];
      renderer.onEvents(fight, events);
      soundEvents(events);
      coach.onEvents(fight, events);
      if (events.some((e) => e.type === 'perfect')) slowmo = T.perfectSlowmoTime;
      onNotes(applyEvents(save, fight, events, DT));
    }
    if (steps === 8) acc = 0;
    setMusic(musicFor(fight));
  } else {
    gestures.take();
  }
  renderer.hintHero = game.sheet.value === null ? game.hint.value?.hero ?? null : null;
  renderer.render(fight, gestures.view(), isPaused ? 0 : realDt);

  uiTimer += realDt;
  if (uiTimer > 0.125) {
    uiTimer = 0;
    bump();
  }
  saveTimer += realDt;
  if (saveTimer > 5) {
    saveTimer = 0;
    store(save);
  }
  requestAnimationFrame(frame);
}

function resize(): void {
  renderer.resize();
  game.sceneHeight.value = renderer.layout.sceneH;
}

function resumeFromAway(): void {
  if (save.lastSeen <= 0) return;
  const elapsed = (Date.now() - save.lastSeen) / 1000;
  const report = runOffline(save, elapsed);
  if (report) {
    fight = newFight(save);
    game.modal.value = { kind: 'offline', report };
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    wasHidden = true;
    store(save);
    setMuted(true);
    gestures.clear();
  } else {
    wasHidden = false;
    setMuted(false);
    last = performance.now();
    if (!game.modal.value) resumeFromAway();
    store(save);
  }
});
window.addEventListener('pagehide', () => store(save));
window.addEventListener('resize', resize);
window.addEventListener('pointerdown', () => unlockAudio(), { capture: true });

// Keep the screen on while the game is open (idle games are watched).
let wakeLock: { release(): Promise<void> } | null = null;
async function keepAwake(): Promise<void> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<{ release(): Promise<void> }> } };
    if (!wakeLock && nav.wakeLock && !document.hidden) {
      wakeLock = await nav.wakeLock.request('screen');
      document.addEventListener('visibilitychange', () => (wakeLock = null), { once: true });
    }
  } catch {
    wakeLock = null;
  }
}
window.addEventListener('pointerdown', () => void keepAwake(), { capture: true });

// Android back: close the open modal or sheet instead of leaving the app.
history.pushState({ lifeline: true }, '');
window.addEventListener('popstate', () => {
  const m = game.modal.value;
  if (m && m.kind !== 'welcome' && m.kind !== 'relic') game.closeModal();
  else if (game.sheet.value) game.openSheet(null);
  history.pushState({ lifeline: true }, '');
});

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).lifeline = { game, fight: () => fight, renderer };
}
render(h(App, { game }), document.getElementById('root')!);
applySettings();
resumeFromAway();
if (!save.tutorial.welcome) game.modal.value = { kind: 'welcome' };
else nextModal();
document.fonts?.ready.then(resize).catch(() => {});
resize();
requestAnimationFrame(frame);
