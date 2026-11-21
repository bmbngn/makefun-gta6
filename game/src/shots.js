// The autopilot that stages the four screenshots. Each scene runs the real
// simulation forward from a fresh world with a scripted driver, paints
// twice, then raises the ready flag the screenshot script waits for.

import { CONFIG } from './config.js';
import { createWorld, beginMission, updatePlaying, raiseWanted, syncPolice } from './world.js';

const SHOT_DEFS = [
  { id: '1-finale', name: 'Finale drive', mission: 4, wanted: 4, runSeconds: 20, stars: 4 },
  { id: '2-chase', name: 'Five-star chase', mission: null, wanted: 5, runSeconds: 25, stars: 5 },
  { id: '3-pickup', name: 'Mission pickup', mission: 3, wanted: 1, runSeconds: 15, stars: 1 },
  { id: '4-steal', name: 'Street steal', mission: null, wanted: 2, runSeconds: 12, stars: 2 },
];

export function shotList() {
  return SHOT_DEFS.map((s) => ({ id: s.id, name: s.name }));
}

function makeDriver(w, waypoints) {
  let wp = 0;
  return {
    update(input) {
      const p = w.player;
      const target = waypoints[Math.min(wp, waypoints.length - 1)];
      if (!target) return { up: false, down: false, left: false, right: false, enter: false };
      const d = Math.hypot(target.x - p.x, target.y - p.y);
      if (d < 90 && wp < waypoints.length - 1) wp++;
      const want = Math.atan2(target.y - p.y, target.x - p.x);
      let diff = want - p.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      return {
        up: true, down: false,
        left: diff < -0.12, right: diff > 0.12,
        enter: false,
      };
    },
  };
}

function scriptedInput(driver) {
  const state = driver.update();
  return {
    down(name) {
      if (name === 'up') return !!state.up;
      if (name === 'down') return !!state.down;
      if (name === 'left') return !!state.left;
      if (name === 'right') return !!state.right;
      return false;
    },
    pressed() { return false; },
    axisX() { return (state.right ? 1 : 0) - (state.left ? 1 : 0); },
    axisY() { return (state.up ? -1 : 0) + (state.down ? 1 : 0); },
    mouse: { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 },
    endFrame() {},
  };
}

function layCash(w, spots) {
  for (const s of spots) w.pickups.push({ x: s[0], y: s[1], value: s[2], bob: 0 });
}

function layPopups(w, spots) {
  for (const s of spots) w.popups.push({ x: s[0], y: s[1], text: s[2], life: 1.2 });
}

