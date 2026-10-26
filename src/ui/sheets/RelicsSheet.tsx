import type { Game } from '../../app/game.ts';
import { relicDef } from '../../sim/data/relics.ts';
import { Icon } from '../Icon.tsx';
import { Btn, IconWell, Panel, SectionTitle, useSave } from '../widgets.tsx';

export function RelicsSheet({ game }: { game: Game }) {
  const save = useSave(game);
  const owned = save.progress.relics;
  const waiting = save.relicOffers.length;
  return (
    <div class="sheet-body">
      {waiting > 0 && (
        <Btn game={game} big class="choose-relic glow" onPress={() => game.openModal({ kind: 'relic' })}>
          <Icon id="relic" scale={2} />
          <span>{waiting > 1 ? `Choose a relic (${waiting} waiting)` : 'Choose a relic'}</span>
        </Btn>
      )}
      <SectionTitle>
        Owned <span class="count">{owned.length}</span>
      </SectionTitle>
      {owned.length === 0 ? (
        <Panel class="empty">
          <Icon id="relic" scale={4} />
          <p>No relics yet. Each boss (every 10th floor) offers a choice of relics. They last until your next Pilgrimage.</p>
        </Panel>
      ) : (
        <div class="relic-grid">
          {owned.map((id) => {
            const r = relicDef(id);
            return (
              <article class="card relic-card" key={id}>
                <IconWell id={r.icon} color={r.color} scale={3} />
                <div>
                  <b class="relic-name" style={{ color: r.color }}>{r.name}</b>
                  <p class="relic-text">{r.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p class="footnote">Relics are lost on Pilgrimage.</p>
    </div>
  );
}
