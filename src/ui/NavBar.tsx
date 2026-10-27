import type { Game } from '../app/game.ts';
import { Icon } from './Icon.tsx';
import { openHealer } from './nav.ts';
import { hasBadge, lockReason, TABS, type TabId } from './status.ts';
import { useSave } from './widgets.tsx';

export function NavBar({ game }: { game: Game }) {
  const save = useSave(game);
  const open = game.sheet.value;
  const hintTab = game.hint.value?.tab;
  const press = (id: TabId) => {
    const lock = lockReason(save, id);
    if (lock) {
      game.uiTap(false);
      game.toast(lock, 'info');
      return;
    }
    game.uiTap(true);
    if (id === 'fight' || id === open) game.openSheet(null);
    else if (id === 'healer') openHealer(game);
    else game.openSheet(id);
  };
  return (
    <nav class="navbar interactive">
      {TABS.map((t) => {
        const lock = lockReason(save, t.id);
        const active = t.id === 'fight' ? open === null : open === t.id;
        const cls = [
          'nav-tab',
          active && 'is-active',
          lock && 'is-locked',
          hintTab === t.id && 'is-hinted',
        ].filter(Boolean).join(' ');
        return (
          <button type="button" class={cls} aria-label={lock ? `${t.label} (locked)` : t.label} onClick={() => press(t.id)}>
            <span class="nav-icon">
              <Icon id={lock ? 'lock' : t.icon} scale={2} />
              {!lock && hasBadge(save, t.id) && <span class={`nav-badge ${t.id === 'deeds' ? 'is-pulse' : ''}`} />}
            </span>
            <span class="nav-label">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
