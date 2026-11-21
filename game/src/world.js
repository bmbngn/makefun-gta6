// The rules: the player, vehicles, traffic, pedestrians, police, wanted
// level, missions, combat, economy and save. main.js owns the screen flow;
// this file owns everything that happens while the game is playing.

import { CONFIG } from './config.js';
import { generateCity, buildingAt, circleHitsBuilding, hasLineOfSight, isOnRoad, isOnSidewalk, nearestRoadPoint, pointBlocked } from './city.js';
import { makeRng, hashSeed } from './random.js';

const TAU = Math.PI * 2;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }
function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(CONFIG.saveKey);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || s === null) return null;
    return s;
  } catch (e) { return null; }
}

export function saveGame(w) {
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify({
      cash: Math.floor(w.cash),
      done: w.missionsDone,
      current: w.missionIndex,
      best: Math.floor(w.best),
      muted: w.muted,
    }));
  } catch (e) { /* storage off: the game still plays */ }
}

function makeCar(rng, type, x, y, angle, parked) {
  const t = CONFIG.vehicles[type];
  return {
    id: Math.floor(rng.next() * 1e9),
    type, x, y, angle, speed: 0,
    health: t.health, maxHealth: t.health,
    parked: !!parked, driver: !parked, crew: false,
    color: rng.pick(t.colors), ramCd: 0, smoke: false,
  };
}

function spawnParkedCars(w) {
  const rng = w.rng;
  const spots = [
    { type: 'suncab', x: 512, y: 640 },
    { type: 'comet', x: 704, y: 352 },
    { type: 'mule', x: 1632, y: 1056 },
    { type: 'comet', x: 1056, y: 1344 },
    { type: 'suncab', x: 2240, y: 672 },
    { type: 'comet', x: 1344, y: 352 },
    { type: 'mule', x: 352, y: 1344 },
    { type: 'comet', x: 2240, y: 1056 },
  ];
  for (const s of spots) {
    const c = makeCar(rng, s.type, s.x, s.y, rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), true);
    w.cars.push(c);
  }
  const falco = makeCar(rng, 'falco', 1984, 1472, Math.PI / 2, true);
  w.cars.push(falco);
  w.falcoCar = falco;
  w.sunCab = w.cars[0];
  // The mission-one car must face along its road (east, toward the Docks),
  // not into the block south of it: parked angles are random, and a
  // south-facing start drives nose-first into the building 97px away
  // before the car has enough speed to steer out of it.
  w.sunCab.angle = 0;
}

function spawnTraffic(w) {
  const rng = w.rng;
  for (let i = 0; i < CONFIG.trafficCount; i++) {
    const vertical = rng.chance(0.5);
    const road = rng.pick(vertical ? w.city.roadsX : w.city.roadsY);
    const along = rng.float(100, CONFIG.worldHeight - 100);
    const dir = rng.sign();
    const type = rng.chance(0.7) ? 'comet' : rng.pick(['suncab', 'mule']);
    const c = makeCar(rng, type, vertical ? road + (dir > 0 ? 16 : -16) : along, vertical ? along : road + (dir > 0 ? 16 : -16), vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI), false);
    c.traffic = true;
    c.trafficAxis = vertical ? 'y' : 'x';
    c.trafficDir = dir;
    c.speed = rng.float(CONFIG.trafficSpeed.min, CONFIG.trafficSpeed.max);
    w.cars.push(c);
    w.traffic.push(c);
  }
}

function spawnPeds(w) {
  const rng = w.rng;
  for (let i = 0; i < CONFIG.pedCount; i++) {
    const x = rng.float(80, CONFIG.worldWidth - 80);
    const y = rng.float(80, CONFIG.beachTop - 80);
    w.peds.push({
      x, y, angle: rng.float(0, TAU),
      speed: rng.float(CONFIG.pedSpeed.min, CONFIG.pedSpeed.max),
      state: 'walk', downTimer: 0, fleeTimer: 0, color: rng.pick(['#e8d9a0', '#a0c9e8', '#e8a0a0', '#a0e8b8', '#d9c9e8']),
    });
  }
}

function spawnPickup(w, rng) {
  const x = rng.float(80, CONFIG.worldWidth - 80);
  const y = rng.float(80, CONFIG.beachTop - 80);
  if (buildingAt(w.city, x, y)) return;
  w.pickups.push({ x, y, value: rng.int(10, 25), bob: rng.float(0, TAU) });
}

