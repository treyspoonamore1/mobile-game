import type { IconName } from './icons.ts';
import type { DevotionUpgradeId } from './upgrades.ts';

export type OrderId = 'cleric' | 'chrono' | 'bard';

export interface OrderDef {
  id: OrderId;
  name: string;
  icon: IconName;
  hold: string;
  text: string;
  unlock?: DevotionUpgradeId;
}

export const ORDERS = [
  {
    id: 'cleric', name: 'Cleric', icon: 'sanctuary', hold: 'Ward',
    text: 'Hold a hero to Ward them. A Ward in the last moment before a heavy blow is a Perfect. A third of your overhealing becomes a Ward.',
  },
  {
    id: 'chrono', name: 'Chronomancer', icon: 'hourglass', hold: 'Rewind', unlock: 'order_chrono',
    text: 'Hold a hero to Rewind them to their best life in the last 3 s and wash off poison. Rewind right after a heavy blow for a Perfect. Mend is 15% weaker.',
  },
  {
    id: 'bard', name: 'Bard', icon: 'note', hold: 'Anthem', unlock: 'order_bard',
    text: 'Mends on the beat heal 50% more for half the mana; four in a row is an Encore that heals everyone. Hold for an Anthem: the party deals 30% more and takes 20% less for 5 s.',
  },
] as const satisfies readonly OrderDef[];

export function orderDef(id: OrderId): OrderDef {
  return ORDERS.find((o) => o.id === id)!;
}
