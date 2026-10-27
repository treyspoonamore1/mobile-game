import { describe, expect, it } from 'vitest';
import { claimDeed, deedProgress, readyDeeds } from '../src/meta/deeds.ts';
import { gainXp, learnTalent, resetTalents, unspentPoints, xpToNext } from '../src/meta/healer.ts';
import { pilgrimage } from '../src/meta/pilgrimage.ts';
import { newSave } from '../src/meta/save.ts';
import { applyEvents, newFight } from '../src/meta/session.ts';
import { damageHero, healHero } from '../src/sim/combat.ts';
import { createFight, step } from '../src/sim/fight.ts';
import { buildLoadout } from '../src/sim/loadout.ts';
import type { FightState } from '../src/sim/state.ts';
import { freshProgress } from './helpers.ts';

function fight(talents = {}): FightState {
  const s = createFight(buildLoadout(freshProgress({ talents })), 1, 7);
  while (s.phase !== 'fight') step(s);
  return s;
}

describe('healer levels', () => {
  it('XP carries over levels and each level is a talent point', () => {
    const s = newSave(1);
    expect(gainXp(s, xpToNext(1) + xpToNext(2) + 1)).toBe(2);
    expect(s.healerLevel).toBe(3);
    expect(unspentPoints(s)).toBe(2);
  });

  it('healing earns XP through the session', () => {
    const s = newSave(1);
    const f = newFight(s);
    const max = f.heroes[0]!.stats.maxHp;
    applyEvents(s, f, [{ type: 'heal', hero: 0, amount: max, over: 0, by: 'player', kind: 'mend' }], 0);
    expect(s.healerXp).toBeGreaterThan(0);
  });

  it('talents need points and branch investment, respec is free, and they survive a Pilgrimage', () => {
    const s = newSave(1);
    expect(learnTalent(s, 'swift_hands')).toBe(false);
    s.healerLevel = 6;
    expect(learnTalent(s, 'second_touch')).toBe(false);
    for (let i = 0; i < 3; i++) expect(learnTalent(s, 'swift_hands')).toBe(true);
    expect(learnTalent(s, 'second_touch')).toBe(true);
    expect(unspentPoints(s)).toBe(1);
    s.progress.maxFloor = 40;
    pilgrimage(s, 'cleric');
    expect(s.progress.talents.swift_hands).toBe(3);
    resetTalents(s);
    expect(unspentPoints(s)).toBe(5);
  });
});

describe('talent effects', () => {
  it('Swift Hands makes Mend cheaper', () => {
    expect(buildLoadout(freshProgress({ talents: { swift_hands: 4 } })).mendCost).toBeLessThan(buildLoadout(freshProgress()).mendCost);
  });

  it('Riposte stuns the attacker on a Perfect; Bastion Wards the others', () => {
    const s = fight({ riposte: 1, bastion: 1 });
    step(s, [{ kind: 'hold', hero: 2 }]);
    damageHero(s, 2, 50, { enemy: 0, big: true, dodgeable: false });
    expect(s.enemies[0]!.stunT).toBeGreaterThan(0);
    expect(s.heroes[0]!.shield).toBeGreaterThan(0);
  });

  it('Overflow splashes overhealing onto the most hurt hero', () => {
    const s = fight({ overflow: 2 });
    s.heroes[3]!.hp = 1;
    healHero(s, 0, s.heroes[0]!.stats.maxHp, 'player', 'mend');
    expect(s.heroes[3]!.hp).toBeGreaterThan(1);
  });

  it('Lifebloom keeps healing after a Chain Mend', () => {
    const s = fight({ lifebloom: 1 });
    s.heroes.forEach((h) => (h.hp = 1));
    step(s, [{ kind: 'chain', heroes: [1, 2] }]);
    const after = s.heroes[2]!.hp;
    for (let i = 0; i < 60; i++) step(s);
    expect(s.heroes[2]!.hp).toBeGreaterThan(after);
  });

  it('Miracle: Sanctuary raises the fallen', () => {
    const s = fight({ miracle: 1 });
    damageHero(s, 1, 1e9, { enemy: 0, big: false, dodgeable: false });
    s.resonance = 100;
    step(s, [{ kind: 'sanctuary' }]);
    expect(s.heroes[1]!.alive).toBe(true);
  });

  it('a heavy blow that lands breaks the Perfect streak', () => {
    const s = fight();
    s.perfectStreak = 4;
    damageHero(s, 0, 1, { enemy: 0, big: true, dodgeable: false });
    expect(s.perfectStreak).toBe(0);
  });
});

describe('deeds', () => {
  it('a reached tier can be claimed once, paying gold and a permanent bonus', () => {
    const s = newSave(1);
    expect(readyDeeds(s)).toEqual([]);
    s.lifetime.kills = 150;
    expect(deedProgress(s, 'slayer').ready).toBe(true);
    const dmgBefore = buildLoadout(s.progress).heroes[0]!.atk;
    expect(claimDeed(s, 'slayer')).toBeGreaterThan(0);
    expect(claimDeed(s, 'slayer')).toBeNull();
    expect(buildLoadout(s.progress).heroes[0]!.atk).toBeGreaterThan(dmgBefore);
    expect(deedProgress(s, 'slayer').target).toBe(1000);
  });

  it('a flawless boss clear counts', () => {
    const s = newSave(1);
    const f = newFight(s);
    applyEvents(s, f, [{ type: 'floorClear', floor: 10, boss: true, flawless: true }], 0);
    expect(s.lifetime.flawlessBosses).toBe(1);
    expect(s.lifetime.bosses).toBe(1);
  });
});
