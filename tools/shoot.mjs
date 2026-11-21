// Take Solmar Bay's screenshots in a real browser: each ?shot= scene
// stages the game with the autopilot, paints twice, and sets
// window.__shotReady. Run with the static server up on 8080:
//   node serve.ts & node tools/shoot.mjs 1234
import { chromium } from 'playwright-core';

const scenes = [
  ['1-finale', '1-finale'],
  ['2-chase', '2-chase'],
  ['3-pickup', '3-pickup'],
  ['4-steal', '4-steal'],
];
const seed = process.argv[2] || '1234';
const outDir = process.argv[3] || '/home/hatch/workspace/makefun/gta6-01/repo/screenshots';

const browser = await chromium.launch({
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text()); });
page.on('pageerror', (e) => console.log('PAGE ERROR:', String(e)));
for (const [name, shot] of scenes) {
  await page.goto(`http://127.0.0.1:8080/?shot=${shot}&seed=${seed}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 30000 });
  } catch {
    console.log(`${name}: __shotReady never set — screenshotting anyway`);
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${outDir}/${name}.jpg`, type: 'jpeg', quality: 82 });
  console.log(`saved ${name}.jpg`);
}
await browser.close();
