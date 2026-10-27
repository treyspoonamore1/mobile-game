import { aliveHeroes, lifeFrac } from './combat.ts';
import { isMech } from './data/mechanics.ts';
import { incomingOn, type Action, type FightState } from './state.ts';
import { T } from './tuning.ts';

/** A scripted player. Called every tick; returns this tick's actions. */
export type Bot = (s: FightState) => Action[];

export const idleBot: Bot = () => [];

/** Taps the lowest hero a few times a second. Never Wards. */
export function noviceBot(tapsPerSecond = 3): Bot {
  let cd = 0;
  return (s) => {
    cd -= 1 / 60;
    if (cd > 0 || s.phase !== 'fight') return [];
    const low = lowest(s);
    if (low === null || lifeFrac(s.heroes[low]!) > 0.6) return [];
    cd = 1 / tapsPerSecond;
    return [{ kind: 'mend', hero: low }];
  };
}

/** Wards telegraphed targets just before impact, triages, chains and uses Sanctuary. */
export function skilledBot(tapsPerSecond = 5, perfectLead = 0.25): Bot {
  let cd = 0;
  return (s) => {
    cd -= 1 / 60;
    if (s.phase !== 'fight') return [];
    if (s.resonance >= 100 && s.heroes.some((h) => h.alive && lifeFrac(h) < 0.35)) return [{ kind: 'sanctuary' }];
    if (cd > 0) return [];
    const mech = mechanicMove(s);
    if (mech !== undefined) {
      if (mech.length > 0) cd = 1 / tapsPerSecond;
      return mech;
    }
    for (const i of aliveHeroes(s)) {
      const inc = incomingOn(s, i);
      if (inc && inc.left <= perfectLead && inc.left > perfectLead - 0.1 && s.t - s.heroes[i]!.playerWardAt > 1) {
        cd = 1 / tapsPerSecond;
        return [{ kind: 'hold', hero: i }];
      }
    }
    const dead = s.heroes.findIndex((h) => !h.alive);
    if (dead >= 0 && s.mana > 60) {
      cd = 1 / tapsPerSecond;
      return [{ kind: 'mend', hero: dead }];
    }
    const hurt = aliveHeroes(s).filter((i) => lifeFrac(s.heroes[i]!) < 0.6);
    if (hurt.length >= 2) {
      cd = 1 / tapsPerSecond;
      return [{ kind: 'chain', heroes: hurt }];
    }
    const low = lowest(s);
    if (low === null || lifeFrac(s.heroes[low]!) > 0.75) return [];
    // Keep a little mana in reserve for Wards.
    if (s.mana < s.loadout.wardCost + s.loadout.mendCost && lifeFrac(s.heroes[low]!) > 0.35) return [];
    cd = 1 / tapsPerSecond;
    return [{ kind: 'mend', hero: low }];
  };
}

function lowest(s: FightState): number | null {
  const alive = aliveHeroes(s);
  if (alive.length === 0) return null;
  return alive.reduce((a, b) => (lifeFrac(s.heroes[b]!) < lifeFrac(s.heroes[a]!) ? b : a));
}

/**
 * How a good player answers boss mechanics. Returns the move, [] to deliberately hold still
 * (Siphon), or undefined when no mechanic needs attention.
 */
function mechanicMove(s: FightState): Action[] | undefined {
  if (s.siphonT > 0) return [];
  const plagued = aliveHeroes(s).find((i) => s.heroes[i]!.plagueT > 0);
  if (plagued !== undefined) return [{ kind: 'mend', hero: plagued }];
  for (const e of s.enemies) {
    const w = e.windup;
    if (!e.alive || !w || !isMech(w.attack) || w.attack.mech !== 'judgement') continue;
    const low = w.targets.find((i) => s.heroes[i]?.alive && lifeFrac(s.heroes[i]!) < T.judgementLine + 0.03);
    if (low !== undefined) return [{ kind: 'mend', hero: low }];
  }
  const frozen = aliveHeroes(s).filter((i) => s.heroes[i]!.frostT > 0);
  if (frozen.length >= 2) return [{ kind: 'chain', heroes: frozen }];
  if (frozen.length === 1) return [{ kind: 'mend', hero: frozen[0]! }];
  return undefined;
}
