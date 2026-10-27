import { HEROES, type HeroDef, type HeroId } from './data/heroes.ts';
import type { OrderId } from './data/orders.ts';
import type { PrayerId } from './data/prayers.ts';
import type { RelicId } from './data/relics.ts';
import type { DevotionUpgradeId, GoldUpgradeId } from './data/upgrades.ts';
import { deedBonus, type DeedsClaimed } from './data/deeds.ts';
import { talentValue, type Talents } from './data/talents.ts';
import { gearStat, type Item, type Slot } from './data/gear.ts';
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
  /** Healer talents (permanent, free to respec). */
  talents: Talents;
  /** Deed tiers claimed (permanent bonuses). */
  deeds: DeedsClaimed;
  /** Gear worn by each hero (reset by a Pilgrimage). */
  equipped: Partial<Record<HeroId, Partial<Record<Slot, Item>>>>;
}

export interface HeroStats {
  def: HeroDef;
  maxHp: number;
  atk: number;
  interval: number;
  damageTaken: number;
  rage: number;
  /** Crit chance (base plus gear). */
  crit: number;
  /** Multiplier on healing this hero receives (gear). */
  healTaken: number;
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
  wardDur: number;
  // Talents
  secondTouch: number;
  triage: number;
  overflow: number;
  lifebloom: boolean;
  riposte: number;
  bastion: number;
  miracle: number;
}

/**
 * Hero life grows smoothly every level (no survival cliffs between milestones). It matches
 * heroLevelMult at every milestone, so only damage carries the ×2 pop.
 */
export function heroLifeMult(level: number): number {
  const perLevel = T.heroLevelGrowth * Math.pow(T.heroMilestoneMult, 1 / T.heroMilestoneEvery);
  return Math.pow(perLevel, level - 1);
}

export function heroLevelMult(level: number): number {
  const milestones = Math.floor(level / T.heroMilestoneEvery);
  return Math.pow(T.heroLevelGrowth, level - 1) * Math.pow(T.heroMilestoneMult, milestones);
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
  const might = Math.pow(T.mightPerLevel, d('might'));
  const t = (id: Parameters<typeof talentValue>[1]) => talentValue(p.talents ?? {}, id);
  const deed = (k: Parameters<typeof deedBonus>[1]) => deedBonus(p.deeds ?? {}, k);
  const dmgBonus = (1 + t('battle_hymn')) * (1 + deed('damage'));
  const lifeBonus = 1 + deed('life');

  const heroes = (HEROES as readonly HeroDef[]).map((def): HeroStats => {
    const lvl = p.heroLevels[def.id] ?? 1;
    const lm = heroLevelMult(lvl);
    let hpMult = heroLifeMult(lvl) * might * lifeBonus;
    let atkMult = lm * might * dmgBonus;
    const gear = Object.values(p.equipped?.[def.id] ?? {});
    const g = (k: Parameters<typeof gearStat>[1]) => gearStat(gear, k);
    hpMult *= 1 + g('vigor');
    atkMult *= 1 + g('might');
    let damageTaken: number = def.damageTaken * (1 - g('guard'));
    let rage = def.rage ?? 0;
    if (def.id === 'ilse' && relics.has('star_gem')) {
      hpMult *= 1.3;
      atkMult *= 1.6;
    }
    if (def.id === 'tomas' && relics.has('iron_vow')) damageTaken *= 0.75;
    if (def.id === 'brann' && relics.has('blood_totem')) rage *= 2;
    return {
      def, maxHp: def.hp * hpMult, atk: def.atk * atkMult, interval: def.interval / (1 + g('haste')), damageTaken, rage,
      crit: (def.crit ?? 0) + g('precision'), healTaken: 1 + g('blessed'),
    };
  });

  const grace = (1 + T.gracePerLevel * d('grace')) * (1 + deed('heal'));
  const mendCost = T.mendCost * (relics.has('quill') ? 0.7 : 1) * (1 - t('swift_hands'));
  return {
    order: p.order,
    heroes,
    // Mana and Acolyte upgrades approach a cap: healing throughput must not outgrow depth on its own.
    manaMax: T.manaMax * soft(1, T.manaMaxCap, u('mana_max')) * (relics.has('chalice') ? 1.5 : 1) * (1 + t('deep_breath')),
    manaRegen:
      T.manaRegen * soft(1, T.manaRegenCap, u('mana_regen')) * (1 + T.spiritPerLevel * d('spirit')) *
      (relics.has('candle') ? 1.4 : 1) * (1 + t('deep_breath')) * (1 + deed('mana')),
    mendPct: soft(T.mendPct, T.mendCap, u('mend_power')) * (p.order === 'chrono' ? 0.85 : 1),
    mendCost,
    wardPct: soft(T.wardPct, T.wardCap, u('ward_power')) * (relics.has('warding_orb') ? 1.5 : 1) * (1 + t('thick_ward')),
    wardCost: T.wardCost,
    chainEff: soft(T.chainEff, 1, u('chain_power')),
    healMult: grace,
    perfectWindow: T.perfectWindow + (relics.has('hourglass') ? 0.25 : 0) + t('wide_window'),
    resonanceMult: (relics.has('resonant_bell') ? 1.6 : 1) * (1 + t('resonant')) * (1 + deed('resonance')),
    goldMult: Math.pow(T.fortunePerLevel, d('fortune')) * (relics.has('crown') ? 1.5 : 1) * (1 + deed('gold')),
    acolytes: p.acolytes.slice(0, acolyteSlots(p)).map((prayer) => ({ prayer })),
    acolyteInterval:
      (T.acolyteInterval * Math.pow(T.acolyteSpeedPerLevel, u('aco_speed'))) / (relics.has('rosary') ? 1.3 : 1) / (1 + t('swift_prayers')),
    acolytePotency: T.acolytePotency * soft(1, T.acolytePowerCap, u('aco_power')) * (1 + t('shepherd')) * (1 + deed('acolyte')),
    relics,
    overhealShield: (p.order === 'cleric' ? T.clericOverhealShield : 0) + (relics.has('sunstone') ? 0.5 : 0),
    wardDur: T.wardDur + t('lingering'),
    secondTouch: t('second_touch'),
    triage: t('triage'),
    overflow: t('overflow'),
    lifebloom: t('lifebloom') > 0,
    riposte: t('riposte'),
    bastion: t('bastion'),
    miracle: t('miracle'),
  };
}
