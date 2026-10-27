// Headless playthrough: a bot fights, shops and goes on Pilgrimages. Prints a progression timeline.
//   npm run balance -- [--hours 6] [--bot skilled|novice|idle] [--every 30] [--seed 1] [--active 0.3] [--quiet]
import { pilgrimage, startFloor } from '../src/meta/pilgrimage.ts';
import { floorGold } from '../src/sim/floors.ts';
import { newSave } from '../src/meta/save.ts';
import { applyEvents, newFight, refreshLoadout } from '../src/meta/session.ts';
import { idleBot, skilledBot, type Bot } from '../src/sim/bots.ts';
import type { DevotionUpgradeId } from '../src/sim/data/upgrades.ts';
import { DT, step } from '../src/sim/fight.ts';
import { acolyteSlots } from '../src/sim/loadout.ts';
import { T } from '../src/sim/tuning.ts';
import { manageGear, assignPrayers, casualBot, claimDeeds, learnTalents, pickRelics, shop, shopDevotion, wantsPilgrimage } from './policy.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1]! : d;
};
const hours = Number(arg('hours', '6'));
const every = Number(arg('every', '30')) * 60;
const botName = arg('bot', 'skilled');
const quiet = args.includes('--quiet');
/** Once past the first walls (best floor >= LATE_FLOOR) the player taps less: fraction of time still active. */
const activeLate = Number(arg('active', '0.3'));
const LATE_FLOOR = 40;
const noPilgrimage = args.includes('--no-pilgrimage');
const noGear = args.includes('--no-gear');
// Tuning experiments without editing files: --set heroCostGrowth=1.2,goldGrowth=1.1
for (const kv of arg('set', '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  (T as unknown as Record<string, number>)[k!] = Number(v);
}
const makeBot = (): Bot => (botName === 'idle' ? idleBot : botName === 'novice' ? casualBot() : skilledBot());

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
/** Print the save's progress at these minutes (feed it to tools/probe.ts --progress). */
const dumpAt = arg('dump', '').split(',').filter(Boolean).map(Number);
const milestones = new Map<number, number>();
/** Time each healer level was reached (index = level - 1). */
const healerAt: number[] = [0];
let deedClaims = 0;
const deedLog: string[] = [];
/** Items kept from drops, by rarity (auto-salvaged ones not counted), and floors cleared. */
const drops = [0, 0, 0, 0, 0];
let clears = 0;
const fmt = (n: number) => (n >= 1e6 ? n.toExponential(2) : n.toFixed(0));
const mins = (s: number) => `${(s / 60).toFixed(1)}m`;

console.log(`bot=${botName} active-late=${activeLate} hours=${hours}`);
if (!quiet) console.log('time    floor  max  best  gold       lvls(T/B/I/W)     acos pilg dev  relics wipes');
while (t < end) {
  // Players keep healing by hand through the first walls; later (Acolytes carry the routine) they only
  // play actively part of the time.
  const lateGame = save.bestFloor >= LATE_FLOOR && acolyteSlots(save.progress) > 0;
  const active = !lateGame || ((t / 60) % 10) / 10 < activeLate;
  const events = step(fight, active ? bot(fight) : [], DT);
  t += DT;
  for (const n of applyEvents(save, fight, events, DT)) if (n.type === 'itemDrop') drops[n.item.rarity]!++;
  for (const e of events) if (e.type === 'floorClear') clears++;
  if (!firstWipe) for (const e of events) if (e.type === 'wipe') firstWipe = e.floor;
  pickRelics(save);
  while (healerAt.length < save.healerLevel) healerAt.push(t);
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
    const deeds = claimDeeds(save);
    deedClaims += deeds.length;
    for (const d of deeds) deedLog.push(`${d.name}${d.tier}@${mins(t)}`);
    const learned = learnTalents(save);
    const gearChanged = !noGear && manageGear(save);
    if (shop(save) > 0 || deeds.length > 0 || learned > 0 || gearChanged) refreshLoadout(save, fight);
    if (!noPilgrimage && wantsPilgrimage(save, t - runMaxAt, earned, prevRunMax)) {
      // The bots are written for the Cleric (hold = Ward); a player sticks with the Order they play best.
      const order = 'cleric';
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
  if (dumpAt.length && t >= dumpAt[0]! * 60) {
    dumpAt.shift();
    console.log(`DUMP ${mins(t)} floor ${fight.floor} ${JSON.stringify(save.progress)}`);
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
console.log(`healer level ${save.healerLevel}:`, [5, 10, 15, 20, 25, 30, 35, 40].filter((l) => l <= healerAt.length).map((l) => `L${l}@${mins(healerAt[l - 1]!)}`).join(' '));
console.log(`deeds claimed ${deedClaims}:`, args.includes('--deeds') ? deedLog.join(' ') : '(--deeds to list)');
console.log(`gear: ${clears} floor clears, items kept by rarity (Worn..Mythic) ${drops.join('/')} = ${(drops.reduce((a, b) => a + b, 0) / hours).toFixed(0)}/h; worn now ${Object.values(save.progress.equipped).flatMap((x) => Object.values(x ?? {})).map((it) => it!.rarity).sort().join('')}`);
console.log(`talents: ${Object.entries(save.progress.talents).map(([k, v]) => `${k}${v}`).join(' ') || '-'}`);
console.log('first reached:', [...milestones].map(([f, s]) => `F${f}@${mins(s)}`).join(' '));
