import type { Game } from '../../app/game.ts';
import { salvageValue } from '../../meta/gear.ts';
import { AFFIX_INFO, itemName, itemScore, RARITIES, SLOT_INFO, type Item, type Slot } from '../../sim/data/gear.ts';
import { HEROES, heroDef, type HeroId } from '../../sim/data/heroes.ts';
import { pct } from '../format.ts';
import { HeroSprite } from '../Icon.tsx';
import { gearPanel, type GearPanel } from '../nav.ts';
import { Btn, Cost, useSave } from '../widgets.tsx';
import { ItemFrame } from './GearBits.tsx';
import { compareLines, countLike, mergePartners, rarityColor, rarityName, wornBy } from './gearUi.ts';

const close = () => (gearPanel.value = null);

/** Slides up over the sheet's content: a hero's slot picker or a bag item's card. */
export function GearPanelView({ game, panel }: { game: Game; panel: GearPanel }) {
  return (
    <div class="gpanel interactive">
      {panel.kind === 'slot' ? (
        <SlotPicker game={game} hero={panel.hero} slot={panel.slot} />
      ) : (
        <ItemCard game={game} uid={panel.uid} />
      )}
    </div>
  );
}

function PanelHead({ game, title, sub }: { game: Game; title: string; sub?: string }) {
  return (
    <header class="gpanel-head">
      <button
        type="button"
        class="close-btn"
        aria-label="Back"
        onClick={() => {
          game.uiTap(true);
          close();
        }}
      >
        ◀
      </button>
      <div class="gpanel-title">
        <b>{title}</b>
        {sub && <span>{sub}</span>}
      </div>
    </header>
  );
}

/** Stat lines of an item alone: main stat first, then affixes. */
function StatList({ item }: { item: Item }) {
  const main = SLOT_INFO[item.slot].main;
  return (
    <ul class="istats">
      <li class="is-main">
        +{pct(item.main)} {AFFIX_INFO[main].text}
      </li>
      {item.affixes.map((a) => (
        <li>
          <span class="affix-name">{AFFIX_INFO[a.kind].name}</span> +{pct(a.value)} {AFFIX_INFO[a.kind].text}
        </li>
      ))}
    </ul>
  );
}

function Compare({ next, worn }: { next: Item | undefined; worn: Item | undefined }) {
  const lines = compareLines(next, worn);
  if (lines.length === 0) return <p class="cmp cmp-same">Same as worn</p>;
  return (
    <p class="cmp">
      {lines.map((l) => (
        <span class={l.value > 0 ? 'gain' : 'loss'}>{l.text}</span>
      ))}
    </p>
  );
}

function ItemHead({ item }: { item: Item }) {
  return (
    <div class="ihead" style={{ '--rar': rarityColor(item) }}>
      <ItemFrame item={item} slot={item.slot} big />
      <div class="ihead-text">
        <b>{itemName(item)}</b>
        <span>
          {rarityName(item)} {SLOT_INFO[item.slot].name.toLowerCase()} · item level {item.ilvl}
        </span>
      </div>
    </div>
  );
}

function SlotPicker({ game, hero, slot }: { game: Game; hero: HeroId; slot: Slot }) {
  const save = useSave(game);
  const worn = wornBy(save, hero, slot);
  const bag = save.inventory.filter((it) => it.slot === slot).sort((a, b) => itemScore(b) - itemScore(a));
  const info = SLOT_INFO[slot];
  return (
    <>
      <PanelHead game={game} title={`${heroDef(hero).name}'s ${info.name.toLowerCase()}`} sub={`${bag.length} in the bag`} />
      <div class="gpanel-scroll">
        <h4 class="modal-sub">Worn</h4>
        {worn ? (
          <article class="card icard is-worn">
            <ItemHead item={worn} />
            <StatList item={worn} />
            <Btn game={game} tone="plain" class="icard-btn" onPress={() => game.unequip(hero, slot)}>
              Unequip
            </Btn>
          </article>
        ) : (
          <div class="icard-empty">
            <ItemFrame slot={slot} />
            <span>Nothing worn</span>
          </div>
        )}
        <h4 class="modal-sub">In the bag</h4>
        {bag.length === 0 && <p class="hint-text">No {info.name.toLowerCase()}s in the bag. Floors and bosses drop gear.</p>}
        {bag.map((it) => (
          <article class="card icard" key={it.uid}>
            <div class="icard-row">
              <ItemHead item={it} />
              <Btn
                game={game}
                tone={worn && itemScore(it) <= itemScore(worn) ? 'plain' : 'gold'}
                class="icard-equip"
                onPress={() => game.equip(hero, it.uid)}
              >
                Equip
              </Btn>
            </div>
            <Compare next={it} worn={worn} />
          </article>
        ))}
      </div>
    </>
  );
}

function ItemCard({ game, uid }: { game: Game; uid: number }) {
  const save = useSave(game);
  const item = save.inventory.find((it) => it.uid === uid);
  if (!item) {
    // Equipped, merged or salvaged: nothing left to show.
    queueMicrotask(close);
    return null;
  }
  const partners = mergePartners(save, item);
  const have = countLike(save, item.slot, item.rarity);
  const top = item.rarity >= RARITIES.length - 1;
  return (
    <>
      <PanelHead game={game} title={SLOT_INFO[item.slot].name} sub={`${save.inventory.length} in the bag`} />
      <div class="gpanel-scroll">
        <article class="card icard">
          <ItemHead item={item} />
          <StatList item={item} />
        </article>
        <h4 class="modal-sub">Equip on…</h4>
        <div class="equip-on">
          {HEROES.map((h) => {
            const worn = wornBy(save, h.id, item.slot);
            const delta = worn ? itemScore(item) - itemScore(worn) : 1;
            return (
              <button
                type="button"
                class="equip-hero"
                style={{ '--accent': h.color }}
                onClick={() => {
                  game.uiTap(true);
                  game.equip(h.id, item.uid);
                }}
              >
                <HeroSprite id={h.id} scale={2} />
                <b>{h.name}</b>
                <span class={!worn ? 'gain' : delta > 0 ? 'gain' : 'loss'}>
                  {!worn ? 'empty' : delta > 0 ? '▲ better' : '▼ worse'}
                </span>
              </button>
            );
          })}
        </div>
        <div class="icard-actions">
          <Btn game={game} tone="plain" class="grow" onPress={() => game.salvage(item.uid)}>
            <span>Salvage</span>
            <Cost amount={salvageValue(save, item)} />
          </Btn>
          <Btn
            game={game}
            tone="purple"
            class="grow"
            dim={!partners}
            onDim={() =>
              game.toast(
                top ? 'Mythic items are already the rarest' : `Need 3 ${rarityName(item)} ${item.slot}s (have ${have})`,
                'info',
              )
            }
            onPress={() => {
              if (partners) game.merge([item.uid, ...partners.map((p) => p.uid)]);
            }}
          >
            {top ? 'Max rarity' : `Merge → ${RARITIES[item.rarity + 1]!.name}`}
          </Btn>
        </div>
        {!top && (
          <p class="footnote">
            {partners
              ? `Merging uses this and your 2 weakest other ${rarityName(item)} ${item.slot}s.`
              : `Merge needs 3 ${rarityName(item)} ${item.slot}s: you have ${have}.`}
          </p>
        )}
      </div>
    </>
  );
}
