import type { Game } from '../app/game.ts';
import { TABS } from './status.ts';

/** Stacked pills under the top bar. The game removes them; they only animate in here. */
export function Toasts({ game }: { game: Game }) {
  const list = game.toasts.value;
  if (list.length === 0) return null;
  return (
    <div class="toasts" aria-live="polite">
      {list.slice(-4).map((t) => (
        <div key={t.id} class={`toast toast-${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

/**
 * Coaching banner. With a tab it sits above the nav and points down at that tab; otherwise it sits at
 * the bottom of the fight scene and points down at the party frames (the canvas highlights the frame).
 * Never takes touches.
 */
export function HintBanner({ game }: { game: Game }) {
  const h = game.hint.value;
  if (!h) return null;
  const tabIndex = h.tab ? TABS.findIndex((t) => t.id === h.tab) : -1;
  if (tabIndex >= 0) {
    const x = ((tabIndex + 0.5) / TABS.length) * 100;
    return (
      <div class="hint hint-tab" key={h.id} style={{ '--arrow-x': `${x}%` }}>
        <div class="hint-box">{h.text}</div>
        <span class="hint-arrow" />
      </div>
    );
  }
  const top = `calc(var(--top-h) + ${Math.round(game.sceneHeight.value)}px)`;
  return (
    <div class="hint hint-scene" key={h.id} style={{ top, '--arrow-x': '50%' }}>
      <div class="hint-box">{h.text}</div>
      <span class="hint-arrow" />
    </div>
  );
}
