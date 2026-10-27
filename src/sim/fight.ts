import { enemyDef, type Targeting } from './data/enemies.ts';
import { isBossFloor } from './data/regions.ts';
import { aliveHeroes, damageEnemy, damageHero, healHero, lifeFrac } from './combat.ts';
import { floorAtk, floorGold, floorHp, floorPack, wipeCheckpoint } from './floors.ts';
import type { Loadout } from './loadout.ts';
import { chance, makeRng, next, pick } from './rng.ts';
import { applyAction, stepAcolytes } from './spells.ts';
import type { Action, EnemyState, FightState, HeroState, SimEvent } from './state.ts';
import { T } from './tuning.ts';

export const DT = 1 / T.tickRate;
const HIST_LEN = 30;
const POISON_TICK = 0.5;
const BLOOM_TICK = 0.5;

export function createFight(loadout: Loadout, floor: number, seed: number, autoAdvance = true): FightState {
  const s: FightState = {
    t: 0, tick: 0, rng: makeRng(seed), seed, loadout, floor, autoAdvance,
    phase: 'walk', phaseT: T.floorStartDelay,
    heroes: loadout.heroes.map((stats): HeroState => ({
      id: stats.def.id, stats, hp: stats.maxHp, alive: true, atkCd: stats.interval * 0.5,
      shield: 0, shieldT: 0, playerWardAt: -99, poisonDps: 0, poisonT: 0, poisonTick: 0,
      recentHeal: 0, recentHealT: 0, hist: new Array<number>(HIST_LEN).fill(stats.maxHp),
      bigHitAt: -99, bigHitDmg: 0, bloomRate: 0, bloomT: 0, hitAt: -99, healAt: -99, attackAt: -99,
    })),
    enemies: [], nextUid: 1,
    mana: loadout.manaMax, resonance: 0, sanctuaryT: 0, anthemT: 0,
    perfectStreak: 0, beatStreak: 0, phoenixUsed: false,
    acolytes: loadout.acolytes.map((a, i) => ({ prayer: a.prayer, cd: 0.5 + i * 0.4, castAt: -99 })),
    stats: {
      healed: 0, overheal: 0, absorbed: 0, perfects: 0, saves: 0, kills: 0, damage: 0, gold: 0,
      floorsCleared: 0, wipes: 0,
    },
    events: [], histTimer: 0, downsThisFloor: 0,
  };
  return s;
}

/** Swap in a new loadout (after a purchase) keeping each hero's life fraction. */
export function applyLoadout(s: FightState, loadout: Loadout): void {
  s.loadout = loadout;
  s.heroes.forEach((h, i) => {
    const stats = loadout.heroes[i]!;
    const frac = h.stats.maxHp > 0 ? h.hp / h.stats.maxHp : 1;
    const scale = stats.maxHp / h.stats.maxHp;
    h.stats = stats;
    if (h.alive) h.hp = frac * stats.maxHp;
    h.hist = h.hist.map((v) => v * scale);
  });
  s.mana = Math.min(s.mana, loadout.manaMax);
  s.acolytes = loadout.acolytes.map((a, i) => {
    const old = s.acolytes[i];
    return { prayer: a.prayer, cd: old?.cd ?? 0.5, castAt: old?.castAt ?? -99 };
  });
}

function spawnFloor(s: FightState): void {
  const H = floorHp(s.floor);
  const A = floorAtk(s.floor);
  const G = floorGold(s.floor) * s.loadout.goldMult;
  s.enemies = floorPack(s.floor, s.seed).map((m): EnemyState => {
    const def = enemyDef(m.id);
    return {
      uid: s.nextUid++, def, maxHp: H * m.hp, hp: H * m.hp, atk: A * m.atk,
      gold: Math.max(1, Math.round(G * m.gold)), cds: def.attacks.map((a) => a.interval * (0.35 + 0.65 * next(s.rng))),
      windup: null, alive: true, diedAt: -99, stunT: 0, hitAt: -99, attackAt: -99,
    };
  });
  s.phase = 'fight';
  s.phaseT = 0;
  s.phoenixUsed = false;
  s.downsThisFloor = 0;
  s.events.push({ type: 'floorStart', floor: s.floor, boss: isBossFloor(s.floor) });
}

