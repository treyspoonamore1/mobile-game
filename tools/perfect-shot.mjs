import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const save = { tutorial: { welcome: true, tap: true, hold: true, swipe: true, revive: true, sanctuary: true, levelup: true, relics: true, perfect: true }, floor: 10, bestFloor: 10, lastSeen: 0,
  progress: { heroLevels: { tomas: 12, brann: 12, ilse: 12, wren: 12 }, maxFloor: 10, upgrades: {}, devotionUpgrades: {}, relics: [], order: 'cleric', acolytes: ['mend_lowest'] } };
await page.addInitScript((j) => { if (!sessionStorage.getItem('s')) { localStorage.setItem('lifeline-save-v1', j); sessionStorage.setItem('s', '1'); } }, JSON.stringify(save));
await page.goto('http://localhost:5173/');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/10-boss.png` });
// Wait for a telegraph, then hold the target's frame just before impact (via the real touch path).
const cdp = await ctx.newCDPSession(page);
let shots = 0;
for (let tries = 0; tries < 400 && shots < 2; tries++) {
  const info = await page.evaluate(() => {
    const L = window.lifeline;
    const f = L.fight();
    for (const e of f.enemies) if (e.alive && e.windup) return { left: e.windup.total - e.windup.t, hero: e.windup.targets[0], frame: L.renderer.layout.frames[e.windup.targets[0]] };
    return null;
  });
  if (info && info.left < 0.55 && info.left > 0.3) {
    const box = await page.locator('#stage').boundingBox();
    const x = box.x + info.frame.x + 150, y = box.y + info.frame.y + info.frame.h / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await page.waitForTimeout(260);
    await page.screenshot({ path: `${out}/11-ward-${shots}.png` });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/12-perfect-${shots}.png` });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    shots++;
  }
  await page.waitForTimeout(30);
}
const perfects = await page.evaluate(() => window.lifeline.fight().stats.perfects);
console.log('perfects', perfects, errors.join('\n') || 'no errors');
await browser.close();
