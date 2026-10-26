export type Targeting = 'taunt' | 'random' | 'lowest' | 'backline' | 'all';

export interface AttackDef {
  name: string;
  /** Damage as a multiple of the enemy's attack. */
  mult: number;
  /** Seconds between uses. The first use comes after a random part of this. */
  interval: number;
  target: Targeting;
  /** Telegraph time in seconds. 0 = instant (a basic attack, can be dodged). */
  windup: number;
  /** Poison applied on hit: damage per second as a multiple of attack, and duration. */
  poison?: { dps: number; dur: number };
}

export type EnemyId =
  | 'rat' | 'skeleton' | 'slime' | 'bone_knight'
  | 'sporeling' | 'goblin_archer' | 'mushroom_brute' | 'myconid_queen'
  | 'ice_wraith' | 'yeti' | 'frost_mage' | 'frost_wyrm'
  | 'imp' | 'magma_golem' | 'fire_cultist' | 'forge_tyrant'
  | 'shade' | 'void_eye' | 'abyss_knight' | 'hollow_king';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  /** Multipliers on the floor's base life, attack and gold. */
  hp: number;
  atk: number;
  gold: number;
  boss?: boolean;
  attacks: AttackDef[];
}

const basic = (interval: number, target: Targeting = 'taunt', mult = 1): AttackDef => ({
  name: 'Attack', mult, interval, target, windup: 0,
});

