import { HEROES, type HeroDef, type HeroId } from './data/heroes.ts';
import type { OrderId } from './data/orders.ts';
import type { PrayerId } from './data/prayers.ts';
import type { RelicId } from './data/relics.ts';
import type { DevotionUpgradeId, GoldUpgradeId } from './data/upgrades.ts';
import { T } from './tuning.ts';

/** The parts of a save that decide how strong the party is. Plain data. */
export interface Progress {
  heroLevels: Record<HeroId, number>;
  upgrades: Partial<Record<GoldUpgradeId, number>>;
  devotionUpgrades: Partial<Record<DevotionUpgradeId, number>>;
  relics: RelicId[];
  order: OrderId;
  acolytes: PrayerId[];
  /** Highest floor reached in this Pilgrimage (Acolytes unlock at floor 10). */
  maxFloor: number;
}

export interface HeroStats {
  def: HeroDef;
  maxHp: number;
  atk: number;
  interval: number;
  damageTaken: number;
  rage: number;
}

export interface Loadout {
  order: OrderId;
  heroes: HeroStats[];
  manaMax: number;
  manaRegen: number;
  mendPct: number;
  mendCost: number;
  wardPct: number;
  wardCost: number;
  chainEff: number;
  healMult: number;
  perfectWindow: number;
  resonanceMult: number;
  goldMult: number;
  acolytes: { prayer: PrayerId }[];
  acolyteInterval: number;
  acolytePotency: number;
  relics: Set<RelicId>;
  /** Fraction of overhealing turned into a Ward. */
  overhealShield: number;
}

export function heroLevelMult(level: number): number {
  const milestones = Math.floor(level / T.heroMilestoneEvery);
  return (1 + T.heroLevelHpStep * (level - 1)) * Math.pow(T.heroMilestoneMult, milestones);
}

/** A % bonus that approaches `cap` with diminishing returns. */
function soft(base: number, cap: number, level: number, rate = 0.93): number {
  return base + (cap - base) * (1 - Math.pow(rate, level));
}

export function acolyteSlots(p: Progress): number {
  const choir = p.devotionUpgrades.choir ?? 0;
  const unlocked = choir > 0 || p.maxFloor >= T.acolyteFloorUnlock;
  if (!unlocked) return 0;
  return 1 + (p.upgrades.aco_slot ?? 0) + choir;
}

export function buildLoadout(p: Progress): Loadout {
  const u = (id: GoldUpgradeId) => p.upgrades[id] ?? 0;
  const d = (id: DevotionUpgradeId) => p.devotionUpgrades[id] ?? 0;
  const relics = new Set(p.relics);
  const might = Math.pow(1.25, d('might'));

  const heroes = (HEROES as readonly HeroDef[]).map((def): HeroStats => {
    const lm = heroLevelMult(p.heroLevels[def.id] ?? 1);
    let hpMult = lm * might;
    let atkMult = lm * might;
    let damageTaken: number = def.damageTaken;
    let rage = def.rage ?? 0;
    if (def.id === 'ilse' && relics.has('star_gem')) {
      hpMult *= 1.3;
      atkMult *= 1.6;
    }
    if (def.id === 'tomas' && relics.has('iron_vow')) damageTaken *= 0.75;
    if (def.id === 'brann' && relics.has('blood_totem')) rage *= 2;
    return { def, maxHp: def.hp * hpMult, atk: def.atk * atkMult, interval: def.interval, damageTaken, rage };
  });

  const grace = 1 + 0.08 * d('grace');
  const mendCost = T.mendCost * (relics.has('quill') ? 0.7 : 1);
  return {
    order: p.order,
    heroes,
    manaMax: T.manaMax * (1 + 0.12 * u('mana_max')) * (relics.has('chalice') ? 1.5 : 1),
    manaRegen:
      T.manaRegen * (1 + 0.12 * u('mana_regen')) * (1 + 0.15 * d('spirit')) * (relics.has('candle') ? 1.4 : 1),
    mendPct: soft(T.mendPct, 0.7, u('mend_power')) * (p.order === 'chrono' ? 0.85 : 1),
    mendCost,
    wardPct: soft(T.wardPct, 1.2, u('ward_power')) * (relics.has('warding_orb') ? 1.5 : 1),
    wardCost: T.wardCost,
    chainEff: soft(T.chainEff, 1, u('chain_power')),
    healMult: grace,
    perfectWindow: T.perfectWindow + (relics.has('hourglass') ? 0.25 : 0),
    resonanceMult: relics.has('resonant_bell') ? 1.6 : 1,
    goldMult: Math.pow(1.3, d('fortune')) * (relics.has('crown') ? 1.5 : 1),
    acolytes: p.acolytes.slice(0, acolyteSlots(p)).map((prayer) => ({ prayer })),
    acolyteInterval:
      (T.acolyteInterval * Math.pow(0.95, u('aco_speed'))) / (relics.has('rosary') ? 1.3 : 1),
    acolytePotency: T.acolytePotency * (1 + 0.15 * u('aco_power')),
    relics,
    overhealShield: (p.order === 'cleric' ? 1 / 3 : 0) + (relics.has('sunstone') ? 0.5 : 0),
  };
}
