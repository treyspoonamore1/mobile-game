// Pacing probe: how long floors take, how often the player can buy something, and how often
// something new happens, over the first N minutes of a fresh save.
//   node --experimental-strip-types tools/pace.ts [--minutes 90] [--bot skilled|novice] [--set k=v,...] [--quiet]
// --bot novice is the casual player of tools/policy.ts (taps the lowest hero, revives fallen ones).
// Uses the same player policy as tools/balance.ts (tools/policy.ts): shops, picks relics, sets Prayers,
// learns talents, claims Deeds and goes on Pilgrimage (unless --no-pilgrimage).
import { pilgrimage } from '../src/meta/pilgrimage.ts';
import { newSave } from '../src/meta/save.ts';
import { applyEvents, newFight, refreshLoadout } from '../src/meta/session.ts';
import { skilledBot } from '../src/sim/bots.ts';
import { HERO_IDS } from '../src/sim/data/heroes.ts';
import { DT, step } from '../src/sim/fight.ts';
import { acolyteSlots } from '../src/sim/loadout.ts';
import { T } from '../src/sim/tuning.ts';
import { manageGear, assignPrayers, casualBot, claimDeeds, learnTalents, pickRelics, shop, shopDevotion, wantsPilgrimage } from './policy.ts';

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
const quiet = args.includes('--quiet');
const noPilgrimage = args.includes('--no-pilgrimage');
const noGear = args.includes('--no-gear');
const makeBot = () => (arg('bot', 'skilled') === 'novice' ? casualBot() : skilledBot());
let bot = makeBot();

const save = newSave(Number(arg('seed', '1')));
save.tutorial.welcome = true;
let fight = newFight(save);
let runMax = 1;
let runMaxAt = 0;
let prevRunMax = 0;
let earned = 0;
let t = 0;
let floorStart = 0;
let shopTimer = 0;
const buys: number[] = [];
const floors: { floor: number; secs: number; boss: boolean; frontier: boolean }[] = [];
const wipesAt: { floor: number; secs: number; frontier: boolean }[] = [];
const novelty: { t: number; what: string }[] = [];
const seenEnemies = new Set<string>();
let fightSecs = 0;
/** Recent gold from play (kills etc.), for expressing Deed payouts in minutes of income. */
const incomeLog: { t: number; g: number }[] = [];
const deedMinutes: number[] = [];
let walkSecs = 0;
let wipeSecs = 0;
const milestoneOf = () => Math.max(...HERO_IDS.map((id) => Math.floor(save.progress.heroLevels[id] / T.heroMilestoneEvery)));
let heroMilestone = milestoneOf();
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
    // "Frontier": within 5 floors of this run's deepest floor (not farming or re-climbing below it).
    const frontier = e.type !== 'floorStart' && 'floor' in e && e.floor >= save.progress.maxFloor - 4;
    if (e.type === 'floorClear') floors.push({ floor: e.floor, secs: t - floorStart, boss: e.boss, frontier });
    if (e.type === 'gold') incomeLog.push({ t, g: e.amount });
    if (e.type === 'wipe') wipesAt.push({ floor: e.floor, secs: t - floorStart, frontier });
  }
  for (const n of applyEvents(save, fight, events, DT)) {
    if (n.type === 'healerLevel') novelty.push({ t, what: `healer level ${n.level}` });
    else if (n.type !== 'newBest' && n.type !== 'deedReady' && n.type !== 'relicOffer') novelty.push({ t, what: n.type });
  }
  if (pickRelics(save) > 0) novelty.push({ t, what: `relic (${save.progress.relics.length})` });
  shopTimer += DT;
  if (shopTimer >= 1) {
    shopTimer = 0;
    assignPrayers(save);
    const deeds = claimDeeds(save);
    while (incomeLog.length && incomeLog[0]!.t < t - 120) incomeLog.shift();
    const perMin = incomeLog.reduce((a, x) => a + x.g, 0) / 2;
    for (const d of deeds) {
      const mins = perMin > 0 ? d.gold / perMin : 0;
      if (t > 120) deedMinutes.push(mins);
      novelty.push({ t, what: `deed ${d.name} ${d.tier} (+${d.gold} gold = ${mins.toFixed(1)} min of income)` });
    }
    const learned = learnTalents(save);
    const n = shop(save);
    for (let i = 0; i < n; i++) buys.push(t);
    const ms = milestoneOf();
    if (ms > heroMilestone) {
      heroMilestone = ms;
      novelty.push({ t, what: `hero milestone (level ${ms * T.heroMilestoneEvery})` });
    }
    const gearChanged = !noGear && manageGear(save);
    if (n > 0 || deeds.length > 0 || learned > 0 || gearChanged) refreshLoadout(save, fight);
    if (save.progress.maxFloor > runMax) {
      runMax = save.progress.maxFloor;
      runMaxAt = t;
    }
    if (!noPilgrimage && wantsPilgrimage(save, t - runMaxAt, earned, prevRunMax)) {
      prevRunMax = save.progress.maxFloor;
      const gain = pilgrimage(save, 'cleric');
      earned += gain;
      shopDevotion(save);
      novelty.push({ t, what: `Pilgrimage #${save.pilgrimages} from F${prevRunMax} (+${gain} Devotion)` });
      fight = newFight(save);
      bot = makeBot();
      runMax = save.progress.maxFloor;
      runMaxAt = t;
      heroMilestone = milestoneOf();
    }
  }
}

