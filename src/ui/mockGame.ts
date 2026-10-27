// A stand-in Game for the UI preview page (ui.html). Uses the real save, shop and pilgrimage logic.
import { signal } from '@preact/signals';
import type { Game, Hint, Modal, SheetId, Toast, UnlockId } from '../app/game.ts';
import { claimDeed } from '../meta/deeds.ts';
import * as gear from '../meta/gear.ts';
import { learnTalent, resetTalents } from '../meta/healer.ts';
import { pilgrimage } from '../meta/pilgrimage.ts';
import { newSave, parseSave, type Save } from '../meta/save.ts';
import { buyDevotionUpgrade, buyGoldUpgrade, buyHero } from '../meta/shop.ts';
import { BONUS_LABEL, DEEDS, deedDef } from '../sim/data/deeds.ts';
import { itemName, SLOTS, type Rarity } from '../sim/data/gear.ts';
import { rollItem } from '../sim/gear.ts';
import { makeRng } from '../sim/rng.ts';
import { HERO_IDS } from '../sim/data/heroes.ts';
import type { OrderId } from '../sim/data/orders.ts';
import { RELICS } from '../sim/data/relics.ts';
import { DEVOTION_UPGRADES, GOLD_UPGRADES } from '../sim/data/upgrades.ts';
import type { FightState } from '../sim/state.ts';
import { healerSeg, partySeg } from './nav.ts';
import { TABS } from './status.ts';

/**
 * Build a save from query params: gold, floor, max, best, devotion, pilg, lv, up, dev, relics, offers, order, auto,
 * hlv (healer level), hxp, tal (1 = some talents learned, 2 = a deep build), claimed (tiers claimed per Deed), fresh (zero lifetime stats),
 * gear (1 = some items worn), bag (number of bag items, mixed rarities), salv (auto-salvage below).
 */
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
  s.lifetime = {
    ...s.lifetime, healed: 1.234e6, perfects: 342, saves: 120, kills: 8765, gold: 3.2e7, floors: 412, wipes: 23, seconds: 51234,
    bosses: 4, flawlessBosses: 1, bestStreak: 4, fullChains: 12, revives: 30, sanctuaries: 3,
  };
  if (q.has('fresh')) for (const k of Object.keys(s.lifetime) as (keyof Save['lifetime'])[]) s.lifetime[k] = 0;
  s.healerLevel = num('hlv', 1);
  s.healerXp = num('hxp', 0);
  const tal = num('tal', 0);
  if (tal >= 1) Object.assign(s.progress.talents, { swift_hands: 3, triage: 1, thick_ward: 2, deep_breath: 1 });
  if (tal >= 2) Object.assign(s.progress.talents, { swift_hands: 5, triage: 3, second_touch: 2, overflow: 1, battle_hymn: 2 });
  addGear(s, num('gear', 0), num('bag', 0));
  s.autoSalvageBelow = num('salv', 0);
  const claimed = num('claimed', 0);
  if (claimed > 0) for (const d of DEEDS) s.progress.deeds[d.id] = Math.min(d.tiers.length, claimed);
  return s;
}

/** Worn items for the first heroes, and a bag of mixed rarities (with a mergeable set). */
function addGear(s: Save, worn: number, bag: number): void {
  const rng = makeRng(77);
  const floor = Math.max(1, s.floor);
  const roll = (rarity: number, slot = SLOTS[s.nextItemUid % 3]!) => rollItem(rng, s.nextItemUid++, floor, rarity as Rarity, slot);
  if (worn > 0) {
    s.progress.equipped.tomas = { weapon: roll(1, 'weapon'), armor: roll(2, 'armor'), trinket: roll(0, 'trinket') };
    s.progress.equipped.brann = { weapon: roll(3, 'weapon'), armor: roll(0, 'armor') };
    s.progress.equipped.ilse = { trinket: roll(4, 'trinket') };
  }
  const pattern = [0, 0, 0, 1, 2, 0, 1, 3, 0, 1, 2, 4];
  for (let i = 0; i < bag; i++) s.inventory.push(roll(pattern[i % pattern.length]!, SLOTS[i < 3 ? 0 : i % 3]!));
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
    learnTalent: (id) => {
      if (learnTalent(save, id)) bump();
    },
    resetTalents: () => {
      resetTalents(save);
      toast('Talent points refunded', 'info');
      bump();
    },
    claimDeed: (id) => {
      const gold = claimDeed(save, id);
      if (gold === null) return;
      const d = deedDef(id);
      toast(`${d.name}: +${Math.round(d.per * 100)}% ${BONUS_LABEL[d.bonus]}`, 'gold');
      bump();
    },
    equip: (hero, uid) => {
      if (gear.equip(save, hero, uid)) bump();
    },
    unequip: (hero, slot) => {
      if (gear.unequip(save, hero, slot)) bump();
    },
    salvage: (uid) => {
      const g = gear.salvageItem(save, uid);
      if (g !== null) toast(`Salvaged for ${Math.round(g)} gold`, 'gold');
      bump();
    },
    merge: (uids) => {
      const out = gear.merge(save, uids);
      if (out) toast(`Merged: ${itemName(out)}`, 'gold');
      bump();
    },
    mergeAll: () => {
      const made = gear.mergeAll(save);
      toast(`Merged ${made.length} item${made.length === 1 ? '' : 's'}`, 'gold');
      bump();
    },
    autoEquip: () => {
      gear.autoEquip(save);
      bump();
    },
    setAutoSalvage: (below) => {
      save.autoSalvageBelow = below;
      bump();
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
  const seg = q.get('seg');
  if (seg === 'talents' || seg === 'spells' || seg === 'relics') healerSeg.value = seg;
  if (seg === 'heroes' || seg === 'bag') partySeg.value = seg;
  const m = q.get('modal');
  if (m === 'offline') {
    game.modal.value = {
      kind: 'offline',
      report: { seconds: 3 * 3600 + 25 * 60, gold: 1.42e6, fromFloor: game.save.floor - 6, toFloor: game.save.floor, kills: 1834, relics: Number(q.get('offers') ?? 0) },
    };
  } else if (m?.startsWith('unlock-')) {
    game.modal.value = { kind: 'unlock', id: m.slice(7) as UnlockId };
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
