// The screenshot scenes behind ?shot=1-finale|2-chase|3-pickup|4-steal.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a simple autopilot, so the frame is what a
// short game really looks like and the same seed always gives the same
// frame. Every scene ends in a climactic moment: high wanted stars,
// police in frame, cash popups floating, the objective on screen.
//
// The driving scenes run a big road-aligned rectangle, so the car holds
// top speed on long straights and the police cars, which cut corners,
// cannot pile onto it; the driver also reverses out if it ever gets
// pinned. The on-foot scenes walk one way only, never back toward the
// chasing officer: the officer trails behind at walking speed, closes
// slowly, and is close in the final frame without ever touching the
// player. Cash is laid on the middle of each straight, where the
// autopilot really passes, so the score reads above zero.
import { STEP } from './config.js';
import { SCREEN_PLAY } from './render.js';

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function makeDriver(drift) {
  let lastX = null;
  let lastY = null;
  let still = 0;
  let reversing = 0;
  return function drive(world, target) {
    const p = world.state.player;
    const car = world.state.cars.find((c) => c.id === p.carId);
    if (!car) return { dx: 0, dy: 0, action: false, sprint: false, enter: false };
    if (lastX !== null) {
      if (Math.hypot(car.x - lastX, car.y - lastY) < 3 && Math.abs(car.speed) < 150) still += 1;
      else still = 0;
    }
    lastX = car.x;
    lastY = car.y;
    if (still > 30) {
      still = 0;
      reversing = 45;
    }
    if (reversing > 0) {
      reversing -= 1;
      return { dx: -1, dy: 1, action: false, sprint: false, enter: false };
    }
    const want = Math.atan2(target.y - car.y, target.x - car.x);
    const diff = wrapAngle(want - car.angle);
    return {
      dx: Math.max(-1, Math.min(1, diff * 2.5)),
      dy: Math.abs(diff) > 1.1 ? 0 : -1,
      action: drift && Math.abs(diff) > 0.35,
      sprint: false,
      enter: false,
    };
  };
}

function walkToward(world, target) {
  const p = world.state.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  const d = Math.hypot(dx, dy) || 1;
  return { dx: dx / d, dy: dy / d, action: false, sprint: d > 200, enter: false };
}

function loopWaypoints(world, points, seconds, driver, wrap = true) {
  let index = 0;
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const p = world.state.player;
    if (Math.hypot(points[index].x - p.x, points[index].y - p.y) < 130) {
      index = wrap ? (index + 1) % points.length : Math.min(index + 1, points.length - 1);
    }
    world.step(STEP, driver(world, points[index]), false);
  }
}

function layCash(world, spots) {
  for (const [x, y, value] of spots) {
    world.state.pickups.push({ x, y, value });
  }
}

function pushOfficersBack(world, x, y) {
  for (const off of world.state.officers) {
    off.x = x;
    off.y = y;
  }
}

function finishDrive(world, seconds) {
  const state = world.state;
  const car = state.cars.find((c) => c.id === state.player.carId);
  if (!car) return;
  const horizontal = Math.abs(Math.cos(car.angle)) > Math.abs(Math.sin(car.angle));
  const dir = horizontal ? (Math.cos(car.angle) >= 0 ? 1 : -1) : (Math.sin(car.angle) >= 0 ? 1 : -1);
  const road = (v) => Math.round(v / 320) * 320;
  if (horizontal) {
    car.y = road(car.y);
    car.angle = dir > 0 ? 0 : Math.PI;
    const cornerX = dir > 0 ? Math.ceil((car.x + 1) / 320) * 320 : Math.floor((car.x - 1) / 320) * 320;
    if (Math.abs(cornerX - car.x) < 500) car.x = cornerX - dir * 500;
  } else {
    car.x = road(car.x);
    car.angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    const cornerY = dir > 0 ? Math.ceil((car.y + 1) / 320) * 320 : Math.floor((car.y - 1) / 320) * 320;
    if (Math.abs(cornerY - car.y) < 500) car.y = cornerY - dir * 500;
  }
  car.speed = car.spec.top;
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.angle = car.angle;
  let i = 0;
  for (const pc of state.cars) {
    if (!pc.police) continue;
    const back = 200 + i * 60;
    const side = i % 2 === 0 ? 34 : -34;
    if (horizontal) {
      pc.x = car.x - dir * back;
      pc.y = car.y + side;
    } else {
      pc.x = car.x + side;
      pc.y = car.y - dir * back;
    }
    pc.angle = car.angle;
    pc.speed = 480;
    i += 1;
  }
  for (const other of state.cars) {
    if (other === car || other.police) continue;
    if (Math.hypot(other.x - car.x, other.y - car.y) < 160) {
      if (horizontal) {
        other.x = car.x - dir * 900;
        other.y = car.y + 60;
      } else {
        other.x = car.x + 60;
        other.y = car.y - dir * 900;
      }
    }
  }
  const driver = makeDriver(false);
  const steps = Math.floor(seconds / STEP);
  for (let s = 0; s < steps; s += 1) {
    const target = horizontal
      ? { x: car.x + dir * 1000, y: car.y }
      : { x: car.x, y: car.y + dir * 1000 };
    world.step(STEP, driver(world, target), false);
  }
  for (const other of state.cars) {
    if (other === car || other.police) continue;
    if (Math.hypot(other.x - car.x, other.y - car.y) < 120) {
      if (horizontal) {
        other.x = car.x - dir * 900;
        other.y = car.y + 60;
      } else {
        other.x = car.x + 60;
        other.y = car.y - dir * 900;
      }
    }
  }
}

