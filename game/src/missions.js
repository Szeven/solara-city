// Solara City — The Duchess's jobs: a small state machine over the
// mission defs in config.js, with a beacon marking the current target.
import * as THREE from 'three';
import { MISSIONS } from './config.js';
import { buildCarMesh, Car } from './vehicles.js';

export class MissionSystem {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.active = null; // {def, step, waitLeft}
    this.done = new Set();
    this.missionCar = null;
    // Beacon: a tall glowing pillar (visible above the rooftops from
    // across the city) + a floating diamond over the target.
    const geo = new THREE.CylinderGeometry(2.5, 2.5, 150, 16, 1, true);
    this.beacon = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        color: 0xffd23f, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    this.beacon.visible = false;
    scene.add(this.beacon);
    const marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.1),
      new THREE.MeshBasicMaterial({ color: 0xffd23f })
    );
    this.marker = marker;
    marker.visible = false;
    scene.add(marker);
    this.pulse = 0;
  }

  start(id, game) {
    const def = MISSIONS.find((m) => m.id === id);
    if (!def || this.done.has(id) || this.active) return false;
    this.active = { def, step: 0, waitLeft: 0 };
    this.setupStep(game);
    game.toast(`Job started: ${def.name} — $${def.pay}`);
    game.sounds.click();
    return true;
  }

  setupStep(game) {
    const step = this.currentStep();
    if (!step) return;
    if (step.type === 'steal') {
      // Park the target car at the step position.
      const mesh = buildCarMesh(step.car ?? 'comet', 0xc0392b);
      const car = new Car(mesh, step.car ?? 'comet', step.pos[0], step.pos[1], Math.PI / 2);
      car.isParked = true;
      car.missionCar = true;
      this.missionCar = car;
      game.traffic.cars.push(car);
      this.scene.add(mesh);
    }
  }

  currentStep() {
    if (!this.active) return null;
    return this.active.def.steps[this.active.step] ?? null;
  }

  currentTarget() {
    const step = this.currentStep();
    if (!step) return null;
    return { x: step.pos[0], z: step.pos[1], label: step.label };
  }

  label() {
    if (!this.active) return 'Free Roam — press 1-4 for a job, E to steal a car';
    const step = this.currentStep();
    return `${this.active.def.name} — ${step ? step.label : ''}`;
  }

  advance(game) {
    this.active.step++;
    if (this.active.step >= this.active.def.steps.length) {
      const def = this.active.def;
      this.done.add(def.id);
      game.player.cash += def.pay;
      game.toast(`Job complete: ${def.name} — +$${def.pay}`);
      game.sounds.pickup();
      game.save();
      this.active = null;
      this.beacon.visible = false;
      this.marker.visible = false;
      return;
    }
    this.active.waitLeft = 0;
    this.setupStep(game);
    game.sounds.click();
  }

  update(dt, game) {
    this.pulse += dt;
    const target = this.currentTarget();
    if (target) {
      this.beacon.visible = true;
      this.marker.visible = true;
      this.beacon.position.set(target.x, 75, target.z);
      this.marker.position.set(target.x, 8 + Math.sin(this.pulse * 2) * 0.8, target.z);
      this.marker.rotation.y = this.pulse;
      this.beacon.material.opacity = 0.26 + Math.sin(this.pulse * 2) * 0.06;
    } else {
      this.beacon.visible = false;
      this.marker.visible = false;
    }
    if (!this.active) return;
    const step = this.currentStep();
    const p = game.player;
    const dx = p.x - step.pos[0];
    const dz = p.z - step.pos[1];
    const dist = Math.hypot(dx, dz);
    if (step.type === 'goto') {
      const radius = step.inCar ? 7 : 5;
      if (dist < radius && (!step.inCar || p.inCar)) this.advance(game);
    } else if (step.type === 'pickup') {
      if (dist < (step.radius ?? 4)) {
        if (step.heat) game.addHeat(step.heat);
        game.toast('Picked up the case — run!');
        this.advance(game);
      }
    } else if (step.type === 'steal') {
      if (p.inCar && p.car && p.car.missionCar) {
        game.toast('Got it. Now deliver it.');
        this.advance(game);
      }
    } else if (step.type === 'wait') {
      if (dist < 6) {
        this.active.waitLeft += dt;
        if (this.active.waitLeft >= (step.seconds ?? 5)) {
          game.toast('Fixed. Drive it to the Garage.');
          this.advance(game);
        }
      } else {
        this.active.waitLeft = 0;
      }
    }
  }
}
