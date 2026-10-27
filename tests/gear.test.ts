import { describe, expect, it } from 'vitest';
import { autoEquip, equip, merge, mergeAll, rollDrop, salvageItem, unequip } from '../src/meta/gear.ts';
import { pilgrimage } from '../src/meta/pilgrimage.ts';
import { newSave } from '../src/meta/save.ts';
import { healHero } from '../src/sim/combat.ts';
import { itemName, type Item } from '../src/sim/data/gear.ts';
import { BOSS_MECHANICS } from '../src/sim/data/mechanics.ts';
import { createFight, step } from '../src/sim/fight.ts';
import { rollItem } from '../src/sim/gear.ts';
import { buildLoadout } from '../src/sim/loadout.ts';
import { resolveMech } from '../src/sim/mechanics.ts';
import { makeRng } from '../src/sim/rng.ts';
import type { FightState } from '../src/sim/state.ts';
import { T } from '../src/sim/tuning.ts';
import { freshProgress } from './helpers.ts';

const item = (uid: number, over: Partial<Item> = {}): Item => ({ uid, slot: 'weapon', rarity: 0, ilvl: 10, main: 0.1, affixes: [], ...over });

describe('gear', () => {
  it('rolls deterministic items that get stronger with depth and rarity', () => {
    const a = rollItem(makeRng(5), 1, 10, 2, 'weapon');
    expect(rollItem(makeRng(5), 1, 10, 2, 'weapon')).toEqual(a);
    expect(a.affixes.length).toBe(1);
    expect(rollItem(makeRng(5), 1, 60, 2, 'weapon').main).toBeGreaterThan(a.main);
    expect(rollItem(makeRng(5), 1, 10, 4, 'weapon').main).toBeGreaterThan(a.main);
    expect(itemName(a)).toMatch(/^Runed /);
  });

  it('bosses always drop an item of at least Runed rarity', () => {
    const s = newSave(3);
    const d = rollDrop(s, 10, true);
    expect(d.item).not.toBeNull();
    expect(d.item!.rarity).toBeGreaterThanOrEqual(T.gearBossMinRarity);
  });

  it('equipping changes hero stats, swaps the old item back, and unequip returns it', () => {
    const s = newSave(1);
    s.inventory = [item(1, { main: 0.5 }), item(2, { main: 0.2 })];
    const base = buildLoadout(s.progress).heroes[1]!.atk;
    expect(equip(s, 'brann', 1)).toBe(true);
    expect(buildLoadout(s.progress).heroes[1]!.atk).toBeCloseTo(base * 1.5);
    equip(s, 'brann', 2);
    expect(s.inventory.map((i) => i.uid)).toEqual([1]);
    unequip(s, 'brann', 'weapon');
    expect(s.inventory.length).toBe(2);
  });

  it('three of a kind merge into the next rarity; salvage pays gold', () => {
    const s = newSave(1);
    s.inventory = [item(1), item(2), item(3, { ilvl: 20 }), item(4, { slot: 'armor' })];
    const out = merge(s, [1, 2, 3])!;
    expect(out.rarity).toBe(1);
    expect(out.ilvl).toBe(20);
    expect(s.inventory.length).toBe(2);
    const gold = s.gold;
    expect(salvageItem(s, 4)).toBeGreaterThan(0);
    expect(s.gold).toBeGreaterThan(gold);
  });

  it('merge all and auto-equip', () => {
    const s = newSave(1);
    s.inventory = [1, 2, 3, 4, 5, 6].map((u) => item(u, { slot: 'armor' }));
    expect(mergeAll(s).length).toBe(2);
    expect(autoEquip(s)).toBe(2);
    expect(s.progress.equipped.ilse?.armor).toBeDefined();
  });

  it('a Pilgrimage clears gear', () => {
    const s = newSave(1);
    s.inventory = [item(1)];
    equip(s, 'tomas', 1);
    s.inventory = [item(2)];
    s.progress.maxFloor = 40;
    pilgrimage(s, 'cleric');
    expect(s.inventory).toEqual([]);
    expect(s.progress.equipped).toEqual({});
  });
});

function bossFight(): FightState {
  const s = createFight(buildLoadout(freshProgress({ heroLevels: { tomas: 30, brann: 30, ilse: 30, wren: 30 } })), 10, 7);
  while (s.phase !== 'fight') step(s);
  return s;
}

describe('boss mechanics', () => {
  it('every boss has a mechanic', () => {
    for (const id of ['bone_knight', 'myconid_queen', 'frost_wyrm', 'forge_tyrant', 'hollow_king'] as const) {
      expect(BOSS_MECHANICS[id]?.length).toBeGreaterThan(0);
    }
  });

  it('Judgement punishes a hero below the line and spares one above it', () => {
    const s = bossFight();
    const j = BOSS_MECHANICS.bone_knight![0]!;
    s.heroes[2]!.hp = s.heroes[2]!.stats.maxHp * 0.5;
    resolveMech(s, 0, j, [2, 3]);
    expect(s.heroes[2]!.hp).toBeLessThan(s.heroes[2]!.stats.maxHp * 0.5);
    expect(s.heroes[3]!.hp).toBe(s.heroes[3]!.stats.maxHp);
  });

  it('Plague spreads unless you heal the hero, and your heal cures it', () => {
    const s = bossFight();
    const p = BOSS_MECHANICS.myconid_queen![0]!;
    resolveMech(s, 0, p, [1]);
    healHero(s, 1, 1, 'player', 'mend');
    expect(s.heroes[1]!.plagueT).toBe(0);
    resolveMech(s, 0, p, [1]);
    s.enemies.forEach((e) => (e.alive = false));
    for (let i = 0; i < 60 * (T.plagueTime + 0.2) && s.phase === 'fight'; i++) step(s);
    expect(s.heroes.some((h, i) => i !== 1 && h.plagueT > 0) || s.phase !== 'fight').toBe(true);
  });

  it('Frostbite bleeds until healed to full', () => {
    const s = bossFight();
    resolveMech(s, 0, BOSS_MECHANICS.frost_wyrm![0]!, [0, 2]);
    s.heroes[0]!.hp *= 0.6;
    const hp = s.heroes[0]!.hp;
    for (let i = 0; i < 60; i++) step(s);
    expect(s.heroes[0]!.hp).toBeLessThan(hp);
    expect(s.heroes[2]!.frostT).toBe(0);
  });

  it('casting during a Siphon drains mana', () => {
    const s = bossFight();
    resolveMech(s, 0, BOSS_MECHANICS.forge_tyrant![0]!, []);
    const mana = s.mana;
    step(s, [{ kind: 'mend', hero: 0 }]);
    expect(mana - s.mana).toBeGreaterThan(s.loadout.manaMax * T.siphonDrain * 0.9);
  });
});
