import { describe, expect, it } from 'vitest';
import { skilledBot } from '../src/sim/bots.ts';
import { damageHero, healHero } from '../src/sim/combat.ts';
import { createFight, step } from '../src/sim/fight.ts';
import { checkpointOf, floorEnemies } from '../src/sim/floors.ts';
import { hashFight } from '../src/sim/hash.ts';
import { buildLoadout } from '../src/sim/loadout.ts';
import { BEAT_PERIOD } from '../src/sim/spells.ts';
import type { FightState } from '../src/sim/state.ts';
import { freshProgress } from './helpers.ts';

function fight(over = {}, floor = 1): FightState {
  const s = createFight(buildLoadout(freshProgress(over)), floor, 7);
  while (s.phase !== 'fight') step(s);
  return s;
}

describe('fight', () => {
  it('is deterministic for a seed and inputs', () => {
    const run = () => {
      const s = createFight(buildLoadout(freshProgress()), 1, 42);
      const bot = skilledBot();
      for (let i = 0; i < 60 * 120; i++) step(s, bot(s));
      return hashFight(s);
    };
    expect(run()).toBe(run());
  });

  it('floors are deterministic and introduce enemies in order', () => {
    expect(floorEnemies(1, 1)).toEqual(['rat']);
    expect(floorEnemies(3, 1)).toContain('skeleton');
    expect(floorEnemies(10, 1)).toEqual(['bone_knight']);
    expect(floorEnemies(17, 5)).toEqual(floorEnemies(17, 5));
  });

  it('wipes send the party back to the checkpoint', () => {
    expect(checkpointOf(1)).toBe(1);
    expect(checkpointOf(5)).toBe(1);
    expect(checkpointOf(6)).toBe(6);
    expect(checkpointOf(14)).toBe(11);
  });
});

describe('spells', () => {
  it('Mend heals a share of max life and costs mana', () => {
    const s = fight();
    const h = s.heroes[1]!;
    h.hp = 10;
    const mana = s.mana;
    step(s, [{ kind: 'mend', hero: 1 }]);
    expect(h.hp).toBeGreaterThan(10 + h.stats.maxHp * 0.2);
    expect(s.mana).toBeLessThan(mana);
  });

  it('a Ward just before a telegraphed hit is a Perfect and blocks it', () => {
    const s = fight();
    step(s, [{ kind: 'hold', hero: 2 }]);
    const hp = s.heroes[2]!.hp;
    const hit = damageHero(s, 2, 9999, { enemy: 0, big: true, dodgeable: false });
    expect(hit).toBe(false);
    expect(s.heroes[2]!.hp).toBe(hp);
    expect(s.stats.perfects).toBe(1);
    expect(s.events.some((e) => e.type === 'perfect')).toBe(true);
  });

  it('a late Ward is not a Perfect but still absorbs', () => {
    const s = fight();
    step(s, [{ kind: 'hold', hero: 0 }]);
    for (let i = 0; i < 60; i++) step(s);
    const h = s.heroes[0]!;
    const shield = h.shield;
    const hp = h.hp;
    damageHero(s, 0, 10, { enemy: 0, big: true, dodgeable: false });
    expect(s.stats.perfects).toBe(0);
    expect(h.shield).toBeLessThan(shield);
    expect(h.hp).toBe(hp);
  });

  it('a hit that would have killed without your heal is a Save', () => {
    const s = fight();
    const h = s.heroes[2]!;
    h.hp = 5;
    healHero(s, 2, 20, 'player', 'mend');
    damageHero(s, 2, h.hp - 1, { enemy: 0, big: false, dodgeable: false });
    expect(h.alive).toBe(true);
    expect(s.stats.saves).toBe(1);
  });

  it('tapping a downed hero revives them', () => {
    const s = fight();
    damageHero(s, 2, 9999, { enemy: 0, big: false, dodgeable: false });
    expect(s.heroes[2]!.alive).toBe(false);
    step(s, [{ kind: 'mend', hero: 2 }]);
    expect(s.heroes[2]!.alive).toBe(true);
  });

  it('Chain Mend heals every target', () => {
    const s = fight();
    s.heroes.forEach((h) => (h.hp = 1));
    step(s, [{ kind: 'chain', heroes: [0, 1, 2] }]);
    expect(s.heroes[0]!.hp).toBeGreaterThan(1);
    expect(s.heroes[2]!.hp).toBeGreaterThan(1);
    expect(s.heroes[3]!.hp).toBeLessThanOrEqual(1);
  });

  it('Sanctuary needs full Resonance', () => {
    const s = fight();
    step(s, [{ kind: 'sanctuary' }]);
    expect(s.sanctuaryT).toBe(0);
    s.resonance = 100;
    step(s, [{ kind: 'sanctuary' }]);
    expect(s.sanctuaryT).toBeGreaterThan(0);
    expect(s.resonance).toBe(0);
  });

  it('Chronomancer Rewind restores recent life', () => {
    const s = fight({ order: 'chrono' });
    for (let i = 0; i < 40; i++) step(s);
    const h = s.heroes[0]!;
    const full = h.hp;
    damageHero(s, 0, full * 0.6, { enemy: 0, big: true, dodgeable: false });
    step(s, [{ kind: 'hold', hero: 0 }]);
    expect(h.hp).toBeGreaterThan(full * 0.95);
    expect(s.stats.perfects).toBe(1);
  });

  it('Bard Mends on the beat heal more', () => {
    const a = fight({ order: 'bard' });
    const b = fight({ order: 'bard' });
    for (const s of [a, b]) s.heroes[1]!.hp = 1;
    // Land a exactly on a beat and b half a beat off.
    a.t = BEAT_PERIOD * 20 - 1 / 60;
    b.t = BEAT_PERIOD * 20.5 - 1 / 60;
    step(a, [{ kind: 'mend', hero: 1 }]);
    step(b, [{ kind: 'mend', hero: 1 }]);
    expect(a.heroes[1]!.hp).toBeGreaterThan(b.heroes[1]!.hp);
  });

  it('Acolytes cast their Prayer', () => {
    const s = fight({ maxFloor: 10, acolytes: ['mend_lowest'] });
    s.heroes[1]!.hp = 5;
    let cast = false;
    for (let i = 0; i < 120 && !cast; i++) cast = step(s).some((e) => e.type === 'acolyteCast');
    expect(cast).toBe(true);
  });
});
