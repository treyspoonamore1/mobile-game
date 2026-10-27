import { floorGold } from './floors.ts';
import { chance } from './rng.ts';
import type { FightState, HeroState, SpellKind } from './state.ts';
import { T } from './tuning.ts';

export function aliveHeroes(s: FightState): number[] {
  const out: number[] = [];
  s.heroes.forEach((h, i) => h.alive && out.push(i));
  return out;
}

export function addResonance(s: FightState, amount: number): void {
  s.resonance = Math.min(T.resonanceMax, s.resonance + amount * s.loadout.resonanceMult);
}

export interface HitSource {
  enemy: number;
  /** A telegraphed (heavy or area) attack. */
  big: boolean;
  /** Can be dodged (basic attacks). */
  dodgeable: boolean;
  poison?: boolean;
}

/** Returns true if the hit connected (not dodged or perfectly warded). */
export function damageHero(s: FightState, i: number, raw: number, src: HitSource): boolean {
  const h = s.heroes[i]!;
  if (!h.alive || raw <= 0) return false;
  const dodge = h.stats.def.dodge ?? 0;
  if (src.dodgeable && dodge > 0 && chance(s.rng, dodge)) {
    s.events.push({ type: 'dodge', hero: i });
    return false;
  }
  let dmg = raw * h.stats.damageTaken;
  if (s.sanctuaryT > 0) dmg *= 1 - T.sanctuaryDr;
  if (s.anthemT > 0) dmg *= 0.8;

  // Perfect Ward: a player Ward placed just before a telegraphed hit blocks it entirely.
  if (src.big && h.shield > 0 && s.t - h.playerWardAt <= s.loadout.perfectWindow) {
    perfect(s, i, dmg, src.enemy);
    return false;
  }
  // A heavy blow that lands breaks the Perfect streak (the Chronomancer's Perfect comes after the hit).
  if (src.big && s.loadout.order !== 'chrono') s.perfectStreak = 0;

  const absorbed = Math.min(h.shield, dmg);
  h.shield -= absorbed;
  dmg -= absorbed;
  s.stats.absorbed += absorbed;
  if (absorbed > 0 && s.loadout.relics.has('thorn_amulet')) damageEnemy(s, src.enemy, absorbed * T.thornReflect, false, -1);

  const before = h.hp;
  if (src.big) {
    h.bigHitAt = s.t;
    h.bigHitDmg = dmg;
  }
  h.hitAt = s.t;
  s.events.push({ type: 'heroHit', hero: i, amount: dmg, absorbed, big: src.big, poison: src.poison, enemy: src.enemy });

  if (before - dmg <= 0) {
    if (s.loadout.relics.has('phoenix') && !s.phoenixUsed) {
      s.phoenixUsed = true;
      h.hp = h.stats.maxHp * 0.3;
      s.events.push({ type: 'revive', hero: i, by: 'phoenix' });
      return true;
    }
    downHero(s, i);
    return true;
  }
  h.hp = before - dmg;
  // A Save: this hit would have downed them without your recent Ward or heal.
  const withoutHelp = before - dmg - absorbed - (h.recentHealT > 0 ? h.recentHeal : 0);
  if (withoutHelp <= 0 && (absorbed > 0 || h.recentHealT > 0)) {
    s.stats.saves++;
    h.recentHeal = 0;
    h.recentHealT = 0;
    addResonance(s, T.resonanceSave);
    s.events.push({ type: 'save', hero: i });
    if (s.loadout.relics.has('tithe_ring')) {
      // Worth one basic enemy of this floor (not the boss), so Acolyte-driven Saves can't flood the economy.
      const g = Math.max(1, Math.round(floorGold(s.floor) * s.loadout.goldMult * T.titheKills));
      s.stats.gold += g;
      s.events.push({ type: 'gold', amount: g });
    }
  }
  return true;
}

function perfect(s: FightState, i: number, blocked: number, enemy: number): void {
  const h = s.heroes[i]!;
  s.stats.perfects++;
  s.perfectStreak++;
  h.hitAt = s.t;
  s.mana = Math.min(s.loadout.manaMax, s.mana + s.loadout.wardCost);
  addResonance(s, T.resonancePerfect);
  s.events.push({ type: 'perfect', hero: i, streak: s.perfectStreak, blocked });
  if (s.loadout.relics.has('thorn_amulet')) damageEnemy(s, enemy, blocked * T.thornReflect, false, -1);
  if (s.loadout.relics.has('bell_of_dawn')) {
    for (const j of aliveHeroes(s)) healHero(s, j, s.heroes[j]!.stats.maxHp * 0.15, 'player', 'mend');
  }
  // Riposte: the attacker reels.
  const attacker = s.enemies[enemy];
  if (s.loadout.riposte > 0 && attacker?.alive) {
    attacker.stunT = Math.max(attacker.stunT, s.loadout.riposte);
    attacker.windup = null;
    s.events.push({ type: 'stun', enemy, secs: s.loadout.riposte });
  }
  // Bastion: the Perfect spreads a Ward over the whole party.
  if (s.loadout.bastion > 0) {
    for (const j of aliveHeroes(s)) {
      if (j !== i) shieldHero(s, j, s.heroes[j]!.stats.maxHp * s.loadout.bastion, 'acolyte');
    }
  }
}

