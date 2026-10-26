/** Every tunable number for combat feel and economy. */
export const T = {
  tickRate: 60,

  // Floor scaling
  enemyHpBase: 110,
  enemyHpGrowth: 1.13,
  enemyAtkBase: 9,
  enemyAtkGrowth: 1.115,
  goldBase: 3,
  goldGrowth: 1.135,
  /** Extra multiplier per Depth (each 50 floors). */
  depthHp: 1.6,
  depthAtk: 1.4,
  depthGold: 1.5,
  /** Boss floors: life and attack multiplier on top of the boss's own. */
  bossFloorMult: 1,
  checkpointEvery: 5,

  // Floor flow
  walkTime: 1.4,
  wipeTime: 2.4,
  floorStartDelay: 0.6,
  reviveOnFloorPct: 0.25,

  // Heroes
  /** Life and damage multiply by this each level, and double every milestone. */
  heroLevelGrowth: 1.06,
  heroMilestoneEvery: 25,
  heroMilestoneMult: 2,
  heroCostBase: 6,
  heroCostGrowth: 1.12,
  rageAtFloor: 0.1,

  // Player spells
  manaMax: 100,
  manaRegen: 7,
  mendPct: 0.22,
  mendCost: 10,
  wardPct: 0.4,
  wardCost: 14,
  wardDur: 6,
  chainEff: 0.6,
  chainCostMult: 1.6,
  reviveCost: 45,
  revivePct: 0.35,
  holdTime: 0.2,
  perfectWindow: 0.5,
  perfectSlowmo: 0.35,
  perfectSlowmoTime: 0.45,
  saveWindow: 2,

  // Resonance and Sanctuary
  resonanceMax: 100,
  resonancePerfect: 22,
  resonanceSave: 15,
  resonanceLowMend: 2,
  sanctuaryHeal: 0.5,
  sanctuaryDr: 0.7,
  sanctuaryDur: 3,

  // Acolytes
  acolyteInterval: 2.6,
  acolytePotency: 0.55,
  acolyteFloorUnlock: 10,

  // Poison
  cleanseHealPct: 0.05,

  // Offline
  offlineCapHours: 4,
  offlineEfficiency: 0.5,
  offlineSimSeconds: 1200,
  offlineDt: 0.05,

  // Pilgrimage
  pilgrimageFloor: 25,
} as const;
