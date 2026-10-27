import type { Game } from '../../app/game.ts';
import { deedGold, deedProgress, type DeedProgress } from '../../meta/deeds.ts';
import { BONUS_LABEL, deedBonus, DEEDS, type BonusKind } from '../../sim/data/deeds.ts';
import { fmt, pct } from '../format.ts';
import { Icon } from '../Icon.tsx';
import { Btn, Cost, IconWell, Panel, SectionTitle, useSave } from '../widgets.tsx';

/** Ready first, then closest to done, then completed. */
function order(p: DeedProgress): number {
  if (p.ready) return 0;
  if (p.target === null) return 3;
  return 2 - Math.min(1, p.value / p.target);
}

export function DeedsSheet({ game }: { game: Game }) {
  const save = useSave(game);
  const list = DEEDS.map((d) => deedProgress(save, d.id)).sort((a, b) => order(a) - order(b));
  const ready = list.filter((p) => p.ready).length;
  const done = list.filter((p) => p.target === null).length;
  return (
    <div class="sheet-body">
      <Bonuses game={game} />
      <SectionTitle>
        Deeds <span class="count">{done}/{list.length} complete</span>
        {ready > 0 && <span class="chip chip-gold deeds-ready">{ready} ready</span>}
      </SectionTitle>
      {list.map((p) => (
        <DeedCard key={p.def.id} game={game} p={p} />
      ))}
    </div>
  );
}

function Bonuses({ game }: { game: Game }) {
  const save = useSave(game);
  const kinds = (Object.keys(BONUS_LABEL) as BonusKind[])
    .map((k) => ({ k, v: deedBonus(save.progress.deeds, k) }))
    .filter((x) => x.v > 0);
  return (
    <Panel class="deed-bonuses">
      <h3 class="howto-title">Permanent bonuses</h3>
      {kinds.length === 0 ? (
        <p class="hint-text">Claim Deeds to earn bonuses that last forever, through every Pilgrimage.</p>
      ) : (
        <div class="bonus-chips">
          {kinds.map(({ k, v }) => (
            <span class="bonus-chip">
              <b>+{pct(v)}</b> {BONUS_LABEL[k]}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

function DeedCard({ game, p }: { game: Game; p: DeedProgress }) {
  const save = useSave(game);
  const d = p.def;
  const complete = p.target === null;
  const target = p.target ?? d.tiers[d.tiers.length - 1]!;
  const frac = complete ? 1 : Math.min(1, p.value / target);
  const text = d.text.replace('{n}', fmt(target));
  const cls = ['card', 'deed-card', p.ready && 'is-ready', complete && 'is-complete'].filter(Boolean).join(' ');
  return (
    <article class={cls}>
      <div class="deed-top">
        <IconWell id={d.icon} color={complete ? '#ffcf4a' : undefined} />
        <div class="deed-main">
          <div class="up-name-row">
            <span class="up-name">{d.name}</span>
            <span class="pips deed-pips" aria-label={`${p.claimed} of ${d.tiers.length} tiers`}>
              {d.tiers.map((_, i) => (
                <i class={i < p.claimed ? 'on' : i === p.claimed && p.ready ? 'ready' : ''} />
              ))}
            </span>
          </div>
          <p class="deed-text">{text}</p>
        </div>
        {complete && <Icon id="check" scale={2} />}
      </div>
      <div class="deed-progress">
        <div class={`bar deed-bar ${p.ready || complete ? 'is-full' : ''}`}>
          <i style={{ width: `${frac * 100}%` }} />
        </div>
        <span class="deed-count">{complete ? 'Complete' : `${fmt(Math.min(p.value, target))} / ${fmt(target)}`}</span>
      </div>
      {!complete && (
        <div class="deed-foot">
          <span class="deed-reward">
            <span class="reward-bonus">+{pct(d.per)} {BONUS_LABEL[d.bonus]}</span>
            <span class="reward-gold">
              + <Cost amount={deedGold(save)} />
            </span>
          </span>
          {p.ready && (
            <Btn game={game} big class="claim-btn glow shine" onPress={() => game.claimDeed(d.id)}>
              Claim!
            </Btn>
          )}
        </div>
      )}
    </article>
  );
}