export function createWorld(seed, saveData) {
  const rng = makeRng(hashSeed('solmar-bay-' + seed));
  const city = generateCity(rng);
  const w = {
    seed, rng, city,
    time: 0, shake: 0, screen: 'title',
    player: { x: 480, y: 640, angle: 0, health: 100, speed: 0, onFoot: true, carId: null, punchCd: 0, punchAnim: 0 },
    cars: [], traffic: [], peds: [],
    policeCars: [], officers: [],
    wanted: 0, unseenTimer: 0,
    cash: 0, earned: 0, best: 0,
    carsStolen: 0, packagesCollected: 0,
    missionsDone: [], missionIndex: 0, mission: null,
    pickups: [], popups: [], skids: [],
    message: '', messageTimer: 0,
    pendingEvent: null, muted: false,
    ilsaAboard: false, combo: 0, comboTimer: 0,
    falcoCar: null, sunCab: null,
  };
  if (saveData) {
    w.cash = saveData.cash || 0;
    w.earned = saveData.cash || 0;
    w.best = saveData.best || 0;
    w.missionsDone = Array.isArray(saveData.done) ? saveData.done.slice() : [];
    w.missionIndex = saveData.current || 0;
    w.muted = !!saveData.muted;
  }
  spawnParkedCars(w);
  spawnTraffic(w);
  spawnPeds(w);
  for (let i = 0; i < 8; i++) spawnPickup(w, rng);
  return w;
}

export function raiseWanted(w, n) {
  if (n <= 0) return;
  w.wanted = clamp(w.wanted + n, 0, CONFIG.wantedMax);
  w.unseenTimer = 0;
  syncPolice(w);
}

export function syncPolice(w) {
  const wantCars = w.wanted;
  while (w.policeCars.length < wantCars) {
    let x = w.player.x, y = w.player.y;
    for (let tries = 0; tries < 8; tries++) {
      const a = w.rng.float(0, TAU);
      const d = w.rng.float(380, 560);
      const cx = clamp(w.player.x + Math.cos(a) * d, 80, CONFIG.worldWidth - 80);
      const cy = clamp(w.player.y + Math.sin(a) * d, 80, CONFIG.beachTop - 80);
      const p = nearestRoadPoint(w.city, cx, cy);
      const sx = p ? p.x : cx, sy = p ? p.y : cy;
      x = sx; y = sy;
      if (dist(sx, sy, w.player.x, w.player.y) >= 250) break;
    }
    const c = makeCar(w.rng, 'police', x, y, angleTo(x, y, w.player.x, w.player.y), false);
    c.police = true;
    c.speed = 200 + w.wanted * 30;
    w.policeCars.push(c);
    w.cars.push(c);
  }
  while (w.policeCars.length > wantCars) {
    const c = w.policeCars.pop();
    const i = w.cars.indexOf(c);
    if (i >= 0) w.cars.splice(i, 1);
  }
  const wantOfficers = w.wanted >= 5 ? 2 : w.wanted >= 1 ? 1 : 0;
  while (w.officers.length < wantOfficers) {
    const a = w.rng.float(0, TAU);
    w.officers.push({
      x: clamp(w.player.x + Math.cos(a) * 300, 40, CONFIG.worldWidth - 40),
      y: clamp(w.player.y + Math.sin(a) * 300, 40, CONFIG.beachTop - 40),
      angle: 0, health: 100, contactTimer: 0, punchCd: 0, downTimer: 0,
    });
  }
  while (w.officers.length > wantOfficers) w.officers.pop();
}

function missionTarget(w) {
  const m = w.mission;
  if (!m) return null;
  return m.target;
}

