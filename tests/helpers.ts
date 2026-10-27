import type { Progress } from '../src/sim/loadout.ts';

export function freshProgress(over: Partial<Progress> = {}): Progress {
  return {
    heroLevels: { tomas: 1, brann: 1, ilse: 1, wren: 1 },
    upgrades: {},
    devotionUpgrades: {},
    relics: [],
    order: 'cleric',
    acolytes: [],
    maxFloor: 1,
    talents: {},
    deeds: {},
    equipped: {},
    ...over,
  };
}
