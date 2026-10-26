// Headless playthrough: a bot fights, shops and goes on Pilgrimages. Prints a progression timeline.
//   npm run balance -- [--hours 6] [--bot skilled|novice|idle] [--every 5] [--seed 1]
import { pilgrimage, devotionFor, canPilgrimage, orderUnlocked } from '../src/meta/pilgrimage.ts';
import { newSave, type Save } from '../src/meta/save.ts';
import { applyEvents, newFight, pickRelic, refreshLoadout } from '../src/meta/session.ts';
import {
  buyDevotionUpgrade, buyGoldUpgrade, buyHero, devotionUpgradeCost, goldUpgradeCost, goldUpgradeVisible, heroCost,
} from '../src/meta/shop.ts';
import { idleBot, noviceBot, skilledBot, type Bot } from '../src/sim/bots.ts';
import { HERO_IDS } from '../src/sim/data/heroes.ts';
import { PRAYERS, type PrayerId } from '../src/sim/data/prayers.ts';
import { DEVOTION_UPGRADES, GOLD_UPGRADES } from '../src/sim/data/upgrades.ts';
import { DT, step } from '../src/sim/fight.ts';
import { acolyteSlots } from '../src/sim/loadout.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1]! : d;
};
const hours = Number(arg('hours', '6'));
const every = Number(arg('every', '5')) * 60;
const botName = arg('bot', 'skilled');
/** After acolytes arrive the player taps less: fraction of time still playing actively. */
const activeLate = Number(arg('active', '0.3'));
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

function shopDevotion(save: Save): void {
  for (let guard = 0; guard < 200; guard++) {
    const opts = DEVOTION_UPGRADES.map((u) => ({ id: u.id, cost: devotionUpgradeCost(save, u.id) }))
      .filter((o): o is { id: typeof o.id; cost: number } => o.cost !== null && o.cost <= save.devotion)
      .sort((a, b) => a.cost * (a.id === 'might' ? 0.5 : 1) - b.cost * (b.id === 'might' ? 0.5 : 1));
    if (opts.length === 0) return;
    buyDevotionUpgrade(save, opts[0]!.id);
  }
}

const save = newSave(Number(arg('seed', '1')));
save.tutorial.welcome = true;
let fight = newFight(save);
let bot = makeBot();
let t = 0;
let lastShop = 0;
let bestAt = 0;
let lastBest = 1;
let nextReport = 0;
const end = hours * 3600;
const milestones = new Map<number, number>();
const fmt = (n: number) => (n >= 1e6 ? n.toExponential(2) : n.toFixed(0));
const mins = (s: number) => `${(s / 60).toFixed(1)}m`;

console.log(`bot=${botName} active-late=${activeLate} hours=${hours}`);
console.log('time    floor  max  best  gold       lvls(T/B/I/W)     acos pilg dev  relics wipes');
while (t < end) {
  const lateGame = acolyteSlots(save.progress) > 0;
  const active = !lateGame || ((t / 60) % 10) / 10 < activeLate;
  const events = step(fight, active ? bot(fight) : [], DT);
  t += DT;
  applyEvents(save, fight, events, DT);
  while (save.relicOffers.length > 0) pickRelic(save, save.relicOffers[0]![0]!);
  if (save.bestFloor > lastBest) {
    lastBest = save.bestFloor;
    bestAt = t;
    if (lastBest % 5 === 0 && !milestones.has(lastBest)) milestones.set(lastBest, t);
  }
  if (t - lastShop > 2) {
    lastShop = t;
    assignPrayers(save);
    if (shop(save)) refreshLoadout(save, fight);
    // Pilgrimage when stuck for 8 minutes and it pays.
    const stuck = t - bestAt > 480;
    if (canPilgrimage(save) && stuck && devotionFor(save.progress.maxFloor) >= Math.max(3, save.devotion * 0.3)) {
      const order = orderUnlocked(save, 'chrono') && save.pilgrimages % 2 === 1 ? 'chrono' : 'cleric';
      const gain = pilgrimage(save, order);
      shopDevotion(save);
      console.log(`  ** ${mins(t)} Pilgrimage #${save.pilgrimages} from max floor ${lastBest} (+${gain} devotion)`);
      fight = newFight(save);
      bot = makeBot();
      bestAt = t;
    }
  }
  if (t >= nextReport) {
    nextReport += every;
    const L = save.progress.heroLevels;
    console.log(
      `${mins(t).padEnd(7)} ${String(fight.floor).padEnd(6)} ${String(save.progress.maxFloor).padEnd(4)} ${String(save.bestFloor).padEnd(5)} ${fmt(save.gold).padEnd(10)} ${`${L.tomas}/${L.brann}/${L.ilse}/${L.wren}`.padEnd(17)} ${String(acolyteSlots(save.progress)).padEnd(4)} ${String(save.pilgrimages).padEnd(4)} ${String(save.devotion).padEnd(4)} ${String(save.progress.relics.length).padEnd(6)} ${save.lifetime.wipes}`,
    );
  }
}
console.log('first reached:', [...milestones].map(([f, s]) => `F${f}@${mins(s)}`).join(' '));
