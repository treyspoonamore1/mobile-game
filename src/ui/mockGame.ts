// A stand-in Game for the UI preview page (ui.html). Uses the real save, shop and pilgrimage logic.
import { signal } from '@preact/signals';
import type { Game, Hint, Modal, SheetId, Toast } from '../app/game.ts';
import { pilgrimage } from '../meta/pilgrimage.ts';
import { newSave, parseSave, type Save } from '../meta/save.ts';
import { buyDevotionUpgrade, buyGoldUpgrade, buyHero } from '../meta/shop.ts';
import { HERO_IDS } from '../sim/data/heroes.ts';
import type { OrderId } from '../sim/data/orders.ts';
import { RELICS } from '../sim/data/relics.ts';
import { DEVOTION_UPGRADES, GOLD_UPGRADES } from '../sim/data/upgrades.ts';
import type { FightState } from '../sim/state.ts';
import { TABS } from './status.ts';

/** Build a save from query params: gold, floor, max, best, devotion, pilg, lv, up, dev, relics, offers, order, auto. */
export function saveFromParams(q: URLSearchParams): Save {
  const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
  const s = newSave(1234);
  s.floor = num('floor', 1);
  s.progress.maxFloor = num('max', s.floor);
  s.bestFloor = num('best', Math.max(s.floor, s.progress.maxFloor));
  s.gold = num('gold', 0);
  s.devotion = num('devotion', 0);
  s.pilgrimages = num('pilg', 0);
  s.autoAdvance = q.get('auto') !== '0';
  const lv = num('lv', 1);
  for (const id of HERO_IDS) s.progress.heroLevels[id] = lv + (id === 'tomas' ? 3 : 0);
  const up = num('up', 0);
  if (up > 0) for (const u of GOLD_UPGRADES) s.progress.upgrades[u.id] = 'max' in u ? Math.min(u.max, Math.ceil(up / 4)) : up;
  const dev = num('dev', 0);
  if (dev > 0) for (const u of DEVOTION_UPGRADES) s.progress.devotionUpgrades[u.id] = 'max' in u ? Math.min(u.max, dev) : dev;
  s.progress.relics = RELICS.slice(0, num('relics', 0)).map((r) => r.id);
  const offers = num('offers', 0);
  for (let i = 0; i < offers; i++) s.relicOffers.push(RELICS.slice(6 + i * 3, 9 + i * 3 + (q.has('insight') ? 1 : 0)).map((r) => r.id));
  if (q.has('order')) s.progress.order = q.get('order') as OrderId;
  s.progress.acolytes[1] = 'ward_tank';
  s.lifetime = { healed: 1.234e6, perfects: 342, saves: 120, kills: 8765, gold: 3.2e7, floors: 412, wipes: 23, seconds: 51234 };
  return s;
}

export function makeMockGame(save: Save, q: URLSearchParams): Game {
  const version = signal(0);
  const toasts = signal<Toast[]>([]);
  let toastId = 0;
  const bump = () => version.value++;
  const toast = (text: string, tone: Toast['tone'] = 'info') => {
    const t = { id: ++toastId, text, tone };
    toasts.value = [...toasts.value, t];
    if (!q.has('sticky')) setTimeout(() => (toasts.value = toasts.value.filter((x) => x !== t)), 2600);
  };
  const modal = signal<Modal | null>(null);
  const sheet = signal<SheetId | null>(null);
  const game: Game = {
    save,
    version,
    sheet,
    modal,
    hint: signal<Hint | null>(null),
    toasts,
    sceneHeight: signal(Number(q.get('scene') ?? 300)),
    fight: () => ({}) as FightState,
    openSheet: (id) => (sheet.value = id),
    closeModal: () => (modal.value = null),
    openModal: (m) => (modal.value = m),
    toast,
    buyHero: (id, max) => {
      if (buyHero(save, id, max) > 0) bump();
    },
    buyGold: (id) => {
      if (buyGoldUpgrade(save, id)) bump();
    },
    buyDevotion: (id) => {
      if (buyDevotionUpgrade(save, id)) bump();
    },
    setPrayer: (slot, p) => {
      save.progress.acolytes[slot] = p;
      bump();
    },
    pickRelic: (id) => {
      save.progress.relics.push(id);
      save.relicOffers.shift();
      if (save.relicOffers.length === 0) modal.value = null;
      toast(`Relic: ${RELICS.find((r) => r.id === id)!.name}`, 'gold');
      bump();
    },
    pilgrimage: (order) => {
      const gain = pilgrimage(save, order);
      modal.value = null;
      sheet.value = null;
      toast(`+${gain} Devotion`, 'good');
      bump();
    },
    setAutoAdvance: (on) => {
      save.autoAdvance = on;
      bump();
    },
    setSettings: (p) => {
      Object.assign(save.settings, p);
      bump();
    },
    resetSave: () => {
      Object.assign(save, newSave(1234));
      modal.value = { kind: 'welcome' };
      bump();
    },
    exportSave: () => btoa(JSON.stringify(save)),
    importSave: (text) => {
      try {
        Object.assign(save, parseSave(atob(text), 1234));
        modal.value = null;
        bump();
        return true;
      } catch {
        return false;
      }
    },
    uiTap: (ok = true) => console.debug('uiTap', ok),
  };
  // Passive income so numbers move like the real game.
  const income = Number(q.get('income') ?? 0);
  setInterval(() => {
    save.gold += income / 8;
    bump();
  }, 125);
  applyParams(game, q);
  return game;
}

function applyParams(game: Game, q: URLSearchParams): void {
  const sheet = q.get('sheet');
  if (sheet && TABS.some((t) => t.id === sheet)) game.sheet.value = sheet as SheetId;
  const m = q.get('modal');
  if (m === 'offline') {
    game.modal.value = {
      kind: 'offline',
      report: { seconds: 3 * 3600 + 25 * 60, gold: 1.42e6, fromFloor: game.save.floor - 6, toFloor: game.save.floor, kills: 1834, relics: Number(q.get('offers') ?? 0) },
    };
  } else if (m?.startsWith('unlock-')) {
    game.modal.value = { kind: 'unlock', id: m.slice(7) as 'acolytes' | 'pilgrimage' | 'relics' };
  } else if (m === 'relic' || m === 'pilgrimage' || m === 'settings' || m === 'welcome') {
    game.modal.value = { kind: m };
  }
  const hint = q.get('hint');
  if (hint) {
    const tab = TABS.find((t) => t.id === hint && t.id !== 'fight');
    game.hint.value = {
      id: 'h',
      text: tab ? `You can afford an upgrade! Open ${tab.label}.` : 'Tomas is hurt! Tap his frame to Mend him.',
      tab: tab?.id as SheetId | undefined,
      hero: tab ? undefined : 0,
    };
  }
  if (q.has('toasts')) {
    game.toast('Perfect Ward!', 'good');
    game.toast('+1.2K gold', 'gold');
    game.toast('Brann is down', 'bad');
    game.toast('Acolytes join you at floor 10', 'info');
  }
}
