import { aliveHeroes, lifeFrac } from './combat.ts';
import { incomingOn, type Action, type FightState } from './state.ts';

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
