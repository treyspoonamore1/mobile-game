// What the nav shows: which tabs are locked, why, and which have something to do.
import type { SheetId } from '../app/game.ts';
import type { Save } from '../meta/save.ts';
import { readyDeeds } from '../meta/deeds.ts';
import { unspentPoints } from '../meta/healer.ts';
import { canPilgrimage } from '../meta/pilgrimage.ts';
import { devotionUpgradeCost, goldUpgradeCost, goldUpgradeVisible, heroCost } from '../meta/shop.ts';
import { HERO_IDS } from '../sim/data/heroes.ts';
import type { IconName } from '../sim/data/icons.ts';
import { DEVOTION_UPGRADES, GOLD_UPGRADES, type GoldUpgradeId } from '../sim/data/upgrades.ts';
import { acolyteSlots } from '../sim/loadout.ts';
import { T } from '../sim/tuning.ts';

export type TabId = 'fight' | SheetId;

export interface TabDef {
  id: TabId;
  label: string;
  icon: IconName;
}

export const TABS: readonly TabDef[] = [
  { id: 'fight', label: 'Fight', icon: 'sword' },
  { id: 'party', label: 'Party', icon: 'heart' },
  { id: 'healer', label: 'Healer', icon: 'mend' },
  { id: 'acolytes', label: 'Acolytes', icon: 'acolyte' },
  { id: 'deeds', label: 'Deeds', icon: 'crown' },
  { id: 'pilgrim', label: 'Pilgrim', icon: 'pilgrim' },
];

export const SHEET_TITLES: Record<SheetId, string> = {
  party: 'Party',
  healer: 'Healer',
  acolytes: 'Acolytes',
  deeds: 'Deeds',
  pilgrim: 'Pilgrimage',
};

export function acolytesUnlocked(save: Save): boolean {
  return acolyteSlots(save.progress) > 0;
}

export function pilgrimUnlocked(save: Save): boolean {
  return canPilgrimage(save) || save.pilgrimages > 0;
}

/** Null when open, otherwise what unlocks it. */
export function lockReason(save: Save, tab: TabId): string | null {
  switch (tab) {
    case 'acolytes':
      return acolytesUnlocked(save) ? null : `Acolytes join you at floor ${T.acolyteFloorUnlock}`;
    case 'pilgrim':
      return pilgrimUnlocked(save) ? null : `Pilgrimage opens at floor ${T.pilgrimageFloor}`;
    default:
      return null;
  }
}

export const isAco = (id: GoldUpgradeId) => id.startsWith('aco_');

function anyGoldAffordable(save: Save, aco: boolean): boolean {
  return GOLD_UPGRADES.some((u) => {
    if (isAco(u.id) !== aco || !goldUpgradeVisible(save, u.id)) return false;
    const c = goldUpgradeCost(save, u.id);
    return c !== null && c <= save.gold;
  });
}

/** Healer sheet segments with something to do. */
export const segBadge = {
  talents: (save: Save) => unspentPoints(save) > 0,
  spells: (save: Save) => anyGoldAffordable(save, false),
  relics: (save: Save) => save.relicOffers.length > 0,
};

/** A dot badge: something affordable or waiting on that tab. */
export function hasBadge(save: Save, tab: TabId): boolean {
  if (lockReason(save, tab)) return false;
  switch (tab) {
    case 'party':
      return HERO_IDS.some((id) => heroCost(id, save.progress.heroLevels[id]) <= save.gold);
    case 'healer':
      return segBadge.talents(save) || segBadge.relics(save);
    case 'acolytes':
      return anyGoldAffordable(save, true);
    case 'deeds':
      return readyDeeds(save).length > 0;
    case 'pilgrim':
      return DEVOTION_UPGRADES.some((u) => {
        const c = devotionUpgradeCost(save, u.id);
        return c !== null && c <= save.devotion;
      });
    default:
      return false;
  }
}
