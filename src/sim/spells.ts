import { prayerDef } from './data/prayers.ts';
import {
  addResonance, aliveHeroes, cleanseHero, healHero, lifeFrac, reviveHero, shieldHero,
} from './combat.ts';
import { siphonCast } from './mechanics.ts';
import { chance } from './rng.ts';
import { incomingOn, type Action, type FightState } from './state.ts';
import { T } from './tuning.ts';

export const BEAT_PERIOD = 0.6;
export const BEAT_TOLERANCE = 0.11;

/** Seconds from the nearest beat (Bard). */
export function beatOffset(t: number): number {
  const p = t % BEAT_PERIOD;
  return Math.min(p, BEAT_PERIOD - p);
}

function spend(s: FightState, cost: number): boolean {
  if (s.mana < cost) {
    s.events.push({ type: 'oom' });
    return false;
  }
  s.mana -= cost;
  siphonCast(s);
  return true;
}

export function applyAction(s: FightState, a: Action): void {
  if (s.phase === 'wipe') return;
  const L = s.loadout;
  switch (a.kind) {
    case 'mend': {
      const h = s.heroes[a.hero];
      if (!h) return;
      if (!h.alive) {
        if (spend(s, T.reviveCost)) reviveHero(s, a.hero, T.revivePct, 'player');
        return;
      }
      let pct = L.mendPct;
      let cost = L.mendCost;
      let beat = false;
      if (L.order === 'bard') {
        beat = beatOffset(s.t) <= BEAT_TOLERANCE;
        if (beat) {
          pct *= 1.5;
          cost *= 0.5;
        }
      }
      if (!spend(s, cost)) return;
      if (lifeFrac(h) < 0.3) {
        addResonance(s, T.resonanceLowMend);
        pct *= 1 + L.triage;
      }
      healHero(s, a.hero, h.stats.maxHp * pct, 'player', 'mend', beat);
      if (L.secondTouch > 0 && chance(s.rng, L.secondTouch)) {
        const next = mostHurt(s, a.hero);
        if (next !== null) healHero(s, next, s.heroes[next]!.stats.maxHp * pct * 0.5, 'player', 'mend', beat);
      }
      if (L.relics.has('tome_of_echoes') && chance(s.rng, 0.25)) {
        healHero(s, a.hero, h.stats.maxHp * pct, 'player', 'mend', beat);
      }
      if (L.order === 'bard') bardBeat(s, beat);
      return;
    }
    case 'hold': {
      const h = s.heroes[a.hero];
      if (!h || !h.alive) return;
      if (L.order === 'cleric') {
        if (spend(s, L.wardCost)) shieldHero(s, a.hero, h.stats.maxHp * L.wardPct, 'player');
      } else if (L.order === 'chrono') {
        rewind(s, a.hero);
      } else if (spend(s, 25)) {
        s.anthemT = 5;
        s.events.push({ type: 'anthem' });
      }
      return;
    }
    case 'chain': {
      const targets = a.heroes.filter((i) => s.heroes[i]?.alive);
      if (targets.length === 0) return;
      if (!spend(s, L.mendCost * T.chainCostMult)) return;
      for (const i of targets) {
        const amount = s.heroes[i]!.stats.maxHp * L.mendPct * L.chainEff;
        healHero(s, i, amount, 'player', 'chain');
        if (L.lifebloom) {
          s.heroes[i]!.bloomRate = (amount * 0.3) / 3;
          s.heroes[i]!.bloomT = 3;
        }
      }
      return;
    }
    case 'sanctuary': {
      if (s.resonance < T.resonanceMax) return;
      s.resonance = 0;
      s.sanctuaryT = T.sanctuaryDur;
      s.events.push({ type: 'sanctuary' });
      if (L.miracle > 0) {
        s.heroes.forEach((h, i) => !h.alive && reviveHero(s, i, L.miracle, 'player'));
      }
      for (const i of aliveHeroes(s)) healHero(s, i, s.heroes[i]!.stats.maxHp * T.sanctuaryHeal, 'player', 'mend');
      return;
    }
  }
}

/** The most hurt living hero other than `except`, if any is hurt. */
function mostHurt(s: FightState, except: number): number | null {
  let best: number | null = null;
  for (const i of aliveHeroes(s)) {
    if (i === except || lifeFrac(s.heroes[i]!) >= 1) continue;
    if (best === null || lifeFrac(s.heroes[i]!) < lifeFrac(s.heroes[best]!)) best = i;
  }
  return best;
}

function bardBeat(s: FightState, beat: boolean): void {
  if (!beat) {
    s.beatStreak = 0;
    return;
  }
  s.beatStreak++;
  if (s.beatStreak >= 4) {
    s.beatStreak = 0;
    s.events.push({ type: 'encore' });
    addResonance(s, 15);
    for (const i of aliveHeroes(s)) healHero(s, i, s.heroes[i]!.stats.maxHp * 0.12, 'player', 'mend', true);
  }
}

