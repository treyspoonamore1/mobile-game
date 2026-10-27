/** Every tunable number for combat feel and economy. */
export const T = {
  tickRate: 60,

  // Floor scaling
  enemyHpBase: 140,
  enemyHpGrowth: 1.125,
  enemyAtkBase: 10,
  enemyAtkGrowth: 1.125,
  goldBase: 10,
  goldGrowth: 1.12,
  /** Extra multiplier per Depth (each 50 floors). */
  depthHp: 1.6,
  depthAtk: 1.4,
  depthGold: 1.5,
  /** Boss floors: life and attack multiplier on top of the boss's own. */
  bossFloorMult: 0.75,
  /** Extra multiplier on boss life only (bosses are a check on damage, not just survival). */
  bossHpMult: 0.6,
  /**
   * After the first region each normal floor's total life, attack and gold are a fixed budget, in units of
   * a basic enemy, split among its enemies. 1 = fully normalized, 0 = raw per-enemy multipliers.
   */
  packNormalize: 1,
  packHpUnits: 3,
  /** Attack budget, in units of basicAttackRate (a Skeleton: 1/1.5 s basic + 4x every 7 s). */
  packAtkUnits: 2.6,
  basicAttackRate: 1.24,
  /** Attacks that hit the whole party count this many times in a damage budget. */
  partyAttackWeight: 2,
  /** A boss's damage budget (before bossFloorMult), in the same units. */
  bossThreat: 1.8,
  packGoldUnits: 3,
  /** Budget ramp inside a region: floor x1 gets packRampStart, each later floor adds packRampPerFloor. */
  packRampStart: 0.8,
  packRampPerFloor: 0.04,
  /** Most budget units a floor in the first region can have. */
  tutorialUnits: 2.4,
  /** Life multiplier for enemies in the first region (floors 1-10). */
  tutorialHpMult: 1.45,
  /** Budget for the adds beside a boss. */
  bossAddUnits: 1,
  checkpointEvery: 5,
  /** Enrage: after this many seconds on a floor (bosses: enrageAfterBoss), enemy damage grows by enrageRamp/s. */
  enrageAfter: 45,
  enrageAfterBoss: 90,
  enrageRamp: 0.05,

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
  heroCostGrowth: 1.18,
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
  acolyteSpeedPerLevel: 0.95,
  /** Caps that Litany (Acolyte power), Deep Well and Wellspring approach with diminishing returns. */
  acolytePowerCap: 3,
  manaMaxCap: 2.5,
  manaRegenCap: 3,

  // Devotion upgrades (per level)
  mightPerLevel: 1.2,
  fortunePerLevel: 1.3,
  gracePerLevel: 0.1,
  spiritPerLevel: 0.2,

  // Relics
  /** Tithe Ring: gold per Save, in basic-enemy kills of the current floor. */
  titheKills: 0.5,
  /** Thorn Amulet: share of what a Ward absorbs (or a Perfect blocks) dealt back to the attacker. */
  thornReflect: 0.1,

  // Poison
  cleanseHealPct: 0.05,

  // Offline
  offlineCapHours: 4,
  offlineEfficiency: 0.5,
  offlineSimSeconds: 1200,
  offlineDt: 0.05,

  // Pilgrimage
  // Healer XP: XP for healing 100% of a hero's life, per Perfect and Save; Acolyte healing counts partly.
  healerXpPerLife: 10,
  healerXpPerfect: 5,
  healerXpSave: 3,
  healerXpAcolyte: 0.4,
  /** XP to go from level L to L+1: base × growth^(L-1). */
  healerXpBase: 60,
  healerXpGrowth: 1.2,
  /** Deed claims pay gold worth this many average kills on the current floor. */
  deedGoldKills: 15,

  pilgrimageFloor: 25,
  /** Devotion from a Pilgrimage at pilgrimageFloor, and its growth per floor deeper. */
  devotionBase: 8,
  devotionGrowth: 1.045,
} as const;