export function beginMission(w, index) {
  const def = CONFIG.missions[index];
  if (!def) return false;
  const L = CONFIG.landmarks;
  const m = { def, index, stage: 0, timer: def.timer || 0, got: 0, target: null, packages: [] };
  if (index === 0) {
    m.target = { x: w.sunCab.x, y: w.sunCab.y, r: 60, label: 'Get in the SunCab' };
  } else if (index === 1) {
    m.target = { x: w.falcoCar.x, y: w.falcoCar.y, r: 60, label: 'Steal the Falco GT' };
  } else if (index === 2) {
    w.wanted = 3; syncPolice(w);
    m.target = { x: L.safehouse.x + L.safehouse.w / 2, y: L.safehouse.y + L.safehouse.h / 2, r: 90, label: 'Lose the heat, then reach the safehouse' };
  } else if (index === 3) {
    m.packages = [
      { x: 1216, y: 288, got: false },
      { x: 512, y: 512, got: false },
      { x: 2112, y: 1152, got: false },
    ];
    m.target = { x: m.packages[0].x, y: m.packages[0].y, r: 46, label: 'Collect package 1 of 3' };
  } else if (index === 4) {
    w.wanted = 4; syncPolice(w);
    w.ilsaAboard = true;
    m.target = { x: L.pierMarker.x, y: L.pierMarker.y, r: 70, label: 'Drive Ilsa to the Marina boat' };
  }
  w.mission = m;
  w.missionIndex = index;
  return true;
}

function addPopup(w, x, y, text) {
  w.popups.push({ x, y, text, life: 1.2 });
  if (w.popups.length > 24) w.popups.shift();
}

function giveCash(w, amount, x, y) {
  w.cash += amount;
  w.earned += amount;
  if (w.earned > w.best) w.best = w.earned;
  if (x !== undefined) addPopup(w, x, y, '+' + amount);
}

function completeMission(w) {
  const m = w.mission;
  if (!m) return;
  giveCash(w, m.def.reward, w.player.x, w.player.y - 30);
  if (!w.missionsDone.includes(m.index)) w.missionsDone.push(m.index);
  w.mission = null;
  w.ilsaAboard = false;
  w.pendingEvent = 'complete';
  saveGame(w);
}

function failMission(w, why) {
  w.mission = null;
  w.ilsaAboard = false;
  w.pendingEvent = 'failed';
  w.failReason = why || 'Mission failed';
}

function bustPlayer(w) {
  w.cash = Math.floor(w.cash * (1 - CONFIG.bustedLoss));
  w.wanted = 0; syncPolice(w);
  const L = CONFIG.landmarks;
  w.player.x = L.policeStation.x + L.policeStation.w / 2;
  w.player.y = L.policeStation.y + L.policeStation.h + 30;
  w.player.health = 100;
  w.player.onFoot = true; w.player.carId = null; w.player.speed = 0;
  w.pendingEvent = 'busted';
}

function wastePlayer(w) {
  w.cash = Math.floor(w.cash * (1 - CONFIG.bustedLoss));
  w.wanted = 0; syncPolice(w);
  const L = CONFIG.landmarks;
  w.player.x = L.hospital.x + L.hospital.w / 2;
  w.player.y = L.hospital.y + L.hospital.h + 30;
  w.player.health = 100;
  w.player.onFoot = true; w.player.carId = null; w.player.speed = 0;
  w.pendingEvent = 'wasted';
}

function playerCar(w) {
  if (w.player.onFoot) return null;
  return w.cars.find((c) => c.id === w.player.carId) || null;
}

function tryEnterCar(w, audio) {
  const p = w.player;
  let bestCar = null, bestD = 60;
  for (const c of w.cars) {
    if (c.police) continue;
    const d = dist(p.x, p.y, c.x, c.y);
    if (d < bestD) { bestD = d; bestCar = c; }
  }
  if (!bestCar) return false;
  if (bestCar.traffic && bestCar.driver) {
    bestCar.driver = false;
    bestCar.parked = true;
    bestCar.traffic = false;
    w.carsStolen++;
    let seen = false;
    for (const ped of w.peds) {
      if (dist(p.x, p.y, ped.x, ped.y) < CONFIG.stealSightRange && hasLineOfSight(w.city, p.x, p.y, ped.x, ped.y)) { seen = true; break; }
    }
    if (!seen) {
      for (const o of w.officers) {
        if (dist(p.x, p.y, o.x, o.y) < CONFIG.stealSightRange && hasLineOfSight(w.city, p.x, p.y, o.x, o.y)) { seen = true; break; }
      }
    }
    if (seen) raiseWanted(w, 1);
    addPopup(w, p.x, p.y - 24, 'STOLEN');
  } else if (bestCar.parked) {
    w.carsStolen++;
  }
  bestCar.parked = false;
  p.onFoot = false;
  p.carId = bestCar.id;
  p.angle = bestCar.angle;
  if (audio) audio.click();
  return true;
}

