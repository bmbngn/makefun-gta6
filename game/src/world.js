// The rules of Solmar Bay: the player on foot and in cars, traffic and
// pedestrians, the wanted level and the police, the five story missions,
// cash and the save. The renderer only paints this state; it never
// changes it. Every number comes from config.js or the seeded city.
import {
  STEP, WORLD, PLAYER, VEHICLES, TRAFFIC_COUNT, PED_COUNT, PICKUP_COUNT,
  WANTED_DECAY, POLICE_CARS, POLICE_SPEED, MISSIONS,
} from './config.js';
import { createCity, onWalkable, roadPointNear } from './city.js';

export const EVENT_CRASH = 1;
export const EVENT_PICKUP = 2;
export const EVENT_PUNCH = 4;
export const EVENT_MISSION = 8;
export const EVENT_BUSTED = 16;
export const EVENT_WASTED = 32;
export const EVENT_FAILED = 64;
export const EVENT_SCREECH = 128;
export const EVENT_OVER = EVENT_BUSTED | EVENT_WASTED;

const TAU = Math.PI * 2;

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}
function turnToward(angle, target, maxTurn) {
  let d = target - angle;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return angle + Math.max(-maxTurn, Math.min(maxTurn, d));
}
function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function createWorld(rng) {
  const city = createCity(rng);
  const state = {};

  function freshCar(kind, x, y, angle, opts) {
    const spec = VEHICLES[kind];
    return {
      id: Math.floor(rng.next() * 1e9), kind, spec,
      x, y, angle: angle ?? rng.next() * TAU, speed: 0,
      health: spec.health, parked: !!(opts && opts.parked),
      traffic: !!(opts && opts.traffic), police: kind === 'police',
      crew: !!(opts && opts.crew),
      axis: opts && opts.axis ? opts.axis : 'x',
      line: opts && opts.line !== undefined ? opts.line : 0,
      dir: opts && opts.dir ? opts.dir : 1,
      lane: opts && opts.lane !== undefined ? opts.lane : 16,
      smoke: false, fire: false, driverOut: false, ramCd: 0,
    };
  }

  function freshPed(x, y) {
    return {
      x, y, tx: x, ty: y, speed: rng.range(40, 70),
      down: 0, flee: 0, angle: rng.next() * TAU,
    };
  }

  function spawnTrafficCar() {
    const horizontal = rng.chance(0.5);
    const lines = horizontal ? [0, 320, 640, 960, 1280, 1600] : [0, 320, 640, 960, 1280, 1600, 1920, 2240];
    const line = rng.pick(lines);
    const dir = rng.chance(0.5) ? 1 : -1;
    const t = rng.range(0, 1);
    const x = horizontal ? rng.range(80, WORLD.width - 80) : line + (dir > 0 ? -16 : 16);
    const y = horizontal ? line + (dir > 0 ? 16 : -16) : rng.range(80, WORLD.height - 220);
    const car = freshCar(rng.pick(['comet', 'comet', 'suncab', 'mule']), x, y, horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2), {
      traffic: true, axis: horizontal ? 'x' : 'y', line, dir, lane: dir > 0 ? 16 : -16,
    });
    car.speed = rng.range(140, 220);
    return car;
  }

  function spawnPed() {
    const p = roadPointNear(rng, rng.range(100, WORLD.width - 100), rng.range(100, WORLD.height - 300));
    return freshPed(p.x, p.y);
  }

  function markerFor(mission, stage) {
    if (mission === 0) return stage === 0 ? { x: 640, y: 456, label: 'SunCab' } : { x: 2160, y: 1560, label: 'Docks' };
    if (mission === 1) return stage === 0 ? { x: 2060, y: 1700, label: 'Falco GT' } : { x: 2080, y: 1500, label: 'Paint shop' };
    if (mission === 2) return { x: 468, y: 456, label: 'Safehouse' };
    if (mission === 3) {
      if (stage === 0) return { x: 1280, y: 480, label: 'Package 1/3' };
      if (stage === 1) return { x: 480, y: 800, label: 'Package 2/3' };
      if (stage === 2) return { x: 2200, y: 1500, label: 'Package 3/3' };
      return { x: 2048, y: 1890, label: 'Pier' };
    }
    return { x: 2048, y: 1890, label: 'Marina boat' };
  }

  function reset() {
    state.time = 0;
    state.cash = 0;
    state.score = 0;
    state.best = 0;
    state.player = {
      x: 640, y: 520, angle: -Math.PI / 2, health: PLAYER.health,
      onFoot: true, carId: null, punchCd: 0, contact: 0, speed: 0,
    };
    state.cars = [];
    for (let i = 0; i < TRAFFIC_COUNT; i += 1) state.cars.push(spawnTrafficCar());
    state.cars.push(freshCar('suncab', 640, 480, 0, { parked: true, crew: true }));
    state.cars.push(freshCar('falco', 2060, 1700, Math.PI / 2, { parked: true }));
    state.cars.push(freshCar('comet', 900, 960, 0, { parked: true }));
    state.cars.push(freshCar('mule', 1500, 1300, Math.PI, { parked: true }));
    state.cars.push(freshCar('suncab', 256, 1400, Math.PI / 2, { parked: true }));
    state.peds = [];
    for (let i = 0; i < PED_COUNT; i += 1) state.peds.push(spawnPed());
    state.peds.push(freshPed(2100, 1660));
    state.peds.push(freshPed(2000, 1740));
    state.officers = [];
    state.wanted = 0;
    state.wantedTimer = 0;
    state.wantedFloor = 0;
    state.seen = false;
    state.missionIndex = 0;
    state.missionStage = 0;
    state.missionState = 'idle';
    state.missionTimer = 0;
    state.mission = MISSIONS[0];
    state.marker = null;
    state.pickups = [];
    for (let i = 0; i < PICKUP_COUNT; i += 1) {
      const p = roadPointNear(rng, rng.range(100, WORLD.width - 100), rng.range(100, WORLD.height - 300));
      state.pickups.push({ x: p.x, y: p.y, value: rng.int(10, 25) });
    }
    state.popups = [];
    state.skids = [];
    state.banner = null;
    state.passenger = false;
    state.combo = 0;
    state.comboTimer = 0;
    state.carsStolen = 0;
    state.storyDone = false;
    state.pickupTimer = 0;
    state.shake = 0;
  }

  function addPopup(x, y, text) {
    state.popups.push({ x, y, text, life: 1.2 });
    if (state.popups.length > 24) state.popups.shift();
  }
  function addCash(amount, x, y) {
    state.cash += amount;
    state.score += amount;
    state.combo += 1;
    state.comboTimer = 3;
    if (state.score > state.best) state.best = state.score;
    addPopup(x, y, `+$${amount}`);
  }

  function policeUnits() {
    return state.cars.filter((c) => c.police).concat(state.officers);
  }

  function raiseWanted(n) {
    const before = state.wanted;
    state.wanted = Math.max(state.wanted, Math.min(5, state.wanted + n));
    if (state.wanted > before) spawnPolice(state.wanted);
  }

  function spawnPolice(stars) {
    const wantCars = POLICE_CARS[stars];
    const haveCars = state.cars.filter((c) => c.police).length;
    for (let i = haveCars; i < wantCars; i += 1) {
      let p = null;
      for (let tries = 0; tries < 6; tries += 1) {
        const cand = roadPointNear(rng, state.player.x + rng.range(-500, 500), state.player.y + rng.range(-500, 500));
        if (Math.hypot(cand.x - state.player.x, cand.y - state.player.y) >= 250) { p = cand; break; }
        if (!p) p = cand;
      }
      const car = freshCar('police', p.x, p.y, 0, { traffic: false });
      car.speed = POLICE_SPEED[stars];
      state.cars.push(car);
    }
    const wantOfficers = stars >= 1 ? Math.min(3, stars) : 0;
    while (state.officers.length < wantOfficers) {
      const p = roadPointNear(rng, state.player.x + rng.range(-260, 260), state.player.y + rng.range(-260, 260));
      state.officers.push({ x: p.x, y: p.y, angle: 0, health: 100, contact: 0, down: 0 });
    }
  }

  function clearPolice() {
    state.cars = state.cars.filter((c) => !c.police);
    state.officers = [];
  }

  function startMission(index) {
    state.missionIndex = index;
    state.missionStage = 0;
    state.missionState = 'active';
    state.mission = MISSIONS[index];
    state.missionTimer = state.mission.timer || 0;
    state.wantedFloor = 0;
    if (index === 2) {
      state.wanted = 3;
      state.wantedTimer = 0;
      spawnPolice(3);
    }
    if (index === 3) state.wantedFloor = 2;
    if (index === 4) {
      state.wantedFloor = 4;
      state.wanted = 4;
      state.wantedTimer = 0;
      spawnPolice(4);
      state.passenger = true;
    }
    state.marker = markerFor(index, 0);
  }

  function completeMission() {
    const reward = state.mission.reward;
    addCash(reward, state.player.x, state.player.y - 30);
    state.banner = { text: 'JOB DONE', sub: `${state.mission.name}  +$${reward}`, life: 2.6 };
    state.missionState = 'done';
    state.marker = null;
    state.passenger = false;
    state.wantedFloor = 0;
    if (state.missionIndex === 4) state.storyDone = true;
    saveNow();
  }

  function failMission() {
    state.missionState = 'failed';
    state.banner = { text: 'JOB FAILED', sub: `${state.mission.name} — press R to retry`, life: 2.6 };
    state.marker = null;
  }

  function bustPlayer() {
    state.cash = Math.floor(state.cash * 0.9);
    state.player.health = PLAYER.health;
    state.player.onFoot = true;
    state.player.carId = null;
    state.player.x = 1355;
    state.player.y = 320;
    state.wanted = 0;
    state.wantedTimer = 0;
    state.wantedFloor = 0;
    state.passenger = false;
    clearPolice();
    if (state.missionState === 'active') startMission(state.missionIndex);
    state.banner = { text: 'BUSTED', sub: 'Lost 10% of your cash', life: 2.4 };
  }

  function wastePlayer() {
    state.cash = Math.floor(state.cash * 0.9);
    state.player.health = PLAYER.health;
    state.player.onFoot = true;
    state.player.carId = null;
    state.player.x = 320;
    state.player.y = 700;
    state.wanted = 0;
    state.wantedTimer = 0;
    state.wantedFloor = 0;
    state.passenger = false;
    clearPolice();
    if (state.missionState === 'active') startMission(state.missionIndex);
    state.banner = { text: 'WASTED', sub: 'Lost 10% of your cash', life: 2.4 };
  }

  function saveNow() {
    try {
      window.localStorage.setItem('solmar-bay.save.v1', JSON.stringify({
        cash: state.cash, score: state.score, best: state.best,
        missionIndex: state.missionIndex, storyDone: state.storyDone,
      }));
    } catch {
      // Storage off: the save lasts this visit only.
    }
  }

  function nearestCar(x, y, maxDist) {
    let bestCar = null;
    let bestD = maxDist;
    for (const car of state.cars) {
      if (car.police || !car.parked) continue;
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bestD) {
        bestD = d;
        bestCar = car;
      }
    }
    if (bestCar) return bestCar;
    for (const car of state.cars) {
      if (car.police) continue;
      const d = Math.hypot(car.x - x, car.y - y);
      if (d < bestD) {
        bestD = d;
        bestCar = car;
      }
    }
    return bestCar;
  }

  function seenByPolice() {
    for (const unit of policeUnits()) {
      if (unit.down) continue;
      if (Math.hypot(unit.x - state.player.x, unit.y - state.player.y) < 420
        && city.sees(unit.x, unit.y, state.player.x, state.player.y)) return true;
    }
    return false;
  }

  function moveCircle(obj, dx, dy, radius) {
    let nx = obj.x + dx;
    if (!city.circleHits(nx, obj.y, radius)) obj.x = nx;
    let ny = obj.y + dy;
    if (!city.circleHits(obj.x, ny, radius)) obj.y = ny;
  }

  function stepPlayer(dt, input) {
    const p = state.player;
    p.punchCd = Math.max(0, p.punchCd - dt);
    if (p.onFoot) {
      const speed = input.sprint ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const len = Math.hypot(input.dx, input.dy);
      if (len > 0) {
        const nx = (input.dx / len) * speed * dt;
        const ny = (input.dy / len) * speed * dt;
        moveCircle(p, nx, ny, PLAYER.radius);
        p.angle = Math.atan2(input.dy, input.dx);
        p.speed = speed;
      } else {
        p.speed = 0;
      }
      if (input.enter) {
        const car = nearestCar(p.x, p.y, 48);
        if (car) {
          let seen = false;
          for (const ped of state.peds) {
            if (!ped.down && Math.hypot(ped.x - p.x, ped.y - p.y) < 220
              && city.sees(ped.x, ped.y, p.x, p.y)) { seen = true; break; }
          }
          if (!seen) {
            for (const off of state.officers) {
              if (!off.down && Math.hypot(off.x - p.x, off.y - p.y) < 220
                && city.sees(off.x, off.y, p.x, p.y)) { seen = true; break; }
            }
          }
          if (car.traffic) {
            const ped = freshPed(car.x + 30, car.y + 30);
            ped.flee = 3;
            state.peds.push(ped);
            car.traffic = false;
          }
          if (seen && !car.crew) raiseWanted(1);
          state.carsStolen += 1;
          p.onFoot = false;
          p.carId = car.id;
          car.parked = false;
        }
      }
      if (input.action && p.punchCd <= 0) {
        p.punchCd = PLAYER.punchCooldown;
        for (const ped of state.peds) {
          if (ped.down) continue;
          const d = Math.hypot(ped.x - p.x, ped.y - p.y);
          if (d < PLAYER.punchRange + 12) {
            ped.down = 4;
            ped.flee = 6;
            const drop = rng.int(3, 9);
            state.pickups.push({ x: ped.x, y: ped.y, value: drop });
            raiseWanted(1);
          }
        }
        for (const off of state.officers) {
          if (off.down) continue;
          const d = Math.hypot(off.x - p.x, off.y - p.y);
          if (d < PLAYER.punchRange + 12) {
            off.health -= PLAYER.punchDamage;
            if (off.health <= 0) {
              off.down = 6;
              off.health = 100;
            }
          }
        }
      }
    } else {
      const car = state.cars.find((c) => c.id === p.carId);
      if (!car) {
        p.onFoot = true;
        return 0;
      }
      const spec = car.spec;
      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
      const forward = input.dy < 0 ? 1 : input.dy > 0 ? -1 : 0;
      if (forward > 0) car.speed = Math.min(spec.top, car.speed + spec.accel * dt);
      else if (forward < 0) car.speed = Math.max(-spec.top * 0.35, car.speed - spec.brake * dt);
      else car.speed *= Math.max(0, 1 - 1.4 * dt);
      const drifting = input.action && Math.abs(car.speed) > 120;
      const steer = input.dx * spec.turn * (drifting ? 1.55 : 1) * Math.min(1, Math.abs(car.speed) / 160 + 0.25) * (car.speed < 0 ? -1 : 1);
      car.angle += steer * dt * (Math.abs(car.speed) > 1 ? 1 : 0);
      if (drifting) {
        car.speed *= Math.max(0, 1 - 0.7 * dt);
        state.skids.push({ x1: car.x, y1: car.y, x2: car.x + Math.cos(car.angle) * car.speed * dt, y2: car.y + Math.sin(car.angle) * car.speed * dt, life: 3 });
        if (state.skids.length > 220) state.skids.shift();
      }
      const offRoad = !onWalkable(car.x, car.y);
      const maxOff = spec.top * 0.6;
      if (offRoad && car.speed > maxOff) car.speed = maxOff;
      const nx = Math.cos(car.angle) * car.speed * dt;
      const ny = Math.sin(car.angle) * car.speed * dt;
      const ox = car.x;
      const oy = car.y;
      moveCircle(car, nx, ny, 17);
      const hitWall = (car.x === ox && Math.abs(nx) > 0.01) || (car.y === oy && Math.abs(ny) > 0.01);
      let events = 0;
      if (hitWall && Math.abs(car.speed) > 180) {
        car.health -= Math.abs(car.speed) * 0.06;
        car.speed *= 0.45;
        state.shake = 0.25;
        events |= EVENT_CRASH;
      }
      if (car.health < spec.health * 0.4) car.smoke = true;
      if (car.health <= 0 && !car.fire) {
        car.fire = true;
        p.onFoot = true;
        p.carId = null;
        p.health = Math.max(1, p.health - 20);
        p.x = car.x + 40;
        p.y = car.y;
        state.shake = 0.4;
        events |= EVENT_CRASH;
      }
      if (input.enter) {
        p.onFoot = true;
        p.carId = null;
        car.speed = 0;
        const px = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
        const py = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
        if (!city.circleHits(px, py, PLAYER.radius)) {
          p.x = px;
          p.y = py;
        } else {
          p.x = car.x - Math.cos(car.angle + Math.PI / 2) * 34;
          p.y = car.y - Math.sin(car.angle + Math.PI / 2) * 34;
        }
      }
      p.speed = car.speed;
      if (drifting) events |= EVENT_SCREECH;
      return events;
    }
    return 0;
  }

  function stepTraffic(dt) {
    for (const car of state.cars) {
      if (!car.traffic || car.police) continue;
      let blocked = false;
      for (const other of state.cars) {
        if (other === car || other.parked) continue;
        const dx = other.x - car.x;
        const dy = other.y - car.y;
        const ahead = car.axis === 'x' ? dx * car.dir : dy * car.dir;
        const side = car.axis === 'x' ? Math.abs(dy) : Math.abs(dx);
        if (ahead > 0 && ahead < 64 && side < 40) { blocked = true; break; }
      }
      const target = blocked ? 0 : rng.range(140, 220);
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
      const nx = car.axis === 'x' ? car.dir * car.speed * dt : 0;
      const ny = car.axis === 'y' ? car.dir * car.speed * dt : 0;
      car.x += nx;
      car.y += ny;
      const crossLines = car.axis === 'x' ? [0, 320, 640, 960, 1280, 1600, 1920, 2240] : [0, 320, 640, 960, 1280, 1600];
      for (const line of crossLines) {
        const at = car.axis === 'x' ? car.x : car.y;
        if (Math.abs(at - line) < 4 && rng.chance(0.08)) {
          car.axis = car.axis === 'x' ? 'y' : 'x';
          car.dir = rng.chance(0.5) ? 1 : -1;
          car.line = line;
          car.lane = car.dir > 0 ? 16 : -16;
          car.angle = car.axis === 'x' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
          if (car.axis === 'x') car.y = car.line + car.lane;
          else car.x = car.line + car.lane;
          break;
        }
      }
      if (car.x < -80 || car.x > WORLD.width + 80 || car.y < -80 || car.y > WORLD.height - 140) {
        const fresh = spawnTrafficCar();
        car.x = fresh.x; car.y = fresh.y; car.axis = fresh.axis; car.line = fresh.line;
        car.dir = fresh.dir; car.lane = fresh.lane; car.angle = fresh.angle; car.speed = fresh.speed;
      }
      if (Math.hypot(car.x - state.player.x, car.y - state.player.y) > 900) {
        const p = roadPointNear(rng, state.player.x, state.player.y);
        car.x = p.x; car.y = p.y;
      }
    }
  }

  function stepPeds(dt) {
    for (const ped of state.peds) {
      if (ped.down > 0) {
        ped.down -= dt;
        continue;
      }
      let danger = null;
      const p = state.player;
      if (p.onFoot && Math.hypot(ped.x - p.x, ped.y - p.y) < 60) danger = p;
      if (!p.onFoot) {
        const car = state.cars.find((c) => c.id === p.carId);
        if (car && Math.hypot(ped.x - car.x, ped.y - car.y) < 90 && Math.abs(car.speed) > 120) danger = car;
      }
      if (danger) {
        ped.flee = 2;
        const a = angleTo(danger.x, danger.y, ped.x, ped.y);
        moveCircle(ped, Math.cos(a) * 140 * dt, Math.sin(a) * 140 * dt, 8);
        continue;
      }
      if (ped.flee > 0) {
        ped.flee -= dt;
        const a = ped.angle;
        moveCircle(ped, Math.cos(a) * 140 * dt, Math.sin(a) * 140 * dt, 8);
        continue;
      }
      const dx = ped.tx - ped.x;
      const dy = ped.ty - ped.y;
      const d = Math.hypot(dx, dy);
      if (d < 12) {
        const t = roadPointNear(rng, ped.x + rng.range(-320, 320), ped.y + rng.range(-320, 320));
        ped.tx = t.x;
        ped.ty = t.y;
      } else {
        ped.angle = Math.atan2(dy, dx);
        moveCircle(ped, (dx / d) * ped.speed * dt, (dy / d) * ped.speed * dt, 8);
      }
    }
  }

  function stepPolice(dt) {
    const p = state.player;
    for (const car of state.cars) {
      if (!car.police) continue;
      car.ramCd = Math.max(0, (car.ramCd || 0) - dt);
      const target = angleTo(car.x, car.y, p.x, p.y);
      const top = POLICE_SPEED[Math.max(1, state.wanted)];
      car.angle = turnToward(car.angle, target, 3.0 * dt);
      const d = Math.hypot(p.x - car.x, p.y - car.y);
      if (d > 70 || p.onFoot) {
        car.speed = Math.min(top, car.speed + 320 * dt);
      } else {
        car.speed = Math.max(0, car.speed - 500 * dt);
      }
      const nx = Math.cos(car.angle) * car.speed * dt;
      const ny = Math.sin(car.angle) * car.speed * dt;
      moveCircle(car, nx, ny, 17);
      if (!p.onFoot) {
        const pcar = state.cars.find((c) => c.id === p.carId);
        if (pcar && Math.hypot(car.x - pcar.x, car.y - pcar.y) < 34) {
          const impact = Math.abs(car.speed - pcar.speed);
          if (impact > 120 && car.ramCd <= 0) {
            pcar.health -= impact * 0.05;
            pcar.speed *= 0.6;
            car.speed = -150;
            car.ramCd = 1.0;
            state.shake = 0.3;
          }
        }
      }
    }
    for (const off of state.officers) {
      if (off.down > 0) {
        off.down -= dt;
        continue;
      }
      const d = Math.hypot(p.x - off.x, p.y - off.y);
      if (p.onFoot && d < 700) {
        off.angle = angleTo(off.x, off.y, p.x, p.y);
        moveCircle(off, Math.cos(off.angle) * 205 * dt, Math.sin(off.angle) * 205 * dt, 9);
      }
      if (p.onFoot && d < 18) {
        off.contact += dt;
        if (off.contact >= 1.5) {
          off.contact = 0;
          bustPlayer();
          return EVENT_BUSTED;
        }
      } else {
        off.contact = Math.max(0, off.contact - dt * 2);
      }
    }
    return 0;
  }

  function stepCarHits(dt) {
    const p = state.player;
    if (p.onFoot) return 0;
    const car = state.cars.find((c) => c.id === p.carId);
    if (!car) return 0;
    let events = 0;
    for (const other of state.cars) {
      if (other === car || other.police) continue;
      const d = Math.hypot(other.x - car.x, other.y - car.y);
      if (d < 32 && d > 0.01) {
        const push = (32 - d) / 2;
        const nx = (other.x - car.x) / d;
        const ny = (other.y - car.y) / d;
        other.x += nx * push;
        other.y += ny * push;
        car.x -= nx * push;
        car.y -= ny * push;
        const rel = Math.abs(car.speed - (other.speed || 0));
        if (rel > 200) {
          car.health -= rel * 0.04;
          other.health -= rel * 0.04;
          state.shake = 0.25;
          events |= EVENT_CRASH;
        }
      }
    }
    for (const ped of state.peds) {
      if (ped.down) continue;
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d < 26 && Math.abs(car.speed) > 150) {
        ped.down = 5;
        ped.flee = 6;
        state.pickups.push({ x: ped.x, y: ped.y, value: rng.int(3, 9) });
        raiseWanted(1);
      }
    }
    return events;
  }

  function stepMissions(dt) {
    if (state.missionState !== 'active') return 0;
    const p = state.player;
    const m = state.missionIndex;
    if (m === 3 && state.missionTimer > 0) {
      state.missionTimer -= dt;
      if (state.missionTimer <= 0) {
        state.missionTimer = 0;
        failMission();
        return EVENT_FAILED;
      }
    }
    const marker = state.marker;
    if (!marker) return 0;
    const d = Math.hypot(p.x - marker.x, p.y - marker.y);
    if (m === 0) {
      if (state.missionStage === 0) {
        const car = state.cars.find((c) => c.id === p.carId);
        if (car && car.kind === 'suncab' && Math.hypot(car.x - 640, car.y - 456) < 60) {
          state.missionStage = 1;
          state.marker = markerFor(0, 1);
        }
      } else if (d < 80) {
        completeMission();
        return EVENT_MISSION;
      }
    } else if (m === 1) {
      if (state.missionStage === 0) {
        const car = state.cars.find((c) => c.id === p.carId);
        if (car && car.kind === 'falco') {
          state.missionStage = 1;
          state.marker = markerFor(1, 1);
        }
      } else if (d < 80) {
        const car = state.cars.find((c) => c.id === p.carId);
        if (car) {
          car.health = car.spec.health;
          car.smoke = false;
          car.fire = false;
          state.cash = Math.max(0, state.cash - 100);
        }
        state.wanted = 0;
        state.wantedTimer = 0;
        clearPolice();
        completeMission();
        return EVENT_MISSION;
      }
    } else if (m === 2) {
      const inHouse = p.x > city.safehouse.x && p.x < city.safehouse.x + city.safehouse.w
        && p.y > city.safehouse.y && p.y < city.safehouse.y + city.safehouse.h;
      if (state.wanted === 0 && inHouse) {
        completeMission();
        return EVENT_MISSION;
      }
    } else if (m === 3) {
      if (d < 70) {
        if (state.missionStage < 3) {
          state.missionStage += 1;
          addCash(25, p.x, p.y - 30);
          state.marker = markerFor(3, state.missionStage);
        } else {
          completeMission();
          return EVENT_MISSION;
        }
      }
    } else if (m === 4) {
      if (d < 90) {
        completeMission();
        return EVENT_MISSION;
      }
    }
    return 0;
  }

  function stepWanted(dt) {
    state.seen = seenByPolice();
    if (state.wanted <= state.wantedFloor) return;
    if (state.seen) {
      state.wantedTimer = 0;
      return;
    }
    const inHouse = state.player.x > city.safehouse.x && state.player.x < city.safehouse.x + city.safehouse.w
      && state.player.y > city.safehouse.y && state.player.y < city.safehouse.y + city.safehouse.h;
    state.wantedTimer += dt * (inHouse ? 2 : 1);
    const need = WANTED_DECAY[state.wanted];
    if (state.wantedTimer >= need) {
      state.wantedTimer = 0;
      state.wanted -= 1;
      if (state.wanted <= state.wantedFloor) state.wanted = state.wantedFloor;
    }
  }

  function stepPickups(dt) {
    const p = state.player;
    for (const pk of state.pickups) {
      if (Math.hypot(pk.x - p.x, pk.y - p.y) < 28) {
        addCash(pk.value, pk.x, pk.y - 10);
        pk.taken = true;
      }
    }
    state.pickups = state.pickups.filter((pk) => !pk.taken);
    state.pickupTimer += dt;
    if (state.pickupTimer > 20 && state.pickups.length < PICKUP_COUNT) {
      state.pickupTimer = 0;
      const pt = roadPointNear(rng, rng.range(100, WORLD.width - 100), rng.range(100, WORLD.height - 300));
      state.pickups.push({ x: pt.x, y: pt.y, value: rng.int(10, 25) });
    }
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    for (const pop of state.popups) {
      pop.life -= dt;
      pop.y -= 24 * dt;
    }
    state.popups = state.popups.filter((pop) => pop.life > 0);
    for (const skid of state.skids) skid.life -= dt;
    state.skids = state.skids.filter((s) => s.life > 0);
    if (state.banner) {
      state.banner.life -= dt;
      if (state.banner.life <= 0) state.banner = null;
    }
    state.shake = Math.max(0, state.shake - dt);
  }

  function step(dt, input, attract) {
    state.time += dt;
    let events = 0;
    if (attract) {
      stepTraffic(dt);
      stepPeds(dt);
      return 0;
    }
    events |= stepPlayer(dt, input);
    stepTraffic(dt);
    stepPeds(dt);
    events |= stepPolice(dt);
    events |= stepCarHits(dt);
    stepWanted(dt);
    events |= stepMissions(dt);
    stepPickups(dt);
    if (state.player.health <= 0) {
      wastePlayer();
      events |= EVENT_WASTED;
    }
    return events;
  }

  reset();

  return {
    state, city, reset, step, startMission, completeMission, failMission,
    bustPlayer, wastePlayer, saveNow, raiseWanted, spawnPolice, clearPolice,
    addCash, addPopup,
  };
}
