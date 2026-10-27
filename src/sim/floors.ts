import { enemyDef, type EnemyDef, type EnemyId } from './data/enemies.ts';
import { depthOf, isBossFloor, regionOf, FLOORS_PER_REGION, REGIONS } from './data/regions.ts';
import { hash2, int, makeRng } from './rng.ts';
import { T } from './tuning.ts';

export function floorHp(floor: number): number {
  return T.enemyHpBase * Math.pow(T.enemyHpGrowth, floor - 1) * Math.pow(T.depthHp, depthOf(floor));
}

/**
 * Enemy damage ramps up over the first atkRampFloors floors on top of its growth: the healer starts with
 * one Mend and little mana, and gains Acolytes, upgrades and talents as they go. Damage pressure grows with
 * that healing power, so walls stay damage-gated (short fights) instead of becoming slow HP races.
 */
export function atkRamp(floor: number): number {
  return T.atkRampStart + (1 - T.atkRampStart) * Math.min(1, (floor - 1) / T.atkRampFloors);
}

export function floorAtk(floor: number): number {
  return T.enemyAtkBase * atkRamp(floor) * Math.pow(T.enemyAtkGrowth, floor - 1) * Math.pow(T.depthAtk, depthOf(floor));
}

export function floorGold(floor: number): number {
  return T.goldBase * Math.pow(T.goldGrowth, floor - 1) * Math.pow(T.depthGold, depthOf(floor));
}

export function checkpointOf(floor: number): number {
  return floor - ((floor - 1) % T.checkpointEvery);
}

/**
 * Where a wipe on `floor` sends the party: its checkpoint, or the one before if the party fell on the
 * checkpoint floor itself (so a floor you can't beat never locks you out of earning gold).
 */
export function wipeCheckpoint(floor: number): number {
  const cp = checkpointOf(floor);
  return floor === cp && cp > T.checkpointEvery ? cp - T.checkpointEvery : cp;
}

/** The enemies on a floor. Deterministic per floor and seed. */
export function floorEnemies(floor: number, seed: number): EnemyId[] {
  const region = regionOf(floor);
  const local = ((floor - 1) % FLOORS_PER_REGION) + 1;
  const firstRegion = floor <= FLOORS_PER_REGION && depthOf(floor) === 0;
  const rng = makeRng(hash2(floor, seed));
  if (isBossFloor(floor)) {
    const adds = firstRegion ? 0 : 1;
    const out: EnemyId[] = [region.boss];
    for (let i = 0; i < adds; i++) out.push(region.enemies[0]!);
    return out;
  }
  const pool = local <= 2 ? 1 : local <= 5 ? 2 : 3;
  let count = 1 + Math.floor(local / 3);
  if (!firstRegion) count = Math.max(2, count);
  count = Math.min(4, count);
  const out: EnemyId[] = [];
  for (let i = 0; i < count; i++) out.push(region.enemies[int(rng, pool)]!);
  // Make sure the newest enemy shows up on the floor that introduces it.
  if (local === 3 || local === 6) out[0] = region.enemies[pool - 1]!;
  // Heavy hitters stand at the back so the front line dies first.
  out.sort((a, b) => enemyDef(a).hp - enemyDef(b).hp);
  return out;
}

/**
 * Damage per second of an enemy per point of attack, relative to a Skeleton-like basic enemy (1.0):
 * every attack's multiplier over its interval, poison counted while it is up.
 */
export function attackRate(d: EnemyDef): number {
  let r = 0;
  for (const a of d.attacks) {
    const targets = a.target === 'all' ? T.partyAttackWeight : 1;
    r += (targets * a.mult) / a.interval;
    if (a.poison) r += (targets * a.poison.dps * Math.min(a.poison.dur, a.interval)) / a.interval;
  }
  return r / T.basicAttackRate;
}

/** One enemy's stat multipliers on the floor's base life, attack and gold. */
export interface PackMember {
  id: EnemyId;
  hp: number;
  atk: number;
  gold: number;
}

/**
 * The enemies on a floor with their stat shares. After the first region every normal floor has the same
 * total budget (in units of a basic enemy), split by each enemy's own multipliers, so a floor's threat grows
 * smoothly with depth whether it holds two brutes or four rats. Every boss gets the same damage budget
 * (bossThreat, spread over its own attacks); boss life still grows from region to region.
 */
export function floorPack(floor: number, seed: number): PackMember[] {
  const ids = floorEnemies(floor, seed);
  const defs = ids.map(enemyDef);
  const tutorial = floor <= FLOORS_PER_REGION && depthOf(floor) === 0;
  const weight = (d: EnemyDef, k: 'hp' | 'atk' | 'gold') => (k === 'atk' ? d.atk * attackRate(d) : d[k]);
  const sum = (k: 'hp' | 'atk' | 'gold') => defs.reduce((a, d) => a + (d.boss ? 0 : weight(d, k)), 0);
  const boss = isBossFloor(floor);
  // A mild ramp inside each region: a breather after a boss, a little harder towards the next one.
  const local = ((floor - 1) % FLOORS_PER_REGION) + 1;
  const ramp = boss ? 1 : T.packRampStart + T.packRampPerFloor * (local - 1);
  const share = (k: 'hp' | 'atk' | 'gold', units: number) => {
    const total = sum(k);
    if (total <= 0) return 1;
    // The first region keeps its hand-made ramp (1 rat on floor 1), only capped so floors 6-9 don't pile up.
    if (tutorial) return Math.min(1, T.tutorialUnits / total);
    return Math.pow((units * ramp) / total, T.packNormalize);
  };
  const sh = share('hp', boss ? T.bossAddUnits : T.packHpUnits);
  const sa = share('atk', boss ? T.bossAddUnits : T.packAtkUnits);
  const sg = share('gold', boss ? T.bossAddUnits : T.packGoldUnits);
  // The first region is a tutorial: longer fights give time to learn, without changing later floors.
  const tut = tutorial ? T.tutorialHpMult : 1;
  return defs.map((d) => {
    const b = d.boss ? T.bossFloorMult : 1;
    return {
      id: d.id,
      hp: (d.boss ? d.hp * T.bossHpMult * b : d.hp * sh) * tut,
      atk: d.boss ? (T.bossThreat * b) / attackRate(d) : d.atk * sa,
      gold: d.boss ? d.gold : d.gold * sg,
    };
  });
}

export const TOTAL_REGIONS = REGIONS.length;
