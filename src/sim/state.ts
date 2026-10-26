import type { AttackDef, EnemyDef } from './data/enemies.ts';
import type { HeroId } from './data/heroes.ts';
import type { PrayerId } from './data/prayers.ts';
import type { HeroStats, Loadout } from './loadout.ts';
import type { Rng } from './rng.ts';

export interface HeroState {
  id: HeroId;
  stats: HeroStats;
  hp: number;
  alive: boolean;
  atkCd: number;
  shield: number;
  shieldT: number;
  /** Sim time of the player's last Ward on this hero, for Perfects. */
  playerWardAt: number;
  poisonDps: number;
  poisonT: number;
  poisonTick: number;
  /** Healing received recently, for Saves. */
  recentHeal: number;
  recentHealT: number;
  /** Life samples every 0.1 s over the last 3 s (Chronomancer). */
  hist: number[];
  /** Sim time of the last telegraphed hit taken, and its damage. */
  bigHitAt: number;
  bigHitDmg: number;
  /** Render cues: sim times of the last events. */
  hitAt: number;
  healAt: number;
  attackAt: number;
}

export interface Windup {
  attack: AttackDef;
  targets: number[];
  t: number;
  total: number;
}

export interface EnemyState {
  uid: number;
  def: EnemyDef;
  maxHp: number;
  hp: number;
  atk: number;
  gold: number;
  cds: number[];
  windup: Windup | null;
  alive: boolean;
  diedAt: number;
  hitAt: number;
  attackAt: number;
}

export type Phase = 'fight' | 'walk' | 'wipe';

export interface AcolyteState {
  prayer: PrayerId;
  cd: number;
  castAt: number;
}

export interface FightStats {
  healed: number;
  overheal: number;
  absorbed: number;
  perfects: number;
  saves: number;
  kills: number;
  damage: number;
  gold: number;
  floorsCleared: number;
  wipes: number;
}

export interface FightState {
  t: number;
  tick: number;
  rng: Rng;
  seed: number;
  loadout: Loadout;
  floor: number;
  autoAdvance: boolean;
  phase: Phase;
  phaseT: number;
  heroes: HeroState[];
  enemies: EnemyState[];
  nextUid: number;
  mana: number;
  resonance: number;
  sanctuaryT: number;
  anthemT: number;
  perfectStreak: number;
  beatStreak: number;
  phoenixUsed: boolean;
  acolytes: AcolyteState[];
  stats: FightStats;
  events: SimEvent[];
  histTimer: number;
}

export type SpellKind = 'mend' | 'ward' | 'chain' | 'revive' | 'rewind' | 'anthem' | 'cleanse';

export type SimEvent =
  | { type: 'heal'; hero: number; amount: number; over: number; by: 'player' | 'acolyte'; kind: SpellKind; beat?: boolean }
  | { type: 'shield'; hero: number; amount: number; by: 'player' | 'acolyte' }
  | { type: 'perfect'; hero: number; streak: number; blocked: number }
  | { type: 'save'; hero: number }
  | { type: 'heroHit'; hero: number; amount: number; absorbed: number; big: boolean; poison?: boolean; enemy: number }
  | { type: 'dodge'; hero: number }
  | { type: 'heroDown'; hero: number }
  | { type: 'revive'; hero: number; by: 'player' | 'acolyte' | 'phoenix' }
  | { type: 'heroAttack'; hero: number; targets: number[] }
  | { type: 'enemyHit'; enemy: number; amount: number; crit: boolean; hero: number }
  | { type: 'enemyDie'; enemy: number; gold: number }
  | { type: 'enemyAttack'; enemy: number; targets: number[]; big: boolean }
  | { type: 'telegraph'; enemy: number; targets: number[]; total: number; name: string }
  | { type: 'gold'; amount: number }
  | { type: 'oom' }
  | { type: 'sanctuary' }
  | { type: 'encore' }
  | { type: 'anthem' }
  | { type: 'cleanse'; hero: number }
  | { type: 'acolyteCast'; acolyte: number; hero: number; kind: SpellKind }
  | { type: 'floorStart'; floor: number; boss: boolean }
  | { type: 'floorClear'; floor: number; boss: boolean }
  | { type: 'wipe'; floor: number; checkpoint: number };

export type Action =
  | { kind: 'mend'; hero: number }
  | { kind: 'hold'; hero: number }
  | { kind: 'chain'; heroes: number[] }
  | { kind: 'sanctuary' };

/** Smallest time left on any telegraphed attack aimed at a hero, or null. */
export function incomingOn(s: FightState, hero: number): { left: number; total: number } | null {
  let best: { left: number; total: number } | null = null;
  for (const e of s.enemies) {
    const w = e.windup;
    if (!e.alive || !w || !w.targets.includes(hero)) continue;
    const left = w.total - w.t;
    if (!best || left < best.left) best = { left, total: w.total };
  }
  return best;
}
