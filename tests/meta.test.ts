import { describe, expect, it } from 'vitest';
import { runOffline } from '../src/meta/offline.ts';
import { canPilgrimage, devotionFor, pilgrimage } from '../src/meta/pilgrimage.ts';
import { newSave, parseSave } from '../src/meta/save.ts';
import { applyEvents, newFight, pickRelic, relicOffer } from '../src/meta/session.ts';
import { buyDevotionUpgrade, buyGoldUpgrade, buyHero, heroBulk, heroCost } from '../src/meta/shop.ts';
import { step } from '../src/sim/fight.ts';
import { T } from '../src/sim/tuning.ts';

describe('save', () => {
  it('round-trips and fills in missing fields', () => {
    const s = newSave(3);
    s.gold = 123;
    const back = parseSave(JSON.stringify(s), 9);
    expect(back.gold).toBe(123);
    expect(back.seed).toBe(3);
    const partial = parseSave(JSON.stringify({ gold: 5, progress: { maxFloor: 7 } }), 9);
    expect(partial.progress.heroLevels.tomas).toBe(1);
    expect(partial.progress.maxFloor).toBe(7);
    expect(parseSave('not json', 9).gold).toBe(0);
  });
});

describe('shop', () => {
  it('buys hero levels in bulk only as far as gold allows', () => {
    const s = newSave(1);
    s.gold = heroCost('tomas', 1) + heroCost('tomas', 2) + 1;
    expect(heroBulk(s, 'tomas', 10).n).toBe(2);
    expect(buyHero(s, 'tomas', 10)).toBe(2);
    expect(s.progress.heroLevels.tomas).toBe(3);
    expect(s.gold).toBeLessThan(heroCost('tomas', 3));
  });

  it('refuses unaffordable or maxed upgrades', () => {
    const s = newSave(1);
    expect(buyGoldUpgrade(s, 'mend_power')).toBe(false);
    s.gold = 1e12;
    expect(buyGoldUpgrade(s, 'mend_power')).toBe(true);
    for (let i = 0; i < 10; i++) buyGoldUpgrade(s, 'aco_slot');
    expect(s.progress.upgrades.aco_slot).toBe(4);
    s.devotion = 1e6;
    expect(buyDevotionUpgrade(s, 'insight')).toBe(true);
    expect(buyDevotionUpgrade(s, 'insight')).toBe(false);
  });
});

describe('relics', () => {
  it('offers relics not owned, and picking one adds it', () => {
    const s = newSave(1);
    const offer = relicOffer(s, 10);
    expect(offer.length).toBe(3);
    s.relicOffers.push(offer);
    pickRelic(s, offer[1]!);
    expect(s.progress.relics).toEqual([offer[1]]);
    expect(relicOffer(s, 20)).not.toContain(offer[1]);
  });

  it('a boss clear queues a relic offer once', () => {
    const s = newSave(1);
    const f = newFight(s);
    applyEvents(s, f, [{ type: 'floorClear', floor: 10, boss: true, flawless: false }], 0);
    applyEvents(s, f, [{ type: 'floorClear', floor: 10, boss: true, flawless: false }], 0);
    expect(s.relicOffers.length).toBe(1);
  });
});

describe('pilgrimage', () => {
  it('needs the unlock floor and resets the run but keeps Devotion', () => {
    const s = newSave(1);
    expect(canPilgrimage(s)).toBe(false);
    s.progress.maxFloor = T.pilgrimageFloor + 10;
    s.gold = 999;
    s.progress.heroLevels.ilse = 40;
    s.progress.relics = ['crown'];
    s.devotion = 2;
    const gain = devotionFor(s.progress.maxFloor);
    expect(gain).toBeGreaterThan(0);
    expect(pilgrimage(s, 'cleric')).toBe(gain);
    expect(s.devotion).toBe(2 + gain);
    expect(s.gold).toBe(0);
    expect(s.progress.heroLevels.ilse).toBe(1);
    expect(s.progress.relics).toEqual([]);
    expect(s.floor).toBe(1);
    expect(s.pilgrimages).toBe(1);
  });

  it('a locked Order falls back to the Cleric', () => {
    const s = newSave(1);
    s.progress.maxFloor = 40;
    pilgrimage(s, 'bard');
    expect(s.progress.order).toBe('cleric');
  });
});

describe('offline', () => {
  it('does nothing for short absences and earns gold for long ones', () => {
    const s = newSave(1);
    expect(runOffline(s, 30)).toBeNull();
    s.progress.heroLevels = { tomas: 20, brann: 20, ilse: 20, wren: 20 };
    s.progress.maxFloor = 12;
    s.progress.acolytes[0] = 'mend_lowest';
    const r = runOffline(s, 3 * 3600)!;
    expect(r.seconds).toBe(3 * 3600);
    expect(r.gold).toBeGreaterThan(0);
    expect(s.gold).toBeCloseTo(r.gold);
  });

  it('is capped', () => {
    const s = newSave(1);
    const r = runOffline(s, 1000 * 3600)!;
    expect(r.seconds).toBe(T.offlineCapHours * 3600);
  });
});

describe('session', () => {
  it('folds gold and floor progress into the save', () => {
    const s = newSave(1);
    const f = newFight(s);
    let gold = 0;
    for (let i = 0; i < 60 * 30; i++) {
      const ev = step(f);
      for (const e of ev) if (e.type === 'gold') gold += e.amount;
      applyEvents(s, f, ev, 1 / 60);
    }
    expect(s.gold).toBeCloseTo(gold);
    expect(s.progress.maxFloor).toBeGreaterThanOrEqual(1);
  });
});
