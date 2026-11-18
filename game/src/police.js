// The wanted system: stars 0-5, heat that cools when the player lies low, police
// cars that spawn on the roads and ram the player, and officers who get out to make
// the bust on foot. Busted or wasted ends the run — or fails the mission.

import * as THREE from 'three';
import { WANTED, PALETTE } from './config.js';
import { buildCar, carState } from './vehicles.js';
import { spawnOfficer, stepOfficer } from './people.js';
import { nearestRoadPoint, nearestNode } from './city.js';

export function createPolice(scene, graph, random) {
  return {
    scene,
    graph,
    random,
    wanted: 0,
    quiet: 0,
    bustTimer: 0,
    cars: [],
    officers: [],
    addStars(n) {
      this.wanted = Math.min(WANTED.max, this.wanted + n);
      this.quiet = 0;
      if (this.wanted > 0) this.bustTimer = 0;
    },
    clear() {
      this.wanted = 0;
      this.quiet = 0;
      this.bustTimer = 0;
      for (const c of this.cars) {
        c.dead = true;
        this.scene.remove(c.mesh);
      }
      for (const o of this.officers) {
        o.dead = true;
        this.scene.remove(o.mesh);
      }
      this.cars = [];
      this.officers = [];
    },
    spawnCop(player) {
      const rx = player.x + (this.random() < 0.5 ? -90 : 90) * (0.6 + this.random() * 0.8);
      const rz = player.z + (this.random() < 0.5 ? -90 : 90) * (0.6 + this.random() * 0.8);
      const p = nearestRoadPoint(rx, rz);
      const mesh = buildCar(PALETTE.copWhite, 'police');
      // Two-tone body: a white shell over a blue base box.
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.3, 4.34), new THREE.MeshLambertMaterial({ color: PALETTE.cop }));
      base.position.y = 0.4;
      mesh.add(base);
      this.scene.add(mesh);
      const car = carState(mesh, p.x, p.z, 0, PALETTE.copWhite, 'police');
      car.isTraffic = false;
      car.node = nearestNode(this.graph, p.x, p.z);
      this.cars.push(car);
      return car;
    },
    spawnOfficer(player) {
      const p = nearestRoadPoint(player.x + (this.random() - 0.5) * 60, player.z + (this.random() - 0.5) * 60);
      const off = spawnOfficer(this.scene, p.x, p.z);
      this.officers.push(off);
      return off;
    },
  };
}

/**
 * One police step. Returns { type: 'busted' } when an officer holds the player
 * long enough, or { type: 'rammed', damage } when a cop car slams the player.
 */
export function stepPolice(police, dt, player, colliders, cars) {
  const { random } = police;
  let result = null;
  // Heat cools when the player commits nothing and no cop is near.
  const nearCop = police.cars.some((c) => !c.dead && Math.hypot(c.x - player.x, c.z - player.z) < 60);
  if (police.wanted > 0 && !nearCop) {
    police.quiet += dt;
    if (police.quiet > WANTED.coolSeconds) {
      police.wanted -= 1;
      police.quiet = 0;
    }
  } else {
    police.quiet = 0;
  }

  // Keep the right number of cop cars on the road.
  const wantCars = police.wanted === 0 ? 0 : Math.min(WANTED.maxCars, police.wanted);
  const liveCars = police.cars.filter((c) => !c.dead);
  if (liveCars.length < wantCars && random() < dt * 1.2) police.spawnCop(player);
  if (liveCars.length > wantCars) {
    const extra = liveCars[liveCars.length - 1];
    extra.dead = true;
    police.scene.remove(extra.mesh);
  }
  police.cars = police.cars.filter((c) => !c.dead);

  // Cop cars chase: steer toward the player along the road graph, ram on contact.
  for (const cop of police.cars) {
    const dx = player.x - cop.x;
    const dz = player.z - cop.z;
    const d = Math.hypot(dx, dz);
    const target = nearestNode(police.graph, player.x, player.z);
    let tx;
    let tz;
    if (d < 26) {
      tx = player.x;
      tz = player.z;
    } else {
      tx = target.x;
      tz = target.z;
    }
    const want = Math.atan2(tx - cop.x, tz - cop.z);
    let dh = want - cop.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    cop.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, dh));
    const speed = Math.min(WANTED.copTop + police.wanted * 1.5, 30);
    cop.speed += (speed - cop.speed) * Math.min(1, 1.5 * dt);
    cop.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.z += Math.cos(cop.heading) * cop.speed * dt;
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.y = cop.heading;
    if (d < 3.4) {
      if (player.inCar && player.car) {
        player.car.speed *= 0.4;
        player.car.x += (player.x - cop.x) * 0.02;
        player.car.z += (player.z - cop.z) * 0.02;
        result = { type: 'rammed', damage: 8 };
      } else {
        result = { type: 'rammed', damage: 12 };
      }
      cop.speed = -6;
    }
  }

  // Officers on foot, only while the player is on foot and wanted at least 2.
  if (!player.inCar && police.wanted >= 2) {
    const liveOff = police.officers.filter((o) => !o.dead);
    if (liveOff.length < Math.min(2, police.wanted - 1) && random() < dt * 0.8) police.spawnOfficer(player);
  }
  let busting = false;
  for (const off of police.officers) {
    if (off.dead) continue;
    const d = Math.hypot(off.x - player.x, off.z - player.z);
    if (d > 90) {
      off.dead = true;
      police.scene.remove(off.mesh);
      continue;
    }
    if (stepOfficer(off, dt, player, colliders) === 'busting') busting = true;
  }
  police.officers = police.officers.filter((o) => !o.dead);
  if (busting) {
    police.bustTimer += dt;
    if (police.bustTimer > WANTED.bustTime) result = { type: 'busted' };
  } else {
    police.bustTimer = Math.max(0, police.bustTimer - dt * 2);
  }
  return result;
}