export function setupShot(seed, shotIndex) {
  const def = SHOT_DEFS[shotIndex];
  const w = createWorld(seed, null);
  w.screen = 'playing';
  w.cash = [60, 111, 89, 15][shotIndex];
  w.earned = w.cash;
  w.best = Math.max(w.best, 640);
  const L = CONFIG.landmarks;
  if (shotIndex === 0) {
    w.missionsDone = [0, 1, 2, 3];
    w.packagesCollected = 3;
    w.carsStolen = 4;
    beginMission(w, 4);
    const falco = w.falcoCar;
    falco.x = 1280; falco.y = 480; falco.angle = Math.PI / 2; falco.parked = false;
    w.player.onFoot = false;
    w.player.carId = falco.id;
    w.player.x = falco.x; w.player.y = falco.y; w.player.angle = falco.angle;
    falco.speed = 300;
    w.ilsaAboard = true;
    raiseWanted(w, 4);
    layCash(w, [[1280, 510, 25], [1890, 1040, 25]]);
    layPopups(w, [[1240, 460, '+25'], [1330, 520, '+25']]);
    w.driver = makeDriver(w, [{ x: 1280, y: 960 }, { x: 1600, y: 1280 }, { x: 2048, y: 1600 }]);
    w.runSeconds = 20;
  } else if (shotIndex === 1) {
    w.missionsDone = [0, 1, 2, 3];
    w.packagesCollected = 2;
    w.carsStolen = 3;
    const comet = w.cars.find((c) => c.type === 'comet' && c.parked);
    if (comet) {
      comet.x = 1280; comet.y = 640; comet.angle = 0; comet.parked = false;
      w.player.onFoot = false;
      w.player.carId = comet.id;
      w.player.x = comet.x; w.player.y = comet.y; w.player.angle = 0;
      comet.speed = 320;
    }
    raiseWanted(w, 5);
    layCash(w, [[1240, 600, 25], [1400, 700, 10]]);
    layPopups(w, [[1260, 600, '+25'], [1420, 720, 'COMBO x2']]);
    w.driver = makeDriver(w, [{ x: 1600, y: 640 }, { x: 1600, y: 960 }, { x: 1280, y: 960 }]);
    w.runSeconds = 25;
  } else if (shotIndex === 2) {
    w.missionsDone = [0, 1, 2];
    w.packagesCollected = 1;
    w.carsStolen = 2;
    beginMission(w, 3);
    w.player.x = 1900; w.player.y = 1470; w.player.angle = -Math.PI / 2;
    raiseWanted(w, 1);
    layCash(w, [[1860, 1440, 10]]);
    layPopups(w, [[1880, 1420, '+10']]);
    w.driver = makeDriver(w, [{ x: 1216, y: 288 }]);
    w.onFootDriver = true;
    w.runSeconds = 15;
  } else {
    w.missionsDone = [0];
    w.packagesCollected = 0;
    w.carsStolen = 1;
    w.player.x = 640; w.player.y = 700; w.player.angle = Math.PI / 2;
    raiseWanted(w, 2);
    const comet = w.cars.find((c) => c.type === 'comet' && c.parked);
    if (comet) { comet.x = 700; comet.y = 700; comet.angle = Math.PI / 2; }
    const cab = w.cars.find((c) => c.type === 'suncab' && c.parked);
    if (cab) { cab.x = 576; cab.y = 700; cab.angle = Math.PI / 2; }
    layCash(w, [[620, 660, 10]]);
    layPopups(w, [[640, 640, '+10']]);
    w.driver = makeDriver(w, [{ x: 640, y: 960 }]);
    w.onFootDriver = true;
    w.runSeconds = 12;
  }
  w.shotDef = def;
  w.shotElapsed = 0;
  w.shotReady = false;
  return w;
}

export function stepShot(w, audio, dt) {
  if (w.shotReady) return;
  const input = w.onFootDriver ? scriptedFootInput(w) : scriptedInput(w.driver);
  updatePlaying(w, input, audio, dt);
  // Hold the staged heat: the real simulation decays wanted to zero while
  // the driver runs unseen, which would leave empty stars and no police in
  // the shot. Restoring it also re-syncs the pursuit cars to match.
  if (w.wanted !== w.shotDef.wanted) {
    w.wanted = w.shotDef.wanted;
    syncPolice(w);
  }
  // Keep the staged floating score popups alive until the capture; their
  // 1.2s life would otherwise expire long before the run ends.
  for (const pp of w.popups) pp.life = Math.max(pp.life, 0.5);
  w.shotElapsed += dt;
  if (w.shotElapsed >= w.runSeconds) {
    w.shotReady = true;
  }
}

function scriptedFootInput(w) {
  const p = w.player;
  const target = w.mission && w.mission.target ? w.mission.target : { x: p.x + 100, y: p.y };
  const d = Math.hypot(target.x - p.x, target.y - p.y);
  const want = Math.atan2(target.y - p.y, target.x - p.x);
  const moving = d > 40;
  return {
    down(name) { return false; },
    pressed() { return false; },
    axisX() { return moving ? Math.cos(want) : 0; },
    axisY() { return moving ? Math.sin(want) : 0; },
    mouse: { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 },
    endFrame() {},
  };
}