function tryExitCar(w) {
  const p = w.player;
  const car = playerCar(w);
  if (!car) return;
  car.speed = 0;
  const side = nearestRoadPoint(w.city, p.x, p.y);
  let nx = p.x + Math.cos(p.angle + Math.PI / 2) * 34;
  let ny = p.y + Math.sin(p.angle + Math.PI / 2) * 34;
  if (pointBlocked(w.city, nx, ny)) {
    nx = p.x - Math.cos(p.angle + Math.PI / 2) * 34;
    ny = p.y - Math.sin(p.angle + Math.PI / 2) * 34;
  }
  if (side) { nx = side.x; ny = side.y; }
  p.x = clamp(nx, 20, CONFIG.worldWidth - 20);
  p.y = clamp(ny, 20, CONFIG.beachTop - 20);
  p.onFoot = true;
  p.carId = null;
  p.speed = 0;
}

function moveWithCollision(w, body, nx, ny, r) {
  const tryX = { x: nx, y: body.y };
  if (!circleHitsBuilding(w.city, tryX.x, tryX.y, r) && !pointBlocked(w.city, tryX.x, tryX.y)) body.x = nx;
  const tryY = { x: body.x, y: ny };
  if (!circleHitsBuilding(w.city, tryY.x, tryY.y, r) && !pointBlocked(w.city, tryY.x, tryY.y)) body.y = ny;
}

function updatePlayerOnFoot(w, input, audio, dt) {
  const p = w.player;
  const ax = input.axisX(), ay = input.axisY();
  const run = input.down('sprint');
  const speed = run ? CONFIG.onFoot.walk * 1.6 : CONFIG.onFoot.walk;
  let mx = 0, my = 0;
  if (ax !== 0 || ay !== 0) {
    const len = Math.hypot(ax, ay);
    mx = (ax / len) * speed * dt;
    my = (ay / len) * speed * dt;
    p.angle = Math.atan2(ay, ax);
  }
  const sand = p.y > CONFIG.beachTop;
  const slow = sand ? 0.6 : 1;
  moveWithCollision(w, p, p.x + mx * slow, p.y + my * slow, 12);
  p.speed = (ax !== 0 || ay !== 0) ? speed * slow : 0;
  if (p.punchCd > 0) p.punchCd -= dt;
  if (p.punchAnim > 0) p.punchAnim -= dt;
  if (input.pressed('punch') && p.punchCd <= 0) {
    p.punchCd = CONFIG.onFoot.punchCooldown;
    p.punchAnim = 0.25;
    if (audio) audio.punch();
    const fx = p.x + Math.cos(p.angle) * 30;
    const fy = p.y + Math.sin(p.angle) * 30;
    for (const ped of w.peds) {
      if (ped.state === 'down') continue;
      if (dist(fx, fy, ped.x, ped.y) < CONFIG.onFoot.punchRange) {
        ped.state = 'down'; ped.downTimer = 3;
        const drop = w.rng.int(2, 6);
        w.pickups.push({ x: ped.x, y: ped.y, value: drop, bob: 0 });
        raiseWanted(w, 1);
      }
    }
    for (const o of w.officers) {
      if (o.downTimer > 0) continue;
      if (dist(fx, fy, o.x, o.y) < CONFIG.onFoot.punchRange + 8) {
        o.health -= CONFIG.onFoot.punchDamage;
        o.contactTimer = 0;
        if (o.health <= 0) { o.downTimer = 5; o.health = 100; }
        raiseWanted(w, 1);
      }
    }
  }
  if (input.pressed('enter')) tryEnterCar(w, audio);
}

