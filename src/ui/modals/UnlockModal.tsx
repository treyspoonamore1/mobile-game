import type { Game, SheetId, UnlockId } from '../../app/game.ts';
import type { IconName } from '../../sim/data/icons.ts';
import { HeroSprite, Icon } from '../Icon.tsx';
import { Btn } from '../widgets.tsx';
import { ModalFrame } from './ModalHost.tsx';

const UNLOCKS: Record<UnlockId, { icon: IconName; title: string; lines: string[]; sheet: SheetId; button: string }> = {
  acolytes: {
    icon: 'acolyte',
    title: 'Acolytes join you!',
    lines: [
      'An Acolyte now heals beside you, all on its own.',
      'Give each Acolyte a Prayer: a rule like "Mend the lowest ally under 50%".',
      'They keep healing while the app is closed.',
    ],
    sheet: 'acolytes',
    button: 'Meet your Acolyte',
  },
  relics: {
    icon: 'relic',
    title: 'A relic!',
    lines: [
      'Every boss leaves a choice of relics.',
      'Pick one: each bends the rules in your favour.',
      'Relics last until your next Pilgrimage.',
    ],
    sheet: 'relics',
    button: 'See relics',
  },
  pilgrimage: {
    icon: 'pilgrim',
    title: 'Pilgrimage unlocked',
    lines: [
      'Retire the party to start over from floor 1, stronger.',
      'You earn Devotion for how deep you went: spend it on permanent upgrades and new Orders.',
      'The deeper you go first, the more you earn.',
    ],
    sheet: 'pilgrim',
    button: 'Learn more',
  },
};

export function UnlockModal({ game, id }: { game: Game; id: UnlockId }) {
  const u = UNLOCKS[id];
  return (
    <ModalFrame game={game} class="unlock-modal">
      <div class="burst">
        <span class="burst-rays" />
        <Icon id={u.icon} scale={6} />
      </div>
      <h2 class="unlock-title">{u.title}</h2>
      <ul class="unlock-lines">
        {u.lines.map((l) => (
          <li>{l}</li>
        ))}
      </ul>
      <div class="modal-actions">
        <Btn game={game} tone="plain" onPress={() => game.closeModal()}>
          Later
        </Btn>
        <Btn
          game={game}
          big
          class="grow"
          onPress={() => {
            game.closeModal();
            game.openSheet(u.sheet);
          }}
        >
          {u.button}
        </Btn>
      </div>
    </ModalFrame>
  );
}

export function WelcomeModal({ game }: { game: Game }) {
  const controls: [string, IconName, string][] = [
    ['Tap', 'mend', 'a hero to Mend'],
    ['Hold', 'ward', 'to Ward against big hits'],
    ['Swipe', 'chain', 'across heroes to Chain Mend'],
  ];
  return (
    <div class="modal-backdrop title-screen interactive">
      <div class="title-wrap">
        <div class="title-party">
          {['tomas', 'brann', 'healer_cleric', 'ilse', 'wren'].map((h, i) => (
            <span class="title-hero" style={{ animationDelay: `${i * 120}ms` }}>
              <HeroSprite id={h} scale={3} />
            </span>
          ))}
        </div>
        <h1 class="game-title">
          <span>LIFE</span>
          <span>LINE</span>
        </h1>
        <p class="tagline">You're the healer. They're the heroes.</p>
        <div class="title-controls">
          {controls.map(([g, icon, text]) => (
            <div class="title-control">
              <Icon id={icon} scale={2} />
              <b>{g}</b>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <Btn game={game} big class="begin-btn glow" onPress={() => game.closeModal()}>
          Begin
        </Btn>
      </div>
    </div>
  );
}