export const ENEMIES = [
  // Mossy Crypt
  { id: 'rat', name: 'Crypt Rat', hp: 0.6, atk: 0.7, gold: 0.6, attacks: [basic(0.9)] },
  {
    id: 'skeleton', name: 'Skeleton', hp: 1, atk: 1, gold: 1,
    attacks: [basic(1.5), { name: 'Bone Crush', mult: 4, interval: 7, target: 'random', windup: 1.6 }],
  },
  {
    id: 'slime', name: 'Bog Slime', hp: 1.3, atk: 0.6, gold: 1,
    attacks: [{ name: 'Ooze', mult: 0.6, interval: 2, target: 'random', windup: 0, poison: { dps: 0.5, dur: 5 } }],
  },
  {
    id: 'bone_knight', name: 'The Bone Knight', hp: 10, atk: 1.4, gold: 12, boss: true,
    attacks: [
      basic(1.8),
      { name: 'Cleave', mult: 6, interval: 8, target: 'taunt', windup: 1.8 },
      { name: 'Bone Storm', mult: 2.5, interval: 11, target: 'all', windup: 2.2 },
    ],
  },
  // Fungal Hollow
  {
    id: 'sporeling', name: 'Sporeling', hp: 0.8, atk: 0.8, gold: 1,
    attacks: [basic(1.3), { name: 'Spore Burst', mult: 0.3, interval: 7, target: 'all', windup: 1.4, poison: { dps: 0.35, dur: 6 } }],
  },
  { id: 'goblin_archer', name: 'Goblin Archer', hp: 0.8, atk: 1.1, gold: 1.1, attacks: [basic(1.1, 'backline')] },
  {
    id: 'mushroom_brute', name: 'Mushroom Brute', hp: 1.8, atk: 1, gold: 1.4,
    attacks: [basic(1.8), { name: 'Smash', mult: 5, interval: 8, target: 'random', windup: 1.8 }],
  },
  {
    id: 'myconid_queen', name: 'The Myconid Queen', hp: 15, atk: 1.3, gold: 13, boss: true,
    attacks: [
      basic(1.6),
      { name: 'Pulse', mult: 1.5, interval: 6, target: 'all', windup: 1.5 },
      { name: 'Rot Bloom', mult: 0.4, interval: 13, target: 'all', windup: 2, poison: { dps: 0.4, dur: 6 } },
      { name: 'Grasp', mult: 4, interval: 9, target: 'lowest', windup: 1.6 },
    ],
  },
  // Frost Depths
  {
    id: 'ice_wraith', name: 'Ice Wraith', hp: 0.9, atk: 1, gold: 1.1,
    attacks: [basic(1.5), { name: 'Frost Lance', mult: 4, interval: 6, target: 'backline', windup: 1.4 }],
  },
  {
    id: 'yeti', name: 'Yeti', hp: 2, atk: 1.3, gold: 1.5,
    attacks: [basic(1.6), { name: 'Maul', mult: 4, interval: 7, target: 'taunt', windup: 1.6 }],
  },
  {
    id: 'frost_mage', name: 'Frost Mage', hp: 0.9, atk: 1, gold: 1.2,
    attacks: [basic(1.6, 'backline'), { name: 'Blizzard', mult: 1.2, interval: 7, target: 'all', windup: 1.8 }],
  },
  {
    id: 'frost_wyrm', name: 'The Frost Wyrm', hp: 12, atk: 1.4, gold: 14, boss: true,
    attacks: [
      basic(1.5),
      { name: 'Frost Breath', mult: 2, interval: 10, target: 'all', windup: 2.5 },
      { name: 'Tail Lash', mult: 5, interval: 6, target: 'random', windup: 1.6 },
    ],
  },
  // Ember Forge
  { id: 'imp', name: 'Ember Imp', hp: 0.5, atk: 0.7, gold: 0.7, attacks: [basic(0.6, 'random')] },
  {
    id: 'magma_golem', name: 'Magma Golem', hp: 2.4, atk: 1.2, gold: 1.6,
    attacks: [basic(2), { name: 'Eruption', mult: 6, interval: 8, target: 'taunt', windup: 2 }],
  },
  {
    id: 'fire_cultist', name: 'Fire Cultist', hp: 1, atk: 1, gold: 1.2,
    attacks: [
      { name: 'Ignite', mult: 0.5, interval: 2, target: 'backline', windup: 0, poison: { dps: 0.5, dur: 4 } },
      { name: 'Fireball', mult: 4, interval: 7, target: 'backline', windup: 1.5 },
    ],
  },
  {
    id: 'forge_tyrant', name: 'The Forge Tyrant', hp: 14, atk: 1.3, gold: 15, boss: true,
    attacks: [
      basic(1.3),
      { name: 'Hammerfall', mult: 5, interval: 7, target: 'taunt', windup: 1.8 },
      { name: 'Slag Wave', mult: 1.8, interval: 9, target: 'all', windup: 2, poison: { dps: 0.3, dur: 4 } },
      { name: 'Brand', mult: 4, interval: 11, target: 'backline', windup: 1.4 },
    ],
  },
  // The Abyss
  { id: 'shade', name: 'Shade', hp: 0.8, atk: 0.9, gold: 1, attacks: [basic(1, 'lowest')] },
  {
    id: 'void_eye', name: 'Void Eye', hp: 1, atk: 1, gold: 1.2,
    attacks: [basic(1.6, 'random'), { name: 'Gaze', mult: 5, interval: 6, target: 'lowest', windup: 1.4 }],
  },
  {
    id: 'abyss_knight', name: 'Abyss Knight', hp: 2.2, atk: 1.2, gold: 1.6,
    attacks: [
      basic(1.5),
      { name: 'Rend', mult: 5, interval: 7, target: 'random', windup: 1.6 },
      { name: 'Dark Wave', mult: 1.5, interval: 10, target: 'all', windup: 1.8 },
    ],
  },
  {
    id: 'hollow_king', name: 'The Hollow King', hp: 19, atk: 1.6, gold: 18, boss: true,
    attacks: [
      basic(1.2, 'lowest'),
      { name: 'Oblivion', mult: 3, interval: 12, target: 'all', windup: 2.6 },
      { name: 'Execute', mult: 6, interval: 7, target: 'lowest', windup: 1.6 },
      { name: 'Wither', mult: 0.3, interval: 9, target: 'all', windup: 1.5, poison: { dps: 0.5, dur: 5 } },
    ],
  },
] as const satisfies readonly EnemyDef[];

const byId = new Map<string, EnemyDef>(ENEMIES.map((e) => [e.id, e]));

export function enemyDef(id: EnemyId): EnemyDef {
  return byId.get(id)!;
}
