// Boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps (several in a slow frame, none in a fast one),
// and the renderer paints what is there. The game moves between the
// title, the phone card, play, paused, busted, wasted, failed and story
// complete screens. The save lives in local storage; without it the game
// still plays and the save lasts the visit.
//
// ?seed=N fixes the city. ?shot=1-finale|2-chase|3-pickup|4-steal (with
// &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { STEP, SAVE_KEY, BEST_KEY, MISSIONS } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_CRASH, EVENT_PICKUP, EVENT_PUNCH, EVENT_MISSION,
  EVENT_BUSTED, EVENT_WASTED, EVENT_FAILED, EVENT_SCREECH,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_RESTART, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_TITLE, SCREEN_CARD, SCREEN_PLAY, SCREEN_PAUSED,
  SCREEN_BUSTED, SCREEN_WASTED, SCREEN_FAILED, SCREEN_COMPLETE,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage off: the best score lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const saved = readSave();
  let screen = SCREEN_TITLE;
  let best = Math.max(readBest(), saved ? saved.best || 0 : 0);
  let hasSave = !!saved;
  let cardMission = null;
  window.__solmar = {
    state: () => world.state,
    screen: () => screen,
    hasSave: () => !!readSave(),
  };
  let accumulator = 0;
  let last = performance.now();
  let pendingEnter = false;

  function announce(message) {
    status.textContent = message;
  }

  function applySave() {
    if (!saved) return;
    world.state.cash = saved.cash || 0;
    world.state.score = saved.score || 0;
    world.state.best = Math.max(world.state.best, saved.best || 0);
    world.state.storyDone = !!saved.storyDone;
  }

  function startGame(fresh) {
    world.reset();
    world.state.best = best;
    if (!fresh && saved) {
      applySave();
      if (saved.missionIndex > 0 && saved.missionIndex < 5) {
        world.state.missionIndex = saved.missionIndex;
      }
    }
    cardMission = MISSIONS[world.state.missionIndex] || MISSIONS[0];
    if (world.state.storyDone) {
      screen = SCREEN_PLAY;
      announce('Free roam. The debt is paid — Solmar Bay is yours.');
    } else {
      screen = SCREEN_CARD;
      announce(`${cardMission.name}. ${cardMission.brief}`);
    }
    audio.unlock();
    audio.startMusic();
  }

  function acceptCard() {
    world.startMission(cardMission.id - 1);
    screen = SCREEN_PLAY;
    announce(`Playing. ${cardMission.objective}.`);
  }

  function endToTitle() {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    world.saveNow();
    screen = SCREEN_TITLE;
    hasSave = !!readSave();
    announce('Solmar Bay. Press Enter to start.');
  }

  function handleEvents(events) {
    if (events & EVENT_CRASH) audio.crash();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_PUNCH) audio.punch();
    if (events & EVENT_SCREECH) audio.screech();
    if (events & EVENT_MISSION) {
      audio.jingle();
      if (world.state.score > best) {
        best = world.state.score;
        saveBest(best);
      }
      if (world.state.storyDone) {
        screen = SCREEN_COMPLETE;
        announce('Story complete. All five jobs done.');
      } else {
        cardMission = MISSIONS[world.state.missionIndex + 1];
        screen = SCREEN_CARD;
        announce(`${cardMission.name}. ${cardMission.brief}`);
      }
    }
    if (events & EVENT_BUSTED) {
      audio.busted();
      screen = SCREEN_BUSTED;
      announce('Busted. Lost 10 percent of your cash.');
    }
    if (events & EVENT_WASTED) {
      audio.busted();
      screen = SCREEN_WASTED;
      announce('Wasted. Lost 10 percent of your cash.');
    }
    if (events & EVENT_FAILED) {
      screen = SCREEN_FAILED;
      announce('Job failed. Press R to retry.');
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
    }
    if (screen === SCREEN_TITLE) {
      if (input.takePressed('KeyN')) startGame(true);
      else if (actions & ACTION_CONFIRM) startGame(false);
      const click = input.takeClick();
      if (click) startGame(false);
      return;
    }
    if (screen === SCREEN_CARD) {
      if (actions & ACTION_CONFIRM) acceptCard();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & ACTION_PAUSE || actions & ACTION_CONFIRM) screen = SCREEN_PLAY;
      if (actions & ACTION_RESTART) {
        world.startMission(world.state.missionIndex);
        screen = SCREEN_PLAY;
      }
      return;
    }
    if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
      if (actions & ACTION_CONFIRM) screen = SCREEN_PLAY;
      return;
    }
    if (screen === SCREEN_FAILED) {
      if (actions & (ACTION_RESTART | ACTION_CONFIRM)) {
        world.startMission(world.state.missionIndex);
        screen = SCREEN_PLAY;
      }
      return;
    }
    if (screen === SCREEN_COMPLETE) {
      if (actions & ACTION_CONFIRM) screen = SCREEN_PLAY;
      return;
    }
    if (screen === SCREEN_PLAY) {
      pendingEnter = !!(actions & ACTION_CONFIRM);
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      if (actions & ACTION_RESTART) {
        world.startMission(world.state.missionIndex);
        announce('Mission restarted.');
      }
    }
  }

  function step() {
    const dir = input.direction();
    const keys = {
      dx: dir.x, dy: dir.y,
      action: input.action(), sprint: input.sprint(),
      enter: pendingEnter,
    };
    pendingEnter = false;
    if (screen === SCREEN_TITLE) {
      world.step(STEP, keys, true);
      return;
    }
    const events = world.step(STEP, keys, false);
    handleEvents(events);
    const car = world.state.cars.find((c) => c.id === world.state.player.carId);
    if (car) audio.engine(car.speed, car.spec.top);
    else audio.engineOff();
    const policeNear = world.state.wanted >= 2 && world.state.cars.some((c) => c.police
      && Math.hypot(c.x - world.state.player.x, c.y - world.state.player.y) < 500);
    audio.siren(policeNear, STEP);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const extra = screen === SCREEN_CARD ? { mission: cardMission }
      : screen === SCREEN_TITLE ? { hasSave } : null;
    renderer.draw(world, screen, best, extra);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  canvas.addEventListener('mousedown', () => audio.unlock());
  announce('Solmar Bay. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
