import type { Game } from '../../app/game.ts';
import type { Save } from '../../meta/save.ts';
import { canPilgrimage, devotionFor, orderUnlocked, startFloor } from '../../meta/pilgrimage.ts';
import { devotionUpgradeCost } from '../../meta/shop.ts';
import { ORDERS } from '../../sim/data/orders.ts';
import { DEVOTION_UPGRADES, type DevotionUpgradeId } from '../../sim/data/upgrades.ts';
import { T } from '../../sim/tuning.ts';
import { fmt, pct } from '../format.ts';
import { Icon } from '../Icon.tsx';
import { Btn, Cost, IconWell, Panel, SectionTitle, useSave } from '../widgets.tsx';

/** What a Devotion upgrade adds up to at a level. */
function devotionNow(save: Save, id: DevotionUpgradeId, lvl: number): string | null {
  if (lvl === 0) return null;
  switch (id) {
    case 'might': return `×${Math.pow(1.25, lvl).toFixed(2)} life and damage`;
    case 'fortune': return `×${fmt(Math.pow(1.3, lvl))} gold`;
    case 'grace': return `+${lvl * 8}% healing`;
    case 'spirit': return `+${lvl * 15}% regen`;
    case 'choir': return `+${lvl} Acolyte slot${lvl > 1 ? 's' : ''}`;
    case 'haste': return `Start at floor ${startFloor(save)}`;
    case 'vigil': return `${T.offlineCapHours + 2 * lvl} h offline, ${pct(T.offlineEfficiency + 0.1 * lvl)} gold`;
    default: return 'Owned';
  }
}

/** The next few floors worth climbing to, and what they pay. */
function milestones(maxFloor: number): { floor: number; dev: number }[] {
  const from = Math.max(T.pilgrimageFloor, Math.floor(maxFloor / 5) * 5 + 5);
  return [0, 5, 10, 15].map((d) => ({ floor: from + d, dev: devotionFor(from + d) }));
}

export function PilgrimSheet({ game }: { game: Game }) {
  const save = useSave(game);
  const gain = devotionFor(save.progress.maxFloor);
  const can = canPilgrimage(save);
  return (
    <div class="sheet-body">
      <Panel class="dev-hero">
        <div class="dev-balance">
          <Icon id="devotion" scale={3} />
          <div>
            <span class="dev-num">{fmt(save.devotion)}</span>
            <span class="dev-label">Devotion</span>
          </div>
        </div>
        <div class="dev-side">
          <span>Pilgrimages</span>
          <b>{save.pilgrimages}</b>
        </div>
      </Panel>

      <Panel class="pilgrim-now">
        <p class="pilgrim-lead">
          Retire this party and begin anew, stronger. You gain Devotion for the deepest floor of this run
          (best: <b>{save.progress.maxFloor}</b>).
        </p>
        <div class="milestones">
          <div class={`ms ms-now ${can ? '' : 'is-off'}`}>
            <span>Now</span>
            <b>+{gain}</b>
          </div>
          {milestones(save.progress.maxFloor).map((m) => (
            <div class="ms">
              <span>F{m.floor}</span>
              <b>+{m.dev}</b>
            </div>
          ))}
        </div>
        <Btn
          game={game}
          big
          tone="purple"
          dim={!can}
          class="pilgrim-btn"
          onDim={() => game.toast(`Reach floor ${T.pilgrimageFloor} to make a Pilgrimage`, 'info')}
          onPress={() => game.openModal({ kind: 'pilgrimage' })}
        >
          <Icon id="pilgrim" scale={2} />
          <span>{can ? `Pilgrimage  +${gain}` : `Reach floor ${T.pilgrimageFloor}`}</span>
        </Btn>
      </Panel>

      <SectionTitle>Devotion upgrades</SectionTitle>
      {DEVOTION_UPGRADES.map((u) => {
        const lvl = save.progress.devotionUpgrades[u.id] ?? 0;
        const cost = devotionUpgradeCost(save, u.id);
        const now = devotionNow(save, u.id, lvl);
        return (
          <article class="card up-card" key={u.id}>
            <IconWell id={u.icon} color="#3b2a5c" />
            <div class="up-main">
              <div class="up-name-row">
                <span class="up-name">{u.name}</span>
                <span class="lv">
                  Lv {lvl}
                  {'max' in u && <span class="lv-max">/{u.max}</span>}
                </span>
              </div>
              <p class="up-text">{u.text}</p>
              {now && <p class="up-value"><b class="dev">{now}</b></p>}
            </div>
            {cost === null ? (
              <div class="maxed">MAX</div>
            ) : (
              <Btn game={game} tone="purple" dim={cost > save.devotion} class="buy-btn" onPress={() => game.buyDevotion(u.id)}>
                <span class="buy-top">{lvl === 0 ? 'Learn' : 'Upgrade'}</span>
                <Cost amount={cost} currency="devotion" />
              </Btn>
            )}
          </article>
        );
      })}

      <SectionTitle>Orders</SectionTitle>
      <p class="hint-text">Your healer class. Choose one at each Pilgrimage.</p>
      {ORDERS.map((o) => {
        const unlocked = orderUnlocked(save, o.id);
        const active = save.progress.order === o.id;
        return (
          <article class={`card order-card ${unlocked ? '' : 'is-locked'} ${active ? 'is-active' : ''}`} key={o.id}>
            <IconWell id={unlocked ? o.icon : 'lock'} color="#3b2a5c" />
            <div class="up-main">
              <div class="up-name-row">
                <span class="up-name">{o.name}</span>
                {active && <span class="chip chip-gold">Current</span>}
                {!unlocked && <span class="chip">Locked</span>}
              </div>
              <p class="up-text">
                <b>Hold: {o.hold}.</b> {o.text}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
