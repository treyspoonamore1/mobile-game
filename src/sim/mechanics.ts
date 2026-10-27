import { aliveHeroes, damageHero, lifeFrac } from './combat.ts';
import type { MechAttack } from './data/mechanics.ts';
import { pick } from './rng.ts';
import type { FightState } from './state.ts';
import { T } from './tuning.ts';

const TICK = 0.5;

/** Targets picked when a mechanic starts winding up (Siphon targets the healer, not a hero). */
export function mechTargets(s: FightState, a: MechAttack, chosen: number[]): number[] {
  if (a.mech === 'siphon') return [];
  if (a.mech === 'frostbite') {
    const others = aliveHeroes(s).filter((i) => !chosen.includes(i));
    return others.length > 0 ? [...chosen, pick(s.rng, others)] : chosen;
  }
  return chosen;
}

/** A mechanic's windup ended. */
export function resolveMech(s: FightState, ei: number, a: MechAttack, targets: number[]): void {
  switch (a.mech) {
    case 'judgement':
      for (const i of targets) {
        const h = s.heroes[i]!;
        if (!h.alive) continue;
        const passed = lifeFrac(h) >= T.judgementLine;
        s.events.push({ type: 'judged', hero: i, passed });
        if (!passed) {
          damageHero(s, i, (h.stats.maxHp * T.judgementDmg) / h.stats.damageTaken, { enemy: ei, big: true, dodgeable: false });
        }
      }
      return;
    case 'plague':
      for (const i of targets) infect(s, i, true);
      return;
    case 'frostbite':
      for (const i of targets) {
        const h = s.heroes[i]!;
        if (!h.alive) continue;
        h.frostT = T.frostTime;
        h.frostTick = 0;
        s.events.push({ type: 'frostbite', hero: i });
      }
      return;
    case 'siphon':
      s.siphonT = T.siphonTime;
      s.events.push({ type: 'siphon' });
      return;
  }
}

function infect(s: FightState, i: number, spreads: boolean): void {
  const h = s.heroes[i]!;
  if (!h.alive || h.plagueT > 0) return;
  h.plagueT = T.plagueTime;
  h.plagueSpreads = spreads;
  s.events.push({ type: 'plague', hero: i });
}

/** Plague and Frostbite timers. */
export function stepMechanics(s: FightState, dt: number): void {
  s.siphonT = Math.max(0, s.siphonT - dt);
  s.heroes.forEach((h, i) => {
    if (!h.alive) {
      h.plagueT = 0;
      h.frostT = 0;
      return;
    }
    if (h.plagueT > 0) {
      h.plagueT -= dt;
      if (h.plagueT <= 0) {
        h.plagueT = 0;
        s.events.push({ type: 'plagueBurst', hero: i });
        damageHero(s, i, (h.stats.maxHp * T.plagueDmg) / h.stats.damageTaken, { enemy: -1, big: false, dodgeable: false, poison: true });
        if (h.plagueSpreads) for (const j of aliveHeroes(s)) if (j !== i) infect(s, j, false);
      }
    }
    if (h.frostT > 0) {
      if (lifeFrac(h) >= T.frostThaw) {
        h.frostT = 0;
        s.events.push({ type: 'thaw', hero: i });
        return;
      }
      h.frostT -= dt;
      h.frostTick += dt;
      if (h.frostTick >= TICK) {
        h.frostTick -= TICK;
        damageHero(s, i, (h.stats.maxHp * T.frostDps * TICK) / h.stats.damageTaken, { enemy: -1, big: false, dodgeable: false, poison: true });
      }
    }
  });
}

/** Casting during a Siphon drains mana. */
export function siphonCast(s: FightState): void {
  if (s.siphonT <= 0) return;
  const amount = Math.min(s.mana, s.loadout.manaMax * T.siphonDrain);
  s.mana -= amount;
  s.events.push({ type: 'siphoned', amount });
}
