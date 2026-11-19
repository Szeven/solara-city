// Keyboard and mouse. WASD or the arrows move and drive, the mouse drag
// orbits the camera, E interacts and gets into cars, a left click shoots,
// Space confirms, P pauses, R reloads, M mutes. One-shot presses are queued
// as action flags and taken once by the loop; plain key presses are reported
// once each too.

export const ACTION_CONFIRM = 1;
export const ACTION_INTERACT = 2;
export const ACTION_PAUSE = 4;
export const ACTION_SHOOT = 8;
export const ACTION_MUTE = 16;
export const ACTION_RELOAD = 32;

const FWD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const INTERACT = new Set(['KeyE']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RELOAD = new Set(['KeyR']);

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  let actions = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let orbitDX = 0;
  let orbitDY = 0;

  function onKeyDown(event) {
    if (event.repeat) {
      event.preventDefault();
      return;
    }
    held.add(event.code);
    pressed.add(event.code);
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (INTERACT.has(event.code)) actions |= ACTION_INTERACT;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (RELOAD.has(event.code)) actions |= ACTION_RELOAD;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    if (
      FWD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) ||
      RIGHT.has(event.code) || CONFIRM.has(event.code)
    ) {
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onBlur() {
    held.clear();
  }

  function onPointerDown(event) {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    if (event.button === 0) actions |= ACTION_SHOOT;
  }

  function onPointerUp() {
    dragging = false;
  }

  function onPointerMove(event) {
    if (!dragging) return;
    orbitDX += event.clientX - lastX;
    orbitDY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  // Right-drag orbits the camera; keep the browser menu from opening.
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointermove', onPointerMove);

  return {
    // x: strafe right, y: forward — from the keys held down right now.
    move() {
      const x =
        (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) -
        (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
      const y =
        (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) -
        (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
      return { x, y };
    },
    running() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    takeOrbit() {
      const out = { dx: orbitDX, dy: orbitDY };
      orbitDX = 0;
      orbitDY = 0;
      return out;
    },
    takeActions() {
      const out = actions;
      actions = 0;
      return out;
    },
    // Codes pressed since the last call, for menu keys like 1-4 and C.
    takePressed() {
      const out = new Set(pressed);
      pressed.clear();
      return out;
    },
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointermove', onPointerMove);
    },
  };
}
