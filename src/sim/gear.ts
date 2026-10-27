import { AFFIX_INFO, RARITIES, SLOTS, SLOT_INFO, type Affix, type Item, type Rarity, type Slot } from './data/gear.ts';
import { next, pick, type Rng } from './rng.ts';
import { T } from './tuning.ts';

const AFFIXES: readonly Affix[] = ['might', 'vigor', 'haste', 'precision', 'guard', 'blessed'];
/** Affixes that grow with item level (the others have hard caps instead). */
const SCALING = new Set<Affix>(['might', 'vigor', 'blessed']);

/** Roll a rarity, with deeper floors shifting the odds toward rarer items. */
export function rollRarity(rng: Rng, floor: number, min: Rarity = 0): Rarity {
  const shift = Math.min(3, floor * T.gearRarityPerFloor);
  const weights = RARITIES.map((r, i) => (i < min ? 0 : r.weight * Math.pow(1 + shift, i)));
  let roll = next(rng) * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]!;
    if (roll <= 0) return i as Rarity;
  }
  return min;
}

export function rollItem(rng: Rng, uid: number, floor: number, rarity: Rarity, slot: Slot = pick(rng, SLOTS)): Item {
  const r = RARITIES[rarity];
  const depth = 1 + T.gearIlvlScale * floor;
  const main = T.gearMainBase * r.mainMult * depth * (0.85 + 0.3 * next(rng));
  const pool = AFFIXES.filter((a) => a !== SLOT_INFO[slot].main);
  const affixes: Item['affixes'] = [];
  for (let k = 0; k < r.affixes; k++) {
    const kind = pick(rng, pool.filter((a) => !affixes.some((x) => x.kind === a)));
    const scale = SCALING.has(kind) ? depth : 1;
    affixes.push({ kind, value: AFFIX_INFO[kind].base * r.mainMult * scale * (0.7 + 0.6 * next(rng)) });
  }
  return { uid, slot, rarity, ilvl: floor, main, affixes };
}

/** Three items of one slot and rarity become one of the next rarity, at the best item level. */
export function mergeItems(rng: Rng, uid: number, items: readonly Item[]): Item | null {
  if (items.length !== 3) return null;
  const [a] = items;
  if (!a || a.rarity >= 4 || items.some((it) => it.slot !== a.slot || it.rarity !== a.rarity)) return null;
  const ilvl = Math.max(...items.map((it) => it.ilvl));
  return rollItem(rng, uid, ilvl, (a.rarity + 1) as Rarity, a.slot);
}
