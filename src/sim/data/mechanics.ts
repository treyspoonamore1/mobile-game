import { enemyDef, type AttackDef, type EnemyDef, type EnemyId } from './enemies.ts';

/**
 * Boss mechanics: telegraphed attacks that test a healing skill rather than raw numbers.
 * - judgement: the marked hero must be above the line when the mark ends, or take a heavy blow (top them up).
 * - plague: the hero is infected; heal them before it bursts and spreads to everyone (priority).
 * - frostbite: two heroes bleed until healed back to full (Chain Mend).
 * - siphon: for a few seconds every spell you cast drains your mana (restraint).
 */
export type MechKind = 'judgement' | 'plague' | 'frostbite' | 'siphon';

export interface MechAttack extends AttackDef {
  mech: MechKind;
}

export function isMech(a: AttackDef): a is MechAttack {
  return 'mech' in a;
}

export const MECH_INFO: Record<MechKind, { name: string; hint: string; color: string }> = {
  judgement: { name: 'Judgement', hint: 'Get them above 90% before the mark ends!', color: '#ffe14a' },
  plague: { name: 'Plague', hint: 'Mend the infected hero before it spreads!', color: '#8be04e' },
  frostbite: { name: 'Frostbite', hint: 'Heal both frozen heroes back to full!', color: '#9fdcff' },
  siphon: { name: 'Siphon', hint: 'Don\'t cast while the Siphon is open!', color: '#c48cff' },
};

const judgement: MechAttack = { name: 'Judgement', mech: 'judgement', mult: 0, interval: 13, target: 'random', windup: 3.5 };
const plague: MechAttack = { name: 'Plague', mech: 'plague', mult: 0, interval: 12, target: 'random', windup: 1.2 };
const frostbite: MechAttack = { name: 'Frostbite', mech: 'frostbite', mult: 0, interval: 12, target: 'random', windup: 1.4 };
const siphon: MechAttack = { name: 'Siphon', mech: 'siphon', mult: 0, interval: 15, target: 'all', windup: 2 };

export const BOSS_MECHANICS: Partial<Record<EnemyId, MechAttack[]>> = {
  bone_knight: [judgement],
  myconid_queen: [plague],
  frost_wyrm: [frostbite],
  forge_tyrant: [siphon],
  hollow_king: [
    { ...judgement, interval: 17 },
    { ...plague, interval: 19 },
    { ...siphon, interval: 23 },
  ],
};

const merged = new Map<EnemyId, EnemyDef>();

/** The enemy's definition with its boss mechanics added to its attacks. */
export function fightDef(id: EnemyId): EnemyDef {
  let d = merged.get(id);
  if (!d) {
    const base = enemyDef(id);
    const mechs = BOSS_MECHANICS[id];
    d = mechs ? { ...base, attacks: [...base.attacks, ...mechs] } : base;
    merged.set(id, d);
  }
  return d;
}
