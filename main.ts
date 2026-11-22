// Solmar Bay — the entry program for make.fun's GTA 6 bounty.
//
// Copies game/ and screenshots/ from this repository into the output
// directory and writes the dossier with the vendored make.fun library.
// Node 22 standard library only; no install, no network, no build step.
// Run it twice and both runs write the same bytes.

import { cpSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

function fail(message) {
  console.error('main.ts: ' + message);
  process.exit(1);
}

function requireDir(path, label) {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    fail(label + ' is missing: ' + path);
  }
}

function copyTree(source, target, label) {
  requireDir(source, label);
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true, dereference: true });
}

function main() {
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  requireDir(gameDir, 'game/');
  requireDir(shotsDir, 'screenshots/');

  mkdirSync(outDir, { recursive: true });

  copyTree(gameDir, join(outDir, 'game'), 'game/');
  copyTree(shotsDir, join(outDir, 'screenshots'), 'screenshots/');

  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  const shotNames = [];
  for (const name of ['1-finale.jpg', '2-chase.jpg', '3-pickup.jpg', '4-steal.jpg']) {
    if (existsSync(join(outDir, 'screenshots', name))) shotNames.push(name);
  }
  console.log('Solmar Bay: wrote ' + outDir);
  console.log('  dossier.json: ' + dossier.length + ' bytes');
  console.log('  screenshots: ' + shotNames.join(', '));
}

main();
