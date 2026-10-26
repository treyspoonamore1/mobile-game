import type { Signal } from '@preact/signals';
import type { OfflineReport } from '../meta/offline.ts';
import type { Save, Settings } from '../meta/save.ts';
import type { HeroId } from '../sim/data/heroes.ts';
import type { OrderId } from '../sim/data/orders.ts';
import type { PrayerId } from '../sim/data/prayers.ts';
import type { RelicId } from '../sim/data/relics.ts';
import type { DevotionUpgradeId, GoldUpgradeId } from '../sim/data/upgrades.ts';
import type { FightState } from '../sim/state.ts';

export type SheetId = 'party' | 'spells' | 'acolytes' | 'relics' | 'pilgrim';

/** Explanations shown once when a system unlocks. */
export type UnlockId = 'acolytes' | 'pilgrimage' | 'relics';

export type Modal =
  | { kind: 'relic' }
  | { kind: 'offline'; report: OfflineReport }
  | { kind: 'pilgrimage' }
  | { kind: 'settings' }
  | { kind: 'unlock'; id: UnlockId }
  | { kind: 'welcome' };

/** A coaching banner over the party frames (tutorial). */
export interface Hint {
  id: string;
  text: string;
  /** Hero frame to point at, if any. */
  hero?: number;
  /** Nav tab to highlight, if any. */
  tab?: SheetId;
}

export interface Toast {
  id: number;
  text: string;
  tone: 'good' | 'bad' | 'info' | 'gold';
}

/**
 * Everything the DOM UI needs. The save object is live and mutated by the game loop;
 * `version` is bumped (about 8 times a second and after every action) so components re-render.
 */
export interface Game {
  save: Save;
  version: Signal<number>;
  sheet: Signal<SheetId | null>;
  modal: Signal<Modal | null>;
  hint: Signal<Hint | null>;
  toasts: Signal<Toast[]>;
  /** Height in CSS px of the fight scene (sheets cover everything below it, above the nav). */
  sceneHeight: Signal<number>;
  fight(): FightState;

  openSheet(id: SheetId | null): void;
  closeModal(): void;
  openModal(m: Modal): void;
  toast(text: string, tone?: Toast['tone']): void;

  buyHero(id: HeroId, max: number): void;
  buyGold(id: GoldUpgradeId): void;
  buyDevotion(id: DevotionUpgradeId): void;
  setPrayer(slot: number, prayer: PrayerId): void;
  pickRelic(id: RelicId): void;
  pilgrimage(order: OrderId): void;
  setAutoAdvance(on: boolean): void;
  setSettings(s: Partial<Settings>): void;
  resetSave(): void;
  exportSave(): string;
  importSave(text: string): boolean;
  /** UI click feedback (sound + haptic). */
  uiTap(ok?: boolean): void;
}
