// The Duchess's four jobs. A mission is a list of steps; each step is
// goto (reach a marker), steal (get into a named target car) or deliver
// (park the target car at a marker). Deliver advances ONLY when the
// player is driving the mission's own target car — arriving in any other
// car does not count.

import * as THREE from '../vendor/three.module.min.js';
import { MISSIONS } from './config.js';

export class Missions {
  constructor(scene) {
    this.scene = scene;
    this.completed = new Set();
    this.active = null; // { def, stepIndex }
    this.beacon = null;
    this.marker = null;
    this.targetCar = null; // the Car the active mission wants
    this.onComplete = null; // (missionDef) => void
    this.onStep = null; // (label) => void
    this.buildBeacon();
  }

  buildBeacon() {
    // a tall glowing pillar + a ring on the ground, moved to each step
    const geo = new THREE.CylinderGeometry(1.6, 1.6, 90, 16, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd23f, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false,
    });
    this.beacon = new THREE.Mesh(geo, mat);
    this.beacon.visible = false;
    this.scene.add(this.beacon);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.2, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    this.marker = ring;
    this.marker.visible = false;
    this.scene.add(this.marker);
  }

  available() {
    return MISSIONS.filter((m) => !this.completed.has(m.id));
  }

  start(id) {
    const def = MISSIONS.find((m) => m.id === id);
    if (!def || this.completed.has(id)) return false;
    this.active = { def, stepIndex: 0 };
    if (def.startStars) this.onStartStars?.(def.startStars);
    this.showStep();
    return true;
  }

  // The step the player is currently on.
  get step() {
    return this.active ? this.active.def.steps[this.active.stepIndex] : null;
  }

  get label() {
    if (!this.active) return 'Press M to pick a job from The Duchess.';
    const s = this.step;
    return `${this.active.def.name} — ${s.label}`;
  }

  // Distance in metres from the player to the current objective, for the HUD.
  distanceTo(player) {
    const o = this.objectivePos();
    if (!o || !player) return null;
    return Math.round(Math.hypot(player.pos.x - o.x, player.pos.z - o.z));
  }

  showStep() {
    const s = this.step;
    if (!s) { this.beacon.visible = false; this.marker.visible = false; return; }
    if (s.at) {
      this.beacon.position.set(s.at[0], 45, s.at[1]);
      this.beacon.visible = true;
      this.marker.position.set(s.at[0], 0.12, s.at[1]);
      this.marker.visible = true;
    } else {
      this.beacon.visible = false;
      this.marker.visible = false;
    }
  }

  // Called every frame with the player's state. Returns a cash payout
  // when a mission completes, else 0.
  update(player, playerCar, missionCars) {
    if (!this.active) return 0;
    const s = this.step;
    if (!s) return 0;
    if (s.kind === 'goto') {
      const d = Math.hypot(player.pos.x - s.at[0], player.pos.z - s.at[1]);
      if (d < 5) this.advance();
    } else if (s.kind === 'steal') {
      this.targetCar = missionCars[s.car] || null;
      if (playerCar && playerCar === this.targetCar) this.advance();
    } else if (s.kind === 'deliver') {
      // ONLY the mission's own target car counts. Any other car — even
      // the right model in another colour — does not advance the step.
      if (playerCar && this.targetCar && playerCar === this.targetCar) {
        const d = Math.hypot(player.pos.x - s.at[0], player.pos.z - s.at[1]);
        if (d < 6) this.advance();
      }
    }
    // keep the beacon over the target car while stealing
    if (s.kind === 'steal' && this.targetCar) {
      this.beacon.position.set(this.targetCar.pos.x, 45, this.targetCar.pos.z);
      this.beacon.visible = true;
      this.marker.position.set(this.targetCar.pos.x, 0.12, this.targetCar.pos.z);
      this.marker.visible = true;
    }
    // mission complete?
    if (this.active && this.active.stepIndex >= this.active.def.steps.length) {
      const def = this.active.def;
      this.completed.add(def.id);
      this.active = null;
      this.targetCar = null;
      this.beacon.visible = false;
      this.marker.visible = false;
      this.onComplete?.(def);
      return def.pay;
    }
    return 0;
  }

  advance() {
    if (!this.active) return;
    this.active.stepIndex += 1;
    this.onStep?.(this.step ? this.step.label : 'Job done');
    this.showStep();
  }

  cancel() {
    this.active = null;
    this.targetCar = null;
    this.beacon.visible = false;
    this.marker.visible = false;
  }

  // Minimap marker position for the current objective, or null.
  objectivePos() {
    if (!this.active) return null;
    const s = this.step;
    if (!s) return null;
    if (s.at) return { x: s.at[0], z: s.at[1] };
    if (s.kind === 'steal' && this.targetCar) return { x: this.targetCar.pos.x, z: this.targetCar.pos.z };
    return null;
  }
}
