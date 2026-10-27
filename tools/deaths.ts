// Death probe: how heroes die. For every hero death, was the hero near full life before the killing
// blow (a one-shot), how big was the blow against their max life, was it telegraphed, and was the
// fight enraged? Grouped by floor band and by levels since the hero's last milestone.
//   node --experimental-strip-types tools/deaths.ts [--minutes 240] [--bot skilled|novice] [--set k=v,...]
import { pilgrimage } from '../src/meta/pilgrimage.ts';
import { newSave } from '../src/meta/save.ts';
import { applyEvents, newFight, refreshLoadout } from '../src/meta/session.ts';
import { skilledBot } from '../src/sim/bots.ts';
import { DT, enrageMult, step } from '../src/sim/fight.ts';
import { T } from '../src/sim/tuning.ts';
import { assignPrayers, casualBot, claimDeeds, learnTalents, pickRelics, shop, shopDevotion, wantsPilgrimage } from './policy.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1]! : d;
};
for (const kv of arg('set', '').split(',').filter(Boolean)) {
  const [k, v] = kv.split('=');
  (T as unknown as Record<string, number>)[k!] = Number(v);
}
const minutes = Number(arg('minutes', '240'));
const makeBot = () => (arg('bot', 'skilled') === 'novice' ? casualBot() : skilledBot());
let bot = makeBot();
const save = newSave(Number(arg('seed', '1')));
save.tutorial.welcome = true;
let fight = newFight(save);
let t = 0;
let shopTimer = 0;
let runMax = 1;
let runMaxAt = 0;
let prevRunMax = 0;
let earned = 0;

interface Death { floor: number; hero: string; before: number; hit: number; big: boolean; enraged: boolean; sinceMilestone: number }
const deaths: Death[] = [];
/** Biggest single hit seen, as a fraction of max life, per floor band and hero. */
const biggest = new Map<string, number>();

while (t < minutes * 60) {
  const before = fight.heroes.map((h) => (h.alive ? h.hp / h.stats.maxHp : 0));
  const enraged = enrageMult(fight) > 1;
  const events = step(fight, bot(fight), DT);
  t += DT;
  const hits = new Map<number, { dmg: number; big: boolean }>();
  for (const e of events) {
    if (e.type === 'heroHit' && !e.poison) {
      const h = fight.heroes[e.hero]!;
      const frac = (e.amount + e.absorbed) / h.stats.maxHp;
      const band = `${Math.floor((fight.floor - 1) / 10) * 10 + 1}-${Math.floor((fight.floor - 1) / 10) * 10 + 10} ${h.id}${e.big ? ' heavy' : ''}`;
      biggest.set(band, Math.max(biggest.get(band) ?? 0, frac));
      const cur = hits.get(e.hero) ?? { dmg: 0, big: false };
      hits.set(e.hero, { dmg: cur.dmg + frac, big: cur.big || e.big });
    }
    if (e.type === 'heroDown') {
      const h = fight.heroes[e.hero]!;
      const lvl = save.progress.heroLevels[h.id];
      const hit = hits.get(e.hero);
      deaths.push({
        floor: fight.floor, hero: h.id, before: before[e.hero]!, hit: hit?.dmg ?? 0, big: hit?.big ?? false, enraged,
        sinceMilestone: lvl % T.heroMilestoneEvery,
      });
    }
  }
  applyEvents(save, fight, events, DT);
  pickRelics(save);
  shopTimer += DT;
  if (shopTimer >= 1) {
    shopTimer = 0;
    assignPrayers(save);
    const changed = claimDeeds(save).length + learnTalents(save) + shop(save);
    if (changed > 0) refreshLoadout(save, fight);
    if (save.progress.maxFloor > runMax) {
      runMax = save.progress.maxFloor;
      runMaxAt = t;
    }
    if (wantsPilgrimage(save, t - runMaxAt, earned, prevRunMax)) {
      prevRunMax = save.progress.maxFloor;
      earned += pilgrimage(save, 'cleric');
      shopDevotion(save);
      fight = newFight(save);
      bot = makeBot();
      runMax = save.progress.maxFloor;
      runMaxAt = t;
    }
  }
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const oneShot = (d: Death) => d.before >= 0.7;
console.log(`bot=${arg('bot', 'skilled')} ${minutes} min, best floor ${save.bestFloor}, ${deaths.length} hero deaths`);
console.log('floors   deaths  one-shots(from >=70%)  of which heavy  enraged  median killing blow');
for (let a = 1; a <= save.bestFloor; a += 10) {
  const ds = deaths.filter((d) => d.floor >= a && d.floor < a + 10);
  if (ds.length === 0) continue;
  const os = ds.filter(oneShot);
  const blows = ds.map((d) => d.hit).sort((x, y) => x - y);
  console.log(
    `${`${a}-${a + 9}`.padEnd(8)} ${String(ds.length).padEnd(7)} ${`${os.length} (${pct(os.length / ds.length)})`.padEnd(22)} ${String(os.filter((d) => d.big).length).padEnd(15)} ${String(ds.filter((d) => d.enraged).length).padEnd(8)} ${pct(blows[Math.floor(blows.length / 2)]!)}`,
  );
}
console.log('\none-shot share by levels since the hero\'s last milestone (0 = just hit it):');
for (let k = 0; k < T.heroMilestoneEvery; k++) {
  const ds = deaths.filter((d) => d.sinceMilestone === k && d.floor > 20);
  if (ds.length) console.log(`  +${k}: ${ds.length} deaths, ${pct(ds.filter(oneShot).length / ds.length)} one-shots`);
}
console.log('\nbiggest single hit / max life (floors > 20):');
for (const [k, v] of [...biggest].filter(([k]) => Number(k.split('-')[0]) > 20).sort()) console.log(`  ${k.padEnd(24)} ${pct(v)}`);
