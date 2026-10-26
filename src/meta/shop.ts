import { heroDef, type HeroId } from '../sim/data/heroes.ts';
import {
  DEVOTION_UPGRADES, GOLD_UPGRADES, upgradeCost, type DevotionUpgradeId, type GoldUpgradeId,
} from '../sim/data/upgrades.ts';
import { T } from '../sim/tuning.ts';
import type { Save } from './save.ts';

export function heroCost(id: HeroId, level: number): number {
  return Math.ceil(T.heroCostBase * heroDef(id).costMult * Math.pow(T.heroCostGrowth, level - 1));
}

/** Levels affordable (up to `max`) and their total cost. */
export function heroBulk(save: Save, id: HeroId, max: number): { n: number; cost: number } {
  let level = save.progress.heroLevels[id];
  let n = 0;
  let cost = 0;
  while (n < max) {
    const c = heroCost(id, level);
    if (cost + c > save.gold) break;
    cost += c;
    level++;
    n++;
  }
  if (n === 0) return { n: 0, cost: heroCost(id, level) };
  return { n, cost };
}

export function buyHero(save: Save, id: HeroId, max: number): number {
  const { n, cost } = heroBulk(save, id, max);
  if (n === 0) return 0;
  save.gold -= cost;
  save.progress.heroLevels[id] += n;
  return n;
}

export function goldUpgradeDef(id: GoldUpgradeId) {
  return GOLD_UPGRADES.find((u) => u.id === id)!;
}

export function devotionUpgradeDef(id: DevotionUpgradeId) {
  return DEVOTION_UPGRADES.find((u) => u.id === id)!;
}

export function goldUpgradeCost(save: Save, id: GoldUpgradeId): number | null {
  const def = goldUpgradeDef(id);
  const lvl = save.progress.upgrades[id] ?? 0;
  if ('max' in def && lvl >= def.max) return null;
  return upgradeCost(def, lvl);
}

export function buyGoldUpgrade(save: Save, id: GoldUpgradeId): boolean {
  const cost = goldUpgradeCost(save, id);
  if (cost === null || save.gold < cost) return false;
  save.gold -= cost;
  save.progress.upgrades[id] = (save.progress.upgrades[id] ?? 0) + 1;
  return true;
}

export function devotionUpgradeCost(save: Save, id: DevotionUpgradeId): number | null {
  const def = devotionUpgradeDef(id);
  const lvl = save.progress.devotionUpgrades[id] ?? 0;
  if ('max' in def && lvl >= def.max) return null;
  return upgradeCost(def, lvl);
}

export function buyDevotionUpgrade(save: Save, id: DevotionUpgradeId): boolean {
  const cost = devotionUpgradeCost(save, id);
  if (cost === null || save.devotion < cost) return false;
  save.devotion -= cost;
  save.progress.devotionUpgrades[id] = (save.progress.devotionUpgrades[id] ?? 0) + 1;
  return true;
}

export function goldUpgradeVisible(save: Save, id: GoldUpgradeId): boolean {
  const def = goldUpgradeDef(id);
  const need = 'unlockFloor' in def ? def.unlockFloor : 0;
  if (id.startsWith('aco_') && (save.progress.devotionUpgrades.choir ?? 0) > 0) return true;
  return save.progress.maxFloor >= need;
}
