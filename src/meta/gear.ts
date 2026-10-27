import { HERO_IDS, type HeroId } from '../sim/data/heroes.ts';
import { itemScore, SLOTS, type Item, type Rarity, type Slot } from '../sim/data/gear.ts';
import { floorGold } from '../sim/floors.ts';
import { mergeItems, rollItem, rollRarity } from '../sim/gear.ts';
import { buildLoadout } from '../sim/loadout.ts';
import { chance, hash2, makeRng } from '../sim/rng.ts';
import { T } from '../sim/tuning.ts';
import type { Save } from './save.ts';

function rng(save: Save) {
  return makeRng(hash2(save.seed ^ 0x51ed, save.nextItemUid * 2654435761));
}

/** Gold for salvaging an item. */
export function salvageValue(save: Save, it: Item): number {
  const goldMult = buildLoadout(save.progress).goldMult;
  return Math.round(floorGold(it.ilvl) * T.salvageKills * (it.rarity + 1) * goldMult);
}

function addGold(save: Save, g: number): void {
  save.gold += g;
  save.run.gold += g;
  save.lifetime.gold += g;
}

/**
 * Maybe drop an item for a floor clear. Returns the item kept (null if nothing dropped, or it was
 * auto-salvaged). A full bag salvages its worst item.
 */
export function rollDrop(save: Save, floor: number, boss: boolean): { item: Item | null; salvaged: number } {
  const r = rng(save);
  if (!boss && !chance(r, T.gearDropChance)) {
    save.nextItemUid++;
    return { item: null, salvaged: 0 };
  }
  const rarity = rollRarity(r, floor, boss ? (T.gearBossMinRarity as Rarity) : 0);
  const item = rollItem(r, save.nextItemUid++, floor, rarity);
  if (item.rarity < save.autoSalvageBelow) {
    const g = salvageValue(save, item);
    addGold(save, g);
    return { item: null, salvaged: g };
  }
  save.inventory.push(item);
  let salvaged = 0;
  while (save.inventory.length > T.inventoryCap) {
    const worst = save.inventory.reduce((a, b) => (itemScore(b) < itemScore(a) ? b : a));
    salvaged += salvageItem(save, worst.uid) ?? 0;
  }
  return { item: save.inventory.includes(item) ? item : null, salvaged };
}

export function equippedItems(save: Save, hero: HeroId): Partial<Record<Slot, Item>> {
  return (save.progress.equipped[hero] ??= {});
}

/** Put an inventory item on a hero; whatever was in that slot goes back to the bag. */
export function equip(save: Save, hero: HeroId, uid: number): boolean {
  const i = save.inventory.findIndex((it) => it.uid === uid);
  if (i < 0) return false;
  const item = save.inventory.splice(i, 1)[0]!;
  const worn = equippedItems(save, hero);
  const old = worn[item.slot];
  if (old) save.inventory.push(old);
  worn[item.slot] = item;
  return true;
}

export function unequip(save: Save, hero: HeroId, slot: Slot): boolean {
  const worn = equippedItems(save, hero);
  const old = worn[slot];
  if (!old) return false;
  delete worn[slot];
  save.inventory.push(old);
  return true;
}

export function salvageItem(save: Save, uid: number): number | null {
  const i = save.inventory.findIndex((it) => it.uid === uid);
  if (i < 0) return null;
  const g = salvageValue(save, save.inventory[i]!);
  save.inventory.splice(i, 1);
  addGold(save, g);
  return g;
}

/** Merge three bag items of one slot and rarity into one of the next rarity. */
export function merge(save: Save, uids: number[]): Item | null {
  const items = uids.map((u) => save.inventory.find((it) => it.uid === u)).filter((x): x is Item => !!x);
  const out = mergeItems(rng(save), save.nextItemUid, items);
  if (!out) return null;
  save.nextItemUid++;
  save.inventory = save.inventory.filter((it) => !uids.includes(it.uid));
  save.inventory.push(out);
  return out;
}

/** Merge every set of three it can, weakest first, from the lowest rarity up. Returns the new items. */
export function mergeAll(save: Save): Item[] {
  const made: Item[] = [];
  for (let rarity = 0; rarity < 4; rarity++) {
    for (const slot of SLOTS) {
      for (;;) {
        const set = save.inventory
          .filter((it) => it.slot === slot && it.rarity === rarity)
          .sort((a, b) => itemScore(a) - itemScore(b))
          .slice(0, 3);
        if (set.length < 3) break;
        const out = merge(save, set.map((it) => it.uid));
        if (!out) break;
        made.push(out);
      }
    }
  }
  return made;
}

/** Who wants each slot most: damage dealers get weapons first, the frail and the tank get armor. */
const PRIORITY: Record<Slot, HeroId[]> = {
  weapon: ['brann', 'wren', 'ilse', 'tomas'],
  armor: ['ilse', 'tomas', 'wren', 'brann'],
  trinket: ['tomas', 'ilse', 'brann', 'wren'],
};

/** Give every hero the best items available (bag and worn). Returns how many items moved. */
export function autoEquip(save: Save): number {
  let moved = 0;
  for (const slot of SLOTS) {
    for (const hero of HERO_IDS) unequip(save, hero, slot);
    const pool = save.inventory.filter((it) => it.slot === slot).sort((a, b) => itemScore(b) - itemScore(a));
    PRIORITY[slot].forEach((hero, k) => {
      const it = pool[k];
      if (it && equip(save, hero, it.uid)) moved++;
    });
  }
  return moved;
}

/**
 * True if this bag item would actually be worn: it fills an empty slot (only the best few bag items
 * for that slot count, one per empty slot) or beats the weakest item worn in that slot.
 */
export function isUpgrade(save: Save, it: Item): boolean {
  const worn = HERO_IDS.map((h) => save.progress.equipped[h]?.[it.slot]);
  const empty = worn.filter((w) => !w).length;
  const better = save.inventory.filter((x) => x.slot === it.slot && itemScore(x) > itemScore(it)).length;
  if (empty > 0) return better < empty;
  const weakest = Math.min(...worn.map((w) => itemScore(w!)));
  return itemScore(it) > weakest && better < HERO_IDS.length;
}
