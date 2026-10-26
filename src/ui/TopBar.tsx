import type { Game } from '../app/game.ts';
import { depthOf, isBossFloor, regionOf } from '../sim/data/regions.ts';
import { fmt } from './format.ts';
import { Icon } from './Icon.tsx';
import { useSave } from './widgets.tsx';

export function TopBar({ game }: { game: Game }) {
  const s = useSave(game);
  const depth = depthOf(s.floor);
  const boss = isBossFloor(s.floor);
  const auto = s.autoAdvance;
  return (
    <header class="topbar interactive">
      <div class="tb-floor">
        <div class="tb-floor-num">
          Floor {s.floor}
          {boss && <span class="tb-boss">BOSS</span>}
        </div>
        <div class="tb-region">
          {regionOf(s.floor).name}
          {depth > 0 && <span class="tb-depth"> · Depth {depth + 1}</span>}
        </div>
      </div>
      <div class="tb-money">
        <div class="tb-pill tb-gold" aria-label="Gold">
          <Icon id="gold" scale={2} />
          <span>{fmt(s.gold)}</span>
        </div>
        {s.devotion > 0 && (
          <div class="tb-pill tb-devotion" aria-label="Devotion">
            <Icon id="devotion" scale={2} />
            <span>{fmt(s.devotion)}</span>
          </div>
        )}
      </div>
      <button
        type="button"
        class={`tb-auto ${auto ? 'is-on' : 'is-farm'}`}
        aria-label={auto ? 'Auto-advance on. Tap to farm this floor' : 'Farming this floor. Tap to advance'}
        onClick={() => {
          game.uiTap(true);
          game.setAutoAdvance(!auto);
          game.toast(auto ? `Farming floor ${s.floor}` : 'Advancing deeper', 'info');
        }}
      >
        <span class="tb-auto-glyph">{auto ? '▶▶' : '⟲'}</span>
        <span class="tb-auto-label">{auto ? 'Auto' : 'Farm'}</span>
      </button>
      <button
        type="button"
        class="tb-gear"
        aria-label="Settings"
        onClick={() => {
          game.uiTap(true);
          game.openModal({ kind: 'settings' });
        }}
      >
        <Icon id="gear" scale={2} />
      </button>
    </header>
  );
}
