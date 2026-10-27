import type { IconName } from './icons.ts';

export type Slot = 'weapon' | 'armor' | 'trinket';
export type Rarity = 0 | 1 | 2 | 3 | 4;
/** might: damage, vigor: life, haste: attack speed, precision: crit chance, guard: less damage taken, blessed: more healing received. */
export type Affix = 'might' | 'vigor' | 'haste' | 'precision' | 'guard' | 'blessed';

export interface Item {
  uid: number;
  slot: Slot;
  rarity: Rarity;
  /** The floor it dropped on; deeper items are stronger. */
  ilvl: number;
  /** The slot's main stat (weapon: might, armor: vigor, trinket: blessed), as a fraction. */
  main: number;
  affixes: { kind: Affix; value: number }[];
}

export const SLOTS: readonly Slot[] = ['weapon', 'armor', 'trinket'];

export const SLOT_INFO: Record<Slot, { name: string; icon: IconName; main: Affix }> = {
  weapon: { name: 'Weapon', icon: 'sword', main: 'might' },
  armor: { name: 'Armor', icon: 'shield', main: 'vigor' },
  trinket: { name: 'Trinket', icon: 'amulet', main: 'blessed' },
};

export const RARITIES = [
  { name: 'Worn', color: '#b8b8c8', weight: 60, mainMult: 1, affixes: 0 },
  { name: 'Fine', color: '#7ee07e', weight: 28, mainMult: 1.4, affixes: 1 },
  { name: 'Runed', color: '#5bb4ff', weight: 9, mainMult: 1.9, affixes: 1 },
  { name: 'Heroic', color: '#c48cff', weight: 2.5, mainMult: 2.2, affixes: 2 },
  { name: 'Mythic', color: '#ffaa3b', weight: 0.5, mainMult: 2.7, affixes: 3 },
] as const;

/** What a point of each affix means, for item cards. */
export const AFFIX_INFO: Record<Affix, { name: string; text: string; /** Value of a Worn affix at item level 0. */ base: number }> = {
  might: { name: 'Might', text: 'damage', base: 0.04 },
  vigor: { name: 'Vigor', text: 'life', base: 0.04 },
  haste: { name: 'Haste', text: 'attack speed', base: 0.025 },
  precision: { name: 'Precision', text: 'crit chance', base: 0.02 },
  guard: { name: 'Guard', text: 'less damage taken', base: 0.015 },
  blessed: { name: 'Blessed', text: 'healing received', base: 0.03 },
};

/** Caps on what a hero's gear can add up to, so no stat breaks the game. */
export const AFFIX_CAP: Partial<Record<Affix, number>> = { haste: 0.3, precision: 0.3, guard: 0.2 };

export const SLOT_NOUN: Record<Slot, string[]> = {
  weapon: ['Blade', 'Axe', 'Wand', 'Bow'],
  armor: ['Mail', 'Vest', 'Robe', 'Plate'],
  trinket: ['Charm', 'Locket', 'Ring', 'Talisman'],
};

/** A readable name: "Runed Locket of Haste". */
export function itemName(it: Item): string {
  const noun = SLOT_NOUN[it.slot][it.uid % SLOT_NOUN[it.slot].length]!;
  const first = it.affixes[0];
  return `${RARITIES[it.rarity].name} ${noun}${first ? ` of ${AFFIX_INFO[first.kind].name}` : ''}`;
}

/** Total of one stat across a hero's equipped items, capped. */
export function gearStat(items: readonly (Item | undefined)[], kind: Affix): number {
  let total = 0;
  for (const it of items) {
    if (!it) continue;
    if (SLOT_INFO[it.slot].main === kind) total += it.main;
    for (const a of it.affixes) if (a.kind === kind) total += a.value;
  }
  const cap = AFFIX_CAP[kind];
  return cap === undefined ? total : Math.min(cap, total);
}

/** A rough single number for comparing items (auto-equip, sorting). */
export function itemScore(it: Item): number {
  const w: Record<Affix, number> = { might: 1, vigor: 0.9, haste: 1.2, precision: 1.1, guard: 1.6, blessed: 0.8 };
  return it.main * w[SLOT_INFO[it.slot].main] + it.affixes.reduce((a, x) => a + x.value * w[x.kind], 0);
}
