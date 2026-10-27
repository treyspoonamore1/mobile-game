// Presentation helpers for gear: stat lines, comparisons, merge sets.
import type { Save } from '../../meta/save.ts';
import { AFFIX_INFO, itemScore, RARITIES, SLOT_INFO, type Affix, type Item, type Slot } from '../../sim/data/gear.ts';
import type { HeroId } from '../../sim/data/heroes.ts';
import { pct } from '../format.ts';

export const AFFIX_ORDER: readonly Affix[] = ['might', 'vigor', 'haste', 'precision', 'guard', 'blessed'];

/** Every stat an item gives, main stat included. */
export function itemStats(it: Item | undefined): Partial<Record<Affix, number>> {
  const out: Partial<Record<Affix, number>> = {};
  if (!it) return out;
  const main = SLOT_INFO[it.slot].main;
  out[main] = it.main;
  for (const a of it.affixes) out[a.kind] = (out[a.kind] ?? 0) + a.value;
  return out;
}

export interface StatLine {
  kind: Affix;
  value: number;
  text: string;
}

/** "+12% damage" for each stat that differs between two items (or for one item alone). */
export function compareLines(next: Item | undefined, worn: Item | undefined): StatLine[] {
  const a = itemStats(next);
  const b = itemStats(worn);
  const lines: StatLine[] = [];
  for (const kind of AFFIX_ORDER) {
    const v = (a[kind] ?? 0) - (b[kind] ?? 0);
    if (Math.abs(v) < 0.0005) continue;
    lines.push({ kind, value: v, text: `${v > 0 ? '+' : '-'}${pct(Math.abs(v))} ${AFFIX_INFO[kind].text}` });
  }
  return lines;
}

/** The two weakest other bag items that can merge with this one, or null. */
export function mergePartners(save: Save, it: Item): Item[] | null {
  if (it.rarity >= RARITIES.length - 1) return null;
  const others = save.inventory
    .filter((x) => x.uid !== it.uid && x.slot === it.slot && x.rarity === it.rarity)
    .sort((x, y) => itemScore(x) - itemScore(y))
    .slice(0, 2);
  return others.length === 2 ? others : null;
}

/** Bag items of a slot and rarity. */
export function countLike(save: Save, slot: Slot, rarity: number): number {
  return save.inventory.filter((x) => x.slot === slot && x.rarity === rarity).length;
}

export function canMergeAny(save: Save): boolean {
  const counts = new Map<string, number>();
  for (const it of save.inventory) {
    if (it.rarity >= RARITIES.length - 1) continue;
    const k = `${it.slot}:${it.rarity}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.values()].some((n) => n >= 3);
}

export function wornBy(save: Save, hero: HeroId, slot: Slot): Item | undefined {
  return save.progress.equipped[hero]?.[slot];
}

export const rarityColor = (it: Item) => RARITIES[it.rarity].color;
export const rarityName = (it: Item) => RARITIES[it.rarity].name;

/** Bag order: rarest first, then by slot, then strongest. */
export function bagOrder(a: Item, b: Item): number {
  const slots: Slot[] = ['weapon', 'armor', 'trinket'];
  return b.rarity - a.rarity || slots.indexOf(a.slot) - slots.indexOf(b.slot) || itemScore(b) - itemScore(a);
}
