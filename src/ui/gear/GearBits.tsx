import type { Game } from '../../app/game.ts';
import { gearStat, SLOT_INFO, SLOTS, type Item, type Slot } from '../../sim/data/gear.ts';
import type { HeroId } from '../../sim/data/heroes.ts';
import { pct } from '../format.ts';
import { Icon } from '../Icon.tsx';
import { gearPanel } from '../nav.ts';
import { useSave } from '../widgets.tsx';
import { rarityColor } from './gearUi.ts';

interface FrameProps {
  item?: Item;
  slot: Slot;
  /** Small green arrow: this bag item beats what someone wears. */
  up?: boolean;
  big?: boolean;
}

/** An item's slot icon framed in its rarity color; an empty slot is a dashed outline. */
export function ItemFrame({ item, slot, up, big }: FrameProps) {
  const cls = `iframe ${item ? '' : 'is-empty'} ${big ? 'is-big' : ''}`;
  return (
    <span class={cls} style={item ? { '--rar': rarityColor(item) } : undefined}>
      <Icon id={SLOT_INFO[slot].icon} scale={big ? 3 : 2} class={item ? '' : 'ghost'} />
      {up && <span class="iframe-up">▲</span>}
    </span>
  );
}

/** A hero's three gear slots plus the extras gear gives them. Tapping a slot opens its picker. */
export function GearRow({ game, hero }: { game: Game; hero: HeroId }) {
  const save = useSave(game);
  const worn = save.progress.equipped[hero] ?? {};
  const items = Object.values(worn);
  const extras = [
    ['crit', gearStat(items, 'precision')],
    ['haste', gearStat(items, 'haste')],
    ['guard', gearStat(items, 'guard')],
    ['heals', gearStat(items, 'blessed')],
  ] as const;
  const shown = extras.filter(([, v]) => v > 0.0005);
  return (
    <div class="gear-row">
      <div class="gear-slots">
        {SLOTS.map((slot) => (
          <button
            type="button"
            class="gear-slot"
            aria-label={`${SLOT_INFO[slot].name}${worn[slot] ? '' : ' (empty)'}`}
            onClick={() => {
              game.uiTap(true);
              gearPanel.value = { kind: 'slot', hero, slot };
            }}
          >
            <ItemFrame item={worn[slot]} slot={slot} />
          </button>
        ))}
      </div>
      {shown.length > 0 && (
        <div class="gear-extras">
          {shown.map(([label, v]) => (
            <span>
              <b>+{pct(v)}</b> {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