/** Advance the fight one tick. `dt` is normally DT; offline progress uses bigger steps. */
export function step(s: FightState, actions: readonly Action[] = [], dt = DT): SimEvent[] {
  s.events = [];
  s.tick++;
  s.t += dt;
  for (const a of actions) applyAction(s, a);

  s.mana = Math.min(s.loadout.manaMax, s.mana + s.loadout.manaRegen * dt);
  s.sanctuaryT = Math.max(0, s.sanctuaryT - dt);
  s.anthemT = Math.max(0, s.anthemT - dt);
  stepHeroTimers(s, dt);

  if (s.phase === 'walk') {
    s.phaseT -= dt;
    if (s.phaseT <= 0) spawnFloor(s);
  } else if (s.phase === 'wipe') {
    s.phaseT -= dt;
    if (s.phaseT <= 0) restartAfterWipe(s);
  } else {
    s.phaseT += dt;
    stepHeroAttacks(s, dt);
    stepEnemies(s, dt);
    stepAcolytes(s, dt);
    checkFloorEnd(s);
  }
  return s.events;
}

function stepHeroTimers(s: FightState, dt: number): void {
  s.histTimer += dt;
  const sample = s.histTimer >= 0.1;
  if (sample) s.histTimer = 0;
  s.heroes.forEach((h, i) => {
    if (h.shieldT > 0) {
      h.shieldT -= dt;
      if (h.shieldT <= 0) h.shield = 0;
    }
    if (h.recentHealT > 0) {
      h.recentHealT -= dt;
      if (h.recentHealT <= 0) h.recentHeal = 0;
    }
    if (sample) {
      h.hist.shift();
      h.hist.push(h.hp);
    }
    // Chronomancer: a heavy blow left un-Rewound breaks the Perfect streak.
    if (h.bigHitDmg > 0 && s.t - h.bigHitAt > s.loadout.perfectWindow + 0.15) {
      h.bigHitDmg = 0;
      if (s.loadout.order === 'chrono') s.perfectStreak = 0;
    }
    if (h.alive && h.bloomT > 0) {
      // Lifebloom heals in half-second pulses.
      const before = h.bloomT;
      h.bloomT = Math.max(0, h.bloomT - dt);
      if (Math.ceil(before / BLOOM_TICK) !== Math.ceil(h.bloomT / BLOOM_TICK)) {
        healHero(s, i, h.bloomRate * BLOOM_TICK, 'player', 'bloom');
      }
    }
    if (h.alive && h.poisonT > 0 && s.phase === 'fight') {
      h.poisonT -= dt;
      h.poisonTick += dt;
      if (h.poisonTick >= POISON_TICK) {
        h.poisonTick -= POISON_TICK;
        damageHero(s, i, h.poisonDps * POISON_TICK, { enemy: -1, big: false, dodgeable: false, poison: true });
      }
    }
  });
}

function stepHeroAttacks(s: FightState, dt: number): void {
  const L = s.loadout;
  s.heroes.forEach((h, i) => {
    if (!h.alive) return;
    h.atkCd -= dt;
    if (h.atkCd > 0) return;
    h.atkCd += h.stats.interval;
    const front = s.enemies.findIndex((e) => e.alive);
    if (front < 0) return;
    const def = h.stats.def;
    let dmg = h.stats.atk * (1 + h.stats.rage * (1 - lifeFrac(h)));
    if (h.shield > 0 && L.relics.has('war_banner')) dmg *= 1.4;
    if (s.anthemT > 0) dmg *= 1.3;
    const crit = chance(s.rng, def.crit ?? 0);
    if (crit) dmg *= 2;
    const targets = def.aoe
      ? s.enemies.map((e, j) => (e.alive ? j : -1)).filter((j) => j >= 0)
      : [front];
    h.attackAt = s.t;
    s.events.push({ type: 'heroAttack', hero: i, targets });
    for (const j of targets) damageEnemy(s, j, dmg, crit, i);
  });
}

function chooseTargets(s: FightState, t: Targeting): number[] {
  const alive = aliveHeroes(s);
  if (alive.length === 0) return [];
  switch (t) {
    case 'all':
      return alive;
    case 'taunt': {
      const tank = alive.find((i) => s.heroes[i]!.stats.def.taunt);
      return [tank ?? pick(s.rng, alive)];
    }
    case 'random':
      return [pick(s.rng, alive)];
    case 'lowest':
      return [alive.reduce((a, b) => (lifeFrac(s.heroes[b]!) < lifeFrac(s.heroes[a]!) ? b : a))];
    case 'backline': {
      const back = alive.filter((i) => s.heroes[i]!.id === 'ilse' || s.heroes[i]!.id === 'wren');
      return [pick(s.rng, back.length > 0 ? back : alive)];
    }
  }
}

