import { RELICS, type RelicId } from '../sim/data/relics.ts';
import { applyLoadout, createFight } from '../sim/fight.ts';
import { buildLoadout } from '../sim/loadout.ts';
import { hash2, makeRng, next } from '../sim/rng.ts';
import type { FightState, SimEvent } from '../sim/state.ts';
import { T } from '../sim/tuning.ts';
import type { Save } from './save.ts';
import { readyDeeds } from './deeds.ts';
import { gainXp } from './healer.ts';

/** Notifications for the UI that come from applying sim events to the save. */
export type MetaNote =
  | { type: 'relicOffer' }
  | { type: 'newBest'; floor: number }
  | { type: 'acolytesUnlocked' }
  | { type: 'pilgrimageReady' }
  | { type: 'prayerUnlocked'; floor: number }
  | { type: 'healerLevel'; level: number }
  | { type: 'deedReady' };

export function newFight(save: Save): FightState {
  const seed = hash2(save.seed, save.pilgrimages * 7919 + save.lifetime.wipes);
  return createFight(buildLoadout(save.progress), save.floor, seed, save.autoAdvance);
}

/** Rebuild stats after a purchase or a relic pick. */
export function refreshLoadout(save: Save, fight: FightState): void {
  applyLoadout(fight, buildLoadout(save.progress));
  fight.autoAdvance = save.autoAdvance;
}

export function relicOffer(save: Save, floor: number): RelicId[] {
  const owned = new Set(save.progress.relics);
  const pool = RELICS.map((r) => r.id).filter((id) => !owned.has(id));
  const rng = makeRng(hash2(save.seed + floor, save.pilgrimages));
  const n = 3 + (save.progress.devotionUpgrades.insight ?? 0);
  const out: RelicId[] = [];
  while (out.length < n && pool.length > 0) {
    out.push(pool.splice(Math.floor(next(rng) * pool.length), 1)[0]!);
  }
  return out;
}

export function pickRelic(save: Save, id: RelicId): void {
  save.relicOffers.shift();
  if (!save.progress.relics.includes(id)) save.progress.relics.push(id);
}

/** Fold one tick's sim events into the save. */
export function applyEvents(save: Save, fight: FightState, events: readonly SimEvent[], dt: number): MetaNote[] {
  const notes: MetaNote[] = [];
  save.run.seconds += dt;
  save.lifetime.seconds += dt;
  const readyBefore = events.length > 0 ? readyDeeds(save).length : 0;
  let xp = 0;
  let chainHeals = 0;
  for (const e of events) {
    switch (e.type) {
      case 'gold':
        save.gold += e.amount;
        save.run.gold += e.amount;
        save.lifetime.gold += e.amount;
        break;
      case 'heal': {
        save.run.healed += e.amount;
        save.lifetime.healed += e.amount;
        const max = fight.heroes[e.hero]?.stats.maxHp ?? 1;
        xp += (e.amount / max) * T.healerXpPerLife * (e.by === 'acolyte' ? T.healerXpAcolyte : 1);
        if (e.kind === 'chain') chainHeals++;
        break;
      }
      case 'perfect':
        save.run.perfects++;
        save.lifetime.perfects++;
        save.lifetime.bestStreak = Math.max(save.lifetime.bestStreak, e.streak);
        xp += T.healerXpPerfect;
        break;
      case 'revive':
        if (e.by !== 'phoenix') {
          save.run.revives++;
          save.lifetime.revives++;
        }
        break;
      case 'sanctuary':
        save.run.sanctuaries++;
        save.lifetime.sanctuaries++;
        break;
      case 'save':
        xp += T.healerXpSave;
        save.run.saves++;
        save.lifetime.saves++;
        break;
      case 'enemyDie':
        save.run.kills++;
        save.lifetime.kills++;
        break;
      case 'wipe':
        save.run.wipes++;
        save.lifetime.wipes++;
        break;
      case 'floorStart': {
        save.floor = e.floor;
        const p = save.progress;
        if (e.floor > p.maxFloor) {
          const before = p.maxFloor;
          p.maxFloor = e.floor;
          if (before < T.acolyteFloorUnlock && e.floor >= T.acolyteFloorUnlock) notes.push({ type: 'acolytesUnlocked' });
          if (before < T.pilgrimageFloor && e.floor >= T.pilgrimageFloor) notes.push({ type: 'pilgrimageReady' });
        }
        if (e.floor > save.bestFloor) {
          save.bestFloor = e.floor;
          notes.push({ type: 'newBest', floor: e.floor });
        }
        break;
      }
      case 'floorClear':
        save.run.floors++;
        save.lifetime.floors++;
        if (e.boss) {
          save.run.bosses++;
          save.lifetime.bosses++;
          if (e.flawless) {
            save.run.flawlessBosses++;
            save.lifetime.flawlessBosses++;
          }
        }
        if (e.boss && !save.bossesCleared.includes(e.floor)) {
          save.bossesCleared.push(e.floor);
          const offer = relicOffer(save, e.floor);
          if (offer.length > 0) {
            save.relicOffers.push(offer);
            notes.push({ type: 'relicOffer' });
          }
        }
        break;
      default:
        break;
    }
  }
  if (chainHeals >= 4) {
    save.run.fullChains++;
    save.lifetime.fullChains++;
  }
  if (xp > 0) {
    const levels = gainXp(save, xp);
    if (levels > 0) notes.push({ type: 'healerLevel', level: save.healerLevel });
  }
  if (events.length > 0 && readyDeeds(save).length > readyBefore) notes.push({ type: 'deedReady' });
  save.floor = fight.phase === 'wipe' ? save.floor : fight.floor;
  return notes;
}
