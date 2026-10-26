import { useState } from 'preact/hooks';
import type { Game } from '../../app/game.ts';
import { relicDef, type RelicId } from '../../sim/data/relics.ts';
import { Icon } from '../Icon.tsx';
import { Btn, useSave } from '../widgets.tsx';
import { ModalFrame } from './ModalHost.tsx';

export function RelicModal({ game }: { game: Game }) {
  const save = useSave(game);
  const offer = save.relicOffers[0] ?? [];
  const [pick, setPick] = useState<RelicId | null>(null);
  const chosen = pick && offer.includes(pick) ? pick : null;
  if (offer.length === 0) {
    return (
      <ModalFrame game={game} title="Relics">
        <p class="modal-lead">No relics are waiting. Defeat a boss to find more.</p>
      </ModalFrame>
    );
  }
  const more = save.relicOffers.length - 1;
  return (
    <ModalFrame game={game} title="Choose a Relic" class="relic-modal">
      <p class="modal-lead">
        The boss left a treasure. Take one; it lasts until your next Pilgrimage.
        {more > 0 && <b> ({more} more waiting)</b>}
      </p>
      <div class="relic-offers">
        {offer.map((id, i) => {
          const r = relicDef(id);
          const on = chosen === id;
          return (
            <button
              type="button"
              class={`relic-offer ${on ? 'is-on' : ''}`}
              style={{ '--accent': r.color, animationDelay: `${80 + i * 70}ms` }}
              aria-pressed={on}
              onClick={() => {
                game.uiTap(true);
                setPick(id);
              }}
            >
              <span class="relic-offer-icon">
                <Icon id={r.icon} scale={4} />
              </span>
              <span class="relic-offer-main">
                <b style={{ color: r.color }}>{r.name}</b>
                <span>{r.text}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div class="modal-actions">
        <Btn game={game} tone="plain" onPress={() => game.closeModal()}>
          Later
        </Btn>
        <Btn
          game={game}
          big
          dim={!chosen}
          class="grow"
          onPress={() => {
            if (!chosen) return false;
            game.pickRelic(chosen);
          }}
        >
          {chosen ? 'Take it' : 'Pick one'}
        </Btn>
      </div>
    </ModalFrame>
  );
}
