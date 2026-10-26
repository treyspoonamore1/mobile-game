// Quick probe: how far does each bot get with given hero levels?
import { idleBot, noviceBot, skilledBot, type Bot } from '../src/sim/bots.ts';
import { createFight, step } from '../src/sim/fight.ts';
import { buildLoadout } from '../src/sim/loadout.ts';
import { freshProgress } from '../tests/helpers.ts';

const level = Number(process.argv[2] ?? 1);
const startFloor = Number(process.argv[3] ?? 1);
const bots: Record<string, () => Bot> = { idle: () => idleBot, novice: () => noviceBot(), skilled: () => skilledBot() };
for (const [name, make] of Object.entries(bots)) {
  const p = freshProgress({ heroLevels: { tomas: level, brann: level, ilse: level, wren: level } });
  const s = createFight(buildLoadout(p), startFloor, 1);
  const bot = make();
  let best = startFloor;
  let firstWipe = 0;
  for (let i = 0; i < 60 * 600; i++) {
    for (const e of step(s, bot(s))) {
      if (e.type === 'wipe' && !firstWipe) firstWipe = e.floor;
    }
    best = Math.max(best, s.floor);
  }
  console.log(`${name.padEnd(8)} lvl ${level}: best floor ${best}, first wipe at ${firstWipe || '-'}, gold ${s.stats.gold.toFixed(0)}, perfects ${s.stats.perfects}, saves ${s.stats.saves}, wipes ${s.stats.wipes}`);
}