/** Chronomancer: restore the best life of the last 3 s and wash off poison. */
function rewind(s: FightState, i: number): void {
  const h = s.heroes[i]!;
  if (!spend(s, s.loadout.wardCost)) return;
  const best = Math.max(h.hp, ...h.hist);
  const isPerfect = s.t - h.bigHitAt <= s.loadout.perfectWindow + 0.15 && h.bigHitDmg > 0;
  cleanseHero(s, i);
  if (isPerfect) {
    s.stats.perfects++;
    s.perfectStreak++;
    s.mana = Math.min(s.loadout.manaMax, s.mana + s.loadout.wardCost);
    addResonance(s, T.resonancePerfect);
    s.events.push({ type: 'perfect', hero: i, streak: s.perfectStreak, blocked: h.bigHitDmg });
    h.bigHitDmg = 0;
  }
  healHero(s, i, Math.max(0, best - h.hp) / s.loadout.healMult, 'player', 'rewind');
}

// ---------------------------------------------------------------------------
// Acolytes

export function stepAcolytes(s: FightState, dt: number): void {
  if (s.phase !== 'fight') return;
  s.acolytes.forEach((a, idx) => {
    a.cd -= dt;
    if (a.cd > 0) return;
    const target = pray(s, idx);
    a.cd = target ? s.loadout.acolyteInterval * prayerDef(a.prayer).intervalMult : 0.25;
  });
}

function lowestUnder(s: FightState, frac: number): number | null {
  let best: number | null = null;
  for (const i of aliveHeroes(s)) {
    const f = lifeFrac(s.heroes[i]!);
    if (f < frac && (best === null || f < lifeFrac(s.heroes[best]!))) best = i;
  }
  return best;
}

function tankIndex(s: FightState): number | null {
  const i = s.heroes.findIndex((h) => h.alive && h.stats.def.taunt);
  return i >= 0 ? i : null;
}

/** Runs an Acolyte's Prayer. Returns true if it cast. */
function pray(s: FightState, idx: number): boolean {
  const a = s.acolytes[idx]!;
  const L = s.loadout;
  const mend = (i: number, mult = 1) => {
    healHero(s, i, s.heroes[i]!.stats.maxHp * L.mendPct * L.acolytePotency * mult, 'acolyte', 'mend');
    cast(i, 'mend');
  };
  const cast = (hero: number, kind: 'mend' | 'ward' | 'cleanse' | 'revive') => {
    a.castAt = s.t;
    s.events.push({ type: 'acolyteCast', acolyte: idx, hero, kind });
  };
  switch (a.prayer) {
    case 'mend_lowest': {
      const i = lowestUnder(s, 0.5);
      if (i === null) return false;
      mend(i);
      return true;
    }
    case 'top_up': {
      const i = lowestUnder(s, 0.85);
      if (i === null) return false;
      mend(i);
      return true;
    }
    case 'mend_tank': {
      const i = tankIndex(s);
      if (i === null || lifeFrac(s.heroes[i]!) >= 0.7) return false;
      mend(i);
      return true;
    }
    case 'ward_tank': {
      const i = tankIndex(s);
      if (i === null || s.heroes[i]!.shield > 0) return false;
      shieldHero(s, i, s.heroes[i]!.stats.maxHp * L.wardPct * L.acolytePotency, 'acolyte');
      cast(i, 'ward');
      return true;
    }
    case 'ward_telegraphed': {
      for (const i of aliveHeroes(s)) {
        const inc = incomingOn(s, i);
        if (inc && inc.left < 1.2 && s.heroes[i]!.shield <= 0) {
          shieldHero(s, i, s.heroes[i]!.stats.maxHp * L.wardPct * L.acolytePotency, 'acolyte');
          cast(i, 'ward');
          return true;
        }
      }
      return false;
    }
    case 'cleanse': {
      for (const i of aliveHeroes(s)) {
        if (cleanseHero(s, i)) {
          healHero(s, i, s.heroes[i]!.stats.maxHp * T.cleanseHealPct, 'acolyte', 'cleanse');
          cast(i, 'cleanse');
          return true;
        }
      }
      return false;
    }
    case 'revive': {
      const i = s.heroes.findIndex((h) => !h.alive);
      if (i < 0 || aliveHeroes(s).length === 0) return false;
      reviveHero(s, i, T.revivePct * L.acolytePotency, 'acolyte');
      cast(i, 'revive');
      return true;
    }
    case 'mend_all': {
      const targets = aliveHeroes(s).filter((i) => lifeFrac(s.heroes[i]!) < 0.7);
      if (targets.length === 0) return false;
      for (const i of targets) mend(i, 0.5);
      return true;
    }
  }
}
