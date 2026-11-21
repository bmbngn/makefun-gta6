// The city of Solmar Bay, built once from the seed: roads on a grid,
// blocks filled with buildings, two parks, a plaza, the beach and the
// sea, the pier, and the named places missions use. Everything the rules
// need to ask the city lives here: what is road, what blocks movement,
// what a district is called, and whether one point can see another.
import { WORLD, ROAD_GAP, ROAD_HALF, WALK_HALF, SEA_TOP, SAND_TOP, PALETTE } from './config.js';

const LINES_X = [];
for (let x = 0; x <= WORLD.width; x += ROAD_GAP) LINES_X.push(x);
const LINES_Y = [];
for (let y = 0; y <= WORLD.height; y += ROAD_GAP) LINES_Y.push(y);

export function districtAt(x, y) {
  if (y >= SAND_TOP) return 'Marina';
  if (x >= 1920 && y >= 1280) return 'Docks';
  if (x >= 960 && x < 1600 && y < 640) return 'Downtown';
  if (x >= 1920 && y < 1280) return 'Hills';
  return 'Old Town';
}

function nearestLine(value, lines) {
  let best = lines[0];
  let bestD = Math.abs(value - lines[0]);
  for (const line of lines) {
    const d = Math.abs(value - line);
    if (d < bestD) {
      bestD = d;
      best = line;
    }
  }
  return { line: best, dist: bestD };
}

export function onRoad(x, y) {
  return nearestLine(x, LINES_X).dist <= ROAD_HALF || nearestLine(y, LINES_Y).dist <= ROAD_HALF;
}

export function onWalkable(x, y) {
  if (y >= SEA_TOP) return false;
  return nearestLine(x, LINES_X).dist <= WALK_HALF || nearestLine(y, LINES_Y).dist <= WALK_HALF;
}

export function roadPointNear(rng, x, y) {
  const lx = nearestLine(x, LINES_X).line;
  const ly = nearestLine(y, LINES_Y).line;
  if (rng.chance(0.5)) return { x: lx + rng.range(-ROAD_HALF + 10, ROAD_HALF - 10), y: Math.max(40, Math.min(WORLD.height - 40, y + rng.range(-160, 160))) };
  return { x: Math.max(40, Math.min(WORLD.width - 40, x + rng.range(-160, 160))), y: ly + rng.range(-ROAD_HALF + 10, ROAD_HALF - 10) };
}

