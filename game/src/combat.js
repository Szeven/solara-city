// The pistol: hitscan shooting with a visible tracer line, a 12-round
// magazine, and a reload. Shots scare pedestrians, raise heat when they
// hit someone, and can drop a pedestrian (which the city notices).

import * as THREE from '../vendor/three.module.min.js';
import { PLAYER } from './config.js';
import { playGunshot, playReload, playEmpty } from './audio.js';

export class Combat {
  constructor(scene) {
    this.scene = scene;
    this.ammo = PLAYER.pistolAmmo;
    this.reserve = PLAYER.pistolReserve;
    this.cooldown = 0;
    this.tracers = [];
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    // fade and remove old tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      t.line.material.opacity = Math.max(0, t.life / 0.12);
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  reload() {
    if (this.ammo === PLAYER.pistolAmmo || this.reserve === 0) return false;
    const need = PLAYER.pistolAmmo - this.ammo;
    const take = Math.min(need, this.reserve);
    this.ammo += take;
    this.reserve -= take;
    playReload();
    return true;
  }

  // Fire one hitscan shot from the camera toward the crosshair.
  // Returns 'ped' | 'car' | 'miss' | 'empty' | 'cooldown'.
  shoot(camera, pedestrians, cars, onHitPed) {
    if (this.cooldown > 0) return 'cooldown';
    if (this.ammo <= 0) { playEmpty(); this.cooldown = 0.25; return 'empty'; }
    this.ammo -= 1;
    this.cooldown = 0.22;
    playGunshot();

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const origin = camera.position.clone();
    const range = 90;
    let bestT = range;
    let hitPed = null;
    let hitCar = null;
    // test pedestrians (cylinders around their position)
    for (const p of pedestrians.peds) {
      if (!p.alive) continue;
      const t = this.rayCylinder(origin, dir, p.pos, 0.7, 1.8);
      if (t !== null && t < bestT) { bestT = t; hitPed = p; hitCar = null; }
    }
    // test cars (sphere around their centre)
    for (const c of cars) {
      const t = this.raySphere(origin, dir, c.pos, 2.2);
      if (t !== null && t < bestT) { bestT = t; hitCar = c; hitPed = null; }
    }
    const end = origin.clone().addScaledVector(dir, bestT);
    // a hit draws a warmer tracer than a miss, so the player reads the result
    this.spawnTracer(origin, end, hitPed || hitCar ? 0xffb03a : 0xffe9a0);
    pedestrians.scare(origin.x, origin.z, 26);
    if (hitPed) {
      hitPed.alive = false;
      hitPed.mesh.visible = false;
      onHitPed?.(hitPed);
      return 'ped';
    }
    if (hitCar) return 'car';
    return 'miss';
  }

  raySphere(origin, dir, centre, radius) {
    const ox = origin.x - centre.x, oy = origin.y - 0.8 - centre.y, oz = origin.z - centre.z;
    const b = ox * dir.x + oy * dir.y + oz * dir.z;
    const c = ox * ox + oy * oy + oz * oz - radius * radius;
    const disc = b * b - c;
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t > 0 ? t : null;
  }

  rayCylinder(origin, dir, pos, radius, height) {
    // approximate with a vertical segment test: distance from the ray to
    // the ped's axis, then check the hit height is within the body.
    const dx = pos.x - origin.x, dz = pos.z - origin.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 0 || along > 90) return null;
    const cx = origin.x + dir.x * along, cz = origin.z + dir.z * along;
    const dist = Math.hypot(cx - pos.x, cz - pos.z);
    if (dist > radius) return null;
    const y = origin.y + dir.y * along;
    if (y < 0 || y > height) return null;
    return along;
  }

  spawnTracer(from, to, color = 0xffe9a0) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 }));
    this.scene.add(line);
    this.tracers.push({ line, life: 0.12 });
  }
}
