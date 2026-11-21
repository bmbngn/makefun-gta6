// City generation: roads, blocks, buildings, parks, beach, pier and
// landmarks, all from the seeded generator in random.js.

import { CONFIG } from './config.js';

function roadCenters() {
  const list = [];
  for (let v = 0; v <= CONFIG.worldWidth; v += CONFIG.roadEvery) list.push(v);
  return list;
}

function blockRanges() {
  const centers = roadCenters();
  const ranges = [];
  for (let i = 0; i < centers.length - 1; i++) {
    ranges.push({ from: centers[i] + CONFIG.roadWidth / 2 + CONFIG.sidewalk, to: centers[i + 1] - CONFIG.roadWidth / 2 - CONFIG.sidewalk });
  }
  return ranges;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function insideRect(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}

export function generateCity(rng) {
  const xs = blockRanges();
  const ys = blockRanges();
  const buildings = [];
  const parks = [
    { x: 96, y: 96, w: 192, h: 192, trees: 14 },
    { x: 1888, y: 96, w: 192, h: 192, trees: 14 },
  ];
  const noBuild = [
    { x: CONFIG.landmarks.plaza.x - 32, y: CONFIG.landmarks.plaza.y - 32, w: CONFIG.landmarks.plaza.w + 64, h: CONFIG.landmarks.plaza.h + 64 },
    { x: CONFIG.landmarks.marinaLot.x - 16, y: CONFIG.landmarks.marinaLot.y - 16, w: CONFIG.landmarks.marinaLot.w + 32, h: CONFIG.landmarks.marinaLot.h + 32 },
    ...parks.map((p) => ({ x: p.x - 16, y: p.y - 16, w: p.w + 32, h: p.h + 32 })),
  ];

  for (const xr of xs) {
    for (const yr of ys) {
      if (yr.from >= CONFIG.beachTop) continue;
      const blockW = xr.to - xr.from;
      const blockH = yr.to - yr.from;
      if (blockW < 80 || blockH < 80) continue;
      const zone = { x: xr.from, y: yr.from, w: blockW, h: blockH };
      if (noBuild.some((z) => rectsOverlap(zone, z))) continue;
      const district = CONFIG.districts.find((d) => insideRect(xr.from + blockW / 2, yr.from + blockH / 2, d)) || CONFIG.districts[1];
      const count = rng.int(1, 2);
      for (let i = 0; i < count; i++) {
        const w = rng.float(70, Math.min(150, blockW - 8));
        const h = rng.float(60, Math.min(130, blockH - 8));
        const x = xr.from + rng.float(4, Math.max(5, blockW - w - 4));
        const y = yr.from + rng.float(4, Math.max(5, blockH - h - 4));
        const b = { x, y, w, h, roof: rng.pick(CONFIG.palette.roofs), tall: district.tall && rng.chance(0.5), district: district.name };
        if (buildings.some((o) => rectsOverlap(b, { x: o.x - 6, y: o.y - 6, w: o.w + 12, h: o.h + 12 }))) continue;
        buildings.push(b);
      }
    }
  }

  // Named buildings the missions need, placed on the grid.
  const named = [
    { ...CONFIG.landmarks.safehouse, roof: '#8a7fb8', tall: false, district: 'Old Town', name: 'safehouse' },
    { ...CONFIG.landmarks.paintShop, roof: '#d9a03a', tall: false, district: 'Docks', name: 'paintshop' },
    { ...CONFIG.landmarks.policeStation, roof: '#2a4a8a', tall: false, district: 'Downtown', name: 'police' },
    { ...CONFIG.landmarks.hospital, roof: '#e07f7f', tall: false, district: 'Old Town', name: 'hospital' },
  ];
  for (const n of named) buildings.push(n);

  const trees = [];
  for (const p of parks) {
    for (let i = 0; i < p.trees; i++) {
      trees.push({ x: p.x + rng.float(12, p.w - 12), y: p.y + rng.float(12, p.h - 12), r: rng.float(7, 12) });
    }
  }
  for (let i = 0; i < 26; i++) {
    trees.push({ x: rng.float(1700, 2500), y: rng.float(40, 900), r: rng.float(7, 12) });
  }

  return {
    buildings, parks, trees,
    roadsX: roadCenters(), roadsY: roadCenters(),
    plaza: CONFIG.landmarks.plaza,
    pier: CONFIG.landmarks.pier,
    beachTop: CONFIG.beachTop, seaTop: CONFIG.seaTop,
  };
}

export function districtAt(x, y) {
  const d = CONFIG.districts.find((d) => x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h);
  return d ? d.name : 'Solmar Bay';
}

export function isOnRoad(city, x, y) {
  const half = CONFIG.roadWidth / 2;
  for (const cx of city.roadsX) if (Math.abs(x - cx) <= half) return true;
  for (const cy of city.roadsY) if (Math.abs(y - cy) <= half) return true;
  return false;
}

export function isOnSidewalk(city, x, y) {
  if (isOnRoad(city, x, y)) return false;
  const band = CONFIG.roadWidth / 2 + CONFIG.sidewalk;
  for (const cx of city.roadsX) if (Math.abs(x - cx) <= band) return true;
  for (const cy of city.roadsY) if (Math.abs(y - cy) <= band) return true;
  return false;
}

export function buildingAt(city, x, y) {
  return city.buildings.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h) || null;
}

export function circleHitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - nx, dy = y - ny;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

export function pointBlocked(city, x, y) {
  if (x < 0 || y < 0 || x >= CONFIG.worldWidth || y >= CONFIG.worldHeight) return true;
  if (y >= CONFIG.seaTop) return !insideRect(x, y, city.pier);
  if (buildingAt(city, x, y)) return true;
  return false;
}

export function hasLineOfSight(city, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 24));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (buildingAt(city, x1 + dx * t, y1 + dy * t)) return false;
  }
  return true;
}

export function nearestRoadPoint(city, x, y) {
  let best = null, bestD = Infinity;
  for (const cx of city.roadsX) {
    const d = Math.abs(x - cx);
    if (d < bestD) { bestD = d; best = { x: cx, y }; }
  }
  for (const cy of city.roadsY) {
    const d = Math.abs(y - cy);
    if (d < bestD) { bestD = d; best = { x, y: cy }; }
  }
  return best;
}
