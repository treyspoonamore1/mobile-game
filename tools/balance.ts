// Headless playthrough: a bot fights, shops and goes on Pilgrimages. Prints a progression timeline.
//   npm run balance -- [--hours 6] [--bot skilled|novice|idle] [--every 30] [--seed 1] [--active 0.3] [--quiet]
import { pilgrimage, devotionFor, canPilgrimage, orderUnlocked, startFloor } from '../src/meta/pilgrimage.ts';
import { floorGold } from '../src/sim/floors.ts';
import { newSave, type Save } from '../src/meta/save.ts';
import { applyEvents, newFight, pickRelic, refreshLoadout } from '../src/meta/session.ts';
import {
  buyDevotionUpgrade, buyGoldUpgrade, buyHero, devotionUpgradeCost, goldUpgradeCost, goldUpgradeVisible, heroCost,
} from '../src/meta/shop.ts';
import { idleBot, noviceBot, skilledBot, type Bot } from '../src/sim/bots.ts';
import { HERO_IDS } from '../src/sim/data/heroes.ts';
import { PRAYERS, type PrayerId } from '../src/sim/data/prayers.ts';
import { DEVOTION_UPGRADES, GOLD_UPGRADES, type DevotionUpgradeId } from '../src/sim/data/upgrades.ts';
import { DT, step } from '../src/sim/fight.ts';
import { acolyteSlots } from '../src/sim/loadout.ts';
import { T } from '../src/sim/tuning.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1]! : d;
};
const hours = Number(arg('hours', '6'));
const every = Number(arg('every', '30')) * 60;
const botName = arg('bot', 'skilled');
const quiet = args.includes('--quiet');
/** After acolytes arrive the player taps less: fraction of time still playing actively. */
const activeLate = Number(arg('active', '0.3'));
const noPilgrimage = args.includes('--no-pilgrimage');
// Tuning experiments without editing files: --set heroCostGrowth=1.2,goldGrowth=1.1
for (const kv of arg('set', '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  (T as unknown as Record<string, number>)[k!] = Number(v);
}
const makeBot = (): Bot => (botName === 'idle' ? idleBot : botName === 'novice' ? noviceBot() : skilledBot());

const PRAYER_PRIORITY: PrayerId[] = ['mend_lowest', 'ward_telegraphed', 'top_up', 'ward_tank', 'cleanse', 'mend_all', 'revive', 'mend_tank'];

function assignPrayers(save: Save): void {
  const unlocked = PRAYER_PRIORITY.filter((id) => save.bestFloor >= PRAYERS.find((p) => p.id === id)!.unlockFloor);
  const n = acolyteSlots(save.progress);
  for (let i = 0; i < n; i++) save.progress.acolytes[i] = unlocked[i % unlocked.length]!;
}

/** Greedy shopper: buy the cheapest useful thing until nothing is affordable. */
function shop(save: Save): boolean {
  let bought = false;
  for (let guard = 0; guard < 500; guard++) {
    const options: { cost: number; buy: () => void }[] = [];
    for (const id of HERO_IDS) options.push({ cost: heroCost(id, save.progress.heroLevels[id]) * 0.8, buy: () => buyHero(save, id, 1) });
    for (const u of GOLD_UPGRADES) {
      if (!goldUpgradeVisible(save, u.id)) continue;
      const c = goldUpgradeCost(save, u.id);
      if (c !== null) options.push({ cost: c * (u.id === 'aco_slot' ? 0.5 : 1), buy: () => buyGoldUpgrade(save, u.id) });
    }
    options.sort((a, b) => a.cost - b.cost);
    const best = options[0];
    if (!best) break;
    const goldBefore = save.gold;
    best.buy();
    if (save.gold === goldBefore) break;
    bought = true;
  }
  return bought;
}

/**
 * Devotion shopper: one-off unlocks first when cheap, then the cheapest upgrade weighted by how much a
 * player would value it (Might and Fortune are the workhorses).
 */
const DEVOTION_WEIGHT: Partial<Record<DevotionUpgradeId, number>> = {
  might: 0.5, fortune: 0.7, haste: 0.6, choir: 0.6, grace: 0.9, spirit: 1.2, vigil: 2, insight: 1.5, order_chrono: 1, order_bard: 3,
};
function shopDevotion(save: Save): void {
  for (let guard = 0; guard < 400; guard++) {
    const opts = DEVOTION_UPGRADES.map((u) => ({ id: u.id, cost: devotionUpgradeCost(save, u.id) }))
      .filter((o): o is { id: DevotionUpgradeId; cost: number } => o.cost !== null && o.cost <= save.devotion)
      .sort((a, b) => a.cost * (DEVOTION_WEIGHT[a.id] ?? 1) - b.cost * (DEVOTION_WEIGHT[b.id] ?? 1));
    if (opts.length === 0) return;
    buyDevotionUpgrade(save, opts[0]!.id);
  }
}

/**
 * When to go on Pilgrimage: only when this run has stopped climbing, and the gain is worth it relative to
 * all the Devotion earned so far. The longer the player is stuck, the smaller a gain they accept.
 */
function wantsPilgrimage(save: Save, stuckFor: number, earned: number): boolean {
  if (noPilgrimage || !canPilgrimage(save)) return false;
  const gain = devotionFor(save.progress.maxFloor);
  if (gain <= 0) return false;
  const min = stuckFor / 60;
  if (min < 8) return false;
  const need = min >= 45 ? 0.15 : min >= 20 ? 0.3 : 0.6;
  return gain >= need * earned;
}

const save = newSave(Number(arg('seed', '1')));
save.tutorial.welcome = true;
// Start with fixed Devotion upgrades, e.g. --dev might=5,fortune=3 (for measuring what each is worth).
for (const kv of arg('dev', '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  save.progress.devotionUpgrades[k as DevotionUpgradeId] = Number(v);
}
if (save.progress.devotionUpgrades.haste) {
  save.floor = save.progress.maxFloor = startFloor(save);
  save.gold = floorGold(save.floor) * 60;
}
let fight = newFight(save);
let bot = makeBot();
let t = 0;
let lastShop = 0;
let runMax = save.progress.maxFloor;
let runMaxAt = 0;
let runStart = 0;
let prevRunMax = 0;
let regainedAt = -1;
let earned = 0;
let lastBest = 1;
let nextReport = 0;
let firstWipe = 0;
const end = hours * 3600;
const milestones = new Map<number, number>();
const fmt = (n: number) => (n >= 1e6 ? n.toExponential(2) : n.toFixed(0));
const mins = (s: number) => `${(s / 60).toFixed(1)}m`;

console.log(`bot=${botName} active-late=${activeLate} hours=${hours}`);
if (!quiet) console.log('time    floor  max  best  gold       lvls(T/B/I/W)     acos pilg dev  relics wipes');
while (t < end) {
  const lateGame = acolyteSlots(save.progress) > 0;
  const active = !lateGame || ((t / 60) % 10) / 10 < activeLate;
  const events = step(fight, active ? bot(fight) : [], DT);
  t += DT;
  applyEvents(save, fight, events, DT);
  if (!firstWipe) for (const e of events) if (e.type === 'wipe') firstWipe = e.floor;
  while (save.relicOffers.length > 0) pickRelic(save, save.relicOffers[0]![0]!);
  if (save.progress.maxFloor > runMax) {
    runMax = save.progress.maxFloor;
    runMaxAt = t;
    if (regainedAt < 0 && prevRunMax > 0 && runMax >= prevRunMax) regainedAt = t;
  }
  if (save.bestFloor > lastBest) {
    lastBest = save.bestFloor;
    if ((lastBest % 5 === 0 || lastBest % 10 === 1) && !milestones.has(lastBest)) milestones.set(lastBest, t);
  }
  if (t - lastShop > 2) {
    lastShop = t;
    assignPrayers(save);
    if (shop(save)) refreshLoadout(save, fight);
    if (wantsPilgrimage(save, t - runMaxAt, earned)) {
      const order = orderUnlocked(save, 'chrono') && save.pilgrimages % 2 === 1 ? 'chrono' : 'cleric';
      const from = save.progress.maxFloor;
      const gain = pilgrimage(save, order);
      earned += gain;
      shopDevotion(save);
      const regain = regainedAt >= 0 ? `, regained F${prevRunMax} after ${mins(regainedAt - runStart)}` : '';
      console.log(
        `  ** ${mins(t)} Pilgrimage #${save.pilgrimages} from F${from} after ${mins(t - runStart)}${regain} (+${gain} devotion, total ${earned})`,
      );
      fight = newFight(save);
      bot = makeBot();
      prevRunMax = from;
      runMax = save.progress.maxFloor;
      runStart = t;
      runMaxAt = t;
      regainedAt = -1;
    }
  }
  if (!quiet && t >= nextReport) {
    nextReport += every;
    const L = save.progress.heroLevels;
    console.log(
      `${mins(t).padEnd(7)} ${String(fight.floor).padEnd(6)} ${String(save.progress.maxFloor).padEnd(4)} ${String(save.bestFloor).padEnd(5)} ${fmt(save.gold).padEnd(10)} ${`${L.tomas}/${L.brann}/${L.ilse}/${L.wren}`.padEnd(17)} ${String(acolyteSlots(save.progress)).padEnd(4)} ${String(save.pilgrimages).padEnd(4)} ${String(save.devotion).padEnd(4)} ${String(save.progress.relics.length).padEnd(6)} ${save.lifetime.wipes}`,
    );
  }
}
const dev = Object.entries(save.progress.devotionUpgrades).map(([k, v]) => `${k}${v}`).join(' ');
console.log(`end: best F${save.bestFloor}, ${save.pilgrimages} pilgrimages, devotion earned ${earned}, first wipe F${firstWipe || '-'}, wipes ${save.lifetime.wipes}`);
console.log(`devotion upgrades: ${dev || '-'}`);
console.log('first reached:', [...milestones].map(([f, s]) => `F${f}@${mins(s)}`).join(' '));
