import type { ComponentChildren } from 'preact';
import type { Game, Modal } from '../../app/game.ts';
import { OfflineModal } from './OfflineModal.tsx';
import { PilgrimageModal } from './PilgrimageModal.tsx';
import { RelicModal } from './RelicModal.tsx';
import { SettingsModal } from './SettingsModal.tsx';
import { UnlockModal, WelcomeModal } from './UnlockModal.tsx';

export function ModalHost({ game }: { game: Game }) {
  const m = game.modal.value;
  if (!m) return null;
  return <ModalBody key={m.kind} game={game} modal={m} />;
}

function ModalBody({ game, modal }: { game: Game; modal: Modal }) {
  switch (modal.kind) {
    case 'relic':
      return <RelicModal game={game} />;
    case 'offline':
      return <OfflineModal game={game} report={modal.report} />;
    case 'pilgrimage':
      return <PilgrimageModal game={game} />;
    case 'settings':
      return <SettingsModal game={game} />;
    case 'unlock':
      return <UnlockModal game={game} id={modal.id} />;
    case 'welcome':
      return <WelcomeModal game={game} />;
  }
}

interface FrameProps {
  game: Game;
  title?: string;
  /** Tapping the backdrop or the X closes it. */
  dismissable?: boolean;
  class?: string;
  children: ComponentChildren;
}

/** Dimmed backdrop and a centred pixel panel. */
export function ModalFrame({ game, title, dismissable = true, class: cls, children }: FrameProps) {
  const close = () => {
    game.uiTap(true);
    game.closeModal();
  };
  return (
    <div
      class="modal-backdrop interactive"
      onClick={(e) => {
        if (dismissable && e.target === e.currentTarget) close();
      }}
    >
      <div class={`modal ${cls ?? ''}`} role="dialog" aria-modal="true" aria-label={title}>
        {title && (
          <header class="modal-head">
            <h2 class="modal-title">{title}</h2>
            {dismissable && (
              <button type="button" class="close-btn" aria-label="Close" onClick={close}>
                ✕
              </button>
            )}
          </header>
        )}
        <div class="modal-scroll">{children}</div>
      </div>
    </div>
  );
}
