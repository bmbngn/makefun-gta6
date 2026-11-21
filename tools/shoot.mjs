// Screenshot capture for Solmar Bay. Serves game/, loads each shot scene
// in headless Chrome, waits for the scene's ready flag, then captures a
// 1280x720 JPEG at quality 82 into screenshots/.
//
// Usage: node tools/shoot.mjs [port]
// Reads the shot list from shots.json in the repository root.

import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const gameDir = join(repoRoot, 'game');
const shotsDir = join(repoRoot, 'screenshots');
const CHROME = process.env.CHROME_PATH || '/opt/meta-chromium/chrome';
const PORT = parseInt(process.argv[2] || '8124', 10);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

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
  const spec = JSON.parse(await readFile(join(repoRoot, 'shots.json'), 'utf8'));
  const server = await serve();
  const chrome = spawn(CHROME, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=9223', '--window-size=1280,720',
    'about:blank',
  ], { stdio: 'ignore' });
  try {
    const url = await cdpConnect(9223);
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let id = 0;
    const pending = new Map();
    const errors = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result); pending.delete(msg.id); }
      if (msg.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(msg.params.exceptionDetails).slice(0, 200));
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
    await send('Runtime.enable');
    await send('Page.enable');
    for (const shot of spec.shots) {
      await send('Page.navigate', { url: 'http://127.0.0.1:' + PORT + '/index.html?seed=' + spec.seed + '&shot=' + shot.scene });
      let ready = false;
      for (let i = 0; i < 120; i++) {
        await sleep(500);
        ready = (await evalJs('!!window.__shotReady')) === true;
        if (ready) break;
      }
      if (!ready) {
        console.log('FAIL  ' + shot.file + ' — scene never became ready');
        continue;
      }
      const shot2 = await send('Page.captureScreenshot', { format: 'jpeg', quality: spec.quality || 82 });
      const bytes = Buffer.from(shot2.data, 'base64');
      await writeFile(join(shotsDir, shot.file), bytes);
      console.log('OK  ' + shot.file + '  ' + bytes.length + ' bytes' + (errors.length ? '  (errors: ' + errors[0] + ')' : ''));
    }
    ws.close();
  } finally {
    chrome.kill();
    server.close();
  }
}

main().catch((e) => { console.error('shoot crashed:', e.message); process.exit(1); });
