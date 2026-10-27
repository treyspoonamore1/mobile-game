import { useState } from 'preact/hooks';
import type { Game } from '../../app/game.ts';
import { canPilgrimage, devotionFor, orderUnlocked, startFloor } from '../../meta/pilgrimage.ts';
import { ORDERS, type OrderId } from '../../sim/data/orders.ts';
import { T } from '../../sim/tuning.ts';
import { fmt } from '../format.ts';
import { Icon } from '../Icon.tsx';
import { Btn, useSave } from '../widgets.tsx';
import { ModalFrame } from './ModalHost.tsx';

export function PilgrimageModal({ game }: { game: Game }) {
  const save = useSave(game);
  const [order, setOrder] = useState<OrderId>(
    orderUnlocked(save, save.progress.order) ? save.progress.order : 'cleric',
  );
  const gain = devotionFor(save.progress.maxFloor);
  const can = canPilgrimage(save);
  return (
    <ModalFrame game={game} title="Pilgrimage" class="pilgrim-modal">
      <div class="dev-gain">
        <Icon id="devotion" scale={4} />
        <div>
          <span class="dev-gain-num">+{fmt(gain)}</span>
          <span class="dev-gain-label">
            Devotion · total {fmt(save.devotion + gain)}
          </span>
        </div>
      </div>
      <div class="reset-cols">
        <div class="reset-col is-lost">
          <h4>Resets</h4>
          <ul>
            <li>Gold</li>
            <li>Hero levels</li>
            <li>Spell &amp; Acolyte upgrades</li>
            <li>Relics and gear</li>
            <li>Floor (back to {startFloor(save)})</li>
          </ul>
        </div>
        <div class="reset-col is-kept">
          <h4>Stays</h4>
          <ul>
            <li>Devotion &amp; its upgrades</li>
            <li>Unlocked Orders</li>
            <li>Acolyte Prayers</li>
            <li>Best floor ({save.bestFloor})</li>
            <li>Lifetime stats</li>
          </ul>
        </div>
      </div>
      <h4 class="modal-sub">Choose your Order</h4>
      <div class="order-pick">
        {ORDERS.map((o) => {
          const unlocked = orderUnlocked(save, o.id);
          const on = order === o.id;
          return (
            <button
              type="button"
              class={`order-opt ${on ? 'is-on' : ''} ${unlocked ? '' : 'is-locked'}`}
              aria-pressed={on}
              onClick={() => {
                if (!unlocked) {
                  game.uiTap(false);
                  game.toast(`Unlock the ${o.name} with Devotion`, 'info');
                  return;
                }
                game.uiTap(true);
                setOrder(o.id);
              }}
            >
              <Icon id={unlocked ? o.icon : 'lock'} scale={3} />
              <b>{o.name}</b>
              <span>Hold: {o.hold}</span>
            </button>
          );
        })}
      </div>
      <p class="order-text">{ORDERS.find((o) => o.id === order)!.text}</p>
      <div class="modal-actions">
        <Btn game={game} tone="plain" onPress={() => game.closeModal()}>
          Not yet
        </Btn>
        <Btn
          game={game}
          big
          tone="purple"
          dim={!can}
          class="grow"
          onDim={() => game.toast(`Reach floor ${T.pilgrimageFloor} first`, 'info')}
          onPress={() => game.pilgrimage(order)}
        >
          Begin
        </Btn>
      </div>
    </ModalFrame>
  );
}
