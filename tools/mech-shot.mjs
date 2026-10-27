// Screenshots of each boss mechanic in the running game (needs a dev server).
//   node tools/mech-shot.mjs [outDir] [url]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'shots';
const url = process.argv[3] ?? 'http://localhost:5173/';
mkdirSync(out, { recursive: true });
const cases = [
  { name: 'judgement', floor: 10, lvl: 40, when: 'judgement' },
  { name: 'plague', floor: 20, lvl: 70, when: 'plague' },
  { name: 'frostbite', floor: 30, lvl: 100, when: 'frost' },
  { name: 'siphon', floor: 40, lvl: 130, when: 'siphon' },
];
const browser = await chromium.launch();
const errors = [];
for (const c of cases) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${c.name}: ${e}`));
  const tut = { welcome: true, tap: true, hold: true, swipe: true, revive: true, sanctuary: true, levelup: true, relics: true, perfect: true, talents: true, deeds: true, gear: true };
  const save = {
    tutorial: tut, floor: c.floor, bestFloor: c.floor, lastSeen: 0, healerLevel: 10,
    progress: { heroLevels: { tomas: c.lvl, brann: c.lvl, ilse: c.lvl, wren: c.lvl }, maxFloor: c.floor, upgrades: { mend_power: 10, ward_power: 6, mana_max: 6, mana_regen: 6 }, devotionUpgrades: {}, relics: [], order: 'cleric', acolytes: ['mend_lowest'], talents: {}, deeds: {}, equipped: {} },
  };
  await page.addInitScript((j) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('lifeline-save-v1', j); sessionStorage.setItem('s', '1'); } }, JSON.stringify(save));
  await page.goto(url);
  let got = false;
  for (let i = 0; i < 900 && !got; i++) {
    got = await page.evaluate((when) => {
      if (!window.lifeline) return false;
      const { game, fight } = window.lifeline;
      const f = fight();
      // Keep the shot on the boss: no pausing modals, and a boss that lives long enough to use its mechanic.
      if (game.modal.value) game.modal.value = null;
      for (const e of f.enemies) if (e.def.boss && !e.boosted) { e.boosted = true; e.maxHp *= 40; e.hp = e.maxHp; }
      if (when === 'siphon') return f.siphonT > 0 || f.enemies.some((e) => e.windup?.attack.mech === 'siphon');
      if (when === 'plague') return f.heroes.some((h) => h.plagueT > 0);
      if (when === 'frost') return f.heroes.some((h) => h.frostT > 0);
      return f.enemies.some((e) => e.windup?.attack.mech === 'judgement' && e.windup.t > 1);
    }, c.when).catch(() => false);
    if (!got) await page.waitForTimeout(50);
  }
  await page.waitForTimeout(c.when === 'siphon' ? 900 : 300);
  await page.screenshot({ path: `${out}/mech-${c.name}.png` });
  console.log(c.name, got ? 'captured' : 'NOT SEEN');
  await ctx.close();
}
console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
