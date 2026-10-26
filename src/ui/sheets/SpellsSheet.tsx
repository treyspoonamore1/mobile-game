import type { Game } from '../../app/game.ts';
import type { Save } from '../../meta/save.ts';
import { goldUpgradeCost, goldUpgradeVisible } from '../../meta/shop.ts';
import type { IconName } from '../../sim/data/icons.ts';
import { orderDef } from '../../sim/data/orders.ts';
import { GOLD_UPGRADES, type GoldUpgradeId } from '../../sim/data/upgrades.ts';
import { buildLoadout, type Loadout, type Progress } from '../../sim/loadout.ts';
import { T } from '../../sim/tuning.ts';
import { dec, fmt, pct } from '../format.ts';
import { Icon } from '../Icon.tsx';
import { isAco } from '../status.ts';
import { Btn, Cost, IconWell, Panel, SectionTitle, useSave } from '../widgets.tsx';

export function withUpgrade(p: Progress, id: GoldUpgradeId): Progress {
  return { ...p, upgrades: { ...p.upgrades, [id]: (p.upgrades[id] ?? 0) + 1 } };
}

/** "what it does now" for each gold upgrade, read from a loadout. */
const VALUE: Record<GoldUpgradeId, { label: string; get: (l: Loadout) => string; unit?: string }> = {
  mend_power: { label: 'Heals', get: (l) => pct(l.mendPct * l.healMult), unit: 'of max life' },
  ward_power: { label: 'Shield', get: (l) => pct(l.wardPct * l.healMult), unit: 'of max life' },
  mana_max: { label: 'Max mana', get: (l) => fmt(Math.round(l.manaMax)) },
  mana_regen: { label: 'Regen', get: (l) => dec(l.manaRegen), unit: 'mana/s' },
  chain_power: { label: 'Each target', get: (l) => pct(l.chainEff), unit: 'of a Mend' },
  aco_slot: { label: 'Acolytes', get: (l) => String(l.acolytes.length) },
  aco_power: { label: 'Power', get: (l) => pct(l.acolytePotency), unit: 'of your spells' },
  aco_speed: { label: 'Casts every', get: (l) => dec(l.acolyteInterval), unit: 's' },
};

/** One shop row for a gold upgrade: icon, level, now -> next, cost. */
export function GoldUpgradeCard({ game, id }: { game: Game; id: GoldUpgradeId }) {
  const save = useSave(game);
  const def = GOLD_UPGRADES.find((u) => u.id === id)!;
  const level = save.progress.upgrades[id] ?? 0;
  const cost = goldUpgradeCost(save, id);
  const v = VALUE[id];
  const now = v.get(buildLoadout(save.progress));
  const next = cost === null ? null : v.get(buildLoadout(withUpgrade(save.progress, id)));
  return (
    <article class="card up-card">
      <IconWell id={def.icon} />
      <div class="up-main">
        <div class="up-name-row">
          <span class="up-name">{def.name}</span>
          <span class="lv">
            Lv {level}
            {'max' in def && <span class="lv-max">/{def.max}</span>}
          </span>
        </div>
        <p class="up-text">{def.text}</p>
        <p class="up-value">
          {v.label} <b>{now}</b>
          {next !== null && next !== now && (
            <>
              <span class="arrow">→</span>
              <b class="gain">{next}</b>
            </>
          )}
          {v.unit && <span class="unit"> {v.unit}</span>}
        </p>
      </div>
      {cost === null ? (
        <div class="maxed">MAX</div>
      ) : (
        <Btn game={game} dim={cost > save.gold} class="buy-btn" onPress={() => game.buyGold(id)}>
          <span class="buy-top">Upgrade</span>
          <Cost amount={cost} />
        </Btn>
      )}
    </article>
  );
}

/** A teaser row for an upgrade that is not on sale yet. */
export function LockedRow({ icon, name, why }: { icon: IconName; name: string; why: string }) {
  return (
    <article class="card up-card is-locked">
      <IconWell id={icon} />
      <div class="up-main">
        <span class="up-name">{name}</span>
        <p class="up-text">{why}</p>
      </div>
      <Icon id="lock" scale={2} />
    </article>
  );
}

function lockedFloor(save: Save, id: GoldUpgradeId): number | null {
  if (goldUpgradeVisible(save, id)) return null;
  const def = GOLD_UPGRADES.find((u) => u.id === id)!;
  return 'unlockFloor' in def ? def.unlockFloor : 0;
}

export function SpellsSheet({ game }: { game: Game }) {
  const save = useSave(game);
  const ups = GOLD_UPGRADES.filter((u) => !isAco(u.id));
  return (
    <div class="sheet-body">
      <SectionTitle>Upgrades</SectionTitle>
      {ups.map((u) => {
        const floor = lockedFloor(save, u.id);
        return floor === null ? (
          <GoldUpgradeCard key={u.id} game={game} id={u.id} />
        ) : (
          <LockedRow key={u.id} icon={u.icon} name={u.name} why={`Reach floor ${floor} to unlock`} />
        );
      })}
      <HowToHeal game={game} />
    </div>
  );
}

function HowToHeal({ game }: { game: Game }) {
  const save = useSave(game);
  const order = orderDef(save.progress.order);
  const l = buildLoadout(save.progress);
  const rows: [string, IconName, string, string][] = [
    ['Tap', 'mend', 'Mend', `Heal one hero · ${fmt(l.mendCost)} mana`],
    ['Hold', order.icon, order.hold, order.id === 'cleric' ? 'Shield a hero for 6 s. Time it for a Perfect!' : order.text.split('.')[0] + '.'],
    ['Swipe', 'chain', 'Chain Mend', 'Drag across frames to heal each'],
    ['Tap fallen', 'revive', 'Revive', `Bring a hero back · ${T.reviveCost} mana`],
    ['Full', 'sanctuary', 'Sanctuary', 'At full Resonance: heal all, cut damage'],
  ];
  return (
    <Panel class="howto">
      <h3 class="howto-title">How to heal</h3>
      {rows.map(([g, icon, name, text]) => (
        <div class="howto-row">
          <span class="gesture">{g}</span>
          <Icon id={icon} scale={2} />
          <div class="howto-text">
            <b>{name}</b>
            <span>{text}</span>
          </div>
        </div>
      ))}
    </Panel>
  );
}
