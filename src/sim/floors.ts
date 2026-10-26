import { enemyDef, type EnemyId } from './data/enemies.ts';
import { depthOf, isBossFloor, regionOf, FLOORS_PER_REGION, REGIONS } from './data/regions.ts';
import { hash2, int, makeRng } from './rng.ts';
import { T } from './tuning.ts';

export function floorHp(floor: number): number {
  return T.enemyHpBase * Math.pow(T.enemyHpGrowth, floor - 1) * Math.pow(T.depthHp, depthOf(floor));
}

export function floorAtk(floor: number): number {
  return T.enemyAtkBase * Math.pow(T.enemyAtkGrowth, floor - 1) * Math.pow(T.depthAtk, depthOf(floor));
}

export function floorGold(floor: number): number {
  return T.goldBase * Math.pow(T.goldGrowth, floor - 1) * Math.pow(T.depthGold, depthOf(floor));
}

export function checkpointOf(floor: number): number {
  return floor - ((floor - 1) % T.checkpointEvery);
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
 * smoothly with depth whether it holds two brutes or four rats. Bosses keep their own (large) multipliers.
 */
export function floorPack(floor: number, seed: number): PackMember[] {
  const ids = floorEnemies(floor, seed);
  const defs = ids.map(enemyDef);
  const tutorial = floor <= FLOORS_PER_REGION && depthOf(floor) === 0;
  const sum = (k: 'hp' | 'atk' | 'gold') => defs.reduce((a, d) => a + (d.boss ? 0 : d[k]), 0);
  const boss = isBossFloor(floor);
  // A mild ramp inside each region: a breather after a boss, a little harder towards the next one.
  const local = ((floor - 1) % FLOORS_PER_REGION) + 1;
  const ramp = boss ? 1 : T.packRampStart + T.packRampPerFloor * (local - 1);
  const share = (k: 'hp' | 'atk' | 'gold', units: number) => {
    const total = sum(k);
    if (tutorial || total <= 0) return 1;
    return Math.pow((units * ramp) / total, T.packNormalize);
  };
  const sh = share('hp', boss ? T.bossAddUnits : T.packHpUnits);
  const sa = share('atk', boss ? T.bossAddUnits : T.packAtkUnits);
  const sg = share('gold', boss ? T.bossAddUnits : T.packGoldUnits);
  return defs.map((d) => {
    const b = d.boss ? T.bossFloorMult : 1;
    return {
      id: d.id,
      hp: d.boss ? d.hp * T.bossHpMult * b : d.hp * sh,
      atk: d.boss ? d.atk * b : d.atk * sa,
      gold: d.boss ? d.gold : d.gold * sg,
    };
  });
}

export const TOTAL_REGIONS = REGIONS.length;
