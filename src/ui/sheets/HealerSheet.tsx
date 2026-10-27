import type { Game } from '../../app/game.ts';
import { healerSeg, type HealerSeg } from '../nav.ts';
import { segBadge } from '../status.ts';
import { Seg, useSave } from '../widgets.tsx';
import { RelicsPane } from './RelicsPane.tsx';
import { SpellsPane } from './SpellsPane.tsx';
import { TalentsPane } from './TalentsPane.tsx';

/** The healer's own growth: talents (permanent), spell upgrades (gold) and relics (this run). */
export function HealerSheet({ game }: { game: Game }) {
  const save = useSave(game);
  const seg = healerSeg.value;
  const opts: { value: HealerSeg; label: string; dot: boolean }[] = [
    { value: 'talents', label: 'Talents', dot: segBadge.talents(save) },
    { value: 'spells', label: 'Spells', dot: segBadge.spells(save) },
    { value: 'relics', label: 'Relics', dot: segBadge.relics(save) },
  ];
  return (
    <div class="sheet-body">
      <Seg game={game} class="seg-full" value={seg} options={opts} onChange={(v) => (healerSeg.value = v)} />
      {seg === 'talents' && <TalentsPane game={game} />}
      {seg === 'spells' && <SpellsPane game={game} />}
      {seg === 'relics' && <RelicsPane game={game} />}
    </div>
  );
}
