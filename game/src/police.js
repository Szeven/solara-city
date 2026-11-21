// Wanted level and the Solara Police Department. Stars rise with crimes and
// cool after 22 quiet seconds; police cars chase and ram, officers on foot
// close in and bust the player.
import * as THREE from 'three';
import { Car } from './vehicles.js';

export class WantedSystem {
  constructor() {
    this.stars = 0;
    this.quietTime = 0;
    this.decayT = 0;
  }

  addCrime(level) {
    this.stars = Math.max(this.stars, Math.min(5, level));
    this.quietTime = 0;
    this.decayT = 0;
  }

  clear() {
    this.stars = 0;
    this.quietTime = 0;
    this.decayT = 0;
  }

  update(dt) {
    if (this.stars === 0) return;
    this.quietTime += dt;
    if (this.quietTime > 22) {
      this.decayT += dt;
      if (this.decayT > 4) {
        this.decayT = 0;
        this.stars = Math.max(0, this.stars - 1);
      }
    }
  }
}

export class PoliceSystem {
  constructor(scene, city, rng) {
    this.scene = scene;
    this.city = city;
    this.rng = rng;
    this.cars = [];
    this.officers = [];
    this.bustT = 0;
    this.onBusted = null;
    this.spawnT = 0;
    this.pursuits = 0; // total police cars spawned this session
  }

  wantedCount(stars) {
    return Math.min(stars, 4);
  }

  spawnCarNear(x, z) {
    const angle = this.rng.range(0, Math.PI * 2);
    const dist = this.rng.range(45, 70);
    const car = new Car(this.scene, {
      x: x + Math.sin(angle) * dist,
      z: z + Math.cos(angle) * dist,
      heading: 0,
      isPolice: true,
      color: 0x1a1a1a,
      maxSpeed: 30,
      accel: 18,
    });
    this.cars.push(car);
    this.pursuits += 1;
    return car;
  }

  // The closest active police car to a point, or null when none is out.
  nearestCar(x, z) {
    let best = null;
    let bestD = Infinity;
    for (const car of this.cars) {
      const d = Math.hypot(car.pos.x - x, car.pos.z - z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  spawnOfficerNear(x, z) {
    const group = new THREE.Group();
    const navy = new THREE.MeshLambertMaterial({ color: 0x1b2a4a });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.8, 0.24), navy);
    legs.position.y = 0.4;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.62, 0.32), navy);
    torso.position.y = 1.12;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), skin);
    head.position.y = 1.66;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.23, 0.1, 10), navy);
    cap.position.y = 1.84;
    group.add(legs, torso, head, cap);
    const angle = this.rng.range(0, Math.PI * 2);
    const officer = {
      mesh: group,
      pos: new THREE.Vector3(x + Math.sin(angle) * 25, 0, z + Math.cos(angle) * 25),
      speed: 3.4,
    };
    group.position.copy(officer.pos);
    this.scene.add(group);
    this.officers.push(officer);
    return officer;
  }

  update(dt, player, wanted) {
    const wantCars = this.wantedCount(wanted.stars);
    this.spawnT += dt;
    if (this.cars.length < wantCars && this.spawnT > 1.2) {
      this.spawnT = 0;
      this.spawnCarNear(player.pos.x, player.pos.z);
    }
    if (this.cars.length > wantCars) {
      const extra = this.cars.pop();
      extra.dispose();
    }
    const wantOfficers = wanted.stars >= 2 && !player.inCar ? 2 : 0;
    while (this.officers.length < wantOfficers) this.spawnOfficerNear(player.pos.x, player.pos.z);
    while (this.officers.length > wantOfficers) {
      const o = this.officers.pop();
      this.scene.remove(o.mesh);
    }

    for (const car of this.cars) {
      const dx = player.pos.x - car.pos.x;
      const dz = player.pos.z - car.pos.z;
      const dist = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - car.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 2));
      car.drive(dt, dist > 6 ? 1 : 0.4, steer, false);
      car.updateFlash(dt, true);
      // Ram: shove the player's car when close.
      if (dist < 4.5 && player.inCar && player.car) {
        const push = 6 * dt;
        player.car.pos.x += (dx / (dist || 1)) * -push * 0.4;
        player.car.pos.z += (dz / (dist || 1)) * -push * 0.4;
        player.health = Math.max(0, player.health - 2 * dt);
      }
    }

    let nearOfficer = false;
    for (const o of this.officers) {
      const dx = player.pos.x - o.pos.x;
      const dz = player.pos.z - o.pos.z;
      const dist = Math.hypot(dx, dz);
      const heading = Math.atan2(dx, dz);
      o.pos.x += Math.sin(heading) * o.speed * dt;
      o.pos.z += Math.cos(heading) * o.speed * dt;
      o.mesh.position.copy(o.pos);
      o.mesh.rotation.y = -heading;
      if (dist < 2.4) nearOfficer = true;
    }
    if (nearOfficer && !player.inCar) {
      this.bustT += dt;
      if (this.bustT > 1.5) {
        this.bustT = 0;
        if (this.onBusted) this.onBusted();
      }
    } else {
      this.bustT = 0;
    }
  }
}