function updatePlayerDriving(w, input, audio, dt) {
  const p = w.player;
  const car = playerCar(w);
  if (!car) { p.onFoot = true; return; }
  const t = CONFIG.vehicles[car.type];
  const forward = input.down('up');
  const back = input.down('down');
  const steerIn = input.axisX();
  const handbrake = input.down('handbrake');
  const offroad = !isOnRoad(w.city, car.x, car.y);
  const top = t.topSpeed * (offroad ? 0.6 : 1);
  if (forward) car.speed += t.accel * dt;
  if (back) {
    if (car.speed > 20) car.speed -= t.brake * dt;
    else car.speed -= t.accel * 0.6 * dt;
  }
  if (!forward && !back) car.speed -= Math.sign(car.speed) * 140 * dt;
  car.speed = clamp(car.speed, -t.reverse, top);
  if (Math.abs(car.speed) < 4 && !forward && !back) car.speed = 0;
  const speedRatio = clamp(Math.abs(car.speed) / t.topSpeed, 0, 1);
  const steerSharp = 0.45 + 0.6 * Math.min(1, Math.abs(car.speed) / 220);
  const steerEase = 1 - 0.35 * speedRatio;
  const grip = handbrake ? t.grip * 0.25 : t.grip;
  car.angle += steerIn * t.steer * steerSharp * steerEase * clamp(Math.abs(car.speed) / 60, 0, 1) * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const before = { x: car.x, y: car.y };
  moveWithCollision(w, car, nx, ny, 16);
  const hitWall = Math.abs(car.x - nx) > 1 || Math.abs(car.y - ny) > 1;
  if (hitWall && Math.abs(car.speed) > 120) {
    car.health -= Math.abs(car.speed) * 0.04;
    car.speed *= 0.55;
    w.shake = Math.min(10, Math.abs(car.speed) * 0.02);
    if (audio) audio.crash();
  } else if (hitWall) {
    car.speed *= 0.8;
  }
  if (handbrake && Math.abs(car.speed) > 120) {
    w.skids.push({ x1: before.x, y1: before.y, x2: car.x, y2: car.y, life: 4 });
    if (w.skids.length > 220) w.skids.shift();
    if (audio) audio.drift(true);
  } else if (audio) {
    audio.drift(false);
  }
  p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
  if (car.health <= 0) {
    car.health = 0;
    p.onFoot = true; p.carId = null;
    p.health -= 20;
    p.x = clamp(car.x + 40, 20, CONFIG.worldWidth - 20);
    p.y = clamp(car.y, 20, CONFIG.beachTop - 20);
    w.shake = 12;
    if (audio) audio.crash();
    if (p.health <= 0) { wastePlayer(w); return; }
  }
  if (input.pressed('enter')) tryExitCar(w);
  if (audio) audio.engine(clamp(Math.abs(car.speed) / t.topSpeed, 0, 1), true);
}

function updateCarCollisions(w, audio) {
  const cars = w.cars;
  for (let i = 0; i < cars.length; i++) {
    for (let j = i + 1; j < cars.length; j++) {
      const a = cars[i], b = cars[j];
      if (a.parked && b.parked) continue;
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 44 && d > 0.01) {
        const impact = Math.abs(a.speed - b.speed);
        const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
        const push = (44 - d) / 2;
        if (!a.parked) { a.x -= nx * push; a.y -= ny * push; }
        if (!b.parked) { b.x += nx * push; b.y += ny * push; }
        if (impact > 120) {
          const dmg = impact * 0.05;
          if (!a.parked) a.health -= dmg;
          if (!b.parked) b.health -= dmg;
          const s = 0.6;
          const aSp = a.speed, bSp = b.speed;
          if (!a.parked) a.speed = bSp * s;
          if (!b.parked) b.speed = aSp * s;
          w.shake = Math.min(10, impact * 0.02);
          if (audio) audio.crash();
          const playerIn = (c) => !w.player.onFoot && w.player.carId === c.id;
          if (playerIn(a) || playerIn(b)) {
            const other = playerIn(a) ? b : a;
            if (other.police) raiseWanted(w, 1);
          }
        }
      }
    }
  }
  for (const c of cars) {
    if (c.health < c.maxHealth * 0.4) c.smoke = true;
    if (c.health <= 0 && !c.parked && !c.police) c.health = 0;
  }
}

