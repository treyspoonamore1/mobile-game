import type { IconName } from './icons.ts';

export type PrayerId =
  | 'mend_lowest' | 'ward_tank' | 'mend_tank' | 'cleanse' | 'ward_telegraphed' | 'top_up' | 'revive' | 'mend_all';

export interface PrayerDef {
  id: PrayerId;
  name: string;
  text: string;
  icon: IconName;
  /** Highest floor ever reached that unlocks it. */
  unlockFloor: number;
  /** Multiplier on the Acolyte's cast interval. */
  intervalMult: number;
}

export const PRAYERS = [
  { id: 'mend_lowest', name: 'Mercy', icon: 'mend', unlockFloor: 0, intervalMult: 1, text: 'Mend the lowest ally under 50%.' },
  { id: 'ward_tank', name: 'Bulwark', icon: 'ward', unlockFloor: 0, intervalMult: 1.6, text: 'Keep a Ward on the tank.' },
  { id: 'mend_tank', name: 'Steadfast', icon: 'shield', unlockFloor: 12, intervalMult: 1, text: 'Mend the tank when he drops under 70%.' },
  { id: 'cleanse', name: 'Purity', icon: 'star', unlockFloor: 15, intervalMult: 1, text: 'Cleanse a poisoned ally and mend them a little.' },
  { id: 'ward_telegraphed', name: 'Foresight', icon: 'clock', unlockFloor: 20, intervalMult: 1, text: 'Ward an ally about to take a heavy blow.' },
  { id: 'top_up', name: 'Diligence', icon: 'heart', unlockFloor: 25, intervalMult: 0.8, text: 'Mend the lowest ally under 85%.' },
  { id: 'revive', name: 'Resurrection', icon: 'revive', unlockFloor: 30, intervalMult: 3, text: 'Revive a fallen ally.' },
  { id: 'mend_all', name: 'Communion', icon: 'chain', unlockFloor: 40, intervalMult: 1.8, text: 'Mend everyone under 70% for half power.' },
] as const satisfies readonly PrayerDef[];

export function prayerDef(id: PrayerId): PrayerDef {
  return PRAYERS.find((p) => p.id === id)!;
}