export function stageShot(name, world) {
  const state = world.state;
  if (name === '2-chase') {
    world.reset();
    world.startMission(2);
    world.raiseWanted(2);
    const car = state.cars.find((c) => c.kind === 'comet' && c.parked);
    car.parked = false;
    car.health = 100000;
    car.x = 1280;
    car.y = 1280;
    car.angle = 0;
    car.speed = 200;
    state.player.onFoot = false;
    state.player.carId = car.id;
    state.player.x = car.x;
    state.player.y = car.y;
    state.marker = { x: 1280, y: 480, label: 'Lose the police' };
    layCash(world, [
      [1280, 450, 25], [1280, 480, 25], [1280, 510, 25],
      [1890, 1040, 25], [1920, 1040, 25], [1950, 1040, 25],
      [1280, 1570, 25], [1280, 1600, 25], [1280, 1630, 25],
      [610, 1040, 25], [640, 1040, 25], [670, 1040, 25],
    ]);
    loopWaypoints(world, [
      { x: 1920, y: 1280 }, { x: 1920, y: 1600 }, { x: 640, y: 1600 }, { x: 640, y: 480 }, { x: 1920, y: 480 },
    ], 20, makeDriver(true));
    finishDrive(world, 1.5);
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name === '3-pickup') {
    world.reset();
    world.startMission(3);
    state.player.x = 2180;
    state.player.y = 1740;
    state.player.angle = 0;
    state.wanted = 1;
    state.wantedFloor = 1;
    world.spawnPolice(1);
    pushOfficersBack(world, 2400, 1600);
    state.marker = { x: 2200, y: 1750, label: 'Package 1/3' };
    layCash(world, [[1800, 1600, 25], [1400, 1600, 15]]);
    loopWaypoints(world, [
      { x: 2100, y: 1700 }, { x: 2000, y: 1600 }, { x: 1800, y: 1600 }, { x: 1600, y: 1600 },
      { x: 1400, y: 1600 }, { x: 1200, y: 1600 }, { x: 1000, y: 1600 }, { x: 800, y: 1600 }, { x: 640, y: 1600 },
    ], 7, (w, t) => walkToward(w, t), false);
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name === '4-steal') {
    world.reset();
    world.startMission(1);
    state.player.x = 700;
    state.player.y = 960;
    state.player.angle = 0;
    state.wanted = 1;
    state.wantedFloor = 1;
    world.spawnPolice(1);
    pushOfficersBack(world, 400, 960);
    state.marker = { x: 900, y: 960, label: 'Stealable Comet' };
    layCash(world, [[700, 880, 25], [1000, 800, 15], [1100, 880, 25]]);
    loopWaypoints(world, [
      { x: 700, y: 800 }, { x: 900, y: 800 }, { x: 1100, y: 800 }, { x: 1100, y: 960 }, { x: 900, y: 960 },
    ], 7, (w, t) => walkToward(w, t), false);
    return { screen: SCREEN_PLAY, best: state.score };
  }
  world.reset();
  world.startMission(4);
  const falco = state.cars.find((c) => c.kind === 'falco');
  falco.parked = false;
  falco.health = 100000;
  falco.x = 1100;
  falco.y = 480;
  falco.angle = 0;
  falco.speed = 300;
  state.player.onFoot = false;
  state.player.carId = falco.id;
  state.player.x = falco.x;
  state.player.y = falco.y;
  state.marker = { x: 2048, y: 1890, label: 'Marina boat' };
  layCash(world, [
    [1280, 450, 25], [1280, 480, 25], [1280, 510, 25],
    [1890, 1040, 25], [1920, 1040, 25], [1950, 1040, 25],
    [1280, 1570, 25], [1280, 1600, 25], [1280, 1630, 25],
    [610, 1040, 25], [640, 1040, 25], [670, 1040, 25],
  ]);
  loopWaypoints(world, [
    { x: 1920, y: 480 }, { x: 1920, y: 1600 }, { x: 640, y: 1600 }, { x: 640, y: 480 },
  ], 15, makeDriver(false));
  finishDrive(world, 1.5);
  return { screen: SCREEN_PLAY, best: state.score };
}
