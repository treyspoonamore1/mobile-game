import { useEffect, useState } from 'preact/hooks';
import type { Game, SheetId } from '../app/game.ts';
import { AcolytesSheet } from './sheets/AcolytesSheet.tsx';
import { PartySheet } from './sheets/PartySheet.tsx';
import { DeedsSheet } from './sheets/DeedsSheet.tsx';
import { HealerSheet } from './sheets/HealerSheet.tsx';
import { PilgrimSheet } from './sheets/PilgrimSheet.tsx';
import { Icon } from './Icon.tsx';
import { SHEET_TITLES, TABS } from './status.ts';

const CLOSE_MS = 200;

/** Bottom sheet below the fight scene: slides up on open, down on close. */
export function SheetHost({ game }: { game: Game }) {
  const want = game.sheet.value;
  const [shown, setShown] = useState<SheetId | null>(want);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (want) {
      setShown(want);
      setClosing(false);
      return;
    }
    if (!shown) return;
    setClosing(true);
    const t = setTimeout(() => {
      setShown(null);
      setClosing(false);
    }, CLOSE_MS);
    return () => clearTimeout(t);
  }, [want]);

  if (!shown) return null;
  const top = `calc(var(--top-h) + ${Math.round(game.sceneHeight.value)}px)`;
  const icon = TABS.find((t) => t.id === shown)!.icon;
  return (
    <section class={`sheet interactive ${closing ? 'is-closing' : ''}`} style={{ top }} aria-label={SHEET_TITLES[shown]}>
      <header class="sheet-head">
        <Icon id={icon} scale={2} />
        <h2 class="sheet-title">{SHEET_TITLES[shown]}</h2>
        <button
          type="button"
          class="close-btn"
          aria-label="Close"
          onClick={() => {
            game.uiTap(true);
            game.openSheet(null);
          }}
        >
          ✕
        </button>
      </header>
      <div class="sheet-scroll" key={shown}>
        <SheetBody game={game} id={shown} />
      </div>
    </section>
  );
}

function SheetBody({ game, id }: { game: Game; id: SheetId }) {
  switch (id) {
    case 'party':
      return <PartySheet game={game} />;
    case 'healer':
      return <HealerSheet game={game} />;
    case 'acolytes':
      return <AcolytesSheet game={game} />;
    case 'deeds':
      return <DeedsSheet game={game} />;
    case 'pilgrim':
      return <PilgrimSheet game={game} />;
  }
}