function stepEnemies(s: FightState, dt: number): void {
  s.enemies.forEach((e, ei) => {
    if (!e.alive) return;
    if (e.stunT > 0) {
      e.stunT -= dt;
      return;
    }
    if (e.windup) {
      e.windup.t += dt;
      if (e.windup.t >= e.windup.total) {
        const w = e.windup;
        e.windup = null;
        e.attackAt = s.t;
        s.events.push({ type: 'enemyAttack', enemy: ei, targets: w.targets, big: true });
        for (const i of w.targets) hit(s, ei, i, w.attack.mult, true, w.attack.poison);
      }
      return;
    }
    e.def.attacks.forEach((a, ai) => {
      e.cds[ai]! -= dt;
      if (e.cds[ai]! > 0 || e.windup) return;
      if (a.windup > 0) {
        const targets = chooseTargets(s, a.target);
        if (targets.length === 0) return;
        e.cds[ai] = a.interval;
        e.windup = { attack: a, targets, t: 0, total: a.windup };
        s.events.push({ type: 'telegraph', enemy: ei, targets, total: a.windup, name: a.name });
      } else {
        const targets = chooseTargets(s, a.target);
        e.cds[ai] = a.interval;
        if (targets.length === 0) return;
        e.attackAt = s.t;
        s.events.push({ type: 'enemyAttack', enemy: ei, targets, big: false });
        for (const i of targets) hit(s, ei, i, a.mult, false, a.poison);
      }
    });
  });
}

function hit(
  s: FightState, ei: number, i: number, mult: number, big: boolean, poison?: { dps: number; dur: number },
): void {
  const e = s.enemies[ei]!;
  const h = s.heroes[i]!;
  const atk = e.atk * enrageMult(s);
  const connected = damageHero(s, i, atk * mult, { enemy: ei, big, dodgeable: !big });
  if (poison && connected && h.alive) {
    h.poisonDps = Math.max(h.poisonT > 0 ? h.poisonDps : 0, atk * poison.dps);
    h.poisonT = Math.max(h.poisonT, poison.dur);
  }
}

/**
 * Enemies grow stronger the longer a floor lasts, so a fight always ends: a party that can't kill fast enough
 * (say, a lone tank kept alive by Acolytes) eventually wipes and restarts whole from a checkpoint.
 */
export function enrageMult(s: FightState): number {
  if (s.phase !== 'fight') return 1;
  const after = isBossFloor(s.floor) ? T.enrageAfterBoss : T.enrageAfter;
  return 1 + T.enrageRamp * Math.max(0, s.phaseT - after);
}

function checkFloorEnd(s: FightState): void {
  if (aliveHeroes(s).length === 0) {
    const cp = wipeCheckpoint(s.floor);
    s.stats.wipes++;
    s.events.push({ type: 'wipe', floor: s.floor, checkpoint: cp });
    s.phase = 'wipe';
    s.phaseT = T.wipeTime;
    s.enemies.forEach((e) => (e.windup = null));
    return;
  }
  if (s.enemies.some((e) => e.alive)) return;
  const boss = isBossFloor(s.floor);
  s.stats.floorsCleared++;
  s.events.push({ type: 'floorClear', floor: s.floor, boss, flawless: s.downsThisFloor === 0 });
  if (s.autoAdvance) s.floor++;
  s.phase = 'walk';
  s.phaseT = T.walkTime;
  for (const h of s.heroes) {
    h.poisonT = 0;
    if (!h.alive) {
      h.alive = true;
      h.hp = h.stats.maxHp * T.reviveOnFloorPct;
      h.hist.fill(h.hp);
    }
  }
}

function restartAfterWipe(s: FightState): void {
  s.floor = wipeCheckpoint(s.floor);
  s.mana = s.loadout.manaMax;
  s.resonance = 0;
  for (const h of s.heroes) {
    h.alive = true;
    h.hp = h.stats.maxHp;
    h.shield = 0;
    h.poisonT = 0;
    h.hist.fill(h.hp);
  }
  spawnFloor(s);
}

