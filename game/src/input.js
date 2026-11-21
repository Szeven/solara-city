// Keyboard + mouse input for Solara City. Tracks held keys, edge-triggered
// presses, mouse deltas and clicks. Pointer lock is requested on click.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.clicked = false;
    this.locked = false;
    this.enabled = true;
    this.canvas = null;
  }

  attach(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (!this.keys.has(e.code)) this.pressedKeys.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    canvas.addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.clicked = true;
        if (!this.locked && this.enabled) canvas.requestPointerLock();
      }
    });
  }

  down(code) {
    return this.keys.has(code);
  }

  // True once per physical key press; consumed by endFrame.
  pressed(code) {
    return this.pressedKeys.has(code);
  }

  // Like pressed(), but clears just this one code so a second system cannot
  // also consume the same press in the same frame.
  consumePressed(code) {
    const hit = this.pressedKeys.has(code);
    if (hit) this.pressedKeys.delete(code);
    return hit;
  }

  anyKey() {
    return this.keys.size > 0;
  }

  // WASD / arrow movement vector, normalized, in camera space.
  moveVector() {
    let x = 0;
    let z = 0;
    if (this.down('KeyW') || this.down('ArrowUp')) z += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) z -= 1;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    const len = Math.hypot(x, z);
    if (len > 0) {
      x /= len;
      z /= len;
    }
    return { x, z };
  }

  consumeMouse() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  consumeClick() {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }

  endFrame() {
    this.pressedKeys.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