function updateTraffic(w, dt) {
  const p = w.player;
  for (const c of w.traffic) {
    if (dist(c.x, c.y, p.x, p.y) > CONFIG.trafficDespawn) {
      const vertical = w.rng.chance(0.5);
      const road = w.rng.pick(vertical ? w.city.roadsX : w.city.roadsY);
      const along = w.rng.float(100, CONFIG.worldHeight - 100);
      const dir = w.rng.sign();
      c.x = vertical ? road + (dir > 0 ? 16 : -16) : along;
      c.y = vertical ? along : road + (dir > 0 ? 16 : -16);
      c.trafficAxis = vertical ? 'y' : 'x';
      c.trafficDir = dir;
      c.angle = vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
      c.speed = w.rng.float(CONFIG.trafficSpeed.min, CONFIG.trafficSpeed.max);
      continue;
    }
    let ahead = Infinity;
    for (const o of w.cars) {
      if (o === c || o.parked) continue;
      if (c.trafficAxis === 'y') {
        if (Math.abs(o.x - c.x) < 40 && (o.y - c.y) * c.trafficDir > 0 && (o.y - c.y) * c.trafficDir < ahead) ahead = (o.y - c.y) * c.trafficDir;
      } else {
        if (Math.abs(o.y - c.y) < 40 && (o.x - c.x) * c.trafficDir > 0 && (o.x - c.x) * c.trafficDir < ahead) ahead = (o.x - c.x) * c.trafficDir;
      }
    }
    const want = ahead < CONFIG.carAheadSlow ? 60 : w.rng.float(CONFIG.trafficSpeed.min, CONFIG.trafficSpeed.max);
    c.speed += clamp(want - c.speed, -200 * dt, 200 * dt);
    if (c.trafficAxis === 'y') c.y += c.trafficDir * c.speed * dt;
    else c.x += c.trafficDir * c.speed * dt;
    if (c.x < -40) c.x = CONFIG.worldWidth + 40;
    if (c.x > CONFIG.worldWidth + 40) c.x = -40;
    if (c.y < -40) c.y = CONFIG.beachTop + 40;
    if (c.y > CONFIG.beachTop + 40) c.y = -40;
  }
}

function updatePeds(w, dt) {
  const p = w.player;
  const car = playerCar(w);
  for (const ped of w.peds) {
    if (ped.state === 'down') {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) ped.state = 'walk';
      continue;
    }
    let flee = false;
    if (ped.fleeTimer > 0) { ped.fleeTimer -= dt; flee = true; }
    const threat = car && !w.player.onFoot && dist(ped.x, ped.y, car.x, car.y) < 150 && Math.abs(car.speed) > 150;
    const chaseNear = w.policeCars.some((c) => dist(ped.x, ped.y, c.x, c.y) < 150);
    if (threat || chaseNear) { flee = true; ped.fleeTimer = 1.2; }
    if (flee) {
      const a = angleTo(p.x, p.y, ped.x, ped.y);
      ped.angle = a;
      const nx = ped.x + Math.cos(a) * CONFIG.pedFleeSpeed * dt;
      const ny = ped.y + Math.sin(a) * CONFIG.pedFleeSpeed * dt;
      if (!pointBlocked(w.city, nx, ny)) { ped.x = nx; ped.y = ny; }
      continue;
    }
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    if (pointBlocked(w.city, ped.x, ped.y) || ped.x < 20 || ped.y < 20 || ped.x > CONFIG.worldWidth - 20 || ped.y > CONFIG.beachTop - 20) {
      ped.angle = w.rng.float(0, TAU);
      ped.x = clamp(ped.x, 20, CONFIG.worldWidth - 20);
      ped.y = clamp(ped.y, 20, CONFIG.beachTop - 20);
    }
    if (w.rng.chance(0.002)) ped.angle = w.rng.float(0, TAU);
    if (car && !w.player.onFoot && Math.abs(car.speed) > 200 && dist(ped.x, ped.y, car.x, car.y) < 30) {
      ped.state = 'down'; ped.downTimer = 3;
      w.pickups.push({ x: ped.x, y: ped.y, value: w.rng.int(2, 6), bob: 0 });
      raiseWanted(w, 1);
    }
  }
}

