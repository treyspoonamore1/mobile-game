import { canLearn, spentPoints, type TalentId } from '../sim/data/talents.ts';
import { deedBonus } from '../sim/data/deeds.ts';
import { T } from '../sim/tuning.ts';
import type { Save } from './save.ts';

export function xpToNext(level: number): number {
  return Math.round(T.healerXpBase * Math.pow(T.healerXpGrowth, level - 1));
}

/** Talent points: one per level after the first. */
export function talentPoints(save: Save): number {
  return save.healerLevel - 1;
}

export function unspentPoints(save: Save): number {
  return talentPoints(save) - spentPoints(save.progress.talents);
}

/** Add XP; returns how many levels were gained. */
export function gainXp(save: Save, xp: number): number {
  save.healerXp += xp * (1 + deedBonus(save.progress.deeds, 'xp'));
  let gained = 0;
  while (save.healerXp >= xpToNext(save.healerLevel)) {
    save.healerXp -= xpToNext(save.healerLevel);
    save.healerLevel++;
    gained++;
  }
  return gained;
}

export function learnTalent(save: Save, id: TalentId): boolean {
  if (!canLearn(save.progress.talents, id, unspentPoints(save))) return false;
  save.progress.talents[id] = (save.progress.talents[id] ?? 0) + 1;
  return true;
}

/** Refund every talent point. Free, any time. */
export function resetTalents(save: Save): void {
  save.progress.talents = {};
}
