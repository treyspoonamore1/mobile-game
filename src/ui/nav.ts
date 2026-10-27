// Which segment of the Healer sheet is showing, so badges, unlock cards and the nav can jump straight to it.
import { signal } from '@preact/signals';
import type { Game } from '../app/game.ts';
import { unspentPoints } from '../meta/healer.ts';

export type HealerSeg = 'talents' | 'spells' | 'relics';

export const healerSeg = signal<HealerSeg>('talents');

/** Open the Healer sheet on a segment, or on whatever is waiting (a relic choice, then talent points). */
export function openHealer(game: Game, seg?: HealerSeg): void {
  if (seg) healerSeg.value = seg;
  else if (game.save.relicOffers.length > 0) healerSeg.value = 'relics';
  else if (unspentPoints(game.save) > 0) healerSeg.value = 'talents';
  game.openSheet('healer');
}
