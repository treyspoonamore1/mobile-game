import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import './ui.css';
import './sheets.css';
import './modals.css';
import type { Game } from '../app/game.ts';
import { ModalHost } from './modals/ModalHost.tsx';
import { NavBar } from './NavBar.tsx';
import { HintBanner, Toasts } from './Overlays.tsx';
import { SheetHost } from './SheetHost.tsx';
import { TopBar } from './TopBar.tsx';

/** The DOM overlay: top bar, nav, bottom sheets, modals, toasts and coaching hints. */
export function App({ game }: { game: Game }) {
  // Each component that reads the (mutated-in-place) save subscribes to game.version itself via useSave().
  return (
    <div class="ui">
      <TopBar game={game} />
      <SheetHost game={game} />
      <HintBanner game={game} />
      <NavBar game={game} />
      <Toasts game={game} />
      <ModalHost game={game} />
    </div>
  );
}
