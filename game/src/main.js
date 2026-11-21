// Boot and the one loop, plus the screen flow. The simulation lives in
// world.js; this file wires the canvas, the input, the audio and the
// screens together and steps the world at a fixed sixtieth of a second.

import { CONFIG } from './config.js';
import { createWorld, beginMission, updatePlaying, saveGame, loadSave } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { render, cameraFor, buttonHit } from './render.js';
import { setupShot, stepShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const seed = parseInt(params.get('seed') || '1234', 10) || 1234;
const shotParam = params.get('shot');

const input = createInput(canvas);
const audio = createAudio();
const saved = loadSave();

let world;
let shotMode = false;
if (shotParam) {
  shotMode = true;
  world = setupShot(seed, parseInt(shotParam, 10) - 1);
} else {
  world = createWorld(seed, saved);
  world.screen = saved && (saved.cash > 0 || (saved.done && saved.done.length > 0)) ? 'title' : 'title';
}
audio.setMuted(world.muted);

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function applyPendingEvent() {
  const ev = world.pendingEvent;
  if (!ev) return;
  world.pendingEvent = null;
  if (ev === 'complete') {
    audio.jingle();
    if (world.missionsDone.length >= 5) world.screen = 'story';
    else world.screen = 'complete';
  } else if (ev === 'failed') {
    world.screen = 'failed';
  } else if (ev === 'busted') {
    audio.busted();
    world.screen = 'busted';
  } else if (ev === 'wasted') {
    audio.busted();
    world.screen = 'wasted';
  }
}

function nextMissionIndex() {
  for (let i = 0; i < CONFIG.missions.length; i++) {
    if (!world.missionsDone.includes(i)) return i;
  }
  return -1;
}

function openPhoneFor(index) {
  if (beginMission(world, index)) {
    world.screen = 'phone';
    audio.click();
  }
}

function onTitleConfirm() {
  audio.resume();
  audio.startMusic();
  const hasSave = world.cash > 0 || world.missionsDone.length > 0;
  if (hasSave) {
    const next = nextMissionIndex();
    if (next >= 0) openPhoneFor(next);
    else world.screen = 'playing';
  } else {
    openPhoneFor(0);
  }
}

function handleScreenInput() {
  const s = world.screen;
  if (s === 'title') {
    if (input.pressed('enter')) onTitleConfirm();
    if (input.mouse.clicked && buttonHit(input.mouse.clickX, input.mouse.clickY, canvas.width / 2 - 110, canvas.height * 0.28 + 120, 220, 44)) {
      onTitleConfirm();
    }
    return;
  }
  if (s === 'phone') {
    if (input.pressed('enter')) {
      world.screen = 'playing';
      audio.click();
    }
    if (input.mouse.clicked && buttonHit(input.mouse.clickX, input.mouse.clickY, canvas.width / 2 - 110, canvas.height * 0.42 + 120, 220, 44)) {
      world.screen = 'playing';
      audio.click();
    }
    return;
  }
  if (s === 'pause') {
    if (input.pressed('pause') || input.pressed('enter')) {
      world.screen = 'playing';
      audio.click();
    }
    if (input.pressed('restart') && world.mission) {
      const idx = world.mission.index;
      openPhoneFor(idx);
    }
    if (input.mouse.clicked) {
      const mx = input.mouse.clickX, my = input.mouse.clickY;
      if (buttonHit(mx, my, canvas.width / 2 - 110, canvas.height * 0.36 + 60, 220, 44)) {
        world.screen = 'playing';
        audio.click();
      } else if (buttonHit(mx, my, canvas.width / 2 - 110, canvas.height * 0.36 + 116, 220, 44) && world.mission) {
        openPhoneFor(world.mission.index);
      } else {
        for (let i = 0; i < CONFIG.missions.length; i++) {
          if (!world.missionsDone.includes(i)) continue;
          const y = canvas.height * 0.36 + 180 + i * 34;
          if (buttonHit(mx, my, canvas.width / 2 - 110, y, 220, 28)) {
            openPhoneFor(i);
            break;
          }
        }
      }
    }
    return;
  }
  if (s === 'complete') {
    if (input.pressed('enter')) {
      const next = nextMissionIndex();
      if (next >= 0) openPhoneFor(next);
      else world.screen = 'playing';
    }
    if (input.mouse.clicked && buttonHit(input.mouse.clickX, input.mouse.clickY, canvas.width / 2 - 110, canvas.height * 0.3 + 100, 220, 44)) {
      const next = nextMissionIndex();
      if (next >= 0) openPhoneFor(next);
      else world.screen = 'playing';
    }
    return;
  }
  if (s === 'failed') {
    if (input.pressed('enter') || input.pressed('restart')) {
      openPhoneFor(world.missionIndex);
    }
    if (input.mouse.clicked && buttonHit(input.mouse.clickX, input.mouse.clickY, canvas.width / 2 - 110, canvas.height * 0.42, 220, 44)) {
      openPhoneFor(world.missionIndex);
    }
    return;
  }
  if (s === 'busted' || s === 'wasted') {
    if (input.pressed('enter')) {
      world.screen = 'playing';
      audio.click();
    }
    if (input.mouse.clicked && buttonHit(input.mouse.clickX, input.mouse.clickY, canvas.width / 2 - 110, canvas.height * 0.42, 220, 44)) {
      world.screen = 'playing';
      audio.click();
    }
    return;
  }
  if (s === 'story') {
    if (input.pressed('enter')) {
      world.screen = 'playing';
      audio.click();
    }
    if (input.mouse.clicked && buttonHit(input.mouse.clickX, input.mouse.clickY, canvas.width / 2 - 110, canvas.height * 0.44, 220, 44)) {
      world.screen = 'playing';
      audio.click();
    }
    return;
  }
}

function step(dt) {
  if (shotMode) {
    stepShot(world, audio, dt);
    return;
  }
  if (input.pressed('mute')) {
    world.muted = audio.toggleMute();
    saveGame(world);
  }
  if (world.screen === 'playing') {
    if (input.pressed('pause')) {
      world.screen = 'pause';
      audio.click();
      return;
    }
    if (input.pressed('restart') && world.mission) {
      openPhoneFor(world.mission.index);
      return;
    }
    updatePlaying(world, input, audio, dt);
    applyPendingEvent();
  } else {
    handleScreenInput();
  }
}

let last = performance.now();
let acc = 0;
function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += elapsed;
  let steps = 0;
  while (acc >= CONFIG.step && steps < 5) {
    step(CONFIG.step);
    acc -= CONFIG.step;
    steps++;
    // Clear pressed-key edges after every step, not after every frame.
    // Edges are consumed per step, so frame-level clearing both drops
    // presses (a short frame can run zero steps) and double-fires them
    // (two steps in one frame would both see the same press — Enter
    // would enter the car and immediately exit it again).
    input.endFrame();
  }
  if (steps === 5) acc = 0;
  const view = cameraFor(world, canvas.width, canvas.height);
  render(ctx, world, canvas.width, canvas.height, view);
  if (shotMode && world.shotReady) {
    window.__shotReady = true;
    document.title = 'READY';
  }
  requestAnimationFrame(frame);
}

window.__solmar = {
  world,
  input,
  audio,
  startMission: (i) => openPhoneFor(i),
  state: () => ({
    screen: world.screen,
    cash: Math.floor(world.cash),
    wanted: world.wanted,
    missionsDone: world.missionsDone.slice(),
    health: Math.round(world.player.health),
  }),
};

requestAnimationFrame(frame);