const med = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)]! : NaN;
};
const m = (s: number) => `${(s / 60).toFixed(1)}m`;
const f1 = (x: number) => (Number.isNaN(x) ? '-' : `${x.toFixed(1)}s`);
console.log(`bot=${arg('bot', 'skilled')} ${minutes} min: best floor ${save.bestFloor}, pilgrimages ${save.pilgrimages}, wipes ${wipesAt.length}, acolytes ${acolyteSlots(save.progress)}, healer level ${save.healerLevel}, hero level ${Math.max(...Object.values(save.progress.heroLevels))}`);
console.log(`time split: fighting ${((fightSecs / t) * 100).toFixed(0)}%, walking ${((walkSecs / t) * 100).toFixed(0)}%, wiped ${((wipeSecs / t) * 100).toFixed(0)}%`);
for (let a = 1; a <= save.bestFloor; a += 10) {
  const b = a + 9;
  const inR = (f: { floor: number }) => f.floor >= a && f.floor <= b;
  const fs = floors.filter((f) => inR(f) && !f.boss);
  const bs = floors.filter((f) => inR(f) && f.boss);
  const ws = wipesAt.filter(inR);
  if (!fs.length && !ws.length) continue;
  console.log(
    `floors ${a}-${b}: normal ${f1(med(fs.map((f) => f.secs)))} (frontier ${f1(med(fs.filter((f) => f.frontier).map((f) => f.secs)))}, n=${fs.length}), ` +
      `boss ${f1(med(bs.map((f) => f.secs)))} (n=${bs.length}), wipes ${ws.length} after ${f1(med(ws.map((w) => w.secs)))}`,
  );
}
for (const [a, b] of [[0, 10], [10, 30], [30, 60], [60, 90], [90, 120], [120, 180]] as const) {
  const n = buys.filter((x) => x >= a * 60 && x < b * 60).length;
  if (b <= minutes) console.log(`purchases ${a}-${b} min: ${n} (${(n / (b - a)).toFixed(1)}/min)`);
}
const gaps: { gap: number; at: number }[] = [];
let last = 0;
for (const n of novelty) {
  gaps.push({ gap: n.t - last, at: last });
  last = n.t;
}
gaps.push({ gap: t - last, at: last });
const longest = gaps.reduce((a, b) => (b.gap > a.gap ? b : a));
const over10 = gaps.filter((g) => g.gap > 600).map((g) => `${m(g.gap)} from ${m(g.at)}`);
console.log(`deed claims ${deedMinutes.length} after 2 min: payout median ${med(deedMinutes).toFixed(1)} min of income`);
console.log(`novelty events: ${novelty.length}; longest gap ${m(longest.gap)} from ${m(longest.at)}; gaps over 10 min: ${over10.join(', ') || 'none'}`);
if (!quiet) for (const n of novelty) console.log(`  ${m(n.t).padStart(6)}  ${n.what}`);
