import { DEEDS, type DeedDef, type DeedId, type DeedStat } from '../sim/data/deeds.ts';
import { floorGold } from '../sim/floors.ts';
import { acolyteSlots, buildLoadout } from '../sim/loadout.ts';
import { T } from '../sim/tuning.ts';
import type { Save } from './save.ts';

export function deedStat(save: Save, stat: DeedStat): number {
  const L = save.lifetime;
  switch (stat) {
    case 'healed': return L.healed;
    case 'perfects': return L.perfects;
    case 'saves': return L.saves;
    case 'kills': return L.kills;
    case 'bestFloor': return save.bestFloor;
    case 'bosses': return L.bosses;
    case 'flawlessBosses': return L.flawlessBosses;
    case 'bestStreak': return L.bestStreak;
    case 'fullChains': return L.fullChains;
    case 'revives': return L.revives;
    case 'sanctuaries': return L.sanctuaries;
    case 'pilgrimages': return save.pilgrimages;
    case 'relicsHeld': return save.progress.relics.length;
    case 'acolytes': return acolyteSlots(save.progress);
    case 'heroLevel': return Math.max(...Object.values(save.progress.heroLevels));
    case 'healerLevel': return save.healerLevel;
  }
}

export interface DeedProgress {
  def: DeedDef;
  /** Tiers claimed so far. */
  claimed: number;
  /** Target of the next tier, or null when every tier is claimed. */
  target: number | null;
  value: number;
  ready: boolean;
}

export function deedProgress(save: Save, id: DeedId): DeedProgress {
  const def = DEEDS.find((d) => d.id === id)! as DeedDef;
  const claimed = save.progress.deeds[id] ?? 0;
  const target = def.tiers[claimed] ?? null;
  const value = deedStat(save, def.stat);
  return { def, claimed, target, value, ready: target !== null && value >= target };
}

export function readyDeeds(save: Save): DeedId[] {
  return DEEDS.map((d) => d.id).filter((id) => deedProgress(save, id).ready);
}

/** Gold paid out when claiming a Deed: a handful of kills' worth at the current floor, with your gold bonuses. */
export function deedGold(save: Save): number {
  return Math.round(floorGold(save.floor) * buildLoadout(save.progress).goldMult * T.deedGoldKills);
}

/** Claim the next tier of a Deed. Returns the gold paid, or null if it isn't ready. */
export function claimDeed(save: Save, id: DeedId): number | null {
  if (!deedProgress(save, id).ready) return null;
  save.progress.deeds[id] = (save.progress.deeds[id] ?? 0) + 1;
  const gold = deedGold(save);
  save.gold += gold;
  save.run.gold += gold;
  save.lifetime.gold += gold;
  return gold;
}
