import type { Progress } from '../sim/loadout.ts';
import type { RelicId } from '../sim/data/relics.ts';
import type { Item } from '../sim/data/gear.ts';

export interface Tally {
  healed: number;
  perfects: number;
  saves: number;
  kills: number;
  gold: number;
  floors: number;
  wipes: number;
  seconds: number;
  bosses: number;
  flawlessBosses: number;
  bestStreak: number;
  fullChains: number;
  revives: number;
  sanctuaries: number;
}

export interface Settings {
  sfx: number;
  music: number;
  haptics: boolean;
  numbers: boolean;
}

export interface Save {
  version: 1;
  seed: number;
  gold: number;
  devotion: number;
  pilgrimages: number;
  floor: number;
  autoAdvance: boolean;
  progress: Progress;
  /** Deepest floor ever, across Pilgrimages. */
  bestFloor: number;
  bossesCleared: number[];
  /** The healer's own level, from healing done. Permanent. */
  healerLevel: number;
  healerXp: number;
  /** Unequipped gear. */
  inventory: Item[];
  /** Next item id, and how many items have dropped (seeds the rolls). */
  nextItemUid: number;
  /** Auto-salvage drops below this rarity (0 = keep everything). */
  autoSalvageBelow: number;
  relicOffers: RelicId[][];
  run: Tally;
  lifetime: Tally;
  settings: Settings;
  tutorial: Record<string, boolean>;
  /** Wall-clock ms of the last save, for offline progress (set outside the sim). */
  lastSeen: number;
}

export function emptyTally(): Tally {
  return {
    healed: 0, perfects: 0, saves: 0, kills: 0, gold: 0, floors: 0, wipes: 0, seconds: 0,
    bosses: 0, flawlessBosses: 0, bestStreak: 0, fullChains: 0, revives: 0, sanctuaries: 0,
  };
}

export function newSave(seed: number): Save {
  return {
    version: 1,
    seed,
    gold: 0,
    devotion: 0,
    pilgrimages: 0,
    floor: 1,
    autoAdvance: true,
    progress: {
      heroLevels: { tomas: 1, brann: 1, ilse: 1, wren: 1 },
      upgrades: {},
      devotionUpgrades: {},
      relics: [],
      order: 'cleric',
      acolytes: ['mend_lowest', 'ward_tank', 'mend_lowest', 'mend_lowest', 'mend_lowest', 'mend_lowest', 'mend_lowest'],
      maxFloor: 1,
      talents: {},
      deeds: {},
      equipped: {},
    },
    bestFloor: 1,
    bossesCleared: [],
    healerLevel: 1,
    healerXp: 0,
    inventory: [],
    nextItemUid: 1,
    autoSalvageBelow: 0,
    relicOffers: [],
    run: emptyTally(),
    lifetime: emptyTally(),
    settings: { sfx: 0.8, music: 0.5, haptics: true, numbers: true },
    tutorial: {},
    lastSeen: 0,
  };
}

/** Parse a stored save, filling in anything missing from newer versions. */
export function parseSave(json: string | null, seed: number): Save {
  const base = newSave(seed);
  if (!json) return base;
  try {
    const raw = JSON.parse(json) as Partial<Save>;
    return {
      ...base,
      ...raw,
      progress: { ...base.progress, ...raw.progress },
      run: { ...base.run, ...raw.run },
      lifetime: { ...base.lifetime, ...raw.lifetime },
      settings: { ...base.settings, ...raw.settings },
      tutorial: { ...raw.tutorial },
    };
  } catch {
    return base;
  }
}
