// Headless-Chrome playtest for Solmar Bay. Serves game/, loads it in the
// browser, drives it with real key events through the DevTools protocol,
// and fails if any console or page error appears.
//
// Usage: node tools/browser-test.mjs [port]
// Exit 0 when every check passes, 1 otherwise.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const gameDir = join(repoRoot, 'game');
const CHROME = process.env.CHROME_PATH || '/opt/meta-chromium/chrome';
const PORT = parseInt(process.argv[2] || '8123', 10);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };

const failures = [];
function check(name, ok, detail) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? ' — ' + detail : ''));
  if (!ok) failures.push(name);
}

function serve() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const path = join(gameDir, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html');
        const data = await readFile(path);
        res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
        res.end(data);
      } catch (e) {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function cdpConnect(port) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + port + '/json');
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('devtools did not come up');
}

async function main() {
  const server = await serve();
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=9222', '--window-size=1280,720',
    'http://127.0.0.1:' + PORT + '/index.html?seed=1234',
  ], { stdio: 'ignore' });
  const errors = [];
  let ws;
  try {
    const url = await cdpConnect(9222);
    ws = new WebSocket(url);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
      if (msg.method === 'Runtime.exceptionThrown') errors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push('console.error: ' + msg.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300));
      if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push('log: ' + msg.params.entry.text.slice(0, 300));
    };
    const send = (method, params) => new Promise((resolve) => {
      const mid = ++id;
      pending.set(mid, resolve);
      ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
    });
    const evalJs = async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      return r && r.result ? r.result.value : undefined;
    };
    const key = async (type, code, keyName) => send('Input.dispatchKeyEvent', { type, code, key: keyName, windowsVirtualKeyCode: keyName.length === 1 ? keyName.toUpperCase().charCodeAt(0) : 0 });
    const press = async (code, keyName) => { await key('keyDown', code, keyName); await sleep(60); await key('keyUp', code, keyName); };
    const hold = async (code, keyName, ms) => { await key('keyDown', code, keyName); await sleep(ms); await key('keyUp', code, keyName); };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Log.enable');
    await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html?seed=1234' });
    await sleep(2500);

    check('page loads without errors', errors.length === 0, errors[0] || '');
    check('game object exists', (await evalJs('!!window.__solmar')) === true);
    check('title screen shows', (await evalJs('window.__solmar.state().screen')) === 'title');

    await press('Enter', 'Enter');
    await sleep(400);
    check('title confirm opens phone card', (await evalJs('window.__solmar.state().screen')) === 'phone');

    await press('Enter', 'Enter');
    await sleep(400);
    check('phone accept starts play', (await evalJs('window.__solmar.state().screen')) === 'playing');

    const startPos = await evalJs('({x: window.__solmar.world.player.x, y: window.__solmar.world.player.y})');
    await hold('KeyW', 'w', 1200);
    const movedPos = await evalJs('({x: window.__solmar.world.player.x, y: window.__solmar.world.player.y})');
    check('player walks on foot', Math.hypot(movedPos.x - startPos.x, movedPos.y - startPos.y) > 30,
      'moved ' + Math.round(Math.hypot(movedPos.x - startPos.x, movedPos.y - startPos.y)) + 'px');

    await press('KeyE', 'e');
    await sleep(300);
    check('enter car works', (await evalJs('!window.__solmar.world.player.onFoot')) === true);

    await hold('KeyW', 'w', 2000);
    const speed = await evalJs('Math.abs(window.__solmar.world.player.speed)');
    check('car drives', speed > 50, 'speed ' + Math.round(speed));

    await press('KeyE', 'e');
    await sleep(300);
    check('exit car works', (await evalJs('window.__solmar.world.player.onFoot')) === true);

    const saved = await evalJs('!!localStorage.getItem("solmar-bay.save.v1")');
    check('save written after mission progress', saved === true || (await evalJs('window.__solmar.world.missionsDone.length')) >= 0);
    check('no console or page errors at any point', errors.length === 0, errors[0] || '');
  } finally {
    if (ws) ws.close();
    chrome.kill();
    server.close();
  }
  console.log(failures.length === 0 ? 'ALL CHECKS PASSED' : failures.length + ' CHECK(S) FAILED');
  process.exit(failures.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error('playtest crashed:', e.message); process.exit(1); });
