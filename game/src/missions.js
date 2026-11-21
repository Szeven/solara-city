// Four story jobs for The Duchess. Each mission is a chain of steps with a
// gold beacon and a minimap marker. Deliveries only count in the right car:
// the deliver step requires car === this.targetCar.
import * as THREE from 'three';
import { spawnParkedCar } from './vehicles.js';

const MISSION_DEFS = [
  {
    id: 1,
    name: 'The First Pickup',
    reward: 500,
    intro: 'The Duchess: pick up my package at Sunset Pier and bring it to the hideout.',
    steps: [
      { type: 'pickup', pos: { x: -235, z: 120 }, label: 'Pick up the package at Sunset Pier (E)' },
      { type: 'goto', pos: { x: 180, z: -180 }, label: 'Deliver the package to the hideout' },
    ],
  },
  {
    id: 2,
    name: 'Hot Wheels',
    reward: 900,
    intro: 'The Duchess: a gold Comet is parked by the marina. Bring me THAT car.',
    steps: [
      { type: 'steal', pos: { x: -210, z: -40 }, label: 'Steal the gold Comet (E to enter)' },
      { type: 'deliver', pos: { x: 150, z: 150 }, label: 'Deliver the gold Comet to the garage' },
    ],
  },
  {
    id: 3,
    name: 'Breaker Down',
    reward: 1400,
    intro: 'The Duchess: my courier broke down on Coral Way. Fix it, then drive it home.',
    steps: [
      { type: 'repair', pos: { x: 25, z: -125 }, label: 'Repair the courier car (hold E)' },
      { type: 'deliver', pos: { x: 150, z: 150 }, label: 'Drive the courier car to the garage' },
    ],
  },
  {
    id: 4,
    name: 'Payday',
    reward: 2500,
    intro: 'The Duchess: grab the cash from the bank. The cops will not like it.',
    steps: [
      { type: 'pickup', pos: { x: -75, z: 75 }, label: 'Grab the cash bag at Solara Bank (E)' },
      { type: 'goto', pos: { x: 180, z: -180 }, label: 'Escape to the hideout — lose the cops or outrun them' },
    ],
  },
];

export class Missions {
  constructor(scene, city, rng, hooks) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.hooks = hooks; // { onCash, onMessage, onMissionDone, setWanted }
    this.index = 0;
    this.step = 0;
    this.active = false;
    this.done = false;
    this.targetCar = null;
    this.repairT = 0;
    this.hintT = 0;

    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0xffc93c, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
    });
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 42, 18, 1, true), beaconMat);
    this.beacon.visible = false;
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.7 });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.8, 28), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.visible = false;
    scene.add(this.beacon);
    scene.add(this.ring);
  }

  currentDef() {
    return MISSION_DEFS[this.index] ?? null;
  }

  currentStep() {
    const def = this.currentDef();
    return def ? def.steps[this.step] ?? null : null;
  }

  label() {
    if (this.done) return 'All jobs done for The Duchess. Free roam — Solara is yours.';
    if (!this.active) return 'Talk to The Duchess: pick a job on the title screen.';
    const step = this.currentStep();
    const def = this.currentDef();
    return step ? `Job ${this.index + 1}/4 · ${def.name} — ${step.label}` : '';
  }

  // Back to the start of the story, for a fresh playthrough.
  reset() {
    this.index = 0;
    this.step = 0;
    this.active = false;
    this.done = false;
    this.targetCar = null;
    this.repairT = 0;
    this.beacon.visible = false;
    this.ring.visible = false;
  }

  markerPos() {
    const step = this.currentStep();
    return step ? step.pos : null;
  }

  start(index) {
    this.index = index;
    this.step = 0;
    this.active = true;
    this.done = false;
    const def = this.currentDef();
    if (this.hooks.onMessage) this.hooks.onMessage(def.intro);
    if (def.id === 2) {
      this.targetCar = spawnParkedCar(this.scene, this.city, this.rng, 0xd4af37);
      this.targetCar.pos.set(-210, 0, -40);
      this.targetCar.heading = Math.PI / 2;
      this.targetCar.syncMesh();
    }
    if (def.id === 3) {
      this.targetCar = spawnParkedCar(this.scene, this.city, this.rng, 0x2ecc71);
      this.targetCar.pos.set(25, 0, -125);
      this.targetCar.heading = 0;
      this.targetCar.syncMesh();
      this.targetCar.broken = true;
    }
    if (def.id === 4 && this.hooks.setWanted) this.hooks.setWanted(3);
    this.placeBeacon();
  }

  placeBeacon() {
    const step = this.currentStep();
    if (!step) {
      this.beacon.visible = false;
      this.ring.visible = false;
      return;
    }
    this.beacon.position.set(step.pos.x, 21, step.pos.z);
    this.ring.position.set(step.pos.x, 0.1, step.pos.z);
    this.beacon.visible = true;
    this.ring.visible = true;
  }

  advance() {
    const def = this.currentDef();
    this.step += 1;
    if (this.step >= def.steps.length) {
      this.hooks.onCash(def.reward);
      this.hooks.onMessage(`${def.name} complete — $${def.reward} from The Duchess.`);
      if (this.hooks.onMissionDone) this.hooks.onMissionDone(def.id);
      this.index += 1;
      this.step = 0;
      this.targetCar = null;
      if (this.index >= MISSION_DEFS.length) {
        this.active = false;
        this.done = true;
        this.beacon.visible = false;
        this.ring.visible = false;
        return;
      }
      this.start(this.index);
      return;
    }
    this.placeBeacon();
  }

  update(dt, player, input) {
    if (!this.active) return;
    const step = this.currentStep();
    if (!step) return;
    const dx = player.pos.x - step.pos.x;
    const dz = player.pos.z - step.pos.z;
    const dist = Math.hypot(dx, dz);
    this.hintT -= dt;

    if (step.type === 'goto') {
      if (dist < 6) this.advance();
    } else if (step.type === 'pickup') {
      if (dist < 4 && input.pressed('KeyE')) {
        this.hooks.onMessage('Package secured.');
        this.advance();
      }
    } else if (step.type === 'steal') {
      if (player.inCar && player.car === this.targetCar) {
        this.advance();
      } else if (dist < 6 && this.hintT <= 0) {
        this.hintT = 3;
        this.hooks.onMessage('That gold Comet — get in it (E).');
      }
    } else if (step.type === 'repair') {
      if (dist < 5 && input.down('KeyE')) {
        this.repairT += dt;
        if (this.repairT > 3) {
          this.repairT = 0;
          if (this.targetCar) this.targetCar.broken = false;
          this.hooks.onMessage('Courier fixed. Drive it to the garage.');
          this.advance();
        }
      } else {
        this.repairT = Math.max(0, this.repairT - dt);
      }
    } else if (step.type === 'deliver') {
      if (dist < 7) {
        // The delivery only counts in the exact car the job names.
        if (player.inCar && player.car === this.targetCar) {
          this.advance();
        } else if (this.hintT <= 0) {
          this.hintT = 3;
          this.hooks.onMessage('Wrong car — The Duchess wants the job car, not this one.');
        }
      }
    }
  }
}
