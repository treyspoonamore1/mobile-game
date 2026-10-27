import type { IconName } from './icons.ts';

/** What a Deed counts. The meta layer reads these from the save. */
export type DeedStat =
  | 'healed' | 'perfects' | 'saves' | 'kills' | 'bestFloor' | 'bosses' | 'flawlessBosses' | 'bestStreak'
  | 'fullChains' | 'revives' | 'sanctuaries' | 'pilgrimages' | 'relicsHeld' | 'acolytes' | 'heroLevel'
  | 'healerLevel';

/** Permanent bonuses Deeds grant, as fractions (0.05 = +5%). */
export type BonusKind = 'gold' | 'damage' | 'life' | 'heal' | 'mana' | 'resonance' | 'acolyte' | 'xp';

export type DeedId =
  | 'mender' | 'perfectionist' | 'guardian' | 'slayer' | 'delver' | 'bossbane' | 'untouched' | 'streak'
  | 'full_chain' | 'lazarus' | 'sanctified' | 'pilgrim' | 'collector' | 'choirmaster' | 'veteran' | 'sage';

export interface DeedDef {
  id: DeedId;
  name: string;
  icon: IconName;
  stat: DeedStat;
  /** `{n}` is replaced by the tier's target. */
  text: string;
  tiers: number[];
  bonus: BonusKind;
  /** Bonus granted by each tier claimed. */
  per: number;
}

export const DEEDS = [
  { id: 'mender', name: 'Mender', icon: 'mend', stat: 'healed', text: 'Heal {n} life', tiers: [1e3, 1e5, 1e7, 1e9, 1e11], bonus: 'heal', per: 0.03 },
  { id: 'perfectionist', name: 'Perfectionist', icon: 'ward', stat: 'perfects', text: 'Land {n} Perfects', tiers: [5, 50, 200, 750, 2500], bonus: 'resonance', per: 0.05 },
  { id: 'guardian', name: 'Guardian Angel', icon: 'shield', stat: 'saves', text: 'Save heroes {n} times', tiers: [10, 50, 250, 1000, 5000], bonus: 'life', per: 0.04 },
  { id: 'slayer', name: 'Slayer', icon: 'sword', stat: 'kills', text: 'Defeat {n} enemies', tiers: [100, 1000, 5000, 25000, 100000], bonus: 'damage', per: 0.04 },
  { id: 'delver', name: 'Delver', icon: 'floor', stat: 'bestFloor', text: 'Reach floor {n}', tiers: [10, 25, 50, 75, 100], bonus: 'gold', per: 0.1 },
  { id: 'bossbane', name: 'Bossbane', icon: 'skull', stat: 'bosses', text: 'Defeat {n} bosses', tiers: [1, 5, 15, 40], bonus: 'damage', per: 0.05 },
  { id: 'untouched', name: 'Untouched', icon: 'star', stat: 'flawlessBosses', text: 'Defeat {n} bosses with nobody falling', tiers: [1, 5, 15], bonus: 'life', per: 0.05 },
  { id: 'streak', name: 'In the Zone', icon: 'clock', stat: 'bestStreak', text: 'Land {n} Perfects in a row', tiers: [3, 6, 10], bonus: 'resonance', per: 0.08 },
  { id: 'full_chain', name: 'Full Circle', icon: 'chain', stat: 'fullChains', text: 'Chain Mend all four heroes {n} times', tiers: [1, 25, 200], bonus: 'heal', per: 0.04 },
  { id: 'lazarus', name: 'Lazarus', icon: 'revive', stat: 'revives', text: 'Revive {n} fallen heroes', tiers: [5, 50, 250], bonus: 'mana', per: 0.05 },
  { id: 'sanctified', name: 'Sanctified', icon: 'sanctuary', stat: 'sanctuaries', text: 'Call Sanctuary {n} times', tiers: [5, 50, 250], bonus: 'resonance', per: 0.05 },
  { id: 'pilgrim', name: 'Pilgrim', icon: 'pilgrim', stat: 'pilgrimages', text: 'Go on {n} Pilgrimages', tiers: [1, 3, 10, 25], bonus: 'xp', per: 0.15 },
  { id: 'collector', name: 'Collector', icon: 'relic', stat: 'relicsHeld', text: 'Hold {n} relics at once', tiers: [3, 6, 10], bonus: 'gold', per: 0.1 },
  { id: 'choirmaster', name: 'Choirmaster', icon: 'acolyte', stat: 'acolytes', text: 'Lead {n} Acolytes', tiers: [2, 4, 6], bonus: 'acolyte', per: 0.08 },
  { id: 'veteran', name: 'Veteran', icon: 'up', stat: 'heroLevel', text: 'Raise a hero to level {n}', tiers: [25, 50, 100, 150], bonus: 'damage', per: 0.05 },
  { id: 'sage', name: 'Sage', icon: 'devotion', stat: 'healerLevel', text: 'Reach healer level {n}', tiers: [5, 10, 20, 30], bonus: 'mana', per: 0.05 },
] as const satisfies readonly DeedDef[];

/** Tiers claimed per Deed. */
export type DeedsClaimed = Partial<Record<DeedId, number>>;

export function deedDef(id: DeedId): DeedDef {
  return DEEDS.find((d) => d.id === id)!;
}

/** Sum of claimed Deed bonuses of one kind. */
export function deedBonus(claimed: DeedsClaimed, kind: BonusKind): number {
  let total = 0;
  for (const d of DEEDS as readonly DeedDef[]) {
    if (d.bonus === kind) total += (claimed[d.id] ?? 0) * d.per;
  }
  return total;
}

export const BONUS_LABEL: Record<BonusKind, string> = {
  gold: 'gold', damage: 'hero damage', life: 'hero life', heal: 'healing', mana: 'mana regeneration',
  resonance: 'Resonance', acolyte: 'Acolyte power', xp: 'healer XP',
};
