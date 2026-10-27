// Pacing probe: how long floors take, how often the player can buy something, and how often
// something new happens, over the first N minutes of a fresh save.
//   node --experimental-strip-types tools/pace.ts [--minutes 90] [--bot skilled|novice] [--set k=v,...]
import { newSave, type Save } from '../src/meta/save.ts';
import { applyEvents, newFight, pickRelic, refreshLoadout } from '../src/meta/session.ts';
import { buyGoldUpgrade, buyHero, goldUpgradeCost, goldUpgradeVisible, heroCost } from '../src/meta/shop.ts';
import { noviceBot, skilledBot } from '../src/sim/bots.ts';
import { HERO_IDS } from '../src/sim/data/heroes.ts';
import { GOLD_UPGRADES } from '../src/sim/data/upgrades.ts';
import { DT, step } from '../src/sim/fight.ts';
import { acolyteSlots } from '../src/sim/loadout.ts';
import { T } from '../src/sim/tuning.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1]! : d;
};
for (const kv of arg('set', '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  (T as unknown as Record<string, number>)[k!] = Number(v);
}
const minutes = Number(arg('minutes', '90'));
const bot = arg('bot', 'skilled') === 'novice' ? noviceBot() : skilledBot();

/** Buys the cheapest thing; returns how many purchases were made. */
function shop(save: Save): number {
  let n = 0;
  for (let guard = 0; guard < 500; guard++) {
    const options: { cost: number; buy: () => void }[] = [];
    for (const id of HERO_IDS) options.push({ cost: heroCost(id, save.progress.heroLevels[id]) * 0.8, buy: () => buyHero(save, id, 1) });
    for (const u of GOLD_UPGRADES) {
      if (!goldUpgradeVisible(save, u.id)) continue;
      const c = goldUpgradeCost(save, u.id);
      if (c !== null) options.push({ cost: c * (u.id === 'aco_slot' ? 0.5 : 1), buy: () => buyGoldUpgrade(save, u.id) });
    }
    options.sort((a, b) => a.cost - b.cost);
    const before = save.gold;
    options[0]?.buy();
    if (save.gold === before) break;
    n++;
  }
  return n;
}

const save = newSave(1);
save.tutorial.welcome = true;
for (let i = 0; i < 7; i++) save.progress.acolytes[i] = i % 2 ? 'ward_telegraphed' : 'mend_lowest';
let fight = newFight(save);
let t = 0;
let floorStart = 0;
let shopTimer = 0;
const buys: number[] = [];
const floors: { floor: number; secs: number; boss: boolean }[] = [];
const novelty: { t: number; what: string }[] = [];
const seenEnemies = new Set<string>();
let wipes = 0;
let fightSecs = 0;
let walkSecs = 0;
let wipeSecs = 0;
while (t < minutes * 60) {
  const events = step(fight, bot(fight), DT);
  t += DT;
  if (fight.phase === 'fight') fightSecs += DT;
  else if (fight.phase === 'walk') walkSecs += DT;
  else wipeSecs += DT;
  for (const e of events) {
    if (e.type === 'floorStart') {
      floorStart = t;
      for (const en of fight.enemies) {
        if (!seenEnemies.has(en.def.id)) {
          seenEnemies.add(en.def.id);
          novelty.push({ t, what: `new enemy ${en.def.name}` });
        }
      }
    }
    if (e.type === 'floorClear') floors.push({ floor: e.floor, secs: t - floorStart, boss: e.boss });
    if (e.type === 'wipe') wipes++;
  }
  for (const n of applyEvents(save, fight, events, DT)) {
    if (n.type !== 'newBest') novelty.push({ t, what: n.type });
  }
  while (save.relicOffers.length > 0) {
    pickRelic(save, save.relicOffers[0]![0]!);
    novelty.push({ t, what: 'relic' });
  }
  shopTimer += DT;
  if (shopTimer >= 1) {
    shopTimer = 0;
    const n = shop(save);
    for (let i = 0; i < n; i++) buys.push(t);
    if (n > 0) refreshLoadout(save, fight);
  }
}

const med = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : NaN;
};
const m = (s: number) => `${(s / 60).toFixed(1)}m`;
console.log(`bot=${arg('bot', 'skilled')} ${minutes} min: best floor ${save.bestFloor}, wipes ${wipes}, acolytes ${acolyteSlots(save.progress)}`);
console.log(`time split: fighting ${((fightSecs / t) * 100).toFixed(0)}%, walking ${((walkSecs / t) * 100).toFixed(0)}%, wiped ${((wipeSecs / t) * 100).toFixed(0)}%`);
for (const [a, b] of [[1, 10], [11, 20], [21, 30], [31, 40]] as const) {
  const fs = floors.filter((f) => f.floor >= a && f.floor <= b && !f.boss).map((f) => f.secs);
  const bs = floors.filter((f) => f.floor >= a && f.floor <= b && f.boss).map((f) => f.secs);
  if (fs.length) console.log(`floors ${a}-${b}: median normal floor ${med(fs).toFixed(1)}s (n=${fs.length}), boss ${bs.length ? med(bs).toFixed(1) + 's' : '-'}`);
}
for (const [a, b] of [[0, 10], [10, 30], [30, 60], [60, 90], [90, 180]] as const) {
  const n = buys.filter((x) => x >= a * 60 && x < b * 60).length;
  if (b <= minutes) console.log(`purchases ${a}-${b} min: ${n} (${(n / (b - a)).toFixed(1)}/min)`);
}
const gaps: number[] = [];
let last = 0;
for (const n of novelty) {
  gaps.push(n.t - last);
  last = n.t;
}
console.log(`novelty events: ${novelty.length}; longest gap ${m(Math.max(...gaps, t - last))}`);
for (const n of novelty) console.log(`  ${m(n.t).padStart(6)}  ${n.what}`);
