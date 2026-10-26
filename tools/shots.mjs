// Screenshots of the running game at a Pixel-like viewport.
//   node tools/shots.mjs [url] [outDir]
// Expects a dev or preview server (default http://localhost:5173/). Uses query params for states:
//   ?shot=<state> is not needed; the script drives the game through localStorage saves and taps.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'shots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

async function shot(name) {
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
}

// Fresh start: welcome screen.
await page.goto(url);
await page.waitForTimeout(1200);
await shot('01-welcome');
await page.getByRole('button', { name: /begin/i }).click().catch(() => {});
await page.waitForTimeout(2500);
await shot('02-floor1');

// Tap the frames for a while to play.
const box = await page.locator('#stage').boundingBox();
for (let i = 0; i < 40; i++) {
  const hero = i % 4;
  await page.touchscreen.tap(box.x + 120, box.y + box.height - 330 + hero * 76).catch(() => {});
  await page.waitForTimeout(150);
}
await shot('03-playing');

// A mid-game save.
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('lifeline-save-v1'));
  s.floor = 23; s.bestFloor = 31; s.gold = 125000; s.progress.maxFloor = 31;
  s.progress.heroLevels = { tomas: 30, brann: 29, ilse: 28, wren: 29 };
  s.progress.upgrades = { mend_power: 8, ward_power: 5, aco_slot: 2, aco_power: 6 };
  s.progress.relics = ['sunstone', 'bell_of_dawn', 'war_banner'];
  s.tutorial = { welcome: true, tap: true, hold: true, swipe: true, revive: true, sanctuary: true, levelup: true, relics: true, perfect: true };
  s.lastSeen = Date.now();
  localStorage.setItem('lifeline-save-v1', JSON.stringify(s));
});
await page.reload();
await page.waitForTimeout(3500);
await shot('04-midgame');
for (const tab of ['Party', 'Spells', 'Acolytes', 'Relics', 'Pilgrim']) {
  await page.getByRole('button', { name: new RegExp(tab, 'i') }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  await shot(`05-sheet-${tab.toLowerCase()}`);
}
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
await browser.close();
