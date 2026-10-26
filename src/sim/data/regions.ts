import type { EnemyId } from './enemies.ts';

export type RegionId = 'crypt' | 'fungal' | 'frost' | 'ember' | 'abyss';

export interface RegionDef {
  id: RegionId;
  name: string;
  /** Normal enemies, in the order they are introduced. */
  enemies: EnemyId[];
  boss: EnemyId;
}

export const REGIONS = [
  { id: 'crypt', name: 'Mossy Crypt', enemies: ['rat', 'skeleton', 'slime'], boss: 'bone_knight' },
  { id: 'fungal', name: 'Fungal Hollow', enemies: ['sporeling', 'goblin_archer', 'mushroom_brute'], boss: 'myconid_queen' },
  { id: 'frost', name: 'Frost Depths', enemies: ['ice_wraith', 'yeti', 'frost_mage'], boss: 'frost_wyrm' },
  { id: 'ember', name: 'Ember Forge', enemies: ['imp', 'magma_golem', 'fire_cultist'], boss: 'forge_tyrant' },
  { id: 'abyss', name: 'The Abyss', enemies: ['shade', 'void_eye', 'abyss_knight'], boss: 'hollow_king' },
] as const satisfies readonly RegionDef[];

export const FLOORS_PER_REGION = 10;

export function regionIndex(floor: number): number {
  return Math.floor((floor - 1) / FLOORS_PER_REGION) % REGIONS.length;
}

export function regionOf(floor: number): RegionDef {
  return REGIONS[regionIndex(floor)]!;
}

/** 0 for floors 1-50, 1 for 51-100, and so on. */
export function depthOf(floor: number): number {
  return Math.floor((floor - 1) / (FLOORS_PER_REGION * REGIONS.length));
}

export function isBossFloor(floor: number): boolean {
  return floor % FLOORS_PER_REGION === 0;
}
