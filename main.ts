// Solmar Bay, a gta6-01 entry (Node 22, standard library only): the game
// is this directory's game/ folder — plain static files a desktop browser
// loads offline (game/index.html and its ES modules, no library, no
// network request) — and this program hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. The game itself is an open-world crime game: a
// coastal city to explore on foot and by car, traffic and pedestrians,
// cars to steal, a five-star wanted level with police chases, five story
// missions, a HUD with a minimap, and a save.
//
// Serve it locally with any static server, for example:
//   node serve.ts
// then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  console.error(`solmar-bay: ${message}`);
  process.exit(1);
}

function copyTree(from, to) {
  if (!existsSync(from)) fail(`missing ${from}`);
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

// The game itself, then its screenshots.
copyTree(join(here, 'game'), join(out, 'game'));
copyTree(join(here, 'screenshots'), join(out, 'screenshots'));

// Refuse to hand in an entry the scorer would refuse on its face: fewer
// than three or more than four screenshots, one over 256 KiB, or a game
// folder over its caps.
const shots = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.'));
if (shots.length < 3 || shots.length > 4) fail(`expected 3 or 4 screenshots, found ${shots.length}`);
for (const shot of shots) {
  const size = statSync(join(out, 'screenshots', shot)).size;
  if (size > 262144) fail(`screenshot ${shot} is ${size} bytes, over the 256 KiB cap`);
}

// The dossier is the judge's reading copy: the four screenshots, the
// source outline and the entry's own description, built by the vendored
// make.fun library under the scorer's caps.
mkdirSync(out, { recursive: true });
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log(`solmar-bay: handed in ${shots.length} screenshots to ${out}`);
