import { step } from '../sim/fight.ts';
import { T } from '../sim/tuning.ts';
import type { Save } from './save.ts';
import { applyEvents, newFight } from './session.ts';

export interface OfflineReport {
  seconds: number;
  gold: number;
  fromFloor: number;
  toFloor: number;
  kills: number;
  relics: number;
}

export function offlineCapSeconds(save: Save): number {
  return (T.offlineCapHours + 2 * (save.progress.devotionUpgrades.vigil ?? 0)) * 3600;
}

export function offlineEfficiency(save: Save): number {
  return T.offlineEfficiency + 0.1 * (save.progress.devotionUpgrades.vigil ?? 0);
}

/**
 * Progress while the app was closed: the party fights on with only your Acolytes.
 * The first stretch is simulated; the rest earns gold at the simulated rate.
 */
export function runOffline(save: Save, elapsedSeconds: number): OfflineReport | null {
  if (elapsedSeconds < 60) return null;
  const total = Math.min(elapsedSeconds, offlineCapSeconds(save));
  const simTime = Math.min(total, T.offlineSimSeconds);
  const eff = offlineEfficiency(save);
  const fromFloor = save.floor;
  const goldBefore = save.gold;
  const offersBefore = save.relicOffers.length;
  const fight = newFight(save);
  let simGold = 0;
  let kills = 0;
  for (let t = 0; t < simTime; t += T.offlineDt) {
    const events = step(fight, [], T.offlineDt);
    for (const e of events) {
      if (e.type === 'gold') simGold += e.amount;
      if (e.type === 'enemyDie') kills++;
    }
    applyEvents(save, fight, events, T.offlineDt);
  }
  // applyEvents added raw gold; scale it by offline efficiency, then extrapolate.
  save.gold = goldBefore + simGold * eff;
  const rate = simGold / simTime;
  const extra = rate * (total - simTime) * eff;
  save.gold += extra;
  save.run.gold += extra - simGold * (1 - eff);
  save.lifetime.gold += extra - simGold * (1 - eff);
  return {
    seconds: total,
    gold: save.gold - goldBefore,
    fromFloor,
    toFloor: save.floor,
    kills: Math.round(kills * (total / simTime)),
    relics: save.relicOffers.length - offersBefore,
  };
}
