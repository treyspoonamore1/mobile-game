import { signal } from '@preact/signals';
import type { Game } from '../../app/game.ts';
import { goldUpgradeVisible } from '../../meta/shop.ts';
import { PRAYERS, prayerDef, type PrayerId } from '../../sim/data/prayers.ts';
import { GOLD_UPGRADES } from '../../sim/data/upgrades.ts';
import { acolyteSlots, buildLoadout } from '../../sim/loadout.ts';
import { dec, roman } from '../format.ts';
import { Icon } from '../Icon.tsx';
import { isAco } from '../status.ts';
import { IconWell, Panel, SectionTitle, useSave } from '../widgets.tsx';
import { GoldUpgradeCard } from './SpellsPane.tsx';

/** Which slot's prayer list is open. */
const openSlot = signal<number | null>(null);

export function AcolytesSheet({ game }: { game: Game }) {
  const save = useSave(game);
  const slots = acolyteSlots(save.progress);
  return (
    <div class="sheet-body">
      <Panel class="intro">
        <Icon id="acolyte" scale={3} />
        <p>
          <b>Acolytes</b> heal on their own, following the <b>Prayer</b> you give each one. They keep the party alive
          while you play, and while you're away.
        </p>
      </Panel>
      <SectionTitle>Your Acolytes</SectionTitle>
      {Array.from({ length: slots }, (_, i) => (
        <SlotCard key={i} game={game} slot={i} />
      ))}
      <SectionTitle>Upgrades</SectionTitle>
      {GOLD_UPGRADES.filter((u) => isAco(u.id) && goldUpgradeVisible(save, u.id)).map((u) => (
        <GoldUpgradeCard key={u.id} game={game} id={u.id} />
      ))}
    </div>
  );
}

function SlotCard({ game, slot }: { game: Game; slot: number }) {
  const save = useSave(game);
  const current = save.progress.acolytes[slot] ?? 'mend_lowest';
  const def = prayerDef(current);
  const open = openSlot.value === slot;
  const interval = buildLoadout(save.progress).acolyteInterval;
  return (
    <article class={`card slot-card ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        class="slot-head"
        aria-expanded={open}
        onClick={() => {
          game.uiTap(true);
          openSlot.value = open ? null : slot;
        }}
      >
        <span class="slot-num">{roman(slot + 1)}</span>
        <IconWell id={def.icon} scale={2} />
        <span class="slot-main">
          <b>{def.name}</b>
          <span>{def.text}</span>
        </span>
        <span class="slot-change">{open ? 'Done' : 'Change'}</span>
      </button>
      {open && (
        <div class="prayer-list">
          {PRAYERS.map((p) => {
            const locked = save.bestFloor < p.unlockFloor;
            const on = p.id === current;
            return (
              <button
                type="button"
                class={`prayer ${on ? 'is-on' : ''} ${locked ? 'is-locked' : ''}`}
                aria-pressed={on}
                onClick={() => {
                  if (locked) {
                    game.uiTap(false);
                    game.toast(`${p.name} unlocks at floor ${p.unlockFloor}`, 'info');
                    return;
                  }
                  game.uiTap(true);
                  game.setPrayer(slot, p.id as PrayerId);
                  openSlot.value = null;
                }}
              >
                <Icon id={locked ? 'lock' : p.icon} scale={2} />
                <span class="prayer-main">
                  <b>{p.name}</b>
                  <span>{locked ? `Reach floor ${p.unlockFloor}` : p.text}</span>
                </span>
                {!locked && <span class="prayer-cd">{dec(interval * p.intervalMult)}s</span>}
                {on && <Icon id="check" scale={2} />}
              </button>
            );
          })}
        </div>
      )}
    </article>
  );
}