export function createCity(rng) {
  const buildings = [];
  const trees = [];
  const parks = [];
  const cranes = [];
  const plaza = { x: 1120, y: 160, w: 320, h: 320 };
  const parksAt = [
    { x: 376, y: 696, w: 208, h: 208 },
    { x: 1976, y: 376, w: 208, h: 208 },
  ];
  for (const p of parksAt) parks.push(p);

  function isParkBlock(cx, cy) {
    return parksAt.some((p) => cx > p.x - 20 && cx < p.x + p.w + 20 && cy > p.y - 20 && cy < p.y + p.h + 20);
  }
  function isPlazaBlock(cx, cy) {
    return cx > plaza.x - 20 && cx < plaza.x + plaza.w + 20 && cy > plaza.y - 20 && cy < plaza.y + plaza.h + 20;
  }

  const safehouse = { x: 420, y: 420, w: 96, h: 72 };
  const paintShop = { x: 2020, y: 1420, w: 120, h: 80 };
  const policeStation = { x: 1300, y: 100, w: 110, h: 76 };
  const hospital = { x: 180, y: 700, w: 110, h: 76 };
  const marinaLot = { x: 1980, y: 1640, w: 260, h: 120 };
  const pier = { x: 2016, y: SAND_TOP, w: 64, h: WORLD.height - SAND_TOP };
  const boat = { x: 2048, y: 1890 };
  const named = [safehouse, paintShop, policeStation, hospital, marinaLot, pier];
  function hitsNamed(bx, by, bw, bh) {
    return named.some((n) => bx < n.x + n.w && bx + bw > n.x && by < n.y + n.h && by + bh > n.y);
  }

  for (let bi = 0; bi < LINES_X.length - 1; bi += 1) {
    for (let bj = 0; bj < LINES_Y.length - 1; bj += 1) {
      const x0 = LINES_X[bi] + WALK_HALF;
      const y0 = LINES_Y[bj] + WALK_HALF;
      const x1 = LINES_X[bi + 1] - WALK_HALF;
      const y1 = LINES_Y[bj + 1] - WALK_HALF;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      if (y0 >= SAND_TOP) continue;
      if (isPlazaBlock(cx, cy)) continue;
      if (isParkBlock(cx, cy)) {
        const n = rng.int(6, 10);
        for (let i = 0; i < n; i += 1) {
          trees.push({ x: rng.range(x0 + 14, x1 - 14), y: rng.range(y0 + 14, y1 - 14), r: rng.range(7, 12) });
        }
        continue;
      }
      const district = districtAt(cx, cy);
      const tall = district === 'Downtown';
      const warehouse = district === 'Docks';
      const house = district === 'Hills';
      const count = tall ? 2 : warehouse ? 1 : house ? rng.int(2, 3) : rng.int(2, 4);
      const bw = (x1 - x0) / (count === 1 ? 1 : 2);
      const bh = (y1 - y0) / (count <= 2 ? 1 : 2);
      for (let i = 0; i < count; i += 1) {
        const gx = count === 1 ? 0 : i % 2;
        const gy = count <= 2 ? 0 : Math.floor(i / 2);
        const w = Math.max(46, bw - 26);
        const h = Math.max(46, bh - 26);
        const bx = x0 + gx * bw + 13;
        const by = y0 + gy * bh + 13;
        if (hitsNamed(bx, by, w, h)) continue;
        buildings.push({
          x: bx, y: by, w, h,
          roof: rng.pick(PALETTE.buildingRoof),
          tall: tall ? rng.int(2, 4) : 1,
          warehouse,
          house,
          district,
        });
      }
      if (district === 'Hills' && rng.chance(0.6)) {
        trees.push({ x: rng.range(x0 + 20, x1 - 20), y: rng.range(y0 + 20, y1 - 20), r: rng.range(7, 11) });
      }
    }
  }

  for (let i = 0; i < 3; i += 1) cranes.push({ x: 2240 + i * 110, y: 1500, h: 150 + i * 24 });

  // The safehouse is a walkable yard, not a solid building: standing inside
  // it is what halves the wanted decay, so it must not block movement.
  // The marina lot and the pier are the same: the Falco parks in the lot
  // and the boat waits at the end of the pier, so no building may sit on
  // either of them or the missions that use them could not be reached.
  const blocked = buildings.slice();
  blocked.push(paintShop, policeStation, hospital);

  function circleHits(x, y, r) {
    if (x < r || y < r || x > WORLD.width - r) return true;
    if (y > SEA_TOP - r) {
      if (!(x > pier.x - r && x < pier.x + pier.w + r && y > pier.y)) return true;
    }
    for (const b of blocked) {
      const nx = Math.max(b.x, Math.min(x, b.x + b.w));
      const ny = Math.max(b.y, Math.min(y, b.y + b.h));
      const dx = x - nx;
      const dy = y - ny;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  function sees(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.floor(dist / 24));
    for (let i = 1; i < steps; i += 1) {
      const px = x1 + (dx * i) / steps;
      const py = y1 + (dy * i) / steps;
      for (const b of blocked) {
        if (px > b.x && px < b.x + b.w && py > b.y && py < b.y + b.h) return false;
      }
    }
    return true;
  }

  return {
    buildings, trees, parks, cranes, plaza,
    safehouse, paintShop, policeStation, hospital, marinaLot, pier, boat,
    circleHits, sees, districtAt,
  };
}
