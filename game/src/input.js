// Keyboard and mouse input for Solara City. Keys are tracked by their
// physical code (KeyW etc.) so layouts do not matter; mouse movement is
// read through pointer lock while playing, and the lock is released on
// the title and death screens.

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since last consume
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.locked = false;
    this.onFirstGesture = null;
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      // Space and the arrows scroll the page in a browser; the game owns them.
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (this.onFirstGesture) { this.onFirstGesture(); this.onFirstGesture = null; }
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseMove = (e) => {
      if (!this.locked) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    };
    this._onMouseDown = (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (this.onFirstGesture) { this.onFirstGesture(); this.onFirstGesture = null; }
    };
    this._onMouseUp = (e) => { if (e.button === 0) this.mouseDown = false; };
    this._onLockChange = () => {
      this.locked = document.pointerLockElement === document.body;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    document.addEventListener('pointerlockchange', this._onLockChange);
  }

  down(code) { return this.keys.has(code); }

  // True once for the frame after the key went down.
  wasPressed(code) {
    if (this.pressed.has(code)) { this.pressed.delete(code); return true; }
    return false;
  }

  // Movement axes: forward (+1) / strafe right (+1), from WASD + arrows.
  axes() {
    let f = 0, s = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) f += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) f -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) s += 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) s -= 1;
    return { f, s };
  }

  get run() { return this.down('ShiftLeft') || this.down('ShiftRight'); }

  consumeMouse() {
    const dx = this.mouseDX, dy = this.mouseDY;
    this.mouseDX = 0; this.mouseDY = 0;
    return { dx, dy };
  }

  consumeClick() {
    const c = this.mouseDown;
    this.mouseDown = false;
    return c;
  }

  lockPointer() {
    if (!this.locked) document.body.requestPointerLock?.();
  }

  unlockPointer() {
    if (document.pointerLockElement) document.exitPointerLock?.();
  }

  // Clear edge-triggered state at the end of a frame.
  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