function updatePolice(w, audio, dt) {
  const p = w.player;
  syncPolice(w);
  for (const c of w.policeCars) {
    const t = CONFIG.vehicles.police;
    const targetAngle = angleTo(c.x, c.y, p.x, p.y);
    const diff = angleDiff(c.angle, targetAngle);
    c.angle += clamp(diff, -3.2 * dt, 3.2 * dt);
    const want = t.topSpeed * (0.75 + w.wanted * 0.05);
    c.speed += clamp(want - c.speed, -300 * dt, 300 * dt);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    moveWithCollision(w, c, nx, ny, 16);
    const pc = playerCar(w);
    if (pc && dist(c.x, c.y, pc.x, pc.y) < 34) {
      if (c.ramCd <= 0) {
        const impact = Math.abs(c.speed - pc.speed);
        if (impact > 120) {
          pc.health -= impact * CONFIG.policeRamDamage;
          pc.speed *= 0.6;
          c.speed = -CONFIG.policeRamSpeed;
          c.ramCd = 1;
          w.shake = 8;
          if (audio) audio.crash();
        }
      }
    }
    if (c.ramCd > 0) c.ramCd -= dt;
  }
  for (const o of w.officers) {
    if (o.downTimer > 0) { o.downTimer -= dt; continue; }
    const d = dist(o.x, o.y, p.x, p.y);
    if (w.player.onFoot) {
      o.angle = angleTo(o.x, o.y, p.x, p.y);
      const nx = o.x + Math.cos(o.angle) * CONFIG.officerSpeed * dt;
      const ny = o.y + Math.sin(o.angle) * CONFIG.officerSpeed * dt;
      if (!pointBlocked(w.city, nx, ny)) { o.x = nx; o.y = ny; }
      if (d < 26) {
        o.contactTimer += dt;
        if (o.punchCd <= 0) {
          o.punchCd = 0.8;
          w.player.health -= 8;
          w.shake = 5;
          if (audio) audio.punch();
          if (w.player.health <= 0) { wastePlayer(w); return; }
        }
        if (o.contactTimer >= CONFIG.officerBustSeconds && w.wanted > 0) { bustPlayer(w); return; }
      } else {
        o.contactTimer = Math.max(0, o.contactTimer - dt);
      }
    } else {
      o.angle = angleTo(o.x, o.y, p.x, p.y);
      const nx = o.x + Math.cos(o.angle) * CONFIG.officerSpeed * dt;
      const ny = o.y + Math.sin(o.angle) * CONFIG.officerSpeed * dt;
      if (!pointBlocked(w.city, nx, ny)) { o.x = nx; o.y = ny; }
    }
    if (o.punchCd > 0) o.punchCd -= dt;
  }
  let anySeen = false;
  for (const c of w.policeCars) {
    if (hasLineOfSight(w.city, c.x, c.y, p.x, p.y) && dist(c.x, c.y, p.x, p.y) < 700) { anySeen = true; break; }
  }
  if (!anySeen) {
    for (const o of w.officers) {
      if (hasLineOfSight(w.city, o.x, o.y, p.x, p.y) && dist(o.x, o.y, p.x, p.y) < 500) { anySeen = true; break; }
    }
  }
  if (w.wanted > 0) {
    if (!anySeen) {
      w.unseenTimer += dt;
      let limit = CONFIG.wantedDecaySeconds[w.wanted];
      const L = CONFIG.landmarks;
      const inSafe = p.x >= L.safehouse.x && p.x < L.safehouse.x + L.safehouse.w && p.y >= L.safehouse.y && p.y < L.safehouse.y + L.safehouse.h;
      if (inSafe) limit /= 2;
      if (w.unseenTimer >= limit) {
        w.wanted -= 1;
        w.unseenTimer = 0;
        syncPolice(w);
        addPopup(w, p.x, p.y - 30, 'HEAT DOWN');
      }
    } else {
      w.unseenTimer = 0;
    }
  }
  const near = w.policeCars.some((c) => dist(c.x, c.y, p.x, p.y) < 600);
  if (audio) audio.siren(w.wanted >= 2 && near);
}

