import type { IconName } from './icons.ts';

export type GoldUpgradeId =
  | 'mend_power' | 'ward_power' | 'mana_max' | 'mana_regen' | 'chain_power'
  | 'aco_slot' | 'aco_power' | 'aco_speed';

export type DevotionUpgradeId =
  | 'might' | 'fortune' | 'grace' | 'haste' | 'vigil' | 'choir' | 'insight' | 'spirit'
  | 'order_chrono' | 'order_bard';

export interface UpgradeDef<Id extends string> {
  id: Id;
  name: string;
  icon: IconName;
  /** What one level does, shown in the shop. */
  text: string;
  baseCost: number;
  growth: number;
  max?: number;
  /** Highest floor this Pilgrimage needed before it shows (gold upgrades). */
  unlockFloor?: number;
}

export const GOLD_UPGRADES = [
  { id: 'mend_power', name: 'Mend', icon: 'mend', text: 'Mend heals more', baseCost: 15, growth: 1.22 },
  { id: 'ward_power', name: 'Ward', icon: 'ward', text: 'Wards absorb more', baseCost: 25, growth: 1.22 },
  { id: 'mana_max', name: 'Deep Well', icon: 'mana', text: '+12% max mana', baseCost: 20, growth: 1.2 },
  { id: 'mana_regen', name: 'Wellspring', icon: 'mana', text: '+12% mana regeneration', baseCost: 30, growth: 1.21 },
  { id: 'chain_power', name: 'Chain Mend', icon: 'chain', text: 'Chain Mend heals more', baseCost: 60, growth: 1.25, unlockFloor: 4 },
  { id: 'aco_slot', name: 'Ordain Acolyte', icon: 'acolyte', text: 'Another Acolyte joins you', baseCost: 250, growth: 6, max: 4, unlockFloor: 10 },
  { id: 'aco_power', name: 'Litany', icon: 'acolyte', text: 'Acolyte spells +15% power', baseCost: 300, growth: 1.24, unlockFloor: 10 },
  { id: 'aco_speed', name: 'Fervor', icon: 'clock', text: 'Acolytes cast 5% faster', baseCost: 500, growth: 1.3, max: 30, unlockFloor: 10 },
] as const satisfies readonly UpgradeDef<GoldUpgradeId>[];

export const DEVOTION_UPGRADES = [
  { id: 'might', name: 'Might', icon: 'sword', text: 'Heroes +25% life and damage', baseCost: 1, growth: 1.55 },
  { id: 'fortune', name: 'Fortune', icon: 'gold', text: '+30% gold', baseCost: 1, growth: 1.6 },
  { id: 'grace', name: 'Grace', icon: 'heart', text: 'All healing and Wards +8%', baseCost: 2, growth: 1.6, max: 25 },
  { id: 'spirit', name: 'Spirit', icon: 'mana', text: '+15% mana regeneration', baseCost: 2, growth: 1.6, max: 20 },
  { id: 'choir', name: 'Choir', icon: 'acolyte', text: 'Acolytes from floor 1, +1 Acolyte slot', baseCost: 4, growth: 6, max: 2 },
  { id: 'haste', name: 'Haste', icon: 'floor', text: 'Start each Pilgrimage 5 floors deeper', baseCost: 5, growth: 2, max: 6 },
  { id: 'vigil', name: 'Vigil', icon: 'clock', text: '+2 h offline time, +10% offline gold', baseCost: 3, growth: 1.9, max: 5 },
  { id: 'insight', name: 'Insight', icon: 'relic', text: 'Bosses offer 4 relics instead of 3', baseCost: 12, growth: 1, max: 1 },
  { id: 'order_chrono', name: 'Order: Chronomancer', icon: 'hourglass', text: 'Unlocks the Chronomancer', baseCost: 8, growth: 1, max: 1 },
  { id: 'order_bard', name: 'Order: Bard', icon: 'note', text: 'Unlocks the Bard', baseCost: 20, growth: 1, max: 1 },
] as const satisfies readonly UpgradeDef<DevotionUpgradeId>[];

export function upgradeCost(def: UpgradeDef<string>, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.growth, level));
}