export function downHero(s: FightState, i: number): void {
  const h = s.heroes[i]!;
  h.hp = 0;
  h.alive = false;
  h.shield = 0;
  h.poisonT = 0;
  h.recentHealT = 0;
  h.bloomT = 0;
  s.downsThisFloor++;
  s.events.push({ type: 'heroDown', hero: i });
}

export function healHero(
  s: FightState, i: number, amount: number, by: 'player' | 'acolyte', kind: SpellKind, beat?: boolean,
): void {
  const h = s.heroes[i]!;
  if (!h.alive) return;
  const eff = amount * s.loadout.healMult;
  const actual = Math.min(h.stats.maxHp - h.hp, eff);
  const over = eff - actual;
  h.hp += actual;
  h.healAt = s.t;
  h.recentHeal += actual;
  h.recentHealT = T.saveWindow;
  s.stats.healed += actual;
  s.stats.overheal += over;
  s.events.push({ type: 'heal', hero: i, amount: actual, over, by, kind, beat });
  if (over > 0 && s.loadout.overhealShield > 0) {
    const cap = h.stats.maxHp * s.loadout.wardPct;
    h.shield = Math.min(Math.max(h.shield, cap), h.shield + over * s.loadout.overhealShield);
    h.shieldT = Math.max(h.shieldT, s.loadout.wardDur);
  }
  // Overflow: part of your overhealing splashes onto the most hurt other hero.
  if (over > 0 && by === 'player' && kind !== 'splash' && s.loadout.overflow > 0) {
    let target = -1;
    for (const j of aliveHeroes(s)) {
      if (j !== i && (target < 0 || lifeFrac(s.heroes[j]!) < lifeFrac(s.heroes[target]!))) target = j;
    }
    if (target >= 0 && lifeFrac(s.heroes[target]!) < 1) {
      healHero(s, target, (over * s.loadout.overflow) / s.loadout.healMult, 'player', 'splash');
    }
  }
}

export function shieldHero(s: FightState, i: number, amount: number, by: 'player' | 'acolyte'): void {
  const h = s.heroes[i]!;
  if (!h.alive) return;
  h.shield = Math.max(h.shield, amount * s.loadout.healMult);
  h.shieldT = s.loadout.wardDur;
  if (by === 'player') h.playerWardAt = s.t;
  s.events.push({ type: 'shield', hero: i, amount, by });
}

export function cleanseHero(s: FightState, i: number): boolean {
  const h = s.heroes[i]!;
  if (!h.alive || h.poisonT <= 0) return false;
  h.poisonT = 0;
  h.poisonDps = 0;
  s.events.push({ type: 'cleanse', hero: i });
  return true;
}

export function reviveHero(s: FightState, i: number, pct: number, by: 'player' | 'acolyte'): void {
  const h = s.heroes[i]!;
  if (h.alive) return;
  h.alive = true;
  h.hp = h.stats.maxHp * pct;
  h.atkCd = h.stats.interval;
  h.hist.fill(h.hp);
  s.events.push({ type: 'revive', hero: i, by });
}

export function damageEnemy(s: FightState, ei: number, amount: number, crit: boolean, hero: number): void {
  const e = s.enemies[ei];
  if (!e || !e.alive) return;
  const dmg = Math.min(e.hp, amount);
  e.hp -= dmg;
  e.hitAt = s.t;
  s.stats.damage += dmg;
  s.events.push({ type: 'enemyHit', enemy: ei, amount, crit, hero });
  if (e.hp <= 0) {
    e.alive = false;
    e.diedAt = s.t;
    e.windup = null;
    s.stats.kills++;
    s.stats.gold += e.gold;
    s.events.push({ type: 'enemyDie', enemy: ei, gold: e.gold });
    s.events.push({ type: 'gold', amount: e.gold });
  }
}

export function lifeFrac(h: HeroState): number {
  return h.hp / h.stats.maxHp;
}
