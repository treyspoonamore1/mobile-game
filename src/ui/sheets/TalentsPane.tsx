import { signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import type { Game } from '../../app/game.ts';
import { unspentPoints, xpToNext } from '../../meta/healer.ts';
import {
  branchPoints, canLearn, rank, spentPoints, talentDef, talentText, TALENT_BRANCHES, TALENT_TIERS, TALENTS,
  type TalentBranch, type TalentDef, type TalentId,
} from '../../sim/data/talents.ts';
import { fmt } from '../format.ts';
import { Icon } from '../Icon.tsx';
import { Btn, Panel, useSave } from '../widgets.tsx';

/** The node whose detail card is open. */
const selected = signal<TalentId | null>(null);

const branchOf = (id: TalentBranch) => TALENT_BRANCHES.find((b) => b.id === id)!;

export function TalentsPane({ game }: { game: Game }) {
  const sel = selected.value;
  return (
    <>
      <LevelPanel game={game} />
      <TalentTree game={game} />
      {sel && <TalentDetail game={game} id={sel} />}
    </>
  );
}

function LevelPanel({ game }: { game: Game }) {
  const save = useSave(game);
  const [confirm, setConfirm] = useState(false);
  const need = xpToNext(save.healerLevel);
  const frac = Math.min(1, save.healerXp / need);
  const unspent = unspentPoints(save);
  const spent = spentPoints(save.progress.talents);
  return (
    <Panel class="hl-panel">
      <div class="hl-top">
        <div class="hl-level">
          <span>Lv</span>
          <b>{save.healerLevel}</b>
        </div>
        <div class="hl-xp">
          <span class="hl-label">Healer level</span>
          <div class="bar xp-bar">
            <i style={{ width: `${frac * 100}%` }} />
          </div>
          <span class="hl-xp-num">
            {fmt(save.healerXp)} / {fmt(need)} XP
          </span>
        </div>
        <div class={`hl-points ${unspent > 0 ? 'has-points' : ''}`}>
          <b>{unspent}</b>
          <span>{unspent === 1 ? 'point' : 'points'}</span>
        </div>
      </div>
      {confirm ? (
        <div class="hl-confirm">
          <p>Refund all {spent} points? You can spend them again right away.</p>
          <div class="set-buttons">
            <Btn game={game} tone="plain" onPress={() => setConfirm(false)}>Cancel</Btn>
            <Btn
              game={game}
              tone="red"
              onPress={() => {
                game.resetTalents();
                selected.value = null;
                setConfirm(false);
              }}
            >
              Reset
            </Btn>
          </div>
        </div>
      ) : (
        <div class="hl-foot">
          <p class="hint-text">Heal to earn XP: one point per level. Talents are permanent and respec is free.</p>
          <Btn
            game={game}
            tone="plain"
            class="hl-reset"
            dim={spent === 0}
            onDim={() => game.toast('No talent points spent yet', 'info')}
            onPress={() => setConfirm(true)}
          >
            Reset
          </Btn>
        </div>
      )}
    </Panel>
  );
}

function TalentTree({ game }: { game: Game }) {
  const save = useSave(game);
  const t = save.progress.talents;
  const unspent = unspentPoints(save);
  return (
    <div class="tree">
      {TALENT_BRANCHES.map((b) => (
        <div class="tree-head" style={{ '--br': b.color }}>
          <b>{b.name}</b>
          <span>{branchPoints(t, b.id)} {branchPoints(t, b.id) === 1 ? 'pt' : 'pts'}</span>
        </div>
      ))}
      {TALENT_TIERS.map((req, ti) =>
        TALENT_BRANCHES.map((b) => {
          const have = branchPoints(t, b.id);
          const open = have >= req;
          const nextOpen = ti < TALENT_TIERS.length - 1 && have >= TALENT_TIERS[ti + 1]!;
          const nodes = (TALENTS as readonly TalentDef[]).filter((d) => d.branch === b.id && d.requires === req);
          const cls = [
            'tree-cell',
            open && 'is-open',
            ti > 0 && 'wire-up',
            ti < TALENT_TIERS.length - 1 && 'wire-down',
            nextOpen && 'next-open',
            ti === TALENT_TIERS.length - 1 && 'is-last',
          ].filter(Boolean).join(' ');
          return (
            <div class={cls} style={{ '--br': b.color }}>
              <div class={`tree-nodes ${nodes.length > 1 ? 'is-pair' : ''}`}>
                {nodes.map((d) => (
                  <Node key={d.id} game={game} def={d} r={rank(t, d.id)} open={open} learnable={canLearn(t, d.id, unspent)} />
                ))}
              </div>
              {!open && <span class="tree-need">Needs {req} pts</span>}
            </div>
          );
        }),
      )}
    </div>
  );
}

function Node({ game, def, r, open, learnable }: { game: Game; def: TalentDef; r: number; open: boolean; learnable: boolean }) {
  const on = selected.value === def.id;
  const cls = [
    'tnode',
    !open && 'is-locked',
    r > 0 && 'is-learned',
    r >= def.maxRank && 'is-max',
    learnable && 'is-learnable',
    on && 'is-selected',
  ].filter(Boolean).join(' ');
  return (
    <div class="tnode-wrap">
      <button
        type="button"
        class={cls}
        aria-label={`${def.name}, rank ${r} of ${def.maxRank}`}
        aria-pressed={on}
        onClick={() => {
          game.uiTap(true);
          selected.value = on ? null : def.id;
        }}
      >
        <Icon id={def.icon} scale={2} />
        {!open && (
          <span class="tnode-lock">
            <Icon id="lock" scale={1} />
          </span>
        )}
      </button>
      <span class="pips" aria-hidden="true">
        {Array.from({ length: def.maxRank }, (_, i) => (
          <i class={i < r ? 'on' : ''} />
        ))}
      </span>
    </div>
  );
}

function TalentDetail({ game, id }: { game: Game; id: TalentId }) {
  const save = useSave(game);
  const def = talentDef(id);
  const b = branchOf(def.branch);
  const t = save.progress.talents;
  const r = rank(t, id);
  const have = branchPoints(t, def.branch);
  const unspent = unspentPoints(save);
  const max = r >= def.maxRank;
  const locked = have < def.requires;
  const ok = canLearn(t, id, unspent);
  const why = max
    ? 'Already at max rank'
    : locked
      ? `Needs ${def.requires} points in ${b.name}`
      : 'No talent points left. Level up by healing!';
  return (
    <div class="tdetail" style={{ '--br': b.color }}>
      <div class="tdetail-head">
        <span class="tdetail-icon">
          <Icon id={def.icon} scale={2} />
        </span>
        <div class="tdetail-title">
          <b>{def.name}</b>
          <span>
            {b.name} · Rank {r}/{def.maxRank}
          </span>
        </div>
        <button type="button" class="close-btn" aria-label="Close" onClick={() => {
            game.uiTap(true);
            selected.value = null;
          }}>
          ✕
        </button>
      </div>
      {r > 0 && (
        <p class="tdetail-line">
          <span class="tag">Now</span> {talentText(id, r)}
        </p>
      )}
      {!max && (
        <p class="tdetail-line">
          <span class="tag tag-next">{r > 0 ? 'Next' : 'Rank 1'}</span> {talentText(id, r + 1)}
        </p>
      )}
      {locked && <p class="tdetail-need">Needs {def.requires} points in {b.name} (you have {have})</p>}
      {max ? (
        <div class="maxed tdetail-max">MAX RANK</div>
      ) : (
        <Btn game={game} class="tdetail-learn" dim={!ok} onDim={() => game.toast(why, 'info')} onPress={() => game.learnTalent(id)}>
          {r > 0 ? 'Learn next rank' : 'Learn'} · 1 point
        </Btn>
      )}
    </div>
  );
}
