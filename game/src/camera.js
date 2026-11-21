// Third-person chase camera for Solara City. Mouse orbits around the player
// or the car; staged scenes can pin the camera to a fixed cinematic pose.
import * as THREE from 'three';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.32;
    this.distance = 8;
    this.targetDistance = 8;
    this.fixed = null; // { pos: Vector3, look: Vector3 } when pinned
    this.smoothPos = new THREE.Vector3(0, 8, -12);
    this.shakeT = 0;
    this.shakeAmp = 0;
  }

  // A short jolt: gunfire, a ram, a hard landing.
  shake(amount) {
    this.shakeT = 0.25;
    this.shakeAmp = amount;
  }

  setFixed(pos, look) {
    this.fixed = { pos: pos.clone(), look: look.clone() };
  }

  clearFixed() {
    this.fixed = null;
  }

  update(dt, input, targetPos, targetHeading, inCar, speed01) {
    if (this.fixed) {
      this.camera.position.copy(this.fixed.pos);
      this.camera.lookAt(this.fixed.look);
      return;
    }
    const mouse = input.consumeMouse();
    this.yaw -= mouse.dx * 0.0032;
    this.pitch = Math.max(0.08, Math.min(1.1, this.pitch + mouse.dy * 0.0022));
    this.targetDistance = inCar ? 11 + speed01 * 3 : 7.5;
    this.distance += (this.targetDistance - this.distance) * Math.min(1, dt * 4);
    const cx = targetPos.x - Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
    const cz = targetPos.z - Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;
    const cy = targetPos.y + 2.2 + Math.sin(this.pitch) * this.distance;
    this.smoothPos.x += (cx - this.smoothPos.x) * Math.min(1, dt * 10);
    this.smoothPos.y += (cy - this.smoothPos.y) * Math.min(1, dt * 10);
    this.smoothPos.z += (cz - this.smoothPos.z) * Math.min(1, dt * 10);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const s = this.shakeAmp * (this.shakeT / 0.25);
      this.smoothPos.x += (Math.random() - 0.5) * s;
      this.smoothPos.y += (Math.random() - 0.5) * s;
    }
    this.camera.position.copy(this.smoothPos);
    const look = new THREE.Vector3(
      targetPos.x + Math.sin(this.yaw) * 2,
      targetPos.y + 1.6,
      targetPos.z + Math.cos(this.yaw) * 2,
    );
    this.camera.lookAt(look);
  }
}
