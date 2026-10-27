// UI navigation state that outlives a render: Healer and Party segments, the gear panel, seen upgrades.
import { signal } from '@preact/signals';
import type { Game } from '../app/game.ts';
import { unspentPoints } from '../meta/healer.ts';
import { isUpgrade } from '../meta/gear.ts';
import type { Save } from '../meta/save.ts';
import type { HeroId } from '../sim/data/heroes.ts';
import type { Slot } from '../sim/data/gear.ts';

export type HealerSeg = 'talents' | 'spells' | 'relics';
export type PartySeg = 'heroes' | 'bag';

export const healerSeg = signal<HealerSeg>('talents');
export const partySeg = signal<PartySeg>('heroes');

/** A panel that slides up over the open sheet: a hero's slot picker or a bag item's card. */
export type GearPanel = { kind: 'slot'; hero: HeroId; slot: Slot } | { kind: 'item'; uid: number };
export const gearPanel = signal<GearPanel | null>(null);

/** Open the Healer sheet on a segment, or on whatever is waiting (a relic choice, then talent points). */
export function openHealer(game: Game, seg?: HealerSeg): void {
  if (seg) healerSeg.value = seg;
  else if (game.save.relicOffers.length > 0) healerSeg.value = 'relics';
  else if (unspentPoints(game.save) > 0) healerSeg.value = 'talents';
  game.openSheet('healer');
}

export function openParty(game: Game, seg?: PartySeg): void {
  if (seg) partySeg.value = seg;
  gearPanel.value = null;
  game.openSheet('party');
}

/**
 * Bag upgrades the player has already looked at (this session). The Party badge and the Bag dot only
 * light for new ones, so they don't nag on every drop.
 */
const seen = new Set<number>();

export function newUpgrades(save: Save): boolean {
  return save.inventory.some((it) => !seen.has(it.uid) && isUpgrade(save, it));
}

export function markBagSeen(save: Save): void {
  for (const it of save.inventory) seen.add(it.uid);
}
