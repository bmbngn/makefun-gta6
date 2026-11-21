// Keyboard and mouse input. Keys are named by what they do, not by the
// code the browser reports, so the rest of the game never sees a key code.

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  KeyE: 'enter', Enter: 'enter',
  KeyF: 'punch',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  Space: 'handbrake',
  KeyP: 'pause', Escape: 'pause',
  KeyM: 'mute',
  KeyR: 'restart',
};

export function createInput(canvas) {
  const held = new Set();
  const edge = new Set();
  const mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };

  function onKeyDown(e) {
    const name = KEYMAP[e.code];
    if (!name) return;
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (!held.has(name)) edge.add(name);
    held.add(name);
  }
  function onKeyUp(e) {
    const name = KEYMAP[e.code];
    if (name) held.delete(name);
  }
  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  }
  function onClick(e) {
    const r = canvas.getBoundingClientRect();
    mouse.clickX = e.clientX - r.left;
    mouse.clickY = e.clientY - r.top;
    mouse.clicked = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);

  return {
    down(name) { return held.has(name); },
    pressed(name) { return edge.has(name); },
    axisX() { return (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0); },
    axisY() { return (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0); },
    mouse,
    endFrame() {
      edge.clear();
      mouse.clicked = false;
    },
  };
}