function updateMissions(w, audio, dt) {
  const m = w.mission;
  if (!m) return;
  const p = w.player;
  const L = CONFIG.landmarks;
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) { failMission(w, 'Time ran out'); return; }
  }
  if (m.index === 0) {
    if (m.stage === 0) {
      if (!p.onFoot) {
        m.stage = 1;
        m.target = { x: L.docksMarker.x, y: L.docksMarker.y, r: 60, label: 'Drive to the Docks marker' };
      }
    } else if (dist(p.x, p.y, L.docksMarker.x, L.docksMarker.y) < 60) {
      completeMission(w);
      if (audio) audio.jingle();
    }
  } else if (m.index === 1) {
    if (m.stage === 0) {
      if (!p.onFoot && p.carId === w.falcoCar.id) {
        m.stage = 1;
        m.target = { x: L.paintShop.x + L.paintShop.w / 2, y: L.paintShop.y + L.paintShop.h / 2, r: 80, label: 'Reach the paint shop' };
      }
    } else if (!p.onFoot && dist(p.x, p.y, L.paintShop.x + L.paintShop.w / 2, L.paintShop.y + L.paintShop.h / 2) < 90) {
      if (w.cash >= CONFIG.resprayCost) {
        w.cash -= CONFIG.resprayCost;
        w.wanted = 0; syncPolice(w);
        const car = playerCar(w);
        if (car) car.health = car.maxHealth;
        completeMission(w);
        if (audio) audio.jingle();
      } else {
        w.message = 'Respray costs $100 — earn more first';
        w.messageTimer = 2;
      }
    }
  } else if (m.index === 2) {
    if (w.wanted === 0 && dist(p.x, p.y, L.safehouse.x + L.safehouse.w / 2, L.safehouse.y + L.safehouse.h / 2) < 100) {
      completeMission(w);
      if (audio) audio.jingle();
    }
  } else if (m.index === 3) {
    for (const pkg of m.packages) {
      if (!pkg.got && dist(p.x, p.y, pkg.x, pkg.y) < 46) {
        pkg.got = true;
        m.got++;
        w.packagesCollected++;
        addPopup(w, pkg.x, pkg.y - 20, 'PACKAGE ' + m.got + '/3');
        if (audio) audio.pickup();
        const next = m.packages.find((q) => !q.got);
        if (next) m.target = { x: next.x, y: next.y, r: 46, label: 'Collect package ' + (m.got + 1) + ' of 3' };
        else m.target = { x: L.pierMarker.x, y: L.pierMarker.y, r: 70, label: 'Deliver to the Pier' };
      }
    }
    if (m.got === 3 && dist(p.x, p.y, L.pierMarker.x, L.pierMarker.y) < 70) {
      completeMission(w);
      if (audio) audio.jingle();
    }
  } else if (m.index === 4) {
    if (w.ilsaAboard && !p.onFoot && dist(p.x, p.y, L.pierMarker.x, L.pierMarker.y) < 70) {
      completeMission(w);
      if (audio) audio.jingle();
    }
  }
}

function updatePickups(w, audio, dt) {
  const p = w.player;
  if (w.comboTimer > 0) {
    w.comboTimer -= dt;
    if (w.comboTimer <= 0) w.combo = 0;
  }
  for (let i = w.pickups.length - 1; i >= 0; i--) {
    const pk = w.pickups[i];
    pk.bob += dt * 3;
    if (dist(p.x, p.y, pk.x, pk.y) < 30) {
      w.combo++;
      w.comboTimer = 2;
      const amount = pk.value + (w.combo > 1 ? (w.combo - 1) * 2 : 0);
      giveCash(w, amount, pk.x, pk.y - 16);
      if (w.combo > 1) addPopup(w, pk.x, pk.y - 36, 'COMBO x' + w.combo);
      w.pickups.splice(i, 1);
      if (audio) audio.pickup();
    }
  }
  while (w.pickups.length < 8) spawnPickup(w, w.rng);
  for (let i = w.popups.length - 1; i >= 0; i--) {
    w.popups[i].life -= dt;
    w.popups[i].y -= 24 * dt;
    if (w.popups[i].life <= 0) w.popups.splice(i, 1);
  }
  for (let i = w.skids.length - 1; i >= 0; i--) {
    w.skids[i].life -= dt;
    if (w.skids[i].life <= 0) w.skids.splice(i, 1);
  }
  if (w.messageTimer > 0) w.messageTimer -= dt;
  if (w.shake > 0) w.shake = Math.max(0, w.shake - dt * 30);
}

export function updatePlaying(w, input, audio, dt) {
  w.time += dt;
  w.pendingEvent = null;
  if (w.player.onFoot) updatePlayerOnFoot(w, input, audio, dt);
  else updatePlayerDriving(w, input, audio, dt);
  if (w.pendingEvent) return;
  updateCarCollisions(w, audio);
  updateTraffic(w, dt);
  updatePeds(w, dt);
  updatePolice(w, audio, dt);
  if (w.pendingEvent) return;
  updateMissions(w, audio, dt);
  if (w.pendingEvent) return;
  updatePickups(w, audio, dt);
}

export function currentObjective(w) {
  const m = w.mission;
  if (m) return m.target ? m.target.label : m.def.objective;
  if (w.missionsDone.length >= 5) return 'Free roam — story complete. Pause to replay a mission.';
  return 'Free roam — open the pause menu to start the next job.';
}

export function winLoseLines(w) {
  const m = w.mission;
  if (m) return { win: 'WIN: ' + m.def.win, lose: 'LOSE: ' + m.def.lose };
  return { win: 'WIN: finish the job', lose: 'LOSE: busted or wasted' };
}
