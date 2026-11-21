import { chromium } from 'playwright-core';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const state = () => page.evaluate(() => {
  const s = window.__solmar.state();
  return { screen: window.__solmar.screen(), x: s.player.x, y: s.player.y, onFoot: s.player.onFoot,
    mission: s.missionState, stage: s.missionStage, cash: s.cash, wanted: s.wanted,
    carAngle: (() => { const c = s.cars.find((x) => x.id === s.player.carId); return c ? c.angle : null; })(),
    carSpeed: (() => { const c = s.cars.find((x) => x.id === s.player.carId); return c ? c.speed : null; })() };
});
function wrap(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
// Held keys, updated by setKeys.
const held = new Set();
async function setKeys(want) {
  for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
  for (const k of [...want]) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
}

await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
await sleep(700);
console.log('screen at load:', (await state()).screen);
await page.keyboard.press('Enter'); await sleep(350);
await page.keyboard.press('Enter'); await sleep(500);
let st = await state();
console.log('screen after Enter x2:', st.screen, 'player', Math.round(st.x), Math.round(st.y));
// Walk to the SunCab (640,480): hold keys toward it.
{
  const t0 = Date.now();
  while (Date.now() - t0 < 15000) {
    st = await state();
    if (Math.hypot(640 - st.x, 480 - st.y) < 45) break;
    const want = new Set();
    if (st.y - 480 > 12) want.add('KeyW');
    if (480 - st.y > 12) want.add('KeyS');
    if (640 - st.x > 12) want.add('KeyD');
    if (st.x - 640 > 12) want.add('KeyA');
    await setKeys(want);
    await sleep(90);
  }
  await setKeys(new Set());
  st = await state();
  console.log('walked to SunCab area:', Math.round(st.x), Math.round(st.y), 'dist', Math.round(Math.hypot(640 - st.x, 480 - st.y)));
}
// Enter the car.
await page.keyboard.press('Enter'); await sleep(400);
st = await state();
console.log('in car:', !st.onFoot, 'mission stage:', st.stage);
// Drive to the Docks (2160,1560) via road waypoints.
const route = [{ x: 640, y: 640 }, { x: 2240, y: 640 }, { x: 2240, y: 1600 }, { x: 2160, y: 1600 }, { x: 2160, y: 1560 }];
let idx = 0;
{
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    st = await state();
    if (st.mission === 'done') break;
    const wp = route[idx];
    const carX = st.x, carY = st.y;
    if (Math.hypot(wp.x - carX, wp.y - carY) < 55) { idx = Math.min(idx + 1, route.length - 1); continue; }
    const want = Math.atan2(wp.y - carY, wp.x - carX);
    const diff = wrap(want - st.carAngle);
    const cap = Math.abs(diff) > 1.0 ? 60 : Math.abs(diff) > 0.5 ? 100 : 130;
    const keys = new Set();
    if (Math.abs(st.carSpeed) <= cap) keys.add('KeyW');
    if (diff > 0.12) keys.add('KeyD');
    if (diff < -0.12) keys.add('KeyA');
    await setKeys(keys);
    await sleep(90);
  }
  await setKeys(new Set());
  st = await state();
  console.log('after drive: mission', st.mission, 'cash', st.cash, 'player', Math.round(st.x), Math.round(st.y));
}
// Save check.
const save = await page.evaluate(() => localStorage.getItem('solmar-bay.save.v1'));
console.log('save written:', !!save, save ? save.slice(0, 80) : '');
// Reload and check CONTINUE.
await page.reload({ waitUntil: 'networkidle' });
await sleep(700);
const title = await page.evaluate(() => document.body.innerText || '');
console.log('title offers CONTINUE:', /CONTINUE/i.test(title));
await page.keyboard.press('Enter'); await sleep(500);
st = await state();
console.log('after CONTINUE: screen', st.screen, 'cash', st.cash, 'mission', st.mission);
console.log('console/page errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
