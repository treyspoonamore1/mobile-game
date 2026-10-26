export type HeroId = 'tomas' | 'brann' | 'ilse' | 'wren';

export interface HeroDef {
  id: HeroId;
  name: string;
  role: string;
  quirk: string;
  /** Life and damage at level 1. */
  hp: number;
  atk: number;
  /** Seconds between attacks. */
  interval: number;
  /** Multiplier on damage taken. */
  damageTaken: number;
  taunt?: boolean;
  /** Damage bonus at 0 life, scaling linearly with missing life. */
  rage?: number;
  aoe?: boolean;
  crit?: number;
  dodge?: number;
  /** Level-up cost multiplier. */
  costMult: number;
  color: string;
}

export const HEROES = [
  {
    id: 'tomas', name: 'Tomas', role: 'Tank', color: '#6fa8dc',
    quirk: 'Taunts basic attacks. Takes 30% less damage.',
    hp: 140, atk: 3, interval: 1.2, damageTaken: 0.7, taunt: true, costMult: 1,
  },
  {
    id: 'brann', name: 'Brann', role: 'Berserker', color: '#e06666',
    quirk: 'Up to +150% damage as his life drops. Keep him low, not full.',
    hp: 95, atk: 6, interval: 1.0, damageTaken: 1, rage: 1.5, costMult: 1.1,
  },
  {
    id: 'ilse', name: 'Ilse', role: 'Mage', color: '#b48ce6',
    quirk: 'Glass cannon. Her bolts hit every enemy.',
    hp: 55, atk: 4, interval: 1.6, damageTaken: 1, aoe: true, costMult: 1.2,
  },
  {
    id: 'wren', name: 'Wren', role: 'Ranger', color: '#93c47d',
    quirk: 'Dodges 20% of basic attacks. 20% crit chance.',
    hp: 70, atk: 5, interval: 0.9, damageTaken: 1, crit: 0.2, dodge: 0.2, costMult: 1.05,
  },
] as const satisfies readonly HeroDef[];

export const HERO_IDS: readonly HeroId[] = HEROES.map((h) => h.id);

export function heroDef(id: HeroId): HeroDef {
  return HEROES.find((h) => h.id === id)!;
}
