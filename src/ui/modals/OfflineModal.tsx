import type { Game } from '../../app/game.ts';
import type { OfflineReport } from '../../meta/offline.ts';
import { duration, fmt } from '../format.ts';
import { Icon } from '../Icon.tsx';
import { Btn } from '../widgets.tsx';
import { ModalFrame } from './ModalHost.tsx';

export function OfflineModal({ game, report: r }: { game: Game; report: OfflineReport }) {
  const floors = r.toFloor - r.fromFloor;
  return (
    <ModalFrame game={game} title="While you were away" dismissable={false} class="offline-modal">
      <p class="modal-lead">
        Your Acolytes kept the party going for <b>{duration(r.seconds)}</b>.
      </p>
      <div class="offline-gold">
        <Icon id="gold" scale={4} />
        <span>+{fmt(r.gold)}</span>
      </div>
      <div class="stat-grid">
        <div class="stat-cell">
          <Icon id="floor" scale={2} />
          <span>Floors</span>
          <b>
            {r.fromFloor} → {r.toFloor}
          </b>
          {floors !== 0 && <i class={floors > 0 ? 'gain' : 'loss'}>{floors > 0 ? `+${floors}` : floors}</i>}
        </div>
        <div class="stat-cell">
          <Icon id="skull" scale={2} />
          <span>Kills</span>
          <b>{fmt(r.kills)}</b>
        </div>
        {r.relics > 0 && (
          <div class="stat-cell stat-wide">
            <Icon id="relic" scale={2} />
            <span>Relics waiting</span>
            <b>{r.relics}</b>
          </div>
        )}
      </div>
      <div class="modal-actions">
        <Btn game={game} big class="grow" onPress={() => game.closeModal()}>
          Collect
        </Btn>
      </div>
    </ModalFrame>
  );
}
