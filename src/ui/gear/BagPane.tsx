import type { Game } from '../../app/game.ts';
import { isUpgrade } from '../../meta/gear.ts';
import { itemName } from '../../sim/data/gear.ts';
import { T } from '../../sim/tuning.ts';
import { Icon } from '../Icon.tsx';
import { gearPanel, markBagSeen } from '../nav.ts';
import { Btn, Panel, Seg, useSave } from '../widgets.tsx';
import { ItemFrame } from './GearBits.tsx';
import { bagOrder, canMergeAny } from './gearUi.ts';

const SALVAGE_OPTS = [
  { value: 0, label: 'Off' },
  { value: 1, label: 'Worn' },
  { value: 2, label: 'Fine' },
  { value: 3, label: 'Runed' },
];

export function BagPane({ game }: { game: Game }) {
  const save = useSave(game);
  const items = [...save.inventory].sort(bagOrder);
  const full = items.length >= T.inventoryCap - 4;
  const mergeable = canMergeAny(save);
  // Looking at the bag clears the "new upgrade" badge.
  markBagSeen(save);
  return (
    <>
      <Panel class="bag-head">
        <div class="row-between">
          <span class={`bag-count ${full ? 'is-full' : ''}`}>
            <Icon id="relic" scale={2} />
            <b>{items.length}</b> / {T.inventoryCap}
          </span>
          <div class="bag-actions">
            <Btn
              game={game}
              tone="blue"
              class="bag-btn"
              dim={items.length === 0}
              onDim={() => game.toast('The bag is empty', 'info')}
              onPress={() => game.autoEquip()}
            >
              Auto-equip
            </Btn>
            <Btn
              game={game}
              class="bag-btn"
              dim={!mergeable}
              onDim={() => game.toast('Merging needs 3 items of one slot and rarity', 'info')}
              onPress={() => game.mergeAll()}
            >
              Merge all
            </Btn>
          </div>
        </div>
        <div class="bag-salvage">
          <span>Auto-salvage drops below</span>
          <Seg
            game={game}
            value={save.autoSalvageBelow}
            options={SALVAGE_OPTS}
            onChange={(v) => game.setAutoSalvage(v)}
          />
        </div>
        {full && <p class="warn bag-warn">The bag is nearly full: the weakest item is salvaged when it overflows.</p>}
      </Panel>
      {items.length === 0 ? (
        <Panel class="empty">
          <Icon id="sword" scale={4} />
          <p>No gear yet. Cleared floors sometimes drop items, and bosses always do.</p>
        </Panel>
      ) : (
        <div class="bag-grid">
          {items.map((it) => (
            <button
              type="button"
              key={it.uid}
              class="bag-cell"
              aria-label={itemName(it)}
              onClick={() => {
                game.uiTap(true);
                gearPanel.value = { kind: 'item', uid: it.uid };
              }}
            >
              <ItemFrame item={it} slot={it.slot} up={isUpgrade(save, it)} big />
            </button>
          ))}
        </div>
      )}
      <p class="footnote">Gear is lost on Pilgrimage. Merge three of a kind into a rarer item.</p>
    </>
  );
}
