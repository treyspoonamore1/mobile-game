import { signal } from '@preact/signals';
import type { Game } from '../../app/game.ts';
import { heroBulk } from '../../meta/shop.ts';
import type { HeroId } from '../../sim/data/heroes.ts';
import { buildLoadout, type HeroStats, type Progress } from '../../sim/loadout.ts';
import { T } from '../../sim/tuning.ts';
import { dec, fmt } from '../format.ts';
import { BagPane } from '../gear/BagPane.tsx';
import { GearRow } from '../gear/GearBits.tsx';
import { HeroSprite, Icon } from '../Icon.tsx';
import { newUpgrades, partySeg, type PartySeg } from '../nav.ts';
import { Btn, Cost, Seg, useSave } from '../widgets.tsx';

/** Bulk-buy mode, kept while the app runs. */
const bulk = signal<1 | 10 | 'max'>(1);
const BULK_OPTS = [
  { value: 1 as const, label: '×1' },
  { value: 10 as const, label: '×10' },
  { value: 'max' as const, label: 'Max' },
];

function withLevels(p: Progress, id: HeroId, add: number): Progress {
  return { ...p, heroLevels: { ...p.heroLevels, [id]: p.heroLevels[id] + add } };
}

export function PartySheet({ game }: { game: Game }) {
  const save = useSave(game);
  const now = buildLoadout(save.progress).heroes;
  const max = bulk.value === 'max' ? Infinity : bulk.value;
  const seg = partySeg.value;
  const segs: { value: PartySeg; label: string; dot?: boolean }[] = [
    { value: 'heroes', label: 'Heroes' },
    { value: 'bag', label: `Bag ${save.inventory.length}`, dot: seg !== 'bag' && newUpgrades(save) },
  ];
  return (
    <div class="sheet-body">
      <Seg game={game} class="seg-full" value={seg} options={segs} onChange={(v) => (partySeg.value = v)} />
      {seg === 'bag' ? (
        <BagPane game={game} />
      ) : (
        <>
          <div class="row-between">
            <p class="hint-text">Level heroes up, and tap a slot to change their gear.</p>
            <Seg game={game} value={bulk.value} options={BULK_OPTS} onChange={(v) => (bulk.value = v)} />
          </div>
          {now.map((h) => (
            <HeroCard key={h.def.id} game={game} stats={h} max={max} />
          ))}
        </>
      )}
    </div>
  );
}

function HeroCard({ game, stats, max }: { game: Game; stats: HeroStats; max: number }) {
  const save = useSave(game);
  const id = stats.def.id as HeroId;
  const level = save.progress.heroLevels[id];
  const { n, cost } = heroBulk(save, id, max);
  const buyN = n > 0 ? n : 1;
  const next = buildLoadout(withLevels(save.progress, id, buyN)).heroes.find((x) => x.def.id === id)!;
  const ms = T.heroMilestoneEvery;
  const nextMilestone = (Math.floor(level / ms) + 1) * ms;
  const afford = n > 0;
  return (
    <article class="card hero-card" style={{ '--accent': stats.def.color }}>
      <div class="hero-portrait">
        <HeroSprite id={id} scale={3} />
      </div>
      <div class="hero-main">
        <div class="hero-name-row">
          <span class="hero-name">{stats.def.name}</span>
          <span class="chip">{stats.def.role}</span>
          <span class="lv">Lv {level}</span>
        </div>
        <p class="hero-quirk">{stats.def.quirk}</p>
        <div class="hero-foot">
          <div class="hero-stats">
            <span class="stat">
              <Icon id="heart" scale={1} />
              <b>{fmt(stats.maxHp)}</b>
              <i class="gain">+{fmt(next.maxHp - stats.maxHp)}</i>
            </span>
            <span class="stat">
              <Icon id="sword" scale={1} />
              <b>{dec(stats.atk)}</b>
              <i class="gain">+{dec(next.atk - stats.atk)}</i>
            </span>
            <span class="milestone">×{T.heroMilestoneMult} power at Lv {nextMilestone}</span>
          </div>
          <Btn game={game} dim={!afford} class="buy-btn" onPress={() => game.buyHero(id, max)}>
            <span class="buy-top">Lv +{buyN}</span>
            <Cost amount={cost} />
          </Btn>
        </div>
      </div>
      <GearRow game={game} hero={id} />
    </article>
  );
}
