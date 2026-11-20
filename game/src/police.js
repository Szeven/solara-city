// Wanted level and police. Heat rises with crimes and falls after 22
// quiet seconds; stars follow the heat. Police cars spawn at the city
// edge, chase and ram; when the player is slow or on foot, officers get
// out and close in — an officer within range for 2 seconds busts the
// player. Busted means the run restarts at the spawn with half the cash.

import * as THREE from '../vendor/three.module.min.js';
import { WANTED, CITY } from './config.js';
import { Car } from './vehicles.js';

export function starsForHeat(heat) {
  if (heat < WANTED.starBase) return 0;
  return Math.min(WANTED.maxStars, 1 + Math.floor((heat - WANTED.starBase) / WANTED.starStep));
}

export class Police {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.heat = 0;
    this.quiet = 0;
    this.stars = 0;
    this.cars = [];
    this.officers = [];
    this.bustTimer = 0;
    this.busted = false;
  }

  addHeat(amount) {
    this.heat = Math.min(WANTED.maxHeat, this.heat + amount);
    this.quiet = 0;
  }

  setStars(stars) {
    this.heat = Math.max(this.heat, WANTED.starBase + (stars - 1) * WANTED.starStep);
    this.quiet = 0;
  }

  reset() {
    this.heat = 0;
    this.quiet = 0;
    this.stars = 0;
    this.bustTimer = 0;
    this.busted = false;
    for (const c of this.cars) c.remove();
    this.cars = [];
    for (const o of this.officers) this.scene.remove(o.mesh);
    this.officers = [];
  }

  update(dt, player, playerCar, others) {
    // heat decay after quiet time
    this.quiet += dt;
    if (this.quiet > WANTED.coolSeconds) {
      this.heat = Math.max(0, this.heat - WANTED.decayPerSecond * dt);
    }
    this.stars = starsForHeat(this.heat);

    // keep the right number of police cars on the road
    const want = this.stars * WANTED.policeCarsPerStar;
    while (this.cars.length < want) this.spawnCar(player);
    while (this.cars.length > want) this.cars.pop().remove();

    let chasing = false;
    for (const car of this.cars) {
      chasing = true;
      // chase: steer toward the player, ram at close range
      const dx = player.pos.x - car.pos.x;
      const dz = player.pos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh * 3 * dt));
      const targetSpeed = dist > 60 ? 34 : dist > 12 ? 26 : 18;
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.4);
      const fw = car.forward;
      car.pos.x += fw.x * car.speed * dt;
      car.pos.z += fw.z * car.speed * dt;
      this.world.collide(car.pos, 1.7);
      car.syncMesh(dt);
      // ram: a hard hit hurts the player and shoves their car
      if (dist < 3.4) {
        if (playerCar) {
          playerCar.speed *= 0.6;
          playerCar.pos.x += fw.x * 2.2;
          playerCar.pos.z += fw.z * 2.2;
        } else if (Math.random() < dt * 1.2) {
          player.hurt(6);
        }
      }
      // flash the light bar
      const lights = car.mesh.userData.lights;
      if (lights) {
        const phase = Math.floor(performance.now() / 280) % 2 === 0;
        lights[0].material.color.setHex(phase ? 0xff2222 : 0x551111);
        lights[1].material.color.setHex(phase ? 0x111155 : 0x2244ff);
      }
    }

    // officers: on foot, spawn from a police car when the player is slow.
    // When the heat fully cools, the officers stand down and walk off.
    if (this.stars === 0 && this.officers.length > 0) {
      for (const o of this.officers) this.scene.remove(o.mesh);
      this.officers = [];
    }
    if (this.stars > 0 && !playerCar && this.officers.length < this.stars) {
      this.spawnOfficer(player);
    }
    let nearestOfficer = Infinity;
    for (const o of this.officers) {
      const dx = player.pos.x - o.pos.x;
      const dz = player.pos.z - o.pos.z;
      const dist = Math.hypot(dx, dz);
      nearestOfficer = Math.min(nearestOfficer, dist);
      const heading = Math.atan2(dx, dz);
      o.pos.x += Math.sin(heading) * 5.2 * dt;
      o.pos.z += Math.cos(heading) * 5.2 * dt;
      this.world.collide(o.pos, 0.5);
      o.mesh.position.copy(o.pos);
      o.mesh.rotation.y = heading;
    }
    // bust: an officer close by for 2 seconds
    if (nearestOfficer < WANTED.bustRange) {
      this.bustTimer += dt;
      if (this.bustTimer > WANTED.bustSeconds) this.busted = true;
    } else {
      this.bustTimer = Math.max(0, this.bustTimer - dt * 2);
    }
    return chasing;
  }

  spawnCar(player) {
    // appear on a road at the city edge, roughly toward the player
    const angle = Math.random() * Math.PI * 2;
    const x = Math.max(-235, Math.min(235, player.pos.x + Math.sin(angle) * 120));
    const z = Math.max(-235, Math.min(235, player.pos.z + Math.cos(angle) * 120));
    const car = new Car(this.scene, x, z, 0, 0xf2f2f2, { police: true });
    // black-and-white police livery: white body with a dark hood is
    // faked by the light bar; keep the body white for readability.
    this.cars.push(car);
  }

  spawnOfficer(player) {
    const group = new THREE.Group();
    const navy = new THREE.MeshLambertMaterial({ color: 0x1a2a4a });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.9, 8), navy);
    body.position.y = 1.0;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), skin);
    head.position.y = 1.65;
    group.add(head);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 10), navy);
    hat.position.y = 1.82;
    group.add(hat);
    const angle = Math.random() * Math.PI * 2;
    const pos = new THREE.Vector3(
      Math.max(-240, Math.min(240, player.pos.x + Math.sin(angle) * 14)),
      0,
      Math.max(-240, Math.min(240, player.pos.z + Math.cos(angle) * 14)),
    );
    group.position.copy(pos);
    this.scene.add(group);
    this.officers.push({ mesh: group, pos });
  }
}
