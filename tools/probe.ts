// Probe: with a fixed party, which 5-floor checkpoint segments can each bot clear, and how fast?
//   node --experimental-strip-types tools/probe.ts [--level 20] [--from 1] [--to 60] [--acos 0]
//        [--upg mend_power=5,mana_regen=3] [--dev might=2] [--bots idle,novice,skilled] [--tries 3]
// A segment starts at a checkpoint with a full party and must reach the next checkpoint without a wipe.
import { idleBot, noviceBot, skilledBot, type Bot } from '../src/sim/bots.ts';
import type { DevotionUpgradeId, GoldUpgradeId } from '../src/sim/data/upgrades.ts';
import type { PrayerId } from '../src/sim/data/prayers.ts';
import { RELICS, type RelicId } from '../src/sim/data/relics.ts';
import { createFight, step } from '../src/sim/fight.ts';
import { floorGold } from '../src/sim/floors.ts';
import { buildLoadout } from '../src/sim/loadout.ts';
import { T } from '../src/sim/tuning.ts';
import { freshProgress } from '../tests/helpers.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1]! : d;
};
const kv = (s: string) =>
  Object.fromEntries(s.split(',').filter(Boolean).map((p) => [p.split('=')[0]!, Number(p.split('=')[1])]));

for (const kv of arg('set', '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  (T as unknown as Record<string, number>)[k!] = Number(v);
}
const level = Number(arg('level', '1'));
/** Segment length: 5 = checkpoint to checkpoint, 1 = single floors (fresh party each). */
const SEG = Number(arg('seg', String(T.checkpointEvery)));
const from = Number(arg('from', '1'));
const to = Number(arg('to', '30'));
const acos = Number(arg('acos', '0'));
const tries = Number(arg('tries', '3'));
const botNames = arg('bots', 'idle,novice,skilled').split(',');
const ACO_ORDER: PrayerId[] = ['mend_lowest', 'ward_telegraphed', 'top_up', 'ward_tank', 'cleanse', 'mend_all', 'revive'];
const progress = freshProgress({
  heroLevels: { tomas: level, brann: level, ilse: level, wren: level },
  upgrades: { ...kv(arg('upg', '')), aco_slot: Math.max(0, acos - 1) } as Partial<Record<GoldUpgradeId, number>>,
  devotionUpgrades: kv(arg('dev', '')) as Partial<Record<DevotionUpgradeId, number>>,
  acolytes: ACO_ORDER.slice(0, acos),
  maxFloor: acos > 0 ? 99 : 1,
  relics: (arg('relics', '') === 'all' ? RELICS.map((r) => r.id) : arg('relics', '').split(',').filter(Boolean)) as RelicId[],
});
// --progress '<json>' probes an exact state dumped by tools/balance.ts --dump.
const loadout = buildLoadout(args.includes('--progress') ? (JSON.parse(arg('progress', '{}')) as typeof progress) : progress);
const bots: Record<string, () => Bot> = { idle: () => idleBot, novice: () => noviceBot(), skilled: () => skilledBot() };

/** Can this bot clear segment [cp, cp+5) with heroes scaled by `power`, in all tries? */
function clears(name: string, cp: number, power: number): boolean {
  const L = { ...loadout, heroes: loadout.heroes.map((h) => ({ ...h, maxHp: h.maxHp * power, atk: h.atk * power })) };
  for (let k = 0; k < tries; k++) {
    const s = createFight(L, cp, 1000 + k * 17 + cp);
    const bot = bots[name]!();
    let won = false;
    for (let i = 0; i < 60 * 900 && !won; i++) {
      if (step(s, bot(s)).some((e) => e.type === 'wipe')) break;
      won = s.floor >= cp + SEG;
    }
    if (!won) return false;
  }
  return true;
}

if (args.includes('--need')) {
  // Hero power multiplier (on top of --level) each bot needs per segment, and its growth per floor.
  console.log(`power needed (x level ${level}, ${acos} acolytes); growth = per-floor ratio vs previous segment`);
  const prev: Record<string, number> = {};
  for (let cp = SEG === 1 ? from : from - ((from - 1) % SEG); cp <= to; cp += SEG) {
    const cells: string[] = [];
    for (const name of botNames) {
      let lo = prev[name] ? Math.log(prev[name]!) - 2 : Math.log(0.01);
      let hi = prev[name] ? lo + 8 : Math.log(1e4);
      for (let it = 0; it < 16; it++) {
        const mid = (lo + hi) / 2;
        if (clears(name, cp, Math.exp(mid))) hi = mid;
        else lo = mid;
      }
      const need = Math.exp(hi);
      const g = prev[name] ? Math.pow(need / prev[name]!, 1 / SEG) : 0;
      prev[name] = need;
      cells.push(`${need.toExponential(2)} ${g ? `x${g.toFixed(3)}` : ''}`.padEnd(22));
    }
    console.log(`F${String(cp).padEnd(3)}-${String(cp + 4).padEnd(4)}${cells.join('')} gold/floor ${floorGold(cp).toExponential(1)}`);
  }
  process.exit(0);
}

console.log(`level ${level}, acolytes ${acos}, hero hp ${loadout.heroes.map((h) => h.maxHp.toFixed(0)).join('/')}`);
console.log('seg      ' + botNames.map((b) => b.padEnd(22)).join(''));
for (let cp = SEG === 1 ? from : from - ((from - 1) % SEG); cp <= to; cp += SEG) {
  const cells: string[] = [];
  for (const name of botNames) {
    let wins = 0;
    let time = 0;
    let reached = 0;
    for (let k = 0; k < tries; k++) {
      const s = createFight(loadout, cp, 1000 + k * 17 + cp);
      const bot = bots[name]!();
      let won = false;
      for (let i = 0; i < 60 * 600; i++) {
        const ev = step(s, bot(s));
        if (ev.some((e) => e.type === 'wipe')) break;
        if (s.floor >= cp + SEG) {
          won = true;
          break;
        }
      }
      reached += s.floor - cp;
      if (won) {
        wins++;
        time += s.t;
      }
    }
    const cell = wins > 0 ? `${wins}/${tries} ${(time / wins).toFixed(0)}s` : `0/${tries} @+${(reached / tries).toFixed(1)}`;
    cells.push(cell.padEnd(22));
  }
  console.log(`F${String(cp).padEnd(3)}-${String(cp + 4).padEnd(4)}${cells.join('')} gold/floor ${floorGold(cp).toExponential(1)}`);
}
