import type { OrderId } from '../sim/data/orders.ts';
import { orderDef } from '../sim/data/orders.ts';
import { floorGold } from '../sim/floors.ts';
import { T } from '../sim/tuning.ts';
import { emptyTally, type Save } from './save.ts';

/**
 * Devotion for a Pilgrimage from `maxFloor`: grows by a fixed factor per floor. Each Devotion upgrade buys a
 * roughly fixed number of floors per doubling of total Devotion, so a factor well below e^(1/that) keeps
 * every Pilgrimage meaningfully deeper without ever running away. See docs/BALANCE.md.
 */
export function devotionFor(maxFloor: number): number {
  if (maxFloor < T.pilgrimageFloor) return 0;
  return Math.floor(T.devotionBase * Math.pow(T.devotionGrowth, maxFloor - T.pilgrimageFloor));
}

export function canPilgrimage(save: Save): boolean {
  return save.progress.maxFloor >= T.pilgrimageFloor;
}

export function orderUnlocked(save: Save, id: OrderId): boolean {
  const def = orderDef(id);
  return !def.unlock || (save.progress.devotionUpgrades[def.unlock] ?? 0) > 0;
}

export function startFloor(save: Save): number {
  return 1 + 5 * (save.progress.devotionUpgrades.haste ?? 0);
}

/** Retire the party: reset the run, keep Devotion and permanent upgrades. */
export function pilgrimage(save: Save, order: OrderId): number {
  const gain = devotionFor(save.progress.maxFloor);
  save.devotion += gain;
  save.pilgrimages++;
  const p = save.progress;
  p.heroLevels = { tomas: 1, brann: 1, ilse: 1, wren: 1 };
  p.upgrades = {};
  p.relics = [];
  p.order = orderUnlocked(save, order) ? order : 'cleric';
  const start = startFloor(save);
  p.maxFloor = start;
  save.floor = start;
  save.gold = start > 1 ? floorGold(start) * 60 : 0;
  save.bossesCleared = [];
  save.relicOffers = [];
  save.run = emptyTally();
  return gain;
}
